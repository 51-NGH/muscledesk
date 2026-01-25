import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FingerprintAttendanceRequest {
  device_api_key: string;
  fingerprint_uid: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { device_api_key, fingerprint_uid }: FingerprintAttendanceRequest = await req.json();

    // Validate required fields
    if (!device_api_key || !fingerprint_uid) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing device_api_key or fingerprint_uid" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Call the RPC function that handles all the logic
    const { data, error } = await supabase.rpc("ingest_fingerprint_attendance", {
      _api_key: device_api_key,
      _fingerprint_uid: fingerprint_uid
    });

    if (error) {
      console.error("Fingerprint attendance error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return the result from the RPC function
    const statusCode = data.success ? 200 : 
      data.error === "Invalid or inactive device" ? 401 :
      data.error === "Fingerprint not registered" ? 404 :
      data.error === "Member is blocked" || data.error === "Membership expired" ? 403 :
      data.error === "Already checked in today" ? 409 : 400;

    // If successful, send push notification
    if (data.success) {
      try {
        // Get member_id from fingerprint template for push notification
        const { data: template } = await supabase
          .from("fingerprint_templates")
          .select("member_id")
          .eq("fingerprint_uid", fingerprint_uid)
          .single();

        if (template) {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              member_id: template.member_id,
              notification_type: 'check_in',
              title: '✅ Check-in Confirmed!',
              body: `Welcome back, ${data.member_name}! Visit #${data.total_visits}`,
              data: { url: '/member/attendance' }
            }),
          });
        }
      } catch (pushError) {
        console.error('Push notification failed:', pushError);
        // Don't fail the attendance for push notification errors
      }
    }

    return new Response(
      JSON.stringify(data),
      { status: statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Fingerprint attendance error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
