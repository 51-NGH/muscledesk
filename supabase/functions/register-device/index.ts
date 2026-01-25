import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RegisterDeviceRequest {
  gym_id: string;
  device_name: string;
  device_serial: string;
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get authorization header for user context
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.user.id;

    const { gym_id, device_name, device_serial, device_ip }: RegisterDeviceRequest = await req.json();

    // Validate required fields
    if (!gym_id || !device_name || !device_serial) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields: gym_id, device_name, device_serial" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has access to this gym
    const { data: hasAccess } = await supabase.rpc("has_gym_access", {
      _user_id: userId,
      _gym_id: gym_id
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ success: false, error: "Access denied to this gym" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if device serial already exists
    const { data: existingDevice } = await supabase
      .from("fingerprint_devices")
      .select("id")
      .eq("device_serial", device_serial)
      .single();

    if (existingDevice) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Device with this serial already registered" 
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Register the device
    const { data: device, error: insertError } = await supabase
      .from("fingerprint_devices")
      .insert({
        gym_id,
        device_name,
        device_serial,
        device_ip: device_ip || null,
        is_active: true,
        last_seen_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error("Device registration error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to register device" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Device registered successfully",
        device: {
          id: device.id,
          device_name: device.device_name,
          device_serial: device.device_serial,
          api_key: device.api_key, // Return API key only on registration
          gym_id: device.gym_id,
          is_active: device.is_active
        }
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Device registration error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
