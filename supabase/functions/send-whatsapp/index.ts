import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MSG91 WhatsApp API endpoint
const MSG91_API_URL = 'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/';

type TemplateConfig = {
  providerName: string;
  languageCode: string;
  variables: string[];
};

// Internal template names mapped to provider template settings
const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  welcome_message: {
    providerName: 'welcome_message',
    languageCode: 'en',
    variables: ['member_name', 'gym_name'],
  },
  payment_received: {
    providerName: 'payment_received',
    languageCode: 'en',
    variables: ['member_name', 'amount', 'expiry_date', 'gym_name'],
  },
  membership_expiry_reminder: {
    providerName: 'membership_expiry_reminder',
    languageCode: 'en',
    variables: ['member_name', 'expiry_date', 'gym_name'],
  },
};

// Plan access rules
const PLAN_ALLOWED_TEMPLATES: Record<string, string[]> = {
  lite: [],
  standard: ['membership_expiry_reminder'],
  pro: ['welcome_message', 'payment_received', 'membership_expiry_reminder'],
};

const PLAN_RATE_LIMITS: Record<string, number> = {
  standard: 50,
  pro: 500,
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

function buildMsg91Payload(
  integratedNumber: string,
  templateName: string,
  variables: Record<string, string>,
  phone: string
): object {
  const templateConfig = TEMPLATE_CONFIGS[templateName];
  if (!templateConfig) throw new Error(`Unknown template: ${templateName}`);

  const components: Record<string, { type: string; value: string }> = {};
  templateConfig.variables.forEach((name, index) => {
    components[`body_${index + 1}`] = {
      type: 'text',
      value: variables[name] || '',
    };
  });

  return {
    integrated_number: integratedNumber,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: templateConfig.providerName,
        language: {
          code: templateConfig.languageCode,
          policy: 'deterministic',
        },
        namespace: null,
        to_and_components: [
          {
            to: [phone],
            components,
          },
        ],
      },
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const msg91AuthKey = Deno.env.get('MSG91_AUTH_KEY');
  const integratedNumber = Deno.env.get('MSG91_INTEGRATED_NUMBER');
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { member_id, template_name, gym_id, custom_variables } = await req.json();

    if (!member_id || !template_name) {
      return new Response(JSON.stringify({ success: false, error: 'member_id and template_name required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!TEMPLATE_CONFIGS[template_name]) {
      return new Response(JSON.stringify({ success: false, error: `Unknown template: ${template_name}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch member + gym
    const { data: member, error: memberErr } = await supabase
      .from('members')
      .select('id, full_name, phone, expiry_date, gym_id, gyms!inner(name, plan)')
      .eq('id', member_id)
      .is('deleted_at', null)
      .single();

    if (memberErr || !member) {
      return new Response(JSON.stringify({ success: false, status: 'skipped', error: 'Member not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gymData = member.gyms as unknown as { name: string; plan: string };
    const gym = Array.isArray(gymData) ? gymData[0] : gymData;
    const effectiveGymId = gym_id || member.gym_id;

    // Helper to log and return
    const logAndReturn = async (
      status: string,
      errorMessage: string | null,
      phone: string | null,
      payload: object | null,
      responseStatus: number | null,
      responseBody: object | null
    ) => {
      supabase.from('whatsapp_logs').insert({
        gym_id: effectiveGymId,
        member_id: member.id,
        template_name,
        phone,
        payload,
        response_status: responseStatus,
        response_body: responseBody,
        status,
        error_message: errorMessage,
      }).then(() => {});

      return new Response(JSON.stringify({
        success: status === 'sent',
        status,
        error: errorMessage,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    };

    // Plan gate
    const allowedTemplates = PLAN_ALLOWED_TEMPLATES[gym.plan] || [];
    if (!allowedTemplates.includes(template_name)) {
      return logAndReturn('skipped', `Template '${template_name}' not allowed on ${gym.plan} plan`, null, null, null, null);
    }

    // Check MSG91 credentials
    if (!msg91AuthKey || !integratedNumber) {
      return logAndReturn('skipped', 'MSG91 credentials not configured', null, null, null, null);
    }

    // Phone normalization
    if (!member.phone) {
      return logAndReturn('skipped', 'Member has no phone number', null, null, null, null);
    }
    const normalizedPhone = normalizeIndianPhone(member.phone);
    if (!normalizedPhone) {
      return logAndReturn('skipped', `Invalid phone number: ${member.phone}`, member.phone, null, null, null);
    }

    // Rate limit check
    const rateLimit = PLAN_RATE_LIMITS[gym.plan] || 0;
    const { data: rateLimitData } = await supabase
      .from('whatsapp_rate_limits')
      .select('message_count')
      .eq('gym_id', effectiveGymId)
      .eq('date', new Date().toISOString().split('T')[0])
      .maybeSingle();

    const currentCount = rateLimitData?.message_count || 0;
    if (currentCount >= rateLimit) {
      return logAndReturn('skipped', `Daily rate limit (${rateLimit}) exceeded`, normalizedPhone, null, null, null);
    }

    // Build variables
    const variables: Record<string, string> = custom_variables || {
      member_name: member.full_name.split(' ')[0],
      gym_name: gym.name,
      expiry_date: member.expiry_date || '',
      amount: '',
    };

    // Build MSG91 payload
    const payload = buildMsg91Payload(integratedNumber, template_name, variables, normalizedPhone);

    // Call MSG91 API
    let apiResponse: Response;
    let apiBody: unknown;
    try {
      apiResponse = await fetch(MSG91_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authkey': msg91AuthKey,
        },
        body: JSON.stringify(payload),
      });
      apiBody = await apiResponse.json();
    } catch (networkErr) {
      return logAndReturn('failed', `Network error: ${networkErr instanceof Error ? networkErr.message : 'Unknown'}`, normalizedPhone, payload, null, null);
    }

    // Classify response
    if (apiResponse.ok) {
      // Upsert rate limit counter
      const today = new Date().toISOString().split('T')[0];
      await supabase.from('whatsapp_rate_limits').upsert(
        { gym_id: effectiveGymId, date: today, message_count: currentCount + 1 },
        { onConflict: 'gym_id,date' }
      );

      return logAndReturn('sent', null, normalizedPhone, payload, apiResponse.status, apiBody as object);
    } else {
      const errMsg = typeof apiBody === 'object' && apiBody !== null
        ? JSON.stringify(apiBody)
        : `HTTP ${apiResponse.status}`;
      return logAndReturn('failed', errMsg, normalizedPhone, payload, apiResponse.status, apiBody as object);
    }

  } catch (error: unknown) {
    console.error('send-whatsapp error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, status: 'failed', error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
