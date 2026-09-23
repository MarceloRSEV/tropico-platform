# PRD — Plataforma de Marketing Intelligence & CRM
## Tropico Surf Shop

**Versão:** 1.0
**Data:** 2026-03-26
**Status:** Draft
**Owner:** Squad Tropico
**Cliente:** Tropico Surf Shop — Caxias do Sul, RS

---

## 1. Visão do Produto

A Tropico Surf Shop é uma loja de artigos de surf e skate com presença física no Shopping San Pelegri (Caxias do Sul - RS) e e-commerce próprio em tropicosurfshop.com.br. O objetivo é construir uma **plataforma centralizada de Marketing Intelligence e CRM** que consolide dados de campanhas pagas, analise performance e concentre todos os contatos gerados pelo site e Instagram, com dois níveis de acesso: admin (agência/operador) e cliente (Tropico).

### Missão
Transformar a operação de marketing digital da Tropico em um sistema orientado por dados, onde campanhas são analisadas automaticamente, leads são organizados em um CRM centralizado e sugestões de melhoria são geradas com inteligência — reduzindo esforço operacional e aumentando o ROI das campanhas.

---

## 2. Problema

| Problema | Impacto |
|---------|---------|
| Dados de Meta Ads, Google Ads e GA4 fragmentados em plataformas distintas | Análise manual, decisões lentas, sem visão unificada |
| Contatos do site e Instagram sem centralização | Perda de leads, sem histórico de relacionamento |
| Nenhum processo de avaliação estruturada de campanhas | Baixa otimização, desperdício de verba |
| Cliente sem visibilidade clara dos resultados | Falta de transparência, dificuldade de justificar investimento |
| Sugestões de melhoria dependem de análise manual da agência | Lento, sujeito a erro humano |

---

## 3. Solução

Uma plataforma web fullstack com **duas camadas de acesso** (admin e cliente) que integra Meta Ads, Google Ads e GA4 para visualização unificada de dados, possui CRM nativo para gestão de leads, avalia campanhas automaticamente e sugere melhorias baseadas em dados.

---

## 4. Usuários

| Perfil | Acesso | Necessidade Principal |
|--------|--------|----------------------|
| **Admin (Agência/Operador)** | Completo | Análise profunda, sugestões de melhoria, gestão de CRM, configurações |
| **Cliente (Tropico)** | Restrito | Visão consolidada de resultados, leads recebidos, performance de campanhas |

---

## 5. Epics e Features

### Epic 1 — Dashboard de Marketing Intelligence (PRIORIDADE 1)
**Objetivo:** Visualização unificada de dados de Meta Ads, Google Ads e GA4 em um único painel.

**Features:**
- Conexão com Meta Ads API (campanhas, adsets, anúncios, gastos, CTR, ROAS)
- Conexão com Google Ads API (campanhas, palavras-chave, conversões, CPC)
- Conexão com Google Analytics 4 (sessões, usuários, eventos, conversões, canais)
- Dashboard principal com KPIs consolidados (período configurável)
- Gráficos de performance por canal, campanha e período
- Comparativo de períodos (semana/mês/trimestre)
- Exportação de relatórios (PDF / CSV)

**Stories:**
- 1.1 Integração Meta Ads API
- 1.2 Integração Google Ads API
- 1.3 Integração GA4 API
- 1.4 Dashboard principal de KPIs
- 1.5 Visualizações por canal e campanha
- 1.6 Comparativo de períodos
- 1.7 Exportação de relatórios

---

### Epic 2 — CRM de Leads (PRIORIDADE 2)
**Objetivo:** Centralizar todos os contatos gerados pelo site e Instagram em um CRM operacional.

**Fontes de Leads:**
- Formulário "Fale Conosco" do site (tropicosurfshop.com.br)
- Newsletter / opt-in de e-mail do site
- Notificações de back-in-stock (e-mail)
- Instagram Direct / comentários (via integração Meta)
- WhatsApp (+55 54 99128-4962) — manual ou via integração

**Features:**
- Listagem de contatos com filtros (fonte, status, data, tags)
- Perfil de lead com histórico de interações
- Pipeline de status (Novo → Em contato → Qualificado → Convertido → Perdido)
- Tags e segmentação de leads
- Importação manual de contatos (CSV)
- Notificações de novos leads

**Stories:**
- 2.1 Estrutura do CRM (modelo de dados, listagem, filtros)
- 2.2 Integração formulário site (webhook/API)
- 2.3 Integração leads Instagram (Meta API)
- 2.4 Pipeline de status e gestão de contatos
- 2.5 Notificações de novos leads (e-mail/push)

---

### Epic 3 — Análise e Sugestão de Campanhas (PRIORIDADE 3 — Somente Admin)
**Objetivo:** Avaliar automaticamente as campanhas ativas e sugerir melhorias baseadas em dados.

**Features:**
- Score de performance por campanha (baseado em métricas configuráveis)
- Detecção automática de campanhas com performance abaixo do benchmark
- Sugestões de melhoria geradas por IA (ajuste de público, criativo, orçamento, bid)
- Histórico de sugestões aplicadas vs. resultado obtido
- Alertas de anomalias (queda brusca de CTR, aumento de CPL, etc.)
- Comparativo com benchmarks do setor (surf/skate/streetwear)

**Stories:**
- 3.1 Sistema de score de campanhas
- 3.2 Engine de detecção de underperformance
- 3.3 Geração de sugestões por IA (LLM integrado)
- 3.4 Histórico de sugestões e resultados
- 3.5 Sistema de alertas de anomalias

---

### Epic 4 — Sistema de Acesso e Permissões (PRIORIDADE 1 — base da plataforma)
**Objetivo:** Controle de acesso por perfil com abas exclusivas para admin.

**Perfis:**
- **Admin:** Acesso total — todas as abas incluindo Análise IA e Sugestões de Melhoria
- **Cliente:** Acesso restrito — Dashboard de resultados e CRM (somente visualização de leads)

**Features:**
- Autenticação segura (e-mail + senha / SSO)
- Gerenciamento de usuários (criar, editar, desativar)
- Controle de permissões por perfil
- Abas visíveis apenas para admin: "Análise Avançada" e "Sugestões de Melhoria"
- Logs de acesso e ações

**Stories:**
- 4.1 Autenticação e gerenciamento de sessão
- 4.2 Perfis de acesso (admin / cliente)
- 4.3 Controle de abas por perfil
- 4.4 Gerenciamento de usuários (admin)

---

## 6. Arquitetura Técnica (Alto Nível)

| Camada | Tecnologia Sugerida |
|--------|---------------------|
| **Frontend** | Next.js 15 + Tailwind CSS |
| **Backend** | Node.js / Next.js API Routes ou FastAPI |
| **Banco de Dados** | PostgreSQL (via Supabase) |
| **Autenticação** | Supabase Auth |
| **Integrações** | Meta Marketing API, Google Ads API, GA4 Data API |
| **IA / Sugestões** | OpenAI API (GPT-4) ou Anthropic Claude |
| **Hospedagem** | Vercel (frontend) + Supabase (backend/DB) |
| **Webhooks** | n8n ou Zapier para captação de leads |

---

## 7. Informações do Cliente

| Item | Detalhe |
|------|---------|
| **Razão Social** | Tropico Surf Shop |
| **CNPJ** | 28.677.750/0001-11 |
| **Endereço** | Av. Rio Branco 425, Loja 316 — Shopping San Pelegri, Caxias do Sul - RS |
| **Site** | https://www.tropicosurfshop.com.br |
| **Instagram** | @tropicocaxias |
| **Facebook** | tropico.surfshop |
| **WhatsApp** | +55 54 99128-4962 |
| **Plataforma E-commerce** | Loja Integrada |
| **Marcas** | Vans, Element, RipCurl, Billabong, Quiksilver, Vissla |

---

## 8. Público-Alvo da Tropico

| Perfil | Detalhe |
|--------|---------|
| **Faixa etária** | 16–35 anos |
| **Interesses** | Surf, skate, streetwear, lifestyle urbano |
| **Localização primária** | Caxias do Sul e região — Rio Grande do Sul |
| **Cobertura online** | Nacional (e-commerce) |

---

## 9. Métricas de Sucesso

| Métrica | Meta |
|---------|------|
| Tempo para visualizar KPIs de campanhas | < 2 minutos após login |
| Leads centralizados no CRM | 100% dos contatos de site + Instagram |
| Sugestões de melhoria geradas por mês | ≥ 10 por conta de anúncio ativa |
| Redução de tempo de análise manual | ≥ 50% |
| Satisfação do cliente (NPS) | ≥ 8 |

---

## 10. Restrições e Premissas

- Cliente precisa fornecer acesso às contas de Meta Ads, Google Ads e GA4
- A plataforma é white-label para uso interno (não é SaaS público neste momento)
- Dados de campanhas são somente leitura (sem criação/edição de campanhas na plataforma v1)
- Integração com WhatsApp é MVP+2 (fora do escopo inicial)
- Sugestões de IA são advisory (não executam ações automaticamente)

---

## 11. Fora do Escopo (v1)

- Criação ou edição de campanhas diretamente na plataforma
- Integração com WhatsApp Business API
- App mobile
- Integração com PDV (ponto de venda físico)
- Automação de e-mail marketing

---

## 12. Próximos Passos

1. **@architect** — Definir arquitetura técnica detalhada e stack final
2. **@data-engineer** — Modelar schema do banco (leads, campanhas, usuários)
3. **@sm** — Criar stories detalhadas por epic
4. **@ux-design-expert** — Wireframes das telas principais (dashboard, CRM, análise)
5. **@dev** — Iniciar implementação pelo Epic 4 (auth) → Epic 1 (dashboard) → Epic 2 (CRM)

---

*Synkra AIOX — Squad Tropico | PRD v1.0 | 2026-03-26*
