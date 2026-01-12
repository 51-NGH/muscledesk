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

    // Get members expiring in 7, 3, and 1 days
    const today = new Date();
    const reminderDays = [7, 3, 1];
    
    let totalSent = 0;

    for (const days of reminderDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split('T')[0];

      // Find members with subscriptions expiring on target date
      const { data: expiringMembers, error } = await supabase
        .from('members')
        .select(`
          id,
          full_name,
          expiry_date,
          gym_id,
          push_subscriptions!inner(id, is_active)
        `)
        .eq('expiry_date', targetDateStr)
        .is('deleted_at', null)
        .eq('push_subscriptions.is_active', true);

      if (error) {
        console.error('Error fetching expiring members:', error);
        continue;
      }

      if (!expiringMembers || expiringMembers.length === 0) {
        continue;
      }

      // Send notifications
      for (const member of expiringMembers) {
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
              data: { 
                url: '/member/payments',
                days_remaining: days.toString()
              }
            }),
          });
          totalSent++;
        } catch (pushError) {
          console.error('Failed to send push for member:', member.id, pushError);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${totalSent} expiry reminders`,
        sent: totalSent
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
