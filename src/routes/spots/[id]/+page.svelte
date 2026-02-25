<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'

  let spot = null
  let sessions = []
  let loading = true
  let showForm = false

  // session form fields
  let date = ''
  let status = 'confirmed'
  let session_type = 'full_day'
  let value = ''
  let deposit_received = false
  let deposit_value = ''
  let payment_method = 'cash'
  let notes = ''

  // costs
  let costs = []
  let showCostForm = false

  // cost form fields
  let cost_type = 'flight'
  let cost_amount = ''
  let cost_date = ''
  let cost_notes = ''

  onMount(async () => {
    const id = $page.params.id

    const { data: spotData } = await supabase
      .from('spots')
      .select('*')
      .eq('id', id)
      .single()

    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('spot_id', id)
      .order('date', { ascending: true })

    const { data: costsData } = await supabase
      .from('costs')
      .select('*')
      .eq('spot_id', id)
      .order('date', { ascending: true })

    spot = spotData
    sessions = sessionsData || []
    costs = costsData || []
    loading = false
  })

  function calcArtist(session) {
    if (!session.value) return 0
    if (spot.deal_type === 'flat_daily') {
      return session.value - spot.deal_value
    } else {
      return session.value * (1 - spot.deal_value / 100)
    }
  }

  function calcStudio(session) {
    if (!session.value) return 0
    if (spot.deal_type === 'flat_daily') {
      return spot.deal_value
    } else {
      return session.value * (spot.deal_value / 100)
    }
  }

  async function addSession() {
    const { error } = await supabase.from('sessions').insert({
      spot_id: $page.params.id,
      date,
      status,
      session_type,
      value: value || null,
      deposit_received,
      deposit_value: deposit_value || null,
      payment_method,
      notes
    })

    if (!error) {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('spot_id', $page.params.id)
        .order('date', { ascending: true })
      sessions = data
      showForm = false
      date = ''
      value = ''
      deposit_value = ''
      notes = ''
    }
  }

  async function addCost() {
    const { error } = await supabase.from('costs').insert({
      spot_id: $page.params.id,
      type: cost_type,
      amount: cost_amount,
      date: cost_date || null,
      notes: cost_notes
    })

    if (!error) {
      const { data } = await supabase
        .from('costs')
        .select('*')
        .eq('spot_id', $page.params.id)
        .order('date', { ascending: true })
      costs = data
      showCostForm = false
      cost_amount = ''
      cost_date = ''
      cost_notes = ''
    }
  }

  $: totalArtist = sessions.reduce((sum, s) => sum + calcArtist(s), 0)
  $: totalStudio = sessions.reduce((sum, s) => sum + calcStudio(s), 0)
  $: totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0)
  $: netProfit = totalArtist - totalCosts
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

  <hr>

  <h2>Sessions</h2>
  <button onclick={() => showForm = !showForm}>
    {showForm ? 'Cancel' : '+ Add session'}
  </button>

  {#if showForm}
    <div>
      <input bind:value={date} type="date" />
      <select bind:value={status}>
        <option value="confirmed">Confirmed</option>
        <option value="cancelled">Cancelled</option>
        <option value="walk_in">Walk-in</option>
      </select>
      <select bind:value={session_type}>
        <option value="full_day">Full day</option>
        <option value="half_day">Half day</option>
      </select>
      <input bind:value={value} type="number" placeholder="Session value ({spot.currency})" />
      <label>
        <input bind:checked={deposit_received} type="checkbox" />
        Deposit received
      </label>
      {#if deposit_received}
        <input bind:value={deposit_value} type="number" placeholder="Deposit amount" />
      {/if}
      <select bind:value={payment_method}>
        <option value="cash">Cash</option>
        <option value="transfer">Transfer</option>
        <option value="card">Card</option>
      </select>
      <textarea bind:value={notes} placeholder="Notes (optional)"></textarea>
      <button onclick={addSession}>Save session</button>
    </div>
  {/if}

  {#each sessions as session}
    <div>
      <p>{session.date} — {session.status} — {session.session_type}</p>
      <p>Value: {session.value} {spot.currency}</p>
      <p>Artist: {calcArtist(session).toFixed(2)} {spot.currency}</p>
      <p>Studio: {calcStudio(session).toFixed(2)} {spot.currency}</p>
    </div>
  {/each}

  <hr>

  <h2>Costs</h2>
  <button onclick={() => showCostForm = !showCostForm}>
    {showCostForm ? 'Cancel' : '+ Add cost'}
  </button>

  {#if showCostForm}
    <div>
      <select bind:value={cost_type}>
        <option value="flight">Flight</option>
        <option value="accommodation">Accommodation</option>
        <option value="food">Food</option>
        <option value="other">Other</option>
      </select>
      <input bind:value={cost_amount} type="number" placeholder="Amount ({spot.currency})" />
      <input bind:value={cost_date} type="date" />
      <textarea bind:value={cost_notes} placeholder="Notes (optional)"></textarea>
      <button onclick={addCost}>Save cost</button>
    </div>
  {/if}

  {#each costs as cost}
    <div>
      <p>{cost.type} — {cost.amount} {spot.currency}</p>
      {#if cost.date}<p>{cost.date}</p>{/if}
      {#if cost.notes}<p>{cost.notes}</p>{/if}
    </div>
  {/each}

  {#if sessions.length > 0}
    <hr>
    <h2>Summary</h2>
    <p>Gross: {totalArtist.toFixed(2)} {spot.currency}</p>
    <p>Costs: {totalCosts.toFixed(2)} {spot.currency}</p>
    <p>Net profit: {netProfit.toFixed(2)} {spot.currency}</p>
  {/if}
{/if}