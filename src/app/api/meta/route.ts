import { NextResponse } from 'next/server'
import { getMetaDashboardData } from '@/lib/meta'

// Revalida a cada 30 minutos no cache do Next.js
export const revalidate = 1800

export async function GET() {
  try {
    const data = await getMetaDashboardData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Meta API Route]', error)
    return NextResponse.json(
      { error: 'Falha ao buscar dados da Meta API' },
      { status: 500 },
    )
  }
}
