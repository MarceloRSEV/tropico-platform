import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Força execução sem cache
export const dynamic = 'force-dynamic'

async function keepAliveSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Credenciais Supabase não configuradas')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

  // Query simples para manter a conexão ativa (não precisa de dados)
  const { data, error } = await supabase
    .from('ad_accounts')
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('Keep-alive falhou:', error)
    throw error
  }

  return { ok: true, timestamp: new Date().toISOString() }
}

export async function GET(request: NextRequest) {
  try {
    // Validar token de cron (protege contra acesso não autorizado)
    const cronSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    const authHeader = request.headers.get('authorization')

    if (
      cronSecret &&
      authHeader !== `Bearer ${cronSecret}` &&
      request.headers.get('x-vercel-cron') !== cronSecret
    ) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    const result = await keepAliveSupabase()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Keep-Alive Cron]', error)
    return NextResponse.json(
      {
        error: 'Falha no keep-alive do Supabase',
        message: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}
