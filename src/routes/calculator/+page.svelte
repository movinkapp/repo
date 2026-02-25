<script>
  let days = ''
  let deal_type = 'percentage'
  let deal_value = ''
  let avg_session_value = ''
  let flight = ''
  let accommodation = ''
  let other_costs = ''

  $: totalCosts = Number(flight || 0) + Number(accommodation || 0) + Number(other_costs || 0)
  
  $: artistPerSession = deal_type === 'percentage'
    ? avg_session_value * (1 - deal_value / 100)
    : avg_session_value - deal_value

  $: breakEven = artistPerSession > 0
    ? Math.ceil(totalCosts / artistPerSession)
    : null

  $: profitAt = (sessions) => (artistPerSession * sessions) - totalCosts
</script>

<a href="/">← Back</a>
<h1>Viability Calculator</h1>

<select bind:value={deal_type}>
  <option value="percentage">Commission %</option>
  <option value="flat_daily">Flat daily rate</option>
</select>

<input bind:value={deal_value} type="number" 
  placeholder={deal_type === 'percentage' ? 'Commission %' : 'Daily rate'} />

<input bind:value={avg_session_value} type="number" placeholder="Avg session value" />
<input bind:value={days} type="number" placeholder="Days" />
<input bind:value={flight} type="number" placeholder="Flight cost" />
<input bind:value={accommodation} type="number" placeholder="Accommodation" />
<input bind:value={other_costs} type="number" placeholder="Other costs" />

{#if breakEven !== null && avg_session_value && deal_value}
  <hr>
  <h2>Results</h2>
  <p>Total costs: {totalCosts}</p>
  <p>You keep per session: {artistPerSession.toFixed(2)}</p>
  <p>Break even: {breakEven} sessions</p>
  <hr>
  {#each Array(Number(days) || 5) as _, i}
    <p>{i + 1} session{i > 0 ? 's' : ''}: {profitAt(i + 1).toFixed(2)} 
      {profitAt(i + 1) >= 0 ? '✓' : '✗'}
    </p>
  {/each}
{/if}