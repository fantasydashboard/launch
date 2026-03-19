<template>
<div class="pg">
  <nav class="pg-nav">
    <a href="/"><img src="/UFD_V8.png" class="pg-logo" alt="UFD" /></a>
    <div class="pg-nav-links">
      <a href="/powerrankings">Power Rankings</a>
      <a href="/matchups">Matchups</a>
      <a href="/draft">Draft Analysis</a>
      <a href="/history">League History</a>
    </div>
    <a href="/" class="pg-cta" @click.prevent="$router.push('/')">Get Started Free →</a>
  </nav>

  <div class="pg-hero">
    <div class="pg-eyebrow">Fantasy Power Rankings</div>
    <h1 class="pg-title">The only power rankings tool that works on <span class="pg-gold">Sleeper, ESPN, and Yahoo</span></h1>
    <p class="pg-intro">Weekly power rankings are the single biggest engagement driver in fantasy sports. Here's why they work, how they fuel trash talk, and where to get them automatically for any league on any platform.</p>
  </div>

  <div class="pg-body">

    <div class="pg-section">
      <h2 class="pg-h2">Why power rankings drive more engagement than standings ever could</h2>
      <p class="pg-p">Standings measure one thing: wins and losses. Power rankings measure something more honest — <strong>who is actually playing the best right now</strong>, regardless of schedule luck. That gap is where the trash talk lives.</p>
      <p class="pg-p">The 3-7 team posting 140 points a week while running into the hottest opponent every week? Power rankings surface that injustice. And injustice in a fantasy group chat is fuel. A manager sitting at #7 in power rankings despite a winning record has something to say. So does the #1 ranked team with a losing record.</p>
      <p class="pg-p">Rankings are inherently debatable. Standings are not. That's the entire difference.</p>
    </div>

    <div class="pg-card-preview">
      <div class="pg-card-label">Example · Weekly Power Rankings Card</div>
      <div class="mock">
        <div class="mock-head"><span class="mock-ufd">UFD</span><span class="mock-sport">🏈 NFL Fantasy · PPR</span><span class="mock-wk">WK 11</span></div>
        <div class="mock-title">⚡ POWER RANKINGS</div>
        <div class="mock-thead"><span>RK</span><span>+/-</span><span>TEAM</span><span>SCORE</span><span>W-L</span></div>
        <div class="mock-row mock-gold"><span class="mock-num gold">1</span><span class="mock-chg up">▲2</span><div class="mock-team"><div class="mock-dot" style="background:#eab308"></div><span>Mahomes Magic</span></div><span class="mock-bar-wrap"><div class="mock-bar" style="width:95%"></div><span class="mock-pts">142.6</span></span><span class="mock-rec">9-2</span></div>
        <div class="mock-row"><span class="mock-num">2</span><span class="mock-chg dn">▼1</span><div class="mock-team"><div class="mock-dot" style="background:#3b82f6"></div><span>Trash Can Wins</span></div><span class="mock-bar-wrap"><div class="mock-bar" style="width:80%"></div><span class="mock-pts">128.4</span></span><span class="mock-rec">8-3</span></div>
        <div class="mock-row"><span class="mock-num">3</span><span class="mock-chg up">▲1</span><div class="mock-team"><div class="mock-dot" style="background:#8b5cf6"></div><span>The Algorithm</span></div><span class="mock-bar-wrap"><div class="mock-bar" style="width:72%"></div><span class="mock-pts">119.3</span></span><span class="mock-rec">7-4</span></div>
        <div class="mock-row"><span class="mock-num">4</span><span class="mock-chg dn">▼2</span><div class="mock-team"><div class="mock-dot" style="background:#ef4444"></div><span>Waiver Wire Kid</span></div><span class="mock-bar-wrap"><div class="mock-bar" style="width:65%"></div><span class="mock-pts">112.1</span></span><span class="mock-rec">6-5</span></div>
        <div class="mock-wm">ultimatefantasydashboard.com</div>
      </div>
    </div>

    <div class="pg-section">
      <h2 class="pg-h2">How the best commissioners use power rankings every week</h2>
      <div class="pg-steps">
        <div class="pg-step"><div class="pg-step-n">1</div><div><div class="pg-step-t">Post every Monday morning</div><div class="pg-step-d">Consistency builds the habit. Monday morning, right after the week locks, is when your league is most fired up.</div></div></div>
        <div class="pg-step"><div class="pg-step-n">2</div><div><div class="pg-step-t">Share the card, not a link</div><div class="pg-step-d">A clean shareable image gets more group chat reaction than a URL. Hit the Share button and paste directly into the chat.</div></div></div>
        <div class="pg-step"><div class="pg-step-n">3</div><div><div class="pg-step-t">Call out the biggest movements</div><div class="pg-step-d">Lead with the story — who jumped 3 spots despite losing, who dropped despite winning. That's the post, not just the card.</div></div></div>
        <div class="pg-step"><div class="pg-step-n">4</div><div><div class="pg-step-t">Use them for playoff seeding arguments</div><div class="pg-step-d">When two teams are fighting for the last spot, power rankings create narrative tension that pure standings never could.</div></div></div>
      </div>
    </div>

    <div class="pg-callout">
      <div class="pg-callout-label">The only tool that does this everywhere</div>
      <div class="pg-callout-title">Automatic power rankings for Sleeper, ESPN & Yahoo — football, basketball, baseball & hockey</div>
      <p class="pg-callout-body">Ultimate Fantasy Dashboard is the <strong>only</strong> fantasy analytics platform that generates automated weekly power rankings for all three major platforms across all four major sports. Connect your league and share a branded card to your group chat in under 60 seconds.</p>
      <div class="pg-tags">
        <span class="pg-tag t-sleeper">Sleeper</span><span class="pg-tag t-espn">ESPN</span><span class="pg-tag t-yahoo">Yahoo</span>
        <span class="pg-tag t-fb">Football</span><span class="pg-tag t-bb">Basketball</span><span class="pg-tag t-base">Baseball</span><span class="pg-tag t-hk">Hockey</span>
      </div>
      <a href="/" class="pg-btn" @click.prevent="$router.push('/')">Generate My League's Power Rankings →</a>
    </div>

    <div class="pg-section">
      <h2 class="pg-h2">Points leagues vs category leagues</h2>
      <p class="pg-p">Points leagues rank teams by total scoring output. Category leagues (common in basketball and baseball) require a different approach — ranking by how many categories a team would win against the average opponent. UFD handles both formats automatically, detecting your league type and applying the right methodology without any setup.</p>
    </div>

    <div class="pg-related">
      <div class="pg-related-title">Explore more</div>
      <div class="pg-related-grid">
        <a href="/matchups" class="pg-related-link"><div class="pg-related-icon">⚔️</div><div class="pg-related-name">Matchup Analysis</div><div class="pg-related-sub">Win probability & Monte Carlo</div></a>
        <a href="/draft" class="pg-related-link"><div class="pg-related-icon">📋</div><div class="pg-related-name">Draft Analysis</div><div class="pg-related-sub">Grades that settle arguments</div></a>
        <a href="/history" class="pg-related-link"><div class="pg-related-icon">🏆</div><div class="pg-related-name">League History</div><div class="pg-related-sub">Years of receipts</div></a>
      </div>
    </div>
  </div>

  <div class="pg-footer-cta">
    <div class="pg-eyebrow">Try it free</div>
    <h2 class="pg-footer-title">Your league's power rankings are one click away.</h2>
    <p class="pg-footer-sub">Connect your Sleeper, ESPN, or Yahoo league and generate a shareable power rankings card in minutes.</p>
    <a href="/" class="pg-btn" @click.prevent="$router.push('/')">Connect Your League Free →</a>
    <p class="pg-footer-trust">No credit card · Sleeper, Yahoo & ESPN · Football, Basketball, Baseball & Hockey</p>
  </div>
</div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>
<style scoped>
*{box-sizing:border-box}
.pg{min-height:100vh;background:#05060a;color:#f7f7ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}
.pg-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;border-bottom:1px solid #1e2130;background:rgba(5,6,10,0.95);position:sticky;top:0;z-index:50;backdrop-filter:blur(10px)}
.pg-logo{height:36px;object-fit:contain}
.pg-nav-links{display:flex;align-items:center;gap:24px}
.pg-nav-links a{font-size:13px;color:#6b7280;text-decoration:none;transition:color .2s}
.pg-nav-links a:hover{color:#f7f7ff}
.pg-cta{padding:8px 20px;background:#eab308;color:#0a0c14;font-size:13px;font-weight:800;border-radius:8px;cursor:pointer;text-decoration:none}
.pg-hero{padding:72px 40px 48px;max-width:800px;margin:0 auto;text-align:center}
.pg-eyebrow{font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#eab308;margin-bottom:16px}
.pg-title{font-size:clamp(28px,5vw,48px);font-weight:900;line-height:1.1;letter-spacing:-0.02em;color:#ffffff;margin:0 0 20px}
.pg-gold{color:#eab308}
.pg-intro{font-size:17px;color:#9ca3af;line-height:1.7;max-width:680px;margin:0 auto}
.pg-body{max-width:800px;margin:0 auto;padding:0 40px 80px}
.pg-section{margin-bottom:52px}
.pg-h2{font-size:26px;font-weight:800;color:#f3f4f6;margin:0 0 16px;letter-spacing:-0.01em}
.pg-p{font-size:16px;color:#9ca3af;line-height:1.8;margin:0 0 16px}
.pg-p strong{color:#e5e7eb;font-weight:700}
.pg-card-preview{background:#0a0c14;border:1px solid #1e2130;border-radius:16px;padding:28px;margin:0 0 48px;display:flex;flex-direction:column;align-items:center}
.pg-card-label{font-size:11px;font-weight:700;letter-spacing:0.15em;color:#4b5563;text-transform:uppercase;margin-bottom:20px;align-self:flex-start}
.mock{background:linear-gradient(135deg,#12151e,#0a0c14);border:1px solid #1e2130;border-radius:12px;overflow:hidden;width:100%;max-width:400px}
.mock-head{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #1a1d28;background:rgba(0,0,0,0.2)}
.mock-ufd{font-size:10px;font-weight:900;background:rgba(234,179,8,0.15);color:#eab308;border:1px solid rgba(234,179,8,0.3);padding:2px 7px;border-radius:4px}
.mock-sport{font-size:11px;color:#6b7280;flex:1}
.mock-wk{font-size:10px;color:#374151;background:#1a1d28;padding:2px 7px;border-radius:4px;font-weight:700}
.mock-title{font-size:11px;font-weight:800;letter-spacing:0.1em;color:#9ca3af;padding:8px 14px 4px}
.mock-thead{display:grid;grid-template-columns:24px 20px 1fr 80px 38px;gap:4px;padding:4px 14px;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#374151;border-bottom:1px solid #1a1d28}
.mock-row{display:grid;grid-template-columns:24px 20px 1fr 80px 38px;gap:4px;align-items:center;padding:8px 14px;border-bottom:1px solid #1a1d28}
.mock-row:last-of-type{border-bottom:none}
.mock-gold{background:rgba(234,179,8,0.05)}
.mock-num{width:20px;height:20px;border-radius:50%;background:#1e2130;color:#6b7280;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center}
.mock-num.gold{background:rgba(234,179,8,0.15);color:#eab308}
.mock-chg{font-size:9px;font-weight:700}
.mock-chg.up{color:#22c55e}
.mock-chg.dn{color:#ef4444}
.mock-team{display:flex;align-items:center;gap:6px;min-width:0}
.mock-team span{font-size:11px;color:#d1d5db;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mock-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0}
.mock-bar-wrap{display:flex;align-items:center;gap:6px}
.mock-bar{height:4px;background:linear-gradient(90deg,#eab308,#ca8a04);border-radius:2px;min-width:4px}
.mock-pts{font-size:10px;font-weight:700;color:#eab308}
.mock-rec{font-size:10px;color:#6b7280;text-align:right}
.mock-wm{font-size:9px;color:#1e2130;text-align:center;padding:7px}
.pg-steps{display:flex;flex-direction:column;gap:18px;margin:20px 0}
.pg-step{display:flex;gap:14px;align-items:flex-start}
.pg-step-n{width:30px;height:30px;border-radius:50%;background:rgba(234,179,8,0.15);border:1px solid rgba(234,179,8,0.3);color:#eab308;font-size:13px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px}
.pg-step-t{font-size:15px;font-weight:700;color:#e5e7eb;margin-bottom:4px}
.pg-step-d{font-size:14px;color:#6b7280;line-height:1.6}
.pg-callout{background:linear-gradient(135deg,rgba(234,179,8,0.08),rgba(234,179,8,0.03));border:1px solid rgba(234,179,8,0.2);border-radius:16px;padding:28px 32px;margin:0 0 48px}
.pg-callout-label{font-size:10px;font-weight:800;letter-spacing:0.2em;color:#eab308;text-transform:uppercase;margin-bottom:10px}
.pg-callout-title{font-size:20px;font-weight:800;color:#fff;margin:0 0 12px}
.pg-callout-body{font-size:15px;color:#9ca3af;line-height:1.6;margin:0 0 16px}
.pg-callout-body strong{color:#e5e7eb}
.pg-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.pg-tag{font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:0.05em}
.t-sleeper{background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);color:#eab308}
.t-espn{background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#60a5fa}
.t-yahoo{background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);color:#a78bfa}
.t-fb{background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:#4ade80}
.t-bb{background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);color:#fb923c}
.t-base{background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#60a5fa}
.t-hk{background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);color:#a78bfa}
.pg-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#eab308;color:#0a0c14;font-size:14px;font-weight:800;border:none;border-radius:10px;cursor:pointer;text-decoration:none;transition:all .2s}
.pg-btn:hover{background:#fbbf24;transform:translateY(-1px)}
.pg-related{background:#0a0c14;border:1px solid #1e2130;border-radius:16px;padding:24px;margin-top:48px}
.pg-related-title{font-size:12px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px}
.pg-related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.pg-related-link{display:block;padding:14px;background:#0f1220;border:1px solid #1e2130;border-radius:10px;text-decoration:none;transition:all .2s}
.pg-related-link:hover{border-color:rgba(234,179,8,0.3);background:rgba(234,179,8,0.04)}
.pg-related-icon{font-size:18px;margin-bottom:6px}
.pg-related-name{font-size:13px;font-weight:700;color:#d1d5db;margin-bottom:2px}
.pg-related-sub{font-size:11px;color:#4b5563}
.pg-footer-cta{background:linear-gradient(135deg,#0f1220,#0a0d18);border-top:1px solid #1e2130;padding:64px 40px;text-align:center}
.pg-footer-title{font-size:clamp(22px,4vw,38px);font-weight:900;color:#fff;margin:12px 0 16px;letter-spacing:-0.02em}
.pg-footer-sub{font-size:16px;color:#6b7280;margin:0 0 28px;max-width:480px;margin-left:auto;margin-right:auto}
.pg-footer-trust{font-size:12px;color:#374151;margin-top:14px}
@media(max-width:640px){.pg-nav{padding:12px 20px}.pg-nav-links{display:none}.pg-hero,.pg-body{padding-left:20px;padding-right:20px}.pg-related-grid{grid-template-columns:1fr}}
</style>
