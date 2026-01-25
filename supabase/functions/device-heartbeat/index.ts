import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HeartbeatRequest {
  device_api_key: string;
  device_ip?: string;
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

    const { device_api_key, device_ip }: HeartbeatRequest = await req.json();

    // Validate required fields
    if (!device_api_key) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing device_api_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find and update device
    const { data: device, error } = await supabase
      .from("fingerprint_devices")
      .update({
        last_seen_at: new Date().toISOString(),
        device_ip: device_ip || undefined
      })
      .eq("api_key", device_api_key)
      .select("id, device_name, is_active, gym_id")
      .single();

    if (error || !device) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid device API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If device is deactivated, inform the device
    if (!device.is_active) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Device is deactivated",
          status: "inactive"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "active",
        device_id: device.id,
        device_name: device.device_name,
        server_time: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Heartbeat error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
