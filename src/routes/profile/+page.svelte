<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { LogOut, BarChart2 } from 'lucide-svelte'
  import { toast } from '$lib/toast.js'

  let user = null
  let loading = true

  onMount(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    user = u
    loading = false
  })

  async function handleLogout() {
    await supabase.auth.signOut()
    toast('Signed out')
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
      <a href="/stats" class="card-cta">
        <div class="cta-header">
          <BarChart2 size={16} strokeWidth={1.5} />
          <p class="cta-label">Analytics</p>
        </div>
        <p class="cta-title">How's your year going?</p>
        <p class="cta-hint">Earnings, costs and net profit by year →</p>
      </a>
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

  .card-cta:active {
    border-color: var(--text-3);
  }

  .cta-header {
    display: flex;
    align-items: center;
    gap: 6px;
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