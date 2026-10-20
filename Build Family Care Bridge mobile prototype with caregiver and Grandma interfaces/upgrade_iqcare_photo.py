from pathlib import Path
p = Path('/home/ubuntu/family-care-bridge/client/src/pages/Home.tsx')
s = p.read_text()

s = s.replace('import { useEffect, useMemo, useState, type ReactNode } from "react";', 'import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";')

old_mark = 'function AppMark({ compact = false }: { compact?: boolean }) { return <div className={`brand-mark ${compact ? "brand-mark-compact" : ""}`}><span>Q</span><i /></div>; }'
new_mark = 'function AppMark({ compact = false }: { compact?: boolean }) { return <div className={`brand-mark ${compact ? "brand-mark-compact" : ""}`}><img src="/manus-storage/iqcare-logo_6813f83f.png" alt="iQcare logo" /></div>; }'
s = s.replace(old_mark, new_mark)

s = s.replace('function GrandmaMode({ device, language, voiceSent, photoShared, checkedIn, onMode, onPlay, onPhoto, onOkay, onCall }:', 'function GrandmaMode({ device, language, voiceSent, photoShared, photoUrl, checkedIn, onMode, onPlay, onPhoto, onOkay, onCall }:')
s = s.replace('voiceSent: boolean; photoShared: boolean; checkedIn: boolean;', 'voiceSent: boolean; photoShared: boolean; photoUrl: string; checkedIn: boolean;', 1)
s = s.replace('<img src={PHOTO_URL} alt="A family photo" />', '<img src={photoUrl} alt="Shared photo from Sumanth" />', 1)

# Add a real photo composer before Home.
marker = 'export default function Home() {'
composer = r'''function PhotoComposer({ fileInputRef, photoDraft, photoCaption, onCaption, onCancel, onSend }: { fileInputRef: { current: HTMLInputElement | null }; photoDraft: string | null; photoCaption: string; onCaption: (value: string) => void; onCancel: () => void; onSend: () => void }) {
  if (!photoDraft) return null;
  return <div className="photo-composer"><div className="photo-composer-backdrop" onClick={onCancel} /><section className="photo-composer-card" role="dialog" aria-modal="true" aria-label="Send a photo to Grandma"><div className="photo-composer-head"><div><Eyebrow>Real photo sharing</Eyebrow><h2>Send this moment to Meera</h2></div><button className="modal-close" onClick={onCancel}><X size={18} /></button></div><img className="photo-preview" src={photoDraft} alt="Selected photo preview" /><label className="photo-caption-label">Add a gentle caption <textarea value={photoCaption} onChange={(event) => onCaption(event.target.value)} maxLength={160} placeholder="A little sunshine for your evening." /></label><div className="photo-composer-actions"><button className="photo-secondary" onClick={() => fileInputRef.current?.click()}><ImageIcon size={15} /> Replace photo</button><button className="photo-primary" onClick={onSend}><Send size={15} /> Send to Meera</button></div><p className="photo-composer-note"><ShieldCheck size={13} /> Photo stays in this prototype session and appears in Grandma mode. Production delivery uses private storage.</p></section></div>;
}

'''
s = s.replace(marker, composer + marker, 1)

# State: add photo url/draft/caption and file input ref.
old_state = 'const [photoOpen, setPhotoOpen] = useState(false); const [ivrOpen, setIvrOpen] = useState(false);'
new_state = 'const [photoOpen, setPhotoOpen] = useState(false); const [photoDraft, setPhotoDraft] = useState<string | null>(null); const [photoCaption, setPhotoCaption] = useState(""); const [sharedPhotoUrl, setSharedPhotoUrl] = useState(PHOTO_URL); const photoInputRef = useRef<HTMLInputElement>(null); const [ivrOpen, setIvrOpen] = useState(false);'
s = s.replace(old_state, new_state, 1)

# Replace sharePhoto handler with picker and async compression.
old_handler = 'const sharePhoto = () => { setPhotoShared(true); setActiveStage("connect"); push({ title: "Photo shared with Meera", detail: "A familiar moment is ready to view.", time: "Now", tone: "amber", icon: ImageIcon }); };'
new_handler = r'''const openPhotoPicker = () => photoInputRef.current?.click();
  const compressPhoto = (file: File) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(new Error("Could not read photo")); reader.onload = () => { const image = new Image(); image.onerror = () => reject(new Error("Unsupported image")); image.onload = () => { const scale = Math.min(1, 1400 / Math.max(image.width, image.height)); const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); const context = canvas.getContext("2d"); if (!context) return reject(new Error("Canvas unavailable")); context.drawImage(image, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL("image/jpeg", .82)); }; image.src = String(reader.result); }; reader.readAsDataURL(file); });
  const handlePhotoFile = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; if (!file.type.startsWith("image/")) { push({ title: "Photo not accepted", detail: "Choose a JPG, PNG, WEBP, or camera image.", time: "Now", tone: "coral", icon: X }); return; } if (file.size > 8 * 1024 * 1024) { push({ title: "Photo is too large", detail: "Choose an image under 8MB for this prototype.", time: "Now", tone: "coral", icon: X }); return; } try { setPhotoDraft(await compressPhoto(file)); setPhotoCaption(""); } catch { push({ title: "Photo could not be opened", detail: "Try another image or take a new photo.", time: "Now", tone: "coral", icon: X }); } };
  const cancelPhoto = () => setPhotoDraft(null);
  const sendPhoto = () => { if (!photoDraft) return; setSharedPhotoUrl(photoDraft); setPhotoShared(true); setPhotoDraft(null); setActiveStage("connect"); push({ title: "Real photo shared with Meera", detail: photoCaption ? `“${photoCaption}” is ready in Grandma mode.` : "A camera or gallery photo is ready in Grandma mode.", time: "Now", tone: "amber", icon: ImageIcon }); };'''
s = s.replace(old_handler, new_handler, 1)

# Replace reset additions.
s = s.replace('setPhotoShared(false); setCheckedIn(false); setPhotoOpen(false);', 'setPhotoShared(false); setSharedPhotoUrl(PHOTO_URL); setPhotoDraft(null); setPhotoCaption(""); setCheckedIn(false); setPhotoOpen(false);', 1)

# Render: add hidden real input, composer, and photo url prop.
old_render = 'mode === "caregiver" ? <CaregiverDashboard'
# leave dashboard callbacks but change onPhoto prop to picker in only first occurrence after caregiver dashboard args
s = s.replace('onPhoto={sharePhoto} onIVR={openIVR}', 'onPhoto={openPhotoPicker} onIVR={openIVR}', 1)
s = s.replace('photoShared={photoShared} checkedIn={checkedIn}', 'photoShared={photoShared} photoUrl={sharedPhotoUrl} checkedIn={checkedIn}', 1)
old_tail = '{ivrOpen && <IVRModal'
new_tail = '<input ref={photoInputRef} id="iqcare-photo-input" type="file" accept="image/*" capture="environment" onChange={handlePhotoFile} className="visually-hidden" />{photoDraft && <PhotoComposer fileInputRef={photoInputRef} photoDraft={photoDraft} photoCaption={photoCaption} onCaption={setPhotoCaption} onCancel={cancelPhoto} onSend={sendPhoto} />}{ivrOpen && <IVRModal'
s = s.replace(old_tail, new_tail, 1)
# Grandma photo button should still open photo viewer; its onPhoto prop is currently shared with Caregiver callback only in render tail.
s = s.replace('onPhoto={() => setPhotoOpen(true)}', 'onPhoto={() => setPhotoOpen(true)}', 1)

p.write_text(s)
print('updated photo flow')
