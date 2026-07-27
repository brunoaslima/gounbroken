import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Explicit whitelist (never a wildcard) — production domain + local dev server,
// so `npm run dev` can exercise the function without opening it up to any origin.
const ALLOWED_ORIGINS = new Set([
  "https://gounbroken.app",
  "http://localhost:5173",
])

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin")
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://gounbroken.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  }
}

const MODEL = "claude-sonnet-5"
const VALID_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BASE64_LENGTH = 9_500_000 // ~7MB decoded
const DAILY_LIMIT = 20

const SYSTEM_PROMPT = `Você é assistente de um coach de CrossFit. Leia o treino na foto enviada e retorne SOMENTE JSON válido, sem markdown, sem explicação.`

const USER_PROMPT = `Leia esta foto de um treino (quadro branco, papel ou app) e estruture o conteúdo como um array de seções.

Se a imagem NÃO contiver um treino legível, retorne exatamente: {"error": "not_a_workout"}

Caso contrário, retorne exatamente este formato JSON (array de seções):
[
  {
    "section_type": "warm_up",
    "label": "Warm-up",
    "position": 0,
    "format_type": null,
    "format_config": null,
    "notes": null,
    "exercises": [
      {
        "movement_name": "Row (easy)",
        "sets": null,
        "reps": null,
        "reps_label": null,
        "duration_seconds": 300,
        "load_kg": null,
        "load_kg_to": null,
        "load_pct_1rm": null,
        "load_pct_1rm_to": null,
        "rpe": null,
        "rest_seconds": null,
        "notes": null,
        "position": 0
      }
    ]
  }
]

section_type: warm_up | mobility | strength | skill | conditioning | wod | accessories | cool_down
format_type: null | AMRAP | FOR_TIME | EMOM | E90S | TABATA | ROUNDS | INTERVAL
format_config para AMRAP: {"time_minutes": 12}
format_config para FOR_TIME: {"rounds": 5, "time_cap_minutes": 20}
format_config para EMOM: {"time_minutes": 20, "interval_seconds": 60}
Mantenha os nomes dos movimentos como aparecem na foto (português ou inglês). Não invente exercícios, sets, reps ou cargas que não estejam legíveis na imagem — deixe null quando não tiver certeza.`

function isFiniteNumberOrNull(v: unknown) {
  return v === null || v === undefined || typeof v === "number"
}

function isStringOrNull(v: unknown) {
  return v === null || v === undefined || typeof v === "string"
}

// Validates the shape of the parsed Claude response field-by-field, not just
// that it's an array — a "valid-looking" array with wrong field types would
// otherwise reach the client and corrupt the review UI.
function validateSections(parsed: unknown): parsed is Array<Record<string, unknown>> {
  if (!Array.isArray(parsed)) return false
  return parsed.every(section => {
    if (typeof section !== "object" || section === null) return false
    const s = section as Record<string, unknown>
    if (typeof s.section_type !== "string" || typeof s.label !== "string") return false
    if (typeof s.position !== "number") return false
    if (!isStringOrNull(s.format_type) || !isStringOrNull(s.notes)) return false
    if (!Array.isArray(s.exercises)) return false
    return s.exercises.every(ex => {
      if (typeof ex !== "object" || ex === null) return false
      const e = ex as Record<string, unknown>
      if (typeof e.movement_name !== "string") return false
      if (!isFiniteNumberOrNull(e.sets) || !isFiniteNumberOrNull(e.reps)) return false
      if (!isFiniteNumberOrNull(e.duration_seconds) || !isFiniteNumberOrNull(e.load_kg)) return false
      if (!isFiniteNumberOrNull(e.load_pct_1rm) || !isFiniteNumberOrNull(e.rpe)) return false
      if (!isFiniteNumberOrNull(e.rest_seconds) || !isFiniteNumberOrNull(e.position)) return false
      if (!isStringOrNull(e.reps_label) && !isStringOrNull(e.notes)) return false
      return true
    })
  })
}

serve(async (req: Request) => {
  const cors = corsHeaders(req)
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const { image_base64, media_type } = await req.json()

    if (typeof image_base64 !== "string" || !image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 é obrigatório" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    if (typeof media_type !== "string" || !VALID_MEDIA_TYPES.has(media_type)) {
      return new Response(JSON.stringify({ error: "media_type inválido" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    if (image_base64.length > MAX_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: "Imagem muito grande" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const authHeader = req.headers.get("Authorization")
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: cors })

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: cors })

    // Role check + rate limiting via service role (bypasses RLS on ai_usage_log)
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("roles")
      .eq("user_id", user.id)
      .single()
    const callerRoles: string[] = callerProfile?.roles ?? []
    if (!callerRoles.some(r => ["ai", "admin"].includes(r))) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: cors })
    }

    // Rate limiting — 20 scans por dia por usuário
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: dayCount } = await adminClient
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("function_name", "scan-workout-photo")
      .eq("triggered_by", user.id)
      .gte("created_at", dayAgo)
    if ((dayCount ?? 0) >= DAILY_LIMIT) {
      return new Response(JSON.stringify({ error: `Rate limit exceeded — máximo ${DAILY_LIMIT} scans por dia` }), { status: 429, headers: cors })
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type, data: image_base64 } },
            { type: "text", text: USER_PROMPT },
          ],
        }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error("Claude error:", err)
      throw new Error(`Claude API: ${claudeRes.status}`)
    }

    const claudeData = await claudeRes.json()

    // Log usage immediately after a successful Claude call — before parsing/
    // validating the response — so a call that fails to parse (garbled JSON)
    // or gets rejected as not-a-workout still counts against cost tracking
    // and the daily rate limit. Otherwise a user could send junk photos in a
    // loop for free (Claude gets billed either way).
    const inputTokens  = claudeData.usage?.input_tokens  ?? 0
    const outputTokens = claudeData.usage?.output_tokens ?? 0
    const costUsd      = (inputTokens * 0.000003) + (outputTokens * 0.000015)
    adminClient.from("ai_usage_log").insert({
      function_name:  "scan-workout-photo",
      triggered_by:   user.id,
      athlete_id:     null,
      model:          MODEL,
      input_tokens:   inputTokens,
      output_tokens:  outputTokens,
      cost_usd:       costUsd,
    }).then(() => {/* ignore */})

    // Don't assume content[0] is the text block — extended-thinking-capable
    // models can prepend a "thinking" block before the actual text response
    const textBlock = (claudeData.content as Array<{ type: string; text?: string }> | undefined)
      ?.find(c => c.type === "text")
    if (!textBlock?.text) {
      console.error("No text block in Claude response:", JSON.stringify(claudeData.content))
      return new Response(JSON.stringify({ error: "Não foi possível ler o treino nesta foto." }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      })
    }
    const raw = textBlock.text.trim()
    const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()

    let parsed: unknown
    try {
      parsed = JSON.parse(jsonText)
    } catch (e) {
      console.error("Failed to parse Claude response:", e)
      return new Response(JSON.stringify({ error: "Não foi possível ler o treino nesta foto." }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    if (
      typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) &&
      (parsed as Record<string, unknown>).error === "not_a_workout"
    ) {
      return new Response(JSON.stringify({ error: "not_a_workout" }), {
        status: 422, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    if (!validateSections(parsed)) {
      console.error("Invalid sections shape from Claude:", jsonText)
      return new Response(JSON.stringify({ error: "Não foi possível ler o treino nesta foto." }), {
        status: 502, headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    return new Response(
      JSON.stringify({ sections: parsed }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Edge function error:", err)
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    )
  }
})
