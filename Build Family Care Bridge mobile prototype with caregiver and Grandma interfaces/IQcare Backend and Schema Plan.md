# IQcare Backend and Schema Plan

## Current prototype boundary

The current project is a static React/Vite prototype. It has no server, database, authenticated users, or automatic telephony. Real photo capture and preview can run in the browser; shared state is currently session-local. The prototype must label simulated wearable data and simulated IVR honestly.

## Recommended Vercel architecture

- **Frontend:** React/Vite PWA hosted on Vercel with HTTPS.
- **API layer:** Vercel Functions or a small managed backend.
- **Database:** Supabase Postgres for relational care-circle data and row-level security.
- **Object storage:** Supabase Storage or S3-compatible private bucket for photos and audio.
- **Authentication:** Supabase Auth or an equivalent provider; no secrets in frontend code.
- **Realtime:** Supabase Realtime for caregiver/Grandma shared-state updates.
- **Telephony:** Twilio or Exotel adapter for future IVR and SMS.
- **AI adapter:** server-side provider abstraction with a local/on-device fallback for supported tasks.

## Core tables

### `users`

`id`, `display_name`, `phone`, `role`, `created_at`, `updated_at`

### `care_circles`

`id`, `name`, `created_by`, `created_at`, `updated_at`

### `care_circle_members`

`care_circle_id`, `user_id`, `member_role`, `status`, `created_at`

### `elder_profiles`

`id`, `care_circle_id`, `display_name`, `phone_number`, `preferred_language`, `device_type`, `timezone`, `photo_url`, `created_at`, `updated_at`

### `consent_records`

`id`, `elder_id`, `granted_by`, `scope_json`, `granted_at`, `revoked_at`, `last_reviewed_at`

### `messages`

`id`, `care_circle_id`, `elder_id`, `sender_id`, `message_type`, `caption`, `delivery_channel`, `status`, `created_at`, `sent_at`, `delivered_at`, `viewed_at`, `failure_code`

### `message_media`

`id`, `message_id`, `storage_key`, `mime_type`, `byte_size`, `width`, `height`, `sha256`, `created_at`, `expires_at`

### `replies`

`id`, `message_id`, `elder_id`, `reply_type`, `quick_status`, `audio_storage_key`, `transcript`, `transcript_confidence`, `ai_assisted`, `created_at`

### `wearable_signals`

`id`, `elder_id`, `source`, `metric_type`, `value`, `recorded_at`, `created_at`

### `alerts`

`id`, `elder_id`, `metric_type`, `observed_value`, `baseline_value`, `explanation_text`, `status`, `cooldown_until`, `created_at`

### `timeline_events`

`id`, `care_circle_id`, `actor_id`, `event_type`, `summary`, `related_id`, `created_at`

## Photo upload API shape

`POST /api/messages/photo` accepts a multipart upload only after authentication and care-circle authorization. The API validates MIME type, extension, file size, image dimensions, and ownership. It compresses or normalizes the image server-side, stores it in a private bucket, creates a `messages` record, and returns a short-lived signed URL. The frontend must never receive a storage master key.

Example response:

```json
{
  "messageId": "msg_123",
  "status": "sent",
  "media": {
    "mimeType": "image/webp",
    "width": 1280,
    "height": 960,
    "signedUrl": "https://..."
  }
}
```

## Security rules

- Keep database, storage, AI, telephony, and analytics secrets server-side.
- Enforce care-circle membership on every read and write.
- Use private object storage and expiring signed URLs.
- Strip EXIF location metadata from uploaded photos.
- Add file-size and content-type limits.
- Rate-limit uploads, SMS, and IVR requests.
- Add audit events for photo view, download, delete, consent, and help requests.
- Never expose raw health data to an unauthorized member.
- Do not present AI output as a medical diagnosis.

## Vercel deployment notes

The frontend may be deployed to Vercel now. A real production photo send requires a backend/API and private storage; a static frontend alone cannot safely provide multi-user delivery. Configure environment variables only in Vercel project settings. Do not commit `.env` files.
