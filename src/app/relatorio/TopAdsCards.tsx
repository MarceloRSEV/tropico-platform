import { MetaCreative } from '@/lib/meta'

interface TopAdsCardsProps {
  creatives: MetaCreative[]
  limit?: number
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR')
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const RANK_STYLES = [
  'bg-amber-400 text-amber-950',   // 1º
  'bg-gray-300 text-gray-800',     // 2º
  'bg-orange-300 text-orange-950', // 3º
]

/**
 * Bloco "Melhores anúncios": os N anúncios (máx. 3) que mais geraram
 * conversas no período, apresentados como card com a imagem do criativo.
 * Server component — usa os `creatives` já carregados pela página.
 */
export default function TopAdsCards({ creatives, limit = 3 }: TopAdsCardsProps) {
  const topAds = creatives
    .filter(ad => ad.conversations > 0)
    .sort((a, b) => b.conversations - a.conversations || b.clicks - a.clicks)
    .slice(0, limit)

  const totalConversations = creatives.reduce((sum, ad) => sum + ad.conversations, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-baseline justify-between gap-4 mb-1">
          <h3 className="text-lg font-semibold text-gray-900">Melhores Anúncios</h3>
          {topAds.length > 0 && (
            <span className="text-xs text-gray-400">
              {fmt(totalConversations)} {totalConversations === 1 ? 'conversa' : 'conversas'} no período
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-5">Anúncios que mais geraram conversas no WhatsApp/Messenger</p>

        {topAds.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            Nenhum anúncio gerou conversas no período selecionado
          </div>
        ) : (
          <div className="top-ads-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topAds.map((ad, index) => {
              const image = ad.imageUrl ?? ad.thumbnailUrl
              const share = totalConversations > 0 ? (ad.conversations / totalConversations) * 100 : 0
              const costPerConversation = ad.conversations > 0 ? ad.spend / ad.conversations : null
              const name = ad.adName.replace(/_/g, ' ')

              return (
                <article
                  key={ad.adId}
                  className="top-ads-card relative flex flex-col rounded-xl border border-gray-200 overflow-hidden bg-gray-50"
                >
                  {/* Ranking */}
                  <span
                    className={`absolute top-3 left-3 z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${RANK_STYLES[index] ?? RANK_STYLES[2]}`}
                  >
                    {index + 1}º
                  </span>

                  {/* Imagem do anúncio */}
                  <div className="aspect-square w-full bg-gray-100 overflow-hidden">
                    {image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={image}
                        alt={name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                        Sem imagem
                      </div>
                    )}
                  </div>

                  {/* Métricas */}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <p className="text-xs font-medium text-gray-700 leading-snug line-clamp-2" title={name}>
                      {name}
                    </p>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">Conversas</p>
                        <p className="text-2xl font-bold text-green-600 tabular-nums leading-tight">{fmt(ad.conversations)}</p>
                      </div>
                      <span className="text-[11px] text-gray-500 tabular-nums">{share.toFixed(0)}% do total</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Custo/conv.</p>
                        <p className="text-xs font-medium text-gray-900 tabular-nums">
                          {costPerConversation !== null ? fmtBRL(costPerConversation) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Gasto</p>
                        <p className="text-xs font-medium text-gray-900 tabular-nums">{fmtBRL(ad.spend)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Cliques</p>
                        <p className="text-xs font-medium text-gray-900 tabular-nums">{fmt(ad.clicks)}</p>
                      </div>
                    </div>

                    {ad.instagramPermalinkUrl && (
                      <a
                        href={ad.instagramPermalinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 hover:underline print:hidden"
                      >
                        Ver publicação no Instagram ↗
                      </a>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
