import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  member_id?: string;
  gym_id?: string;
  notification_type: 'check_in' | 'expiry_reminder' | 'new_class' | 'payment_confirmation' | 'general';
  title: string;
  body: string;
  data?: Record<string, string>;
}

async function sendWebPush(subscription: any, payload: any): Promise<boolean> {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!;
  
  // Convert VAPID keys from URL-safe base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Create JWT for VAPID
  const createVapidJwt = async (audience: string): Promise<string> => {
    const header = { alg: 'ES256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: audience,
      exp: now + 12 * 60 * 60, // 12 hours
      sub: 'mailto:nschadha99@gmail.com',
    };

    const base64url = (data: Uint8Array | string): string => {
      const str = typeof data === 'string' ? data : new TextDecoder().decode(data);
      return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    };

    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));
    const unsignedToken = `${headerB64}.${payloadB64}`;

    // Import private key
    const privateKeyBytes = urlBase64ToUint8Array(vapidPrivateKey);
    
    // Create the key from raw bytes (32 bytes for P-256 private key)
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      await createPkcs8FromRaw(privateKeyBytes),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    // Convert signature from DER to raw format
    const signatureB64 = base64url(new Uint8Array(signature));
    return `${unsignedToken}.${signatureB64}`;
  };

  // Helper to create PKCS8 from raw 32-byte key
  const createPkcs8FromRaw = async (rawKey: Uint8Array): Promise<ArrayBuffer> => {
    // PKCS#8 header for P-256
    const pkcs8Header = new Uint8Array([
      0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13,
      0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02,
      0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
      0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02,
      0x01, 0x01, 0x04, 0x20
    ]);
    
    const pkcs8Footer = new Uint8Array([
      0xa1, 0x44, 0x03, 0x42, 0x00
    ]);
    
    // We need the public key too - derive it or skip the footer
    const combined = new Uint8Array(pkcs8Header.length + rawKey.length);
    combined.set(pkcs8Header, 0);
    combined.set(rawKey, pkcs8Header.length);
    
    return combined.buffer;
  };

  try {
    const endpoint = new URL(subscription.endpoint);
    const audience = `${endpoint.protocol}//${endpoint.host}`;
    
    const jwt = await createVapidJwt(audience);
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
        'Urgency': 'high',
      },
      body: JSON.stringify(payload),
    });

    return response.ok;
  } catch (error) {
    console.error('Push send error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: PushPayload = await req.json();
    const { member_id, gym_id, notification_type, title, body, data } = payload;

    // Get subscriptions based on target
    let query = supabase
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (member_id) {
      query = query.eq('member_id', member_id);
    } else if (gym_id) {
      query = query.eq('gym_id', gym_id);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions found', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pushPayload = {
      title,
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {
        ...data,
        notification_type,
        url: data?.url || '/',
      },
    };

    let successCount = 0;
    const failedSubscriptions: string[] = [];

    for (const sub of subscriptions) {
      const subscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      const sent = await sendWebPush(subscription, pushPayload);
      
      if (sent) {
        successCount++;
      } else {
        failedSubscriptions.push(sub.id);
      }

      // Log the notification
      await supabase.from('notification_logs').insert({
        member_id: sub.member_id,
        gym_id: sub.gym_id,
        notification_type,
        title,
        body,
        status: sent ? 'sent' : 'failed',
      });
    }

    // Deactivate failed subscriptions
    if (failedSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', failedSubscriptions);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedSubscriptions.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Push notification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
