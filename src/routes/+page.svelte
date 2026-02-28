<script>
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { supabase } from '$lib/supabase.js'

  onMount(async () => {
    // Prefer server-validated session for deciding initial PWA redirect
    let serverAuth = null
    try {
      const res = await fetch('/api/session')
      if (res.ok) {
        const json = await res.json()
        serverAuth = json.authenticated
      }
    } catch (e) {
      // network error — fall back to client session below
    }

    // If opened as an installed PWA, send user to the appropriate app route
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      if (serverAuth === null) {
        // server check failed — fall back to client-side session
        const { data: { session } } = await supabase.auth.getSession()
        goto(session ? '/home' : '/login')
      } else {
        goto(serverAuth ? '/home' : '/login')
      }
      return
    }
    // ── CANVAS — ink trail diagonal ─────────────────────────────────
    const canvas = document.getElementById('inkCanvas')
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // City positions — loop TYO → BER → DUB → NYC → TYO forever
    const cities = [
      { rx: 0.80, ry: 0.22 },
      { rx: 0.55, ry: 0.38 },
      { rx: 0.30, ry: 0.55 },
      { rx: 0.10, ry: 0.72 },
    ]

    const SEG_TRAVEL = 3000
    const SEG_PAUSE  = 700
    const SEG_TOTAL  = SEG_TRAVEL + SEG_PAUSE
    const LOOP_TOTAL = cities.length * SEG_TOTAL

    let t0 = null, raf = null, trail = []
    let lastAngle = -Math.PI * 0.35

    function eio(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t }

    function draw(ts) {
      if (!t0) t0 = ts
      const elapsed = (ts - t0) % LOOP_TOTAL
      const W = canvas.width, H = canvas.height
      const pts = cities.map(c => ({ x: c.rx * W, y: c.ry * H }))

      const segIdx  = Math.floor(elapsed / SEG_TOTAL)
      const segTime = elapsed % SEG_TOTAL
      const nextIdx = (segIdx + 1) % cities.length
      const a = pts[segIdx], b = pts[nextIdx]

      // arc control point curves upward between cities
      const ctrl = {
        x: (a.x + b.x) / 2,
        y: Math.min(a.y, b.y) - Math.abs(b.x - a.x) * 0.15,
      }

      let plane, angle
      const moving = segTime < SEG_TRAVEL

      if (moving) {
        const t  = eio(segTime / SEG_TRAVEL)
        const t2 = eio(Math.min(segTime + 14, SEG_TRAVEL) / SEG_TRAVEL)
        plane = {
          x: (1-t)*(1-t)*a.x + 2*(1-t)*t*ctrl.x + t*t*b.x,
          y: (1-t)*(1-t)*a.y + 2*(1-t)*t*ctrl.y + t*t*b.y,
        }
        const nxt = {
          x: (1-t2)*(1-t2)*a.x + 2*(1-t2)*t2*ctrl.x + t2*t2*b.x,
          y: (1-t2)*(1-t2)*a.y + 2*(1-t2)*t2*ctrl.y + t2*t2*b.y,
        }
        angle = Math.atan2(nxt.y - plane.y, nxt.x - plane.x)
        lastAngle = angle
        trail.push({ x: plane.x, y: plane.y, ts })
      } else {
        plane = b
        angle = lastAngle
      }

      // trim trail
      trail = trail.filter(p => p.ts > ts - 2200)

      ctx.clearRect(0, 0, W, H)

      // fading trail
      for (let i = 1; i < trail.length; i++) {
        const age = (ts - trail[i].ts) / 2200
        ctx.beginPath()
        ctx.moveTo(trail[i-1].x, trail[i-1].y)
        ctx.lineTo(trail[i].x, trail[i].y)
        ctx.strokeStyle = `rgba(240,240,240,${(1-age) * 0.22})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // city dots + pulse on active destination
      pts.forEach((p, i) => {
        const active = i === nextIdx
        if (active) {
          const pulse = (ts % 1600) / 1600
          ctx.beginPath()
          ctx.arc(p.x, p.y, 3 + pulse * 16, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(240,240,240,${(1-pulse) * 0.1})`
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, active ? 2.8 : 2, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(240,240,240,${active ? 0.5 : 0.15})`
        ctx.fill()
      })

      // plane — always rendered, holds at city during pause
      ctx.save()
      ctx.translate(plane.x, plane.y)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(12, 0)
      ctx.lineTo(-6, 5)
      ctx.lineTo(-4, 0)
      ctx.lineTo(-6, -5)
      ctx.closePath()
      ctx.fillStyle = 'rgba(240,240,240,0.65)'
      ctx.fill()
      ctx.restore()

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    // ── SCROLL REVEAL ───────────────────────────────────────────────
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('in'), i * 90)
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' })
    document.querySelectorAll('.reveal').forEach(el => io.observe(el))

    // ── SCRAMBLE ────────────────────────────────────────────────────
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ·—·'
    function scramble(el, final, dur = 1000) {
      let start = null
      const len = final.length
      function step(ts) {
        if (!start) start = ts
        const p = Math.min((ts - start) / dur, 1)
        const revealed = Math.floor(p * len)
        let out = ''
        for (let i = 0; i < len; i++) {
          if (i < revealed) out += final[i]
          else out += final[i] === ' ' ? ' ' : chars[Math.floor(Math.random()*chars.length)]
        }
        el.textContent = out
        if (p < 1) requestAnimationFrame(step)
        else el.textContent = final
      }
      requestAnimationFrame(step)
    }

    setTimeout(() => {
      const el = document.getElementById('hero-tag')
      if (el) scramble(el, 'FOR TATTOO ARTISTS ON THE MOVE', 1200)
    }, 500)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      io.disconnect()
    }
  })
</script>

<svelte:head>
  <title>Movink — Built for artists who never stop moving</title>
</svelte:head>

<!-- grain -->
<div class="grain" aria-hidden="true"></div>

<!-- bg canvas -->
<canvas id="inkCanvas"></canvas>

<!-- ══ NAV ══════════════════════════════════════════════════════════ -->
<header class="nav">
  <a href="/" class="wordmark">
    <span class="wm-mov">MOV</span><span class="wm-ink">INK</span>
  </a>
  <nav class="nav-links">
    <a href="#features" class="nav-link">Features</a>
    <a href="#install"  class="nav-link">Install</a>
    <a href="/login"    class="nav-cta">Get started →</a>
  </nav>
</header>

<!-- ══ HERO ═════════════════════════════════════════════════════════ -->
<section class="hero">

  

  <div class="hero-inner">
    <!-- LEFT: text + CTA -->
    <div class="hero-left">
      <p class="hero-tag" id="hero-tag" aria-label="For tattoo artists on the move">&nbsp;</p>

      <div class="hero-text">
        <h1>
          <span class="hl hl-bold">Every</span>
          <span class="hl hl-italic">guest spot.</span>
          <span class="hl hl-bold">One place.</span>
        </h1>
        <p class="hero-sub">Track sessions, calculate deals, and plan every spot — wherever in the world you are.</p>
      </div>

      <div class="hero-bottom">
        <a href="/login" class="btn-hero">Start for free</a>
        <p class="hero-note">No card &nbsp;·&nbsp; Any device &nbsp;·&nbsp; Works offline</p>
      </div>
    </div>

    <!-- RIGHT: departures board card -->
    <div class="hero-right">
      <div class="dep-card">
        <div class="dep-card-header">
          <span class="dep-card-label">NET EARNINGS</span>
          <span class="dep-card-sub">Last 4 spots</span>
        </div>
        <div class="departures" aria-label="Sample earnings">
          <div class="dep-row">
            <span class="dep-city">TYO</span>
            <span class="dep-line"></span>
            <span class="dep-val">¥ 48,000</span>
            <span class="dep-net">+¥ 28,800</span>
          </div>
          <div class="dep-row">
            <span class="dep-city">BER</span>
            <span class="dep-line"></span>
            <span class="dep-val">€ 3,200</span>
            <span class="dep-net">+€ 2,520</span>
          </div>
          <div class="dep-row">
            <span class="dep-city">SEO</span>
            <span class="dep-line"></span>
            <span class="dep-val">₩ 820,000</span>
            <span class="dep-net">+₩ 560,000</span>
          </div>
          <div class="dep-row">
            <span class="dep-city">LDN</span>
            <span class="dep-line"></span>
            <span class="dep-val">£ 2,400</span>
            <span class="dep-net">+£ 1,800</span>
          </div>
        </div>
        <div class="dep-card-total">
          <span class="dct-label">Total net</span>
          <span class="dct-val">+ £ 9,420</span>
        </div>
      </div>
    </div>
  </div>

  <span class="bg-word" aria-hidden="true">MOVE</span>
</section>

<!-- ══ DIVIDER TICKER ════════════════════════════════════════════════ -->
<div class="ticker-band" aria-hidden="true">
  <div class="ticker-inner">
    {#each {length: 4} as _}
      <span>PLAN YOUR SPOT</span>
      <span class="td">—</span>
      <span>TRACK EVERY SESSION</span>
      <span class="td">—</span>
      <span>KNOW YOUR NUMBERS</span>
      <span class="td">—</span>
      <span>CITY TO CITY</span>
      <span class="td">—</span>
    {/each}
  </div>
</div>

<!-- ══ FEATURES ═════════════════════════════════════════════════════ -->
<section class="features" id="features">

  <!-- 01 -->
  <div class="feat reveal">
    <div class="feat-meta">
      <span class="feat-n">01</span>
      <span class="feat-tag">Plan</span>
    </div>
    <div class="feat-body">
      <h2 class="feat-title">
        Plan your<br/><em>spot.</em>
      </h2>
      <p class="feat-desc">Studio, city, dates, deal — all in one place before you pack the bags. Log each session as it happens. Your calendar, your rules.</p>
    </div>
    <div class="feat-card">
      <div class="card-inner">
        <div class="ci-header">
          <div>
            <p class="ci-studio">Studio Irezumi</p>
            <p class="ci-location">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              Tokyo, JP
            </p>
          </div>
          <span class="ci-badge">● Active</span>
        </div>
        <p class="ci-dates">12 – 18 March</p>
        <div class="ci-sessions">
          <div class="ci-sess"><span>Mar 13</span><span class="cv">¥ 18,000</span></div>
          <div class="ci-sess"><span>Mar 14</span><span class="cv">¥ 22,000</span></div>
          <div class="ci-sess"><span>Mar 15</span><span class="cv">¥ 14,000</span></div>
        </div>
        <div class="ci-net">
          <span class="ci-net-label">Net profit</span>
          <span class="ci-net-val">¥ 28,800</span>
        </div>
      </div>
    </div>
  </div>

  <!-- divider -->
  <div class="feat-rule"></div>

  <!-- 02 -->
  <div class="feat feat-rev reveal">
    <div class="feat-meta">
      <span class="feat-n">02</span>
      <span class="feat-tag">Calculate</span>
    </div>
    <div class="feat-body">
      <h2 class="feat-title">
        Know your<br/><em>numbers.</em>
      </h2>
      <p class="feat-desc">Calculate any deal before you say yes. Gross, net, break-even — real time. No spreadsheets. No surprises at checkout.</p>
    </div>
    <div class="feat-card">
      <div class="card-inner">
        <div class="calc-rows">
          <div class="calc-row">
            <span class="cr-label">Gross earnings</span>
            <span class="cr-val">¥ 48,000</span>
          </div>
          <div class="calc-row dim">
            <span class="cr-label">Studio cut 30%</span>
            <span class="cr-val">−¥ 14,400</span>
          </div>
          <div class="calc-row dim">
            <span class="cr-label">Trip costs</span>
            <span class="cr-val">−¥ 4,800</span>
          </div>
          <div class="calc-divider"></div>
          <div class="calc-row net">
            <span class="cr-label">Net profit</span>
            <span class="cr-net">¥ 28,800</span>
          </div>
        </div>
        <p class="calc-break">Break-even at <strong>3 sessions</strong></p>
      </div>
    </div>
  </div>

  <!-- divider -->
  <div class="feat-rule"></div>

  <!-- 03 -->
  <div class="feat reveal">
    <div class="feat-meta">
      <span class="feat-n">03</span>
      <span class="feat-tag">Prepare</span>
    </div>
    <div class="feat-body">
      <h2 class="feat-title">
        Never<br/><em>forget.</em>
      </h2>
      <p class="feat-desc">A prep checklist per spot. Flight, accommodation, clients, gear. Everything checked before you leave. Leave nothing to chance.</p>
    </div>
    <div class="feat-card">
      <div class="card-inner">
        <div class="chk-list">
          <div class="chk done">
            <span class="chk-box">✓</span>
            <span>Flight booked</span>
          </div>
          <div class="chk done">
            <span class="chk-box">✓</span>
            <span>Accommodation reserved</span>
          </div>
          <div class="chk done">
            <span class="chk-box">✓</span>
            <span>Studio address saved</span>
          </div>
          <div class="chk">
            <span class="chk-box"></span>
            <span>Clients notified</span>
          </div>
          <div class="chk">
            <span class="chk-box"></span>
            <span>Gear packed</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- divider -->
  <div class="feat-rule"></div>

  <!-- 04 -->
  <div class="feat feat-rev reveal">
    <div class="feat-meta">
      <span class="feat-n">04</span>
      <span class="feat-tag">Connect</span>
    </div>
    <div class="feat-body">
      <h2 class="feat-title">
        Find artists<br/><em>near you.</em>
      </h2>
      <p class="feat-desc">See which Movink artists are doing guest spots in the same city as you. Connect, collaborate, or just know you're not alone on the road.</p>
    </div>
    <div class="feat-card">
      <div class="card-inner">
        <p class="ci-dates" style="margin-bottom: 14px;">Artists in Tokyo right now</p>
        <div class="ci-sessions">
          <div class="ci-sess">
            <span>@inkbymarta</span>
            <span class="cv">Studio Hori</span>
          </div>
          <div class="ci-sess">
            <span>@blackwork.joe</span>
            <span class="cv">Tattoo Lab</span>
          </div>
          <div class="ci-sess">
            <span>@sena.ink</span>
            <span class="cv">Studio Zero</span>
          </div>
        </div>
        <div class="ci-net" style="margin-top: 14px;">
          <span class="ci-net-label">Visible to community</span>
          <span class="ci-badge">● Active</span>
        </div>
      </div>
    </div>
  </div>

</section>

<!-- ══ INSTALL ═══════════════════════════════════════════════════════ -->
<section class="install" id="install">
  <div class="install-wrap">
    <div class="install-hd reveal">
      <p class="section-tag">Install</p>
      <h2>No App Store.<br/><em>Just open and go.</em></h2>
      <p class="install-sub">Movink is a PWA — install directly from Safari in seconds. No download, no update, no waiting.</p>
    </div>
    <div class="install-steps reveal">
      <div class="istep">
        <div class="istep-icon">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 18V10M13 13L16 10L19 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <p class="istep-n">01</p>
        <p class="istep-title">Tap Share</p>
        <p class="istep-desc">Open in Safari, tap the Share button at the bottom of your screen.</p>
      </div>
      <div class="istep">
        <div class="istep-icon">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect x="6" y="6" width="20" height="20" rx="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 11V21M11 16H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <p class="istep-n">02</p>
        <p class="istep-title">Add to Home Screen</p>
        <p class="istep-desc">Scroll down in the share sheet and tap "Add to Home Screen".</p>
      </div>
      <div class="istep">
        <div class="istep-icon">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 16l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <p class="istep-n">03</p>
        <p class="istep-title">Open Movink</p>
        <p class="istep-desc">Tap the icon on your home screen. Opens fullscreen, just like native.</p>
      </div>
    </div>
  </div>
</section>

<!-- ══ FINALE ════════════════════════════════════════════════════════ -->
<section class="finale">
  <div class="finale-inner reveal">
    <p class="finale-tag">Free. Always.</p>
    <h2 class="finale-title">
      Built for artists<br/>
      <em>who never stop</em><br/>
      moving.
    </h2>
    <a href="/login" class="btn-finale">Get Movink free →</a>
    <p class="finale-note">No credit card &nbsp;·&nbsp; No App Store &nbsp;·&nbsp; Open and go</p>
  </div>
  <span class="finale-bg" aria-hidden="true">INK</span>
</section>

<footer>
  <span class="footer-logo">
    <span class="wm-mov">MOV</span><span class="wm-ink">INK</span>
  </span>
  <span class="footer-copy">© 2026 Movink · Made for the road</span>
</footer>

<style>
  /* ── RESET ─────────────────────────────────────────────────────── */
  :global(body) {
    max-width: 100% !important;
    overflow-x: hidden;
  }

  /* ── GRAIN ─────────────────────────────────────────────────────── */
  .grain {
    position: fixed;
    inset: 0;
    z-index: 999;
    pointer-events: none;
    opacity: 0.025;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    background-size: 200px;
    animation: grain 0.5s steps(1) infinite;
  }
  @keyframes grain {
    0%   { background-position: 0 0; }
    25%  { background-position: -50px -25px; }
    50%  { background-position: 25px -50px; }
    75%  { background-position: -25px 25px; }
  }

  /* ── CANVAS ─────────────────────────────────────────────────────── */
  #inkCanvas {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  header, section, footer, .ticker-band {
    position: relative;
    z-index: 1;
  }

  /* ── WORDMARK (match login) ──────────────────────────────────────── */
  .wm-mov { font-weight: 800; }
  .wm-ink { font-weight: 200; color: var(--text-3); }

  /* ── NAV ─────────────────────────────────────────────────────────── */
  .nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 50;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 48px;
    background: rgba(17,17,17,0.82);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }

  .wordmark {
    font-family: var(--font-display);
    font-size: 20px;
    letter-spacing: -1px;
    color: var(--text);
  }

  .nav-links {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .nav-link {
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--text-3);
    font-weight: 500;
    transition: color 0.2s;
    letter-spacing: 0.2px;
  }
  .nav-link:hover { color: var(--text-2); }

  .nav-cta {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.2px;
    transition: opacity 0.2s;
  }
  .nav-cta:hover { opacity: 0.6; }

  /* ── HERO ─────────────────────────────────────────────────────────── */
  .hero {
    min-height: 100vh;
    padding: 96px 64px 72px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    position: relative;
    overflow: hidden;
  }

  

  /* ── HERO INNER GRID ──────────────────────────────────────────────── */
  .hero-inner {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 64px;
    align-items: center;
    max-width: 1060px;
    margin: 0 auto;
    width: 100%;
  }

  .hero-left {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ── HERO TEXT ────────────────────────────────────────────────────── */
  .hero-tag {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
    color: var(--text-3);
    text-transform: uppercase;
    margin-bottom: 20px;
    min-height: 14px;
    opacity: 0;
    animation: fadeIn 0.1s 0.4s forwards;
  }

  h1 { margin: 0; padding: 0; }

  .hero-text { margin-bottom: 32px; }

  .hero-text h1 {
    line-height: 0.9;
    margin-bottom: 16px;
  }

  .hero-sub {
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 400;
    color: var(--text-3);
    letter-spacing: 0.2px;
    line-height: 1.65;
    max-width: 380px;
    opacity: 0;
    animation: riseIn 0.7s 0.88s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  .hl { display: block; }

  .hl-bold {
    font-family: var(--font-display);
    font-size: clamp(48px, 7.5vw, 108px);
    font-weight: 800;
    color: var(--text);
    letter-spacing: -3px;
    opacity: 0;
    animation: riseIn 0.9s 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  .hl-italic {
    font-family: var(--font-display);
    font-size: clamp(48px, 7.5vw, 108px);
    font-weight: 300;
    font-style: italic;
    color: var(--text-3);
    letter-spacing: -3px;
    opacity: 0;
    animation: riseIn 0.9s 0.62s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  /* ── HERO BOTTOM ─────────────────────────────────────────────────── */
  .hero-bottom {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
    opacity: 0;
    animation: fadeIn 0.6s 1.1s forwards;
  }

  .btn-hero {
    display: inline-block;
    background: var(--text);
    color: var(--bg);
    border-radius: var(--radius-sm);
    padding: 13px 28px;
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.3px;
    transition: opacity 0.2s;
  }
  .btn-hero:hover { opacity: 0.82; }

  .hero-note {
    font-family: var(--font-body);
    font-size: 12px;
    color: var(--text-3);
  }

  /* ── DEP CARD (right column) ──────────────────────────────────────── */
  .hero-right {
    opacity: 0;
    animation: riseIn 0.8s 0.9s cubic-bezier(0.16,1,0.3,1) forwards;
  }

  .dep-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 22px 24px;
    backdrop-filter: blur(12px);
  }

  .dep-card-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 16px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--border);
  }

  .dep-card-label {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 2px;
    color: var(--text-3);
    text-transform: uppercase;
  }

  .dep-card-sub {
    font-family: var(--font-body);
    font-size: 11px;
    color: var(--text-3);
    opacity: 0.6;
  }

  /* ── DEPARTURES ───────────────────────────────────────────────────── */
  .departures {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .dep-row {
    display: grid;
    grid-template-columns: 44px 1fr auto 90px;
    align-items: center;
    gap: 8px;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .dep-row:last-child { border: none; }

  .dep-city {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 800;
    color: var(--text);
    letter-spacing: 1px;
  }

  .dep-line {
    height: 1px;
    background: repeating-linear-gradient(
      to right,
      rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 3px,
      transparent 3px, transparent 8px
    );
  }

  .dep-val {
    font-family: var(--font-body);
    font-size: 12px;
    color: var(--text-3);
    text-align: right;
  }

  .dep-net {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    color: var(--upcoming);
    text-align: right;
    letter-spacing: -0.3px;
  }

  .dep-card-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
  }

  .dct-label {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    color: var(--text-3);
    text-transform: uppercase;
  }

  .dct-val {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 800;
    color: var(--upcoming);
    letter-spacing: -0.8px;
  }

  /* background word */
  .bg-word {
    position: absolute;
    bottom: -0.15em;
    right: -0.02em;
    font-family: var(--font-display);
    font-size: clamp(170px, 27vw, 380px);
    font-weight: 800;
    color: rgba(240,240,240,0.02);
    pointer-events: none;
    user-select: none;
    letter-spacing: -10px;
    line-height: 1;
    z-index: 0;
  }

  /* ── TICKER BAND ─────────────────────────────────────────────────── */
  .ticker-band {
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    overflow: hidden;
    padding: 13px 0;
    background: var(--surface);
  }

  .ticker-inner {
    display: inline-block;
    white-space: nowrap;
    animation: ticker 26s linear infinite;
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .ticker-inner span { margin: 0 16px; }
  .td { color: var(--text-3); opacity: 0.4; }

  @keyframes ticker {
    from { transform: translateX(0); }
    to   { transform: translateX(-25%); }
  }

  /* ── FEATURES ─────────────────────────────────────────────────────── */
  .features {
    padding: 0 48px 48px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .feat-rule {
    height: 1px;
    background: var(--border);
    opacity: 0.5;
  }

  .feat {
    display: grid;
    grid-template-columns: 100px 1fr 1fr;
    gap: 48px;
    align-items: center;
    padding: 72px 0;
  }

  .feat-rev {
    direction: rtl;
  }
  .feat-rev > * { direction: ltr; }

  .feat-meta {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .feat-n {
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.5px;
    color: var(--text-3);
    text-transform: uppercase;
  }

  .feat-tag {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    color: var(--text-3);
    letter-spacing: -0.3px;
  }

  .feat-title {
    font-family: var(--font-display);
    font-size: clamp(32px, 4vw, 56px);
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1.0;
    color: var(--text);
    margin-bottom: 16px;
  }

  .feat-title em {
    font-style: italic;
    font-weight: 300;
    color: var(--text-3);
  }

  .feat-desc {
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text-3);
    line-height: 1.75;
    max-width: 320px;
  }

  /* ── FEATURE CARDS (refined, same style as app) ───────────────────── */
  .feat-card {
    display: flex;
    justify-content: flex-end;
  }

  .feat-rev .feat-card {
    justify-content: flex-start;
  }

  .card-inner {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px 22px;
    width: 100%;
    max-width: 280px;
  }

  /* spot card */
  .ci-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
  }

  .ci-studio {
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .ci-location {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-body);
    font-size: 12px;
    color: var(--text-3);
  }
  .ci-location svg { color: var(--text-3); flex-shrink: 0; }

  .ci-badge {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    color: var(--upcoming);
    letter-spacing: 0.5px;
    white-space: nowrap;
    padding-top: 3px;
  }

  .ci-dates {
    font-family: var(--font-body);
    font-size: 11px;
    color: var(--text-3);
    margin-bottom: 12px;
    letter-spacing: 0.2px;
  }

  .ci-sessions {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 14px;
  }

  .ci-sess {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 7px 10px;
    background: var(--surface-2);
    border-radius: 6px;
    font-family: var(--font-body);
    font-size: 12px;
    color: var(--text-3);
  }

  .cv {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 700;
    color: var(--text-2);
    letter-spacing: -0.3px;
  }

  .ci-net {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid var(--border);
  }

  .ci-net-label {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    color: var(--text-3);
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .ci-net-val {
    font-family: var(--font-display);
    font-size: 18px;
    font-weight: 800;
    color: var(--upcoming);
    letter-spacing: -0.8px;
  }

  /* calc card */
  .calc-rows {
    display: flex;
    flex-direction: column;
    margin-bottom: 12px;
  }

  .calc-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }
  .calc-row:last-child { border: none; padding-top: 10px; }

  .cr-label {
    font-family: var(--font-body);
    font-size: 12px;
    color: var(--text-2);
  }

  .cr-val {
    font-family: var(--font-display);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-2);
    letter-spacing: -0.3px;
  }

  .calc-row.dim .cr-label,
  .calc-row.dim .cr-val { color: var(--text-3); font-size: 12px; }

  .calc-divider {
    height: 1px;
    background: var(--border);
    margin: 2px 0;
  }

  .calc-row.net .cr-label {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-3);
  }

  .cr-net {
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 800;
    color: var(--upcoming);
    letter-spacing: -1px;
  }

  .calc-break {
    font-family: var(--font-body);
    font-size: 11px;
    color: var(--text-3);
    padding-top: 10px;
    border-top: 1px solid var(--border);
  }
  .calc-break strong { color: var(--text-2); font-weight: 600; }

  /* checklist card */
  .chk-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .chk {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 9px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--text-2);
    transition: border-color 0.2s;
  }

  .chk-box {
    width: 17px;
    height: 17px;
    border: 1.5px solid var(--border);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    color: var(--upcoming);
    flex-shrink: 0;
  }

  .chk.done {
    opacity: 0.38;
  }
  .chk.done .chk-box {
    border-color: var(--upcoming);
  }
  .chk.done span:last-child {
    text-decoration: line-through;
  }

  /* ── INSTALL ───────────────────────────────────────────────────────── */
  .install {
    padding: 80px 48px;
    border-top: 1px solid var(--border);
    background: var(--surface);
  }

  .install-wrap {
    max-width: 860px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: center;
  }

  .section-tag {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
    color: var(--text-3);
    text-transform: uppercase;
    display: block;
    margin-bottom: 16px;
  }

  .install-hd h2 {
    font-family: var(--font-display);
    font-size: clamp(28px, 4vw, 48px);
    font-weight: 800;
    letter-spacing: -2px;
    line-height: 1.0;
    margin-bottom: 16px;
  }

  .install-hd h2 em {
    font-style: italic;
    font-weight: 300;
    color: var(--text-3);
  }

  .install-sub {
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text-3);
    line-height: 1.7;
  }

  .install-steps {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .istep {
    display: grid;
    grid-template-columns: 32px 32px 1fr;
    grid-template-rows: auto auto;
    gap: 0 12px;
    padding: 22px 0;
    border-bottom: 1px solid var(--border);
    align-items: start;
  }
  .istep:last-child { border: none; }

  .istep-icon {
    grid-row: 1 / 3;
    display: flex;
    align-items: flex-start;
    padding-top: 2px;
    color: var(--text-3);
  }

  .istep-n {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 1.5px;
    color: var(--text-3);
    padding-top: 4px;
  }

  .istep-title {
    font-family: var(--font-display);
    font-size: 15px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.3px;
    margin-bottom: 3px;
  }

  .istep-desc {
    grid-column: 3;
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--text-3);
    line-height: 1.6;
  }

  /* ── FINALE ───────────────────────────────────────────────────────── */
  .finale {
    padding: 120px 48px 100px;
    border-top: 1px solid var(--border);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .finale::before {
    content: '';
    position: absolute;
    bottom: -80px; left: 50%;
    transform: translateX(-50%);
    width: 900px; height: 600px;
    background: radial-gradient(ellipse, rgba(240,240,240,0.022) 0%, transparent 65%);
    pointer-events: none;
  }

  .finale-inner {
    position: relative;
    z-index: 1;
    max-width: 1060px;
    margin: 0 auto;
    text-align: center;
  }

  .finale-tag {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 3px;
    color: var(--text-3);
    text-transform: uppercase;
    margin-bottom: 24px;
  }

  .finale-title {
    font-family: var(--font-display);
    font-size: clamp(48px, 7.5vw, 108px);
    font-weight: 800;
    letter-spacing: -3px;
    line-height: 0.9;
    color: var(--text);
    margin-bottom: 24px;
  }

  .finale-title em {
    font-style: italic;
    font-weight: 300;
    color: var(--text-3);
  }

  .btn-finale {
    display: inline-block;
    background: var(--text);
    color: var(--bg);
    border-radius: var(--radius-sm);
    padding: 13px 28px;
    font-family: var(--font-display);
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.3px;
    transition: opacity 0.2s;
    margin-bottom: 14px;
  }
  .btn-finale:hover { opacity: 0.82; }

  .finale-note {
    display: block;
    font-family: var(--font-body);
    font-size: 15px;
    color: var(--text-3);
    line-height: 1.75;
    margin-top: 10px;
  }

  .finale-bg {
    position: absolute;
    bottom: -0.12em;
    right: -0.03em;
    font-family: var(--font-display);
    font-size: clamp(180px, 28vw, 400px);
    font-weight: 800;
    font-style: italic;
    color: rgba(240,240,240,0.016);
    pointer-events: none;
    user-select: none;
    letter-spacing: -12px;
    line-height: 1;
  }

  /* ── FOOTER ───────────────────────────────────────────────────────── */
  footer {
    padding: 22px 48px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .footer-logo {
    font-family: var(--font-display);
    font-size: 15px;
    letter-spacing: -0.5px;
    color: var(--text);
  }

  .footer-copy {
    font-family: var(--font-body);
    font-size: 12px;
    color: var(--text-3);
  }

  /* ── ANIMATIONS ───────────────────────────────────────────────────── */
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  @keyframes riseIn {
    from { opacity:0; transform: translateY(20px); }
    to   { opacity:1; transform: translateY(0); }
  }

  .reveal {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.85s cubic-bezier(0.16,1,0.3,1),
                transform 0.85s cubic-bezier(0.16,1,0.3,1);
  }
  :global(.reveal.in) { opacity:1; transform: translateY(0); }

  /* ── MOBILE ───────────────────────────────────────────────────────── */
  @media (max-width: 720px) {
    .nav { padding: 16px 20px; }
    .nav-link { display: none; }

    .hero {
      padding: 80px 24px 56px;
      min-height: auto;
      justify-content: flex-start;
    }

    /* stack hero to single column, hide right panel */
    .hero-inner {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .hero-right { display: none; }

    .hero-tag { margin-bottom: 16px; }
    .hero-text { margin-bottom: 24px; }
    .hero-text h1 { margin-bottom: 12px; }

    .hl-bold, .hl-italic {
      font-size: clamp(42px, 12.5vw, 68px);
      letter-spacing: -2px;
    }

    .hero-sub { font-size: 13px; max-width: 100%; }
    .hero-bottom { gap: 14px; }
    .hero-note { font-size: 11px; }

    

    .bg-word { font-size: 48vw; letter-spacing: -4px; }
    .bg-word { font-size: 36vw; letter-spacing: -3px; right: 4%; bottom: 6%; }

    .ticker-band { display: none; }

    .features { padding: 0 20px 32px; }

    .feat {
      grid-template-columns: 1fr;
      gap: 20px;
      padding: 48px 0;
    }

    .feat-meta { flex-direction: row; align-items: center; gap: 12px; }

    .feat-title {
      font-size: clamp(30px, 9vw, 44px);
      letter-spacing: -1.5px;
      margin-bottom: 12px;
    }

    .feat-desc { font-size: 13px; }
    .feat-rev { direction: ltr; }
    .feat-card { justify-content: flex-start; }
    .feat-rev .feat-card { justify-content: flex-start; }
    .card-inner { max-width: 100%; }

    .install { padding: 64px 20px; }
    .install-wrap { grid-template-columns: 1fr; gap: 40px; }
    .install-hd h2 {
      font-size: clamp(26px, 8vw, 40px);
      letter-spacing: -1.5px;
    }

    .finale { padding: 80px 20px 64px; }
    .finale-title {
      font-size: clamp(42px, 12.5vw, 68px);
      letter-spacing: -2px;
      margin-bottom: 16px;
    }
    .finale-bg { font-size: 40vw; right: 6%; bottom: -0.06em; }

    footer { padding: 20px; }
  }
</style>