<template>
<div class="pg">
  <nav class="pg-nav">
    <a href="/"><img src="/UFD_V8.png" class="pg-logo" alt="UFD" /></a>
    <div class="pg-nav-links">
      <a href="/powerrankings">Power Rankings</a>
      <a href="/matchups-info">Matchups</a>
      <a href="/draft-info">Draft Analysis</a>
      <a href="/history-info">League History</a>
    </div>
    <a href="/" class="pg-cta" @click.prevent="$router.push('/')">Get Started Free →</a>
  </nav>
  <div class="pg-hero">
    <div class="pg-eyebrow">Fantasy Matchup Analysis</div>
    <h1 class="pg-title">Win probability powered by <span class="pg-gold">Monte Carlo simulation</span> — for every platform</h1>
    <p class="pg-intro">A 30-point lead Sunday afternoon means nothing if your opponent has four players Monday night. Win probability tells you the actual odds — not just the score.</p>
  </div>
  <div class="pg-body">
    <div class="pg-section">
      <h2 class="pg-h2">Why win probability changes how your league follows every matchup</h2>
      <p class="pg-p">Score-checking tells you a number. Win probability tells you whether to panic or celebrate. A manager down 30 with three high-ceiling players left versus an opponent with one might actually be a 65% favorite. That single number — posted to the group chat at halftime — creates more conversation than anything else in fantasy sports.</p>
      <p class="pg-p">When someone posts their 78% win probability on Sunday night and then loses when their opponent's running back explodes on Monday night, that's the most memorable moment of the entire fantasy season. It only exists because of the probability number.</p>
    </div>
    <div class="pg-card-preview">
      <div class="pg-card-label">Example · Live Matchup Win Probability</div>
      <div class="mock">
        <div class="mock-head"><span class="mock-ufd">UFD</span><span class="mock-sport">🏈 NFL Fantasy · PPR</span><span class="mock-wk" style="color:#22c55e;background:rgba(34,197,94,0.1)">● LIVE</span></div>
        <div class="mock-matchup">
          <div class="mock-mc-team"><div class="mock-dot lg" style="background:linear-gradient(135deg,#eab308,#ca8a04)"></div><div class="mock-mc-name">Mahomes Magic</div><div class="mock-mc-score gold">142.6</div></div>
          <div class="mock-vs">VS</div>
          <div class="mock-mc-team"><div class="mock-dot lg" style="background:linear-gradient(135deg,#3b82f6,#1d4ed8)"></div><div class="mock-mc-name">Trash Can Wins</div><div class="mock-mc-score">119.3</div></div>
        </div>
        <div class="mock-prob">
          <div class="mock-prob-labels"><span style="color:#eab308">72% win prob</span><span>28%</span></div>
          <div class="mock-prob-bar"><div class="mock-prob-fill" style="width:72%"></div></div>
          <div class="mock-prob-sub">Monte Carlo · 10,000 simulations · 3 players remaining</div>
        </div>
        <div class="mock-wm">ultimatefantasydashboard.com</div>
      </div>
    </div>
    <div class="pg-section">
      <h2 class="pg-h2">What Monte Carlo simulation means for your fantasy league</h2>
      <p class="pg-p">Monte Carlo runs 10,000 simulated outcomes for every remaining player based on their projected scoring distribution — then calculates how often each team wins across all those simulations. The result is a win probability that accounts for current scores, remaining players, and realistic outcome variance.</p>
      <p class="pg-p">In <strong>points leagues</strong>, it simulates score distributions and calculates the probability of surpassing the opponent's final score. In <strong>category leagues</strong> (basketball, baseball, hockey), it simulates expected category outcomes across remaining games — calculating the probability of winning enough categories to take the matchup.</p>
    </div>
    <div class="pg-callout">
      <div class="pg-callout-label">Only tool that does this everywhere</div>
      <div class="pg-callout-title">Monte Carlo win probability for Sleeper, ESPN & Yahoo — points and category leagues</div>
      <p class="pg-callout-body">Ultimate Fantasy Dashboard is the <strong>only</strong> platform running Monte Carlo simulations for all three major fantasy platforms across football, basketball, baseball, and hockey — in both points and category formats.</p>
      <div class="pg-tags"><span class="pg-tag t-sleeper">Sleeper</span><span class="pg-tag t-espn">ESPN</span><span class="pg-tag t-yahoo">Yahoo</span><span class="pg-tag t-fb">Football</span><span class="pg-tag t-bb">Basketball</span><span class="pg-tag t-base">Baseball</span><span class="pg-tag t-hk">Hockey</span></div>
      <a href="/" class="pg-btn" @click.prevent="$router.push('/')">Check My Live Win Probability →</a>
    </div>
    <div class="pg-related"><div class="pg-related-title">Explore more</div><div class="pg-related-grid"><a href="/powerrankings" class="pg-related-link"><div class="pg-related-icon">📊</div><div class="pg-related-name">Power Rankings</div><div class="pg-related-sub">Weekly engagement driver</div></a><a href="/draft-info" class="pg-related-link"><div class="pg-related-icon">📋</div><div class="pg-related-name">Draft Analysis</div><div class="pg-related-sub">Grades all season long</div></a><a href="/history-info" class="pg-related-link"><div class="pg-related-icon">🏆</div><div class="pg-related-name">League History</div><div class="pg-related-sub">Years of receipts</div></a></div></div>
  </div>
  <div class="pg-footer-cta"><div class="pg-eyebrow">Try it free</div><h2 class="pg-footer-title">Your matchup's win probability is waiting to cause chaos.</h2><p class="pg-footer-sub">Connect your Sleeper, ESPN, or Yahoo league and get live Monte Carlo win probability for every matchup.</p><a href="/" class="pg-btn" @click.prevent="$router.push('/')">Connect Your League Free →</a><p class="pg-footer-trust">No credit card · Sleeper, Yahoo & ESPN · Football, Basketball, Baseball & Hockey</p></div>
</div>
</template>
<script setup lang="ts">import { useRouter } from 'vue-router';const router = useRouter()</script>
<style scoped>
*{box-sizing:border-box}
.pg{min-height:100vh;background:#05060a;color:#f7f7ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif}
.pg-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 40px;border-bottom:1px solid #1e2130;background:rgba(5,6,10,0.95);position:sticky;top:0;z-index:50;backdrop-filter:blur(10px)}
.pg-logo{height:36px;object-fit:contain}
.pg-nav-links{display:flex;align-items:center;gap:24px}
.pg-nav-links a{font-size:13px;color:#6b7280;text-decoration:none}
.pg-nav-links a:hover{color:#f7f7ff}
.pg-cta{padding:8px 20px;background:#eab308;color:#0a0c14;font-size:13px;font-weight:800;border-radius:8px;text-decoration:none}
.pg-hero{padding:72px 40px 48px;max-width:800px;margin:0 auto;text-align:center}
.pg-eyebrow{font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#eab308;margin-bottom:16px}
.pg-title{font-size:clamp(28px,5vw,48px);font-weight:900;line-height:1.1;letter-spacing:-0.02em;color:#ffffff;margin:0 0 20px}
.pg-gold{color:#eab308}
.pg-intro{font-size:17px;color:#9ca3af;line-height:1.7;max-width:680px;margin:0 auto}
.pg-body{max-width:800px;margin:0 auto;padding:0 40px 80px}
.pg-section{margin-bottom:52px}
.pg-h2{font-size:26px;font-weight:800;color:#f3f4f6;margin:0 0 16px}
.pg-p{font-size:16px;color:#9ca3af;line-height:1.8;margin:0 0 16px}
.pg-p strong{color:#e5e7eb;font-weight:700}
.pg-card-preview{background:#0a0c14;border:1px solid #1e2130;border-radius:16px;padding:28px;margin:0 0 48px;display:flex;flex-direction:column;align-items:center}
.pg-card-label{font-size:11px;font-weight:700;letter-spacing:0.15em;color:#4b5563;text-transform:uppercase;margin-bottom:20px;align-self:flex-start}
.mock{background:linear-gradient(135deg,#12151e,#0a0c14);border:1px solid #1e2130;border-radius:12px;overflow:hidden;width:100%;max-width:400px}
.mock-head{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #1a1d28;background:rgba(0,0,0,0.2)}
.mock-ufd{font-size:10px;font-weight:900;background:rgba(234,179,8,0.15);color:#eab308;border:1px solid rgba(234,179,8,0.3);padding:2px 7px;border-radius:4px}
.mock-sport{font-size:11px;color:#6b7280;flex:1}
.mock-wk{font-size:10px;color:#374151;background:#1a1d28;padding:2px 7px;border-radius:4px;font-weight:700}
.mock-matchup{display:flex;align-items:center;justify-content:space-between;padding:20px 20px 12px}
.mock-mc-team{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1}
.mock-dot{width:14px;height:14px;border-radius:50%;flex-shrink:0}
.mock-dot.lg{width:32px;height:32px}
.mock-mc-name{font-size:11px;color:#9ca3af;text-align:center}
.mock-mc-score{font-size:22px;font-weight:900;color:#e5e7eb}
.mock-mc-score.gold{color:#eab308}
.mock-vs{font-size:12px;font-weight:900;color:#374151;width:30px;text-align:center}
.mock-prob{padding:0 16px 14px}
.mock-prob-labels{display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:6px;color:#6b7280}
.mock-prob-bar{height:6px;background:#1e2130;border-radius:3px;overflow:hidden;margin-bottom:8px}
.mock-prob-fill{height:100%;background:linear-gradient(90deg,#eab308,#ca8a04);border-radius:3px}
.mock-prob-sub{font-size:9px;color:#374151;text-align:center}
.mock-wm{font-size:9px;color:#1e2130;text-align:center;padding:7px}
.pg-callout{background:linear-gradient(135deg,rgba(234,179,8,0.08),rgba(234,179,8,0.03));border:1px solid rgba(234,179,8,0.2);border-radius:16px;padding:28px 32px;margin:0 0 48px}
.pg-callout-label{font-size:10px;font-weight:800;letter-spacing:0.2em;color:#eab308;text-transform:uppercase;margin-bottom:10px}
.pg-callout-title{font-size:20px;font-weight:800;color:#fff;margin:0 0 12px}
.pg-callout-body{font-size:15px;color:#9ca3af;line-height:1.6;margin:0 0 16px}
.pg-callout-body strong{color:#e5e7eb}
.pg-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}
.pg-tag{font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px}
.t-sleeper{background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.3);color:#eab308}
.t-espn{background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#60a5fa}
.t-yahoo{background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);color:#a78bfa}
.t-fb{background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);color:#4ade80}
.t-bb{background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);color:#fb923c}
.t-base{background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#60a5fa}
.t-hk{background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.3);color:#a78bfa}
.pg-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#eab308;color:#0a0c14;font-size:14px;font-weight:800;border-radius:10px;cursor:pointer;text-decoration:none}
.pg-btn:hover{background:#fbbf24}
.pg-related{background:#0a0c14;border:1px solid #1e2130;border-radius:16px;padding:24px;margin-top:48px}
.pg-related-title{font-size:12px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:14px}
.pg-related-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.pg-related-link{display:block;padding:14px;background:#0f1220;border:1px solid #1e2130;border-radius:10px;text-decoration:none;transition:all .2s}
.pg-related-link:hover{border-color:rgba(234,179,8,0.3)}
.pg-related-icon{font-size:18px;margin-bottom:6px}
.pg-related-name{font-size:13px;font-weight:700;color:#d1d5db;margin-bottom:2px}
.pg-related-sub{font-size:11px;color:#4b5563}
.pg-footer-cta{background:linear-gradient(135deg,#0f1220,#0a0d18);border-top:1px solid #1e2130;padding:64px 40px;text-align:center}
.pg-footer-title{font-size:clamp(22px,4vw,38px);font-weight:900;color:#fff;margin:12px 0 16px}
.pg-footer-sub{font-size:16px;color:#6b7280;margin:0 auto 28px;max-width:480px}
.pg-footer-trust{font-size:12px;color:#374151;margin-top:14px}
@media(max-width:640px){.pg-nav{padding:12px 20px}.pg-nav-links{display:none}.pg-hero,.pg-body{padding-left:20px;padding-right:20px}.pg-related-grid{grid-template-columns:1fr}}
</style>
