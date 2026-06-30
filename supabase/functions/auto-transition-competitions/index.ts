import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { error } = await supabase.rpc('auto_transition_competition_statuses')

  if (error) {
    console.error('auto_transition_competition_statuses error:', error.message)
    return new Response(error.message, { status: 500 })
  }

  return new Response('ok', { status: 200 })
})
