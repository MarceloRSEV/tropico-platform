import { NextResponse } from 'next/server'
import { SESSION_COOKIE, SESSION_TTL_SECONDS, secretsMatch, signSession } from '@/lib/report-session'
import { clientIp, rateLimit, resetRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  // Fail-closed: sem configuração não há login
  if (!process.env.RELATORIO_PASSWORD || !process.env.SESSION_SECRET) {
    console.error('[relatorio-auth] RELATORIO_PASSWORD/SESSION_SECRET ausente')
    return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 })
  }

  const ip = clientIp(request)
  const limit = rateLimit(`relatorio-auth:${ip}`)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Aguarde alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  let password: unknown
  try {
    ;({ password } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Requisição inválida' }, { status: 400 })
  }

  if (typeof password !== 'string' || !(await secretsMatch(password, process.env.RELATORIO_PASSWORD))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = await signSession()
  if (!token) return NextResponse.json({ error: 'Serviço indisponível' }, { status: 503 })

  resetRateLimit(`relatorio-auth:${ip}`)
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  })
  return response
}
