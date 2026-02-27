<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { goto } from '$app/navigation'
  import { ChevronLeft, Plus, MapPin, X, Trash2, Pencil } from 'lucide-svelte'
  import { formatDate, formatDeal, formatAmount } from '$lib/utils.js'
  import { toast, toastConfirm } from '$lib/toast.js'
  import CalendarPicker from '$lib/components/CalendarPicker.svelte'

  let spot = null
  let sessions = []
  let costs = []
  let loading = true
  let showSessionForm = false
  let showCostForm = false
  let userBaseCurrency = 'EUR'

  // add session fields
  let date = null
  let status = 'confirmed'
  let session_type = 'full_day'
  let value = ''
  let deposit_received = false
  let deposit_value = ''
  let payment_method = 'cash'
  let notes = ''

  // add cost fields
  let cost_type = 'flight'
  let cost_amount = ''
  let cost_date = null
  let cost_notes = ''
  let sessionError = ''
  let costError = ''

  // edit state
  let editingSessionId = null
  let editingCostId = null

  // edit session fields
  let edit_date = null
  let edit_status = 'confirmed'
  let edit_session_type = 'full_day'
  let edit_value = ''
  let edit_deposit_received = false
  let edit_deposit_value = ''
  let edit_payment_method = 'cash'
  let edit_notes = ''
  let editSessionError = ''

  // edit cost fields
  let edit_cost_type = 'flight'
  let edit_cost_amount = ''
  let edit_cost_date = null
  let edit_cost_notes = ''
  let editCostError = ''

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
    // fetch user's profile to get base currency
    const { data: profileData } = await supabase
      .from('users')
      .select('base_currency')
      .eq('id', (await supabase.auth.getUser()).data.user.id)
      .single()

    userBaseCurrency = profileData?.base_currency || 'EUR'
    loading = false
  })

  function calcArtist(session) {
    if (!session.value) return 0
    if (spot.deal_type === 'flat_daily') return session.value - spot.deal_value
    return session.value * (1 - spot.deal_value / 100)
  }

  function capitalize(str) {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  function toLocalDateStr(d) {
    if (!d) return null
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  async function addSession() {
    const { error } = await supabase.from('sessions').insert({
      spot_id: $page.params.id,
      date: date ? toLocalDateStr(date) : null,
      status, session_type,
      value: value || null,
      base_currency: userBaseCurrency,
      deposit_received,
      deposit_value: deposit_value || null,
      payment_method, notes
    })

    if (error) {
      sessionError = 'Could not save session. Try again.'
      toast('Could not save session. Try again.', 'error')
      return
    }

    sessionError = ''
    const { data } = await supabase
      .from('sessions').select('*')
      .eq('spot_id', $page.params.id)
      .order('date', { ascending: true })
    sessions = data
    toast('Session saved')
    showSessionForm = false
    date = null; value = ''; deposit_value = ''; notes = ''
    deposit_received = false
  }

  async function addCost() {
    const { error } = await supabase.from('costs').insert({
      spot_id: $page.params.id,
      type: cost_type,
      amount: cost_amount,
      date: cost_date ? toLocalDateStr(cost_date) : null,
      notes: cost_notes
    })

    if (error) {
      costError = 'Could not save cost. Try again.'
      toast('Could not save cost. Try again.', 'error')
      return
    }

    costError = ''
    const { data } = await supabase
      .from('costs').select('*')
      .eq('spot_id', $page.params.id)
      .order('date', { ascending: true })
    costs = data
    toast('Cost saved')
    showCostForm = false
    cost_amount = ''; cost_date = null; cost_notes = ''
  }

  function startEditSession(session) {
    editingSessionId = session.id
    editingCostId = null
    edit_date = session.date ? new Date(session.date + 'T12:00:00') : null
    edit_status = session.status
    edit_session_type = session.session_type
    edit_value = session.value || ''
    edit_deposit_received = session.deposit_received || false
    edit_deposit_value = session.deposit_value || ''
    edit_payment_method = session.payment_method
    edit_notes = session.notes || ''
    editSessionError = ''
  }

  function cancelEditSession() {
    editingSessionId = null
    editSessionError = ''
  }

  async function saveEditSession(id) {
    const { error } = await supabase.from('sessions').update({
      date: edit_date ? toLocalDateStr(edit_date) : null,
      status: edit_status,
      session_type: edit_session_type,
      value: edit_value || null,
      deposit_received: edit_deposit_received,
      deposit_value: edit_deposit_value || null,
      payment_method: edit_payment_method,
      notes: edit_notes
    }).eq('id', id)

    if (error) {
      editSessionError = 'Could not update session. Try again.'
      toast('Could not update session. Try again.', 'error')
      return
    }

    const { data } = await supabase
      .from('sessions').select('*')
      .eq('spot_id', $page.params.id)
      .order('date', { ascending: true })
    sessions = data
    editingSessionId = null
    toast('Session updated')
  }

  async function deleteSession(id) {
    toastConfirm('Delete this session?', async () => {
      const { error } = await supabase.from('sessions').delete().eq('id', id)
      if (error) { toast('Could not delete session. Try again.', 'error'); return }
      sessions = sessions.filter(s => s.id !== id)
      toast('Session deleted')
    })
  }

  function startEditCost(cost) {
    editingCostId = cost.id
    editingSessionId = null
    edit_cost_type = cost.type
    edit_cost_amount = cost.amount
    edit_cost_date = cost.date ? new Date(cost.date + 'T12:00:00') : null
    edit_cost_notes = cost.notes || ''
    editCostError = ''
  }

  function cancelEditCost() {
    editingCostId = null
    editCostError = ''
  }

  async function saveEditCost(id) {
    const { error } = await supabase.from('costs').update({
      type: edit_cost_type,
      amount: edit_cost_amount,
      date: edit_cost_date ? toLocalDateStr(edit_cost_date) : null,
      notes: edit_cost_notes
    }).eq('id', id)

    if (error) {
      editCostError = 'Could not update cost. Try again.'
      toast('Could not update cost. Try again.', 'error')
      return
    }

    const { data } = await supabase
      .from('costs').select('*')
      .eq('spot_id', $page.params.id)
      .order('date', { ascending: true })
    costs = data
    editingCostId = null
    toast('Cost updated')
  }

  async function deleteCost(id) {
    toastConfirm('Delete this cost?', async () => {
      const { error } = await supabase.from('costs').delete().eq('id', id)
      if (error) { toast('Could not delete cost. Try again.', 'error'); return }
      costs = costs.filter(c => c.id !== id)
      toast('Cost deleted')
    })
  }

  $: sessionDates = sessions.map(s => s.date).filter(Boolean)
  $: isDateLogged = (d) => d && sessionDates.includes(toLocalDateStr(d))
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
        <span class="deal-tag">{formatDeal(spot)}</span>
      </div>
    </div>
  </div>

  <div class="summary">
    <div class="summary-top">
      <div class="summary-item">
        <p class="summary-label">GROSS EARNINGS</p>
        <p class="summary-value-sm">{formatAmount(totalArtist, spot.currency)} <span class="currency">{spot.currency}</span></p>
      </div>
      <div class="summary-item">
        <p class="summary-label">TRIP COSTS</p>
        <p class="summary-value-sm">{formatAmount(totalCosts, spot.currency)} <span class="currency">{spot.currency}</span></p>
      </div>
    </div>
    <div class="summary-divider-h"></div>
    <div class="summary-net">
      <p class="summary-label">Net profit</p>
      <p class="summary-value-lg {netProfit >= 0 ? 'positive' : 'negative'}">
        {formatAmount(netProfit, spot.currency)} <span class="currency">{spot.currency}</span>
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
        <div class="form-col">
          <div class="field">
            <label for="cal-session-date">Date</label>
            <CalendarPicker
              id="cal-session-date"
              bind:value={date}
              spotStart={spot.start_date}
              spotEnd={spot.end_date}
              markedDates={sessionDates}
            />
            {#if date && isDateLogged(date)}
              <p class="date-warning">A session already exists for this date.</p>
            {/if}
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
          <div class="toggle">
            <button type="button" class:active={status === 'confirmed'} onclick={() => status = 'confirmed'}>Confirmed</button>
            <button type="button" class:active={status === 'walk_in'} onclick={() => status = 'walk_in'}>Walk-in</button>
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
          <div class="toggle" style="max-width:260px;">
            <button type="button" class:active={!deposit_received} onclick={() => deposit_received = false} aria-pressed={!deposit_received}>No deposit</button>
            <button type="button" class:active={deposit_received} onclick={() => deposit_received = true} aria-pressed={deposit_received}>Deposit received</button>
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
        {#if editingSessionId === session.id}
          <div class="form-card">
            <div class="form-col">
              <div class="field">
                <label for="cal-edit-session-date">Date</label>
                <CalendarPicker
                  id="cal-edit-session-date"
                  bind:value={edit_date}
                  spotStart={spot.start_date}
                  spotEnd={spot.end_date}
                  markedDates={sessionDates}
                />
              </div>
              <div class="field">
                <label for="es-value">Session total ({spot.currency})</label>
                <input id="es-value" bind:value={edit_value} type="number" placeholder="0" />
              </div>
            </div>

            <div class="field">
              <p class="field-label">Session type</p>
              <div class="toggle">
                <button type="button" class:active={edit_session_type === 'full_day'} onclick={() => edit_session_type = 'full_day'}>Full day</button>
                <button type="button" class:active={edit_session_type === 'half_day'} onclick={() => edit_session_type = 'half_day'}>Half day</button>
              </div>
            </div>

            <div class="field">
              <p class="field-label">Booking status</p>
              <div class="toggle three">
                <button type="button" class:active={edit_status === 'confirmed'} onclick={() => edit_status = 'confirmed'}>Confirmed</button>
                <button type="button" class:active={edit_status === 'walk_in'} onclick={() => edit_status = 'walk_in'}>Walk-in</button>
                <button type="button" class:active={edit_status === 'cancelled'} onclick={() => edit_status = 'cancelled'}>Cancelled</button>
              </div>
            </div>

            <div class="field">
              <p class="field-label">Payment method</p>
              <div class="toggle three">
                <button type="button" class:active={edit_payment_method === 'cash'} onclick={() => edit_payment_method = 'cash'}>Cash</button>
                <button type="button" class:active={edit_payment_method === 'transfer'} onclick={() => edit_payment_method = 'transfer'}>Transfer</button>
                <button type="button" class:active={edit_payment_method === 'card'} onclick={() => edit_payment_method = 'card'}>Card</button>
              </div>
            </div>

            <p class="hint">Deposit received?</p>
            <div class="deposit-row">
              <div class="toggle" style="max-width:260px;">
                <button type="button" class:active={!edit_deposit_received} onclick={() => edit_deposit_received = false} aria-pressed={!edit_deposit_received}>No deposit</button>
                <button type="button" class:active={edit_deposit_received} onclick={() => edit_deposit_received = true} aria-pressed={edit_deposit_received}>Deposit received</button>
              </div>
              {#if edit_deposit_received}
                <input bind:value={edit_deposit_value} type="number" placeholder="Amount" class="deposit-input" aria-label="Deposit amount" />
              {/if}
            </div>

            {#if editSessionError}
              <p class="form-error">{editSessionError}</p>
            {/if}

            <div class="edit-actions">
              <button class="btn-cancel" onclick={cancelEditSession}>Cancel</button>
              <button class="btn-primary" onclick={() => saveEditSession(session.id)}>Save changes</button>
            </div>
          </div>
        {:else}
          <div class="session-card">
            <div class="session-top">
              <p class="session-date">{formatDate(session.date)}</p>
              <p class="session-net">+{formatAmount(calcArtist(session), spot.currency)} <span class="session-currency">{spot.currency}</span></p>
            </div>
            <p class="session-meta">
              {session.session_type === 'full_day' ? 'Full day' : 'Half day'} · {session.payment_method}
              {#if session.value} · Total: {formatAmount(session.value, spot.currency)} {spot.currency}{/if}
            </p>
            {#if session.deposit_received && session.deposit_value}
              <p class="session-deposit">Deposit: {formatAmount(session.deposit_value, spot.currency)} {spot.currency} already received</p>
            {/if}
            <div class="card-actions">
              <button class="btn-icon" onclick={() => startEditSession(session)} aria-label="Edit session">
                <Pencil size={13} strokeWidth={1.5} />
              </button>
              <button class="btn-icon btn-icon-danger" onclick={() => deleteSession(session.id)} aria-label="Delete session">
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        {/if}
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

        <div class="form-col">
          <div class="field">
            <label for="c-amount">Amount ({spot.currency})</label>
            <input id="c-amount" bind:value={cost_amount} type="number" placeholder="0" />
          </div>
          <div class="field">
            <label for="cal-cost-date">Date <span class="optional">(optional)</span></label>
            <CalendarPicker
              id="cal-cost-date"
              bind:value={cost_date}
              spotStart={spot.start_date}
              spotEnd={spot.end_date}
              markedDates={[]}
            />
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
        {#if editingCostId === cost.id}
          <div class="form-card">
            <div class="field">
              <p class="field-label">Cost category</p>
              <div class="toggle four">
                <button type="button" class:active={edit_cost_type === 'flight'} onclick={() => edit_cost_type = 'flight'}>Flight</button>
                <button type="button" class:active={edit_cost_type === 'accommodation'} onclick={() => edit_cost_type = 'accommodation'}>Stay</button>
                <button type="button" class:active={edit_cost_type === 'food'} onclick={() => edit_cost_type = 'food'}>Food</button>
                <button type="button" class:active={edit_cost_type === 'other'} onclick={() => edit_cost_type = 'other'}>Other</button>
              </div>
            </div>

            <div class="form-col">
              <div class="field">
                <label for="ec-amount">Amount ({spot.currency})</label>
                <input id="ec-amount" bind:value={edit_cost_amount} type="number" placeholder="0" />
              </div>
              <div class="field">
                <label for="cal-edit-cost-date">Date <span class="optional">(optional)</span></label>
                <CalendarPicker
                  id="cal-edit-cost-date"
                  bind:value={edit_cost_date}
                  spotStart={spot.start_date}
                  spotEnd={spot.end_date}
                  markedDates={[]}
                />
              </div>
            </div>

            <div class="field">
              <label for="ec-notes">Notes</label>
              <input id="ec-notes" bind:value={edit_cost_notes} type="text" placeholder="Optional" />
            </div>

            {#if editCostError}
              <p class="form-error">{editCostError}</p>
            {/if}

            <div class="edit-actions">
              <button class="btn-cancel" onclick={cancelEditCost}>Cancel</button>
              <button class="btn-primary" onclick={() => saveEditCost(cost.id)}>Save changes</button>
            </div>
          </div>
        {:else}
          <div class="cost-card">
            <div class="cost-left">
              <p class="cost-type">{capitalize(cost.type)}</p>
              {#if cost.date}
                <p class="cost-date">{formatDate(cost.date)}</p>
              {/if}
            </div>
            <div class="cost-right">
              <p class="cost-amount">-{formatAmount(cost.amount, spot.currency)} {spot.currency}</p>
              <div class="card-actions">
                <button class="btn-icon" onclick={() => startEditCost(cost)} aria-label="Edit cost">
                  <Pencil size={13} strokeWidth={1.5} />
                </button>
                <button class="btn-icon btn-icon-danger" onclick={() => deleteCost(cost.id)} aria-label="Delete cost">
                  <Trash2 size={13} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        {/if}
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
    letter-spacing: 1px;
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

  .form-col {
    display: flex;
    flex-direction: column;
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
    box-sizing: border-box;
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

  .deposit-row .toggle { max-width: 260px; }

  .deposit-input {
    width: 140px;
    padding: 8px 10px;
  }

  .edit-actions {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 8px;
  }

  .btn-cancel {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-2);
    font-family: var(--font-body);
    font-size: 14px;
    font-weight: 500;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-cancel:active { border-color: var(--text-3); color: var(--text); }

  .btn-primary {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    padding: 14px;
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
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .session-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .session-date {
    font-size: 14px;
    font-weight: 600;
  }

  .session-net {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--upcoming);
    letter-spacing: -0.5px;
  }

  .session-currency {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-2);
  }

  .session-meta {
    font-size: 12px;
    color: var(--text-3);
    text-transform: capitalize;
  }

  .session-deposit {
    font-size: 12px;
    color: var(--active);
  }

  .card-actions {
    display: flex;
    gap: 4px;
    margin-top: 2px;
  }

  .btn-icon {
    background: none;
    border: none;
    color: var(--text-3);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    transition: color 0.2s;
  }

  .btn-icon:active { color: var(--text); }
  .btn-icon-danger:active { color: var(--error); }

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

  .cost-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .cost-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .cost-type { font-size: 14px; font-weight: 500; text-transform: capitalize; }
  .cost-date { font-size: 12px; color: var(--text-3); }

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

  .date-warning {
    font-size: 12px;
    color: var(--error);
    opacity: 0.8;
    padding: 0 2px;
  }
</style>