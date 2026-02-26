<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { LogOut } from 'lucide-svelte'

  let user = null
  let stats = { spots: 0, countries: 0, sessions: 0 }
  let loading = true

  onMount(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    user = u

    const { data: spots } = await supabase
      .from('spots')
      .select('country')

    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')

    if (spots) {
      stats.spots = spots.length
      stats.countries = new Set(spots.map(s => s.country)).size
    }

    if (sessions) {
      stats.sessions = sessions.length
    }

    loading = false
  })

  async function handleLogout() {
    await supabase.auth.signOut()
    goto('/login')
  }
</script>

<div class="page">
  {#if loading}
    <div class="loading">···</div>
  {:else}

    <div class="header">
      <div class="avatar">
        {(user?.user_metadata?.name || user?.email || '?')[0].toUpperCase()}
      </div>
      <div class="header-info">
        <h1>{user?.user_metadata?.name || 'Artist'}</h1>
        <p class="email">{user?.email}</p>
      </div>
    </div>

    <div class="section">
      <p class="section-label">Your Move</p>
      <div class="stats-grid">
        <div class="stat-card">
          <p class="stat-value">{stats.spots}</p>
          <p class="stat-label">SPOTS</p>
        </div>
        <div class="stat-card">
          <p class="stat-value">{stats.countries}</p>
          <p class="stat-label">COUNTRIES</p>
        </div>
        <div class="stat-card wide">
          <p class="stat-value">{stats.sessions}</p>
          <p class="stat-label">SESSIONS</p>
        </div>
      </div>
    </div>

    <div class="section">
      <p class="section-label">Account</p>
      <div class="menu">
        <button class="menu-item logout" onclick={handleLogout}>
          <LogOut size={16} strokeWidth={1.5} />
          <span>Sign out</span>
        </button>
      </div>
    </div>

  {/if}
</div>

<style>
  .page {
    padding: 56px 24px 100px;
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

  .header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 40px;
  }

  .avatar {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--surface-2);
    border: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    flex-shrink: 0;
  }

  .header-info h1 {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 2px;
  }

  .email {
    font-size: 13px;
    color: var(--text-2);
  }

  .section {
    margin-bottom: 28px;
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 10px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .stat-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 18px 20px;
  }

  .stat-card.wide {
    grid-column: span 2;
  }

  .stat-value {
    font-family: var(--font-display);
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: var(--text-2);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  .menu {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 16px 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 15px;
    transition: background 0.15s;
    text-align: left;
  }

  .menu-item:active {
    background: var(--surface-2);
  }

  .logout {
    color: var(--error);
  }
</style>