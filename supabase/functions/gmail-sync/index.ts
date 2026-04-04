const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let gymIds: string[] = [];

    // If called with gym_id, sync that gym only; otherwise sync all active
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    
    if (body.gym_id) {
      gymIds = [body.gym_id];
    } else {
      const { data: integrations } = await supabase
        .from('gmail_integrations')
        .select('gym_id')
        .eq('is_active', true);
      gymIds = (integrations || []).map((i: any) => i.gym_id);
    }

    const results: any[] = [];

    for (const gymId of gymIds) {
      try {
        const result = await syncGymEmails(supabase, gymId);
        results.push({ gym_id: gymId, ...result });
      } catch (err) {
        results.push({ gym_id: gymId, error: err.message });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function refreshAccessToken(supabase: any, integration: any): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const tokens = await res.json();
  if (tokens.error) throw new Error(`Token refresh failed: ${tokens.error}`);

  const newExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

  await supabase
    .from('gmail_integrations')
    .update({
      access_token: tokens.access_token,
      token_expiry: newExpiry,
    })
    .eq('id', integration.id);

  return tokens.access_token;
}

async function syncGymEmails(supabase: any, gymId: string) {
  // Get integration
  const { data: integration, error } = await supabase
    .from('gmail_integrations')
    .select('*')
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .single();

  if (error || !integration) throw new Error('No active Gmail integration');

  // Refresh token if expired
  let accessToken = integration.access_token;
  if (new Date(integration.token_expiry) <= new Date()) {
    accessToken = await refreshAccessToken(supabase, integration);
  }

  // Get filters
  const { data: filters } = await supabase
    .from('lead_email_filters')
    .select('*')
    .eq('gym_id', gymId)
    .eq('is_active', true);

  const keywords = (filters || []).map((f: any) => ({
    keyword: f.keyword.toLowerCase(),
    location: f.filter_location,
  }));

  // Default keywords if none configured
  if (keywords.length === 0) {
    const defaults = ['membership', 'join gym', 'enquiry', 'price', 'fees', 'trial', 'fitness'];
    defaults.forEach(k => keywords.push({ keyword: k, location: 'both' }));
  }

  // Fetch recent emails (last 24h or since last sync)
  const sinceDate = integration.last_sync_at
    ? new Date(integration.last_sync_at)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);

  const afterTimestamp = Math.floor(sinceDate.getTime() / 1000);
  const query = `in:inbox after:${afterTimestamp}`;

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const listData = await listRes.json();
  if (listData.error) throw new Error(`Gmail API error: ${listData.error.message}`);

  const messages = listData.messages || [];
  let created = 0;
  let skipped = 0;

  for (const msg of messages) {
    // Check if already processed
    const { data: existing } = await supabase
      .from('email_leads')
      .select('id')
      .eq('gmail_message_id', msg.id)
      .maybeSingle();

    if (existing) { skipped++; continue; }

    // Fetch full message
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const msgData = await msgRes.json();

    const headers = msgData.payload?.headers || [];
    const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
    const from = headers.find((h: any) => h.name === 'From')?.value || '';

    // Parse sender
    const emailMatch = from.match(/<(.+?)>/);
    const senderEmail = emailMatch ? emailMatch[1] : from.trim();
    const senderName = from.replace(/<.+>/, '').trim().replace(/"/g, '') || senderEmail;

    // Skip own emails
    if (senderEmail === integration.email_address) { skipped++; continue; }

    // Get body text
    const body = extractBody(msgData.payload);

    // Check against filters
    const subjectLower = subject.toLowerCase();
    const bodyLower = body.toLowerCase();

    const matches = keywords.some((kw: any) => {
      if (kw.location === 'subject') return subjectLower.includes(kw.keyword);
      if (kw.location === 'body') return bodyLower.includes(kw.keyword);
      return subjectLower.includes(kw.keyword) || bodyLower.includes(kw.keyword);
    });

    if (!matches) { skipped++; continue; }

    // Create email lead
    const { error: insertError } = await supabase
      .from('email_leads')
      .insert({
        gym_id: gymId,
        sender_email: senderEmail,
        sender_name: senderName,
        subject,
        email_body: body.substring(0, 5000), // Limit body size
        gmail_thread_id: msgData.threadId,
        gmail_message_id: msg.id,
        lead_status: 'new',
        temperature: 'warm',
        source: 'email',
      });

    if (!insertError) created++;
  }

  // Update last_sync_at
  await supabase
    .from('gmail_integrations')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('id', integration.id);

  return { synced: created, skipped, total_messages: messages.length };
}

function extractBody(payload: any): string {
  if (!payload) return '';

  if (payload.body?.data) {
    try {
      return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
    } catch { return ''; }
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        try {
          return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } catch { continue; }
      }
    }
    // Fallback to HTML
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        try {
          const html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        } catch { continue; }
      }
    }
    // Recursive for multipart
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result) return result;
    }
  }

  return '';
}
