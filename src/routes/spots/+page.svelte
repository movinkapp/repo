<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'
  import { MapPin, Plus, Calendar } from 'lucide-svelte'
  import { getStatus, formatDate, formatDeal } from '$lib/utils.js'

  let spots = []
  let loading = true

  $: activeSpots = spots.filter(s => getStatus(s) !== 'completed')
  $: pastSpots = spots.filter(s => getStatus(s) === 'completed')

  function getStatusLabel(status) {
    const labels = { upcoming: 'Upcoming', active: 'Active', completed: 'Done' }
    return labels[status] || status
  }

  onMount(async () => {
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .order('start_date', { ascending: true })

    if (!error) spots = data
    loading = false
  })
</script>

<div class="page">
  <div class="header">
    <h1>Spots</h1>
    <a href="/spots/new" class="btn-new">
      <Plus size={16} strokeWidth={2} />
      New
    </a>
  </div>

  {#if loading}
    <div class="loading">···</div>
  {:else if spots.length === 0}
    <div class="empty">
      <p class="empty-title">No spots yet.</p>
      <p class="empty-sub">Your next guest spot starts here.</p>
    </div>
  {:else}
    <div class="list">
      {#if activeSpots.length === 0}
        <div class="empty-active">
          <p class="empty-active-text">No upcoming spots planned.</p>
          <a href="/spots/new" class="empty-active-cta">Plan one →</a>
        </div>
      {/if}

      {#each activeSpots as spot}
        <a href="/spots/{spot.id}" class="card">
          <div class="card-top">
            <div class="card-info">
              <h2>{spot.studio_name}</h2>
              <p class="location">
                <MapPin size={12} strokeWidth={1.5} />
                {spot.city}, {spot.country}
              </p>
            </div>
            <div class="card-right">
              <span class="badge badge-{getStatus(spot)}">
                {getStatusLabel(getStatus(spot))}
              </span>
              {#if getStatus(spot) === 'upcoming'}
                <span class="days-chip">in {Math.ceil((new Date(spot.start_date) - new Date()) / 86400000)} d</span>
              {:else if getStatus(spot) === 'active'}
                <span class="days-chip">{Math.ceil((new Date(spot.end_date) - new Date()) / 86400000)} d left</span>
              {/if}
            </div>
          </div>
          <div class="card-bottom">
            <p class="dates">
              <Calendar size={12} strokeWidth={1.5} />
              {formatDate(spot.start_date)} → {formatDate(spot.end_date)}
            </p>
            <p class="deal">{formatDeal(spot)}</p>
          </div>
        </a>
      {/each}

      {#if pastSpots.length > 0}
        <div class="past-divider">
          <p class="past-label">Past</p>
        </div>
        {#each pastSpots as spot}
          <a href="/spots/{spot.id}" class="card past">
            <div class="card-top">
              <div class="card-info">
                <h2>{spot.studio_name}</h2>
                <p class="location">
                  <MapPin size={12} strokeWidth={1.5} />
                  {spot.city}, {spot.country}
                </p>
              </div>
            </div>
            <div class="card-bottom">
              <p class="dates">
                <Calendar size={12} strokeWidth={1.5} />
                {formatDate(spot.start_date)} → {formatDate(spot.end_date)}
              </p>
              <p class="deal">{formatDeal(spot)}</p>
            </div>
          </a>
        {/each}
      {/if}
    </div>
  {/if}
</div>

<style>
  .page { padding: 56px 24px 100px; }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .header h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }

  .loading {
    display: flex;
    justify-content: center;
    padding: 60px 0;
    font-size: 24px;
    color: var(--text-3);
    letter-spacing: 4px;
  }

  .empty {
    text-align: center;
    padding: 60px 0;
  }

  .empty-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .empty-sub {
    font-size: 14px;
    color: var(--text-2);
  }

  .empty-active {
    padding: 24px 0 8px;
    text-align: center;
  }

  .empty-active-text {
    font-size: 14px;
    color: var(--text-3);
    margin-bottom: 8px;
  }

  .empty-active-cta {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-2);
    text-decoration: none;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
    text-decoration: none;
    color: var(--text);
    display: block;
    transition: border-color 0.2s;
  }

  .card:active { border-color: var(--text-3); }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
  }

  .card-info h2 {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.3px;
    margin-bottom: 4px;
  }

  .location {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--text-2);
  }

  .card-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }

  .badge {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
  }

  .badge-upcoming { background: var(--surface-2); color: var(--text-2); }
  .badge-active { background: var(--active); color: #000; }
  .badge-completed { background: var(--surface-2); color: var(--completed); }

  .days-chip {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-3);
    letter-spacing: 0.3px;
  }

  .card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dates {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--text-2);
  }

  .deal {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 500;
  }

  .btn-new {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 500;
    padding: 8px 12px;
    text-decoration: none;
    transition: border-color 0.2s;
  }

  .btn-new:active { border-color: var(--text-3); }

  .past-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 8px 0;
  }

  .past-divider::before,
  .past-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border);
  }

  .past-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    white-space: nowrap;
  }

  .card.past { opacity: 0.5; }
</style>