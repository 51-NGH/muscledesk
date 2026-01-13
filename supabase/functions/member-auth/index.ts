import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthRequest {
  action: "login" | "validate-token" | "set-pin" | "get-member" | "get-payments" | "get-attendance";
  email?: string;
  pin?: string;
  token?: string;
  member_id?: string;
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { action, email, pin, token, member_id, limit = 20 }: AuthRequest = await req.json();

    if (action === "login") {
      if (!email || !pin) {
        return new Response(JSON.stringify({ error: "Email and PIN required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data, error } = await supabaseAdmin.rpc("verify_member_pin", {
        _email: email,
        _pin: pin
      });

      if (error) {
        console.error("Login error:", error);
        return new Response(JSON.stringify({ error: "Authentication failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      if (!data.success) {
        return new Response(JSON.stringify({ success: false, error: data.error }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Generate a session token
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

      return new Response(JSON.stringify({
        success: true,
        session: {
          token: sessionToken,
          member_id: data.member_id,
          gym_id: data.gym_id,
          full_name: data.full_name,
          email: data.email,
          expires_at: expiresAt.toISOString()
        }
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "validate-token") {
      if (!token) {
        return new Response(JSON.stringify({ error: "Token required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data, error } = await supabaseAdmin.rpc("validate_portal_token", {
        _token: token
      });

      if (error) {
        console.error("Token validation error:", error);
        return new Response(JSON.stringify({ error: "Validation failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify(data), {
        status: data.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "set-pin") {
      if (!token || !pin) {
        return new Response(JSON.stringify({ error: "Token and PIN required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data, error } = await supabaseAdmin.rpc("set_member_pin", {
        _token: token,
        _pin: pin
      });

      if (error) {
        console.error("Set PIN error:", error);
        return new Response(JSON.stringify({ error: "Failed to set PIN" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify(data), {
        status: data.success ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "get-member") {
      if (!member_id) {
        return new Response(JSON.stringify({ error: "member_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: member, error } = await supabaseAdmin
        .from("members")
        .select("*")
        .eq("id", member_id)
        .is("deleted_at", null)
        .single();

      if (error) {
        console.error("Get member error:", error);
        return new Response(JSON.stringify({ error: "Member not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ member }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "get-payments") {
      if (!member_id) {
        return new Response(JSON.stringify({ error: "member_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: payments, error } = await supabaseAdmin
        .from("payments")
        .select("id, amount, payment_mode, status, plan_name, new_start_date, new_expiry_date, created_at, notes")
        .eq("member_id", member_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Get payments error:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch payments", payments: [] }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ payments: payments || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (action === "get-attendance") {
      if (!member_id) {
        return new Response(JSON.stringify({ error: "member_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const { data: attendance, error } = await supabaseAdmin
        .from("attendance")
        .select("id, check_in_at, source")
        .eq("member_id", member_id)
        .order("check_in_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Get attendance error:", error);
        return new Response(JSON.stringify({ error: "Failed to fetch attendance", attendance: [] }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      return new Response(JSON.stringify({ attendance: attendance || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Error in member-auth:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});