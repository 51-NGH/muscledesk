import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401)
    const userId = claimsData.claims.sub

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: isSuper, error: roleErr } = await admin.rpc('is_super_admin', { _user_id: userId })
    if (roleErr || !isSuper) return json({ error: 'Forbidden' }, 403)

    // Query DB size, WAL size, connections via Supabase Management API
    const projectRef = (Deno.env.get('SUPABASE_URL') ?? '').match(/https:\/\/([^.]+)\./)?.[1]

    // Use direct SQL via service role - run pg queries through postgres-meta-style RPC isn't available;
    // call pg_database_size via a SQL function we can run through admin REST? Use rpc on a SECURITY DEFINER fn.
    const { data, error } = await admin.rpc('get_db_storage_stats')
    if (error) {
      return json({ error: error.message }, 500)
    }

    return json({ success: true, stats: data })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
