<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'

  let userName = ''
  let spots = []
  let loading = true

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  function getStatus(spot) {
    const today = new Date()
    const start = new Date(spot.start_date)
    const end = new Date(spot.end_date)
    if (today < start) return 'upcoming'
    if (today > end) return 'completed'
    return 'active'
  }

  function daysUntil(date) {
    const today = new Date()
    const target = new Date(date)
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  function daysLeft(date) {
    const today = new Date()
    const target = new Date(date)
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24))
    return diff
  }

  onMount(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there'

    const { data } = await supabase
      .from('spots')
      .select('*')
      .order('start_date', { ascending: false })

    spots = data || []
    loading = false
  })

  $: activeSpot = spots.find(s => getStatus(s) === 'active')
  $: upcomingSpot = spots.find(s => getStatus(s) === 'upcoming')
  $: lastSpot = spots.find(s => getStatus(s) === 'completed')
  $: completedSpots = spots.filter(s => getStatus(s) === 'completed')
</script>

<div class="page">
  {#if loading}
    <div class="loading">···</div>
  {:else}
    <div class="greeting">
      <p class="greeting-text">{getGreeting()}, {userName}.</p>
    </div>

    <!-- SPOT ATIVO -->
    {#if activeSpot}
      <a href={`/spots/${activeSpot.id}`} class="card card-active">
        <span class="badge badge-active">On the road</span>
        <h2>{activeSpot.studio_name}</h2>
        <p class="card-sub">{activeSpot.city}, {activeSpot.country}</p>
        <p class="card-detail">{daysLeft(activeSpot.end_date)} days left</p>
      </a>

    <!-- PROXIMO SPOT -->
    {:else if upcomingSpot}
      <a href={`/spots/${upcomingSpot.id}`} class="card card-upcoming">
        <span class="badge badge-upcoming">Coming up</span>
        <h2>{upcomingSpot.studio_name}</h2>
        <p class="card-sub">{upcomingSpot.city}, {upcomingSpot.country}</p>
        <p class="card-detail">In {daysUntil(upcomingSpot.start_date)} days</p>
      </a>

    <!-- SEM SPOTS -->
    {:else}
      <a href="/spots/new" class="card card-empty">
        <p class="empty-title">Your story starts here.</p>
        <p class="empty-sub">Add your first spot →</p>
      </a>
    {/if}

    <!-- ULTIMO SPOT -->
    {#if lastSpot}
      <div class="section">
        <p class="section-label">Last stop</p>
        <a href={`/spots/${lastSpot.id}`} class="card card-last">
          <p class="last-name">{lastSpot.studio_name}</p>
          <p class="card-sub">{lastSpot.city} · {lastSpot.start_date.slice(0, 7)}</p>
        </a>
      </div>
    {/if}

    <!-- THIS YEAR -->
    {#if completedSpots.length > 0}
      <div class="section">
        <p class="section-label">This year</p>
        <div class="stats-row">
          <div class="stat">
            <p class="stat-value">{completedSpots.length}</p>
            <p class="stat-label">trips</p>
          </div>
          <div class="stat">
            <p class="stat-value">{spots.length}</p>
            <p class="stat-label">total spots</p>
          </div>
        </div>
      </div>
    {/if}

    <!-- CALCULATOR CTA -->
    <div class="section">
      <a href="/calculator" class="card card-cta">
        <p class="cta-text">Run the numbers →</p>
        <p class="card-sub">Before you say yes.</p>
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

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .card:active {
    border-color: var(--text-3);
  }

  .card-active {
    border-color: var(--active);
  }

  .card h2 {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin: 8px 0 4px;
  }

  .card-sub {
    font-size: 13px;
    color: var(--text-2);
  }

  .card-detail {
    font-size: 13px;
    color: var(--text-2);
    margin-top: 8px;
  }

  .badge {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .badge-active {
    background: var(--active);
    color: #000;
  }

  .badge-upcoming {
    background: var(--surface-2);
    color: var(--text-2);
  }
  a.card {
  display: block;
  color: var(--text);
  text-decoration: none;
}
  .card-empty {
    border-style: dashed;
    text-align: center;
    padding: 40px 20px;
  }

  .empty-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 8px;
  }

  .empty-sub {
    font-size: 14px;
    color: var(--text-2);
  }

  .section {
    margin-top: 16px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 8px;
  }

  .card-last {
    cursor: pointer;
  }

  .last-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  .stats-row {
    display: flex;
    gap: 12px;
  }

  .stat {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 20px;
    flex: 1;
  }

  .stat-value {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -1px;
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-2);
    margin-top: 2px;
  }

  .card-cta {
    border-style: dashed;
  }

  .cta-text {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }
</style>