<template>
  <div class="studio-root">

    <!-- Page Header -->
    <div class="studio-header">
      <img src="/UFD_V8.png" alt="UFD" class="studio-logo" />
      <div>
        <h1>Social Media Studio</h1>
        <p>Screenshot any image below — Facebook banner at top, 10 post graphics below</p>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         FACEBOOK BANNER  851 × 315
    ══════════════════════════════════════════════ -->
    <div class="section-label">📘 Facebook Page Banner &nbsp;·&nbsp; 851 × 315px &nbsp;·&nbsp; Screenshot the white box</div>
    <div class="banner-stage">
      <div class="fb-banner">
        <!-- Background layers -->
        <div class="fb-grid"></div>
        <div class="fb-glow-1"></div>
        <div class="fb-glow-2"></div>
        <div class="fb-grain"></div>
        <!-- Gold top line -->
        <div class="fb-topline"></div>

        <!-- Left: logo + headline + platforms -->
        <div class="fb-left">
          <img src="/UFD_V8.png" alt="UFD" class="fb-logo" />
          <div class="fb-headline">
            Keep your league<br />talking.
            <span class="fb-gold"> All season.</span>
          </div>
          <div class="fb-sub">Power rankings · Win probability · Draft grades · League history</div>
          <div class="fb-platforms">
            <span class="fb-plat sleeper">Sleeper</span>
            <span class="fb-plat espn">ESPN</span>
            <span class="fb-plat yahoo">Yahoo</span>
          </div>
        </div>

        <!-- Right: fanned cards -->
        <div class="fb-cards-area">
          <!-- Card 1: Power Rankings -->
          <div class="fb-card fb-card-1">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">⚡ Power Rankings</span><span class="fbc-wk">WK 11</span></div>
            <div class="fbc-row fbc-gold"><span class="fbc-rk gold">1</span><div class="fbc-dot" style="background:#eab308"></div><span class="fbc-name gold">Mahomes Magic</span><span class="fbc-pts gold">142.6</span><span class="fbc-chg up">▲2</span></div>
            <div class="fbc-row"><span class="fbc-rk">2</span><div class="fbc-dot" style="background:#10b981"></div><span class="fbc-name">Trash Can Wins</span><span class="fbc-pts">128.4</span><span class="fbc-chg up">▲1</span></div>
            <div class="fbc-row"><span class="fbc-rk">3</span><div class="fbc-dot" style="background:#6366f1"></div><span class="fbc-name">The Algorithm</span><span class="fbc-pts">119.3</span><span class="fbc-chg dn">▼1</span></div>
            <div class="fbc-row"><span class="fbc-rk">4</span><div class="fbc-dot" style="background:#ef4444"></div><span class="fbc-name">Waiver Wire Kid</span><span class="fbc-pts">112.1</span><span class="fbc-chg dn">▼2</span></div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>

          <!-- Card 2: Win Probability (front/center) -->
          <div class="fb-card fb-card-2">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">⚔️ Matchup Analysis</span><span class="fbc-wk" style="color:#22c55e;background:rgba(34,197,94,0.1)">● LIVE</span></div>
            <div class="fbc-matchup">
              <div class="fbc-team">
                <div class="fbc-avatar" style="background:linear-gradient(135deg,#eab308,#ca8a04)"></div>
                <div class="fbc-tname">Mahomes Magic</div>
                <div class="fbc-score gold">142.6</div>
              </div>
              <div class="fbc-vs">VS</div>
              <div class="fbc-team">
                <div class="fbc-avatar" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)"></div>
                <div class="fbc-tname">Trash Can Wins</div>
                <div class="fbc-score">119.3</div>
              </div>
            </div>
            <div class="fbc-prob-wrap">
              <div class="fbc-prob-labels"><span class="gold">72% win prob</span><span>28%</span></div>
              <div class="fbc-prob-bar"><div class="fbc-prob-fill" style="width:72%"></div></div>
              <div class="fbc-prob-sub">Monte Carlo · 10,000 simulations</div>
            </div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>

          <!-- Card 3: Legacy Standings -->
          <div class="fb-card fb-card-3">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">🏆 Legacy Standings</span><span class="fbc-wk">ALL TIME</span></div>
            <div class="fbc-leg-row" style="background:rgba(234,179,8,0.05)">
              <span class="fbc-leg-pos gold">1</span>
              <div class="fbc-dot" style="background:linear-gradient(135deg,#eab308,#ca8a04)"></div>
              <span class="fbc-leg-name gold">Mahomes Magic</span>
              <span class="fbc-leg-score gold">1,847</span>
            </div>
            <div class="fbc-leg-row">
              <span class="fbc-leg-pos">2</span>
              <div class="fbc-dot" style="background:#10b981"></div>
              <span class="fbc-leg-name">Trash Can Wins</span>
              <span class="fbc-leg-score">1,623</span>
            </div>
            <div class="fbc-leg-row">
              <span class="fbc-leg-pos">3</span>
              <div class="fbc-dot" style="background:#6366f1"></div>
              <span class="fbc-leg-name">The Algorithm</span>
              <span class="fbc-leg-score">1,401</span>
            </div>
            <div class="fbc-leg-row">
              <span class="fbc-leg-pos">4</span>
              <div class="fbc-dot" style="background:#f97316"></div>
              <span class="fbc-leg-name">Waiver Wire Kid</span>
              <span class="fbc-leg-score">1,198</span>
            </div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════════════
         10 SQUARE POST IMAGES  (screenshot these)
    ══════════════════════════════════════════════ -->
    <div class="section-label">📸 Social Post Graphics &nbsp;·&nbsp; Screenshot each card</div>
    <div class="posts-grid">

      <!-- POST 1: Main brand / trash talk -->
      <div class="post-wrap">
        <div class="post-label">1 · Main Brand</div>
        <div class="sq">
          <div class="sq-bg sq-bg-1"></div>
          <div class="sq-grain"></div>
          <div class="sq-topline"></div>
          <div class="sq-inner" style="justify-content:center;align-items:center;text-align:center">
            <img src="/UFD_V8.png" alt="UFD" class="sq-logo" />
            <div class="sq-eyebrow">Fantasy Analytics</div>
            <div class="sq-headline" style="font-size:72px">Keep your<br/>league <span class="gold">talking.</span><br/>All season.</div>
            <div class="sq-sub">Power rankings · Win probability · Draft grades · League history</div>
            <div class="sq-platforms-row">
              <span class="sq-plat sleeper">Sleeper</span>
              <span class="sq-plat espn">ESPN</span>
              <span class="sq-plat yahoo">Yahoo</span>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- POST 2: Power Rankings -->
      <div class="post-wrap">
        <div class="post-label">2 · Power Rankings</div>
        <div class="sq">
          <div class="sq-bg sq-bg-2"></div>
          <div class="sq-grain"></div>
          <div class="sq-topline"></div>
          <div class="sq-inner">
            <div class="sq-eyebrow">⚡ Weekly Power Rankings</div>
            <div class="sq-headline" style="font-size:64px">Standings<br/>lie.<br/><span class="gold">Power<br/>rankings<br/>don't.</span></div>
            <div class="sq-sub" style="margin-top:16px">Know who's actually playing well — not just who got lucky with their schedule.</div>
            <div class="sq-cta-pill">Free for Sleeper, ESPN & Yahoo →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- POST 3: Win Probability -->
      <div class="post-wrap">
        <div class="post-label">3 · Win Probability</div>
        <div class="sq">
          <div class="sq-bg sq-bg-3"></div>
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#06b6d4,transparent)"></div>
          <div class="sq-inner" style="justify-content:center;align-items:center;text-align:center">
            <div class="sq-eyebrow" style="color:#06b6d4">⚔️ Live Matchup Analysis</div>
            <div class="sq-headline" style="font-size:58px">You're not<br/>winning<br/>until it says<br/><span style="color:#06b6d4">100%.</span></div>
            <div class="sq-winprob-card">
              <div class="sq-wp-teams">
                <div class="sq-wp-team"><div class="sq-wp-dot" style="background:#eab308"></div><span class="gold">Mahomes Magic</span><span class="sq-wp-score gold">72%</span></div>
                <span class="sq-wp-vs">VS</span>
                <div class="sq-wp-team right"><div class="sq-wp-dot" style="background:#3b82f6"></div><span>Trash Can Wins</span><span class="sq-wp-score">28%</span></div>
              </div>
              <div class="sq-wp-bar-track"><div class="sq-wp-bar-fill" style="width:72%"></div></div>
              <div class="sq-wp-sub">Monte Carlo · 10,000 simulations · Live</div>
            </div>
            <div class="sq-sub" style="color:#4b5563;margin-top:12px">Post this at halftime. Watch the group chat explode.</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- POST 4: H2H Receipts -->
      <div class="post-wrap">
        <div class="post-label">4 · H2H Receipts</div>
        <div class="sq">
          <div class="sq-bg sq-bg-1"></div>
          <div class="sq-grain"></div>
          <div class="sq-topline"></div>
          <div class="sq-inner" style="justify-content:center;align-items:center;text-align:center">
            <div class="sq-eyebrow">📋 All-Time Records</div>
            <div class="sq-headline" style="font-size:58px">Your group<br/>chat has<br/><span class="gold">receipts.</span><br/>It just doesn't<br/>know it yet.</div>
            <div class="sq-sub" style="margin-top:16px">Head-to-head records going back to year one. Championships. Droughts. All of it.</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- POST 5: Draft Grades -->
      <div class="post-wrap">
        <div class="post-label">5 · Draft Grades</div>
        <div class="sq">
          <div class="sq-bg sq-bg-draft"></div>
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#8b5cf6,transparent)"></div>
          <div class="sq-inner">
            <div class="sq-eyebrow" style="color:#a78bfa">📋 Draft Analysis</div>
            <div class="sq-headline" style="font-size:62px">Everyone<br/>thinks they<br/>drafted well.<br/><span style="color:#a78bfa">Grades<br/>disagree.</span></div>
            <div class="sq-draft-preview">
              <div class="sq-dp-row gold-row"><span class="sq-dp-pick">1.03</span><span class="sq-dp-name">Justin Jefferson</span><span class="sq-dp-pos wr">WR</span><span class="sq-dp-grade gold">A+</span></div>
              <div class="sq-dp-row"><span class="sq-dp-pick">2.14</span><span class="sq-dp-name">Davante Adams</span><span class="sq-dp-pos wr">WR</span><span class="sq-dp-grade grn">A</span></div>
              <div class="sq-dp-row bust-row"><span class="sq-dp-pick">5.51</span><span class="sq-dp-name">Stefon Diggs</span><span class="sq-dp-pos wr">WR</span><span class="sq-dp-grade red">D</span></div>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- POST 6: Commissioner -->
      <div class="post-wrap">
        <div class="post-label">6 · Commissioner</div>
        <div class="sq">
          <div class="sq-bg sq-bg-2"></div>
          <div class="sq-grain"></div>
          <div class="sq-topline"></div>
          <div class="sq-inner" style="justify-content:center;align-items:center;text-align:center">
            <div class="sq-eyebrow">🏆 For Commissioners</div>
            <div class="sq-headline" style="font-size:58px">Your league<br/>goes quiet<br/>after week 8.<br/><span class="gold">Not anymore.</span></div>
            <div class="sq-feature-list">
              <div class="sq-feat">⚡ Weekly power rankings</div>
              <div class="sq-feat">⚔️ Live win probability</div>
              <div class="sq-feat">📋 Draft grades all season</div>
              <div class="sq-feat">🏆 All-time league history</div>
            </div>
            <div class="sq-cta-pill">Free to try →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- POST 7: Multi-sport -->
      <div class="post-wrap">
        <div class="post-label">7 · Multi-Sport</div>
        <div class="sq">
          <div class="sq-bg sq-bg-3"></div>
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#22c55e,transparent)"></div>
          <div class="sq-inner" style="justify-content:center;align-items:center;text-align:center">
            <img src="/UFD_V8.png" alt="UFD" class="sq-logo" style="margin-bottom:16px" />
            <div class="sq-eyebrow" style="color:#22c55e">One Dashboard. Every Sport.</div>
            <div class="sq-sports-grid">
              <div class="sq-sport-chip">🏈 Football</div>
              <div class="sq-sport-chip">🏀 Basketball</div>
              <div class="sq-sport-chip">⚾ Baseball</div>
              <div class="sq-sport-chip">🏒 Hockey</div>
            </div>
            <div class="sq-headline" style="font-size:52px;margin-top:16px">Your whole<br/>fantasy life.<br/><span class="gold">One place.</span></div>
            <div class="sq-platforms-row" style="margin-top:16px">
              <span class="sq-plat sleeper">Sleeper</span>
              <span class="sq-plat espn">ESPN</span>
              <span class="sq-plat yahoo">Yahoo</span>
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- POST 8: Legacy / History -->
      <div class="post-wrap">
        <div class="post-label">8 · League History</div>
        <div class="sq">
          <div class="sq-bg sq-bg-1"></div>
          <div class="sq-grain"></div>
          <div class="sq-topline"></div>
          <div class="sq-inner" style="justify-content:center;align-items:center;text-align:center">
            <div class="sq-eyebrow">🏆 Legacy Standings</div>
            <div class="sq-headline" style="font-size:56px">6 years.<br/>1 champion.<br/><span class="gold">0 excuses.</span></div>
            <div class="sq-legacy-preview">
              <div class="sq-leg-row"><span class="sq-leg-num gold">1</span><div class="sq-leg-dot" style="background:#eab308"></div><span class="sq-leg-name">Mahomes Magic</span><span class="sq-leg-score gold">1,847</span></div>
              <div class="sq-leg-row"><span class="sq-leg-num">2</span><div class="sq-leg-dot" style="background:#10b981"></div><span class="sq-leg-name">Trash Can Wins</span><span class="sq-leg-score">1,623</span></div>
              <div class="sq-leg-row"><span class="sq-leg-num">3</span><div class="sq-leg-dot" style="background:#6366f1"></div><span class="sq-leg-name">The Algorithm</span><span class="sq-leg-score">1,401</span></div>
            </div>
            <div class="sq-sub" style="margin-top:16px">Pull up your league's all-time history. One click.</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- POST 9: Trash talk -->
      <div class="post-wrap">
        <div class="post-label">9 · Trash Talk</div>
        <div class="sq">
          <div class="sq-bg sq-bg-fire"></div>
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#ef4444,transparent)"></div>
          <div class="sq-inner" style="justify-content:center;align-items:center;text-align:center">
            <div class="sq-headline" style="font-size:68px;line-height:0.95">Stop<br/>arguing.<br/><span style="color:#ef4444">Post the<br/>receipts.</span></div>
            <div class="sq-sub" style="margin-top:24px;font-size:18px">All-time H2H records. Championship history. Draft grades that don't lie.</div>
            <div class="sq-cta-pill" style="background:rgba(239,68,68,0.15);border-color:rgba(239,68,68,0.4);color:#ef4444;margin-top:24px">Get the data →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- POST 10: Free CTA -->
      <div class="post-wrap">
        <div class="post-label">10 · Free CTA</div>
        <div class="sq">
          <div class="sq-bg sq-bg-2"></div>
          <div class="sq-grain"></div>
          <div class="sq-topline"></div>
          <div class="sq-inner" style="justify-content:center;align-items:center;text-align:center">
            <img src="/UFD_V8.png" alt="UFD" class="sq-logo" />
            <div class="sq-headline" style="font-size:58px">Your league<br/>deserves<br/><span class="gold">better<br/>content.</span></div>
            <div class="sq-sub" style="margin-top:16px">Connect your Sleeper, ESPN, or Yahoo league in 2 minutes. No credit card. Free to start.</div>
            <div class="sq-cta-pill" style="font-size:18px;padding:14px 32px;margin-top:20px">Connect Your League Free →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

    </div><!-- /posts-grid -->
  </div>
</template>

<script setup lang="ts">
// No download logic needed — screenshot directly from browser
</script>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.studio-root {
  min-height: 100vh;
  background: #030407;
  color: #f7f7ff;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  padding-bottom: 80px;
}

/* ── Page header ── */
.studio-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 28px 40px;
  border-bottom: 1px solid #1e2130;
  background: linear-gradient(180deg, #0a0c14, #05060a);
}
.studio-logo { height: 44px; object-fit: contain; }
.studio-header h1 { font-size: 24px; font-weight: 900; margin-bottom: 4px; letter-spacing: -0.02em; }
.studio-header p  { font-size: 13px; color: #6b7280; }

.section-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #4b5563;
  padding: 32px 40px 14px;
}

/* ══════════════════════════════════
   FACEBOOK BANNER
══════════════════════════════════ */
.banner-stage {
  padding: 0 40px 40px;
  display: flex;
  justify-content: center;
}

.fb-banner {
  width: 851px;
  height: 315px;
  background: #05060a;
  position: relative;
  overflow: hidden;
  border-radius: 6px;
  display: flex;
  align-items: center;
  box-shadow: 0 0 0 1px #1e2130, 0 32px 80px rgba(0,0,0,0.8);
}

.fb-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(234,179,8,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(234,179,8,0.035) 1px, transparent 1px);
  background-size: 40px 40px;
}
.fb-glow-1 {
  position: absolute;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(234,179,8,0.14) 0%, transparent 65%);
  top: -120px; left: 120px;
  pointer-events: none;
}
.fb-glow-2 {
  position: absolute;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 65%);
  bottom: -200px; right: 100px;
  pointer-events: none;
}
.fb-grain {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  opacity: 0.25;
  pointer-events: none;
}
.fb-topline {
  position: absolute; top: 0; left: 0; right: 0; height: 3px;
  background: linear-gradient(90deg, transparent 0%, #eab308 25%, #fbbf24 50%, #eab308 75%, transparent 100%);
}

.fb-left {
  position: relative; z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 24px 0 24px 32px;
  width: 350px;
  flex-shrink: 0;
}
.fb-logo { height: auto; width: 200px; object-fit: contain; margin-bottom: 2px; }
.fb-headline {
  font-size: 34px;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: #fff;
}
.fb-gold { color: #eab308; }
.fb-sub { font-size: 11px; color: #6b7280; line-height: 1.4; }
.fb-platforms { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
.fb-plat {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 3px 8px;
  border-radius: 4px;
}
.fb-plat.sleeper { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
.fb-plat.espn    { background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3); color: #60a5fa; }
.fb-plat.yahoo   { background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.3); color: #a78bfa; }

/* Fanned cards */
.fb-cards-area {
  position: absolute;
  right: -10px; top: 0; bottom: 0;
  width: 530px;
}
.fb-cards-area::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 100px;
  background: linear-gradient(90deg, #05060a, transparent);
  z-index: 15;
}
.fb-cards-area::after {
  content: '';
  position: absolute; right: 0; top: 0; bottom: 0; width: 60px;
  background: linear-gradient(270deg, #05060a, transparent);
  z-index: 15;
}

.fb-card {
  position: absolute;
  width: 210px;
  background: linear-gradient(145deg, #111420, #090c16);
  border: 1px solid #1e2130;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.9);
  font-size: 9px;
}
.fb-card-1 { left: 20px;  top: 50%; transform: rotate(-7deg) translateY(-52%); opacity: 0.82; }
.fb-card-2 {
  left: 148px; top: 50%; transform: rotate(-1deg) translateY(-50%);
  border-color: rgba(234,179,8,0.25);
  box-shadow: 0 20px 60px rgba(0,0,0,0.9), 0 0 40px rgba(234,179,8,0.07);
  z-index: 2;
}
.fb-card-3 { left: 293px; top: 50%; transform: rotate(4.5deg) translateY(-46%); opacity: 0.84; }

.fbc-head { display: flex; align-items: center; gap: 5px; padding: 8px 10px; border-bottom: 1px solid #1a1d28; background: rgba(0,0,0,0.2); }
.fbc-badge { font-size: 7px; font-weight: 900; background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.3); padding: 1px 5px; border-radius: 3px; }
.fbc-title { font-size: 8px; font-weight: 700; color: #d1d5db; flex: 1; }
.fbc-wk    { font-size: 7px; color: #374151; background: #1a1d28; padding: 1px 5px; border-radius: 3px; }

.fbc-row { display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-bottom: 1px solid rgba(26,29,40,0.6); }
.fbc-gold { background: rgba(234,179,8,0.05); }
.fbc-rk   { font-size: 8px; font-weight: 700; color: #4b5563; width: 8px; text-align: center; }
.fbc-rk.gold { color: #eab308; }
.fbc-dot  { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.fbc-name { font-size: 8px; color: #d1d5db; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fbc-name.gold { color: #eab308; font-weight: 700; }
.fbc-pts  { font-size: 8px; font-weight: 700; color: #9ca3af; }
.fbc-pts.gold { color: #eab308; }
.fbc-chg  { font-size: 7px; font-weight: 700; }
.fbc-chg.up { color: #22c55e; }
.fbc-chg.dn { color: #ef4444; }

.fbc-matchup { display: flex; align-items: center; padding: 10px 8px 6px; }
.fbc-team    { display: flex; flex-direction: column; align-items: center; gap: 3px; flex: 1; }
.fbc-avatar  { width: 24px; height: 24px; border-radius: 50%; }
.fbc-tname   { font-size: 7px; color: #9ca3af; text-align: center; line-height: 1.2; }
.fbc-score   { font-size: 13px; font-weight: 900; color: #e5e7eb; }
.fbc-score.gold { color: #eab308; }
.fbc-vs      { font-size: 8px; font-weight: 900; color: #374151; width: 16px; text-align: center; }

.fbc-prob-wrap { padding: 0 10px 6px; }
.fbc-prob-labels { display: flex; justify-content: space-between; font-size: 8px; font-weight: 700; color: #6b7280; margin-bottom: 4px; }
.fbc-prob-bar { height: 4px; background: #1e2130; border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
.fbc-prob-fill { height: 100%; background: linear-gradient(90deg, #eab308, #ca8a04); border-radius: 2px; }
.fbc-prob-sub { font-size: 7px; color: #374151; text-align: center; }

.fbc-leg-row { display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-bottom: 1px solid rgba(26,29,40,0.6); }
.fbc-leg-pos  { font-size: 8px; font-weight: 700; color: #4b5563; width: 8px; text-align: center; }
.fbc-leg-pos.gold { color: #eab308; }
.fbc-leg-name { font-size: 8px; color: #d1d5db; flex: 1; }
.fbc-leg-name.gold { color: #eab308; font-weight: 700; }
.fbc-leg-score { font-size: 8px; font-weight: 700; color: #9ca3af; }
.fbc-leg-score.gold { color: #eab308; }

.fbc-wm { font-size: 6px; color: #1e2130; text-align: center; padding: 4px 0 5px; }

/* ══════════════════════════════════
   SQUARE POSTS GRID
══════════════════════════════════ */
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 32px;
  padding: 0 40px;
}

.post-wrap {}
.post-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4b5563;
  margin-bottom: 12px;
}

/* The actual square — 1080×1080 scaled down to fit */
.sq {
  width: 540px;
  height: 540px;
  position: relative;
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 0 0 1px #1e2130, 0 20px 60px rgba(0,0,0,0.7);
}

/* Backgrounds */
.sq-bg { position: absolute; inset: 0; }
.sq-bg-1 { background: radial-gradient(ellipse 120% 100% at 50% 0%, rgba(234,179,8,0.10) 0%, transparent 60%), linear-gradient(145deg, #05060a 0%, #090c14 100%); }
.sq-bg-2 { background: radial-gradient(ellipse 100% 80% at 30% 20%, rgba(234,179,8,0.08) 0%, transparent 55%), linear-gradient(145deg, #07060a 0%, #0c0a14 100%); }
.sq-bg-3 { background: radial-gradient(ellipse 120% 100% at 70% 80%, rgba(6,182,212,0.08) 0%, transparent 60%), linear-gradient(145deg, #040810 0%, #080c18 100%); }
.sq-bg-draft { background: radial-gradient(ellipse 100% 80% at 50% 30%, rgba(139,92,246,0.09) 0%, transparent 60%), linear-gradient(145deg, #07050f 0%, #0a0814 100%); }
.sq-bg-fire  { background: radial-gradient(ellipse 100% 80% at 50% 60%, rgba(239,68,68,0.09) 0%, transparent 60%), linear-gradient(145deg, #090404 0%, #0f0506 100%); }

.sq-grain {
  position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  opacity: 0.3;
}
.sq-topline {
  position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 5;
  background: linear-gradient(90deg, transparent 0%, #eab308 25%, #fbbf24 50%, #eab308 75%, transparent 100%);
}

.sq-inner {
  position: relative; z-index: 2;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 40px 44px 60px;
}

.sq-logo { height: auto; width: 180px; object-fit: contain; margin-bottom: 8px; }

.sq-eyebrow {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #eab308;
  margin-bottom: 12px;
}

.sq-headline {
  font-weight: 900;
  line-height: 1.0;
  letter-spacing: -0.02em;
  color: #fff;
  margin-bottom: 4px;
}

.sq-sub {
  font-size: 16px;
  color: #6b7280;
  line-height: 1.5;
  margin-top: 8px;
}

.gold { color: #eab308; }

.sq-cta-pill {
  display: inline-block;
  margin-top: 20px;
  padding: 12px 24px;
  background: rgba(234,179,8,0.12);
  border: 1px solid rgba(234,179,8,0.35);
  border-radius: 30px;
  color: #eab308;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.sq-platforms-row { display: flex; gap: 10px; align-items: center; margin-top: 12px; }
.sq-plat {
  font-size: 12px; font-weight: 800;
  letter-spacing: 0.08em;
  padding: 4px 12px; border-radius: 5px;
}
.sq-plat.sleeper { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
.sq-plat.espn    { background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3); color: #60a5fa; }
.sq-plat.yahoo   { background: rgba(139,92,246,0.12); border: 1px solid rgba(139,92,246,0.3); color: #a78bfa; }

.sq-url {
  position: absolute;
  bottom: 20px; left: 0; right: 0;
  text-align: center;
  font-size: 12px;
  color: #1e2130;
  letter-spacing: 0.06em;
  z-index: 3;
}

/* Win Probability card inside post 3 */
.sq-winprob-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(6,182,212,0.2);
  border-radius: 12px;
  padding: 14px 16px 10px;
  margin-top: 16px;
  width: 100%;
}
.sq-wp-teams { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sq-wp-team  { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; font-size: 12px; color: #9ca3af; }
.sq-wp-team.right { align-items: flex-end; }
.sq-wp-dot   { width: 10px; height: 10px; border-radius: 50%; margin-bottom: 2px; }
.sq-wp-score { font-size: 20px; font-weight: 900; color: #e5e7eb; }
.sq-wp-score.gold { color: #eab308; }
.sq-wp-vs    { font-size: 13px; font-weight: 900; color: #374151; }
.sq-wp-bar-track { height: 5px; background: #1e2130; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.sq-wp-bar-fill  { height: 100%; background: linear-gradient(90deg, #eab308, #ca8a04); border-radius: 3px; }
.sq-wp-sub { font-size: 10px; color: #374151; text-align: center; }

/* Draft preview inside post 5 */
.sq-draft-preview {
  margin-top: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(139,92,246,0.15);
  border-radius: 10px;
  overflow: hidden;
}
.sq-dp-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-bottom: 1px solid rgba(26,29,40,0.8); }
.sq-dp-row:last-child { border-bottom: none; }
.gold-row { background: rgba(234,179,8,0.05); }
.bust-row { background: rgba(239,68,68,0.04); }
.sq-dp-pick { font-size: 11px; font-weight: 700; color: #4b5563; width: 36px; }
.sq-dp-name { font-size: 13px; font-weight: 600; color: #e5e7eb; flex: 1; }
.sq-dp-pos  { font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 3px; }
.sq-dp-pos.wr { background: rgba(59,130,246,0.15); color: #60a5fa; }
.sq-dp-grade { font-size: 13px; font-weight: 900; width: 28px; text-align: right; }
.sq-dp-grade.gold { color: #eab308; }
.sq-dp-grade.grn  { color: #22c55e; }
.sq-dp-grade.red  { color: #ef4444; }

/* Feature list inside post 6 */
.sq-feature-list {
  display: flex; flex-direction: column; gap: 10px;
  margin-top: 16px; margin-bottom: 16px;
}
.sq-feat {
  font-size: 15px; font-weight: 600; color: #d1d5db;
  padding: 8px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid #1e2130;
  border-radius: 8px;
}

/* Sports grid inside post 7 */
.sq-sports-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}
.sq-sport-chip {
  padding: 10px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid #1e2130;
  border-radius: 8px;
  font-size: 14px; font-weight: 600; color: #d1d5db;
  text-align: center;
}

/* Legacy preview inside post 8 */
.sq-legacy-preview {
  margin-top: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(234,179,8,0.1);
  border-radius: 10px;
  overflow: hidden;
}
.sq-leg-row { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-bottom: 1px solid rgba(26,29,40,0.8); }
.sq-leg-row:last-child { border-bottom: none; }
.sq-leg-num  { font-size: 12px; font-weight: 700; color: #4b5563; width: 14px; }
.sq-leg-num.gold { color: #eab308; }
.sq-leg-dot  { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.sq-leg-name { font-size: 13px; color: #d1d5db; flex: 1; }
.sq-leg-score{ font-size: 13px; font-weight: 700; color: #9ca3af; }
.sq-leg-score.gold { color: #eab308; }
</style>
// Fri Mar 20 23:06:13 EDT 2026
