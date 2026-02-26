<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { ChevronLeft, Plus, MapPin, X } from 'lucide-svelte'

  let spot = null
  let sessions = []
  let costs = []
  let loading = true
  let showSessionForm = false
  let showCostForm = false

  let date = ''
  let status = 'confirmed'
  let session_type = 'full_day'
  let value = ''
  let deposit_received = false
  let deposit_value = ''
  let payment_method = 'cash'
  let notes = ''

  let cost_type = 'flight'
  let cost_amount = ''
  let cost_date = ''
  let cost_notes = ''
  let sessionError = ''
  let costError = ''

  onMount(async () => {
    const id = $page.params.id

    const { data: spotData } = await supabase
      .from('spots').select('*').eq('id', id).single()

    const { data: sessionsData } = await supabase
      .from('sessions').select('*').eq('spot_id', id).order('date', { ascending: true })

    const { data: costsData } = await supabase
      .from('costs').select('*').eq('spot_id', id).order('date', { ascending: true })

    spot = spotData
    sessions = sessionsData || []
    costs = costsData || []
    loading = false
  })

  function calcArtist(session) {
    if (!session.value) return 0
    if (spot.deal_type === 'flat_daily') return session.value - spot.deal_value
    return session.value * (1 - spot.deal_value / 100)
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  function capitalize(str) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  async function addSession() {
    const { error } = await supabase.from('sessions').insert({
      spot_id: $page.params.id,
      date, status, session_type,
      value: value || null,
      deposit_received,
      deposit_value: deposit_value || null,
      payment_method, notes
    })

    if (error) {
      sessionError = 'Could not save session. Try again.'
      loading = false
      return
    }
    sessionError = ''

    if (!error) {
      const { data } = await supabase
        .from('sessions').select('*')
        .eq('spot_id', $page.params.id)
        .order('date', { ascending: true })
      sessions = data
      showSessionForm = false
      date = ''; value = ''; deposit_value = ''; notes = ''
      deposit_received = false
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

    if (error) {
      costError = 'Could not save cost. Try again.'
      return
    }
    costError = ''

    if (!error) {
      const { data } = await supabase
        .from('costs').select('*')
        .eq('spot_id', $page.params.id)
        .order('date', { ascending: true })
      costs = data
      showCostForm = false
      cost_amount = ''; cost_date = ''; cost_notes = ''
    }
  }

  $: totalArtist = sessions.reduce((sum, s) => sum + calcArtist(s), 0)
  $: totalCosts = costs.reduce((sum, c) => sum + Number(c.amount), 0)
  $: netProfit = totalArtist - totalCosts
</script>

{#if loading}
  <div class="loading">···</div>
{:else if !spot}
  <div class="loading">Spot not found.</div>
{:else}
<div class="page">

  <div class="header">
    <a href="/spots" class="back">
      <ChevronLeft size={20} strokeWidth={1.5} />
    </a>
    <div class="header-info">
      <div class="header-top">
        <h1>{spot.studio_name}</h1>
        <p class="header-date">{formatDate(spot.start_date)} → {formatDate(spot.end_date)}</p>
      </div>
      <div class="header-bottom">
        <p class="header-sub">
          <MapPin size={12} strokeWidth={1.5} />
          {spot.city}, {spot.country}
        </p>
        <span class="deal-tag">
          {spot.deal_type === 'flat_daily'
            ? spot.deal_value + ' ' + spot.currency + '/day'
            : spot.deal_value + '% commission'}
        </span>
      </div>
    </div>
  </div>

  <div class="summary">
      <div class="summary-top">
      <div class="summary-item">
        <p class="summary-label">GROSS EARNINGS</p>
        <p class="summary-value-sm">{totalArtist.toFixed(0)} <span class="currency">{spot.currency}</span></p>
      </div>
      <div class="summary-item">
        <p class="summary-label">TRIP COSTS</p>
        <p class="summary-value-sm">{totalCosts.toFixed(0)} <span class="currency">{spot.currency}</span></p>
      </div>
    </div>
    <div class="summary-divider-h"></div>
    <div class="summary-net">
      <p class="summary-label">Net profit</p>
      <p class="summary-value-lg {netProfit >= 0 ? 'positive' : 'negative'}">
        {netProfit.toFixed(0)} <span class="currency">{spot.currency}</span>
      </p>
    </div>
  </div>

  <div class="section">
    <div class="section-header">
      <p class="section-label">Sessions</p>
      <button class="btn-add" onclick={() => { showSessionForm = !showSessionForm; showCostForm = false }}>
        {#if showSessionForm}<X size={14} strokeWidth={2} />{:else}<Plus size={14} strokeWidth={2} />{/if}
        {showSessionForm ? 'Cancel' : 'Add'}
      </button>
    </div>

    {#if showSessionForm}
      <div class="form-card">
        <div class="form-row">
          <div class="field">
            <label for="s-date">Date</label>
            <input id="s-date" bind:value={date} type="date" />
          </div>
          <div class="field">
            <label for="s-value">Session total ({spot.currency})</label>
            <input id="s-value" bind:value={value} type="number" placeholder="0" />
          </div>
        </div>

        <div class="field">
          <p class="field-label">Session type</p>
          <div class="toggle">
            <button type="button" class:active={session_type === 'full_day'} onclick={() => session_type = 'full_day'}>Full day</button>
            <button type="button" class:active={session_type === 'half_day'} onclick={() => session_type = 'half_day'}>Half day</button>
          </div>
        </div>

        <div class="field">
          <p class="field-label">Booking status</p>
          <div class="toggle three">
            <button type="button" class:active={status === 'confirmed'} onclick={() => status = 'confirmed'}>Confirmed</button>
            <button type="button" class:active={status === 'walk_in'} onclick={() => status = 'walk_in'}>Walk-in</button>
            <button type="button" class:active={status === 'cancelled'} onclick={() => status = 'cancelled'}>Cancelled</button>
          </div>
        </div>

        <div class="field">
          <p class="field-label">Payment method</p>
          <div class="toggle three">
            <button type="button" class:active={payment_method === 'cash'} onclick={() => payment_method = 'cash'}>Cash</button>
            <button type="button" class:active={payment_method === 'transfer'} onclick={() => payment_method = 'transfer'}>Transfer</button>
            <button type="button" class:active={payment_method === 'card'} onclick={() => payment_method = 'card'}>Card</button>
          </div>
        </div>

        <p class="hint">Deposit received?</p>
        <div class="deposit-row">
          <div class="deposit-controls">
            <div class="toggle compact" style="max-width:260px;">
              <button type="button" class:active={!deposit_received} onclick={() => deposit_received = false} aria-pressed={!deposit_received}>No deposit</button>
              <button type="button" class:active={deposit_received} onclick={() => deposit_received = true} aria-pressed={deposit_received}>Deposit received</button>
            </div>
          </div>
          {#if deposit_received}
            <input bind:value={deposit_value} type="number" placeholder="Amount" class="deposit-input" aria-label="Deposit amount" />
          {/if}
        </div>

        {#if sessionError}
          <p class="form-error">{sessionError}</p>
        {/if}

        <button class="btn-primary" onclick={addSession}>Save session</button>
      </div>
    {/if}

    {#if sessions.length === 0 && !showSessionForm}
      <p class="empty-text">No sessions recorded yet.</p>
    {:else}
      {#each sessions as session}
        <div class="session-card">
          <div class="session-top">
            <p class="session-date">{formatDate(session.date)}</p>
            <p class="session-net">+{calcArtist(session).toFixed(0)} {spot.currency}</p>
          </div>
          <div class="session-bottom">
            <span class="tag">{session.session_type === 'full_day' ? 'Full day' : 'Half day'}</span>
            <span class="tag">{session.payment_method}</span>
            {#if session.value}
              <span class="tag">Total: {session.value} {spot.currency}</span>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <div class="section">
    <div class="section-header">
      <p class="section-label">Costs</p>
      <button class="btn-add" onclick={() => { showCostForm = !showCostForm; showSessionForm = false }}>
        {#if showCostForm}<X size={14} strokeWidth={2} />{:else}<Plus size={14} strokeWidth={2} />{/if}
        {showCostForm ? 'Cancel' : 'Add'}
      </button>
    </div>

    {#if showCostForm}
      <div class="form-card">
        <div class="field">
          <p class="field-label">Cost category</p>
          <div class="toggle four">
            <button type="button" class:active={cost_type === 'flight'} onclick={() => cost_type = 'flight'}>Flight</button>
            <button type="button" class:active={cost_type === 'accommodation'} onclick={() => cost_type = 'accommodation'}>Stay</button>
            <button type="button" class:active={cost_type === 'food'} onclick={() => cost_type = 'food'}>Food</button>
            <button type="button" class:active={cost_type === 'other'} onclick={() => cost_type = 'other'}>Other</button>
          </div>
          <p class="hint">Select a category, then add the amount.</p>
        </div>

        <div class="form-row">
          <div class="field">
            <label for="c-amount">Amount ({spot.currency})</label>
            <input id="c-amount" bind:value={cost_amount} type="number" placeholder="0" />
          </div>
          <div class="field">
            <label for="c-date">Date <span class="optional">(optional)</span></label>
            <input id="c-date" bind:value={cost_date} type="date" />
          </div>
        </div>

        <div class="field">
          <label for="c-notes">Notes</label>
          <input id="c-notes" bind:value={cost_notes} type="text" placeholder="Optional" />
        </div>

        {#if costError}
          <p class="form-error">{costError}</p>
        {/if}

        <button class="btn-primary" onclick={addCost}>Save cost</button>
      </div>
    {/if}

    {#if costs.length === 0 && !showCostForm}
      <p class="empty-text">No costs logged yet.</p>
    {:else}
      {#each costs as cost}
        <div class="cost-card">
          <p class="cost-type">{capitalize(cost.type)}</p>
          <p class="cost-amount">-{cost.amount} {spot.currency}</p>
        </div>
      {/each}
    {/if}
  </div>

</div>
{/if}

<style>
  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-size: 24px;
    color: var(--text-3);
    letter-spacing: 4px;
  }

  .page { padding: 56px 24px 100px; }

  .header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .back {
    color: var(--text-2);
    display: flex;
    align-items: center;
    padding-top: 4px;
    transition: color 0.2s;
  }

  .header-info { flex: 1; min-width: 0; }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 8px;
  }

  .header-info h1 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    line-height: 1.2;
    flex: 1;
    min-width: 0;
  }

  .header-date {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    padding-top: 4px;
  }

  .header-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .header-sub {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--text-2);
  }

  .deal-tag {
    font-size: 11px;
    color: var(--text-2);
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 7px;
    white-space: nowrap;
  }

  .summary {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 32px;
  }

  .summary-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .summary-item { flex: 1; }

  .summary-divider-h {
    height: 1px;
    background: var(--border);
    margin-bottom: 16px;
  }

  .summary-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 4px;
  }

  .summary-value-sm {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.5px;
    color: var(--text-2);
  }

  .summary-value-lg {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1;
  }

  .summary-net { display: flex; flex-direction: column; gap: 4px; }

  .currency { font-size: 14px; font-weight: 400; color: var(--text-2); }
  .positive { color: var(--upcoming); }
  .negative { color: var(--error); }

  .section { margin-bottom: 32px; }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .btn-add {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-2);
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 500;
    padding: 6px 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add:active { color: var(--text); border-color: var(--text-3); }
  .empty-text { font-size: 14px; color: var(--text-3); padding: 16px 0; }

  .hint {
    font-size: 12px;
    color: var(--text-3);
    margin-top: -6px;
  }

  .optional {
    font-size: 10px;
    font-weight: 400;
    color: var(--text-3);
    text-transform: none;
    letter-spacing: 0;
  }

  .form-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    margin-bottom: 12px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .field { display: flex; flex-direction: column; gap: 6px; }

  label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--text-3);
  }

  input {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 14px;
    padding: 10px 12px;
    transition: border-color 0.2s;
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
  }

  input:focus { border-color: var(--text-2); outline: none; }
  input::placeholder { color: var(--text-3); }

  .toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 3px;
    gap: 3px;
  }

  .toggle.three { grid-template-columns: 1fr 1fr 1fr; }
  .toggle.four { grid-template-columns: 1fr 1fr 1fr 1fr; }

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
    white-space: nowrap;
  }

  .toggle button.active { background: var(--text); color: var(--bg); }

  .deposit-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .deposit-controls {
    display: flex;
    width: 100%;
    justify-content: flex-start;
  }

  /* Compact toggle style for deposit */
  .deposit-row .toggle {
    gap: 6px;
    padding: 3px;
    max-width: 260px;
  }

  .deposit-row .toggle.compact button {
    padding: 6px 8px;
    font-size: 13px;
  }

  .deposit-input {
    width: 140px;
    padding: 8px 10px;
  }

  @media (min-width: 520px) {
    .deposit-row {
      flex-direction: row;
      align-items: center;
      gap: 12px;
    }
    .deposit-input { width: 160px; }
  }

  .btn-primary {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 700;
    padding: 12px;
    cursor: pointer;
    transition: opacity 0.2s;
    width: 100%;
  }

  .btn-primary:active { opacity: 0.8; }

  .session-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    margin-bottom: 8px;
  }

  .session-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .session-date { font-size: 14px; font-weight: 600; }

  .session-net {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--upcoming);
  }

  .session-bottom { display: flex; gap: 6px; flex-wrap: wrap; }

  .tag {
    font-size: 11px;
    color: var(--text-3);
    background: var(--surface-2);
    padding: 3px 8px;
    border-radius: 4px;
  }

  .cost-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 14px 16px;
    margin-bottom: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .cost-type { font-size: 14px; font-weight: 500; text-transform: capitalize; }

  .cost-amount {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 600;
    color: var(--error);
  }

  .form-error {
    font-size: 13px;
    color: var(--error);
    padding: 0 2px;
  }
</style>