

# WhatsApp Automation System — Implementation Plan

## Overview
Complete backend-only WhatsApp Cloud API integration with plan-based access control, automatic triggers, daily cron reminders, manual sending, and full logging. Zero UI changes.

---

## Step 1: Database Migration

Create two new tables:

**`whatsapp_logs`** — Audit trail for every message attempt
- `id` (uuid, PK), `gym_id` (FK), `member_id` (FK), `template_name` (text), `phone` (text)
- `payload` (jsonb), `response_status` (int), `response_body` (jsonb)
- `status` (text: `sent` / `failed` / `skipped`), `error_message` (text), `created_at` (timestamptz)
- RLS enabled: gym owners/staff can SELECT their own gym's logs only

**`whatsapp_rate_limits`** — Per-gym daily message counter
- `id` (uuid, PK), `gym_id` (uuid), `date` (date), `message_count` (int, default 1)
- Unique constraint on `(gym_id, date)` for upsert support
- RLS enabled with no policies (service role only)

---

## Step 2: Core Edge Function — `send-whatsapp/index.ts` (NEW)

Reusable internal service that all other functions call.

**Flow:**
1. Accept `{ member_id, template_name, gym_id?, custom_variables? }`
2. Fetch member + gym using service role
3. Plan gate: Lite = skip; Standard = `membership_expiry_reminder` only; Pro = all
4. Phone normalization: strip formatting, validate Indian format, prepend `91` if needed, reject invalid
5. Rate limit check via SELECT, compare against plan cap (Standard: 50/day, Pro: 500/day)
6. Build template payload with **named lowercase variables** (`member_name`, `gym_name`, `expiry_date`, `amount`)
7. POST to `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`
8. Classify: `sent` (2xx), `failed` (non-2xx/network), `skipped` (plan/rate/phone)
9. Log to `whatsapp_logs` (non-blocking)
10. Upsert rate limit counter (only on `sent`)
11. Return result

**Template variable mapping:**
- `member_welcome`: `member_name`, `gym_name`
- `payment_received`: `member_name`, `amount`, `gym_name`
- `membership_expiry_reminder`: `member_name`, `expiry_date`, `gym_name`
- `membership_expired`: `member_name`, `gym_name`

Config: `verify_jwt = false`

---

## Step 3: Admin Endpoint — `send-manual-whatsapp/index.ts` (NEW)

- Requires JWT, validates `has_gym_access(user_id, member.gym_id)`
- Accepts `{ member_id, template_name }`
- Calls send-whatsapp internally
- Config: `verify_jwt = false` (manual JWT validation in code)

---

## Step 4: Payment Hook — `whatsapp-payment-hook/index.ts` (NEW)

- Accepts `{ member_id, amount, gym_id }`
- Calls send-whatsapp with `payment_received` template
- Config: `verify_jwt = false`

---

## Step 5: Modify `send-member-welcome/index.ts`

- After successful email send, also call send-whatsapp with `member_welcome`
- Wrapped in try/catch so WhatsApp failure never blocks email delivery

---

## Step 6: Modify `send-expiry-reminders/index.ts`

- Remove `push_subscriptions!inner` join requirement
- Keep existing push notification logic for members with subscriptions
- Add WhatsApp calls via fetch to send-whatsapp for each member
- Add T+1 (expired yesterday) sending `membership_expired`
- Reminder days: `[7, 3, 1, -1]`

---

## Step 7: Cron Job Setup

Run as a direct SQL insert (not migration) to schedule daily at 3:30 AM UTC (9:00 AM IST):
- Enable `pg_cron` and `pg_net` extensions
- Schedule `send-expiry-reminders` invocation

---

## Config.toml Updates

Add three new function entries with `verify_jwt = false`:
- `send-whatsapp`
- `send-manual-whatsapp`
- `whatsapp-payment-hook`

---

## Files Summary

| File | Action |
|------|--------|
| Database migration | Create `whatsapp_logs` + `whatsapp_rate_limits` |
| `supabase/functions/send-whatsapp/index.ts` | New |
| `supabase/functions/send-manual-whatsapp/index.ts` | New |
| `supabase/functions/whatsapp-payment-hook/index.ts` | New |
| `supabase/functions/send-member-welcome/index.ts` | Modified |
| `supabase/functions/send-expiry-reminders/index.ts` | Modified |
| `supabase/config.toml` | Modified |

**Zero UI changes. All backend only.**

