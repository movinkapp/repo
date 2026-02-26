<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { ChevronLeft } from 'lucide-svelte'

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

<div class="page">
  <div class="header">
    <a href="/spots" class="back">
      <ChevronLeft size={20} strokeWidth={1.5} />
    </a>
    <h1>New Spot</h1>
  </div>

  <div class="form">
    <div class="field">
      <label for="studio_name">Studio</label>
      <input id="studio_name" bind:value={studio_name} type="text" placeholder="Studio name" />
    </div>

    <div class="row">
      <div class="field">
        <label for="city">City</label>
        <input id="city" bind:value={city} type="text" placeholder="City" />
      </div>
      <div class="field">
        <label for="country">Country</label>
        <input id="country" bind:value={country} type="text" placeholder="Country" />
      </div>
    </div>

    <div class="row">
      <div class="field">
        <label for="start_date">From</label>
        <input id="start_date" bind:value={start_date} type="date" />
      </div>
      <div class="field">
        <label for="end_date">To</label>
        <input id="end_date" bind:value={end_date} type="date" />
      </div>
    </div>

    <div class="field">
      <label for="deal_flat">Deal type</label>
      <div class="toggle">
        <button 
          id="deal_flat"
          type="button"
          class:active={deal_type === 'flat_daily'}
          onclick={() => deal_type = 'flat_daily'}>
          Flat daily
        </button>
        <button 
          type="button"
          class:active={deal_type === 'percentage'}
          onclick={() => deal_type = 'percentage'}>
          Commission %
        </button>
      </div>
    </div>

    <div class="row">
      <div class="field">
        <label for="deal_value">
          {deal_type === 'flat_daily' ? 'Daily rate' : 'Commission %'}
        </label>
        <input id="deal_value" bind:value={deal_value} type="number"
          placeholder={deal_type === 'flat_daily' ? '200' : '30'} />
      </div>
      <div class="field">
        <label for="currency">Currency</label>
        <select id="currency" bind:value={currency}>
          {#each currencies as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="field">
      <label for="notes">Notes</label>
      <textarea id="notes" bind:value={notes} placeholder="Anything worth remembering..." rows="3"></textarea>
    </div>

    {#if error}
      <p class="error">{error}</p>
    {/if}

    <button class="btn-primary" onclick={handleSubmit} disabled={loading}>
      {loading ? '···' : 'Create spot'}
    </button>
  </div>
</div>

<style>
  .page {
    padding: 56px 24px 100px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
  }

  .back {
    color: var(--text-2);
    display: flex;
    align-items: center;
    transition: color 0.2s;
  }

  .back:active {
    color: var(--text);
  }

  h1 {
    font-size: 24px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-2);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  input, select, textarea {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 15px;
    padding: 12px 14px;
    transition: border-color 0.2s;
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
  }

  input:focus, select:focus, textarea:focus {
    border-color: var(--text-2);
  }

  input::placeholder, textarea::placeholder {
    color: var(--text-3);
  }

  textarea {
    resize: none;
    line-height: 1.5;
  }

  .btn-primary {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    padding: 15px;
    cursor: pointer;
    margin-top: 8px;
    transition: opacity 0.2s;
    letter-spacing: -0.3px;
    width: 100%;
  }

  .btn-primary:active {
    opacity: 0.8;
  }

  .btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .error {
    color: var(--error);
    font-size: 13px;
  }

  .toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 4px;
    gap: 4px;
  }

  .toggle button {
    background: none;
    border: none;
    border-radius: 6px;
    color: var(--text-2);
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle button.active {
  background: var(--text);
  color: var(--bg);
}
</style>