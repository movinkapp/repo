<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session && window.location.pathname !== '/login') {
      goto('/login')
    }
  })
</script>

<slot />