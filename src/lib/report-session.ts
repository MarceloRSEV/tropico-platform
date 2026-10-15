// Sessão assinada (HMAC-SHA256) do /relatorio. Usa Web Crypto: funciona no
// middleware (edge) e nas rotas (node). Falha FECHADA se SESSION_SECRET ausente.

export const SESSION_COOKIE = 'tropico_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 dias

const enc = new TextEncoder()

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(payload)))
}

/** Comparação em tempo constante (strings de qualquer tamanho). */
export function safeEqual(a: string, b: string): boolean {
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  let diff = ab.length ^ bb.length
  const len = Math.max(ab.length, bb.length)
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  return diff === 0
}

/** Compara segredos de forma constante via hash (esconde também o tamanho). */
export async function secretsMatch(provided: string | null | undefined, expected: string | null | undefined): Promise<boolean> {
  if (!provided || !expected) return false
  const [x, y] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  return safeEqual(toHex(x), toHex(y))
}

export async function signSession(): Promise<string | null> {
  const secret = process.env.SESSION_SECRET
  if (!secret) return null
  const exp = String(Date.now() + SESSION_TTL_SECONDS * 1000)
  return `${exp}.${await hmac(exp, secret)}`
}

export async function verifySession(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.SESSION_SECRET
  if (!secret || !token) return false
  const [exp, sig] = token.split('.')
  if (!exp || !sig || !/^\d+$/.test(exp)) return false
  if (Number(exp) <= Date.now()) return false
  return safeEqual(sig, await hmac(exp, secret))
}

/** Bearer de serviço (n8n/cron/script): REPORT_API_TOKEN ou CRON_SECRET. */
export async function hasServiceBearer(request: Request): Promise<boolean> {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return false
  const token = auth.slice(7)
  return (
    (await secretsMatch(token, process.env.REPORT_API_TOKEN)) ||
    (await secretsMatch(token, process.env.CRON_SECRET))
  )
}

type CookieReader = { cookies?: { get(name: string): { value: string } | undefined } }

/** Sessão válida do relatório (cookie assinado) OU bearer de serviço. */
export async function isReportAuthorized(request: Request & CookieReader): Promise<boolean> {
  const cookie = request.cookies?.get(SESSION_COOKIE)?.value
  if (await verifySession(cookie)) return true
  return hasServiceBearer(request)
}
