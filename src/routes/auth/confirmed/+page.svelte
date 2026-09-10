<script>
  import { onMount } from 'svelte'
  import { resolveAuthCallback } from '$lib/auth-callback.js'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  let status = 'Confirming your email...'

  onMount(async () => {
    const rawNext = $page.url.searchParams.get('next') || '/onboarding'
    const next = rawNext.startsWith('/') ? rawNext : '/onboarding'

    const { session, error: callbackError } = await resolveAuthCallback('signup')
    history.replaceState({}, '', window.location.pathname)

    if (session) {
      status = 'Email confirmed — redirecting...'
      setTimeout(() => goto(next), 600)
    } else {
      status = callbackError?.message || 'Something went wrong. Try logging in.'
    }
  })
</script>

<main>
  <div class="card">
    <h1>{status}</h1>
    <p>
      Not redirected?
      <a class="btn" href="/onboarding">Continue →</a>
    </p>
  </div>
</main>

<style>
  main {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
  }

  .card {
    max-width: 480px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }

  p { font-size: 14px; color: var(--text-2); }

  .btn {
    display: inline-block;
    margin-left: 8px;
    padding: 8px 14px;
    background: var(--text);
    color: var(--bg);
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 13px;
  }
</style>