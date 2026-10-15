import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hasServiceBearer, safeEqual, secretsMatch, signSession, verifySession } from './report-session'
import { rateLimit } from './rate-limit'

const OLD = { ...process.env }
beforeEach(() => {
  process.env.SESSION_SECRET = 'unit-test-secret'
})
afterEach(() => {
  process.env = { ...OLD }
})

describe('sessão assinada', () => {
  it('aceita token válido', async () => {
    expect(await verifySession(await signSession())).toBe(true)
  })
  it('falha fechada sem SESSION_SECRET (inclusive cookie ausente)', async () => {
    const token = await signSession()
    delete process.env.SESSION_SECRET
    expect(await verifySession(token)).toBe(false)
    expect(await verifySession(undefined)).toBe(false)
    expect(await signSession()).toBeNull()
  })
  it('rejeita assinatura adulterada, segredo bruto e expirado', async () => {
    const token = (await signSession())!
    expect(await verifySession(token.slice(0, -1) + '0')).toBe(false)
    expect(await verifySession('unit-test-secret')).toBe(false)
    expect(await verifySession(`${Date.now() - 1000}.abc`)).toBe(false)
  })
})

describe('comparação', () => {
  it('safeEqual / secretsMatch', async () => {
    expect(safeEqual('a', 'a')).toBe(true)
    expect(safeEqual('a', 'ab')).toBe(false)
    expect(await secretsMatch('x', 'x')).toBe(true)
    expect(await secretsMatch(undefined, undefined)).toBe(false)
    expect(await secretsMatch('x', undefined)).toBe(false)
  })
  it('bearer de serviço', async () => {
    process.env.REPORT_API_TOKEN = 'tok'
    const ok = new Request('http://x', { headers: { authorization: 'Bearer tok' } })
    const bad = new Request('http://x', { headers: { authorization: 'Bearer nope' } })
    expect(await hasServiceBearer(ok)).toBe(true)
    expect(await hasServiceBearer(bad)).toBe(false)
    expect(await hasServiceBearer(new Request('http://x'))).toBe(false)
  })
})

describe('rate limit', () => {
  it('bloqueia após o limite', () => {
    const k = `t:${Math.random()}`
    for (let i = 0; i < 5; i++) expect(rateLimit(k).ok).toBe(true)
    expect(rateLimit(k).ok).toBe(false)
  })
})
