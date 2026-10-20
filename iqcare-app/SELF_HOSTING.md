# IQcare prototype — self-hosting notes

IQcare is a frontend-only React/Vite prototype. It uses local React state to demonstrate onboarding, caregiver setup, simulated wearable signals, keypad-phone IVR, Grandma mode, voice/photo actions, shared state, and the 75-second demo. No real smartwatch, telephony, database, or AI service is connected in this prototype.

## Run locally

```bash
pnpm install
pnpm dev
```

For a production build:

```bash
pnpm check
pnpm build
```

The source is under `client/src/`. The main experience is in `client/src/pages/Home.tsx`, the visual system is in `client/src/index.css`, and metadata is in `client/index.html`.

## Replace the demo image

The hosted preview uses a managed IQcare demo image path. For an external host, copy `source-assets/family-care-grandma.jpg` into your public assets folder and change `PHOTO_URL` in `client/src/pages/Home.tsx` from the `/manus-storage/...` path to your local public path, for example `/assets/family-care-grandma.jpg`.

## What is simulated

Wearable readings, unusual-pattern detection, IVR call progress, keypad responses, voice reply audio, AI transcription, and the 75-second demo timeline are simulated for presentation. Before production use, add authenticated backend storage, explicit consent, real telephony, approved wearable APIs, speech-to-text, language support, audit logs, privacy controls, and medical-safety review. The prototype must not diagnose or prescribe medication.


## Real offline bridge feature

The prototype now includes one real browser-capable feature: the **Offline Care Message Bridge**. It detects the browser’s online/offline state, keeps the caregiver’s short message in React state while the page remains open, reads the message aloud through the browser/device `speechSynthesis` API when available, and opens the device SMS composer with an `sms:` link. The caregiver still confirms the final SMS send; the prototype does not silently send messages or bypass phone permissions.

To test it, complete onboarding, open the caregiver dashboard, edit the offline message, select **Read aloud on this phone**, select **Save offline**, and select **Open SMS composer** on a supported phone. The phone’s native messaging application should open with the message body prepared. If the browser is offline, the bridge displays the offline state. **Simulate internet return** demonstrates the synchronization transition for the presentation.

This is a real browser/device handoff, not a fake SMS API. Automatic SMS delivery, inbound SMS parsing, IVR calls, background persistence, and cloud synchronization still require a native Android wrapper or a backend/telephony provider. For a production Android version, add encrypted local storage, Android SMS permissions, a telephony provider, authenticated sync, and explicit consent.
