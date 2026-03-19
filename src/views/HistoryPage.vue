<template>
<div class="pg">
  <nav class="pg-nav">
    <a href="/"><img src="/UFD_V8.png" class="pg-logo" alt="UFD" /></a>
    <div class="pg-nav-links"><a href="/powerrankings">Power Rankings</a><a href="/matchups-info">Matchups</a><a href="/draft-info">Draft Analysis</a><a href="/history-info">League History</a></div>
    <a href="/" class="pg-cta" @click.prevent="$router.push('/')">Get Started Free →</a>
  </nav>
  <div class="pg-hero">
    <div class="pg-eyebrow">Fantasy League History</div>
    <h1 class="pg-title">Years of receipts your <span class="pg-gold">group chat has never seen</span></h1>
    <p class="pg-intro">Championships, head-to-head records going back to year one, legacy scores, and all-time awards. Your league's history is the best trash talk material available — most leagues just don't know how to access it.</p>
  </div>
  <div class="pg-body">
    <div class="pg-section">
      <h2 class="pg-h2">Why history is better trash talk than anything happening this season</h2>
      <p class="pg-p">Current season drama fades. A 0-4 start gets forgotten when someone runs off six straight wins. But history doesn't fade — and history, surfaced at the right moment, hits harder than anything happening this week.</p>
      <p class="pg-p">The manager who just passed someone for most all-time wins in a ten-year league? That's a moment. The three-time champion who hasn't sniffed a playoff in four years? That's a legacy in freefall. The team with a 2-16 all-time record against one specific rival? That story predates this season by years — and it's devastating.</p>
    </div>
    <div class="pg-card-preview">
      <div class="pg-card-label">Example · All-Time Head-to-Head Matrix</div>
      <div class="mock">
        <div class="mock-head"><span class="mock-ufd">UFD</span><span class="mock-sport">🏈 NFL Fantasy · PPR</span><span class="mock-wk">ALL TIME</span></div>
        <div class="mock-title">⚔️ HEAD-TO-HEAD MATRIX</div>
        <div class="mock-h2h">
          <div class="mock-h2h-row"><div class="mock-h2h-lbl"></div><div class="mock-h2h-c self" style="font-size:8px;width:52px">vs →</div></div>
          <div class="mock-h2h-row"><div class="mock-h2h-lbl">Mahomes Magic</div><div class="mock-h2h-c self">—</div><div class="mock-h2h-c win">8-4</div><div class="mock-h2h-c win">11-3</div><div class="mock-h2h-c loss">5-9</div></div>
          <div class="mock-h2h-row"><div class="mock-h2h-lbl">Trash Can Wins</div><div class="mock-h2h-c loss">4-8</div><div class="mock-h2h-c self">—</div><div class="mock-h2h-c win">7-5</div><div class="mock-h2h-c win">9-3</div></div>
          <div class="mock-h2h-row"><div class="mock-h2h-lbl">The Algorithm</div><div class="mock-h2h-c loss">3-11</div><div class="mock-h2h-c loss">5-7</div><div class="mock-h2h-c self">—</div><div class="mock-h2h-c win">8-4</div></div>
          <div class="mock-h2h-row"><div class="mock-h2h-lbl">Waiver Wire Kid</div><div class="mock-h2h-c win">9-5</div><div class="mock-h2h-c loss">3-9</div><div class="mock-h2h-c loss">4-8</div><div class="mock-h2h-c self">—</div></div>
        </div>
        <div class="mock-wm">ultimatefantasydashboard.com</div>
      </div>
    </div>
    <div class="pg-section">
      <h2 class="pg-h2">The five history features that drive the most engagement</h2>
      <p class="pg-p"><strong>All-time head-to-head records.</strong> Drop an H2H matrix in the group chat and someone will be triggered within minutes. The manager who's 3-18 against one rival has been sitting on that for years.</p>
      <p class="pg-p"><strong>Championship history and drought tracker.</strong> The absence of championships is as powerful as the presence. Eight years, four playoff appearances, zero titles — that's a burden that should come up constantly.</p>
      <p class="pg-p"><strong>Legacy score.</strong> A cumulative ranking weighting championships, playoff appearances, finish position, and points across all seasons. The most complete answer to "who actually runs this league" — and the most likely to start an argument.</p>
      <p class="pg-p"><strong>Weekly, yearly, and all-time awards.</strong> Highest single-week score, most unlucky season, best draft, worst blowout. These create permanent moments in league history. The manager holding the all-time highest single-week record knows it — make sure everyone else does.</p>
      <p class="pg-p"><strong>Season-by-season win rates.</strong> Who's consistently good versus who had one great year and has been riding it since. The "one-hit wonder" narrative is group chat gold.</p>
    </div>
    <div class="pg-callout">
      <div class="pg-callout-label">Only one tool does this everywhere</div>
      <div class="pg-callout-title">Complete league history from Sleeper, ESPN & Yahoo — all four sports</div>
      <p class="pg-callout-body">Ultimate Fantasy Dashboard is the <strong>only</strong> tool that assembles multi-season history from Sleeper, ESPN, and Yahoo into one place — for football, basketball, baseball, and hockey. Head-to-head records, legacy scores, all-time awards, championship history — all automatic.</p>
      <div class="pg-tags"><span class="pg-tag t-sleeper">Sleeper</span><span class="pg-tag t-espn">ESPN</span><span class="pg-tag t-yahoo">Yahoo</span><span class="pg-tag t-fb">Football</span><span class="pg-tag t-bb">Basketball</span><span class="pg-tag t-base">Baseball</span><span class="pg-tag t-hk">Hockey</span></div>
      <a href="/" class="pg-btn" @click.prevent="$router.push('/')">Unlock My League's History →</a>
    </div>
    <div class="pg-related"><div class="pg-related-title">Explore more</div><div class="pg-related-grid"><a href="/powerrankings" class="pg-related-link"><div class="pg-related-icon">📊</div><div class="pg-related-name">Power Rankings</div><div class="pg-related-sub">Weekly engagement driver</div></a><a href="/matchups-info" class="pg-related-link"><div class="pg-related-icon">⚔️</div><div class="pg-related-name">Matchup Analysis</div><div class="pg-related-sub">Win probability & Monte Carlo</div></a><a href="/draft-info" class="pg-related-link"><div class="pg-related-icon">📋</div><div class="pg-related-name">Draft Analysis</div><div class="pg-related-sub">Grades all season long</div></a></div></div>
  </div>
  <div class="pg-footer-cta"><div class="pg-eyebrow">Try it free</div><h2 class="pg-footer-title">Six years of your league's history, ready to weaponize.</h2><p class="pg-footer-sub">Connect your Sleeper, ESPN, or Yahoo league and pull up every head-to-head record, championship, and legacy score.</p><a href="/" class="pg-btn" @click.prevent="$router.push('/')">Connect Your League Free →</a><p class="pg-footer-trust">No credit card · Sleeper, Yahoo & ESPN · Football, Basketball, Baseball & Hockey</p></div>
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
.mock-h2h{padding:10px 14px}
.mock-h2h-row{display:flex;gap:4px;margin-bottom:3px;align-items:center}
.mock-h2h-lbl{font-size:9px;color:#6b7280;width:80px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex-shrink:0}
.mock-h2h-c{width:36px;height:22px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}
.mock-h2h-c.win{background:rgba(34,197,94,0.15);color:#4ade80}
.mock-h2h-c.loss{background:rgba(239,68,68,0.12);color:#f87171}
.mock-h2h-c.self{background:rgba(255,255,255,0.03);color:#374151}
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
