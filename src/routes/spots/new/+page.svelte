<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'

  let studio_name = ''
  let city = ''
  let country = ''
  let start_date = ''
  let end_date = ''
  let deal_type = 'flat_daily'
  let deal_value = ''
  let currency = 'EUR'
  let notes = ''
  let loading = false
  let error = ''

  const currencies = ['EUR', 'GBP', 'USD', 'BRL', 'AUD', 'JPY', 'CHF', 'CAD']

  async function getExchangeRate(currency) {
    if (currency === 'EUR') return 1.0
    const res = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${currency}`)
    const data = await res.json()
    return data.rates[currency]
  }

  async function handleSubmit() {
    loading = true
    error = ''

    const { data: { user } } = await supabase.auth.getUser()
    const exchange_rate = await getExchangeRate(currency)

    const { error: err } = await supabase.from('spots').insert({
      user_id: user.id,
      studio_name,
      city,
      country,
      start_date,
      end_date,
      deal_type,
      deal_value,
      currency,
      base_currency: 'EUR',
      exchange_rate,
      notes
    })

    if (err) {
      error = err.message
    } else {
      goto('/spots')
    }

    loading = false
  }
</script>

<h1>New Spot</h1>

<input bind:value={studio_name} placeholder="Studio name" />
<input bind:value={city} placeholder="City" />
<input bind:value={country} placeholder="Country" />
<input bind:value={start_date} type="date" />
<input bind:value={end_date} type="date" />

<select bind:value={deal_type}>
  <option value="flat_daily">Flat daily rate</option>
  <option value="percentage">Studio commission %</option>
</select>

<input bind:value={deal_value} type="number" 
  placeholder={deal_type === 'flat_daily' ? 'Daily rate' : 'Commission %'} />

<select bind:value={currency}>
  {#each currencies as c}
    <option value={c}>{c}</option>
  {/each}
</select>

<textarea bind:value={notes} placeholder="Notes (optional)"></textarea>

<button onclick={handleSubmit} disabled={loading}>
  {loading ? 'Saving...' : 'Create spot'}
</button>

{#if error}
  <p>{error}</p>
{/if}