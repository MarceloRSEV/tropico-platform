import type { ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'

type Props = { since: string; until: string }

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-6 py-8 text-center text-sm text-gray-500">
      {children}
    </div>
  )
}

export async function GoogleAdsMetrics({ since, until }: Props) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return <Notice>Sincronização com o Supabase não configurada.</Notice>

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { data: rows, error } = await supabase
    .from('tropico_google_ads_daily')
    .select('impressions, clicks, conversions, cost')
    .gte('date', since)
    .lte('date', until)

  if (error) {
    console.error('[GoogleAdsMetrics]', error.message)
    return <Notice>Não foi possível ler os dados sincronizados.</Notice>
  }
  if (!rows || rows.length === 0) {
    return <Notice>Sem dados sincronizados para o período ({since} a {until}).</Notice>
  }

  const totals = { impressions: 0, clicks: 0, conversions: 0, cost: 0 }

  for (const r of rows) {
    totals.impressions += Number(r.impressions ?? 0)
    totals.clicks += Number(r.clicks ?? 0)
    totals.conversions += Number(r.conversions ?? 0)
    totals.cost += Number(r.cost ?? 0)
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="Impressões" value={fmt(totals.impressions)} />
      <Card label="Cliques" value={fmt(totals.clicks)} />
      <Card label="Conversões" value={fmt(Math.round(totals.conversions))} />
      <Card label="Custo" value={fmtBRL(totals.cost)} />
    </div>
  )
}


function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold mt-1 text-gray-900">{value}</p>
    </div>
  )
}
