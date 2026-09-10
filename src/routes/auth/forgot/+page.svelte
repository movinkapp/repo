<script>
  import { supabase } from '$lib/supabase.js'
  import { fade } from 'svelte/transition'
  import { toast } from '$lib/toast.js'

  let email = ''
  let loading = false
  let sent = false

  try {
    const stored = sessionStorage.getItem('forgot_email')
    if (stored) {
      email = stored
      sessionStorage.removeItem('forgot_email')
    }
  } catch (e) {
    // sessionStorage indisponível (modo privado, etc) — segue com campo vazio
  }

  async function handleSubmit() {
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      toast('Enter your email first.', 'error')
      return
    }
    email = cleanEmail
    loading = true
    const { error: err } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/auth/reset`
    })
    loading = false
    if (err) {
      toast(err.message, 'error')
    } else {
      sent = true
    }
  }

  function resend() {
    sent = false
  }
</script>

<div class="container">
  <div class="header">
    <h1>
      <img src="/movink-logo-typo-white.svg" alt="Movink" style="height:32px;width:auto" />
    </h1>
    <p class="tagline" transition:fade={{ duration: 150 }}>
      {sent ? 'One step left.' : "We'll help you get back in."}
    </p>
  </div>

  {#if sent}
    <div class="form" transition:fade={{ duration: 150 }}>
      <p class="check-email-msg">
        Check your inbox — we sent a password reset link to <strong>{email}</strong>.
      </p>
      <button class="btn-ghost-sm" onclick={resend}>
        Didn't get it? Send again
      </button>
      <a href="/login" class="btn-ghost">← Back to login</a>
    </div>
  {:else}
    <div class="form">
      <div class="field">
        <label for="email">Email</label>
        <input id="email" bind:value={email} type="email" placeholder="your@email.com" />
      </div>

      <button class="btn-primary" onclick={handleSubmit} disabled={loading}>
        {loading ? '···' : 'Send reset link'}
      </button>

      <a href="/login" class="btn-ghost">← Back to login</a>
    </div>
  {/if}
</div>

<style>
  .container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 32px 24px;
  }

  .header { margin-bottom: 48px; }

  h1 {
    font-size: 38px;
    letter-spacing: -2px;
    line-height: 1;
    margin-bottom: 10px;
  }

  .tagline {
    font-size: 14px;
    color: var(--text-2);
    line-height: 1.5;
    max-width: 260px;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-3);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  input {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 15px;
    padding: 14px 16px;
    transition: border-color 0.2s;
    -webkit-appearance: none;
    appearance: none;
  }

  input:focus { border-color: var(--text-2); outline: none; }
  input::placeholder { color: var(--text-3); }

  .btn-primary {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    padding: 15px;
    cursor: pointer;
    margin-top: 8px;
    transition: opacity 0.2s;
  }

  .btn-primary:active { opacity: 0.8; }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-ghost {
    background: none;
    border: none;
    color: var(--text-2);
    font-family: var(--font-body);
    font-size: 14px;
    cursor: pointer;
    text-align: center;
    padding: 10px;
    text-decoration: none;
    display: block;
    transition: color 0.2s;
  }

  .btn-ghost:active { color: var(--text); }

  .btn-ghost-sm {
    background: none;
    border: none;
    color: var(--text-3);
    font-family: var(--font-body);
    font-size: 13px;
    cursor: pointer;
    text-align: center;
    padding: 6px 10px;
    transition: color 0.2s;
  }

  .check-email-msg {
    font-size: 15px;
    color: var(--text-2);
    line-height: 1.6;
    margin: 0;
  }

  .check-email-msg strong {
    color: var(--text);
  }
</style>
