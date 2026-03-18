


# WhatsApp Automation System — Implementation Plan

## Overview
Complete backend-only WhatsApp integration via **MSG91** (Indian BSP, pay-as-you-go, ₹0 platform fee) with plan-based access control, automatic triggers, daily cron reminders, manual sending, and full logging. Zero UI changes.

## Provider: MSG91
- API: `https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/`
- Auth: `authkey` header
- Secrets needed: `MSG91_AUTH_KEY`, `MSG91_INTEGRATED_NUMBER`
- Variables format: `body_1`, `body_2`, etc. (positional)

---

## Step 1: Database Migration ✅ DONE
Created `whatsapp_logs` + `whatsapp_rate_limits` tables with RLS.

---

## Step 2: Core Edge Function — `send-whatsapp/index.ts` ✅ DONE
Refactored to use MSG91 API instead of direct Meta API.

---

## Step 3: Admin Endpoint — `send-manual-whatsapp/index.ts` ✅ DONE

---

## Step 4: Payment Hook — `whatsapp-payment-hook/index.ts` ✅ DONE

---

## Step 5: Expiry Reminders — `send-expiry-reminders/index.ts` ✅ DONE

---

## Step 6: Modify `send-member-welcome/index.ts` — PENDING
After successful email send, also call send-whatsapp with `welcome_emai` template.

---

## Step 7: Cron Job Setup — PENDING
Schedule `send-expiry-reminders` daily at 3:30 AM UTC (9:00 AM IST).

---

## Secrets Required
| Secret | Description |
|--------|-------------|
| `MSG91_AUTH_KEY` | MSG91 authentication key from dashboard |
| `MSG91_INTEGRATED_NUMBER` | WhatsApp number integrated with MSG91 |

## Files Summary

| File | Status |
|------|--------|
| Database migration | ✅ Done |
| `supabase/functions/send-whatsapp/index.ts` | ✅ Done (MSG91) |
| `supabase/functions/send-manual-whatsapp/index.ts` | ✅ Done |
| `supabase/functions/whatsapp-payment-hook/index.ts` | ✅ Done |
| `supabase/functions/send-expiry-reminders/index.ts` | ✅ Done |
| `supabase/functions/send-member-welcome/index.ts` | ⏳ Pending |
| Cron job setup | ⏳ Pending |

**Zero UI changes. All backend only.**
