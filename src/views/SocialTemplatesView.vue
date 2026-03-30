<template>
  <div class="studio-root">

    <div v-if="!isEmbed" class="studio-header">
      <img src="/UFD_V8.png" alt="UFD" class="studio-logo" />
      <div>
        <h1>Social Media Studio</h1>
        <p>Screenshot any graphic below &nbsp;·&nbsp; <strong style="color:#eab308">ultimatefantasydashboard.com/socialtemplates</strong></p>
      </div>
    </div>

    <!-- ── Type Tabs ── -->
    <div class="type-tabs">
      <button @click="activeType='square'" :class="['type-tab', activeType==='square'?'type-tab-active':'']">
        <span>▪</span> Square Posts
      </button>
      <button @click="activeType='fb'" :class="['type-tab', activeType==='fb'?'type-tab-active':'']">
        <span>📘</span> FB Cover
      </button>
      <button @click="activeType='interactive'" :class="['type-tab', activeType==='interactive'?'type-tab-active':'']">
        <span>🎯</span> Interactive
      </button>
      <button @click="activeType='stories'" :class="['type-tab', activeType==='stories'?'type-tab-active':'']">
        <span>📱</span> Stories
      </button>
      <button @click="activeType='paidads'" :class="['type-tab', activeType==='paidads'?'type-tab-active':'']">
        <span>📣</span> Paid Ads
      </button>
    </div>

    <!-- FB COVER TAB -->
    <template v-if="activeType === 'fb'">
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
          <div class="fb-headline">Level up your<br/>fantasy baseball<br/><span class="fb-gold">all season.</span></div>
          <div class="fb-sub">Power rankings · Win probability · Draft grades · League history</div>
          <div class="fb-platforms">
            <img src="/espn-logo.svg" alt="ESPN" class="fb-plat-img" />
            <img src="/yahoo-fantasy.svg" alt="Yahoo" class="fb-plat-img" />
          </div>
        </div>

        <div class="fb-cards-area">
          <div class="fb-card fb-card-1">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">⚡ Power Rankings</span><span class="fbc-wk">WK 14</span></div>
            <div class="fbc-row fbc-gold"><span class="fbc-rk gold">1</span><span class="fbc-icon" v-html="teamIcons['Diamond Kings']"></span><span class="fbc-name">Diamond Kings</span><span class="fbc-pts gold">124.8</span><span class="fbc-chg up">▲2</span></div>
            <div class="fbc-row"><span class="fbc-rk">2</span><span class="fbc-icon" v-html="teamIcons['Sign Stealers']"></span><span class="fbc-name">Sign Stealers</span><span class="fbc-pts">116.2</span><span class="fbc-chg up">▲1</span></div>
            <div class="fbc-row"><span class="fbc-rk">3</span><span class="fbc-icon" v-html="teamIcons['Roto Renegades']"></span><span class="fbc-name">Roto Renegades</span><span class="fbc-pts">108.4</span><span class="fbc-chg dn">▼1</span></div>
            <div class="fbc-row"><span class="fbc-rk">4</span><span class="fbc-icon" v-html="teamIcons['The Sluggers']"></span><span class="fbc-name">The Sluggers</span><span class="fbc-pts">101.9</span><span class="fbc-chg dn">▼2</span></div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>
          <div class="fb-card fb-card-2">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">⚔️ Matchup Analysis</span><span class="fbc-wk live">● LIVE</span></div>
            <div class="fbc-matchup">
              <div class="fbc-team"><span class="fbc-avatar-icon" v-html="teamIcons['Diamond Kings']"></span><div class="fbc-tname">Diamond Kings</div><div class="fbc-score gold">124.8</div></div>
              <div class="fbc-vs">VS</div>
              <div class="fbc-team"><span class="fbc-avatar-icon" v-html="teamIcons['Sign Stealers']"></span><div class="fbc-tname">Sign Stealers</div><div class="fbc-score">104.1</div></div>
            </div>
            <div class="fbc-prob-wrap">
              <div class="fbc-prob-labels"><span class="gold">74% win prob</span><span>26%</span></div>
              <div class="fbc-prob-bar"><div class="fbc-prob-fill" style="width:74%"></div></div>
              <div class="fbc-prob-sub">Monte Carlo · 10,000 simulations</div>
            </div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>
          <div class="fb-card fb-card-3">
            <div class="fbc-head"><span class="fbc-badge">UFD</span><span class="fbc-title">🏆 Legacy Standings</span><span class="fbc-wk">ALL TIME</span></div>
            <div class="fbc-row fbc-gold"><span class="fbc-rk gold">1</span><span class="fbc-icon" v-html="teamIcons['Diamond Kings']"></span><span class="fbc-name">Diamond Kings</span><span class="fbc-pts gold">1,912</span></div>
            <div class="fbc-row"><span class="fbc-rk">2</span><span class="fbc-icon" v-html="teamIcons['Sign Stealers']"></span><span class="fbc-name">Sign Stealers</span><span class="fbc-pts">1,748</span></div>
            <div class="fbc-row"><span class="fbc-rk">3</span><span class="fbc-icon" v-html="teamIcons['Roto Renegades']"></span><span class="fbc-name">Roto Renegades</span><span class="fbc-pts">1,531</span></div>
            <div class="fbc-row"><span class="fbc-rk">4</span><span class="fbc-icon" v-html="teamIcons['The Sluggers']"></span><span class="fbc-name">The Sluggers</span><span class="fbc-pts">1,304</span></div>
            <div class="fbc-wm">ultimatefantasydashboard.com</div>
          </div>
        </div>
      </div>
    </div>

    </template><!-- end fb tab -->

    <!-- SQUARE TAB -->
    <template v-if="activeType === 'square'">
    <div class="section-label">📸 Social Post Graphics — Screenshot each individually</div>
    <div class="posts-grid">

      <!-- 1 · MAIN BRAND -->
      <div class="post-wrap">
        <div class="post-label">1 · Main Brand</div>
        <div class="sq sq-dark">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-eyebrow">Fantasy Baseball Analytics</div>
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
            <div class="sq-body" style="margin-top:10px;font-size:14px">ESPN · Yahoo<br/>Points · Roto · H2H Category</div>
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

      <!-- 7 · ESPN · BASEBALL — POWER RANKINGS -->
      <div class="post-wrap">
        <div class="post-label">7 · ESPN · Baseball — Power Rankings</div>
        <div class="sq sq-red">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#ef4444,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/espn-logo.svg" class="sq-plat-logo" alt="ESPN" /><span class="sq-sport-tag baseball">⚾ Fantasy Baseball</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Your ESPN<br/>baseball league<br/>has more data<br/>than you<br/><span style="color:#f87171">ever knew.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="pr" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 8 · ESPN + YAHOO · POINTS & CATEGORY -->
      <div class="post-wrap">
        <div class="post-label">8 · ESPN + Yahoo · Points &amp; Category</div>
        <div class="sq sq-blue">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#3b82f6,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/espn-logo.svg" class="sq-plat-logo" alt="ESPN" />
              <img src="/yahoo-fantasy.svg" class="sq-plat-logo" alt="Yahoo" style="margin-left:4px" />
              <span class="sq-sport-tag baseball" style="margin-left:6px">⚾ Fantasy Baseball</span>
            </div>
            <div class="sq-hl" style="font-size:42px;margin-top:10px">ESPN. Yahoo.<br/>Points leagues.<br/>Roto leagues.<br/>Category leagues.<br/><span style="color:#60a5fa">All of it.</span></div>
            <div class="fan-wrap" style="margin-top:14px">
              <FanCards variant="bball" />
            </div>
            <div class="sq-body" style="font-size:12px;margin-top:8px;color:#374151">Works for both platforms · All league types</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 9 · YAHOO · BASEBALL — HISTORY -->
      <div class="post-wrap">
        <div class="post-label">9 · Yahoo · Baseball — History</div>
        <div class="sq sq-purple">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#a78bfa,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/yahoo-fantasy.svg" class="sq-plat-logo" alt="Yahoo" /><span class="sq-sport-tag baseball">⚾ Fantasy Baseball</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">8 seasons of<br/>your Yahoo<br/>baseball league.<br/><span style="color:#a78bfa">One screen.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="history" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 10 · ESPN · BASEBALL — ANALYTICS -->
      <div class="post-wrap">
        <div class="post-label">10 · ESPN · Baseball — Analytics</div>
        <div class="sq sq-blue">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#3b82f6,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/espn-logo.svg" class="sq-plat-logo" alt="ESPN" /><span class="sq-sport-tag baseball">⚾ Fantasy Baseball</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Fantasy<br/>baseball<br/>analytics<br/>that actually<br/><span style="color:#60a5fa">slap.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="baseball" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 11 · DRAFT DAY BASEBALL -->
      <div class="post-wrap">
        <div class="post-label">11 · Draft Day Baseball</div>
        <div class="sq sq-purple">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#8b5cf6,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/espn-logo.svg" class="sq-plat-logo" alt="ESPN" />
              <img src="/yahoo-fantasy.svg" class="sq-plat-logo" alt="Yahoo" style="margin-left:4px" />
              <span class="sq-sport-tag baseball" style="margin-left:6px">⚾ Fantasy Baseball</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Draft day<br/>is where<br/>seasons are<br/>won. Or<br/><span style="color:#a78bfa">wasted.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="draft" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 12 · ROTO POWER RANKINGS -->
      <div class="post-wrap">
        <div class="post-label">12 · Roto Power Rankings</div>
        <div class="sq sq-dark">
          <div class="sq-grain"></div><div class="sq-topline"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/espn-logo.svg" class="sq-plat-logo" alt="ESPN" />
              <img src="/yahoo-fantasy.svg" class="sq-plat-logo" alt="Yahoo" style="margin-left:4px" />
              <span class="sq-sport-tag baseball" style="margin-left:6px">⚾ Fantasy Baseball</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Roto leagues<br/>deserve real<br/><span class="gold">power<br/>rankings.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="baseball" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 13 · YAHOO · BASEBALL — ROTO -->
      <div class="post-wrap">
        <div class="post-label">13 · Yahoo · Baseball — Roto</div>
        <div class="sq sq-purple">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#a78bfa,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/yahoo-fantasy.svg" class="sq-plat-logo" alt="Yahoo" /><span class="sq-sport-tag baseball">⚾ Fantasy Baseball</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Track every<br/>category.<br/>Climb every<br/><span style="color:#a78bfa">roto column.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="baseball" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 14 · CATEGORY LEAGUE EDGE -->
      <div class="post-wrap">
        <div class="post-label">14 · Category League Edge</div>
        <div class="sq sq-orange">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#f97316,transparent)"></div>
          <div class="sq-ufd-top"><img src="/UFD_V8.png" class="sq-ufd-logo" alt="UFD" /></div>
          <div class="sq-inner center">
            <div class="sq-plat-sport-header">
              <img src="/espn-logo.svg" class="sq-plat-logo" alt="ESPN" />
              <img src="/yahoo-fantasy.svg" class="sq-plat-logo" alt="Yahoo" style="margin-left:4px" />
              <span class="sq-sport-tag baseball" style="margin-left:6px">⚾ Fantasy Baseball</span>
            </div>
            <div class="sq-hl" style="font-size:50px;margin-top:10px">Win more<br/>categories.<br/>Stop leaving<br/><span style="color:#f97316">stats on<br/>the bench.</span></div>
            <div class="fan-wrap" style="margin-top:16px">
              <FanCards variant="bball" />
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
            <div class="sq-hl" style="font-size:52px">Your league<br/>dies after<br/>the All-Star<br/>break.<br/><span class="gold">Fix that.</span></div>
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
              <img src="/espn-logo.svg" class="sq-plat-inline" alt="ESPN" />
              <img src="/yahoo-fantasy.svg" class="sq-plat-inline" alt="Yahoo" />
            </div>
            <div class="sq-cta-pill" style="margin-top:14px;font-size:15px;padding:13px 28px">Connect Your League Free →</div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>


      <!-- ════════════════════════════════════
           SHOWCASE CARDS — Cards-only + logo
      ════════════════════════════════════ -->

      <!-- 19 · Power Rankings Showcase — with text -->
      <div class="post-wrap">
        <div class="post-label">19 · Power Rankings — Card Showcase (with text)</div>
        <div class="sq sq-showcase sq-sc-gold">
          <div class="sq-grain"></div>
          <div class="sq-topline"></div>
          <div class="sc-logo-row">
            <img src="/UFD_V8.png" class="sc-logo" alt="UFD" />
          </div>
          <div class="sc-fan-hero">
            <div class="sc-fan-scale">
              <FanCards variant="pr" />
            </div>
          </div>
          <div class="sc-feature-word sc-word-gold">POWER RANKINGS</div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 20 · Power Rankings Showcase — clean (no text) -->
      <div class="post-wrap">
        <div class="post-label">20 · Power Rankings — Card Showcase (clean)</div>
        <div class="sq sq-showcase sq-sc-gold">
          <div class="sq-grain"></div>
          <div class="sq-topline"></div>
          <div class="sc-logo-row sc-logo-center">
            <img src="/UFD_V8.png" class="sc-logo sc-logo-lg" alt="UFD" />
          </div>
          <div class="sc-fan-hero sc-fan-full">
            <div class="sc-fan-scale sc-fan-scale-lg">
              <FanCards variant="pr" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 21 · Matchup Showcase — with text -->
      <div class="post-wrap">
        <div class="post-label">21 · Matchup Analysis — Card Showcase (with text)</div>
        <div class="sq sq-showcase sq-sc-cyan">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#06b6d4,transparent)"></div>
          <div class="sc-logo-row">
            <img src="/UFD_V8.png" class="sc-logo" alt="UFD" />
          </div>
          <div class="sc-fan-hero">
            <div class="sc-fan-scale">
              <FanCards variant="wp" />
            </div>
          </div>
          <div class="sc-feature-word sc-word-cyan">MATCHUP ANALYSIS</div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 22 · Matchup Showcase — clean -->
      <div class="post-wrap">
        <div class="post-label">22 · Matchup Analysis — Card Showcase (clean)</div>
        <div class="sq sq-showcase sq-sc-cyan">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#06b6d4,transparent)"></div>
          <div class="sc-logo-row sc-logo-center">
            <img src="/UFD_V8.png" class="sc-logo sc-logo-lg" alt="UFD" />
          </div>
          <div class="sc-fan-hero sc-fan-full">
            <div class="sc-fan-scale sc-fan-scale-lg">
              <FanCards variant="wp" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 23 · Draft Grades Showcase — with text -->
      <div class="post-wrap">
        <div class="post-label">23 · Draft Grades — Card Showcase (with text)</div>
        <div class="sq sq-showcase sq-sc-purple">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#8b5cf6,transparent)"></div>
          <div class="sc-logo-row">
            <img src="/UFD_V8.png" class="sc-logo" alt="UFD" />
          </div>
          <div class="sc-fan-hero">
            <div class="sc-fan-scale">
              <FanCards variant="draft" />
            </div>
          </div>
          <div class="sc-feature-word sc-word-purple">DRAFT GRADES</div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 24 · Draft Grades Showcase — clean -->
      <div class="post-wrap">
        <div class="post-label">24 · Draft Grades — Card Showcase (clean)</div>
        <div class="sq sq-showcase sq-sc-purple">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#8b5cf6,transparent)"></div>
          <div class="sc-logo-row sc-logo-center">
            <img src="/UFD_V8.png" class="sc-logo sc-logo-lg" alt="UFD" />
          </div>
          <div class="sc-fan-hero sc-fan-full">
            <div class="sc-fan-scale sc-fan-scale-lg">
              <FanCards variant="draft" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 25 · League History Showcase — with text -->
      <div class="post-wrap">
        <div class="post-label">25 · League History — Card Showcase (with text)</div>
        <div class="sq sq-showcase sq-sc-amber">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#f59e0b,transparent)"></div>
          <div class="sc-logo-row">
            <img src="/UFD_V8.png" class="sc-logo" alt="UFD" />
          </div>
          <div class="sc-fan-hero">
            <div class="sc-fan-scale">
              <FanCards variant="history" />
            </div>
          </div>
          <div class="sc-feature-word sc-word-amber">LEAGUE HISTORY</div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <!-- 26 · League History Showcase — clean -->
      <div class="post-wrap">
        <div class="post-label">26 · League History — Card Showcase (clean)</div>
        <div class="sq sq-showcase sq-sc-amber">
          <div class="sq-grain"></div>
          <div class="sq-topline" style="background:linear-gradient(90deg,transparent,#f59e0b,transparent)"></div>
          <div class="sc-logo-row sc-logo-center">
            <img src="/UFD_V8.png" class="sc-logo sc-logo-lg" alt="UFD" />
          </div>
          <div class="sc-fan-hero sc-fan-full">
            <div class="sc-fan-scale sc-fan-scale-lg">
              <FanCards variant="history" />
            </div>
          </div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>


    <!-- ═══════════════════════════════════════════════════
         PHONE MOCKUP AD TEMPLATES — 30 & 31
    ═══════════════════════════════════════════════════ -->
    <div class="section-label" style="grid-column:1/-1;margin-top:32px;">📱 Phone Mockup Ad Templates</div>

    <!-- ═══════════════════════════════════════════════════
         PHONE MOCKUP AD TEMPLATES — 30 & 31
    ═══════════════════════════════════════════════════ -->
    <div class="section-label" style="grid-column:1/-1;margin-top:32px;">📱 Phone Mockup Ad Templates</div>

    <!-- ══ TEMPLATE 30: Story — Text above, phone centred, cards pop out ══ -->
    <div class="post-wrap" style="grid-column:1/-1;max-width:960px;">
      <div class="post-label">30 · Phone Ad Story — Pop-Out Cards (1080×1920)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Headline</div>
          <input v-model="ad30headline" placeholder="Know your league like never before." style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Sub Text</div>
          <input v-model="ad30sub" placeholder="Power rankings. Win probability. League history." style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Button Text</div>
          <input v-model="ad30btn" placeholder="Get League Pass →" style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;box-sizing:border-box;">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
          <div>
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Pop Left</div>
            <select v-model="ad30card1" style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:5px 6px;font-size:11px;">
              <option v-for="c in adCardOptions" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Phone Main</div>
            <select v-model="ad30card2" style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:5px 6px;font-size:11px;">
              <option v-for="c in adCardOptions" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </div>
          <div>
            <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Pop Right</div>
            <select v-model="ad30card3" style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:5px 6px;font-size:11px;">
              <option v-for="c in adCardOptions" :key="c.id" :value="c.id">{{ c.label }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 1080×1920 story scaled 28.125% → 304×540 display -->
      <div style="width:304px;height:540px;overflow:hidden;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.5);">
      <div style="width:1080px;height:1920px;background:#080a10;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.28125);">

        <!-- BG -->
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 80%,rgba(234,179,8,0.15) 0%,transparent 55%);"></div>
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 80% 10%,rgba(6,182,212,0.06) 0%,transparent 40%);"></div>
        <!-- Gold top bar -->
        <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,transparent,#eab308,transparent);"></div>

        <!-- TEXT BLOCK — top area, above phone, clear of IG profile overlay (top 220px safe) -->
        <div style="position:absolute;top:240px;left:80px;right:80px;">
          <div style="display:flex;align-items:center;gap:20px;margin-bottom:44px;">
            <img src="/UFD_V8.png" style="height:100px;width:auto;">
            <div>
              <div style="font-size:28px;font-weight:800;color:#eab308;letter-spacing:0.12em;text-transform:uppercase;">Ultimate Fantasy</div>
              <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:0.12em;text-transform:uppercase;">Dashboard</div>
            </div>
          </div>
          <div style="font-size:80px;font-weight:900;color:#ffffff;line-height:1.0;letter-spacing:-0.025em;margin-bottom:24px;">{{ ad30headline || 'Know your league like never before.' }}</div>
          <div style="font-size:32px;color:#9ca3af;line-height:1.5;margin-bottom:56px;">{{ ad30sub || 'Power rankings. Win probability. League history.' }}</div>
          <div style="display:inline-flex;">
            <div style="background:linear-gradient(135deg,#eab308,#ca8a04);color:#0a0c14;font-size:36px;font-weight:900;padding:28px 60px;border-radius:18px;letter-spacing:0.01em;">
              {{ ad30btn || 'Get League Pass →' }}
            </div>
          </div>
        </div>

        <!-- PHONE — lower half, centred, tilted left -->
        <div style="position:absolute;bottom:220px;left:50%;transform:translateX(-50%);width:920px;height:960px;display:flex;align-items:center;justify-content:center;">
          <!-- Pop card FAR LEFT — top -->
          <div style="position:absolute;left:-20px;top:30px;width:270px;z-index:20;filter:drop-shadow(0 20px 50px rgba(0,0,0,0.7));">
            <div v-html="renderAdCard(ad30card1)" style="border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);box-shadow:0 24px 80px rgba(0,0,0,0.6);"></div>
          </div>
          <!-- Pop card LEFT — bottom (2nd left card like Monarch) -->
          <div style="position:absolute;left:-20px;bottom:60px;width:270px;z-index:20;filter:drop-shadow(0 20px 50px rgba(0,0,0,0.7));">
            <div v-html="renderAdCard(ad30card3==='history'?'draft':'history')" style="border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);box-shadow:0 24px 80px rgba(0,0,0,0.6);"></div>
          </div>
          <!-- Pop card RIGHT — mid -->
          <div style="position:absolute;right:-20px;bottom:120px;width:270px;z-index:20;filter:drop-shadow(0 20px 50px rgba(0,0,0,0.7));">
            <div v-html="renderAdCard(ad30card3)" style="border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);box-shadow:0 24px 80px rgba(0,0,0,0.6);"></div>
          </div>
          <!-- Phone body -->
          <div style="position:relative;z-index:10;transform:perspective(1600px) rotateY(8deg) rotateX(-2deg) rotate(-3deg);filter:drop-shadow(0 80px 160px rgba(0,0,0,0.9));">
            <div style="width:340px;height:740px;background:#0a0d14;border-radius:48px;border:2.5px solid rgba(255,255,255,0.14);overflow:hidden;position:relative;">
              <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:116px;height:28px;background:#080a10;border-radius:0 0 18px 18px;z-index:10;"></div>
              <div style="position:absolute;top:10px;left:20px;right:20px;display:flex;justify-content:space-between;z-index:11;">
                <span style="font-size:11px;color:#6b7280;font-weight:600;">9:41</span>
                <div style="width:14px;height:7px;border:1px solid #6b7280;border-radius:2px;margin-top:2px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#6b7280;border-radius:1px;"></div></div>
              </div>
              <div style="position:absolute;top:36px;left:0;right:0;bottom:0;background:#0d1117;padding:9px 11px;display:flex;flex-direction:column;gap:8px;overflow:hidden;">
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <img src="/UFD_V8.png" style="height:16px;width:auto;">
                  <span style="font-size:8px;color:#eab308;font-weight:700;letter-spacing:0.04em;">FANTASY BASEBALL</span>
                </div>
                <div v-html="renderAdCard(ad30card2)" style="border-radius:9px;overflow:hidden;flex-shrink:0;"></div>
                <div v-html="renderAdCard(ad30card2==='powerrankings'?'winprob':'powerrankings')" style="border-radius:9px;overflow:hidden;flex-shrink:0;"></div>
                <div v-html="renderAdCard(ad30card2==='matchup'?'season':'matchup')" style="border-radius:9px;overflow:hidden;flex-shrink:0;"></div>
                <div v-html="renderAdCard('history')" style="border-radius:9px;overflow:hidden;flex-shrink:0;opacity:0.7;"></div>
              </div>
              <div style="position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:80px;height:3.5px;background:rgba(255,255,255,0.18);border-radius:2px;"></div>
            </div>
          </div>
        </div>

        <!-- Watermark -->
        <div style="position:absolute;bottom:240px;left:0;right:0;text-align:center;">
          <div style="font-size:20px;color:#1e2130;letter-spacing:0.06em;">ultimatefantasydashboard.com</div>
        </div>
        <!-- Bottom gold bar -->
        <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,transparent,#eab308,transparent);"></div>
      </div>
      </div>
    </div>

    <!-- ══ TEMPLATE 31: Square — Hero headline left, phone right ══ -->
    <div class="post-wrap" style="grid-column:1/-1;max-width:960px;margin-top:32px;">
      <div class="post-label">31 · Phone Ad Square — Hero Headline (1080×1080)</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Big Headline (white)</div>
          <input v-model="ad31headline" placeholder="See your whole league" style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Accent Line (gold)</div>
          <input v-model="ad31accent" placeholder="in one place." style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Body Text</div>
          <input v-model="ad31body" placeholder="and know exactly where you stand." style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Button Text</div>
          <input v-model="ad31btn" placeholder="Get League Pass →" style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;box-sizing:border-box;">
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Phone Card (Top)</div>
          <select v-model="ad31card1" style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;">
            <option v-for="c in adCardOptions" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </div>
        <div>
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Phone Card (Bottom)</div>
          <select v-model="ad31card2" style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;">
            <option v-for="c in adCardOptions" :key="c.id" :value="c.id">{{ c.label }}</option>
          </select>
        </div>
      </div>

      <!-- 1080×1080 scaled 50% -->
      <div style="width:540px;height:540px;overflow:hidden;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.5);">
      <div style="width:1080px;height:1080px;background:#080a10;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.5);">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 60%,rgba(234,179,8,0.1) 0%,transparent 55%);"></div>

        <!-- Phone — tilted RIGHT -->
        <div style="position:absolute;right:-40px;top:-20px;bottom:-20px;width:580px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:340px;height:720px;border-radius:46px;background:radial-gradient(ellipse,rgba(234,179,8,0.1) 0%,transparent 70%);transform:perspective(1400px) rotateY(-12deg) rotateX(2deg) rotate(4deg);pointer-events:none;"></div>
          <div style="width:340px;height:720px;background:#0a0d14;border-radius:46px;border:2px solid rgba(255,255,255,0.12);overflow:hidden;position:relative;transform:perspective(1400px) rotateY(-12deg) rotateX(2deg) rotate(4deg);filter:drop-shadow(0 60px 140px rgba(0,0,0,0.9));">
            <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:120px;height:28px;background:#080a10;border-radius:0 0 18px 18px;z-index:10;"></div>
            <div style="position:absolute;top:10px;left:20px;right:20px;display:flex;justify-content:space-between;z-index:11;">
              <span style="font-size:11px;color:#6b7280;font-weight:600;">9:41</span>
              <div style="width:14px;height:7px;border:1px solid #6b7280;border-radius:2px;margin-top:2px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#6b7280;border-radius:1px;"></div></div>
            </div>
            <div style="position:absolute;top:38px;left:0;right:0;bottom:0;background:#0d1117;padding:10px 12px;display:flex;flex-direction:column;gap:8px;overflow:hidden;">
              <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:7px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <img src="/UFD_V8.png" style="height:18px;width:auto;">
                <span style="font-size:9px;color:#eab308;font-weight:700;letter-spacing:0.05em;">FANTASY BASEBALL</span>
              </div>
              <div v-html="renderAdCard(ad31card1)" style="border-radius:10px;overflow:hidden;"></div>
              <div v-html="renderAdCard(ad31card2)" style="border-radius:10px;overflow:hidden;"></div>
              <div v-html="renderAdCard(ad31card1==='season'||ad31card2==='season'?'draft':'season')" style="border-radius:10px;overflow:hidden;opacity:0.65;"></div>
              <div v-html="renderAdCard(ad31card1==='prtrendchart'||ad31card2==='prtrendchart'?'matchupgraph':'prtrendchart')" style="border-radius:10px;overflow:hidden;opacity:0.45;"></div>
            </div>
            <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:90px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
          </div>
        </div>

        <!-- LEFT text -->
        <div style="position:absolute;left:64px;top:80px;width:520px;bottom:200px;display:flex;flex-direction:column;justify-content:center;">
          <div style="margin-bottom:32px;"><img src="/UFD_V8.png" style="height:90px;width:auto;"></div>
          <div style="font-size:88px;font-weight:900;color:#ffffff;line-height:0.92;letter-spacing:-0.04em;margin-bottom:4px;">{{ ad31headline || 'See your whole league' }}</div>
          <div style="font-size:88px;font-weight:900;color:#eab308;line-height:0.92;letter-spacing:-0.04em;margin-bottom:36px;">{{ ad31accent || 'in one place.' }}</div>
          <div style="font-size:24px;color:#9ca3af;line-height:1.5;margin-bottom:44px;max-width:420px;">{{ ad31body || 'and know exactly where you stand.' }}</div>
          <div>
            <div style="display:inline-flex;background:linear-gradient(135deg,#eab308,#ca8a04);color:#0a0c14;font-size:26px;font-weight:900;padding:22px 44px;border-radius:14px;letter-spacing:0.01em;">
              {{ ad31btn || 'Get League Pass →' }}
            </div>
          </div>
          <div style="font-size:14px;color:#374151;margin-top:28px;letter-spacing:0.04em;">ultimatefantasydashboard.com</div>
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:180px;background:linear-gradient(transparent,rgba(8,10,16,0.6));"></div>
      </div>
      </div>
    </div>

    <!-- ══ TEMPLATE 31b: Story — Hero headline, phone below ══ -->
    <div class="post-wrap" style="grid-column:1/-1;max-width:960px;margin-top:32px;">
      <div class="post-label">31b · Phone Ad Story — Hero Headline (1080×1920) — same inputs as 31 above</div>

      <!-- 1080×1920 scaled 28.125% → 304×540 -->
      <div style="width:304px;height:540px;overflow:hidden;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.5);">
      <div style="width:1080px;height:1920px;background:#080a10;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.28125);">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 40% 30%,rgba(234,179,8,0.12) 0%,transparent 50%);"></div>
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 60% 90%,rgba(6,182,212,0.06) 0%,transparent 45%);"></div>
        <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,transparent,#eab308,transparent);"></div>

        <!-- TEXT — top section (below 220px IG profile safe zone) -->
        <div style="position:absolute;top:240px;left:80px;right:80px;">
          <div style="margin-bottom:40px;"><img src="/UFD_V8.png" style="height:110px;width:auto;"></div>
          <div style="font-size:120px;font-weight:900;color:#ffffff;line-height:0.9;letter-spacing:-0.04em;margin-bottom:8px;">{{ ad31headline || 'See your whole league' }}</div>
          <div style="font-size:120px;font-weight:900;color:#eab308;line-height:0.9;letter-spacing:-0.04em;margin-bottom:48px;">{{ ad31accent || 'in one place.' }}</div>
          <div style="font-size:34px;color:#9ca3af;line-height:1.5;margin-bottom:50px;">{{ ad31body || 'and know exactly where you stand.' }}</div>
          <div style="display:inline-flex;">
            <div style="background:linear-gradient(135deg,#eab308,#ca8a04);color:#0a0c14;font-size:38px;font-weight:900;padding:28px 64px;border-radius:20px;letter-spacing:0.01em;">
              {{ ad31btn || 'Get League Pass →' }}
            </div>
          </div>
        </div>

        <!-- PHONE — bottom third, below button, centred, tilted right -->
        <div style="position:absolute;bottom:180px;left:50%;transform:translateX(-50%);width:900px;height:760px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:360px;height:740px;border-radius:48px;background:radial-gradient(ellipse,rgba(234,179,8,0.1) 0%,transparent 70%);transform:perspective(1600px) rotateY(-10deg) rotateX(2deg) rotate(3deg);pointer-events:none;"></div>
          <div style="width:360px;height:740px;background:#0a0d14;border-radius:48px;border:2.5px solid rgba(255,255,255,0.12);overflow:hidden;position:relative;transform:perspective(1600px) rotateY(-10deg) rotateX(2deg) rotate(3deg);filter:drop-shadow(0 80px 180px rgba(0,0,0,0.95));">
            <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:126px;height:30px;background:#080a10;border-radius:0 0 20px 20px;z-index:10;"></div>
            <div style="position:absolute;top:11px;left:22px;right:22px;display:flex;justify-content:space-between;z-index:11;">
              <span style="font-size:12px;color:#6b7280;font-weight:600;">9:41</span>
              <div style="width:15px;height:8px;border:1px solid #6b7280;border-radius:2px;margin-top:2px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#6b7280;border-radius:1px;"></div></div>
            </div>
            <div style="position:absolute;top:40px;left:0;right:0;bottom:0;background:#0d1117;padding:11px 13px;display:flex;flex-direction:column;gap:9px;overflow:hidden;">
              <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06);">
                <img src="/UFD_V8.png" style="height:19px;width:auto;">
                <span style="font-size:9px;color:#eab308;font-weight:700;letter-spacing:0.05em;">FANTASY BASEBALL</span>
              </div>
              <div v-html="renderAdCard(ad31card1)" style="border-radius:10px;overflow:hidden;"></div>
              <div v-html="renderAdCard(ad31card2)" style="border-radius:10px;overflow:hidden;"></div>
              <div v-html="renderAdCard(ad31card1==='season'||ad31card2==='season'?'draft':'season')" style="border-radius:10px;overflow:hidden;opacity:0.65;"></div>
              <div v-html="renderAdCard(ad31card1==='prtrendchart'||ad31card2==='prtrendchart'?'matchupgraph':'prtrendchart')" style="border-radius:10px;overflow:hidden;opacity:0.45;"></div>
            </div>
            <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:96px;height:4px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
          </div>
        </div>

        <div style="position:absolute;bottom:230px;left:0;right:0;text-align:center;">
          <div style="font-size:22px;color:#1e2130;letter-spacing:0.06em;">ultimatefantasydashboard.com</div>
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,transparent,#eab308,transparent);"></div>
      </div>
      </div>
    </div>
    <div style="height:20px;grid-column:1/-1;"></div>
    </div><!-- end posts-grid -->
    </template><!-- end square tab -->

    <!-- INTERACTIVE TAB -->
    <template v-if="activeType === 'interactive'">
    <div class="section-label">🎯 Interactive Templates — Customize then screenshot the card</div>

    <!-- 19 · DAILY WIN PROBABILITY TRACKER -->
    <div class="post-wrap wp-post-wrap">
      <div class="post-label">19 · Daily Win Probability — Matchup Tracker</div>

      <!-- ── Controls panel (outside the screenshottable card) ── -->
      <div class="wp-controls">
        <div class="wp-ctrl-row">
          <div class="wp-ctrl-group">
            <label>Your Team (cyan)</label>
            <input v-model="wpTeam1" class="wp-input" placeholder="Mahomes Magic" />
          </div>
          <div class="wp-ctrl-group">
            <label>Opponent (orange)</label>
            <input v-model="wpTeam2" class="wp-input" placeholder="The Algorithm" />
          </div>
          <div class="wp-ctrl-group wp-ctrl-sm">
            <label>Week</label>
            <input v-model="wpWeek" class="wp-input" style="width:64px" placeholder="14" />
          </div>
          <div class="wp-ctrl-group">
            <label>Sport · Type</label>
            <input v-model="wpSportLabel" class="wp-input" placeholder="Fantasy Baseball · PPR" />
          </div>
        </div>
        <div class="wp-ctrl-row">
          <div class="wp-ctrl-group">
            <label>Player Name</label>
            <input v-model="wpPlayerName" class="wp-input" placeholder="Logan Webb" />
          </div>
          <div class="wp-ctrl-group wp-ctrl-sm">
            <label>Pos</label>
            <input v-model="wpPlayerPos" class="wp-input" style="width:60px" placeholder="SP" />
          </div>
          <div class="wp-ctrl-group" style="flex:1;min-width:200px">
            <label>Player Headshot URL (optional)</label>
            <input v-model="wpHeadshotUrl" class="wp-input" style="width:100%" placeholder="https://a.espncdn.com/i/headshots/mlb/players/full/39832.png" />
          </div>
          <div class="wp-ctrl-group">
            <label>Show through day</label>
            <div class="wp-pills">
              <button v-for="(d,i) in ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']" :key="i"
                @click="wpCurrentDay=i" :class="wpCurrentDay===i?'wp-pill-on':'wp-pill-off'">{{d}}</button>
            </div>
          </div>
          <div class="wp-ctrl-group">
            <label>Effect on your win %</label>
            <div class="wp-pills">
              <button @click="wpDirection='down'" :class="wpDirection==='down'?'wp-pill-dn':'wp-pill-off'">↓ Down</button>
              <button @click="wpDirection='up'" :class="wpDirection==='up'?'wp-pill-up':'wp-pill-off'">↑ Up</button>
            </div>
          </div>
          <div class="wp-ctrl-group">
            <label>Start % · Impact</label>
            <div style="display:flex;align-items:center;gap:8px">
              <input v-model.number="wpStartProb" type="range" min="25" max="75" class="wp-slider" />
              <span class="wp-val">{{wpStartProb}}%</span>
              <div class="wp-pills" style="margin-left:4px">
                <button v-for="sz in ['sm','md','lg']" :key="sz" @click="wpImpact=sz"
                  :class="wpImpact===sz?'wp-pill-on':'wp-pill-off'" style="padding:4px 8px">{{sz}}</button>
              </div>
            </div>
          </div>
          <div class="wp-ctrl-group">
            <label>Pre-event Shape</label>
            <div class="wp-pills">
              <button @click="wpShape='steady'"  :class="wpShape==='steady'?'wp-pill-on':'wp-pill-off'">〰 Steady</button>
              <button @click="wpShape='rising'"  :class="wpShape==='rising'?'wp-pill-on':'wp-pill-off'">↗ Rising</button>
              <button @click="wpShape='falling'" :class="wpShape==='falling'?'wp-pill-on':'wp-pill-off'">↘ Falling</button>
              <button @click="wpShape='volatile'" :class="wpShape==='volatile'?'wp-pill-on':'wp-pill-off'">〜 Volatile</button>
              <button @click="wpShape='surge'"   :class="wpShape==='surge'?'wp-pill-on':'wp-pill-off'">⚡ Late Surge</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── The screenshottable card ── -->
      <div class="sq sq-wp-bg">
        <div class="sq-grain"></div>

        <!-- The entire card is one SVG for pixel-perfect layout -->
        <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg"
          style="position:absolute;inset:0;width:100%;height:100%;z-index:2">

          <!-- ═══ HEADER BAR ═══ -->
          <rect x="0" y="0" width="540" height="52" fill="#0d1019"/>
          <line x1="0" y1="52" x2="540" y2="52" stroke="#1e2130" stroke-width="1"/>

          <!-- UFD badge -->
          <rect x="16" y="13" width="46" height="26" rx="5" fill="#09090f" stroke="#eab308" stroke-width="1.5"/>
          <text x="39" y="31" text-anchor="middle" font-size="12" font-weight="900"
            fill="#eab308" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">UFD</text>

          <!-- Sport icon circle -->
          <circle cx="78" cy="26" r="10" fill="rgba(255,255,255,0.06)"/>
          <text x="78" y="31" text-anchor="middle" font-size="13">⚾</text>

          <!-- Sport label -->
          <text x="94" y="31" font-size="13" font-weight="600"
            fill="#e5e7eb" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpSportLabel }}</text>

          <!-- WK badge -->
          <text x="524" y="31" text-anchor="end" font-size="13" font-weight="700"
            fill="#6b7280" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WK {{ wpWeek }}</text>

          <!-- ═══ TITLE BAR ═══ -->
          <rect x="0" y="52" width="540" height="46" fill="#0a0c14"/>
          <line x1="0" y1="98" x2="540" y2="98" stroke="#1e2130" stroke-width="1"/>

          <!-- Chart icon (mini trend line icon) -->
          <rect x="18" y="63" width="26" height="26" rx="4" fill="rgba(239,68,68,0.15)"/>
          <polyline points="21,83 27,74 33,78 39,67 42,70" fill="none"
            stroke="#f87171" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>

          <!-- Title text -->
          <text x="52" y="81" font-size="17" font-weight="900" letter-spacing="0.04em"
            fill="#ffffff" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WIN PROBABILITY TREND</text>

          <!-- ═══ CHART AREA (y=98 to y=456) ═══ -->
          <!-- Chart bg subtle -->
          <rect x="0" y="98" width="540" height="358" fill="rgba(0,0,0,0.18)"/>

          <!-- Y-axis grid lines (dashed) -->
          <!-- 100% at y=118 -->
          <line x1="58" y1="118" x2="526" y2="118" stroke="rgba(255,255,255,0.12)"
            stroke-width="1" stroke-dasharray="4,4"/>
          <text x="54" y="122" text-anchor="end" font-size="10" fill="rgba(255,255,255,0.35)"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">100%</text>

          <!-- 50% at y=277 -->
          <line x1="58" y1="277" x2="526" y2="277" stroke="rgba(255,255,255,0.12)"
            stroke-width="1" stroke-dasharray="4,4"/>
          <text x="54" y="281" text-anchor="end" font-size="10" fill="rgba(255,255,255,0.35)"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">50%</text>

          <!-- 0% at y=436 -->
          <line x1="58" y1="436" x2="526" y2="436" stroke="rgba(255,255,255,0.12)"
            stroke-width="1" stroke-dasharray="4,4"/>
          <text x="54" y="440" text-anchor="end" font-size="10" fill="rgba(255,255,255,0.35)"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">0%</text>

          <!-- Day x-axis labels -->
          <text v-for="(d,i) in ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']" :key="'dx'+i"
            :x="58 + i*78" y="455"
            text-anchor="middle" font-size="11.5"
            :font-weight="i===wpCurrentDay?'800':'400'"
            :fill="i===wpCurrentDay?'#e5e7eb':i<wpCurrentDay?'rgba(255,255,255,0.35)':'rgba(255,255,255,0.18)'"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ d }}</text>

          <!-- TODAY marker under current day -->
          <rect :x="58+wpCurrentDay*78-16" y="459" width="32" height="14" rx="3"
            fill="rgba(6,182,212,0.12)" />
          <text :x="58+wpCurrentDay*78" y="470" text-anchor="middle"
            font-size="8" font-weight="800" fill="#06b6d4" letter-spacing="0.08em"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">TODAY</text>

          <!-- ── AREA FILLS (clipped to chart) ── -->
          <defs>
            <clipPath id="chart-clip">
              <rect x="56" y="108" width="472" height="330"/>
            </clipPath>
            <linearGradient id="area1-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.03"/>
            </linearGradient>
            <linearGradient id="area2-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f97316" stop-opacity="0.18"/>
              <stop offset="100%" stop-color="#f97316" stop-opacity="0.03"/>
            </linearGradient>
            <!-- Circular clip for player headshot -->
            <clipPath id="player-avatar-clip">
              <circle cx="418" cy="399" r="17"/>
            </clipPath>
          </defs>

          <!-- Team 2 area (orange, behind cyan) -->
          <path :d="wpArea2Path" fill="url(#area2-grad)" clip-path="url(#chart-clip)"/>
          <!-- Team 1 area (cyan) -->
          <path :d="wpArea1Path" fill="url(#area1-grad)" clip-path="url(#chart-clip)"/>

          <!-- ── TEAM 2 LINE (orange solid) ── -->
          <path :d="wpLine2Path" fill="none" stroke="#f97316" stroke-width="2.2"
            stroke-linecap="round" stroke-linejoin="round" clip-path="url(#chart-clip)"/>

          <!-- ── TEAM 1 LINE (cyan solid) ── -->
          <path :d="wpLine1Path" fill="none" stroke="#06b6d4" stroke-width="2.6"
            stroke-linecap="round" clip-path="url(#chart-clip)"/>

          <!-- ── DATA POINTS & VALUE BADGES ── -->
          <!-- Team 2 dots + labels — badge always BELOW dot -->
          <!-- NOTE: using pre-sliced wpTeam2Visible — v-if on same element as v-for breaks in Vue 3 -->
          <g v-for="(pt,i) in wpTeam2Visible" :key="'t2d'+i">
            <circle :cx="pt.x" :cy="pt.y" r="7" fill="rgba(249,115,22,0.15)"/>
            <circle :cx="pt.x" :cy="pt.y" r="4.5" fill="#f97316"/>
            <circle :cx="pt.x" :cy="pt.y" r="2" fill="#0d1117"/>
            <!-- filled orange badge BELOW -->
            <rect :x="pt.x - 21" :y="pt.y + 9" width="42" height="19" rx="4" fill="#f97316"/>
            <text :x="pt.x" :y="pt.y + 23" text-anchor="middle" font-size="11.5" font-weight="800"
              fill="#0a0c14" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ pt.prob.toFixed(1) }}</text>
          </g>

          <!-- Team 1 dots + labels — badge always ABOVE dot -->
          <g v-for="(pt,i) in wpTeam1Visible" :key="'t1d'+i">
            <circle :cx="pt.x" :cy="pt.y" r="7" fill="rgba(6,182,212,0.15)"/>
            <circle :cx="pt.x" :cy="pt.y" r="5" fill="#06b6d4"/>
            <circle :cx="pt.x" :cy="pt.y" r="2" fill="#0d1117"/>
            <!-- filled cyan badge ABOVE -->
            <rect :x="pt.x - 21" :y="pt.y - 28" width="42" height="19" rx="4" fill="#06b6d4"/>
            <text :x="pt.x" :y="pt.y - 14" text-anchor="middle" font-size="11.5" font-weight="800"
              fill="#0a0c14" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ pt.prob.toFixed(1) }}</text>
          </g>

          <!-- ═══ PLAYER CALLOUT (corner badge) ═══ -->
          <!-- Connector line from last team1 point to callout -->
          <line :x1="wpTeam1Points[wpCurrentDay]?.x" :y1="wpTeam1Points[wpCurrentDay]?.y"
            x2="450" y2="395"
            stroke="rgba(6,182,212,0.3)" stroke-width="1" stroke-dasharray="3,3"/>

          <!-- Callout card -->
          <rect x="390" y="370" width="136" height="58" rx="8"
            fill="#0c1220" stroke="rgba(6,182,212,0.4)" stroke-width="1.2"/>

          <!-- Player avatar circle — headshot if URL provided, else initials -->
          <circle cx="418" cy="399" r="17" fill="#0a1520" stroke="#06b6d4" stroke-width="1.5"/>
          <!-- Headshot image (clipped to circle) -->
          <image v-if="wpHeadshotUrl" :href="wpHeadshotUrl"
            x="401" y="382" width="34" height="34"
            clip-path="url(#player-avatar-clip)"
            preserveAspectRatio="xMidYMid slice"/>
          <!-- Fallback initials when no headshot -->
          <text v-if="!wpHeadshotUrl" x="418" y="404" text-anchor="middle" font-size="11" font-weight="900"
            fill="#06b6d4" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpPlayerInitials }}</text>

          <!-- Down/Up arrow badge -->
          <circle :cx="432" cy="386" r="8"
            :fill="wpDirection==='down'?'#ef4444':'#22c55e'"/>
          <text x="432" y="390" text-anchor="middle" font-size="11" font-weight="900"
            :fill="wpDirection==='down'?'#fff':'#fff'"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpDirection==='down'?'↓':'↑' }}</text>

          <!-- Player name -->
          <text x="448" y="393" font-size="10" font-weight="700" fill="#e5e7eb"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpPlayerName }}</text>
          <text x="448" y="406" font-size="9" fill="#6b7280"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpPlayerPos }} · {{ wpDirection==='down'?'hurt':'helped' }} win%</text>
          <text x="448" y="419" font-size="9" fill="rgba(6,182,212,0.7)"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpCurrentDayLabel }} impact</text>

          <!-- ═══ LEGEND ═══ -->
          <rect x="0" y="481" width="540" height="36" fill="rgba(0,0,0,0.25)"/>
          <line x1="0" y1="481" x2="540" y2="481" stroke="#1e2130" stroke-width="1"/>

          <!-- Team 1 legend -->
          <circle cx="68" cy="499" r="5" fill="#06b6d4"/>
          <text x="78" y="504" font-size="12" font-weight="600" fill="#9ca3af"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpTeam1 }}</text>

          <!-- Separator -->
          <circle cx="215" cy="499" r="2" fill="#374151"/>

          <!-- Team 2 legend -->
          <circle cx="228" cy="499" r="5" fill="#f97316"/>
          <text x="238" y="504" font-size="12" font-weight="600" fill="#9ca3af"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpTeam2 }}</text>

          <!-- URL watermark -->
          <text x="20" y="525" font-size="10" fill="#1e2130" letter-spacing="0.05em"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">ultimatefantasydashboard.com</text>

        </svg>
      </div>
    </div>

    <!-- 20 · POWER RANKINGS CARD — Manual Input -->
    <div class="post-wrap" style="padding-bottom:60px;">
      <div class="post-label">20 · Power Rankings Card — Manual</div>

      <!-- Controls -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div>
          <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">League Label</div>
          <input v-model="prSportLabel" placeholder="Fantasy Baseball · H2H" style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;box-sizing:border-box;">
        </div>
        <div style="display:flex;gap:12px;">
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Week</div>
            <input v-model="prWeek" style="width:80px;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;">
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Teams</div>
            <div style="display:flex;gap:4px;">
              <button v-for="n in [6,8,10]" :key="n" @click="prTeamCount=n"
                :style="prTeamCount===n?'background:rgba(234,179,8,0.2);border:1px solid #eab308;color:#eab308;':'background:#1e2130;border:1px solid #374151;color:#6b7280;'"
                style="border-radius:6px;padding:4px 10px;font-size:13px;font-weight:700;cursor:pointer;">{{n}}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Team inputs -->
      <div style="margin-bottom:20px;">
        <div style="display:grid;grid-template-columns:2fr 2fr 80px 80px 80px;gap:6px;margin-bottom:6px;padding:0 4px;">
          <div style="font-size:10px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;"># · Team Name</div>
          <div style="font-size:10px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">Logo URL</div>
          <div style="font-size:10px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">Score</div>
          <div style="font-size:10px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">+/− Rank</div>
          <div style="font-size:10px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">Record</div>
        </div>
        <div v-for="(team, i) in prTeams.slice(0, prTeamCount)" :key="i"
          style="display:grid;grid-template-columns:2fr 2fr 80px 80px 80px;gap:6px;margin-bottom:4px;align-items:center;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:12px;font-weight:800;color:#4b5563;width:16px;text-align:center;">{{i+1}}</span>
            <input v-model="team.name" :placeholder="'Team '+(i+1)"
              style="flex:1;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:5px 8px;font-size:12px;min-width:0;">
          </div>
          <input v-model="team.logo" placeholder="Logo URL"
            style="background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:5px 8px;font-size:11px;min-width:0;">
          <input v-model.number="team.score" type="number" step="0.1" placeholder="85.0"
            style="background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:5px 8px;font-size:12px;text-align:center;">
          <div style="display:flex;align-items:center;gap:3px;">
            <button @click="team.change=Math.max(-9,team.change-1)"
              style="background:#1e2130;border:1px solid #374151;color:#e5e7eb;border-radius:6px;padding:3px 7px;cursor:pointer;">−</button>
            <span style="font-size:12px;font-weight:800;min-width:24px;text-align:center;"
              :style="{color:team.change>0?'#22c55e':team.change<0?'#ef4444':'#4b5563'}">
              {{team.change>0?'▲'+team.change:team.change<0?'▼'+Math.abs(team.change):'—'}}
            </span>
            <button @click="team.change=Math.min(9,team.change+1)"
              style="background:#1e2130;border:1px solid #374151;color:#e5e7eb;border-radius:6px;padding:3px 7px;cursor:pointer;">+</button>
          </div>
          <input v-model="team.record" placeholder="8-3"
            style="background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:5px 8px;font-size:12px;text-align:center;">
        </div>
      </div>

      <!-- ── Screenshottable card ── -->
      <div style="width:540px;background:#0f1117;border-radius:16px;overflow:hidden;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">
        <!-- Gold top bar -->
        <div style="height:5px;background:linear-gradient(90deg,#eab308,#ca8a04);"></div>

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px 0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="/UFD_V8.png" style="height:36px;width:auto;object-fit:contain;">
            <span style="font-size:12px;color:#6b7280;">{{ prSportEmoji }} {{ prSportLabel }}</span>
          </div>
          <span style="font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">WEEK {{ prWeek }}</span>
        </div>

        <!-- Title -->
        <div style="display:flex;align-items:center;gap:8px;padding:10px 18px 10px;">
          <span style="font-size:18px;">⚡</span>
          <span style="font-size:18px;font-weight:900;color:#fff;letter-spacing:0.04em;">POWER RANKINGS</span>
        </div>

        <!-- Column headers -->
        <div style="display:flex;align-items:center;padding:6px 16px;background:rgba(255,255,255,0.025);border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="width:32px;font-size:9px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">Rank</div>
          <div style="width:24px;font-size:9px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">+/−</div>
          <div style="flex:1;font-size:9px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;padding-left:6px;">Team</div>
          <div style="width:120px;font-size:9px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">Score</div>
          <div style="width:48px;text-align:right;font-size:9px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">W-L</div>
        </div>

        <!-- Team rows -->
        <div v-for="(team, i) in prTeams.slice(0, prTeamCount)" :key="i"
          :style="{background:i===0?'rgba(234,179,8,0.06)':i%2===0?'rgba(255,255,255,0.02)':'transparent',borderBottom:'1px solid rgba(255,255,255,0.04)'}">
          <div style="display:flex;align-items:center;padding:0 16px;height:48px;">
            <!-- Rank pill -->
            <div style="width:32px;flex-shrink:0;">
              <div :style="{background:i===0?'#eab308':i===1?'rgba(255,255,255,0.1)':i===2?'rgba(255,255,255,0.07)':'transparent',borderRadius:'50%',width:'24px',height:'24px',display:'flex',alignItems:'center',justifyContent:'center'}">
                <span :style="{fontSize:'12px',fontWeight:'900',color:i===0?'#0a0c14':i<3?'#e5e7eb':'#6b7280'}">{{i+1}}</span>
              </div>
            </div>
            <!-- Change badge -->
            <div style="width:24px;flex-shrink:0;">
              <span v-if="team.change!==0" style="font-size:11px;font-weight:800;"
                :style="{color:team.change>0?'#22c55e':'#ef4444'}">
                {{team.change>0?'▲'+team.change:'▼'+Math.abs(team.change)}}
              </span>
              <span v-else style="font-size:11px;color:#374151;">—</span>
            </div>
            <!-- Logo + Name -->
            <div style="flex:1;display:flex;align-items:center;gap:8px;padding-left:6px;min-width:0;">
              <img v-if="team.logo" :src="team.logo"
                style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid rgba(255,255,255,0.1);"
                @error="($event.target as HTMLImageElement).style.display='none'">
              <div v-else :style="{width:'30px',height:'30px',borderRadius:'50%',background:prTeamColor(i),display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}">
                <span style="font-size:12px;font-weight:800;color:#fff;">{{(team.name||'T').charAt(0)}}</span>
              </div>
              <span :style="{fontSize:'13px',fontWeight:i===0?'800':'600',color:i===0?'#fff':'#d1d5db',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}">
                {{team.name||'Team '+(i+1)}}
              </span>
            </div>
            <!-- Score bar + number -->
            <div style="width:120px;flex-shrink:0;display:flex;align-items:center;gap:8px;">
              <div style="flex:1;height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;">
                <div :style="{width:prScoreBarWidth(team.score)+'px',height:'100%',background:'linear-gradient(90deg,'+prTeamColor(i)+','+prTeamColor(i)+'88)',borderRadius:'3px'}"></div>
              </div>
              <span :style="{fontSize:'13px',fontWeight:'800',color:i===0?'#eab308':'#e5e7eb',width:'38px',textAlign:'right'}">
                {{(team.score||0).toFixed(1)}}
              </span>
            </div>
            <!-- Record -->
            <div style="width:48px;text-align:right;flex-shrink:0;">
              <span style="font-size:11px;font-weight:600;color:#6b7280;">{{team.record||'—'}}</span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div style="padding:8px 16px;text-align:center;">
          <div style="font-size:9px;color:#374151;letter-spacing:0.04em;">ultimatefantasydashboard.com</div>
        </div>
        <div style="height:4px;background:linear-gradient(90deg,#eab308,#ca8a04);"></div>
      </div>
    </div>

    <!-- 20b · RANKING TRENDS — same inputs, separate screenshot -->
    <div class="post-wrap" style="padding-bottom:60px;margin-top:32px;">
      <div class="post-label">20b · Ranking Trends — uses same inputs above, screenshot separately</div>

      <div style="width:540px;background:#0f1117;border-radius:16px;overflow:hidden;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">
        <div style="height:5px;background:linear-gradient(90deg,#eab308,#ca8a04);"></div>

        <!-- Header -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px 0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <img src="/UFD_V8.png" style="height:36px;width:auto;object-fit:contain;">
            <span style="font-size:12px;color:#6b7280;">{{ prSportEmoji }} {{ prSportLabel }}</span>
          </div>
          <span style="font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">WK 1–{{ prWeek }}</span>
        </div>

        <!-- Title -->
        <div style="display:flex;align-items:center;gap:8px;padding:10px 18px 12px;">
          <span style="font-size:18px;">⚡</span>
          <span style="font-size:18px;font-weight:900;color:#fff;letter-spacing:0.04em;">RANKING TRENDS</span>
        </div>

        <!-- SVG chart -->
        <div style="padding:0 16px 16px;">
          <svg :viewBox="'0 0 508 '+(prTeamCount*44+80)" style="display:block;width:100%;height:auto;">
            <!-- Grid lines per rank -->
            <template v-for="(_,ri) in prTeams.slice(0,prTeamCount)" :key="'gl'+ri">
              <line x1="38" :x2="442" :y1="prTrendY2(ri+1)" :y2="prTrendY2(ri+1)"
                stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="4 5"/>
              <text x="32" :y="prTrendY2(ri+1)+4" text-anchor="end" font-size="11"
                fill="rgba(255,255,255,0.25)" font-family="Helvetica Neue,Arial,sans-serif">#{{ri+1}}</text>
            </template>

            <!-- X-axis labels -->
            <template v-for="w in prTrendWeekLabels2" :key="'wl'+w">
              <text :x="prTrendX2(w-1)" :y="prTeamCount*44+68" text-anchor="middle"
                font-size="10" fill="rgba(255,255,255,0.25)"
                font-family="Helvetica Neue,Arial,sans-serif">Wk {{w}}</text>
            </template>

            <!-- Current week vertical marker -->
            <line :x1="prTrendX2(prTrendNWeeks2-1)" :x2="prTrendX2(prTrendNWeeks2-1)"
              y1="4" :y2="prTeamCount*44+56"
              stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="3 4"/>

            <!-- Trend lines per team -->
            <template v-for="(tp, ti) in prTrendPaths2" :key="'tp'+ti">
              <!-- Glow -->
              <path :d="tp.d" fill="none" :stroke="tp.color" stroke-width="5" opacity="0.12"
                stroke-linecap="round" stroke-linejoin="round"/>
              <!-- Line -->
              <path :d="tp.d" fill="none" :stroke="tp.color" stroke-width="2.2" opacity="0.9"
                stroke-linecap="round" stroke-linejoin="round"/>
              <!-- End dot -->
              <circle :cx="tp.endX" :cy="tp.endY" r="5" :fill="tp.color"/>
              <circle :cx="tp.endX" :cy="tp.endY" r="2.5" fill="#0f1117"/>
              <circle :cx="tp.endX" :cy="tp.endY" r="1.2" :fill="tp.color"/>
              <!-- Name label -->
              <text :x="tp.endX+10" :y="tp.endY+4" font-size="10.5" font-weight="700"
                :fill="tp.color" font-family="Helvetica Neue,Arial,sans-serif">{{ tp.name }}</text>
            </template>
          </svg>
        </div>

        <div style="padding:6px 16px 10px;text-align:center;">
          <div style="font-size:9px;color:#374151;">ultimatefantasydashboard.com</div>
        </div>
        <div style="height:4px;background:linear-gradient(90deg,#eab308,#ca8a04);"></div>
      </div>
    </div>


    <!-- ══════════════════════════════════════
         WIN PROBABILITY IMPACT GRAPHICS
    ══════════════════════════════════════ -->

    <!-- Controls shared by all 4 cards -->
    <div class="post-wrap wp-post-wrap" style="grid-column:1/-1">
      <div class="post-label">⚡ Win Probability Impact Graphics — pulls yesterday's MLB stats from ESPN</div>
      <div class="wpi-controls">
        <div class="wpi-ctrl-group">
          <label class="wpi-label">Date (yesterday)</label>
          <input v-model="wpiDate" class="wp-input" placeholder="YYYYMMDD" style="width:120px" />
        </div>
        <div class="wpi-ctrl-group">
          <label class="wpi-label">Week Label</label>
          <input v-model="wpiWeekLabel" class="wp-input" style="width:64px" placeholder="1" />
        </div>
        <button @click="loadWpiData" :disabled="wpiLoading" class="wpi-load-btn">
          <span v-if="wpiLoading">⏳ Loading…</span>
          <span v-else>⚡ Load Yesterday's Data</span>
        </button>
      </div>
      <div v-if="wpiError" class="wpi-error">⚠️ {{ wpiError }}</div>
      <div v-if="wpiStatus" class="wpi-status">{{ wpiStatus }}</div>
    </div>

    <!-- ── GRAPHIC 27: Batters ── -->
    <div class="post-wrap wp-post-wrap">
      <div class="post-label">27 · Best Batters</div>
      <div class="sq sq-wp-bg">
        <div class="sq-grain"></div>
        <svg viewBox="0 0 540 600" xmlns="http://www.w3.org/2000/svg"
          style="position:absolute;inset:0;width:100%;height:100%;z-index:2">
          <defs>
            <linearGradient id="wpi-gold2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#eab308" stop-opacity="0.95"/>
              <stop offset="100%" stop-color="#eab308" stop-opacity="0.2"/>
            </linearGradient>
            <radialGradient id="wpi-gold2-glow" cx="15%" cy="50%" r="60%">
              <stop offset="0%" stop-color="#eab308" stop-opacity="0.08"/>
              <stop offset="100%" stop-color="#eab308" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <!-- bg -->
          <rect x="0" y="0" width="540" height="600" fill="#07080e"/>
          <rect x="0" y="0" width="540" height="600" fill="url(#wpi-gold2-glow)"/>
          <!-- Top accent bar -->
          <rect x="0" y="0" width="540" height="5" fill="url(#wpi-gold2)"/>

          <!-- ── HEADER ── -->
          <!-- Logo top-right, large -->
          <image href="/UFD_V8.png" x="370" y="8" width="128" height="68"
            preserveAspectRatio="xMidYMid meet"/>
          <!-- Headline left -->
          <text x="20" y="52" font-size="34" font-weight="900" letter-spacing="-0.01em"
            fill="#ffffff" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">Best Batters</text>
          <!-- Date · Week — bigger, accent color -->
          <text x="20" y="80" font-size="15" font-weight="700" letter-spacing="0.06em"
            fill="#eab308" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">
            {{ wpiDateDisplay }} · WK {{ wpiWeekLabel }}
          </text>
          <line x1="0" y1="94" x2="540" y2="94" stroke="#1e2130" stroke-width="1"/>

          <!-- ── PLAYER ROWS (5 × 100px each, start y=94) ── -->
          <g v-for="(p, i) in wpiTopBatters" :key="'b'+i">
            <!-- Row bg -->
            <rect x="0" :y="94+i*101" width="540" :height="100"
              :fill="i===0?'rgba(234,179,8,0.09)':'rgba(255,255,255,0.012)'"/>
            <line x1="0" :y1="94+(i+1)*101" x2="540" :y2="94+(i+1)*101"
              stroke="#1e2130" stroke-width="1"/>

            <!-- Headshot — flush left edge, radius 42 -->
            <circle cx="58" :cy="94+i*101+50" r="36"
              fill="rgba(0,0,0,0.4)"
              :stroke="i===0?'rgba(234,179,8,0.5)':'rgba(255,255,255,0.06)'" stroke-width="2"/>
            <image :href="p.headshot" x="22" :y="94+i*101+14"
              width="72" height="72" preserveAspectRatio="xMidYMid slice"
              style="clip-path:circle(36px at 36px 36px)"/>

            <!-- Rank -->
            <text x="106" :y="94+i*101+28" font-size="12" font-weight="900"
              :fill="i===0?'#eab308':'#4b5563'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">#{{ i+1 }}</text>

            <!-- Name + Team · Pos on same line -->
            <text x="106" :y="94+i*101+50" font-size="17" font-weight="800" fill="#ffffff"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.name }}</text>
            <text :x="106 + Math.min(p.name.length * 10, 200)" :y="94+i*101+50"
              font-size="12" font-weight="600" fill="#6b7280"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">  {{ p.team }} · {{ p.position }}</text>

            <!-- Stat line — white, bigger -->
            <text x="106" :y="94+i*101+73" font-size="14" font-weight="600" fill="#e5e7eb"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.statLine }}</text>

            <!-- WP % — hero number right side -->
            <text x="520" :y="94+i*101+48" text-anchor="end"
              :font-size="i===0?'36':'30'" font-weight="900"
              :fill="i===0?'#eab308':'#6b7280'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">+{{ p.wpImpact.toFixed(1) }}%</text>
            <!-- "win probability change" label -->
            <text x="520" :y="94+i*101+68" text-anchor="end" font-size="11"
              :fill="i===0?'#ffffff':'#4b5563'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">win prob change</text>

            <!-- Thin bar -->
            <rect x="106" :y="94+i*101+84" width="200" height="3" rx="1"
              fill="rgba(255,255,255,0.05)"/>
            <rect x="106" :y="94+i*101+84"
              :width="wpiTopBatters.length && wpiTopBatters[0].wpImpact>0 ? Math.min(200,(p.wpImpact/wpiTopBatters[0].wpImpact)*200) : 0"
              height="3" rx="1"
              :fill="i===0?'#eab308':'rgba(107,114,128,0.5)'"/>
          </g>

          <!-- Empty state -->
          <text v-if="!wpiTopBatters.length" x="270" y="340" text-anchor="middle"
            font-size="15" fill="#374151"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">Load yesterday's data above</text>

          <!-- Watermark -->
          <line x1="0" y1="593" x2="540" y2="593" stroke="#1e2130" stroke-width="1"/>
          <text x="270" y="596" text-anchor="middle" font-size="9" fill="#1a1f2e"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">ultimatefantasydashboard.com</text>
        </svg>
      </div>
    </div>

    <!-- ── GRAPHIC 28: Pitchers ── -->
    <div class="post-wrap wp-post-wrap">
      <div class="post-label">28 · Best Pitchers</div>
      <div class="sq sq-wp-bg">
        <div class="sq-grain"></div>
        <svg viewBox="0 0 540 600" xmlns="http://www.w3.org/2000/svg"
          style="position:absolute;inset:0;width:100%;height:100%;z-index:2">
          <defs>
            <linearGradient id="wpi-cyan2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.95"/>
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.2"/>
            </linearGradient>
            <radialGradient id="wpi-cyan2-glow" cx="15%" cy="50%" r="60%">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.08"/>
              <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <!-- bg -->
          <rect x="0" y="0" width="540" height="600" fill="#07080e"/>
          <rect x="0" y="0" width="540" height="600" fill="url(#wpi-cyan2-glow)"/>
          <!-- Top accent bar -->
          <rect x="0" y="0" width="540" height="5" fill="url(#wpi-cyan2)"/>

          <!-- ── HEADER ── -->
          <!-- Logo top-right, large -->
          <image href="/UFD_V8.png" x="370" y="8" width="128" height="68"
            preserveAspectRatio="xMidYMid meet"/>
          <!-- Headline left -->
          <text x="20" y="52" font-size="34" font-weight="900" letter-spacing="-0.01em"
            fill="#ffffff" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">Best Pitchers</text>
          <!-- Date · Week — bigger, accent color -->
          <text x="20" y="80" font-size="15" font-weight="700" letter-spacing="0.06em"
            fill="#06b6d4" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">
            {{ wpiDateDisplay }} · WK {{ wpiWeekLabel }}
          </text>
          <line x1="0" y1="94" x2="540" y2="94" stroke="#1e2130" stroke-width="1"/>

          <!-- ── PLAYER ROWS (5 × 100px each, start y=94) ── -->
          <g v-for="(p, i) in wpiTopPitchers" :key="'pt'+i">
            <!-- Row bg -->
            <rect x="0" :y="94+i*101" width="540" :height="100"
              :fill="i===0?'rgba(6,182,212,0.09)':'rgba(255,255,255,0.012)'"/>
            <line x1="0" :y1="94+(i+1)*101" x2="540" :y2="94+(i+1)*101"
              stroke="#1e2130" stroke-width="1"/>

            <!-- Headshot — flush left edge, radius 42 -->
            <circle cx="58" :cy="94+i*101+50" r="36"
              fill="rgba(0,0,0,0.4)"
              :stroke="i===0?'rgba(6,182,212,0.5)':'rgba(255,255,255,0.06)'" stroke-width="2"/>
            <image :href="p.headshot" x="22" :y="94+i*101+14"
              width="72" height="72" preserveAspectRatio="xMidYMid slice"
              style="clip-path:circle(36px at 36px 36px)"/>

            <!-- Rank -->
            <text x="106" :y="94+i*101+28" font-size="12" font-weight="900"
              :fill="i===0?'#06b6d4':'#4b5563'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">#{{ i+1 }}</text>

            <!-- Name + Team · Pos on same line -->
            <text x="106" :y="94+i*101+50" font-size="17" font-weight="800" fill="#ffffff"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.name }}</text>
            <text :x="106 + Math.min(p.name.length * 10, 200)" :y="94+i*101+50"
              font-size="12" font-weight="600" fill="#6b7280"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">  {{ p.team }} · {{ p.position }}</text>

            <!-- Stat line — white, bigger -->
            <text x="106" :y="94+i*101+73" font-size="14" font-weight="600" fill="#e5e7eb"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.statLine }}</text>

            <!-- WP % — hero number right side -->
            <text x="520" :y="94+i*101+48" text-anchor="end"
              :font-size="i===0?'36':'30'" font-weight="900"
              :fill="i===0?'#06b6d4':'#6b7280'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">+{{ p.wpImpact.toFixed(1) }}%</text>
            <!-- "win probability change" label -->
            <text x="520" :y="94+i*101+68" text-anchor="end" font-size="11"
              :fill="i===0?'#ffffff':'#4b5563'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">win prob change</text>

            <!-- Thin bar -->
            <rect x="106" :y="94+i*101+84" width="200" height="3" rx="1"
              fill="rgba(255,255,255,0.05)"/>
            <rect x="106" :y="94+i*101+84"
              :width="wpiTopPitchers.length && wpiTopPitchers[0].wpImpact>0 ? Math.min(200,(p.wpImpact/wpiTopPitchers[0].wpImpact)*200) : 0"
              height="3" rx="1"
              :fill="i===0?'#06b6d4':'rgba(107,114,128,0.5)'"/>
          </g>

          <!-- Empty state -->
          <text v-if="!wpiTopPitchers.length" x="270" y="340" text-anchor="middle"
            font-size="15" fill="#374151"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">Load yesterday's data above</text>

          <!-- Watermark -->
          <line x1="0" y1="593" x2="540" y2="593" stroke="#1e2130" stroke-width="1"/>
          <text x="270" y="596" text-anchor="middle" font-size="9" fill="#1a1f2e"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">ultimatefantasydashboard.com</text>
        </svg>
      </div>
    </div>



    <!-- 29 · WIN PROBABILITY CARD — Manual Input -->
    <div class="post-wrap" style="padding-bottom:60px;">
      <div class="post-label">29 · Win Probability Card — Manual</div>

      <!-- ── Controls ── -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">

        <!-- Team 1 -->
        <div>
          <div style="font-size:11px;font-weight:700;color:#06b6d4;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Team 1 (Cyan)</div>
          <input v-model="wplPresetTeams[0].name" placeholder="Team name"
            style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;margin-bottom:6px;box-sizing:border-box;">
          <input v-model="wplPresetTeams[0].logo" placeholder="Paste ESPN logo URL here"
            style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:12px;box-sizing:border-box;">
          <div v-if="wplPresetTeams[0].logo" style="margin-top:6px;display:flex;align-items:center;gap:8px;">
            <img :src="wplPresetTeams[0].logo" style="width:36px;height:36px;border-radius:50%;border:2px solid #06b6d4;object-fit:cover;"
              @error="($event.target as HTMLImageElement).style.display='none'">
            <span style="font-size:11px;color:#4b5563;">Logo preview</span>
          </div>
        </div>

        <!-- Team 2 -->
        <div>
          <div style="font-size:11px;font-weight:700;color:#f97316;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Team 2 (Orange)</div>
          <input v-model="wplPresetTeams[1].name" placeholder="Team name"
            style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;margin-bottom:6px;box-sizing:border-box;">
          <input v-model="wplPresetTeams[1].logo" placeholder="Paste ESPN logo URL here"
            style="width:100%;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:12px;box-sizing:border-box;">
          <div v-if="wplPresetTeams[1].logo" style="margin-top:6px;display:flex;align-items:center;gap:8px;">
            <img :src="wplPresetTeams[1].logo" style="width:36px;height:36px;border-radius:50%;border:2px solid #f97316;object-fit:cover;"
              @error="($event.target as HTMLImageElement).style.display='none'">
            <span style="font-size:11px;color:#4b5563;">Logo preview</span>
          </div>
        </div>
      </div>

      <!-- Week label -->
      <div style="margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Week Label</div>
        <input v-model="wplWeekLabel" style="background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:7px 10px;font-size:13px;width:160px;">
      </div>

      <!-- Day inputs — Team 1 win % (team 2 = 100 - team1). 0 = skip day -->
      <div style="margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">
          Team 1 Win % per day &nbsp;·&nbsp; <span style="color:#4b5563;font-weight:400;text-transform:none;">Enter 0 to hide a day</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <div v-for="(day, i) in wplDayInputs" :key="i" style="display:flex;flex-direction:column;align-items:center;gap:4px;">
            <div style="font-size:11px;font-weight:700;color:#9ca3af;">{{ day.label }}</div>
            <input type="number" v-model.number="day.val" min="0" max="100"
              style="width:58px;background:#1e2130;color:#e5e7eb;border:1px solid #374151;border-radius:8px;padding:6px;font-size:14px;font-weight:700;text-align:center;">
            <div style="font-size:10px;color:#4b5563;">{{ day.val > 0 ? (100 - day.val) + '%' : '—' }}</div>
          </div>
        </div>
      </div>

      <!-- ── Version A: Trash-talk hype ── -->
      <div style="font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Version A · Trash Talk / Hype</div>
      <div style="width:540px;background:#0f1117;overflow:hidden;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">

        <!-- MARKETING HEADER BAND -->
        <div style="background:linear-gradient(135deg,#0a0c14 0%,#111827 100%);padding:18px 20px 16px;border-bottom:1px solid rgba(255,255,255,0.06);position:relative;overflow:hidden;">
          <!-- BG glow -->
          <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 50%,rgba(6,182,212,0.12) 0%,transparent 60%);pointer-events:none;"></div>
          <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 80% 50%,rgba(249,115,22,0.1) 0%,transparent 60%);pointer-events:none;"></div>
          <!-- Top gold bar -->
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#06b6d4,#eab308,#f97316);"></div>
          <!-- Content -->
          <div style="position:relative;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <img src="/UFD_V8.png" style="height:32px;width:auto;object-fit:contain;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:10px;color:#4b5563;">⚾ Fantasy Baseball</span>
              <span style="font-size:10px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.08em;">· {{ wplWeekLabel }}</span>
            </div>
          </div>
          <!-- Hook line -->
          <div style="position:relative;">
            <div style="font-size:11px;font-weight:700;color:#eab308;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:4px;">📊 Live Matchup Tracker</div>
            <div style="font-size:26px;font-weight:900;color:#ffffff;line-height:1.05;letter-spacing:-0.01em;">WHO'S SWEATING TODAY?</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px;font-weight:400;">Win probability shifts every day — track it live on UFD</div>
          </div>
        </div>

        <!-- Team cards -->
        <div style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="flex:1;background:rgba(6,182,212,0.05);padding:16px 14px;text-align:center;border-right:1px solid rgba(255,255,255,0.06);">
            <img v-if="wplPresetTeams[0].logo" :src="wplPresetTeams[0].logo"
              style="width:56px;height:56px;border-radius:50%;border:2px solid #06b6d4;object-fit:cover;margin:0 auto 8px;display:block;"
              @error="($event.target as HTMLImageElement).style.display='none'">
            <div v-else style="width:56px;height:56px;border-radius:50%;background:rgba(6,182,212,0.15);border:2px solid rgba(6,182,212,0.3);margin:0 auto 8px;"></div>
            <div style="font-size:12px;font-weight:700;color:#06b6d4;margin-bottom:4px;">{{ wplPresetTeams[0].name || 'Team 1' }}</div>
            <div style="font-size:36px;font-weight:900;color:#06b6d4;line-height:1;">{{ wplProb1.toFixed(1) }}%</div>
          </div>
          <div style="display:flex;align-items:center;padding:0 10px;font-size:14px;font-weight:900;color:#374151;flex-shrink:0;">VS</div>
          <div style="flex:1;background:rgba(249,115,22,0.05);padding:16px 14px;text-align:center;border-left:1px solid rgba(255,255,255,0.06);">
            <img v-if="wplPresetTeams[1].logo" :src="wplPresetTeams[1].logo"
              style="width:56px;height:56px;border-radius:50%;border:2px solid #f97316;object-fit:cover;margin:0 auto 8px;display:block;"
              @error="($event.target as HTMLImageElement).style.display='none'">
            <div v-else style="width:56px;height:56px;border-radius:50%;background:rgba(249,115,22,0.12);border:2px solid rgba(249,115,22,0.3);margin:0 auto 8px;"></div>
            <div style="font-size:12px;font-weight:700;color:#f97316;margin-bottom:4px;">{{ wplPresetTeams[1].name || 'Team 2' }}</div>
            <div style="font-size:36px;font-weight:900;color:#f97316;line-height:1;">{{ wplProb2.toFixed(1) }}%</div>
          </div>
        </div>

        <!-- Progress bar — full width, no margin, no radius -->
        <div style="height:8px;background:linear-gradient(90deg,#ea580c,#f97316);position:relative;">
          <div :style="{position:'absolute',left:0,top:0,height:'100%',width:wplProb1+'%',background:'linear-gradient(90deg,#06b6d4,#0891b2)'}"></div>
        </div>

        <!-- Chart -->
        <div style="background:#0a0c14;padding:14px 10px 10px;">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#374151;margin-bottom:8px;padding-left:4px;">📈 WIN PROBABILITY TREND</div>
          <svg v-if="wplD1.length" viewBox="0 0 540 220" style="display:block;width:100%;height:auto;">
            <defs>
              <linearGradient id="wlg1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35"/><stop offset="100%" stop-color="#06b6d4" stop-opacity="0.02"/>
              </linearGradient>
              <linearGradient id="wlg2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f97316" stop-opacity="0.35"/><stop offset="100%" stop-color="#f97316" stop-opacity="0.02"/>
              </linearGradient>
            </defs>
            <template v-for="pct in [0,25,50,75,100]" :key="pct">
              <line x1="48" :y1="wplSvgY(pct)" x2="492" :y2="wplSvgY(pct)" :stroke="pct===50?'#374151':'#1e2130'" :stroke-width="pct===50?1.5:1" stroke-dasharray="3 4"/>
              <text x="42" :y="wplSvgY(pct)+4" text-anchor="end" font-size="10" :fill="pct===50?'#6b7280':'#374151'" font-family="Helvetica Neue,Arial,sans-serif">{{ pct }}%</text>
            </template>
            <path :d="wplFill1Computed" fill="url(#wlg1)"/>
            <path :d="wplFill2Computed" fill="url(#wlg2)"/>
            <path :d="wplPath1Computed" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linejoin="round"/>
            <path :d="wplPath2Computed" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linejoin="round"/>
            <template v-for="(v,i) in wplD1" :key="'d1'+i">
              <rect :x="wplSvgX(i)-17" :y="v>=wplD2[i]?wplSvgY(v)-24:wplSvgY(v)+7" width="34" height="16" rx="4" fill="#06b6d4" opacity="0.9"/>
              <text :x="wplSvgX(i)" :y="v>=wplD2[i]?wplSvgY(v)-12:wplSvgY(v)+19" text-anchor="middle" font-size="10" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial,sans-serif">{{ v }}</text>
              <circle :cx="wplSvgX(i)" :cy="wplSvgY(v)" r="4.5" fill="#06b6d4" stroke="#0f1117" stroke-width="1.5"/>
            </template>
            <template v-for="(v,i) in wplD2" :key="'d2'+i">
              <rect :x="wplSvgX(i)-17" :y="v>wplD1[i]?wplSvgY(v)-24:wplSvgY(v)+7" width="34" height="16" rx="4" fill="#f97316" opacity="0.9"/>
              <text :x="wplSvgX(i)" :y="v>wplD1[i]?wplSvgY(v)-12:wplSvgY(v)+19" text-anchor="middle" font-size="10" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial,sans-serif">{{ v }}</text>
              <circle :cx="wplSvgX(i)" :cy="wplSvgY(v)" r="4.5" fill="#f97316" stroke="#0f1117" stroke-width="1.5"/>
            </template>
            <template v-for="(label,i) in wplLabels" :key="'xl'+i">
              <text :x="wplSvgX(i)" y="214" text-anchor="middle" font-size="11" font-weight="700" fill="#6b7280" font-family="Helvetica Neue,Arial,sans-serif">{{ label }}</text>
            </template>
          </svg>
          <div v-else style="height:80px;display:flex;align-items:center;justify-content:center;color:#4b5563;font-size:13px;">
            Enter win probabilities above to see the chart
          </div>
        </div>

        <!-- Footer CTA -->
        <div style="background:#0a0c14;padding:10px 16px 12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:10px;color:#374151;letter-spacing:0.04em;">ultimatefantasydashboard.com</div>
          <div style="font-size:10px;font-weight:700;color:#eab308;letter-spacing:0.06em;text-transform:uppercase;">Track yours free →</div>
        </div>
      </div>

      <!-- ── VERSION B: Feature showcase tone ── -->
      <div style="margin-top:24px;">
        <div style="font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Version B · Feature Showcase</div>
      </div>
      <div style="width:540px;background:#0f1117;overflow:hidden;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;">

        <!-- FEATURE HEADER BAND -->
        <div style="background:#0a0c14;padding:18px 20px 16px;border-bottom:1px solid rgba(255,255,255,0.06);position:relative;overflow:hidden;">
          <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#06b6d4,#eab308,#f97316);"></div>
          <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 80% 50%,rgba(234,179,8,0.08) 0%,transparent 60%);pointer-events:none;"></div>
          <!-- Top row: logo + week -->
          <div style="position:relative;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <img src="/UFD_V8.png" style="height:32px;width:auto;object-fit:contain;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:10px;color:#4b5563;">⚾ Fantasy Baseball</span>
              <span style="font-size:10px;font-weight:700;color:#374151;letter-spacing:0.08em;text-transform:uppercase;">· {{ wplWeekLabel }}</span>
            </div>
          </div>
          <!-- Feature hook -->
          <div style="position:relative;">
            <div style="font-size:11px;font-weight:700;color:#06b6d4;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:4px;">Ultimate Fantasy Dashboard</div>
            <div style="font-size:26px;font-weight:900;color:#ffffff;line-height:1.05;letter-spacing:-0.01em;">LIVE WIN PROBABILITY</div>
            <div style="font-size:12px;color:#6b7280;margin-top:5px;font-weight:400;">See how each day of your matchup shifts the odds — updated daily</div>
          </div>
        </div>

        <!-- Team cards -->
        <div style="display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="flex:1;background:rgba(6,182,212,0.05);padding:16px 14px;text-align:center;border-right:1px solid rgba(255,255,255,0.06);">
            <img v-if="wplPresetTeams[0].logo" :src="wplPresetTeams[0].logo"
              style="width:56px;height:56px;border-radius:50%;border:2px solid #06b6d4;object-fit:cover;margin:0 auto 8px;display:block;"
              @error="($event.target as HTMLImageElement).style.display='none'">
            <div v-else style="width:56px;height:56px;border-radius:50%;background:rgba(6,182,212,0.15);border:2px solid rgba(6,182,212,0.3);margin:0 auto 8px;"></div>
            <div style="font-size:12px;font-weight:700;color:#06b6d4;margin-bottom:4px;">{{ wplPresetTeams[0].name || 'Team 1' }}</div>
            <div style="font-size:36px;font-weight:900;color:#06b6d4;line-height:1;">{{ wplProb1.toFixed(1) }}%</div>
            <div style="font-size:10px;color:#4b5563;margin-top:4px;">win probability</div>
          </div>
          <div style="display:flex;align-items:center;padding:0 10px;font-size:14px;font-weight:900;color:#374151;flex-shrink:0;">VS</div>
          <div style="flex:1;background:rgba(249,115,22,0.05);padding:16px 14px;text-align:center;border-left:1px solid rgba(255,255,255,0.06);">
            <img v-if="wplPresetTeams[1].logo" :src="wplPresetTeams[1].logo"
              style="width:56px;height:56px;border-radius:50%;border:2px solid #f97316;object-fit:cover;margin:0 auto 8px;display:block;"
              @error="($event.target as HTMLImageElement).style.display='none'">
            <div v-else style="width:56px;height:56px;border-radius:50%;background:rgba(249,115,22,0.12);border:2px solid rgba(249,115,22,0.3);margin:0 auto 8px;"></div>
            <div style="font-size:12px;font-weight:700;color:#f97316;margin-bottom:4px;">{{ wplPresetTeams[1].name || 'Team 2' }}</div>
            <div style="font-size:36px;font-weight:900;color:#f97316;line-height:1;">{{ wplProb2.toFixed(1) }}%</div>
            <div style="font-size:10px;color:#4b5563;margin-top:4px;">win probability</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div style="height:8px;background:linear-gradient(90deg,#ea580c,#f97316);position:relative;">
          <div :style="{position:'absolute',left:0,top:0,height:'100%',width:wplProb1+'%',background:'linear-gradient(90deg,#06b6d4,#0891b2)'}"></div>
        </div>

        <!-- Chart -->
        <div style="background:#0a0c14;padding:14px 10px 10px;">
          <div style="font-size:9px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#374151;margin-bottom:8px;padding-left:4px;">📈 WIN PROBABILITY TREND · {{ wplWeekLabel }}</div>
          <svg v-if="wplD1.length" viewBox="0 0 540 220" style="display:block;width:100%;height:auto;">
            <defs>
              <linearGradient id="wlg1b" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35"/><stop offset="100%" stop-color="#06b6d4" stop-opacity="0.02"/>
              </linearGradient>
              <linearGradient id="wlg2b" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#f97316" stop-opacity="0.35"/><stop offset="100%" stop-color="#f97316" stop-opacity="0.02"/>
              </linearGradient>
            </defs>
            <template v-for="pct in [0,25,50,75,100]" :key="'b'+pct">
              <line x1="48" :y1="wplSvgY(pct)" x2="492" :y2="wplSvgY(pct)" :stroke="pct===50?'#374151':'#1e2130'" :stroke-width="pct===50?1.5:1" stroke-dasharray="3 4"/>
              <text x="42" :y="wplSvgY(pct)+4" text-anchor="end" font-size="10" :fill="pct===50?'#6b7280':'#374151'" font-family="Helvetica Neue,Arial,sans-serif">{{ pct }}%</text>
            </template>
            <path :d="wplFill1Computed" fill="url(#wlg1b)"/>
            <path :d="wplFill2Computed" fill="url(#wlg2b)"/>
            <path :d="wplPath1Computed" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linejoin="round"/>
            <path :d="wplPath2Computed" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linejoin="round"/>
            <template v-for="(v,i) in wplD1" :key="'b1'+i">
              <rect :x="wplSvgX(i)-17" :y="v>=wplD2[i]?wplSvgY(v)-24:wplSvgY(v)+7" width="34" height="16" rx="4" fill="#06b6d4" opacity="0.9"/>
              <text :x="wplSvgX(i)" :y="v>=wplD2[i]?wplSvgY(v)-12:wplSvgY(v)+19" text-anchor="middle" font-size="10" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial,sans-serif">{{ v }}</text>
              <circle :cx="wplSvgX(i)" :cy="wplSvgY(v)" r="4.5" fill="#06b6d4" stroke="#0f1117" stroke-width="1.5"/>
            </template>
            <template v-for="(v,i) in wplD2" :key="'b2'+i">
              <rect :x="wplSvgX(i)-17" :y="v>wplD1[i]?wplSvgY(v)-24:wplSvgY(v)+7" width="34" height="16" rx="4" fill="#f97316" opacity="0.9"/>
              <text :x="wplSvgX(i)" :y="v>wplD1[i]?wplSvgY(v)-12:wplSvgY(v)+19" text-anchor="middle" font-size="10" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial,sans-serif">{{ v }}</text>
              <circle :cx="wplSvgX(i)" :cy="wplSvgY(v)" r="4.5" fill="#f97316" stroke="#0f1117" stroke-width="1.5"/>
            </template>
            <template v-for="(label,i) in wplLabels" :key="'bxl'+i">
              <text :x="wplSvgX(i)" y="214" text-anchor="middle" font-size="11" font-weight="700" fill="#6b7280" font-family="Helvetica Neue,Arial,sans-serif">{{ label }}</text>
            </template>
          </svg>
          <div v-else style="height:80px;display:flex;align-items:center;justify-content:center;color:#4b5563;font-size:13px;">
            Enter win probabilities above to see the chart
          </div>
        </div>

        <!-- Footer -->
        <div style="background:#0a0c14;padding:10px 16px 12px;border-top:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:space-between;">
          <div style="font-size:10px;color:#374151;letter-spacing:0.04em;">ultimatefantasydashboard.com</div>
          <div style="font-size:10px;font-weight:700;color:#06b6d4;letter-spacing:0.06em;text-transform:uppercase;">Get your league's data →</div>
        </div>
      </div>
    </div>

  </template><!-- end interactive tab -->

  <!-- ══════════════════════════════════════════════════════════
       STORIES TAB  — 9:16 vertical format (1080 × 1920 → displayed at 540×960)
       Safe zones: top 140px (profile info), bottom 220px (CTA/buttons)
  ══════════════════════════════════════════════════════════ -->
  <template v-if="activeType === 'stories'">
    <div class="section-label">📱 Stories — 9:16 format · Screenshot each card below</div>
    <div style="display:flex;flex-direction:column;gap:48px;padding:24px 0;">

      <!-- ── SHARED DATA CONTROLS ── -->
      <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:20px 24px;max-width:560px;">
        <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:14px;">📅 Data Controls — shared with Interactive tab</div>
        <div style="display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap;">
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Date</div>
            <input v-model="wpiDate" class="wp-input" placeholder="20260329" style="width:120px;">
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:5px;">Week</div>
            <input v-model="wpiWeekLabel" class="wp-input" style="width:60px;" placeholder="1">
          </div>
          <button @click="loadWpiData" :disabled="wpiLoading" class="wpi-load-btn">
            <span v-if="wpiLoading">⏳ Loading…</span>
            <span v-else>⚡ Load Data</span>
          </button>
        </div>
        <div v-if="wpiError" style="color:#ef4444;font-size:12px;margin-top:8px;">⚠️ {{ wpiError }}</div>
        <div v-if="wpiStatus" style="color:#22c55e;font-size:12px;margin-top:8px;">{{ wpiStatus }}</div>
      </div>

      <!-- ══ STORY 1: BEST BATTERS ══ -->
      <div>
        <div class="post-label">📱 Story · Best Batters</div>
        <div style="width:540px;height:960px;background:#0d0f18;border-radius:16px;overflow:hidden;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;box-shadow:0 0 0 1px rgba(255,255,255,0.06);">
          <!-- BG -->
          <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% -10%,rgba(234,179,8,0.18) 0%,transparent 55%);pointer-events:none;"></div>
          <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 105%,rgba(234,179,8,0.08) 0%,transparent 50%);pointer-events:none;"></div>
          <!-- Top accent line -->
          <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,transparent,#eab308,transparent);"></div>

          <!-- Content — starts below safe zone -->
          <div style="position:absolute;top:150px;left:0;right:0;bottom:220px;padding:0 32px;display:flex;flex-direction:column;">
            <!-- Branding -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
              <img src="/UFD_V8.png" style="height:30px;width:auto;">
              <span style="font-size:11px;color:#4b5563;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
            </div>
            <!-- Title -->
            <div style="margin-bottom:24px;">
              <div style="font-size:13px;font-weight:700;color:#eab308;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">⚾ Week {{ wpiWeekLabel }} · {{ wpiDateDisplay }}</div>
              <div style="font-size:52px;font-weight:900;color:#fff;line-height:0.95;letter-spacing:-0.02em;">BEST</div>
              <div style="font-size:52px;font-weight:900;color:#eab308;line-height:0.95;letter-spacing:-0.02em;">BATTERS</div>
              <div style="font-size:13px;color:#6b7280;margin-top:10px;font-weight:500;">Fantasy win probability impact</div>
            </div>

            <!-- Player rows — flex:1 so they fill remaining space -->
            <div v-if="wpiTopBatters.length" style="flex:1;display:flex;flex-direction:column;gap:10px;">
              <div v-for="(p, i) in wpiTopBatters.slice(0,5)" :key="'sb'+i"
                :style="{
                  background: i===0 ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.04)',
                  border: i===0 ? '1px solid rgba(234,179,8,0.35)' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius:'14px', padding:'16px 18px', display:'flex', alignItems:'center', gap:'14px',
                  flex:'1'
                }">
                <!-- Rank -->
                <div :style="{
                  width:'32px',height:'32px',borderRadius:'50%',flexShrink:0,
                  background: i===0?'#eab308':'rgba(255,255,255,0.07)',
                  display:'flex',alignItems:'center',justifyContent:'center'
                }">
                  <span :style="{fontSize:'14px',fontWeight:'900',color:i===0?'#0a0c14':'#9ca3af'}">#{{i+1}}</span>
                </div>
                <!-- Headshot -->
                <img v-if="p.headshot" :src="p.headshot"
                  style="width:60px;height:60px;border-radius:50%;object-fit:cover;flex-shrink:0;"
                  :style="{border: i===0?'2.5px solid #eab308':'2px solid rgba(255,255,255,0.1)'}"
                  @error="($event.target as HTMLImageElement).style.display='none'">
                <div v-else :style="{width:'60px',height:'60px',borderRadius:'50%',flexShrink:0,background:i===0?'rgba(234,179,8,0.15)':'rgba(255,255,255,0.05)',border:i===0?'2px solid #eab308':'2px solid rgba(255,255,255,0.1)'}"></div>
                <!-- Info -->
                <div style="flex:1;min-width:0;">
                  <div :style="{fontSize:'18px',fontWeight:'800',color:'#ffffff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}">{{ p.name }}</div>
                  <div style="font-size:13px;color:#9ca3af;margin-top:2px;font-weight:500;">{{ p.team }} · {{ p.position }}</div>
                  <div style="font-size:12px;color:#ffffff;margin-top:3px;opacity:0.7;">{{ p.statLine }}</div>
                </div>
                <!-- WP -->
                <div style="text-align:right;flex-shrink:0;">
                  <div :style="{fontSize:'24px',fontWeight:'900',color:i===0?'#eab308':'#ffffff',lineHeight:'1'}">+{{ p.wpImpact.toFixed(1) }}%</div>
                  <div style="font-size:10px;color:#6b7280;margin-top:3px;font-weight:500;">WP impact</div>
                </div>
              </div>
            </div>
            <div v-else style="flex:1;display:flex;align-items:center;justify-content:center;color:#374151;font-size:15px;">Load data above to populate</div>
          </div>

          <!-- Watermark — just above bottom safe zone -->
          <div style="position:absolute;bottom:224px;left:0;right:0;text-align:center;">
            <div style="font-size:11px;color:#1e2130;letter-spacing:0.06em;">ultimatefantasydashboard.com</div>
          </div>
          <!-- Bottom accent -->
          <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#eab308,transparent);"></div>
        </div>
      </div>

      <!-- ══ STORY 2: BEST PITCHERS ══ -->
      <div>
        <div class="post-label">📱 Story · Best Pitchers</div>
        <div style="width:540px;height:960px;background:#0d0f18;border-radius:16px;overflow:hidden;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;box-shadow:0 0 0 1px rgba(255,255,255,0.06);">
          <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% -10%,rgba(6,182,212,0.18) 0%,transparent 55%);pointer-events:none;"></div>
          <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 20% 105%,rgba(6,182,212,0.08) 0%,transparent 50%);pointer-events:none;"></div>
          <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,transparent,#06b6d4,transparent);"></div>

          <div style="position:absolute;top:150px;left:0;right:0;bottom:220px;padding:0 32px;display:flex;flex-direction:column;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
              <img src="/UFD_V8.png" style="height:30px;width:auto;">
              <span style="font-size:11px;color:#4b5563;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
            </div>
            <div style="margin-bottom:24px;">
              <div style="font-size:13px;font-weight:700;color:#06b6d4;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px;">⚾ Week {{ wpiWeekLabel }} · {{ wpiDateDisplay }}</div>
              <div style="font-size:52px;font-weight:900;color:#fff;line-height:0.95;letter-spacing:-0.02em;">BEST</div>
              <div style="font-size:52px;font-weight:900;color:#06b6d4;line-height:0.95;letter-spacing:-0.02em;">PITCHERS</div>
              <div style="font-size:13px;color:#6b7280;margin-top:10px;font-weight:500;">Fantasy win probability impact</div>
            </div>

            <div v-if="wpiTopPitchers.length" style="flex:1;display:flex;flex-direction:column;gap:10px;">
              <div v-for="(p, i) in wpiTopPitchers.slice(0,5)" :key="'sp'+i"
                :style="{
                  background: i===0 ? 'rgba(6,182,212,0.1)' : 'rgba(255,255,255,0.04)',
                  border: i===0 ? '1px solid rgba(6,182,212,0.35)' : '1px solid rgba(255,255,255,0.07)',
                  borderRadius:'14px', padding:'16px 18px', display:'flex', alignItems:'center', gap:'14px',
                  flex:'1'
                }">
                <div :style="{
                  width:'32px',height:'32px',borderRadius:'50%',flexShrink:0,
                  background: i===0?'#06b6d4':'rgba(255,255,255,0.07)',
                  display:'flex',alignItems:'center',justifyContent:'center'
                }">
                  <span :style="{fontSize:'14px',fontWeight:'900',color:i===0?'#0a0c14':'#9ca3af'}">#{{i+1}}</span>
                </div>
                <img v-if="p.headshot" :src="p.headshot"
                  style="width:60px;height:60px;border-radius:50%;object-fit:cover;flex-shrink:0;"
                  :style="{border: i===0?'2.5px solid #06b6d4':'2px solid rgba(255,255,255,0.1)'}"
                  @error="($event.target as HTMLImageElement).style.display='none'">
                <div v-else :style="{width:'60px',height:'60px',borderRadius:'50%',flexShrink:0,background:i===0?'rgba(6,182,212,0.12)':'rgba(255,255,255,0.05)',border:i===0?'2px solid #06b6d4':'2px solid rgba(255,255,255,0.1)'}"></div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:18px;font-weight:800;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ p.name }}</div>
                  <div style="font-size:13px;color:#9ca3af;margin-top:2px;font-weight:500;">{{ p.team }} · {{ p.position }}</div>
                  <div style="font-size:12px;color:#ffffff;margin-top:3px;opacity:0.7;">{{ p.statLine }}</div>
                </div>
                <div style="text-align:right;flex-shrink:0;">
                  <div :style="{fontSize:'24px',fontWeight:'900',color:i===0?'#06b6d4':'#ffffff',lineHeight:'1'}">+{{ p.wpImpact.toFixed(1) }}%</div>
                  <div style="font-size:10px;color:#6b7280;margin-top:3px;font-weight:500;">WP impact</div>
                </div>
              </div>
            </div>
            <div v-else style="flex:1;display:flex;align-items:center;justify-content:center;color:#374151;font-size:15px;">Load data above to populate</div>
          </div>

          <div style="position:absolute;bottom:224px;left:0;right:0;text-align:center;">
            <div style="font-size:11px;color:#1e2130;letter-spacing:0.06em;">ultimatefantasydashboard.com</div>
          </div>
          <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#06b6d4,transparent);"></div>
        </div>
      </div>

      <!-- ══ STORY 3: WIN PROBABILITY ══ -->
      <div>
        <div class="post-label">📱 Story · Win Probability — uses Graphic 29 inputs (Interactive tab)</div>
        <div style="width:540px;height:960px;background:#0d0f18;border-radius:16px;overflow:hidden;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;box-shadow:0 0 0 1px rgba(255,255,255,0.06);">
          <!-- Dual gradient bg -->
          <div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(6,182,212,0.14) 0%,transparent 45%,rgba(249,115,22,0.12) 100%);pointer-events:none;"></div>
          <div style="position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#06b6d4,#f97316);"></div>

          <!-- Content -->
          <div style="position:absolute;top:150px;left:0;right:0;bottom:220px;padding:0 28px;display:flex;flex-direction:column;">
            <!-- Header -->
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
              <img src="/UFD_V8.png" style="height:30px;width:auto;">
              <span style="font-size:11px;color:#4b5563;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
              <span style="margin-left:auto;font-size:12px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.1em;">{{ wplWeekLabel }}</span>
            </div>

            <!-- Title -->
            <div style="text-align:center;margin-bottom:20px;padding-top:10px;">
              <div style="font-size:42px;font-weight:900;color:#fff;line-height:1;letter-spacing:0.01em;">WIN PROBABILITY</div>
              <div style="font-size:12px;color:#4b5563;margin-top:6px;font-weight:500;">Live probability based on current stats</div>
            </div>

            <!-- Team cards — bigger to fill space -->
            <div style="display:flex;gap:14px;margin-bottom:18px;">
              <!-- Team 1 -->
              <div style="flex:1;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.3);border-radius:18px;padding:22px 14px;text-align:center;">
                <img v-if="wplPresetTeams[0].logo" :src="wplPresetTeams[0].logo"
                  style="width:80px;height:80px;border-radius:50%;border:3px solid #06b6d4;object-fit:cover;margin:0 auto 12px;display:block;"
                  @error="($event.target as HTMLImageElement).style.display='none'">
                <div v-else style="width:80px;height:80px;border-radius:50%;background:rgba(6,182,212,0.15);border:3px solid rgba(6,182,212,0.4);margin:0 auto 12px;"></div>
                <div style="font-size:15px;font-weight:700;color:#06b6d4;margin-bottom:10px;word-break:break-word;line-height:1.2;">{{ wplPresetTeams[0].name || 'Team 1' }}</div>
                <div style="font-size:52px;font-weight:900;color:#06b6d4;line-height:1;">{{ wplProb1.toFixed(1) }}%</div>
              </div>
              <!-- VS -->
              <div style="display:flex;align-items:center;flex-shrink:0;padding:0 4px;">
                <span style="font-size:20px;font-weight:900;color:#374151;">VS</span>
              </div>
              <!-- Team 2 -->
              <div style="flex:1;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.3);border-radius:18px;padding:22px 14px;text-align:center;">
                <img v-if="wplPresetTeams[1].logo" :src="wplPresetTeams[1].logo"
                  style="width:80px;height:80px;border-radius:50%;border:3px solid #f97316;object-fit:cover;margin:0 auto 12px;display:block;"
                  @error="($event.target as HTMLImageElement).style.display='none'">
                <div v-else style="width:80px;height:80px;border-radius:50%;background:rgba(249,115,22,0.12);border:3px solid rgba(249,115,22,0.4);margin:0 auto 12px;"></div>
                <div style="font-size:15px;font-weight:700;color:#f97316;margin-bottom:10px;word-break:break-word;line-height:1.2;">{{ wplPresetTeams[1].name || 'Team 2' }}</div>
                <div style="font-size:52px;font-weight:900;color:#f97316;line-height:1;">{{ wplProb2.toFixed(1) }}%</div>
              </div>
            </div>

            <!-- Progress bar -->
            <div style="height:14px;border-radius:8px;overflow:hidden;background:rgba(249,115,22,0.3);margin-bottom:22px;position:relative;">
              <div :style="{position:'absolute',left:0,top:0,height:'100%',width:wplProb1+'%',background:'linear-gradient(90deg,#06b6d4,#0891b2)',borderRadius:'8px',transition:'width 0.3s'}"></div>
            </div>

            <!-- Chart — fills remaining space -->
            <div style="flex:1;background:rgba(255,255,255,0.03);border-radius:14px;padding:14px 10px 10px;border:1px solid rgba(255,255,255,0.06);min-height:0;">
              <div style="font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#4b5563;margin-bottom:8px;padding-left:4px;">📈 WIN PROBABILITY TREND</div>
              <svg v-if="wplD1.length" viewBox="0 0 508 190" style="display:block;width:100%;height:calc(100% - 30px);" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="slg1s" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.35"/><stop offset="100%" stop-color="#06b6d4" stop-opacity="0.02"/>
                  </linearGradient>
                  <linearGradient id="slg2s" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#f97316" stop-opacity="0.35"/><stop offset="100%" stop-color="#f97316" stop-opacity="0.02"/>
                  </linearGradient>
                </defs>
                <template v-for="pct in [0,25,50,75,100]" :key="pct">
                  <line x1="42" :y1="storyWplY(pct)" x2="500" :y2="storyWplY(pct)"
                    :stroke="pct===50?'#374151':'#1e2130'" :stroke-width="pct===50?1.5:1" stroke-dasharray="3 4"/>
                  <text x="36" :y="storyWplY(pct)+4" text-anchor="end" font-size="9" :fill="pct===50?'#6b7280':'#374151'"
                    font-family="Helvetica Neue,Arial,sans-serif">{{ pct }}%</text>
                </template>
                <path :d="storyFill1" fill="url(#slg1s)"/>
                <path :d="storyFill2" fill="url(#slg2s)"/>
                <path :d="storyLine1" fill="none" stroke="#06b6d4" stroke-width="2.5" stroke-linejoin="round"/>
                <path :d="storyLine2" fill="none" stroke="#f97316" stroke-width="2.5" stroke-linejoin="round"/>
                <template v-for="(v,i) in wplD1" :key="'sv1s'+i">
                  <rect :x="storyWplX(i)-16" :y="v>=wplD2[i]?storyWplY(v)-22:storyWplY(v)+6" width="32" height="15" rx="4" fill="#06b6d4" opacity="0.95"/>
                  <text :x="storyWplX(i)" :y="v>=wplD2[i]?storyWplY(v)-10:storyWplY(v)+17" text-anchor="middle" font-size="9" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial,sans-serif">{{ v }}</text>
                  <circle :cx="storyWplX(i)" :cy="storyWplY(v)" r="4" fill="#06b6d4" stroke="#0d0f18" stroke-width="1.5"/>
                </template>
                <template v-for="(v,i) in wplD2" :key="'sv2s'+i">
                  <rect :x="storyWplX(i)-16" :y="v>wplD1[i]?storyWplY(v)-22:storyWplY(v)+6" width="32" height="15" rx="4" fill="#f97316" opacity="0.95"/>
                  <text :x="storyWplX(i)" :y="v>wplD1[i]?storyWplY(v)-10:storyWplY(v)+17" text-anchor="middle" font-size="9" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial,sans-serif">{{ v }}</text>
                  <circle :cx="storyWplX(i)" :cy="storyWplY(v)" r="4" fill="#f97316" stroke="#0d0f18" stroke-width="1.5"/>
                </template>
                <template v-for="(label,i) in wplLabels" :key="'sxls'+i">
                  <text :x="storyWplX(i)" y="185" text-anchor="middle" font-size="11" font-weight="700" fill="#6b7280" font-family="Helvetica Neue,Arial,sans-serif">{{ label }}</text>
                </template>
              </svg>
              <div v-else style="height:100%;display:flex;align-items:center;justify-content:center;color:#374151;font-size:13px;">Enter data in Interactive → Graphic 29</div>
            </div>
          </div>

          <div style="position:absolute;bottom:224px;left:0;right:0;text-align:center;">
            <div style="font-size:11px;color:#1e2130;letter-spacing:0.06em;">ultimatefantasydashboard.com</div>
          </div>
          <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#06b6d4,#f97316);"></div>
        </div>
      </div>

    </div>
  </template><!-- end stories tab -->

  <!-- ══════════════════════════════════════════════════════════
       PAID ADS TAB — "Has Entered the League Chat" Series
  ══════════════════════════════════════════════════════════ -->
  <template v-if="activeType === 'paidads'">
    <div class="section-label">📣 Paid Ads — &ldquo;Entered the League Chat&rdquo; · Square + Story per feature</div>
    <div style="display:flex;flex-direction:column;gap:80px;padding:24px 0;">

      <!-- ══ AD: POWER RANKINGS ══ -->
      <div>
        <div style="font-size:13px;font-weight:800;color:#eab308;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">1 of 5 · POWER RANKINGS</div>
        <div style="font-size:11px;color:#4b5563;margin-bottom:20px;">Square + Story. Screenshot each.</div>

        <div style="display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap;">

          <!-- ── SQUARE 1080×1080 → 540×540 ── -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Square · 1080×1080</div>
            <div style="width:540px;height:540px;overflow:hidden;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
            <div style="width:1080px;height:1080px;background:#080c14;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.5);">
              <!-- Rich BG -->
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 15% 50%,rgba(234,179,8,0.18) 0%,transparent 50%);"></div>
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 90% 80%,rgba(234,179,8,0.08) 0%,transparent 45%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#eab308,#ca8a04,rgba(234,179,8,0));"></div>
              <div style="position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,#eab308,#ca8a04,transparent);"></div>

              <!-- LEFT TEXT — Monarch-style large headline -->
              <div style="position:absolute;left:72px;top:0;bottom:180px;right:520px;display:flex;flex-direction:column;justify-content:center;">
                <!-- Logo — unconstrained width, height only -->
                <div style="margin-bottom:52px;">
                  <img src="/UFD_V8.png" style="height:80px;width:auto;display:block;">
                </div>
                <!-- Feature name — Monarch-large -->
                <div style="font-size:86px;font-weight:900;color:#eab308;line-height:0.9;letter-spacing:-0.03em;margin-bottom:10px;">POWER RANKINGS</div>
                <!-- Catchphrase -->
                <div style="font-size:72px;font-weight:900;color:#ffffff;line-height:0.95;letter-spacing:-0.03em;margin-bottom:40px;">HAVE ENTERED THE LEAGUE CHAT.</div>
                <!-- Tagline -->
                <div style="font-size:26px;color:#9ca3af;line-height:1.5;margin-bottom:52px;font-weight:400;max-width:420px;">Automatic weekly rankings so everyone knows who's actually good — and who's just lucky.</div>
                <!-- CTA -->
                <div style="display:inline-flex;">
                  <div style="background:linear-gradient(135deg,#eab308,#ca8a04);color:#0a0c14;font-size:24px;font-weight:900;padding:20px 40px;border-radius:12px;letter-spacing:0.01em;">Connect Your League Free →</div>
                </div>
              </div>

              <!-- RIGHT: Phone with chat -->
              <div style="position:absolute;right:40px;top:40px;bottom:40px;width:540px;display:flex;align-items:center;justify-content:center;">
                <div style="transform:perspective(1400px) rotateY(-10deg) rotateX(2deg) rotate(3deg);">
                  <div style="position:relative;">
                  <!-- Glow layer behind phone -->
                  <div style="position:absolute;inset:-20px;background:radial-gradient(ellipse at 60% 50%,rgba(234,179,8,0.35) 0%,transparent 65%);filter:blur(20px);pointer-events:none;z-index:0;"></div>
                  <div style="width:300px;height:560px;background:#141922;border-radius:36px;border:2px solid rgba(234,179,8,0.4);overflow:hidden;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 40px 80px rgba(0,0,0,0.8);">
                    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:99px;height:21px;background:#0d1117;border-radius:0 0 13px 13px;z-index:10;"></div>
                    <div style="position:absolute;top:7px;left:19px;right:19px;display:flex;justify-content:space-between;z-index:11;">
                      <span style="font-size:9px;color:#9ca3af;font-weight:600;">9:41</span>
                      <div style="width:14px;height:8px;border:1px solid #9ca3af;border-radius:2px;margin-top:1px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#9ca3af;border-radius:1px;"></div></div>
                    </div>
                    <!-- Accent top strip on screen -->
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#eab308,transparent);z-index:12;"></div>
                    <div style="position:absolute;top:26px;left:0;right:0;bottom:0;background:#0d1117;padding:8px;display:flex;flex-direction:column;gap:7px;overflow:hidden;">
                      
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:10px;">👥</div>
                    <div>
                      <div style="font-size:8px;font-weight:700;color:#e5e7eb;">League Chat</div>
                      <div style="font-size:7px;color:#6b7280;">12 members</div>
                    </div>
                  </div>
                  <img src="/UFD_V8.png" style="height:14px;width:auto;">
                </div>
                <!-- Shared UFD card in chat -->
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0;overflow:hidden;flex-shrink:0;margin:2px 0;">
                  <div style="background:#eab30822;border-bottom:1px solid rgba(255,255,255,0.06);padding:5px 8px;display:flex;align-items:center;gap:5px;">
                    <img src="/UFD_V8.png" style="height:10px;width:auto;">
                    <span style="font-size:7px;font-weight:700;color:#eab308;letter-spacing:0.05em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
                  </div>
                  <div v-html="renderAdCard('powerrankings')" style="border-radius:0;overflow:hidden;"></div>
                </div>
                <!-- Chat messages -->
                <div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">wait this can't be right 💀</div>
            </div>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <div style="background:#eab308;color:#0a0c14;font-size:9px;font-weight:600;padding:6px 10px;border-radius:12px 12px 2px 12px;max-width:75%;line-height:1.3;">data doesn't lie bro 😂</div>
            </div>
<div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">how do I get this??</div>
            </div>
                    </div>
                    <div style="position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:84px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
                  </div>
                </div>
                </div>
              </div>

              <!-- IG safe zone fade -->
              <div style="position:absolute;bottom:0;left:0;right:0;height:160px;background:linear-gradient(transparent,rgba(8,12,20,0.7));pointer-events:none;"></div>
            </div>
            </div>
          </div>

          <!-- ── STORY 1080×1920 → 304×540 ── -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Story · 1080×1920</div>
            <div style="width:304px;height:540px;overflow:hidden;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
            <div style="width:1080px;height:1920px;background:#080c14;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.28125);">
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 28%,rgba(234,179,8,0.2) 0%,transparent 55%);"></div>
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 95%,rgba(234,179,8,0.07) 0%,transparent 45%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,transparent,#eab308,transparent);"></div>

              <!-- TEXT — below 220px IG safe zone -->
              <div style="position:absolute;top:240px;left:80px;right:80px;">
                <div style="margin-bottom:44px;">
                  <img src="/UFD_V8.png" style="height:100px;width:auto;display:block;">
                </div>
                <div style="font-size:110px;font-weight:900;color:#eab308;line-height:0.88;letter-spacing:-0.03em;margin-bottom:14px;">POWER RANKINGS</div>
                <div style="font-size:90px;font-weight:900;color:#ffffff;line-height:0.92;letter-spacing:-0.03em;margin-bottom:48px;">HAVE ENTERED THE LEAGUE CHAT.</div>
                <div style="font-size:40px;color:#9ca3af;line-height:1.5;margin-bottom:60px;font-weight:400;">Automatic weekly rankings so everyone knows who's actually good — and who's just lucky.</div>
                <div style="display:inline-flex;">
                  <div style="background:linear-gradient(135deg,#eab308,#ca8a04);color:#0a0c14;font-size:42px;font-weight:900;padding:28px 64px;border-radius:18px;letter-spacing:0.01em;">Connect Your League Free →</div>
                </div>
              </div>

              <!-- PHONE — lower portion -->
              <div style="position:absolute;bottom:200px;left:50%;transform:translateX(-50%);">
                <div style="transform:perspective(1600px) rotateY(-8deg) rotateX(1deg) rotate(2deg);">
                  <div style="position:relative;">
                  <!-- Glow layer behind phone -->
                  <div style="position:absolute;inset:-20px;background:radial-gradient(ellipse at 60% 50%,rgba(234,179,8,0.35) 0%,transparent 65%);filter:blur(20px);pointer-events:none;z-index:0;"></div>
                  <div style="width:340px;height:680px;background:#141922;border-radius:44px;border:2px solid rgba(234,179,8,0.4);overflow:hidden;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 40px 80px rgba(0,0,0,0.8);">
                    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:112px;height:25px;background:#0d1117;border-radius:0 0 16px 16px;z-index:10;"></div>
                    <div style="position:absolute;top:9px;left:22px;right:22px;display:flex;justify-content:space-between;z-index:11;">
                      <span style="font-size:10px;color:#9ca3af;font-weight:600;">9:41</span>
                      <div style="width:16px;height:9px;border:1px solid #9ca3af;border-radius:2px;margin-top:1px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#9ca3af;border-radius:1px;"></div></div>
                    </div>
                    <!-- Accent top strip on screen -->
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#eab308,transparent);z-index:12;"></div>
                    <div style="position:absolute;top:32px;left:0;right:0;bottom:0;background:#0d1117;padding:10px;display:flex;flex-direction:column;gap:8px;overflow:hidden;">
                      
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:10px;">👥</div>
                    <div>
                      <div style="font-size:8px;font-weight:700;color:#e5e7eb;">League Chat</div>
                      <div style="font-size:7px;color:#6b7280;">12 members</div>
                    </div>
                  </div>
                  <img src="/UFD_V8.png" style="height:14px;width:auto;">
                </div>
                <!-- Shared UFD card in chat -->
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0;overflow:hidden;flex-shrink:0;margin:2px 0;">
                  <div style="background:#eab30822;border-bottom:1px solid rgba(255,255,255,0.06);padding:5px 8px;display:flex;align-items:center;gap:5px;">
                    <img src="/UFD_V8.png" style="height:10px;width:auto;">
                    <span style="font-size:7px;font-weight:700;color:#eab308;letter-spacing:0.05em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
                  </div>
                  <div v-html="renderAdCard('powerrankings')" style="border-radius:0;overflow:hidden;"></div>
                </div>
                <!-- Chat messages -->
                <div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">wait this can't be right 💀</div>
            </div>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <div style="background:#eab308;color:#0a0c14;font-size:9px;font-weight:600;padding:6px 10px;border-radius:12px 12px 2px 12px;max-width:75%;line-height:1.3;">data doesn't lie bro 😂</div>
            </div>
<div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">how do I get this??</div>
            </div>
                    </div>
                    <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:95px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
                  </div>
                </div>
                </div>
              </div>

              <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,transparent,#eab308,transparent);"></div>
            </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ══ AD: WIN PROBABILITY ══ -->
      <div>
        <div style="font-size:13px;font-weight:800;color:#06b6d4;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">2 of 5 · WIN PROBABILITY</div>
        <div style="font-size:11px;color:#4b5563;margin-bottom:20px;">Square + Story. Screenshot each.</div>

        <div style="display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap;">

          <!-- ── SQUARE 1080×1080 → 540×540 ── -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Square · 1080×1080</div>
            <div style="width:540px;height:540px;overflow:hidden;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
            <div style="width:1080px;height:1080px;background:#080c14;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.5);">
              <!-- Rich BG -->
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 15% 50%,rgba(6,182,212,0.18) 0%,transparent 50%);"></div>
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 90% 80%,rgba(6,182,212,0.08) 0%,transparent 45%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#06b6d4,#0891b2,rgba(6,182,212,0));"></div>
              <div style="position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,#06b6d4,#0891b2,transparent);"></div>

              <!-- LEFT TEXT — Monarch-style large headline -->
              <div style="position:absolute;left:72px;top:0;bottom:180px;right:520px;display:flex;flex-direction:column;justify-content:center;">
                <!-- Logo — unconstrained width, height only -->
                <div style="margin-bottom:52px;">
                  <img src="/UFD_V8.png" style="height:80px;width:auto;display:block;">
                </div>
                <!-- Feature name — Monarch-large -->
                <div style="font-size:86px;font-weight:900;color:#06b6d4;line-height:0.9;letter-spacing:-0.03em;margin-bottom:10px;">WIN PROBABILITY</div>
                <!-- Catchphrase -->
                <div style="font-size:72px;font-weight:900;color:#ffffff;line-height:0.95;letter-spacing:-0.03em;margin-bottom:40px;">HAS ENTERED THE LEAGUE CHAT.</div>
                <!-- Tagline -->
                <div style="font-size:26px;color:#9ca3af;line-height:1.5;margin-bottom:52px;font-weight:400;max-width:420px;">Daily odds on who wins your matchup. The drama builds all week.</div>
                <!-- CTA -->
                <div style="display:inline-flex;">
                  <div style="background:linear-gradient(135deg,#06b6d4,#0891b2);color:#0a0c14;font-size:24px;font-weight:900;padding:20px 40px;border-radius:12px;letter-spacing:0.01em;">Connect Your League Free →</div>
                </div>
              </div>

              <!-- RIGHT: Phone with chat -->
              <div style="position:absolute;right:40px;top:40px;bottom:40px;width:540px;display:flex;align-items:center;justify-content:center;">
                <div style="transform:perspective(1400px) rotateY(-10deg) rotateX(2deg) rotate(3deg);">
                  <div style="position:relative;">
                  <!-- Glow layer behind phone -->
                  <div style="position:absolute;inset:-20px;background:radial-gradient(ellipse at 60% 50%,rgba(6,182,212,0.35) 0%,transparent 65%);filter:blur(20px);pointer-events:none;z-index:0;"></div>
                  <div style="width:300px;height:560px;background:#141922;border-radius:36px;border:2px solid rgba(6,182,212,0.4);overflow:hidden;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 40px 80px rgba(0,0,0,0.8);">
                    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:99px;height:21px;background:#0d1117;border-radius:0 0 13px 13px;z-index:10;"></div>
                    <div style="position:absolute;top:7px;left:19px;right:19px;display:flex;justify-content:space-between;z-index:11;">
                      <span style="font-size:9px;color:#9ca3af;font-weight:600;">9:41</span>
                      <div style="width:14px;height:8px;border:1px solid #9ca3af;border-radius:2px;margin-top:1px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#9ca3af;border-radius:1px;"></div></div>
                    </div>
                    <!-- Accent top strip on screen -->
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#06b6d4,transparent);z-index:12;"></div>
                    <div style="position:absolute;top:26px;left:0;right:0;bottom:0;background:#0d1117;padding:8px;display:flex;flex-direction:column;gap:7px;overflow:hidden;">
                      
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:10px;">👥</div>
                    <div>
                      <div style="font-size:8px;font-weight:700;color:#e5e7eb;">League Chat</div>
                      <div style="font-size:7px;color:#6b7280;">12 members</div>
                    </div>
                  </div>
                  <img src="/UFD_V8.png" style="height:14px;width:auto;">
                </div>
                <!-- Shared UFD card in chat -->
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0;overflow:hidden;flex-shrink:0;margin:2px 0;">
                  <div style="background:#06b6d422;border-bottom:1px solid rgba(255,255,255,0.06);padding:5px 8px;display:flex;align-items:center;gap:5px;">
                    <img src="/UFD_V8.png" style="height:10px;width:auto;">
                    <span style="font-size:7px;font-weight:700;color:#06b6d4;letter-spacing:0.05em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
                  </div>
                  <div v-html="renderAdCard('winprob')" style="border-radius:0;overflow:hidden;"></div>
                </div>
                <!-- Chat messages -->
                <div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">bro how are you 28% on Thursday 💀</div>
            </div>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <div style="background:#06b6d4;color:#0a0c14;font-size:9px;font-weight:600;padding:6px 10px;border-radius:12px 12px 2px 12px;max-width:75%;line-height:1.3;">I came back. check Sunday 😤</div>
            </div>
<div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">need this for my league</div>
            </div>
                    </div>
                    <div style="position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:84px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
                  </div>
                </div>
                </div>
              </div>

              <!-- IG safe zone fade -->
              <div style="position:absolute;bottom:0;left:0;right:0;height:160px;background:linear-gradient(transparent,rgba(8,12,20,0.7));pointer-events:none;"></div>
            </div>
            </div>
          </div>

          <!-- ── STORY 1080×1920 → 304×540 ── -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Story · 1080×1920</div>
            <div style="width:304px;height:540px;overflow:hidden;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
            <div style="width:1080px;height:1920px;background:#080c14;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.28125);">
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 28%,rgba(6,182,212,0.2) 0%,transparent 55%);"></div>
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 95%,rgba(6,182,212,0.07) 0%,transparent 45%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,transparent,#06b6d4,transparent);"></div>

              <!-- TEXT — below 220px IG safe zone -->
              <div style="position:absolute;top:240px;left:80px;right:80px;">
                <div style="margin-bottom:44px;">
                  <img src="/UFD_V8.png" style="height:100px;width:auto;display:block;">
                </div>
                <div style="font-size:110px;font-weight:900;color:#06b6d4;line-height:0.88;letter-spacing:-0.03em;margin-bottom:14px;">WIN PROBABILITY</div>
                <div style="font-size:90px;font-weight:900;color:#ffffff;line-height:0.92;letter-spacing:-0.03em;margin-bottom:48px;">HAS ENTERED THE LEAGUE CHAT.</div>
                <div style="font-size:40px;color:#9ca3af;line-height:1.5;margin-bottom:60px;font-weight:400;">Daily odds on who wins your matchup. The drama builds all week.</div>
                <div style="display:inline-flex;">
                  <div style="background:linear-gradient(135deg,#06b6d4,#0891b2);color:#0a0c14;font-size:42px;font-weight:900;padding:28px 64px;border-radius:18px;letter-spacing:0.01em;">Connect Your League Free →</div>
                </div>
              </div>

              <!-- PHONE — lower portion -->
              <div style="position:absolute;bottom:200px;left:50%;transform:translateX(-50%);">
                <div style="transform:perspective(1600px) rotateY(-8deg) rotateX(1deg) rotate(2deg);">
                  <div style="position:relative;">
                  <!-- Glow layer behind phone -->
                  <div style="position:absolute;inset:-20px;background:radial-gradient(ellipse at 60% 50%,rgba(6,182,212,0.35) 0%,transparent 65%);filter:blur(20px);pointer-events:none;z-index:0;"></div>
                  <div style="width:340px;height:680px;background:#141922;border-radius:44px;border:2px solid rgba(6,182,212,0.4);overflow:hidden;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 40px 80px rgba(0,0,0,0.8);">
                    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:112px;height:25px;background:#0d1117;border-radius:0 0 16px 16px;z-index:10;"></div>
                    <div style="position:absolute;top:9px;left:22px;right:22px;display:flex;justify-content:space-between;z-index:11;">
                      <span style="font-size:10px;color:#9ca3af;font-weight:600;">9:41</span>
                      <div style="width:16px;height:9px;border:1px solid #9ca3af;border-radius:2px;margin-top:1px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#9ca3af;border-radius:1px;"></div></div>
                    </div>
                    <!-- Accent top strip on screen -->
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#06b6d4,transparent);z-index:12;"></div>
                    <div style="position:absolute;top:32px;left:0;right:0;bottom:0;background:#0d1117;padding:10px;display:flex;flex-direction:column;gap:8px;overflow:hidden;">
                      
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:10px;">👥</div>
                    <div>
                      <div style="font-size:8px;font-weight:700;color:#e5e7eb;">League Chat</div>
                      <div style="font-size:7px;color:#6b7280;">12 members</div>
                    </div>
                  </div>
                  <img src="/UFD_V8.png" style="height:14px;width:auto;">
                </div>
                <!-- Shared UFD card in chat -->
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0;overflow:hidden;flex-shrink:0;margin:2px 0;">
                  <div style="background:#06b6d422;border-bottom:1px solid rgba(255,255,255,0.06);padding:5px 8px;display:flex;align-items:center;gap:5px;">
                    <img src="/UFD_V8.png" style="height:10px;width:auto;">
                    <span style="font-size:7px;font-weight:700;color:#06b6d4;letter-spacing:0.05em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
                  </div>
                  <div v-html="renderAdCard('winprob')" style="border-radius:0;overflow:hidden;"></div>
                </div>
                <!-- Chat messages -->
                <div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">bro how are you 28% on Thursday 💀</div>
            </div>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <div style="background:#06b6d4;color:#0a0c14;font-size:9px;font-weight:600;padding:6px 10px;border-radius:12px 12px 2px 12px;max-width:75%;line-height:1.3;">I came back. check Sunday 😤</div>
            </div>
<div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">need this for my league</div>
            </div>
                    </div>
                    <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:95px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
                  </div>
                </div>
                </div>
              </div>

              <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,transparent,#06b6d4,transparent);"></div>
            </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ══ AD: DRAFT GRADES ══ -->
      <div>
        <div style="font-size:13px;font-weight:800;color:#a78bfa;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">3 of 5 · DRAFT GRADES</div>
        <div style="font-size:11px;color:#4b5563;margin-bottom:20px;">Square + Story. Screenshot each.</div>

        <div style="display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap;">

          <!-- ── SQUARE 1080×1080 → 540×540 ── -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Square · 1080×1080</div>
            <div style="width:540px;height:540px;overflow:hidden;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
            <div style="width:1080px;height:1080px;background:#080c14;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.5);">
              <!-- Rich BG -->
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 15% 50%,rgba(167,139,250,0.18) 0%,transparent 50%);"></div>
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 90% 80%,rgba(167,139,250,0.08) 0%,transparent 45%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#a78bfa,#7c3aed,rgba(167,139,250,0));"></div>
              <div style="position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,#a78bfa,#7c3aed,transparent);"></div>

              <!-- LEFT TEXT — Monarch-style large headline -->
              <div style="position:absolute;left:72px;top:0;bottom:180px;right:520px;display:flex;flex-direction:column;justify-content:center;">
                <!-- Logo — unconstrained width, height only -->
                <div style="margin-bottom:52px;">
                  <img src="/UFD_V8.png" style="height:80px;width:auto;display:block;">
                </div>
                <!-- Feature name — Monarch-large -->
                <div style="font-size:86px;font-weight:900;color:#a78bfa;line-height:0.9;letter-spacing:-0.03em;margin-bottom:10px;">DRAFT GRADES</div>
                <!-- Catchphrase -->
                <div style="font-size:72px;font-weight:900;color:#ffffff;line-height:0.95;letter-spacing:-0.03em;margin-bottom:40px;">HAVE ENTERED THE LEAGUE CHAT.</div>
                <!-- Tagline -->
                <div style="font-size:26px;color:#9ca3af;line-height:1.5;margin-bottom:52px;font-weight:400;max-width:420px;">Every pick in your draft, graded. Find out who built a winner and who reached.</div>
                <!-- CTA -->
                <div style="display:inline-flex;">
                  <div style="background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#0a0c14;font-size:24px;font-weight:900;padding:20px 40px;border-radius:12px;letter-spacing:0.01em;">Connect Your League Free →</div>
                </div>
              </div>

              <!-- RIGHT: Phone with chat -->
              <div style="position:absolute;right:40px;top:40px;bottom:40px;width:540px;display:flex;align-items:center;justify-content:center;">
                <div style="transform:perspective(1400px) rotateY(-10deg) rotateX(2deg) rotate(3deg);">
                  <div style="position:relative;">
                  <!-- Glow layer behind phone -->
                  <div style="position:absolute;inset:-20px;background:radial-gradient(ellipse at 60% 50%,rgba(167,139,250,0.35) 0%,transparent 65%);filter:blur(20px);pointer-events:none;z-index:0;"></div>
                  <div style="width:300px;height:560px;background:#141922;border-radius:36px;border:2px solid rgba(167,139,250,0.4);overflow:hidden;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 40px 80px rgba(0,0,0,0.8);">
                    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:99px;height:21px;background:#0d1117;border-radius:0 0 13px 13px;z-index:10;"></div>
                    <div style="position:absolute;top:7px;left:19px;right:19px;display:flex;justify-content:space-between;z-index:11;">
                      <span style="font-size:9px;color:#9ca3af;font-weight:600;">9:41</span>
                      <div style="width:14px;height:8px;border:1px solid #9ca3af;border-radius:2px;margin-top:1px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#9ca3af;border-radius:1px;"></div></div>
                    </div>
                    <!-- Accent top strip on screen -->
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#a78bfa,transparent);z-index:12;"></div>
                    <div style="position:absolute;top:26px;left:0;right:0;bottom:0;background:#0d1117;padding:8px;display:flex;flex-direction:column;gap:7px;overflow:hidden;">
                      
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:10px;">👥</div>
                    <div>
                      <div style="font-size:8px;font-weight:700;color:#e5e7eb;">League Chat</div>
                      <div style="font-size:7px;color:#6b7280;">12 members</div>
                    </div>
                  </div>
                  <img src="/UFD_V8.png" style="height:14px;width:auto;">
                </div>
                <!-- Shared UFD card in chat -->
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0;overflow:hidden;flex-shrink:0;margin:2px 0;">
                  <div style="background:#a78bfa22;border-bottom:1px solid rgba(255,255,255,0.06);padding:5px 8px;display:flex;align-items:center;gap:5px;">
                    <img src="/UFD_V8.png" style="height:10px;width:auto;">
                    <span style="font-size:7px;font-weight:700;color:#a78bfa;letter-spacing:0.05em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
                  </div>
                  <div v-html="renderAdCard('draft')" style="border-radius:0;overflow:hidden;"></div>
                </div>
                <!-- Chat messages -->
                <div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">a C+?? I'm telling you Ohtani was a steal</div>
            </div>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <div style="background:#a78bfa;color:#0a0c14;font-size:9px;font-weight:600;padding:6px 10px;border-radius:12px 12px 2px 12px;max-width:75%;line-height:1.3;">the data says otherwise 💀</div>
            </div>
<div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">where do I get this??</div>
            </div>
                    </div>
                    <div style="position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:84px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
                  </div>
                </div>
                </div>
              </div>

              <!-- IG safe zone fade -->
              <div style="position:absolute;bottom:0;left:0;right:0;height:160px;background:linear-gradient(transparent,rgba(8,12,20,0.7));pointer-events:none;"></div>
            </div>
            </div>
          </div>

          <!-- ── STORY 1080×1920 → 304×540 ── -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Story · 1080×1920</div>
            <div style="width:304px;height:540px;overflow:hidden;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
            <div style="width:1080px;height:1920px;background:#080c14;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.28125);">
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 28%,rgba(167,139,250,0.2) 0%,transparent 55%);"></div>
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 95%,rgba(167,139,250,0.07) 0%,transparent 45%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,transparent,#a78bfa,transparent);"></div>

              <!-- TEXT — below 220px IG safe zone -->
              <div style="position:absolute;top:240px;left:80px;right:80px;">
                <div style="margin-bottom:44px;">
                  <img src="/UFD_V8.png" style="height:100px;width:auto;display:block;">
                </div>
                <div style="font-size:110px;font-weight:900;color:#a78bfa;line-height:0.88;letter-spacing:-0.03em;margin-bottom:14px;">DRAFT GRADES</div>
                <div style="font-size:90px;font-weight:900;color:#ffffff;line-height:0.92;letter-spacing:-0.03em;margin-bottom:48px;">HAVE ENTERED THE LEAGUE CHAT.</div>
                <div style="font-size:40px;color:#9ca3af;line-height:1.5;margin-bottom:60px;font-weight:400;">Every pick in your draft, graded. Find out who built a winner and who reached.</div>
                <div style="display:inline-flex;">
                  <div style="background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#0a0c14;font-size:42px;font-weight:900;padding:28px 64px;border-radius:18px;letter-spacing:0.01em;">Connect Your League Free →</div>
                </div>
              </div>

              <!-- PHONE — lower portion -->
              <div style="position:absolute;bottom:200px;left:50%;transform:translateX(-50%);">
                <div style="transform:perspective(1600px) rotateY(-8deg) rotateX(1deg) rotate(2deg);">
                  <div style="position:relative;">
                  <!-- Glow layer behind phone -->
                  <div style="position:absolute;inset:-20px;background:radial-gradient(ellipse at 60% 50%,rgba(167,139,250,0.35) 0%,transparent 65%);filter:blur(20px);pointer-events:none;z-index:0;"></div>
                  <div style="width:340px;height:680px;background:#141922;border-radius:44px;border:2px solid rgba(167,139,250,0.4);overflow:hidden;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 40px 80px rgba(0,0,0,0.8);">
                    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:112px;height:25px;background:#0d1117;border-radius:0 0 16px 16px;z-index:10;"></div>
                    <div style="position:absolute;top:9px;left:22px;right:22px;display:flex;justify-content:space-between;z-index:11;">
                      <span style="font-size:10px;color:#9ca3af;font-weight:600;">9:41</span>
                      <div style="width:16px;height:9px;border:1px solid #9ca3af;border-radius:2px;margin-top:1px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#9ca3af;border-radius:1px;"></div></div>
                    </div>
                    <!-- Accent top strip on screen -->
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#a78bfa,transparent);z-index:12;"></div>
                    <div style="position:absolute;top:32px;left:0;right:0;bottom:0;background:#0d1117;padding:10px;display:flex;flex-direction:column;gap:8px;overflow:hidden;">
                      
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:10px;">👥</div>
                    <div>
                      <div style="font-size:8px;font-weight:700;color:#e5e7eb;">League Chat</div>
                      <div style="font-size:7px;color:#6b7280;">12 members</div>
                    </div>
                  </div>
                  <img src="/UFD_V8.png" style="height:14px;width:auto;">
                </div>
                <!-- Shared UFD card in chat -->
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0;overflow:hidden;flex-shrink:0;margin:2px 0;">
                  <div style="background:#a78bfa22;border-bottom:1px solid rgba(255,255,255,0.06);padding:5px 8px;display:flex;align-items:center;gap:5px;">
                    <img src="/UFD_V8.png" style="height:10px;width:auto;">
                    <span style="font-size:7px;font-weight:700;color:#a78bfa;letter-spacing:0.05em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
                  </div>
                  <div v-html="renderAdCard('draft')" style="border-radius:0;overflow:hidden;"></div>
                </div>
                <!-- Chat messages -->
                <div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">a C+?? I'm telling you Ohtani was a steal</div>
            </div>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <div style="background:#a78bfa;color:#0a0c14;font-size:9px;font-weight:600;padding:6px 10px;border-radius:12px 12px 2px 12px;max-width:75%;line-height:1.3;">the data says otherwise 💀</div>
            </div>
<div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">where do I get this??</div>
            </div>
                    </div>
                    <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:95px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
                  </div>
                </div>
                </div>
              </div>

              <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,transparent,#a78bfa,transparent);"></div>
            </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ══ AD: LEAGUE HISTORY ══ -->
      <div>
        <div style="font-size:13px;font-weight:800;color:#22c55e;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">4 of 5 · LEAGUE HISTORY</div>
        <div style="font-size:11px;color:#4b5563;margin-bottom:20px;">Square + Story. Screenshot each.</div>

        <div style="display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap;">

          <!-- ── SQUARE 1080×1080 → 540×540 ── -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Square · 1080×1080</div>
            <div style="width:540px;height:540px;overflow:hidden;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
            <div style="width:1080px;height:1080px;background:#080c14;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.5);">
              <!-- Rich BG -->
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 15% 50%,rgba(34,197,94,0.18) 0%,transparent 50%);"></div>
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 90% 80%,rgba(34,197,94,0.08) 0%,transparent 45%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#22c55e,#16a34a,rgba(34,197,94,0));"></div>
              <div style="position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,#22c55e,#16a34a,transparent);"></div>

              <!-- LEFT TEXT — Monarch-style large headline -->
              <div style="position:absolute;left:72px;top:0;bottom:180px;right:520px;display:flex;flex-direction:column;justify-content:center;">
                <!-- Logo — unconstrained width, height only -->
                <div style="margin-bottom:52px;">
                  <img src="/UFD_V8.png" style="height:80px;width:auto;display:block;">
                </div>
                <!-- Feature name — Monarch-large -->
                <div style="font-size:86px;font-weight:900;color:#22c55e;line-height:0.9;letter-spacing:-0.03em;margin-bottom:10px;">LEAGUE HISTORY</div>
                <!-- Catchphrase -->
                <div style="font-size:72px;font-weight:900;color:#ffffff;line-height:0.95;letter-spacing:-0.03em;margin-bottom:40px;">HAS ENTERED THE LEAGUE CHAT.</div>
                <!-- Tagline -->
                <div style="font-size:26px;color:#9ca3af;line-height:1.5;margin-bottom:52px;font-weight:400;max-width:420px;">Every champion, every award, every season — all in one place. The receipts are in.</div>
                <!-- CTA -->
                <div style="display:inline-flex;">
                  <div style="background:linear-gradient(135deg,#22c55e,#16a34a);color:#0a0c14;font-size:24px;font-weight:900;padding:20px 40px;border-radius:12px;letter-spacing:0.01em;">Connect Your League Free →</div>
                </div>
              </div>

              <!-- RIGHT: Phone with chat -->
              <div style="position:absolute;right:40px;top:40px;bottom:40px;width:540px;display:flex;align-items:center;justify-content:center;">
                <div style="transform:perspective(1400px) rotateY(-10deg) rotateX(2deg) rotate(3deg);">
                  <div style="position:relative;">
                  <!-- Glow layer behind phone -->
                  <div style="position:absolute;inset:-20px;background:radial-gradient(ellipse at 60% 50%,rgba(34,197,94,0.35) 0%,transparent 65%);filter:blur(20px);pointer-events:none;z-index:0;"></div>
                  <div style="width:300px;height:560px;background:#141922;border-radius:36px;border:2px solid rgba(34,197,94,0.4);overflow:hidden;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 40px 80px rgba(0,0,0,0.8);">
                    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:99px;height:21px;background:#0d1117;border-radius:0 0 13px 13px;z-index:10;"></div>
                    <div style="position:absolute;top:7px;left:19px;right:19px;display:flex;justify-content:space-between;z-index:11;">
                      <span style="font-size:9px;color:#9ca3af;font-weight:600;">9:41</span>
                      <div style="width:14px;height:8px;border:1px solid #9ca3af;border-radius:2px;margin-top:1px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#9ca3af;border-radius:1px;"></div></div>
                    </div>
                    <!-- Accent top strip on screen -->
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#22c55e,transparent);z-index:12;"></div>
                    <div style="position:absolute;top:26px;left:0;right:0;bottom:0;background:#0d1117;padding:8px;display:flex;flex-direction:column;gap:7px;overflow:hidden;">
                      
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:10px;">👥</div>
                    <div>
                      <div style="font-size:8px;font-weight:700;color:#e5e7eb;">League Chat</div>
                      <div style="font-size:7px;color:#6b7280;">12 members</div>
                    </div>
                  </div>
                  <img src="/UFD_V8.png" style="height:14px;width:auto;">
                </div>
                <!-- Shared UFD card in chat -->
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0;overflow:hidden;flex-shrink:0;margin:2px 0;">
                  <div style="background:#22c55e22;border-bottom:1px solid rgba(255,255,255,0.06);padding:5px 8px;display:flex;align-items:center;gap:5px;">
                    <img src="/UFD_V8.png" style="height:10px;width:auto;">
                    <span style="font-size:7px;font-weight:700;color:#22c55e;letter-spacing:0.05em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
                  </div>
                  <div v-html="renderAdCard('history')" style="border-radius:0;overflow:hidden;"></div>
                </div>
                <!-- Chat messages -->
                <div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">the receipts go back 6 seasons 👀</div>
            </div>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <div style="background:#22c55e;color:#0a0c14;font-size:9px;font-weight:600;padding:6px 10px;border-radius:12px 12px 2px 12px;max-width:75%;line-height:1.3;">I've been winning this league for years</div>
            </div>
<div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">this is incredible, how??</div>
            </div>
                    </div>
                    <div style="position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:84px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
                  </div>
                </div>
                </div>
              </div>

              <!-- IG safe zone fade -->
              <div style="position:absolute;bottom:0;left:0;right:0;height:160px;background:linear-gradient(transparent,rgba(8,12,20,0.7));pointer-events:none;"></div>
            </div>
            </div>
          </div>

          <!-- ── STORY 1080×1920 → 304×540 ── -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Story · 1080×1920</div>
            <div style="width:304px;height:540px;overflow:hidden;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
            <div style="width:1080px;height:1920px;background:#080c14;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.28125);">
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 28%,rgba(34,197,94,0.2) 0%,transparent 55%);"></div>
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 95%,rgba(34,197,94,0.07) 0%,transparent 45%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,transparent,#22c55e,transparent);"></div>

              <!-- TEXT — below 220px IG safe zone -->
              <div style="position:absolute;top:240px;left:80px;right:80px;">
                <div style="margin-bottom:44px;">
                  <img src="/UFD_V8.png" style="height:100px;width:auto;display:block;">
                </div>
                <div style="font-size:110px;font-weight:900;color:#22c55e;line-height:0.88;letter-spacing:-0.03em;margin-bottom:14px;">LEAGUE HISTORY</div>
                <div style="font-size:90px;font-weight:900;color:#ffffff;line-height:0.92;letter-spacing:-0.03em;margin-bottom:48px;">HAS ENTERED THE LEAGUE CHAT.</div>
                <div style="font-size:40px;color:#9ca3af;line-height:1.5;margin-bottom:60px;font-weight:400;">Every champion, every award, every season — all in one place. The receipts are in.</div>
                <div style="display:inline-flex;">
                  <div style="background:linear-gradient(135deg,#22c55e,#16a34a);color:#0a0c14;font-size:42px;font-weight:900;padding:28px 64px;border-radius:18px;letter-spacing:0.01em;">Connect Your League Free →</div>
                </div>
              </div>

              <!-- PHONE — lower portion -->
              <div style="position:absolute;bottom:200px;left:50%;transform:translateX(-50%);">
                <div style="transform:perspective(1600px) rotateY(-8deg) rotateX(1deg) rotate(2deg);">
                  <div style="position:relative;">
                  <!-- Glow layer behind phone -->
                  <div style="position:absolute;inset:-20px;background:radial-gradient(ellipse at 60% 50%,rgba(34,197,94,0.35) 0%,transparent 65%);filter:blur(20px);pointer-events:none;z-index:0;"></div>
                  <div style="width:340px;height:680px;background:#141922;border-radius:44px;border:2px solid rgba(34,197,94,0.4);overflow:hidden;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 40px 80px rgba(0,0,0,0.8);">
                    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:112px;height:25px;background:#0d1117;border-radius:0 0 16px 16px;z-index:10;"></div>
                    <div style="position:absolute;top:9px;left:22px;right:22px;display:flex;justify-content:space-between;z-index:11;">
                      <span style="font-size:10px;color:#9ca3af;font-weight:600;">9:41</span>
                      <div style="width:16px;height:9px;border:1px solid #9ca3af;border-radius:2px;margin-top:1px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#9ca3af;border-radius:1px;"></div></div>
                    </div>
                    <!-- Accent top strip on screen -->
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#22c55e,transparent);z-index:12;"></div>
                    <div style="position:absolute;top:32px;left:0;right:0;bottom:0;background:#0d1117;padding:10px;display:flex;flex-direction:column;gap:8px;overflow:hidden;">
                      
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:10px;">👥</div>
                    <div>
                      <div style="font-size:8px;font-weight:700;color:#e5e7eb;">League Chat</div>
                      <div style="font-size:7px;color:#6b7280;">12 members</div>
                    </div>
                  </div>
                  <img src="/UFD_V8.png" style="height:14px;width:auto;">
                </div>
                <!-- Shared UFD card in chat -->
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0;overflow:hidden;flex-shrink:0;margin:2px 0;">
                  <div style="background:#22c55e22;border-bottom:1px solid rgba(255,255,255,0.06);padding:5px 8px;display:flex;align-items:center;gap:5px;">
                    <img src="/UFD_V8.png" style="height:10px;width:auto;">
                    <span style="font-size:7px;font-weight:700;color:#22c55e;letter-spacing:0.05em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
                  </div>
                  <div v-html="renderAdCard('history')" style="border-radius:0;overflow:hidden;"></div>
                </div>
                <!-- Chat messages -->
                <div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">the receipts go back 6 seasons 👀</div>
            </div>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <div style="background:#22c55e;color:#0a0c14;font-size:9px;font-weight:600;padding:6px 10px;border-radius:12px 12px 2px 12px;max-width:75%;line-height:1.3;">I've been winning this league for years</div>
            </div>
<div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">this is incredible, how??</div>
            </div>
                    </div>
                    <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:95px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
                  </div>
                </div>
                </div>
              </div>

              <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,transparent,#22c55e,transparent);"></div>
            </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ══ AD: HEAD-TO-HEAD RECORDS ══ -->
      <div>
        <div style="font-size:13px;font-weight:800;color:#f97316;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">5 of 5 · HEAD-TO-HEAD RECORDS</div>
        <div style="font-size:11px;color:#4b5563;margin-bottom:20px;">Square + Story. Screenshot each.</div>

        <div style="display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap;">

          <!-- ── SQUARE 1080×1080 → 540×540 ── -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Square · 1080×1080</div>
            <div style="width:540px;height:540px;overflow:hidden;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
            <div style="width:1080px;height:1080px;background:#080c14;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.5);">
              <!-- Rich BG -->
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 15% 50%,rgba(249,115,22,0.18) 0%,transparent 50%);"></div>
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 90% 80%,rgba(249,115,22,0.08) 0%,transparent 45%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:5px;background:linear-gradient(90deg,#f97316,#ea580c,rgba(249,115,22,0));"></div>
              <div style="position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,#f97316,#ea580c,transparent);"></div>

              <!-- LEFT TEXT — Monarch-style large headline -->
              <div style="position:absolute;left:72px;top:0;bottom:180px;right:520px;display:flex;flex-direction:column;justify-content:center;">
                <!-- Logo — unconstrained width, height only -->
                <div style="margin-bottom:52px;">
                  <img src="/UFD_V8.png" style="height:80px;width:auto;display:block;">
                </div>
                <!-- Feature name — Monarch-large -->
                <div style="font-size:86px;font-weight:900;color:#f97316;line-height:0.9;letter-spacing:-0.03em;margin-bottom:10px;">HEAD-TO-HEAD RECORDS</div>
                <!-- Catchphrase -->
                <div style="font-size:72px;font-weight:900;color:#ffffff;line-height:0.95;letter-spacing:-0.03em;margin-bottom:40px;">HAVE ENTERED THE LEAGUE CHAT.</div>
                <!-- Tagline -->
                <div style="font-size:26px;color:#9ca3af;line-height:1.5;margin-bottom:52px;font-weight:400;max-width:420px;">Your all-time record against every team in your league. Some rivalries run deep.</div>
                <!-- CTA -->
                <div style="display:inline-flex;">
                  <div style="background:linear-gradient(135deg,#f97316,#ea580c);color:#0a0c14;font-size:24px;font-weight:900;padding:20px 40px;border-radius:12px;letter-spacing:0.01em;">Connect Your League Free →</div>
                </div>
              </div>

              <!-- RIGHT: Phone with chat -->
              <div style="position:absolute;right:40px;top:40px;bottom:40px;width:540px;display:flex;align-items:center;justify-content:center;">
                <div style="transform:perspective(1400px) rotateY(-10deg) rotateX(2deg) rotate(3deg);">
                  <div style="position:relative;">
                  <!-- Glow layer behind phone -->
                  <div style="position:absolute;inset:-20px;background:radial-gradient(ellipse at 60% 50%,rgba(249,115,22,0.35) 0%,transparent 65%);filter:blur(20px);pointer-events:none;z-index:0;"></div>
                  <div style="width:300px;height:560px;background:#141922;border-radius:36px;border:2px solid rgba(249,115,22,0.4);overflow:hidden;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 40px 80px rgba(0,0,0,0.8);">
                    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:99px;height:21px;background:#0d1117;border-radius:0 0 13px 13px;z-index:10;"></div>
                    <div style="position:absolute;top:7px;left:19px;right:19px;display:flex;justify-content:space-between;z-index:11;">
                      <span style="font-size:9px;color:#9ca3af;font-weight:600;">9:41</span>
                      <div style="width:14px;height:8px;border:1px solid #9ca3af;border-radius:2px;margin-top:1px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#9ca3af;border-radius:1px;"></div></div>
                    </div>
                    <!-- Accent top strip on screen -->
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#f97316,transparent);z-index:12;"></div>
                    <div style="position:absolute;top:26px;left:0;right:0;bottom:0;background:#0d1117;padding:8px;display:flex;flex-direction:column;gap:7px;overflow:hidden;">
                      
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:10px;">👥</div>
                    <div>
                      <div style="font-size:8px;font-weight:700;color:#e5e7eb;">League Chat</div>
                      <div style="font-size:7px;color:#6b7280;">12 members</div>
                    </div>
                  </div>
                  <img src="/UFD_V8.png" style="height:14px;width:auto;">
                </div>
                <!-- Shared UFD card in chat -->
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0;overflow:hidden;flex-shrink:0;margin:2px 0;">
                  <div style="background:#f9731622;border-bottom:1px solid rgba(255,255,255,0.06);padding:5px 8px;display:flex;align-items:center;gap:5px;">
                    <img src="/UFD_V8.png" style="height:10px;width:auto;">
                    <span style="font-size:7px;font-weight:700;color:#f97316;letter-spacing:0.05em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
                  </div>
                  <div v-html="renderAdCard('matchup')" style="border-radius:0;overflow:hidden;"></div>
                </div>
                <!-- Chat messages -->
                <div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">4-18 all time?? I'm getting traded</div>
            </div>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <div style="background:#f97316;color:#0a0c14;font-size:9px;font-weight:600;padding:6px 10px;border-radius:12px 12px 2px 12px;max-width:75%;line-height:1.3;">some things you can't hide 😂</div>
            </div>
<div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">where do I find this??</div>
            </div>
                    </div>
                    <div style="position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:84px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
                  </div>
                </div>
                </div>
              </div>

              <!-- IG safe zone fade -->
              <div style="position:absolute;bottom:0;left:0;right:0;height:160px;background:linear-gradient(transparent,rgba(8,12,20,0.7));pointer-events:none;"></div>
            </div>
            </div>
          </div>

          <!-- ── STORY 1080×1920 → 304×540 ── -->
          <div>
            <div style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Story · 1080×1920</div>
            <div style="width:304px;height:540px;overflow:hidden;border-radius:4px;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
            <div style="width:1080px;height:1920px;background:#080c14;position:relative;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;transform-origin:top left;transform:scale(0.28125);">
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 28%,rgba(249,115,22,0.2) 0%,transparent 55%);"></div>
              <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 95%,rgba(249,115,22,0.07) 0%,transparent 45%);"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,transparent,#f97316,transparent);"></div>

              <!-- TEXT — below 220px IG safe zone -->
              <div style="position:absolute;top:240px;left:80px;right:80px;">
                <div style="margin-bottom:44px;">
                  <img src="/UFD_V8.png" style="height:100px;width:auto;display:block;">
                </div>
                <div style="font-size:110px;font-weight:900;color:#f97316;line-height:0.88;letter-spacing:-0.03em;margin-bottom:14px;">HEAD-TO-HEAD RECORDS</div>
                <div style="font-size:90px;font-weight:900;color:#ffffff;line-height:0.92;letter-spacing:-0.03em;margin-bottom:48px;">HAVE ENTERED THE LEAGUE CHAT.</div>
                <div style="font-size:40px;color:#9ca3af;line-height:1.5;margin-bottom:60px;font-weight:400;">Your all-time record against every team in your league. Some rivalries run deep.</div>
                <div style="display:inline-flex;">
                  <div style="background:linear-gradient(135deg,#f97316,#ea580c);color:#0a0c14;font-size:42px;font-weight:900;padding:28px 64px;border-radius:18px;letter-spacing:0.01em;">Connect Your League Free →</div>
                </div>
              </div>

              <!-- PHONE — lower portion -->
              <div style="position:absolute;bottom:200px;left:50%;transform:translateX(-50%);">
                <div style="transform:perspective(1600px) rotateY(-8deg) rotateX(1deg) rotate(2deg);">
                  <div style="position:relative;">
                  <!-- Glow layer behind phone -->
                  <div style="position:absolute;inset:-20px;background:radial-gradient(ellipse at 60% 50%,rgba(249,115,22,0.35) 0%,transparent 65%);filter:blur(20px);pointer-events:none;z-index:0;"></div>
                  <div style="width:340px;height:680px;background:#141922;border-radius:44px;border:2px solid rgba(249,115,22,0.4);overflow:hidden;position:relative;z-index:1;box-shadow:0 0 0 1px rgba(255,255,255,0.06),0 40px 80px rgba(0,0,0,0.8);">
                    <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:112px;height:25px;background:#0d1117;border-radius:0 0 16px 16px;z-index:10;"></div>
                    <div style="position:absolute;top:9px;left:22px;right:22px;display:flex;justify-content:space-between;z-index:11;">
                      <span style="font-size:10px;color:#9ca3af;font-weight:600;">9:41</span>
                      <div style="width:16px;height:9px;border:1px solid #9ca3af;border-radius:2px;margin-top:1px;position:relative;"><div style="position:absolute;inset:1px;right:2px;background:#9ca3af;border-radius:1px;"></div></div>
                    </div>
                    <!-- Accent top strip on screen -->
                    <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#f97316,transparent);z-index:12;"></div>
                    <div style="position:absolute;top:32px;left:0;right:0;bottom:0;background:#0d1117;padding:10px;display:flex;flex-direction:column;gap:8px;overflow:hidden;">
                      
                <div style="display:flex;align-items:center;justify-content:space-between;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:10px;">👥</div>
                    <div>
                      <div style="font-size:8px;font-weight:700;color:#e5e7eb;">League Chat</div>
                      <div style="font-size:7px;color:#6b7280;">12 members</div>
                    </div>
                  </div>
                  <img src="/UFD_V8.png" style="height:14px;width:auto;">
                </div>
                <!-- Shared UFD card in chat -->
                <div style="background:#111827;border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0;overflow:hidden;flex-shrink:0;margin:2px 0;">
                  <div style="background:#f9731622;border-bottom:1px solid rgba(255,255,255,0.06);padding:5px 8px;display:flex;align-items:center;gap:5px;">
                    <img src="/UFD_V8.png" style="height:10px;width:auto;">
                    <span style="font-size:7px;font-weight:700;color:#f97316;letter-spacing:0.05em;text-transform:uppercase;">Ultimate Fantasy Dashboard</span>
                  </div>
                  <div v-html="renderAdCard('matchup')" style="border-radius:0;overflow:hidden;"></div>
                </div>
                <!-- Chat messages -->
                <div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">4-18 all time?? I'm getting traded</div>
            </div>
<div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
              <div style="background:#f97316;color:#0a0c14;font-size:9px;font-weight:600;padding:6px 10px;border-radius:12px 12px 2px 12px;max-width:75%;line-height:1.3;">some things you can't hide 😂</div>
            </div>
<div style="display:flex;justify-content:flex-start;margin-bottom:6px;">
              <div style="background:#1e2130;color:#e5e7eb;font-size:9px;font-weight:500;padding:6px 10px;border-radius:12px 12px 12px 2px;max-width:75%;line-height:1.3;">where do I find this??</div>
            </div>
                    </div>
                    <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);width:95px;height:3px;background:rgba(255,255,255,0.2);border-radius:2px;"></div>
                  </div>
                </div>
                </div>
              </div>

              <div style="position:absolute;bottom:0;left:0;right:0;height:5px;background:linear-gradient(90deg,transparent,#f97316,transparent);"></div>
            </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  </template><!-- end paid ads tab -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useLeagueStore } from '@/stores/league'

// ── Embed detection (hide shell when loaded in admin iframe) ──────────────
const route = useRoute()
const props = defineProps<{ embedMode?: boolean }>()
const isEmbed = computed(() => props.embedMode === true || route.query.embed === 'true')
const leagueStore = useLeagueStore()

// ── Social template type tabs ──────────────────────────────────────────────
const activeType = ref('square')

// ══════════════════════════════════════════════════════════════════════════
// WP IMPACT GRAPHICS — Daily top performers from ESPN public scoreboard
// No league ID needed — pulls yesterday's real MLB game stats
// ══════════════════════════════════════════════════════════════════════════

// ── Controls ──
const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
const wpiDate = ref(yesterday.toISOString().slice(0,10).replace(/-/g,''))
const wpiWeekLabel = ref('1')
const wpiLoading = ref(false)
const wpiError = ref('')
const wpiStatus = ref('')

const wpiDateDisplay = computed(() => {
  const d = wpiDate.value
  if (d.length === 8) {
    // Use T12:00:00 to avoid UTC-to-local timezone shifting the date back one day
    const dt = new Date(`${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}T12:00:00`)
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }
  return d
})

// ── Output ──
interface WpiPlayer {
  id: string
  name: string
  team: string
  position: string
  headshot: string
  pts: number
  wpImpact: number
  statLine: string
}

const wpiTopBatters = ref<WpiPlayer[]>([])
const wpiTopPitchers = ref<WpiPlayer[]>([])

const PITCHER_POS = new Set(['SP','RP','P','LHP','RHP'])
function isPitcherPos(pos: string) { return PITCHER_POS.has(pos?.toUpperCase()) }

// ── ESPN Standard Points Scoring (common H2H Points settings) ──
function calcFantasyPts(stats: any, isPitcher: boolean): number {
  if (isPitcher) {
    const ip = stats.outs ? stats.outs / 3 : (stats.inningsPitched || 0)
    const k = stats.strikeouts || stats.strikeOuts || 0
    const er = stats.earnedRuns || 0
    const bb = stats.baseOnBalls || stats.walks || 0
    const w = stats.wins || 0
    const sv = stats.saves || 0
    const hld = stats.holds || 0
    const qs = (ip >= 6 && er <= 3) ? 1 : 0
    // Standard ESPN H2H Points: IP×1 + K×1 + W×5 + SV×5 + HLD×3 + QS×3 - ER×1 - BB×0.5
    return ip * 1 + k * 1 + w * 5 + sv * 5 + hld * 3 + qs * 3 - er * 1 - bb * 0.5
  } else {
    const h = stats.hits || 0
    const ab = stats.atBats || 0
    const r = stats.runs || 0
    const hr = stats.homeRuns || 0
    const rbi = stats.rbi || 0
    const bb = stats.baseOnBalls || stats.walks || 0
    const sb = stats.stolenBases || 0
    const cs = stats.caughtStealing || 0
    const hbp = stats.hitByPitch || 0
    const singles = h - (stats.doubles||0) - (stats.triples||0) - hr
    // Standard ESPN H2H Points: 1B×1 + 2B×2 + 3B×3 + HR×4 + R×1 + RBI×1 + BB×1 + SB×2 + HBP×1 - CS×1
    return singles * 1 + (stats.doubles||0) * 2 + (stats.triples||0) * 3 + hr * 4 +
           r * 1 + rbi * 1 + bb * 1 + sb * 2 + hbp * 1 - cs * 1
  }
}

// ── Category score (how many cats were significantly contributed to) ──
function calcCatScore(stats: any, isPitcher: boolean): number {
  if (isPitcher) {
    let s = 0
    const ip = stats.outs ? stats.outs/3 : (stats.inningsPitched||0)
    const k = stats.strikeouts || stats.strikeOuts || 0
    if (k >= 8) s += 4; else if (k >= 5) s += 3; else if (k >= 2) s += 1
    if (stats.saves > 0) s += 3
    if (stats.wins > 0) s += 3
    if (ip >= 6 && (stats.earnedRuns||0) <= 2) s += 3
    else if (ip >= 5) s += 1
    const era = ip > 0 ? (stats.earnedRuns||0)*9/ip : 99
    if (ip > 3 && era <= 1.5) s += 2; else if (era <= 2.5) s += 1
    return Math.min(s, 10)
  } else {
    let s = 0
    const hr = stats.homeRuns || 0
    const rbi = stats.rbi || 0
    const r = stats.runs || 0
    const sb = stats.stolenBases || 0
    const h = stats.hits || 0
    const ab = stats.atBats || 1
    const avg = h / ab
    if (hr >= 2) s += 4; else if (hr === 1) s += 2
    if (rbi >= 4) s += 3; else if (rbi >= 2) s += 2; else if (rbi >= 1) s += 1
    if (r >= 2) s += 2; else if (r >= 1) s += 1
    if (sb >= 2) s += 3; else if (sb === 1) s += 2
    if (ab >= 3 && avg >= 0.667) s += 2; else if (avg >= 0.5) s += 1
    return Math.min(s, 10)
  }
}

// ── WP impact — Monte Carlo-inspired estimate ──
// Weekly H2H: two teams each scoring ~350 pts/week total.
// σ for a week ≈ 50 pts. A player's single great day adds X pts to their team.
// WP_change ≈ normalCDF(delta / σ_weekly) − 0.5
// For a 50-pt σ, normalCDF(x) − 0.5 ≈ x/(50*√(2π)) × 50 = x * 0.0798
// Scale so a truly elite day (30+ pts above avg) shows ~20-25%
// Each point above average ≈ 0.75% WP swing (cap 35)
function calcWpImpact(pts: number, avgPts: number): number {
  const delta = Math.max(0, pts - avgPts)
  return Math.min(delta * 0.75, 35)
}

function buildStatLine(stats: any, isPitcher: boolean): string {
  const pts = calcFantasyPts(stats, isPitcher)
  const ptsStr = ` · ${pts.toFixed(1)} pts`
  if (isPitcher) {
    const ip = Number(stats.inningsPitched||0).toFixed(1)
    const k = stats.strikeOuts || 0
    const er = stats.earnedRuns || 0
    const sv = stats.saves ? ` · ${stats.saves} SV` : ''
    const w = stats.wins ? ` · W` : ''
    return `${ip} IP · ${k} K · ${er} ER${sv}${w}${ptsStr}`
  } else {
    const h = stats.hits || 0
    const ab = stats.atBats || 0
    const hr = stats.homeRuns || 0
    const rbi = stats.rbi || 0
    const r = stats.runs || 0
    const sb = stats.stolenBases ? ` · ${stats.stolenBases} SB` : ''
    return `${h}/${ab}${hr?` · ${hr} HR`:''}${rbi?` · ${rbi} RBI`:''}${r?` · ${r} R`:''}${sb}${ptsStr}`
  }
}

// ── Main loader — ESPN public scoreboard (no auth needed) ──
async function loadWpiData() {
  wpiLoading.value = true
  wpiError.value = ''
  wpiStatus.value = 'Fetching MLB scoreboard…'
  wpiTopBatters.value = []
  wpiTopPitchers.value = []

  try {
    const dateStr = wpiDate.value.replace(/-/g,'')
    const sbRes = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${dateStr}&limit=30`
    )
    if (!sbRes.ok) throw new Error(`Scoreboard failed: ${sbRes.status}`)
    const sbData = await sbRes.json()
    const events = sbData.events || []
    if (!events.length) {
      wpiError.value = `No MLB games on ${wpiDateDisplay.value}. Try 20250901 for a 2025 regular season date.`
      wpiStatus.value = ''; return
    }
    wpiStatus.value = `Found ${events.length} games, loading box scores…`

    const batterMap  = new Map<string, WpiPlayer>()
    const pitcherMap = new Map<string, WpiPlayer>()

    const summaries = await Promise.all(
      events.map((e: any) =>
        fetch(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${e.id}`)
          .then(r => r.ok ? r.json() : null).catch(() => null)
      )
    )

    // Track seen players to avoid double-counting across stat groups
    const seenBat = new Set<string>()
    const seenPit = new Set<string>()

    for (const summary of summaries) {
      if (!summary?.boxscore?.players) continue

      for (const teamData of summary.boxscore.players) {
        const teamAbbr = teamData.team?.abbreviation || ''

        for (const statGroup of (teamData.statistics || [])) {
          const keys: string[] = statGroup.keys || []
          const keySet = new Set(keys)

          // ESPN MLB uses ONE stat group per team containing ALL players.
          // Keys: fullInnings.partInnings|hits|runs|earnedRuns|walks|strikeouts (for everyone)
          // Plus batting groups: atBats|homeRuns|rbi|stolenBases|doubles|triples|etc
          // We CANNOT use key presence to detect pitchers — use player POSITION instead.
          if (!keySet.has('fullInnings.partInnings') && !keySet.has('atBats') &&
              !keySet.has('hits') && !keySet.has('homeRuns')) continue

          for (const athlete of (statGroup.athletes || [])) {
            const pid = athlete.athlete?.id || athlete.id
            if (!pid) continue
            // Use player's actual position to classify
            const posAbbr = (athlete.athlete?.position?.abbreviation ||
                             athlete.position?.abbreviation || '').toUpperCase()
            const PITCHER_POS_SET = new Set(['SP','RP','P','LHP','RHP'])
            const isPit = PITCHER_POS_SET.has(posAbbr)

            // Skip if already processed this player in this role
            if (isPit && seenPit.has(pid)) continue
            if (!isPit && seenBat.has(pid)) continue

            parseAthleteRow(athlete, keys, isPit, teamAbbr, batterMap, pitcherMap)

            if (isPit) seenPit.add(pid)
            else seenBat.add(pid)
          }
        }
      }
    }

    // Second pass: pick up W/SV/HLD from any stat group that has them
    // (ESPN puts these in separate groups with keys like 'wins','saves','holds')
    for (const summary of summaries) {
      if (!summary?.boxscore?.players) continue
      for (const teamData of summary.boxscore.players) {
        for (const statGroup of (teamData.statistics || [])) {
          const keys: string[] = statGroup.keys || []
          const keySet = new Set(keys)
          if (!keySet.has('wins') && !keySet.has('saves') && !keySet.has('holds')) continue
          for (const athlete of (statGroup.athletes || [])) {
            const pid = athlete.athlete?.id || athlete.id
            if (!pid || !pitcherMap.has(pid)) continue
            const statsArr = athlete.stats || []
            const s: any = {}
            keys.forEach((k: string, i: number) => {
              const v = parseFloat(String(statsArr[i]))
              if (!isNaN(v)) s[k] = v
            })
            const wins  = s['wins']  || 0
            const saves = s['saves'] || 0
            const holds = s['holds'] || 0
            if (!wins && !saves && !holds) continue
            // Update existing pitcher entry with bonus points
            const existing = pitcherMap.get(pid)!
            const bonusPts = wins * 5 + saves * 5 + holds * 3
            if (bonusPts > 0) {
              const newPts = existing.pts + bonusPts
              const avgPts = existing.position === 'SP' ? 14 : 7
              existing.pts = newPts
              existing.wpImpact = calcWpImpact(newPts, avgPts)
              // Update stat line to include W/SV
              if (wins && !existing.statLine.includes('W')) existing.statLine += ` · W`
              if (saves && !existing.statLine.includes('SV')) existing.statLine += ` · ${saves} SV`
              pitcherMap.set(pid, existing)
            }
          }
        }
      }
    }

    // Also try to infer QS (Quality Start: 6+ IP, 3 or fewer ER = 3 pts)
    for (const [pid, p] of pitcherMap) {
      const ipMatch = p.statLine.match(/^([\d.]+) IP/)
      const erMatch = p.statLine.match(/(\d+) ER/)
      if (ipMatch && erMatch) {
        const ip = parseFloat(ipMatch[1])
        const er = parseInt(erMatch[1])
        if (ip >= 6 && er <= 3) {
          p.pts += 3
          const avgPts = 14
          p.wpImpact = calcWpImpact(p.pts, avgPts)
          p.statLine = p.statLine.replace(' pts', ' pts') // pts already in line, update below
          // Update pts in statLine
          p.statLine = p.statLine.replace(/[-\d.]+ pts$/, `${p.pts.toFixed(1)} pts`)
          pitcherMap.set(pid, p)
        }
      }
    }

    const batters  = [...batterMap.values()].sort((a,b) => b.pts - a.pts)
    const pitchers = [...pitcherMap.values()].sort((a,b) => b.pts - a.pts)
    wpiTopBatters.value  = batters.slice(0,5)
    wpiTopPitchers.value = pitchers.slice(0,5)

    const total = batters.length + pitchers.length
    if (!total) {
      wpiError.value = `No stats found — Spring Training games may lack box scores. Try 20250901.`
    } else if (!pitchers.length) {
      // Show athlete-level debug to find why pitchers aren't parsing
      let pitchDbg = ''
      for (const summary of summaries) {
        if (!summary?.boxscore?.players || pitchDbg) break
        for (const teamData of summary.boxscore.players) {
          for (const sg of (teamData.statistics || [])) {
            const keys: string[] = sg.keys || []
            const keySet = new Set(keys)
            const hasPit = keySet.has('fullInnings.partInnings') || keySet.has('earnedRuns') || keySet.has('strikeouts')
            if (!hasPit) continue
            const athletes = sg.athletes || []
            if (athletes.length > 0) {
              const a = athletes[0]
              const id  = a?.athlete?.id  || a?.id  || 'NO_ID'
              const nm  = a?.athlete?.displayName || a?.displayName || 'NO_NM'
              const s0  = (a?.stats || [])[0]
              const s1  = (a?.stats || [])[1]
              pitchDbg = `n=${athletes.length} id=${id} nm=${nm} stats=[${s0},${s1}]`
            } else {
              pitchDbg = 'group_empty'
            }
            if (pitchDbg) break
          }
        }
      }
      wpiStatus.value = `✓ ${batters.length} batters · 0 pitchers. [${pitchDbg || 'no_pitch_group'}]`
    } else {
      wpiStatus.value = `✓ ${batters.length} batters · ${pitchers.length} pitchers from ${events.length} games`
    }
  } catch (e: any) {
    wpiError.value = e?.message || 'Failed to load data'
    wpiStatus.value = ''
  } finally {
    wpiLoading.value = false
  }
}


function parseAthleteRow(
  athlete: any,
  keys: string[],
  isPitcherGroup: boolean,
  teamFallback: string,
  batterMap: Map<string, WpiPlayer>,
  pitcherMap: Map<string, WpiPlayer>
) {
  const pid = athlete.athlete?.id
  if (!pid) return

  const statsArr = athlete.stats || []
  // Build stat object using ESPN's actual camelCase key names
  const s: any = {}
  keys.forEach((k: string, i: number) => {
    const raw = statsArr[i]
    if (raw === '--' || raw === null || raw === undefined) return
    // Handle "H-AB" style combined stats (e.g. "2-4")
    if (typeof raw === 'string' && raw.includes('-') && k === 'hits-atBats') {
      const [h, ab] = raw.split('-').map(Number)
      if (!isNaN(h)) s['hits'] = h
      if (!isNaN(ab)) s['atBats'] = ab
    } else {
      const v = parseFloat(String(raw))
      if (!isNaN(v)) s[k] = v
    }
  })

  // ESPN's actual camelCase stat key names
  const n: any = {
    atBats:         s['atBats']   || 0,
    hits:           s['hits']     || 0,
    doubles:        s['doubles']  || 0,
    triples:        s['triples']  || 0,
    homeRuns:       s['homeRuns'] || 0,
    runs:           s['runs']     || 0,
    rbi:            s['RBI'] || s['rbi'] || 0,
    stolenBases:    s['stolenBases']    || 0,
    baseOnBalls:    s['walks'] || s['baseOnBalls'] || s['BB'] || 0,
    hitByPitch:     s['hitByPitch']     || 0,
    // Pitching — ESPN stores IP as "fullInnings.partInnings" e.g. 6.2
    inningsPitched: s['fullInnings.partInnings'] || s['inningsPitched'] || 0,
    strikeOuts:     s['strikeouts'] || s['strikeOuts'] || s['SO'] || 0,
    earnedRuns:     s['earnedRuns'] || 0,
    wins:           s['wins']  || 0,
    saves:          s['saves'] || 0,
    holds:          s['holds'] || 0,
  }

  const ip = n.inningsPitched
  if (!isPitcherGroup && n.atBats < 1) return
  // For pitchers: keep anyone in the pitching stats group (IP may be 0 for openers/closers)

  const name     = athlete.athlete?.displayName || 'Unknown'
  const teamAbbr = athlete.athlete?.team?.abbreviation || teamFallback
  const headshot = athlete.athlete?.headshot?.href ||
    `https://a.espncdn.com/i/headshots/mlb/players/full/${pid}.png`

  const pts = calcFantasyPts(n, isPitcherGroup)
  // For batters, skip zero-point games; pitchers kept regardless (sorted later)
  if (!isPitcherGroup && pts <= 0) return
  // Filter out negative performance — no one should appear for hurting their team
  if (pts <= 0) return

  // WP impact: points above position average × 0.75%
  const avgPts = isPitcherGroup ? (ip >= 5 ? 14 : ip >= 2 ? 7 : 4) : 4
  const wpImpact = calcWpImpact(pts, avgPts)
  if (wpImpact <= 0) return

  const posFromAthlete = athlete.athlete?.position?.abbreviation ||
                         athlete.position?.abbreviation || (isPitcherGroup ? 'P' : 'OF')
  const pos = isPitcherGroup
    ? (n.saves > 0 ? 'RP' : ip >= 3 ? 'SP' : 'RP')
    : posFromAthlete

  const player: WpiPlayer = {
    id: pid, name, team: teamAbbr, position: pos, headshot,
    pts, wpImpact, statLine: buildStatLine(n, isPitcherGroup)
  }

  if (isPitcherGroup) {
    if (!pitcherMap.has(pid) || pitcherMap.get(pid)!.wpImpact < wpImpact)
      pitcherMap.set(pid, player)
  } else {
    if (!batterMap.has(pid) || batterMap.get(pid)!.wpImpact < wpImpact)
      batterMap.set(pid, player)
  }
}


// ── Interactive Win Probability Template state ─────────────────────────────
// Chart layout constants (within 540x540 SVG card)
const WP_CL = 58   // chart left x
const WP_CT = 118  // chart top y (100%)
const WP_CB = 436  // chart bottom y (0%)
const WP_CH = WP_CB - WP_CT  // 318px chart height
const WP_XS = 78   // x spacing per day (7 days, 6 intervals, 468/6=78)

const wpTeam1 = ref('Mahomes Magic')
const wpTeam2 = ref('The Algorithm')
const wpWeek = ref('11')
const wpSportLabel = ref('NFL Fantasy · PPR')
const wpPlayerName = ref('Logan Webb')
const wpPlayerPos = ref('SP')
const wpHeadshotUrl = ref('https://a.espncdn.com/i/headshots/mlb/players/full/39832.png')
const wpCurrentDay = ref(3)  // 0=Mon…6=Sun, default=Thu
const wpDirection = ref<'down' | 'up'>('down')
const wpImpact = ref<'md' | 'sm' | 'lg'>('md')
const wpStartProb = ref(60)
const wpShape = ref<'steady' | 'rising' | 'falling' | 'volatile' | 'surge'>('steady')

const wpCurrentDayLabel = computed(() =>
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][wpCurrentDay.value]
)

const wpPlayerInitials = computed(() => {
  return wpPlayerName.value.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase()
})

// Pre-event shape offsets — 7 values, one per day of week.
// These are deltas from wpStartProb applied BEFORE the event-day shift.
// The event day and beyond are handled separately.
const WP_SHAPES: Record<string, number[]> = {
  //          Mon   Tue   Wed   Thu   Fri   Sat   Sun
  steady:  [  0,   +2,   -1,   +3,   -2,   +4,   +1  ],  // gentle oscillation
  rising:  [ -6,   -3,    0,   +4,   +7,  +10,  +12  ],  // climbing into event
  falling: [ +8,   +5,   +2,   -1,   -4,   -7,  -10  ],  // sliding into event
  volatile:[ +8,   -5,  +10,   -7,   +6,   -4,   +3  ],  // wild swings
  surge:   [  0,    0,   +1,   +8,  +10,  +12,  +11  ],  // flat then late surge
}

// Generate raw probabilities for team1 for all 7 days
const wpRawProbs1 = computed((): number[] => {
  const start = wpStartProb.value
  const shift = wpImpact.value === 'lg' ? 20 : wpImpact.value === 'md' ? 13 : 7
  const dir = wpDirection.value === 'up' ? 1 : -1
  const shapeOffsets = WP_SHAPES[wpShape.value] ?? WP_SHAPES.steady
  const pts: number[] = []

  for (let d = 0; d < 7; d++) {
    if (d < wpCurrentDay.value) {
      // Pre-event: apply shape offset from start
      pts.push(Math.min(87, Math.max(13, start + shapeOffsets[d])))
    } else if (d === wpCurrentDay.value) {
      // Event day: jump from previous point by impact amount
      const base = pts[d - 1] ?? start
      pts.push(Math.min(93, Math.max(7, base + dir * shift)))
    } else {
      // Post-event: gradual drift back toward 50% with shape texture
      const prev = pts[d - 1]
      const recovery = (50 - prev) * 0.15  // gentle pull toward 50
      const texture = shapeOffsets[d] * 0.3  // light shape texture post-event
      pts.push(Math.min(93, Math.max(7, prev + recovery + texture)))
    }
  }
  return pts
})

// Helper: convert prob + day index to SVG x,y coords
function wpX(i: number): number { return WP_CL + i * WP_XS }
function wpY(p: number): number { return WP_CB - (p / 100) * WP_CH }

// Smooth bezier path through a set of {x,y} points
function smoothBezier(pts: {x:number,y:number}[]): string {
  if (!pts.length) return ''
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 1; i < pts.length; i++) {
    const cpx = ((pts[i-1].x + pts[i].x) / 2).toFixed(1)
    d += ` C ${cpx},${pts[i-1].y.toFixed(1)} ${cpx},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)}`
  }
  return d
}

// Build structured point objects for each team (up through wpCurrentDay)
const wpTeam1Points = computed(() => {
  return wpRawProbs1.value.map((p, i) => {
    const x = wpX(i), y = wpY(p)
    const prev = i > 0 ? wpY(wpRawProbs1.value[i-1]) : y
    // label above if line going up, below if going down (avoid overlap)
    const labelBelow = y > prev
    return { x, y, prob: p, labelY: labelBelow ? y + 17 : y - 7 }
  })
})

const wpTeam2Points = computed(() => {
  return wpRawProbs1.value.map((p, i) => {
    const p2 = 100 - p
    const x = wpX(i), y = wpY(p2)
    const prev = i > 0 ? wpY(100 - wpRawProbs1.value[i-1]) : y
    const labelBelow = y > prev
    return { x, y, prob: p2, labelY: labelBelow ? y + 17 : y - 7 }
  })
})

// Pre-sliced to wpCurrentDay so v-for never needs v-if (Vue 3: v-if > v-for priority breaks it)
const wpTeam1Visible = computed(() => wpTeam1Points.value.slice(0, wpCurrentDay.value + 1))
const wpTeam2Visible = computed(() => wpTeam2Points.value.slice(0, wpCurrentDay.value + 1))

// ── Interactive Power Rankings Template state ──────────────────────────────
const prSportLabel = ref('Baseball · H2H Points')
const prWeek = ref('14')
const prTeamCount = ref(8)
const prAccent = ref<'gold'|'cyan'|'green'|'purple'>('gold')

// Default team data - 10 slots
const prTeams = ref([
  { name: '', logo: '', score: 90.0, change:  0, record: '' },
  { name: '', logo: '', score: 85.0, change:  0, record: '' },
  { name: '', logo: '', score: 80.0, change:  0, record: '' },
  { name: '', logo: '', score: 75.0, change:  0, record: '' },
  { name: '', logo: '', score: 70.0, change:  0, record: '' },
  { name: '', logo: '', score: 65.0, change:  0, record: '' },
  { name: '', logo: '', score: 60.0, change:  0, record: '' },
  { name: '', logo: '', score: 55.0, change:  0, record: '' },
  { name: '', logo: '', score: 50.0, change:  0, record: '' },
  { name: '', logo: '', score: 45.0, change:  0, record: '' },
])

// Accent color map
const prAccentColor = computed(() => ({
  gold:   '#eab308',
  cyan:   '#06b6d4',
  green:  '#22c55e',
  purple: '#a78bfa',
}[prAccent.value]))

const prIconBg = computed(() => ({
  gold:   'rgba(234,179,8,0.15)',
  cyan:   'rgba(6,182,212,0.15)',
  green:  'rgba(34,197,94,0.15)',
  purple: 'rgba(167,139,250,0.15)',
}[prAccent.value]))

const prRowHighlight = computed(() => ({
  gold:   'rgba(234,179,8,0.06)',
  cyan:   'rgba(6,182,212,0.06)',
  green:  'rgba(34,197,94,0.06)',
  purple: 'rgba(167,139,250,0.06)',
}[prAccent.value]))

// Sport emoji from label
const prSportEmoji = computed(() => {
  const l = prSportLabel.value.toLowerCase()
  if (l.includes('baseball') || l.includes('mlb')) return '⚾'
  if (l.includes('football') || l.includes('nfl')) return '🏈'
  if (l.includes('basketball') || l.includes('nba')) return '🏀'
  if (l.includes('hockey') || l.includes('nhl'))   return '🏒'
  return '🏆'
})

// Unique color per team slot (cycles through a palette)
const PR_COLORS = ['#eab308','#22c55e','#3b82f6','#ef4444','#8b5cf6','#f97316','#06b6d4','#ec4899','#10b981','#6366f1']
function prTeamColor(i: number): string { return PR_COLORS[i % PR_COLORS.length] }

// Row height — shrinks to fit all teams in remaining space (540 - 129 top - 20 bottom = 391px)
const prRowH = computed(() => Math.floor(391 / prTeamCount.value))

// Score bar width — proportional to top score, max 82px (matches bar track width)
const prMaxScore = computed(() => Math.max(...prTeams.value.slice(0, prTeamCount.value).map(t => t.score || 0), 1))
function prScoreBarWidth(score: number): number {
  return Math.round(((score || 0) / prMaxScore.value) * 60)
}

// ── Ranking Trends chart ──────────────────────────────────────────────────
// Chart constants (within 540×540 SVG)
const TR_CL = 38   // chart left x (after rank labels)
const TR_CR = 440  // chart right x (before team name labels)
const TR_CT = 112  // chart top y  (rank 1)
const TR_CB = 482  // chart bottom y (rank N)

// Number of weeks to display (capped 2-16)
const prTrendNWeeks = computed(() => Math.max(2, Math.min(16, parseInt(prWeek.value) || 11)))

// Teams shown on trend — cap at 6 for readability
const prTrendTeams = computed(() => prTeams.value.slice(0, Math.min(prTeamCount.value, 6)))

// X coordinate for a 0-indexed week
function prTrendX(weekIdx: number): number {
  const n = prTrendNWeeks.value
  return TR_CL + (n > 1 ? weekIdx / (n - 1) : 0) * (TR_CR - TR_CL)
}

// Y coordinate for a rank value (1 = top, N = bottom)
function prTrendY(rank: number): number {
  const n = prTrendTeams.value.length
  if (n <= 1) return (TR_CT + TR_CB) / 2
  return TR_CT + ((rank - 1) / (n - 1)) * (TR_CB - TR_CT)
}

// Week labels for x-axis — show every 1 or 2 weeks depending on count
const prTrendWeekLabels = computed((): number[] => {
  const n = prTrendNWeeks.value
  const step = n > 10 ? 2 : 1
  const labels: number[] = []
  for (let w = 1; w <= n; w += step) labels.push(w)
  if (labels[labels.length - 1] !== n) labels.push(n)
  return labels
})

// Generate smooth rank trajectories for each team ending at their current rank
// Returns array of {d: svgPath, color, name, endX, endY}
const prTrendPaths = computed(() => {
  const nWeeks = prTrendNWeeks.value
  const teams = prTrendTeams.value
  const nTeams = teams.length

  return teams.map((team, i) => {
    const targetRank = i + 1  // their current rank position
    const color = PR_COLORS[i % PR_COLORS.length]

    // Generate rank values for each week
    const ranks: number[] = []
    for (let w = 0; w < nWeeks; w++) {
      const progress = nWeeks > 1 ? w / (nWeeks - 1) : 1
      // Sinusoidal noise unique per team, decaying toward target as weeks progress
      const phase  = i * 2.1 + 0.8
      const freq   = 0.55 + (i % 4) * 0.22
      const amp    = (1.8 - i * 0.12) * (1 - progress * 0.65)
      const noise  = amp * Math.sin(phase + freq * w)
      ranks.push(Math.max(0.6, Math.min(nTeams + 0.4, targetRank + noise)))
    }

    // Build smooth bezier path
    const pts = ranks.map((r, w) => ({ x: prTrendX(w), y: prTrendY(r) }))
    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
    for (let k = 1; k < pts.length; k++) {
      const cpx = ((pts[k-1].x + pts[k].x) / 2).toFixed(1)
      d += ` C ${cpx},${pts[k-1].y.toFixed(1)} ${cpx},${pts[k].y.toFixed(1)} ${pts[k].x.toFixed(1)},${pts[k].y.toFixed(1)}`
    }

    // Truncate team name for label (max 9 chars)
    const name = team.name ? (team.name.length > 9 ? team.name.slice(0, 8) + '…' : team.name) : `Team ${i+1}`

    return { d, color, name, endX: TR_CR, endY: prTrendY(targetRank) }
  })
})

// ── Redesigned trend chart helpers ────────────────────────────────────────
// Dynamic chart height based on team count
const prChartH = computed(() => prTeamCount.value * 44 + 80)
const PR2_TOP = 8   // y of rank #1
const PR2_LEFT = 38
const PR2_RIGHT = 442

function prTrendY2(rank: number): number {
  const n = prTeamCount.value
  if (n <= 1) return PR2_TOP + (prChartH.value - 80) / 2
  return PR2_TOP + ((rank - 1) / (n - 1)) * (prTeamCount.value * 44 - 16)
}

function prTrendX2(weekIdx: number): number {
  const n = prTrendNWeeks2.value
  return PR2_LEFT + (n > 1 ? weekIdx / (n - 1) : 0) * (PR2_RIGHT - PR2_LEFT)
}

const prTrendNWeeks2 = computed(() => Math.max(2, Math.min(16, parseInt(prWeek.value) || 6)))

const prTrendWeekLabels2 = computed((): number[] => {
  const n = prTrendNWeeks2.value
  const step = n > 10 ? 2 : 1
  const labels: number[] = [1]
  for (let w = 1 + step; w < n; w += step) labels.push(w)
  if (labels[labels.length - 1] !== n) labels.push(n)
  return labels
})

// Generate trend paths where:
// - Last point = current rank (position i+1)
// - Second-to-last point = last week's rank (currentRank + change, since ▲2 = was 2 lower = rank+2 last week)
// - Earlier points: smooth natural oscillation that doesn't swing wildly
const prTrendPaths2 = computed(() => {
  const nWeeks = prTrendNWeeks2.value
  const teams = prTeams.value.slice(0, prTeamCount.value)
  const nTeams = teams.length

  return teams.map((team, i) => {
    const currentRank = i + 1
    // change > 0 = moved UP = last week was at a higher number
    const lastWeekRank = Math.max(1, Math.min(nTeams, currentRank + team.change))
    const color = PR_COLORS[i % PR_COLORS.length]

    // Build rank array
    const ranks: number[] = []
    for (let w = 0; w < nWeeks; w++) {
      if (w === nWeeks - 1) {
        // Current week — must be exact current rank
        ranks.push(currentRank)
      } else if (w === nWeeks - 2) {
        // Last week — must match the change
        ranks.push(lastWeekRank)
      } else {
        // Earlier weeks: gentle oscillation anchored between current and last week
        const midRank = (currentRank + lastWeekRank) / 2
        const progress = nWeeks > 2 ? w / (nWeeks - 2) : 0
        // Amplitude shrinks slightly toward the end, unique phase per team
        const phase = i * 2.3 + 1.1
        const freq = 0.45 + (i % 3) * 0.25
        // Max swing = 1.5 ranks, decays toward middle
        const amp = 1.4 * (1 - progress * 0.4)
        const noise = amp * Math.sin(phase + freq * w)
        ranks.push(Math.max(0.7, Math.min(nTeams + 0.3, midRank + noise)))
      }
    }

    // Smooth bezier
    const pts = ranks.map((r, w) => ({ x: prTrendX2(w), y: prTrendY2(r) }))
    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
    for (let k = 1; k < pts.length; k++) {
      const cpx = ((pts[k-1].x + pts[k].x) / 2).toFixed(1)
      d += ` C ${cpx},${pts[k-1].y.toFixed(1)} ${cpx},${pts[k].y.toFixed(1)} ${pts[k].x.toFixed(1)},${pts[k].y.toFixed(1)}`
    }

    const name = team.name ? (team.name.length > 10 ? team.name.slice(0, 9) + '…' : team.name) : `Team ${i+1}`
    return { d, color, name, endX: PR2_RIGHT, endY: prTrendY2(currentRank) }
  })
})

// ── Line paths (only through wpCurrentDay) ───────────────────────────────

const wpLine1Path = computed(() => {
  const pts = wpTeam1Points.value.slice(0, wpCurrentDay.value + 1).map(p => ({ x: p.x, y: p.y }))
  return smoothBezier(pts)
})
const wpLine2Path = computed(() => {
  const pts = wpTeam2Points.value.slice(0, wpCurrentDay.value + 1).map(p => ({ x: p.x, y: p.y }))
  return smoothBezier(pts)
})

// Area paths (line + close to bottom)
const wpArea1Path = computed(() => {
  const pts = wpTeam1Points.value.slice(0, wpCurrentDay.value + 1)
  if (!pts.length) return ''
  const line = smoothBezier(pts.map(p => ({ x: p.x, y: p.y })))
  return `${line} L ${pts[pts.length-1].x},${WP_CB} L ${pts[0].x},${WP_CB} Z`
})
const wpArea2Path = computed(() => {
  const pts = wpTeam2Points.value.slice(0, wpCurrentDay.value + 1)
  if (!pts.length) return ''
  const line = smoothBezier(pts.map(p => ({ x: p.x, y: p.y })))
  return `${line} L ${pts[pts.length-1].x},${WP_CB} L ${pts[0].x},${WP_CB} Z`
})


// ── Ad template state (30 & 31) ────────────────────────────────────────────
const ad30headline = ref('')
const ad30sub      = ref('')
const ad30btn      = ref('')
const ad30card1    = ref('powerrankings')
const ad30card2    = ref('winprob')
const ad30card3    = ref('matchup')

const ad31headline = ref('')
const ad31accent   = ref('')
const ad31body     = ref('')
const ad31btn      = ref('')
const ad31card1    = ref('matchup')
const ad31card2    = ref('history')

const adCardOptions = [
  { id: 'powerrankings', label: '⚡ Power Rankings' },
  { id: 'prtrendchart',  label: '📈 Power Rankings Trend' },
  { id: 'winprob',       label: '🎲 Win Probability' },
  { id: 'matchupgraph',  label: '📊 Matchup Line Chart' },
  { id: 'matchup',       label: '⚔️ Matchup Deep Dive' },
  { id: 'draft',         label: '📋 Draft Analysis' },
  { id: 'history',       label: '🏆 League History' },
  { id: 'season',        label: '📊 Season Overview' },
]

function renderAdCard(id: string): string {
  const cards: Record<string, string> = {
    powerrankings: `
      <div style="background:#131720;border:1px solid rgba(234,179,8,0.2);border-radius:10px;padding:10px 12px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
          <span style="font-size:10px;">⚡</span>
          <span style="font-size:10px;font-weight:800;color:#fff;letter-spacing:0.05em;text-transform:uppercase;">Power Rankings</span>
        </div>
        ${[
          ['#eab308','The Aman-Ra Stars','12-5','75.2'],
          ['rgba(255,255,255,0.08)','Mighty Mallards','11-6','72.7'],
          ['rgba(255,255,255,0.06)','Scuttlebucs','11-6','66.9'],
          ['rgba(255,255,255,0.04)','Gridiron Man','12-5','62.5'],
        ].map(([bg,name,rec,score],i) => `
          <div style="display:flex;align-items:center;gap:6px;padding:5px 6px;background:${i===0?'rgba(234,179,8,0.08)':'transparent'};border-radius:6px;margin-bottom:2px;">
            <div style="width:18px;height:18px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <span style="font-size:9px;font-weight:900;color:${i===0?'#0a0c14':'#9ca3af'}">${i+1}</span>
            </div>
            <span style="font-size:10px;font-weight:700;color:${i===0?'#fff':'#d1d5db'};flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</span>
            <span style="font-size:9px;color:#6b7280;">${rec}</span>
            <span style="font-size:10px;font-weight:800;color:${i===0?'#eab308':'#9ca3af'};">${score}</span>
          </div>
        `).join('')}
      </div>`,

    winprob: `
      <div style="background:#131720;border:1px solid rgba(6,182,212,0.2);border-radius:10px;padding:10px 12px;">
        <div style="font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">🎲 Win Probability</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <div style="flex:1;background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.2);border-radius:8px;padding:7px;text-align:center;">
            <div style="font-size:9px;color:#06b6d4;font-weight:700;margin-bottom:2px;">Swamp Pirates</div>
            <div style="font-size:18px;font-weight:900;color:#06b6d4;">64%</div>
          </div>
          <div style="display:flex;align-items:center;font-size:9px;color:#374151;font-weight:700;">VS</div>
          <div style="flex:1;background:rgba(249,115,22,0.08);border:1px solid rgba(249,115,22,0.2);border-radius:8px;padding:7px;text-align:center;">
            <div style="font-size:9px;color:#f97316;font-weight:700;margin-bottom:2px;">NC Pale Hose</div>
            <div style="font-size:18px;font-weight:900;color:#f97316;">36%</div>
          </div>
        </div>
        <div style="height:6px;border-radius:4px;background:rgba(249,115,22,0.3);position:relative;overflow:hidden;">
          <div style="position:absolute;left:0;top:0;height:100%;width:64%;background:linear-gradient(90deg,#06b6d4,#0891b2);border-radius:4px;"></div>
        </div>
      </div>`,

    matchup: `
      <div style="background:#131720;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;">
        <div style="font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">⚔️ Matchup Deep Dive</div>
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(6,182,212,0.2);border:1.5px solid #06b6d4;flex-shrink:0;"></div>
          <div style="flex:1;">
            <div style="font-size:10px;font-weight:700;color:#06b6d4;">Swamp Pirates</div>
            <div style="font-size:9px;color:#6b7280;">11-8-1 · Proj: 11-9</div>
          </div>
          <div style="font-size:14px;font-weight:900;color:#06b6d4;">64%</div>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <div style="width:28px;height:28px;border-radius:50%;background:rgba(249,115,22,0.2);border:1.5px solid #f97316;flex-shrink:0;"></div>
          <div style="flex:1;">
            <div style="font-size:10px;font-weight:700;color:#f97316;">NC Pale Hose</div>
            <div style="font-size:9px;color:#6b7280;">7-11-2 · Proj: 8-12</div>
          </div>
          <div style="font-size:14px;font-weight:900;color:#f97316;">36%</div>
        </div>
      </div>`,

    draft: `
      <div style="background:#131720;border:1px solid rgba(139,92,246,0.2);border-radius:10px;padding:10px 12px;">
        <div style="font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📋 Draft Analysis</div>
        ${[
          ['R1','Freddie Freeman','1B · LAD','A+'],
          ['R2','Shohei Ohtani','SP/DH · LAD','A'],
          ['R3','Mookie Betts','OF · LAD','B+'],
          ['R4','Paul Skenes','SP · PIT','A-'],
        ].map(([rnd,name,pos,grade]) => `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            <span style="font-size:9px;font-weight:700;color:#6b7280;width:20px;">${rnd}</span>
            <span style="font-size:10px;font-weight:600;color:#e5e7eb;flex:1;">${name}</span>
            <span style="font-size:9px;color:#6b7280;">${pos}</span>
            <span style="font-size:10px;font-weight:800;color:#a78bfa;">${grade}</span>
          </div>
        `).join('')}
      </div>`,

    history: `
      <div style="background:#131720;border:1px solid rgba(234,179,8,0.2);border-radius:10px;padding:10px 12px;">
        <div style="font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">🏆 League History</div>
        <div style="display:flex;gap:6px;margin-bottom:8px;">
          <div style="flex:1;background:rgba(234,179,8,0.08);border-radius:8px;padding:6px;text-align:center;">
            <div style="font-size:16px;font-weight:900;color:#eab308;">🥇</div>
            <div style="font-size:9px;font-weight:700;color:#eab308;margin-top:2px;">Champion</div>
            <div style="font-size:9px;color:#9ca3af;margin-top:1px;">Swamp Pirates</div>
            <div style="font-size:8px;color:#6b7280;">2024</div>
          </div>
          <div style="flex:1;background:rgba(255,255,255,0.04);border-radius:8px;padding:6px;text-align:center;">
            <div style="font-size:16px;font-weight:900;color:#9ca3af;">🥈</div>
            <div style="font-size:9px;font-weight:700;color:#9ca3af;margin-top:2px;">Runner Up</div>
            <div style="font-size:9px;color:#9ca3af;margin-top:1px;">NC Pale Hose</div>
            <div style="font-size:8px;color:#6b7280;">2024</div>
          </div>
        </div>
        <div style="font-size:9px;color:#4b5563;text-align:center;">League of Record · 8 seasons</div>
      </div>`,

    season: `
      <div style="background:#131720;border:1px solid rgba(34,197,94,0.2);border-radius:10px;padding:10px 12px;">
        <div style="font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📊 Season Overview</div>
        ${[
          ['#1 All-Play','Swamp Pirates','78.3%','#22c55e'],
          ['Most Points','Ctrl Alt DeLauter','1,847 pts','#06b6d4'],
          ['Best Record','The Projection','11-1','#eab308'],
        ].map(([label,team,val,color]) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
            <div>
              <div style="font-size:8px;color:#4b5563;text-transform:uppercase;letter-spacing:0.08em;">${label}</div>
              <div style="font-size:10px;font-weight:700;color:#d1d5db;">${team}</div>
            </div>
            <div style="font-size:12px;font-weight:800;color:${color};">${val}</div>
          </div>
        `).join('')}
      </div>`,

    prtrendchart: `
      <div style="background:#131720;border:1px solid rgba(234,179,8,0.2);border-radius:10px;padding:10px 12px;">
        <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px;">
          <span style="font-size:9px;">📈</span>
          <span style="font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.05em;">Rankings Trend</span>
        </div>
        <svg viewBox="0 0 260 80" style="width:100%;display:block;">
          <!-- Grid lines -->
          <line x1="20" y1="10" x2="205" y2="10" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <line x1="20" y1="31" x2="205" y2="31" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <line x1="20" y1="52" x2="205" y2="52" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <line x1="20" y1="73" x2="205" y2="73" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>
          <!-- Y labels -->
          <text x="2" y="13" font-size="7" fill="rgba(255,255,255,0.25)" font-family="Helvetica Neue,Arial">#1</text>
          <text x="2" y="34" font-size="7" fill="rgba(255,255,255,0.25)" font-family="Helvetica Neue,Arial">#2</text>
          <text x="2" y="55" font-size="7" fill="rgba(255,255,255,0.25)" font-family="Helvetica Neue,Arial">#3</text>
          <text x="2" y="76" font-size="7" fill="rgba(255,255,255,0.25)" font-family="Helvetica Neue,Arial">#4</text>
          <!-- 4 week x-axis ticks -->
          <text x="22" y="79" font-size="7" fill="rgba(255,255,255,0.2)" font-family="Helvetica Neue,Arial">Wk1</text>
          <text x="73" y="79" font-size="7" fill="rgba(255,255,255,0.2)" font-family="Helvetica Neue,Arial">Wk2</text>
          <text x="124" y="79" font-size="7" fill="rgba(255,255,255,0.2)" font-family="Helvetica Neue,Arial">Wk3</text>
          <text x="175" y="79" font-size="7" fill="rgba(255,255,255,0.2)" font-family="Helvetica Neue,Arial">Wk4</text>
          <!-- Team 1: Stars — rises from #3 to #1 -->
          <path d="M22,52 C42,44 62,30 82,22 C110,14 142,10 167,10" fill="none" stroke="#eab308" stroke-width="2.2" stroke-linecap="round"/>
          <!-- Team 2: Mallards — stays near #2 with slight dip -->
          <path d="M22,31 C42,36 62,40 82,35 C110,28 142,31 167,31" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round"/>
          <!-- Team 3: Bucs — drops from #1 to #3 -->
          <path d="M22,10 C42,14 62,22 82,31 C110,40 142,48 167,52" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" opacity="0.85"/>
          <!-- Team 4: Man — flat around #4 -->
          <path d="M22,73 C42,66 62,62 82,68 C110,72 142,70 167,73" fill="none" stroke="#ef4444" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
          <!-- End dots -->
          <circle cx="167" cy="10" r="4" fill="#eab308"/>
          <circle cx="167" cy="31" r="4" fill="#22c55e"/>
          <circle cx="167" cy="52" r="3.5" fill="#3b82f6"/>
          <circle cx="167" cy="73" r="3.5" fill="#ef4444"/>
          <!-- Name labels -->
          <text x="173" y="13" font-size="8" font-weight="700" fill="#eab308" font-family="Helvetica Neue,Arial">Stars</text>
          <text x="173" y="34" font-size="8" font-weight="700" fill="#22c55e" font-family="Helvetica Neue,Arial">Mallards</text>
          <text x="173" y="55" font-size="8" font-weight="700" fill="#3b82f6" font-family="Helvetica Neue,Arial">Bucs</text>
          <text x="173" y="76" font-size="8" font-weight="700" fill="#ef4444" font-family="Helvetica Neue,Arial">Man</text>
        </svg>
      </div>`,

    matchupgraph: `
      <div style="background:#131720;border:1px solid rgba(6,182,212,0.2);border-radius:10px;padding:10px 12px;">
        <div style="font-size:10px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">📊 Win Probability Trend</div>
        <div style="display:flex;gap:6px;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:3px;"><div style="width:8px;height:3px;background:#06b6d4;border-radius:2px;"></div><span style="font-size:8px;color:#9ca3af;">Swamp Pirates</span></div>
          <div style="display:flex;align-items:center;gap:3px;"><div style="width:8px;height:3px;background:#f97316;border-radius:2px;"></div><span style="font-size:8px;color:#9ca3af;">NC Pale Hose</span></div>
        </div>
        <svg viewBox="0 0 220 90" style="width:100%;display:block;">
          <line x1="20" y1="8" x2="210" y2="8" stroke="#1e2130" stroke-width="1"/>
          <line x1="20" y1="30" x2="210" y2="30" stroke="#374151" stroke-width="1" stroke-dasharray="3,3"/>
          <line x1="20" y1="52" x2="210" y2="52" stroke="#1e2130" stroke-width="1"/>
          <line x1="20" y1="74" x2="210" y2="74" stroke="#1e2130" stroke-width="1"/>
          <text x="4" y="11" font-size="7" fill="#4b5563" font-family="Helvetica Neue,Arial">100%</text>
          <text x="4" y="33" font-size="7" fill="#6b7280" font-family="Helvetica Neue,Arial">50%</text>
          <text x="4" y="55" font-size="7" fill="#4b5563" font-family="Helvetica Neue,Arial">25%</text>
          <text x="4" y="77" font-size="7" fill="#4b5563" font-family="Helvetica Neue,Arial">0%</text>
          <!-- Team 1 fill -->
          <path d="M20,26 C55,24 80,22 115,20 C150,18 175,14 210,10 L210,74 L20,74 Z" fill="rgba(6,182,212,0.15)"/>
          <!-- Team 2 fill -->
          <path d="M20,34 C55,36 80,38 115,40 C150,42 175,46 210,50 L210,74 L20,74 Z" fill="rgba(249,115,22,0.15)"/>
          <!-- Lines -->
          <path d="M20,26 C55,24 80,22 115,20 C150,18 175,14 210,10" fill="none" stroke="#06b6d4" stroke-width="2" stroke-linecap="round"/>
          <path d="M20,34 C55,36 80,38 115,40 C150,42 175,46 210,50" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round"/>
          <!-- Data labels -->
          <rect x="12" y="18" width="22" height="12" rx="3" fill="#06b6d4"/>
          <text x="23" y="27" text-anchor="middle" font-size="7" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial">58</text>
          <rect x="93" y="12" width="22" height="12" rx="3" fill="#06b6d4"/>
          <text x="104" y="21" text-anchor="middle" font-size="7" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial">64</text>
          <rect x="188" y="3" width="22" height="12" rx="3" fill="#06b6d4"/>
          <text x="199" y="12" text-anchor="middle" font-size="7" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial">72</text>
          <rect x="12" y="30" width="22" height="12" rx="3" fill="#f97316"/>
          <text x="23" y="39" text-anchor="middle" font-size="7" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial">42</text>
          <rect x="188" y="43" width="22" height="12" rx="3" fill="#f97316"/>
          <text x="199" y="52" text-anchor="middle" font-size="7" font-weight="800" fill="#0a0c14" font-family="Helvetica Neue,Arial">28</text>
          <!-- X labels -->
          <text x="23" y="85" text-anchor="middle" font-size="7" fill="#6b7280" font-family="Helvetica Neue,Arial">Mon</text>
          <text x="69" y="85" text-anchor="middle" font-size="7" fill="#6b7280" font-family="Helvetica Neue,Arial">Wed</text>
          <text x="115" y="85" text-anchor="middle" font-size="7" fill="#6b7280" font-family="Helvetica Neue,Arial">Fri</text>
          <text x="163" y="85" text-anchor="middle" font-size="7" fill="#6b7280" font-family="Helvetica Neue,Arial">Sat</text>
          <text x="205" y="85" text-anchor="middle" font-size="7" fill="#6b7280" font-family="Helvetica Neue,Arial">Sun</text>
        </svg>
      </div>`,
  }
  return cards[id] || cards['powerrankings']
}

// ── Story chart helpers ──────────────────────────────────────────────────── (540px wide chart in a 9:16 card) ──────────────────
function storyWplX(i: number): number {
  const n = wplLabels.value.length
  return 42 + (n > 1 ? (i / (n - 1)) * 458 : 229)
}
function storyWplY(v: number): number { return 16 + 130 - (v / 100) * 130 }
const storyLine1 = computed(() =>
  wplD1.value.map((v, i) => `${i === 0 ? 'M' : 'L'}${storyWplX(i)} ${storyWplY(v)}`).join(' '))
const storyLine2 = computed(() =>
  wplD2.value.map((v, i) => `${i === 0 ? 'M' : 'L'}${storyWplX(i)} ${storyWplY(v)}`).join(' '))
const storyFill1 = computed(() => {
  if (!wplD1.value.length) return ''
  const n = wplD1.value.length
  return storyLine1.value + ` L${storyWplX(n-1)} 146 L42 146 Z`
})
const storyFill2 = computed(() => {
  if (!wplD2.value.length) return ''
  const n = wplD2.value.length
  return storyLine2.value + ` L${storyWplX(n-1)} 146 L42 146 Z`
})

// ── Team SVG icon lookup ──────────────────────────────────────────────────
const teamIcons: Record<string, string> = {
  // ── Baseball teams ──
  'Diamond Kings': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="dk-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1200"/><stop offset="100%" stop-color="#0a0800"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#dk-bg)" stroke="#eab308" stroke-width="1.2"/><polygon points="16,8 22,14 16,20 10,14" fill="none" stroke="#eab308" stroke-width="1.5"/><rect x="14.5" y="6.5" width="3" height="3" rx="0.5" fill="#eab308" transform="rotate(45 16 8)"/><rect x="20.5" y="12.5" width="2.5" height="2.5" rx="0.5" fill="#eab308" opacity="0.8" transform="rotate(45 22 14)"/><rect x="14.5" y="18.5" width="2.5" height="2.5" rx="0.5" fill="#eab308" opacity="0.8" transform="rotate(45 16 20)"/><rect x="8.5" y="12.5" width="2.5" height="2.5" rx="0.5" fill="#eab308" opacity="0.8" transform="rotate(45 10 14)"/><circle cx="16" cy="14" r="1.5" fill="#eab308" opacity="0.6"/></svg>`,
  'Sign Stealers': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sig-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#022c22"/><stop offset="100%" stop-color="#011a14"/></linearGradient><linearGradient id="sig-gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#059669"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#sig-bg)" stroke="#10b981" stroke-width="1.2"/><rect x="10" y="9" width="12" height="2" rx="1" fill="url(#sig-gr)"/><rect x="13" y="7" width="6" height="2.5" rx="1" fill="url(#sig-gr)"/><path d="M11 11 L12 23 L20 23 L21 11 Z" fill="url(#sig-gr)" opacity="0.9"/><line x1="14" y1="13" x2="14" y2="21" stroke="#022c22" stroke-width="1.2"/><line x1="18" y1="13" x2="18" y2="21" stroke="#022c22" stroke-width="1.2"/></svg>`,
  'Roto Renegades': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rr-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0c1a3d"/><stop offset="100%" stop-color="#060e22"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#rr-bg)" stroke="#3b82f6" stroke-width="1.2"/><path d="M16 8 A8 8 0 0 1 22 20" stroke="#3b82f6" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M16 24 A8 8 0 0 1 10 12" stroke="#3b82f6" stroke-width="2" fill="none" stroke-linecap="round"/><polygon points="22,20 19,22 24,23" fill="#3b82f6"/><polygon points="10,12 13,10 8,9" fill="#3b82f6"/><circle cx="16" cy="16" r="2.5" fill="#3b82f6" opacity="0.5"/></svg>`,
  'The Sluggers': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sl-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2d0a0a"/><stop offset="100%" stop-color="#1a0505"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#sl-bg)" stroke="#ef4444" stroke-width="1.2"/><rect x="14" y="6" width="4" height="16" rx="2" fill="#ef4444" transform="rotate(-35 16 16)"/><circle cx="9" cy="22" r="3" fill="#ef4444" opacity="0.7"/><circle cx="10" cy="22" r="1.2" fill="#fff" opacity="0.3"/></svg>`,
  'Bases Loaded FC': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bl-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1200"/><stop offset="100%" stop-color="#0a0800"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#bl-bg)" stroke="#eab308" stroke-width="1.2"/><rect x="13.5" y="7" width="5" height="5" rx="0.8" fill="#eab308" transform="rotate(45 16 9.5)"/><rect x="8" y="13" width="4.5" height="4.5" rx="0.8" fill="#eab308" opacity="0.7" transform="rotate(45 10 15)"/><rect x="19.5" y="13" width="4.5" height="4.5" rx="0.8" fill="#eab308" opacity="0.7" transform="rotate(45 22 15)"/><circle cx="16" cy="18" r="2" fill="#eab308" opacity="0.5"/></svg>`,
  'Ace Gang': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ag-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a0d3d"/><stop offset="100%" stop-color="#0e0722"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#ag-bg)" stroke="#8b5cf6" stroke-width="1.2"/><text x="16" y="21" text-anchor="middle" font-size="13" font-weight="900" fill="#a78bfa" font-family="Impact,Arial,sans-serif">K</text><circle cx="16" cy="23" r="1" fill="#8b5cf6" opacity="0.5"/></svg>`,
  'Launch Angle FC': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="la-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a0d00"/><stop offset="100%" stop-color="#0e0700"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#la-bg)" stroke="#f97316" stroke-width="1.2"/><line x1="9" y1="22" x2="22" y2="10" stroke="#f97316" stroke-width="2.5" stroke-linecap="round"/><circle cx="22" cy="10" r="3" fill="#f97316" opacity="0.9"/><path d="M9 22 L9 16" stroke="#f97316" stroke-width="1" opacity="0.5"/><path d="M9 22 L15 22" stroke="#f97316" stroke-width="1" opacity="0.5"/></svg>`,
  'No-Hitter Club': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="nh-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#071a2f"/><stop offset="100%" stop-color="#030f1c"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#nh-bg)" stroke="#06b6d4" stroke-width="1.2"/><circle cx="16" cy="16" r="6.5" fill="none" stroke="#06b6d4" stroke-width="1.5"/><line x1="16" y1="9.5" x2="16" y2="22.5" stroke="#06b6d4" stroke-width="1" opacity="0.5"/><path d="M10 14 Q13 12 16 11" stroke="#06b6d4" stroke-width="1" fill="none" opacity="0.6"/><path d="M22 18 Q19 20 16 21" stroke="#06b6d4" stroke-width="1" fill="none" opacity="0.6"/><circle cx="16" cy="16" r="1.8" fill="#06b6d4" opacity="0.7"/></svg>`,
  'The Algorithm': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ai-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1e1b4b"/><stop offset="100%" stop-color="#0f0e2e"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#ai-bg)" stroke="#6366f1" stroke-width="1.2"/><rect x="11" y="11" width="10" height="10" rx="1.5" fill="none" stroke="#6366f1" stroke-width="1.5"/><rect x="13" y="13" width="6" height="6" rx="1" fill="#6366f1" opacity="0.3"/><line x1="8" y1="13" x2="11" y2="13" stroke="#818cf8" stroke-width="1.2"/><line x1="8" y1="16" x2="11" y2="16" stroke="#818cf8" stroke-width="1.2"/><line x1="8" y1="19" x2="11" y2="19" stroke="#818cf8" stroke-width="1.2"/><line x1="21" y1="13" x2="24" y2="13" stroke="#818cf8" stroke-width="1.2"/><line x1="21" y1="16" x2="24" y2="16" stroke="#818cf8" stroke-width="1.2"/><line x1="21" y1="19" x2="24" y2="19" stroke="#818cf8" stroke-width="1.2"/><circle cx="16" cy="16" r="1.5" fill="#818cf8"/></svg>`,
  'Waiver Wire Kid': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ww-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2d0a0a"/><stop offset="100%" stop-color="#1a0505"/></linearGradient><linearGradient id="ww-bolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fca5a5"/><stop offset="100%" stop-color="#dc2626"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#ww-bg)" stroke="#ef4444" stroke-width="1.2"/><path d="M19 8 L13 17 L17 17 L13 26 L21 15 L17 15 Z" fill="url(#ww-bolt)"/></svg>`,
  'Green Machine': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gm-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#022c22"/><stop offset="100%" stop-color="#011a14"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#gm-bg)" stroke="#10b981" stroke-width="1.2"/><path d="M16 8 L24 13 L24 21 L16 26 L8 21 L8 13 Z" fill="none" stroke="#10b981" stroke-width="1.5"/><text x="16" y="20" text-anchor="middle" font-size="8" font-weight="900" fill="#10b981" font-family="Impact,sans-serif">GM</text></svg>`,
  'The Dynasty': `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="dyn-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1200"/><stop offset="100%" stop-color="#0d0a00"/></linearGradient><linearGradient id="dyn-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fde68a"/><stop offset="100%" stop-color="#b45309"/></linearGradient></defs><path d="M16 2 L28 6 L28 18 Q28 26 16 30 Q4 26 4 18 L4 6 Z" fill="url(#dyn-bg)" stroke="url(#dyn-g)" stroke-width="1.5"/><ellipse cx="9" cy="12" rx="1.5" ry="2.5" fill="#d97706" opacity="0.6" transform="rotate(-20 9 12)"/><ellipse cx="9.5" cy="16" rx="1.5" ry="2.5" fill="#d97706" opacity="0.6" transform="rotate(-10 9.5 16)"/><ellipse cx="10.5" cy="20" rx="1.5" ry="2" fill="#d97706" opacity="0.5" transform="rotate(10 10.5 20)"/><ellipse cx="23" cy="12" rx="1.5" ry="2.5" fill="#d97706" opacity="0.6" transform="rotate(20 23 12)"/><ellipse cx="22.5" cy="16" rx="1.5" ry="2.5" fill="#d97706" opacity="0.6" transform="rotate(10 22.5 16)"/><ellipse cx="21.5" cy="20" rx="1.5" ry="2" fill="#d97706" opacity="0.5" transform="rotate(-10 21.5 20)"/><text x="16" y="20" text-anchor="middle" font-size="9" font-weight="900" fill="url(#dyn-g)" font-family="Georgia,serif">I</text></svg>`,
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
          { title: '⚡ Power Rankings', wk: 'WK 14', accent: '#eab308', rows: [
            { rk: '1', name: 'Diamond Kings', pts: '124.8', chg: '▲2', up: true, dot: '#eab308' },
            { rk: '2', name: 'Sign Stealers', pts: '116.2', chg: '▲1', up: true, dot: '#10b981' },
            { rk: '3', name: 'Roto Renegades', pts: '108.4', chg: '▼1', up: false, dot: '#3b82f6' },
          ]},
          { title: '⚔️ Matchup', wk: 'LIVE', accent: '#06b6d4', matchup: true,
            t1: { name: 'Diamond Kings', score: '124.8', dot: '#eab308', pct: 74 },
            t2: { name: 'Sign Stealers', score: '104.1', dot: '#10b981', pct: 26 }
          },
          { title: '🏆 Legacy', wk: 'ALL TIME', accent: '#eab308', rows: [
            { rk: '1', name: 'Diamond Kings', pts: '1,912', dot: '#eab308', up: true },
            { rk: '2', name: 'Sign Stealers', pts: '1,748', dot: '#10b981', up: true },
            { rk: '3', name: 'Roto Renegades', pts: '1,531', dot: '#3b82f6', up: false },
          ]},
        ],
        pr: [
          { title: '⚡ Power Rankings', wk: 'WK 14', accent: '#eab308', rows: [
            { rk: '1', name: 'Diamond Kings', pts: '124.8', chg: '▲2', up: true, dot: '#eab308' },
            { rk: '2', name: 'Sign Stealers', pts: '116.2', chg: '▲1', up: true, dot: '#10b981' },
            { rk: '3', name: 'Roto Renegades', pts: '108.4', chg: '▼1', up: false, dot: '#3b82f6' },
          ]},
          { title: '⚡ Power Rankings', wk: 'WK 13', accent: '#eab308', rows: [
            { rk: '1', name: 'Sign Stealers', pts: '120.7', chg: '▲3', up: true, dot: '#10b981' },
            { rk: '2', name: 'Diamond Kings', pts: '114.3', chg: '▼1', up: false, dot: '#eab308' },
            { rk: '3', name: 'The Sluggers', pts: '109.8', chg: '▲2', up: true, dot: '#ef4444' },
          ]},
          { title: '⚡ Power Rankings', wk: 'WK 12', accent: '#eab308', rows: [
            { rk: '1', name: 'The Sluggers', pts: '131.2', chg: '▲4', up: true, dot: '#ef4444' },
            { rk: '2', name: 'Roto Renegades', pts: '118.6', chg: '▲1', up: true, dot: '#3b82f6' },
            { rk: '3', name: 'Diamond Kings', pts: '111.4', chg: '▼2', up: false, dot: '#eab308' },
          ]},
        ],
        wp: [
          { title: '⚔️ Matchup', wk: 'LIVE', accent: '#06b6d4', matchup: true,
            t1: { name: 'Diamond Kings', score: '124.8', dot: '#eab308', pct: 74 },
            t2: { name: 'Sign Stealers', score: '104.1', dot: '#10b981', pct: 26 }
          },
          { title: '⚔️ Matchup', wk: 'LIVE', accent: '#06b6d4', matchup: true,
            t1: { name: 'Roto Renegades', score: '96.8', dot: '#3b82f6', pct: 58 },
            t2: { name: 'The Sluggers', score: '88.4', dot: '#ef4444', pct: 42 }
          },
          { title: '⚔️ Matchup', wk: 'LIVE', accent: '#06b6d4', matchup: true,
            t1: { name: 'Ace Gang', score: '79.2', dot: '#8b5cf6', pct: 43 },
            t2: { name: 'Bases Loaded FC', score: '84.6', dot: '#f97316', pct: 57 }
          },
        ],
        draft: [
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#8b5cf6', draftRows: [
            { pick: '1.02', name: 'Shohei Ohtani', pos: 'SP', par: '+58.4', grade: 'A+', gold: true },
            { pick: '2.11', name: 'Juan Soto', pos: 'OF', par: '+24.6', grade: 'A', green: true },
            { pick: '5.03', name: 'Jose Abreu', pos: '1B', par: '-14.2', grade: 'D', bust: true },
          ]},
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#8b5cf6', draftRows: [
            { pick: '1.04', name: 'Mookie Betts', pos: 'OF', par: '+41.7', grade: 'A+', gold: true },
            { pick: '2.06', name: 'José Ramírez', pos: '3B', par: '+19.8', grade: 'A', green: true },
            { pick: '3.08', name: 'Spencer Strider', pos: 'SP', par: '-28.1', grade: 'D', bust: true },
          ]},
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#8b5cf6', draftRows: [
            { pick: '1.07', name: 'Ronald Acuña Jr', pos: 'OF', par: '+51.2', grade: 'A+', gold: true },
            { pick: '3.01', name: 'Bobby Witt Jr', pos: 'SS', par: '+32.4', grade: 'A+', gold: true },
            { pick: '4.09', name: 'Gerrit Cole', pos: 'SP', par: '-6.1', grade: 'C', neutral: true },
          ]},
        ],
        history: [
          { title: '🏆 Legacy Standings', wk: 'ALL TIME', accent: '#eab308', rows: [
            { rk: '1', name: 'Diamond Kings', pts: '1,912', dot: '#eab308', up: true },
            { rk: '2', name: 'Sign Stealers', pts: '1,748', dot: '#10b981', up: false },
            { rk: '3', name: 'Roto Renegades', pts: '1,531', dot: '#3b82f6', up: false },
          ]},
          { title: '⚔️ H2H All-Time', wk: 'ALL TIME', accent: '#eab308', h2h: true },
          { title: '🏅 Season Awards', wk: 'HISTORY', accent: '#eab308', awards: true },
        ],
        h2h: [
          { title: '⚔️ H2H Records', wk: 'ALL TIME', accent: '#ef4444', h2h: true },
          { title: '🏆 Championships', wk: 'ALL TIME', accent: '#eab308', rows: [
            { rk: '🏆', name: 'Diamond Kings', pts: '3 titles', dot: '#eab308', up: true },
            { rk: '🥈', name: 'Sign Stealers', pts: '1 title', dot: '#10b981', up: false },
            { rk: '0', name: 'Roto Renegades', pts: '0 titles', dot: '#3b82f6', up: false },
          ]},
          { title: '📊 Finish History', wk: 'HISTORY', accent: '#6366f1', rows: [
            { rk: '1', name: 'Diamond Kings', pts: 'Avg 1.4', dot: '#eab308', up: true },
            { rk: '2', name: 'Sign Stealers', pts: 'Avg 2.1', dot: '#10b981', up: false },
            { rk: '3', name: 'Roto Renegades', pts: 'Avg 3.2', dot: '#3b82f6', up: false },
          ]},
        ],
        bball: [
          { title: '⚡ Category Rankings', wk: 'WK 14', accent: '#3b82f6', rows: [
            { rk: '1', name: 'Diamond Kings', pts: '8W-2L', chg: '▲1', up: true, dot: '#eab308' },
            { rk: '2', name: 'Roto Renegades', pts: '7W-3L', chg: '—', up: false, dot: '#3b82f6' },
            { rk: '3', name: 'The Sluggers', pts: '6W-4L', chg: '▼1', up: false, dot: '#ef4444' },
          ]},
          { title: '⚔️ Matchup', wk: 'WK 14', accent: '#3b82f6', matchup: true,
            t1: { name: 'Diamond Kings', score: '8W-2L', dot: '#eab308', pct: 67 },
            t2: { name: 'Roto Renegades', score: '6W-4L', dot: '#3b82f6', pct: 33 }
          },
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#3b82f6', draftRows: [
            { pick: '1.03', name: 'Yordan Alvarez', pos: 'OF', par: '+47.2', grade: 'A+', gold: true },
            { pick: '2.08', name: 'Trea Turner', pos: 'SS', par: '+21.3', grade: 'A', green: true },
            { pick: '4.01', name: 'Clayton Kershaw', pos: 'SP', par: '-19.4', grade: 'D', bust: true },
          ]},
        ],
        baseball: [
          { title: '⚡ Power Rankings', wk: 'WK 14', accent: '#3b82f6', rows: [
            { rk: '1', name: 'Diamond Kings', pts: '124.8', chg: '▲2', up: true, dot: '#eab308' },
            { rk: '2', name: 'Roto Renegades', pts: '113.1', chg: '▼1', up: false, dot: '#3b82f6' },
            { rk: '3', name: 'The Sluggers', pts: '104.7', chg: '▲1', up: true, dot: '#ef4444' },
          ]},
          { title: '⚔️ Matchup', wk: 'WK 14', accent: '#3b82f6', matchup: true,
            t1: { name: 'Diamond Kings', score: '124.8', dot: '#eab308', pct: 69 },
            t2: { name: 'Roto Renegades', score: '108.3', dot: '#3b82f6', pct: 31 }
          },
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#3b82f6', draftRows: [
            { pick: '1.01', name: 'Ronald Acuña Jr', pos: 'OF', par: '+51.2', grade: 'A+', gold: true },
            { pick: '2.05', name: 'Mookie Betts', pos: 'OF', par: '+22.7', grade: 'A', green: true },
            { pick: '4.03', name: 'Jose Abreu', pos: '1B', par: '-8.4', grade: 'C', neutral: true },
          ]},
        ],
        hockey: [
          { title: '🏆 Legacy Standings', wk: 'ALL TIME', accent: '#eab308', rows: [
            { rk: '1', name: 'Diamond Kings', pts: '1,912', dot: '#eab308', up: true },
            { rk: '2', name: 'Sign Stealers', pts: '1,748', dot: '#10b981', up: false },
            { rk: '3', name: 'The Sluggers', pts: '1,489', dot: '#ef4444', up: false },
          ]},
          { title: '⚔️ H2H All-Time', wk: 'ALL TIME', accent: '#eab308', h2h: true },
          { title: '🏅 Season Awards', wk: 'HISTORY', accent: '#eab308', awards: true },
        ],
        compact: [
          { title: '⚡ Power Rankings', wk: 'WK 14', accent: '#eab308', rows: [
            { rk: '1', name: 'Diamond Kings', pts: '124.8', chg: '▲2', up: true, dot: '#eab308' },
            { rk: '2', name: 'Sign Stealers', pts: '116.2', chg: '▲1', up: true, dot: '#10b981' },
            { rk: '3', name: 'Roto Renegades', pts: '108.4', chg: '▼1', up: false, dot: '#3b82f6' },
          ]},
          { title: '📋 Draft Grades', wk: 'DRAFT', accent: '#8b5cf6', draftRows: [
            { pick: '1.02', name: 'Shohei Ohtani', pos: 'SP', par: '+58.4', grade: 'A+', gold: true },
            { pick: '2.11', name: 'Juan Soto', pos: 'OF', par: '+24.6', grade: 'A', green: true },
            { pick: '5.03', name: 'Jose Abreu', pos: '1B', par: '-14.2', grade: 'D', bust: true },
          ]},
          { title: '🏆 Legacy', wk: 'ALL TIME', accent: '#eab308', rows: [
            { rk: '1', name: 'Diamond Kings', pts: '1,912', dot: '#eab308', up: true },
            { rk: '2', name: 'Sign Stealers', pts: '1,748', dot: '#10b981', up: false },
            { rk: '3', name: 'Roto Renegades', pts: '1,531', dot: '#3b82f6', up: false },
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
        h('div', { class: 'fc-h2h-row' }, [ h('div', { class: 'fc-h2h-lbl' }, ''), h('span', { class: 'fc-h2h-hd' }, 'DK'), h('span', { class: 'fc-h2h-hd' }, 'SS'), h('span', { class: 'fc-h2h-hd' }, 'RR') ]),
        h('div', { class: 'fc-h2h-row' }, [ h('div', { class: 'fc-h2h-lbl' }, 'Diamond Kings'), h('span', { class: 'fc-h2h-cell self' }, '—'), h('span', { class: 'fc-h2h-cell win' }, '9-3'), h('span', { class: 'fc-h2h-cell win' }, '11-1') ]),
        h('div', { class: 'fc-h2h-row' }, [ h('div', { class: 'fc-h2h-lbl' }, 'Sign Stealers'), h('span', { class: 'fc-h2h-cell loss' }, '3-9'), h('span', { class: 'fc-h2h-cell self' }, '—'), h('span', { class: 'fc-h2h-cell win' }, '7-5') ]),
        h('div', { class: 'fc-h2h-row' }, [ h('div', { class: 'fc-h2h-lbl' }, 'Roto Renegades'), h('span', { class: 'fc-h2h-cell loss' }, '1-11'), h('span', { class: 'fc-h2h-cell loss' }, '5-7'), h('span', { class: 'fc-h2h-cell self' }, '—') ]),
      ])

      const renderAwardsCard = () => h('div', { class: 'fc-awards' }, [
        h('div', { class: 'fc-award-row' }, [ h('span', { class: 'fc-award-icon' }, '🏆'), h('span', { class: 'fc-award-label' }, 'Highest Single Week'), h('span', { class: 'fc-award-val gold' }, '152.4 pts') ]),
        h('div', { class: 'fc-award-row' }, [ h('span', { class: 'fc-award-icon' }, '💀'), h('span', { class: 'fc-award-label' }, 'Worst Blown Lead'), h('span', { class: 'fc-award-val red' }, '7 cats → 2') ]),
        h('div', { class: 'fc-award-row' }, [ h('span', { class: 'fc-award-icon' }, '😤'), h('span', { class: 'fc-award-label' }, 'Longest Dry Spell'), h('span', { class: 'fc-award-val' }, '4 seasons') ]),
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
// ══ GRAPHIC 29 — Manual Win Probability Social Card ═══════════════════════

// Two teams — type name and paste logo URL
const wplPresetTeams = ref([
  { name: '', logo: '' },
  { name: '', logo: '' },
])

// Manual day inputs — enter win probability for team 1 each day (team 2 = 100 - team1)
// 0 or empty = skip that day
const wplDayInputs = ref([
  { label: 'Mon', val: 0 },
  { label: 'Tue', val: 0 },
  { label: 'Wed', val: 0 },
  { label: 'Thu', val: 0 },
  { label: 'Fri', val: 0 },
  { label: 'Sat', val: 0 },
  { label: 'Sun', val: 0 },
])

const wplWeekLabel = ref('Week 1')

// Derived chart data from inputs (skip days where val === 0)
const wplD1 = computed(() => wplDayInputs.value.filter(d => d.val > 0).map(d => Math.round(Math.min(99.9,Math.max(0.1,d.val))*10)/10))
const wplD2 = computed(() => wplD1.value.map(v => Math.round((100-v)*10)/10))
const wplLabels = computed(() => wplDayInputs.value.filter(d => d.val > 0).map(d => d.label))

const wplProb1 = computed(() => wplD1.value.length ? wplD1.value[wplD1.value.length-1] : 50)
const wplProb2 = computed(() => 100 - wplProb1.value)

// SVG helpers
function wplSvgX(i: number): number { const n=wplLabels.value.length; return 48+(n>1?(i/(n-1))*440:220) }
function wplSvgY(v: number): number { return 36+140-(v/100)*140 }
const wplPath1Computed = computed(()=>wplD1.value.map((v,i)=>`${i===0?'M':'L'}${wplSvgX(i)} ${wplSvgY(v)}`).join(' '))
const wplPath2Computed = computed(()=>wplD2.value.map((v,i)=>`${i===0?'M':'L'}${wplSvgX(i)} ${wplSvgY(v)}`).join(' '))
const wplFill1Computed = computed(()=>{ if(!wplD1.value.length) return ''; const n=wplD1.value.length; return wplPath1Computed.value+` L${wplSvgX(n-1)} 176 L48 176 Z` })
const wplFill2Computed = computed(()=>{ if(!wplD2.value.length) return ''; const n=wplD2.value.length; return wplPath2Computed.value+` L${wplSvgX(n-1)} 176 L48 176 Z` })


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
.sq { width: 100%; aspect-ratio: 1/1; position: relative; overflow: hidden; border-radius: 4px; box-shadow: 0 0 0 1px #1e2130, 0 20px 60px rgba(0,0,0,0.7); flex-shrink: 0; display: flex; flex-direction: column; }
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

/* ── INTERACTIVE WIN PROBABILITY TEMPLATE ───────────────────────────────── */
.wp-post-wrap { max-width: 600px; margin: 0 auto; }
.sq-wp-bg {
  width: 100%;
  aspect-ratio: 9/10 !important;
  background: #0a0c14;
  border-radius: 6px;
}
.wp-controls {
  background: #0c0e17; border: 1px solid #1e2130; border-radius: 12px;
  padding: 18px 20px 14px; margin-bottom: 20px;
  display: flex; flex-direction: column; gap: 12px;
}
.wp-ctrl-row { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; }
.wp-ctrl-group { display: flex; flex-direction: column; gap: 5px; }
.wp-ctrl-sm { min-width: 70px; }
.wp-ctrl-group label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #4b5563; }
.wp-input {
  background: #0a0c14; border: 1px solid #262a3a; border-radius: 7px;
  color: #e5e7eb; font-size: 13px; padding: 6px 10px; outline: none; min-width: 130px;
  transition: border-color 0.15s;
}
.wp-input:focus { border-color: #06b6d4; }
.wp-slider { accent-color: #06b6d4; width: 100px; cursor: pointer; }
.wp-val { font-size: 12px; font-weight: 700; color: #06b6d4; }
.wp-pills { display: flex; gap: 4px; flex-wrap: wrap; }
.wp-pill-off {
  padding: 4px 9px; border-radius: 5px; border: 1px solid #262a3a;
  background: #0a0c14; color: #6b7280; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.12s;
}
.wp-pill-off:hover { border-color: #06b6d4; color: #06b6d4; }
.wp-pill-on {
  padding: 4px 9px; border-radius: 5px; border: 1px solid #06b6d4;
  background: rgba(6,182,212,0.12); color: #06b6d4; font-size: 11px; font-weight: 700; cursor: pointer;
}
.wp-pill-up {
  padding: 4px 9px; border-radius: 5px; border: 1px solid #22c55e;
  background: rgba(34,197,94,0.12); color: #22c55e; font-size: 11px; font-weight: 700; cursor: pointer;
}
.wp-pill-dn {
  padding: 4px 9px; border-radius: 5px; border: 1px solid #ef4444;
  background: rgba(239,68,68,0.12); color: #ef4444; font-size: 11px; font-weight: 700; cursor: pointer;
}

/* ── INTERACTIVE POWER RANKINGS TEMPLATE ────────────────────────────────── */
.pr-post-wrap { max-width: 680px; margin: 0 40px; }
.pr-team-grid { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
.pr-team-header { display: flex; align-items: center; gap: 8px; padding: 0 4px 4px;
  border-bottom: 1px solid #1e2130; }
.pr-th { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: #374151; }
.pr-team-row { display: flex; align-items: center; gap: 8px; }
.pr-team-num { font-size: 13px; font-weight: 900; color: #4b5563; width: 18px; text-align: center;
  flex-shrink: 0; }
.pr-name-input { flex: 1; min-width: 120px; }
.pr-score-input { width: 72px; }
.pr-chg-val { font-size: 13px; font-weight: 800; width: 28px; text-align: center; flex-shrink: 0; }

/* ── SHOWCASE CARDS (19-26) ─────────────────────────────────────────────── */
.sq-showcase {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0;
  overflow: hidden;
}

/* Background variants — glow from bottom left for the text versions */
.sq-sc-gold   { background: radial-gradient(ellipse 140% 90% at 0% 110%, rgba(234,179,8,0.22) 0%, transparent 50%), linear-gradient(160deg, #07080e, #0c0e18); }
.sq-sc-cyan   { background: radial-gradient(ellipse 140% 90% at 0% 110%, rgba(6,182,212,0.20) 0%, transparent 50%), linear-gradient(160deg, #04080f, #080c18); }
.sq-sc-purple { background: radial-gradient(ellipse 140% 90% at 0% 110%, rgba(139,92,246,0.20) 0%, transparent 50%), linear-gradient(160deg, #060510, #0a0815); }
.sq-sc-amber  { background: radial-gradient(ellipse 140% 90% at 0% 110%, rgba(245,158,11,0.20) 0%, transparent 50%), linear-gradient(160deg, #080700, #0d0c00); }

/* Logo — top-left, small and clean */
.sc-logo-row {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  padding: 22px 24px 0;
  flex-shrink: 0;
}
.sc-logo-row.sc-logo-center {
  justify-content: center;
  padding-top: 30px;
}
.sc-logo { height: 36px; width: auto; object-fit: contain; }
.sc-logo-lg { height: 50px; }

/* Fan hero — centered, cards are the star */
.sc-fan-hero {
  position: relative;
  z-index: 3;
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Push up slightly to make room for text below */
  margin-top: -8px;
}
.sc-fan-hero.sc-fan-full {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0;
}

/* Scale wrapper — cards big and centered */
.sc-fan-scale {
  transform: scale(1.75);
  transform-origin: center center;
}
.sc-fan-scale-lg {
  transform: scale(1.9);
  transform-origin: center center;
}

/* Feature word — bottom strip, full-width, tight and clean */
.sc-feature-word {
  position: relative;
  z-index: 4;
  width: 100%;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 40px;
  font-weight: 900;
  letter-spacing: 0.1em;
  line-height: 1;
  text-transform: uppercase;
  padding: 18px 28px 28px;
  flex-shrink: 0;
  /* Semi-transparent dark bg behind text so it never fights the cards */
  background: linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
  text-shadow: 0 2px 20px rgba(0,0,0,0.9);
}
/* Thin accent bar left of word */
.sc-feature-word::before {
  content: '';
  display: block;
  width: 40px;
  height: 3px;
  border-radius: 2px;
  margin-bottom: 10px;
  background: currentColor;
  opacity: 0.7;
}
.sc-word-gold   { color: #eab308; }
.sc-word-cyan   { color: #06b6d4; }
.sc-word-purple { color: #a78bfa; }
.sc-word-amber  { color: #f59e0b; }

/* ── TYPE TABS ── */
.type-tabs {
  display: flex; gap: 0; border-bottom: 1px solid #1e2130;
  background: #030407; padding: 0 40px;
  position: sticky; top: 0; z-index: 20;
}
.type-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 14px 20px; font-size: 13px; font-weight: 600;
  color: #6b7280; border: none; background: none; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: all 0.15s; white-space: nowrap;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
.type-tab:hover { color: #9ca3af; }
.type-tab-active { color: #e5e7eb; border-bottom-color: #eab308; }

/* ── WPI Controls ── */
.wpi-controls {
  display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end;
  padding: 20px; background: #0a0c14; border: 1px solid #1e2130;
  border-radius: 12px; margin-bottom: 24px;
}
.wpi-ctrl-group { display: flex; flex-direction: column; gap: 5px; }
.wpi-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #4b5563; }
.wpi-pills { display: flex; gap: 4px; }
.wpi-load-btn {
  padding: 10px 22px; background: rgba(234,179,8,0.15);
  border: 1px solid rgba(234,179,8,0.4); border-radius: 8px;
  color: #eab308; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: all 0.15s; align-self: flex-end;
}
.wpi-load-btn:hover:not(:disabled) { background: rgba(234,179,8,0.25); }
.wpi-load-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.wpi-error {
  padding: 10px 16px; background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.3); border-radius: 8px;
  color: #fca5a5; font-size: 12px; margin-bottom: 16px;
}
.wpi-status {
  padding: 10px 16px; background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.2); border-radius: 8px;
  color: #4ade80; font-size: 12px; margin-bottom: 16px;
}
</style>
