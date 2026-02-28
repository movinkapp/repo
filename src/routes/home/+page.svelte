<script>
  import { supabase } from '$lib/supabase.js'
  import { currencySymbols, fadeSlide } from '$lib/utils.js'
  import { onMount } from 'svelte'
  import { Calculator } from 'lucide-svelte'
  import { getStatus } from '$lib/utils.js'
  import { goto } from '$app/navigation'

  let userName = ''
  let spots = []
  let sessions = []
  let loading = true

  let showCurrencyModal = false
  let tempCurrency = 'EUR'
  const currencies = ['EUR', 'GBP', 'USD', 'BRL', 'AUD', 'JPY', 'CHF', 'CAD', 'KRW']

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  onMount(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there'

    const { data: spotsData } = await supabase
      .from('spots')
      .select('*')
      .order('start_date', { ascending: true })

    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('id, spot_id')

    spots = spotsData || []
    sessions = sessionsData || []
    loading = false

    const { data: profile } = await supabase
      .from('users')
      .select('base_currency')
      .eq('id', user.id)
      .single()
    if (!profile?.base_currency) showCurrencyModal = true
  })

  $: activeSpot = spots.find(s => getStatus(s) === 'active')
  $: upcomingSpot = spots.find(s => getStatus(s) === 'upcoming')
  $: upcomingSpots = spots.filter(s => getStatus(s) === 'upcoming')

  $: nextSpotDays = (() => {
    if (activeSpot) {
      const diff = Math.ceil((new Date(activeSpot.end_date) - new Date()) / 86400000)
      return { value: diff, label: 'days left', spot: activeSpot, isActive: true }
    }
    if (upcomingSpot) {
      const diff = Math.ceil((new Date(upcomingSpot.start_date) - new Date()) / 86400000)
      return { value: diff, label: 'days to go', spot: upcomingSpot, isActive: false }
    }
    return null
  })()

  function handleNextSpotClick() {
    if (nextSpotDays?.spot) goto(`/spots/${nextSpotDays.spot.id}`)
    else goto('/spots')
  }

  async function saveCurrency() {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('users')
      .update({ base_currency: tempCurrency })
      .eq('id', user.id)
    showCurrencyModal = false
  }
</script>

<div class="page">
  {#if loading}
    <div class="loading">···</div>
  {:else}
    <div class="greeting">
      <p class="greeting-text">{getGreeting()}, {userName}.</p>
    </div>

    <div class="stats-grid">
      {#if nextSpotDays}
        <button class="stat-card {nextSpotDays.isActive ? 'stat-active' : 'stat-upcoming'}" onclick={handleNextSpotClick}>
          <p class="stat-value {nextSpotDays.isActive ? 'stat-value-active' : 'stat-value-upcoming'}">{nextSpotDays.value}</p>
          <p class="stat-label">{nextSpotDays.label}</p>
          <p class="stat-sub">{nextSpotDays.spot.studio_name}</p>
        </button>
      {:else}
        <a href="/spots/new" class="stat-card stat-empty">
          <p class="stat-value">—</p>
          <p class="stat-label">No spots</p>
          <p class="stat-sub">Plan one →</p>
        </a>
      {/if}

      <div class="stat-card">
        <p class="stat-value">{upcomingSpots.length}</p>
        <p class="stat-label">Upcoming</p>
        <p class="stat-sub">&nbsp;</p>
      </div>

      <div class="stat-card wide">
        <p class="stat-value">{sessions.filter(s => spots.find(sp => sp.id === s.spot_id && (getStatus(sp) === 'active' || getStatus(sp) === 'upcoming'))).length}</p>
        <p class="stat-label">Sessions ahead</p>
      </div>
    </div>

    <div class="section">
      <a href="/calculator" class="card-cta">
        <div class="cta-header">
          <Calculator size={16} strokeWidth={1.5} />
          <p class="cta-label">Calculator</p>
        </div>
        <p class="cta-title">Is your next guest spot worth it?</p>
        <p class="cta-hint">Simulate the deal before you say yes →</p>
      </a>
    </div>
  {/if}
</div>

{#if showCurrencyModal}
  <button class="overlay" onclick={() => showCurrencyModal = false} aria-label="Close" transition:fadeSlide={{ duration: 200, y: 0 }}></button>
  <div class="sheet" transition:fadeSlide={{ duration: 300, y: 40 }}>
    <div class="sheet-handle"></div>
    <p class="sheet-title">Your base currency</p>
    <p class="sheet-hint">All your analytics will be shown in this currency. You can change it anytime in your profile.</p>
    <div class="currency-grid">
      {#each currencies as c}
        <button
          class="currency-btn"
          class:active={tempCurrency === c}
          onclick={() => tempCurrency = c}>
          <span class="currency-symbol">{currencySymbols[c] || c}</span>
          <span class="currency-code">{c}</span>
        </button>
      {/each}
    </div>
    <button class="btn-primary-sheet" onclick={saveCurrency}>Let's go</button>
  </div>
{/if}

<style>
  .page {
    padding: 56px 24px 100px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-size: 24px;
    color: var(--text-3);
    letter-spacing: 4px;
  }

  .greeting {
    margin-bottom: 24px;
  }

  .greeting-text {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 8px;
  }

  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    text-align: left;
    text-decoration: none;
    color: var(--text);
    display: block;
  }

  .stat-card.wide {
    grid-column: span 2;
  }


  .stat-active {
  border-color: var(--upcoming);
  cursor: pointer;
  transition: opacity 0.18s;
  font-family: inherit;
  width: 100%;
  background: rgba(74, 222, 128, 0.06);
}

.stat-active:active { opacity: 0.7; }


  .stat-upcoming {
  border-color: var(--active);
  cursor: pointer;
  transition: opacity 0.2s;
  font-family: inherit;
  width: 100%;
  background: rgba(245, 158, 11, 0.04);
}

.stat-upcoming:active { opacity: 0.7; }

  .stat-empty {
    border-style: dashed;
  }

  .stat-value {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1;
    margin-bottom: 4px;
    color: var(--text);
  }

  .stat-value-active {
    color: var(--upcoming);
  }

  .stat-value-upcoming {
    color: var(--active);
  }


  .stat-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .stat-sub {
    font-size: 11px;
    color: var(--text-3);
    margin-top: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .section {
    margin-top: 8px;
  }

  .card-cta {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    display: block;
    text-decoration: none;
    color: var(--text);
    transition: border-color 0.2s;
  }

  .card-cta:active { border-color: var(--text-3); }

  .cta-header {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-3);
    margin-bottom: 12px;
  }

  .cta-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .cta-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text);
    margin-bottom: 6px;
  }

  .cta-hint {
    font-size: 13px;
    color: var(--text-3);
  }

  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 40;
    border: none;
    cursor: pointer;
    width: 100%;
  }

  .sheet {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 430px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    border-radius: 16px 16px 0 0;
    padding: 12px 24px 100px;
    z-index: 50;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sheet-handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    margin: 0 auto 8px;
  }

  .sheet-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .sheet-hint {
    font-size: 13px;
    color: var(--text-3);
    margin-top: -4px;
    line-height: 1.5;
  }

  .currency-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .currency-btn {
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    padding: 10px 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .currency-btn.active {
    border-color: var(--text);
    background: var(--bg);
  }

  .currency-symbol {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
  }

  .currency-code {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--text-3);
  }

  .btn-primary-sheet {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    padding: 14px;
    cursor: pointer;
    width: 100%;
    transition: opacity 0.2s;
  }

  .btn-primary-sheet:active { opacity: 0.8; }
</style>