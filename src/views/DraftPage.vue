<template>
<div class="pg">
  <nav class="pg-nav">
    <a href="/"><img src="/UFD_V8.png" class="pg-logo" alt="UFD" /></a>
    <div class="pg-nav-links"><a href="/powerrankings">Power Rankings</a><a href="/matchups">Matchups</a><a href="/draft">Draft Analysis</a><a href="/history">League History</a></div>
    <a href="/" class="pg-cta" @click.prevent="$router.push('/')">Get Started Free →</a>
  </nav>
  <div class="pg-hero">
    <div class="pg-eyebrow">Fantasy Draft Analysis</div>
    <h1 class="pg-title">Draft grades that <span class="pg-gold">evolve all season</span> as players rise and fall</h1>
    <p class="pg-intro">Everyone thinks they drafted well. Draft grades are the receipts. Points Above Replacement, letter grades, and category balance reports — updated throughout the season as picks age.</p>
  </div>
  <div class="pg-body">
    <div class="pg-section">
      <h2 class="pg-h2">Why draft analysis creates months of legitimate trash talk</h2>
      <p class="pg-p">The draft is the most talked-about event in any fantasy league — but most leagues let that energy die within a week. Draft grades turn a one-day event into a season-long narrative that gets better as the year goes on.</p>
      <p class="pg-p">When the manager who claimed to have the best draft gets handed a C+ based on Points Above Replacement, the conversation that follows is better than anything that happened draft day. And when a "reach" pick turns into a top-five performer by November, that mid-season grade update is a moment of pure vindication.</p>
    </div>
    <div class="pg-card-preview">
      <div class="pg-card-label">Example · Draft Grade Card</div>
      <div class="mock">
        <div class="mock-head"><span class="mock-ufd">UFD</span><span class="mock-sport">🏈 NFL Fantasy · PPR</span><span class="mock-wk">DRAFT</span></div>
        <div class="mock-title">📋 DRAFT GRADES · Mahomes Magic</div>
        <div class="mock-dhead"><span>PICK</span><span>PLAYER</span><span>POS</span><span>PAR</span><span>GRD</span></div>
        <div class="mock-drow mock-gold"><span class="mock-dpick">1.03</span><span class="mock-dname">Justin Jefferson</span><span class="mock-dpos wr">WR</span><span class="mock-dpar up">+42.1</span><span class="mock-dgrade gold">A+</span></div>
        <div class="mock-drow"><span class="mock-dpick">2.14</span><span class="mock-dname">Davante Adams</span><span class="mock-dpos wr">WR</span><span class="mock-dpar up">+18.7</span><span class="mock-dgrade">A</span></div>
        <div class="mock-drow"><span class="mock-dpick">3.27</span><span class="mock-dname">Tony Pollard</span><span class="mock-dpos rb">RB</span><span class="mock-dpar dn">-4.2</span><span class="mock-dgrade">C</span></div>
        <div class="mock-drow mock-gold"><span class="mock-dpick">4.38</span><span class="mock-dname">Travis Kelce</span><span class="mock-dpos te">TE</span><span class="mock-dpar up">+31.4</span><span class="mock-dgrade gold">A+</span></div>
        <div class="mock-drow mock-bust"><span class="mock-dpick">5.51</span><span class="mock-dname">Stefon Diggs</span><span class="mock-dpos wr">WR</span><span class="mock-dpar dn">-11.8</span><span class="mock-dgrade bust">D</span></div>
        <div class="mock-dfoot"><span class="mock-doverall-lbl">Overall</span><span class="mock-doverall-val">A</span><span class="mock-wm" style="margin-left:auto">ultimatefantasydashboard.com</span></div>
      </div>
    </div>
    <div class="pg-section">
      <h2 class="pg-h2">Points Above Replacement — the number that ends draft arguments</h2>
      <p class="pg-p"><strong>PAR</strong> measures how many more (or fewer) points a player produced compared to a replacement-level player at the same position — weighted by their draft cost. A first-round pick returning 15 PAR is a disaster. A seventh-round pick returning 15 PAR is a masterpiece. The same production looks completely different through the lens of draft value.</p>
      <p class="pg-p">When someone insists their 5th-round injured bust was "still a good pick at that spot," PAR tells the truth. Post the card.</p>
    </div>
    <div class="pg-section">
      <h2 class="pg-h2">Category league balance reports</h2>
      <p class="pg-p">In category leagues (basketball, baseball, hockey), drafting stars isn't enough — category balance matters. A team elite in three stats and irrelevant in eight loses most weeks to a balanced team. UFD's balance report shows exactly where each team dominates and where they're punting, making it immediately clear whether a manager had a strategy or just drafted names.</p>
    </div>
    <div class="pg-callout">
      <div class="pg-callout-label">Grades that evolve all season</div>
      <div class="pg-callout-title">Draft analysis for Sleeper, ESPN & Yahoo — points and category leagues</div>
      <p class="pg-callout-body">UFD automatically grades drafts for all three platforms across football, basketball, baseball, and hockey — in both points and category formats. Grades update weekly so the best steals and worst busts get properly recognized over time.</p>
      <div class="pg-tags"><span class="pg-tag t-sleeper">Sleeper</span><span class="pg-tag t-espn">ESPN</span><span class="pg-tag t-yahoo">Yahoo</span><span class="pg-tag t-fb">Football</span><span class="pg-tag t-bb">Basketball</span><span class="pg-tag t-base">Baseball</span><span class="pg-tag t-hk">Hockey</span></div>
      <a href="/" class="pg-btn" @click.prevent="$router.push('/')">Grade My League's Draft →</a>
    </div>
    <div class="pg-related"><div class="pg-related-title">Explore more</div><div class="pg-related-grid"><a href="/powerrankings" class="pg-related-link"><div class="pg-related-icon">📊</div><div class="pg-related-name">Power Rankings</div><div class="pg-related-sub">Weekly engagement driver</div></a><a href="/matchups" class="pg-related-link"><div class="pg-related-icon">⚔️</div><div class="pg-related-name">Matchup Analysis</div><div class="pg-related-sub">Win probability & Monte Carlo</div></a><a href="/history" class="pg-related-link"><div class="pg-related-icon">🏆</div><div class="pg-related-name">League History</div><div class="pg-related-sub">Years of receipts</div></a></div></div>
  </div>
  <div class="pg-footer-cta"><div class="pg-eyebrow">Try it free</div><h2 class="pg-footer-title">Grade the draft. Settle the argument.</h2><p class="pg-footer-sub">Connect your league and get automatic PAR scores and draft grades updated all season long.</p><a href="/" class="pg-btn" @click.prevent="$router.push('/')">Connect Your League Free →</a><p class="pg-footer-trust">No credit card · Sleeper, Yahoo & ESPN · Football, Basketball, Baseball & Hockey</p></div>
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
.pg-p strong{color:#e5e7eb}
.pg-card-preview{background:#0a0c14;border:1px solid #1e2130;border-radius:16px;padding:28px;margin:0 0 48px;display:flex;flex-direction:column;align-items:center}
.pg-card-label{font-size:11px;font-weight:700;letter-spacing:0.15em;color:#4b5563;text-transform:uppercase;margin-bottom:20px;align-self:flex-start}
.mock{background:linear-gradient(135deg,#12151e,#0a0c14);border:1px solid #1e2130;border-radius:12px;overflow:hidden;width:100%;max-width:400px}
.mock-head{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid #1a1d28;background:rgba(0,0,0,0.2)}
.mock-ufd{font-size:10px;font-weight:900;background:rgba(234,179,8,0.15);color:#eab308;border:1px solid rgba(234,179,8,0.3);padding:2px 7px;border-radius:4px}
.mock-sport{font-size:11px;color:#6b7280;flex:1}
.mock-wk{font-size:10px;color:#374151;background:#1a1d28;padding:2px 7px;border-radius:4px;font-weight:700}
.mock-title{font-size:11px;font-weight:800;letter-spacing:0.08em;color:#9ca3af;padding:8px 14px 4px}
.mock-dhead{display:grid;grid-template-columns:38px 1fr 30px 44px 30px;gap:4px;padding:4px 14px;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#374151;border-bottom:1px solid #1a1d28}
.mock-drow{display:grid;grid-template-columns:38px 1fr 30px 44px 30px;gap:4px;align-items:center;padding:7px 14px;border-bottom:1px solid #1a1d28}
.mock-drow:last-of-type{border-bottom:none}
.mock-gold{background:rgba(234,179,8,0.05)}
.mock-bust{background:rgba(239,68,68,0.04)}
.mock-dpick{font-size:10px;font-weight:700;color:#4b5563;font-variant-numeric:tabular-nums}
.mock-dname{font-size:11px;color:#d1d5db;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mock-dpos{font-size:9px;font-weight:800;padding:1px 4px;border-radius:3px;text-align:center}
.mock-dpos.wr{background:rgba(59,130,246,0.15);color:#60a5fa}
.mock-dpos.rb{background:rgba(34,197,94,0.15);color:#4ade80}
.mock-dpos.te{background:rgba(249,115,22,0.15);color:#fb923c}
.mock-dpar{font-size:10px;font-weight:800;text-align:right}
.mock-dpar.up{color:#22c55e}
.mock-dpar.dn{color:#ef4444}
.mock-dgrade{font-size:11px;font-weight:900;text-align:center;color:#9ca3af}
.mock-dgrade.gold{color:#eab308}
.mock-dgrade.bust{color:#ef4444}
.mock-dfoot{display:flex;align-items:center;gap:8px;padding:7px 14px;border-top:1px solid #1a1d28}
.mock-doverall-lbl{font-size:9px;color:#4b5563;text-transform:uppercase;letter-spacing:0.08em}
.mock-doverall-val{font-size:14px;font-weight:900;color:#eab308}
.mock-wm{font-size:9px;color:#1e2130;text-align:center;padding:7px}
.pg-callout{background:linear-gradient(135deg,rgba(234,179,8,0.08),rgba(234,179,8,0.03));border:1px solid rgba(234,179,8,0.2);border-radius:16px;padding:28px 32px;margin:0 0 48px}
.pg-callout-label{font-size:10px;font-weight:800;letter-spacing:0.2em;color:#eab308;text-transform:uppercase;margin-bottom:10px}
.pg-callout-title{font-size:20px;font-weight:800;color:#fff;margin:0 0 12px}
.pg-callout-body{font-size:15px;color:#9ca3af;line-height:1.6;margin:0 0 16px}
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
