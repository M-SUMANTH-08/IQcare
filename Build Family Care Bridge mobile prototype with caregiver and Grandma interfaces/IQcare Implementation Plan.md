# IQcare Implementation Plan

## Phase 0 — Approval gate

Approve the Signal Yellow / Royal Blue Care Console direction and upload the IQcare logo as a standalone asset. No complete visual rebuild should begin until these two items are settled.

## Phase 1 — Real photo experience

1. Add a real camera/gallery input using `accept="image/*"` and `capture="environment"`.
2. Validate MIME type, extension, dimensions, and a 5MB client limit.
3. Generate an object URL preview and revoke it on replacement/unmount.
4. Compress large images in the browser without changing the original source file.
5. Add caption input, replace, remove, cancel, and send states.
6. Share the resulting photo across caregiver and Grandma views.
7. Add image `alt` text and an accessible full-screen viewer.
8. Show draft, queued, sent, viewed, failed, and offline states honestly.

## Phase 2 — PWA and Vercel launch readiness

1. Add manifest, icons, and service worker.
2. Add a custom 404 page and fallback route.
3. Add privacy policy and terms pages.
4. Add cookie consent only for non-essential analytics.
5. Add metadata, canonical URL, Open Graph image, favicon, sitemap, and robots.txt.
6. Force HTTPS through Vercel configuration and redirect rules.
7. Add a single clear CTA: **Start the care demo**.
8. Add loading, error, and empty states.
9. Verify keyboard navigation, focus states, color contrast, alt text, and mobile breakpoints.

## Phase 3 — Real backend for photo delivery

1. Create Supabase project and private storage bucket.
2. Add Auth and care-circle membership.
3. Add database migrations for users, elders, messages, media, replies, alerts, and timeline events.
4. Add authenticated upload endpoint.
5. Generate signed URLs rather than exposing public image URLs.
6. Add realtime subscription for message delivery and photo viewed state.
7. Add delete and retention policy.
8. Add rate limits and image moderation/validation.

## Phase 4 — Testing and performance

- Run TypeScript checks and production build.
- Add unit tests for photo validation, compression thresholds, state transitions, and alert wording.
- Test camera permissions denied, cancelled picker, unsupported file, oversized file, offline queue, duplicate tap, and failed upload.
- Run Lighthouse on mobile and desktop.
- Split non-critical dashboard modules with lazy loading.
- Compress images and defer analytics.
- Confirm there are no unnecessary re-renders in the photo composer.
- Confirm no secrets are present in source or build output.
- Check broken links and sitemap output.

## Phase 5 — Demo rehearsal

1. Install the Vercel build as a PWA on an Android/iQOO phone.
2. Capture a real photo.
3. Send it to Grandma mode.
4. Play the voice message.
5. Open the photo.
6. Press **I’m okay**.
7. Return to the caregiver timeline.
8. Repeat with network disabled to show the outbox state.

## Scope discipline

The first truly working slice should be **real photo capture → preview → shared Grandma view → viewed-state update**. Real telephony, wearable integrations, automatic SMS, and multi-user authentication should follow the photo slice rather than delaying it.
