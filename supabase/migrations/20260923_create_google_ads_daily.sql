-- Google Ads → Supabase (Trópico)
-- Projeto Supabase compartilhado entre clientes (escalada-virtual / pbdhkqvxbpmawubihugb).
-- Convenção multi-cliente: {cliente}_{dominio}_{entidade}.
-- RLS habilitado SEM policies: anon/authenticated não leem nada; apenas o
-- service_role (server-side) acessa, o que impede vazamento entre clientes.

CREATE TABLE IF NOT EXISTS public.tropico_google_ads_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  client_name TEXT DEFAULT 'Trópico',
  campaign_id TEXT,
  campaign_name TEXT,
  ad_group_id TEXT,
  ad_group_name TEXT,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions NUMERIC DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  date DATE NOT NULL,
  synced_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (customer_id, campaign_id, ad_group_id, date)
);

CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_daily_date     ON public.tropico_google_ads_daily (date DESC);
CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_daily_customer ON public.tropico_google_ads_daily (customer_id);
CREATE INDEX IF NOT EXISTS idx_tropico_google_ads_daily_campaign ON public.tropico_google_ads_daily (campaign_id);

CREATE TABLE IF NOT EXISTS public.tropico_google_ads_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  client_name TEXT DEFAULT 'Trópico',
  sync_date DATE NOT NULL,
  records_synced INT DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  error_message TEXT,
  synced_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (customer_id, sync_date)
);

CREATE OR REPLACE FUNCTION public.tropico_google_ads_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tropico_google_ads_daily_updated_at ON public.tropico_google_ads_daily;
CREATE TRIGGER trg_tropico_google_ads_daily_updated_at
  BEFORE UPDATE ON public.tropico_google_ads_daily
  FOR EACH ROW EXECUTE FUNCTION public.tropico_google_ads_set_updated_at();

ALTER TABLE public.tropico_google_ads_daily    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tropico_google_ads_sync_log ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.tropico_google_ads_daily IS
  'Métricas diárias Google Ads por grupo de anúncios — cliente Trópico. Escrita: /api/cron/sync-google-ads (service_role).';
COMMENT ON TABLE public.tropico_google_ads_sync_log IS
  'Auditoria das execuções do sync Google Ads — cliente Trópico.';
