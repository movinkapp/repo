<script>
  import { supabase } from '$lib/supabase.js'

  let email = ''
  let state = 'idle' // idle | loading | success | error
  let errorMsg = ''

  async function submit() {
    if (!email.trim()) return
    state = 'loading'

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.trim().toLowerCase() })

    if (error) {
      if (error.code === '23505') {
        errorMsg = 'This email is already on the list.'
      } else {
        errorMsg = 'Something went wrong. Try again.'
      }
      state = 'error'
    } else {
      state = 'success'
    }
  }
</script>

<svelte:head>
  <title>Movink — Request Access</title>
</svelte:head>

<div class="page">
  <a href="/" class="wordmark">
    <span class="wm-mov">MOV</span><span class="wm-ink">INK</span>
  </a>

  {#if state === 'success'}
    <div class="box">
      <p class="tag">You're on the list.</p>
      <h1>We'll be in touch<br/><em>soon.</em></h1>
      <p class="sub">We're onboarding the first artists carefully. You'll hear from us when your spot is ready.</p>
    </div>
  {:else}
    <div class="box">
      <p class="tag">Private beta</p>
      <h1>Request<br/><em>access.</em></h1>
      <p class="sub">Movink is currently invite-only. Leave your email and we'll reach out when your spot opens up.</p>

      <div class="form">
        <input
          type="email"
          placeholder="your@email.com"
          bind:value={email}
          disabled={state === 'loading'}
          on:keydown={(e) => e.key === 'Enter' && submit()}
        />
        <button on:click={submit} disabled={state === 'loading'}>
          {state === 'loading' ? 'Sending···' : 'Request access →'}
        </button>
      </div>

      {#if state === 'error'}
        <p class="error">{errorMsg}</p>
      {/if}

      <p class="note">No spam. No notifications. Just an email when you're in.</p>
    </div>
  {/if}
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    position: relative;
  }

  .wordmark {
    position: fixed;
    top: 24px;
    left: 32px;
    font-family: var(--font-display);
    font-size: 20px;
    letter-spacing: -1px;
    color: var(--text);
    text-decoration: none;
  }

  .wm-mov { font-weight: 800; }
  .wm-ink { font-weight: 200; }

  .box {
    max-width: 420px;
    width: 100%;
    text-align: center;
  }

  .tag {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
    color: var(--text-3);
    text-transform: uppercase;
    margin-bottom: 20px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: clamp(48px, 10vw, 80px);
    font-weight: 800;
    letter-spacing: -3px;
    line-height: 0.9;
    color: var(--text);
    margin-bottom: 20px;
  }

  h1 em {
    font-style: italic;
    font-weight: 300;
    color: var(--text-3);
  }

  .sub {
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text-3);
    line-height: 1.7;
    margin-bottom: 32px;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
  }

  input {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 13px 16px;
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text);
    outline: none;
    transition: border-color 0.2s;
    text-align: center;
  }

  input:focus { border-color: var(--text-3); }
  input::placeholder { color: var(--text-3); opacity: 0.5; }

  button {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-sm);
    padding: 13px 28px;
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.3px;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  button:hover:not(:disabled) { opacity: 0.82; }
  button:disabled { opacity: 0.4; cursor: default; }

  .error {
    font-family: var(--font-body);
    font-size: 12px;
    color: #e05555;
    margin-bottom: 12px;
  }

  .note {
    font-family: var(--font-body);
    font-size: 11px;
    color: var(--text-3);
    opacity: 0.6;
  }
</style>
