import { MetaHourlyRow } from '@/lib/meta'
import { WEEKDAY_LONG, WEEKDAY_SHORT, weekdayIndex } from './weekday'

interface BestTimesChartProps {
  hourly: MetaHourlyRow[]
  /** Quantos dias o período cobre (só para o rótulo) */
  periodDays: number
}

interface Bucket {
  spend: number
  impressions: number
  clicks: number
  conversations: number
}

const emptyBucket = (): Bucket => ({ spend: 0, impressions: 0, clicks: 0, conversations: 0 })

function add(b: Bucket, r: MetaHourlyRow) {
  b.spend += r.spend
  b.impressions += r.impressions
  b.clicks += r.clicks
  b.conversations += r.conversations
}

function costPer(b: Bucket): number | null {
  return b.conversations > 0 ? b.spend / b.conversations : null
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

const BLOCKS = [
  { label: 'Madrugada', range: '0h–5h', from: 0, to: 5 },
  { label: 'Manhã', range: '6h–11h', from: 6, to: 11 },
  { label: 'Tarde', range: '12h–17h', from: 12, to: 17 },
  { label: 'Noite', range: '18h–23h', from: 18, to: 23 },
]

/**
 * Bloco "Melhores horários e dias" do Meta Ads: conversas iniciadas por dia da
 * semana, por hora do dia e mapa de calor dia × hora. Horário local da conta.
 */
export default function BestTimesChart({ hourly, periodDays }: BestTimesChartProps) {
  if (hourly.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
        Sem dados de horário disponíveis
      </div>
    )
  }

  // ── Agregações ────────────────────────────────────────────────────────────
  const total = emptyBucket()
  const byDow = Array.from({ length: 7 }, emptyBucket)
  const byHour = Array.from({ length: 24 }, emptyBucket)
  const heat = Array.from({ length: 7 }, () => Array.from({ length: 24 }, emptyBucket))
  const daysPerDow = Array.from({ length: 7 }, () => new Set<string>())

  for (const r of hourly) {
    const dow = weekdayIndex(r.date)
    const hour = Math.min(23, Math.max(0, r.hour))
    add(total, r)
    add(byDow[dow], r)
    add(byHour[hour], r)
    add(heat[dow][hour], r)
    daysPerDow[dow].add(r.date)
  }

  const blocks = BLOCKS.map(b => {
    const bucket = emptyBucket()
    for (let h = b.from; h <= b.to; h++) {
      bucket.spend += byHour[h].spend
      bucket.impressions += byHour[h].impressions
      bucket.clicks += byHour[h].clicks
      bucket.conversations += byHour[h].conversations
    }
    return { ...b, ...bucket, cost: costPer(bucket) }
  })

  // Melhor dia: mais conversas por dia veiculado; empate → menor custo
  const dowRanked = byDow
    .map((b, i) => ({
      index: i,
      ...b,
      perDay: daysPerDow[i].size > 0 ? b.conversations / daysPerDow[i].size : 0,
      cost: costPer(b),
    }))
    .filter(d => d.conversations > 0)
    .sort((a, b) => b.perDay - a.perDay || (a.cost ?? Infinity) - (b.cost ?? Infinity))

  const bestDay = dowRanked[0]
  // Dia mais caro: maior custo por conversa entre os dias que tiveram conversa
  const worstDay = [...dowRanked].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))[0]

  const blocksRanked = blocks.filter(b => b.conversations > 0).sort((a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity))
  const bestBlock = blocksRanked[0]
  const worstBlock = blocksRanked[blocksRanked.length - 1]

  const maxDowConv = Math.max(...byDow.map(b => b.conversations), 1)
  const maxHourConv = Math.max(...byHour.map(b => b.conversations), 1)
  const maxCell = Math.max(...heat.flat().map(b => b.conversations), 1)

  const totalCost = costPer(total)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Melhores horários e dias — Meta Ads</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Últimos {periodDays} dias · conversas iniciadas no WhatsApp · horário local da conta
          </p>
        </div>

        {/* Destaques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Highlight
            label="Melhor dia"
            value={bestDay ? WEEKDAY_LONG[bestDay.index] : '—'}
            detail={bestDay ? `${bestDay.conversations} conversas · ${bestDay.cost ? fmtBRL(bestDay.cost) : '—'}/conversa` : 'sem conversas'}
            tone="good"
          />
          <Highlight
            label="Melhor faixa"
            value={bestBlock ? `${bestBlock.label} ${bestBlock.range}` : '—'}
            detail={bestBlock ? `${bestBlock.conversations} conversas · ${bestBlock.cost ? fmtBRL(bestBlock.cost) : '—'}/conversa` : 'sem conversas'}
            tone="good"
          />
          <Highlight
            label="Dia mais caro"
            value={worstDay ? WEEKDAY_LONG[worstDay.index] : '—'}
            detail={worstDay ? `${worstDay.conversations} conversas · ${worstDay.cost ? fmtBRL(worstDay.cost) : '—'}/conversa` : 'sem conversas'}
            tone="bad"
          />
          <Highlight
            label="Faixa mais cara"
            value={worstBlock ? `${worstBlock.label} ${worstBlock.range}` : '—'}
            detail={worstBlock ? `${worstBlock.conversations} conversas · ${worstBlock.cost ? fmtBRL(worstBlock.cost) : '—'}/conversa` : 'sem conversas'}
            tone="bad"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Por dia da semana */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Conversas por dia da semana</p>
            <div className="flex items-end gap-2" style={{ height: '160px' }}>
              {byDow.map((b, i) => {
                const h = (b.conversations / maxDowConv) * 120
                const cost = costPer(b)
                const isBest = bestDay?.index === i
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 group" title={`${WEEKDAY_LONG[i]}: ${b.conversations} conversas · gasto ${fmtBRL(b.spend)} · ${cost ? fmtBRL(cost) + '/conversa' : 'sem conversas'}`}>
                    <p className="text-[9px] font-bold text-gray-900">{b.conversations > 0 ? b.conversations : ''}</p>
                    <div
                      className={`w-full rounded-sm transition-colors ${isBest ? 'bg-green-600' : 'bg-green-400 group-hover:bg-green-500'}`}
                      style={{ height: `${h}px`, minHeight: '3px' }}
                    />
                    <p className={`text-[10px] uppercase ${isBest ? 'text-green-700 font-bold' : 'text-gray-600 font-medium'}`}>{WEEKDAY_SHORT[i]}</p>
                    <p className="text-[8px] text-gray-400 tabular-nums">{cost ? fmtBRL(cost) : '—'}</p>
                  </div>
                )
              })}
            </div>
            <p className="text-[9px] text-gray-400 mt-2">Abaixo de cada dia: custo médio por conversa.</p>
          </div>

          {/* Por hora */}
          <div className="lg:col-span-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Conversas por hora do dia</p>
            <div className="flex items-end gap-[2px]" style={{ height: '160px' }}>
              {byHour.map((b, h) => {
                const height = (b.conversations / maxHourConv) * 120
                const cost = costPer(b)
                const inBest = bestBlock ? h >= bestBlock.from && h <= bestBlock.to : false
                return (
                  <div key={h} className="flex-1 flex flex-col items-center justify-end gap-1 group" title={`${h}h: ${b.conversations} conversas · gasto ${fmtBRL(b.spend)} · ${cost ? fmtBRL(cost) + '/conversa' : 'sem conversas'}`}>
                    <p className="text-[8px] font-bold text-gray-900">{b.conversations > 0 ? b.conversations : ''}</p>
                    <div
                      className={`w-full rounded-sm transition-colors ${inBest ? 'bg-green-600' : 'bg-green-400 group-hover:bg-green-500'}`}
                      style={{ height: `${height}px`, minHeight: '3px' }}
                    />
                    <p className={`text-[8px] tabular-nums ${h % 3 === 0 ? 'text-gray-600 font-medium' : 'text-gray-300'}`}>{h}</p>
                  </div>
                )
              })}
            </div>
            {/* Blocos */}
            <div className="grid grid-cols-4 gap-2 mt-3">
              {blocks.map(b => {
                const isBest = bestBlock?.label === b.label
                const share = total.conversations > 0 ? (b.conversations / total.conversations) * 100 : 0
                const spendShare = total.spend > 0 ? (b.spend / total.spend) * 100 : 0
                return (
                  <div key={b.label} className={`rounded-lg border px-2 py-1.5 ${isBest ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                    <p className="text-[10px] font-semibold text-gray-700">{b.label} <span className="text-gray-400 font-normal">{b.range}</span></p>
                    <p className="text-[10px] text-gray-600 tabular-nums">{b.conversations} conv · {b.cost ? fmtBRL(b.cost) : '—'}</p>
                    <p className="text-[9px] text-gray-400 tabular-nums">{share.toFixed(0)}% das conversas · {spendShare.toFixed(0)}% do gasto</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mapa de calor dia × hora */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Mapa de calor — dia da semana × hora</p>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: '36px repeat(24, minmax(0, 1fr))' }}>
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <p key={h} className="text-[8px] text-center text-gray-400 tabular-nums">{h}</p>
                ))}
                {[1, 2, 3, 4, 5, 6, 0].map(dow => (
                  <HeatRow key={dow} dow={dow} cells={heat[dow]} maxCell={maxCell} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-[9px] text-gray-400">
            <span>menos</span>
            {[0.1, 0.35, 0.6, 0.85, 1].map(a => (
              <span key={a} className="w-4 h-3 rounded-sm" style={{ backgroundColor: `rgba(22, 163, 74, ${a})` }} />
            ))}
            <span>mais conversas</span>
          </div>
        </div>

        {/* Base da análise */}
        <p className="text-[10px] text-gray-400 border-t border-gray-200 pt-3">
          Base: {total.conversations} conversas e {fmtBRL(total.spend)} investidos no período
          {totalCost ? ` (média ${fmtBRL(totalCost)}/conversa)` : ''}.
          {total.conversations < 200 ? ' Amostra pequena — leia como tendência, não como regra.' : ''}
        </p>
      </div>
    </div>
  )
}

function HeatRow({ dow, cells, maxCell }: { dow: number; cells: Bucket[]; maxCell: number }) {
  return (
    <>
      <p className="text-[10px] text-gray-600 font-medium uppercase self-center">{WEEKDAY_SHORT[dow]}</p>
      {cells.map((b, h) => {
        const alpha = b.conversations > 0 ? 0.15 + 0.85 * (b.conversations / maxCell) : 0
        const cost = costPer(b)
        return (
          <div
            key={h}
            className="h-5 rounded-[2px] border border-gray-100 flex items-center justify-center"
            style={{ backgroundColor: alpha > 0 ? `rgba(22, 163, 74, ${alpha})` : '#f9fafb' }}
            title={`${WEEKDAY_LONG[dow]} ${h}h: ${b.conversations} conversas · gasto ${fmtBRL(b.spend)} · ${cost ? fmtBRL(cost) + '/conversa' : 'sem conversas'}`}
          >
            {b.conversations > 0 && (
              <span className={`text-[8px] font-semibold tabular-nums ${alpha > 0.55 ? 'text-white' : 'text-green-900'}`}>{b.conversations}</span>
            )}
          </div>
        )
      })}
    </>
  )
}

function Highlight({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'good' | 'bad' }) {
  const toneClass = tone === 'good' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
  const valueClass = tone === 'good' ? 'text-green-700' : 'text-amber-700'
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      <p className={`text-base font-bold mt-1 ${valueClass}`}>{value}</p>
      <p className="text-[11px] text-gray-600 mt-0.5 tabular-nums">{detail}</p>
    </div>
  )
}
