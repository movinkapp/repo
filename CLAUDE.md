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
- users: id, name, onboarding_completed, profile_image
- spots: id, user_id, studio_name, city, city_normalized, country, lat, lon, start_date, end_date, deal_type (flat_daily | commission), deal_value, currency, notes, check_flight, check_accommodation, check_studio_address, check_clients_notified, check_deposits, check_gear, check_contract
- sessions: id, spot_id, date, status, session_type, value, deposit_received, deposit_value, payment_method, notes, client_name, project_image, ref_images (text[])
- costs: id, spot_id, type, amount, date, notes
- push_subscriptions: id, user_id, subscription (JSON)

## Rotas existentes
/, /login, /home, /spots, /spots/[id], /spots/new, /calculator, /profile, /onboarding, /waitlist, /auth/confirmed, /auth/reset, /stats, /community

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
3. Gerar prompt cirúrgico para o Copilot
4. Copilot aplica — confirmar resultado
5. Commit apenas após confirmação

## Estado atual
App funcional em fase de audit e polimento pré-beta.
Beta planejado com 8-12 tatuadores conhecidos, acesso controlado via Supabase.
Audit de segurança completo aplicado (blocos 1-7 em progresso).
