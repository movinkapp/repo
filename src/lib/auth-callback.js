import { supabase } from './supabase.js'

/**
 * Resolve um callback de auth (recovery ou signup) não importa qual
 * formato de URL o provedor usou pra entregar o token. Tenta, em ordem:
 *   1. ?token_hash=...&type=...   (templates atuais, seguro cross-device)
 *   2. ?code=...                  (links PKCE antigos, retrocompatibilidade)
 *   3. #access_token=...&type=... (fluxo implícito antigo, fallback final)
 *
 * Em qualquer sucesso, sincroniza a sessão com o cookie do servidor via
 * /api/auth/sync (necessário porque @supabase/auth-helpers-sveltekit
 * não grava cookie automaticamente no client).
 *
 * Retorna { session, error }. Nunca lança exceção.
 */
export async function resolveAuthCallback(expectedType) {
  const url = new URL(window.location.href)
  const tokenHash = url.searchParams.get('token_hash')
  const code = url.searchParams.get('code')
  const type = url.searchParams.get('type') || expectedType

  let result

  if (tokenHash) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    result = { session: data?.session ?? null, error }
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    result = { session: data?.session ?? null, error }
  } else {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (accessToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      result = { session: data?.session ?? null, error }
    } else {
      result = { session: null, error: new Error('No valid token found in URL.') }
    }
  }

  if (result.session) {
    try {
      await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token
        })
      })
    } catch (e) {
      console.error('auth sync failed:', e)
    }
  }

  return result
}
