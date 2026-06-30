import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const EXPERIENCE: Record<string, string> = {
  beginner: "iniciante (menos de 1 ano de treino)",
  intermediate: "intermediário (1-3 anos)",
  advanced: "avançado (3-5 anos)",
  athlete: "atleta competitivo (5+ anos)",
}

const INTENSITY: Record<string, string> = {
  leve:     "Leve — RPE 5-6, foco em técnica, cargas menores, descanso maior",
  moderada: "Moderada — RPE 7, esforço sólido, percentuais padrão",
  alta:     "Alta — RPE 8-9, próximo do limite, percentuais elevados",
  maxima:   "Máxima — RPE 9-10, dia de peak performance, máximo esforço",
}

const DAY_PT = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"]

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const { days, duration_minutes, focus, intensity } = await req.json()

    // Validate days array
    const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
    if (
      !Array.isArray(days) ||
      days.length === 0 ||
      days.length > 7 ||
      days.some((d: unknown) => typeof d !== "string" || !DATE_RE.test(d)) ||
      new Set(days).size !== days.length
    ) {
      return new Response(JSON.stringify({ error: "days deve ser um array de 1–7 datas únicas no formato YYYY-MM-DD" }), {
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

    // Rate limiting — 3 gerações por semana por usuário
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: weekCount } = await adminClient
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("function_name", "generate-workout")
      .eq("triggered_by", user.id)
      .gte("created_at", weekAgo)
    if ((weekCount ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded — máximo 3 gerações por semana" }), { status: 429, headers: cors })
    }

    const [profileRes, prsRes] = await Promise.all([
      supabase.from("profiles")
        .select("experience_level,body_weight_kg,main_goals")
        .eq("user_id", user.id)
        .single(),
      supabase.rpc("get_my_prs"),
    ])

    const profile = profileRes.data
    const prs: Array<{ movement_name: string; reps: number; max_weight: number }> = prsRes.data ?? []

    const prsText = prs.length > 0
      ? prs.map(p => `  - ${p.movement_name} ${p.reps}RM: ${p.max_weight}kg`).join("\n")
      : "  Nenhum PR registrado ainda"

    const focusText = focus.length > 0
      ? focus.join(", ")
      : "balanceado — analise os PRs e priorize pontos fracos"

    const daysText = (days as string[]).map(d => {
      const [y, m, day] = d.split("-").map(Number)
      const date = new Date(y, m - 1, day)
      return `${DAY_PT[date.getDay()]} (${d})`
    }).join(", ")

    const system = `Você é um coach expert em CrossFit e força e condicionamento. Retorne APENAS JSON válido, sem markdown, sem explicações.`

    const prompt = `Gere um plano de treino para os seguintes dias: ${daysText}

ATLETA:
- Nível: ${EXPERIENCE[profile?.experience_level ?? "intermediate"]}
- Peso: ${profile?.body_weight_kg ?? 70}kg
- Objetivos: ${profile?.main_goals?.join(", ") ?? "condicionamento geral"}
- Duração por sessão: ${duration_minutes} minutos
- Foco: ${focusText}
- Intensidade: ${INTENSITY[intensity] ?? INTENSITY.moderada}

PRs ATUAIS:
${prsText}

REGRAS:
- Cada treino cabe em ${duration_minutes} minutos
- Sempre inclua aquecimento (10-15min) e trabalho principal
- Alterne grupos musculares entre os dias (push/pull, superior/inferior)
- Para força: use 70-85% do 1RM dos PRs (ajuste pela intensidade)
- Para WOD: use AMRAP, FOR_TIME ou EMOM com duração adequada
- Nomes de exercícios em português quando possível
- Inclua sets, reps e load_pct_1rm quando houver PR para o movimento
- rest_seconds: leve=120-180, moderada=90-120, alta=60-90, máxima=45-60
- notes do workout: 1 frase de motivação ou dica do coach (em português)

ESTRUTURA OBRIGATÓRIA DE BLOCOS (use sempre esta ordem quando aplicável):
1. warm_up — "Warm-up" (sempre inclua, 10-15 min)
2. mobility — "Mobility" (opcional, foco em mobilidade específica)
3. strength — "Strength" (bloco de força, se aplicável)
4. skill — "Skill" (bloco técnico, se aplicável)
5. conditioning — "Conditioning" ou wod — "WOD" (parte metabólica principal)
6. accessories — "Accessories" (complementares, se o tempo permitir)
7. cool_down — "Cool Down" (sempre inclua, 5 min)

EXERCÍCIOS — use sempre nomes em inglês seguindo o padrão CrossFit:
Barbell: Back Squat, Front Squat, Deadlift, Strict Press, Push Press, Push Jerk, Clean, Power Clean, Snatch, Thruster, Bench Press
Gymnastics: Pull-up, Chest-to-Bar Pull-up, Muscle-up, Toes-to-Bar, Handstand Push-up, Ring Dip, Wall Walk, Rope Climb, Double Unders
Cardio: Row (cal), Bike (cal), SkiErg (cal), Run
WOD movements: Burpee, Box Jump, Wall Ball, Kettlebell Swing, Box Step-over
Accessories: Bulgarian Split Squat, Farmer Carry, Turkish Get-up, GHD Sit-up, Hollow Hold, Ring Row, Single-Leg Deadlift

NÃO use máquinas de academia: leg press, leg curl, leg extension, cable machine, pec deck, smith machine.

FORMATO — retorne exatamente este JSON:
[
  {
    "workout_date": "YYYY-MM-DD",
    "focus": ["forca", "superior"],
    "notes": "Coach tip in Portuguese (1 sentence).",
    "sections": [
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
            "duration_seconds": 300,
            "load_kg": null,
            "load_pct_1rm": null,
            "rpe": null,
            "rest_seconds": null,
            "notes": null,
            "position": 0
          }
        ]
      }
    ]
  }
]

section_type: warm_up | mobility | strength | skill | conditioning | wod | accessories | cool_down
format_type: null | AMRAP | FOR_TIME | EMOM | E90S | TABATA | ROUNDS | INTERVAL
format_config para AMRAP: {"time_minutes": 12}
format_config para FOR_TIME: {"rounds": 5, "time_cap_minutes": 20}
format_config para EMOM: {"time_minutes": 20, "interval_seconds": 60}
focus values: superior | inferior | full_body | core | cardio | mobilidade | forca | tecnica | crossfit`

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 8000,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const err = await claudeRes.text()
      console.error("Claude error:", err)
      throw new Error(`Claude API: ${claudeRes.status}`)
    }

    const claudeData = await claudeRes.json()
    const raw = (claudeData.content[0].text as string).trim()
    const jsonText = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
    const workouts: unknown[] = JSON.parse(jsonText)

    // Log AI usage (fire-and-forget, non-blocking)
    const inputTokens  = claudeData.usage?.input_tokens  ?? 0
    const outputTokens = claudeData.usage?.output_tokens ?? 0
    const MODEL        = "claude-haiku-4-5-20251001"
    const costUsd      = (inputTokens * 0.0000008) + (outputTokens * 0.000004)
    adminClient.from("ai_usage_log").insert({
      function_name:  "generate-workout",
      triggered_by:   user.id,
      athlete_id:     null,
      model:          MODEL,
      input_tokens:   inputTokens,
      output_tokens:  outputTokens,
      cost_usd:       costUsd,
    }).then(() => {/* ignore */})

    const savedIds: string[] = []
    for (const w of workouts as Array<{ workout_date: string; focus: string[]; notes: string; sections: unknown[] }>) {
      const { data: id, error: saveErr } = await supabase.rpc("ai_save_workout", {
        p_workout_date: w.workout_date,
        p_focus: w.focus ?? [],
        p_notes: w.notes ?? null,
        p_sections: w.sections,
      })
      if (saveErr) throw saveErr
      savedIds.push(id)
    }

    return new Response(
      JSON.stringify({ count: savedIds.length, ids: savedIds }),
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
