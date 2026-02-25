<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'

  let spots = []
  let loading = true

  onMount(async () => {
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .order('start_date', { ascending: false })

    if (!error) spots = data
    loading = false
  })
</script>

<h1>Spots</h1>
<a href="/spots/new">+ New spot</a>

{#if loading}
  <p>Loading...</p>
{:else if spots.length === 0}
  <p>No spots yet.</p>
{:else}
  {#each spots as spot}
    <a href="/spots/{spot.id}">
      <div>
        <h2>{spot.studio_name}</h2>
        <p>{spot.city}, {spot.country}</p>
        <p>{spot.start_date} → {spot.end_date}</p>
        <p>{spot.deal_type === 'flat_daily' ? spot.deal_value + ' ' + spot.currency + '/day' : spot.deal_value + '% commission'}</p>
      </div>
    </a>
  {/each}
{/if}