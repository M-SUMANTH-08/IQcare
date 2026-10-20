import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Activity, AlertTriangle, Bell, CheckCircle2, CircleHelp,
  Clock3, Heart, HeartPulse, Image as ImageIcon, Leaf, MessageCircle,
  Mic2, MicOff, Play, Radio, Send, ShieldCheck, UserRound, Users, Watch, Waves, X, Zap, Settings, LayoutDashboard,
  Smartphone, LogOut
} from "lucide-react";
import { getTimeOfDay } from "@/lib/simulationEngine";

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = "grandparent" | "caregiver" | "grandchild";
type Device = "keypad" | "smartphone";
type Mode = "caregiver" | "grandma";
type JourneyStage = "sense" | "understand" | "alert" | "connect" | "care";
type OfflineStatus = "draft" | "queued" | "sms-ready" | "synced";

export interface Message {
  id: string;
  sender: "caregiver" | "grandma";
  type: "voice" | "image";
  transcript?: string;
  mediaUrl?: string; // base64
  caption?: string;
  timestamp: string;
}

interface TimelineItem {
  title: string;
  detail: string;
  time: string;
  tone: "cyan" | "amber" | "coral" | "green";
  icon: typeof Activity;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "iqcare-demo-state";

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
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function now() {
  return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Failed to convert blob to base64"));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const playBase64Audio = (b64: string) => {
  if (!b64) return;
  const audio = new Audio(b64);
  audio.play().catch(e => console.error("Audio playback failed:", e));
};

const ICON_MAP: Record<string, typeof Activity> = {
  Activity, Watch, Leaf, Clock3, Zap, ShieldCheck, Mic2, Phone: Smartphone, ImageIcon,
  Heart, CheckCircle2, Radio, Send, Volume2: Activity, X, AlertTriangle, Bell,
};
function iconFromName(name: string): typeof Activity { return ICON_MAP[name] ?? Activity; }
function iconToName(icon: typeof Activity): string {
  for (const [k, v] of Object.entries(ICON_MAP)) { if (v === icon) return k; }
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
  checkedIn: boolean;
  helpRequested: boolean;
  offlineStatus: OfflineStatus;
  offlineMessage: string;
  timeline: Array<Omit<TimelineItem, "icon"> & { iconName: string }>;
  messages: Message[];
}

function loadState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function saveState(state: PersistedState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function AppMark({ dark = true }: { dark?: boolean }) {
  return (
    <div className={`brand-mark-new ${dark ? 'theme-dark' : 'theme-light'}`}>
      <div className="brand-icon-new"><Heart size={20} color="#FFD600" /></div>
      <div className="brand-text-new">
        <strong>IQcare</strong>
        <span>SIGNAL TO CARE</span>
      </div>
    </div>
  );
}

// ─── Voice Recorder ───────────────────────────────────────────────────────────
function VoiceRecorder({ onComplete, onCancel }: { onComplete: (audioB64: string | null, transcript: string) => void; onCancel: () => void }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  
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
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          const b64 = await blobToBase64(blob);
          setAudioBase64(b64);
        } catch (e) {
          setAudioBase64(null);
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);

      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SR) {
        const recognition = new SR();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-IN";
        recognition.onresult = (event: any) => {
          let finalT = "";
          for (let i = 0; i < event.results.length; i++) { finalT += event.results[i][0].transcript; }
          setTranscript(finalT);
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch {
      setMicAvailable(false);
      setTranscript("Thinking of you, Grandma. Hope everything is well.");
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop();
    setRecording(false);
  }, []);

  const handleSend = () => {
    const finalTranscript = transcript || (micAvailable === false ? "Thinking of you, Grandma. Hope everything is well." : "Audio message sent.");
    onComplete(audioBase64, finalTranscript);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onCancel}><X size={18} /></button>
        <div className="modal-header">
          <div className="modal-icon"><Mic2 size={24} color="#0B0B0B" /></div>
          <h3>{recording ? "Recording..." : audioBase64 ? "Message ready" : "Send a voice message"}</h3>
        </div>
        
        {micAvailable === false && (
          <div className="mic-error">
            <MicOff size={20} />
            <p>Microphone unavailable — using simulated message</p>
          </div>
        )}
        {recording && <div className="recording-wave"><span/><span/><span/><span/></div>}
        
        {transcript && (
          <div className="transcript-box">
            <span>{micAvailable ? "✨ Live speech-to-text" : "✨ Simulated transcript"}</span>
            <p>"{transcript}"</p>
          </div>
        )}

        <div className="modal-actions">
          {!recording && !audioBase64 && (
            <button className="btn-primary" onClick={startRecording}>
              {micAvailable === false ? "Use simulated message" : "Start recording"}
            </button>
          )}
          {recording && (
            <button className="btn-danger" onClick={stopRecording}>Stop recording</button>
          )}
          {(audioBase64 || micAvailable === false) && !recording && (
            <button className="btn-primary" onClick={handleSend}>Send Message</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Grandma Mode ─────────────────────────────────────────────────────────────
function GrandmaMode({ messages, checkedIn, helpRequested,
  onMode, onVoice, onPhoto, onOkay, onHelp,
}: {
  messages: Message[]; checkedIn: boolean; helpRequested: boolean;
  onMode: (m: Mode) => void; onVoice: () => void; onPhoto: () => void; onOkay: () => void; onHelp: () => void;
}) {
  const latestCaregiverMsg = messages.filter(m => m.sender === "caregiver").pop();

  const renderCaregiverMessage = () => {
    if (!latestCaregiverMsg) {
      return (
        <div className="g-empty">
          <Heart size={48} color="#FFD600" />
          <h2>Your family is close by</h2>
          <p>Waiting for new messages...</p>
        </div>
      );
    }

    if (latestCaregiverMsg.type === "voice") {
      return (
        <div className="g-message-block">
          <div className="g-sender">
            <div className="g-avatar">S</div>
            <div className="g-sender-info">
              <strong>Sumanth sent you a voice message</strong>
              <span>"{latestCaregiverMsg.transcript}"</span>
            </div>
          </div>
          <button className="btn-g-play" onClick={() => playBase64Audio(latestCaregiverMsg.mediaUrl || "")}>
            <Play size={24} fill="currentColor" /> PLAY MESSAGE
          </button>
        </div>
      );
    }

    if (latestCaregiverMsg.type === "image") {
      return (
        <div className="g-message-block">
          <div className="g-sender">
            <div className="g-avatar">S</div>
            <div className="g-sender-info">
              <strong>Sumanth shared a photo</strong>
              {latestCaregiverMsg.caption && <span>"{latestCaregiverMsg.caption}"</span>}
            </div>
          </div>
          <div className="g-photo-block">
            <img src={latestCaregiverMsg.mediaUrl} alt="Shared from Sumanth" />
          </div>
        </div>
      );
    }
  };

  return (
    <div className="grandma-stage">
      <div className="grandma-container">
        <header className="grandma-header">
          <AppMark dark={false} />
          <button className="btn-ghost" onClick={() => onMode("caregiver")}><UserRound size={16} /> Return to caregiver</button>
        </header>

        <main className="grandma-main">
          <h1 className="grandma-greeting">Hello, Meera.</h1>

          <div className="grandma-content-card">
            {renderCaregiverMessage()}

            <div className="g-actions">
              <button className={`btn-g-ok ${checkedIn ? 'done' : ''}`} onClick={onOkay}>
                {checkedIn ? <CheckCircle2 size={24}/> : <Heart size={24}/>}
                {checkedIn ? "Sumanth knows you are okay" : "I'm feeling okay"}
              </button>
              <button className={`btn-g-help ${helpRequested ? 'done' : ''}`} onClick={onHelp}>
                <AlertTriangle size={24}/>
                {helpRequested ? "Help request sent" : "Ask family for help"}
              </button>
            </div>
          </div>
          
          <div className="g-actions-grid">
            <button className="btn-g-action" onClick={onVoice}>
              <Mic2 size={24}/> Send Voice Message
            </button>
            <button className="btn-g-action" onClick={onPhoto}>
              <ImageIcon size={24}/> Send Photo
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

// ─── Caregiver Dashboard ──────────────────────────────────────────────────────
function CaregiverDashboard({ mode, alert, resolved, checkedIn, helpRequested, activeStage,
  offlineStatus, offlineMessage, online, confidence, timeline, messages,
  onMode, onAlert, onVoice, onOfflineMessage, onOfflineQueue, onOfflineSms, onReset, onPhoto
}: {
  mode: Mode; alert: boolean; resolved: boolean; checkedIn: boolean; helpRequested: boolean;
  activeStage: JourneyStage; offlineStatus: OfflineStatus; offlineMessage: string; online: boolean; confidence: number;
  timeline: TimelineItem[]; messages: Message[];
  onMode: (m: Mode) => void; onAlert: () => void; onVoice: () => void;
  onOfflineMessage: (m: string) => void; onOfflineQueue: () => void; onOfflineSms: () => void; onReset: () => void; onPhoto: () => void;
}) {
  const movementSteps = alert && !resolved ? "3,284" : "4,812";
  const [activeTab, setActiveTab] = useState("overview");

  const scrollTo = (id: string) => {
    setActiveTab(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <AppMark />
        <nav className="sidebar-nav">
          <button className={`nav-item ${activeTab === 'overview' ? 'nav-active' : ''}`} onClick={() => scrollTo('overview')}>
            <LayoutDashboard size={18} /> Overview
          </button>
          <button className={`nav-item ${activeTab === 'bridge-inbox' ? 'nav-active' : ''}`} onClick={() => scrollTo('bridge-inbox')}>
            <MessageCircle size={18} /> Bridge inbox
            {messages.length > 0 && <span className="nav-badge">{messages.length}</span>}
          </button>
          <button className={`nav-item ${activeTab === 'care-loop' ? 'nav-active' : ''}`} onClick={() => scrollTo('care-loop')}>
            <HeartPulse size={18} /> Care loop
          </button>
          <button className={`nav-item ${activeTab === 'health-insights' ? 'nav-active' : ''}`} onClick={() => scrollTo('health-insights')}>
            <Activity size={18} /> Health insights
          </button>
          <button className="nav-item" onClick={() => onMode('grandma')}>
            <UserRound size={18} /> Grandma Mode
          </button>
          <button className="nav-item">
            <Settings size={18} /> Settings
          </button>
        </nav>
        <div className="sidebar-profile">
          <div className="profile-avatar"><UserRound size={20} color="#0B0B0B" /></div>
          <div className="profile-info">
            <strong>Sumanth</strong>
            <span>Caregiver</span>
          </div>
          <button className="btn-icon" onClick={onReset} title="Reset Demo"><LogOut size={16} color="#FFF" /></button>
        </div>
      </aside>

      <div className="main-content">
        {/* Top Header */}
        <header className="topbar">
          <div className="topbar-status">
            <span className="status-dot"></span>
            Connected to <strong>Meera</strong> / Smartphone Mode
          </div>
          <div className="topbar-right">
            <div className="mode-segmented">
              <span className="mode-label"><Smartphone size={16}/> Smartphone</span>
              <button className={mode === "caregiver" ? "active-yellow" : ""} onClick={() => onMode("caregiver")}>
                <UserRound size={16}/> Caregiver
              </button>
              <button className={mode === "grandma" ? "active" : ""} onClick={() => onMode("grandma")}>
                <Heart size={16}/> Grandma
              </button>
            </div>
            <button className="btn-icon btn-bell">
              <Bell size={20} color="#0B0B0B" />
              {(alert || helpRequested) && <span className="bell-badge"></span>}
            </button>
          </div>
        </header>

        <div className="dashboard-scroll">
          <div className="dashboard-container">
            <div id="overview" className="page-intro">
              <p className="date-stamp">TUESDAY, 22 SEPTEMBER 2026 • {now()}</p>
              <h1>Good {getTimeOfDay() === "morning" ? "morning" : getTimeOfDay() === "afternoon" ? "afternoon" : "evening"}, <span>Sumanth</span> 👋</h1>
              <p>Your care bridge is ready. Meera is in your circle.</p>
            </div>

            {(helpRequested || (alert && !resolved)) && (
              <div className="alert-banner">
                <AlertTriangle size={24} color="#0B0B0B" />
                <div>
                  <strong>{helpRequested ? "Meera requested help from her care circle" : "Unusual movement pattern detected"}</strong>
                  <p>{helpRequested ? "Check in as soon as possible. Verify her status directly." : "One unusual motion cluster needs context before we worry. Review suggested."}</p>
                </div>
                <button className="btn-primary" style={{flexShrink: 0}} onClick={onAlert}>{helpRequested ? "Acknowledge" : "Review with care"}</button>
              </div>
            )}

            <div className="top-grid">
              {/* Offline Bridge Card */}
              <div className="card offline-card">
                <div className="card-header">
                  <div className="offline-title">
                    <div className="icon-yellow"><Mic2 size={24} color="#0B0B0B" /></div>
                    <div>
                      <span className="label-sm">OFFLINE-FIRST BRIDGE</span>
                      <h3>Reach Grandma when data is gone</h3>
                    </div>
                  </div>
                  <div className="network-tag">{online ? "Internet available" : "Offline"}</div>
                </div>
                <p className="card-desc">Speak a short care message. iQcare keeps it on this phone, uses SMS when cellular service exists, and syncs when internet returns.</p>
                
                <div className="offline-input-wrapper">
                  <textarea 
                    className="offline-textarea" 
                    value={offlineMessage} 
                    onChange={(e) => onOfflineMessage(e.target.value)}
                    placeholder="Hi Grandma, I am travelling today..."
                  />
                  <span className="char-count">{offlineMessage.length}/140</span>
                </div>

                <div className="card-actions">
                  <button className="btn-primary" onClick={onVoice}><Mic2 size={16}/> Send voice message</button>
                  <button className="btn-secondary" onClick={onOfflineSms}><Send size={16}/> Open SMS</button>
                  <button className="btn-secondary" onClick={onOfflineQueue}><Radio size={16}/> Save offline</button>
                </div>
                <div className="card-footer-note">
                  <ShieldCheck size={14} /> Stored securely on this device. Will sync to Grandma's dashboard when connected.
                </div>
              </div>

              {/* Signal Confidence */}
              <div className="card dark-card">
                <div className="card-header">
                  <h3 className="dark-title"><Activity size={20} color="#FFD600" /> Signal confidence</h3>
                  <div className="confidence-ring">
                    <span>{confidence}%</span>
                  </div>
                </div>
                <div className="confidence-status">
                  <span className="status-dot-active"></span>
                  {alert && !resolved ? "Review suggested" : "Within her rhythm"}
                </div>
                <p className="dark-desc">We learn Meera's normal before we call anything unusual.</p>
                
                <div className="pattern-row">
                  <span>Usual rhythm</span>
                  <div className="bar-track"><div className="bar-fill" style={{width: alert && !resolved ? '72%' : '94%'}}></div></div>
                  <strong>{alert && !resolved ? "72" : "94"}</strong>
                </div>
                <div className="pattern-row">
                  <span>Context gathered</span>
                  <div className="bar-track"><div className="bar-fill white-fill" style={{width: alert && !resolved ? '46%' : '88%'}}></div></div>
                  <strong>{alert && !resolved ? "46" : "88"}</strong>
                </div>
                
                <div className="dark-footer">
                  <CircleHelp size={14} /> Simulated wearable data • not a medical device
                </div>
              </div>
            </div>

            {/* Care Loop */}
            <div id="care-loop" className="card">
              <div className="card-header-simple">
                <div>
                  <h3>The care loop</h3>
                  <p>From signal to reassurance</p>
                </div>
                <div className="tag-yellow">Shared state</div>
              </div>
              <div className="care-loop-track">
                {stages.map((stage, i) => {
                  const Icon = stage.icon;
                  const isActive = stage.id === activeStage;
                  return (
                    <div key={stage.id} className="loop-segment">
                      <div className="loop-node">
                        <div className={`loop-icon ${isActive ? 'active' : ''}`}><Icon size={24} /></div>
                        <strong>{stage.label}</strong>
                        <small>{stage.caption}</small>
                      </div>
                      {i < stages.length - 1 && <div className="loop-line"></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Metric Cards */}
            <div id="health-insights" className="metrics-grid">
              <div className="card metric-card">
                <div className="metric-icon"><HeartPulse size={24} color="#0B0B0B" /></div>
                <div className="metric-data">
                  <p>Heart rate</p>
                  <strong>76 <small>bpm</small></strong>
                  <span className="trend-up">↑ 4% today</span>
                </div>
                <div className="metric-chart bars-neutral"></div>
              </div>
              <div className="card metric-card">
                <div className="metric-icon"><Activity size={24} color="#0B0B0B" /></div>
                <div className="metric-data">
                  <p>Movement</p>
                  <strong>{movementSteps} <small>steps</small></strong>
                  <span className="trend-up">↑ On her way</span>
                </div>
                <div className="metric-chart bars-neutral"></div>
              </div>
              <div className="card metric-card">
                <div className="metric-icon"><Clock3 size={24} color="#0B0B0B" /></div>
                <div className="metric-data">
                  <p>Rest quality</p>
                  <strong>7h 42m</strong>
                  <span className="trend-up">↑ Restful night</span>
                </div>
                <div className="metric-chart bars-neutral"></div>
              </div>
            </div>
            
            <div className="bottom-grid">
               <div id="bridge-inbox" className="card">
                  <div className="card-header-simple">
                    <h3>Bridge Inbox</h3>
                    <MessageCircle size={20} color="#0B0B0B" />
                  </div>
                  <div className="inbox-feed">
                    {messages.length === 0 && <p className="empty-text">No messages yet.</p>}
                    {messages.map(msg => (
                      <div key={msg.id} className={`msg-bubble ${msg.sender === "caregiver" ? "msg-out" : "msg-in"}`}>
                        <div className="msg-meta">{msg.sender === "caregiver" ? "You" : "Meera"} • {msg.timestamp}</div>
                        
                        {msg.type === "voice" && (
                          <div className="msg-content">
                            <p>"{msg.transcript}"</p>
                            {msg.mediaUrl && (
                              <button className="btn-play-sm" onClick={() => playBase64Audio(msg.mediaUrl!)}>
                                <Play size={14}/> Play Audio
                              </button>
                            )}
                          </div>
                        )}
                        
                        {msg.type === "image" && (
                          <div className="msg-content">
                            <img src={msg.mediaUrl} alt="Shared" className="msg-img" />
                            {msg.caption && <p style={{marginTop: 8, fontStyle: 'italic'}}>{msg.caption}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className="card">
                  <div className="card-header-simple">
                    <h3>Reach Meera</h3>
                    <Heart size={20} color="#FFD600" fill="#FFD600" />
                  </div>
                  <p className="card-desc">Send something she can receive naturally — a voice message, phone call, or familiar photo.</p>
                  <div className="action-buttons">
                    <button className="btn-secondary w-full" onClick={onVoice}><Mic2 size={16}/> Send voice message</button>
                    <button className="btn-secondary w-full" onClick={onPhoto}><ImageIcon size={16}/> Share a photo</button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
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
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Send this moment</h3>
          <button className="modal-close" onClick={onCancel}><X size={18} /></button>
        </div>
        <img className="photo-preview-new" src={photoDraft} alt="Preview" />
        <textarea className="offline-textarea mt-16" value={photoCaption} onChange={(e) => onCaption(e.target.value)} maxLength={160} placeholder="Add a gentle caption (optional)..." />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>Replace photo</button>
          <button className="btn-primary" onClick={onSend}><Send size={16} /> Send</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function Home() {
  const saved = useMemo(() => loadState(), []);

  const [role, setRole] = useState<Role | null>(saved.role ?? "caregiver");
  const [setupDone, setSetupDone] = useState(saved.setupDone ?? true);
  const [device, setDevice] = useState<Device | null>(saved.device ?? "smartphone");
  const [language, setLanguage] = useState(saved.language ?? "English");
  const [mode, setMode] = useState<Mode>(saved.mode ?? "caregiver");
  const [activeStage, setActiveStage] = useState<JourneyStage>(saved.activeStage ?? "sense");
  const [alert, setAlert] = useState(saved.alert ?? false);
  const [resolved, setResolved] = useState(saved.resolved ?? false);
  const [checkedIn, setCheckedIn] = useState(saved.checkedIn ?? false);
  const [helpRequested, setHelpRequested] = useState(saved.helpRequested ?? false);
  const [photoDraft, setPhotoDraft] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState("");
  
  const [messages, setMessages] = useState<Message[]>(saved.messages ?? []);
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [voiceRecorderOpen, setVoiceRecorderOpen] = useState(false);
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>(saved.offlineStatus ?? "draft");
  const [offlineMessage, setOfflineMessage] = useState(saved.offlineMessage ?? "Hi Grandma, I am travelling today. Please reply OK or HELP.");
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  
  const [timeline, setTimeline] = useState<TimelineItem[]>(() => {
    if (saved.timeline?.length) return saved.timeline.map((t) => ({ ...t, icon: iconFromName(t.iconName) }));
    return [...initialTimeline];
  });

  useEffect(() => {
    const state: PersistedState = {
      role, setupDone, device, language, mode, activeStage, alert, resolved,
      checkedIn, helpRequested, offlineStatus, offlineMessage, messages,
      timeline: timeline.map((t) => ({ ...t, iconName: iconToName(t.icon) })),
    };
    saveState(state);
  }, [role, setupDone, device, language, mode, activeStage, alert, resolved,
    checkedIn, helpRequested, offlineStatus, offlineMessage, messages, timeline]);

  const push = useCallback((item: Omit<TimelineItem, "time"> & { time?: string }) => {
    setTimeline((items) => [{ ...item, time: item.time ?? now() } as TimelineItem, ...items].slice(0, 12));
  }, []);

  const triggerAlert = () => {
    if (alert && !resolved) { setResolved(true); setActiveStage("connect"); } 
    else { setAlert(true); setResolved(false); setActiveStage("understand"); }
  };

  const handleVoiceComplete = (audioB64: string | null, transcript: string) => {
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: mode === "caregiver" ? "caregiver" : "grandma",
      type: "voice",
      transcript,
      mediaUrl: audioB64 || undefined,
      timestamp: now()
    };
    
    setMessages(prev => [...prev, newMsg].slice(-10)); // Keep last 10
    setVoiceRecorderOpen(false);
    setActiveStage("connect");
    
    if (mode === "caregiver") {
      push({ title: "Voice message sent", detail: transcript, tone: "cyan", icon: Mic2 });
    } else {
      push({ title: "Voice reply received", detail: transcript, tone: "green", icon: Mic2 });
    }
  };

  const compressPhoto = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Unsupported image"));
      image.onload = () => {
        // Compress aggressively to avoid localStorage limits (Max 600px width/height, 0.6 quality)
        const scale = Math.min(1, 600 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas unavailable"));
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

  const handlePhotoFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    try { setPhotoDraft(await compressPhoto(file)); setPhotoCaption(""); } catch {}
  };

  const sendPhoto = () => {
    if (!photoDraft) return;
    const newMsg: Message = {
      id: Date.now().toString(),
      sender: mode === "caregiver" ? "caregiver" : "grandma",
      type: "image",
      mediaUrl: photoDraft,
      caption: photoCaption,
      timestamp: now()
    };
    
    setMessages(prev => [...prev, newMsg].slice(-10));
    setPhotoDraft(null);
    setPhotoCaption("");
    setActiveStage("connect");
    
    if (mode === "caregiver") {
      push({ title: "Photo shared", detail: "Sent a photo to Meera", tone: "cyan", icon: ImageIcon });
    } else {
      push({ title: "Photo received", detail: "Meera shared a photo with you", tone: "green", icon: ImageIcon });
    }
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMode("caregiver"); setActiveStage("sense"); setAlert(false); setResolved(false);
    setCheckedIn(false); setHelpRequested(false); setVoiceRecorderOpen(false);
    setMessages([]); setOfflineStatus("draft"); 
    setOfflineMessage("Hi Grandma, I am travelling today. Please reply OK or HELP.");
  };

  return (
    <div className="app-root">
      {mode === "caregiver" ? (
        <CaregiverDashboard
          mode={mode} alert={alert} resolved={resolved} checkedIn={checkedIn}
          helpRequested={helpRequested} activeStage={activeStage} offlineStatus={offlineStatus}
          offlineMessage={offlineMessage} online={online} confidence={96} timeline={timeline} 
          messages={messages}
          onMode={setMode} onAlert={triggerAlert} onVoice={() => setVoiceRecorderOpen(true)}
          onOfflineMessage={setOfflineMessage} onOfflineQueue={() => setOfflineStatus("queued")}
          onOfflineSms={() => { window.location.href = `sms:?body=${encodeURIComponent(offlineMessage)}`; }}
          onReset={reset} onPhoto={() => photoInputRef.current?.click()}
        />
      ) : (
        <GrandmaMode
          messages={messages} checkedIn={checkedIn} helpRequested={helpRequested}
          onMode={setMode} onOkay={() => setCheckedIn(true)} onHelp={() => setHelpRequested(true)}
          onVoice={() => setVoiceRecorderOpen(true)} onPhoto={() => photoInputRef.current?.click()}
        />
      )}

      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} style={{display: 'none'}} />
      {photoDraft && <PhotoComposer fileInputRef={photoInputRef} photoDraft={photoDraft} photoCaption={photoCaption} onCaption={setPhotoCaption} onCancel={() => setPhotoDraft(null)} onSend={sendPhoto} />}
      {voiceRecorderOpen && <VoiceRecorder onComplete={handleVoiceComplete} onCancel={() => setVoiceRecorderOpen(false)} />}
    </div>
  );
}
