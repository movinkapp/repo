cat > CLAUDE.md << 'EOF'
# CLAUDE.md — Movink

## O que é
PWA mobile-first para tatuadores que fazem guest spots.
Gerencia spots, sessões, custos, lucro líquido e notificações automáticas D-7/D-3/D-1.

## Stack (imutável — nunca sugerir alternativas)
- Frontend: SvelteKit com Svelte 5 (runes: $state, $derived, $effect, onclick nativo)
- Backend/DB: Supabase (auth, postgres, RLS, edge functions em Deno)
- Deploy: Vercel
- Push: Web Push API + VAPID + Service Worker
- Monitoramento: Sentry (DSN via env var SENTRY_DSN)
- Imagens: Cloudinary (cloud: dkv4ttpok, preset: movink_sessions)
- Geocoding: Komoot Photon via proxy /api/photon

## Banco de dados
(colunas confirmadas pelo uso real no código — selects/inserts/updates)
- users: id, name, onboarding_completed, profile_image, base_currency, instagram, community_visible
- spots: id, user_id, studio_name, city, city_normalized, country, country_code, lat, lon, start_date, end_date, deal_type (flat_daily | commission), deal_value, currency, base_currency, exchange_rate, notes, check_flight, check_accommodation, check_studio_address, check_clients_notified, check_deposits, check_gear, check_contract
- sessions: id, spot_id, date, status, session_type, value, deposit_received, deposit_value, payment_method, notes, client_name, project_image, ref_images (text[])
- costs: id, spot_id, type, amount, date, notes
- push_subscriptions: id, user_id, endpoint, subscription (JSON)
- simulations: id, user_id, label, deal_type, deal_value, avg_session, currency, num_days, flight, accommodation, other, net_result, created_at
- waitlist: id, email (unique)

### Funções RPC
- get_community_artists(p_city, p_today, p_future) — retorna instagram, studio_name, city, start_date, end_date

### Migrations
- Não há pasta supabase/migrations no repo. Todo o schema é gerido direto no painel Supabase (sem versionamento em código).

## Rotas existentes
/, /login, /home, /spots, /spots/[id], /spots/new, /calculator, /profile, /onboarding, /waitlist, /auth/confirmed, /auth/reset, /stats, /community
(todas confirmadas em src/routes — nenhuma rota planejada em falta)

### Nav inferior (4 abas)
/home, /spots, /calculator, /profile — /stats e /community só acessíveis via /profile

## APIs internas
- POST /api/auth/sync — sincroniza tokens via cookie
- GET  /api/session  — verifica sessão server-side
- GET  /api/photon   — proxy Komoot Photon com lang=en

## Variáveis de ambiente
### Cliente (PUBLIC_*)
- PUBLIC_SUPABASE_URL
- PUBLIC_SUPABASE_ANON_KEY
- PUBLIC_CLOUDINARY_CLOUD_NAME
- PUBLIC_CLOUDINARY_UPLOAD_PRESET
- VITE_VAPID_PUBLIC_KEY

### Servidor (privadas)
- SENTRY_DSN
- FUNCTION_SECRET

### Supabase Edge Functions
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- VAPID_PUBLIC_KEY
- VAPID_PRIVATE_KEY
- VAPID_MAILTO

## Padrões de código
- Svelte 5 runes — usar $state, $derived, $effect
- onclick nativo (não on:click) — padrão Svelte 5
- Sempre validar user antes de usar user.id
- Sempre try-catch em queries Supabase críticas
- Toast system para feedback: import { toast, toastConfirm } from '$lib/toast.js'
- Nunca select('*') — sempre colunas explícitas
- Inputs numéricos sempre convertidos com Number() antes do Supabase
- Cloudinary upload direto do client (unsigned preset)

## Segurança (já auditado e aplicado)
- RLS ativo em todas as tabelas com USING e WITH CHECK
- hooks.server.js usa sequence(originalHandle, Sentry.sentryHandle())
- send-notifications protegida com Authorization: Bearer FUNCTION_SECRET
- auth/confirmed valida next param antes de goto (só paths relativos)
- sw.js valida URL antes de openWindow (só paths relativos)

## Regras absolutas
1. NUNCA inventar tabelas, colunas, rotas ou funções não listadas acima
2. NUNCA sugerir trocar tecnologia do stack
3. NUNCA remover funcionalidade sem avisar explicitamente
4. NUNCA usar select('*') — sempre colunas explícitas
5. SEMPRE validar user antes de usar user.id
6. SEMPRE responder em português brasileiro
7. SEMPRE ver o código real antes de gerar qualquer fix
8. Uma mudança cirúrgica por prompt ao Copilot

## Workflow de desenvolvimento
1. Ver código real (bash cat/grep)
2. Analisar aqui no chat
3. Gerar prompt cirúrgico para o Copilot no formato STRICT INSTRUCTIONS
4. Copilot aplica — confirmar resultado
5. Commit apenas após confirmação

## Formato de prompt cirúrgico (STRICT INSTRUCTIONS)
Todo prompt gerado para o Copilot segue este formato:
STRICT INSTRUCTIONS:

Find and replace ONLY the block below in <ficheiro>
Do NOT modify anything else

FIND:
<código exacto>
REPLACE WITH:
<código novo>

## Estado atual
App funcional e completo no fluxo principal. Working tree limpo, tudo commitado.

### Concluído ✅
- [x] Auth completo: login, signup, confirmação de email, reset de password
- [x] Onboarding com escolha de base_currency
- [x] CRUD completo de spots (criar, ver, editar, apagar) + checklist de 7 itens
- [x] CRUD completo de sessions (com client_name, project_image, ref_images via Cloudinary)
- [x] CRUD completo de costs
- [x] Bottom sheet de sessão com imagens, lightbox e delete
- [x] Calculator com simulações persistidas (tabela simulations)
- [x] Stats/Analytics com conversão de moeda (frankfurter.app + exchange_rate por spot)
- [x] Community — artistas na mesma cidade via RPC get_community_artists, opt-in por community_visible
- [x] Push notifications D-7/D-3/D-1 (edge function send-notifications, protegida por FUNCTION_SECRET)
- [x] Waitlist pública
- [x] Audit de segurança completo aplicado (9 blocos, 38 fixes)
- [x] Sentry ativo (client + server hooks)
- [x] CityPicker via proxy /api/photon

### Pendente ⬜
- [ ] Beta com 8-12 tatuadores conhecidos — planejado, ainda não iniciado
- [ ] RESEND_API_KEY existe no .env mas não é usada em lado nenhum do código (email transacional não implementado)
- [ ] Nenhum cron/scheduler no repo a chamar send-notifications — o agendamento tem de estar configurado fora do código (Supabase cron ou externo); confirmar
- [ ] README.md ainda é o template default do SvelteKit
- [ ] Sem migrations versionadas e sem testes automatizados
- [ ] select('*') ainda usado em /home, /spots e /stats (viola a regra 4)
EOF