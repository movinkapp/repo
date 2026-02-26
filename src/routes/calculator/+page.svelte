<script>
  let deal_type = 'percentage'
  let deal_value = ''
  let avg_session = ''
  let flight = ''
  let accommodation = ''
  let other = ''

  $: dv = Number(deal_value) || 0
  $: av = Number(avg_session) || 0
  $: totalCosts = (Number(flight) || 0) + (Number(accommodation) || 0) + (Number(other) || 0)
  $: artistKeeps = deal_type === 'percentage'
    ? av * (1 - dv / 100)
    : av - dv
  $: breakEven = artistKeeps > 0 && totalCosts > 0 ? Math.ceil(totalCosts / artistKeeps) : 0
  $: hasData = av > 0 && dv > 0

  $: projections = [1, 2, 3, 4, 5, 6, 7].map(n => ({
    sessions: n,
    net: (artistKeeps * n) - totalCosts,
    viable: (artistKeeps * n) >= totalCosts
  }))
</script>

<div class="page">

  <div class="header">
    <h1>Calculator</h1>
    <p class="subtitle">Is your next trip worth it?</p>
  </div>

  <!-- DEAL -->
  <div class="section">
    <p class="section-label">Deal</p>
    <div class="card">
      <div class="field">
        <p class="field-label">Deal type</p>
        <div class="toggle">
          <button type="button" class:active={deal_type === 'percentage'} onclick={() => deal_type = 'percentage'}>Commission %</button>
          <button type="button" class:active={deal_type === 'flat_daily'} onclick={() => deal_type = 'flat_daily'}>Flat daily</button>
        </div>
      </div>

      <div class="two-col">
        <div class="field">
          <p class="field-label">{deal_type === 'percentage' ? 'Studio takes' : 'Flat rate'}</p>
          <div class="input-wrap">
            <input type="number" bind:value={deal_value} placeholder="0" inputmode="numeric" />
            <span class="unit">{deal_type === 'percentage' ? '%' : '€'}</span>
          </div>
        </div>
        <div class="field">
          <p class="field-label">Avg session value</p>
          <div class="input-wrap">
            <input type="number" bind:value={avg_session} placeholder="0" inputmode="numeric" />
            <span class="unit">€</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- COSTS -->
  <div class="section">
    <p class="section-label">Trip costs</p>
    <div class="card">
      <div class="two-col">
        <div class="field">
          <p class="field-label">Flight</p>
          <div class="input-wrap">
            <input type="number" bind:value={flight} placeholder="0" inputmode="numeric" />
            <span class="unit">€</span>
          </div>
        </div>
        <div class="field">
          <p class="field-label">Accommodation</p>
          <div class="input-wrap">
            <input type="number" bind:value={accommodation} placeholder="0" inputmode="numeric" />
            <span class="unit">€</span>
          </div>
        </div>
      </div>
      <div class="field">
        <p class="field-label">Other costs</p>
        <div class="input-wrap">
          <input type="number" bind:value={other} placeholder="0" inputmode="numeric" />
          <span class="unit">€</span>
        </div>
      </div>
    </div>
  </div>

  <!-- RESULT — só aparece com dados -->
  {#if hasData}
    <div class="result-card">
      <div class="result-row">
        <div class="result-item">
          <p class="result-label">You keep per session</p>
          <p class="result-big">{artistKeeps.toFixed(0)}<span class="result-unit">€</span></p>
        </div>
        {#if totalCosts > 0}
          <div class="result-divider"></div>
          <div class="result-item">
            <p class="result-label">Total costs</p>
            <p class="result-mid">{totalCosts}€</p>
          </div>
        {/if}
      </div>

      {#if breakEven > 0}
        <div class="breakeven">
          <p class="breakeven-label">Break-even</p>
          <p class="breakeven-value">{breakEven} session{breakEven > 1 ? 's' : ''}</p>
        </div>
      {/if}
    </div>

    <!-- PROJECTIONS -->
    <div class="section">
      <p class="section-label">Projections</p>
      <div class="projections">
        {#each projections as p}
          <div class="proj-row {p.viable ? 'viable' : 'loss'}">
            <span class="proj-dot"></span>
            <p class="proj-label">{p.sessions} {p.sessions === 1 ? 'session' : 'sessions'}</p>
            <p class="proj-net">{p.net >= 0 ? '+' : ''}{p.net.toFixed(0)}€</p>
          </div>
        {/each}
      </div>
    </div>
  {/if}

</div>

<style>
  .page {
    padding: 56px 24px 100px;
  }

  .header {
    margin-bottom: 32px;
  }

  .header h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }

  .subtitle {
    font-size: 14px;
    color: var(--text-2);
  }

  .section {
    margin-bottom: 20px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 10px;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .input-wrap {
    position: relative;
  }

  .input-wrap input {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    padding: 11px 32px 11px 14px;
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    outline: none;
    transition: border-color 0.2s;
  }

  .input-wrap input:focus {
    border-color: var(--text-2);
  }

  .input-wrap input::placeholder {
    color: var(--text-3);
    font-weight: 400;
    font-size: 16px;
  }

  .unit {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    color: var(--text-3);
    pointer-events: none;
  }

  /* TOGGLE */
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
    padding: 9px 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .toggle button.active {
    background: var(--text);
    color: var(--bg);
  }

  /* RESULT */
  .result-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    margin-bottom: 20px;
  }

  .result-row {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 4px;
  }

  .result-item {
    flex: 1;
  }

  .result-divider {
    width: 1px;
    height: 44px;
    background: var(--border);
    flex-shrink: 0;
  }

  .result-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 4px;
  }

  .result-big {
    font-family: var(--font-display);
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1;
    color: var(--text);
  }

  .result-unit {
    font-size: 18px;
    font-weight: 400;
    color: var(--text-2);
    margin-left: 2px;
  }

  .result-mid {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -1px;
    color: var(--text-2);
  }

  .breakeven {
    border-top: 1px solid var(--border);
    padding-top: 14px;
    margin-top: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .breakeven-label {
    font-size: 13px;
    color: var(--text-2);
  }

  .breakeven-value {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
  }

  /* PROJECTIONS */
  .projections {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .proj-row {
    display: flex;
    align-items: center;
    padding: 13px 16px;
    border-bottom: 1px solid var(--border);
    gap: 10px;
  }

  .proj-row:last-child {
    border-bottom: none;
  }

  .proj-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .viable .proj-dot { background: var(--upcoming); }
  .loss .proj-dot { background: var(--error); }

  .proj-label {
    flex: 1;
    font-size: 14px;
    color: var(--text-2);
  }

  .proj-net {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
  }

  .viable .proj-net { color: var(--upcoming); }
  .loss .proj-net { color: var(--error); }
</style>