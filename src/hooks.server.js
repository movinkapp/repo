import { createServerClient } from '@supabase/auth-helpers-sveltekit'
import { redirect } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

const PUBLIC_PATHS = ['/', '/login', '/auth/confirmed', '/onboarding']

export const handle = async ({ event, resolve }) => {
  const path = event.url.pathname

  // allow static/app assets and api endpoints through
  if (path.startsWith('/_app') || path.startsWith('/static') || path.startsWith('/favicon') || path.startsWith('/api')) {
    return await resolve(event)
  }

  const cookies = {
    get: (name) => event.cookies.get(name),
    set: (name, value, options) => event.cookies.set(name, value, options),
    remove: (name, options) => event.cookies.set(name, '', { ...(options || {}), maxAge: 0 })
  }

  let supabase
  try {
    supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, { cookies, fetch: event.fetch })
  } catch (e) {
    console.error('supabase createServerClient failed in hooks:', e)
    // fail open to avoid crashing the serverless function; allow public pages
    event.locals.session = null
    return await resolve(event)
  }

  const { data: { session } } = await supabase.auth.getSession()

  // expose session to the app
  event.locals.session = session ?? null

  // not logged in -> redirect to login for protected pages
  if (!session && !PUBLIC_PATHS.includes(path)) {
    throw redirect(303, '/login')
  }

  // logged in users shouldn't stay on login
  if (session && path === '/login') {
    throw redirect(303, '/home')
  }

  // enforce onboarding for protected pages (skip landing and onboarding)
  if (session && !PUBLIC_PATHS.includes(path) && path !== '/onboarding') {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .single()

      if (profile && !profile.onboarding_completed) {
        throw redirect(303, '/onboarding')
      }
    } catch (e) {
      // If the profile query fails, allow request to continue (fail open)
    }
  }

  return await resolve(event)
}
