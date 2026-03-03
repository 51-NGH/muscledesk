import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Follow-up schedule: attempt → days to wait
const FOLLOW_UP_SCHEDULE: Record<number, number> = {
  0: 1,  // 1st follow-up after 1 day
  1: 2,  // 2nd after 2 more days
  2: 3,  // 3rd after 3 more days
  3: 5,  // 4th after 5 more days
  4: 7,  // 5th after 7 more days
};
const MAX_FOLLOW_UPS = 5;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Fetch all overdue leads
    const { data: overdueLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id, gym_id, full_name, phone, follow_up_count, status, temperature')
      .is('deleted_at', null)
      .not('status', 'in', '("converted","not_interested")')
      .lte('next_follow_up_at', new Date().toISOString())
      .order('next_follow_up_at', { ascending: true })
      .limit(500);

    if (leadsError) throw leadsError;

    let processed = 0;
    let markedCold = 0;

    for (const lead of overdueLeads || []) {
      const newCount = lead.follow_up_count + 1;

      if (newCount > MAX_FOLLOW_UPS) {
        // Mark as cold after max attempts
        await supabase
          .from('leads')
          .update({
            temperature: 'cold',
            next_follow_up_at: null,
          })
          .eq('id', lead.id);

        await supabase.from('lead_activities').insert({
          gym_id: lead.gym_id,
          lead_id: lead.id,
          activity_type: 'status_change',
          description: `Auto-marked as cold after ${MAX_FOLLOW_UPS} follow-up attempts`,
        });

        markedCold++;
        continue;
      }

      // Calculate next follow-up
      const daysToAdd = FOLLOW_UP_SCHEDULE[lead.follow_up_count] || 7;
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + daysToAdd);

      // Update lead
      await supabase
        .from('leads')
        .update({
          follow_up_count: newCount,
          last_contacted_at: new Date().toISOString(),
          next_follow_up_at: nextFollowUp.toISOString(),
          status: lead.status === 'new' ? 'contacted' : lead.status,
        })
        .eq('id', lead.id);

      // Log activity
      await supabase.from('lead_activities').insert({
        gym_id: lead.gym_id,
        lead_id: lead.id,
        activity_type: 'call',
        description: `Follow-up #${newCount} scheduled. Next: ${nextFollowUp.toLocaleDateString()}`,
      });

      // Try WhatsApp for Pro gyms
      try {
        const { data: gym } = await supabase
          .from('gyms')
          .select('plan')
          .eq('id', lead.gym_id)
          .single();

        if (gym?.plan === 'pro') {
          // Pro gyms get auto WhatsApp - call send-whatsapp if template exists
          // For now, log the intent
          await supabase.from('lead_activities').insert({
            gym_id: lead.gym_id,
            lead_id: lead.id,
            activity_type: 'whatsapp',
            description: `Auto WhatsApp follow-up #${newCount} triggered (Pro plan)`,
          });
        }
      } catch {
        // WhatsApp is optional, don't fail the loop
      }

      processed++;
    }

    return new Response(JSON.stringify({
      success: true,
      processed,
      marked_cold: markedCold,
      total_overdue: overdueLeads?.length || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('process-lead-followups error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
