<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { onMount } from 'svelte'
  import { LogOut, BarChart2, ChevronRight, Users } from 'lucide-svelte'
  import { toasts, toast } from '$lib/toast.js'
  import { currencySymbols, fadeSlide } from '$lib/utils.js'
  import { requestNotificationPermission, isNotificationsEnabled, disableNotifications } from '$lib/notifications.js'

  let user = null
  let baseCurrency = 'EUR'
  let tempCurrency = 'EUR'
  let loading = true
  let instagram = ''
  let communityVisible = false
  let savingProfile = false
  let notificationsEnabled = false
  let notifLoading = false
  let notifPermission = 'default'
  let modalOpen = false

  const currencies = ['EUR', 'GBP', 'USD', 'BRL', 'AUD', 'JPY', 'CHF', 'CAD', 'KRW']

  onMount(async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    user = u

    const { data: profile } = await supabase
      .from('users')
      .select('base_currency, instagram, community_visible')
      .eq('id', u.id)
      .single()

    baseCurrency = profile?.base_currency || 'EUR'
    instagram = profile?.instagram || ''
    communityVisible = profile?.community_visible || false
    loading = false
    notificationsEnabled = await isNotificationsEnabled()
    if (typeof Notification !== 'undefined') {
      notifPermission = Notification.permission
    }
  })

  function openModal() {
    tempCurrency = baseCurrency
    modalOpen = true
  }

  async function saveInstagram() {
    savingProfile = true
    const clean = instagram.replace(/^@/, '').trim()
    instagram = clean
    await supabase
      .from('users')
      .update({ instagram: clean })
      .eq('id', user.id)
    savingProfile = false
    toast('Instagram saved')
  }

  async function toggleCommunity() {
    communityVisible = !communityVisible
    await supabase
      .from('users')
      .update({ community_visible: communityVisible })
      .eq('id', user.id)
    toast(communityVisible ? 'You are now visible to other artists' : 'You are now hidden from the community')
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

  async function toggleNotifications() {
    if (notificationsEnabled) {
      const confirmed = await new Promise((resolve) => {
        toasts.update(t => [...t, {
          id: 999,
          message: 'Disable push notifications?',
          type: 'confirm',
          onConfirm: () => {
            toasts.update(t => t.filter(x => x.id !== 999))
            resolve(true)
          },
          onCancel: () => {
            toasts.update(t => t.filter(x => x.id !== 999))
            resolve(false)
          }
        }])
      })
      if (!confirmed) return
      notifLoading = true
      try {
        await disableNotifications()
        notificationsEnabled = false
        toast('Notifications disabled')
      } catch (e) {
        toast('Could not disable notifications. Try again.', 'error')
      } finally {
        notifLoading = false
      }
    } else {
      notifLoading = true
      try {
        const result = await requestNotificationPermission()
        if (result.ok) {
          notificationsEnabled = true
          toast('Notifications enabled')
        } else if (result.reason === 'denied') {
          toast('Permission denied. Enable in browser settings.', 'error')
        } else if (result.reason === 'not_supported') {
          toast('Push notifications not supported in this browser.', 'error')
        } else {
          toast('Could not enable notifications. Try again.', 'error')
        }
      } finally {
        notifLoading = false
      }
    }
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
      <p class="section-label">Explore</p>
      <div class="explore-stack">
        <a href="/stats" class="card-cta">
          <div class="cta-header">
            <BarChart2 size={16} strokeWidth={1.5} />
            <p class="cta-label">Analytics</p>
          </div>
          <p class="cta-title">How's your year going?</p>
          <p class="cta-hint">Earnings, costs and net profit by year →</p>
        </a>
        <a href="/community" class="card-cta">
          <div class="cta-header">
            <Users size={16} strokeWidth={1.5} />
            <p class="cta-label">Community</p>
          </div>
          <p class="cta-title">Who's in your city?</p>
          <p class="cta-hint">See other artists doing guest spots near you →</p>
        </a>
      </div>
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
      <p class="section-label">Notifications</p>
      <div class="menu">
        {#if notifPermission === 'denied'}
          <div class="menu-item">
            <div class="menu-item-left">
              <span class="menu-item-label">Push notifications</span>
              <span class="menu-item-value notif-blocked">Blocked in browser settings</span>
            </div>
            <span class="notif-status notif-off"></span>
          </div>
        {:else}
          <button class="menu-item" onclick={toggleNotifications} disabled={notifLoading}>
            <div class="menu-item-left">
              <span class="menu-item-label">Push notifications</span>
              <span class="menu-item-value">{notificationsEnabled ? 'Enabled' : 'Tap to enable'}</span>
            </div>
            <span class="notif-status {notificationsEnabled ? 'notif-on' : 'notif-off'}"></span>
          </button>
        {/if}
      </div>
      <p class="setting-hint">Get reminded 7 days before your flight, 3 days before your spot starts, and 1 day before with your checklist status.</p>
    </div>

    <div class="section">
      <p class="section-label">Profile</p>
      <div class="menu">
        <div class="menu-item menu-item-instagram">
          <div class="menu-item-left" style="flex:1;">
            <span class="menu-item-label">Instagram</span>
            <input
              class="instagram-input"
              type="text"
              placeholder="@yourhandle"
              bind:value={instagram}
              onblur={saveInstagram}
            />
          </div>
        </div>
        <button class="menu-item" onclick={toggleCommunity}>
          <div class="menu-item-left">
            <span class="menu-item-label">Artist community</span>
            <span class="menu-item-value">
              {communityVisible ? 'Visible to other artists' : 'Hidden — tap to join'}
            </span>
          </div>
          <span class="notif-status {communityVisible ? 'notif-on' : 'notif-off'}"></span>
        </button>
      </div>
      {#if communityVisible}
        <p class="community-hint">
          Other artists can see you're in the same city during your guest spots. You can see them too.
        </p>
      {/if}
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
    margin-bottom: 32px;
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

  .section { margin-bottom: 24px; }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 10px;
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

  .explore-stack {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

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

  .notif-status {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .notif-on { background: var(--upcoming); }
  .notif-off { background: var(--border); }
  .notif-blocked {
    color: var(--error) !important;
  }

  .instagram-input {
    background: none;
    border: none;
    color: var(--text-2);
    font-family: var(--font-body);
    font-size: 13px;
    padding: 0;
    width: 100%;
    outline: none;
    margin-top: 2px;
  }

  .instagram-input::placeholder { color: var(--text-3); }

  .menu-item-instagram { cursor: default; }
  .menu-item-instagram:active { background: none; }

  .community-hint {
    font-size: 12px;
    color: var(--text-3);
    margin-top: 8px;
    padding: 0;
    line-height: 1.5;
  }

  .setting-hint {
    font-size: 12px;
    color: var(--text-3);
    line-height: 1.5;
    margin-top: 8px;
    padding: 0;
  }
</style>