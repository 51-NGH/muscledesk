import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AttendanceRequest {
  qr_token: string;
  gym_id: string;
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

    const { qr_token, gym_id }: AttendanceRequest = await req.json();

    if (!qr_token || !gym_id) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing qr_token or gym_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find member by QR token
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("*")
      .eq("qr_token", qr_token)
      .eq("gym_id", gym_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (memberError || !member) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid QR code" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if member is blocked
    if (member.is_blocked) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Member is blocked",
          reason: member.block_reason || "Contact gym staff",
          member_name: member.full_name
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if membership is expired
    const today = new Date().toISOString().split("T")[0];
    if (member.expiry_date < today) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Membership expired",
          expiry_date: member.expiry_date,
          member_name: member.full_name
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for duplicate attendance (within 24 hours)
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("id, check_in_at")
      .eq("member_id", member.id)
      .eq("gym_id", gym_id)
      .gte("check_in_at", yesterday.toISOString())
      .order("check_in_at", { ascending: false })
      .limit(1);

    if (existingAttendance && existingAttendance.length > 0) {
      const lastCheckIn = new Date(existingAttendance[0].check_in_at);
      const hoursAgo = Math.floor((Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Attendance already marked",
          message: `Last check-in was ${hoursAgo} hours ago`,
          member_name: member.full_name,
          last_check_in: existingAttendance[0].check_in_at
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record attendance
    const { data: attendance, error: attendanceError } = await supabase
      .from("attendance")
      .insert([{
        gym_id: gym_id,
        member_id: member.id,
        source: "qr",
      }])
      .select()
      .single();

    if (attendanceError) {
      console.error("Attendance insert error:", attendanceError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to record attendance" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Attendance recorded successfully",
        member_name: member.full_name,
        member_id: member.member_id,
        check_in_at: attendance.check_in_at,
        total_visits: member.total_visits + 1
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("QR attendance error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
