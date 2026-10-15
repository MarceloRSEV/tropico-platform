// Rate limit simples em memória, por IP. Em serverless cada instância tem seu
// próprio contador (proteção best-effort contra força bruta, não global).
const hits = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, max = 5, windowMs = 10 * 60 * 1000): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
  }
  const entry = hits.get(key)
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0 }
  }
  entry.count++
  if (entry.count > max) return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) }
  return { ok: true, retryAfter: 0 }
}

export function resetRateLimit(key: string) {
  hits.delete(key)
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] ?? request.headers.get('x-real-ip') ?? 'unknown').trim()
}
