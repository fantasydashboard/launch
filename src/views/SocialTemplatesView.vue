<template>
  <div class="studio-root">

    <!-- Page Header -->
    <div class="studio-header">
      <img src="/UFD_V8.png" alt="UFD" class="studio-logo" />
      <div>
        <h1>Social Media Studio</h1>
        <p>Screenshot any graphic — Facebook banner at top, post grid below · <strong style="color:#eab308">ultimatefantasydashboard.com/socialtemplates</strong></p>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         FACEBOOK BANNER  851 × 315
    ══════════════════════════════════════════ -->
    <div class="section-label">📘 Facebook Page Banner — Screenshot just the dark card below</div>
    <div class="banner-stage">
      <div class="fb-banner">
        <div class="fb-grid"></div>
        <div class="fb-glow-1"></div>
        <div class="fb-glow-2"></div>
        <div class="fb-grain"></div>
        <div class="fb-topline"></div>

        <!-- Left content — constrained so nothing overflows -->
        <div class="fb-left">
          <img src="/UFD_V8.png" alt="UFD" class="fb-logo" />
          <div class="fb-headline">Keep your league<br />talking. <span class="fb-gold">All season.</span></div>
          <div class="fb-sub">Power rankings · Win probability · Draft grades · League history</div>
          <!-- Platform SVG logos -->
          <div class="fb-platforms">
            <!-- Sleeper -->
            <div class="fb-platform-logo">
              <svg viewBox="0 0 72 22" width="72" height="22" xmlns="http://www.w3.org/2000/svg">
                <rect width="72" height="22" rx="4" fill="rgba(234,179,8,0.12)"/>
                <rect x="0.5" y="0.5" width="71" height="21" rx="3.5" fill="none" stroke="rgba(234,179,8,0.4)"/>
                <text x="36" y="15.5" text-anchor="middle" fill="#eab308" font-size="10" font-weight="800" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.05em">SLEEPER</text>
              </svg>
            </div>
            <!-- ESPN -->
            <div class="fb-platform-logo">
              <svg viewBox="0 0 62 22" width="62" height="22" xmlns="http://www.w3.org/2000/svg">
                <rect width="62" height="22" rx="4" fill="rgba(210,30,30,0.15)"/>
                <rect x="0.5" y="0.5" width="61" height="21" rx="3.5" fill="none" stroke="rgba(220,50,50,0.5)"/>
                <text x="31" y="15.5" text-anchor="middle" fill="#f87171" font-size="11" font-weight="900" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.08em">ESPN</text>
              </svg>
            </div>
            <!-- Yahoo -->
            <div class="fb-platform-logo">
              <svg viewBox="0 0 66 22" width="66" height="22" xmlns="http://www.w3.org/2000/svg">
                <rect width="66" height="22" rx="4" fill="rgba(139,92,246,0.12)"/>
                <rect x="0.5" y="0.5" width="65" height="21" rx="3.5" fill="none" stroke="rgba(139,92,246,0.45)"/>
                <text x="33" y="15.5" text-anchor="middle" fill="#a78bfa" font-size="10" font-weight="800" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.04em">YAHOO!</text>
              </svg>
            </div>
          </div>
        </div>

        <!-- Right: fanned cards -->
        <div class="fb-cards-area">
          <!-- Power Rankings card -->
          <div class="fb-card fb-card-1">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">⚡ Power Rankings</span><span class="fbc-wk">WK 11</span></div>
            <div class="fbc-row fbc-gold"><span class="fbc-rk gold">1</span><div class="fbc-dot" style="background:#eab308"></div><span class="fbc-name">Mahomes Magic</span><span class="fbc-pts gold">142.6</span><span class="fbc-chg up">▲2</span></div>
            <div class="fbc-row"><span class="fbc-rk">2</span><div class="fbc-dot" style="background:#10b981"></div><span class="fbc-name">Trash Can Wins</span><span class="fbc-pts">128.4</span><span class="fbc-chg up">▲1</span></div>
            <div class="fbc-row"><span class="fbc-rk">3</span><div class="fbc-dot" style="background:#6366f1"></div><span class="fbc-name">The Algorithm</span><span class="fbc-pts">119.3</span><span class="fbc-chg dn">▼1</span></div>
            <div class="fbc-row"><span class="fbc-rk">4</span><div class="fbc-dot" style="background:#ef4444"></div><span class="fbc-name">Waiver Wire Kid</span><span class="fbc-pts">112.1</span><span class="fbc-chg dn">▼2</span></div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>
          <!-- Win Prob card (center, front) -->
          <div class="fb-card fb-card-2">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">⚔️ Matchup Analysis</span><span class="fbc-wk live">● LIVE</span></div>
            <div class="fbc-matchup">
              <div class="fbc-team"><div class="fbc-avatar" style="background:linear-gradient(135deg,#eab308,#ca8a04)"></div><div class="fbc-tname">Mahomes Magic</div><div class="fbc-score gold">142.6</div></div>
              <div class="fbc-vs">VS</div>
              <div class="fbc-team"><div class="fbc-avatar" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)"></div><div class="fbc-tname">Trash Can Wins</div><div class="fbc-score">119.3</div></div>
            </div>
            <div class="fbc-prob-wrap">
              <div class="fbc-prob-labels"><span class="gold">72% win prob</span><span>28%</span></div>
              <div class="fbc-prob-bar"><div class="fbc-prob-fill" style="width:72%"></div></div>
              <div class="fbc-prob-sub">Monte Carlo · 10,000 simulations</div>
            </div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>
          <!-- Legacy Standings card -->
          <div class="fb-card fb-card-3">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">🏆 Legacy Standings</span><span class="fbc-wk">ALL TIME</span></div>
            <div class="fbc-leg-row fbc-gold"><span class="fbc-rk gold">1</span><div class="fbc-dot" style="background:#eab308"></div><span class="fbc-name">Mahomes Magic</span><span class="fbc-pts gold">1,847</span></div>
            <div class="fbc-leg-row"><span class="fbc-rk">2</span><div class="fbc-dot" style="background:#10b981"></div><span class="fbc-name">Trash Can Wins</span><span class="fbc-pts">1,623</span></div>
            <div class="fbc-leg-row"><span class="fbc-rk">3</span><div class="fbc-dot" style="background:#6366f1"></div><span class="fbc-name">The Algorithm</span><span class="fbc-pts">1,401</span></div>
            <div class="fbc-leg-row"><span class="fbc-rk">4</span><div class="fbc-dot" style="background:#f97316"></div><span class="fbc-name">Waiver Wire Kid</span><span class="fbc-pts">1,198</span></div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════
         POST GRID — 2 per row
    ══════════════════════════════════════════ -->
    <div class="section-label">📸 Social Post Graphics — Screenshot each card individually</div>
    <div class="posts-grid">

      <!-- ─── 1. MAIN BRAND ─────────────────────── -->
      <div class="post-wrap">
        <div class="post-label">1 · Main Brand</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-inner center">
            <img src="/UFD_V8.png" class="sq-logo-lg" alt="UFD" />
            <div class="sq-eyebrow">Fantasy Analytics</div>
            <div class="sq-hl" style="font-size:68px">Keep your<br/>league <span class="gold">talking.</span><br/>All season.</div>
            <div class="sq-body">Power rankings · Win probability<br/>Draft grades · League history</div>
            <div class="sq-plat-row">
              <span class="plat sleeper">Sleeper</span><span class="plat espn">ESPN</span><span class="plat yahoo">Yahoo</span>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 2. LAUNCH SPECIAL #1 ───────────────── -->
      <div class="post-wrap">
        <div class="post-label">2 · Launch Special</div>
        <div class="sq sq-launch">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#22c55e,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-launch-badge">🚀 LAUNCH SPECIAL</div>
            <div class="sq-hl" style="font-size:62px;margin-top:12px">The whole<br/>season.<br/><span style="color:#22c55e">Only $5.</span></div>
            <div class="sq-launch-card">
              <div class="sq-launch-line"><span class="sq-launch-feature">⚡ Weekly Power Rankings</span><span class="sq-launch-check">✓</span></div>
              <div class="sq-launch-line"><span class="sq-launch-feature">⚔️ Live Win Probability</span><span class="sq-launch-check">✓</span></div>
              <div class="sq-launch-line"><span class="sq-launch-feature">📋 Draft Grades All Season</span><span class="sq-launch-check">✓</span></div>
              <div class="sq-launch-line"><span class="sq-launch-feature">🏆 Full League History</span><span class="sq-launch-check">✓</span></div>
            </div>
            <div class="sq-launch-price-row">
              <span class="sq-launch-was">Regular price $19</span>
              <span class="sq-launch-now">$5 today</span>
            </div>
            <div class="sq-cta-pill" style="background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.4);color:#22c55e">Grab the launch price →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 3. LAUNCH SPECIAL #2 ───────────────── -->
      <div class="post-wrap">
        <div class="post-label">3 · Launch Special — Urgency</div>
        <div class="sq sq-launch2">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#eab308,transparent)"></div>
          <div class="sq-inner center">
            <img src="/UFD_V8.png" class="sq-logo-lg" alt="UFD" style="width:140px;margin-bottom:8px" />
            <div class="sq-eyebrow" style="color:#eab308">⏳ Limited Launch Pricing</div>
            <div class="sq-hl" style="font-size:56px;margin-top:8px">Your entire<br/>fantasy season<br/>for <span class="gold">$5.</span></div>
            <div class="sq-body" style="margin-top:12px">Connect your Sleeper, ESPN, or Yahoo league.<br/>Power rankings, matchup analysis, draft grades,<br/>and full league history — all season long.</div>
            <div class="sq-launch-price-highlight">
              <span class="sq-ph-label">Launch Price</span>
              <span class="sq-ph-price">$5</span>
              <span class="sq-ph-season">/ season</span>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 4. POWER RANKINGS ──────────────────── -->
      <div class="post-wrap">
        <div class="post-label">4 · Power Rankings</div>
        <div class="sq sq-pr">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-inner">
            <div class="sq-eyebrow">⚡ Weekly Power Rankings</div>
            <div class="sq-hl" style="font-size:58px">Standings<br/>lie.<br/><span class="gold">Power<br/>rankings<br/>don't.</span></div>
            <div class="mini-card" style="margin-top:16px">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏈 NFL Fantasy · PPR</span><span class="mc-wk">WK 11</span></div>
              <div class="mc-row gold-row"><span class="mc-rk gold">1</span><div class="mc-dot" style="background:#eab308"></div><span class="mc-name">Mahomes Magic</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:95%"></div></div><span class="mc-pts gold">142.6</span></div>
              <div class="mc-row"><span class="mc-rk">2</span><div class="mc-dot" style="background:#10b981"></div><span class="mc-name">Trash Can Wins</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:78%;background:#10b981"></div></div><span class="mc-pts">128.4</span></div>
              <div class="mc-row"><span class="mc-rk">3</span><div class="mc-dot" style="background:#6366f1"></div><span class="mc-name">The Algorithm</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:65%;background:#6366f1"></div></div><span class="mc-pts">119.3</span></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 5. WIN PROBABILITY ─────────────────── -->
      <div class="post-wrap">
        <div class="post-label">5 · Win Probability</div>
        <div class="sq sq-wp">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#06b6d4,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-eyebrow" style="color:#06b6d4">⚔️ Live Matchup Analysis</div>
            <div class="sq-hl" style="font-size:52px">You're not<br/>winning until<br/>it says <span style="color:#06b6d4">100%.</span></div>
            <div class="mini-card" style="margin-top:16px;border-color:rgba(6,182,212,0.2)">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏈 NFL Fantasy · PPR</span><span class="mc-wk" style="color:#22c55e;background:rgba(34,197,94,0.1)">● LIVE</span></div>
              <div class="wp-teams">
                <div class="wp-team"><div class="wp-avatar" style="background:linear-gradient(135deg,#eab308,#ca8a04)"></div><div class="wp-tname">Mahomes Magic</div><div class="wp-score gold">142.6</div></div>
                <div class="wp-vs">VS</div>
                <div class="wp-team"><div class="wp-avatar" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)"></div><div class="wp-tname">Trash Can Wins</div><div class="wp-score">119.3</div></div>
              </div>
              <div style="padding:0 14px 12px">
                <div class="wp-labels"><span class="gold" style="font-weight:700;font-size:13px">72% win prob</span><span style="font-size:12px;color:#6b7280">28%</span></div>
                <div class="wp-track"><div class="wp-fill" style="width:72%"></div></div>
                <div style="font-size:10px;color:#374151;text-align:center;margin-top:4px">Monte Carlo · 10,000 simulations · Live</div>
              </div>
            </div>
            <div class="sq-body" style="color:#4b5563;margin-top:10px;font-size:14px">Post this at halftime. Watch the group chat explode.</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 6. DRAFT GRADES ────────────────────── -->
      <div class="post-wrap">
        <div class="post-label">6 · Draft Grades</div>
        <div class="sq sq-draft">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#8b5cf6,transparent)"></div>
          <div class="sq-inner">
            <div class="sq-eyebrow" style="color:#a78bfa">📋 Draft Analysis</div>
            <div class="sq-hl" style="font-size:54px">Everyone<br/>thinks they<br/>drafted well.<br/><span style="color:#a78bfa">Grades<br/>disagree.</span></div>
            <div class="mini-card" style="margin-top:14px;border-color:rgba(139,92,246,0.2)">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏈 NFL Fantasy · PPR</span><span class="mc-wk">DRAFT</span></div>
              <div class="dg-row dg-gold"><span class="dg-pick">1.03</span><span class="dg-name">Justin Jefferson</span><span class="dg-pos wr">WR</span><span class="dg-par up">+42.1</span><span class="dg-grade gold">A+</span></div>
              <div class="dg-row"><span class="dg-pick">2.14</span><span class="dg-name">Davante Adams</span><span class="dg-pos wr">WR</span><span class="dg-par up">+18.7</span><span class="dg-grade grn">A</span></div>
              <div class="dg-row dg-bust"><span class="dg-pick">5.51</span><span class="dg-name">Stefon Diggs</span><span class="dg-pos wr">WR</span><span class="dg-par dn">-11.8</span><span class="dg-grade red">D</span></div>
              <div class="dg-foot"><span style="font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em">Overall</span><span style="font-size:16px;font-weight:900;color:#eab308;margin-left:8px">A</span></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 7. SLEEPER FOOTBALL ────────────────── -->
      <div class="post-wrap">
        <div class="post-label">7 · Sleeper · Football</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline" style="background:linear-gradient(90deg,transparent,#eab308,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <svg viewBox="0 0 90 26" width="90" height="26"><rect width="90" height="26" rx="5" fill="rgba(234,179,8,0.12)"/><rect x="0.5" y="0.5" width="89" height="25" rx="4.5" fill="none" stroke="rgba(234,179,8,0.4)"/><text x="45" y="18" text-anchor="middle" fill="#eab308" font-size="12" font-weight="800" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.06em">SLEEPER</text></svg>
              <span class="sq-sport-tag football">🏈 NFL Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:52px;margin-top:12px">Your Sleeper<br/>league just<br/>got a <span class="gold">serious</span><br/>upgrade.</div>
            <div class="mini-card" style="margin-top:14px">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏈 NFL Fantasy · Sleeper</span><span class="mc-wk">WK 11</span></div>
              <div class="mc-row gold-row"><span class="mc-rk gold">1</span><div class="mc-dot" style="background:#eab308"></div><span class="mc-name">Mahomes Magic</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:95%"></div></div><span class="mc-pts gold">142.6</span></div>
              <div class="mc-row"><span class="mc-rk">2</span><div class="mc-dot" style="background:#10b981"></div><span class="mc-name">Trash Can Wins</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:78%;background:#10b981"></div></div><span class="mc-pts">128.4</span></div>
              <div class="mc-row"><span class="mc-rk">3</span><div class="mc-dot" style="background:#6366f1"></div><span class="mc-name">The Algorithm</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:65%;background:#6366f1"></div></div><span class="mc-pts">119.3</span></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 8. SLEEPER BASKETBALL ──────────────── -->
      <div class="post-wrap">
        <div class="post-label">8 · Sleeper · Basketball</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline" style="background:linear-gradient(90deg,transparent,#f97316,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <svg viewBox="0 0 90 26" width="90" height="26"><rect width="90" height="26" rx="5" fill="rgba(234,179,8,0.12)"/><rect x="0.5" y="0.5" width="89" height="25" rx="4.5" fill="none" stroke="rgba(234,179,8,0.4)"/><text x="45" y="18" text-anchor="middle" fill="#eab308" font-size="12" font-weight="800" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.06em">SLEEPER</text></svg>
              <span class="sq-sport-tag basketball">🏀 NBA Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:52px;margin-top:12px">Category<br/>leagues.<br/>Power<br/>rankings.<br/><span style="color:#f97316">Finally.</span></div>
            <div class="mini-card" style="margin-top:14px;border-color:rgba(249,115,22,0.2)">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏀 NBA Fantasy · Sleeper</span><span class="mc-wk">WK 8</span></div>
              <div class="mc-row gold-row"><span class="mc-rk gold">1</span><div class="mc-dot" style="background:#f97316"></div><span class="mc-name">Hoop Dreams FC</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:92%;background:#f97316"></div></div><span class="mc-pts gold">8.2</span></div>
              <div class="mc-row"><span class="mc-rk">2</span><div class="mc-dot" style="background:#06b6d4"></div><span class="mc-name">Buckets Brigade</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:74%;background:#06b6d4"></div></div><span class="mc-pts">7.4</span></div>
              <div class="mc-row"><span class="mc-rk">3</span><div class="mc-dot" style="background:#8b5cf6"></div><span class="mc-name">The Ankle Takers</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:62%;background:#8b5cf6"></div></div><span class="mc-pts">6.8</span></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 9. ESPN FOOTBALL ───────────────────── -->
      <div class="post-wrap">
        <div class="post-label">9 · ESPN · Football</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline" style="background:linear-gradient(90deg,transparent,#ef4444,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <svg viewBox="0 0 76 26" width="76" height="26"><rect width="76" height="26" rx="5" fill="rgba(210,30,30,0.15)"/><rect x="0.5" y="0.5" width="75" height="25" rx="4.5" fill="none" stroke="rgba(220,50,50,0.5)"/><text x="38" y="18" text-anchor="middle" fill="#f87171" font-size="13" font-weight="900" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.08em">ESPN</text></svg>
              <span class="sq-sport-tag football">🏈 NFL Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:52px;margin-top:12px">Your ESPN<br/>league has<br/>more data<br/>than you<br/><span style="color:#f87171">ever knew.</span></div>
            <div class="mini-card" style="margin-top:14px;border-color:rgba(239,68,68,0.2)">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏈 NFL Fantasy · ESPN</span><span class="mc-wk">DRAFT</span></div>
              <div class="dg-row dg-gold"><span class="dg-pick">1.01</span><span class="dg-name">CeeDee Lamb</span><span class="dg-pos wr">WR</span><span class="dg-par up">+38.2</span><span class="dg-grade gold">A+</span></div>
              <div class="dg-row"><span class="dg-pick">2.08</span><span class="dg-name">Derrick Henry</span><span class="dg-pos rb">RB</span><span class="dg-par up">+22.1</span><span class="dg-grade grn">A</span></div>
              <div class="dg-row dg-bust"><span class="dg-pick">3.04</span><span class="dg-name">Saquon Barkley</span><span class="dg-pos rb">RB</span><span class="dg-par dn">-31.4</span><span class="dg-grade red">D</span></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 10. ESPN BASEBALL ──────────────────── -->
      <div class="post-wrap">
        <div class="post-label">10 · ESPN · Baseball</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline" style="background:linear-gradient(90deg,transparent,#3b82f6,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <svg viewBox="0 0 76 26" width="76" height="26"><rect width="76" height="26" rx="5" fill="rgba(210,30,30,0.15)"/><rect x="0.5" y="0.5" width="75" height="25" rx="4.5" fill="none" stroke="rgba(220,50,50,0.5)"/><text x="38" y="18" text-anchor="middle" fill="#f87171" font-size="13" font-weight="900" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.08em">ESPN</text></svg>
              <span class="sq-sport-tag baseball">⚾ MLB Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:52px;margin-top:12px">Fantasy<br/>baseball<br/>analytics<br/>that actually<br/><span style="color:#60a5fa">slap.</span></div>
            <div class="mini-card" style="margin-top:14px;border-color:rgba(59,130,246,0.2)">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">⚾ MLB Fantasy · ESPN</span><span class="mc-wk">WK 14</span></div>
              <div class="mc-row gold-row"><span class="mc-rk gold">1</span><div class="mc-dot" style="background:#eab308"></div><span class="mc-name">Diamond Felons</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:91%"></div></div><span class="mc-pts gold">7.8</span></div>
              <div class="mc-row"><span class="mc-rk">2</span><div class="mc-dot" style="background:#3b82f6"></div><span class="mc-name">Bases Loaded FC</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:72%;background:#3b82f6"></div></div><span class="mc-pts">6.9</span></div>
              <div class="mc-row"><span class="mc-rk">3</span><div class="mc-dot" style="background:#10b981"></div><span class="mc-name">The Sluggers</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:61%;background:#10b981"></div></div><span class="mc-pts">6.2</span></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 11. ESPN BASKETBALL ────────────────── -->
      <div class="post-wrap">
        <div class="post-label">11 · ESPN · Basketball</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline" style="background:linear-gradient(90deg,transparent,#f97316,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <svg viewBox="0 0 76 26" width="76" height="26"><rect width="76" height="26" rx="5" fill="rgba(210,30,30,0.15)"/><rect x="0.5" y="0.5" width="75" height="25" rx="4.5" fill="none" stroke="rgba(220,50,50,0.5)"/><text x="38" y="18" text-anchor="middle" fill="#f87171" font-size="13" font-weight="900" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.08em">ESPN</text></svg>
              <span class="sq-sport-tag basketball">🏀 NBA Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:52px;margin-top:12px">Win more<br/>categories.<br/>Lose fewer<br/><span style="color:#f97316">arguments.</span></div>
            <div class="mini-card" style="margin-top:14px;border-color:rgba(249,115,22,0.2)">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏀 NBA Fantasy · ESPN</span><span class="mc-wk" style="color:#22c55e;background:rgba(34,197,94,0.1)">● LIVE</span></div>
              <div class="wp-teams" style="padding:10px 14px 6px">
                <div class="wp-team"><div class="wp-avatar" style="background:linear-gradient(135deg,#f97316,#c2410c)"></div><div class="wp-tname">Hoop Dreams</div><div class="wp-score" style="color:#f97316">6W-3L</div></div>
                <div class="wp-vs">VS</div>
                <div class="wp-team"><div class="wp-avatar" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)"></div><div class="wp-tname">Buckets FC</div><div class="wp-score">5W-4L</div></div>
              </div>
              <div style="padding:0 14px 10px"><div class="wp-track"><div class="wp-fill" style="width:64%;background:linear-gradient(90deg,#f97316,#c2410c)"></div></div><div style="font-size:10px;color:#6b7280;text-align:center;margin-top:4px">Win Prob · 64% · Monte Carlo</div></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 12. YAHOO FOOTBALL ─────────────────── -->
      <div class="post-wrap">
        <div class="post-label">12 · Yahoo · Football</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline" style="background:linear-gradient(90deg,transparent,#a78bfa,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <svg viewBox="0 0 80 26" width="80" height="26"><rect width="80" height="26" rx="5" fill="rgba(139,92,246,0.12)"/><rect x="0.5" y="0.5" width="79" height="25" rx="4.5" fill="none" stroke="rgba(139,92,246,0.45)"/><text x="40" y="18" text-anchor="middle" fill="#a78bfa" font-size="12" font-weight="800" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.04em">YAHOO!</text></svg>
              <span class="sq-sport-tag football">🏈 NFL Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:52px;margin-top:12px">6 years of<br/>your Yahoo<br/>league.<br/><span style="color:#a78bfa">One screen.</span></div>
            <div class="mini-card" style="margin-top:14px;border-color:rgba(139,92,246,0.2)">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏈 NFL Fantasy · Yahoo</span><span class="mc-wk">ALL TIME</span></div>
              <div class="leg-row gold-row"><span class="leg-pos gold">1</span><div class="mc-dot" style="background:#eab308"></div><span class="leg-name">The Dynasty</span><span class="leg-trophies">🏆🏆🏆</span><span class="leg-pts gold">2,104</span></div>
              <div class="leg-row"><span class="leg-pos">2</span><div class="mc-dot" style="background:#a78bfa"></div><span class="leg-name">Purple People</span><span class="leg-trophies">🏆</span><span class="leg-pts">1,847</span></div>
              <div class="leg-row"><span class="leg-pos">3</span><div class="mc-dot" style="background:#10b981"></div><span class="leg-name">Green Machine</span><span class="leg-trophies"></span><span class="leg-pts">1,623</span></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 13. YAHOO BASEBALL ─────────────────── -->
      <div class="post-wrap">
        <div class="post-label">13 · Yahoo · Baseball</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline" style="background:linear-gradient(90deg,transparent,#a78bfa,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <svg viewBox="0 0 80 26" width="80" height="26"><rect width="80" height="26" rx="5" fill="rgba(139,92,246,0.12)"/><rect x="0.5" y="0.5" width="79" height="25" rx="4.5" fill="none" stroke="rgba(139,92,246,0.45)"/><text x="40" y="18" text-anchor="middle" fill="#a78bfa" font-size="12" font-weight="800" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.04em">YAHOO!</text></svg>
              <span class="sq-sport-tag baseball">⚾ MLB Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:52px;margin-top:12px">Roto<br/>leagues<br/>deserve<br/>real <span style="color:#a78bfa">power<br/>rankings.</span></div>
            <div class="mini-card" style="margin-top:14px;border-color:rgba(139,92,246,0.2)">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">⚾ MLB Fantasy · Yahoo</span><span class="mc-wk">WK 18</span></div>
              <div class="mc-row gold-row"><span class="mc-rk gold">1</span><div class="mc-dot" style="background:#eab308"></div><span class="mc-name">Diamond Kings</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:94%"></div></div><span class="mc-pts gold">8.1</span></div>
              <div class="mc-row"><span class="mc-rk">2</span><div class="mc-dot" style="background:#a78bfa"></div><span class="mc-name">Roto Renegades</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:71%;background:#a78bfa"></div></div><span class="mc-pts">7.1</span></div>
              <div class="mc-row"><span class="mc-rk">3</span><div class="mc-dot" style="background:#3b82f6"></div><span class="mc-name">The Sluggers</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:59%;background:#3b82f6"></div></div><span class="mc-pts">6.4</span></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 14. YAHOO HOCKEY ───────────────────── -->
      <div class="post-wrap">
        <div class="post-label">14 · Yahoo · Hockey</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline" style="background:linear-gradient(90deg,transparent,#a78bfa,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <svg viewBox="0 0 80 26" width="80" height="26"><rect width="80" height="26" rx="5" fill="rgba(139,92,246,0.12)"/><rect x="0.5" y="0.5" width="79" height="25" rx="4.5" fill="none" stroke="rgba(139,92,246,0.45)"/><text x="40" y="18" text-anchor="middle" fill="#a78bfa" font-size="12" font-weight="800" font-family="Helvetica Neue,Arial,sans-serif" letter-spacing="0.04em">YAHOO!</text></svg>
              <span class="sq-sport-tag hockey">🏒 NHL Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:52px;margin-top:12px">Fantasy<br/>hockey<br/>power<br/>rankings<br/><span style="color:#a78bfa">finally exist.</span></div>
            <div class="mini-card" style="margin-top:14px;border-color:rgba(139,92,246,0.2)">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏒 NHL Fantasy · Yahoo</span><span class="mc-wk">WK 12</span></div>
              <div class="mc-row gold-row"><span class="mc-rk gold">1</span><div class="mc-dot" style="background:#eab308"></div><span class="mc-name">Ice Cold Killers</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:96%"></div></div><span class="mc-pts gold">7.6</span></div>
              <div class="mc-row"><span class="mc-rk">2</span><div class="mc-dot" style="background:#a78bfa"></div><span class="mc-name">Puck Renegades</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:73%;background:#a78bfa"></div></div><span class="mc-pts">6.8</span></div>
              <div class="mc-row"><span class="mc-rk">3</span><div class="mc-dot" style="background:#06b6d4"></div><span class="mc-name">Hat Trick Heroes</span><div class="mc-bar-wrap"><div class="mc-bar" style="width:58%;background:#06b6d4"></div></div><span class="mc-pts">6.1</span></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 15. LEAGUE HISTORY ─────────────────── -->
      <div class="post-wrap">
        <div class="post-label">15 · League History</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-inner center">
            <div class="sq-eyebrow">🏆 All-Time Records</div>
            <div class="sq-hl" style="font-size:54px">Your group<br/>chat has<br/><span class="gold">receipts.</span><br/>It just doesn't<br/>know it yet.</div>
            <div class="mini-card" style="margin-top:14px">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏈 NFL Fantasy · PPR</span><span class="mc-wk">ALL TIME</span></div>
              <div class="h2h-grid">
                <div class="h2h-header-row"><div class="h2h-lbl"></div><span class="h2h-col-hd">MM</span><span class="h2h-col-hd">TC</span><span class="h2h-col-hd">TA</span></div>
                <div class="h2h-data-row"><div class="h2h-lbl">Mahomes Magic</div><span class="h2h-cell self">—</span><span class="h2h-cell win">8-4</span><span class="h2h-cell win">11-3</span></div>
                <div class="h2h-data-row"><div class="h2h-lbl">Trash Can Wins</div><span class="h2h-cell loss">4-8</span><span class="h2h-cell self">—</span><span class="h2h-cell win">7-5</span></div>
                <div class="h2h-data-row"><div class="h2h-lbl">The Algorithm</div><span class="h2h-cell loss">3-11</span><span class="h2h-cell loss">5-7</span><span class="h2h-cell self">—</span></div>
              </div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 16. COMMISSIONER ───────────────────── -->
      <div class="post-wrap">
        <div class="post-label">16 · Commissioner</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-inner center">
            <div class="sq-eyebrow">🏆 For Commissioners</div>
            <div class="sq-hl" style="font-size:52px">Your league<br/>goes quiet<br/>after week 8.<br/><span class="gold">Fix that.</span></div>
            <div class="sq-feat-list" style="margin-top:16px">
              <div class="sq-feat-row">⚡<span>Weekly power rankings — auto-generated</span></div>
              <div class="sq-feat-row">⚔️<span>Live win probability every game day</span></div>
              <div class="sq-feat-row">📋<span>Draft grades that update all season</span></div>
              <div class="sq-feat-row">🏆<span>All-time H2H records &amp; legacy scores</span></div>
            </div>
            <div class="sq-cta-pill" style="margin-top:20px">Free to try →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 17. TRASH TALK ─────────────────────── -->
      <div class="post-wrap">
        <div class="post-label">17 · Trash Talk</div>
        <div class="sq sq-fire">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#ef4444,transparent)"></div>
          <div class="sq-inner center">
            <div class="sq-hl" style="font-size:72px;line-height:0.92">Stop<br/>arguing.<br/><span style="color:#ef4444">Post the<br/>receipts.</span></div>
            <div class="mini-card" style="margin-top:20px;border-color:rgba(239,68,68,0.2)">
              <div class="mc-head"><span class="mc-badge">UFD</span><span class="mc-sport">🏈 NFL Fantasy · PPR</span><span class="mc-wk">ALL TIME</span></div>
              <div class="leg-row"><span class="leg-pos" style="color:#ef4444">😬</span><div class="mc-dot" style="background:#ef4444"></div><span class="leg-name">Your Nemesis</span><span style="font-size:11px;color:#4b5563;margin-left:auto">vs you:</span><span class="leg-pts" style="color:#ef4444">18-4</span></div>
              <div style="padding:6px 14px 10px;font-size:10px;color:#4b5563;text-align:center">He knew. You didn't. Now everyone does.</div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- ─── 18. FREE CTA ───────────────────────── -->
      <div class="post-wrap">
        <div class="post-label">18 · Free CTA</div>
        <div class="sq sq-brand">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-inner center">
            <img src="/UFD_V8.png" class="sq-logo-lg" alt="UFD" />
            <div class="sq-hl" style="font-size:56px">Your league<br/>deserves<br/><span class="gold">better<br/>content.</span></div>
            <div class="sq-body" style="margin-top:14px">Connect your Sleeper, ESPN, or Yahoo league<br/>in 2 minutes. Free to start.</div>
            <div class="sq-plat-row" style="margin-top:16px">
              <span class="plat sleeper">Sleeper</span><span class="plat espn">ESPN</span><span class="plat yahoo">Yahoo</span>
            </div>
            <div class="sq-sports-row" style="margin-top:10px">
              <span class="sport-tag">🏈</span><span class="sport-tag">🏀</span><span class="sport-tag">⚾</span><span class="sport-tag">🏒</span>
            </div>
            <div class="sq-cta-pill" style="font-size:16px;padding:14px 32px;margin-top:20px">Connect Your League Free →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

    </div><!-- /posts-grid -->
  </div>
</template>

<script setup lang="ts">
// Screenshot-focused — no download buttons needed
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.studio-root {
  min-height: 100vh;
  background: #030407;
  color: #f7f7ff;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  padding-bottom: 80px;
}

/* ── Header ── */
.studio-header {
  display: flex; align-items: center; gap: 20px;
  padding: 28px 40px;
  border-bottom: 1px solid #1e2130;
  background: linear-gradient(180deg, #0a0c14, #05060a);
}
.studio-logo { height: 44px; object-fit: contain; }
.studio-header h1 { font-size: 24px; font-weight: 900; margin-bottom: 4px; letter-spacing: -0.02em; }
.studio-header p  { font-size: 13px; color: #6b7280; }

.section-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.15em;
  text-transform: uppercase; color: #4b5563;
  padding: 28px 40px 14px;
}

/* ══════════════════════════
   FACEBOOK BANNER
══════════════════════════ */
.banner-stage { padding: 0 40px 48px; display: flex; justify-content: flex-start; }

.fb-banner {
  width: 851px; height: 315px;
  background: #05060a;
  position: relative; overflow: hidden;
  border-radius: 6px;
  display: flex; align-items: center;
  box-shadow: 0 0 0 1px #1e2130, 0 32px 80px rgba(0,0,0,0.8);
}
.fb-grid {
  position: absolute; inset: 0;
  background-image: linear-gradient(rgba(234,179,8,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}
.fb-glow-1 { position: absolute; width: 380px; height: 380px; background: radial-gradient(circle, rgba(234,179,8,0.13) 0%, transparent 65%); top: -120px; left: 100px; pointer-events: none; }
.fb-glow-2 { position: absolute; width: 500px; height: 500px; background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%); bottom: -200px; right: 100px; pointer-events: none; }
.fb-grain {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.2;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}
.fb-topline { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, #eab308 25%, #fbbf24 50%, #eab308 75%, transparent); }

/* Left panel — hard width cap so text never overflows into cards */
.fb-left {
  position: relative; z-index: 20;
  width: 310px; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 8px;
  padding: 24px 0 24px 30px;
}
.fb-logo { width: 180px; height: auto; object-fit: contain; margin-bottom: 2px; }
.fb-headline {
  font-size: 30px; font-weight: 900; line-height: 1.08;
  letter-spacing: -0.02em; color: #fff;
  white-space: normal; word-break: break-word;
}
.fb-gold { color: #eab308; }
.fb-sub { font-size: 10.5px; color: #6b7280; line-height: 1.4; }
.fb-platforms { display: flex; gap: 7px; align-items: center; margin-top: 4px; flex-wrap: wrap; }
.fb-platform-logo { display: flex; align-items: center; }

/* Fanned cards area */
.fb-cards-area {
  position: absolute; right: -8px; top: 0; bottom: 0; width: 550px;
}
.fb-cards-area::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 110px; background: linear-gradient(90deg, #05060a, transparent); z-index: 15; }
.fb-cards-area::after  { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 60px; background: linear-gradient(270deg, #05060a, transparent); z-index: 15; }

.fb-card {
  position: absolute; width: 210px;
  background: linear-gradient(145deg, #111420, #090c16);
  border: 1px solid #1e2130; border-radius: 12px; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.9); font-size: 9px;
}
.fb-card-1 { left: 20px;  top: 50%; transform: rotate(-7deg) translateY(-52%); opacity: 0.82; }
.fb-card-2 { left: 148px; top: 50%; transform: rotate(-1deg) translateY(-50%); border-color: rgba(234,179,8,0.25); box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(234,179,8,0.07); z-index: 2; }
.fb-card-3 { left: 293px; top: 50%; transform: rotate(4.5deg) translateY(-46%); opacity: 0.84; }

.fbc-head { display: flex; align-items: center; gap: 5px; padding: 8px 10px; border-bottom: 1px solid #1a1d28; background: rgba(0,0,0,0.2); }
.fbc-badge { font-size: 7px; font-weight: 900; background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.3); padding: 1px 5px; border-radius: 3px; }
.fbc-title { font-size: 8px; font-weight: 700; color: #d1d5db; flex: 1; }
.fbc-wk    { font-size: 7px; color: #374151; background: #1a1d28; padding: 1px 5px; border-radius: 3px; }
.fbc-wk.live { color: #22c55e; background: rgba(34,197,94,0.1); }
.fbc-row { display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-bottom: 1px solid rgba(26,29,40,0.6); }
.fbc-gold { background: rgba(234,179,8,0.05); }
.fbc-rk   { font-size: 8px; font-weight: 700; color: #4b5563; width: 8px; text-align: center; }
.fbc-rk.gold { color: #eab308; }
.fbc-dot  { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.fbc-name { font-size: 8px; color: #d1d5db; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fbc-pts  { font-size: 8px; font-weight: 700; color: #9ca3af; }
.fbc-pts.gold { color: #eab308; }
.fbc-chg.up { font-size: 7px; font-weight: 700; color: #22c55e; }
.fbc-chg.dn { font-size: 7px; font-weight: 700; color: #ef4444; }
.fbc-matchup { display: flex; align-items: center; padding: 10px 8px 6px; }
.fbc-team { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; }
.fbc-avatar { width: 24px; height: 24px; border-radius: 50%; }
.fbc-tname { font-size: 7px; color: #9ca3af; text-align: center; }
.fbc-score { font-size: 14px; font-weight: 900; color: #e5e7eb; }
.fbc-score.gold { color: #eab308; }
.fbc-vs { font-size: 8px; font-weight: 900; color: #374151; width: 16px; text-align: center; }
.fbc-prob-wrap { padding: 0 10px 6px; }
.fbc-prob-labels { display: flex; justify-content: space-between; font-size: 8px; font-weight: 700; color: #6b7280; margin-bottom: 4px; }
.fbc-prob-bar { height: 4px; background: #1e2130; border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
.fbc-prob-fill { height: 100%; background: linear-gradient(90deg, #eab308, #ca8a04); border-radius: 2px; }
.fbc-prob-sub { font-size: 7px; color: #374151; text-align: center; }
.fbc-leg-row { display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-bottom: 1px solid rgba(26,29,40,0.6); }
.fbc-wm { font-size: 6px; color: #1e2130; text-align: center; padding: 4px 0 5px; }

/* ══════════════════════════
   POSTS GRID — 2 per row
══════════════════════════ */
.posts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px 40px;
  padding: 0 40px;
}

.post-wrap {}
.post-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: #4b5563; margin-bottom: 12px;
}

/* Square canvas — fixed 540×540, no overlap */
.sq {
  width: 540px;
  height: 540px;
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 0 0 1px #1e2130, 0 20px 60px rgba(0,0,0,0.7);
  flex-shrink: 0;
}

/* Background themes */
.sq-brand { background: radial-gradient(ellipse 120% 100% at 50% 0%, rgba(234,179,8,0.09) 0%, transparent 60%), linear-gradient(145deg, #05060a 0%, #090c14 100%); }
.sq-launch { background: radial-gradient(ellipse 120% 100% at 50% 20%, rgba(34,197,94,0.08) 0%, transparent 60%), linear-gradient(145deg, #040a06 0%, #060e08 100%); }
.sq-launch2 { background: radial-gradient(ellipse 120% 100% at 50% 0%, rgba(234,179,8,0.10) 0%, transparent 60%), linear-gradient(145deg, #07060a 0%, #0a0814 100%); }
.sq-pr     { background: radial-gradient(ellipse 100% 80% at 30% 20%, rgba(234,179,8,0.07) 0%, transparent 55%), linear-gradient(145deg, #07060a 0%, #0c0a14 100%); }
.sq-wp     { background: radial-gradient(ellipse 120% 100% at 70% 80%, rgba(6,182,212,0.07) 0%, transparent 60%), linear-gradient(145deg, #040810 0%, #080c18 100%); }
.sq-draft  { background: radial-gradient(ellipse 100% 80% at 50% 30%, rgba(139,92,246,0.08) 0%, transparent 60%), linear-gradient(145deg, #07050f 0%, #0a0814 100%); }
.sq-fire   { background: radial-gradient(ellipse 100% 80% at 50% 60%, rgba(239,68,68,0.08) 0%, transparent 60%), linear-gradient(145deg, #090404 0%, #0f0506 100%); }

.sq-grain {
  position: absolute; inset: 0; pointer-events: none; z-index: 1; opacity: 0.28;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}
.sq-topline {
  position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 5;
  background: linear-gradient(90deg, transparent 0%, #eab308 25%, #fbbf24 50%, #eab308 75%, transparent 100%);
}

.sq-inner {
  position: relative; z-index: 2;
  height: 100%;
  display: flex; flex-direction: column;
  padding: 40px 44px 60px;
}
.sq-inner.center { align-items: center; text-align: center; justify-content: center; }

.sq-logo-lg { height: auto; width: 170px; object-fit: contain; margin-bottom: 10px; }
.sq-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #eab308; margin-bottom: 10px; }
.sq-hl { font-weight: 900; line-height: 1.0; letter-spacing: -0.02em; color: #fff; }
.sq-body { font-size: 15px; color: #6b7280; line-height: 1.55; margin-top: 8px; }
.gold { color: #eab308; }

.sq-cta-pill {
  display: inline-block; margin-top: 20px;
  padding: 11px 22px;
  background: rgba(234,179,8,0.12); border: 1px solid rgba(234,179,8,0.35);
  border-radius: 30px; color: #eab308; font-size: 13px; font-weight: 700; letter-spacing: 0.02em;
}

.sq-plat-row { display: flex; gap: 8px; align-items: center; margin-top: 14px; justify-content: center; }
.plat { font-size: 11px; font-weight: 800; letter-spacing: 0.06em; padding: 4px 10px; border-radius: 4px; }
.plat.sleeper { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
.plat.espn    { background: rgba(239,68,68,0.12);  border: 1px solid rgba(239,68,68,0.3);  color: #f87171; }
.plat.yahoo   { background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.3); color: #a78bfa; }

.sq-sports-row { display: flex; gap: 12px; }
.sport-tag { font-size: 24px; }

.sq-url {
  position: absolute; bottom: 18px; left: 0; right: 0;
  text-align: center; font-size: 11px; color: #1e2130; letter-spacing: 0.06em; z-index: 3;
}

/* Platform + Sport header */
.sq-plat-sport-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.sq-sport-tag { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; }
.sq-sport-tag.football   { background: rgba(34,197,94,0.1);  border: 1px solid rgba(34,197,94,0.25);  color: #4ade80; }
.sq-sport-tag.basketball { background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.25); color: #fb923c; }
.sq-sport-tag.baseball   { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25); color: #60a5fa; }
.sq-sport-tag.hockey     { background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.25); color: #a78bfa; }

/* Mini card component */
.mini-card {
  width: 100%;
  background: linear-gradient(145deg, #0f1220, #090c18);
  border: 1px solid rgba(234,179,8,0.15);
  border-radius: 12px; overflow: hidden;
}
.mc-head { display: flex; align-items: center; gap: 6px; padding: 9px 14px; border-bottom: 1px solid #1a1d28; background: rgba(0,0,0,0.2); }
.mc-badge { font-size: 8px; font-weight: 900; background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.3); padding: 2px 6px; border-radius: 3px; }
.mc-sport { font-size: 11px; color: #6b7280; flex: 1; }
.mc-wk    { font-size: 9px; color: #374151; background: #1a1d28; padding: 2px 6px; border-radius: 3px; font-weight: 700; }
.mc-row   { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-bottom: 1px solid rgba(26,29,40,0.7); }
.mc-row:last-child { border-bottom: none; }
.gold-row { background: rgba(234,179,8,0.04); }
.mc-rk    { font-size: 10px; font-weight: 700; color: #4b5563; width: 12px; text-align: center; }
.mc-rk.gold { color: #eab308; }
.mc-dot   { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.mc-name  { font-size: 12px; color: #d1d5db; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mc-bar-wrap { width: 60px; height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
.mc-bar { height: 100%; border-radius: 2px; background: linear-gradient(90deg,#eab308,#ca8a04); }
.mc-pts { font-size: 11px; font-weight: 700; color: #eab308; width: 36px; text-align: right; flex-shrink: 0; }

/* Win prob in sq */
.wp-teams { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 6px; }
.wp-team  { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.wp-avatar { width: 32px; height: 32px; border-radius: 50%; }
.wp-tname { font-size: 10px; color: #9ca3af; text-align: center; }
.wp-score { font-size: 20px; font-weight: 900; color: #e5e7eb; }
.wp-score.gold { color: #eab308; }
.wp-vs { font-size: 11px; font-weight: 900; color: #374151; }
.wp-labels { display: flex; justify-content: space-between; margin-bottom: 4px; }
.wp-track { height: 5px; background: #1e2130; border-radius: 3px; overflow: hidden; }
.wp-fill  { height: 100%; background: linear-gradient(90deg,#eab308,#ca8a04); border-radius: 3px; }

/* Draft grades mini */
.dg-row { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-bottom: 1px solid rgba(26,29,40,0.7); }
.dg-row:last-child { border-bottom: none; }
.dg-gold { background: rgba(234,179,8,0.05); }
.dg-bust { background: rgba(239,68,68,0.04); }
.dg-pick { font-size: 10px; font-weight: 700; color: #4b5563; width: 34px; flex-shrink: 0; }
.dg-name { font-size: 12px; color: #e5e7eb; font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dg-pos  { font-size: 9px; font-weight: 800; padding: 2px 5px; border-radius: 3px; flex-shrink: 0; }
.dg-pos.wr { background: rgba(59,130,246,0.15); color: #60a5fa; }
.dg-pos.rb { background: rgba(34,197,94,0.15); color: #4ade80; }
.dg-par  { font-size: 10px; font-weight: 700; width: 38px; text-align: right; flex-shrink: 0; }
.dg-par.up { color: #22c55e; }
.dg-par.dn { color: #ef4444; }
.dg-grade { font-size: 13px; font-weight: 900; width: 26px; text-align: right; flex-shrink: 0; }
.dg-grade.gold { color: #eab308; }
.dg-grade.grn  { color: #22c55e; }
.dg-grade.red  { color: #ef4444; }
.dg-foot { display: flex; align-items: center; padding: 7px 14px; border-top: 1px solid #1a1d28; }

/* Legacy rows */
.leg-row { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-bottom: 1px solid rgba(26,29,40,0.7); }
.leg-row:last-child { border-bottom: none; }
.leg-pos { font-size: 10px; font-weight: 700; color: #4b5563; width: 12px; text-align: center; }
.leg-name { font-size: 12px; color: #d1d5db; flex: 1; font-weight: 600; }
.leg-trophies { font-size: 10px; }
.leg-pts { font-size: 11px; font-weight: 700; color: #9ca3af; }
.leg-pts.gold { color: #eab308; }

/* H2H matrix */
.h2h-grid { padding: 10px 14px 12px; }
.h2h-header-row { display: flex; gap: 4px; align-items: center; margin-bottom: 3px; }
.h2h-data-row   { display: flex; gap: 4px; align-items: center; margin-bottom: 3px; }
.h2h-lbl { font-size: 9px; color: #6b7280; width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
.h2h-col-hd { width: 36px; text-align: center; font-size: 8px; font-weight: 700; color: #4b5563; }
.h2h-cell { width: 36px; height: 22px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
.h2h-cell.win  { background: rgba(34,197,94,0.15); color: #4ade80; }
.h2h-cell.loss { background: rgba(239,68,68,0.12); color: #f87171; }
.h2h-cell.self { background: rgba(255,255,255,0.03); color: #374151; }

/* Feature list */
.sq-feat-list { display: flex; flex-direction: column; gap: 8px; width: 100%; }
.sq-feat-row  { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #d1d5db; padding: 9px 14px; background: rgba(255,255,255,0.03); border: 1px solid #1e2130; border-radius: 8px; }
.sq-feat-row span { font-weight: 500; }

/* Launch special styles */
.sq-launch-badge {
  display: inline-block; padding: 6px 16px; border-radius: 20px;
  background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.4);
  color: #22c55e; font-size: 12px; font-weight: 800; letter-spacing: 0.1em;
  margin-bottom: 4px;
}
.sq-launch-card {
  display: flex; flex-direction: column; gap: 6px;
  width: 100%; margin: 12px 0;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(34,197,94,0.15);
  border-radius: 10px; padding: 12px 16px;
}
.sq-launch-line { display: flex; align-items: center; justify-content: space-between; }
.sq-launch-feature { font-size: 13px; color: #d1d5db; font-weight: 500; }
.sq-launch-check   { font-size: 14px; color: #22c55e; font-weight: 900; }
.sq-launch-price-row { display: flex; align-items: center; gap: 12px; margin-top: 8px; }
.sq-launch-was { font-size: 13px; color: #4b5563; text-decoration: line-through; }
.sq-launch-now { font-size: 22px; font-weight: 900; color: #22c55e; }

.sq-launch-price-highlight {
  display: flex; align-items: baseline; gap: 6px;
  margin-top: 16px; padding: 14px 24px;
  background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.25);
  border-radius: 12px;
}
.sq-ph-label  { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; }
.sq-ph-price  { font-size: 52px; font-weight: 900; color: #eab308; line-height: 1; }
.sq-ph-season { font-size: 14px; color: #6b7280; }
</style>
