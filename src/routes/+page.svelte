<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'

  async function handleLogout() {
    await supabase.auth.signOut()
    goto('/login')
  }
</script>

<h1>Home</h1>
<button onclick={handleLogout}>Logout</button>