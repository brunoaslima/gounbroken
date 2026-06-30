import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': 'https://gounbroken.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const secret = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('x-cron-secret')
  if (!secret || provided !== secret) {
    return new Response('Unauthorized', { status: 401, headers: CORS })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await supabase.rpc('auto_transition_competition_statuses')

  if (error) {
    console.error('auto_transition_competition_statuses error:', error.message)
    return new Response(error.message, { status: 500, headers: CORS })
  }

  return new Response('ok', { status: 200, headers: CORS })
})
