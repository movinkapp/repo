<script>
  import { supabase } from '$lib/supabase.js'
  import { onMount } from 'svelte'
  import { MapPin, Plus, Calendar } from 'lucide-svelte'

  let spots = []
  let loading = true

  function getStatus(spot) {
    const today = new Date()
    const start = new Date(spot.start_date)
    const end = new Date(spot.end_date)
    if (today < start) return 'upcoming'
    if (today > end) return 'completed'
    return 'active'
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  onMount(async () => {
    const { data, error } = await supabase
      .from('spots')
      .select('*')
      .order('start_date', { ascending: false })

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
      <p class="empty-sub">Add your first guest spot to get started.</p>
    </div>
  {:else}
    <div class="list">
      {#each spots as spot}
        <a href="/spots/{spot.id}" class="card">
          <div class="card-top">
            <div class="card-info">
              <h2>{spot.studio_name}</h2>
              <p class="location">
                <MapPin size={12} strokeWidth={1.5} />
                {spot.city}, {spot.country}
              </p>
            </div>
            <span class="badge badge-{getStatus(spot)}">
              {getStatus(spot)}
            </span>
          </div>
          <div class="card-bottom">
            <p class="dates">
              <Calendar size={12} strokeWidth={1.5} />
              {formatDate(spot.start_date)} → {formatDate(spot.end_date)}
            </p>
            <p class="deal">
              {spot.deal_type === 'flat_daily' 
                ? spot.deal_value + ' ' + spot.currency + '/day' 
                : spot.deal_value + '% commission'}
            </p>
          </div>
        </a>
      {/each}
    </div>
  {/if}

</div>

<style>
  .page {
    padding: 56px 24px 100px;
  }

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

  .card:active {
    border-color: var(--text-3);
  }

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

  .badge {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    padding: 4px 8px;
    border-radius: 4px;
    white-space: nowrap;
  }

  .badge-upcoming {
    background: var(--surface-2);
    color: var(--text-2);
  }

  .badge-active {
    background: var(--active);
    color: #000;
  }

  .badge-completed {
    background: var(--surface-2);
    color: var(--completed);
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

  .btn-new:active {
    border-color: var(--text-3);
  }
</style>