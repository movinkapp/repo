import * as Sentry from '@sentry/sveltekit'

Sentry.init({
  dsn: 'https://6642ca695289af10fc355fef6738e10f@o4510983925792768.ingest.de.sentry.io/4510983930970192',
  tracesSampleRate: 0.5,
  environment: import.meta.env.MODE
})

import { createServerClient } from '@supabase/auth-helpers-sveltekit'
import { redirect } from '@sveltejs/kit'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'

const PUBLIC_PATHS = ['/', '/login', '/auth/confirmed', '/auth/reset', '/onboarding', '/waitlist']

const originalHandle = async ({ event, resolve }) => {
  const path = event.url.pathname

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
    event.locals.session = null
    return await resolve(event)
  }

  const { data: { session } } = await supabase.auth.getSession()
  event.locals.session = session ?? null

  if (session && (path === '/' || path === '/login')) {
    throw redirect(303, '/home')
  }

  if (!session && !PUBLIC_PATHS.includes(path)) {
    throw redirect(303, '/login')
  }

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
      if (e?.status) throw e
    }
  }

  return await resolve(event)
}

export const handle = Sentry.sentryHandle()
export const handleError = Sentry.handleErrorWithSentry()
