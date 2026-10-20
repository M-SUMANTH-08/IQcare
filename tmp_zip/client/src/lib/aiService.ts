/**
 * aiService.ts — IQcare AI Layer
 *
 * Deterministic, safety-guarded text generation for:
 *  1. Alert explanations  (raw deviation → warm, non-diagnostic language)
 *  2. Reply summarisation  (raw transcript → structured 1-line summary)
 *
 * Architecture:
 *  - Default: deterministic template engine (works offline, no API needed)
 *  - Future:  cloud LLM via server-side proxy (never expose API keys client-side)
 *
 * SAFETY INVARIANT — every output passes through `guardSafety()`.
 * Forbidden medical/diagnostic terms are stripped or the text is rejected.
 */

// ─── Forbidden medical terms (SafetyGuard) ────────────────────────────────────
const FORBIDDEN = [
  "diagnos", "prescri", "medicat", "bradycardia", "tachycardia",
  "heart failure", "stroke", "cardiac", "arrhythm", "hypotens",
  "hypertens", "disease", "disorder", "syndrome", "patholog",
  "clinical", "emergenc", "critical", "urgent medical",
];

function guardSafety(text: string): string {
  let safe = text;
  for (const term of FORBIDDEN) {
    const re = new RegExp(term, "gi");
    if (re.test(safe)) {
      // Replace with safe alternative
      safe = safe.replace(re, "change");
    }
  }
  return safe;
}

// ─── Alert explanation templates ──────────────────────────────────────────────
export type MetricType = "movement" | "heartRate" | "sleepHours" | "restQuality";
export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

interface AlertContext {
  elderName: string;
  metricType: MetricType;
  observedValue: number;
  baselineValue: number;
  deviationPercent: number;
  timeOfDay: TimeOfDay;
}

const METRIC_LABELS: Record<MetricType, string> = {
  movement: "movement",
  heartRate: "heart rhythm",
  sleepHours: "rest pattern",
  restQuality: "rest quality",
};

const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "nighttime",
};

const EXPLANATION_TEMPLATES = [
  (ctx: AlertContext) =>
    `${ctx.elderName}'s ${METRIC_LABELS[ctx.metricType]} is ${Math.abs(ctx.deviationPercent)}% ${ctx.deviationPercent < 0 ? "lower" : "higher"} than her usual ${TIME_LABELS[ctx.timeOfDay]} pattern. This is not a diagnosis — just a gentle signal worth noticing.`,
  (ctx: AlertContext) =>
    `We noticed ${ctx.elderName}'s ${TIME_LABELS[ctx.timeOfDay]} ${METRIC_LABELS[ctx.metricType]} looks a bit different from what we usually see. Nothing is certain — consider a warm check-in when convenient.`,
  (ctx: AlertContext) =>
    `${ctx.elderName}'s ${METRIC_LABELS[ctx.metricType]} shifted from her personal baseline this ${TIME_LABELS[ctx.timeOfDay]}. This doesn't mean something is wrong — it's simply worth a gentle hello.`,
];

const DISCLAIMER =
  "⚕️ This is not a medical diagnosis. IQcare compares activity to personal patterns only. Always follow clinician guidance.";

export interface AlertExplanation {
  summary: string;
  disclaimer: string;
  aiAssisted: boolean;
  source: "deterministic" | "cloud-ai";
}

/**
 * Generate a warm, non-diagnostic explanation for an anomaly alert.
 */
export function explainAlert(ctx: AlertContext): AlertExplanation {
  // Pick template deterministically based on metric+time combo
  const seed =
    ctx.metricType.length + ctx.timeOfDay.length + Math.abs(ctx.deviationPercent);
  const idx = seed % EXPLANATION_TEMPLATES.length;
  const raw = EXPLANATION_TEMPLATES[idx](ctx);
  return {
    summary: guardSafety(raw),
    disclaimer: DISCLAIMER,
    aiAssisted: true,
    source: "deterministic",
  };
}

// ─── Reply summarisation ──────────────────────────────────────────────────────
export interface ReplySummary {
  oneLiner: string;
  sentiment: "positive" | "neutral" | "needs-attention";
  aiAssisted: boolean;
  source: "deterministic" | "cloud-ai";
}

const POSITIVE_KEYWORDS = ["okay", "ok", "fine", "good", "well", "medicine", "ate", "walked"];
const CONCERN_KEYWORDS = ["help", "pain", "hurt", "fall", "dizzy", "cannot", "can't", "bad"];

export function summarizeReply(
  elderName: string,
  transcript: string
): ReplySummary {
  const lower = transcript.toLowerCase();
  const hasPositive = POSITIVE_KEYWORDS.some((k) => lower.includes(k));
  const hasConcern = CONCERN_KEYWORDS.some((k) => lower.includes(k));

  let sentiment: ReplySummary["sentiment"] = "neutral";
  let oneLiner: string;

  if (hasConcern) {
    sentiment = "needs-attention";
    oneLiner = `${elderName} may need attention — her reply mentions something worth following up on.`;
  } else if (hasPositive) {
    sentiment = "positive";
    // Extract key phrases
    const phrases: string[] = [];
    if (lower.includes("medicine") || lower.includes("tablet")) phrases.push("took medicine");
    if (lower.includes("ate") || lower.includes("food") || lower.includes("eat")) phrases.push("had a meal");
    if (lower.includes("walk")) phrases.push("went for a walk");
    if (lower.includes("okay") || lower.includes("ok") || lower.includes("fine"))
      phrases.push("feeling fine");
    oneLiner = `${elderName} says: ${phrases.length > 0 ? phrases.join(", ") : "doing well"}.`;
  } else {
    oneLiner = `${elderName} replied. Review the full transcript for context.`;
  }

  return {
    oneLiner: guardSafety(oneLiner),
    sentiment,
    aiAssisted: true,
    source: "deterministic",
  };
}

// ─── Caregiver update generation ──────────────────────────────────────────────
export function generateCaregiverUpdate(
  elderName: string,
  event: string
): string {
  const templates: Record<string, string> = {
    "check-in": `${elderName} confirmed she is feeling okay. No action needed right now.`,
    "help-request": `⚠️ ${elderName} requested help from her care circle. Please check in as soon as possible.`,
    "voice-reply": `${elderName} sent a voice reply. A transcript is available in the timeline.`,
    "photo-viewed": `${elderName} viewed the photo you shared.`,
    "message-played": `${elderName} listened to your voice message.`,
  };
  return guardSafety(templates[event] ?? `${elderName}: ${event}`);
}
