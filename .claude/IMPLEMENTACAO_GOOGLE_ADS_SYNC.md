# Implementação: Sincronização de Google Ads

**Data:** 2026-08-11  
**Status:** ✅ IMPLEMENTADO  
**Problema:** Dados do Google Ads não estão sendo buscados nos últimos dias

## Análise do Problema

O dashboard do Trópico estava exibindo dados mock do Google Ads porque:

1. **Nenhum script de sincronização:** O código estava configurado para buscar dados do Supabase (`google_ads_daily`), mas ninguém os estava populando
2. **Credenciais presentes:** Todas as credenciais da Google Ads API estavam configuradas no `.env`, mas não estava sendo usadas
3. **Fallback para mock:** Quando a tabela Supabase estava vazia, o sistema retornava dados fictícios

## Solução Implementada

### 1. Nova rota de API: `/api/sync-google-ads`

**Arquivo:** `src/app/api/sync-google-ads/route.ts`

- **GET:** Retorna status de configuração e instruções de uso
- **POST:** Sincroniza dados do Google Ads para o Supabase
  - Parâmetro: `?days=N` (quantos dias sincronizar)
  - Autenticação: Bearer token (`SYNC_SECRET_TOKEN`)
  - Fluxo: Google Ads API → Converte métricas → Insere no Supabase

### 2. Migração do Supabase

**Arquivo:** `supabase/migrations/20260811000001_google_ads_daily.sql`

Criou a tabela `google_ads_daily` com colunas:
- `data` (DATE) — Identificador único por dia
- `custo` (NUMERIC) — Gasto em R$
- `impressoes` (BIGINT)
- `cliques` (BIGINT)
- `conversoes` (INTEGER)
- `created_at`, `updated_at` automáticos

### 3. Scripts de Sincronização

#### Script manual: `scripts/sync-google-ads.js`

Usa `fetch` para chamar o endpoint POST:
```bash
node scripts/sync-google-ads.js 7        # Últimos 7 dias
node scripts/sync-google-ads.js --initial # Sincroniza desde janeiro
```

#### Script de teste: `scripts/test-google-ads-sync.js`

Valida toda a configuração:
```bash
node scripts/test-google-ads-sync.js
```

### 4. Cron Jobs Automáticos

**Arquivo:** `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/sync-google-ads?days=1",
      "schedule": "0 2 * * *"     // 02:00 UTC diariamente
    },
    {
      "path": "/api/sync-google-ads?days=7",
      "schedule": "0 3 * * 0"     // 03:00 UTC aos domingos
    }
  ]
}
```

### 5. Configuração

**Arquivo:** `.env`

Adicionado:
```
SYNC_SECRET_TOKEN=google_ads_sync_tropico_h2k9x3mq7p5j8w4l1n6r
```

## Passos para Ativar

### 1. Aplicar migração no Supabase

```bash
supabase migration up
# ou manualmente via Supabase SQL Editor
```

### 2. Testar localmente

```bash
npm run dev

# Em outro terminal:
node scripts/test-google-ads-sync.js
```

### 3. Fazer push e deploy

```bash
git add .
git commit -m "feat: Google Ads sync — automatic daily data fetch"
git push origin design/v2

# Criar PR e mergear
gh pr create
```

### 4. Sincronizar dados iniciais (após deploy)

```bash
# Sincronizar últimos 30 dias
curl -X POST \
  "https://tropico-platform.vercel.app/api/sync-google-ads?days=30" \
  -H "Authorization: Bearer google_ads_sync_tropico_h2k9x3mq7p5j8w4l1n6r"

# Ou via script (se tiver acesso à linha de comando):
node scripts/sync-google-ads.js 30
```

## Validação

Após sincronização, verificar dados no Supabase:

```sql
SELECT COUNT(*) as total_dias, 
       MIN(data) as primeira_data,
       MAX(data) as ultima_data,
       SUM(custo) as custo_total
FROM google_ads_daily;
```

## Próximas Etapas

- [ ] Aplicar migração no Supabase
- [ ] Deploy no Vercel
- [ ] Executar sincronização inicial
- [ ] Validar dados no dashboard
- [ ] Configurar alertas do Vercel

## Documentação

Consultar: `docs/GOOGLE_ADS_SYNC.md` para guia completo de uso e troubleshooting.

## Notas Técnicas

- **Conversão de valores:** Google Ads retorna custos em "micros" (÷ 1.000.000), já convertido no endpoint
- **Cache:** OAuth token é cacheado em memória por ~55 min (token dura ~1h)
- **Erro handling:** Fallback graciosa se Supabase estiver indisponível
- **Rate limiting:** Google Ads API aceita até ~50 requests/segundo por dev token
- **Agendamento:** Cron jobs no Vercel rodam com base em UTC; configure conforme sua timezone

## Arquivo de Histórico

Este documento serve como referência para o que foi implementado na sessão 2026-08-11.
