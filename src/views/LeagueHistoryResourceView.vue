<template>
<div class="resource-page">
  <nav class="res-nav">
    <a href="/"><img src="/UFD_V8.png" alt="Ultimate Fantasy Dashboard" class="res-nav-logo" /></a>
    <div class="res-nav-links">
      <a href="/resources">Resources</a>
      <a href="/resources/power-rankings">Power Rankings</a>
      <a href="/resources/league-history">League History</a>
      <a href="/resources/draft-analysis">Draft Analysis</a>
      <a href="/resources/matchup-analysis">Matchup Analysis</a>
    </div>
    <a href="/" class="res-nav-cta" @click.prevent="goSignup">Get Started Free →</a>
  </nav>

  <div class="res-hero">
    <div class="res-eyebrow">Commissioner Resource · League Engagement</div>
    <h1 class="res-title">League History: The <span class="accent">Untapped Goldmine</span> of Fantasy Trash Talk</h1>
    <p class="res-byline">Published by Fantasy League Resources &nbsp;·&nbsp; <span>Applies to all platforms & sports</span></p>
    <p class="res-intro">Most fantasy leagues are sitting on years of data they've never actually looked at. Head-to-head records going back to the founding year. Championship droughts that would make someone genuinely embarrassed. All-time scoring leaders no one knew existed. Here's why surfacing that history transforms leagues.</p>
  </div>

  <div class="res-body">

    <div class="res-section">
      <h2 class="res-h2">Why history is better trash talk material than anything happening this season</h2>
      <p class="res-p">Current season drama fades. A league member's 0-4 start gets forgotten when they run off six straight wins. But history doesn't fade — and history, when pulled up at the right moment, hits harder than anything happening right now.</p>
      <p class="res-p">The manager who just passed someone for most all-time wins in a ten-year league? That's a moment. The three-time champion who hasn't sniffed a playoff in four years? That's a legacy in freefall. The team with a 2-16 all-time record against one specific rival? That's a rivalry story that predates this season's standings by years.</p>
      <p class="res-p">The problem is that most leagues never look at this data because pulling it together manually is almost impossible. The history exists — somewhere in old platform records — but no one has ever assembled it into something usable.</p>
    </div>

    <div class="res-card-showcase">
      <div class="res-card-showcase-label">Example · All-Time Head-to-Head Matrix</div>
      <div class="mock-card">
        <div class="mock-header">
          <div class="mock-header-left"><span class="mock-icon">⚔️</span><span class="mock-title">Head-to-Head Records</span></div>
          <span class="mock-badge">ALL TIME</span>
        </div>
        <div class="mock-h2h">
          <div class="mock-h2h-row">
            <div class="mock-h2h-label"></div>
            <div class="mock-h2h-cell self" style="font-size:8px;width:60px;color:#374151">vs →</div>
          </div>
          <div class="mock-h2h-row">
            <div class="mock-h2h-label">Mahomes Magic</div>
            <div class="mock-h2h-cell self">—</div>
            <div class="mock-h2h-cell win">8-4</div>
            <div class="mock-h2h-cell win">11-3</div>
            <div class="mock-h2h-cell loss">5-9</div>
          </div>
          <div class="mock-h2h-row">
            <div class="mock-h2h-label">Trash Can Wins</div>
            <div class="mock-h2h-cell loss">4-8</div>
            <div class="mock-h2h-cell self">—</div>
            <div class="mock-h2h-cell win">7-5</div>
            <div class="mock-h2h-cell win">9-3</div>
          </div>
          <div class="mock-h2h-row">
            <div class="mock-h2h-label">The Algorithm</div>
            <div class="mock-h2h-cell loss">3-11</div>
            <div class="mock-h2h-cell loss">5-7</div>
            <div class="mock-h2h-cell self">—</div>
            <div class="mock-h2h-cell win">8-4</div>
          </div>
          <div class="mock-h2h-row">
            <div class="mock-h2h-label">Waiver Wire Kid</div>
            <div class="mock-h2h-cell win">9-5</div>
            <div class="mock-h2h-cell loss">3-9</div>
            <div class="mock-h2h-cell loss">4-8</div>
            <div class="mock-h2h-cell self">—</div>
          </div>
        </div>
        <div class="mock-watermark">ultimatefantasydashboard.com</div>
      </div>
    </div>

    <div class="res-section">
      <h2 class="res-h2">The five history features that drive the most engagement</h2>

      <h3 class="res-h3">1. All-time head-to-head records</h3>
      <p class="res-p">The most immediately dangerous data in any fantasy league. Drop an all-time H2H matrix into the group chat and someone will be triggered within minutes. The manager who's 3-18 against one specific rival has been suppressing that information for years — surface it and watch the group chat explode.</p>

      <h3 class="res-h3">2. Championship history and drought tracker</h3>
      <p class="res-p">Championships are the ultimate currency in a long-running league. But the <em>absence</em> of championships is equally powerful. A manager who's been in the league for eight years with zero titles, despite making the playoffs four times, is carrying a burden that should absolutely be brought up at every opportunity.</p>

      <h3 class="res-h3">3. Legacy score — who actually runs this league</h3>
      <p class="res-p">Legacy score is a cumulative ranking that weights championships, playoff appearances, regular season finish, and points scored across all seasons. It's the most complete answer to "who has actually been the best team in the history of this league" — and the most likely to start an argument.</p>

      <h3 class="res-h3">4. Weekly, yearly, and all-time awards</h3>
      <p class="res-p">Awards like "Highest Single-Week Score," "Most Unlucky Season" (high points, bad record), "Best Draft" and "Worst Blowout Loss" create historical moments that live in the league's memory. The manager who holds the all-time highest single-week record knows that. Make sure everyone else does too.</p>

      <h3 class="res-h3">5. Win rate records by season</h3>
      <p class="res-p">Tracking win rates across seasons shows who's consistently good versus who had one great year and has been riding it since. The classic "one-hit wonder" narrative — one championship year surrounded by mediocrity — is pure group chat gold.</p>
    </div>

    <div class="res-card-showcase">
      <div class="res-card-showcase-label">Example · All-Time League Stats</div>
      <div class="mock-card">
        <div class="mock-header">
          <div class="mock-header-left"><span class="mock-icon">🏆</span><span class="mock-title">League History</span></div>
          <span class="mock-badge">6 SEASONS</span>
        </div>
        <div class="mock-stats">
          <div class="mock-stat"><div class="mock-stat-val">3</div><div class="mock-stat-lbl">Championships</div></div>
          <div class="mock-stat"><div class="mock-stat-val">61%</div><div class="mock-stat-lbl">Win Rate</div></div>
          <div class="mock-stat"><div class="mock-stat-val">138.2</div><div class="mock-stat-lbl">Avg Pts/Wk</div></div>
        </div>
        <div class="mock-watermark">ultimatefantasydashboard.com</div>
      </div>
    </div>

    <hr class="res-divider" />

    <div class="res-callout">
      <div class="res-callout-label">Only one tool does this across all platforms</div>
      <div class="res-callout-title">Ultimate Fantasy Dashboard pulls complete league history from Sleeper, ESPN, and Yahoo</div>
      <p class="res-callout-body">No other fantasy analytics tool assembles multi-season history across Sleeper, ESPN, and Yahoo into a unified dashboard. Head-to-head records, legacy scores, all-time awards, championship history — all pulled automatically and ready to share as branded cards to your group chat. Works for football, basketball, baseball, and hockey.</p>
      <div class="res-callout-tags">
        <span class="res-tag sleeper">Sleeper</span><span class="res-tag espn">ESPN</span><span class="res-tag yahoo">Yahoo</span>
        <span class="res-tag football">Football</span><span class="res-tag basketball">Basketball</span><span class="res-tag baseball">Baseball</span><span class="res-tag hockey">Hockey</span>
      </div>
      <a href="/" class="callout-cta" @click.prevent="goSignup">Unlock My League's History →</a>
    </div>

    <p class="res-p" style="text-align:center;margin-top:32px"><a href="/resources/league-history/how-to">→ See how to access and share your league history step by step</a></p>

      <div class="res-related">
    <div class="res-related-title">Explore more resources</div>
    <div class="res-related-grid">
      <a href="/resources/power-rankings" class="res-related-link">
        <div class="res-related-link-icon">📊</div>
        <div class="res-related-link-title">Power Rankings</div>
        <div class="res-related-link-sub">Boost weekly engagement</div>
      </a>
      <a href="/resources/draft-analysis" class="res-related-link">
        <div class="res-related-link-icon">📋</div>
        <div class="res-related-link-title">Draft Analysis</div>
        <div class="res-related-link-sub">Grade every pick</div>
      </a>
      <a href="/resources/matchup-analysis" class="res-related-link">
        <div class="res-related-link-icon">⚔️</div>
        <div class="res-related-link-title">Matchup Analysis</div>
        <div class="res-related-link-sub">Win probability & Monte Carlo</div>
      </a>
      <a href="/resources" class="res-related-link">
        <div class="res-related-link-icon">📚</div>
        <div class="res-related-link-title">All Resources</div>
        <div class="res-related-link-sub">Commissioner guides & how-tos</div>
      </a>
    </div>
  </div>
  </div>

  <div class="res-footer-cta">
    <div class="res-footer-cta-eyebrow">Try it free</div>
    <h2 class="res-footer-cta-title">Six years of your league's history is waiting to be weaponized.</h2>
    <p class="res-footer-cta-sub">Connect your Sleeper, ESPN, or Yahoo league and pull up every head-to-head record, championship, and legacy score your league has ever accumulated.</p>
    <a href="/" class="callout-cta" @click.prevent="goSignup">Connect Your League Free →</a>
    <p class="res-footer-cta-trust">No credit card · Sleeper, Yahoo & ESPN · Football, Basketball, Baseball & Hockey</p>
  </div>

</div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
function goSignup() { router.push('/') }
</script>

<style scoped>
*,*::before,*::after{box-sizing:border-box}
.resource-page{min-height:100vh;background:#05060a;color:#f7f7ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}

/* NAV */
.res-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;border-bottom:1px solid #1e2130;background:rgba(5,6,10,0.95);position:sticky;top:0;z-index:50;backdrop-filter:blur(10px)}
.res-nav-logo{height:36px;object-fit:contain}
.res-nav-links{display:flex;align-items:center;gap:24px}
.res-nav-links a{font-size:13px;color:#6b7280;text-decoration:none;transition:color .2s}
.res-nav-links a:hover{color:#f7f7ff}
.res-nav-cta{padding:8px 20px;background:#eab308;color:#0a0c14;font-size:13px;font-weight:800;border:none;border-radius:8px;cursor:pointer;text-decoration:none;transition:background .2s}
.res-nav-cta:hover{background:#fbbf24}

/* HERO */
.res-hero{padding:72px 40px 56px;max-width:800px;margin:0 auto;text-align:center}
.res-eyebrow{font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#eab308;margin-bottom:16px}
.res-title{font-size:clamp(28px,5vw,52px);font-weight:900;line-height:1.1;letter-spacing:-0.02em;color:#fff;margin:0 0 20px}
.res-title .accent{color:#eab308}
.res-byline{font-size:13px;color:#4b5563;margin-bottom:24px}
.res-byline span{color:#6b7280}
.res-intro{font-size:17px;color:#9ca3af;line-height:1.7;max-width:680px;margin:0 auto}

/* BODY */
.res-body{max-width:800px;margin:0 auto;padding:0 40px 80px}
.res-section{margin-bottom:56px}
.res-h2{font-size:26px;font-weight:800;color:#f3f4f6;margin:0 0 16px;letter-spacing:-0.01em}
.res-h3{font-size:18px;font-weight:700;color:#d1d5db;margin:28px 0 10px}
.res-p{font-size:16px;color:#9ca3af;line-height:1.8;margin:0 0 16px}
.res-p strong{color:#e5e7eb;font-weight:700}
.res-p a{color:#eab308;text-decoration:none}
.res-p a:hover{text-decoration:underline}

/* DIVIDER */
.res-divider{border:none;border-top:1px solid #1e2130;margin:40px 0}

/* CALLOUT BOX */
.res-callout{background:linear-gradient(135deg,rgba(234,179,8,0.08),rgba(234,179,8,0.04));border:1px solid rgba(234,179,8,0.2);border-radius:16px;padding:28px 32px;margin:32px 0}
.res-callout-label{font-size:10px;font-weight:800;letter-spacing:0.2em;color:#eab308;text-transform:uppercase;margin-bottom:10px}
.res-callout-title{font-size:20px;font-weight:800;color:#fff;margin:0 0 10px}
.res-callout-body{font-size:15px;color:#9ca3af;line-height:1.6;margin:0 0 20px}
.res-callout-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.res-tag{font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:0.05em}
.res-tag.football{background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:#4ade80}
.res-tag.basketball{background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);color:#fb923c}
.res-tag.baseball{background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#60a5fa}
.res-tag.hockey{background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);color:#a78bfa}
.res-tag.sleeper{background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);color:#eab308}
.res-tag.espn{background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#60a5fa}
.res-tag.yahoo{background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);color:#a78bfa}
.callout-cta{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#eab308;color:#0a0c14;font-size:14px;font-weight:800;border:none;border-radius:10px;cursor:pointer;text-decoration:none;transition:all .2s}
.callout-cta:hover{background:#fbbf24;transform:translateY(-1px)}

/* CARD MOCKUP */
.res-card-showcase{background:#0a0c14;border:1px solid #1e2130;border-radius:16px;padding:32px;margin:32px 0}
.res-card-showcase-label{font-size:11px;font-weight:700;letter-spacing:0.15em;color:#4b5563;text-transform:uppercase;margin-bottom:20px}
.mock-card{background:linear-gradient(135deg,#12151e,#0a0c14);border:1px solid #1e2130;border-radius:12px;overflow:hidden;max-width:420px;margin:0 auto}
.mock-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #1a1d28;background:rgba(0,0,0,0.2)}
.mock-header-left{display:flex;align-items:center;gap:8px}
.mock-icon{font-size:14px}
.mock-title{font-size:13px;font-weight:700;color:#e5e7eb}
.mock-badge{font-size:10px;color:#6b7280;background:#1a1d28;padding:2px 8px;border-radius:4px}
.mock-row{display:grid;align-items:center;padding:9px 16px;border-bottom:1px solid rgba(26,29,40,0.6);gap:8px}
.mock-row.pr-row{grid-template-columns:28px 20px 1fr auto 40px}
.mock-row.gold{background:rgba(234,179,8,0.05)}
.mock-rank{font-size:11px;font-weight:700;color:#4b5563;text-align:center}
.mock-dot{width:16px;height:16px;border-radius:50%;flex-shrink:0}
.mock-name{font-size:12px;color:#d1d5db}
.mock-score{font-size:12px;font-weight:700;color:#eab308;text-align:right}
.mock-delta-up{font-size:10px;color:#22c55e;text-align:right}
.mock-delta-dn{font-size:10px;color:#ef4444;text-align:right}
.mock-watermark{font-size:9px;color:#1e2130;text-align:center;padding:8px}

/* STAT CARDS ROW */
.mock-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#1e2130;margin:0}
.mock-stat{background:#0d0f1a;padding:14px 12px;text-align:center}
.mock-stat-val{font-size:22px;font-weight:900;color:#eab308;margin-bottom:4px}
.mock-stat-lbl{font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:0.08em}

/* H2H GRID */
.mock-h2h{padding:12px 16px}
.mock-h2h-row{display:flex;gap:4px;margin-bottom:4px;align-items:center}
.mock-h2h-label{font-size:9px;color:#6b7280;width:70px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mock-h2h-cell{width:32px;height:24px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700}
.mock-h2h-cell.win{background:rgba(34,197,94,0.15);color:#4ade80}
.mock-h2h-cell.loss{background:rgba(239,68,68,0.12);color:#f87171}
.mock-h2h-cell.self{background:rgba(255,255,255,0.03);color:#374151}

/* WIN PROB BAR */
.mock-matchup{padding:16px}
.mock-teams{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.mock-team{display:flex;flex-direction:column;align-items:center;gap:4px}
.mock-team-dot{width:28px;height:28px;border-radius:50%}
.mock-team-name{font-size:10px;color:#9ca3af;text-align:center}
.mock-team-score{font-size:18px;font-weight:900;color:#e5e7eb}
.mock-team-score.gold{color:#eab308}
.mock-vs{font-size:11px;font-weight:700;color:#374151}
.mock-prob-row{margin-top:8px}
.mock-prob-label{display:flex;justify-content:space-between;font-size:10px;color:#6b7280;margin-bottom:4px}
.mock-prob-bar{height:6px;border-radius:3px;background:#1e2130;overflow:hidden}
.mock-prob-fill{height:100%;background:linear-gradient(90deg,#eab308,#ca8a04)}

/* STEP LIST */
.res-steps{display:flex;flex-direction:column;gap:20px;margin:24px 0}
.res-step{display:flex;gap:16px;align-items:flex-start}
.res-step-num{width:32px;height:32px;border-radius:50%;background:rgba(234,179,8,0.15);border:1px solid rgba(234,179,8,0.3);color:#eab308;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.res-step-body{}
.res-step-title{font-size:15px;font-weight:700;color:#e5e7eb;margin-bottom:4px}
.res-step-desc{font-size:14px;color:#6b7280;line-height:1.6}

/* RELATED LINKS */
.res-related{background:#0a0c14;border:1px solid #1e2130;border-radius:16px;padding:28px;margin-top:56px}
.res-related-title{font-size:14px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:16px}
.res-related-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.res-related-link{display:block;padding:14px 16px;background:#0f1220;border:1px solid #1e2130;border-radius:10px;text-decoration:none;transition:all .2s}
.res-related-link:hover{border-color:rgba(234,179,8,0.3);background:rgba(234,179,8,0.04)}
.res-related-link-icon{font-size:18px;margin-bottom:6px}
.res-related-link-title{font-size:13px;font-weight:700;color:#d1d5db;margin-bottom:2px}
.res-related-link-sub{font-size:11px;color:#4b5563}

/* FOOTER CTA */
.res-footer-cta{background:linear-gradient(135deg,#0f1220,#0a0d18);border-top:1px solid #1e2130;padding:64px 40px;text-align:center}
.res-footer-cta-eyebrow{font-size:11px;font-weight:700;letter-spacing:0.2em;color:#eab308;text-transform:uppercase;margin-bottom:16px}
.res-footer-cta-title{font-size:clamp(24px,4vw,40px);font-weight:900;color:#fff;margin:0 0 16px;letter-spacing:-0.02em}
.res-footer-cta-sub{font-size:16px;color:#6b7280;margin:0 0 32px;max-width:480px;margin-left:auto;margin-right:auto}
.res-footer-cta-trust{font-size:12px;color:#374151;margin-top:16px}

@media(max-width:640px){
  .res-nav{padding:12px 20px}
  .res-nav-links{display:none}
  .res-hero,.res-body{padding-left:20px;padding-right:20px}
  .res-footer-cta{padding:48px 20px}
  .mock-stats{grid-template-columns:repeat(3,1fr)}
}
</style>
