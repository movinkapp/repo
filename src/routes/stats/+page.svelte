<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { ChevronLeft } from 'lucide-svelte'
  import { formatAmount, getStatus, fadeSlide } from '$lib/utils.js'

  let spots = []
  let sessions = []
  let costs = []
  let loading = true
  let baseRate = 1
  let activeBar = null

  const currentYear = new Date().getFullYear()
  let selectedYear = currentYear

  $: years = [...new Set([
    currentYear,
    ...spots.map(s => new Date(s.start_date).getFullYear())
  ])].sort((a, b) => b - a)

  $: yearSpots = spots.filter(s =>
    new Date(s.start_date).getFullYear() === selectedYear &&
    getStatus(s) === 'completed'
  )

  $: yearSessions = sessions.filter(s => {
    if (!s.date) return false
    if (new Date(s.date).getFullYear() !== selectedYear) return false
    const spot = spots.find(sp => sp.id === s.spot_id)
    return spot && getStatus(spot) === 'completed'
  })

  $: yearCosts = costs.filter(c => {
    if (!c.date) return false
    if (new Date(c.date).getFullYear() !== selectedYear) return false
    const spot = spots.find(sp => sp.id === c.spot_id)
    return spot && getStatus(spot) === 'completed'
  })

  $: totalCountries = new Set(yearSpots.map(s => s.country)).size

  $: totalGross = yearSessions.reduce((sum, s) => {
    const spot = spots.find(sp => sp.id === s.spot_id)
    if (!spot || !s.value) return sum
    const rate = spot.exchange_rate || 1
    const artist = spot.deal_type === 'flat_daily'
      ? (s.value - spot.deal_value)
      : (s.value * (1 - spot.deal_value / 100))
    return sum + (artist / rate * baseRate)
  }, 0)

  $: totalCostsYear = yearCosts.reduce((sum, c) => {
    const spot = spots.find(sp => sp.id === c.spot_id)
    const rate = spot?.exchange_rate || 1
    return sum + (Number(c.amount) / rate * baseRate)
  }, 0)

  $: netProfit = totalGross - totalCostsYear

  $: keepRate = totalGross > 0
    ? Math.round((netProfit / totalGross) * 100)
    : null

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  $: monthlyData = monthNames.map((name, i) => {
    const monthSessions = yearSessions.filter(s =>
      s.date && new Date(s.date).getMonth() === i
    )
    const monthCosts = yearCosts.filter(c =>
      c.date && new Date(c.date).getMonth() === i
    )

    const gross = monthSessions.reduce((sum, s) => {
      const spot = spots.find(sp => sp.id === s.spot_id)
      if (!spot || !s.value) return sum
      const rate = spot.exchange_rate || 1
      const artist = spot.deal_type === 'flat_daily'
        ? (s.value - spot.deal_value)
        : (s.value * (1 - spot.deal_value / 100))
      return sum + (artist / rate * baseRate)
    }, 0)

    const costsTotal = monthCosts.reduce((sum, c) => {
      const spot = spots.find(sp => sp.id === c.spot_id)
      const rate = spot?.exchange_rate || 1
      return sum + (Number(c.amount) / rate * baseRate)
    }, 0)
    return { name, net: gross - costsTotal, gross, costs: costsTotal }
  })

  $: chartMax = Math.max(...monthlyData.map(m => Math.abs(m.net)), 1)
  const chartHeight = 100

  function barH(value) {
    return Math.max(Math.abs(value) / chartMax * chartHeight, value !== 0 ? 3 : 0)
  }

  // currency — convert all values to EUR base
  let currency = 'EUR'

  onMount(async () => {
    const { data: { user } } = await supabase.auth.getUser()

    const [spotsRes, sessionsRes, costsRes, profileRes] = await Promise.all([
      supabase.from('spots').select('*'),
      supabase.from('sessions').select('*'),
      supabase.from('costs').select('*'),
      supabase.from('users').select('base_currency').eq('id', user.id).single()
    ])

    spots = spotsRes.data || []
    sessions = sessionsRes.data || []
    costs = costsRes.data || []
    currency = profileRes.data?.base_currency || 'EUR'

    if (currency !== 'EUR') {
      const res = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${currency}`)
      const data = await res.json()
      baseRate = data.rates[currency] || 1
    } else {
      baseRate = 1
    }

    loading = false
  })
</script>

<div class="page">
  <div class="top-header">
    <a href="/profile" class="back">
      <ChevronLeft size={20} strokeWidth={1.5} />
    </a>
    <h1>Analytics</h1>

    {#if !loading && years.length > 1}
      <div class="year-toggle">
        {#each years as year}
          <button
            class:active={selectedYear === year}
            onclick={() => selectedYear = year}>
            {year}
          </button>
        {/each}
      </div>
    {:else}
      <div class="year-solo">
        <span>{selectedYear}</span>
      </div>
    {/if}
  </div>

  {#if loading}
    <div class="loading" transition:fade>···</div>
  {:else}

    <!-- NET PROFIT — destaque -->
    <div class="net-card {netProfit >= 0 ? 'positive' : 'negative'}">
      <p class="net-label">NET PROFIT</p>
      <p class="net-value">{formatAmount(netProfit, currency)} <span class="net-currency">{currency}</span></p>
      {#if keepRate !== null}
        <p class="net-sub">
          {#if netProfit >= 0}
            You kept {keepRate}% of what you made
          {:else}
            Costs exceeded earnings by {Math.abs(keepRate)}%
          {/if}
        </p>
      {:else}
        <p class="net-sub">No earnings recorded yet</p>
      {/if}
    </div>

    <!-- GROSS + COSTS -->
    <div class="row-2">
      <div class="stat-card">
        <p class="stat-label">GROSS</p>
        <p class="stat-value">{formatAmount(totalGross, currency)}</p>
        <p class="stat-currency">{currency}</p>
      </div>
      <div class="stat-card muted">
        <p class="stat-label">COSTS</p>
        <p class="stat-value">{formatAmount(totalCostsYear, currency)}</p>
        <p class="stat-currency">{currency}</p>
      </div>
    </div>

    <!-- ACTIVIDADE -->
    <div class="row-3">
      <div class="mini-card">
        <p class="mini-value">{yearSpots.length}</p>
        <p class="mini-label">SPOTS</p>
      </div>
      <div class="mini-card">
        <p class="mini-value">{totalCountries}</p>
        <p class="mini-label">COUNTRIES</p>
      </div>
      <div class="mini-card">
        <p class="mini-value">{yearSessions.length}</p>
        <p class="mini-label">SESSIONS</p>
      </div>
    </div>

    <!-- GRÁFICO -->
    <div class="chart-section">
      <p class="section-label">Net profit by month</p>
      <div class="chart-card">
        {#if monthlyData.every(m => m.net === 0)}
          <p class="chart-empty">No data for {selectedYear} yet.</p>
        {:else}
          <div class="chart-inner">
            <div class="bars">
              {#each monthlyData as month, i}
                <button type="button" class="bar-col" onclick={() => activeBar = activeBar === i ? null : i}>
                  <div class="bar-area">
                    {#if month.net > 0}
                      <div class="bar bar-pos" style="height:{barH(month.net)}px"></div>
                    {:else if month.net < 0}
                      <div class="bar bar-neg" style="height:{barH(month.net)}px"></div>
                    {:else}
                      <div class="bar-zero"></div>
                    {/if}
                  </div>
                  <p class="bar-label" class:bar-label-active={activeBar === i}>{month.name}</p>
                </button>
              {/each}
            </div>
            <div class="baseline"></div>
          </div>
        {/if}
      </div>

    {#if activeBar !== null}
      <div class="bar-tooltip" transition:fade={{ duration: 150 }}>
        <p class="tooltip-month">{monthlyData[activeBar].name}</p>
        <div class="tooltip-row">
          <span class="tooltip-gross">↑ {formatAmount(monthlyData[activeBar].gross, currency)} {currency}</span>
          <span class="tooltip-costs">↓ {formatAmount(monthlyData[activeBar].costs, currency)} {currency}</span>
        </div>
        <p class="tooltip-net {monthlyData[activeBar].net >= 0 ? 'pos' : 'neg'}">
          {monthlyData[activeBar].net >= 0 ? '+' : ''}{formatAmount(monthlyData[activeBar].net, currency)} {currency}
        </p>
      </div>
    {/if}
    </div>

  {/if}
</div>

<style>
  .page {
    padding: 56px 24px 100px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .top-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  }

  .back {
    color: var(--text-2);
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  h1 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    flex: 1;
  }

  .year-toggle {
    display: flex;
    gap: 4px;
  }

  .year-toggle button {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-3);
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 500;
    padding: 5px 10px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .year-toggle button.active {
    background: var(--text);
    color: var(--bg);
    border-color: var(--text);
  }

  .year-solo span {
    font-size: 12px;
    color: var(--text-3);
    font-weight: 500;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
    font-size: 24px;
    color: var(--text-3);
    letter-spacing: 4px;
  }

  /* NET CARD */
  .net-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 24px 20px 20px;
  }

  .net-card.positive {
    border-color: var(--upcoming);
  }

  .net-card.negative {
    border-color: var(--error);
  }

  .net-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 8px;
  }

  .net-value {
    font-family: var(--font-display);
    font-size: 48px;
    font-weight: 800;
    letter-spacing: -3px;
    line-height: 1;
    margin-bottom: 8px;
  }

  .net-card.positive .net-value { color: var(--upcoming); }
  .net-card.negative .net-value { color: var(--error); }

  .net-currency {
    font-size: 18px;
    font-weight: 400;
    letter-spacing: 0;
    color: var(--text-3);
  }

  .net-sub {
    font-size: 13px;
    color: var(--text-3);
  }

  /* GROSS + COSTS */
  .row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
  }

  .stat-card.muted .stat-value {
    color: var(--text-2);
  }

  .stat-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 6px;
  }

  .stat-value {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 800;
    letter-spacing: -1.5px;
    line-height: 1;
  }

  .stat-currency {
    font-size: 11px;
    color: var(--text-3);
    margin-top: 3px;
  }

  /* MINI CARDS — actividade */
  .row-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10px;
  }

  .mini-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 12px;
    text-align: center;
  }

  .mini-value {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1;
    margin-bottom: 4px;
  }

  .mini-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--text-3);
  }

  /* GRÁFICO */
  .chart-section {
    margin-top: 4px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 10px;
  }

  .chart-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 12px 12px;
  }

  .chart-empty {
    font-size: 14px;
    color: var(--text-3);
    text-align: center;
    padding: 24px 0;
  }

  .chart-inner {
    position: relative;
    padding-bottom: 2px;
  }

  .bars {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    height: 128px;
    padding-bottom: 22px;
  }

  .bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
  }

  .bar-area {
    width: 100%;
    height: 100px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .bar {
    width: 100%;
    min-height: 3px;
    border-radius: 3px 3px 0 0;
  }

  .bar-pos {
    background: var(--upcoming);
    opacity: 0.75;
  }

  .bar-neg {
    background: var(--error);
    opacity: 0.65;
    border-radius: 0 0 3px 3px;
  }

  .bar-zero {
    width: 100%;
    height: 1px;
    background: var(--border);
  }

  .bar-label {
    font-size: 9px;
    font-weight: 500;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.2px;
    margin-top: 6px;
    text-align: center;
  }

  .baseline {
    position: absolute;
    bottom: 22px;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--border);
  }

  .bar-col {
    cursor: pointer;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
  }

  .bar-label-active {
    color: var(--text);
    font-weight: 700;
  }

  .bar-tooltip {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    margin-top: 8px;
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: 4px 16px;
  }

  .tooltip-month {
    grid-column: 1 / -1;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 2px;
  }

  .tooltip-row {
    justify-self: end;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .tooltip-gross {
    font-size: 12px;
    color: var(--upcoming);
    font-weight: 500;
  }

  .tooltip-costs {
    font-size: 12px;
    color: var(--error);
    font-weight: 500;
  }

  .tooltip-net {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1;
  }

  .tooltip-net.pos { color: var(--upcoming); }
  .tooltip-net.neg { color: var(--error); }
</style>