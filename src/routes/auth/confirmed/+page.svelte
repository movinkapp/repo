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
      const next = $page.url.searchParams.get('next') || '/'
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
  :root{--bg:#0f0f10;--card:#0f1112;--text:#ececec;--muted:#a6a6a6;--accent:#ff7a00}
  main{min-height:70vh;display:flex;align-items:center;justify-content:center;padding:32px;color:var(--text);background:var(--bg)}
  .card{max-width:680px;background:linear-gradient(180deg,rgba(255,255,255,0.02),transparent);padding:28px;border-radius:12px;border:1px solid rgba(255,255,255,0.03)}
  h1{margin:0 0 8px;font-size:18px}
  p{margin:0;color:var(--muted)}
  .btn{display:inline-block;margin-top:16px;padding:10px 14px;background:var(--accent);color:#070707;border-radius:8px;text-decoration:none;font-weight:700;cursor:pointer}
  pre{margin-top:12px;color:#ffb3a0;white-space:pre-wrap}
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