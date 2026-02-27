<script>
  import { onMount } from 'svelte'

  onMount(() => {
    // Scroll reveal
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 60)
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' })
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el))

    // Map animation with loop
    const canvas = document.getElementById('mapCanvas')
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height

    // Route waypoints: Tokyo → Berlin → Dublin → São Paulo → Tokyo (loop)
    const cities = [
      { name: 'TOKYO',     x: 0.76, y: 0.24, label: '¥ 48,000', net: '+¥ 28,800' },
      { name: 'BERLIN',    x: 0.42, y: 0.28, label: '€ 3,200',  net: '+€ 2,520'  },
      { name: 'DUBLIN',    x: 0.32, y: 0.30, label: '€ 1,840',  net: '+€ 1,160'  },
      { name: 'NYC',       x: 0.14, y: 0.38, label: '$ 3,600',  net: '+$ 2,800'  },
    ]

    // Convert to pixel coords
    const pts = cities.map(c => ({ ...c, px: c.x * W, py: c.y * H }))

    // Bezier control points for smooth arcs between cities
    function getArc(a, b) {
      const mx = (a.px + b.px) / 2
      const my = Math.min(a.py, b.py) - H * 0.18
      return { cx: mx, cy: my }
    }

    const LOOP_DUR = 9000   // ms total for one full loop
    const PAUSE = 1200      // ms pause at each city
    let startTime = null
    let animFrame = null

    // City card elements
    const cardEls = [
      document.getElementById('ctokyo'),
      document.getElementById('cberlin'),
      document.getElementById('cdublin'),
      document.getElementById('cnyc'),
    ]

    let lastActiveIdx = -1

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    }

    function draw(ts) {
      if (!startTime) startTime = ts
      const elapsed = (ts - startTime) % LOOP_DUR
      ctx.clearRect(0, 0, W, H)

      // --- Grid lines ---
      ctx.strokeStyle = 'rgba(240,240,240,0.05)'
      ctx.lineWidth = 0.5
      for (let x = 0; x <= W; x += W / 6) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y <= H; y += H / 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

      // --- Draw all route arcs (faint) ---
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i]
        const b = pts[(i + 1) % pts.length]
        const cp = getArc(a, b)
        ctx.beginPath()
        ctx.moveTo(a.px, a.py)
        ctx.quadraticCurveTo(cp.cx, cp.cy, b.px, b.py)
        ctx.strokeStyle = 'rgba(240,240,240,0.1)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 8])
        ctx.stroke()
        ctx.setLineDash([])
      }

      // --- Determine active segment ---
      const segDur = LOOP_DUR / pts.length
      const segIdx = Math.floor(elapsed / segDur)
      const segT = (elapsed % segDur) / segDur

      // Pause at city: first 15% is arrival pause, last 10% is departure pause
      let planeT = 0
      let isMoving = true
      if (segT < 0.15) {
        planeT = 0
        isMoving = false
      } else if (segT > 0.88) {
        planeT = 1
        isMoving = false
      } else {
        planeT = easeInOut((segT - 0.15) / 0.73)
        isMoving = true
      }

      // --- Draw animated arc (bright) ---
      const a = pts[segIdx]
      const b = pts[(segIdx + 1) % pts.length]
      const cp = getArc(a, b)

      // Draw partial bezier up to planeT
      if (planeT > 0.01) {
        ctx.beginPath()
        // Sample bezier manually
        const steps = 60
        for (let s = 0; s <= steps; s++) {
          const t = (s / steps) * planeT
          const x = (1-t)*(1-t)*a.px + 2*(1-t)*t*cp.cx + t*t*b.px
          const y = (1-t)*(1-t)*a.py + 2*(1-t)*t*cp.cy + t*t*b.py
          s === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.strokeStyle = 'rgba(240,240,240,0.55)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
        ctx.stroke()
      }

      // --- City dots ---
      pts.forEach((p, i) => {
        const isActive = i === segIdx || (planeT > 0.95 && i === (segIdx + 1) % pts.length)
        const alpha = isActive ? 0.8 : 0.35

        // Pulse ring for active
        if (isActive) {
          const pulseT = (elapsed % 1400) / 1400
          const pulseR = 4 + pulseT * 12
          const pulseA = (1 - pulseT) * 0.25
          ctx.beginPath()
          ctx.arc(p.px, p.py, pulseR, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(240,240,240,${pulseA})`
          ctx.lineWidth = 1
          ctx.stroke()
        }

        ctx.beginPath()
        ctx.arc(p.px, p.py, 3.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(240,240,240,${alpha})`
        ctx.fill()
      })

      // --- Plane position ---
      const planeX = (1-planeT)*(1-planeT)*a.px + 2*(1-planeT)*planeT*cp.cx + planeT*planeT*b.px
      const planeY = (1-planeT)*(1-planeT)*a.py + 2*(1-planeT)*planeT*cp.cy + planeT*planeT*b.py

      // Plane angle from derivative
      const dt = Math.min(planeT + 0.02, 1)
      const nx = (1-dt)*(1-dt)*a.px + 2*(1-dt)*dt*cp.cx + dt*dt*b.px
      const ny = (1-dt)*(1-dt)*a.py + 2*(1-dt)*dt*cp.cy + dt*dt*b.py
      const angle = Math.atan2(ny - planeY, nx - planeX)

      // Draw plane
      ctx.save()
      ctx.translate(planeX, planeY)
      ctx.rotate(angle)
      ctx.beginPath()
      ctx.moveTo(9, 0)
      ctx.lineTo(-5, 5)
      ctx.lineTo(-3, 0)
      ctx.lineTo(-5, -5)
      ctx.closePath()
      ctx.fillStyle = 'rgba(240,240,240,0.9)'
      ctx.fill()
      ctx.restore()

      // --- Update city cards ---
      const activeIdx = segIdx
      if (activeIdx !== lastActiveIdx) {
        cardEls.forEach((el, i) => {
          if (!el) return
          if (i === activeIdx) {
            el.classList.add('show')
          } else {
            el.classList.remove('show')
          }
        })
        lastActiveIdx = activeIdx
      }

      animFrame = requestAnimationFrame(draw)
    }

    animFrame = requestAnimationFrame(draw)

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame)
      obs.disconnect()
    }
  })
</script>

<svelte:head>
  <title>Movink — Built for artists who never stop moving</title>
</svelte:head>

<!-- NAV -->
<nav>
  <p class="nav-logo">MOV<span>INK</span></p>
  <div class="nav-right">
    <a href="#features" class="nav-link">Features</a>
    <a href="#install" class="nav-link">Install</a>
    <a href="/login" class="nav-cta">Get started</a>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-content">
    <p class="hero-eyebrow">For tattoo artists on the move</p>
    <h1 class="hero-title">
      <span class="block">Every guest spot.</span>
      <span class="block">Every number.</span>
      <span class="block dim">One place.</span>
    </h1>
    <p class="hero-sub">Stop losing track of sessions, costs, and deals. Movink is built for how you actually work — on the road, city to city.</p>
    <div class="hero-actions">
      <a href="/login" class="btn-hero">Start for free</a>
      <p class="hero-hint">No credit card. Works on any device.</p>
    </div>
  </div>

  <!-- MAP -->
  <div class="map-visual">
    <canvas id="mapCanvas" width="560" height="380"></canvas>

    <div class="city-card card-tokyo" id="ctokyo">
      <p class="cc-city">· Tokyo</p>
      <p class="cc-amount">¥ 48,000</p>
      <p class="cc-net">+¥ 28,800 net</p>
    </div>
    <div class="city-card card-berlin" id="cberlin">
      <p class="cc-city">· Berlin</p>
      <p class="cc-amount">€ 3,200</p>
      <p class="cc-net">+€ 2,520 net</p>
    </div>
    <div class="city-card card-dublin" id="cdublin">
      <p class="cc-city">· Dublin</p>
      <p class="cc-amount">€ 1,840</p>
      <p class="cc-net">+€ 1,160 net</p>
    </div>
    <div class="city-card card-nyc" id="cnyc">
      <p class="cc-city">· New York</p>
      <p class="cc-amount">$ 3,600</p>
      <p class="cc-net">+$ 2,800 net</p>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section class="features" id="features">
  <div class="features-hd reveal">
    <span class="section-tag">What Movink does</span>
    <h2 class="section-title">Everything you need.<br/>Nothing you don't.</h2>
  </div>

  <div class="feat-block reveal">
    <div class="feat-text">
      <span class="feat-n">01</span>
      <div>
        <p class="feat-h">Plan your<br/><span class="m">spot.</span></p>
        <p class="feat-d">Studio, dates, deal, currency. Log every session as it happens. Your calendar, your way.</p>
      </div>
    </div>
    <div class="feat-vis">
      <div class="m-spot">
        <div class="m-spot-hd"><span class="m-spot-city">Tokyo · JP</span><span class="m-spot-date">12–18 Mar</span></div>
        <p class="m-spot-name">Studio Irezumi</p>
        <div class="m-sessions">
          <div class="m-sess"><span class="m-sess-d">Mar 13</span><span class="m-sess-v">¥ 18,000</span></div>
          <div class="m-sess"><span class="m-sess-d">Mar 14</span><span class="m-sess-v">¥ 22,000</span></div>
          <div class="m-sess"><span class="m-sess-d">Mar 15</span><span class="m-sess-v">¥ 14,000</span></div>
        </div>
      </div>
    </div>
  </div>

  <div class="feat-block flip reveal">
    <div class="feat-text">
      <span class="feat-n">02</span>
      <div>
        <p class="feat-h">Know your<br/><span class="m">numbers.</span></p>
        <p class="feat-d">Gross, net, trip costs in real time. Calculate any deal before you say yes. No surprises at checkout.</p>
      </div>
    </div>
    <div class="feat-vis">
      <div class="m-calc">
        <div class="m-calc-row"><span class="m-calc-l">Gross earnings</span><span class="m-calc-v">¥ 48,000</span></div>
        <div class="m-calc-row"><span class="m-calc-l">Studio cut 30%</span><span class="m-calc-v muted">−¥ 14,400</span></div>
        <div class="m-calc-row"><span class="m-calc-l">Trip costs</span><span class="m-calc-v muted">−¥ 4,800</span></div>
        <div class="m-calc-row"><span class="m-calc-l">Net profit</span><span class="m-calc-net">¥ 28,800</span></div>
      </div>
    </div>
  </div>

  <div class="feat-block reveal">
    <div class="feat-text">
      <span class="feat-n">03</span>
      <div>
        <p class="feat-h">Never<br/><span class="m">forget.</span></p>
        <p class="feat-d">A prep checklist per spot. Flight, accommodation, clients, gear packed. Leave nothing to chance.</p>
      </div>
    </div>
    <div class="feat-vis">
      <div class="m-checks">
        <div class="m-check done"><span class="m-chkbox">✓</span><span>Flight booked</span></div>
        <div class="m-check done"><span class="m-chkbox">✓</span><span>Accommodation reserved</span></div>
        <div class="m-check"><span class="m-chkbox"></span><span>Clients notified</span></div>
        <div class="m-check"><span class="m-chkbox"></span><span>Gear packed</span></div>
        <div class="m-check"><span class="m-chkbox"></span><span>Deal confirmed</span></div>
      </div>
    </div>
  </div>
</section>

<!-- INSTALL -->
<section class="install" id="install">
  <div class="install-inner">
    <div class="install-hd reveal">
      <span class="section-tag">Install the app</span>
      <h2 class="section-title">Works like native.<br/>No App Store needed.</h2>
      <p class="install-sub">Movink is a PWA — install it in seconds directly from Safari.</p>
    </div>
    <div class="steps-grid reveal">
      <div class="step">
        <p class="step-n">01</p>
        <div class="step-icon">
          <svg viewBox="0 0 32 32" fill="none"><rect x="4" y="6" width="24" height="20" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M16 18V10M13 13L16 10L19 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 22H22" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.4"/></svg>
        </div>
        <h4 class="step-title">Tap Share</h4>
        <p class="step-desc">Open Movink in Safari. Tap the Share button at the bottom.</p>
      </div>
      <div class="step">
        <p class="step-n">02</p>
        <div class="step-icon">
          <svg viewBox="0 0 32 32" fill="none"><rect x="6" y="6" width="20" height="20" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M16 11V21M11 16H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <h4 class="step-title">Add to Home Screen</h4>
        <p class="step-desc">Scroll down and tap "Add to Home Screen".</p>
      </div>
      <div class="step">
        <p class="step-n">03</p>
        <div class="step-icon">
          <svg viewBox="0 0 32 32" fill="none"><path d="M16 4C9.37 4 4 9.37 4 16s5.37 12 12 12 12-5.37 12-12S22.63 4 16 4z" stroke="currentColor" stroke-width="1.5"/><path d="M12 16l3 3 5-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h4 class="step-title">Open Movink</h4>
        <p class="step-desc">Tap the icon. Opens fullscreen, just like a native app.</p>
      </div>
    </div>
  </div>
</section>

<!-- FINAL -->
<section class="final">
  <div class="final-inner reveal">
    <p class="final-eyebrow">Free to use</p>
    <h2 class="final-title">
      <span>Built for artists</span>
      <span class="dim">who never stop</span>
      <span>moving.</span>
    </h2>
    <a href="/login" class="btn-final">Get Movink free</a>
    <p class="final-sub">No credit card. No App Store. Open and go.</p>
  </div>
</section>

<footer>
  <p class="footer-logo">MOV<span>INK</span></p>
  <p class="footer-copy">© 2026 Movink. Made for the road.</p>
</footer>

<style>
  :global(body) { max-width: 100% !important; }

  :global(body)::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 100;
    opacity: 0.3;
  }

  /* NAV */
  nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 50;
    padding: 20px 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(17,17,17,0.9);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.04);
  }

  .nav-logo {
    font-family: var(--font-display);
    font-size: 20px;
    letter-spacing: -1px;
    font-weight: 800;
  }
  .nav-logo span { font-weight: 200; color: var(--text-3); }
  .nav-right { display: flex; align-items: center; gap: 20px; }
  .nav-link { font-size: 13px; color: var(--text-3); font-weight: 500; transition: color 0.2s; }
  .nav-link:hover { color: var(--text-2); }
  .nav-cta {
    background: var(--text); color: var(--bg);
    border-radius: var(--radius-sm); padding: 9px 20px;
    font-family: var(--font-display); font-size: 13px; font-weight: 700;
    transition: opacity 0.2s;
  }
  .nav-cta:hover { opacity: 0.85; }

  /* HERO */
  .hero {
    position: relative;
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    padding: 120px 48px 80px;
    gap: 60px;
    overflow: hidden;
    max-width: 1200px;
    margin: 0 auto;
  }

  .hero-content { position: relative; z-index: 2; }

  .hero-eyebrow {
    font-size: 11px; font-weight: 600; letter-spacing: 2px;
    text-transform: uppercase; color: var(--text-3);
    margin-bottom: 16px;
    opacity: 0; animation: fadeUp 0.6s 0.3s forwards;
  }

  .hero-title {
    font-family: var(--font-display);
    font-size: clamp(36px, 4.2vw, 66px);
    font-weight: 800; letter-spacing: -3px; line-height: 1.0;
    margin-bottom: 24px;
    opacity: 0; animation: fadeUp 0.8s 0.4s cubic-bezier(0.4,0,0.2,1) forwards;
  }
  .hero-title .block { display: block; }
  .hero-title .dim { color: var(--text-3); font-weight: 300; }

  .hero-sub {
    font-size: 15px; color: var(--text-2); line-height: 1.75;
    max-width: 400px; margin-bottom: 36px;
    opacity: 0; animation: fadeUp 0.8s 0.52s cubic-bezier(0.4,0,0.2,1) forwards;
  }

  .hero-actions {
    display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
    opacity: 0; animation: fadeUp 0.8s 0.62s cubic-bezier(0.4,0,0.2,1) forwards;
  }

  .btn-hero {
    background: var(--text); color: var(--bg);
    border-radius: var(--radius-sm); padding: 14px 30px;
    font-family: var(--font-display); font-size: 14px; font-weight: 700;
    transition: opacity 0.2s; letter-spacing: -0.3px; display: inline-block;
  }
  .btn-hero:hover { opacity: 0.85; }
  .hero-hint { font-size: 12px; color: var(--text-3); }

  /* MAP */
  .map-visual {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    animation: fadeIn 1s 0.5s forwards;
    overflow: visible;
  }

  canvas {
    display: block;
    width: 100%;
    height: auto;
    max-width: 560px;
  }

  .city-card {
    position: absolute;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 14px;
    min-width: 118px;
    opacity: 0;
    transform: translateY(4px) scale(0.96);
    transition: opacity 0.4s cubic-bezier(0.4,0,0.2,1), transform 0.4s cubic-bezier(0.4,0,0.2,1);
    pointer-events: none;
  }

  :global(.city-card.show) {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .card-tokyo  { top: 8%;  right: 0%; }
  .card-berlin { top: 28%; left: 30%; }
  .card-dublin { top: 30%; left: 18%; }
  .card-nyc    { top: 38%; left: 2%;  }

  .cc-city { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-3); margin-bottom: 3px; }
  .cc-amount { font-family: var(--font-display); font-size: 16px; font-weight: 800; letter-spacing: -0.5px; }
  .cc-net { font-size: 11px; color: var(--text-2); margin-top: 2px; }

  /* FEATURES */
  .features {
    padding: 120px 48px;
    max-width: 1200px;
    margin: 0 auto;
    border-top: 1px solid var(--border);
  }

  .features-hd { margin-bottom: 60px; }
  .section-tag { font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: var(--text-3); margin-bottom: 14px; display: block; }
  .section-title { font-family: var(--font-display); font-size: clamp(24px, 3.5vw, 46px); font-weight: 800; letter-spacing: -2px; line-height: 1.05; }

  .feat-block {
    display: grid; grid-template-columns: 1fr 1fr;
    border: 1px solid var(--border); border-radius: var(--radius);
    overflow: hidden; margin-bottom: 14px;
    transition: border-color 0.25s;
  }
  .feat-block:hover { border-color: var(--text-3); }
  .feat-block.flip { direction: rtl; }
  .feat-block.flip > * { direction: ltr; }

  .feat-text {
    background: var(--surface); padding: 48px 44px;
    display: flex; flex-direction: column; justify-content: space-between;
    min-height: 290px;
  }
  .feat-n { font-size: 10px; font-weight: 700; letter-spacing: 2px; color: var(--text-3); }
  .feat-h {
    font-family: var(--font-display);
    font-size: clamp(26px, 3.2vw, 48px);
    font-weight: 800; letter-spacing: -2px; line-height: 1.0;
    margin: 18px 0 12px;
  }
  .feat-h .m { color: var(--text-3); font-weight: 300; }
  .feat-d { font-size: 14px; color: var(--text-2); line-height: 1.7; max-width: 290px; }

  .feat-vis {
    background: var(--surface-2); display: flex;
    align-items: center; justify-content: center;
    padding: 36px; overflow: hidden;
  }

  /* Mockups */
  .m-spot { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; width: 100%; max-width: 230px; }
  .m-spot-hd { display: flex; justify-content: space-between; margin-bottom: 12px; }
  .m-spot-city { font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-3); }
  .m-spot-date { font-size: 10px; color: var(--text-3); }
  .m-spot-name { font-family: var(--font-display); font-size: 16px; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 12px; }
  .m-sessions { display: flex; flex-direction: column; gap: 5px; }
  .m-sess { display: flex; justify-content: space-between; padding: 7px 10px; background: var(--surface-2); border-radius: 6px; font-size: 11px; }
  .m-sess-d { color: var(--text-3); }
  .m-sess-v { font-family: var(--font-display); font-weight: 700; color: var(--text-2); }

  .m-calc { width: 100%; max-width: 210px; }
  .m-calc-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
  .m-calc-row:last-child { border: none; padding-top: 12px; }
  .m-calc-l { color: var(--text-3); }
  .m-calc-v { font-family: var(--font-display); font-weight: 700; font-size: 12px; }
  .m-calc-v.muted { color: var(--text-3); }
  .m-calc-net { font-family: var(--font-display); font-size: 20px; font-weight: 800; letter-spacing: -1px; }

  .m-checks { width: 100%; max-width: 220px; display: flex; flex-direction: column; gap: 6px; }
  .m-check { display: flex; align-items: center; gap: 9px; padding: 8px 11px; background: var(--surface); border: 1px solid var(--border); border-radius: 7px; font-size: 12px; color: var(--text-2); }
  .m-check.done { opacity: 0.4; }
  .m-chkbox { width: 14px; height: 14px; border: 1.5px solid var(--border); border-radius: 3px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 8px; color: var(--text-2); }
  .m-check.done .m-chkbox { border-color: var(--text-2); }

  /* INSTALL */
  .install { padding: 120px 48px; border-top: 1px solid var(--border); background: var(--surface); }
  .install-inner { max-width: 840px; margin: 0 auto; }
  .install-hd { margin-bottom: 52px; }
  .install-sub { font-size: 15px; color: var(--text-2); margin-top: 12px; line-height: 1.6; }

  .steps-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 1px; background: var(--border);
    border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;
  }
  .step { background: var(--bg); padding: 30px 26px; }
  .step-n { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: var(--text-3); margin-bottom: 16px; }
  .step-icon { width: 28px; height: 28px; color: var(--text-2); margin-bottom: 12px; }
  .step-title { font-family: var(--font-display); font-size: 15px; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 6px; }
  .step-desc { font-size: 13px; color: var(--text-2); line-height: 1.6; }

  /* FINAL */
  .final {
    padding: 160px 48px; text-align: center;
    position: relative; overflow: hidden;
    border-top: 1px solid var(--border);
  }
  .final::before {
    content: ''; position: absolute; bottom: -60px; left: 50%; transform: translateX(-50%);
    width: 700px; height: 500px;
    background: radial-gradient(ellipse, rgba(240,240,240,0.035) 0%, transparent 60%);
    pointer-events: none;
  }
  .final-inner { position: relative; z-index: 2; max-width: 620px; margin: 0 auto; }
  .final-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: var(--text-3); margin-bottom: 22px; }
  .final-title {
    font-family: var(--font-display);
    font-size: clamp(34px, 5.5vw, 72px);
    font-weight: 800; letter-spacing: -4px; line-height: 0.95;
    margin-bottom: 44px; display: flex; flex-direction: column;
  }
  .final-title .dim { color: var(--text-3); font-weight: 300; }
  .btn-final {
    display: inline-block; background: var(--text); color: var(--bg);
    border-radius: var(--radius-sm); padding: 16px 44px;
    font-family: var(--font-display); font-size: 15px; font-weight: 800;
    transition: opacity 0.2s; letter-spacing: -0.3px; margin-bottom: 14px;
  }
  .btn-final:hover { opacity: 0.85; }
  .final-sub { font-size: 12px; color: var(--text-3); }

  /* FOOTER */
  footer {
    padding: 24px 48px; border-top: 1px solid var(--border);
    display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
  }
  .footer-logo { font-family: var(--font-display); font-size: 15px; font-weight: 800; letter-spacing: -0.5px; }
  .footer-logo span { font-weight: 200; color: var(--text-3); }
  .footer-copy { font-size: 12px; color: var(--text-3); }

  /* ANIMATIONS */
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }

  .reveal { opacity:0; transform:translateY(20px); transition:opacity 0.7s cubic-bezier(0.4,0,0.2,1),transform 0.7s cubic-bezier(0.4,0,0.2,1); }
  :global(.reveal.visible) { opacity:1; transform:translateY(0); }

  /* MOBILE */
  @media (max-width: 800px) {
    nav { padding: 16px 20px; }
    .nav-link { display: none; }
    .hero { grid-template-columns: 1fr; padding: 100px 20px 60px; min-height: auto; gap: 40px; }
    .hero-title { letter-spacing: -2px; }
    .map-visual { aspect-ratio: 1/1; }
    .features { padding: 80px 20px; }
    .feat-block { grid-template-columns: 1fr; }
    .feat-text { padding: 30px 22px; min-height: auto; }
    .feat-vis { min-height: 200px; }
    .install { padding: 80px 20px; }
    .steps-grid { grid-template-columns: 1fr; }
    .final { padding: 100px 20px; }
    .final-title { letter-spacing: -2px; }
    footer { padding: 20px; }
  }
</style>