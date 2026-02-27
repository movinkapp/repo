<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { toast } from '$lib/toast.js'
  import { ChevronLeft } from 'lucide-svelte'
  import CalendarPicker from '$lib/components/CalendarPicker.svelte'

  let studio_name = ''
  let city = ''
  let country = ''
  let start_date = null
  let end_date = null
  let deal_type = 'flat_daily'
  let deal_value = ''
  let currency = 'EUR'
  let notes = ''
  let loading = false
  let error = ''

  const currencies = ['EUR', 'GBP', 'USD', 'BRL', 'AUD', 'JPY', 'CHF', 'CAD']

  const currencySymbols = {
    EUR: '€', GBP: '£', USD: '$', BRL: 'R$',
    AUD: 'A$', JPY: '¥', CHF: 'CHF', CAD: 'CA$'
  }
  $: symbol = currencySymbols[currency] || currency

  async function getExchangeRate(currency) {
    if (currency === 'EUR') return 1.0
    const res = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${currency}`)
    const data = await res.json()
    return data.rates[currency]
  }

  async function handleSubmit() {
    loading = true
    error = ''

    if (!studio_name || !city || !country || !start_date || !end_date || !deal_value) {
      error = 'Please fill in all required fields.'
      loading = false
      return
    }

    if (new Date(end_date) < new Date(start_date)) {
      error = 'End date must be after start date.'
      loading = false
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const exchange_rate = await getExchangeRate(currency)

    const { error: err } = await supabase.from('spots').insert({
      user_id: user.id,
      studio_name,
      city,
      country,
      start_date: start_date ? `${start_date.getFullYear()}-${String(start_date.getMonth() + 1).padStart(2, '0')}-${String(start_date.getDate()).padStart(2, '0')}` : null,
      end_date: end_date ? `${end_date.getFullYear()}-${String(end_date.getMonth() + 1).padStart(2, '0')}-${String(end_date.getDate()).padStart(2, '0')}` : null,
      deal_type,
      deal_value,
      currency,
      base_currency: 'EUR',
      exchange_rate,
      notes
    })

    if (err) {
      error = err.message
      toast(err.message, 'error')
    } else {
      toast('Spot created')
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

    <div class="col">
      <div class="field">
        <p class="field-label">From</p>
        <CalendarPicker bind:value={start_date} markedDates={[]} />
      </div>
      <div class="field">
        <p class="field-label">To</p>
        <CalendarPicker bind:value={end_date} markedDates={[]} />
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
          placeholder={deal_type === 'flat_daily' ? symbol + '0' : '30'} />
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
    min-width: 0;
    overflow: hidden;
  }

  .col {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-3);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  input, textarea {
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
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  input:focus, textarea:focus {
    border-color: var(--text-2);
  }

  select {
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
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 36px;
  }

  select:focus {
    border-color: var(--text-2);
    outline: none;
  }

  input::placeholder, textarea::placeholder {
    color: var(--text-3);
  }

  textarea {
    resize: none;
    line-height: 1.5;
  }

  .field-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-3);
    letter-spacing: 0.5px;
    text-transform: uppercase;
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
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 3px;
    gap: 3px;
  }

  .toggle button {
    background: none;
    border: none;
    border-radius: 5px;
    color: var(--text-3);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle button.active {
    background: var(--text);
    color: var(--bg);
  }

</style>