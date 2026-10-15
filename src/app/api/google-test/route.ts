import { NextResponse, type NextRequest } from 'next/server'
import { gaqlSearch, isGoogleAdsConfigured } from '@/lib/google'
import { hasServiceBearer } from '@/lib/report-session'

export const dynamic = 'force-dynamic'

// Diagnóstico: fora de produção, ou em produção apenas com Bearer de serviço
// (REPORT_API_TOKEN/CRON_SECRET). Nunca devolve erros brutos nem IDs de conta.
export async function GET(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production'
  if (!isDev && !(await hasServiceBearer(request))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ configured: false })
  }

  try {
    const rows = await gaqlSearch('SELECT campaign.id, campaign.name FROM campaign LIMIT 5')
    return NextResponse.json({ ok: true, rows: rows.length })
  } catch (e) {
    console.error('[google-test]', e instanceof Error ? e.message.slice(0, 200) : 'erro')
    return NextResponse.json({ ok: false, error: 'Falha na consulta ao Google Ads' }, { status: 502 })
  }
}
