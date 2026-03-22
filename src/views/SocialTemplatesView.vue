<template>
  <div class="studio-root">

    <div class="studio-header">
      <img src="/UFD_V8.png" alt="UFD" class="studio-logo" />
      <div>
        <h1>Social Media Studio</h1>
        <p>Screenshot any graphic below &nbsp;·&nbsp; <strong style="color:#eab308">ultimatefantasydashboard.com/socialtemplates</strong></p>
      </div>
    </div>

    <!-- ════════════════════════════════════
         FACEBOOK BANNER  851 × 315
    ════════════════════════════════════ -->
    <div class="section-label">📘 Facebook Page Banner — Screenshot the card below</div>
    <div class="banner-stage">
      <div class="fb-banner">
        <div class="fb-grid"></div>
        <div class="fb-glow-1"></div>
        <div class="fb-glow-2"></div>
        <div class="fb-grain"></div>
        <div class="fb-topline"></div>

        <div class="fb-left">
          <img src="/UFD_V8.png" alt="UFD" class="fb-logo" />
          <div class="fb-headline">Keep your league<br/>talking. <span class="fb-gold">All season.</span></div>
          <div class="fb-sub">Power rankings · Win probability · Draft grades · League history</div>
          <div class="fb-platforms">
            <img src="/sleeper.svg" alt="Sleeper" class="fb-plat-img" />
            <img src="/espn-logo.svg" alt="ESPN" class="fb-plat-img" />
            <img src="/yahoo-fantasy.svg" alt="Yahoo" class="fb-plat-img" />
          </div>
        </div>

        <div class="fb-cards-area">
          <div class="fb-card fb-card-1">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">⚡ Power Rankings</span><span class="fbc-wk">WK 11</span></div>
            <div class="fbc-row fbc-gold"><span class="fbc-rk gold">1</span><span class="fbc-icon" v-html="teamIcons['Mahomes Magic']"></span><span class="fbc-name">Mahomes Magic</span><span class="fbc-pts gold">142.6</span><span class="fbc-chg up">▲2</span></div>
            <div class="fbc-row"><span class="fbc-rk">2</span><span class="fbc-icon" v-html="teamIcons['Trash Can Wins']"></span><span class="fbc-name">Trash Can Wins</span><span class="fbc-pts">128.4</span><span class="fbc-chg up">▲1</span></div>
            <div class="fbc-row"><span class="fbc-rk">3</span><span class="fbc-icon" v-html="teamIcons['The Algorithm']"></span><span class="fbc-name">The Algorithm</span><span class="fbc-pts">119.3</span><span class="fbc-chg dn">▼1</span></div>
            <div class="fbc-row"><span class="fbc-rk">4</span><span class="fbc-icon" v-html="teamIcons['Waiver Wire Kid']"></span><span class="fbc-name">Waiver Wire Kid</span><span class="fbc-pts">112.1</span><span class="fbc-chg dn">▼2</span></div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>
          <div class="fb-card fb-card-2">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">⚔️ Matchup Analysis</span><span class="fbc-wk live">● LIVE</span></div>
            <div class="fbc-matchup">
              <div class="fbc-team"><span class="fbc-avatar-icon" v-html="teamIcons['Mahomes Magic']"></span><div class="fbc-tname">Mahomes Magic</div><div class="fbc-score gold">142.6</div></div>
              <div class="fbc-vs">VS</div>
              <div class="fbc-team"><span class="fbc-avatar-icon" v-html="teamIcons['Trash Can Wins']"></span><div class="fbc-tname">Trash Can Wins</div><div class="fbc-score">119.3</div></div>
            </div>
            <div class="fbc-prob-wrap">
              <div class="fbc-prob-labels"><span class="gold">72% win prob</span><span>28%</span></div>
              <div class="fbc-prob-bar"><div class="fbc-prob-fill" style="width:72%"></div></div>
              <div class="fbc-prob-sub">Monte Carlo · 10,000 simulations</div>
            </div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>
          <div class="fb-card fb-card-3">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">🏆 Legacy Standings</span><span class="fbc-wk">ALL TIME</span></div>
            <div class="fbc-row fbc-gold"><span class="fbc-rk gold">1</span><span class="fbc-icon" v-html="teamIcons['Mahomes Magic']"></span><span class="fbc-name">Mahomes Magic</span><span class="fbc-pts gold">1,847</span></div>
            <div class="fbc-row"><span class="fbc-rk">2</span><span class="fbc-icon" v-html="teamIcons['Trash Can Wins']"></span><span class="fbc-name">Trash Can Wins</span><span class="fbc-pts">1,623</span></div>
            <div class="fbc-row"><span class="fbc-rk">3</span><span class="fbc-icon" v-html="teamIcons['The Algorithm']"></span><span class="fbc-name">The Algorithm</span><span class="fbc-pts">1,401</span></div>
            <div class="fbc-row"><span class="fbc-rk">4</span><span class="fbc-icon" v-html="teamIcons['Waiver Wire Kid']"></span><span class="fbc-name">Waiver Wire Kid</span><span class="fbc-pts">1,198</span></div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════════════════════════════
         18 SQUARE POSTS — 2 per row
    ════════════════════════════════════ -->
    <div class="section-label">📸 Social Post Graphics — Screenshot each individually</div>
    <div class="posts-grid">

      <!-- 1 · MAIN BRAND -->
      <div class="post-wrap">
        <div class="post-label">1 · Main Brand</div>
        <div class="sq sq-dark">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-eyebrow">Fantasy Analytics</div>
            <div class="sq-hl" style="font-size:64px">Keep your<br/>league <span class="gold">talking.</span><br/>All season.</div>
            <div class="sq-body">Power rankings · Win probability<br/>Draft grades · League history</div>
            <div class="fan-wrap" style="margin-top:20px">
              <FanCards />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 2 · LAUNCH SPECIAL -->
      <div class="post-wrap">
        <div class="post-label">2 · Launch Special</div>
        <div class="sq sq-green">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#22c55e,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-launch-badge">🚀 LAUNCH SPECIAL</div>
            <div class="sq-hl" style="font-size:60px;margin-top:10px">The whole<br/>season.<br/><span style="color:#22c55e">Only $5.</span></div>
            <div class="sq-launch-card">
              <div class="sq-launch-line"><span>⚡ Weekly Power Rankings</span><span class="chk">✓</span></div>
              <div class="sq-launch-line"><span>⚔️ Live Win Probability</span><span class="chk">✓</span></div>
              <div class="sq-launch-line"><span>📋 Draft Grades All Season</span><span class="chk">✓</span></div>
              <div class="sq-launch-line"><span>🏆 Full League History</span><span class="chk">✓</span></div>
            </div>
            <div class="sq-launch-price-row">
              <span class="sq-was">Regular $19</span>
              <span class="sq-now" style="color:#22c55e">$5 today</span>
            </div>
            <div class="sq-cta-pill" style="background:rgba(34,197,94,0.12);border-color:rgba(34,197,94,0.4);color:#22c55e">Grab the launch price →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 3 · LAUNCH SPECIAL 2 -->
      <div class="post-wrap">
        <div class="post-label">3 · Launch Special — Urgency</div>
        <div class="sq sq-dark">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-eyebrow" style="color:#eab308">⏳ Limited Launch Pricing</div>
            <div class="sq-hl" style="font-size:56px;margin-top:6px">Your entire<br/>fantasy season<br/>for <span class="gold">$5.</span></div>
            <div class="sq-price-hero">
              <span class="ph-label">Launch Price</span>
              <span class="ph-price">$5</span>
              <span class="ph-season">/ season</span>
            </div>
            <div class="sq-body" style="margin-top:10px;font-size:14px">Sleeper · ESPN · Yahoo<br/>Football · Basketball · Baseball · Hockey</div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="compact" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 4 · POWER RANKINGS -->
      <div class="post-wrap">
        <div class="post-label">4 · Power Rankings</div>
        <div class="sq sq-dark">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner">
            <div class="sq-eyebrow">⚡ Weekly Power Rankings</div>
            <div class="sq-hl" style="font-size:56px">Standings<br/>lie.<br/><span class="gold">Power<br/>rankings<br/>don't.</span></div>
            <div class="fan-wrap" style="margin-top:auto">
              <FanCards variant="pr" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 5 · WIN PROBABILITY -->
      <div class="post-wrap">
        <div class="post-label">5 · Win Probability</div>
        <div class="sq sq-cyan">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#06b6d4,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-eyebrow" style="color:#06b6d4">⚔️ Live Matchup Analysis</div>
            <div class="sq-hl" style="font-size:50px">You're not<br/>winning until<br/>it says <span style="color:#06b6d4">100%.</span></div>
            <div class="fan-wrap" style="margin-top:18px">
              <FanCards variant="wp" />
            </div>
            <div class="sq-body" style="color:#4b5563;margin-top:10px;font-size:13px">Post this at halftime. Watch the chaos.</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 6 · DRAFT GRADES -->
      <div class="post-wrap">
        <div class="post-label">6 · Draft Grades</div>
        <div class="sq sq-purple">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#8b5cf6,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner">
            <div class="sq-eyebrow" style="color:#a78bfa">📋 Draft Analysis</div>
            <div class="sq-hl" style="font-size:52px">Everyone<br/>thinks they<br/>drafted well.<br/><span style="color:#a78bfa">Grades<br/>disagree.</span></div>
            <div class="fan-wrap" style="margin-top:auto">
              <FanCards variant="draft" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 7 · SLEEPER FOOTBALL -->
      <div class="post-wrap">
        <div class="post-label">7 · Sleeper · Football</div>
        <div class="sq sq-dark">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/sleeper.svg" class="sq-plat-logo" alt="Sleeper" /><span class="sq-sport-tag football">🏈 NFL Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Your Sleeper<br/>league just got<br/>a <span class="gold">serious</span><br/>upgrade.</div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="pr" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 8 · SLEEPER BASKETBALL -->
      <div class="post-wrap">
        <div class="post-label">8 · Sleeper · Basketball</div>
        <div class="sq sq-orange">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#f97316,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/sleeper.svg" class="sq-plat-logo" alt="Sleeper" /><span class="sq-sport-tag basketball">🏀 NBA Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Category<br/>leagues.<br/>Power rankings.<br/><span style="color:#f97316">Finally.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="bball" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 9 · ESPN FOOTBALL -->
      <div class="post-wrap">
        <div class="post-label">9 · ESPN · Football</div>
        <div class="sq sq-red">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#ef4444,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/espn-logo.svg" class="sq-plat-logo" alt="ESPN" /><span class="sq-sport-tag football">🏈 NFL Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Your ESPN<br/>league has<br/>more data<br/>than you<br/><span style="color:#f87171">ever knew.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="draft" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 10 · ESPN BASEBALL -->
      <div class="post-wrap">
        <div class="post-label">10 · ESPN · Baseball</div>
        <div class="sq sq-blue">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#3b82f6,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/espn-logo.svg" class="sq-plat-logo" alt="ESPN" /><span class="sq-sport-tag baseball">⚾ MLB Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Fantasy<br/>baseball<br/>analytics<br/>that actually<br/><span style="color:#60a5fa">slap.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="baseball" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 11 · ESPN BASKETBALL -->
      <div class="post-wrap">
        <div class="post-label">11 · ESPN · Basketball</div>
        <div class="sq sq-orange">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#f97316,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/espn-logo.svg" class="sq-plat-logo" alt="ESPN" /><span class="sq-sport-tag basketball">🏀 NBA Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Win more<br/>categories.<br/>Lose fewer<br/><span style="color:#f97316">arguments.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="bball" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 12 · YAHOO FOOTBALL -->
      <div class="post-wrap">
        <div class="post-label">12 · Yahoo · Football</div>
        <div class="sq sq-purple">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#a78bfa,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/yahoo-fantasy.svg" class="sq-plat-logo" alt="Yahoo" /><span class="sq-sport-tag football">🏈 NFL Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">6 years of<br/>your Yahoo<br/>league.<br/><span style="color:#a78bfa">One screen.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="history" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 13 · YAHOO BASEBALL -->
      <div class="post-wrap">
        <div class="post-label">13 · Yahoo · Baseball</div>
        <div class="sq sq-purple">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#a78bfa,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/yahoo-fantasy.svg" class="sq-plat-logo" alt="Yahoo" /><span class="sq-sport-tag baseball">⚾ MLB Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Roto leagues<br/>deserve real<br/><span style="color:#a78bfa">power<br/>rankings.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="baseball" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 14 · YAHOO HOCKEY -->
      <div class="post-wrap">
        <div class="post-label">14 · Yahoo · Hockey</div>
        <div class="sq sq-purple">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#a78bfa,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/yahoo-fantasy.svg" class="sq-plat-logo" alt="Yahoo" /><span class="sq-sport-tag hockey">🏒 NHL Fantasy</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Fantasy hockey<br/>power rankings<br/><span style="color:#a78bfa">finally exist.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="hockey" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 15 · LEAGUE HISTORY -->
      <div class="post-wrap">
        <div class="post-label">15 · League History</div>
        <div class="sq sq-dark">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-eyebrow">🏆 All-Time Records</div>
            <div class="sq-hl" style="font-size:52px">Your group<br/>chat has<br/><span class="gold">receipts.</span><br/>It just doesn't<br/>know it yet.</div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="history" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 16 · COMMISSIONER -->
      <div class="post-wrap">
        <div class="post-label">16 · Commissioner</div>
        <div class="sq sq-dark">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-eyebrow">For Commissioners</div>
            <div class="sq-hl" style="font-size:52px">Your league<br/>goes quiet<br/>after week 8.<br/><span class="gold">Fix that.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="compact" />
            </div>
            <div class="sq-cta-pill" style="margin-top:14px">Free to try →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 17 · TRASH TALK -->
      <div class="post-wrap">
        <div class="post-label">17 · Trash Talk</div>
        <div class="sq sq-fire">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#ef4444,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-hl" style="font-size:68px;line-height:0.92">Stop<br/>arguing.<br/><span style="color:#ef4444">Post the<br/>receipts.</span></div>
            <div class="fan-wrap" style="margin-top:20px">
              <FanCards variant="h2h" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 18 · FREE CTA -->
      <div class="post-wrap">
        <div class="post-label">18 · Free CTA</div>
        <div class="sq sq-dark">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-hl" style="font-size:56px">Your league<br/>deserves<br/><span class="gold">better<br/>content.</span></div>
            <div class="fan-wrap" style="margin-top:14px">
              <FanCards variant="compact" />
            </div>
            <div class="sq-plats" style="margin-top:16px">
              <img src="/sleeper.svg" class="sq-plat-inline" alt="Sleeper" />
              <img src="/espn-logo.svg" class="sq-plat-inline" alt="ESPN" />
              <img src="/yahoo-fantasy.svg" class="sq-plat-inline" alt="Yahoo" />
            </div>
            <div class="sq-cta-pill" style="margin-top:14px;font-size:15px;padding:13px 28px">Connect Your League Free →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, h } from 'vue'


// ── Team SVG icon lookup ──────────────────────────────────────────────────
const teamIcons: Record<string, string> = {
  'Mahomes Magic': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="mm-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1200"/><stop offset="100%" stop-color="#0a0800"/></linearGradient><linearGradient id="mm-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fde68a"/><stop offset="100%" stop-color="#d97706"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#mm-bg)" stroke="#eab308" stroke-width="1.2"/><path d="M9 20 L9 14 L12 17 L16 12 L20 17 L23 14 L23 20 Z" fill="url(#mm-gold)"/><rect x="9" y="20" width="14" height="2.5" rx="1" fill="url(#mm-gold)"/><circle cx="16" cy="12" r="1.2" fill="#fff" opacity="0.9"/><circle cx="9" cy="14" r="0.8" fill="#fff" opacity="0.7"/><circle cx="23" cy="14" r="0.8" fill="#fff" opacity="0.7"/></svg>`,
  'Trash Can Wins': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tc-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#022c22"/><stop offset="100%" stop-color="#011a14"/></linearGradient><linearGradient id="tc-gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#059669"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#tc-bg)" stroke="#10b981" stroke-width="1.2"/><rect x="10" y="9" width="12" height="2" rx="1" fill="url(#tc-gr)"/><rect x="13" y="7" width="6" height="2.5" rx="1" fill="url(#tc-gr)"/><path d="M11 11 L12 23 L20 23 L21 11 Z" fill="url(#tc-gr)" opacity="0.9"/><line x1="14" y1="13" x2="14" y2="21" stroke="#022c22" stroke-width="1.2"/><line x1="18" y1="13" x2="18" y2="21" stroke="#022c22" stroke-width="1.2"/></svg>`,
  'The Algorithm': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ai-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#0f0e2e"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#ai-bg)" stroke="#6366f1" stroke-width="1.2"/><rect x="11" y="11" width="10" height="10" rx="1.5" fill="none" stroke="#6366f1" stroke-width="1.5"/><rect x="13" y="13" width="6" height="6" rx="1" fill="#6366f1" opacity="0.3"/><line x1="8" y1="13" x2="11" y2="13" stroke="#818cf8" stroke-width="1.2"/><line x1="8" y1="16" x2="11" y2="16" stroke="#818cf8" stroke-width="1.2"/><line x1="8" y1="19" x2="11" y2="19" stroke="#818cf8" stroke-width="1.2"/><line x1="21" y1="13" x2="24" y2="13" stroke="#818cf8" stroke-width="1.2"/><line x1="21" y1="16" x2="24" y2="16" stroke="#818cf8" stroke-width="1.2"/><line x1="21" y1="19" x2="24" y2="19" stroke="#818cf8" stroke-width="1.2"/><circle cx="16" cy="16" r="1.5" fill="#818cf8"/></svg>`,
  'Waiver Wire Kid': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ww-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2d0a0a"/><stop offset="100%" stop-color="#1a0505"/></linearGradient><linearGradient id="ww-bolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fca5a5"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#ww-bg)" stroke="#ef4444" stroke-width="1.2"/><path d="M19 8 L13 17 L17 17 L13 26 L21 15 L17 15 Z" fill="url(#ww-bolt)"/></svg>`,
  'Bench Boss': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bb-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0c1a1f"/><stop offset="100%" stop-color="#060f12"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#bb-bg)" stroke="#06b6d4" stroke-width="1.2"/><rect x="10" y="10" width="12" height="14" rx="1.5" fill="none" stroke="#06b6d4" stroke-width="1.3"/><rect x="13" y="8" width="6" height="3" rx="1.5" fill="#06b6d4" opacity="0.8"/><line x1="12" y1="15" x2="20" y2="15" stroke="#06b6d4" stroke-width="1" opacity="0.7"/><line x1="12" y1="18" x2="20" y2="18" stroke="#06b6d4" stroke-width="1" opacity="0.7"/><line x1="12" y1="21" x2="16" y2="21" stroke="#06b6d4" stroke-width="1" opacity="0.7"/><path d="M17 20 L19 22 L22 18" stroke="#06b6d4" stroke-width="1.3" fill="none" stroke-linecap="round"/></svg>`,
  'Toilet Bowl FC': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tb-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1f2937"/><stop offset="100%" stop-color="#111827"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#tb-bg)" stroke="#4b5563" stroke-width="1.2"/><ellipse cx="16" cy="14" rx="6" ry="6" fill="#4b5563" opacity="0.8"/><rect x="12" y="18" width="8" height="4" rx="1" fill="#4b5563" opacity="0.7"/><ellipse cx="13.5" cy="13" rx="1.8" ry="2" fill="#111827"/><ellipse cx="18.5" cy="13" rx="1.8" ry="2" fill="#111827"/><path d="M15.5 16 L16 17.5 L16.5 16" fill="#111827" opacity="0.6"/><line x1="13" y1="20" x2="13" y2="22" stroke="#111827" stroke-width="1"/><line x1="15.5" y1="20" x2="15.5" y2="22" stroke="#111827" stroke-width="1"/><line x1="18" y1="20" x2="18" y2="22" stroke="#111827" stroke-width="1"/></svg>`,
  'Hoop Dreams FC': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hd-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#431407"/><stop offset="100%" stop-color="#270a04"/></linearGradient><linearGradient id="hd-ball" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fb923c"/><stop offset="100%" stop-color="#c2410c"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#hd-bg)" stroke="#f97316" stroke-width="1.2"/><circle cx="16" cy="16" r="7.5" fill="url(#hd-ball)"/><path d="M8.5 16 Q12 12 16 16 Q20 20 23.5 16" stroke="#7c2d12" stroke-width="1.2" fill="none"/><path d="M8.5 16 Q12 20 16 16 Q20 12 23.5 16" stroke="#7c2d12" stroke-width="1.2" fill="none"/><line x1="16" y1="8.5" x2="16" y2="23.5" stroke="#7c2d12" stroke-width="1.2"/></svg>`,
  'Buckets Brigade': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bk-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0a1a1f"/><stop offset="100%" stop-color="#050f12"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#bk-bg)" stroke="#06b6d4" stroke-width="1.2"/><ellipse cx="16" cy="13" rx="6.5" ry="1.8" fill="none" stroke="#06b6d4" stroke-width="1.8"/><path d="M9.5 13 L11 22 L21 22 L22.5 13" fill="none" stroke="#06b6d4" stroke-width="1" opacity="0.7"/><line x1="13" y1="13" x2="13.5" y2="22" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/><line x1="16" y1="14.5" x2="16" y2="22" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/><line x1="19" y1="13" x2="18.5" y2="22" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/><path d="M10.5 16.5 Q16 15 21.5 16.5" fill="none" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/><path d="M11 19.5 Q16 18 21 19.5" fill="none" stroke="#06b6d4" stroke-width="0.8" opacity="0.5"/></svg>`,
  'Diamond Kings': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="dk-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1200"/><stop offset="100%" stop-color="#0a0800"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#dk-bg)" stroke="#eab308" stroke-width="1.2"/><polygon points="16,8 22,14 16,20 10,14" fill="none" stroke="#eab308" stroke-width="1.5"/><rect x="14.5" y="6.5" width="3" height="3" rx="0.5" fill="#eab308" transform="rotate(45 16 8)"/><rect x="20.5" y="12.5" width="2.5" height="2.5" rx="0.5" fill="#eab308" opacity="0.8" transform="rotate(45 22 14)"/><rect x="14.5" y="18.5" width="2.5" height="2.5" rx="0.5" fill="#eab308" opacity="0.8" transform="rotate(45 16 20)"/><rect x="8.5" y="12.5" width="2.5" height="2.5" rx="0.5" fill="#eab308" opacity="0.8" transform="rotate(45 10 14)"/><circle cx="16" cy="14" r="1.5" fill="#eab308" opacity="0.6"/></svg>`,
  'Roto Renegades': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rr-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0c1a3d"/><stop offset="100%" stop-color="#060e22"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#rr-bg)" stroke="#3b82f6" stroke-width="1.2"/><path d="M16 8 A8 8 0 0 1 22 20" stroke="#3b82f6" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M16 24 A8 8 0 0 1 10 12" stroke="#3b82f6" stroke-width="2" fill="none" stroke-linecap="round"/><polygon points="22,20 19,22 24,23" fill="#3b82f6"/><polygon points="10,12 13,10 8,9" fill="#3b82f6"/><circle cx="16" cy="16" r="2.5" fill="#3b82f6" opacity="0.5"/></svg>`,
  'Ice Cold Killers': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ick-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#071a2f"/><stop offset="100%" stop-color="#030f1c"/></linearGradient><linearGradient id="ick-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#bae6fd"/><stop offset="100%" stop-color="#0284c7"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#ick-bg)" stroke="#eab308" stroke-width="1.2"/><line x1="16" y1="7" x2="16" y2="25" stroke="url(#ick-s)" stroke-width="2"/><line x1="7" y1="16" x2="25" y2="16" stroke="url(#ick-s)" stroke-width="2"/><line x1="9.5" y1="9.5" x2="22.5" y2="22.5" stroke="url(#ick-s)" stroke-width="1.5"/><line x1="22.5" y1="9.5" x2="9.5" y2="22.5" stroke="url(#ick-s)" stroke-width="1.5"/><line x1="16" y1="7" x2="13" y2="10" stroke="url(#ick-s)" stroke-width="1.2"/><line x1="16" y1="7" x2="19" y2="10" stroke="url(#ick-s)" stroke-width="1.2"/><line x1="16" y1="25" x2="13" y2="22" stroke="url(#ick-s)" stroke-width="1.2"/><line x1="16" y1="25" x2="19" y2="22" stroke="url(#ick-s)" stroke-width="1.2"/><circle cx="16" cy="16" r="2.5" fill="url(#ick-s)"/></svg>`,
  'Puck Renegades': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pr2-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a0d3d"/><stop offset="100%" stop-color="#0e0722"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#pr2-bg)" stroke="#a78bfa" stroke-width="1.2"/><path d="M10 8 L10 20 Q10 23 14 23 L21 23" stroke="#a78bfa" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="19" cy="22" rx="4" ry="1.8" fill="#7c3aed" opacity="0.8"/><ellipse cx="19" cy="21.2" rx="4" ry="1.8" fill="#a78bfa"/></svg>`,
  'Hat Trick Heroes': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="hth-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#071a1f"/><stop offset="100%" stop-color="#030f12"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#hth-bg)" stroke="#06b6d4" stroke-width="1.2"/><polygon points="9,14 10,11 11,14 14,14 11.5,16 12.5,19 10,17 7.5,19 8.5,16 6,14" fill="#06b6d4"/><polygon points="16,13 16.8,10.5 17.6,13 20.2,13 18,14.5 18.8,17 16,15.5 13.2,17 14,14.5 11.8,13" fill="#22d3ee"/><polygon points="23,14 24,11 25,14 28,14 25.5,16 26.5,19 24,17 21.5,19 22.5,16 20,14" fill="#06b6d4"/></svg>`,
  'The Dynasty': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="dyn-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1200"/><stop offset="100%" stop-color="#0d0a00"/></linearGradient><linearGradient id="dyn-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fde68a"/><stop offset="100%" stop-color="#b45309"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#dyn-bg)" stroke="url(#dyn-g)" stroke-width="1.5"/><ellipse cx="9" cy="12" rx="1.5" ry="2.5" fill="#d97706" opacity="0.6" transform="rotate(-20 9 12)"/><ellipse cx="9.5" cy="16" rx="1.5" ry="2.5" fill="#d97706" opacity="0.6" transform="rotate(-10 9.5 16)"/><ellipse cx="10.5" cy="20" rx="1.5" ry="2" fill="#d97706" opacity="0.5" transform="rotate(10 10.5 20)"/><ellipse cx="23" cy="12" rx="1.5" ry="2.5" fill="#d97706" opacity="0.6" transform="rotate(20 23 12)"/><ellipse cx="22.5" cy="16" rx="1.5" ry="2.5" fill="#d97706" opacity="0.6" transform="rotate(10 22.5 16)"/><ellipse cx="21.5" cy="20" rx="1.5" ry="2" fill="#d97706" opacity="0.5" transform="rotate(-10 21.5 20)"/><text x="16" y="20" text-anchor="middle" font-size="9" font-weight="900" fill="url(#dyn-g)" font-family="Georgia,serif">I</text></svg>`,
  'Purple People': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pp-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a0d3d"/><stop offset="100%" stop-color="#0e0722"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#pp-bg)" stroke="#a78bfa" stroke-width="1.2"/><circle cx="16" cy="12" r="4" fill="#a78bfa" opacity="0.8"/><path d="M8 24 Q8 17 16 17 Q24 17 24 24" fill="#a78bfa" opacity="0.7"/></svg>`,
  'Green Machine': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gm-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#022c22"/><stop offset="100%" stop-color="#011a14"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#gm-bg)" stroke="#10b981" stroke-width="1.2"/><path d="M16 8 L24 13 L24 21 L16 26 L8 21 L8 13 Z" fill="none" stroke="#10b981" stroke-width="1.5"/><text x="16" y="20" text-anchor="middle" font-size="8" font-weight="900" fill="#10b981" font-family="Impact,sans-serif">GM</text></svg>`,
  'The Sluggers': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sl-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#022c22"/><stop offset="100%" stop-color="#011a14"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#sl-bg)" stroke="#10b981" stroke-width="1.2"/><rect x="14" y="6" width="4" height="16" rx="2" fill="#10b981" transform="rotate(-35 16 16)"/><circle cx="9" cy="22" r="3" fill="#10b981" opacity="0.7"/></svg>`,
  'Bases Loaded FC': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bl-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1200"/><stop offset="100%" stop-color="#0a0800"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#bl-bg)" stroke="#eab308" stroke-width="1.2"/><rect x="13.5" y="7" width="5" height="5" rx="0.8" fill="#eab308" transform="rotate(45 16 9.5)"/><rect x="8" y="13" width="4.5" height="4.5" rx="0.8" fill="#eab308" opacity="0.7" transform="rotate(45 10 15)"/><rect x="19.5" y="13" width="4.5" height="4.5" rx="0.8" fill="#eab308" opacity="0.7" transform="rotate(45 22 15)"/><circle cx="16" cy="18" r="2" fill="#eab308" opacity="0.5"/></svg>`,
  'Ankle Takers': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="at-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a0d3d"/><stop offset="100%" stop-color="#0e0722"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#at-bg)" stroke="#8b5cf6" stroke-width="1.2"/><path d="M10 22 Q10 14 16 12 Q22 10 23 15 Q24 20 19 21 L16 24 Z" fill="#8b5cf6" opacity="0.8"/><circle cx="16" cy="11" r="3" fill="#8b5cf6" opacity="0.6"/></svg>`,
}


// ── Reusable fan-of-3-cards component ──────────────────────────────────────
const FanCards = defineComponent({
  props: { variant: { type: String, default: 'default' } },
  setup(props) {
    return () => {
      const v = props.variant

      // Card data per variant
      const cards = {
        default: [
          { title: '⚡ Power Rankings', wk: 'WK 11', accent: '#eab308', rows: [
            { rk: '1', name: 'Mahomes Magic', pts: '142.6', chg: '▲2', up: true, dot: '#eab308' },
            { rk: '2', name: 'Trash Can Wins', pts: '128.4', chg: '▲1', up: true, dot: '#10b981' },
            { rk: '3', name: 'The Algorithm', pts: '119.3', chg: '▼1', up: false, dot: '#6366f1' },
          ]},
          { title: '⚔️ Matchup', wk: 'LIVE', accent: '#06b6d4', matchup: true,
            t1: { name: 'Mahomes Magic', score: '142.6', dot: '#eab308', pct: 72 },
            t2: { name: 'Trash Can Wins', score: '119.3', dot: '#3b82f6', pct: 28 }
          },
          { title: '🏆 Legacy', wk: 'ALL TIME', accent: '#eab308', rows: [
            { rk: '1', name: 'Mahomes Magic', pts: '1,847', dot: '#eab308', up: true },
            { rk: '2', name: 'Trash Can Wins', pts: '1,623', dot: '#10b981', up: true },
            { rk: '3', name: 'The Algorithm', pts: '1,401', dot: '#6366f1', up: false },
          ]},
        ],
        pr: [
          { title: '⚡ Power Rankings', wk: 'WK 11', accent: '#eab308', rows: [
            { rk: '1', name: 'Mahomes Magic', pts: '142.6', chg: '▲2', up: true, dot: '#eab308' },
            { rk: '2', name: 'Trash Can Wins', pts: '128.4', chg: '▲1', up: true, dot: '#10b981' },
            { rk: '3', name: 'The Algorithm', pts: '119.3', chg: '▼1', up: false, dot: '#6366f1' },
          ]},
          { title: '⚡ Power Rankings', wk: 'WK 10', accent: '#eab308', rows: [
            { rk: '1', name: 'Trash Can Wins', pts: '138.2', chg: '▲3', up: true, dot: '#10b981' },
            { rk: '2', name: 'Mahomes Magic', pts: '131.4', chg: '▼1', up: false, dot: '#eab308' },
            { rk: '3', name: 'Waiver Wire Kid', pts: '124.1', chg: '▲2', up: true, dot: '#ef4444' },
          ]},
          { title: '⚡ Power Rankings', wk: 'WK 9', accent: '#eab308', rows: [
            { rk: '1', name: 'Waiver Wire Kid', pts: '148.7', chg: '▲4', up: true, dot: '#ef4444' },
            { rk: '2', name: 'The Algorithm', pts: '136.2', chg: '▲1', up: true, dot: '#6366f1' },
            { rk: '3', name: 'Mahomes Magic', pts: '128.9', chg: '▼2', up: false, dot: '#eab308' },
          ]},
        ],
        wp: [
          { title: '⚔️ Matchup', wk: 'LIVE', accent: '#06b6d4', matchup: true,
            t1: { name: 'Mahomes Magic', score: '142.6', dot: '#eab308', pct: 72 },
            t2: { name: 'Trash Can Wins', score: '119.3', dot: '#3b82f6', pct: 28 }
          },
          { title: '⚔️ Matchup', wk: 'LIVE', accent: '#06b6d4', matchup: true,
            t1: { name: 'The Algorithm', score: '88.4', dot: '#6366f1', pct: 61 },
            t2: { name: 'Waiver Wire Kid', score: '71.2', dot: '#ef4444', pct: 39 }
          },
          { title: '⚔️ Matchup', wk: 'LIVE', accent: '#06b6d4', matchup: true,
            t1: { name: 'Bench Boss', score: '64.1', dot: '#06b6d4', pct: 44 },
            t2: { name: 'Toilet Bowl FC', score: '58.9', dot: '#4b5563', pct: 56 }
          },
        ],
        draft: [
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#8b5cf6', draftRows: [
            { pick: '1.03', name: 'Justin Jefferson', pos: 'WR', par: '+42.1', grade: 'A+', gold: true },
            { pick: '2.14', name: 'Davante Adams', pos: 'WR', par: '+18.7', grade: 'A', green: true },
            { pick: '5.51', name: 'Stefon Diggs', pos: 'WR', par: '-11.8', grade: 'D', bust: true },
          ]},
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#8b5cf6', draftRows: [
            { pick: '1.01', name: 'CeeDee Lamb', pos: 'WR', par: '+38.2', grade: 'A+', gold: true },
            { pick: '2.08', name: 'Derrick Henry', pos: 'RB', par: '+22.1', grade: 'A', green: true },
            { pick: '3.04', name: 'Saquon Barkley', pos: 'RB', par: '-31.4', grade: 'D', bust: true },
          ]},
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#8b5cf6', draftRows: [
            { pick: '1.05', name: 'Tyreek Hill', pos: 'WR', par: '+28.6', grade: 'A+', gold: true },
            { pick: '4.02', name: 'Travis Kelce', pos: 'TE', par: '+31.4', grade: 'A+', gold: true },
            { pick: '3.11', name: 'Tony Pollard', pos: 'RB', par: '-4.2', grade: 'C', neutral: true },
          ]},
        ],
        history: [
          { title: '🏆 Legacy Standings', wk: 'ALL TIME', accent: '#eab308', rows: [
            { rk: '1', name: 'Mahomes Magic', pts: '1,847', dot: '#eab308', up: true },
            { rk: '2', name: 'Trash Can Wins', pts: '1,623', dot: '#10b981', up: false },
            { rk: '3', name: 'The Algorithm', pts: '1,401', dot: '#6366f1', up: false },
          ]},
          { title: '⚔️ H2H All-Time', wk: 'ALL TIME', accent: '#eab308', h2h: true },
          { title: '🏅 Season Awards', wk: 'HISTORY', accent: '#eab308', awards: true },
        ],
        h2h: [
          { title: '⚔️ H2H Records', wk: 'ALL TIME', accent: '#ef4444', h2h: true },
          { title: '🏆 Championships', wk: 'ALL TIME', accent: '#eab308', rows: [
            { rk: '🏆', name: 'Mahomes Magic', pts: '3 titles', dot: '#eab308', up: true },
            { rk: '🥈', name: 'Trash Can Wins', pts: '1 title', dot: '#10b981', up: false },
            { rk: '0', name: 'Toilet Bowl FC', pts: '0 titles', dot: '#4b5563', up: false },
          ]},
          { title: '📊 Season Finishes', wk: 'HISTORY', accent: '#6366f1', rows: [
            { rk: '1', name: 'Mahomes Magic', pts: 'Avg 1.3', dot: '#eab308', up: true },
            { rk: '2', name: 'Trash Can Wins', pts: 'Avg 2.0', dot: '#10b981', up: false },
            { rk: '3', name: 'The Algorithm', pts: 'Avg 3.0', dot: '#6366f1', up: false },
          ]},
        ],
        bball: [
          { title: '⚡ Power Rankings', wk: 'WK 8', accent: '#f97316', rows: [
            { rk: '1', name: 'Hoop Dreams FC', pts: '8.2', chg: '▲1', up: true, dot: '#f97316' },
            { rk: '2', name: 'Buckets Brigade', pts: '7.4', chg: '—', up: false, dot: '#06b6d4' },
            { rk: '3', name: 'Ankle Takers', pts: '6.8', chg: '▼1', up: false, dot: '#8b5cf6' },
          ]},
          { title: '⚔️ Matchup', wk: 'LIVE', accent: '#f97316', matchup: true,
            t1: { name: 'Hoop Dreams', score: '6W-3L', dot: '#f97316', pct: 64 },
            t2: { name: 'Buckets FC', score: '5W-4L', dot: '#3b82f6', pct: 36 }
          },
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#f97316', draftRows: [
            { pick: '1.02', name: 'Nikola Jokic', pos: 'C', par: '+44.1', grade: 'A+', gold: true },
            { pick: '2.11', name: 'Luka Doncic', pos: 'PG', par: '+18.3', grade: 'A', green: true },
            { pick: '3.04', name: 'Kawhi Leonard', pos: 'SF', par: '-12.8', grade: 'D', bust: true },
          ]},
        ],
        baseball: [
          { title: '⚡ Power Rankings', wk: 'WK 14', accent: '#3b82f6', rows: [
            { rk: '1', name: 'Diamond Kings', pts: '8.1', chg: '▲2', up: true, dot: '#eab308' },
            { rk: '2', name: 'Roto Renegades', pts: '7.1', chg: '▼1', up: false, dot: '#3b82f6' },
            { rk: '3', name: 'The Sluggers', pts: '6.4', chg: '▲1', up: true, dot: '#10b981' },
          ]},
          { title: '⚔️ Matchup', wk: 'WK 14', accent: '#3b82f6', matchup: true,
            t1: { name: 'Diamond Kings', score: '7W-2L', dot: '#eab308', pct: 69 },
            t2: { name: 'Roto Renegades', score: '5W-4L', dot: '#3b82f6', pct: 31 }
          },
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#3b82f6', draftRows: [
            { pick: '1.01', name: 'Ronald Acuña Jr', pos: 'OF', par: '+51.2', grade: 'A+', gold: true },
            { pick: '2.05', name: 'Mookie Betts', pos: 'OF', par: '+22.7', grade: 'A', green: true },
            { pick: '4.03', name: 'Jose Abreu', pos: '1B', par: '-8.4', grade: 'C', neutral: true },
          ]},
        ],
        hockey: [
          { title: '⚡ Power Rankings', wk: 'WK 12', accent: '#a78bfa', rows: [
            { rk: '1', name: 'Ice Cold Killers', pts: '7.6', chg: '▲1', up: true, dot: '#eab308' },
            { rk: '2', name: 'Puck Renegades', pts: '6.8', chg: '—', up: false, dot: '#a78bfa' },
            { rk: '3', name: 'Hat Trick Heroes', pts: '6.1', chg: '▼1', up: false, dot: '#06b6d4' },
          ]},
          { title: '⚔️ Matchup', wk: 'LIVE', accent: '#a78bfa', matchup: true,
            t1: { name: 'Ice Cold Killers', score: '5W-2L', dot: '#eab308', pct: 67 },
            t2: { name: 'Puck Renegades', score: '4W-3L', dot: '#a78bfa', pct: 33 }
          },
          { title: '🏆 Legacy', wk: 'ALL TIME', accent: '#a78bfa', rows: [
            { rk: '1', name: 'Ice Cold Killers', pts: '1,642', dot: '#eab308', up: true },
            { rk: '2', name: 'Puck Renegades', pts: '1,489', dot: '#a78bfa', up: false },
            { rk: '3', name: 'Hat Trick Heroes', pts: '1,271', dot: '#06b6d4', up: false },
          ]},
        ],
        compact: [
          { title: '⚡ Power Rankings', wk: 'WK 11', accent: '#eab308', rows: [
            { rk: '1', name: 'Mahomes Magic', pts: '142.6', chg: '▲2', up: true, dot: '#eab308' },
            { rk: '2', name: 'Trash Can Wins', pts: '128.4', chg: '▲1', up: true, dot: '#10b981' },
            { rk: '3', name: 'The Algorithm', pts: '119.3', chg: '▼1', up: false, dot: '#6366f1' },
          ]},
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#8b5cf6', draftRows: [
            { pick: '1.03', name: 'Justin Jefferson', pos: 'WR', par: '+42.1', grade: 'A+', gold: true },
            { pick: '2.14', name: 'Davante Adams', pos: 'WR', par: '+18.7', grade: 'A', green: true },
            { pick: '5.51', name: 'Stefon Diggs', pos: 'WR', par: '-11.8', grade: 'D', bust: true },
          ]},
          { title: '🏆 Legacy', wk: 'ALL TIME', accent: '#eab308', rows: [
            { rk: '1', name: 'Mahomes Magic', pts: '1,847', dot: '#eab308', up: true },
            { rk: '2', name: 'Trash Can Wins', pts: '1,623', dot: '#10b981', up: false },
            { rk: '3', name: 'The Algorithm', pts: '1,401', dot: '#6366f1', up: false },
          ]},
        ],
      }

      const cardSet = (cards as any)[v] || cards.default

      const renderRow = (r: any) => h('div', { class: `fc-row${r.rk === '1' ? ' fc-gold-row' : ''}` }, [
        h('span', { class: `fc-rk${r.rk === '1' ? ' gold' : ''}` }, r.rk),
        h('span', { class: 'fc-team-icon', innerHTML: (teamIcons as any)[r.name] || `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="10" r="7" fill="${r.dot}"/></svg>` }),
        h('span', { class: 'fc-name' }, r.name),
        h('span', { class: `fc-pts${r.rk === '1' ? ' gold' : ''}` }, r.pts),
        r.chg ? h('span', { class: `fc-chg ${r.up ? 'up' : 'dn'}` }, r.chg) : null,
      ].filter(Boolean))

      const renderDraftRow = (r: any) => h('div', { class: `fc-dr-row${r.gold ? ' fc-gold-row' : r.bust ? ' fc-bust-row' : ''}` }, [
        h('span', { class: 'fc-dr-pick' }, r.pick),
        h('span', { class: 'fc-dr-name' }, r.name),
        h('span', { class: `fc-dr-pos ${r.pos?.toLowerCase()}` }, r.pos),
        h('span', { class: `fc-dr-par ${r.par?.startsWith('+') ? 'up' : 'dn'}` }, r.par),
        h('span', { class: `fc-dr-grade${r.gold ? ' gold' : r.green ? ' grn' : r.bust ? ' red' : ''}` }, r.grade),
      ])

      const renderMatchupCard = (card: any) => [
        h('div', { class: 'fc-mu-teams' }, [
          h('div', { class: 'fc-mu-team' }, [
            h('span', { class: 'fc-mu-icon', innerHTML: (teamIcons as any)[card.t1.name] || `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="${card.t1.dot}"/></svg>` }),
            h('div', { class: 'fc-mu-name' }, card.t1.name),
            h('div', { class: 'fc-mu-score gold' }, card.t1.score),
          ]),
          h('div', { class: 'fc-vs' }, 'VS'),
          h('div', { class: 'fc-mu-team' }, [
            h('span', { class: 'fc-mu-icon', innerHTML: (teamIcons as any)[card.t2.name] || `<svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="${card.t2.dot}"/></svg>` }),
            h('div', { class: 'fc-mu-name' }, card.t2.name),
            h('div', { class: 'fc-mu-score' }, card.t2.score),
          ]),
        ]),
        h('div', { class: 'fc-prob-wrap' }, [
          h('div', { class: 'fc-prob-bar' }, [ h('div', { class: 'fc-prob-fill', style: `width:${card.t1.pct}%` }) ]),
          h('div', { class: 'fc-prob-label' }, `${card.t1.pct}% win probability`),
        ]),
      ]

      const renderH2HCard = () => h('div', { class: 'fc-h2h' }, [
        h('div', { class: 'fc-h2h-row' }, [ h('div', { class: 'fc-h2h-lbl' }, ''), h('span', { class: 'fc-h2h-hd' }, 'MM'), h('span', { class: 'fc-h2h-hd' }, 'TC'), h('span', { class: 'fc-h2h-hd' }, 'TA') ]),
        h('div', { class: 'fc-h2h-row' }, [ h('div', { class: 'fc-h2h-lbl' }, 'Mahomes Magic'), h('span', { class: 'fc-h2h-cell self' }, '—'), h('span', { class: 'fc-h2h-cell win' }, '8-4'), h('span', { class: 'fc-h2h-cell win' }, '11-3') ]),
        h('div', { class: 'fc-h2h-row' }, [ h('div', { class: 'fc-h2h-lbl' }, 'Trash Can Wins'), h('span', { class: 'fc-h2h-cell loss' }, '4-8'), h('span', { class: 'fc-h2h-cell self' }, '—'), h('span', { class: 'fc-h2h-cell win' }, '7-5') ]),
        h('div', { class: 'fc-h2h-row' }, [ h('div', { class: 'fc-h2h-lbl' }, 'The Algorithm'), h('span', { class: 'fc-h2h-cell loss' }, '3-11'), h('span', { class: 'fc-h2h-cell loss' }, '5-7'), h('span', { class: 'fc-h2h-cell self' }, '—') ]),
      ])

      const renderAwardsCard = () => h('div', { class: 'fc-awards' }, [
        h('div', { class: 'fc-award-row' }, [ h('span', { class: 'fc-award-icon' }, '🏆'), h('span', { class: 'fc-award-label' }, 'Most Points Ever'), h('span', { class: 'fc-award-val gold' }, '187.4') ]),
        h('div', { class: 'fc-award-row' }, [ h('span', { class: 'fc-award-icon' }, '💀'), h('span', { class: 'fc-award-label' }, 'Worst Blowout'), h('span', { class: 'fc-award-val red' }, '-74.1') ]),
        h('div', { class: 'fc-award-row' }, [ h('span', { class: 'fc-award-icon' }, '😤'), h('span', { class: 'fc-award-label' }, 'Longest Drought'), h('span', { class: 'fc-award-val' }, '4 seasons') ]),
      ])

      const renderCard = (card: any, idx: number) => {
        const wkClass = card.wk === 'LIVE' ? 'fc-wk live' : 'fc-wk'
        const body = card.matchup ? renderMatchupCard(card)
          : card.h2h ? [renderH2HCard()]
          : card.awards ? [renderAwardsCard()]
          : card.draftRows ? card.draftRows.map(renderDraftRow)
          : (card.rows || []).map(renderRow)

        return h('div', { class: `fc fc-${idx}`, key: idx, style: `--card-accent:${card.accent}` }, [
          h('div', { class: 'fc-head' }, [
            h('span', { class: 'fc-badge' }, 'UFD'),
            h('span', { class: 'fc-title' }, card.title),
            h('span', { class: wkClass }, card.wk),
          ]),
          h('div', { class: 'fc-body' }, body),
          h('div', { class: 'fc-wm' }, 'ultimatefantasydashboard.com'),
        ])
      }

      return h('div', { class: 'fan-container' },
        cardSet.map((card: any, i: number) => renderCard(card, i))
      )
    }
  }
})
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.studio-root { min-height: 100vh; background: #030407; color: #f7f7ff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding-bottom: 80px; }

.studio-header { display: flex; align-items: center; gap: 20px; padding: 28px 40px; border-bottom: 1px solid #1e2130; background: linear-gradient(180deg, #0a0c14, #05060a); }
.studio-logo { height: 44px; object-fit: contain; }
.studio-header h1 { font-size: 24px; font-weight: 900; margin-bottom: 4px; letter-spacing: -0.02em; }
.studio-header p  { font-size: 13px; color: #6b7280; }
.section-label { font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #4b5563; padding: 28px 40px 14px; }

/* ── FACEBOOK BANNER ── */
.banner-stage { padding: 0 40px 48px; }
.fb-banner { width: 851px; height: 315px; background: #05060a; position: relative; overflow: hidden; border-radius: 6px; display: flex; align-items: center; box-shadow: 0 0 0 1px #1e2130, 0 32px 80px rgba(0,0,0,0.8); }
.fb-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(234,179,8,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,0.03) 1px, transparent 1px); background-size: 40px 40px; }
.fb-glow-1 { position: absolute; width: 380px; height: 380px; background: radial-gradient(circle, rgba(234,179,8,0.12) 0%, transparent 65%); top: -120px; left: 100px; pointer-events: none; }
.fb-glow-2 { position: absolute; width: 500px; height: 500px; background: radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 65%); bottom: -200px; right: 100px; pointer-events: none; }
.fb-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.2; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E"); background-size: 180px 180px; }
.fb-topline { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, #eab308 25%, #fbbf24 50%, #eab308 75%, transparent); }
.fb-left { position: relative; z-index: 20; width: 300px; flex-shrink: 0; display: flex; flex-direction: column; gap: 8px; padding: 24px 0 24px 30px; }
.fb-logo { width: 170px; height: auto; object-fit: contain; margin-bottom: 2px; }
.fb-headline { font-size: 28px; font-weight: 900; line-height: 1.08; letter-spacing: -0.02em; color: #fff; }
.fb-gold { color: #eab308; }
.fb-sub { font-size: 10px; color: #6b7280; line-height: 1.4; }
.fb-platforms { display: flex; gap: 8px; align-items: center; margin-top: 4px; }

.fb-plat-img { height: 22px; width: auto; object-fit: contain; filter: brightness(1.1); }
.fb-cards-area { position: absolute; right: -8px; top: 0; bottom: 0; width: 560px; }
.fb-cards-area::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 110px; background: linear-gradient(90deg, #05060a, transparent); z-index: 15; }
.fb-cards-area::after  { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 60px; background: linear-gradient(270deg, #05060a, transparent); z-index: 15; }
.fb-card { position: absolute; width: 210px; background: linear-gradient(145deg, #111420, #090c16); border: 1px solid #1e2130; border-radius: 12px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.9); font-size: 9px; }
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
.fbc-rk   { font-size: 8px; font-weight: 700; color: #4b5563; width: 8px; }
.fbc-rk.gold { color: #eab308; }
.fbc-icon { width: 16px; height: 16px; flex-shrink: 0; display: inline-flex; align-items: center; }
.fbc-icon :deep(svg) { width: 16px; height: 16px; }
.fbc-avatar-icon { width: 24px; height: 24px; flex-shrink: 0; display: inline-flex; align-items: center; }
.fbc-avatar-icon :deep(svg) { width: 24px; height: 24px; }
.fbc-dot  { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
.fbc-name { font-size: 8px; color: #d1d5db; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fbc-pts  { font-size: 8px; font-weight: 700; color: #9ca3af; }
.fbc-pts.gold { color: #eab308; }
.fbc-chg.up { font-size: 7px; color: #22c55e; font-weight: 700; }
.fbc-chg.dn { font-size: 7px; color: #ef4444; font-weight: 700; }
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

/* ── POSTS GRID ── */
.posts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px 40px; padding: 0 40px; }
.post-label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #4b5563; margin-bottom: 12px; }

/* Square */
.sq { width: 540px; height: 540px; position: relative; overflow: hidden; border-radius: 4px; box-shadow: 0 0 0 1px #1e2130, 0 20px 60px rgba(0,0,0,0.7); flex-shrink: 0; display: flex; flex-direction: column; }
.sq-dark   { background: radial-gradient(ellipse 120% 100% at 50% 0%, rgba(234,179,8,0.09) 0%, transparent 60%), linear-gradient(145deg,#05060a,#090c14); }
.sq-green  { background: radial-gradient(ellipse 120% 100% at 50% 20%, rgba(34,197,94,0.09) 0%, transparent 60%), linear-gradient(145deg,#040a06,#060e08); }
.sq-cyan   { background: radial-gradient(ellipse 120% 100% at 70% 80%, rgba(6,182,212,0.08) 0%, transparent 60%), linear-gradient(145deg,#040810,#080c18); }
.sq-purple { background: radial-gradient(ellipse 100% 80% at 50% 30%, rgba(139,92,246,0.09) 0%, transparent 60%), linear-gradient(145deg,#07050f,#0a0814); }
.sq-fire   { background: radial-gradient(ellipse 100% 80% at 50% 60%, rgba(239,68,68,0.09) 0%, transparent 60%), linear-gradient(145deg,#090404,#0f0506); }
.sq-orange { background: radial-gradient(ellipse 100% 80% at 50% 30%, rgba(249,115,22,0.09) 0%, transparent 60%), linear-gradient(145deg,#090604,#0f0a06); }
.sq-red    { background: radial-gradient(ellipse 100% 80% at 50% 20%, rgba(239,68,68,0.09) 0%, transparent 60%), linear-gradient(145deg,#090404,#0f0506); }
.sq-blue   { background: radial-gradient(ellipse 100% 80% at 50% 30%, rgba(59,130,246,0.08) 0%, transparent 60%), linear-gradient(145deg,#040810,#080c18); }

.sq-grain { position: absolute; inset: 0; pointer-events: none; z-index: 1; opacity: 0.25; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E"); background-size: 180px 180px; }
.sq-topline { position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 5; background: linear-gradient(90deg, transparent 0%, #eab308 25%, #fbbf24 50%, #eab308 75%, transparent 100%); }

/* UFD logo top of every square */
.sq-ufd-top { position: relative; z-index: 3; display: flex; justify-content: center; padding-top: 24px; padding-bottom: 2px; }
.sq-ufd-logo { height: 44px; width: auto; object-fit: contain; }

.sq-inner { position: relative; z-index: 2; flex: 1; display: flex; flex-direction: column; padding: 8px 36px 52px; }
.sq-inner.center { align-items: center; text-align: center; }

.sq-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #eab308; margin-bottom: 8px; }
.sq-hl { font-weight: 900; line-height: 1.0; letter-spacing: -0.02em; color: #fff; }
.sq-body { font-size: 14px; color: #6b7280; line-height: 1.5; margin-top: 8px; }
.gold { color: #eab308; }

.sq-cta-pill { display: inline-block; margin-top: 14px; padding: 10px 20px; background: rgba(234,179,8,0.12); border: 1px solid rgba(234,179,8,0.35); border-radius: 30px; color: #eab308; font-size: 13px; font-weight: 700; }
.sq-url { position: absolute; bottom: 16px; left: 0; right: 0; text-align: center; font-size: 11px; color: #1e2130; letter-spacing: 0.06em; z-index: 3; }

.sq-plat-sport-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.sq-plat-logo { height: 22px; width: auto; object-fit: contain; }
.sq-sport-tag { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 4px; }
.sq-sport-tag.football   { background: rgba(34,197,94,0.1);  border: 1px solid rgba(34,197,94,0.25);  color: #4ade80; }
.sq-sport-tag.basketball { background: rgba(249,115,22,0.1); border: 1px solid rgba(249,115,22,0.25); color: #fb923c; }
.sq-sport-tag.baseball   { background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25); color: #60a5fa; }
.sq-sport-tag.hockey     { background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.25); color: #a78bfa; }

.sq-plats { display: flex; gap: 12px; align-items: center; justify-content: center; }
.sq-plat-inline { height: 20px; width: auto; object-fit: contain; }

/* Launch special */
.sq-launch-badge { display: inline-block; padding: 5px 14px; border-radius: 20px; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.4); color: #22c55e; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; }
.sq-launch-card { display: flex; flex-direction: column; gap: 5px; width: 100%; margin: 10px 0; background: rgba(255,255,255,0.03); border: 1px solid rgba(34,197,94,0.15); border-radius: 10px; padding: 10px 14px; }
.sq-launch-line { display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: #d1d5db; }
.chk { color: #22c55e; font-weight: 900; font-size: 14px; }
.sq-launch-price-row { display: flex; align-items: center; gap: 12px; }
.sq-was { font-size: 12px; color: #4b5563; text-decoration: line-through; }
.sq-now { font-size: 22px; font-weight: 900; }
.sq-price-hero { display: flex; align-items: baseline; gap: 5px; padding: 12px 20px; background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.25); border-radius: 12px; margin: 12px 0; }
.ph-label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; }
.ph-price { font-size: 48px; font-weight: 900; color: #eab308; line-height: 1; }
.ph-season { font-size: 13px; color: #6b7280; }

/* ════════════════════════════════
   FAN OF 3 CARDS
════════════════════════════════ */
.fan-wrap { position: relative; z-index: 2; width: 100%; display: flex; justify-content: center; }

:deep(.fan-container) {
  position: relative;
  width: 280px;
  height: 155px;
  flex-shrink: 0;
}

/* Each card in the fan */
:deep(.fc) {
  position: absolute;
  width: 210px;
  background: linear-gradient(145deg, #0f1220, #090c18);
  border: 1px solid rgba(255,255,255,0.06);
  border-top-color: var(--card-accent, rgba(234,179,8,0.25));
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0,0,0,0.85);
  font-size: 9px;
}

/* Fan positions: card 0 = back left, card 1 = center front, card 2 = back right */
:deep(.fc-0) { left: 0px;  top: 10px; transform: rotate(-8deg); z-index: 1; opacity: 0.78; }
:deep(.fc-1) { left: 36px; top: 0px;  transform: rotate(-1deg); z-index: 3; border-color: var(--card-accent, rgba(234,179,8,0.3)); box-shadow: 0 16px 48px rgba(0,0,0,0.85), 0 0 30px rgba(234,179,8,0.07); }
:deep(.fc-2) { left: 72px; top: 12px; transform: rotate(6deg);  z-index: 2; opacity: 0.82; }

:deep(.fc-head) { display: flex; align-items: center; gap: 4px; padding: 6px 8px; border-bottom: 1px solid #1a1d28; background: rgba(0,0,0,0.25); }
:deep(.fc-badge) { font-size: 6px; font-weight: 900; background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.3); padding: 1px 4px; border-radius: 2px; }
:deep(.fc-title) { font-size: 7.5px; font-weight: 700; color: #d1d5db; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:deep(.fc-wk)    { font-size: 6.5px; color: #374151; background: #1a1d28; padding: 1px 4px; border-radius: 2px; font-weight: 700; flex-shrink: 0; }
:deep(.fc-wk.live) { color: #22c55e; background: rgba(34,197,94,0.1); }
:deep(.fc-body)  { padding: 2px 0; }
:deep(.fc-wm)    { font-size: 6px; color: #1e2130; text-align: center; padding: 3px 0 4px; }

/* Rows */
:deep(.fc-row) { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-bottom: 1px solid rgba(26,29,40,0.6); }
:deep(.fc-gold-row) { background: rgba(234,179,8,0.04); }
:deep(.fc-rk)  { font-size: 7.5px; font-weight: 700; color: #4b5563; width: 8px; }
:deep(.fc-rk.gold) { color: #eab308; }
:deep(.fc-team-icon) { width: 16px; height: 16px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; }
:deep(.fc-team-icon svg) { width: 16px; height: 16px; }
:deep(.fc-mu-icon) { width: 26px; height: 26px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; }
:deep(.fc-mu-icon svg) { width: 26px; height: 26px; }
:deep(.fc-dot) { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
:deep(.fc-name){ font-size: 7.5px; color: #d1d5db; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:deep(.fc-pts) { font-size: 7.5px; font-weight: 700; color: #9ca3af; }
:deep(.fc-pts.gold) { color: #eab308; }
:deep(.fc-chg) { font-size: 7px; font-weight: 700; }
:deep(.fc-chg.up) { color: #22c55e; }
:deep(.fc-chg.dn) { color: #ef4444; }

/* Matchup in fan card */
:deep(.fc-mu-teams) { display: flex; align-items: center; padding: 5px 8px 3px; }
:deep(.fc-mu-team)  { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
:deep(.fc-mu-dot)   { width: 18px; height: 18px; border-radius: 50%; }
:deep(.fc-mu-name)  { font-size: 6.5px; color: #9ca3af; text-align: center; line-height: 1.1; }
:deep(.fc-mu-score) { font-size: 11px; font-weight: 900; color: #e5e7eb; }
:deep(.fc-mu-score.gold) { color: #eab308; }
:deep(.fc-vs) { font-size: 7px; font-weight: 900; color: #374151; width: 14px; text-align: center; }
:deep(.fc-prob-wrap) { padding: 2px 8px 5px; }
:deep(.fc-prob-bar) { height: 3px; background: #1e2130; border-radius: 2px; overflow: hidden; margin-bottom: 3px; }
:deep(.fc-prob-fill){ height: 100%; background: linear-gradient(90deg,#eab308,#ca8a04); border-radius: 2px; }
:deep(.fc-prob-label){ font-size: 6.5px; color: #6b7280; text-align: center; }

/* Draft rows in fan card */
:deep(.fc-dr-row) { display: flex; align-items: center; gap: 4px; padding: 3.5px 8px; border-bottom: 1px solid rgba(26,29,40,0.6); }
:deep(.fc-bust-row) { background: rgba(239,68,68,0.04); }
:deep(.fc-dr-pick) { font-size: 6.5px; font-weight: 700; color: #4b5563; width: 26px; flex-shrink: 0; }
:deep(.fc-dr-name) { font-size: 7px; color: #e5e7eb; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:deep(.fc-dr-pos)  { font-size: 6px; font-weight: 800; padding: 1px 3px; border-radius: 2px; flex-shrink: 0; }
:deep(.fc-dr-pos.wr) { background: rgba(59,130,246,0.15); color: #60a5fa; }
:deep(.fc-dr-pos.rb) { background: rgba(34,197,94,0.15); color: #4ade80; }
:deep(.fc-dr-pos.te) { background: rgba(234,179,8,0.15); color: #eab308; }
:deep(.fc-dr-pos.c)  { background: rgba(249,115,22,0.15); color: #fb923c; }
:deep(.fc-dr-pos.pg) { background: rgba(139,92,246,0.15); color: #a78bfa; }
:deep(.fc-dr-pos.sf) { background: rgba(6,182,212,0.15); color: #06b6d4; }
:deep(.fc-dr-pos.of) { background: rgba(59,130,246,0.15); color: #60a5fa; }
:deep(.fc-dr-pos\31b) { background: rgba(34,197,94,0.15); color: #4ade80; }
:deep(.fc-dr-par) { font-size: 7px; font-weight: 700; width: 28px; text-align: right; flex-shrink: 0; }
:deep(.fc-dr-par.up) { color: #22c55e; }
:deep(.fc-dr-par.dn) { color: #ef4444; }
:deep(.fc-dr-grade) { font-size: 8px; font-weight: 900; width: 18px; text-align: right; flex-shrink: 0; color: #9ca3af; }
:deep(.fc-dr-grade.gold) { color: #eab308; }
:deep(.fc-dr-grade.grn)  { color: #22c55e; }
:deep(.fc-dr-grade.red)  { color: #ef4444; }

/* H2H in fan card */
:deep(.fc-h2h) { padding: 5px 8px 6px; }
:deep(.fc-h2h-row) { display: flex; gap: 3px; align-items: center; margin-bottom: 2px; }
:deep(.fc-h2h-lbl) { font-size: 6.5px; color: #6b7280; width: 62px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
:deep(.fc-h2h-hd)  { width: 28px; text-align: center; font-size: 6.5px; font-weight: 700; color: #4b5563; }
:deep(.fc-h2h-cell){ width: 28px; height: 16px; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 6.5px; font-weight: 700; }
:deep(.fc-h2h-cell.win)  { background: rgba(34,197,94,0.15); color: #4ade80; }
:deep(.fc-h2h-cell.loss) { background: rgba(239,68,68,0.12); color: #f87171; }
:deep(.fc-h2h-cell.self) { background: rgba(255,255,255,0.03); color: #374151; }

/* Awards in fan card */
:deep(.fc-awards) { padding: 5px 8px; }
:deep(.fc-award-row) { display: flex; align-items: center; gap: 5px; padding: 3px 0; border-bottom: 1px solid rgba(26,29,40,0.6); }
:deep(.fc-award-icon)  { font-size: 9px; flex-shrink: 0; }
:deep(.fc-award-label) { font-size: 7px; color: #9ca3af; flex: 1; }
:deep(.fc-award-val)   { font-size: 7.5px; font-weight: 700; color: #d1d5db; }
:deep(.fc-award-val.gold) { color: #eab308; }
:deep(.fc-award-val.red)  { color: #ef4444; }
</style>
