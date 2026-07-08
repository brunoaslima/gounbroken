/**
 * Canonical free-text workout line classifier and highlight patterns.
 * Used by WorkoutNotesRenderer (display) and WorkoutPreview (import sheet).
 * Keep both consumers in sync by editing only this file.
 */

export type WorkoutLineType = 'format' | 'exercise' | 'note' | 'title' | 'plain' | 'empty'

// Lines that are standalone section headers
const BLOCK_HEADER_RE = /^(warm[\s-]?up|aquecimento|wod|strength|força|skill|conditioning|condicionamento|metcon|accessory|acessório|mobility|mobilidade|cardio|gymnastics|ginástica|cool[\s-]?down)\s*[:\-–]?\s*$/i

// ── Movement abbreviations ─────────────────────────────────────────────────
// Covers common CrossFit shorthands that won't be caught by full-word matching
const ABBREV_RE = /\b(HSPU|T2B|K2E|K2C|C2B|TTB|GHD|OHS|HPC|HPS|HPJ|HPCL|HPSNATCH|BMU|RMU|MU|DUs?|SUs?|DB|KB|SkiErg|AB)\b/

// ── Full movement keyword list ────────────────────────────────────────────
const MOVEMENT_EN_RE = /\b(squat|deadlift|clean|snatch|jerk|press|pull[\s-]?up|push[\s-]?up|lunge|row|run|bike|jump|burpee|thruster|swing|box[\s-]?jump|muscle[\s-]?up|handstand|toes[\s-]?to[\s-]?bar|knees[\s-]?to|sit[\s-]?up|double[\s-]?under|single[\s-]?under|rope|kettlebell|wall[\s-]?ball|kang|turkish|romanian|rdl|dip|step[\s-]?up|carry|sprint|ski[\s-]?erg|assault[\s-]?bike|sandbag|farmer|suitcase|inchworm|bear\s+complex|devil[\s-]?press|man\s+maker|hang|power)\w*\b/i
const MOVEMENT_PT_RE = /\b(agachamento|terra|supino|remada|corrida|polichinelo|desenvolvimento|levantamento|barra|halter|sino|flexão|abdominal|prancha|salto|corda|kettlebell|anilha|elástico)\w*\b/i

export function classifyWorkoutLine(line: string): WorkoutLineType {
  const t = line.trim()
  if (!t) return 'empty'

  // ── Titles (known section headers only — catch-all comes after format) ───
  if (BLOCK_HEADER_RE.test(t)) return 'title'

  // ── Format lines ─────────────────────────────────────────────────────────
  // Classic modalities (including dotted abbreviations like A.M.R.A.P. and E.M.O.M.)
  if (/\b(amrap|a\.m\.r\.a\.p\.?|emom|e\.m\.o\.m\.?|for[\s-]?time|for[\s-]?load|for[\s-]?quality|tabata|chipper|ladder|afap|nft|otm|eotm)\b/i.test(t)) return 'format'
  // EMOM variants: E2MOM, E3MOM, E90S, E2MIN, every 90 seconds…
  if (/\bE\d+(?:MOM|S|MIN)\b/i.test(t)) return 'format'
  if (/\bevery\s+\d+/i.test(t)) return 'format'
  // Death By
  if (/\bdeath\s+by\b/i.test(t)) return 'format'
  // Buy-in / Buy-out
  if (/\bbuy[\s-]?(?:in|out)\b/i.test(t)) return 'format'
  // Partner / team formats
  if (/\b(partner|i\s+go\s+you\s+go|alternating|in\s+teams?\s+of)\b/i.test(t)) return 'format'
  // "5 rounds for time:", "3 rounds NFT" (specific patterns before generic round count)
  if (/^\d+\s*rounds?\s*(for\s+time|nft|not\s+for\s+time)/i.test(t)) return 'format'
  // Generic round / set counts (only if not already caught by specific patterns) —
  // anchored to end-of-line so it only matches bare "N rounds[ of/de][:]" lines
  if (/^\d+\s*rounds?(?:\s*(?:of|de))?\s*:?\s*$/i.test(t)) return 'format'
  if (/^\d+\s*[x×]?\s*sets?\b/i.test(t)) return 'format'
  // EMOM interval labels: "Min 1:", "Min 2:"
  if (/^Min\s+\d+\s*:/i.test(t)) return 'format'
  // "On a 20 min clock" / "With a running clock"
  if (/^(on\s+a\s+\d+|with\s+a\s+running\s+clock)/i.test(t)) return 'format'
  // Structural labels
  if (/^(each\s+for\s+time|for\s+load|build\s+to|time\s+cap|heavy\s+single|find\s+your|work\s+up\s+to|1RM)/i.test(t)) return 'format'
  if (/^\d+r\b.*\b(each|for|time)\b/i.test(t)) return 'format'
  // Rep schemes: 21-15-9, 12 - 10 - 8, 1-1-1-1-1 — only when it IS the whole line
  if (/^\d+(?:\s*-\s*\d+)+\s*(?:of\s*:?|reps?|rounds?)?\s*$/i.test(t)) return 'format'
  // Strength percentage lines: "@ 75%", "@80% 1RM" as standalone
  if (/^@\s*\d+%/.test(t)) return 'format'

  // ── Notes ────────────────────────────────────────────────────────────────
  if (/^(\d+[''´`]?\s*)?(rest|descanso)\b/i.test(t)) return 'note'
  if (/^(obs|scale|note|nota|objetivo|goal|atenção|rx\+?|scaled|cap|moderate|focus|technique|score|build|stimulus|target|standard|tie[\s-]?break|modifications?|coach|scaling)\b/i.test(t)) return 'note'
  if (/^score\s*[=:]/i.test(t)) return 'note'
  if (/^[-–*]\s*(rest|descanso|obs|note|nota|scale|stimulus|target)\b/i.test(t)) return 'note'

  // ── Title catch-all (after format/note to avoid misclassifying NFT, OTM…) ─
  // Short all-caps lines without digits that aren't abbreviations or format keywords
  if (
    t.length <= 35 &&
    /^[A-ZÁÉÍÓÚÀÂÊÔÃÕÇ\s\-\/\.]+$/.test(t) &&
    !/\d/.test(t) &&
    t.length > 2 &&
    !ABBREV_RE.test(t)
  ) return 'title'

  // ── Exercise lines ───────────────────────────────────────────────────────
  // Quantifiers
  if (/\d+\s*[x×]\s*\d+/i.test(t)) return 'exercise'
  if (/\d+\s*rep(?:etições?|s)?/i.test(t)) return 'exercise'
  if (/\d+[\s,]*kg\b/i.test(t)) return 'exercise'
  if (/\d+[\s,]*lb\b/i.test(t)) return 'exercise'
  if (/\d+[/\d]*\s*m\b/i.test(t)) return 'exercise'
  if (/\d+\s*ft\b/i.test(t)) return 'exercise'            // 50 ft handstand walk
  if (/\d+(?:\/\d+)?\s*cal(?:ories?)?\b/i.test(t)) return 'exercise'
  // Known movements
  if (ABBREV_RE.test(t)) return 'exercise'
  if (MOVEMENT_EN_RE.test(t)) return 'exercise'
  if (MOVEMENT_PT_RE.test(t)) return 'exercise'
  // Catch-all: line starts with a number followed by a word
  if (/^\d+\s+[a-z]/i.test(t)) return 'exercise'

  return 'plain'
}

// ── Highlight regexes ────────────────────────────────────────────────────────

// Numbers and keywords to highlight inside a FORMAT line
export const FORMAT_HIGHLIGHT_RE =
  /\b(AMRAP|EMOM|E\d+(?:MOM|S|MIN)|For\s+Time|For\s+Load|For\s+Quality|NFT|AFAP|OTM|Tabata|Every|Rounds?|Sets?|Chipper|Ladder|Death\s+By|Buy[\s-]?(?:in|out)|Partner|Each\s+For\s+Time|Time\s+Cap|Build\s+To|Heavy\s+Single|Find\s+Your|E\.M\.O\.M|A\.M\.R\.A\.P|Min\s+\d+)\b|\d+r\b|\d+(?:\s*-\s*\d+)+|\d+[''´`]?\s*(min\.?)?|\d+:\d{2}|\d+%|\b\d+\b/i

// Numbers and quantities to highlight inside an EXERCISE line
export const EXERCISE_HIGHLIGHT_RE =
  /\d+(?:\/\d+)?\s*cal(?:ories?)?\b|\d+\s*[x×]\s*\d+|\d+[/\d]*\s*m\b|\d+\s*ft\b|\d+[\s,]*kg\b|\d+[\s,]*lb\b|\d+\s*rep(?:etições?|s)?|\d+\s*min(?:utos?)?|\d+\s*seg(?:undos?)?|@\s*\d+%|\d+%|\d+[''´`]|\b\d+\b/

// Leading numeric prefix of an exercise line ("30/24 Cal", "3×10", "50 ft", "15")
export const EXERCISE_PREFIX_RE =
  /^(\d+[""''′″]?(?:[\/\-x×]\d+[""''′″]?)*(?:\s*(?:sec|min|cal|kg|lb|ft|m|reps?|x|×))?)\s+(.+)/i
