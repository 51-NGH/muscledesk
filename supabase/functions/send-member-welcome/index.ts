import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  member_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { member_id }: WelcomeEmailRequest = await req.json();

    if (!member_id) {
      return new Response(JSON.stringify({ error: "member_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get member with gym info (including gym plan)
    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select(`
        id,
        full_name,
        email,
        member_id,
        gym_id,
        gyms!inner(name, logo_url, phone, address, plan)
      `)
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // gyms is an array from the join, take the first element
    const gymData = member.gyms as unknown as { name: string; logo_url: string | null; phone: string | null; address: string | null; plan: string };
    const gym = Array.isArray(gymData) ? gymData[0] : gymData;

    // Check if gym is on Lite plan - skip sending email for Lite gyms
    if (gym.plan === "lite") {
      console.log(`Skipping welcome email for member ${member_id} - gym is on Lite plan`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Email skipped - gym is on Lite plan (Member Portal not available)",
        skipped: true
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!member.email) {
      return new Response(JSON.stringify({ error: "Member has no email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Generate portal token (expires in 7 days)
    const portalToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Update member with portal token
    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({
        portal_token: portalToken,
        portal_token_expires_at: expiresAt.toISOString()
      })
      .eq("id", member_id);

    if (updateError) {
      console.error("Failed to set portal token:", updateError);
      return new Response(JSON.stringify({ error: "Failed to generate setup link" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Use the member portal domain
    const memberPortalUrl = "https://members.muscledesk.online";
    const setupLink = `${memberPortalUrl}/member/setup-pin?token=${portalToken}`;

    // Send welcome email using Resend REST API
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ${gym.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 40px 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                💪 MuscleDesk
              </h1>
              <p style="margin: 8px 0 0; color: #a1a1aa; font-size: 14px;">
                Gym Management System
              </p>
            </td>
          </tr>
          
          <!-- Gym Banner -->
          <tr>
            <td style="background-color: #f97316; padding: 20px 40px; text-align: center;">
              <h2 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">
                ${gym.name}
              </h2>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h3 style="margin: 0 0 16px; color: #18181b; font-size: 24px; font-weight: 600;">
                Welcome, ${member.full_name}! 🎉
              </h3>
              
              <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                You've been registered as a member at <strong>${gym.name}</strong>. Your Member ID is:
              </p>
              
              <div style="background-color: #f4f4f5; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0; color: #71717a; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                  Member ID
                </p>
                <p style="margin: 8px 0 0; color: #18181b; font-size: 28px; font-weight: 700; font-family: monospace;">
                  ${member.member_id}
                </p>
              </div>
              
              <p style="margin: 0 0 24px; color: #52525b; font-size: 16px; line-height: 1.6;">
                To access your Member Portal and view your attendance, payments, and QR code, please set up your 4-digit PIN:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0 32px;">
                    <a href="${setupLink}" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.4);">
                      Set Up My PIN →
                    </a>
                  </td>
                </tr>
              </table>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>⚠️ Important:</strong> This setup link expires in 7 days. If it expires, contact your gym for a new link.
                </p>
              </div>
              
              <p style="margin: 0; color: #71717a; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${setupLink}" style="color: #f97316; word-break: break-all;">${setupLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f4f5; padding: 24px 40px; text-align: center;">
              <p style="margin: 0 0 8px; color: #52525b; font-size: 14px;">
                ${gym.name}${gym.phone ? ` • ${gym.phone}` : ''}
              </p>
              ${gym.address ? `<p style="margin: 0; color: #71717a; font-size: 12px;">${gym.address}</p>` : ''}
              <p style="margin: 16px 0 0; color: #a1a1aa; font-size: 12px;">
                Powered by MuscleDesk
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "MuscleDesk <noreply@muscledesk.in>",
        to: [member.email],
        subject: `Welcome to ${gym.name} - Set Up Your Member Portal`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    
    if (!emailResponse.ok) {
      console.error("Resend API error:", emailResult);
      return new Response(JSON.stringify({ error: "Failed to send email", details: emailResult }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("Welcome email sent:", emailResult);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Welcome email sent successfully"
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Error in send-member-welcome:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});