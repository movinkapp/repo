<script>
  import { supabase } from '$lib/supabase.js'
  import { goto } from '$app/navigation'
  import { currencySymbols, fadeSlide } from '$lib/utils.js'

  let current = 0
  let showCurrencyModal = false
  let tempCurrency = 'EUR'
  const currencies = ['EUR', 'GBP', 'USD', 'BRL', 'AUD', 'JPY', 'CHF', 'CAD', 'KRW']

  const slides = [
    {
      icon: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="60" cy="60" r="40" stroke="currentColor" stroke-width="1.5"/>
        <path d="M60 20 L60 60 L85 85" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="60" cy="60" r="4" fill="currentColor"/>
        <path d="M20 60 Q40 40 60 60 Q80 80 100 60" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.4"/>
      </svg>`,
      label: 'Plan',
      title: 'Your next move,\nplanned.',
      body: 'Add your guest spots before you go. Dates, studio, deal — everything in one place.'
    },
    {
      icon: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="35" width="70" height="55" rx="4" stroke="currentColor" stroke-width="1.5"/>
        <path d="M25 50 L95 50" stroke="currentColor" stroke-width="1" opacity="0.4"/>
        <path d="M45 68 L55 78 L78 58" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M60 20 L60 35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M45 20 L45 35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M75 20 L75 35" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
      label: 'Track',
      title: 'Your numbers,\nalways clear.',
      body: 'Log each session as it happens — gross, net, costs. Everything in one place, no spreadsheets.'
    },
    {
      icon: `<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 90 L50 60 L65 75 L80 45 L95 55" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="95" cy="55" r="4" fill="currentColor"/>
        <path d="M30 95 L95 95" stroke="currentColor" stroke-width="1" opacity="0.3"/>
        <path d="M30 30 L30 95" stroke="currentColor" stroke-width="1" opacity="0.3"/>
        <path d="M50 95 L50 60" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.2"/>
        <path d="M80 95 L80 45" stroke="currentColor" stroke-width="1" stroke-dasharray="3 3" opacity="0.2"/>
      </svg>`,
      label: 'Decide',
      title: 'Know before\nyou say yes.',
      body: 'Not every guest spot is worth it. Run the numbers first — flights, deal, sessions. See the real picture.'
    }
  ]

  async function finish() {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('users')
      .update({ onboarding_completed: true })
      .eq('id', user.id)
    goto('/')
  }

  function next() {
    if (current < slides.length - 1) {
      current++
    } else {
      showCurrencyModal = true
    }
  }

  async function saveCurrencyAndFinish() {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase
      .from('users')
      .update({ base_currency: tempCurrency })
      .eq('id', user.id)
    showCurrencyModal = false
    finish()
  }

  function skip() {
    finish()
  }
</script>

<div class="page">
  <button class="skip" onclick={skip}>Skip</button>

  <div class="slides">
    {#each slides as slide, i}
      <div class="slide" class:active={i === current} class:prev={i < current}>
        <div class="icon" style="color: var(--text)">
          {@html slide.icon}
        </div>
        <p class="label">{slide.label}</p>
        <h1>{slide.title}</h1>
        <p class="body">{slide.body}</p>
      </div>
    {/each}
  </div>

  <div class="bottom">
    <div class="dots">
      {#each slides as _, i}
        <button 
          class="dot" 
          class:active={i === current}
          onclick={() => current = i}
          aria-label="Go to slide {i + 1}"
        ></button>
      {/each}
    </div>

    <button class="btn-primary" onclick={next}>
      {current < slides.length - 1 ? 'Next' : 'Get started'}
    </button>
  </div>
</div>

{#if showCurrencyModal}
  <button
    class="overlay"
    onclick={() => saveCurrencyAndFinish()}
    aria-label="Close modal"
    transition:fadeSlide={{ duration: 200, y: 0 }}
  ></button>
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
    <button class="btn-save" onclick={saveCurrencyAndFinish}>Let's go</button>
  </div>
{/if}

<style>
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 56px 32px 48px;
    position: relative;
    overflow: hidden;
  }

  .skip {
    position: absolute;
    top: 56px;
    right: 32px;
    background: none;
    border: none;
    color: var(--text-3);
    font-family: var(--font-body);
    font-size: 14px;
    cursor: pointer;
    padding: 4px 0;
    transition: color 0.2s;
  }

  .skip:active {
    color: var(--text);
  }

  .slides {
    flex: 1;
    display: flex;
    align-items: center;
    position: relative;
  }

  .slide {
    position: absolute;
    width: 100%;
    opacity: 0;
    transform: translateX(40px);
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  .slide.active {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }

  .slide.prev {
    opacity: 0;
    transform: translateX(-40px);
  }

  .icon {
    width: 120px;
    height: 120px;
    margin-bottom: 40px;
  }

  .label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 12px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 800;
    letter-spacing: -1px;
    line-height: 1.1;
    white-space: pre-line;
    margin-bottom: 16px;
  }

  .body {
    font-size: 16px;
    line-height: 1.6;
    color: var(--text-2);
    max-width: 300px;
  }

  .bottom {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .dots {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--border);
    border: none;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s;
  }

  .dot.active {
    background: var(--text);
    width: 20px;
    border-radius: 3px;
  }

  .btn-primary {
    background: var(--text);
    color: var(--bg);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    padding: 16px;
    cursor: pointer;
    width: 100%;
    transition: opacity 0.2s;
    letter-spacing: -0.3px;
  }

  .btn-primary:active {
    opacity: 0.8;
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
    padding: 12px 24px 48px;
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
    line-height: 1.5;
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

  .btn-save {
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

  .btn-save:active { opacity: 0.8; }
</style>