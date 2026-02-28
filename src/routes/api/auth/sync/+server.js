import { createServerClient } from '@supabase/auth-helpers-sveltekit'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

export const POST = async (event) => {
  try {
    const body = await event.request.json()
    const { access_token, refresh_token } = body || {}

    const cookies = {
      get: (name) => event.cookies.get(name),
      set: (name, value, options) => event.cookies.set(name, value, options),
      remove: (name, options) => event.cookies.set(name, '', { ...(options || {}), maxAge: 0 })
    }

    const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, { cookies, fetch: event.fetch })

    if (!access_token) {
      return new Response(JSON.stringify({ error: 'missing access_token' }), { status: 400 })
    }

    await supabase.auth.setSession({ access_token, refresh_token })

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('auth sync error', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}
