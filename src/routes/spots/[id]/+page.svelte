<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'

  let spot = null
  let loading = true

  onMount(async () => {
    const id = $page.params.id

    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .eq('id', id)
      .single()

    if (!error) spot = data
    loading = false
  })
</script>

{#if loading}
  <p>Loading...</p>
{:else if !spot}
  <p>Spot not found.</p>
{:else}
  <a href="/spots">← Back</a>
  <h1>{spot.studio_name}</h1>
  <p>{spot.city}, {spot.country}</p>
  <p>{spot.start_date} → {spot.end_date}</p>
  <p>{spot.deal_type === 'flat_daily' 
    ? spot.deal_value + ' ' + spot.currency + '/day' 
    : spot.deal_value + '% commission'}</p>
  {#if spot.notes}
    <p>{spot.notes}</p>
  {/if}
{/if}