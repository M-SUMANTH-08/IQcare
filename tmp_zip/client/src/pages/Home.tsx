import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  Activity, AlertTriangle, ArrowRight, Bell, Check, CheckCircle2, ChevronRight, CircleHelp,
  Clock3, Heart, HeartPulse, Image as ImageIcon, Languages, Leaf, MessageCircle,
  Mic2, MicOff, Pause, Phone, Play, Radio, RefreshCw, Send, ShieldCheck, Sparkles,
  Square, UserRound, Users, Volume2, Watch, Waves, X, Zap
} from "lucide-react";
import { explainAlert, summarizeReply, type MetricType as AIMetricType, type TimeOfDay as AITimeOfDay } from "@/lib/aiService";
import { getTimeOfDay } from "@/lib/simulationEngine";

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = "grandparent" | "caregiver" | "grandchild";
type Device = "keypad" | "smartphone";
type Mode = "caregiver" | "grandma";
type JourneyStage = "sense" | "understand" | "alert" | "connect" | "care";
type IVRStep = "idle" | "calling" | "connected" | "playing" | "replying" | "complete";
type OfflineStatus = "draft" | "queued" | "sms-ready" | "synced";

interface TimelineItem {
  title: string;
  detail: string;
  time: string;
  tone: "cyan" | "amber" | "coral" | "green";
  icon: typeof Activity;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "iqcare-demo-state";
const DEFAULT_PHOTO = "/brand/iqcare-logo.webp"; // bundled local fallback
const LANGUAGES = ["Telugu", "Hindi", "Tamil", "English"];

const stages: { id: JourneyStage; label: string; caption: string; icon: typeof Activity }[] = [
  { id: "sense", label: "Sense", caption: "wearable data", icon: Radio },
  { id: "understand", label: "Understand", caption: "personal baseline", icon: Waves },
  { id: "alert", label: "Alert", caption: "human review", icon: Bell },
  { id: "connect", label: "Connect", caption: "voice bridge", icon: MessageCircle },
  { id: "care", label: "Care", caption: "reply received", icon: Heart },
];

const initialTimeline: TimelineItem[] = [
  { title: "Wearable sync complete", detail: "Heart rate, motion and sleep signals are fresh.", time: "Just now", tone: "cyan", icon: Watch },
  { title: "Morning routine looks steady", detail: "Tea, medication and a 12-minute walk detected.", time: "08:42", tone: "green", icon: Leaf },
  { title: "Quiet hours protected", detail: "No notification nudges sent during rest window.", time: "07:10", tone: "amber", icon: Clock3 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

// Icon lookup for timeline deserialization
const ICON_MAP: Record<string, typeof Activity> = {
  Activity, Watch, Leaf, Clock3, Zap, ShieldCheck, Mic2, Phone, ImageIcon,
  Heart, CheckCircle2, Radio, Send, RefreshCw, Volume2, X, AlertTriangle, Bell,
};
function iconFromName(name: string): typeof Activity {
  return ICON_MAP[name] ?? Activity;
}
function iconToName(icon: typeof Activity): string {
  for (const [k, v] of Object.entries(ICON_MAP)) {
    if (v === icon) return k;
  }
  return "Activity";
}

// ─── State Persistence ────────────────────────────────────────────────────────
interface PersistedState {
  role: Role | null;
  setupDone: boolean;
  device: Device | null;
  language: string;
  mode: Mode;
  activeStage: JourneyStage;
  alert: boolean;
  resolved: boolean;
  voiceSent: boolean;
  photoShared: boolean;
  checkedIn: boolean;
  helpRequested: boolean;
  sharedPhotoUrl: string;
  photoCaption: string;
  alertExplanation: string;
  replyTranscript: string;
  offlineStatus: OfflineStatus;
  offlineMessage: string;
  timeline: Array<Omit<TimelineItem, "icon"> & { iconName: string }>;
}

function loadState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded — acceptable for prototype
  }
}

// ─── TTS Helper ───────────────────────────────────────────────────────────────
function speak(text: string, lang = "en-IN"): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
  return true;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function AppMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-mark ${compact ? "brand-mark-compact" : ""}`}>
      <img src="/brand/iqcare-logo.webp" alt="iQcare logo" />
    </div>
  );
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ role, setRole, onContinue }: { role: Role | null; setRole: (role: Role) => void; onContinue: () => void }) {
  const roleOptions = [
    { id: "grandchild" as const, title: "I am a grandchild", detail: "I want to stay close and help from a distance.", icon: Sparkles },
    { id: "caregiver" as const, title: "I am a parent / caregiver", detail: "I coordinate care for someone I love.", icon: ShieldCheck },
    { id: "grandparent" as const, title: "I am a grandparent", detail: "I want a simple way to hear from family.", icon: Heart },
  ];
  return (
    <div className="onboarding-shell">
      <div className="onboarding-glow onboarding-glow-one" />
      <div className="onboarding-glow onboarding-glow-two" />
      <header className="onboarding-header">
        <div className="brand-lockup"><AppMark /><div><strong>IQcare</strong><span>SIGNAL TO CARE</span></div></div>
        <span className="onboarding-version">iQOO inspired care concept · 01</span>
      </header>
      <main className="onboarding-main">
        <div className="onboarding-copy">
          <div className="onboarding-kicker"><span /> A care bridge for every kind of phone</div>
          <h1>Care that meets<br /><em>people where they are.</em></h1>
          <p>IQcare helps younger caregivers understand what is changing, then reaches older family members through the technology they already trust.</p>
          <div className="onboarding-flow"><span>Sense</span><i /><span>Understand</span><i /><span>Connect</span><i /><span>Care</span></div>
        </div>
        <section className="role-card">
          <Eyebrow>Let's make this personal</Eyebrow>
          <h2>Who are you in the care circle?</h2>
          <p className="role-subtitle">Your view will be designed around what you need to do.</p>
          <div className="role-options">
            {roleOptions.map(({ id, title, detail, icon: Icon }) => (
              <button key={id} className={`role-option ${role === id ? "role-selected" : ""}`} onClick={() => setRole(id)}>
                <span className="role-icon"><Icon size={18} /></span>
                <span><strong>{title}</strong><small>{detail}</small></span>
                <span className="role-radio">{role === id && <Check size={13} />}</span>
              </button>
            ))}
          </div>
          <button className="onboarding-cta" disabled={!role} onClick={onContinue}>
            Continue to your care circle <ArrowRight size={16} />
          </button>
          <div className="onboarding-note"><ShieldCheck size={14} /> Private by design · no medical diagnosis</div>
        </section>
      </main>
      <footer className="onboarding-footer">
        <span>IQcare / 2026</span>
        <span><Zap size={12} /> Inspired by iQOO performance. Designed for human care.</span>
      </footer>
    </div>
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────
function Setup({ device, setDevice, language, setLanguage, onBack, onContinue }: {
  device: Device | null; setDevice: (d: Device) => void; language: string; setLanguage: (l: string) => void; onBack: () => void; onContinue: () => void;
}) {
  return (
    <div className="onboarding-shell setup-shell">
      <header className="onboarding-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <div className="brand-lockup"><AppMark /><div><strong>IQcare</strong><span>CARE CIRCLE SETUP</span></div></div>
        <span className="setup-step">02 / 03</span>
      </header>
      <main className="setup-main">
        <div className="setup-copy">
          <div className="onboarding-kicker"><span /> One important choice</div>
          <h1>How does your<br /><em>grandma connect?</em></h1>
          <p>IQcare changes the experience to match her device — not the other way around.</p>
          <div className="device-preview">
            <div className={`device-silhouette ${device === "keypad" ? "device-keypad" : ""}`}>
              <div className="device-speaker" />
              <div className="device-screen">
                {device === "keypad" ? <><Phone size={18} /><small>INCOMING CALL</small></> : <><HeartPulse size={18} /><small>GRANDMA MODE</small></>}
              </div>
              <div className="device-buttons"><i /><i /><i /><i /><i /><i /></div>
            </div>
            <div className="device-preview-label">
              <span>{device === "keypad" ? "IVR voice bridge" : "Simple smartphone mode"}</span>
              <small>{device === "keypad" ? "No app or internet required" : "Large text · one-tap actions"}</small>
            </div>
          </div>
        </div>
        <section className="role-card setup-card">
          <Eyebrow>Grandma's device</Eyebrow>
          <h2>Which phone does she use?</h2>
          <div className="device-options">
            <button className={`device-option ${device === "keypad" ? "device-selected" : ""}`} onClick={() => setDevice("keypad")}>
              <span className="device-option-icon"><Phone size={20} /></span>
              <span><strong>Keypad phone</strong><small>Receives voice calls and uses number buttons.</small></span>
              <span className="role-radio">{device === "keypad" && <Check size={13} />}</span>
            </button>
            <button className={`device-option ${device === "smartphone" ? "device-selected" : ""}`} onClick={() => setDevice("smartphone")}>
              <span className="device-option-icon smartphone-icon"><Activity size={20} /></span>
              <span><strong>Smartphone</strong><small>Uses an ultra-simple Grandma screen.</small></span>
              <span className="role-radio">{device === "smartphone" && <Check size={13} />}</span>
            </button>
          </div>
          <div className="language-field">
            <label><Languages size={14} /> Preferred language for IVR</label>
            <div className="language-pills">
              {LANGUAGES.map((item) => (
                <button key={item} className={language === item ? "language-active" : ""} onClick={() => setLanguage(item)}>{item}</button>
              ))}
            </div>
          </div>
          <button className="onboarding-cta" disabled={!device} onClick={onContinue}>Open the care bridge <ArrowRight size={16} /></button>
          <div className="onboarding-note"><Radio size={14} /> Wearable data will be simulated in this prototype</div>
        </section>
      </main>
    </div>
  );
}

// ─── Journey Track ────────────────────────────────────────────────────────────
function Journey({ activeStage, onStageClick }: { activeStage: JourneyStage; onStageClick: (s: JourneyStage) => void }) {
  const activeIndex = stages.findIndex((s) => s.id === activeStage);
  return (
    <div className="journey-track">
      {stages.map((stage, index) => {
        const Icon = stage.icon;
        const done = index < activeIndex;
        return (
          <button key={stage.id} className={`journey-step ${stage.id === activeStage ? "journey-active" : ""} ${done ? "journey-done" : ""}`} onClick={() => onStageClick(stage.id)}>
            <span className="journey-node"><Icon size={15} />{done && <Check size={10} className="journey-check" />}</span>
            <span className="journey-copy"><strong>{stage.label}</strong><small>{stage.caption}</small></span>
            {index < stages.length - 1 && <span className="journey-line" />}
          </button>
        );
      })}
    </div>
  );
}

// ─── Mini Chart ───────────────────────────────────────────────────────────────
function MiniChart({ alert }: { alert: boolean }) {
  const points = alert
    ? "0,74 22,68 44,80 66,62 88,70 110,45 132,64 154,28 176,59 198,22 220,49 242,15 264,53 286,39 308,67 330,50 352,77 380,62"
    : "0,76 22,69 44,73 66,63 88,67 110,54 132,60 154,48 176,57 198,43 220,50 242,39 264,47 286,36 308,48 330,40 352,52 380,38";
  return (
    <div className="signal-chart">
      <div className="chart-axis"><span>120</span><span>90</span><span>60</span></div>
      <svg viewBox="0 0 380 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={alert ? "#ff8f69" : "#75ebef"} stopOpacity=".22" />
            <stop offset="100%" stopColor={alert ? "#ff8f69" : "#75ebef"} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[18, 42, 66, 90].map((y) => <line key={y} x1="0" y1={y} x2="380" y2={y} className="chart-grid" />)}
        <polyline points={`${points} 380,100 0,100`} fill="url(#fill)" />
        <polyline points={points} fill="none" stroke={alert ? "#ff9472" : "#72e6ea"} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="chart-footer"><span>06:00</span><span>10:00</span><span>14:00</span><span>18:00</span><span>Now</span></div>
    </div>
  );
}

// ─── IVR Modal ────────────────────────────────────────────────────────────────
function IVRModal({ step, language, onClose, onStart, onListen, onOkay, onReply, onHelp }: {
  step: IVRStep; language: string; onClose: () => void; onStart: () => void;
  onListen: () => void; onOkay: () => void; onReply: () => void; onHelp: () => void;
}) {
  const labels: Record<IVRStep, string> = {
    idle: "Ready to call Meera", calling: "Calling Meera…", connected: "Call connected",
    playing: "Playing Sumanth's message", replying: "Recording Grandma's reply", complete: "Reply received",
  };

  // TTS for IVR steps
  useEffect(() => {
    if (step === "connected") {
      speak(`Hello Meera. Your grandson sent a message. Press 1 to listen, 2 if you are okay, or 3 to record a reply.`);
    } else if (step === "playing") {
      speak("Hi Grandma, it's Sumanth. I'm thinking of you. Please let me know if you're okay.");
    } else if (step === "replying") {
      speak("Tell Sumanth I am okay. I took my medicine.");
    }
  }, [step]);

  return (
    <div className="ivr-modal">
      <div className="ivr-backdrop" onClick={onClose} />
      <div className="ivr-card">
        <button className="modal-close" onClick={onClose}><X size={18} /></button>
        <div className="ivr-status"><span className={step === "complete" ? "ivr-good" : ""} /> {labels[step]}</div>
        <div className="ivr-phone">
          <div className="ivr-phone-glow" />
          <Phone size={32} />
          <strong>Meera</strong>
          <small>+91 · {language} voice bridge</small>
          <div className="ivr-wave">{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <i key={n} />)}</div>
          <span className="ivr-timer">{step === "idle" ? "--:--" : step === "complete" ? "00:28" : "00:0" + (step === "calling" ? "4" : "9")}</span>
        </div>
        <div className="ivr-prompt">
          {step === "idle" && <>Send a personal voice message through a normal phone call — no app required.</>}
          {step === "calling" && <>The bridge is dialing her {language} IVR line.</>}
          {step === "connected" && <>"Hello Meera. Your grandson sent a message. Press 1 to listen, 2 if you are okay, 3 to record a reply, or 0 for help."</>}
          {step === "playing" && <>Playing: "Hi Grandma, it's Sumanth. I'm thinking of you. Please let me know if you're okay."</>}
          {step === "replying" && <>Recording… Grandma is speaking: "Tell Sumanth I am okay. I took my medicine."</>}
          {step === "complete" && <>Grandma's voice reply is back with a transcription in the caregiver dashboard.</>}
        </div>
        <div className="ivr-actions">
          {step === "idle" && <button className="ivr-primary" onClick={onStart}><Phone size={16} /> Start IVR call</button>}
          {step === "calling" && <div className="ivr-loading"><span /> Connecting securely…</div>}
          {step === "connected" && (
            <>
              <button className="key-button" onClick={onListen}>1 <small>Listen</small></button>
              <button className="key-button" onClick={onOkay}>2 <small>I'm okay</small></button>
              <button className="key-button" onClick={onReply}>3 <small>Reply</small></button>
              <button className="key-button" style={{ borderColor: "rgba(255,150,100,.4)" }} onClick={onHelp}>0 <small>Help</small></button>
            </>
          )}
          {step === "playing" && <button className="ivr-primary" onClick={onOkay}><Check size={16} /> Grandma is okay</button>}
          {step === "replying" && <button className="ivr-primary" onClick={onReply}><Send size={16} /> Send reply to caregiver</button>}
          {step === "complete" && <button className="ivr-primary" onClick={onClose}><CheckCircle2 size={16} /> View reply in dashboard</button>}
        </div>
        <p className="ivr-disclaimer"><ShieldCheck size={13} /> Prototype IVR simulation · not an emergency service</p>
      </div>
    </div>
  );
}

// ─── Voice Recorder ───────────────────────────────────────────────────────────
function VoiceRecorder({ onComplete, onCancel }: { onComplete: (audioUrl: string | null, transcript: string) => void; onCancel: () => void }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicAvailable(true);
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);

      // Try Speech Recognition
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN";
        recognition.onresult = (event: any) => {
          let finalT = "";
          for (let i = 0; i < event.results.length; i++) {
            finalT += event.results[i][0].transcript;
          }
          setTranscript(finalT);
        };
        recognition.onerror = () => { /* gracefully ignore STT errors */ };
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch {
      setMicAvailable(false);
      setTranscript("Hi Grandma, I'm thinking of you. Please let me know if you're okay.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop();
    setRecording(false);
  }, []);

  const handleSend = () => {
    const finalTranscript = transcript || "Hi Grandma, I'm thinking of you. Please let me know if you're okay.";
    onComplete(audioUrl, finalTranscript);
  };

  return (
    <div className="ivr-modal">
      <div className="ivr-backdrop" onClick={onCancel} />
      <div className="ivr-card" style={{ maxWidth: 420 }}>
        <button className="modal-close" onClick={onCancel}><X size={18} /></button>
        <div className="ivr-status"><span className={audioUrl ? "ivr-good" : ""} /> {recording ? "Recording…" : audioUrl ? "Message ready" : "Send a voice message"}</div>

        <div className="ivr-phone" style={{ minHeight: 160 }}>
          <div className="ivr-phone-glow" />
          {micAvailable === false && (
            <div style={{ textAlign: "center", color: "#ffb185" }}>
              <MicOff size={28} />
              <p style={{ fontSize: 10, marginTop: 8 }}>Microphone unavailable — using simulated message</p>
            </div>
          )}
          {micAvailable !== false && (
            <>
              <Mic2 size={32} />
              {recording && <div className="ivr-wave">{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <i key={n} />)}</div>}
            </>
          )}
        </div>

        {transcript && (
          <div style={{ padding: "10px 14px", margin: "0 0 10px", borderRadius: 10, background: "rgba(116,222,213,.08)", border: "1px solid rgba(116,222,213,.2)" }}>
            <p style={{ margin: 0, fontSize: 9, color: "#8fb" }}>
              {micAvailable ? "✨ Live speech-to-text" : "✨ Simulated transcript (demo fallback)"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 11, color: "#d4f0e8" }}>"{transcript}"</p>
          </div>
        )}

        <div className="ivr-actions" style={{ flexDirection: "column", gap: 8 }}>
          {!recording && !audioUrl && (
            <button className="ivr-primary" onClick={startRecording} style={{ width: "100%" }}>
              <Mic2 size={16} /> {micAvailable === false ? "Use simulated message" : "Start recording"}
            </button>
          )}
          {recording && (
            <button className="ivr-primary" onClick={stopRecording} style={{ width: "100%", background: "#ff9472" }}>
              <Square size={16} /> Stop recording
            </button>
          )}
          {(audioUrl || micAvailable === false) && !recording && (
            <button className="ivr-primary" onClick={handleSend} style={{ width: "100%" }}>
              <Send size={16} /> Send to Meera
            </button>
          )}
        </div>
        <p className="ivr-disclaimer"><ShieldCheck size={13} /> {micAvailable ? "Real microphone recording" : "Simulated demo"} · not an emergency service</p>
      </div>
    </div>
  );
}

// ─── Grandma Mode ─────────────────────────────────────────────────────────────
function GrandmaMode({ device, language, voiceSent, photoShared, photoUrl, photoCaption, checkedIn, helpRequested,
  onMode, onPlay, onPhoto, onOkay, onCall, onHelp,
}: {
  device: Device; language: string; voiceSent: boolean; photoShared: boolean; photoUrl: string;
  photoCaption: string; checkedIn: boolean; helpRequested: boolean;
  onMode: (m: Mode) => void; onPlay: () => void; onPhoto: () => void;
  onOkay: () => void; onCall: () => void; onHelp: () => void;
}) {
  return (
    <div className="grandma-stage">
      <div className="grandma-topbar">
        <button className="grandma-brand" onClick={() => onMode("caregiver")}><AppMark compact /><span>IQcare</span></button>
        <span className="grandma-sync"><span /> {device === "keypad" ? `${language} IVR bridge` : "Connected"}</span>
      </div>

      {device === "keypad" ? (
        <div className="phone-grandma-view">
          <div className="phone-shell">
            <div className="phone-screen">
              <div className="phone-signal"><span /><span /><span /> IQcare call</div>
              <div className="phone-avatar"><Heart size={25} fill="currentColor" /></div>
              <h1>{voiceSent ? "Message from Sumanth" : "IQcare is ready"}</h1>
              <p>{voiceSent ? "Press a button to listen or reply." : "Your family can reach you here."}</p>
              <button className="phone-big-button" onClick={onPlay} disabled={!voiceSent}>
                <Play size={21} fill="currentColor" /> {voiceSent ? "1 · Listen" : "Waiting for message"}
              </button>
              <div className="phone-keypad">
                <button onClick={onPlay}>1<small>Listen</small></button>
                <button onClick={onOkay}>2<small>I'm okay</small></button>
                <button onClick={onCall}>3<small>Call family</small></button>
              </div>
              <small className="phone-language">Voice language: {language}</small>
            </div>
          </div>
          <div className="phone-caption">
            <Eyebrow>Keypad phone mode</Eyebrow>
            <h2>She uses the phone she already understands.</h2>
            <p>No app, no typing, no new technology to learn.</p>
          </div>
        </div>
      ) : (
        <div className="grandma-content">
          <div className="grandma-greeting">
            <Eyebrow>{new Date().toLocaleDateString("en-IN", { weekday: "long" })} · {now()}</Eyebrow>
            <h1>Hello, Meera<span>.</span></h1>
            <p>Your family is close by.</p>
          </div>

          {/* Voice message card */}
          <div className="grandma-card voice-card">
            <div className="grandma-card-top">
              <span className="grandma-label"><span className="label-dot" /> New message</span>
              <span className="message-time">{now()}</span>
            </div>
            <div className="voice-person">
              <span className="avatar avatar-arjun avatar-large">S</span>
              <div><strong>Sumanth sent you a voice message</strong><span>"Thinking of you, Grandma"</span></div>
            </div>
            <button className={`voice-play-button ${voiceSent ? "" : ""}`} onClick={onPlay} disabled={!voiceSent}>
              <span className="play-circle"><Play size={20} fill="currentColor" /></span>
              <span>{voiceSent ? "Play Sumanth's message" : "No new message yet"}</span>
              <Volume2 size={20} />
            </button>
          </div>

          {/* Photo card */}
          <div className="grandma-card photo-card">
            <div className="grandma-card-top">
              <span className="grandma-label"><ImageIcon size={14} /> A photo for you</span>
              <span className="message-time">{now()}</span>
            </div>
            {photoShared ? (
              <button className="photo-frame" onClick={onPhoto}>
                <img src={photoUrl} alt="Shared photo from Sumanth" />
                <span className="photo-overlay"><ImageIcon size={17} /> Tap to see photo</span>
              </button>
            ) : (
              <button className="photo-empty" onClick={onPhoto}>
                <span><ImageIcon size={21} /></span>
                <strong>Your next photo will appear here</strong>
                <small>Sumanth can share one from his phone</small>
              </button>
            )}
          </div>

          {/* I'm okay */}
          <button className={`okay-button ${checkedIn ? "okay-done" : ""}`} onClick={onOkay}>
            {checkedIn ? <><CheckCircle2 size={21} /> Sumanth knows you are okay</> : <><Heart size={21} /> I'm feeling okay</>}
          </button>

          {/* Ask for help */}
          <button
            className={`okay-button ${helpRequested ? "okay-done" : ""}`}
            onClick={onHelp}
            style={helpRequested ? {} : { background: "#e85d4a", marginTop: 10, boxShadow: "0 8px 17px rgba(232,93,74,.17)" }}
          >
            {helpRequested ? <><CheckCircle2 size={21} /> Help request sent to family</> : <><AlertTriangle size={21} /> Ask family for help</>}
          </button>

          {/* Call */}
          <button className="grandma-call-button" onClick={onCall}><Phone size={17} /> Call Sumanth</button>
          <p className="grandma-footer"><ShieldCheck size={14} /> Your simple space. Nothing to learn.</p>
        </div>
      )}

      <div className="grandma-mode-hint">
        <span>Grandma view</span>
        <button onClick={() => onMode("caregiver")}><UserRound size={13} /> Return to caregiver</button>
      </div>
    </div>
  );
}

// ─── Offline Bridge ───────────────────────────────────────────────────────────
function OfflineBridge({ online, status, message, onMessage, onQueue, onSpeak, onSms, onSync }: {
  online: boolean; status: OfflineStatus; message: string;
  onMessage: (m: string) => void; onQueue: () => void; onSpeak: () => void; onSms: () => void; onSync: () => void;
}) {
  const statusLabel: Record<OfflineStatus, string> = { draft: "Draft on this phone", queued: "Queued for SMS", "sms-ready": "SMS handoff ready", synced: "Synced to care circle" };
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  return (
    <section className="offline-bridge panel-card">
      <div className="offline-bridge-heading">
        <div><Eyebrow>Offline-first bridge</Eyebrow><h3>Reach Grandma when data is gone</h3></div>
        <span className={`offline-network ${online ? "network-online" : "network-offline"}`}><span /> {online ? "Internet available" : "No internet"}</span>
      </div>
      <p className="offline-bridge-copy">Speak a short care message. IQcare keeps it on this phone, uses SMS when cellular service exists, and syncs the delivery state when internet returns.</p>
      <div className="offline-compose">
        <textarea value={message} onChange={(e) => onMessage(e.target.value)} aria-label="Offline care message" placeholder="Hi Grandma, I'm travelling today. Please reply OK or HELP." />
        <div className="offline-compose-actions">
          <button className="offline-speak" onClick={onSpeak} disabled={!message || !canSpeak}><Volume2 size={15} /> Read aloud on this phone</button>
          <span className="offline-count">{message.length}/140</span>
        </div>
      </div>
      <div className="offline-status-row">
        <span className={`offline-status-dot status-${status}`} />
        <strong>{statusLabel[status]}</strong>
        <small>{status === "queued" ? "Waiting for a cellular path" : status === "sms-ready" ? "Tap to open your phone's SMS composer" : status === "synced" ? "Delivery event is back in the care timeline" : "Nothing has been sent yet"}</small>
      </div>
      <div className="offline-actions">
        <button className="offline-primary" onClick={onQueue} disabled={!message || status === "queued"}><Radio size={15} /> {status === "queued" ? "Message queued" : "Save offline"}</button>
        <button className="offline-sms" onClick={onSms} disabled={!message}><Send size={15} /> Open SMS composer</button>
        {status === "queued" && <button className="offline-sync" onClick={onSync}><RefreshCw size={15} /> Simulate internet return</button>}
      </div>
      <div className="offline-footnote"><ShieldCheck size={13} /> Real device actions: local queue + browser speech + SMS composer handoff. The user still confirms Send.</div>
    </section>
  );
}

// ─── Caregiver Dashboard ──────────────────────────────────────────────────────
function CaregiverDashboard({ device, language, alert, resolved, voiceSent, photoShared, checkedIn,
  helpRequested, activeStage, timeline, demoRunning, demoSeconds, offlineStatus, offlineMessage, online,
  alertExplanation, replyTranscript, confidence,
  onMode, onAlert, onVoice, onPhoto, onIVR, onReset, onStage,
  onOfflineMessage, onOfflineQueue, onOfflineSpeak, onOfflineSms, onOfflineSync,
}: {
  device: Device; language: string; alert: boolean; resolved: boolean; voiceSent: boolean;
  photoShared: boolean; checkedIn: boolean; helpRequested: boolean;
  activeStage: JourneyStage; timeline: TimelineItem[]; demoRunning: boolean; demoSeconds: number;
  offlineStatus: OfflineStatus; offlineMessage: string; online: boolean;
  alertExplanation: string; replyTranscript: string; confidence: number;
  onMode: (m: Mode) => void; onAlert: () => void; onVoice: () => void;
  onPhoto: () => void; onIVR: () => void; onReset: () => void; onStage: (s: JourneyStage) => void;
  onOfflineMessage: (m: string) => void; onOfflineQueue: () => void; onOfflineSpeak: () => void;
  onOfflineSms: () => void; onOfflineSync: () => void;
}) {
  const isKeypad = device === "keypad";
  const movementSteps = alert && !resolved ? "3,284" : "4,812";

  return (
    <div className="app-shell dashboard-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-lockup"><AppMark /><div><strong>IQcare</strong><span>SIGNAL TO CARE</span></div></div>
          <div className="live-indicator"><span /> Live prototype</div>
        </div>
        <nav className="sidebar-nav">
          <button className="nav-item nav-active"><Activity size={17} /><span>Overview</span><i>01</i></button>
          <button className="nav-item"><MessageCircle size={17} /><span>Bridge inbox</span><i className={voiceSent ? "nav-notify" : ""}>{voiceSent ? "1" : ""}</i></button>
          <button className="nav-item"><HeartPulse size={17} /><span>Care plan</span><i /></button>
          <button className="nav-item"><Users size={17} /><span>Care circle</span><i /></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="principle-card"><Sparkles size={16} /><p>Smart for you.<br /><b>Simple for her.</b></p><span>iQOO-inspired care concept</span></div>
          <button className="profile-chip">
            <span className="avatar avatar-arjun">S</span>
            <span><b>Sumanth Reddy</b><small>Grandchild · primary caregiver</small></span>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        <header className="topbar">
          <div className="mobile-brand"><AppMark compact /><span>IQcare</span></div>
          <div className="topbar-context"><span className="context-dot" /> Connected to <strong>Meera</strong><span className="context-separator">/</span><span>{isKeypad ? `${language} IVR bridge` : "simple smartphone mode"}</span></div>
          <div className="topbar-actions">
            <div className="device-chip"><span className={isKeypad ? "chip-keypad" : "chip-smartphone"}>{isKeypad ? <Phone size={12} /> : <Activity size={12} />}</span>{isKeypad ? "Keypad phone" : "Smartphone"}</div>
            <div className="mode-switch">
              <button className="mode-selected" onClick={() => onMode("caregiver")}><UserRound size={14} /> Caregiver</button>
              <button onClick={() => onMode("grandma")}><Heart size={14} /> Grandma</button>
            </div>
            <button className="icon-button"><Bell size={17} />{(alert || helpRequested) && <span className="notification-dot" />}</button>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Page intro */}
          <div className="page-intro">
            <div>
              <Eyebrow>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · {now()}</Eyebrow>
              <h1>Good {getTimeOfDay() === "morning" ? "morning" : getTimeOfDay() === "afternoon" ? "afternoon" : "evening"}, Sumanth<span>.</span></h1>
              <p className="intro-subtitle">Your care bridge is ready. Meera is {checkedIn ? "feeling okay" : helpRequested ? "requesting help" : "in your circle"}.</p>
            </div>
            <div className="demo-controls">
              <div className="demo-clock"><Zap size={14} /><span>{demoRunning ? `Demo ${formatTime(demoSeconds)}` : "75 sec demo"}</span></div>
              <button className="demo-button" onClick={onAlert}><Play size={14} /> {alert ? "Reset / replay alert" : "Run care demo"}</button>
              <button className="reset-button" onClick={onReset} title="Reset entire demo"><RefreshCw size={15} /></button>
            </div>
          </div>

          {/* Help request banner */}
          {helpRequested && (
            <div style={{ padding: "14px 18px", marginBottom: 15, borderRadius: 13, background: "linear-gradient(120deg, #fff0e5, #ffe3d8)", border: "1px solid rgba(232,93,74,.25)", display: "flex", alignItems: "center", gap: 12 }}>
              <AlertTriangle size={20} style={{ color: "#e85d4a", flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: 12, color: "#7a3322" }}>Meera requested help from her care circle</strong>
                <p style={{ margin: "4px 0 0", fontSize: 10, color: "#a5614f" }}>Check in as soon as possible. This is not an emergency call — verify her status directly.</p>
              </div>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 8, color: "#c07755" }}>{now()}</span>
            </div>
          )}

          {/* Reply transcript banner */}
          {replyTranscript && (
            <div style={{ padding: "14px 18px", marginBottom: 15, borderRadius: 13, background: "linear-gradient(120deg, #e9f8ee, #dff6f0)", border: "1px solid rgba(87,185,149,.25)", display: "flex", alignItems: "center", gap: 12 }}>
              <Mic2 size={18} style={{ color: "#3e8c85", flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: 11, color: "#2e5553" }}>✨ Grandma's voice reply transcribed</strong>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#4a7a6e" }}>"{replyTranscript}"</p>
                <p style={{ margin: "4px 0 0", fontSize: 8, color: "#8ab5a5", fontFamily: "var(--font-mono)" }}>AI-assisted transcription · deterministic fallback · review original audio</p>
              </div>
            </div>
          )}

          <OfflineBridge online={online} status={offlineStatus} message={offlineMessage} onMessage={onOfflineMessage} onQueue={onOfflineQueue} onSpeak={onOfflineSpeak} onSms={onOfflineSms} onSync={onOfflineSync} />

          {/* Top grid */}
          <div className="dashboard-grid dashboard-grid-top">
            {/* Hero card */}
            <section className={`hero-card ${alert && !resolved ? "hero-alert" : ""}`}>
              <div className="hero-content">
                <div className="hero-badge"><span className="pulse-dot" /> {alert && !resolved ? "Needs a human look" : checkedIn ? "Reassurance received" : "All signals feel steady"}</div>
                <h2>
                  {alert && !resolved ? <>A small change.<br /><em>A chance to care.</em></> : checkedIn ? <>Meera is okay.<br /><em>Bridge is quiet.</em></> : <>The bridge is quiet.<br /><em>Meera is doing well.</em></>}
                </h2>
                <p>{alert && !resolved ? (alertExplanation || "Movement changed after her afternoon rest. Nothing is certain — just worth checking in with warmth.") : "Wearable signals are arriving normally. IQcare protects quiet moments and surfaces only what deserves attention."}</p>
                {alert && !resolved && <p style={{ margin: "8px 0 0", fontSize: 8, color: "#ae7b6c", fontFamily: "var(--font-mono)" }}>✨ AI-generated explanation · not a medical diagnosis</p>}
                <div className="hero-actions">
                  {alert && !resolved ? (
                    <button className="primary-cta" onClick={onAlert}><ShieldCheck size={16} /> Review with care <ArrowRight size={15} /></button>
                  ) : (
                    <button className="primary-cta" onClick={isKeypad ? onIVR : onVoice}>{isKeypad ? <Phone size={16} /> : <Mic2 size={16} />} {isKeypad ? "Start IVR voice bridge" : "Send a gentle hello"} <ArrowRight size={15} /></button>
                  )}
                  <span className="hero-note"><CheckCircle2 size={14} /> Not a diagnosis. Just context.</span>
                </div>
              </div>
              <div className="hero-visual">
                <div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit orbit-three" />
                <div className="signal-core"><HeartPulse size={32} /><span>{alert && !resolved ? "review" : "steady"}</span></div>
                <span className="orbit-label label-top">heart rhythm</span><span className="orbit-label label-right">motion</span><span className="orbit-label label-bottom">care link</span>
              </div>
            </section>

            {/* Pattern card */}
            <section className="pattern-card panel-card">
              <div className="card-heading">
                <div><Eyebrow>Pattern watch</Eyebrow><h3>Signal confidence</h3></div>
                <span className={`confidence-ring ${alert && !resolved ? "confidence-warn" : ""}`}><b>{confidence}</b><small>%</small></span>
              </div>
              <div className="confidence-copy">
                <span className={`mini-state ${alert && !resolved ? "mini-warn" : "mini-good"}`}><span /> {alert && !resolved ? "Review suggested" : "Within her rhythm"}</span>
                <p>{alert && !resolved ? "One unusual motion cluster needs context before we worry." : "We learn Meera's normal before we call anything unusual."}</p>
              </div>
              <div className="pattern-row"><span>Usual rhythm</span><div className="pattern-track"><i style={{ width: alert && !resolved ? "72%" : "94%" }} /></div><strong>{alert && !resolved ? "72" : "94"}</strong></div>
              <div className="pattern-row"><span>Context gathered</span><div className="pattern-track"><i className="pattern-amber" style={{ width: alert && !resolved ? "46%" : "88%" }} /></div><strong>{alert && !resolved ? "46" : "88"}</strong></div>
              <div className="card-footnote"><CircleHelp size={13} /> Simulated wearable data · not medical advice</div>
            </section>
          </div>

          {/* Journey panel */}
          <section className="journey-panel panel-card">
            <div className="card-heading"><div><Eyebrow>The care loop</Eyebrow><h3>From signal to reassurance</h3></div><span className="shared-badge"><span /> Shared state</span></div>
            <Journey activeStage={activeStage} onStageClick={onStage} />
          </section>

          {/* Metric cards */}
          <div className="metric-row">
            <div className="metric-card panel-card">
              <span className="metric-icon metric-cyan"><HeartPulse size={17} /></span>
              <div><p>Heart rate</p><strong>76 <small>bpm</small></strong><span className="metric-trend trend-good">↘ 4% today</span></div>
              <div className="micro-bars bars-cyan"><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
            <div className="metric-card panel-card">
              <span className="metric-icon metric-amber"><Activity size={17} /></span>
              <div><p>Movement</p><strong>{movementSteps} <small>steps</small></strong><span className={`metric-trend ${alert && !resolved ? "trend-warn" : "trend-good"}`}>{alert && !resolved ? "pattern shifted" : "on her way"}</span></div>
              <div className="micro-bars bars-amber"><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
            <div className="metric-card panel-card">
              <span className="metric-icon metric-violet"><Clock3 size={17} /></span>
              <div><p>Rest quality</p><strong>7h 42<small>m</small></strong><span className="metric-trend trend-good">↑ restful night</span></div>
              <div className="micro-bars bars-violet"><i /><i /><i /><i /><i /><i /><i /></div>
            </div>
          </div>

          {/* Bottom grid */}
          <div className="dashboard-grid dashboard-grid-bottom">
            <section className="signal-panel panel-card">
              <div className="card-heading"><div><Eyebrow>Sense / 24 hours</Eyebrow><h3>Heart rhythm</h3></div><div className="chart-legend"><span /> Meera's usual range</div></div>
              <div className="chart-readout"><strong>76</strong><span>bpm <i>now</i></span><span className={`status-pill ${alert && !resolved ? "status-warning" : "status-success"}`}>{alert && !resolved ? "unusual cluster" : "steady"}</span></div>
              <MiniChart alert={alert && !resolved} />
            </section>

            <section className="connect-panel panel-card">
              <div className="card-heading"><div><Eyebrow>Connect / bridge</Eyebrow><h3>Reach Meera</h3></div><span className="connect-avatar"><Heart size={15} fill="currentColor" /></span></div>
              <p className="connect-copy">Send something she can receive naturally — a voice message, phone call, or familiar photo.</p>
              <div className="connect-actions">
                <button className={`connect-action ${voiceSent ? "action-sent" : ""}`} onClick={isKeypad ? onIVR : onVoice}>
                  <span className="action-icon"><Mic2 size={17} /></span>
                  <span><b>{isKeypad ? (voiceSent ? "IVR message sent" : "Call with voice message") : voiceSent ? "Voice message sent" : "Send a voice message"}</b><small>{isKeypad ? `${language} · normal phone call` : "Your voice, not a notification"}</small></span>
                  <ChevronRight size={16} />
                </button>
                <button className={`connect-action ${photoShared ? "action-sent" : ""}`} onClick={onPhoto}>
                  <span className="action-icon action-photo"><ImageIcon size={17} /></span>
                  <span><b>{photoShared ? "Photo shared" : "Share a photo"}</b><small>{photoShared ? "Visible in Grandma view" : "A familiar moment or medicine"}</small></span>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="delivery-state">
                <span className={voiceSent ? "delivery-on" : ""}><span /> {isKeypad ? "IVR" : "Voice"} {voiceSent ? "delivered" : "ready"}</span>
                <span className={photoShared ? "delivery-on" : ""}><span /> Photo {photoShared ? "delivered" : "ready"}</span>
              </div>
            </section>
          </div>

          {/* Timeline */}
          <section className="timeline-panel panel-card">
            <div className="card-heading"><div><Eyebrow>Bridge inbox</Eyebrow><h3>What changed, gently</h3></div><button className="text-button">View full history <ArrowRight size={14} /></button></div>
            <div className="timeline-list">
              {timeline.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div className="timeline-item" key={`${item.title}-${index}`}>
                    <span className={`timeline-icon timeline-${item.tone}`}><Icon size={15} /></span>
                    <div><b>{item.title}</b><p>{item.detail}</p></div>
                    <time>{item.time}</time>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// ─── Photo Composer ───────────────────────────────────────────────────────────
function PhotoComposer({ fileInputRef, photoDraft, photoCaption, onCaption, onCancel, onSend }: {
  fileInputRef: { current: HTMLInputElement | null }; photoDraft: string | null; photoCaption: string;
  onCaption: (v: string) => void; onCancel: () => void; onSend: () => void;
}) {
  if (!photoDraft) return null;
  return (
    <div className="photo-composer">
      <div className="photo-composer-backdrop" onClick={onCancel} />
      <section className="photo-composer-card" role="dialog" aria-modal="true" aria-label="Send a photo to Grandma">
        <div className="photo-composer-head">
          <div><Eyebrow>Real photo sharing</Eyebrow><h2>Send this moment to Meera</h2></div>
          <button className="modal-close" onClick={onCancel}><X size={18} /></button>
        </div>
        <img className="photo-preview" src={photoDraft} alt="Selected photo preview" />
        <label className="photo-caption-label">Add a gentle caption
          <textarea value={photoCaption} onChange={(e) => onCaption(e.target.value)} maxLength={160} placeholder="A little sunshine for your evening." />
        </label>
        <div className="photo-composer-actions">
          <button className="photo-secondary" onClick={() => fileInputRef.current?.click()}><ImageIcon size={15} /> Replace photo</button>
          <button className="photo-primary" onClick={onSend}><Send size={15} /> Send to Meera</button>
        </div>
        <p className="photo-composer-note"><ShieldCheck size={13} /> Photo stays in this prototype session and appears in Grandma mode. Production delivery uses private storage.</p>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  // ─── Load persisted state ─────────────────────────────────────────────────
  const saved = useMemo(() => loadState(), []);

  const [role, setRole] = useState<Role | null>(saved.role ?? null);
  const [setupDone, setSetupDone] = useState(saved.setupDone ?? false);
  const [device, setDevice] = useState<Device | null>(saved.device ?? null);
  const [language, setLanguage] = useState(saved.language ?? "Telugu");
  const [mode, setMode] = useState<Mode>(saved.mode ?? "caregiver");
  const [activeStage, setActiveStage] = useState<JourneyStage>(saved.activeStage ?? "sense");
  const [alert, setAlert] = useState(saved.alert ?? false);
  const [resolved, setResolved] = useState(saved.resolved ?? false);
  const [voiceSent, setVoiceSent] = useState(saved.voiceSent ?? false);
  const [photoShared, setPhotoShared] = useState(saved.photoShared ?? false);
  const [checkedIn, setCheckedIn] = useState(saved.checkedIn ?? false);
  const [helpRequested, setHelpRequested] = useState(saved.helpRequested ?? false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState(saved.photoCaption ?? "");
  const [sharedPhotoUrl, setSharedPhotoUrl] = useState(saved.sharedPhotoUrl ?? DEFAULT_PHOTO);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [ivrOpen, setIvrOpen] = useState(false);
  const [ivrStep, setIvrStep] = useState<IVRStep>("idle");
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoSeconds, setDemoSeconds] = useState(0);
  const [alertExplanation, setAlertExplanation] = useState(saved.alertExplanation ?? "");
  const [replyTranscript, setReplyTranscript] = useState(saved.replyTranscript ?? "");
  const [confidence, setConfidence] = useState(96);

  // Timeline — deserialize icons from persistence
  const [timeline, setTimeline] = useState<TimelineItem[]>(() => {
    if (saved.timeline?.length) {
      return saved.timeline.map((t) => ({ ...t, icon: iconFromName(t.iconName) }));
    }
    return [...initialTimeline];
  });

  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(saved.offlineStatus ?? "draft");
  const [offlineMessage, setOfflineMessage] = useState(saved.offlineMessage ?? "Hi Grandma, I am travelling today. Please reply OK or HELP.");
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);

  // ─── Persist state on changes ─────────────────────────────────────────────
  useEffect(() => {
    const state: PersistedState = {
      role, setupDone, device, language, mode, activeStage, alert, resolved,
      voiceSent, photoShared, checkedIn, helpRequested, sharedPhotoUrl, photoCaption,
      alertExplanation, replyTranscript, offlineStatus, offlineMessage,
      timeline: timeline.map((t) => ({ ...t, iconName: iconToName(t.icon) })),
    };
    saveState(state);
  }, [role, setupDone, device, language, mode, activeStage, alert, resolved,
    voiceSent, photoShared, checkedIn, helpRequested, sharedPhotoUrl, photoCaption,
    alertExplanation, replyTranscript, offlineStatus, offlineMessage, timeline]);

  // ─── Timeline push ────────────────────────────────────────────────────────
  const push = useCallback((item: Omit<TimelineItem, "time"> & { time?: string }) => {
    setTimeline((items) => [{ ...item, time: item.time ?? now() } as TimelineItem, ...items].slice(0, 12));
  }, []);

  // ─── Demo timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!demoRunning) return;
    const timer = window.setInterval(() => setDemoSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [demoRunning]);

  // ─── Online/Offline ───────────────────────────────────────────────────────
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
  }, []);

  // ─── Auto-demo ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!demoRunning) return;
    const phase = Math.min(Math.floor(demoSeconds / 15), 4);
    setActiveStage(stages[phase].id);
    if (phase >= 1) setAlert(true);
    if (phase >= 2) setResolved(true);
    if (phase >= 3) { setVoiceSent(true); setPhotoShared(true); }
    if (phase >= 4) setCheckedIn(true);
    if (demoSeconds >= 75) setDemoRunning(false);
  }, [demoSeconds, demoRunning]);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const continueFromRole = () => {
    if (role === "grandparent") {
      setDevice("smartphone");
      setSetupDone(true);
      setMode("grandma");
    } else {
      // go to setup
    }
  };

  const completeSetup = () => {
    setSetupDone(true);
    setMode("caregiver");
  };

  const startDemo = () => {
    setDemoSeconds(0); setDemoRunning(true); setAlert(false); setResolved(false);
    setVoiceSent(false); setPhotoShared(false); setCheckedIn(false); setHelpRequested(false);
    setActiveStage("sense"); setAlertExplanation(""); setReplyTranscript("");
    push({ title: "Care demo started", detail: "Following one message from wearable signal to family reply.", tone: "cyan", icon: Zap });
  };

  const triggerAlert = () => {
    if (alert && !resolved) {
      setResolved(true); setActiveStage("connect");
      push({ title: "Sumanth reviewed the unusual pattern", detail: "Context added before reaching out.", tone: "coral", icon: ShieldCheck });
    } else {
      setAlert(true); setResolved(false); setActiveStage("understand"); setDemoRunning(false);
      setConfidence(78);
      // Generate AI explanation
      const explanation = explainAlert({
        elderName: "Meera",
        metricType: "movement" as AIMetricType,
        observedValue: 3284,
        baselineValue: 4812,
        deviationPercent: -32,
        timeOfDay: getTimeOfDay() as AITimeOfDay,
      });
      setAlertExplanation(explanation.summary);
      push({ title: "Movement pattern changed", detail: explanation.summary, tone: "coral", icon: Activity });
    }
  };

  const sendVoice = () => {
    setVoiceRecorderOpen(true);
  };

  const handleVoiceComplete = (audioUrl: string | null, transcript: string) => {
    setVoiceRecorderOpen(false);
    setVoiceSent(true); setActiveStage("connect");
    push({ title: "Voice message sent to Meera", detail: transcript ? `"${transcript.slice(0, 80)}…"` : "A warm hello is waiting on her care screen.", tone: "cyan", icon: Mic2 });
  };

  const openPhotoPicker = () => photoInputRef.current?.click();
  const compressPhoto = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Unsupported image"));
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  const handlePhotoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      push({ title: "Photo not accepted", detail: "Choose a JPG, PNG, WEBP, or camera image.", tone: "coral", icon: X });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      push({ title: "Photo is too large", detail: "Choose an image under 8MB for this prototype.", tone: "coral", icon: X });
      return;
    }
    try { setPhotoDraft(await compressPhoto(file)); setPhotoCaption(""); }
    catch { push({ title: "Photo could not be opened", detail: "Try another image or take a new photo.", tone: "coral", icon: X }); }
  };

  const cancelPhoto = () => setPhotoDraft(null);
  const sendPhoto = () => {
    if (!photoDraft) return;
    setSharedPhotoUrl(photoDraft); setPhotoShared(true); setPhotoDraft(null); setActiveStage("connect");
    push({ title: "Real photo shared with Meera", detail: photoCaption ? `"${photoCaption}" is ready in Grandma mode.` : "A camera or gallery photo is ready in Grandma mode.", tone: "amber", icon: ImageIcon });
  };

  const checkIn = () => {
    setCheckedIn(true); setActiveStage("care"); setConfidence(96);
    push({ title: "Meera checked in: feeling okay", detail: "The bridge received a reassuring response.", tone: "green", icon: Heart });
  };

  const requestHelp = () => {
    setHelpRequested(true);
    push({ title: "⚠️ Meera requested help", detail: "Help request sent to all caregivers in the care circle.", tone: "coral", icon: AlertTriangle });
  };

  const openIVR = () => { setIvrOpen(true); setIvrStep("idle"); setActiveStage("connect"); };

  const grandmaPlay = () => {
    if (device === "keypad") {
      // IVR listen
      setVoiceSent(true);
      speak("Hi Grandma, it's Sumanth. I'm thinking of you. Please let me know if you're okay.");
      push({ title: "Message played for Meera", detail: "Meera listened to Sumanth's voice message.", tone: "cyan", icon: Volume2 });
    } else {
      setVoiceSent(true);
      speak("Hi Grandma, it's Sumanth. I'm thinking of you. Please let me know if you're okay.");
      push({ title: "Message played for Meera", detail: "Meera listened to Sumanth's voice message.", tone: "cyan", icon: Volume2 });
    }
  };

  // ─── Demo Reset ───────────────────────────────────────────────────────────
  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRole(null); setSetupDone(false); setDevice(null); setMode("caregiver");
    setActiveStage("sense"); setAlert(false); setResolved(false);
    setVoiceSent(false); setPhotoShared(false); setSharedPhotoUrl(DEFAULT_PHOTO);
    setPhotoDraft(null); setPhotoCaption(""); setCheckedIn(false); setHelpRequested(false);
    setPhotoOpen(false); setIvrOpen(false); setIvrStep("idle"); setVoiceRecorderOpen(false);
    setDemoRunning(false); setDemoSeconds(0); setTimeline([...initialTimeline]);
    setOfflineStatus("draft"); setOfflineMessage("Hi Grandma, I am travelling today. Please reply OK or HELP.");
    setAlertExplanation(""); setReplyTranscript(""); setConfidence(96);
  };

  // ─── IVR Handlers ─────────────────────────────────────────────────────────
  const onIVRStart = () => { setIvrStep("calling"); window.setTimeout(() => setIvrStep("connected"), 900); };
  const onIVRListen = () => {
    setIvrStep("playing"); setVoiceSent(true);
    speak("Hi Grandma, it's Sumanth. I'm thinking of you. Please let me know if you're okay.");
    push({ title: "IVR voice message played", detail: `Meera listened in ${language}.`, tone: "cyan", icon: Phone });
  };
  const onIVROkay = () => {
    setIvrStep("complete"); setCheckedIn(true); setActiveStage("care"); setConfidence(96);
    push({ title: "Meera pressed: I am okay", detail: "Her keypad response reached the care circle.", tone: "green", icon: CheckCircle2 });
  };
  const onIVRReply = () => {
    const transcript = "Tell Sumanth I am okay. I took my medicine.";
    setIvrStep("complete"); setVoiceSent(true); setCheckedIn(true); setActiveStage("care"); setConfidence(96);
    // AI summarize reply
    const summary = summarizeReply("Meera", transcript);
    setReplyTranscript(transcript);
    push({ title: "Grandma's voice reply transcribed", detail: `✨ ${summary.oneLiner}`, tone: "green", icon: Mic2 });
  };
  const onIVRHelp = () => {
    setIvrStep("complete"); setHelpRequested(true);
    push({ title: "⚠️ Meera pressed 0: Help requested", detail: "Emergency help request sent to all caregivers.", tone: "coral", icon: AlertTriangle });
  };

  // ─── Offline handlers ─────────────────────────────────────────────────────
  const offlineQueue = () => { setOfflineStatus("queued"); push({ title: "Care message saved offline", detail: "Ready for SMS fallback when cellular service is available.", tone: "amber", icon: Radio }); };
  const offlineSpeak = () => { if (speak(offlineMessage)) push({ title: "Message read aloud locally", detail: "Browser text-to-speech ran without a cloud request.", tone: "cyan", icon: Volume2 }); };
  const offlineSms = () => {
    setOfflineStatus("sms-ready");
    push({ title: "SMS composer opened", detail: "The phone will ask the caregiver to confirm the SMS send.", tone: "amber", icon: Send });
    if (typeof window !== "undefined") window.location.href = `sms:?body=${encodeURIComponent(offlineMessage)}`;
  };
  const offlineSync = () => { setOnline(true); setOfflineStatus("synced"); push({ title: "Offline care event synced", detail: "The queued message and delivery state are back in the care timeline.", tone: "green", icon: RefreshCw }); };

  // ─── Render ───────────────────────────────────────────────────────────────
  // Onboarding
  if (!role) return <Onboarding role={role} setRole={setRole} onContinue={continueFromRole} />;

  // Setup (for caregiver/grandchild roles, or if setup not complete)
  if (role !== "grandparent" && !setupDone) {
    return <Setup device={device} setDevice={setDevice} language={language} setLanguage={setLanguage} onBack={() => { setRole(null); setSetupDone(false); }} onContinue={completeSetup} />;
  }

  // Grandparent selected but no device set yet — default to smartphone
  if (role === "grandparent" && !device) {
    setDevice("smartphone");
    setSetupDone(true);
    setMode("grandma");
    return null;
  }

  const context = role && device ? "ready" : "onboarding";

  return (
    <div className="prototype-root" data-context={context}>
      {mode === "caregiver" ? (
        <CaregiverDashboard
          device={device!} language={language} alert={alert} resolved={resolved}
          voiceSent={voiceSent} photoShared={photoShared} checkedIn={checkedIn}
          helpRequested={helpRequested} activeStage={activeStage} timeline={timeline}
          demoRunning={demoRunning} demoSeconds={demoSeconds} offlineStatus={offlineStatus}
          offlineMessage={offlineMessage} online={online} alertExplanation={alertExplanation}
          replyTranscript={replyTranscript} confidence={confidence}
          onMode={setMode} onAlert={triggerAlert} onVoice={sendVoice} onPhoto={openPhotoPicker}
          onIVR={openIVR} onReset={reset} onStage={setActiveStage}
          onOfflineMessage={setOfflineMessage} onOfflineQueue={offlineQueue}
          onOfflineSpeak={offlineSpeak} onOfflineSms={offlineSms} onOfflineSync={offlineSync}
        />
      ) : (
        <GrandmaMode
          device={device!} language={language} voiceSent={voiceSent} photoShared={photoShared}
          photoUrl={sharedPhotoUrl} photoCaption={photoCaption} checkedIn={checkedIn}
          helpRequested={helpRequested} onMode={setMode} onPlay={grandmaPlay}
          onPhoto={() => setPhotoOpen(true)} onOkay={device === "keypad" ? onIVROkay : checkIn}
          onCall={openIVR} onHelp={requestHelp}
        />
      )}

      {/* Hidden file input */}
      <input ref={photoInputRef} id="iqcare-photo-input" type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} className="visually-hidden" />

      {/* Photo composer */}
      {photoDraft && <PhotoComposer fileInputRef={photoInputRef} photoDraft={photoDraft} photoCaption={photoCaption} onCaption={setPhotoCaption} onCancel={cancelPhoto} onSend={sendPhoto} />}

      {/* Voice recorder */}
      {voiceRecorderOpen && <VoiceRecorder onComplete={handleVoiceComplete} onCancel={() => setVoiceRecorderOpen(false)} />}

      {/* IVR modal */}
      {ivrOpen && <IVRModal step={ivrStep} language={language} onClose={() => setIvrOpen(false)} onStart={onIVRStart} onListen={onIVRListen} onOkay={onIVROkay} onReply={onIVRReply} onHelp={onIVRHelp} />}

      {/* Photo modal */}
      {photoOpen && (
        <div className="photo-modal">
          <div className="photo-modal-backdrop" onClick={() => setPhotoOpen(false)} />
          <div className="photo-modal-card">
            <button className="modal-close" onClick={() => setPhotoOpen(false)}><X size={18} /></button>
            <img src={sharedPhotoUrl} alt="Shared family photo" />
            <div>
              <Eyebrow>Shared by Sumanth · just now</Eyebrow>
              <h2>{photoCaption || "A little sunshine for your evening."}</h2>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
