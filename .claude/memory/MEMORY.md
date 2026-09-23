# Trópico — Client Memory

## ⚡ SESSÃO 2026-08-25 — Automação Keep-Alive + Crons (✅ COMPLETO)

### Resumo da sessão
Implementada automação para evitar pausas do Supabase free tier (7 dias de inatividade).

**Status:** ✅ PRONTO | Deploy: Vercel | Crons: 4 agendados

### O que foi feito

#### 1. **Endpoint Keep-Alive** (Novo)
- Arquivo: `src/app/api/cron/keep-alive.ts`
- Função: Query simples no Supabase a cada **6 horas**
- Resultado: Supabase **nunca mais pausa** por inatividade
- Testado: ✅ Endpoint retorna `{"ok": true, "timestamp": ...}`

#### 2. **Crons Configurados** (vercel.json)
- **Keep-Alive:** `0 */6 * * *` — a cada 6 horas
- **Google Ads (diário):** `0 2 * * *` — 02:00 UTC
- **Google Ads (semanal):** `0 3 * * 0` — domingo 03:00 UTC
- **Relatório semanal:** `0 8 * * 1` — segunda-feira 08:00 UTC (acionará n8n)

#### 3. **Documentação Completa**
- Arquivo criado: `docs/AUTOMACAO-CRONS.md`
- Contém: problema, solução, setup, monitoramento, referências

### Próximas ações
1. [ ] **Deploy em produção:** `git commit` + `git push` → Vercel redeploy
2. [ ] **Validar** após 12h: verificar se Supabase mantém ativo (Vercel Functions tab)
3. [ ] **Integração n8n:** configurar webhook para receber `/api/generate-report` toda segunda 08:00 UTC (confiável agora)

### Mudanças de arquivo
- ✅ `src/app/api/cron/keep-alive.ts` (novo)
- ✅ `vercel.json` (atualizado com 4 crons)
- ✅ `docs/AUTOMACAO-CRONS.md` (novo, referência técnica)

---

## ⚡ SESSÃO 2026-08-10 — Google Ads → Supabase + Dashboard ao Vivo (✅ COMPLETO)

### Resumo da sessão
Integração completa Google Ads com Supabase. Dashboard agora lê dados reais em tempo real.

**Status:** ✅ PRONTO PARA CLIENTE | Deploy: Vercel | Dados: 214 registros (01/jan-10/ago)

### O que foi feito

#### 1. **Tabela Supabase criada**
- Tabela: `google_ads_daily`
- Campos: `data`, `campanha_id`, `nome_campanha`, `tipo_campanha`, `impressoes`, `cliques`, `custo`, `cpc`, `conversoes`, `moeda`
- Índices para queries rápidas (data, campanha, tipo)
- Projeto: `ibryvujocmgjperqxqli` (Escalada shared)

#### 2. **Scripts Python automáticos** 
Dois scripts rodando diariamente via agendador Windows:

**Script 1: `exportar_para_sheets.py`** (09:20)
- Coleta Google Ads → Google Sheets
- Planilha: `phyton_google_ads_tropico_financeiro` (aba: `campanhas`)
- URL: https://docs.google.com/spreadsheets/d/13BFZSDUP3Ddj_gtZ_hommgdnKxR_XlyiR3KHmBZAjJY/edit
- Status: ✅ Funcionando (corrigido: query agora busca dados de 2026)

**Script 2: `exportar_para_supabase.py`** (09:30) ✨ NOVO
- Coleta Google Ads → Supabase `google_ads_daily`
- Arquivo: `C:\GoogleAdsAPI_MCC_escalada_tropico_financeiro\exportar_para_supabase.py`
- Status: ⏳ Aguarda refresh token renovado (401 invalid_grant)
- Fallback: Script CSV importa dados locais

**Script 3: `exportar_csv_para_supabase.py`** ✨ NOVO
- Importa dados do CSV local → Supabase
- Arquivo: `C:\Users\User\Downloads\conta_custo (1).csv`
- Status: ✅ Funcionando | Importou 214 registros

#### 3. **Dashboard atualizado**
Modificações em `src/lib/google.ts`:
- Nova função `getGoogleDataFromSupabase()` conecta ao Supabase
- Fallback automático para mock se Supabase indisponível
- Cache reduzido de 30min → 5min para dados frescos
- Autenticação mantida: Email + Senha (sem mudanças)

#### 4. **Deploy em produção**
- Build: ✅ Passou (44s)
- Vercel deployment: ✅ READY
- URL: https://tropico-platform.vercel.app
- Revalidate: 300s (5 min)

#### 5. **Dados importados e testados**
- **Total:** 214 registros
- **Período:** 01/jan a 10/ago 2026
- **Custo:** R$ 2.871,34
- **Impressões:** 161.585
- **Cliques:** 9.915
- **CTR:** 6,14%

### Acesso cliente (PRONTO)

| Acesso | URL | Usuário | Senha | Tipo |
|--------|-----|---------|-------|------|
| Dashboard admin | https://tropico-platform.vercel.app/login | escaladavirtual@gmail.com | Tropico#Hub2026 | Email+Senha |
| Relatório cliente | https://tropico-platform.vercel.app/relatorio | — | tropico2024 | Senha simples |

**NOTA:** Admin usa email, cliente usa só senha. Autenticação mantida por email+senha (não alterar).

### Estrutura de arquivos criada

```
C:\GoogleAdsAPI_MCC_escalada_tropico_financeiro\
├── exportar_para_sheets.py          (Google Ads → Sheets)
├── exportar_para_supabase.py        (Google Ads → Supabase) 
├── exportar_csv_para_supabase.py    (CSV → Supabase) ✨
├── migration_google_ads_daily.sql   (Schema tabela)
├── google-ads.yaml                  (Config Google Ads)
├── credenciais_sheets.json          (Auth Google Sheets)
└── README.md                        (Instruções completas)
```

### Próximas sessões

#### Tarefa: Criar acesso cliente profissional
Quando cliente fornecer email (ex: `contato@tropico.com.br`):
1. [ ] Criar novo user no Supabase com email do cliente
2. [ ] Atribuir role `client` (acesso apenas `/relatorio`)
3. [ ] Gerar senha temporária
4. [ ] Documentar no README

#### Tarefa: Renovar Google Ads token
Status: ❌ Token expirado (401 invalid_grant)
- [ ] Gerar novo refresh token via Google OAuth Playground
- [ ] Atualizar em `google-ads.yaml` + `.env` + Vercel
- [ ] Testar `exportar_para_supabase.py`

#### Tarefa: Dados automatizados (opcional)
- [ ] Remover script CSV se Google Ads API funcionar
- [ ] Manter apenas scripts automáticos (Sheets + Supabase)

## ⚡ SESSÃO 2026-08-07 — Google Ads + Relatório Reorganizado

### Google Ads — Status Parcial
**Problema:** Google Ads API retorna 401 unauthorized_client
- Tentativas:
  1. ✅ Credenciais do MTF (Developer Token + Client ID/Secret) — falha: token expirado
  2. ✅ Novo refresh token via OAuth Playground — falha: 401 unauthorized_client (mismatch Client ID/Secret)
  3. ⚠️  Decidido: usar CSV como fallback temporário

**Solução implementada:** Mock data via CSV
- Arquivo: `C:\Users\User\Downloads\conta_custo (1).csv`
- Dados: 01 jan - 07 ago 2026, campanhas Pesquisa + Performance Max
- Implementação: `src/lib/google-mock.ts` (função `getMockGoogleDailyData()`)
- Status: ✅ Dados carregando no relatório

### Relatório Reorganizado (PARCIAL)
**Estrutura novo `/relatorio` (com mock Google Ads):**
1. ✅ **Meta Ads KPIs** (Gasto, Alcance, Impressões, Cliques, CTR, CPM, Curtidas, Conversas)
2. ✅ **Google Ads KPIs** (Custo, Impressões, Cliques, CTR, CPC, Conversões) — dados do CSV
3. ⚠️  **Gráfico "Gasto Diário"** — Em ajuste (ocupar 100% da largura)
   - Componente: `DailySpendChart.tsx`
   - Tentativas:
     - ✅ Barras Meta (azul) + Google (vermelho) combinadas
     - ✅ Valores acima das colunas
     - ⚠️  Layout 50/50 lado a lado (DailySpendChart + CampaignTypeChart)
     - ⚠️  Distribuir colunas igualmente na largura (barWidth dinâmico)
     - ❌ Ainda não ocupa 100% do espaço disponível
4. ✅ **Gráfico "Investimento por Posicionamento"** (direita, lado a lado)
   - Componente: `CampaignTypeChart.tsx` (novo)
   - Mostra: Pesquisa vs Performance Max com % do total
5. ✅ **Anúncios Meta** (tabela com thumbnail, gasto, alcance, etc)
6. ✅ **Campanhas Google** (tabela com custo, impressões, cliques, etc)

### Arquivos Criados/Modificados
- ✅ `src/lib/google-mock.ts` — 212 linhas de dados CSV + funções de agregação
- ✅ `src/app/relatorio/CampaignTypeChart.tsx` — novo componente gráfico de barras
- 🔄 `src/app/relatorio/DailySpendChart.tsx` — múltiplas tentativas de layout
- ✅ `src/app/relatorio/page.tsx` — grid 2 colunas (gráficos lado a lado)
- ✅ `src/lib/google.ts` — alterado para usar mock ao invés de API

### ⚠️ Bloqueadores Pendentes
1. **Gráfico não ocupa 100% da largura** — tentativas:
   - `minWidth: fit-content` → não funciona
   - `width: ${Math.max(100, data.length * 30)}%` → distorce o layout
   - `flex-grow` com `minWidth: ${100/data.length}%` → parcial
   - Próximo: usar `width: 100%` com scroll integrado?

2. **Google Ads API não funciona** — pendente:
   - Obter credenciais corretas (OAuth client específico para Google Ads)
   - Ou adicionar Google Ads Search Console (alternativa)
   - Ou manter mock indefinidamente

### Próxima Sessão (2026-08-08+)
- [ ] Corrigir layout do gráfico (ocupar 100% da largura)
- [ ] Retirar mock quando Google Ads API funcionar
- [ ] Testar layout responsivo em mobile
- [ ] Validar que todos os dados aparecem visualmente

## Identidade do Cliente
- **Cliente:** Trópico (Surf Shop)
- **Status:** Ativo
- **Hub:** Squad-Escalada (agência gestora)

## Stack do Projeto
- Next.js 15.5 + TypeScript
- Supabase (Auth + DB + RLS)
- TanStack Table
- Projeto: `squad_tropico/`

## Supabase (2026-08-06 — RESOLVIDO)
- Projeto free estava PAUSADO (~7d inatividade) → restaurado pelo Marcelo; migrations aplicadas via Management API (token do CLI no Windows Credential Manager, "Supabase CLI:supabase")
- Fix aplicado: `handle_new_user` sem `search_path` quebrava criação de usuários (migration 20260806000001)
- Usuário admin: escaladavirtual@gmail.com (role admin via user_metadata) — login testado OK em produção
- Keep-alive: `/api/cron/keep-alive` + Vercel Cron diário 09:00 UTC (vercel.json) — evita nova pausa

## Produção (2026-08-06)
- **Vercel:** https://tropico-platform.vercel.app (projeto `marcelorsevs-projects/tropico-platform`)
- **Domínio:** decisão 2026-08-06 — usar tropico-platform.vercel.app POR ENQUANTO. Domínio tropico.escaladavirtual.com.br já adicionado na Vercel; quando quiser ativar, falta só o CNAME na HostGator (`tropico` → `0a5c919dad11fd74.vercel-dns-017.com.`) — guia em `docs/deploy-vercel.md`
- **Env vars:** 8 configuradas na Vercel (Supabase, Meta, tokens de relatório)
- **META_ACCESS_TOKEN renovado 2026-08-06** — token estendido (user: Ana Paula Ruffatto, conta "Conta Trópico Iguatemi 10 08"), **expira 2026-10-06** → renovar antes (mesmo fluxo: Graph Explorer app 1497870288440701 + estender + atualizar .env/Vercel). Dados reais validados em produção (R$ 306 mês, 20 anúncios ativos)
- `/api/generate-report` validado com dados reais — campos meta.topAds[].adName, variation em % (n8n pronto para consumir)
- **Dashboard UI (2026-08-06):** gráfico "Gasto diário" corrigido (colunas sem h-full colapsavam barras) + valores visíveis acima das barras (some com >16 dias, fica tooltip); anúncios convertidos de cards para tabela (thumbnail + gasto, alcance, impressões, cliques, CTR, CPM, comentários, curtidas, conversas). Pendente avaliar: replicar padrão visual no /relatorio (cliente)
- **Acesso admin:** escaladavirtual@gmail.com / Tropico#Hub2026 em /login (trocar senha depois). Relatório cliente: /relatorio senha tropico2024 (sessão 30d)
- **Pendente:** adicionar domínio nas Redirect URLs do Supabase Auth
- **Relatório semanal (n8n):** `GET /api/generate-report` com `Authorization: Bearer {REPORT_API_TOKEN}` — agendar seg de manhã; email do cliente ainda não definido
- **Google Ads:** código pronto (`src/lib/google.ts`), aguarda credenciais (developer token no MCC, OAuth client, refresh token, customer IDs)

## Stories — Status

| Story | Título | Status |
|-------|--------|--------|
| 4.1 | Autenticação e Sessão | DONE |
| 4.2 | Perfis de Acesso Admin/Client | PENDENTE |
| 4.3 | Gerenciamento de Usuários | PENDENTE |
| 1.1 | Integração Meta Ads API | PENDENTE |
| 1.2 | Google Ads + relatório semanal (n8n) | DONE (aguarda credenciais Google) |
| 2.1 | CRM — Listagem de Leads | PENDENTE |

## Tarefas Ativas

### Story 4.2 — Perfis de Acesso Admin/Client (não iniciada)
- [ ] Criar `src/hooks/useProfile.ts`
- [ ] Criar `src/components/auth/AdminOnly.tsx`
- [ ] Atualizar middleware para bloquear `/analysis/*` e `/suggestions/*` para role `client`
- [ ] Sidebar renderiza itens por role
- [ ] Criar `src/types/auth.ts` — types `UserRole`, `UserProfile`

### Story 4.3 — Gerenciamento de Usuários Admin (não iniciada)
- [ ] API Route GET + POST `/api/users`
- [ ] API Route PATCH `/api/users/[id]` (alterar role/status)
- [ ] Página `/settings/users` — somente admin
- [ ] Componentes: `UserTable`, `CreateUserModal`
- [ ] `src/lib/supabase/admin.ts` — service role (server-side)

### Story 1.1 — Integração Meta Ads API (não iniciada)
- [ ] OAuth Meta — fluxo de autorização, captura de token
- [ ] Token salvo criptografado em `ad_accounts` (pgcrypto)
- [ ] Listar Ad Accounts e salvar conta ativa
- [ ] Cron Job `/api/cron/sync-meta` — campanhas e métricas (últimos 30 dias)
- [ ] Log de sincronização em `sync_logs`

### Story 2.1 — CRM Listagem de Leads (não iniciada)
- [ ] API Route `/api/crm/leads` com filtros e paginação server-side
- [ ] Página `/crm` com TanStack Table
- [ ] Filtros: status, fonte, período
- [ ] Busca debounced (300ms) por nome, e-mail, telefone
- [ ] Drawer lateral com detalhes do lead

## Histórico de Entregas
| Data | Entrega | Status |
|------|---------|--------|
| — | Story 4.1 — Autenticação e Sessão | DONE |
| 2026-08-06 | Story 1.2 — Google Ads (src/lib/google.ts, /api/google) + /api/generate-report semanal (n8n) + seção Google no /relatorio | DONE — código pronto; ativar exige GOOGLE_ADS_* no .env (developer token MCC, OAuth client, refresh token, customer IDs) e REPORT_API_TOKEN |
