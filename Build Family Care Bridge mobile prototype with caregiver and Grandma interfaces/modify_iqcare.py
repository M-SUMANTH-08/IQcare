from pathlib import Path

path = Path('/home/ubuntu/family-care-bridge/client/src/pages/Home.tsx')
s = path.read_text()

s = s.replace('type TimelineItem = { title: string; detail: string; time: string; tone: "cyan" | "amber" | "coral" | "green"; icon: typeof Activity };', 'type TimelineItem = { title: string; detail: string; time: string; tone: "cyan" | "amber" | "coral" | "green"; icon: typeof Activity };\ntype OfflineStatus = "draft" | "queued" | "sms-ready" | "synced";')

marker = 'function CaregiverDashboard('
component = r'''function OfflineBridge({ online, status, message, onMessage, onQueue, onSpeak, onSms, onSync }: { online: boolean; status: OfflineStatus; message: string; onMessage: (message: string) => void; onQueue: () => void; onSpeak: () => void; onSms: () => void; onSync: () => void }) {
  const statusLabel: Record<OfflineStatus, string> = { draft: "Draft on this phone", queued: "Queued for SMS", "sms-ready": "SMS handoff ready", synced: "Synced to care circle" };
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  return <section className="offline-bridge panel-card">
    <div className="offline-bridge-heading"><div><Eyebrow>Offline-first bridge</Eyebrow><h3>Reach Grandma when data is gone</h3></div><span className={`offline-network ${online ? "network-online" : "network-offline"}`}><span /> {online ? "Internet available" : "No internet"}</span></div>
    <p className="offline-bridge-copy">Speak a short care message. IQcare keeps it on this phone, uses SMS when cellular service exists, and syncs the delivery state when internet returns.</p>
    <div className="offline-compose"><textarea value={message} onChange={(event) => onMessage(event.target.value)} aria-label="Offline care message" placeholder="Hi Grandma, I’m travelling today. Please reply OK or HELP." /><div className="offline-compose-actions"><button className="offline-speak" onClick={onSpeak} disabled={!message || !canSpeak}><Volume2 size={15} /> Read aloud on this phone</button><span className="offline-count">{message.length}/140</span></div></div>
    <div className="offline-status-row"><span className={`offline-status-dot status-${status}`} /><strong>{statusLabel[status]}</strong><small>{status === "queued" ? "Waiting for a cellular path" : status === "sms-ready" ? "Tap to open your phone’s SMS composer" : status === "synced" ? "Delivery event is back in the care timeline" : "Nothing has been sent yet"}</small></div>
    <div className="offline-actions"><button className="offline-primary" onClick={onQueue} disabled={!message || status === "queued"}><Radio size={15} /> {status === "queued" ? "Message queued" : "Save offline"}</button><button className="offline-sms" onClick={onSms} disabled={!message}><Send size={15} /> Open SMS composer</button>{status === "queued" && <button className="offline-sync" onClick={onSync}><RefreshCw size={15} /> Simulate internet return</button>}</div>
    <div className="offline-footnote"><ShieldCheck size={13} /> Real device actions: local queue + browser speech + SMS composer handoff. The user still confirms Send.</div>
  </section>;
}

'''
s = s.replace(marker, component + marker, 1)

old_sig = 'timeline, demoRunning, demoSeconds, onMode, onAlert, onVoice, onPhoto, onIVR, onReset, onStage }'
new_sig = 'timeline, demoRunning, demoSeconds, offlineStatus, offlineMessage, online, onMode, onAlert, onVoice, onPhoto, onIVR, onReset, onStage, onOfflineMessage, onOfflineQueue, onOfflineSpeak, onOfflineSms, onOfflineSync }'
s = s.replace(old_sig, new_sig, 1)
old_props = 'timeline: TimelineItem[]; demoRunning: boolean; demoSeconds: number; onMode:'
new_props = 'timeline: TimelineItem[]; demoRunning: boolean; demoSeconds: number; offlineStatus: OfflineStatus; offlineMessage: string; online: boolean; onMode:'
s = s.replace(old_props, new_props, 1)
old_props2 = 'onReset: () => void; onStage: (stage: JourneyStage) => void })'
new_props2 = 'onReset: () => void; onStage: (stage: JourneyStage) => void; onOfflineMessage: (message: string) => void; onOfflineQueue: () => void; onOfflineSpeak: () => void; onOfflineSms: () => void; onOfflineSync: () => void })'
s = s.replace(old_props2, new_props2, 1)

needle = '<div className="dashboard-content"><div className="page-intro">'
insert = '<div className="dashboard-content"><div className="page-intro">'
# Insert bridge after the full page-intro block using a stable later section marker.
section_marker = '<div className="dashboard-grid dashboard-grid-top">'
offline_markup = '<OfflineBridge online={online} status={offlineStatus} message={offlineMessage} onMessage={onOfflineMessage} onQueue={onOfflineQueue} onSpeak={onOfflineSpeak} onSms={onOfflineSms} onSync={onOfflineSync} />'
s = s.replace(section_marker, offline_markup + section_marker, 1)

old_state = 'const [demoRunning, setDemoRunning] = useState(false); const [demoSeconds, setDemoSeconds] = useState(0); const [timeline, setTimeline] = useState<TimelineItem[]>([...initialTimeline]);'
new_state = 'const [demoRunning, setDemoRunning] = useState(false); const [demoSeconds, setDemoSeconds] = useState(0); const [timeline, setTimeline] = useState<TimelineItem[]>([...initialTimeline]); const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>("draft"); const [offlineMessage, setOfflineMessage] = useState("Hi Grandma, I am travelling today. Please reply OK or HELP."); const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);'
s = s.replace(old_state, new_state, 1)

state_effect = 'useEffect(() => { if (!demoRunning) return; const timer = window.setInterval(() => setDemoSeconds((s) => s + 1), 1000); return () => window.clearInterval(timer); }, [demoRunning]);'
state_effect_new = state_effect + ' useEffect(() => { const onOnline = () => setOnline(true); const onOffline = () => setOnline(false); window.addEventListener("online", onOnline); window.addEventListener("offline", onOffline); return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); }; }, []);'
s = s.replace(state_effect, state_effect_new, 1)

handler_marker = 'const context = useMemo(() => role && device ? "ready" : "onboarding", [role, device]);'
handlers = r'''const offlineQueue = () => { setOfflineStatus("queued"); push({ title: "Care message saved offline", detail: "Ready for SMS fallback when cellular service is available.", time: "Now", tone: "amber", icon: Radio }); };
  const offlineSpeak = () => { if (typeof window !== "undefined" && "speechSynthesis" in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(offlineMessage)); push({ title: "Message read aloud locally", detail: "Browser text-to-speech ran without a cloud request.", time: "Now", tone: "cyan", icon: Volume2 }); } };
  const offlineSms = () => { setOfflineStatus("sms-ready"); push({ title: "SMS composer opened", detail: "The phone will ask the caregiver to confirm the SMS send.", time: "Now", tone: "amber", icon: Send }); if (typeof window !== "undefined") window.location.href = `sms:?body=${encodeURIComponent(offlineMessage)}`; };
  const offlineSync = () => { setOnline(true); setOfflineStatus("synced"); push({ title: "Offline care event synced", detail: "The queued message and delivery state are back in the care timeline.", time: "Now", tone: "green", icon: RefreshCw }); };
  ''' + handler_marker
s = s.replace(handler_marker, handlers, 1)

reset_old = 'setDemoRunning(false); setDemoSeconds(0); setTimeline([...initialTimeline]); };'
reset_new = 'setDemoRunning(false); setDemoSeconds(0); setTimeline([...initialTimeline]); setOfflineStatus("draft"); setOfflineMessage("Hi Grandma, I am travelling today. Please reply OK or HELP."); };'
s = s.replace(reset_old, reset_new, 1)

render_old = 'timeline={timeline} demoRunning={demoRunning} demoSeconds={demoSeconds} onMode={setMode} onAlert={triggerAlert} onVoice={sendVoice} onPhoto={sharePhoto} onIVR={openIVR} onReset={reset} onStage={setActiveStage} />'
render_new = 'timeline={timeline} demoRunning={demoRunning} demoSeconds={demoSeconds} offlineStatus={offlineStatus} offlineMessage={offlineMessage} online={online} onMode={setMode} onAlert={triggerAlert} onVoice={sendVoice} onPhoto={sharePhoto} onIVR={openIVR} onReset={reset} onStage={setActiveStage} onOfflineMessage={setOfflineMessage} onOfflineQueue={offlineQueue} onOfflineSpeak={offlineSpeak} onOfflineSms={offlineSms} onOfflineSync={offlineSync} />'
s = s.replace(render_old, render_new, 1)

path.write_text(s)
print('updated', path)
