import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AuthRequest {
  action: "login" | "validate-token" | "set-pin" | "get-member" | "get-payments" | "get-attendance";
  email?: string;
  pin?: string;
  token?: string;
  member_id?: string;
  session_token?: string;
  limit?: number;
}

// ---------- HMAC session token helpers ----------
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24h
const SIGNING_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function b64url(bytes: Uint8Array): string {
  let s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SIGNING_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return b64url(new Uint8Array(sig));
}
export async function issueSessionToken(memberId: string): Promise<{ token: string; expiresAt: string }> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${memberId}.${exp}`;
  const sig = await hmac(payload);
  return { token: `${payload}.${sig}`, expiresAt: new Date(exp * 1000).toISOString() };
}
export async function verifySessionToken(token: string | undefined | null): Promise<string | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [memberId, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const expected = await hmac(`${memberId}.${exp}`);
  // constant-time-ish compare
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0 ? memberId : null;
}
// ------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { action, email, pin, token, member_id, session_token, limit = 20 }: AuthRequest = await req.json();

    if (action === "login") {
      if (!email || !pin) {
        return json({ error: "Email and PIN required" }, 400);
      }
      const { data, error } = await supabaseAdmin.rpc("verify_member_pin", { _email: email, _pin: pin });
      if (error) {
        console.error("Login error:", error);
        return json({ error: "Authentication failed" }, 500);
      }
      if (!data.success) {
        return json({ success: false, error: data.error }, 401);
      }

      const { token: sessionToken, expiresAt } = await issueSessionToken(data.member_id);
      return json({
        success: true,
        session: {
          token: sessionToken,
          member_id: data.member_id,
          gym_id: data.gym_id,
          full_name: data.full_name,
          email: data.email,
          expires_at: expiresAt,
        },
      });
    }

    if (action === "validate-token") {
      if (!token) return json({ error: "Token required" }, 400);
      const { data, error } = await supabaseAdmin.rpc("validate_portal_token", { _token: token });
      if (error) {
        console.error("Token validation error:", error);
        return json({ error: "Validation failed" }, 500);
      }
      return json(data, data.success ? 200 : 400);
    }

    if (action === "set-pin") {
      if (!token || !pin) return json({ error: "Token and PIN required" }, 400);
      const { data, error } = await supabaseAdmin.rpc("set_member_pin", { _token: token, _pin: pin });
      if (error) {
        console.error("Set PIN error:", error);
        return json({ error: "Failed to set PIN" }, 500);
      }
      return json(data, data.success ? 200 : 400);
    }

    // ---------- AUTHENTICATED ACTIONS ----------
    // Require a valid HMAC session_token. The authoritative member_id comes from
    // the verified token; the body member_id (if any) must match.
    const verifiedMemberId = await verifySessionToken(session_token);
    if (!verifiedMemberId) {
      return json({ error: "Unauthorized: invalid or expired session" }, 401);
    }
    if (member_id && member_id !== verifiedMemberId) {
      return json({ error: "Forbidden: session does not match requested member" }, 403);
    }
    const authedMemberId = verifiedMemberId;

    if (action === "get-member") {
      const { data: member, error } = await supabaseAdmin
        .from("members").select("*").eq("id", authedMemberId).is("deleted_at", null).single();
      if (error) {
        console.error("Get member error:", error);
        return json({ error: "Member not found" }, 404);
      }
      return json({ member });
    }

    if (action === "get-payments") {
      const { data: payments, error } = await supabaseAdmin
        .from("payments")
        .select("id, amount, payment_mode, status, plan_name, new_start_date, new_expiry_date, created_at, notes")
        .eq("member_id", authedMemberId)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.error("Get payments error:", error);
        return json({ error: "Failed to fetch payments", payments: [] }, 500);
      }
      return json({ payments: payments || [] });
    }

    if (action === "get-attendance") {
      const { data: attendance, error } = await supabaseAdmin
        .from("attendance").select("id, check_in_at, source")
        .eq("member_id", authedMemberId)
        .order("check_in_at", { ascending: false })
        .limit(limit);
      if (error) {
        console.error("Get attendance error:", error);
        return json({ error: "Failed to fetch attendance", attendance: [] }, 500);
      }
      return json({ attendance: attendance || [] });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error: unknown) {
    console.error("Error in member-auth:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
