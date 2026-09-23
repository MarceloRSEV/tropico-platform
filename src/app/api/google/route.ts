import { NextResponse, type NextRequest } from 'next/server'
import { getGoogleDashboardData, isGoogleAdsConfigured } from '@/lib/google'

// Revalida a cada 5 minutos para dados frescos
export const revalidate = 300
// Aumentar timeout da rota para 30 segundos (padrão Vercel é 10s)
export const maxDuration = 30

export async function GET(request: NextRequest) {
  // Degradação graciosa: sem credenciais, respondemos 200 com configured: false
  if (!isGoogleAdsConfigured()) {
    return NextResponse.json({ configured: false })
  }

  const periodo = request.nextUrl.searchParams.get('periodo') ?? 'mes'

  try {
    const data = await getGoogleDashboardData(periodo)
    return NextResponse.json({ configured: true, ...data })
  } catch (error) {
    console.error('[Google API Route]', error)
    return NextResponse.json(
      { error: 'Falha ao buscar dados do Google Ads' },
      { status: 500 },
    )
  }
}
