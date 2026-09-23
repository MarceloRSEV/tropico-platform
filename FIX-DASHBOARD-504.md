# Fix: Dashboard Tropico 504 Timeout

## 🚨 Problema
- **Erro:** 504 GATEWAY_TIMEOUT na página https://tropico-platform.vercel.app/
- **Causa:** Função `getMetaDashboardData()` demorando mais de 30s para buscar dados da Meta API
- **Culpritos:** Múltiplas requisições paralelas à Meta API que podem estar lentas/indisponíveis

## ✅ Solução Implementada

### 1. **Timeouts nas Requisições** (10s por requisição)
- Adicionado `fetchWithTimeout()` helper em `src/lib/meta.ts`
- Evita que uma requisição lenta trave todo o dashboard

### 2. **Sistema de Cache Robusto** (novo arquivo)
- **Arquivo:** `src/lib/meta-cache.ts`
- **Banco:** Supabase tabela `meta_dashboard_cache`
- **Funcionalidade:**
  - Salva últimos dados válidos após sucesso
  - Se API falhar, retorna dados em cache
  - Se cache falhar, retorna dados vazios (0s)
  - **NUNCA fica fora do ar** ✅

### 3. **Fluxo de Fallback**
```
1. Tenta buscar dados frescos da Meta API (com timeout 10s)
   ↓
2. Se sucesso → Salva em cache + Retorna dados
   ↓
3. Se falha → Tenta carregar do cache Supabase
   ↓
4. Se cache existe → Retorna dados antigos (com _fromCache flag)
   ↓
5. Se cache vazio → Retorna data structure vazia (zero sales, etc)
```

## 📋 Próximos Passos

### A) **URGENTE:** Criar tabela no Supabase
Execute no Supabase SQL Editor (https://supabase.com/dashboard):

```sql
-- Create meta_dashboard_cache table
CREATE TABLE IF NOT EXISTS meta_dashboard_cache (
  id TEXT PRIMARY KEY DEFAULT 'latest',
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE meta_dashboard_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read
DROP POLICY IF EXISTS "Allow public read" ON meta_dashboard_cache;
CREATE POLICY "Allow public read" ON meta_dashboard_cache
  FOR SELECT USING (true);

-- Allow write (via API)
DROP POLICY IF EXISTS "Allow anon write" ON meta_dashboard_cache;
CREATE POLICY "Allow anon write" ON meta_dashboard_cache
  FOR INSERT, UPDATE USING (true);

-- Create index
CREATE INDEX IF NOT EXISTS meta_dashboard_cache_updated_at
  ON meta_dashboard_cache (updated_at DESC);
```

### B) **Verificar Credenciais Meta**
No Vercel (https://vercel.com/dashboard):
- [ ] `META_ACCESS_TOKEN` — está válido/não expirou?
- [ ] `META_AD_ACCOUNT_ID` — é o account ID correto (sem "act_")?

Se estiverem inválidos:
1. Gere novo token: https://developers.facebook.com/apps/
2. Configure em Vercel Environment Variables
3. Redeploy: `vercel redeploy`

### C) **Deploy**
```bash
# Opção 1: Push para master (automático)
git add -A
git commit -m "fix(tropico): add cache layer + timeouts para Meta API"
git push

# Opção 2: Redeploy manual
vercel redeploy --prod
```

## 🔍 Como Monitorar

### Log do Dashboard
```bash
# Ver se está retornando cache
vercel logs --project tropico-platform

# Procure por:
# [Meta] Retornando dados em cache ← Cache funcionando
# [Meta Cache Save] ← Salvando novo cache
```

### Status da Tabela
```sql
SELECT id, updated_at, pg_size_pretty(pg_column_size(data)) as size
FROM meta_dashboard_cache
ORDER BY updated_at DESC;
```

## 📊 Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/meta.ts` | Adicionado `fetchWithTimeout()`, modificado `getMetaDashboardData()` com fallback de cache |
| `src/lib/meta-cache.ts` | **NOVO** — funções de cache |
| `supabase/migrations/create_meta_cache_table.sql` | **NOVO** — schema da tabela |
| `scripts/setup-meta-cache.ts` | **NOVO** — setup script (opcional) |

## ⚠️ Notas Importantes

1. **Performance:** Com cache, primeira requisição após falha usa dados de até 30min atrás
2. **Transparência:** UI pode mostrar "Dados de X minutos atrás" quando em cache
3. **Produção:** Cache persiste — não precisa de reset manual
4. **Fallback:** Se tudo falhar, exibe zeros em vez de erro HTTP

## 🆘 Troubleshooting

**Problema:** "Tabela não encontrada"  
**Solução:** Execute SQL da seção "Próximos Passos A"

**Problema:** Dados sempre em cache, nunca atualizam  
**Solução:** Verificar `META_ACCESS_TOKEN` e `META_AD_ACCOUNT_ID` no Vercel

**Problema:** Cache cresce muito (db cheio)  
**Solução:** Adicionar cleanup (deletar registros antigos) — contact para implementar se necessário

---

**Status:** ✅ Pronto para deploy  
**Testado:** Build local ✓ | Linting ✓  
**Bloqueador:** Criar tabela no Supabase (manual)
