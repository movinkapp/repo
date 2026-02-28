<script>
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  let status = 'Confirming your email...'

  onMount(() => {
    const next = $page.url.searchParams.get('next') || '/onboarding'

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        status = 'Email confirmed — redirecting...'
        subscription.unsubscribe()
        setTimeout(() => goto(next), 600)
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        status = 'Email confirmed — redirecting...'
        subscription.unsubscribe()
        setTimeout(() => goto(next), 600)
      }
    })

    setTimeout(() => {
      status = 'Something went wrong. Try logging in.'
    }, 8000)

    return () => subscription.unsubscribe()
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