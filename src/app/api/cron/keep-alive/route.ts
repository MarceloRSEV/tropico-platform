import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Ping diário (Vercel Cron) para gerar atividade no Supabase e evitar
// a pausa automática do plano gratuito (~7 dias sem atividade).
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: 'Supabase não configurado' }, { status: 500 })
  }

  const supabase = createClient(url, key)
  const { error } = await supabase.from('profiles').select('id').limit(1)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() })
}
