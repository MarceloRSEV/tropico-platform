-- ============================================================
-- Migration: 20260326000002_rls_policies
-- Projeto: Tropico Surf Shop — Row Level Security
-- Autor: Dara (AIOX Data Engineer)
-- Data: 2026-03-26
-- ============================================================

-- ============================================================
-- HELPER FUNCTION: checar role do usuário autenticado
-- ============================================================

CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- HABILITAR RLS em todas as tabelas
-- ============================================================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns         ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_suggestions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs         ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: profiles
-- ============================================================

-- Usuário vê somente o próprio perfil
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Admin vê todos os perfis
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (auth_user_role() = 'admin');

-- Usuário atualiza somente o próprio perfil
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Somente admin pode criar/deletar usuários
CREATE POLICY "profiles_insert_admin"
  ON profiles FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "profiles_delete_admin"
  ON profiles FOR DELETE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- RLS: ad_accounts
-- ============================================================

-- Admin: CRUD completo
CREATE POLICY "ad_accounts_admin_all"
  ON ad_accounts FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

-- Client: somente leitura (sem tokens)
CREATE POLICY "ad_accounts_client_select"
  ON ad_accounts FOR SELECT
  USING (auth_user_role() = 'client');

-- ============================================================
-- RLS: campaigns
-- ============================================================

-- Todos os usuários autenticados podem ver campanhas
CREATE POLICY "campaigns_authenticated_select"
  ON campaigns FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Somente admin pode modificar campanhas
CREATE POLICY "campaigns_admin_write"
  ON campaigns FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "campaigns_admin_update"
  ON campaigns FOR UPDATE
  USING (auth_user_role() = 'admin');

CREATE POLICY "campaigns_admin_delete"
  ON campaigns FOR DELETE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- RLS: campaign_metrics
-- ============================================================

-- Todos os usuários autenticados podem ver métricas
CREATE POLICY "metrics_authenticated_select"
  ON campaign_metrics FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Somente admin (via service role / cron) pode inserir métricas
CREATE POLICY "metrics_admin_insert"
  ON campaign_metrics FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "metrics_admin_update"
  ON campaign_metrics FOR UPDATE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- RLS: leads
-- ============================================================

-- Todos os usuários autenticados veem leads não deletados
CREATE POLICY "leads_authenticated_select"
  ON leads FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
  );

-- Admin: CRUD completo (incluindo soft delete)
CREATE POLICY "leads_admin_insert"
  ON leads FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "leads_admin_update"
  ON leads FOR UPDATE
  USING (auth_user_role() = 'admin');

-- Client não pode deletar leads
CREATE POLICY "leads_admin_delete"
  ON leads FOR DELETE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- RLS: lead_interactions
-- ============================================================

-- Todos os usuários autenticados veem interações
CREATE POLICY "interactions_authenticated_select"
  ON lead_interactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Somente admin pode criar/editar interações
CREATE POLICY "interactions_admin_write"
  ON lead_interactions FOR INSERT
  WITH CHECK (auth_user_role() = 'admin');

CREATE POLICY "interactions_admin_update"
  ON lead_interactions FOR UPDATE
  USING (auth_user_role() = 'admin');

-- ============================================================
-- RLS: ad_suggestions (SOMENTE ADMIN)
-- ============================================================

CREATE POLICY "suggestions_admin_all"
  ON ad_suggestions FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');

-- Client NÃO tem acesso a sugestões
-- (nenhuma policy para 'client' = acesso negado por padrão)

-- ============================================================
-- RLS: sync_logs (SOMENTE ADMIN)
-- ============================================================

CREATE POLICY "sync_logs_admin_all"
  ON sync_logs FOR ALL
  USING (auth_user_role() = 'admin')
  WITH CHECK (auth_user_role() = 'admin');
