import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(redirectHtml('error', `Google denied access: ${error}`), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (!code || !stateParam) {
      return new Response(redirectHtml('error', 'Missing code or state'), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    const { gym_id, user_id } = JSON.parse(atob(stateParam));

    // Exchange code for tokens
    const redirectUri = `${SUPABASE_URL}/functions/v1/gmail-oauth-callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json();
    if (tokens.error) {
      return new Response(redirectHtml('error', `Token error: ${tokens.error_description || tokens.error}`), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Get user email from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    // Store in database using service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const tokenExpiry = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('gmail_integrations')
      .upsert({
        gym_id,
        email_address: profile.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: tokenExpiry,
        is_active: true,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'gym_id' });

    if (dbError) {
      return new Response(redirectHtml('error', `Database error: ${dbError.message}`), {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response(redirectHtml('success', 'Gmail connected successfully!'), {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    return new Response(redirectHtml('error', error.message), {
      headers: { 'Content-Type': 'text/html' }
    });
  }
});

function redirectHtml(status: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><title>Gmail Connection</title></head>
<body>
<script>
  if (window.opener) {
    window.opener.postMessage({ type: 'gmail-oauth-${status === 'success' ? 'success' : 'error'}', message: '${message.replace(/'/g, "\\'")}' }, '*');
    window.close();
  } else {
    document.body.innerHTML = '<h2>${message}</h2><p>You can close this window.</p>';
  }
</script>
<h2>${message}</h2>
<p>You can close this window.</p>
</body>
</html>`;
}
