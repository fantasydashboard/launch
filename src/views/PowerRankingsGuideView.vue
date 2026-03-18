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
    <div class="res-eyebrow">How-To Guide · Power Rankings</div>
    <h1 class="res-title">How to Get <span class="accent">Automated Power Rankings</span> for Your Fantasy League</h1>
    <p class="res-byline">Step-by-step guide &nbsp;·&nbsp; <span>Works for Sleeper, ESPN & Yahoo</span></p>
    <p class="res-intro">This guide walks through how to connect your fantasy league to Ultimate Fantasy Dashboard and start generating and sharing weekly power rankings in under five minutes — for any platform and any sport.</p>
  </div>

  <div class="res-body">

    <div class="res-section">
      <h2 class="res-h2">Before you start</h2>
      <p class="res-p">You'll need your league link or account credentials for Sleeper, ESPN, or Yahoo. No other league members need to sign up — only the person setting up the dashboard needs an account. All four sports are supported: <strong>football, basketball, baseball, and hockey</strong>.</p>
    </div>

    <div class="res-section">
      <h2 class="res-h2">Step-by-step setup</h2>
      <div class="res-steps">
        <div class="res-step"><div class="res-step-num">1</div><div class="res-step-body"><div class="res-step-title">Create a free account at ultimatefantasydashboard.com</div><div class="res-step-desc">Sign up with your email or Google account. No credit card required. Takes about 30 seconds.</div></div></div>
        <div class="res-step"><div class="res-step-num">2</div><div class="res-step-body"><div class="res-step-title">Connect your league</div><div class="res-step-desc">Click "Add League" and select your platform — Sleeper, ESPN, or Yahoo. For Sleeper, paste your league ID or link. For ESPN and Yahoo, you'll authenticate directly with your platform account. Multiple leagues across different platforms can be connected simultaneously.</div></div></div>
        <div class="res-step"><div class="res-step-num">3</div><div class="res-step-body"><div class="res-step-title">Navigate to Power Rankings</div><div class="res-step-desc">Once your league loads, select Power Rankings from the navigation. Rankings are automatically calculated based on your league's scoring, matchup history, and recent performance — no manual setup required.</div></div></div>
        <div class="res-step"><div class="res-step-num">4</div><div class="res-step-body"><div class="res-step-title">Share to your group chat</div><div class="res-step-desc">Hit the Share button on any rankings card. The image is automatically copied to your clipboard — paste it straight into your Slack, iMessage, WhatsApp, or Discord group chat. No downloading or editing required.</div></div></div>
      </div>
    </div>

    <div class="res-card-showcase">
      <div class="res-card-showcase-label">What your shareable card looks like</div>
      <div class="mock-card">
        <div class="mock-header">
          <div class="mock-header-left"><span class="mock-icon">📊</span><span class="mock-title">Power Rankings</span></div>
          <span class="mock-badge">WK 11 · PPR</span>
        </div>
        <div class="mock-row pr-row gold"><span class="mock-rank">1</span><div class="mock-dot" style="background:#eab308"></div><span class="mock-name">Mahomes Magic</span><span class="mock-score">97.4</span><span class="mock-delta-up">▲2</span></div>
        <div class="mock-row pr-row"><span class="mock-rank">2</span><div class="mock-dot" style="background:#3b82f6"></div><span class="mock-name">Trash Can Wins</span><span class="mock-score">91.2</span><span class="mock-delta-dn">▼1</span></div>
        <div class="mock-row pr-row"><span class="mock-rank">3</span><div class="mock-dot" style="background:#8b5cf6"></div><span class="mock-name">The Algorithm</span><span class="mock-score">88.9</span><span class="mock-delta-up">▲1</span></div>
        <div class="mock-watermark">ultimatefantasydashboard.com</div>
      </div>
    </div>

    <div class="res-section">
      <h2 class="res-h2">Understanding what drives the rankings</h2>
      <p class="res-p">UFD power rankings factor in <strong>recent scoring performance</strong>, <strong>all-play record</strong> (how a team would do against every other team each week), and <strong>strength of schedule</strong>. Category leagues use expected category wins against a median opponent rather than raw points. The result is a ranking that reflects actual performance far more accurately than wins and losses alone.</p>
      <h3 class="res-h3">Category leagues (basketball, baseball, hockey)</h3>
      <p class="res-p">For head-to-head category leagues, power rankings calculate how many categories each team would win against a theoretical average opponent — giving a truer picture of team strength in a format where a 9-0 week and a 5-4 week both count as a win.</p>
    </div>

    <div class="res-callout">
      <div class="res-callout-label">Works everywhere, no exceptions</div>
      <div class="res-callout-title">The only power rankings tool for Sleeper, ESPN, and Yahoo</div>
      <p class="res-callout-body">Ultimate Fantasy Dashboard is the only platform that generates automated power rankings for all three major fantasy platforms across all four major sports. No other tool does this.</p>
      <div class="res-callout-tags">
        <span class="res-tag sleeper">Sleeper</span><span class="res-tag espn">ESPN</span><span class="res-tag yahoo">Yahoo</span>
        <span class="res-tag football">Football</span><span class="res-tag basketball">Basketball</span><span class="res-tag baseball">Baseball</span><span class="res-tag hockey">Hockey</span>
      </div>
      <a href="/" class="callout-cta" @click.prevent="goSignup">Set Up My League's Rankings →</a>
    </div>

      <div class="res-related">
    <div class="res-related-title">Explore more resources</div>
    <div class="res-related-grid">
      <a href="/resources/league-history" class="res-related-link">
        <div class="res-related-link-icon">🏆</div>
        <div class="res-related-link-title">League History</div>
        <div class="res-related-link-sub">Track legacy & bragging rights</div>
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
    <h2 class="res-footer-cta-title">Power rankings. One click. Group chat chaos.</h2>
    <p class="res-footer-cta-sub">Connect your league and have a shareable power rankings card ready for your group chat in under five minutes.</p>
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
