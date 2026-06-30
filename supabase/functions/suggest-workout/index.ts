import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "https://gounbroken.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const INTENSITY_MAP: Record<string, string> = {
  leve:     "Leve — RPE 5-6, foco em técnica, cargas conservadoras, descanso generoso (150s+)",
  moderada: "Moderada — RPE 7, esforço sólido sem chegar no limite, descanso 90s",
  intensa:  "Intensa — RPE 8-9, próximo do limite, cargas elevadas, descanso 60s",
}

const FOCUS_MAP: Record<string, string> = {
  superior:   "Upper Body — empurrar e puxar (press, pull-up, row)",
  inferior:   "Lower Body — quadríceps, posterior de coxa e glúteos (squat, deadlift, lunge)",
  full_body:  "Full Body — movimentos compostos que envolvem todo o corpo",
  core:       "Core e estabilidade do tronco",
  cardio:     "Cardio e condicionamento aeróbico",
  mobilidade: "Mobilidade e recuperação ativa",
  forca:      "Força máxima — padrões de levantamento pesado",
  tecnica:    "Técnica e habilidade — movimentos olímpicos ou ginástica",
  crossfit:   "CrossFit — força + condicionamento metabólico",
}

// Normalize leetspeak and detect prompt injection patterns
const INJECTION_PATTERNS = [
  /ignore.{0,15}(all|previous|tudo|prompt|everything|instructions)/,
  /you\s+are\s+now/,
  /voc[eê]\s+agora/,
  /act\s+as\b/,
  /jailbreak/,
  /system:/,
  /new\s+instruction/,
  /forget\s+everything/,
  /esque[cç][ae]\s+tudo/,
  /pretend\s+(you|to\s+be)/,
  /finja\s+que/,
  /\[\[|\]\]/,
  /###\s*instruct/,
  /override\s+(the\s+)?(system|instructions|prompt)/,
]

function normalizeLeet(s: string): string {
  return s.toLowerCase()
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/@/g, "a")
    .replace(/\s{2,}/g, " ")
}

function hasInjection(text: string): boolean {
  const n = normalizeLeet(text)
  return INJECTION_PATTERNS.some(p => p.test(n))
}

const SECTION_LABEL_MAP: Record<string, string> = {
  mobility:     "Mobility",
  warm_up:      "Warm-up",
  strength:     "Strength",
  skill:        "Skill",
  conditioning: "Conditioning",
  wod:          "WOD",
  accessories:  "Accessories",
  cool_down:    "Cool Down",
}

interface RecentFeedback {
  workout_date: string
  focus: string[] | null
  status: string
  enjoyment: string | null
  perceived_difficulty: string | null
  student_comment: string | null
}

function buildFeedbackContext(feedback: RecentFeedback[]): string {
  if (!feedback || feedback.length === 0) {
    return "  Sem histórico de feedback recente."
  }
  return feedback.map(f => {
    const focusStr = f.focus?.join(', ') || 'sem foco definido'
    const statusPt: Record<string, string> = {
      completed: 'completou', partially_completed: 'fez parcialmente', skipped: 'não fez',
    }
    const enjoyPt: Record<string, string> = {
      liked: 'gostou', neutral: 'neutro', disliked: 'não gostou',
    }
    const diffPt: Record<string, string> = {
      easy: 'fácil', appropriate: 'na medida', too_hard: 'muito pesado',
    }
    const parts = [
      `${f.workout_date} [${focusStr}]: ${statusPt[f.status] ?? f.status}`,
      f.enjoyment ? enjoyPt[f.enjoyment] ?? f.enjoyment : null,
      f.perceived_difficulty ? diffPt[f.perceived_difficulty] ?? f.perceived_difficulty : null,
      f.student_comment ? `comentário: "${f.student_comment.replace(/[^\p{L}\p{N}\s.,;:!?'"()-]/gu, '').slice(0, 200)}"` : null,
    ].filter(Boolean)
    return `  - ${parts.join(' | ')}`
  }).join('\n')
}

const JSON_SCHEMA = `{
  "student_note": "Frase curta e humana para o aluno, ou null se não houver nada relevante.",
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
}`

const SCHEMA_RULES = `VALORES VÁLIDOS:
- section_type: warm_up | mobility | strength | skill | conditioning | wod | accessories | cool_down
- format_type: null | AMRAP | FOR_TIME | EMOM | TABATA | ROUNDS | INTERVAL
- format_config para AMRAP: {"time_minutes": 12}
- format_config para FOR_TIME: {"rounds": 3, "time_cap_minutes": 20}
- format_config para EMOM: {"time_minutes": 16, "interval_seconds": 60}
- format_config para ROUNDS: {"rounds": 5, "rest_between_rounds_seconds": 90}
- Todos os campos numéricos: número ou null (nunca string)
- notes: string curta em inglês com orientação de execução, ou null`

const EQUIPMENT_RULES = `EXERCÍCIOS E EQUIPAMENTOS PERMITIDOS (CrossFit box):
Barra: Back Squat, Front Squat, Deadlift, Strict Press, Push Press, Push Jerk, Clean, Power Clean, Snatch, Thruster, Bench Press, Romanian Deadlift, Barbell Row
Ginástica: Pull-up, Chest-to-Bar, Muscle-up, Toes-to-Bar, Handstand Push-up, Ring Dip, Ring Row, Double Unders, Rope Climb, Wall Walk
Cardio (ergs): Row (cal), Bike (cal), Run, SkiErg (cal)
Kettlebell/Dumbbell: Kettlebell Swing (24/16 kg), Turkish Get-up, Farmer Carry, Single-Leg Deadlift, Dumbbell Press, Goblet Squat
WOD: Burpee, Box Jump (24/20 in), Wall Ball (9/6 kg), Box Step-over, Jumping Lunge
Acessórios: Bulgarian Split Squat, GHD Sit-up, Hollow Hold, Hip Extension, Pallof Press, Bird Dog, AbMat Sit-up, Sandbag Carry
NÃO USE: leg press, lat pulldown, cable machine, pec deck, smith machine, seated row machine, leg extension, leg curl, chest press machine`

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const {
      athlete_id,
      focus,
      duration_minutes = 60,
      intensity = "moderada",
      mode = "full",          // "full" | "section"
      section_type,           // only for mode === "section"
      coach_notes,            // optional coach context
    } = await req.json()

    // Validate coach_notes: size cap + injection detection
    if (coach_notes) {
      if (typeof coach_notes !== "string" || coach_notes.length > 500 || hasInjection(coach_notes)) {
        return new Response(JSON.stringify({ error: "Observações inválidas" }), {
          status: 400, headers: { ...cors, "Content-Type": "application/json" },
        })
      }
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

    // Role check — only personal/admin/ai can call AI functions
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("roles")
      .eq("user_id", user.id)
      .single()
    const callerRoles: string[] = callerProfile?.roles ?? []
    if (!callerRoles.some(r => ["personal", "admin", "ai"].includes(r))) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), { status: 403, headers: cors })
    }

    // Rate limiting — 20 calls/day per user via ai_usage_log
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )
    const { count: todayCount } = await adminClient
      .from("ai_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("function_name", "suggest-workout")
      .eq("triggered_by", user.id)
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    if ((todayCount ?? 0) >= 20) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded — máximo 20 sugestões por dia" }), { status: 429, headers: cors })
    }

    // Ownership check — caller must be the athlete or their trainer
    if (athlete_id && athlete_id !== user.id) {
      const { data: relationship } = await adminClient
        .from("trainer_athletes")
        .select("id")
        .eq("trainer_id", user.id)
        .eq("athlete_id", athlete_id)
        .single()
      if (!relationship) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: cors })
      }
    }

    // Fetch athlete PRs
    const { data: prs } = await supabase.rpc("get_athlete_prs", { p_athlete_id: athlete_id })
    const athletePRs: Array<{ movement_name: string; reps: number; max_weight: number }> = prs ?? []

    // Fetch recent feedback (last 30 days)
    const { data: recentFeedback } = await supabase.rpc("get_athlete_recent_feedback", {
      p_athlete_id: athlete_id,
      p_days: 30,
    })
    const feedbackList: RecentFeedback[] = recentFeedback ?? []

    const prsText = athletePRs.length > 0
      ? athletePRs.map(p => `  - ${p.movement_name} ${p.reps}RM: ${p.max_weight}kg`).join("\n")
      : "  Nenhum PR registrado — use orientações por RPE ou carga moderada/pesada"

    const feedbackText = buildFeedbackContext(feedbackList)

    const hasFeedback = feedbackList.length > 0
    const lastSkipped = feedbackList.some(f => f.status === 'skipped')
    const lastTooHard = feedbackList.some(f => f.perceived_difficulty === 'too_hard')
    const lastPartial = feedbackList.some(f => f.status === 'partially_completed')
    const hasComments = feedbackList.some(f => f.student_comment)

    const focusLabel = FOCUS_MAP[focus] ?? focus ?? "Balanceado — analise os PRs e crie sessão equilibrada"
    const intensityLabel = INTENSITY_MAP[intensity] ?? INTENSITY_MAP.moderada
    const coachNotesSection = coach_notes
      ? `\nOBSERVAÇÕES DO COACH:\n  "${coach_notes}"\n  Considere essas observações ao criar o treino.`
      : ''

    const system = `Você é um coach expert em CrossFit e força e condicionamento. Retorne APENAS JSON válido, sem markdown, sem explicações adicionais.`

    // ── SINGLE SECTION PROMPT ─────────────────────────────────────────
    let prompt: string

    if (mode === "section") {
      const sLabel = SECTION_LABEL_MAP[section_type] ?? section_type ?? "Etapa"
      prompt = `Crie APENAS UMA etapa de treino do tipo "${section_type}" (label: "${sLabel}").

PARÂMETROS:
- Foco: ${focusLabel}
- Intensidade: ${intensityLabel}
- Tipo de etapa: ${sLabel}
${coachNotesSection}
PRs DO ALUNO:
${prsText}

HISTÓRICO DE FEEDBACK RECENTE (últimos 30 dias):
${feedbackText}

REGRAS DE AJUSTE:
${lastTooHard ? '- O aluno marcou treinos recentes como "muito pesado". Reduza cargas ou volume.' : ''}
${hasComments ? '- Considere os comentários do aluno ao criar a etapa.' : ''}
${!hasFeedback ? '- Sem histórico. Use orientações por RPE adequadas ao foco.' : ''}

REGRAS DE ESTRUTURA:
- O array "sections" deve conter SOMENTE 1 objeto do tipo "${section_type}"
- Para força: use percentuais dos PRs quando disponíveis (load_pct_1rm)
- Para WOD/Conditioning: use AMRAP, FOR_TIME ou EMOM conforme adequado
- "student_note" deve ser null (nota não é necessária para etapa única)
- NÃO adicione warm_up, cool_down ou outras etapas além da solicitada

${EQUIPMENT_RULES}

FORMATO — retorne exatamente este JSON:
${JSON_SCHEMA}

${SCHEMA_RULES}`

    // ── FULL WORKOUT PROMPT ───────────────────────────────────────────
    } else {
      prompt = `Crie UMA sessão de treino estruturada com as seguintes características:

PARÂMETROS DO TREINO:
- Foco: ${focusLabel}
- Duração total: ${duration_minutes} minutos
- Intensidade: ${intensityLabel}
${coachNotesSection}
PRs DO ALUNO:
${prsText}

HISTÓRICO DE FEEDBACK RECENTE (últimos 30 dias):
${feedbackText}

REGRAS DE AJUSTE BASEADAS NO FEEDBACK:
${lastTooHard ? '- ATENÇÃO: O aluno marcou treinos recentes como "muito pesado". Reduza cargas, volume ou intensidade em relação ao que faria normalmente.' : ''}
${lastSkipped ? '- ATENÇÃO: O aluno não completou treinos recentes. Evite sobrecarregar — prefira sessão mais curta e acessível para recuperar o ritmo.' : ''}
${lastPartial ? '- O aluno completou apenas parcialmente treinos recentes. Modere o volume e a complexidade.' : ''}
${hasComments ? '- Considere os comentários do aluno para ajustar o treino (ex: se mencionou dor ou cansaço em alguma região, evite sobrecarregar essa área).' : ''}
${!hasFeedback ? '- Sem histórico de feedback. Monte sessão equilibrada e adequada ao perfil do aluno.' : ''}

REGRAS DE ESTRUTURA:
- Crie apenas 1 sessão completa de exatamente ${duration_minutes} minutos — esse é o tempo real da aula de CrossFit
- Respeite rigorosamente o tempo total: a soma de todas as etapas deve caber em ${duration_minutes} minutos
- Sempre inclua warm-up (8-12 min no início)
- Inclua mobility antes do warm-up quando o foco envolver mobilidade ou se o treino for intenso
- A parte principal (strength/skill/conditioning/wod) deve ocupar 60-70% do tempo total
- Para força: use percentuais dos PRs quando disponíveis (ex: 75% = load_pct_1rm: 75); caso contrário use RPE no campo rpe
- Para WOD/Conditioning: use formato estruturado (AMRAP, FOR_TIME ou EMOM)
- Inclua cool_down (5 min) apenas se o tempo permitir e o treino for intenso
- Não exagere na quantidade de exercícios — prefira qualidade e especificidade ao volume excessivo

${EQUIPMENT_RULES}

REGRAS PARA student_note:
- Escreva uma observação CURTA e HUMANA para mostrar ao aluno (máximo 2 frases)
- Explique apenas o que mudou em relação ao padrão, se houver algo baseado no feedback
- Se não houver feedback, escreva uma frase motivacional ou de contexto simples
- Tom: direto, encorajador, sem ser condescendente
- Em português, sem jargão técnico excessivo
- NÃO mencione dados internos, percentuais de carga ou raciocínio técnico do treinador
- Exemplos: "Deixamos o treino um pouco mais leve hoje para você recuperar o ritmo." / "Treino equilibrado focado em ${focusLabel.split(' ')[0].toLowerCase()}." / "Evitamos exercícios de ombro hoje por causa do comentário do último treino."

FORMATO DE RETORNO — retorne exatamente este JSON (sem nenhum texto fora dele):
${JSON_SCHEMA}

${SCHEMA_RULES}`
    }

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: mode === "section" ? 2048 : 4096,
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
    const result = JSON.parse(jsonText)

    // Log usage (fire-and-forget)
    const inputTokens  = claudeData.usage?.input_tokens  ?? 0
    const outputTokens = claudeData.usage?.output_tokens ?? 0
    const MODEL        = "claude-haiku-4-5-20251001"
    const costUsd      = (inputTokens * 0.0000008) + (outputTokens * 0.000004)
    adminClient.from("ai_usage_log").insert({
      function_name:  "suggest-workout",
      triggered_by:   user.id,
      athlete_id:     athlete_id ?? null,
      model:          MODEL,
      input_tokens:   inputTokens,
      output_tokens:  outputTokens,
      cost_usd:       costUsd,
    }).then(() => {/* ignore */})

    return new Response(
      JSON.stringify(result),
      { headers: { ...cors, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("suggest-workout error:", err)
    return new Response(
      JSON.stringify({ error: "Erro interno. Tente novamente." }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    )
  }
})
