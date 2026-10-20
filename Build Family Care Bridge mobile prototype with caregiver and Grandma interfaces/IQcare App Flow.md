# IQcare App Flow

## Product principle

IQcare is a device-adaptive care bridge. The caregiver receives a rich, explainable view; the older adult receives the smallest possible set of actions. The system follows **Sense → Understand → Alert → Connect → Care**.

## Entry flow

1. The user opens IQcare on a secure HTTPS URL or installed PWA.
2. A role screen asks whether the user is a grandchild, parent/caregiver, or grandparent.
3. A care-circle setup screen asks which device the older adult uses: keypad phone or smartphone.
4. The caregiver selects the older adult’s preferred language and confirms consent for the prototype simulation.
5. The app opens the appropriate dashboard.

## Caregiver flow

1. The dashboard displays the older adult profile, device type, language, current care state, and shared timeline.
2. Simulated wearable readings enter the Sense stage.
3. The baseline and explainable pattern card enter Understand. The first readings show a learning state rather than a false alert.
4. An unusual pattern appears in Alert with plain-language context and a prominent non-diagnostic warning.
5. The caregiver can review the alert, record a voice message, select or capture a photo, add a caption, and choose Send.
6. The app shows a real local preview of the selected/captured photo before sending.
7. The photo is stored in the active prototype session and shared to Grandma mode. In a production build, the same message payload is uploaded to authenticated object storage and referenced by a message record.
8. The caregiver sees delivery state: draft, queued, sent, delivered, viewed, or failed.
9. Grandma mode receives the voice message, photo, and check-in action through shared state.
10. The caregiver receives a timeline event when Grandma plays the message, opens the photo, confirms okay, or requests help.

## Real photo-sharing flow

1. Caregiver taps **Share a photo**.
2. On a secure mobile browser, IQcare opens the device camera through a file input with `accept="image/*"` and `capture="environment"`; the user may also choose a photo from the gallery.
3. The app validates file type and size, creates a local preview, and compresses a large image before display.
4. The caregiver can remove or replace the photo, add an optional caption, and send it.
5. The sent photo is rendered in Grandma mode and can be opened in an accessible full-screen viewer.
6. The system records a shared-state event without exposing the image publicly.
7. If offline, the photo remains in a local outbox and is marked **Waiting for connection**. The app does not falsely claim delivery.

## Grandma smartphone flow

Grandma mode has four large actions:

- **Play message**
- **View photo**
- **I’m okay**
- **I need help**

A persistent **Call Sumanth** escape hatch remains visible. Text is large, contrast is high, and the interface has no dense navigation.

## Keypad-phone flow

1. The caregiver selects keypad mode during setup.
2. The dashboard shows the IVR bridge and a simulated incoming-call screen.
3. The prototype supports `1 = Listen`, `2 = I’m okay`, `3 = Reply`, and `0 = I need help`.
4. Production integration will use a telephony provider and a language-specific voice prompt.

## Safety flow

- Alerts describe changes from the person’s own pattern and never diagnose.
- **I need help** is visually distinct and not hidden.
- Help requests notify all configured caregivers in the production architecture.
- The interface clearly distinguishes simulated wearable data, real local photo capture, and simulated telephony.

## Demo flow

The presentation demo should take 60–90 seconds:

1. Show an unusual but non-diagnostic signal.
2. Review it as a caregiver.
3. Capture a real photo from the phone camera.
4. Send the photo and a short voice message.
5. Switch to Grandma mode.
6. Open the photo and play the message.
7. Press **I’m okay**.
8. Return to the caregiver timeline and show the shared-state update.
