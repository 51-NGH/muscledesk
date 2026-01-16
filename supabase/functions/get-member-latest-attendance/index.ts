import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  member_id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { member_id }: RequestBody = await req.json();

    if (!member_id) {
      return new Response(
        JSON.stringify({ error: "member_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the most recent attendance for this member (today only)
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from("attendance")
      .select("id, check_in_at")
      .eq("member_id", member_id)
      .gte("check_in_at", `${today}T00:00:00`)
      .order("check_in_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is fine
      console.error("Error fetching attendance:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch attendance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        attendance_id: data?.id || null,
        check_in_at: data?.check_in_at || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
