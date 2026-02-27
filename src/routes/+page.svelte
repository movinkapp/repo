<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'
  import { Calculator } from 'lucide-svelte'
  import { getStatus } from '$lib/utils.js'
  import { goto } from '$app/navigation'

  let userName = ''
  let spots = []
  let sessions = []
  let loading = true

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
</style>