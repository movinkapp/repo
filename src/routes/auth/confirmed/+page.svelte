<script>
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  let status = 'Confirming your email...'
  let detail = ''

  onMount(async () => {
    try {
      const { data, error } = await supabase.auth.getSessionFromUrl()
      if (error) {
        status = 'Confirmation failed. Please try logging in.'
        detail = error?.message || JSON.stringify(error)
        console.error('getSessionFromUrl error', error)
        return
      }
      const next = $page.url.searchParams.get('next') || '/onboarding'
      status = 'Email confirmed — redirecting...'
      setTimeout(() => goto(next), 800)
    } catch (e) {
      status = 'Unexpected error during confirmation.'
      detail = String(e)
      console.error(e)
    }
  })
</script>

<style>
  main {
    min-height: 70vh;
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
  }

  h1 {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 8px;
    color: var(--text);
  }

  p {
    font-size: 14px;
    color: var(--text-2);
  }

  .btn {
    display: inline-block;
    margin-top: 16px;
    padding: 10px 16px;
    background: var(--text);
    color: var(--bg);
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    text-decoration: none;
  }

  pre {
    margin-top: 12px;
    color: var(--error);
    white-space: pre-wrap;
    font-size: 12px;
  }
</style>

<main>
  <div class="card">
    <h1>{status}</h1>
    <p>
      If you're not redirected automatically,
      <a class="btn" href="/onboarding" onclick={(e) => { e.preventDefault(); goto('/onboarding') }}>
        Continue
      </a>
    </p>
    {#if detail}
      <pre>{detail}</pre>
    {/if}
  </div>
</main>