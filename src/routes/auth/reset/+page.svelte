<script>
  import { onMount } from 'svelte'
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { toast } from '$lib/toast.js'

  let password = ''
  let loading = false
  let ready = false
  let error = ''

  onMount(async () => {
    // Extrai tokens do hash da URL (formato Supabase)
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (accessToken && type === 'recovery') {
      // Sincroniza a sessão via cookie usando a rota já existente
      try {
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken })
        })
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        ready = true
        // Limpa o hash da URL sem recarregar
        history.replaceState(null, '', window.location.pathname)
      } catch (e) {
        error = 'Invalid or expired reset link.'
      }
    } else {
      // Sem tokens no hash — verifica se já há sessão ativa de recovery
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          ready = true
          subscription.unsubscribe()
        }
      })

      setTimeout(() => {
        if (!ready) {
          error = 'Invalid or expired reset link.'
        }
      }, 8000)

      return () => subscription.unsubscribe()
    }
  })

  async function handleReset() {
    if (!password || password.length < 6) {
      toast('Password must be at least 6 characters.', 'error')
      return
    }
    loading = true
    const { error: err } = await supabase.auth.updateUser({ password })
    loading = false
    if (err) {
      toast(err.message, 'error')
    } else {
      toast('Password updated — you are now signed in.')
      goto('/home')
    }
  }
</script>

<div class="container">
  <div class="header">
    <h1>
      <img src="/movink-logo-typo-white.svg" alt="Movink" style="height:28px;width:auto" />
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
  {:else if error}
    <div class="form">
      <p class="waiting">{error}</p>
      <a href="/login" class="btn-primary" style="text-align:center;text-decoration:none;">Back to login</a>
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
