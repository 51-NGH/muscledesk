import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "member_session";

function readSessionToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Invokes the `member-portal-data` edge function with the current member's
 * HMAC-signed session token automatically attached. The edge function
 * uses the token (NOT the body member_id) as the source of truth for which
 * member's data is being accessed, preventing horizontal privilege escalation.
 */
export async function invokeMemberPortal(opts: { body: Record<string, unknown> }) {
  const token = readSessionToken();
  return supabase.functions.invoke("member-portal-data", {
    body: { ...opts.body, session_token: token },
  });
}

/**
 * Invokes the `member-auth` edge function with the session token attached
 * for actions that need authorization (get-member, get-payments, get-attendance).
 * Login/validate-token actions also work since the token is simply ignored
 * when not required.
 */
export async function invokeMemberAuth(opts: { body: Record<string, unknown> }) {
  const token = readSessionToken();
  return supabase.functions.invoke("member-auth", {
    body: { ...opts.body, session_token: token },
  });
}
