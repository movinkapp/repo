<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'

  let email = ''
  let password = ''
  let loading = false
  let error = ''

  async function handleLogin() {
    loading = true
    error = ''

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (err) {
      error = err.message
    } else {
      goto('/')
    }

    loading = false
  }
</script>

<input bind:value={email} type="email" placeholder="Email" />
<input bind:value={password} type="password" placeholder="Password" />
<button onclick={handleLogin} disabled={loading}>
  {loading ? 'Loading...' : 'Login'}
</button>

{#if error}
  <p>{error}</p>
{/if}