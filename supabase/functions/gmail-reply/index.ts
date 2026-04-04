import { corsHeaders } from '@supabase/supabase-js/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { lead_id, message, gym_id } = await req.json();
    if (!lead_id || !message || !gym_id) {
      return new Response(JSON.stringify({ error: 'lead_id, message, and gym_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get integration
    const { data: integration } = await supabase
      .from('gmail_integrations')
      .select('*')
      .eq('gym_id', gym_id)
      .eq('is_active', true)
      .single();

    if (!integration) {
      return new Response(JSON.stringify({ error: 'No active Gmail integration' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get lead
    const { data: lead } = await supabase
      .from('email_leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (!lead) {
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Refresh token if needed
    let accessToken = integration.access_token;
    if (new Date(integration.token_expiry) <= new Date()) {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: integration.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const tokens = await tokenRes.json();
      if (tokens.error) throw new Error('Token refresh failed');
      accessToken = tokens.access_token;

      await supabase
        .from('gmail_integrations')
        .update({
          access_token: accessToken,
          token_expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
        })
        .eq('id', integration.id);
    }

    // Build email
    const emailLines = [
      `To: ${lead.sender_email}`,
      `Subject: Re: ${lead.subject || ''}`,
      `In-Reply-To: ${lead.gmail_message_id}`,
      `References: ${lead.gmail_message_id}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      message,
    ];

    const rawEmail = btoa(emailLines.join('\r\n'))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send via Gmail API
    const sendRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: rawEmail,
          threadId: lead.gmail_thread_id,
        }),
      }
    );

    const sendData = await sendRes.json();
    if (sendData.error) {
      return new Response(JSON.stringify({ error: `Gmail send failed: ${sendData.error.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Log reply
    await supabase.from('email_reply_logs').insert({
      email_lead_id: lead_id,
      gym_id,
      message,
      sent_by: user.id,
      gmail_message_id: sendData.id,
    });

    // Update lead status
    await supabase
      .from('email_leads')
      .update({
        lead_status: lead.lead_status === 'new' ? 'contacted' : lead.lead_status,
        last_contacted_at: new Date().toISOString(),
      })
      .eq('id', lead_id);

    return new Response(JSON.stringify({ success: true, message_id: sendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
