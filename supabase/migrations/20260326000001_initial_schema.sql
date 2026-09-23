-- ============================================================
-- Migration: 20260326000001_initial_schema
-- Projeto: Tropico Surf Shop — Marketing Intelligence & CRM
-- Autor: Dara (AIOX Data Engineer)
-- Data: 2026-03-26
-- ============================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Full-text search em leads

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'client');

CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'qualified',
  'converted',
  'lost'
);

CREATE TYPE lead_source AS ENUM (
  'site_form',
  'site_newsletter',
  'site_back_in_stock',
  'instagram_direct',
  'instagram_comment',
  'whatsapp',
  'manual'
);

CREATE TYPE ad_platform AS ENUM (
  'meta',
  'google',
  'ga4'
);

CREATE TYPE suggestion_category AS ENUM (
  'audience',
  'creative',
  'budget',
  'bid',
  'pause'
);

CREATE TYPE suggestion_status AS ENUM (
  'pending',
  'applied',
  'ignored',
  'dismissed'
);

CREATE TYPE sync_status AS ENUM (
  'running',
  'success',
  'error',
  'partial'
);

-- ============================================================
-- TABELA: profiles (extensão do auth.users do Supabase)
-- ============================================================

CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        user_role NOT NULL DEFAULT 'client',
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE profiles IS 'Perfis de usuários da plataforma (admin=agência, client=Tropico)';
COMMENT ON COLUMN profiles.role IS 'admin: acesso total | client: somente leitura de dashboard e CRM';

-- ============================================================
-- TABELA: ad_accounts (contas de anúncio conectadas)
-- ============================================================

CREATE TABLE ad_accounts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform         ad_platform NOT NULL,
  account_id       TEXT NOT NULL,          -- ID externo da plataforma
  account_name     TEXT NOT NULL,
  access_token_enc TEXT,                   -- Token criptografado com pgcrypto
  refresh_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, account_id)
);

COMMENT ON TABLE ad_accounts IS 'Contas de Meta Ads, Google Ads e GA4 conectadas à plataforma';
COMMENT ON COLUMN ad_accounts.access_token_enc IS 'Token de acesso criptografado com pgcrypto.encrypt()';

-- ============================================================
-- TABELA: campaigns (campanhas sincronizadas das APIs)
-- ============================================================

CREATE TABLE campaigns (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_account_id  UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  platform       ad_platform NOT NULL,
  external_id    TEXT NOT NULL,            -- ID da campanha na plataforma
  name           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'ACTIVE',
  objective      TEXT,
  daily_budget   NUMERIC(12,2),
  lifetime_budget NUMERIC(12,2),
  start_date     DATE,
  end_date       DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, external_id)
);

COMMENT ON TABLE campaigns IS 'Campanhas sincronizadas das plataformas de anúncios';

-- ============================================================
-- TABELA: campaign_metrics (snapshot diário de métricas)
-- ============================================================

CREATE TABLE campaign_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  ad_account_id   UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  platform        ad_platform NOT NULL,
  metric_date     DATE NOT NULL,

  -- Métricas universais
  impressions     BIGINT DEFAULT 0,
  clicks          BIGINT DEFAULT 0,
  spend           NUMERIC(12,2) DEFAULT 0,
  conversions     INTEGER DEFAULT 0,
  revenue         NUMERIC(12,2) DEFAULT 0,

  -- Métricas calculadas
  ctr             NUMERIC(8,4),   -- Click-through rate
  cpc             NUMERIC(10,2),  -- Custo por clique
  cpm             NUMERIC(10,2),  -- Custo por mil impressões
  cpl             NUMERIC(10,2),  -- Custo por lead
  roas            NUMERIC(8,4),   -- Return on ad spend

  -- Meta Ads específico
  reach           BIGINT,
  frequency       NUMERIC(6,2),
  link_clicks     BIGINT,

  -- Google Ads específico
  search_impression_share NUMERIC(6,4),
  quality_score   SMALLINT,

  -- GA4 específico
  sessions        BIGINT,
  users           BIGINT,
  new_users       BIGINT,
  bounce_rate     NUMERIC(6,4),
  avg_session_duration NUMERIC(10,2),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (campaign_id, metric_date)
);

COMMENT ON TABLE campaign_metrics IS 'Snapshot diário de métricas por campanha — alimentado pelos cron jobs de sincronização';

-- ============================================================
-- TABELA: leads (CRM central de contatos)
-- ============================================================

CREATE TABLE leads (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source        lead_source NOT NULL,
  status        lead_status NOT NULL DEFAULT 'new',

  -- Dados de contato
  name          TEXT,
  email         TEXT,
  phone         TEXT,
  instagram_handle TEXT,

  -- Dados de contexto
  subject       TEXT,                      -- Assunto do formulário ou mensagem
  message       TEXT,                      -- Mensagem original
  product_ref   TEXT,                      -- Produto de interesse (back-in-stock, etc.)
  utm_source    TEXT,                      -- UTM tracking
  utm_medium    TEXT,
  utm_campaign  TEXT,

  -- Metadados
  external_id   TEXT,                      -- ID externo (Instagram, etc.)
  raw_payload   JSONB,                     -- Payload original da fonte
  tags          TEXT[] DEFAULT '{}',
  notes         TEXT,

  -- Responsável
  assigned_to   UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Soft delete
  deleted_at    TIMESTAMPTZ,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE leads IS 'CRM central: todos os contatos do site, Instagram e outros canais';
COMMENT ON COLUMN leads.raw_payload IS 'Payload completo da fonte (para auditoria e reprocessamento)';

-- ============================================================
-- TABELA: lead_interactions (histórico de contato com lead)
-- ============================================================

CREATE TABLE lead_interactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,               -- 'email', 'phone', 'whatsapp', 'note', 'status_change'
  content     TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lead_interactions IS 'Histórico de todas as interações com um lead';

-- ============================================================
-- TABELA: ad_suggestions (sugestões geradas pela IA)
-- ============================================================

CREATE TABLE ad_suggestions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id     UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  ad_account_id   UUID NOT NULL REFERENCES ad_accounts(id) ON DELETE CASCADE,
  category        suggestion_category NOT NULL,
  status          suggestion_status NOT NULL DEFAULT 'pending',

  -- Conteúdo da sugestão
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  rationale       TEXT,                    -- Justificativa baseada em dados
  priority        SMALLINT DEFAULT 3,      -- 1=crítico, 2=alto, 3=médio, 4=baixo

  -- Métricas que embasaram a sugestão
  metric_snapshot JSONB,                   -- Snapshot das métricas analisadas

  -- Feedback de aplicação
  applied_at      TIMESTAMPTZ,
  applied_by      UUID REFERENCES profiles(id),
  result_notes    TEXT,                    -- Resultado observado após aplicar

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ad_suggestions IS 'Sugestões de melhoria de campanhas geradas pela IA — visível somente para admin';

-- ============================================================
-- TABELA: sync_logs (log de sincronizações com APIs externas)
-- ============================================================

CREATE TABLE sync_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform        ad_platform NOT NULL,
  ad_account_id   UUID REFERENCES ad_accounts(id) ON DELETE SET NULL,
  status          sync_status NOT NULL DEFAULT 'running',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  records_synced  INTEGER DEFAULT 0,
  error_message   TEXT,
  metadata        JSONB
);

COMMENT ON TABLE sync_logs IS 'Log de todas as sincronizações com Meta Ads, Google Ads e GA4';

-- ============================================================
-- INDEXES
-- ============================================================

-- profiles
CREATE INDEX idx_profiles_role ON profiles(role);

-- campaigns
CREATE INDEX idx_campaigns_ad_account ON campaigns(ad_account_id);
CREATE INDEX idx_campaigns_platform ON campaigns(platform);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- campaign_metrics (queries mais frequentes do dashboard)
CREATE INDEX idx_metrics_campaign_date ON campaign_metrics(campaign_id, metric_date DESC);
CREATE INDEX idx_metrics_account_date ON campaign_metrics(ad_account_id, metric_date DESC);
CREATE INDEX idx_metrics_platform_date ON campaign_metrics(platform, metric_date DESC);

-- leads (queries do CRM)
CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_source ON leads(source) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_assigned ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_created_at ON leads(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);

-- lead_interactions
CREATE INDEX idx_interactions_lead ON lead_interactions(lead_id, created_at DESC);

-- ad_suggestions
CREATE INDEX idx_suggestions_account ON ad_suggestions(ad_account_id);
CREATE INDEX idx_suggestions_status ON ad_suggestions(status);
CREATE INDEX idx_suggestions_campaign ON ad_suggestions(campaign_id);
CREATE INDEX idx_suggestions_priority ON ad_suggestions(priority, created_at DESC);

-- sync_logs
CREATE INDEX idx_sync_logs_platform ON sync_logs(platform, started_at DESC);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ad_accounts_updated_at
  BEFORE UPDATE ON ad_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_ad_suggestions_updated_at
  BEFORE UPDATE ON ad_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: criar profile automaticamente ao criar usuário
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'),
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
