<script>
  import '../app.css'
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { navigating } from '$app/stores'

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session && window.location.pathname !== '/login') {
      goto('/login')
    }
  })

  async function handleLogout() {
    await supabase.auth.signOut()
    goto('/login')
  }
</script>

{#key $navigating?.to?.url.pathname}
  <div in:fade={{ duration: 200 }}>
    <slot />
  </div>
{/key}

<footer>
  <button onclick={handleLogout}>Logout</button>
</footer>