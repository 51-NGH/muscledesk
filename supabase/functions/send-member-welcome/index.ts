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

    const { data: member, error: memberError } = await supabaseAdmin
      .from("members")
      .select(`
        id, full_name, email, member_id, gym_id,
        gyms!inner(name, logo_url, phone, address, plan)
      `)
      .eq("id", member_id)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: "Member not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const gymData = member.gyms as unknown as { name: string; logo_url: string | null; phone: string | null; address: string | null; plan: string };
    const gym = Array.isArray(gymData) ? gymData[0] : gymData;

    if (gym.plan === "lite") {
      console.log(`Skipping welcome email for member ${member_id} - gym is on Lite plan`);
      return new Response(JSON.stringify({ 
        success: true, message: "Email skipped - gym is on Lite plan", skipped: true
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!member.email) {
      return new Response(JSON.stringify({ error: "Member has no email address" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const portalToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: updateError } = await supabaseAdmin
      .from("members")
      .update({ portal_token: portalToken, portal_token_expires_at: expiresAt.toISOString() })
      .eq("id", member_id);

    if (updateError) {
      console.error("Failed to set portal token:", updateError);
      return new Response(JSON.stringify({ error: "Failed to generate setup link" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const memberPortalUrl = "https://members.muscledesk.online";
    const setupLink = `${memberPortalUrl}/member/setup-pin?token=${portalToken}`;

    // Professional HTML email template with better deliverability
    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to ${gym.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #18181b; padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                Welcome to ${gym.name}
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 20px; color: #334155; font-size: 16px; line-height: 1.6;">
                Hi <strong>${member.full_name.split(' ')[0]}</strong>,
              </p>
              
              <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.6;">
                You've been registered as a member. Here's your Member ID:
              </p>
              
              <!-- Member ID Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; text-align: center;">
                    <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Member ID</p>
                    <p style="margin: 0; color: #18181b; font-size: 28px; font-weight: 700; font-family: 'Courier New', monospace;">${member.member_id}</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 24px; color: #334155; font-size: 16px; line-height: 1.6;">
                Set up your 4-digit PIN to access your Member Portal where you can view your QR code for check-ins, attendance history, and payments.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${setupLink}" style="display: inline-block; background-color: #18181b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Set Up My PIN
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Warning -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #fef3c7; border-left: 3px solid #f59e0b; padding: 12px 16px; border-radius: 0 6px 6px 0;">
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      This link expires in 7 days. Contact your gym if it expires.
                    </p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.6;">
                If the button doesn't work, copy this link:<br>
                <a href="${setupLink}" style="color: #3b82f6; word-break: break-all;">${setupLink}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px; color: #475569; font-size: 14px; font-weight: 500;">${gym.name}</p>
              ${gym.phone ? `<p style="margin: 0; color: #64748b; font-size: 13px;">${gym.phone}</p>` : ''}
              ${gym.address ? `<p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px;">${gym.address}</p>` : ''}
            </td>
          </tr>
        </table>
        
        <!-- Powered by -->
        <p style="margin: 16px 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
          Powered by MuscleDesk
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "MuscleDesk <noreply@muscledesk.in>",
        to: [member.email],
        subject: `Welcome to ${gym.name} - Set Up Your Portal Access`,
        html: emailHtml,
        headers: {
          "X-Entity-Ref-ID": member_id,
        },
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

    return new Response(JSON.stringify({ success: true, message: "Welcome email sent successfully" }), {
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
