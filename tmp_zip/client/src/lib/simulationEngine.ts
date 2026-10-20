/**
 * simulationEngine.ts — IQcare Baseline & Anomaly Simulation
 *
 * Generates realistic simulated wearable data for the hackathon prototype.
 * Uses z-score based anomaly detection against a personal baseline.
 *
 * IMPORTANT: All data is simulated. This is clearly labeled in the UI.
 */

export type MetricType = "movement" | "heartRate" | "sleepHours";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface Baseline {
  metricType: MetricType;
  timeOfDay: TimeOfDay;
  mean: number;
  stdDev: number;
  sampleCount: number;
}

export interface SimulatedSignal {
  metricType: MetricType;
  value: number;
  unit: string;
  timestamp: string;
  source: "simulated";
}

export interface AnomalyResult {
  isAnomaly: boolean;
  metricType: MetricType;
  observedValue: number;
  baselineValue: number;
  deviationScore: number;
  deviationPercent: number;
  timeOfDay: TimeOfDay;
}

// ─── Meera's personal baselines (7-day learned patterns) ──────────────────────
const MEERA_BASELINES: Baseline[] = [
  // Movement (steps)
  { metricType: "movement", timeOfDay: "morning",   mean: 1200, stdDev: 180, sampleCount: 14 },
  { metricType: "movement", timeOfDay: "afternoon", mean: 1800, stdDev: 250, sampleCount: 14 },
  { metricType: "movement", timeOfDay: "evening",   mean: 900,  stdDev: 150, sampleCount: 14 },
  { metricType: "movement", timeOfDay: "night",     mean: 200,  stdDev: 60,  sampleCount: 14 },
  // Heart rate (bpm)
  { metricType: "heartRate", timeOfDay: "morning",   mean: 74, stdDev: 4.5, sampleCount: 28 },
  { metricType: "heartRate", timeOfDay: "afternoon", mean: 78, stdDev: 5,   sampleCount: 28 },
  { metricType: "heartRate", timeOfDay: "evening",   mean: 72, stdDev: 4,   sampleCount: 28 },
  { metricType: "heartRate", timeOfDay: "night",     mean: 65, stdDev: 3.5, sampleCount: 28 },
  // Sleep (hours)
  { metricType: "sleepHours", timeOfDay: "night",    mean: 7.5, stdDev: 0.6, sampleCount: 14 },
  { metricType: "sleepHours", timeOfDay: "morning",  mean: 7.5, stdDev: 0.6, sampleCount: 14 },
  { metricType: "sleepHours", timeOfDay: "afternoon", mean: 7.5, stdDev: 0.6, sampleCount: 14 },
  { metricType: "sleepHours", timeOfDay: "evening",  mean: 7.5, stdDev: 0.6, sampleCount: 14 },
];

const UNITS: Record<MetricType, string> = {
  movement: "steps",
  heartRate: "bpm",
  sleepHours: "hours",
};

const ANOMALY_THRESHOLD = 1.8; // z-score threshold for flagging

// ─── Helper: get current time-of-day bucket ────────────────────────────────────
export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

// ─── Get baseline for a metric + time ──────────────────────────────────────────
function getBaseline(metric: MetricType, tod: TimeOfDay): Baseline {
  return (
    MEERA_BASELINES.find(
      (b) => b.metricType === metric && b.timeOfDay === tod
    ) ?? MEERA_BASELINES[0]
  );
}

// ─── Generate a normal reading (within baseline) ──────────────────────────────
function normalReading(baseline: Baseline): number {
  // Box-Muller transform for gaussian noise
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.round(baseline.mean + z * baseline.stdDev * 0.5);
}

// ─── Generate an anomalous reading ────────────────────────────────────────────
function anomalousReading(baseline: Baseline): number {
  // Generate value 2-3 standard deviations below mean (for movement/steps)
  const direction = baseline.metricType === "heartRate" ? 1 : -1;
  const deviation = (2 + Math.random()) * baseline.stdDev * direction;
  return Math.round(baseline.mean + deviation);
}

// ─── Main simulation functions ────────────────────────────────────────────────

/**
 * Generate current simulated signals for all metrics.
 */
export function generateCurrentSignals(anomalyActive: boolean): SimulatedSignal[] {
  const tod = getTimeOfDay();
  const now = new Date().toISOString();

  return (["movement", "heartRate", "sleepHours"] as MetricType[]).map(
    (metric) => {
      const baseline = getBaseline(metric, tod);
      const value =
        anomalyActive && metric === "movement"
          ? anomalousReading(baseline)
          : normalReading(baseline);
      return {
        metricType: metric,
        value: Math.max(0, value),
        unit: UNITS[metric],
        timestamp: now,
        source: "simulated" as const,
      };
    }
  );
}

/**
 * Check a signal against its baseline for anomaly.
 */
export function detectAnomaly(signal: SimulatedSignal): AnomalyResult {
  const tod = getTimeOfDay();
  const baseline = getBaseline(signal.metricType, tod);

  const deviationScore =
    baseline.stdDev > 0
      ? Math.abs(signal.value - baseline.mean) / baseline.stdDev
      : 0;

  const deviationPercent =
    baseline.mean > 0
      ? Math.round(((signal.value - baseline.mean) / baseline.mean) * 100)
      : 0;

  return {
    isAnomaly: deviationScore >= ANOMALY_THRESHOLD,
    metricType: signal.metricType,
    observedValue: signal.value,
    baselineValue: baseline.mean,
    deviationScore: Math.round(deviationScore * 100) / 100,
    deviationPercent,
    timeOfDay: tod,
  };
}

/**
 * Generate formatted metric display values for the dashboard.
 */
export function getMetricDisplay(anomalyActive: boolean): {
  heartRate: { value: number; trend: string; trendType: "good" | "warn" };
  movement: { value: number; trend: string; trendType: "good" | "warn" };
  sleep: { value: string; trend: string; trendType: "good" | "warn" };
  confidence: number;
} {
  const tod = getTimeOfDay();
  const hrBaseline = getBaseline("heartRate", tod);
  const mvBaseline = getBaseline("movement", tod);

  const hr = normalReading(hrBaseline);
  const mv = anomalyActive ? anomalousReading(mvBaseline) : normalReading(mvBaseline);

  return {
    heartRate: {
      value: Math.max(58, Math.min(95, hr)),
      trend: "↘ 4% today",
      trendType: "good",
    },
    movement: {
      value: Math.max(200, anomalyActive ? mv : Math.max(3800, mv)),
      trend: anomalyActive ? "pattern shifted" : "on her way",
      trendType: anomalyActive ? "warn" : "good",
    },
    sleep: {
      value: "7h 42m",
      trend: "↑ restful night",
      trendType: "good",
    },
    confidence: anomalyActive ? 78 : 96,
  };
}
