const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MSG91_SMS_URL = 'https://control.msg91.com/api/v5/flow/';

type ReminderCategory = 'expiring_soon' | 'recently_expired' | 'inactive';

interface ReminderRequest {
  gym_id: string;
  member_ids: string[];
  category: ReminderCategory;
  custom_message?: string;
}

// MSG91 Flow IDs for each category - these need to be set up in MSG91 dashboard
// For now we use the SMS API with custom messages
const CATEGORY_TEMPLATES: Record<ReminderCategory, {
  getMessage: (name: string, days: number, gymName: string) => string;
}> = {
  expiring_soon: {
    getMessage: (name, days, gymName) =>
      days === 0
        ? `Hi ${name}, your ${gymName} membership expires today! Renew now to avoid interruption. Visit your gym or call us.`
        : `Hi ${name}, your ${gymName} membership expires in ${days} days. Renew now to continue your fitness journey!`,
  },
  recently_expired: {
    getMessage: (name, days, gymName) =>
      `Hi ${name}, your ${gymName} membership expired ${Math.abs(days)} days ago. Renew today and get back on track!`,
  },
  inactive: {
    getMessage: (name, _days, gymName) =>
      `Hi ${name}, we miss you at ${gymName}! Your membership has lapsed. Come back with a special renewal offer - contact us today!`,
  },
};

function normalizeIndianPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s+\-()]/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    const local = cleaned.substring(2);
    if (/^[6-9]\d{9}$/.test(local)) return cleaned;
    return null;
  }
  if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
    return '91' + cleaned;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const msg91AuthKey = Deno.env.get('MSG91_AUTH_KEY');

  if (!msg91AuthKey) {
    return new Response(JSON.stringify({ error: 'MSG91 credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: ReminderRequest = await req.json();
    const { gym_id, member_ids, category, custom_message } = body;

    if (!gym_id || !member_ids?.length || !category) {
      return new Response(JSON.stringify({ error: 'gym_id, member_ids, and category required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify gym access
    const { data: hasAccess } = await supabaseAuth.rpc('has_gym_access', {
      _user_id: user.id, _gym_id: gym_id,
    });
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get gym name
    const { data: gymData } = await supabaseAuth
      .from('gyms')
      .select('name')
      .eq('id', gym_id)
      .single();
    const gymName = gymData?.name || 'your gym';

    // Fetch members
    const { data: members, error: membersErr } = await supabaseAuth
      .from('members')
      .select('id, full_name, phone, expiry_date')
      .in('id', member_ids)
      .eq('gym_id', gym_id)
      .is('deleted_at', null);

    if (membersErr || !members?.length) {
      return new Response(JSON.stringify({ error: 'No valid members found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const templateConfig = CATEGORY_TEMPLATES[category];
    const today = new Date();
    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const member of members) {
      const phone = normalizeIndianPhone(member.phone || '');
      if (!phone) {
        skipped++;
        errors.push(`${member.full_name}: invalid phone`);
        continue;
      }

      const expiryDate = new Date(member.expiry_date);
      const daysRemaining = Math.round((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const firstName = member.full_name.split(' ')[0];
      const message = custom_message || templateConfig.getMessage(firstName, daysRemaining, gymName);

      // Send SMS via MSG91 Send SMS API
      try {
        const smsRes = await fetch('https://control.msg91.com/api/v5/flow/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'authkey': msg91AuthKey,
          },
          body: JSON.stringify({
            flow_id: Deno.env.get('MSG91_SMS_FLOW_ID') || '',
            sender: Deno.env.get('MSG91_SENDER_ID') || 'MUSKDK',
            mobiles: phone,
            VAR1: firstName,
            VAR2: gymName,
            VAR3: member.expiry_date,
          }),
        });

        const smsBody = await smsRes.json();

        // Log the attempt
        await supabaseAuth.from('whatsapp_logs').insert({
          gym_id,
          member_id: member.id,
          template_name: `sms_${category}`,
          phone,
          payload: { message, category, flow_response: smsBody },
          response_status: smsRes.status,
          response_body: smsBody,
          status: smsRes.ok ? 'sent' : 'failed',
          error_message: smsRes.ok ? null : JSON.stringify(smsBody),
        });

        if (smsRes.ok) {
          sent++;
        } else {
          failed++;
          errors.push(`${member.full_name}: SMS failed`);
        }
      } catch (err) {
        failed++;
        errors.push(`${member.full_name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sent,
      failed,
      skipped,
      total: members.length,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('send-sms-reminder error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
