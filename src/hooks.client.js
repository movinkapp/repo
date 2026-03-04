import * as Sentry from '@sentry/sveltekit'

Sentry.init({
  dsn: 'https://6642ca695289af10fc355fef6738e10f@o4510983925792768.ingest.de.sentry.io/4510983930970192',
  tracesSampleRate: 0.5,
  environment: import.meta.env.MODE
})

export const handleError = Sentry.handleErrorWithSentry()