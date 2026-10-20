# IQcare — Product Requirements Document

**Signal to Care.** Smart for the caregiver. Simple for Grandma. Connected by voice.

| | |
|---|---|
| **Version** | 1.0 (Hackathon Prototype) |
| **Status** | Draft for iQOO Hackathon 2026 — Hyderabad City Battle |
| **Last updated** | September 22, 2026 |
| **Companion docs** | `Architecture.md`, `Architecture_essentials.md` |

---

## 1. One-Line Pitch

IQcare is a voice-first family-care bridge that gives distant caregivers intelligent, explainable signals about an elder's wellbeing, and gives the elder a way to receive and reply to those signals using only what they already know how to do: answer a phone call or tap one big button.

---

## 2. Problem Statement

Millions of Indian families are split by distance — a working adult child or grandchild in one city, an aging parent or grandparent in another. Two gaps compound each other:

1. **The elder can't bridge the app gap.** They can answer a phone call reliably. They usually cannot reliably navigate WhatsApp threads, open the right chat, record and send a voice note, or read a health dashboard.
2. **The caregiver can't bridge the distance gap.** They may receive raw wearable data or nothing at all, but they have no lightweight, warm way to know *when* a check-in actually matters, and no simple channel to reach a parent who won't or can't use an app.

Existing options each solve one side and ignore the other:

| Existing Solution | Limitation | IQcare's Answer |
|---|---|---|
| WhatsApp / messaging apps | Same complex interface for both generations | Two deliberately different interfaces |
| Health monitoring apps | Elder must operate a complex UI themselves | Elder never sees the complex UI at all |
| Pure monitoring dashboards | Feel cold, surveillance-like, no path to a human moment | Every signal resolves into a warm, voice-based exchange |
| Standard IVR / robocall systems | Generic, impersonal, one-way | Carries the *caregiver's own voice*, in family context |
| Just calling more often | No signal for *when* to call; call may be missed with no fallback | A well-timed nudge, plus an async reply path if the elder is busy or the call isn't picked up |

IQcare does not diagnose, treat, or replace a clinician or emergency services. It removes the *technology and communication* barrier standing between two people who both already want to stay close.

---

## 3. Vision & Core Product Principle

> **Technology should adapt to the older person, not the older person to the technology.**

This produces four non-negotiable design rules, carried through every screen and flow in this document:

1. Grandma Mode contains almost no choices.
2. Keypad-phone users are fully included — not a "coming soon."
3. The caregiver dashboard is allowed to be information-dense, because the caregiver has a different job than the elder does.
4. Every alert must resolve into a clear, human action — never a bare number on a screen.

---

## 4. iQOO Hackathon 2026 Fit — Read This Before Anything Else Below

This section exists because it changes what "prototype" means for this build. Details below are drawn from iQOO's and Reskilll's own event pages and press coverage as of September 22, 2026; a few figures vary slightly between sources, and registration windows move fast, so **confirm live details at `iqoo.reskilll.com` before finalizing your plan.**

| Item | What we found | What it means for IQcare |
|---|---|---|
| **Event** | iQOO Hackathon 2026 "City Battles," organized by iQOO × Reskilll. Four 30-hour city battles (Bengaluru Aug 29–30, Pune Sept 5–6, Chennai Sept 12–13, **Hyderabad Sept 26–27**), then a 48-hour Grand Finale in Bengaluru Oct 9–11. | Given your location, **Hyderabad (Sept 26–27) is almost certainly your target — that is 4–5 days from today.** Check registration status immediately; the flow is "open applications → idea screening → shortlisting → on-ground battle," which implies a cutoff before the event, not a walk-in. |
| **Format** | "Phone-first," hybrid build. A **Red Light / Green Light** system: ~55–60% of the 30 hours is Red Light — build primarily *on the iQOO phone itself* via **iQOO Office Kit** (a phone↔laptop bridge), laptops restricted; the rest is Green Light, both devices unlocked. | This is not "build a web app and show it on a laptop." Your team needs a plan for what gets built phone-only vs. phone+laptop, and needs to rehearse Office Kit before the clock starts. |
| **Hardware** | A loaner iQOO 15 is issued to every participant at check-in. You don't need to own one. | The demo device is provided — good. But it means your build must run *natively well* in a phone browser / as an installed PWA, not just "responsive if you squint." |
| **Team size** | Solo or teams of up to **3**. Students and working professionals compete in **separate buckets** — no mixing on one team. | Confirm your team fits this. If you're a mixed student/professional group, check current rules — this may disqualify or reclassify the team. |
| **Hyderabad tracks** | Seven named tracks: FinTech & Commerce, Smart Education, **HealthTech (healthcare, wellness, fitness, mental health AI)**, Productivity, Smart Living, Developer Tools, Open Innovation. | **IQcare maps cleanly onto HealthTech.** Pitch it there first; "Open Innovation" is a reasonable fallback framing if HealthTech feels too narrow on the day. |
| **Judging rubric** | End product quality 30% (jury) · Novelty & impact 20% (jury) · Creative phone use — camera, voice, on-device AI 15% (device-tracked) · Technical depth 15% (jury) · Office Kit usage 10% (device-tracked) · Demo & presentation 10% (jury). Other coverage of the series describes the same weightings in words: phone-first execution, AI integration, Office Kit usage, real-world relevance, pitch quality. | **25% of your score (creative phone use + Office Kit usage) is about *how* you build, tracked automatically by device data ("HackTracker"), not just what you show.** This is unusual and easy to miss if you plan like a generic hackathon. |
| **Explicit "don't"s** (from organizer guidance) | Don't build web-only — the demo must run on the iQOO phone. Don't skip Office Kit practice. Don't rely only on cloud APIs — on-device/local models earn extra points. Don't arrive without a Red/Green task split planned. | Directly informs the architecture decisions in `Architecture.md` §3 and §10 (mobile-first execution, on-device-AI tier, pre-planned task split). |
| **AI requirement** | AI credits are provided; on-device inference via the phone's Snapdragon NPU is explicitly rewarded ("no cloud dependency" bonus). | **The source concept's only AI touchpoint was a throwaway line about an "AI-assisted transcript."** That is not enough for a rubric where AI integration is worth 15–20%+ of the score. §10 of `Architecture.md` adds a real AI layer. |
| **Cost / prizes** | Free to enter. ₹6L prize pool per city battle; ₹40L across the series. Grand Finale figure is reported inconsistently across sources (~₹16L+ vs. an explicit ₹25L in one release) — treat as directional, confirm on the portal. | Not product-relevant, included for completeness. |

**Bottom line:** the underlying IQcare *idea* is a strong fit for the HealthTech track. The underlying IQcare *plan* — a client-side React web app, laptop-built, with no real AI — is a poor fit for how this specific hackathon is scored. The rest of this PRD and the two architecture documents are written to close that gap, not to change the idea.

---

## 5. Goals

### 5.1 Hackathon Goal (the one that matters for Sept 26–27)
Ship a small, reliable slice of IQcare that:
- Runs and demos **on the loaner iQOO phone**, installed like an app, not just "open in a browser."
- Uses the phone's **real camera and microphone**, not simulated inputs.
- Contains at least one **genuine AI call** doing real work (turning a raw signal deviation into plain-language text; turning a messy voice reply into a clean update) — not a static template dressed up as AI.
- Completes the **full loop** — Sense → Understand → Alert → Connect → Care — for one scenario, live, in under two minutes, without depending on venue Wi-Fi.
- Can be explained and defended in a 60–90 second pitch by any team member.

### 5.2 Product Vision (beyond the hackathon)
A real pilot: one telephony provider, one regional language, one approved wearable/health-data source, a small number of real families, proving the loop with real people before adding scope.

---

## 6. Target Users & Personas

### 6.1 The Distance Caregiver — "Sumanth"
- 25–45, lives ~80 km+ from the elder, smartphone-native, time-poor.
- Wants: peace of mind without becoming a full-time monitor; a low-effort way to know *when* to reach out, not a constant data feed to interpret himself.
- Frustration today: either silence (no signal at all) or noise (raw wearable data he doesn't know how to read).

### 6.2 The Independent Elder — "Meera"
- 65+, comfortable answering phone calls, not comfortable with app navigation.
- May have age-related or chronic health considerations; may have mild vision, hearing, or memory changes.
- Owns *either* a smartphone she barely uses, *or* a basic keypad phone — the product must not assume which.
- Wants: to stay connected to family on her own terms, without feeling watched or infantilized.

### 6.3 Extended Family Member (secondary caregiver)
- A sibling, cousin, or second child who wants visibility without owning the primary response.
- Needs to see the same timeline without duplicating outreach or crowding Meera's phone with three messages at once (see §10.9).

### 6.4 Future / Out of Scope Now
Professional caregivers, community health workers, and clinicians are not designed for in this version — noted here only so the data model in `Architecture.md` doesn't accidentally block them later.

---

## 7. User Stories

**Caregiver**
- As a caregiver, I want a plain-language nudge when something looks different from Meera's own normal pattern, so I know when a check-in is worth doing without staring at raw numbers.
- As a caregiver, I want to send a short voice message and a photo in one flow, so reaching out takes seconds, not minutes.
- As a caregiver, I want to know whether Meera actually heard my message and how she responded, so I'm not left guessing.
- As a caregiver, I want a shared timeline visible to the rest of the family, so I'm not the only one keeping track.

**Elder**
- As Meera, I want to hear my grandson's voice with at most one tap, so I don't need to learn anything new.
- As Meera, if I only have a keypad phone, I want a normal phone call with simple numbered choices, so I'm not excluded by what device I own.
- As Meera, I want a single obvious way to say "I'm okay" or "I need help," so I'm never stuck not knowing what to press.
- As Meera, I want to know who can see my information and to be able to say no, so this doesn't feel like being watched.

**Family / Shared**
- As a secondary caregiver, I want to see that someone already reached out today, so I don't send a duplicate message an hour later.
- As a family, we want one shared record of alerts, messages, and replies, so nothing falls through the cracks between us.

**Safety**
- As Meera, if I press "I need help" instead of "I'm okay," I want every caregiver notified immediately, so someone responds fast regardless of who's free right now.
- As a caregiver, I never want the app to tell me Meera has a medical condition — only that something looks different and is worth a human check.

---

## 8. Scope for the 30-Hour Build (MoSCoW)

Written for the real Hyderabad City Battle constraint, not an idealized full product.

| Priority | Item |
|---|---|
| **Must** | One elder, one caregiver, one full Sense→Care loop, running on-phone, with real camera + mic |
| **Must** | Grandma Mode: 3 large actions (Play message, View photo, I'm okay / I need help) |
| **Must** | At least one real AI call (alert explanation *or* reply summarization) — not templated text |
| **Must** | Explainable, non-diagnostic alert copy (see §14) |
| **Must** | A rehearsed, judge-safe demo path that works with no live network (see §13.2) |
| **Should** | IVR / keypad-phone simulation for the second persona (can be visually simulated on-screen if a real call can't be wired up in time) |
| **Should** | Shared care timeline (even if single-device, single-session) |
| **Should** | Consent / "who can see this" screen (one screen is enough to make the point) |
| **Could** | Multi-caregiver coordination and message queueing (§10.9) |
| **Could** | Second language for the IVR prompts |
| **Could** | On-device (not cloud) AI inference for bonus scoring |
| **Won't (this build)** | Real telephony (Twilio/Exotel), real wearable integration, multi-elder support, authentication system, native Android rewrite |

If time runs out, cut from the bottom of this list, never from the "Must" row — a small thing that works beats a large thing that almost works.

---

## 9. Functional Requirements

### 9.1 Caregiver Dashboard
- Elder profile: name, photo, preferred language, device type (smartphone / keypad).
- Alert feed with plain-language explanation and a clear "not a diagnosis" line on every alert.
- Compose: voice message (record via device mic) + optional photo (via device camera) in one action.
- Care timeline: chronological, shared, shows alerts, messages, replies, status.

### 9.2 Grandma Mode (Smartphone)
- Three actions only, in large high-contrast buttons: **Play message**, **View photo**, **I'm okay**.
- A fourth, visually distinct action for **I need help** (see §9.8) — not hidden, not equal-weighted with "I'm okay" so it isn't mis-pressed, but always present.
- One-tap "Call [caregiver name]" as an always-available escape hatch.

### 9.3 IVR Simulator (Keypad Phone)
- On-screen simulation of an incoming call with spoken prompts in the elder's preferred language.
- Keypad actions: **1** = Listen, **2** = I'm okay, **3** = Record reply, **0** = I need help.
- Elder's original voice reply is always preserved; a transcript is generated and clearly labeled "AI-assisted, may contain errors."

### 9.4 Baseline & Alert Engine
- Compares each new signal against the elder's *own* rolling baseline (not a population average) for that metric and time-of-day.
- Requires a minimum sample size before alerting at all (§9.6 — cold start).
- Every alert text is generated through a single "Alert Explainer" function so language is guaranteed consistent and non-diagnostic — see `Architecture.md` §10.

### 9.5 Messaging
- Voice (record/playback), photo, and text-caption support.
- Delivery channel is chosen automatically based on the elder's registered device type.

### 9.6 Cold Start Handling *(gap-fill)*
The source concept assumes a baseline already exists. A new elder profile has none. Rule: no anomaly alerts fire until a minimum number of readings exist (prototype: a small fixed number, tunable); until then, the dashboard shows "Still learning Meera's patterns" instead of staying silent or guessing.

### 9.7 Alert Fatigue Control *(gap-fill)*
Once a caregiver dismisses an alert as normal-for-her, the same pattern should not re-alert immediately. A cooldown window suppresses repeat alerts for the same metric/deviation until it either escalates further or the cooldown expires. Without this, the "explainable alert" pitch degrades into noise within days.

### 9.8 Emergency / "I Need Help" Path *(gap-fill)*
The source concept has "I'm feeling okay" but no opposite. Every place the elder can say "I'm okay" must sit beside an equally reachable way to say the opposite. Pressing it:
- Notifies **every** caregiver in the circle immediately, not just the primary.
- Does **not** claim to contact emergency services — IQcare is not a certified emergency responder. It surfaces the elder's local emergency number as a reference and pushes the family to act, consistent with §14's boundaries.

### 9.9 Multi-Caregiver Coordination *(gap-fill)*
The "3 buttons" simplicity promise breaks quietly the moment two caregivers both send a message the same afternoon — whose plays first, and does Meera get two calls back to back? Rule: messages queue in arrival order; Grandma Mode always shows "1 of 2" style paging rather than only the latest; the shared timeline marks a message as "being handled" once any caregiver has acted, so a second caregiver sees that and doesn't duplicate the outreach.

### 9.10 Onboarding & Consent *(gap-fill)*
The source concept never asks Meera's permission to be monitored — a real gap given this is a wellness/monitoring product, not just a messaging app. Minimum for the prototype: one onboarding screen capturing that consent was given, by whom (elder or guardian), and for which signals; one Grandma-side screen answering "who can see this." Monitoring does not start without this recorded, even in the prototype's mocked data.

### 9.11 Demo Mode
A "Play Demo" control that runs the whole scripted scenario end to end on cue — see §13.2. This is a hackathon-reliability feature, not a user-facing one.

---

## 10. Non-Functional Requirements

- **Accessibility:** minimum 48px touch targets in Grandma Mode, ≥4.5:1 contrast, scalable text, no flow deeper than 2 taps from Grandma Mode's home.
- **Performance:** every in-app interaction feels instant (no spinners for local/simulated actions); the one real AI call should have a visible, honest "thinking" state rather than a fake instant response.
- **Reliability:** the demo must survive flaky or absent venue Wi-Fi — see §13.2.
- **Language:** scope to 1–2 languages for the working prototype; design the data/copy layer so more can be added without a rebuild.
- **Privacy by design:** no real personal or health data collected in the prototype; this is stated on-screen, not just in this document.

---

## 11. Experience Flows

**Flow 1 — Primary scenario.** Meera's afternoon movement reads lower than her own baseline → dashboard shows a plain-language, non-diagnostic nudge → Sumanth records a voice message and attaches a photo → delivered via Grandma Mode (or IVR if keypad phone) → Meera plays it, replies by voice, confirms "I'm okay" → Sumanth receives the audio plus an AI-assisted transcript → timeline closes the loop for the whole family.

**Flow 2 — Medicine photo assistance.** Meera is at a pharmacy, unsure of the exact tablet → she presses "Ask family" (or uses the IVR equivalent) → Sumanth is notified, photographs the correct medicine, adds a short voice note → Meera receives photo + voice guidance through the same three-button interface.

**Flow 3 — Onboarding & consent** *(new)*. Caregiver adds Meera's profile → records preferred language and device type → consent step captures who agreed and to what → Grandma-side "who can see this" screen is generated from the same record.

**Flow 4 — "I need help"** *(new)*. Meera presses the help action (app or keypad "0") → every caregiver in the circle is notified simultaneously → timeline logs it as high-priority → local emergency number is surfaced as a reference, with a clear "this app cannot call emergency services for you" statement.

**Flow 5 — Two caregivers, one elder** *(new)*. Sumanth and a sibling both see the same alert → Sumanth responds first → the sibling's dashboard shows "Sumanth is on this" → if the sibling still wants to add a personal message, it queues behind Sumanth's rather than interrupting it.

---

## 12. Demo Script

### 12.1 The 90-Second Flow

| Time | Action | What judges see |
|---|---|---|
| 0–10s | State the problem in one sentence | A real, specific human gap, not a generic "elderly care is hard" |
| 10–25s | Trigger a simulated signal change | The system notices a meaningful difference, on-phone, live |
| 25–40s | Show the explainable alert | Plain language, explicit "not a diagnosis," and the real AI call visibly producing it |
| 40–55s | Record + send a voice message and photo, using the phone's real camera/mic | Phone-native capture, not a mock file |
| 55–70s | Switch to Grandma Mode (or the IVR simulator) on the same device | Radical simplicity, in contrast to the caregiver screen just shown |
| 70–85s | Show the reply plus AI-generated transcript/summary | The second genuine AI call, closing the loop |
| 85–90s | Show the shared timeline | The whole family is aligned, not just one screen |

**Closing line:** *"The caregiver gets intelligence. Grandma gets simplicity. The family stays connected through the technology she already understands — and it all just happened on the phone in your hand."*

### 12.2 Demo Reliability Checklist *(gap-fill — this is what breaks live demos)*
- Default to a **single device, split-view** demo (caregiver view / Grandma view as a toggle on the same phone) rather than two synced devices — no dependency on venue Wi-Fi for the core story.
- Bundle **pre-recorded fallback audio** for the voice message and reply, used automatically if `getUserMedia`/mic permission fails in front of judges.
- Rehearse the exact script above at least three times before the judging window.
- Confirm the deployed build is served over **HTTPS** — mic and camera access silently fail otherwise (see `Architecture.md` §16).
- Have a **local-only fallback** (`npm run dev` on a laptop, screen-mirrored) ready in case the hosted build or Wi-Fi fails entirely.

---

## 13. Safety, Ethics & Boundaries

IQcare **never**:
- Diagnoses or prescribes.
- Claims a medical emergency from a single reading.
- Replaces a clinician, a relative's judgment, or emergency services.

**Safe language template** (this is what the AI-generated alert text is constrained to say):
> "Meera's recent [metric] is different from her usual [time-of-day] range. This is not a diagnosis. Consider a gentle check-in, and follow her clinician's guidance if she feels unwell."

**Consent & dignity** *(gap-fill)*: framed positively, "signal to care" still monitors a person. Without visible consent and an easy way to see "who's watching," the product risks feeling like surveillance rather than warmth — the exact trap the pitch claims to avoid. §9.10 and Flow 3 exist specifically to close this.

All voice replies preserve the original audio. Every transcript is labeled AI-assisted and may contain errors — never presented as the elder's exact words without that caveat.

---

## 14. Success Metrics

**For the hackathon demo**
- The full loop completes live, on-phone, in under 90 seconds, without manual recovery.
- A judge who has never seen the product can restate the one-line pitch after the demo.
- At least one AI call is visibly doing real interpretive work, not just returning a static string.

**For the product, beyond the hackathon**
- Median time from alert to a completed check-in.
- Share of alerts that resolve into a real reply, not just a dismissed notification.
- Elder-reported comfort/dignity score (not just caregiver-reported peace of mind — both matter, and they are not the same metric).

---

## 15. Assumptions & Constraints

- The elder has *a* working phone — smartphone or keypad — with a stable number.
- The team has access to the loaner iQOO 15 only from event check-in; anything demoed must survive not being able to touch the exact device beforehand (test on the closest available Android device).
- Prototype data is entirely simulated/mocked; no real PII is collected or transmitted.

---

## 16. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Mic/camera permission fails in front of judges | Medium | High | Pre-recorded fallback assets; HTTPS deploy; rehearsed local fallback (§12.2) |
| Team under-invests in AI integration, scores poorly on that 15–20% | Medium | High | AI layer is a **Must**, not a Could (§8, `Architecture.md` §10) |
| Trying to build both interfaces + IVR + multi-language in 30 hours | High | High | Strict MoSCoW cut order (§8); one scenario built deep, not many built shallow |
| Perceived surveillance undermines the "warm, not cold" pitch | Low–Medium | Medium | Consent flow + "who can see this" screen (§9.10) |
| Cross-device sync flakiness on venue Wi-Fi | Medium | Medium | Default to single-device split-view demo (§12.2) |
| Registration/shortlisting deadline for Hyderabad missed | Unknown — verify now | High | Check `iqoo.reskilll.com` today; this is time-sensitive as of writing |

---

## 17. Roadmap

**Prototype (this hackathon)** → **Pilot** (one telephony provider, one language, one wearable/data source, a handful of real families) → **V1** (real IVR + real wearable data + notifications) → **V2 ideas** (multiple elders per caregiver, clinician-facing view, wearable-brand partnerships).

---

## 18. Open Questions

- Which 1–2 languages will the demo actually support end to end?
- Single-device split-view, or will the team attempt real cross-device sync if time allows?
- Confirm current Hyderabad registration/shortlisting deadline directly on the official portal — not yet independently confirmed as of this document's writing.
- Final team roster and student/professional bucket — not specified by the user at time of writing, flagged here rather than assumed.
- HealthTech vs. Open Innovation as the submitted track — recommend HealthTech, confirm on submission.

---

## 19. Appendix: Glossary

- **Baseline** — an elder's own historical normal for a given signal and time of day, not a population average.
- **Cold start** — the period before enough data exists to detect anomalies safely.
- **Grandma Mode** — the radically simplified smartphone interface for the elder.
- **Red Light / Green Light** — the iQOO Hackathon's phone-only vs. phone+laptop build windows.
- **Office Kit** — iQOO's phone↔laptop bridge tool, whose usage is scored.
- **HackTracker** — the device-side tracking referenced in hackathon coverage for phone-use and Office Kit scoring.
