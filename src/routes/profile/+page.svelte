<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { LogOut, BarChart2, ChevronRight } from 'lucide-svelte'
  import { toast } from '$lib/toast.js'
  import { currencySymbols, fadeSlide } from '$lib/utils.js'

  let user = null
  let baseCurrency = 'EUR'
  let tempCurrency = 'EUR'
  let loading = true
  let modalOpen = false

  const currencies = ['EUR', 'GBP', 'USD', 'BRL', 'AUD', 'JPY', 'CHF', 'CAD', 'KRW']

  onMount(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    user = u

    const { data: profile } = await supabase
      .from('users')
      .select('base_currency')
      .eq('id', u.id)
      .single()

    baseCurrency = profile?.base_currency || 'EUR'
    loading = false
  })

  function openModal() {
    tempCurrency = baseCurrency
    modalOpen = true
  }

  async function saveCurrency() {
    baseCurrency = tempCurrency
    modalOpen = false
    await supabase
      .from('users')
      .update({ base_currency: baseCurrency })
      .eq('id', user.id)
    toast('Base currency updated')
  }

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
      <p class="section-label">Preferences</p>
      <div class="menu">
        <button class="menu-item" onclick={openModal}>
          <div class="menu-item-left">
            <span class="menu-item-label">Base currency</span>
            <span class="menu-item-value">{currencySymbols[baseCurrency] || baseCurrency} {baseCurrency}</span>
          </div>
          <ChevronRight size={16} strokeWidth={1.5} class="chevron" />
        </button>
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

<!-- Modal -->
{#if modalOpen}
  <button class="overlay" onclick={() => modalOpen = false} aria-label="Close modal" transition:fadeSlide={{ duration: 200, y: 0 }}></button>
  
  <div class="sheet" transition:fadeSlide={{ duration: 300, y: 40 }}>
    <div class="sheet-handle"></div>
    <p class="sheet-title">Base currency</p>
    <p class="sheet-hint">All analytics are converted to this currency.</p>
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
    <button class="btn-primary" onclick={saveCurrency}>Save</button>
  </div>
{/if}

<style>
  .page { padding: 56px 24px 100px; }

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

  .email { font-size: 13px; color: var(--text-2); }

  .section { margin-bottom: 28px; }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 6px;
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
    justify-content: space-between;
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

  .menu-item:active { background: var(--surface-2); }
  .logout { color: var(--error); }

  .menu-item-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .menu-item-label {
    font-size: 15px;
    color: var(--text);
  }

  .menu-item-value {
    font-size: 13px;
    color: var(--text-3);
  }

  :global(.chevron) { color: var(--text-3); }

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

  .cta-hint { font-size: 13px; color: var(--text-3); }

  /* Bottom sheet */
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
    padding: 12px 24px 100px; /* aumentei pra cobrir o navbar */
    z-index: 50;
  }

  .sheet-handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--border);
    margin: 0 auto 20px;
  }

  .sheet-title {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 700;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }

  .sheet-hint {
    font-size: 13px;
    color: var(--text-3);
    margin-bottom: 20px;
  }

  .currency-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 20px;
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

  .btn-primary {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    padding: 15px;
    cursor: pointer;
    width: 100%;
    transition: opacity 0.2s;
  }

  .btn-primary:active { opacity: 0.8; }

  /* keyframes removed: handled by Svelte transitions (fadeSlide) */
</style>