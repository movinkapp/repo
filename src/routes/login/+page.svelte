<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { fade } from 'svelte/transition'
  import { toast } from '$lib/toast.js'

  let email = ''
  let password = ''
  let name = ''
  let loading = false
  let error = ''
  let mode = 'login'

  async function handleSubmit() {
    loading = true
    error = ''

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) {
        error = err.message
        toast(err.message, 'error')
      } else {
        goto('/')
      }
    } else {
      const { error: err } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/confirmed?next=/onboarding`
        }
      })
      if (err) {
        error = err.message
        toast(err.message, 'error')
      } else {
        mode = 'check-email'
      }
    }

    loading = false
  }
</script>

<div class="container">
  <div class="header">
    <h1>
      <span class="mov">MOV</span><span class="ink">INK</span>
    </h1>
    {#if mode === 'login'}
      <p class="tagline" transition:fade={{ duration: 150 }}>
        Built for artists who never stop moving.
      </p>
    {:else if mode === 'register'}
      <p class="tagline" transition:fade={{ duration: 150 }}>
        Your journey starts here.
      </p>
    {:else}
      <p class="tagline" transition:fade={{ duration: 150 }}>
        One step left.
      </p>
    {/if}
  </div>

  {#if mode === 'check-email'}
    <div class="form" transition:fade={{ duration: 150 }}>
      <p class="check-email-msg">
        Check your inbox — we sent a confirmation link to <strong>{email}</strong>.
      </p>
      <button class="btn-ghost" onclick={() => { mode = 'register'; error = '' }}>
        ← Back
      </button>
    </div>
  {:else}
    <div class="form">
      <div class="field name-field" class:hidden={mode === 'login'}>
        <label for="name">Artist name</label>
        <input id="name" bind:value={name} type="text"
          placeholder="Artist name"
          tabindex={mode === 'login' ? -1 : 0} />
      </div>

      <div class="field">
        <label for="email">Email</label>
        <input id="email" bind:value={email} type="email" placeholder="your@email.com" />
      </div>

      <div class="field">
        <label for="password">Password</label>
        <input id="password" bind:value={password} type="password" placeholder="········" />
      </div>

      {#if error}
        <p class="error">{error}</p>
      {/if}

      <button class="btn-primary" onclick={handleSubmit} disabled={loading}>
        {loading ? '···' : mode === 'login' ? 'Let\'s go' : 'Join Movink'}
      </button>

      <button class="btn-ghost" onclick={() => { mode = mode === 'login' ? 'register' : 'login'; error = '' }}>
        {mode === 'login' ? 'First time? Join Movink' : 'Already have an account? Sign in'}
      </button>
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

  .header {
    margin-bottom: 48px;
  }

  h1 {
    font-size: 38px;
    letter-spacing: -2px;
    line-height: 1;
    margin-bottom: 10px;
  }

  .mov { font-weight: 800; }
  .ink { font-weight: 200; }

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
    will-change: transform;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .name-field {
    overflow: hidden;
    max-height: 80px;
    opacity: 1;
    transition: max-height 0.25s ease, opacity 0.25s ease;
  }

  .name-field.hidden {
    max-height: 0;
    opacity: 0;
    pointer-events: none;
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

  input:focus { border-color: var(--text-2); }
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
    letter-spacing: -0.3px;
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
    transition: color 0.2s;
  }

  .btn-ghost:active { color: var(--text); }

  .error {
    color: var(--error);
    font-size: 13px;
    padding: 0 2px;
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