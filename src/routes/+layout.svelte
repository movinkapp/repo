<script>
  import '../app.css'
  import { fade } from 'svelte/transition'
  import { navigating, page } from '$app/stores'
  import { Home, MapPin, Calculator, User } from 'lucide-svelte'
  import Toast from '$lib/components/Toast.svelte'

  $: isLogin = ['/', '/login', '/onboarding', '/auth/confirmed', '/auth/reset', '/waitlist'].includes($page.url.pathname)
</script>

{#key $navigating?.to?.url.pathname}
  <div in:fade={{ duration: 150, delay: 50 }}>
    <slot />
    <Toast />
  </div>
{/key}

{#if !isLogin}
  <nav class="bottom-nav">
    <a href="/home" class:active={$page.url.pathname === '/home'}>
      <Home size={22} strokeWidth={1.5} />
      <span>Home</span>
    </a>

    <a href="/spots" class:active={$page.url.pathname.startsWith('/spots')}>
      <MapPin size={22} strokeWidth={1.5} />
      <span>Spots</span>
    </a>

    <a href="/calculator" class:active={$page.url.pathname === '/calculator'}>
      <Calculator size={22} strokeWidth={1.5} />
      <span>Calculate</span>
    </a>

    <a href="/profile" class:active={$page.url.pathname === '/profile'}>
      <User size={22} strokeWidth={1.5} />
      <span>Profile</span>
    </a>
  </nav>
{/if}

<style>
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 430px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 10px 0 24px;
    z-index: 100;
  }

  .bottom-nav a {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: var(--text-3);
    text-decoration: none;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.3px;
    transition: color 0.2s;
    padding: 4px 16px;
  }

  .bottom-nav a.active {
    color: var(--text);
  }

  .bottom-nav a:active {
    color: var(--text);
  }
</style>