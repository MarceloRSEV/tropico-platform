import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Inicializa tabela na primeira vez (criar se não existir)
let tableInitialized = false
async function ensureTableExists() {
  if (tableInitialized) return

  try {
    // Tenta fazer uma query simples para verificar se tabela existe
    const { error } = await supabase
      .from('meta_dashboard_cache')
      .select('id')
      .limit(1)

    if (error?.code === 'PGRST116') {
      // Tabela não existe, tenta criar
      console.log('[Meta Cache] Criando tabela meta_dashboard_cache...')
      const { error: createError } = await supabase.rpc('create_meta_cache_table', {})

      if (createError && createError.code !== 'PGRST116') {
        console.warn('[Meta Cache] Não foi possível criar tabela:', createError)
      }
    }

    tableInitialized = true
  } catch (error) {
    console.warn('[Meta Cache] Erro ao inicializar tabela:', error)
    tableInitialized = true // Marca como inicializado mesmo com erro para não ficar tentando
  }
}

export interface CachedMetaDashboardData {
  data: Record<string, unknown>
  timestamp: string
  source: 'api' | 'cache'
  error?: string
}

/**
 * Salva dados do dashboard Meta no cache do Supabase
 */
export async function saveToCacheAsync(data: Record<string, unknown>) {
  try {
    await ensureTableExists()

    await supabase
      .from('meta_dashboard_cache')
      .upsert(
        {
          id: 'latest',
          data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
  } catch (error) {
    console.error('[Meta Cache Save]', error)
    // Falha silenciosa — cache é opcional
  }
}

/**
 * Carrega dados em cache do Supabase
 */
export async function getFromCache(): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabase
      .from('meta_dashboard_cache')
      .select('data, updated_at')
      .eq('id', 'latest')
      .single()

    if (error) {
      console.warn('[Meta Cache Get]', error)
      return null
    }

    if (!data) return null

    const cachedData = (data as Record<string, unknown>).data as Record<string, unknown>
    return {
      ...cachedData,
      updatedAt: (data as Record<string, unknown>).updated_at,
      _fromCache: true,
    }
  } catch (error) {
    console.error('[Meta Cache Get Error]', error)
    return null
  }
}

/**
 * Fallback com dados vazios seguros
 */
export function getSafeEmptyData() {
  return {
    overview: {
      spend: 0,
      reach: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpm: 0,
    },
    daily: [],
    creatives: [],
    cities: [],
    campaignsByType: [],
    audiences: [],
    updatedAt: new Date().toISOString(),
    _empty: true,
  }
}
