<script>
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { toast } from '$lib/toast.js'

  let password = ''
  let loading = false
  let ready = false

  onMount(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        ready = true
        subscription.unsubscribe()
      }
    })

    setTimeout(() => {
      if (!ready) goto('/login')
    }, 5000)

    return () => subscription.unsubscribe()
  })

  async function handleReset() {
    if (!password || password.length < 6) {
      toast('Password must be at least 6 characters.', 'error')
      return
    }
    loading = true
    const { error } = await supabase.auth.updateUser({ password })
    loading = false
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Password updated — you are now signed in.')
      goto('/home')
    }
  }
</script>

<div class="container">
  <div class="header">
    <h1>
      <span class="mov">MOV</span><span class="ink">INK</span>
    </h1>
    <p class="tagline">Set your new password.</p>
  </div>

  {#if ready}
    <div class="form">
      <div class="field">
        <label for="password">New password</label>
        <input
          id="password"
          bind:value={password}
          type="password"
          placeholder="········"
          minlength="6"
        />
      </div>

      <button class="btn-primary" onclick={handleReset} disabled={loading}>
        {loading ? '···' : 'Update password'}
      </button>
    </div>
  {:else}
    <p class="waiting">Verifying link···</p>
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

  .mov { font-weight: 800; }
  .ink { font-weight: 200; }

  .tagline {
    font-size: 14px;
    color: var(--text-2);
    line-height: 1.5;
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

  .waiting {
    font-size: 14px;
    color: var(--text-3);
    letter-spacing: 1px;
  }
</style>
