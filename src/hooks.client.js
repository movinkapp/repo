import * as Sentry from '@sentry/sveltekit'
import { PUBLIC_SENTRY_DSN } from '$env/static/public'

Sentry.init({
  dsn: PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.5,
  environment: import.meta.env.MODE,
  sendDefaultPii: false,
  beforeSend(event) {
    const headers = event.request?.headers
    if (headers) {
      delete headers.Authorization
      delete headers.authorization
      delete headers.Cookie
      delete headers.cookie
    }
    return event
  }
})

export const handleError = Sentry.handleErrorWithSentry()