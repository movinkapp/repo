<script>
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  let status = 'Confirming your email...'
  let detail = ''
   let confirmationUrl = ''

  onMount(async () => {
    try {
      const { data, error } = await supabase.auth.getSessionFromUrl()
      if (error) {
         status = 'Confirmation failed. Please try logging in.'
         detail = error?.message || JSON.stringify(error)
         // expose the full URL so users (or devs) can copy/paste if the email template
         // failed to render the confirmation link correctly (e.g. showed {{ .ConfirmationURL }})
         confirmationUrl = window.location.href
        console.error('getSessionFromUrl error', error)
        // Attempt fallback: parse tokens from URL fragment or query and set session client-side
        try {
          const href = window.location.href
          const u = new URL(href)
          let access_token = null
          let refresh_token = null

          if (u.hash) {
            const hash = new URLSearchParams(u.hash.replace(/^#/, ''))
            access_token = hash.get('access_token')
            refresh_token = hash.get('refresh_token')
          }

          if (!access_token) {
            // try query params as a fallback
            access_token = u.searchParams.get('access_token') || u.searchParams.get('token')
            refresh_token = u.searchParams.get('refresh_token')
          }

          if (access_token) {
            // set session manually and redirect
            await supabase.auth.setSession({ access_token, refresh_token })
            const next = $page.url.searchParams.get('next') || '/onboarding'
            status = 'Email confirmed — redirecting...'
            setTimeout(() => goto(next), 600)
            return
          }
        } catch (e) {
          console.error('fallback session set failed', e)
        }

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

   {#if confirmationUrl}
     <p class="meta">If the email link didn't work, copy & paste this URL into your browser:</p>
     <pre style="word-break:break-all">{confirmationUrl}</pre>
     <p>
       <button class="btn" onclick={() => { navigator.clipboard?.writeText(confirmationUrl) }}>Copy link</button>
     </p>
   {/if}
  </div>
</main>