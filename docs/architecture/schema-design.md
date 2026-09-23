# Schema Design — Tropico Surf Shop Platform
## Banco de Dados: PostgreSQL via Supabase

**Versão:** 1.0
**Data:** 2026-03-26
**Autor:** Dara (AIOX Data Engineer)
**Migrations:** `supabase/migrations/`

---

## Diagrama ER (Simplificado)

```
auth.users (Supabase Auth)
    │
    ▼ (1:1)
profiles ──────────────────────────────────────────────┐
  id, role (admin|client), full_name                   │
                                                        │ assigned_to
ad_accounts                                             │
  id, platform, account_id, account_name               │
  access_token_enc (pgcrypto)                           │
    │                                                   │
    ├──── (1:N) campaigns                               │
    │       id, name, status, objective, budget         │
    │           │                                       │
    │           └──── (1:N) campaign_metrics            │
    │                   id, metric_date, impressions,   │
    │                   clicks, spend, ctr, cpc, roas   │
    │                   (snapshot diário)               │
    │                                                   │
    └──── (1:N) ad_suggestions                         │
              id, category, status, title, description  │
              priority, metric_snapshot (JSONB)         │
                                                        │
leads ◄─────────────────────────────────────────────────┘
  id, source, status, name, email, phone
  instagram_handle, message, product_ref
  utm_source, utm_medium, utm_campaign
  tags (TEXT[]), raw_payload (JSONB)
    │
    └──── (1:N) lead_interactions
              id, type, content, created_by

sync_logs
  id, platform, status, started_at, records_synced
```

---

## Tabelas

| Tabela | Linhas Estimadas | Crescimento | Retenção |
|--------|-----------------|-------------|---------|
| `profiles` | ~10 | Estático | Permanente |
| `ad_accounts` | ~5 | Estático | Permanente |
| `campaigns` | ~50-200 | Lento | Permanente |
| `campaign_metrics` | ~50K/ano | Alto | 90 dias |
| `leads` | ~500-2K/ano | Médio | Permanente |
| `lead_interactions` | ~2K/ano | Médio | Permanente |
| `ad_suggestions` | ~500/ano | Médio | 1 ano |
| `sync_logs` | ~2K/ano | Médio | 30 dias |

---

## Controle de Acesso (RLS)

| Tabela | Admin | Client |
|--------|-------|--------|
| `profiles` | CRUD (todos) | SELECT (próprio) + UPDATE (próprio) |
| `ad_accounts` | CRUD | SELECT (sem tokens) |
| `campaigns` | CRUD | SELECT |
| `campaign_metrics` | CRUD | SELECT |
| `leads` | CRUD | SELECT (não deletados) |
| `lead_interactions` | CRUD | SELECT |
| `ad_suggestions` | CRUD | **BLOQUEADO** |
| `sync_logs` | CRUD | **BLOQUEADO** |

---

## Segurança

- **Tokens de API** (Meta, Google) armazenados criptografados com `pgcrypto.encrypt()`
- **RLS ativo** em todas as tabelas — nenhuma tabela exposta sem policy
- **Soft delete** em `leads` — `deleted_at IS NOT NULL` = oculto
- **SECURITY DEFINER** na função `auth_user_role()` — performance + segurança
- **Trigger automático** cria `profiles` ao criar usuário no Supabase Auth

---

## Convenções

- Todas as PKs: `UUID` com `uuid_generate_v4()`
- Todos os timestamps: `TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at` atualizado automaticamente via trigger
- Payloads externos: coluna `raw_payload JSONB` para auditoria
- IDs externos de plataformas: `external_id TEXT` + `UNIQUE (platform, external_id)`

---

## Migrations

| Arquivo | Descrição |
|---------|-----------|
| `20260326000001_initial_schema.sql` | Schema completo (tabelas, índices, triggers) |
| `20260326000002_rls_policies.sql` | Todas as políticas RLS |

---

*Synkra AIOX — Squad Tropico | Schema v1.0 | 2026-03-26*
