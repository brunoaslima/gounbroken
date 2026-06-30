const COMMON_EMAIL_DOMAINS = [
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'hotmail.com.br',
  'outlook.com', 'outlook.com.br',
  'live.com', 'live.com.br',
  'yahoo.com', 'yahoo.com.br',
  'icloud.com', 'me.com', 'mac.com',
  'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br', 'r7.com',
]

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at === -1) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1).toLowerCase()
  if (!domain.includes('.')) return null
  if (COMMON_EMAIL_DOMAINS.includes(domain)) return null
  let best: { domain: string; dist: number } | null = null
  for (const d of COMMON_EMAIL_DOMAINS) {
    const dist = levenshtein(domain, d)
    if (dist <= 2 && (!best || dist < best.dist)) best = { domain: d, dist }
  }
  return best ? `${local}@${best.domain}` : null
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
