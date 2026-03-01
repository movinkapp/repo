<script>
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { supabase } from '$lib/supabase.js'

  function showIosSteps() {
    document.getElementById('tab-ios').classList.add('active');
    document.getElementById('tab-android').classList.remove('active');
    document.getElementById('steps-ios').style.display = 'flex';
    document.getElementById('steps-android').style.display = 'none';
  }

  function showAndroidSteps() {
    document.getElementById('tab-android').classList.add('active');
    document.getElementById('tab-ios').classList.remove('active');
    document.getElementById('steps-android').style.display = 'flex';
    document.getElementById('steps-ios').style.display = 'none';
  }

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      goto('/home')
      return
    }

    if (typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches) {
      goto('/login')
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
    <img src="/movink-logo-typo-white.svg" alt="Movink" style="height:24px;width:auto" />
  </a>
  <nav class="nav-links">
    <a href="#features" class="nav-link">Features</a>
    <a href="#install"  class="nav-link">Install</a>
    <a href="/waitlist" class="nav-cta">Get started →</a>
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
        <a href="/waitlist" class="btn-hero">Join private beta →</a>
        <p class="hero-note">Limited access &nbsp;·&nbsp; Any device &nbsp;·&nbsp; Works offline</p>
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

</section>

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
            <p class="ci-studio">Sang Bleu London</p>
            <p class="ci-location">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              London, UK
            </p>
          </div>
          <span class="ci-badge">● Active</span>
        </div>
        <p class="ci-dates">3 – 9 April</p>
        <div class="ci-sessions">
          <div class="ci-sess"><span>Apr 4</span><span class="cv">£ 320</span></div>
          <div class="ci-sess"><span>Apr 5</span><span class="cv">£ 480</span></div>
          <div class="ci-sess"><span>Apr 7</span><span class="cv">£ 400</span></div>
        </div>
        <div class="ci-net">
          <span class="ci-net-label">Net profit</span>
          <span class="ci-net-val">£ 820</span>
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
            <span class="cr-val">€ 2,800</span>
          </div>
          <div class="calc-row dim">
            <span class="cr-label">Studio cut 35%</span>
            <span class="cr-val">−€ 980</span>
          </div>
          <div class="calc-row dim">
            <span class="cr-label">Trip costs</span>
            <span class="cr-val">−€ 320</span>
          </div>
          <div class="calc-divider"></div>
          <div class="calc-row net">
            <span class="cr-label">Net profit</span>
            <span class="cr-net">€ 1,500</span>
          </div>
        </div>
        <p class="calc-break">Break-even at <strong>2 sessions</strong></p>
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
      <p class="install-sub">Movink is a PWA — install directly from your browser in seconds. No download, no update, no waiting.</p>
    </div>
    <div class="install-steps reveal">
      <div class="install-tabs">
        <button class="itab active" id="tab-ios" on:click={showIosSteps}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
          iOS — Safari
        </button>
        <button class="itab" id="tab-android" on:click={showAndroidSteps}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341a.95.95 0 0 1-.953.953.95.95 0 0 1-.953-.953.95.95 0 0 1 .953-.953.95.95 0 0 1 .953.953m-9.093 0a.95.95 0 0 1-.953.953.95.95 0 0 1-.953-.953.95.95 0 0 1 .953-.953.95.95 0 0 1 .953.953m9.443-6.48L19.2 5.32a.37.37 0 0 0-.137-.506.37.37 0 0 0-.506.137l-1.353 2.604A11.1 11.1 0 0 0 12 6.545c-1.498 0-2.92.307-4.204.847L6.443 4.951a.37.37 0 0 0-.506-.137.37.37 0 0 0-.137.506l1.327 2.541C4.612 9.48 3 12.039 3 15h18c0-2.961-1.612-5.52-4.127-7.139"/></svg>
          Android — Chrome
        </button>
      </div>

      <div id="steps-ios" style="display:flex;flex-direction:column;gap:0">
        <div class="istep">
          <div class="istep-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
          </div>
          <p class="istep-n">01</p>
          <p class="istep-title">Tap Share</p>
          <p class="istep-desc">Open movink.app in Safari. Tap the Share icon at the bottom of your screen.</p>
        </div>
        <div class="istep">
          <div class="istep-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </div>
          <p class="istep-n">02</p>
          <p class="istep-title">Add to Home Screen</p>
          <p class="istep-desc">Scroll down in the share sheet and tap "Add to Home Screen".</p>
        </div>
        <div class="istep">
          <div class="istep-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
          <p class="istep-n">03</p>
          <p class="istep-title">Open Movink</p>
          <p class="istep-desc">Tap the Movink icon on your home screen. Opens fullscreen, just like native.</p>
        </div>
      </div>

      <div id="steps-android" style="display:none;flex-direction:column;gap:0">
        <div class="istep">
          <div class="istep-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
              <circle cx="12" cy="5" r="1" fill="currentColor"/>
              <circle cx="12" cy="12" r="1" fill="currentColor"/>
              <circle cx="12" cy="19" r="1" fill="currentColor"/>
            </svg>
          </div>
          <p class="istep-n">01</p>
          <p class="istep-title">Tap the menu</p>
          <p class="istep-desc">Open movink.app in Chrome. Tap the three dots ⋮ in the top right corner.</p>
        </div>
        <div class="istep">
          <div class="istep-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <p class="istep-n">02</p>
          <p class="istep-title">Add to Home screen</p>
          <p class="istep-desc">Tap "Add to Home screen" from the menu and confirm.</p>
        </div>
        <div class="istep">
          <div class="istep-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
          <p class="istep-n">03</p>
          <p class="istep-title">Open Movink</p>
          <p class="istep-desc">Tap the Movink icon on your home screen. Opens fullscreen, just like native.</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ══ FINALE ════════════════════════════════════════════════════════ -->
<section class="finale">
  <div class="finale-inner reveal">
    <p class="finale-tag">Private beta.</p>
    <h2 class="finale-title">
      Built for artists<br/>
      <em>who never stop</em><br/>
      moving.
    </h2>
    <a href="/waitlist" class="btn-finale">Request access →</a>
    <p class="finale-note">Limited spots &nbsp;·&nbsp; No App Store &nbsp;·&nbsp; Open and go</p>
  </div>
</section>

<footer>
  <span class="footer-logo">
    <img src="/movink-logo-typo-white.svg" alt="Movink" style="height:28px;width:auto" />
  </span>
  <span class="footer-copy">© 2026 Movink · Made for the road</span>
</footer>

<style>
    .install-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }

    .itab {
      display: flex;
      align-items: center;
      gap: 7px;
      background: none;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      color: var(--text-3);
      font-family: var(--font-body);
      font-size: 12px;
      font-weight: 600;
      padding: 8px 14px;
      cursor: pointer;
      transition: all 0.2s;
      letter-spacing: 0.2px;
    }

    .itab.active {
      background: var(--text);
      color: var(--bg);
      border-color: var(--text);
    }

    .itab svg { flex-shrink: 0; }
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

  header, section, footer {
    position: relative;
    z-index: 1;
  }

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
    display: flex;
    align-items: center;
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


  /* ── TICKER BAND ─────────────────────────────────────────────────── */

  /* ── FEATURES ─────────────────────────────────────────────────────── */
  .features {
    padding: 0 48px 48px;
    max-width: 1100px;
    margin: 0 auto;
    scroll-margin-top: 80px;
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
    scroll-margin-top: 80px;
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
    color: var(--upcoming);
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

    footer { padding: 20px; }
  }
</style>