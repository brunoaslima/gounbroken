import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "https://gounbroken.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return new Response(JSON.stringify({ error: "Username e senha obrigatórios" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // Brute force protection — max 10 attempts per username, 20 per IP within 15 min
    const normalizedUsername = (username as string).toLowerCase().trim()
    const ip = req.headers.get("x-real-ip")
      || req.headers.get("x-forwarded-for")?.split(",")[0].trim()
      || "unknown"
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const tooManyAttempts = new Response(
      JSON.stringify({ error: "Muitas tentativas. Aguarde alguns minutos." }),
      { status: 429, headers: { ...cors, "Content-Type": "application/json" } }
    )

    const [{ count: usernameCount }, { count: ipCount }] = await Promise.all([
      adminClient.from("login_attempts").select("id", { count: "exact", head: true })
        .eq("username", normalizedUsername).gte("attempted_at", windowStart),
      adminClient.from("login_attempts").select("id", { count: "exact", head: true })
        .eq("ip", ip).gte("attempted_at", windowStart),
    ])

    if ((usernameCount ?? 0) >= 10 || (ipCount ?? 0) >= 20) return tooManyAttempts

    // Record attempt fire-and-forget
    adminClient.from("login_attempts").insert({ username: normalizedUsername, ip }).then(() => {/* ignore */})

    const { data: profile } = await adminClient
      .from("profiles")
      .select("user_id")
      .eq("username", normalizedUsername)
      .maybeSingle()

    // Normalize failures — same status/message regardless of reason (prevents user enumeration)
    const genericAuthError = new Response(JSON.stringify({ error: "Usuário ou senha inválidos" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    })

    if (!profile) return genericAuthError

    // Resolve email from auth.users — never returned to the client
    const { data: authUser } = await adminClient.auth.admin.getUserById(profile.user_id)

    if (!authUser?.user?.email) return genericAuthError

    // Sign in with email+password using anon client
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    )

    const { data: authData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: authUser.user.email,
      password,
    })

    if (signInError || !authData.session) return genericAuthError

    // Return only the session tokens — email never leaves the server
    return new Response(JSON.stringify({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at,
      token_type: authData.session.token_type,
    }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    })

  } catch {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
