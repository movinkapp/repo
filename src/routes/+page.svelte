<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'

  let status = 'testing...'

  onMount(async () => {
    const { error } = await supabase.auth.getSession()
    if (error) {
      status = 'Error: ' + error.message
    } else {
      status = 'Supabase connected!'
    }
  })
</script>

<p>{status}</p>