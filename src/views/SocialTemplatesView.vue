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
      <button @click="activeType='stories'" :class="['type-tab', activeType==='stories'?'type-tab-active':'']" style="opacity:0.4;cursor:default">
        <span>📱</span> Stories <span style="font-size:9px;background:rgba(234,179,8,0.15);border:1px solid rgba(234,179,8,0.3);color:#eab308;padding:1px 5px;border-radius:3px;margin-left:4px">Soon</span>
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

    <!-- 20 · INTERACTIVE POWER RANKINGS -->
    <div class="post-wrap pr-post-wrap">
      <div class="post-label">20 · Power Rankings — Interactive</div>

      <!-- ── Controls ── -->
      <div class="wp-controls">
        <div class="wp-ctrl-row">
          <div class="wp-ctrl-group">
            <label>Sport · League Type</label>
            <input v-model="prSportLabel" class="wp-input" placeholder="Baseball · H2H Points" />
          </div>
          <div class="wp-ctrl-group wp-ctrl-sm">
            <label>Week</label>
            <input v-model="prWeek" class="wp-input" style="width:64px" placeholder="14" />
          </div>
          <div class="wp-ctrl-group">
            <label>Number of Teams</label>
            <div class="wp-pills">
              <button v-for="n in [4,6,8,10]" :key="n" @click="prTeamCount=n"
                :class="prTeamCount===n?'wp-pill-on':'wp-pill-off'">{{n}}</button>
            </div>
          </div>
          <div class="wp-ctrl-group">
            <label>Accent Color</label>
            <div class="wp-pills">
              <button @click="prAccent='gold'"   :class="prAccent==='gold'?'wp-pill-on':'wp-pill-off'" style="color:#eab308">⚡ Gold</button>
              <button @click="prAccent='cyan'"   :class="prAccent==='cyan'?'wp-pill-on':'wp-pill-off'" style="color:#06b6d4">● Cyan</button>
              <button @click="prAccent='green'"  :class="prAccent==='green'?'wp-pill-on':'wp-pill-off'" style="color:#22c55e">● Green</button>
              <button @click="prAccent='purple'" :class="prAccent==='purple'?'wp-pill-on':'wp-pill-off'" style="color:#a78bfa">● Purple</button>
            </div>
          </div>
        </div>

        <!-- Team rows -->
        <div class="pr-team-grid">
          <div class="pr-team-header">
            <span class="pr-th">#</span>
            <span class="pr-th" style="flex:1">Team Name</span>
            <span class="pr-th" style="width:80px">Score</span>
            <span class="pr-th" style="width:70px">+/− Rank</span>
            <span class="pr-th" style="width:90px">Record</span>
          </div>
          <div v-for="(team, i) in prTeams.slice(0, prTeamCount)" :key="i" class="pr-team-row">
            <span class="pr-team-num">{{ i + 1 }}</span>
            <input v-model="team.name" class="wp-input pr-name-input" :placeholder="'Team ' + (i+1)" />
            <input v-model.number="team.score" type="number" step="0.1" class="wp-input pr-score-input" placeholder="124.8" />
            <div class="wp-pills" style="gap:3px">
              <button @click="team.change = Math.max(-9, team.change - 1)" class="wp-pill-off" style="padding:3px 7px;font-size:13px">−</button>
              <span class="pr-chg-val" :style="{color: team.change > 0 ? '#22c55e' : team.change < 0 ? '#ef4444' : '#6b7280'}">
                {{ team.change > 0 ? '▲' + team.change : team.change < 0 ? '▼' + Math.abs(team.change) : '—' }}
              </span>
              <button @click="team.change = Math.min(9, team.change + 1)" class="wp-pill-off" style="padding:3px 7px;font-size:13px">+</button>
            </div>
            <input v-model="team.record" class="wp-input" style="width:80px" placeholder="8-3" />
          </div>
        </div>
      </div>

      <!-- ── Screenshottable card ── -->
      <div class="sq sq-wp-bg">
        <div class="sq-grain"></div>
        <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg"
          style="position:absolute;inset:0;width:100%;height:100%;z-index:2">

          <defs>
            <linearGradient id="pr-bar-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" :stop-color="prAccentColor" stop-opacity="0.9"/>
              <stop offset="100%" :stop-color="prAccentColor" stop-opacity="0.35"/>
            </linearGradient>
            <linearGradient id="pr-top-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="transparent"/>
              <stop offset="50%" :stop-color="prAccentColor"/>
              <stop offset="100%" stop-color="transparent"/>
            </linearGradient>
          </defs>

          <!-- Top accent line -->
          <rect x="0" y="0" width="540" height="3" fill="url(#pr-top-grad)"/>

          <!-- ═══ HEADER BAR ═══ -->
          <rect x="0" y="3" width="540" height="50" fill="#0d1019"/>
          <line x1="0" y1="53" x2="540" y2="53" stroke="#1e2130" stroke-width="1"/>

          <!-- UFD badge -->
          <rect x="16" y="14" width="46" height="26" rx="5" fill="#09090f" :stroke="prAccentColor" stroke-width="1.5"/>
          <text x="39" y="32" text-anchor="middle" font-size="12" font-weight="900"
            :fill="prAccentColor" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">UFD</text>

          <!-- Sport emoji + label -->
          <text x="72" y="32" font-size="18">{{ prSportEmoji }}</text>
          <text x="96" y="32" font-size="13" font-weight="600" fill="#e5e7eb"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ prSportLabel }}</text>

          <!-- WK -->
          <text x="524" y="32" text-anchor="end" font-size="13" font-weight="700" fill="#6b7280"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WK {{ prWeek }}</text>

          <!-- ═══ TITLE BAR ═══ -->
          <rect x="0" y="53" width="540" height="48" fill="#0a0c14"/>
          <line x1="0" y1="101" x2="540" y2="101" stroke="#1e2130" stroke-width="1"/>

          <!-- Lightning icon bg -->
          <rect x="18" y="64" width="26" height="26" rx="4" :fill="prIconBg"/>
          <text x="31" y="82" text-anchor="middle" font-size="15">⚡</text>

          <!-- Title -->
          <text x="52" y="83" font-size="17" font-weight="900" letter-spacing="0.04em"
            fill="#ffffff" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">POWER RANKINGS</text>

          <!-- Column headers -->
          <rect x="0" y="101" width="540" height="28" fill="rgba(255,255,255,0.025)"/>
          <line x1="0" y1="129" x2="540" y2="129" stroke="#1e2130" stroke-width="1"/>
          <text x="20"  y="119" font-size="9.5" font-weight="700" fill="#4b5563" letter-spacing="0.1em"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">RANK</text>
          <text x="64"  y="119" font-size="9.5" font-weight="700" fill="#4b5563" letter-spacing="0.1em"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">TEAM</text>
          <text x="270" y="119" font-size="9.5" font-weight="700" fill="#4b5563" letter-spacing="0.1em"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">SCORE</text>
          <text x="432" y="119" font-size="9.5" font-weight="700" fill="#4b5563" letter-spacing="0.1em"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">RECORD</text>
          <text x="500" y="119" font-size="9.5" font-weight="700" fill="#4b5563" letter-spacing="0.1em"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">+/−</text>

          <!-- ═══ TEAM ROWS ═══ -->
          <g v-for="(team, i) in prTeams.slice(0, prTeamCount)" :key="'row'+i">
            <!-- Row bg — alt shading + highlight for #1 -->
            <rect x="0" :y="129 + i * prRowH" width="540" :height="prRowH"
              :fill="i===0 ? prRowHighlight : i%2===0 ? 'rgba(255,255,255,0.012)' : 'transparent'"/>
            <line x1="0" :y1="129 + (i+1)*prRowH" x2="540" :y2="129 + (i+1)*prRowH"
              stroke="#1e2130" stroke-width="0.5" opacity="0.6"/>

            <!-- Rank pill -->
            <rect x="12" :y="129 + i*prRowH + prRowH/2 - 13" width="32" height="26" rx="13"
              :fill="i===0 ? prAccentColor : i===1 ? 'rgba(255,255,255,0.06)' : i===2 ? 'rgba(255,255,255,0.04)' : 'transparent'"
              :stroke="i===0 ? 'none' : '#262a3a'" stroke-width="1"/>
            <text x="28" :y="129 + i*prRowH + prRowH/2 + 5" text-anchor="middle"
              font-size="13" font-weight="900"
              :fill="i===0 ? '#0a0c14' : i < 3 ? '#e5e7eb' : '#6b7280'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ i + 1 }}</text>

            <!-- Color dot (unique per team) -->
            <circle cx="56" :cy="129 + i*prRowH + prRowH/2" r="5" :fill="prTeamColor(i)"/>

            <!-- Team name -->
            <text x="68" :y="129 + i*prRowH + prRowH/2 - 4" font-size="13" font-weight="700"
              :fill="i===0 ? '#ffffff' : '#d1d5db'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ team.name || 'Team ' + (i+1) }}</text>

            <!-- Record -->
            <text x="68" :y="129 + i*prRowH + prRowH/2 + 11" font-size="10" fill="#4b5563"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ team.record || '' }}</text>

            <!-- Score bar track (x=248..330, 82px) + filled bar — fully separated from score number -->
            <rect x="248" :y="129 + i*prRowH + prRowH/2 - 4" width="82" height="8" rx="4"
              fill="rgba(255,255,255,0.05)"/>
            <rect x="248" :y="129 + i*prRowH + prRowH/2 - 4"
              :width="prScoreBarWidth(team.score)" height="8" rx="4"
              fill="url(#pr-bar-grad)" opacity="0.85"/>

            <!-- Score number — starts at x=338, guaranteed 8px gap after bar max end (330) -->
            <text x="338" :y="129 + i*prRowH + prRowH/2 + 5" text-anchor="start"
              font-size="13" font-weight="800"
              :fill="i===0 ? prAccentColor : '#e5e7eb'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ (team.score||0).toFixed(1) }}</text>

            <!-- Record column -->
            <text x="432" :y="129 + i*prRowH + prRowH/2 + 5" text-anchor="middle"
              font-size="11" font-weight="600" fill="#6b7280"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ team.record || '—' }}</text>

            <!-- Change badge -->
            <g v-if="team.change !== 0">
              <rect x="476" :y="129 + i*prRowH + prRowH/2 - 10" width="44" height="20" rx="4"
                :fill="team.change > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)'"
                :stroke="team.change > 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'" stroke-width="1"/>
              <text x="498" :y="129 + i*prRowH + prRowH/2 + 5" text-anchor="middle"
                font-size="11" font-weight="800"
                :fill="team.change > 0 ? '#22c55e' : '#ef4444'"
                font-family="Helvetica Neue,Helvetica,Arial,sans-serif">
                {{ team.change > 0 ? '▲' + team.change : '▼' + Math.abs(team.change) }}
              </text>
            </g>
            <text v-if="team.change === 0" x="498" :y="129 + i*prRowH + prRowH/2 + 5"
              text-anchor="middle" font-size="12" fill="#374151"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">—</text>
          </g>

          <!-- Bottom rule before watermark -->
          <line x1="0" :y1="129 + prTeamCount*prRowH + 1" x2="540" :y2="129 + prTeamCount*prRowH + 1"
            stroke="#1e2130" stroke-width="1"/>

          <!-- Powered by tag -->
          <text x="270" y="528" text-anchor="middle" font-size="10" fill="#1e2130" letter-spacing="0.08em"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">ultimatefantasydashboard.com</text>

        </svg>
      </div>
    </div>

    <!-- 20b · POWER RANKINGS TREND CHART (same inputs as #20) -->
    <div class="post-wrap pr-post-wrap" style="margin-top:32px">
      <div class="post-label">20b · Ranking Trends — same inputs above · screenshot this card separately</div>
      <div class="sq sq-wp-bg">
        <div class="sq-grain"></div>
        <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg"
          style="position:absolute;inset:0;width:100%;height:100%;z-index:2">

          <defs>
            <linearGradient id="tr-top-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="transparent"/>
              <stop offset="50%" :stop-color="prAccentColor"/>
              <stop offset="100%" stop-color="transparent"/>
            </linearGradient>
          </defs>

          <!-- Top accent line -->
          <rect x="0" y="0" width="540" height="3" fill="url(#tr-top-grad)"/>

          <!-- ═══ HEADER BAR ═══ -->
          <rect x="0" y="3" width="540" height="50" fill="#0d1019"/>
          <line x1="0" y1="53" x2="540" y2="53" stroke="#1e2130" stroke-width="1"/>
          <rect x="16" y="14" width="46" height="26" rx="5" fill="#09090f" :stroke="prAccentColor" stroke-width="1.5"/>
          <text x="39" y="32" text-anchor="middle" font-size="12" font-weight="900"
            :fill="prAccentColor" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">UFD</text>
          <text x="72" y="32" font-size="18">{{ prSportEmoji }}</text>
          <text x="96" y="32" font-size="13" font-weight="600" fill="#e5e7eb"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ prSportLabel }}</text>
          <text x="524" y="32" text-anchor="end" font-size="13" font-weight="700" fill="#6b7280"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WK 1–{{ prWeek }}</text>

          <!-- ═══ TITLE BAR ═══ -->
          <rect x="0" y="53" width="540" height="48" fill="#0a0c14"/>
          <line x1="0" y1="101" x2="540" y2="101" stroke="#1e2130" stroke-width="1"/>
          <rect x="18" y="64" width="26" height="26" rx="4" :fill="prIconBg"/>
          <text x="31" y="82" text-anchor="middle" font-size="15">⚡</text>
          <text x="52" y="83" font-size="17" font-weight="900" letter-spacing="0.04em"
            fill="#ffffff" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">RANKING TRENDS</text>

          <!-- ═══ CHART AREA ═══ -->
          <!-- Rank grid lines + y-axis labels -->
          <g v-for="(_,ri) in prTrendTeams" :key="'rl'+ri">
            <line x1="38" :x2="440" :y1="prTrendY(ri+1)" :y2="prTrendY(ri+1)"
              stroke="rgba(255,255,255,0.055)" stroke-width="1" stroke-dasharray="4,5"/>
            <text x="32" :y="prTrendY(ri+1)+4" text-anchor="end"
              font-size="11" fill="rgba(255,255,255,0.3)"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ ri+1 }}</text>
          </g>

          <!-- X-axis week labels -->
          <g v-for="(_,wi) in prTrendWeekLabels" :key="'wl'+wi">
            <text :x="prTrendX(prTrendWeekLabels[wi]-1)" y="497"
              text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.25)"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ prTrendWeekLabels[wi] }}</text>
          </g>
          <text x="240" y="512" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.2)"
            letter-spacing="0.1em" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WEEK</text>

          <!-- Current week vertical marker -->
          <line :x1="prTrendX(prTrendNWeeks-1)" :x2="prTrendX(prTrendNWeeks-1)"
            y1="108" y2="482"
            stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="3,4"/>

          <!-- Team trend lines -->
          <g v-for="(paths, ti) in prTrendPaths" :key="'tl'+ti">
            <!-- Glow duplicate (thicker, lower opacity) -->
            <path :d="paths.d" fill="none" :stroke="paths.color"
              stroke-width="4" opacity="0.15" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- Main line -->
            <path :d="paths.d" fill="none" :stroke="paths.color"
              stroke-width="2" opacity="0.9" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- End dot -->
            <circle :cx="paths.endX" :cy="paths.endY" r="5" :fill="paths.color"/>
            <circle :cx="paths.endX" :cy="paths.endY" r="3" fill="#0d1019"/>
            <circle :cx="paths.endX" :cy="paths.endY" r="1.5" :fill="paths.color"/>
            <!-- Team name label -->
            <text :x="paths.endX + 10" :y="paths.endY + 4"
              font-size="11" font-weight="600" :fill="paths.color"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ paths.name }}</text>
          </g>

          <!-- ═══ LEGEND ═══ -->
          <rect x="0" y="517" width="540" height="23" fill="rgba(0,0,0,0.3)"/>
          <line x1="0" y1="517" x2="540" y2="517" stroke="#1e2130" stroke-width="1"/>
          <g v-for="(paths, ti) in prTrendPaths.slice(0,4)" :key="'lg'+ti">
            <circle :cx="22 + ti*130" cy="529" r="4" :fill="paths.color"/>
            <text :x="30 + ti*130" y="533" font-size="10" font-weight="600" fill="#9ca3af"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ paths.name }}</text>
          </g>

          <!-- Watermark -->
          <text x="270" y="538" text-anchor="middle" font-size="9" fill="#1a1f2e"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">ultimatefantasydashboard.com</text>

        </svg>
      </div>
    </div>


    <!-- ══════════════════════════════════════
         WIN PROBABILITY IMPACT GRAPHICS
    ══════════════════════════════════════ -->

    <!-- Controls shared by all 4 cards -->
    <div class="post-wrap wp-post-wrap" style="grid-column:1/-1">
      <div class="post-label">⚡ Daily Win Probability Impact — Baseball · Load yesterday's top performers</div>

      <div class="wpi-controls">
        <!-- League selector -->
        <div class="wpi-ctrl-group">
          <label class="wpi-label">Platform</label>
          <div class="wpi-pills">
            <button v-for="p in ['sleeper','espn']" :key="p"
              @click="wpiPlatform=p"
              :class="['wp-pill-off', wpiPlatform===p?'wp-pill-on':'']">{{ p }}</button>
          </div>
        </div>
        <div class="wpi-ctrl-group">
          <label class="wpi-label">League ID</label>
          <input v-model="wpiLeagueId" class="wp-input" placeholder="paste league ID" style="width:180px" />
        </div>
        <div class="wpi-ctrl-group">
          <label class="wpi-label">Week</label>
          <input v-model.number="wpiWeekNum" type="number" min="1" max="26" class="wp-input" style="width:64px" />
        </div>
        <div class="wpi-ctrl-group">
          <label class="wpi-label">League Type</label>
          <div class="wpi-pills">
            <button @click="wpiLeagueType='points'" :class="['wp-pill-off', wpiLeagueType==='points'?'wp-pill-on':'']">Points</button>
            <button @click="wpiLeagueType='category'" :class="['wp-pill-off', wpiLeagueType==='category'?'wp-pill-on':'']">Category</button>
          </div>
        </div>
        <div class="wpi-ctrl-group">
          <label class="wpi-label">Season</label>
          <input v-model.number="wpiSeason" type="number" class="wp-input" style="width:80px" />
        </div>
        <button @click="loadWpiData" :disabled="wpiLoading" class="wpi-load-btn">
          <span v-if="wpiLoading">⏳ Loading…</span>
          <span v-else>⚡ Load Data</span>
        </button>
      </div>

      <!-- Error / status -->
      <div v-if="wpiError" class="wpi-error">⚠️ {{ wpiError }}</div>
      <div v-if="wpiStatus" class="wpi-status">{{ wpiStatus }}</div>
    </div>

    <!-- ── GRAPHIC 1: Top Batters — Points League ── -->
    <div class="post-wrap wp-post-wrap">
      <div class="post-label">27 · Top Batters · Points League</div>
      <div class="sq sq-wp-bg">
        <div class="sq-grain"></div>
        <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg"
          style="position:absolute;inset:0;width:100%;height:100%;z-index:2">
          <defs>
            <linearGradient id="wpi-gold-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#eab308" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.7"/>
            </linearGradient>
            <clipPath id="wpi-hs-clip-0"><circle cx="54" cy="0" r="26"/></clipPath>
            <clipPath id="wpi-hs-clip-1"><circle cx="54" cy="0" r="26"/></clipPath>
            <clipPath id="wpi-hs-clip-2"><circle cx="54" cy="0" r="26"/></clipPath>
            <clipPath id="wpi-hs-clip-3"><circle cx="54" cy="0" r="26"/></clipPath>
            <clipPath id="wpi-hs-clip-4"><circle cx="54" cy="0" r="26"/></clipPath>
          </defs>

          <!-- Top accent -->
          <rect x="0" y="0" width="540" height="3" fill="url(#wpi-gold-grad)"/>

          <!-- Header -->
          <rect x="0" y="3" width="540" height="54" fill="#0d1019"/>
          <line x1="0" y1="57" x2="540" y2="57" stroke="#1e2130" stroke-width="1"/>
          <rect x="16" y="14" width="46" height="26" rx="5" fill="#09090f" stroke="#eab308" stroke-width="1.5"/>
          <text x="39" y="32" text-anchor="middle" font-size="12" font-weight="900"
            fill="#eab308" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">UFD</text>
          <text x="72" y="26" font-size="11" fill="#9ca3af"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">⚾ Baseball · Points</text>
          <text x="72" y="43" font-size="10" fill="#4b5563"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpiDateLabel }}</text>
          <text x="524" y="30" text-anchor="end" font-size="13" font-weight="700" fill="#6b7280"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WK {{ wpiWeekNum }}</text>

          <!-- Title -->
          <rect x="0" y="57" width="540" height="44" fill="#0a0c14"/>
          <line x1="0" y1="101" x2="540" y2="101" stroke="#1e2130" stroke-width="1"/>
          <rect x="18" y="67" width="24" height="24" rx="4" fill="rgba(234,179,8,0.12)"/>
          <text x="30" y="84" text-anchor="middle" font-size="14">🔥</text>
          <text x="50" y="86" font-size="16" font-weight="900" letter-spacing="0.04em"
            fill="#ffffff" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">TOP BATTERS</text>
          <text x="524" y="86" text-anchor="end" font-size="11" font-weight="700" fill="#4b5563"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WP IMPACT</text>

          <!-- Player rows -->
          <g v-for="(p, i) in wpiTopBattersPoints" :key="'bp'+i">
            <!-- Row bg -->
            <rect x="0" :y="101+i*86" width="540" :height="85"
              :fill="i===0?'rgba(234,179,8,0.05)':'rgba(255,255,255,0.01)'"/>
            <line x1="0" :y1="101+(i+1)*86" x2="540" :y2="101+(i+1)*86"
              stroke="#1e2130" stroke-width="1"/>

            <!-- Rank -->
            <rect x="12" :y="101+i*86+10" width="22" height="22" rx="4"
              :fill="i===0?'rgba(234,179,8,0.2)':'rgba(255,255,255,0.04)'"
              :stroke="i===0?'rgba(234,179,8,0.4)':'rgba(255,255,255,0.06)'" stroke-width="1"/>
            <text x="23" :y="101+i*86+26" text-anchor="middle" font-size="12" font-weight="800"
              :fill="i===0?'#eab308':'#6b7280'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ i+1 }}</text>

            <!-- Headshot circle -->
            <circle :cx="62" :cy="101+i*86+42" r="28"
              :fill="i===0?'rgba(234,179,8,0.1)':'rgba(255,255,255,0.04)'"
              :stroke="i===0?'rgba(234,179,8,0.4)':'rgba(255,255,255,0.08)'" stroke-width="1.5"/>
            <image
              :href="p.headshot"
              x="34" :y="101+i*86+14"
              width="56" height="56"
              preserveAspectRatio="xMidYMid slice"
              style="clip-path:circle(28px at 28px 28px)"
            />
            <!-- Fallback position badge if no headshot -->
            <text v-if="!p.headshot" x="62" :y="101+i*86+47" text-anchor="middle"
              font-size="16" font-weight="900" :fill="i===0?'#eab308':'#6b7280'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.position?.slice(0,2) }}</text>

            <!-- Name + team -->
            <text x="104" :y="101+i*86+35" font-size="15" font-weight="800"
              :fill="i===0?'#ffffff':'#e5e7eb'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.name }}</text>
            <text x="104" :y="101+i*86+53" font-size="11" fill="#6b7280"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.team }} · {{ p.position }}</text>

            <!-- Stat line -->
            <text x="104" :y="101+i*86+72" font-size="10" fill="#4b5563"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.statLine }}</text>

            <!-- Points -->
            <text x="390" :y="101+i*86+35" text-anchor="end" font-size="22" font-weight="900"
              :fill="i===0?'#eab308':'#d1d5db'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.pts?.toFixed(1) }}</text>
            <text x="393" :y="101+i*86+35" font-size="10" fill="#4b5563"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">pts</text>

            <!-- WP impact bar -->
            <rect x="104" :y="101+i*86+78" width="280" height="4" rx="2" fill="rgba(255,255,255,0.06)"/>
            <rect x="104" :y="101+i*86+78" :width="Math.min(280, (p.wpImpact/wpiMaxImpactBattersPoints)*280)" height="4" rx="2"
              :fill="i===0?'#eab308':'#374151'"/>

            <!-- WP impact label -->
            <text x="524" :y="101+i*86+42" text-anchor="end" font-size="13" font-weight="800"
              :fill="i===0?'#eab308':'#22c55e'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">+{{ p.wpImpact?.toFixed(1) }}%</text>
            <text x="524" :y="101+i*86+57" text-anchor="end" font-size="9" fill="#374151"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">win prob</text>
          </g>

          <!-- Empty state -->
          <text v-if="!wpiTopBattersPoints.length" x="270" y="300" text-anchor="middle"
            font-size="14" fill="#374151" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">
            Load data to see top batters
          </text>

          <!-- Watermark -->
          <line x1="0" y1="531" x2="540" y2="531" stroke="#1e2130" stroke-width="1"/>
          <text x="270" y="538" text-anchor="middle" font-size="9" fill="#1a1f2e"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">ultimatefantasydashboard.com</text>
        </svg>
      </div>
    </div>

    <!-- ── GRAPHIC 2: Top Pitchers — Points League ── -->
    <div class="post-wrap wp-post-wrap">
      <div class="post-label">28 · Top Pitchers · Points League</div>
      <div class="sq sq-wp-bg">
        <div class="sq-grain"></div>
        <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg"
          style="position:absolute;inset:0;width:100%;height:100%;z-index:2">
          <defs>
            <linearGradient id="wpi-cyan-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#0891b2" stop-opacity="0.7"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="540" height="3" fill="url(#wpi-cyan-grad)"/>
          <rect x="0" y="3" width="540" height="54" fill="#0d1019"/>
          <line x1="0" y1="57" x2="540" y2="57" stroke="#1e2130" stroke-width="1"/>
          <rect x="16" y="14" width="46" height="26" rx="5" fill="#09090f" stroke="#06b6d4" stroke-width="1.5"/>
          <text x="39" y="32" text-anchor="middle" font-size="12" font-weight="900"
            fill="#06b6d4" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">UFD</text>
          <text x="72" y="26" font-size="11" fill="#9ca3af"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">⚾ Baseball · Points</text>
          <text x="72" y="43" font-size="10" fill="#4b5563"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpiDateLabel }}</text>
          <text x="524" y="30" text-anchor="end" font-size="13" font-weight="700" fill="#6b7280"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WK {{ wpiWeekNum }}</text>
          <rect x="0" y="57" width="540" height="44" fill="#0a0c14"/>
          <line x1="0" y1="101" x2="540" y2="101" stroke="#1e2130" stroke-width="1"/>
          <rect x="18" y="67" width="24" height="24" rx="4" fill="rgba(6,182,212,0.12)"/>
          <text x="30" y="84" text-anchor="middle" font-size="14">⚡</text>
          <text x="50" y="86" font-size="16" font-weight="900" letter-spacing="0.04em"
            fill="#ffffff" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">TOP PITCHERS</text>
          <text x="524" y="86" text-anchor="end" font-size="11" font-weight="700" fill="#4b5563"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WP IMPACT</text>

          <g v-for="(p, i) in wpiTopPitchersPoints" :key="'pp'+i">
            <rect x="0" :y="101+i*86" width="540" :height="85"
              :fill="i===0?'rgba(6,182,212,0.05)':'rgba(255,255,255,0.01)'"/>
            <line x1="0" :y1="101+(i+1)*86" x2="540" :y2="101+(i+1)*86" stroke="#1e2130" stroke-width="1"/>
            <rect x="12" :y="101+i*86+10" width="22" height="22" rx="4"
              :fill="i===0?'rgba(6,182,212,0.2)':'rgba(255,255,255,0.04)'"
              :stroke="i===0?'rgba(6,182,212,0.4)':'rgba(255,255,255,0.06)'" stroke-width="1"/>
            <text x="23" :y="101+i*86+26" text-anchor="middle" font-size="12" font-weight="800"
              :fill="i===0?'#06b6d4':'#6b7280'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ i+1 }}</text>
            <circle :cx="62" :cy="101+i*86+42" r="28"
              :fill="i===0?'rgba(6,182,212,0.1)':'rgba(255,255,255,0.04)'"
              :stroke="i===0?'rgba(6,182,212,0.4)':'rgba(255,255,255,0.08)'" stroke-width="1.5"/>
            <image :href="p.headshot" x="34" :y="101+i*86+14" width="56" height="56"
              preserveAspectRatio="xMidYMid slice" style="clip-path:circle(28px at 28px 28px)"/>
            <text x="104" :y="101+i*86+35" font-size="15" font-weight="800"
              :fill="i===0?'#ffffff':'#e5e7eb'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.name }}</text>
            <text x="104" :y="101+i*86+53" font-size="11" fill="#6b7280"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.team }} · {{ p.position }}</text>
            <text x="104" :y="101+i*86+72" font-size="10" fill="#4b5563"
              font-family="Helvetic Neue,Helvetica,Arial,sans-serif">{{ p.statLine }}</text>
            <text x="390" :y="101+i*86+35" text-anchor="end" font-size="22" font-weight="900"
              :fill="i===0?'#06b6d4':'#d1d5db'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.pts?.toFixed(1) }}</text>
            <text x="393" :y="101+i*86+35" font-size="10" fill="#4b5563"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">pts</text>
            <rect x="104" :y="101+i*86+78" width="280" height="4" rx="2" fill="rgba(255,255,255,0.06)"/>
            <rect x="104" :y="101+i*86+78" :width="Math.min(280,(p.wpImpact/wpiMaxImpactPitchersPoints)*280)" height="4" rx="2"
              :fill="i===0?'#06b6d4':'#374151'"/>
            <text x="524" :y="101+i*86+42" text-anchor="end" font-size="13" font-weight="800"
              :fill="i===0?'#06b6d4':'#22c55e'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">+{{ p.wpImpact?.toFixed(1) }}%</text>
            <text x="524" :y="101+i*86+57" text-anchor="end" font-size="9" fill="#374151"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">win prob</text>
          </g>
          <text v-if="!wpiTopPitchersPoints.length" x="270" y="300" text-anchor="middle"
            font-size="14" fill="#374151" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">
            Load data to see top pitchers
          </text>
          <line x1="0" y1="531" x2="540" y2="531" stroke="#1e2130" stroke-width="1"/>
          <text x="270" y="538" text-anchor="middle" font-size="9" fill="#1a1f2e"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">ultimatefantasydashboard.com</text>
        </svg>
      </div>
    </div>

    <!-- ── GRAPHIC 3: Top Batters — Category League ── -->
    <div class="post-wrap wp-post-wrap">
      <div class="post-label">29 · Top Batters · Category League</div>
      <div class="sq sq-wp-bg">
        <div class="sq-grain"></div>
        <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg"
          style="position:absolute;inset:0;width:100%;height:100%;z-index:2">
          <defs>
            <linearGradient id="wpi-green-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#22c55e" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#16a34a" stop-opacity="0.7"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="540" height="3" fill="url(#wpi-green-grad)"/>
          <rect x="0" y="3" width="540" height="54" fill="#0d1019"/>
          <line x1="0" y1="57" x2="540" y2="57" stroke="#1e2130" stroke-width="1"/>
          <rect x="16" y="14" width="46" height="26" rx="5" fill="#09090f" stroke="#22c55e" stroke-width="1.5"/>
          <text x="39" y="32" text-anchor="middle" font-size="12" font-weight="900"
            fill="#22c55e" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">UFD</text>
          <text x="72" y="26" font-size="11" fill="#9ca3af"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">⚾ Baseball · Category</text>
          <text x="72" y="43" font-size="10" fill="#4b5563"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpiDateLabel }}</text>
          <text x="524" y="30" text-anchor="end" font-size="13" font-weight="700" fill="#6b7280"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WK {{ wpiWeekNum }}</text>
          <rect x="0" y="57" width="540" height="44" fill="#0a0c14"/>
          <line x1="0" y1="101" x2="540" y2="101" stroke="#1e2130" stroke-width="1"/>
          <rect x="18" y="67" width="24" height="24" rx="4" fill="rgba(34,197,94,0.12)"/>
          <text x="30" y="84" text-anchor="middle" font-size="14">🔥</text>
          <text x="50" y="86" font-size="16" font-weight="900" letter-spacing="0.04em"
            fill="#ffffff" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">TOP BATTERS</text>
          <text x="524" y="86" text-anchor="end" font-size="11" font-weight="700" fill="#4b5563"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">CAT. IMPACT</text>

          <g v-for="(p, i) in wpiTopBattersCat" :key="'bc'+i">
            <rect x="0" :y="101+i*86" width="540" :height="85"
              :fill="i===0?'rgba(34,197,94,0.05)':'rgba(255,255,255,0.01)'"/>
            <line x1="0" :y1="101+(i+1)*86" x2="540" :y2="101+(i+1)*86" stroke="#1e2130" stroke-width="1"/>
            <rect x="12" :y="101+i*86+10" width="22" height="22" rx="4"
              :fill="i===0?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.04)'"
              :stroke="i===0?'rgba(34,197,94,0.4)':'rgba(255,255,255,0.06)'" stroke-width="1"/>
            <text x="23" :y="101+i*86+26" text-anchor="middle" font-size="12" font-weight="800"
              :fill="i===0?'#22c55e':'#6b7280'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ i+1 }}</text>
            <circle :cx="62" :cy="101+i*86+42" r="28"
              :fill="i===0?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.04)'"
              :stroke="i===0?'rgba(34,197,94,0.4)':'rgba(255,255,255,0.08)'" stroke-width="1.5"/>
            <image :href="p.headshot" x="34" :y="101+i*86+14" width="56" height="56"
              preserveAspectRatio="xMidYMid slice" style="clip-path:circle(28px at 28px 28px)"/>
            <text x="104" :y="101+i*86+35" font-size="15" font-weight="800"
              :fill="i===0?'#ffffff':'#e5e7eb'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.name }}</text>
            <text x="104" :y="101+i*86+53" font-size="11" fill="#6b7280"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.team }} · {{ p.position }}</text>
            <!-- Category stat pills -->
            <g v-for="(stat, si) in p.catStats.slice(0,4)" :key="'cs'+si">
              <rect :x="104+si*100" :y="101+i*86+63" width="94" height="18" rx="3"
                fill="rgba(34,197,94,0.08)" stroke="rgba(34,197,94,0.2)" stroke-width="1"/>
              <text :x="104+si*100+47" :y="101+i*86+76" text-anchor="middle"
                font-size="9" font-weight="700" fill="#4ade80"
                font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ stat.label }}: {{ stat.val }}</text>
            </g>
            <!-- Cat score -->
            <text x="524" :y="101+i*86+38" text-anchor="end" font-size="13" font-weight="800"
              :fill="i===0?'#22c55e':'#4ade80'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.catScore }} cats</text>
            <rect x="104" :y="101+i*86+82" :width="Math.min(320,(p.catScore/5)*320)" height="3" rx="2"
              :fill="i===0?'#22c55e':'#374151'"/>
          </g>
          <text v-if="!wpiTopBattersCat.length" x="270" y="300" text-anchor="middle"
            font-size="14" fill="#374151" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">
            Load data to see top batters
          </text>
          <line x1="0" y1="531" x2="540" y2="531" stroke="#1e2130" stroke-width="1"/>
          <text x="270" y="538" text-anchor="middle" font-size="9" fill="#1a1f2e"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">ultimatefantasydashboard.com</text>
        </svg>
      </div>
    </div>

    <!-- ── GRAPHIC 4: Top Pitchers — Category League ── -->
    <div class="post-wrap wp-post-wrap">
      <div class="post-label">30 · Top Pitchers · Category League</div>
      <div class="sq sq-wp-bg">
        <div class="sq-grain"></div>
        <svg viewBox="0 0 540 540" xmlns="http://www.w3.org/2000/svg"
          style="position:absolute;inset:0;width:100%;height:100%;z-index:2">
          <defs>
            <linearGradient id="wpi-purple-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#7c3aed" stop-opacity="0.7"/>
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="540" height="3" fill="url(#wpi-purple-grad)"/>
          <rect x="0" y="3" width="540" height="54" fill="#0d1019"/>
          <line x1="0" y1="57" x2="540" y2="57" stroke="#1e2130" stroke-width="1"/>
          <rect x="16" y="14" width="46" height="26" rx="5" fill="#09090f" stroke="#8b5cf6" stroke-width="1.5"/>
          <text x="39" y="32" text-anchor="middle" font-size="12" font-weight="900"
            fill="#8b5cf6" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">UFD</text>
          <text x="72" y="26" font-size="11" fill="#9ca3af"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">⚾ Baseball · Category</text>
          <text x="72" y="43" font-size="10" fill="#4b5563"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ wpiDateLabel }}</text>
          <text x="524" y="30" text-anchor="end" font-size="13" font-weight="700" fill="#6b7280"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">WK {{ wpiWeekNum }}</text>
          <rect x="0" y="57" width="540" height="44" fill="#0a0c14"/>
          <line x1="0" y1="101" x2="540" y2="101" stroke="#1e2130" stroke-width="1"/>
          <rect x="18" y="67" width="24" height="24" rx="4" fill="rgba(139,92,246,0.12)"/>
          <text x="30" y="84" text-anchor="middle" font-size="14">⚡</text>
          <text x="50" y="86" font-size="16" font-weight="900" letter-spacing="0.04em"
            fill="#ffffff" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">TOP PITCHERS</text>
          <text x="524" y="86" text-anchor="end" font-size="11" font-weight="700" fill="#4b5563"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">CAT. IMPACT</text>

          <g v-for="(p, i) in wpiTopPitchersCat" :key="'pc'+i">
            <rect x="0" :y="101+i*86" width="540" :height="85"
              :fill="i===0?'rgba(139,92,246,0.05)':'rgba(255,255,255,0.01)'"/>
            <line x1="0" :y1="101+(i+1)*86" x2="540" :y2="101+(i+1)*86" stroke="#1e2130" stroke-width="1"/>
            <rect x="12" :y="101+i*86+10" width="22" height="22" rx="4"
              :fill="i===0?'rgba(139,92,246,0.2)':'rgba(255,255,255,0.04)'"
              :stroke="i===0?'rgba(139,92,246,0.4)':'rgba(255,255,255,0.06)'" stroke-width="1"/>
            <text x="23" :y="101+i*86+26" text-anchor="middle" font-size="12" font-weight="800"
              :fill="i===0?'#8b5cf6':'#6b7280'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ i+1 }}</text>
            <circle :cx="62" :cy="101+i*86+42" r="28"
              :fill="i===0?'rgba(139,92,246,0.1)':'rgba(255,255,255,0.04)'"
              :stroke="i===0?'rgba(139,92,246,0.4)':'rgba(255,255,255,0.08)'" stroke-width="1.5"/>
            <image :href="p.headshot" x="34" :y="101+i*86+14" width="56" height="56"
              preserveAspectRatio="xMidYMid slice" style="clip-path:circle(28px at 28px 28px)"/>
            <text x="104" :y="101+i*86+35" font-size="15" font-weight="800"
              :fill="i===0?'#ffffff':'#e5e7eb'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.name }}</text>
            <text x="104" :y="101+i*86+53" font-size="11" fill="#6b7280"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.team }} · {{ p.position }}</text>
            <g v-for="(stat, si) in p.catStats.slice(0,4)" :key="'ps'+si">
              <rect :x="104+si*100" :y="101+i*86+63" width="94" height="18" rx="3"
                fill="rgba(139,92,246,0.08)" stroke="rgba(139,92,246,0.2)" stroke-width="1"/>
              <text :x="104+si*100+47" :y="101+i*86+76" text-anchor="middle"
                font-size="9" font-weight="700" fill="#a78bfa"
                font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ stat.label }}: {{ stat.val }}</text>
            </g>
            <text x="524" :y="101+i*86+38" text-anchor="end" font-size="13" font-weight="800"
              :fill="i===0?'#8b5cf6':'#a78bfa'"
              font-family="Helvetica Neue,Helvetica,Arial,sans-serif">{{ p.catScore }} cats</text>
            <rect x="104" :y="101+i*86+82" :width="Math.min(320,(p.catScore/5)*320)" height="3" rx="2"
              :fill="i===0?'#8b5cf6':'#374151'"/>
          </g>
          <text v-if="!wpiTopPitchersCat.length" x="270" y="300" text-anchor="middle"
            font-size="14" fill="#374151" font-family="Helvetica Neue,Helvetica,Arial,sans-serif">
            Load data to see top pitchers
          </text>
          <line x1="0" y1="531" x2="540" y2="531" stroke="#1e2130" stroke-width="1"/>
          <text x="270" y="538" text-anchor="middle" font-size="9" fill="#1a1f2e"
            font-family="Helvetica Neue,Helvetica,Arial,sans-serif">ultimatefantasydashboard.com</text>
        </svg>
      </div>
    </div>

  </template><!-- end interactive tab -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineComponent, h } from 'vue'
import { useRoute } from 'vue-router'
import { sleeperService } from '@/services/sleeper'
import { espnService } from '@/services/espn'

// ── Embed detection (hide shell when loaded in admin iframe) ──────────────
const route = useRoute()
const isEmbed = computed(() => route.query.embed === 'true')

// ── Social template type tabs ──────────────────────────────────────────────
const activeType = ref('square')

// ══════════════════════════════════════════════════════════════════════════
// WP IMPACT GRAPHICS — Daily top performers
// ══════════════════════════════════════════════════════════════════════════

// ── Controls ──
const wpiPlatform = ref('sleeper')
const wpiLeagueId = ref('')
const wpiWeekNum = ref(1)
const wpiSeason = ref(new Date().getFullYear())
const wpiLeagueType = ref('points')
const wpiLoading = ref(false)
const wpiError = ref('')
const wpiStatus = ref('')

const wpiDateLabel = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
})

// ── Output data ──
interface WpiPlayer {
  id: string
  name: string
  team: string
  position: string
  headshot: string
  pts: number
  wpImpact: number
  statLine: string
  catStats: { label: string; val: string | number }[]
  catScore: number
  rawStats: Record<string, number>
}

const wpiTopBattersPoints = ref<WpiPlayer[]>([])
const wpiTopPitchersPoints = ref<WpiPlayer[]>([])
const wpiTopBattersCat = ref<WpiPlayer[]>([])
const wpiTopPitchersCat = ref<WpiPlayer[]>([])

const wpiMaxImpactBattersPoints = computed(() =>
  Math.max(...wpiTopBattersPoints.value.map(p => p.wpImpact), 1))
const wpiMaxImpactPitchersPoints = computed(() =>
  Math.max(...wpiTopPitchersPoints.value.map(p => p.wpImpact), 1))

// ── Stat ID maps for ESPN baseball ──
const ESPN_BATTER_STATS: Record<number, string> = {
  0: 'AB', 1: 'H', 2: 'R', 3: 'HR', 4: 'RBI', 5: 'SB', 6: 'BB', 7: 'K',
  8: 'AVG', 9: 'OBP', 10: 'SLG', 40: 'TB', 41: '2B', 42: '3B', 43: '1B'
}
const ESPN_PITCHER_STATS: Record<number, string> = {
  17: 'IP', 18: 'ERA', 19: 'WHIP', 20: 'K', 21: 'BB', 22: 'H', 23: 'HLD',
  24: 'BS', 32: 'W', 33: 'L', 34: 'SV', 35: 'QS'
}
const BATTER_POSITIONS = new Set(['C','1B','2B','3B','SS','OF','LF','CF','RF','DH','UTIL'])
const PITCHER_POSITIONS = new Set(['SP','RP','P'])

function isPitcher(pos: string) {
  return PITCHER_POSITIONS.has(pos?.toUpperCase())
}

// Key batter categories for display (most impactful)
function getBatterCatStats(stats: Record<string, number>): { label: string; val: string | number }[] {
  const out = []
  if (stats['HR'] > 0) out.push({ label: 'HR', val: stats['HR'] })
  if (stats['RBI'] > 0) out.push({ label: 'RBI', val: stats['RBI'] })
  if (stats['R'] > 0 || stats['2'] > 0) out.push({ label: 'R', val: stats['R'] || stats['2'] })
  if (stats['SB'] > 0) out.push({ label: 'SB', val: stats['SB'] })
  if (stats['H'] > 0 || stats['1'] > 0) {
    const h = stats['H'] || stats['1']
    const ab = stats['AB'] || stats['0']
    if (ab > 0) out.push({ label: 'AVG', val: (h/ab).toFixed(3) })
  }
  return out.slice(0, 4)
}

function getPitcherCatStats(stats: Record<string, number>): { label: string; val: string | number }[] {
  const out = []
  if (stats['K'] > 0 || stats['20'] > 0) out.push({ label: 'K', val: stats['K'] || stats['20'] })
  if (stats['SV'] > 0 || stats['34'] > 0) out.push({ label: 'SV', val: stats['SV'] || stats['34'] })
  if (stats['W'] > 0 || stats['32'] > 0) out.push({ label: 'W', val: stats['W'] || stats['32'] })
  if (stats['IP'] > 0 || stats['17'] > 0) out.push({ label: 'IP', val: stats['IP'] || stats['17'] })
  if (stats['ERA'] !== undefined || stats['18'] !== undefined) {
    const era = stats['ERA'] ?? stats['18']
    out.push({ label: 'ERA', val: era?.toFixed(2) })
  }
  return out.slice(0, 4)
}

// Score a batter's category impact: count non-zero meaningful categories
function batterCatScore(stats: Record<string, number>): number {
  let score = 0
  if ((stats['HR'] || 0) > 0) score += 3
  if ((stats['RBI'] || 0) >= 2) score += 2
  else if ((stats['RBI'] || 0) === 1) score += 1
  if ((stats['SB'] || 0) > 0) score += 2
  if ((stats['R'] || 0) >= 2) score += 2
  else if ((stats['R'] || 0) === 1) score += 1
  const h = stats['H'] || 0; const ab = stats['AB'] || 4
  if (ab >= 3 && h/ab >= 0.5) score += 2
  return Math.min(score, 10)
}

function pitcherCatScore(stats: Record<string, number>): number {
  let score = 0
  const k = stats['K'] || stats['20'] || 0
  if (k >= 8) score += 4
  else if (k >= 5) score += 3
  else if (k >= 3) score += 2
  if ((stats['SV'] || stats['34'] || 0) > 0) score += 3
  if ((stats['W'] || stats['32'] || 0) > 0) score += 3
  const ip = stats['IP'] || stats['17'] || 0
  if (ip >= 6) score += 2
  const era = stats['ERA'] ?? stats['18']
  if (era !== undefined && ip > 0 && era <= 2.0) score += 2
  return Math.min(score, 10)
}

// WP impact formula: points above average / typical points needed to swing WP
// A player scoring 20+ pts above avg roughly = +15% WP swing
function calcWpImpact(pts: number, avgPts: number): number {
  const delta = Math.max(0, pts - avgPts)
  // Scaling: ~25 pts above avg ≈ 20% WP impact
  return Math.min(delta * 0.8, 30)
}

// ── Main data loader ──
async function loadWpiData() {
  if (!wpiLeagueId.value) { wpiError.value = 'Enter a league ID first'; return }
  wpiLoading.value = true
  wpiError.value = ''
  wpiStatus.value = 'Fetching matchup data…'
  wpiTopBattersPoints.value = []
  wpiTopPitchersPoints.value = []
  wpiTopBattersCat.value = []
  wpiTopPitchersCat.value = []

  try {
    if (wpiPlatform.value === 'sleeper') {
      await loadSleeperWpi()
    } else {
      await loadEspnWpi()
    }
    wpiStatus.value = '✓ Data loaded — scroll down to see all 4 graphics'
  } catch (e: any) {
    wpiError.value = e?.message || 'Failed to load data'
    wpiStatus.value = ''
  } finally {
    wpiLoading.value = false
  }
}

async function loadSleeperWpi() {
  wpiStatus.value = 'Loading Sleeper matchups…'
  const matchups = await sleeperService.getMatchups(wpiLeagueId.value, wpiWeekNum.value)

  wpiStatus.value = 'Loading player data…'
  const playerMap = await sleeperService.getPlayersBySport('baseball')

  // Aggregate every player's points across all rosters
  const allPlayers: WpiPlayer[] = []
  const seen = new Set<string>()

  for (const matchup of matchups) {
    const pts = matchup.players_points || {}
    for (const [pid, ptsVal] of Object.entries(pts)) {
      if (seen.has(pid) || ptsVal <= 0) continue
      seen.add(pid)
      const p = playerMap[pid]
      if (!p) continue

      const pos = p.fantasy_positions?.[0] || p.position || 'UTIL'
      const team = p.team || 'FA'
      const name = `${p.first_name || ''} ${p.last_name || ''}`.trim()
      const headshot = `https://sleepercdn.com/content/mlb/players/thumb/${pid}.jpg`

      // Get season avg from player stats (approximate)
      const avgPts = 8 // baseline MLB avg across all starters in points leagues
      const wpImpact = calcWpImpact(ptsVal as number, avgPts)

      const rawStats = p.stats || {}
      const player: WpiPlayer = {
        id: pid, name, team, position: pos, headshot,
        pts: ptsVal as number, wpImpact,
        statLine: '',
        catStats: isPitcher(pos) ? getPitcherCatStats(rawStats) : getBatterCatStats(rawStats),
        catScore: isPitcher(pos) ? pitcherCatScore(rawStats) : batterCatScore(rawStats),
        rawStats
      }

      // Build stat line for points display
      if (isPitcher(pos)) {
        player.statLine = `${rawStats['IP']?.toFixed(1) || '?'} IP · ${rawStats['K'] || 0} K · ${rawStats['ERA']?.toFixed(2) || '?'} ERA`
      } else {
        const h = rawStats['H'] || 0
        const ab = rawStats['AB'] || 0
        player.statLine = `${h}/${ab} · ${rawStats['HR'] || 0} HR · ${rawStats['RBI'] || 0} RBI · ${rawStats['R'] || 0} R`
      }

      allPlayers.push(player)
    }
  }

  buildTopLists(allPlayers)
}

async function loadEspnWpi() {
  wpiStatus.value = 'Loading ESPN matchup data…'
  const matchups = await espnService.getMatchups('baseball', wpiLeagueId.value, wpiSeason.value, wpiWeekNum.value)

  const allPlayers: WpiPlayer[] = []
  const seen = new Set<number>()

  for (const matchup of matchups) {
    const rosters = [
      ...(matchup.homeRoster || []),
      ...(matchup.awayRoster || [])
    ]
    for (const player of rosters) {
      if (seen.has(player.playerId) || (player.actualPoints || 0) <= 0) continue
      seen.add(player.playerId)

      const pos = player.position || 'UTIL'
      const rawStats = player.stats || {}
      const avgPts = isPitcher(pos) ? 12 : 8
      const wpImpact = calcWpImpact(player.actualPoints || 0, avgPts)
      const headshot = `https://a.espncdn.com/i/headshots/mlb/players/full/${player.playerId}.png`

      const p: WpiPlayer = {
        id: String(player.playerId),
        name: player.fullName || 'Unknown',
        team: player.proTeam || 'FA',
        position: pos, headshot,
        pts: player.actualPoints || 0,
        wpImpact,
        statLine: '',
        catStats: isPitcher(pos) ? getPitcherCatStats(rawStats) : getBatterCatStats(rawStats),
        catScore: isPitcher(pos) ? pitcherCatScore(rawStats) : batterCatScore(rawStats),
        rawStats
      }

      if (isPitcher(pos)) {
        const ip = rawStats['17'] || 0
        const k = rawStats['20'] || 0
        const era = rawStats['18']
        p.statLine = `${ip.toFixed(1)} IP · ${k} K${era !== undefined ? ` · ${era.toFixed(2)} ERA` : ''}`
      } else {
        const h = rawStats['1'] || 0; const ab = rawStats['0'] || 0
        const hr = rawStats['3'] || 0; const rbi = rawStats['4'] || 0; const r = rawStats['2'] || 0
        p.statLine = `${h}/${ab} · ${hr} HR · ${rbi} RBI · ${r} R`
      }

      allPlayers.push(p)
    }
  }

  buildTopLists(allPlayers)
}

function buildTopLists(allPlayers: WpiPlayer[]) {
  const batters = allPlayers.filter(p => !isPitcher(p.position))
  const pitchers = allPlayers.filter(p => isPitcher(p.position))

  // Points leagues: rank by raw fantasy points
  wpiTopBattersPoints.value = [...batters]
    .sort((a, b) => b.pts - a.pts).slice(0, 5)
  wpiTopPitchersPoints.value = [...pitchers]
    .sort((a, b) => b.pts - a.pts).slice(0, 5)

  // Category leagues: rank by category impact score
  wpiTopBattersCat.value = [...batters]
    .sort((a, b) => b.catScore - a.catScore).slice(0, 5)
  wpiTopPitchersCat.value = [...pitchers]
    .sort((a, b) => b.catScore - a.catScore).slice(0, 5)

  wpiStatus.value = `✓ Found ${batters.length} batters + ${pitchers.length} pitchers`
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
  { name: 'Diamond Kings',    score: 124.8, change:  2, record: '9-2' },
  { name: 'Sign Stealers',    score: 118.4, change:  1, record: '8-3' },
  { name: 'Roto Renegades',   score: 112.1, change: -1, record: '7-4' },
  { name: 'The Sluggers',     score: 108.6, change:  3, record: '7-4' },
  { name: 'Ace Gang',         score: 104.2, change: -2, record: '6-5' },
  { name: 'Bases Loaded FC',  score:  99.7, change:  0, record: '5-6' },
  { name: 'No-Hitter Club',   score:  94.3, change:  1, record: '4-7' },
  { name: 'Launch Angle FC',  score:  89.8, change: -2, record: '4-7' },
  { name: 'Waiver Wire Kid',  score:  84.1, change:  0, record: '3-8' },
  { name: 'The Algorithm',    score:  76.5, change: -2, record: '2-9' },
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
  return Math.round(((score || 0) / prMaxScore.value) * 82)
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

// Line paths (only through wpCurrentDay)
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

/* ── INTERACTIVE WIN PROBABILITY TEMPLATE ───────────────────────────────── */
.wp-post-wrap { max-width: 680px; margin: 0 40px; }
.sq-wp-bg {
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
