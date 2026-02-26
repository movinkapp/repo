<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'
  import { Calculator } from 'lucide-svelte'
  import { getStatus, formatDate } from '$lib/utils.js'

  let userName = ''
  let spots = []
  let loading = true

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }


  function daysUntil(date) {
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
  $: completedSpots = spots.filter(s => {
    if (getStatus(s) !== 'completed') return false
    return new Date(s.start_date).getFullYear() === new Date().getFullYear()
  })
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
        <div class="card-main-row">
          <h2>{activeSpot.studio_name}</h2>
          <div class="days-row">
            <span class="days-number days-active">{daysUntil(activeSpot.end_date)}</span>
            <span class="days-label">days left</span>
          </div>
        </div>
        <p class="card-sub">{activeSpot.city}, {activeSpot.country}</p>
      </a>

    <!-- PROXIMO SPOT -->
    {:else if upcomingSpot}
      <a href={`/spots/${upcomingSpot.id}`} class="card card-upcoming">
        <span class="badge badge-upcoming">Coming up</span>
        <div class="card-main-row">
          <h2>{upcomingSpot.studio_name}</h2>
          <div class="days-row">
            <span class="days-number days-upcoming">{daysUntil(upcomingSpot.start_date)}</span>
            <span class="days-label">days to go</span>
          </div>
        </div>
        <p class="card-sub">{upcomingSpot.city}, {upcomingSpot.country}</p>
      </a>

    <!-- SEM SPOTS -->
    {:else}
      <a href="/spots/new" class="card card-empty">
        <div class="empty-icon">
          <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <path d="M8 40 L16 24 L24 32 L32 16 L40 22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="40" cy="22" r="3" fill="currentColor"/>
          </svg>
        </div>
        <p class="empty-title">No moves yet.</p>
        <p class="empty-sub">Where will you go next?</p>
        <span class="empty-btn">Add your first spot</span>
      </a>
    {/if}

    <!-- ULTIMO SPOT -->
    {#if lastSpot}
      <div class="section">
        <p class="section-label">Last stop</p>
        <a href={`/spots/${lastSpot.id}`} class="card card-last">
          <p class="last-name">{lastSpot.studio_name}</p>
          <p class="card-sub">{lastSpot.city} · {formatDate(lastSpot.start_date)}</p>
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
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.25);
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
    background: var(--surface-2);
    border: 1px solid var(--border);
  }

  .card-main-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin: 8px 0 4px;
  }

  .card-main-row h2 {
    margin: 0;
    flex: 1;
  }

  .days-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
    flex-shrink: 0;
    text-align: right;
  }

  .cta-header {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-3);
    margin-bottom: 12px;
  }

  .cta-header .cta-label {
    margin-bottom: 0;
  }

  .days-number {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1;
    color: var(--text);
  }

  .days-label {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 500;
  }

  .empty-icon {
    color: var(--text-3);
    margin-bottom: 16px;
  }

  .days-active {
    color: var(--active);
  }

  .days-upcoming {
    color: var(--text);
  }

  .empty-btn {
    display: inline-block;
    margin-top: 16px;
    background: var(--text);
    color: var(--bg);
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    letter-spacing: -0.3px;
  }

  .cta-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 12px;
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