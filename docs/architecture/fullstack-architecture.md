# Arquitetura Fullstack — Plataforma Marketing Intelligence & CRM
## Tropico Surf Shop

**Versão:** 1.0
**Data:** 2026-03-26
**Status:** Draft
**Arquiteto:** Aria (AIOX Architect)
**Referência:** PRD v1.0 — docs/prd/tropico-surfshop-prd.md

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                     │
│              Next.js 15 App Router + Tailwind CSS            │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Dashboard  │  │     CRM      │  │  Análise IA (ADM) │  │
│  │  KPIs/Gráf  │  │    Leads     │  │  Sugestões(ADM)   │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS / API Routes
┌───────────────────────────▼─────────────────────────────────┐
│                   BACKEND — Next.js API Routes               │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │   Auth   │  │ Dashboard│  │   CRM    │  │    AI     │  │
│  │ Supabase │  │  Service │  │ Service  │  │  Service  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Integration Layer                       │  │
│  │  Meta Ads API │ Google Ads API │ GA4 API │ Meta Lead  │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                  SUPABASE (BaaS)                             │
│  PostgreSQL │ Auth │ Edge Functions │ Realtime │ Storage     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Stack Tecnológico

### Frontend
| Tecnologia | Versão | Justificativa |
|-----------|--------|---------------|
| **Next.js** | 15 (App Router) | SSR/SSG, API routes nativas, ecosystem maduro |
| **TypeScript** | 5.x | Type safety obrigatório |
| **Tailwind CSS** | 4.x | Produtividade de estilo, consistência |
| **shadcn/ui** | latest | Componentes acessíveis e customizáveis |
| **Recharts** | 2.x | Gráficos de performance de campanhas |
| **TanStack Query** | 5.x | Cache de dados, sincronização de estado servidor |
| **TanStack Table** | 8.x | Tabelas do CRM com ordenação/filtros |
| **Zustand** | 5.x | Estado global leve (filtros, UI state) |
| **React Hook Form + Zod** | latest | Forms com validação type-safe |

### Backend (Next.js API Routes)
| Tecnologia | Versão | Justificativa |
|-----------|--------|---------------|
| **Next.js API Routes** | 15 | Colocado com frontend, sem servidor separado |
| **Supabase JS Client** | 2.x | Acesso ao banco com RLS automático |
| **Zod** | 3.x | Validação de inputs em todas as rotas |

### Banco de Dados / BaaS
| Tecnologia | Justificativa |
|-----------|---------------|
| **Supabase** | PostgreSQL + Auth + RLS + Storage — tudo em um |
| **PostgreSQL 15+** | Banco relacional robusto, JSON nativo |
| **Supabase Auth** | JWT, email/senha, controle de sessões |
| **Row Level Security (RLS)** | Segurança no banco: admin vê tudo, cliente vê só o seu |

### Integrações Externas
| API | SDK / Método | Uso |
|-----|-------------|-----|
| **Meta Marketing API** | `facebook-nodejs-business-sdk` | Campanhas, adsets, leads |
| **Google Ads API** | `google-ads-api` (npm) | Campanhas, palavras-chave |
| **Google Analytics 4** | `@google-analytics/data` | Sessões, eventos, conversões |
| **OpenAI / Anthropic** | `openai` ou `@anthropic-ai/sdk` | Geração de sugestões de melhoria |

### Infraestrutura / Deploy
| Serviço | Uso |
|--------|-----|
| **Vercel** | Deploy do Next.js (preview + produção automáticos) |
| **Supabase Cloud** | DB + Auth + Edge Functions (hosted) |
| **GitHub** | Repositório + CI/CD via GitHub Actions |
| **Vercel Cron Jobs** | Sincronização agendada de dados de APIs externas |

---

## 3. Arquitetura de Autenticação e Autorização

### Perfis de Acesso
```
┌──────────────────────────────────────────┐
│              Supabase Auth                │
│                                          │
│  user_metadata.role = 'admin'            │
│  user_metadata.role = 'client'           │
│                                          │
│  JWT inclui role → verificado no RLS     │
└──────────────────────────────────────────┘
```

### Controle de Acesso por Rota (Next.js Middleware)
```typescript
// middleware.ts
// Rotas protegidas por role:
// /dashboard/*        → admin + client
// /crm/*              → admin + client (client: read-only)
// /analysis/*         → admin ONLY
// /suggestions/*      → admin ONLY
// /settings/*         → admin ONLY
```

### RLS (Row Level Security) no Supabase
```sql
-- Exemplo: leads são visíveis para todos autenticados
-- mas somente admin pode deletar
CREATE POLICY "leads_read" ON leads
  FOR SELECT USING (auth.role() IN ('admin', 'client'));

CREATE POLICY "leads_write" ON leads
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 4. Arquitetura de Dados (Alto Nível)

> Schema detalhado: delegar a **@data-engineer**

### Entidades Principais
```
users               → perfis de acesso (admin/client)
leads               → contatos do CRM
lead_sources        → origem (site, instagram, whatsapp)
lead_interactions   → histórico de contato

ad_accounts         → contas de anúncio conectadas
campaigns           → campanhas sincronizadas
campaign_metrics    → métricas diárias por campanha (snapshot)
ad_suggestions      → sugestões de IA geradas
suggestion_feedback → feedback em sugestões (aplicada/ignorada)

sync_logs           → log de sincronizações com APIs externas
```

### Estratégia de Sincronização de Dados
```
┌─────────────────────────────────────────────┐
│           Vercel Cron Jobs                   │
│                                             │
│  /api/cron/sync-meta     → a cada 6h        │
│  /api/cron/sync-google   → a cada 6h        │
│  /api/cron/sync-ga4      → a cada 24h       │
│                                             │
│  Dados salvos em campaign_metrics (PostgreSQL)│
│  TTL: 90 dias de histórico                  │
└─────────────────────────────────────────────┘
```

---

## 5. Arquitetura de Integrações

### Meta Ads API
```
Autenticação: OAuth 2.0 (Long-lived User Access Token)
Scopes: ads_read, leads_retrieval, instagram_manage_messages
Endpoints:
  GET /{ad-account-id}/campaigns
  GET /{ad-account-id}/insights
  GET /{form-id}/leads
Rate Limit: 200 calls/hora por token
```

### Google Ads API
```
Autenticação: OAuth 2.0 (Service Account ou User Account)
SDK: google-ads-api (npm)
Recursos:
  Campaign.resource_name, metrics.impressions, metrics.clicks
  metrics.cost_micros, metrics.conversions, metrics.roas
Rate Limit: gerenciado pelo SDK automaticamente
```

### GA4 Data API
```
Autenticação: Service Account JSON (Google Cloud)
SDK: @google-analytics/data
Relatórios:
  sessions, users, newUsers, bounceRate
  eventCount por tipo, conversions, sessionSource
Janela de dados: até 14 meses
```

### Captação de Leads (Site Tropico)
```
Opção A (recomendada): Webhook via n8n/Zapier
  Site → formulário submit → webhook → POST /api/leads/inbound

Opção B: Integração direta com Loja Integrada
  Loja Integrada API → sincronização de pedidos como leads
```

---

## 6. Estrutura de Pastas do Projeto

```
tropico-platform/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Rotas de autenticação
│   │   │   ├── login/
│   │   │   └── logout/
│   │   ├── (dashboard)/              # Área protegida
│   │   │   ├── layout.tsx            # Layout com sidebar + auth guard
│   │   │   ├── dashboard/            # KPIs principais
│   │   │   ├── campaigns/            # Campanhas por plataforma
│   │   │   ├── crm/                  # Gestão de leads
│   │   │   ├── analysis/             # (ADMIN ONLY) Análise avançada
│   │   │   └── suggestions/          # (ADMIN ONLY) Sugestões de IA
│   │   └── api/                      # API Routes
│   │       ├── auth/
│   │       ├── dashboard/
│   │       ├── campaigns/
│   │       ├── crm/
│   │       ├── leads/
│   │       │   └── inbound/          # Webhook de leads do site
│   │       ├── suggestions/
│   │       └── cron/                 # Cron jobs de sincronização
│   │           ├── sync-meta/
│   │           ├── sync-google/
│   │           └── sync-ga4/
│   ├── components/
│   │   ├── ui/                       # shadcn/ui base components
│   │   ├── charts/                   # Recharts wrappers
│   │   ├── crm/                      # Componentes do CRM
│   │   └── campaigns/                # Componentes de campanhas
│   ├── lib/
│   │   ├── supabase/                 # Client, server, middleware
│   │   ├── integrations/
│   │   │   ├── meta-ads.ts
│   │   │   ├── google-ads.ts
│   │   │   └── ga4.ts
│   │   ├── ai/
│   │   │   └── suggestions.ts        # Engine de sugestões
│   │   └── utils/
│   ├── types/                        # TypeScript types globais
│   └── middleware.ts                 # Auth + role guard
├── supabase/
│   ├── migrations/                   # Schema migrations
│   └── seed.sql
├── tests/
│   ├── unit/
│   └── integration/
└── docs/                             # Documentação técnica
```

---

## 7. Arquitetura do Módulo de IA (Sugestões)

```
┌──────────────────────────────────────────────┐
│              AI Suggestions Engine            │
│                                              │
│  Input:                                      │
│    campaign_metrics (últimos 30 dias)        │
│    benchmarks do setor (surf/skate)          │
│    histórico de sugestões anteriores         │
│                                              │
│  Processamento:                              │
│    1. Score de performance (regras fixas)    │
│    2. Detecção de anomalias                  │
│    3. Prompt estruturado → LLM               │
│    4. Parse e validação da resposta          │
│                                              │
│  Output:                                     │
│    Sugestão categorizada:                    │
│      - PÚBLICO (ajuste de segmentação)       │
│      - CRIATIVO (trocar anúncio/copy)        │
│      - ORÇAMENTO (redistribuir verba)        │
│      - BID (ajuste de lance)                 │
│      - PAUSA (campanha abaixo do benchmark)  │
│                                              │
│  LLM: Claude claude-sonnet-4-6 (via Anthropic API)   │
└──────────────────────────────────────────────┘
```

---

## 8. Segurança

| Camada | Medida |
|--------|--------|
| **Autenticação** | Supabase Auth (JWT, refresh token automático) |
| **Autorização** | RLS no banco + middleware Next.js |
| **API Keys** | Armazenadas em Vercel Environment Variables (nunca no código) |
| **Tokens externos** | Meta/Google tokens criptografados no banco (pgcrypto) |
| **Rate Limiting** | Vercel Edge Middleware ou Upstash Redis |
| **Input Validation** | Zod em todas as API routes |
| **CORS** | Restrito ao domínio da plataforma |
| **Webhook** | Assinatura HMAC para validar origem (site Tropico) |

---

## 9. Performance

| Área | Estratégia |
|------|-----------|
| **Dados de campanhas** | Cache no PostgreSQL (snapshot diário) — sem chamadas live às APIs externas no dashboard |
| **Queries do dashboard** | Agregações pré-computadas via views materializadas |
| **Frontend** | TanStack Query com stale-while-revalidate (5 min) |
| **Imagens** | Next.js Image Optimization |
| **Bundle** | Code splitting automático por rota (App Router) |
| **DB Indexes** | Em campaign_metrics(account_id, date), leads(source, created_at) |

---

## 10. Decisões Arquiteturais

| Decisão | Escolha | Alternativa Descartada | Motivo |
|---------|---------|------------------------|--------|
| Backend | Next.js API Routes | FastAPI separado | Simplicidade, menos infra, time menor |
| Banco | Supabase/PostgreSQL | MongoDB | Relacional adequado, RLS nativo, Auth incluído |
| Frontend state | TanStack Query + Zustand | Redux | Menos boilerplate, adequado à escala |
| Gráficos | Recharts | Chart.js, D3 | Melhor integração React, API declarativa |
| Deploy | Vercel + Supabase Cloud | AWS | Menor custo operacional, zero DevOps |
| Sync dados | Cron Job (pull) | Webhooks das APIs | APIs externas não garantem webhooks confiáveis |
| IA sugestões | Claude claude-sonnet-4-6 | GPT-4o | Melhor custo/benefício para análise estruturada |

---

## 11. Próximos Passos

1. **@data-engineer** — Modelar schema completo (migrations Supabase)
2. **@ux-design-expert** — Wireframes das telas: Dashboard, CRM, Análise
3. **@sm** — Criar stories detalhadas por epic (iniciando pelo Epic 4 — Auth)
4. **@dev** — Setup do projeto Next.js + Supabase (scaffolding inicial)

---

*Synkra AIOX — Squad Tropico | Arquitetura v1.0 | 2026-03-26*
