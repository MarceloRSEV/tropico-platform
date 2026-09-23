-- ============================================================
-- Migration: 20260811000001_google_ads_daily
-- Projeto: Tropico Surf Shop — Sincronização de Google Ads
-- Autor: Claude Code (Data Sync)
-- Data: 2026-08-11
-- ============================================================

-- ============================================================
-- TABELA: google_ads_daily
-- ============================================================

CREATE TABLE IF NOT EXISTS google_ads_daily (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  data          DATE NOT NULL UNIQUE,
  custo         NUMERIC(12,2) DEFAULT 0,    -- Custo em reais (R$)
  impressoes    BIGINT DEFAULT 0,
  cliques       BIGINT DEFAULT 0,
  conversoes    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE google_ads_daily IS 'Snapshot diário de métricas do Google Ads — sincronizado via cron job';
COMMENT ON COLUMN google_ads_daily.data IS 'Data do relatório (YYYY-MM-DD)';
COMMENT ON COLUMN google_ads_daily.custo IS 'Gasto total em reais';

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_google_ads_daily_date ON google_ads_daily(data DESC);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================

CREATE TRIGGER trg_google_ads_daily_updated_at
  BEFORE UPDATE ON google_ads_daily
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
