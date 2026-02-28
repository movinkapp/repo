import { createSupabaseServerClient } from '@supabase/auth-helpers-sveltekit'
import { redirect } from '@sveltejs/kit'

const PUBLIC_PATHS = ['/', '/login', '/auth/confirmed', '/onboarding']

export const handle = async ({ event, resolve }) => {
  const path = event.url.pathname

  // allow static/app assets and api endpoints through
  if (path.startsWith('/_app') || path.startsWith('/static') || path.startsWith('/favicon') || path.startsWith('/api')) {
    return await resolve(event)
  }

  const supabase = createSupabaseServerClient(event)
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
