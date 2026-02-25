<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'

  let email = ''
  let password = ''
  let loading = false
  let error = ''
  let mode = 'login'

  async function handleSubmit() {
    loading = true
    error = ''

    if (mode === 'login') {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { error = err.message } else { goto('/') }
    } else {
      const { error: err } = await supabase.auth.signUp({ email, password })
      if (err) { error = err.message } else { goto('/') }
    }

    loading = false
  }
</script>

<input bind:value={email} type="email" placeholder="Email" />
<input bind:value={password} type="password" placeholder="Password" />

<button onclick={handleSubmit} disabled={loading}>
  {loading ? 'Loading...' : mode === 'login' ? 'Login' : 'Sign up'}
</button>

<button onclick={() => mode = mode === 'login' ? 'register' : 'login'}>
  {mode === 'login' ? 'Create account' : 'Back to login'}
</button>

{#if error}
  <p>{error}</p>
{/if}