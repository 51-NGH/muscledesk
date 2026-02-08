import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date();
    const reminderDays = [7, 3, 1, -1]; // -1 = expired yesterday
    
    let totalPushSent = 0;
    let totalWhatsAppSent = 0;

    for (const days of reminderDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Fetch all members expiring/expired on target date (no push_subscriptions join requirement)
      const { data: members, error } = await supabase
        .from('members')
        .select(`
          id,
          full_name,
          phone,
          expiry_date,
          gym_id,
          push_subscriptions(id, is_active)
        `)
        .eq('expiry_date', targetDateStr)
        .is('deleted_at', null);

      if (error) {
        console.error(`Error fetching members for day ${days}:`, error);
        continue;
      }

      if (!members || members.length === 0) continue;

      for (const member of members) {
        const isExpired = days < 0;
        const templateName = 'membership_expiry_reminder'; // use same template for both (no membership_expired template yet)

        // Push notification (only for members with active subscriptions, only for reminders not expired)
        if (!isExpired) {
          const activeSubs = (member.push_subscriptions || []).filter(
            (s: { is_active: boolean }) => s.is_active
          );
          if (activeSubs.length > 0) {
            const urgency = days === 1 ? '⚠️ URGENT: ' : days === 3 ? '⏰ ' : '📅 ';
            const dayText = days === 1 ? 'tomorrow' : `in ${days} days`;
            try {
              await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseKey}`,
                },
                body: JSON.stringify({
                  member_id: member.id,
                  notification_type: 'expiry_reminder',
                  title: `${urgency}Membership Expiring ${dayText}`,
                  body: `Hey ${member.full_name.split(' ')[0]}, your gym membership expires ${dayText}. Renew now to keep your access!`,
                  data: { url: '/member/payments', days_remaining: days.toString() },
                }),
              });
              totalPushSent++;
            } catch (pushError) {
              console.error('Push failed for member:', member.id, pushError);
            }
          }
        }

        // WhatsApp message (plan check happens inside send-whatsapp)
        try {
          const waRes = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({
              member_id: member.id,
              template_name: templateName,
              gym_id: member.gym_id,
            }),
          });
          const waResult = await waRes.json();
          if (waResult.status === 'sent') totalWhatsAppSent++;
        } catch (waError) {
          console.error('WhatsApp failed for member:', member.id, waError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${totalPushSent} push + ${totalWhatsAppSent} WhatsApp reminders`,
        push_sent: totalPushSent,
        whatsapp_sent: totalWhatsAppSent,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Expiry reminder error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
