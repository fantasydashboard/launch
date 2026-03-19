<template>
  <div class="landing-root">

    <!-- ══════════════════════════════════════════════
         HERO
    ══════════════════════════════════════════════ -->
    <section class="hero-section">
      <!-- Noise overlay -->
      <div class="noise-overlay"></div>
      <!-- Grid lines -->
      <div class="grid-bg"></div>
      <!-- Glow blob -->
      <div class="hero-glow"></div>

      <div class="hero-inner">
        <!-- Logo -->
        <div class="hero-logo-wrap">
          <img src="/UFD_V8.png" alt="Ultimate Fantasy Dashboard — Fantasy Sports Analytics for Sleeper, ESPN and Yahoo" class="hero-logo" />
        </div>

        <!-- Headline -->
        <h1 class="hero-headline">
          Stop arguing.<br />
          <span class="headline-accent">Post the receipts.</span>
        </h1>

        <p class="hero-sub">
          Turn your Sleeper, Yahoo, or ESPN league into a war room.
          Power rankings, share cards, and weekly recaps that fuel
          <em>every group chat, every week.</em>
        </p>

        <!-- CTA row -->
        <div class="hero-ctas">
          <button class="cta-primary" @click="$emit('open-signup')">
            Preview My League Free
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <a href="#how-it-works" class="cta-ghost" @click.prevent="scrollTo('how-it-works')">
            See How It Works
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          </a>
        </div>

        <!-- Trust strip -->
        <div class="trust-strip">
          <span class="trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            No credit card
          </span>
          <span class="trust-sep">·</span>
          <span class="trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Sleeper · Yahoo · ESPN
          </span>
          <span class="trust-sep">·</span>
          <span class="trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Setup in 3 minutes
          </span>
        </div>

        <!-- Authentic app UI panels -->
        <div class="hero-cards-row">

          <!-- LEFT: Power Rankings table — exact app UI -->
          <div class="app-panel hc-left">
            <div class="ap-header">
              <div class="ap-header-left">
                <span class="ap-icon">⚡</span>
                <span class="ap-title">Power Rankings</span>
              </div>
              <span class="ap-badge-week">Week 11</span>
            </div>
            <div class="ap-table-head">
              <span class="apt-rank">Rank</span>
              <span class="apt-change">+/-</span>
              <span class="apt-team">Team</span>
              <span class="apt-score">Score</span>
              <span class="apt-rec">Record</span>
            </div>
            <!-- Row 1 — My Team highlighted yellow -->
            <div class="apt-row my-team-row">
              <span class="apt-rank-circle rank-1">1</span>
              <span class="apt-chg up">▲2</span>
              <div class="apt-team-cell">
                <div class="apt-avatar apt-avatar-yellow">
                  <span>MM</span>
                  <div class="apt-my-star">★</div>
                </div>
                <span class="apt-name my-name">Mahomes Magic</span>
              </div>
              <div class="apt-bar-wrap"><div class="apt-bar" style="width:92%"></div><span class="apt-bar-val">87.4</span></div>
              <span class="apt-rec-val">9-2</span>
            </div>
            <!-- Row 2 -->
            <div class="apt-row">
              <span class="apt-rank-circle">2</span>
              <span class="apt-chg down">▼1</span>
              <div class="apt-team-cell">
                <div class="apt-avatar apt-avatar-blue"><span>TC</span></div>
                <span class="apt-name">Trash Can Wins</span>
              </div>
              <div class="apt-bar-wrap"><div class="apt-bar apt-bar-dim" style="width:78%"></div><span class="apt-bar-val dim">74.1</span></div>
              <span class="apt-rec-val dim">8-3</span>
            </div>
            <!-- Row 3 -->
            <div class="apt-row">
              <span class="apt-rank-circle">3</span>
              <span class="apt-chg flat">—</span>
              <div class="apt-team-cell">
                <div class="apt-avatar apt-avatar-purple"><span>TA</span></div>
                <span class="apt-name">The Algorithm</span>
              </div>
              <div class="apt-bar-wrap"><div class="apt-bar apt-bar-dim" style="width:66%"></div><span class="apt-bar-val dim">68.9</span></div>
              <span class="apt-rec-val dim">7-4</span>
            </div>
            <!-- Row 4 -->
            <div class="apt-row">
              <span class="apt-rank-circle">4</span>
              <span class="apt-chg up">▲1</span>
              <div class="apt-team-cell">
                <div class="apt-avatar apt-avatar-green"><span>WK</span></div>
                <span class="apt-name">Waiver Wire Kid</span>
              </div>
              <div class="apt-bar-wrap"><div class="apt-bar apt-bar-dim" style="width:55%"></div><span class="apt-bar-val dim">61.2</span></div>
              <span class="apt-rec-val dim">6-5</span>
            </div>
            <!-- Row 5 -->
            <div class="apt-row">
              <span class="apt-rank-circle">5</span>
              <span class="apt-chg down">▼2</span>
              <div class="apt-team-cell">
                <div class="apt-avatar apt-avatar-gray"><span>TB</span></div>
                <span class="apt-name">Toilet Bowl FC</span>
              </div>
              <div class="apt-bar-wrap"><div class="apt-bar apt-bar-dim" style="width:38%"></div><span class="apt-bar-val dim">44.8</span></div>
              <span class="apt-rec-val dim">3-8</span>
            </div>
            <div class="ap-footer-link">View Full Rankings →</div>
          </div>

          <!-- CENTER: Week 11 Matchups — exact PointsMatchupCard UI -->
          <div class="app-panel hc-center">
            <div class="ap-header">
              <div class="ap-header-left">
                <span class="ap-icon">⚔️</span>
                <span class="ap-title">Week 11 Matchups</span>
              </div>
            </div>

            <!-- Matchup 1 — My team, LIVE -->
            <div class="apm-card apm-mine">
              <div class="apm-top-row">
                <span class="apm-label">PPR · Week 11</span>
                <span class="apm-status live">● Live</span>
              </div>
              <div class="apm-team-row">
                <div class="apm-team-info">
                  <div class="apm-avatar apm-av-yellow ring-yellow">
                    <span>MM</span>
                    <div class="apm-star">★</div>
                  </div>
                  <div>
                    <div class="apm-name mine">Mahomes Magic</div>
                    <div class="apm-record">9-2</div>
                  </div>
                </div>
                <div class="apm-score mine-score">142.7</div>
              </div>
              <div class="apm-team-row">
                <div class="apm-team-info">
                  <div class="apm-avatar apm-av-blue ring-dark"><span>TA</span></div>
                  <div>
                    <div class="apm-name">The Algorithm</div>
                    <div class="apm-record">7-4</div>
                  </div>
                </div>
                <div class="apm-score dim-score">98.4</div>
              </div>
              <div class="apm-prob-bar"><div class="apm-prob-fill" style="width:64%"></div></div>
              <div class="apm-prob-row">
                <span class="apm-prob-pct">64%</span>
                <span class="apm-prob-label">win probability</span>
              </div>
            </div>

            <!-- Matchup 2 — Final -->
            <div class="apm-card">
              <div class="apm-top-row">
                <span class="apm-label">PPR · Week 11</span>
                <span class="apm-status final">Final</span>
              </div>
              <div class="apm-team-row">
                <div class="apm-team-info">
                  <div class="apm-avatar apm-av-green ring-green"><span>TC</span></div>
                  <div>
                    <div class="apm-name winner">Trash Can Wins</div>
                    <div class="apm-record">8-3</div>
                  </div>
                </div>
                <div class="apm-score winner-score">164.2</div>
              </div>
              <div class="apm-team-row">
                <div class="apm-team-info">
                  <div class="apm-avatar apm-av-red ring-dark"><span>TB</span></div>
                  <div>
                    <div class="apm-name loser">Toilet Bowl FC</div>
                    <div class="apm-record">3-8</div>
                  </div>
                </div>
                <div class="apm-score dim-score">101.6</div>
              </div>
            </div>

            <!-- Matchup 3 — Upcoming -->
            <div class="apm-card">
              <div class="apm-top-row">
                <span class="apm-label">PPR · Week 11</span>
                <span class="apm-status upcoming">Upcoming</span>
              </div>
              <div class="apm-team-row">
                <div class="apm-team-info">
                  <div class="apm-avatar apm-av-purple ring-dark"><span>WK</span></div>
                  <div>
                    <div class="apm-name">Waiver Wire Kid</div>
                    <div class="apm-record">6-5</div>
                  </div>
                </div>
                <div class="apm-score dim-score">—</div>
              </div>
              <div class="apm-team-row">
                <div class="apm-team-info">
                  <div class="apm-avatar apm-av-gray ring-dark"><span>BB</span></div>
                  <div>
                    <div class="apm-name">Bench Boss</div>
                    <div class="apm-record">5-6</div>
                  </div>
                </div>
                <div class="apm-score dim-score">—</div>
              </div>
            </div>
          </div>

          <!-- RIGHT: Season Overview — quick stats + leaders -->
          <div class="app-panel hc-right">
            <div class="ap-header">
              <div class="ap-header-left">
                <span class="ap-icon">📊</span>
                <span class="ap-title">Season Overview</span>
              </div>
            </div>
            <!-- Quick stats 2x2 grid -->
            <div class="aso-stats-grid">
              <div class="aso-stat">
                <div class="aso-stat-icon" style="background:rgba(234,179,8,0.15)">📅</div>
                <div class="aso-stat-val">Week 11</div>
                <div class="aso-stat-lbl">Current Week</div>
              </div>
              <div class="aso-stat">
                <div class="aso-stat-icon" style="background:rgba(34,197,94,0.15)">🏆</div>
                <div class="aso-stat-val aso-truncate">Mahomes Magic</div>
                <div class="aso-stat-lbl">League Leader</div>
              </div>
              <div class="aso-stat">
                <div class="aso-stat-icon" style="background:rgba(59,130,246,0.15)">📈</div>
                <div class="aso-stat-val">118.4</div>
                <div class="aso-stat-lbl">Avg Pts/Week</div>
              </div>
              <div class="aso-stat">
                <div class="aso-stat-icon" style="background:rgba(234,179,8,0.15)">⚔️</div>
                <div class="aso-stat-val">6</div>
                <div class="aso-stat-lbl">Active Matchups</div>
              </div>
            </div>
            <!-- League leaders mini -->
            <div class="aso-leaders-header">🏅 League Leaders</div>
            <div class="aso-leaders-grid">
              <div class="aso-leader">
                <div class="aso-leader-top">
                  <span>🔥</span>
                  <span class="aso-leader-lbl">Hottest</span>
                </div>
                <div class="aso-leader-name">Mahomes Magic</div>
                <div class="aso-leader-sub green">W3 · 142.7 ppg</div>
              </div>
              <div class="aso-leader">
                <div class="aso-leader-top">
                  <span>🥶</span>
                  <span class="aso-leader-lbl">Coldest</span>
                </div>
                <div class="aso-leader-name">Toilet Bowl FC</div>
                <div class="aso-leader-sub red">L4 · 88.3 ppg</div>
              </div>
              <div class="aso-leader">
                <div class="aso-leader-top">
                  <span>🔄</span>
                  <span class="aso-leader-lbl">Most Moves</span>
                </div>
                <div class="aso-leader-name">Waiver Wire Kid</div>
                <div class="aso-leader-sub blue">34 transactions</div>
              </div>
              <div class="aso-leader">
                <div class="aso-leader-top">
                  <span>🪨</span>
                  <span class="aso-leader-lbl">Fewest Moves</span>
                </div>
                <div class="aso-leader-name">The Algorithm</div>
                <div class="aso-leader-sub purple">4 transactions</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         SPORT / HOST / FORMAT PICKER
    ══════════════════════════════════════════════ -->
    <section class="picker-section" id="picker" aria-label="Connect your Sleeper, ESPN, or Yahoo fantasy league">
      <div class="section-inner">
        <div class="section-eyebrow">Your league, your rules</div>
        <h2 class="section-headline">Works with <span class="accent">your</span> league. Right now.</h2>
        <p class="section-sub">Pick your setup — we'll show you exactly what you'd get.</p>

        <!-- Picker UI -->
        <div class="picker-grid">
          <!-- Step 1: Sport -->
          <div class="picker-step">
            <div class="picker-step-label"><span class="step-num">01</span> Your sport</div>
            <div class="picker-options">
              <button
                v-for="s in sports" :key="s.id"
                class="picker-option"
                :class="{ active: selectedSport === s.id }"
                @click="selectedSport = s.id; ensureValidFormat()"
              >
                <span class="picker-emoji">{{ s.emoji }}</span>
                <span>{{ s.name }}</span>
              </button>
            </div>
          </div>

          <!-- Step 2: Platform -->
          <div class="picker-step">
            <div class="picker-step-label"><span class="step-num">02</span> Your platform</div>
            <div class="picker-options">
              <button
                v-for="p in platforms" :key="p.id"
                class="picker-option picker-option-platform"
                :class="{ active: selectedPlatform === p.id }"
                @click="selectedPlatform = p.id"
              >
                <img :src="p.logo" :alt="p.name" class="platform-btn-logo" />
                <span>{{ p.name }}</span>
              </button>
            </div>
          </div>

          <!-- Step 3: Format -->
          <div class="picker-step">
            <div class="picker-step-label"><span class="step-num">03</span> Your format</div>
            <div class="picker-options">
              <button
                v-for="f in formats" :key="f"
                class="picker-option"
                :class="{ active: selectedFormat === f }"
                @click="selectedFormat = f"
              >{{ f }}</button>
            </div>
          </div>
        </div>

        <!-- Dynamic preview card -->
        <div class="picker-preview">
          <!-- Card header badge row -->
          <div class="preview-badge-row">
            <img :src="activePlatform.logo" :alt="activePlatform.name" class="preview-platform-logo" />
            <span class="preview-badge">{{ activeSport.emoji }} {{ activeSport.name }} · {{ activePlatform.name }} · {{ selectedFormat }}</span>
          </div>

          <div class="preview-card">
            <!-- Card header — platform logo + title + week -->
            <div class="preview-header">
              <div class="preview-header-left">
                <img :src="activePlatform.logo" :alt="activePlatform.name" class="preview-header-logo" />
                <span class="preview-title">Standings</span>
              </div>
              <span class="preview-week">Week {{ currentWeek }}</span>
            </div>

            <!-- Table header — columns depend on format -->
            <div class="preview-thead" :class="selectedFormat === 'Categories' ? 'thead-cat' : 'thead-pts'">
              <span class="pth-rank">#</span>
              <span class="pth-team">Team</span>
              <span class="pth-rec">{{ selectedFormat === 'Categories' ? 'W-L-T' : 'W-L' }}</span>
              <template v-if="selectedFormat === 'Points'">
                <span class="pth-col">PF</span>
                <span class="pth-col">All-Play</span>
              </template>
              <template v-else>
                <span class="pth-col pth-cat" v-for="cat in activeCategoryColumns" :key="cat">{{ cat }}</span>
              </template>
            </div>

            <!-- Rows -->
            <div
              v-for="(team, i) in previewTeams"
              :key="team.name"
              class="preview-rank-row"
              :class="[selectedFormat === 'Categories' ? 'row-cat' : 'row-pts', i === 0 ? 'row-first' : '']"
            >
              <!-- Rank -->
              <span class="prev-rank" :class="i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''">{{ i + 1 }}</span>

              <!-- Avatar + name -->
              <div class="prev-team-cell">
                <span class="prev-avatar" :style="{ background: team.color }">
                  {{ team.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) }}
                </span>
                <span class="prev-name">{{ team.name }}</span>
              </div>

              <!-- Points columns -->
              <template v-if="selectedFormat === 'Points'">
                <span class="prev-record">{{ team.record }}</span>
                <span class="prev-pts">{{ team.pts }}</span>
                <span class="prev-allplay">{{ team.allPlay }}</span>
              </template>

              <!-- Category columns -->
              <template v-else>
                <span class="prev-record cat-rec">{{ team.catRecord }}</span>
                <span class="prev-cat" v-for="(cv, ci) in team.cats" :key="ci">{{ cv }}</span>
              </template>
            </div>
          </div>

          <button class="cta-primary mt-6" @click="$emit('open-signup')">
            Connect My {{ activePlatform.name }} League Free
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- Section CTA: Picker -->
    <div class="section-cta-strip">
      <button class="cta-primary" @click="$emit('open-signup')">
        That's my league. Connect it free.
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>

    <!-- ══════════════════════════════════════════════
         SHARE CARD GALLERY
    ══════════════════════════════════════════════ -->
    <section class="gallery-section">
      <div class="gallery-noise"></div>
      <div class="section-inner">
        <div class="section-eyebrow">Drop these in the group chat</div>
        <h2 class="section-headline">Cards your league will <span class="accent">actually</span> screenshot.</h2>
        <p class="section-sub">Stop sending raw box scores. Send this.</p>

        <!-- Filter tabs -->
        <div class="gallery-filters">
          <button
            v-for="f in galleryFilters" :key="f.id"
            class="gallery-filter"
            :class="{ active: activeGalleryFilter === f.id }"
            @click="activeGalleryFilter = f.id"
          >{{ f.label }}</button>
        </div>

        <!-- Card grid -->
        <div class="card-grid">
          <template v-for="card in filteredCards" :key="card.id">
            <div class="share-card" :class="card.size" :style="cardLink(card) ? 'cursor:pointer' : ''" @click="cardLink(card) && $router.push(cardLink(card))">

              <!-- ═══ POWER RANKINGS TABLE ════════════════════════════════ -->
              <template v-if="card.type === 'power-rankings'">
                <div class="sc-card sc-pr-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">🏈 NFL Fantasy · PPR</span>
                    <span class="sc-brand-week">WK {{ card.week }}</span>
                  </div>
                  <div class="sc-pr-title">⚡ POWER RANKINGS</div>
                  <div class="sc-pr-table">
                    <div class="sc-pr-thead">
                      <span>Rank</span><span>+/-</span><span>Team</span><span>Score</span><span>W-L</span>
                    </div>
                    <div v-for="(t,i) in card.teams" :key="i" class="sc-pr-row" :class="i===0?'sc-pr-leader':''">
                      <span class="sc-pr-num" :class="i===0?'num-gold':i===1?'num-silver':i===2?'num-bronze':''">{{ i+1 }}</span>
                      <span class="sc-pr-chg" :class="t.trend>0?'chg-up':t.trend<0?'chg-dn':'chg-flat'">{{ t.trend>0?'▲'+t.trend:t.trend<0?'▼'+Math.abs(t.trend):'—' }}</span>
                      <div class="sc-pr-team-cell">
                        <div class="sc-pr-initials" :class="'init-'+i">{{ t.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2) }}</div>
                        <span class="sc-pr-name" :class="i===0?'name-gold':''">{{ t.name }}</span>
                      </div>
                      <div class="sc-pr-bar-wrap">
                        <div class="sc-pr-bar" :style="{width:t.score+'%',opacity:Math.max(0.3,1-(i*0.15))}"></div>
                        <span class="sc-pr-bar-num">{{ t.pscore }}</span>
                      </div>
                      <span class="sc-pr-rec">{{ t.record }}</span>
                    </div>
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- ═══ POWER RANKINGS LINE GRAPH ════════════════════════════ -->
              <template v-else-if="card.type === 'pr-chart'">
                <div class="sc-card sc-pr-chart-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">🏈 NFL Fantasy · PPR</span>
                    <span class="sc-brand-week">WK 1–{{ card.week }}</span>
                  </div>
                  <div class="sc-pr-title">⚡ RANKING TRENDS</div>
                  <!-- SVG line chart — y-axis inverted (rank 1 = top) — smooth curves -->
                  <div class="sc-prc-chart-wrap">
                    <svg viewBox="0 0 280 140" class="sc-prc-svg">
                      <!-- Horizontal grid lines for ranks 1–5 -->
                      <line v-for="r in 5" :key="r" x1="28" :y1="16+(r-1)*22" x2="276" :y2="16+(r-1)*22" stroke="#1e2130" stroke-width="0.8"/>
                      <!-- Rank labels on y-axis -->
                      <text v-for="r in 5" :key="'l'+r" x="22" :y="20+(r-1)*22" font-size="7" fill="#374151" text-anchor="end">{{ r }}</text>
                      <!-- Smooth bezier path per team -->
                      <template v-for="(t,ti) in card.teams" :key="ti">
                        <path
                          :d="smoothPath(t.ranks, 28, 22, 22, 16)"
                          fill="none" :stroke="t.color" :stroke-width="ti===0?2.2:1.5"
                          :stroke-opacity="ti===0?1:ti===1?0.8:ti<=3?0.55:0.35"
                          stroke-linejoin="round" stroke-linecap="round"
                        />
                        <!-- dot at last point -->
                        <circle
                          :cx="28+(t.ranks.length-1)*22"
                          :cy="16+(t.ranks[t.ranks.length-1]-1)*22"
                          :r="ti===0?3.5:2.5" :fill="t.color"
                          :fill-opacity="ti===0?1:0.7"
                        />
                        <!-- name label at end -->
                        <text
                          :x="28+(t.ranks.length-1)*22+5"
                          :y="20+(t.ranks[t.ranks.length-1]-1)*22"
                          font-size="7" :fill="t.color" :fill-opacity="ti===0?1:0.75"
                        >{{ t.name.split(' ')[0] }}</text>
                      </template>
                      <!-- Week tick labels -->
                      <text v-for="(r,wi) in card.teams[0].ranks" :key="'w'+wi"
                        :x="28+wi*22" y="138" font-size="6.5" fill="#374151" text-anchor="middle">{{ wi+1 }}</text>
                    </svg>
                    <div class="sc-prc-xlabel">Week</div>
                  </div>
                  <!-- Mini legend -->
                  <div class="sc-prc-legend">
                    <span v-for="(t,ti) in card.teams.slice(0,3)" :key="ti" class="sc-prc-legend-item">
                      <span class="sc-prc-dot" :style="{background:t.color}"></span>
                      <span>{{ t.name.split(' ')[0] }}</span>
                    </span>
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- ═══ WIN PROBABILITY CARD ═════════════════════════════════ -->
              <template v-else-if="card.type === 'win-prob'">
                <div class="sc-card sc-winprob-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-matchup-status status-live">● Live</span>
                  </div>
                  <div class="sc-pr-title" style="font-size:0.82rem;padding:8px 16px 4px">🎯 WIN PROBABILITY · WK {{ card.week }}</div>
                  <!-- Two team prob blocks side by side -->
                  <div class="sc-wp-teams">
                    <div class="sc-wp-team sc-wp-t1">
                      <div class="sc-wp-avatar" :style="{borderColor: card.t1color}">
                        {{ card.team1.split(' ').map((w:string)=>w[0]).join('').slice(0,2) }}
                      </div>
                      <div class="sc-wp-name" :style="{color: card.t1color}">{{ card.team1 }}</div>
                      <div class="sc-wp-pct" :style="{color: card.t1color}">{{ card.t1prob.toFixed(1) }}%</div>
                      <div class="sc-wp-sub">{{ card.t1pts.toFixed(1) }} pts</div>
                      <div class="sc-wp-proj" :style="{color: card.t1color}">proj {{ card.t1proj.toFixed(1) }}</div>
                    </div>
                    <div class="sc-wp-vs">VS</div>
                    <div class="sc-wp-team sc-wp-t2">
                      <div class="sc-wp-avatar" :style="{borderColor: card.t2color}">
                        {{ card.team2.split(' ').map((w:string)=>w[0]).join('').slice(0,2) }}
                      </div>
                      <div class="sc-wp-name" :style="{color: card.t2color}">{{ card.team2 }}</div>
                      <div class="sc-wp-pct" :style="{color: card.t2color}">{{ card.t2prob.toFixed(1) }}%</div>
                      <div class="sc-wp-sub">{{ card.t2pts.toFixed(1) }} pts</div>
                      <div class="sc-wp-proj" :style="{color: card.t2color}">proj {{ card.t2proj.toFixed(1) }}</div>
                    </div>
                  </div>
                  <!-- Gradient probability bar -->
                  <div class="sc-wp-bar-wrap">
                    <div class="sc-wp-bar-fill" :style="{background: `linear-gradient(90deg, ${card.t1color} ${card.t1prob}%, ${card.t2color} ${card.t1prob}%)`}"></div>
                    <div class="sc-wp-bar-t1">{{ card.team1.split(' ')[0] }}</div>
                    <div class="sc-wp-bar-t2">{{ card.team2.split(' ')[0] }}</div>
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- ═══ WIN PROBABILITY TREND CHART ══════════════════════════ -->
              <template v-else-if="card.type === 'win-prob-chart'">
                <div class="sc-card sc-wpc-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-brand-week">WK {{ card.week }}</span>
                  </div>
                  <div class="sc-pr-title" style="font-size:0.82rem;padding:8px 16px 4px">📈 WIN PROBABILITY TREND</div>
                  <!-- Area chart SVG — rich version matching actual app -->
                  <div class="sc-wpc-chart-wrap">
                    <svg viewBox="0 0 300 140" class="sc-wpc-svg">
                      <!-- Y grid lines + labels -->
                      <text x="4"  y="14"  font-size="6.5" fill="#4b5563">100%</text>
                      <text x="4"  y="77"  font-size="6.5" fill="#4b5563">50%</text>
                      <text x="4"  y="134" font-size="6.5" fill="#4b5563">0%</text>
                      <line x1="32" y1="10"  x2="296" y2="10"  stroke="#1e2130" stroke-width="0.6" stroke-dasharray="3,3"/>
                      <line x1="32" y1="73"  x2="296" y2="73"  stroke="#374151" stroke-width="0.8" stroke-dasharray="3,3"/>
                      <line x1="32" y1="135" x2="296" y2="135" stroke="#1e2130" stroke-width="0.6"/>

                      <!-- compute: xStep = (296-32)/6 = 44, y(p) = 135 - (p/100)*125 -->
                      <!-- t1 area fill (team 1 line area to bottom) -->
                      <path
                        :d="wpcAreaPath(card.probs, 32, 44, 135, 125, false)"
                        :fill="card.t1color" fill-opacity="0.12"
                      />
                      <!-- t2 area fill (inverted, area to top) -->
                      <path
                        :d="wpcAreaPath(card.probs, 32, 44, 135, 125, true)"
                        :fill="card.t2color" fill-opacity="0.1"
                      />
                      <!-- t1 smooth line -->
                      <path
                        :d="wpcLinePath(card.probs, 32, 44, 135, 125, false)"
                        fill="none" :stroke="card.t1color" stroke-width="2.2"
                        stroke-linecap="round" stroke-linejoin="round"
                      />
                      <!-- t2 smooth line (dashed) -->
                      <path
                        :d="wpcLinePath(card.probs, 32, 44, 135, 125, true)"
                        fill="none" :stroke="card.t2color" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round"
                        stroke-dasharray="5,2.5"
                      />

                      <!-- Data point labels for each day -->
                      <template v-for="(p,di) in card.probs" :key="'dp'+di">
                        <!-- t1 dot + label -->
                        <circle :cx="32+di*44" :cy="135-(p/100)*125" r="3.5" :fill="card.t1color"/>
                        <rect :x="32+di*44-12" :y="135-(p/100)*125-18" width="24" height="13" rx="3" :fill="card.t1color" fill-opacity="0.9"/>
                        <text :x="32+di*44" :y="135-(p/100)*125-9" font-size="6.5" fill="#000" font-weight="700" text-anchor="middle">{{ p.toFixed(1) }}</text>
                        <!-- t2 dot + label -->
                        <circle :cx="32+di*44" :cy="135-((100-p)/100)*125" r="3" :fill="card.t2color" fill-opacity="0.85"/>
                        <rect :x="32+di*44-12" :y="135-((100-p)/100)*125+6" width="24" height="13" rx="3" :fill="card.t2color" fill-opacity="0.9"/>
                        <text :x="32+di*44" :y="135-((100-p)/100)*125+15" font-size="6.5" fill="#000" font-weight="700" text-anchor="middle">{{ (100-p).toFixed(1) }}</text>
                      </template>

                      <!-- Day labels on x-axis -->
                      <text v-for="(d,di) in card.days" :key="'day'+di"
                        :x="32+di*44" y="148" font-size="7.5" fill="#6b7280" text-anchor="middle">{{ d }}</text>
                    </svg>
                  </div>
                  <!-- Legend -->
                  <div class="sc-prc-legend" style="padding:0 16px 4px">
                    <span class="sc-prc-legend-item">
                      <span class="sc-prc-dot" :style="{background:card.t1color}"></span>
                      <span :style="{color:card.t1color}">{{ card.team1 }}</span>
                    </span>
                    <span class="sc-prc-legend-item">
                      <span class="sc-prc-dot" :style="{background:card.t2color,opacity:0.7}"></span>
                      <span :style="{color:card.t2color,opacity:0.8}">{{ card.team2 }}</span>
                    </span>
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- ═══ STANDINGS TABLE ═══════════════════════════════════════ -->
              <template v-else-if="card.type === 'standings'">
                <div class="sc-card sc-standings-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-brand-week">WK {{ card.week }}</span>
                  </div>
                  <div class="sc-standings-title">🏆 STANDINGS</div>
                  <div class="sc-standings-thead">
                    <span class="std-rank">#</span>
                    <span class="std-team">Team</span>
                    <span class="std-rec">W-L</span>
                    <span class="std-pf">PF</span>
                    <span class="std-streak">Streak</span>
                  </div>
                  <div v-for="(t,i) in card.teams" :key="i" class="sc-standings-row" :class="[t.playoff?'std-playoff':'',t.myTeam?'std-myteam':'']">
                    <span class="std-rank-val" :class="i===0?'rank-gold':i===1?'rank-silver':i===2?'rank-bronze':''">
                      {{ i+1 }}<span v-if="t.playoff" class="std-playoff-dot">●</span>
                    </span>
                    <div class="std-team-cell">
                      <div class="std-avatar" :class="'stdav-'+i">
                        {{ t.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2) }}
                        <div v-if="t.myTeam" class="std-my-star">★</div>
                      </div>
                      <span class="std-name" :class="t.myTeam?'std-mine-name':''">{{ t.name }}</span>
                    </div>
                    <span class="std-rec-val">{{ t.wins }}-{{ t.losses }}</span>
                    <span class="std-pf-val">{{ t.pf }}</span>
                    <span class="std-streak-val" :class="t.streak.startsWith('W')?'str-w':'str-l'">{{ t.streak }}</span>
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- ═══ HISTORY: SEASON-BY-SEASON STANDINGS ══════════════════ -->
              <template v-else-if="card.type === 'history-standings'">
                <div class="sc-card sc-hist-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-brand-week">HISTORY</span>
                  </div>
                  <div class="sc-standings-title">📅 SEASON FINISHES</div>
                  <!-- Season column headers -->
                  <div class="sc-hist-thead">
                    <span class="sc-hist-th-team">Team</span>
                    <span v-for="s in card.seasons" :key="s" class="sc-hist-th-yr">{{ s }}</span>
                    <span class="sc-hist-th-avg">Avg</span>
                  </div>
                  <div v-for="(t,ti) in card.teams" :key="ti" class="sc-hist-row" :class="ti===0?'sc-hist-first':''">
                    <div class="sc-hist-team-cell">
                      <div class="sc-hist-dot" :style="{background:t.color}"></div>
                      <span class="sc-hist-name">{{ t.name }}</span>
                    </div>
                    <span v-for="(f,fi) in t.finishes" :key="fi" class="sc-hist-finish"
                      :class="f===1?'fin-gold':f===2?'fin-silver':f<=3?'fin-bronze':f>=6?'fin-last':''">
                      {{ f }}
                    </span>
                    <span class="sc-hist-avg" :class="(t.finishes.reduce((a:number,b:number)=>a+b,0)/t.finishes.length)<=2?'avg-good':'avg-meh'">
                      {{ (t.finishes.reduce((a:number,b:number)=>a+b,0)/t.finishes.length).toFixed(1) }}
                    </span>
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- ═══ HISTORY: H2H MATRIX ═══════════════════════════════════ -->
              <template v-else-if="card.type === 'h2h-matrix'">
                <div class="sc-card sc-h2h-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-brand-week">ALL-TIME</span>
                  </div>
                  <div class="sc-standings-title">🆚 HEAD-TO-HEAD MATRIX</div>
                  <div class="sc-h2h-subtitle">All-time records · read horizontally</div>
                  <div class="sc-h2h-table-wrap">
                    <table class="sc-h2h-table">
                      <thead>
                        <tr>
                          <th class="sc-h2h-corner"></th>
                          <th v-for="(abbr,ci) in card.teams" :key="ci" class="sc-h2h-th">
                            <div class="sc-h2h-th-dot" :style="{background:card.colors[ci]}"></div>
                            <span>{{ abbr }}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row,ri) in card.records" :key="ri">
                          <td class="sc-h2h-row-label">
                            <div class="sc-h2h-th-dot" :style="{background:card.colors[ri]}"></div>
                            <span>{{ card.teams[ri] }}</span>
                          </td>
                          <td v-for="(cell,ci) in row" :key="ci" class="sc-h2h-cell"
                            :class="cell===null?'h2h-self':cell&&cell.split('-')[0]>cell.split('-')[1]?'h2h-win':cell&&cell.split('-')[0]<cell.split('-')[1]?'h2h-loss':'h2h-even'">
                            <span v-if="cell===null" class="h2h-dash">—</span>
                            <span v-else>{{ cell }}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div class="sc-h2h-legend">
                    <span class="h2h-leg-item"><span class="h2h-leg-swatch h2h-win"></span>Win record</span>
                    <span class="h2h-leg-item"><span class="h2h-leg-swatch h2h-loss"></span>Loss record</span>
                    <span class="h2h-leg-item"><span class="h2h-leg-swatch h2h-even"></span>Even</span>
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- ═══ HISTORY: LEGACY STANDINGS ════════════════════════════ -->
              <template v-else-if="card.type === 'legacy'">
                <div class="sc-card sc-legacy-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-brand-week">LEGACY</span>
                  </div>
                  <div class="sc-standings-title">👑 LEGACY STANDINGS</div>
                  <div class="sc-leg-list">
                    <div v-for="(t,i) in card.teams" :key="i" class="sc-leg-row" :class="t.myTeam?'leg-myteam':''">
                      <div class="sc-leg-rank" :class="i===0?'leg-gold':i===1?'leg-silver':i===2?'leg-bronze':'leg-other'">{{ i+1 }}</div>
                      <div class="sc-leg-avatar" :style="{background:t.color}">{{ t.name.split(' ').map((w:string)=>w[0]).join('').slice(0,2) }}<div v-if="t.myTeam" class="sc-leg-star">★</div></div>
                      <div class="sc-leg-info">
                        <div class="sc-leg-name" :class="t.myTeam?'leg-mine':''">{{ t.name }}</div>
                        <div class="sc-leg-badges">
                          <span v-if="t.champs>0" class="sc-leg-badge badge-champ">🏆 {{ t.champs }}</span>
                          <span v-if="t.playoffs>0" class="sc-leg-badge badge-playoff">📈 {{ t.playoffs }}</span>
                          <span class="sc-leg-badge badge-seasons">{{ t.seasons }}yr</span>
                        </div>
                        <div class="sc-leg-bar-wrap">
                          <div class="sc-leg-bar" :style="{width:(t.score/card.teams[0].score*100)+'%',background:t.color}"></div>
                        </div>
                      </div>
                      <div class="sc-leg-score" :class="i===0?'leg-score-gold':''">{{ t.score.toLocaleString() }}</div>
                    </div>
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- ═══ TRADE ANALYSIS ════════════════════════════════════════ -->
              <template v-else-if="card.type === 'draft-grades'">
                <div class="sc-card sc-draft-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-brand-week">DRAFT</span>
                  </div>
                  <div class="sc-pr-title">📋 DRAFT GRADES · {{ card.teamName }}</div>
                  <div class="sc-draft-thead">
                    <span>PICK</span><span>PLAYER</span><span>POS</span><span>PAR</span><span>GRD</span>
                  </div>
                  <div v-for="p in card.picks" :key="p.name" class="sc-draft-row" :class="p.grade==='A+'?'sc-pr-leader':p.grade==='D'||p.grade==='F'?'sc-draft-bust':''">
                    <span class="sc-draft-pick">{{ p.round }}.{{ String(p.pick).padStart(2,'0') }}</span>
                    <span class="sc-draft-name">{{ p.name }}</span>
                    <span class="sc-pos-badge" :class="'pos-'+p.pos.toLowerCase()">{{ p.pos }}</span>
                    <span class="sc-par-val" :class="p.par>0?'sc-par-up':'sc-par-dn'">{{ p.par > 0 ? '+' : '' }}{{ p.par }}</span>
                    <span class="sc-grade-badge" :class="'grade-'+p.grade.replace('+','plus').replace('-','minus')">{{ p.grade }}</span>
                  </div>
                  <div class="sc-draft-foot">
                    <span class="sc-draft-overall-lbl">Overall Grade</span>
                    <span class="sc-draft-overall-val">{{ card.teamGrade }}</span>
                    <span class="sc-watermark" style="margin-left:auto">ultimatefantasydashboard.com</span>
                  </div>
                </div>
              </template>

              <template v-else-if="card.type === 'draft-board'">
                <div class="sc-card sc-draftboard-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-brand-week">DRAFT</span>
                  </div>
                  <div class="sc-pr-title" style="display:flex;align-items:center;justify-content:space-between;padding-right:16px">
                    <span>📋 DRAFT BOARD</span>
                    <span class="sc-dboard-overall">{{ card.teamName }} &nbsp;<span style="color:#eab308;font-size:1rem">{{ card.teamGrade }}</span></span>
                  </div>
                  <div class="sc-dboard-thead">
                    <span>PICK</span><span>PLAYER</span><span>POS</span><span>GRADE</span><span>▲▼</span>
                  </div>
                  <div v-for="r in card.rounds" :key="r.pick" class="sc-dboard-row" :class="r.grade==='A+'?'sc-pr-leader':r.grade==='D'||r.grade==='F'?'sc-draft-bust':''">
                    <span class="sc-dboard-pick">{{ r.pick }}</span>
                    <span class="sc-dboard-name">{{ r.name }}</span>
                    <span class="sc-pos-badge" :class="'pos-'+r.pos.toLowerCase()">{{ r.pos }}</span>
                    <span class="sc-grade-badge" :class="'grade-'+r.grade.replace('+','plus').replace('-','minus')">{{ r.grade }}</span>
                    <span class="sc-dboard-trend" :class="r.trend==='up'?'chg-up':r.trend==='dn'?'chg-dn':'chg-flat'">{{ r.trend==='up'?'▲':r.trend==='dn'?'▼':'—' }}</span>
                  </div>
                  <div class="sc-watermark" style="padding:6px 16px">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <template v-else-if="card.type === 'trade'">
                <div class="sc-card sc-trade-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-brand-week">TRADE ALERT</span>
                  </div>
                  <div class="sc-trade-title">🤝 TRADE ANALYSIS</div>
                  <div class="sc-trade-teams">
                    <div class="sc-trade-side">
                      <div class="sc-trade-manager">{{ card.team1 }} receives</div>
                      <div v-for="p in card.gives2" :key="p.name" class="sc-trade-player">
                        <div class="sc-trade-player-pos" :class="'pos-'+p.pos.toLowerCase()">{{ p.pos }}</div>
                        <span class="sc-trade-player-name">{{ p.name }}</span>
                        <span class="sc-trade-player-val green-val">+{{ p.val }}</span>
                      </div>
                    </div>
                    <div class="sc-trade-arrow">⇄</div>
                    <div class="sc-trade-side">
                      <div class="sc-trade-manager">{{ card.team2 }} receives</div>
                      <div v-for="p in card.gives1" :key="p.name" class="sc-trade-player">
                        <div class="sc-trade-player-pos" :class="'pos-'+p.pos.toLowerCase()">{{ p.pos }}</div>
                        <span class="sc-trade-player-name">{{ p.name }}</span>
                        <span class="sc-trade-player-val" :class="p.val>0?'green-val':'red-val'">{{ p.val>0?'+':'' }}{{ p.val }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="sc-trade-verdict" :class="card.verdict==='Fair'?'verdict-fair':card.verdict==='Win'?'verdict-win':'verdict-loss'">
                    {{ card.verdict==='Win'?'✓ '+card.team1+' wins this trade':card.verdict==='Fair'?'≈ Fair trade':'✗ Unfavorable for '+card.team1 }}
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- Section CTA: Gallery -->
    <div class="section-cta-strip">
      <button class="cta-primary" @click="$emit('open-signup')">
        I need these cards in my group chat immediately.
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>

    <!-- ══════════════════════════════════════════════
         HOW IT WORKS
    ══════════════════════════════════════════════ -->
    <section class="hiw-section" id="how-it-works" aria-label="How to get started with Ultimate Fantasy Dashboard">
      <div class="section-inner">
        <div class="section-eyebrow">Dead simple</div>
        <h2 class="section-headline">From league to loaded in <span class="accent">3 minutes.</span></h2>

        <div class="hiw-steps">
          <div class="hiw-step">
            <div class="hiw-step-num">01</div>
            <div class="hiw-icon-wrap"><span class="hiw-icon">🔗</span></div>
            <h3>Connect Your League</h3>
            <p>Paste your Sleeper, Yahoo, or ESPN league link. No CSV exports, no manual entry, no BS. One link and you're in.</p>
            <div class="hiw-connector"></div>
          </div>
          <div class="hiw-step">
            <div class="hiw-step-num">02</div>
            <div class="hiw-icon-wrap"><span class="hiw-icon">⚡</span></div>
            <h3>Your Data, Instantly</h3>
            <p>Power rankings, full season history, matchup breakdowns, and weekly projections — generated automatically every week without lifting a finger.</p>
            <div class="hiw-connector"></div>
          </div>
          <div class="hiw-step">
            <div class="hiw-step-num">03</div>
            <div class="hiw-icon-wrap"><span class="hiw-icon">💣</span></div>
            <h3>Drop It In the Chat</h3>
            <p>One-tap share cards ready every week. Power rankings, blowout alerts, weekly recaps. Your group chat will not stop talking about it.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Section CTA: How It Works -->
    <div class="section-cta-strip">
      <button class="cta-primary" @click="$emit('open-signup')">
        3 minutes. That's all it takes.
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>

    <!-- ══════════════════════════════════════════════
         SOCIAL PROOF
    ══════════════════════════════════════════════ -->
    <section class="proof-section">
      <div class="proof-noise"></div>
      <div class="section-inner">
        <div class="section-eyebrow">Real leagues, real chaos</div>
        <h2 class="section-headline">Your league will not <span class="accent">stop talking</span> about this.</h2>

        <!-- Chat bubbles -->
        <div class="chat-grid">
          <div v-for="msg in chatMessages" :key="msg.id" class="chat-bubble" :class="msg.side">
            <div class="chat-meta">{{ msg.name }} · {{ msg.context }}</div>
            <div class="chat-text">{{ msg.text }}</div>
            <div v-if="msg.reaction" class="chat-reaction">{{ msg.reaction }}</div>
          </div>
        </div>

        <!-- Stats callout row -->
        <div class="stats-row">
          <div class="stat-block">
            <div class="stat-num">12K+</div>
            <div class="stat-label">Leagues Connected</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-block">
            <div class="stat-num">4</div>
            <div class="stat-label">Sports Supported</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-block">
            <div class="stat-num">Free</div>
            <div class="stat-label">To Preview</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-block">
            <div class="stat-num">3 min</div>
            <div class="stat-label">To Get Started</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section CTA: Social Proof -->
    <div class="section-cta-strip">
      <button class="cta-primary" @click="$emit('open-signup')">
        Join them. Break your group chat.
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>

    <!-- ══════════════════════════════════════════════
         FEATURES / PRICING CTA
    ══════════════════════════════════════════════ -->
    <section class="features-section">
      <div class="section-inner">
        <div class="section-eyebrow">Everything in the box</div>
        <h2 class="section-headline">Start free. <span class="accent">Go deeper</span> when you're ready.</h2>
        <p class="section-sub">No feature-gating on the good stuff. Connect your league and see what you've been missing.</p>

        <div class="features-grid">
          <div class="feature-item"><span class="feat-check">✓</span><span>Power rankings — auto-generated every week</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>Shareable cards for any platform's group chat</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>Full season standings & weekly matchup breakdowns</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>Win probability — live & Monte Carlo projected</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>Season history going back years, not just this season</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>All-time head-to-head matrix for every rivalry</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>Legacy standings — who's actually won this league</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>Trade analyzer with fair value grades</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>Start/sit projections across all roster spots</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>Sleeper, Yahoo & ESPN — all in one dashboard</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>Football, baseball, basketball & hockey</span></div>
          <div class="feature-item"><span class="feat-check">✓</span><span>Draft history & balance reports</span></div>
        </div>

        <div class="features-cta-row">
          <button class="cta-primary cta-xl" @click="$emit('open-signup')">
            Connect Your League Free
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <a href="/pricing" class="cta-ghost">See pricing details →</a>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         RESOURCES SECTION
    ══════════════════════════════════════════════ -->
    <section class="resources-section">
      <div class="section-inner">
        <div class="section-eyebrow">Commissioner Guides</div>
        <h2 class="section-headline">Learn how to run a <span class="accent">league people actually love.</span></h2>
        <p class="section-sub" style="text-align:center;max-width:560px;margin:0 auto 40px">In-depth guides on using power rankings, league history, draft analysis, and matchup data to drive trash talk and engagement all season.</p>
        <div class="resources-grid">
          <a href="/resources/power-rankings" class="resource-tile">
            <span class="resource-tile-icon">📊</span>
            <span class="resource-tile-title">Power Rankings</span>
            <span class="resource-tile-sub">Why they drive engagement →</span>
          </a>
          <a href="/resources/league-history" class="resource-tile">
            <span class="resource-tile-icon">🏆</span>
            <span class="resource-tile-title">League History</span>
            <span class="resource-tile-sub">Unlocking years of receipts →</span>
          </a>
          <a href="/resources/draft-analysis" class="resource-tile">
            <span class="resource-tile-icon">📋</span>
            <span class="resource-tile-title">Draft Analysis</span>
            <span class="resource-tile-sub">Grades that settle arguments →</span>
          </a>
          <a href="/resources/matchup-analysis" class="resource-tile">
            <span class="resource-tile-icon">⚔️</span>
            <span class="resource-tile-title">Matchup Analysis</span>
            <span class="resource-tile-sub">Monte Carlo win probability →</span>
          </a>
        </div>
        <div style="text-align:center;margin-top:24px">
          <a href="/resources" class="cta-ghost">View all commissioner resources →</a>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         FAQ
    ══════════════════════════════════════════════ -->
    <section class="faq-section" aria-label="Frequently asked questions about Ultimate Fantasy Dashboard">
      <div class="section-inner">
        <div class="section-eyebrow">Questions</div>
        <h2 class="section-headline faq-headline">Got questions?<br/><span class="accent">We've got answers.</span></h2>
        <div class="faq-list faq-list-full">
          <div v-for="(faq, i) in faqs" :key="i" class="faq-item" @click="toggleFaq(i)">
            <div class="faq-q">
              <span>{{ faq.q }}</span>
              <span class="faq-arrow" :class="{ open: openFaq === i }">›</span>
            </div>
            <div class="faq-a" :class="{ visible: openFaq === i }">{{ faq.a }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Section CTA: FAQ -->
    <div class="section-cta-strip">
      <button class="cta-primary" @click="$emit('open-signup')">
        Clear enough. Let's go.
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </button>
    </div>

    <!-- ══════════════════════════════════════════════
         FINAL CTA
    ══════════════════════════════════════════════ -->
    <section class="final-cta-section">
      <div class="final-noise"></div>
      <div class="final-glow-left"></div>
      <div class="final-glow-right"></div>
      <div class="section-inner final-inner">
        <div class="final-eyebrow">🏆 Ready?</div>
        <h2 class="final-headline">
          Your league is already<br/>talking about it.<br/>
          <span class="final-accent">Be the one who started it.</span>
        </h2>
        <button class="cta-primary cta-xl" @click="$emit('open-signup')">
          Connect Your League Free
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <div class="final-trust">
          No credit card &nbsp;·&nbsp; Sleeper, Yahoo &amp; ESPN &nbsp;·&nbsp; Setup in 3 minutes
        </div>
      </div>
    </section>

        <!-- SEO: keyword-rich summary paragraph, visually hidden -->
        <p class="seo-hidden">
          Ultimate Fantasy Dashboard is the only fantasy sports analytics platform that works with
          Sleeper, ESPN, and Yahoo fantasy leagues — across football (NFL), basketball (NBA),
          baseball (MLB), and hockey (NHL). Get weekly fantasy power rankings, in-depth matchup
          analysis with win probability, complete league season history, fantasy draft grades,
          draft analysis with Points Above Replacement (PAR), trade analysis, and shareable
          stats cards for your group chat. Whether you run a redraft, keeper, or dynasty league,
          Ultimate Fantasy Dashboard gives you the data to back up every argument. Free to start.
        </p>
    <!-- Footer handled by AppFooter in App.vue -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineEmits<{ (e: 'open-signup'): void }>()

// ── Sport / Platform / Format Picker ────────────────────────────────────────
const sports = [
  { id: 'football',   name: 'Football',   emoji: '🏈' },
  { id: 'baseball',   name: 'Baseball',   emoji: '⚾' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'hockey',     name: 'Hockey',     emoji: '🏒' },
]
const platforms = [
  { id: 'sleeper', name: 'Sleeper', logo: '/sleeper.svg' },
  { id: 'yahoo',   name: 'Yahoo',   logo: '/yahoo-fantasy.svg' },
  { id: 'espn',    name: 'ESPN',    logo: '/espn-logo.svg' },
]
const formats = ['Points', 'Categories']

const selectedSport    = ref('football')
const selectedPlatform = ref('sleeper')
const selectedFormat   = ref('Points')

const activeSport    = computed(() => sports.find(s => s.id === selectedSport.value)!)
const activePlatform = computed(() => platforms.find(p => p.id === selectedPlatform.value)!)
const currentWeek    = computed(() => selectedSport.value === 'baseball' ? 18 : selectedSport.value === 'football' ? 11 : 14)

// Reset to valid format when sport changes (not needed now since both formats apply to all sports)
function ensureValidFormat() { /* both formats work for all sports */ }

// Category columns per sport
const categoryColumnsBySport: Record<string, string[]> = {
  football:   ['PTS', 'YDS', 'TD'],
  baseball:   ['HR',  'SB',  'ERA'],
  basketball: ['PTS', 'REB', 'AST'],
  hockey:     ['G',   'A',   'SOG'],
}
const activeCategoryColumns = computed(() => categoryColumnsBySport[selectedSport.value] ?? ['Cat1','Cat2','Cat3'])

// Teams per platform × sport
// Each team has: name, color, record (W-L), pts (PF), allPlay, catRecord (W-L-T), cats [3 cat win strings]
type PreviewTeam = {
  name: string; color: string; record: string; pts: string; allPlay: string
  catRecord: string; cats: string[]
}
const previewData: Record<string, Record<string, PreviewTeam[]>> = {
  sleeper: {
    football: [
      { name: 'Mahomes Magic',   color: 'linear-gradient(135deg,#eab308,#d97706)', record: '9-2', pts: '1,456', allPlay: '7-4',  catRecord: '9-2-0', cats: ['8-3','7-4','9-2'] },
      { name: 'Trash Can Wins',  color: 'linear-gradient(135deg,#10b981,#059669)', record: '8-3', pts: '1,342', allPlay: '8-3',  catRecord: '8-3-0', cats: ['7-4','8-3','6-5'] },
      { name: 'The Algorithm',   color: 'linear-gradient(135deg,#6366f1,#4f46e5)', record: '7-4', pts: '1,298', allPlay: '6-5',  catRecord: '7-3-1', cats: ['5-6','7-4','8-3'] },
      { name: 'Waiver Wire Kid', color: 'linear-gradient(135deg,#ef4444,#dc2626)', record: '6-5', pts: '1,187', allPlay: '5-6',  catRecord: '6-4-1', cats: ['6-5','5-6','4-7'] },
      { name: 'Toilet Bowl FC',  color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '3-8', pts: '982',   allPlay: '2-9',  catRecord: '3-8-0', cats: ['2-9','3-8','2-9'] },
    ],
    baseball: [
      { name: 'Dingers Only',       color: 'linear-gradient(135deg,#eab308,#d97706)', record: '9-1',  pts: '87.5', allPlay: '8-2',  catRecord: '9-1-0', cats: ['9-1','7-3','6-4'] },
      { name: 'ERA Zero',           color: 'linear-gradient(135deg,#06b6d4,#0891b2)', record: '7-3',  pts: '82.0', allPlay: '7-3',  catRecord: '7-3-0', cats: ['5-5','8-2','9-1'] },
      { name: 'Steals & Deals',     color: 'linear-gradient(135deg,#10b981,#059669)', record: '6-4',  pts: '78.5', allPlay: '5-5',  catRecord: '6-4-0', cats: ['7-3','6-4','4-6'] },
      { name: 'K-Rate Kings',       color: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', record: '5-5',  pts: '73.0', allPlay: '4-6',  catRecord: '5-5-0', cats: ['4-6','5-5','7-3'] },
      { name: 'Sub-.35 ERA or Bust',color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '2-8',  pts: '58.5', allPlay: '2-8',  catRecord: '2-8-0', cats: ['2-8','2-8','3-7'] },
    ],
    basketball: [
      { name: 'Triple Double',   color: 'linear-gradient(135deg,#eab308,#d97706)', record: '9-3',  pts: '1,234', allPlay: '9-3',  catRecord: '9-3-0', cats: ['8-4','9-3','7-5'] },
      { name: 'Giannis Mode',    color: 'linear-gradient(135deg,#ef4444,#dc2626)', record: '8-4',  pts: '1,189', allPlay: '8-4',  catRecord: '8-4-0', cats: ['7-5','8-4','9-3'] },
      { name: 'Points Only',     color: 'linear-gradient(135deg,#6366f1,#4f46e5)', record: '7-5',  pts: '1,102', allPlay: '6-6',  catRecord: '7-5-0', cats: ['9-3','6-6','5-7'] },
      { name: 'Bench Warmers',   color: 'linear-gradient(135deg,#10b981,#059669)', record: '6-6',  pts: '1,041', allPlay: '5-7',  catRecord: '6-6-0', cats: ['5-7','7-5','6-6'] },
      { name: 'Box Score Fraud', color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '4-8',  pts: '891',   allPlay: '3-9',  catRecord: '4-8-0', cats: ['4-8','3-9','4-8'] },
    ],
    hockey: [
      { name: 'Save % Kings',   color: 'linear-gradient(135deg,#eab308,#d97706)', record: '10-2', pts: '1,567', allPlay: '9-3',  catRecord: '10-2-0', cats: ['8-4','9-3','10-2'] },
      { name: 'Hat Trick City', color: 'linear-gradient(135deg,#06b6d4,#0891b2)', record: '8-4',  pts: '1,423', allPlay: '8-4',  catRecord: '8-3-1',  cats: ['9-3','7-5','8-4'] },
      { name: 'Power Play FC',  color: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', record: '7-5',  pts: '1,312', allPlay: '6-6',  catRecord: '7-5-0',  cats: ['7-5','8-4','6-6'] },
      { name: 'Empty Net Bros', color: 'linear-gradient(135deg,#10b981,#059669)', record: '5-7',  pts: '1,189', allPlay: '5-7',  catRecord: '5-6-1',  cats: ['5-7','5-7','7-5'] },
      { name: 'Penalty Box FC', color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '3-9',  pts: '978',   allPlay: '2-10', catRecord: '3-9-0',  cats: ['3-9','3-9','2-10'] },
    ],
  },
  yahoo: {
    football: [
      { name: 'Fantasy Felons',    color: 'linear-gradient(135deg,#7c3aed,#6d28d9)', record: '10-1', pts: '1,512', allPlay: '8-3',  catRecord: '10-1-0', cats: ['9-2','8-3','10-1'] },
      { name: 'Sunday Funday',     color: 'linear-gradient(135deg,#f97316,#ea580c)', record: '8-3',  pts: '1,398', allPlay: '7-4',  catRecord: '8-3-0',  cats: ['7-4','8-3','7-4'] },
      { name: 'Touch Down Town',   color: 'linear-gradient(135deg,#06b6d4,#0891b2)', record: '7-4',  pts: '1,276', allPlay: '6-5',  catRecord: '7-4-0',  cats: ['6-5','7-4','8-3'] },
      { name: 'No Kickers Needed', color: 'linear-gradient(135deg,#10b981,#059669)', record: '5-6',  pts: '1,144', allPlay: '5-6',  catRecord: '5-6-0',  cats: ['5-6','4-7','5-6'] },
      { name: 'IR\'d Out',         color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '2-9',  pts: '901',   allPlay: '1-10', catRecord: '2-9-0',  cats: ['2-9','2-9','1-10'] },
    ],
    baseball: [
      { name: 'Diamond Dogs',    color: 'linear-gradient(135deg,#7c3aed,#6d28d9)', record: '8-2',  pts: '91.0', allPlay: '8-2',  catRecord: '8-2-0', cats: ['8-2','7-3','9-1'] },
      { name: 'Swing Kings',     color: 'linear-gradient(135deg,#f97316,#ea580c)', record: '7-3',  pts: '84.5', allPlay: '6-4',  catRecord: '7-3-0', cats: ['6-4','8-2','7-3'] },
      { name: 'Launch Angle Lab',color: 'linear-gradient(135deg,#06b6d4,#0891b2)', record: '5-5',  pts: '76.0', allPlay: '5-5',  catRecord: '5-5-0', cats: ['5-5','4-6','6-4'] },
      { name: 'Bullpen Burners', color: 'linear-gradient(135deg,#10b981,#059669)', record: '4-6',  pts: '69.0', allPlay: '4-6',  catRecord: '4-6-0', cats: ['4-6','5-5','4-6'] },
      { name: 'WHIP It Good',    color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '1-9',  pts: '54.0', allPlay: '2-8',  catRecord: '1-9-0', cats: ['2-8','1-9','1-9'] },
    ],
    basketball: [
      { name: 'Dunk Tank',      color: 'linear-gradient(135deg,#7c3aed,#6d28d9)', record: '10-2', pts: '1,301', allPlay: '9-3',  catRecord: '10-2-0', cats: ['10-2','9-3','8-4'] },
      { name: 'Mid-Range Mafia',color: 'linear-gradient(135deg,#f97316,#ea580c)', record: '8-4',  pts: '1,198', allPlay: '8-4',  catRecord: '8-4-0',  cats: ['8-4','8-4','9-3'] },
      { name: 'Steal Happy',    color: 'linear-gradient(135deg,#06b6d4,#0891b2)', record: '7-5',  pts: '1,089', allPlay: '6-6',  catRecord: '7-5-0',  cats: ['7-5','6-6','7-5'] },
      { name: 'FG% or Bust',    color: 'linear-gradient(135deg,#10b981,#059669)', record: '5-7',  pts: '987',   allPlay: '5-7',  catRecord: '5-7-0',  cats: ['5-7','7-5','4-8'] },
      { name: 'Benchland',      color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '3-9',  pts: '876',   allPlay: '3-9',  catRecord: '3-9-0',  cats: ['3-9','2-10','4-8'] },
    ],
    hockey: [
      { name: 'Five Hole FC',   color: 'linear-gradient(135deg,#7c3aed,#6d28d9)', record: '9-3',  pts: '1,498', allPlay: '9-3',  catRecord: '9-3-0',  cats: ['9-3','8-4','9-3'] },
      { name: 'Zamboni Riders', color: 'linear-gradient(135deg,#f97316,#ea580c)', record: '8-4',  pts: '1,345', allPlay: '7-5',  catRecord: '8-4-0',  cats: ['8-4','9-3','7-5'] },
      { name: 'Breakaway Boys', color: 'linear-gradient(135deg,#06b6d4,#0891b2)', record: '6-6',  pts: '1,201', allPlay: '6-6',  catRecord: '6-6-0',  cats: ['6-6','6-6','8-4'] },
      { name: 'PP Specialists', color: 'linear-gradient(135deg,#10b981,#059669)', record: '5-7',  pts: '1,089', allPlay: '5-7',  catRecord: '5-6-1',  cats: ['5-7','5-7','6-6'] },
      { name: 'Icing All Day',  color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '2-10', pts: '912',   allPlay: '2-10', catRecord: '2-10-0', cats: ['2-10','3-9','2-10'] },
    ],
  },
  espn: {
    football: [
      { name: 'Gronk Spike FC',   color: 'linear-gradient(135deg,#e11d48,#be123c)', record: '9-2', pts: '1,487', allPlay: '8-3',  catRecord: '9-2-0', cats: ['8-3','9-2','7-4'] },
      { name: 'Scoreboard Watch', color: 'linear-gradient(135deg,#f97316,#ea580c)', record: '8-3', pts: '1,361', allPlay: '7-4',  catRecord: '8-3-0', cats: ['7-4','7-4','9-2'] },
      { name: 'Commissioner Veto',color: 'linear-gradient(135deg,#a855f7,#9333ea)', record: '6-5', pts: '1,241', allPlay: '6-5',  catRecord: '6-5-0', cats: ['6-5','6-5','6-5'] },
      { name: 'Garbage Time Guru',color: 'linear-gradient(135deg,#0ea5e9,#0284c7)', record: '5-6', pts: '1,129', allPlay: '4-7',  catRecord: '5-6-0', cats: ['4-7','5-6','5-6'] },
      { name: 'Punt the Season',  color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '2-9', pts: '944',   allPlay: '2-9',  catRecord: '2-9-0', cats: ['2-9','2-9','3-8'] },
    ],
    baseball: [
      { name: 'Clutch Factor',    color: 'linear-gradient(135deg,#e11d48,#be123c)', record: '8-2',  pts: '89.0', allPlay: '7-3',  catRecord: '8-2-0', cats: ['7-3','9-1','8-2'] },
      { name: 'Exit Velocity FC', color: 'linear-gradient(135deg,#f97316,#ea580c)', record: '7-3',  pts: '83.0', allPlay: '7-3',  catRecord: '7-3-0', cats: ['8-2','6-4','7-3'] },
      { name: 'OPS Kings',        color: 'linear-gradient(135deg,#a855f7,#9333ea)', record: '5-5',  pts: '74.5', allPlay: '5-5',  catRecord: '5-5-0', cats: ['5-5','5-5','5-5'] },
      { name: 'Five Tool Bros',   color: 'linear-gradient(135deg,#0ea5e9,#0284c7)', record: '4-6',  pts: '67.0', allPlay: '4-6',  catRecord: '4-6-0', cats: ['3-7','4-6','4-6'] },
      { name: 'BABIP Believers',  color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '1-9',  pts: '51.0', allPlay: '1-9',  catRecord: '1-9-0', cats: ['2-8','1-9','1-9'] },
    ],
    basketball: [
      { name: 'Zion Mode',         color: 'linear-gradient(135deg,#e11d48,#be123c)', record: '9-3',  pts: '1,289', allPlay: '10-2', catRecord: '9-3-0',  cats: ['10-2','9-3','8-4'] },
      { name: 'Three Point Land',  color: 'linear-gradient(135deg,#f97316,#ea580c)', record: '8-4',  pts: '1,201', allPlay: '7-5',  catRecord: '8-4-0',  cats: ['8-4','7-5','9-3'] },
      { name: 'Lottery Pick FC',   color: 'linear-gradient(135deg,#a855f7,#9333ea)', record: '7-5',  pts: '1,099', allPlay: '6-6',  catRecord: '7-5-0',  cats: ['6-6','8-4','7-5'] },
      { name: 'Trade Deadline All',color: 'linear-gradient(135deg,#0ea5e9,#0284c7)', record: '5-7',  pts: '982',   allPlay: '5-7',  catRecord: '5-7-0',  cats: ['5-7','6-6','5-7'] },
      { name: 'DNP Status',        color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '3-9',  pts: '844',   allPlay: '2-10', catRecord: '3-9-0',  cats: ['3-9','2-10','3-9'] },
    ],
    hockey: [
      { name: 'Brodeur\'s Legacy', color: 'linear-gradient(135deg,#e11d48,#be123c)', record: '10-2', pts: '1,612', allPlay: '10-2', catRecord: '10-2-0', cats: ['10-2','9-3','10-2'] },
      { name: 'Slap Shot Kings',   color: 'linear-gradient(135deg,#f97316,#ea580c)', record: '8-4',  pts: '1,401', allPlay: '8-4',  catRecord: '8-4-0',  cats: ['8-4','8-4','8-4'] },
      { name: 'PPG All Day',       color: 'linear-gradient(135deg,#a855f7,#9333ea)', record: '7-5',  pts: '1,287', allPlay: '7-5',  catRecord: '7-4-1',  cats: ['7-5','7-5','6-6'] },
      { name: 'Enforcers Only',    color: 'linear-gradient(135deg,#0ea5e9,#0284c7)', record: '5-7',  pts: '1,102', allPlay: '5-7',  catRecord: '5-7-0',  cats: ['5-7','5-7','6-6'] },
      { name: 'Offsides Again',    color: 'linear-gradient(135deg,#6b7280,#4b5563)', record: '2-10', pts: '934',   allPlay: '2-10', catRecord: '2-10-0', cats: ['2-10','3-9','2-10'] },
    ],
  },
}

const previewTeams = computed<PreviewTeam[]>(() =>
  previewData[selectedPlatform.value]?.[selectedSport.value] ?? previewData.sleeper.football
)

// ── Gallery ─────────────────────────────────────────────────────────────────
const galleryFilters = [
  { id: 'all',            label: 'All Cards' },
  { id: 'power-rankings', label: '⚡ Power Rankings' },
  { id: 'matchup',        label: '⚔️ Matchups' },
  { id: 'standings',      label: '🏆 Standings' },
  { id: 'history',        label: '📜 History' },
  { id: 'draft',          label: '📋 Draft Analysis' },
]
const activeGalleryFilter = ref('all')

const galleryCards = [
  // ── Power Rankings: table ──────────────────────────────────────────────────
  {
    id: 1, type: 'power-rankings', size: 'card-tall',
    week: 11,
    teams: [
      { name: 'Mahomes Magic',   score: 92, trend: 2,  pscore: '87.4', record: '9-2' },
      { name: 'Trash Can Wins',  score: 78, trend: -1, pscore: '74.1', record: '8-3' },
      { name: 'The Algorithm',   score: 66, trend:  0, pscore: '68.9', record: '7-4' },
      { name: 'Waiver Wire Kid', score: 55, trend:  1, pscore: '61.2', record: '6-5' },
      { name: 'Toilet Bowl FC',  score: 38, trend: -2, pscore: '44.8', record: '3-8' },
    ],
  },
  // ── Power Rankings: line graph ─────────────────────────────────────────────
  {
    id: 2, type: 'pr-chart', size: 'card-normal',
    week: 11,
    // week-by-week rank (1=best) for each team — lower is better → invert on render
    teams: [
      { name: 'Mahomes Magic',   color: '#eab308', ranks: [3,2,1,1,1,2,1,1,2,1,1] },
      { name: 'Trash Can Wins',  color: '#10b981', ranks: [1,1,2,3,2,1,2,2,1,2,2] },
      { name: 'The Algorithm',   color: '#6366f1', ranks: [2,3,3,2,3,3,3,3,3,3,3] },
      { name: 'Waiver Wire Kid', color: '#f97316', ranks: [4,5,4,4,4,4,4,4,4,4,4] },
      { name: 'Toilet Bowl FC',  color: '#6b7280', ranks: [5,4,5,5,5,5,5,5,5,5,5] },
    ],
  },
  // ── Matchups: win probability card ────────────────────────────────────────
  {
    id: 3, type: 'win-prob', size: 'card-normal',
    week: 11, sportLabel: '🏈 NFL Fantasy · PPR',
    team1: 'Mahomes Magic', t1color: '#06b6d4', t1pts: 142.7, t1proj: 161.4, t1prob: 64.2, t1rec: '9-2',
    team2: 'The Algorithm', t2color: '#f97316', t2pts:  98.4, t2proj: 127.8, t2prob: 35.8, t2rec: '7-4',
  },
  // ── Matchups: win probability trend Mon–Sun ────────────────────────────────
  {
    id: 4, type: 'win-prob-chart', size: 'card-normal',
    week: 11, sportLabel: '🏈 NFL Fantasy · PPR',
    team1: 'Mahomes Magic', t1color: '#06b6d4',
    team2: 'The Algorithm', t2color: '#f97316',
    // Mon–Sun win probability for team1 — dramatic crossover story
    days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    probs: [60.4, 56.6, 47.0, 53.0, 39.4, 27.3, 0],
  },
  // ── Standings ─────────────────────────────────────────────────────────────
  {
    id: 5, type: 'standings', size: 'card-tall',
    sportLabel: '🏈 NFL Fantasy · PPR', week: 11,
    teams: [
      { name: 'Mahomes Magic',  wins: 9, losses: 2, pf: '1,456', streak: 'W3', playoff: true,  myTeam: true  },
      { name: 'Trash Can Wins', wins: 8, losses: 3, pf: '1,342', streak: 'W2', playoff: true,  myTeam: false },
      { name: 'The Algorithm',  wins: 7, losses: 4, pf: '1,298', streak: 'L1', playoff: true,  myTeam: false },
      { name: 'Waiver Wire Kid',wins: 6, losses: 5, pf: '1,187', streak: 'W1', playoff: false, myTeam: false },
      { name: 'Bench Boss',     wins: 5, losses: 6, pf: '1,102', streak: 'L2', playoff: false, myTeam: false },
      { name: 'Toilet Bowl FC', wins: 3, losses: 8, pf: '982',   streak: 'L4', playoff: false, myTeam: false },
    ],
  },
  // ── History: season-by-season standings ───────────────────────────────────
  {
    id: 6, type: 'history-standings', size: 'card-tall',
    sportLabel: '🏈 NFL Fantasy · PPR',
    seasons: ['2021','2022','2023','2024'],
    teams: [
      { name: 'Mahomes Magic',  color: '#eab308', finishes: [2,1,1,1] },
      { name: 'Trash Can Wins', color: '#10b981', finishes: [1,3,2,2] },
      { name: 'The Algorithm',  color: '#6366f1', finishes: [3,2,4,3] },
      { name: 'Waiver Wire Kid',color: '#f97316', finishes: [5,4,3,4] },
      { name: 'Toilet Bowl FC', color: '#6b7280', finishes: [6,6,6,6] },
    ],
  },
  // ── History: H2H matrix ───────────────────────────────────────────────────
  {
    id: 7, type: 'h2h-matrix', size: 'card-tall',
    sportLabel: '🏈 NFL Fantasy · PPR',
    teams: ['MM','TC','TA','WK','BB','TB'],
    fullNames: ['Mahomes Magic','Trash Can Wins','The Algorithm','Waiver Wire Kid','Bench Boss','Toilet Bowl FC'],
    colors: ['#eab308','#10b981','#6366f1','#f97316','#06b6d4','#6b7280'],
    // each row: this team's record vs every col team (null = self)
    records: [
      [null,  '3-1', '4-0', '3-1', '4-0', '4-0'],
      ['1-3',  null, '3-1', '3-1', '4-0', '4-0'],
      ['0-4', '1-3',  null, '3-1', '3-1', '3-1'],
      ['1-3', '1-3', '1-3',  null, '2-2', '3-1'],
      ['0-4', '0-4', '1-3', '2-2',  null, '3-1'],
      ['0-4', '0-4', '1-3', '1-3', '1-3',  null],
    ],
  },
  // ── History: legacy standings ─────────────────────────────────────────────
  {
    id: 8, type: 'legacy', size: 'card-tall',
    sportLabel: '🏈 NFL Fantasy · PPR',
    teams: [
      { name: 'Mahomes Magic',  score: 1847, seasons: 4, champs: 2, playoffs: 4, color: '#eab308', myTeam: true  },
      { name: 'Trash Can Wins', score: 1623, seasons: 4, champs: 1, playoffs: 3, color: '#10b981', myTeam: false },
      { name: 'The Algorithm',  score: 1401, seasons: 4, champs: 0, playoffs: 3, color: '#6366f1', myTeam: false },
      { name: 'Waiver Wire Kid',score: 1198, seasons: 4, champs: 1, playoffs: 2, color: '#f97316', myTeam: false },
      { name: 'Bench Boss',     score:  987, seasons: 4, champs: 0, playoffs: 1, color: '#06b6d4', myTeam: false },
      { name: 'Toilet Bowl FC', score:  612, seasons: 4, champs: 0, playoffs: 0, color: '#6b7280', myTeam: false },
    ],
  },
  // ── Trade Analysis ────────────────────────────────────────────────────────
  {
    id: 9, type: 'draft-grades', size: 'card-normal',
    sportLabel: '🏈 NFL Fantasy · PPR',
    picks: [
      { round: 1, pick: 3,  name: 'Justin Jefferson',    pos: 'WR', par: 42.1, grade: 'A+' },
      { round: 2, pick: 14, name: 'Davante Adams',        pos: 'WR', par: 18.7, grade: 'A'  },
      { round: 3, pick: 27, name: 'Tony Pollard',         pos: 'RB', par: -4.2, grade: 'C'  },
      { round: 4, pick: 38, name: 'Travis Kelce',         pos: 'TE', par: 31.4, grade: 'A+' },
      { round: 5, pick: 51, name: 'Stefon Diggs',         pos: 'WR', par: -11.8, grade: 'D' },
    ],
    teamGrade: 'A',
    teamName: 'Mahomes Magic',
  },
  {
    id: 10, type: 'draft-board', size: 'card-tall',
    sportLabel: '🏈 NFL Fantasy · PPR',
    rounds: [
      { pick: '1.03', name: 'Justin Jefferson',    pos: 'WR', grade: 'A+', trend: 'up'   },
      { pick: '2.02', name: 'Davante Adams',        pos: 'WR', grade: 'A',  trend: 'up'   },
      { pick: '3.03', name: 'Tony Pollard',         pos: 'RB', grade: 'C',  trend: 'dn'   },
      { pick: '4.02', name: 'Travis Kelce',         pos: 'TE', grade: 'A+', trend: 'up'   },
      { pick: '5.03', name: 'Stefon Diggs',         pos: 'WR', grade: 'D',  trend: 'dn'   },
      { pick: '6.02', name: 'Rhamondre Stevenson',  pos: 'RB', grade: 'B',  trend: 'flat' },
      { pick: '7.03', name: 'DeVonta Smith',        pos: 'WR', grade: 'B+', trend: 'up'   },
    ],
    teamGrade: 'A',
    teamName: 'Mahomes Magic',
  },
]

const filteredCards = computed(() =>
  activeGalleryFilter.value === 'all'
    ? galleryCards
    : galleryCards.filter(c => c.type === activeGalleryFilter.value ||
        (activeGalleryFilter.value === 'power-rankings' && c.type === 'pr-chart') ||
        (activeGalleryFilter.value === 'matchup'  && (c.type === 'win-prob' || c.type === 'win-prob-chart')) ||
        (activeGalleryFilter.value === 'history'  && (c.type === 'history-standings' || c.type === 'h2h-matrix' || c.type === 'legacy')) ||
        (activeGalleryFilter.value === 'draft' && (c.type === 'draft-grades' || c.type === 'draft-board'))
      )
)

// ── Chat messages ────────────────────────────────────────────────────────────
const chatMessages = [
  { id: 1, name: 'Chad', context: 'Dynasty League · Sleeper', text: 'bro how do you have my stats going back to 2019??? this is genuinely terrifying', reaction: '😭', side: 'left' },
  { id: 2, name: 'Commissioner Mike', context: '12-team PPR · Yahoo', text: 'these power rankings are going to CAUSE PROBLEMS in the group chat and i am here for it', reaction: '💀', side: 'right' },
  { id: 3, name: 'Jessica', context: '10-team Keeper · ESPN', text: 'the share cards are actually insane. i sent one and now the entire league wants access', reaction: '🔥', side: 'left' },
  { id: 4, name: 'Taylor', context: '8-year league · Sleeper', text: 'finally something that makes my commish work look professional instead of just a google sheet', reaction: '👑', side: 'right' },
  { id: 5, name: 'Darnell', context: 'H2H Categories · Yahoo', text: 'the weekly recap card hit the group chat at 9am monday and our whole office is still arguing about it', reaction: '😂', side: 'left' },
  { id: 6, name: 'Rob', context: 'Redraft · Sleeper', text: 'i have been commish for 7 years and this is the first tool that actually makes running the league fun', reaction: '🙌', side: 'right' },
]

// ── FAQ ──────────────────────────────────────────────────────────────────────
const openFaq = ref<number | null>(null)
const faqs = [
  {
    q: 'Does it work with my existing Sleeper / Yahoo / ESPN league?',
    a: 'Yes — just paste your league link or connect your account. We support all three platforms across football, baseball, basketball, and hockey. No setup required on your league end.',
  },
  {
    q: 'Do all my league mates need to sign up?',
    a: 'Nope. Only the person connecting the league needs an account. You can share cards and recaps with your whole league without them needing to log in.',
  },
  {
    q: 'How do I share the cards?',
    a: 'Every card has a Share button. Hit it, and the card gets automatically copied to your clipboard as an image. Then just paste it straight into your league group chat. That\'s it.',
  },
  {
    q: 'Will it ruin the trash talk?',
    a: 'No. It feeds it. When Mahomes Magic drops a power rankings card showing they\'ve been #1 for six straight weeks, the group chat writes itself.',
  },
  {
    q: 'Is this just for commissioners?',
    a: 'Not even close. It\'s built by fantasy managers, for fantasy managers. If you care about knowing your league better, clowning on your friends with data, or just seeing your stats go back years — this is for you.',
  },
  {
    q: 'How current is the data?',
    a: 'Standings, matchup scores, and rosters update throughout the week. Power rankings and weekly recaps generate automatically after each week locks.',
  },
  {
    q: 'Can I connect multiple leagues?',
    a: 'Yes. You can connect leagues across different platforms and sports in the same dashboard. Manage your dynasty, redraft, and keeper all in one place.',
  },
]

function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}

// ── SVG chart helpers ────────────────────────────────────────────────────────
// Smooth catmull-rom style cubic bezier for rank trend lines
// xStart: first x, xStep: pixels per week, yStart: y offset for rank 1, yStep: y per rank
function smoothPath(ranks: number[], xStart: number, xStep: number, yStep: number, yStart: number): string {
  if (!ranks || ranks.length < 2) return ''
  const pts = ranks.map((r, i) => ({ x: xStart + i * xStep, y: yStart + (r - 1) * yStep }))
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cpOffset = (curr.x - prev.x) * 0.45
    d += ` C ${prev.x + cpOffset},${prev.y} ${curr.x - cpOffset},${curr.y} ${curr.x},${curr.y}`
  }
  return d
}

// Smooth bezier line path for win-prob chart
function wpcLinePath(probs: number[], x0: number, xStep: number, yBase: number, yScale: number, invert: boolean): string {
  const pts = probs.map((p, i) => ({
    x: x0 + i * xStep,
    y: yBase - ((invert ? 100 - p : p) / 100) * yScale
  }))
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]
    const curr = pts[i]
    const cp = (curr.x - prev.x) * 0.4
    d += ` C ${prev.x + cp},${prev.y} ${curr.x - cp},${curr.y} ${curr.x},${curr.y}`
  }
  return d
}

// Area fill path (line + close to bottom)
function wpcAreaPath(probs: number[], x0: number, xStep: number, yBase: number, yScale: number, invert: boolean): string {
  const line = wpcLinePath(probs, x0, xStep, yBase, yScale, invert)
  if (!line) return ''
  const lastX = x0 + (probs.length - 1) * xStep
  return `${line} L ${lastX},${yBase} L ${x0},${yBase} Z`
}

// ── Utils ────────────────────────────────────────────────────────────────────
function cardLink(card: any): string | null {
  const map: Record<string, string> = {
    'power-rankings': '/powerrankings',
    'pr-chart':       '/powerrankings',
    'win-prob':       '/matchups',
    'win-prob-chart': '/matchups',
    'standings':      '/history',
    'history-standings': '/history',
    'h2h-matrix':     '/history',
    'legacy':         '/history',
    'draft-grades':   '/draft',
    'draft-board':    '/draft',
  }
  return map[card.type] || null
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
/* ── Fonts ─────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');

/* ── Root ──────────────────────────────────────────────────────── */
.landing-root {
  font-family: 'Barlow', sans-serif;
  background: #05060a;
  color: #e5e7eb;
  overflow-x: hidden;
}

/* ── Shared section styles ─────────────────────────────────────── */
.section-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
.section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #eab308;
  margin-bottom: 12px;
}
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 900;
  line-height: 1.05;
  color: #fff;
  margin-bottom: 16px;
}
.section-sub {
  font-size: 1.05rem;
  color: #9ca3af;
  margin-bottom: 40px;
  max-width: 560px;
}
.accent { color: #eab308; }
.yellow { color: #eab308; }
.red { color: #ef4444; }
.muted { color: #6b7280; }

/* ── CTAs ──────────────────────────────────────────────────────── */
.cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: #eab308;
  color: #0a0c14;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}
.cta-primary:hover { background: #fbbf24; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(234,179,8,0.35); }
.cta-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 14px 24px;
  background: transparent;
  color: #9ca3af;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  border: 1px solid #2a2d3a;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}
.cta-ghost:hover { color: #fff; border-color: #4b5563; }
.cta-xl { padding: 18px 40px; font-size: 1.25rem; }
.mt-6 { margin-top: 24px; }

/* ── Noise / texture ───────────────────────────────────────────── */
.noise-overlay, .gallery-noise, .proof-noise, .final-noise {
  position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}

/* ══════════════════════════════════════════════
   HERO
══════════════════════════════════════════════ */
.hero-section {
  position: relative;
  padding: 80px 0 0;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(234,179,8,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(234,179,8,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}
.hero-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 600px;
  background: radial-gradient(ellipse, rgba(234,179,8,0.08) 0%, transparent 70%);
  pointer-events: none;
}
.hero-inner {
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 24px 0;
  text-align: center;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.hero-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(3.5rem, 9vw, 7rem);
  font-weight: 900;
  line-height: 0.95;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  margin-bottom: 24px;
}
.headline-accent {
  color: #eab308;
  display: block;
  text-shadow: 0 0 80px rgba(234,179,8,0.4);
}

.hero-sub {
  font-size: 1.15rem;
  color: #9ca3af;
  max-width: 580px;
  margin: 0 auto 36px;
  line-height: 1.65;
}
.hero-sub em { color: #fff; font-style: normal; font-weight: 600; }

.hero-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
  margin-bottom: 24px;
}

.trust-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 64px;
}
.trust-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  color: #6b7280;
}
.trust-item svg { color: #eab308; }
.trust-sep { color: #374151; }

/* ── Logo ─────────────────────────────────────────────────────── */
.hero-logo-wrap {
  margin-bottom: 32px;
  text-align: center;
  width: 100%;
  display: flex;
  justify-content: center;
}
.hero-logo {
  height: 100px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 0 30px rgba(234,179,8,0.2));
}

/* ── Authentic App UI Panels ─────────────────────────────────── */
.hero-cards-row {
  display: grid;
  grid-template-columns: 1.05fr 1fr 1.05fr;
  gap: 16px;
  max-width: 1100px;
  margin: 0 auto;
  align-items: start;
}
/* Base panel — exact app card visual */
.app-panel {
  background: linear-gradient(135deg, rgba(19,22,32,0.98), rgba(10,12,20,0.98));
  border: 1px solid #1e2130;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
  font-size: 0.75rem;
}
.hc-left  { transform: rotate(-1.5deg) translateY(12px); }
.hc-right { transform: rotate(1.5deg) translateY(12px); }
.hc-center {
  border-color: rgba(234,179,8,0.25);
  box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 50px rgba(234,179,8,0.07);
}

/* Panel header — matches card-header from style.css */
.ap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #1e2130;
}
.ap-header-left { display: flex; align-items: center; gap: 8px; }
.ap-icon { font-size: 1rem; }
.ap-title { font-family: 'Barlow', sans-serif; font-size: 0.85rem; font-weight: 700; color: #e5e7eb; }
.ap-badge-week {
  font-size: 0.65rem; font-weight: 600; color: #9ca3af;
  background: #1e2130; border-radius: 4px; padding: 2px 7px;
}

/* ─ Power Rankings table (matches app exactly) */
.ap-table-head {
  display: grid;
  grid-template-columns: 28px 20px 1fr 80px 40px;
  gap: 6px;
  padding: 6px 16px;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #4b5563;
  border-bottom: 1px solid #1a1d28;
}
.apt-row {
  display: grid;
  grid-template-columns: 28px 20px 1fr 80px 40px;
  gap: 6px;
  align-items: center;
  padding: 7px 16px;
  border-bottom: 1px solid #1a1d28;
  transition: background 0.15s;
}
.apt-row:last-of-type { border-bottom: none; }
.my-team-row { background: rgba(234,179,8,0.06); }

.apt-rank-circle {
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #1e2130;
  color: #9ca3af;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.7rem;
  display: flex; align-items: center; justify-content: center;
}
.rank-1 { background: rgba(234,179,8,0.15); color: #eab308; }

.apt-chg { font-family: 'Barlow Condensed', sans-serif; font-size: 0.7rem; font-weight: 700; }
.apt-chg.up   { color: #10b981; }
.apt-chg.down { color: #ef4444; }
.apt-chg.flat { color: #374151; }

.apt-team-cell { display: flex; align-items: center; gap: 6px; min-width: 0; }
.apt-avatar {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.55rem; font-weight: 700;
  border: 2px solid #2a2d3a; position: relative;
  color: #fff;
}
.apt-avatar-yellow { background: linear-gradient(135deg,#eab308,#d97706); border-color: #eab308 !important; }
.apt-avatar-blue   { background: linear-gradient(135deg,#3b82f6,#2563eb); }
.apt-avatar-purple { background: linear-gradient(135deg,#8b5cf6,#7c3aed); }
.apt-avatar-green  { background: linear-gradient(135deg,#10b981,#059669); }
.apt-avatar-red    { background: linear-gradient(135deg,#ef4444,#dc2626); }
.apt-avatar-gray   { background: linear-gradient(135deg,#6b7280,#4b5563); }
.apt-my-star {
  position: absolute; top: -3px; right: -3px;
  width: 9px; height: 9px; border-radius: 50%;
  background: #eab308; color: #0a0c14;
  font-size: 5px; display: flex; align-items: center; justify-content: center;
}
.apt-name { font-size: 0.72rem; color: #e5e7eb; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.apt-name.my-name { color: #eab308; }

.apt-bar-wrap { display: flex; align-items: center; gap: 4px; }
.apt-bar {
  height: 5px; border-radius: 3px; flex-shrink: 0;
  background: linear-gradient(90deg, #22c55e, #16a34a);
  width: 0; /* set inline */
}
.apt-bar-dim { background: #2a2d3a; }
.apt-bar-val { font-family: 'Barlow Condensed', sans-serif; font-size: 0.7rem; font-weight: 700; color: #22c55e; white-space: nowrap; }
.apt-bar-val.dim { color: #4b5563; }
.apt-rec-val { font-size: 0.68rem; color: #e5e7eb; text-align: right; }
.apt-rec-val.dim { color: #4b5563; }
.ap-footer-link {
  padding: 8px 16px;
  font-size: 0.65rem;
  color: #22c55e;
  border-top: 1px solid #1a1d28;
  font-weight: 600;
}

/* ─ Matchup cards (center panel — matches PointsMatchupCard) */
.apm-card {
  padding: 12px 16px;
  border-bottom: 1px solid #1a1d28;
}
.apm-card:last-of-type { border-bottom: none; }
.apm-mine { background: rgba(234,179,8,0.04); }

.apm-top-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 8px;
}
.apm-label { font-size: 0.6rem; font-weight: 700; letter-spacing: 0.08em; color: #4b5563; text-transform: uppercase; }
.apm-status { font-size: 0.62rem; font-weight: 700; padding: 2px 7px; border-radius: 999px; }
.apm-status.live { background: rgba(16,185,129,0.15); color: #10b981; animation: pulse-dot 2s infinite; }
.apm-status.final { background: #1e2130; color: #6b7280; }
.apm-status.upcoming { background: rgba(59,130,246,0.15); color: #60a5fa; }

.apm-team-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 5px;
}
.apm-team-info { display: flex; align-items: center; gap: 8px; }
.apm-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6rem; font-weight: 700; color: #fff;
  border: 2px solid transparent; flex-shrink: 0; position: relative;
}
.apm-av-yellow { background: linear-gradient(135deg,#eab308,#d97706); }
.apm-av-blue   { background: linear-gradient(135deg,#3b82f6,#2563eb); }
.apm-av-green  { background: linear-gradient(135deg,#10b981,#059669); }
.apm-av-red    { background: linear-gradient(135deg,#ef4444,#dc2626); }
.apm-av-purple { background: linear-gradient(135deg,#8b5cf6,#7c3aed); }
.apm-av-gray   { background: linear-gradient(135deg,#6b7280,#4b5563); }
.ring-yellow { border-color: #eab308 !important; }
.ring-green  { border-color: #10b981 !important; }
.ring-dark   { border-color: #2a2d3a; }
.apm-star {
  position: absolute; top: -3px; right: -3px;
  width: 10px; height: 10px; border-radius: 50%;
  background: #eab308; color: #0a0c14;
  font-size: 6px; display: flex; align-items: center; justify-content: center;
}
.apm-name { font-size: 0.75rem; font-weight: 600; color: #e5e7eb; }
.apm-name.mine   { color: #eab308; }
.apm-name.winner { color: #10b981; }
.apm-name.loser  { color: #6b7280; }
.apm-record { font-size: 0.62rem; color: #6b7280; }

.apm-score { font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 900; }
.mine-score   { color: #eab308; }
.winner-score { color: #10b981; }
.dim-score    { color: #4b5563; }

.apm-prob-bar { height: 3px; background: #1a1d28; border-radius: 2px; overflow: hidden; margin: 8px 0 4px; }
.apm-prob-fill { height: 100%; background: linear-gradient(90deg, #eab308, #fbbf24); border-radius: 2px; }
.apm-prob-row { display: flex; align-items: center; gap: 4px; }
.apm-prob-pct { font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 700; color: #eab308; }
.apm-prob-label { font-size: 0.65rem; color: #6b7280; }

/* ─ Season Overview panel (right) */
.aso-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #1a1d28;
}
.aso-stat {
  background: #1a1d28;
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.aso-stat-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.9rem; margin-bottom: 4px; }
.aso-stat-val { font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 900; color: #e5e7eb; line-height: 1; }
.aso-stat-val.aso-truncate { font-size: 0.72rem; }
.aso-stat-lbl { font-size: 0.6rem; color: #6b7280; }

.aso-leaders-header {
  padding: 10px 16px 6px;
  font-size: 0.7rem;
  font-weight: 700;
  color: #9ca3af;
  border-bottom: 1px solid #1a1d28;
}
.aso-leaders-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}
.aso-leader {
  padding: 10px 16px;
  border-bottom: 1px solid #1a1d28;
  border-right: 1px solid #1a1d28;
}
.aso-leader:nth-child(even) { border-right: none; }
.aso-leader:nth-child(3), .aso-leader:nth-child(4) { border-bottom: none; }
.aso-leader-top { display: flex; align-items: center; gap: 5px; margin-bottom: 4px; }
.aso-leader-lbl { font-size: 0.6rem; color: #6b7280; font-weight: 600; }
.aso-leader-name { font-size: 0.72rem; font-weight: 700; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.aso-leader-sub { font-size: 0.62rem; margin-top: 2px; font-weight: 600; }
.aso-leader-sub.green  { color: #10b981; }
.aso-leader-sub.red    { color: #ef4444; }
.aso-leader-sub.blue   { color: #60a5fa; }
.aso-leader-sub.purple { color: #a78bfa; }

/* ══════════════════════════════════════════════
   PICKER SECTION
══════════════════════════════════════════════ */
.picker-section {
  padding: 100px 0 80px;
  background: linear-gradient(180deg, #05060a 0%, #0a0c18 50%, #05060a 100%);
}
.picker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-bottom: 40px;
}
.picker-step { }
.picker-step-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 12px;
}
.step-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.65rem;
  font-weight: 900;
  color: #eab308;
  border: 1px solid rgba(234,179,8,0.3);
  padding: 1px 5px;
  border-radius: 3px;
}
.picker-options { display: flex; flex-wrap: wrap; gap: 8px; }
.picker-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid #1e2130;
  border-radius: 8px;
  color: #6b7280;
  font-family: 'Barlow', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.picker-option:hover { border-color: #374151; color: #d1d5db; }
.picker-option.active { background: rgba(234,179,8,0.1); border-color: rgba(234,179,8,0.4); color: #eab308; }
.picker-emoji { font-size: 1rem; }

/* Platform button with logo */
.picker-option-platform { gap: 8px; }
.platform-btn-logo {
  width: 18px; height: 18px;
  object-fit: contain; flex-shrink: 0;
  filter: grayscale(1) brightness(0.6);
  transition: filter 0.15s;
}
.picker-option.active .platform-btn-logo { filter: none; }
.picker-option:hover .platform-btn-logo  { filter: grayscale(0.3) brightness(0.8); }

/* Preview area */
.picker-preview { text-align: center; }

.preview-badge-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  background: rgba(234,179,8,0.08);
  border: 1px solid rgba(234,179,8,0.2);
  border-radius: 999px;
  margin-bottom: 20px;
}
.preview-platform-logo {
  width: 18px; height: 18px;
  object-fit: contain; flex-shrink: 0;
}
.preview-badge {
  font-size: 0.78rem; color: #eab308; font-weight: 600;
}

/* Preview card — authentic app card style */
.preview-card {
  background: linear-gradient(135deg, rgba(19,22,32,0.98), rgba(10,12,20,0.98));
  border: 1px solid #1e2130;
  border-radius: 16px;
  overflow: hidden;
  max-width: 680px;
  margin: 0 auto;
}
/* Card header row */
.preview-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #1e2130;
}
.preview-header-left { display: flex; align-items: center; gap: 8px; }
.preview-header-logo {
  width: 22px; height: 22px;
  object-fit: contain; flex-shrink: 0;
}
.preview-title {
  font-family: 'Barlow', sans-serif;
  font-size: 0.9rem; font-weight: 700; color: #e5e7eb;
}
.preview-week { font-size: 0.75rem; color: #4b5563; }

/* Table thead */
.preview-thead {
  display: grid;
  align-items: center;
  gap: 8px;
  padding: 7px 20px;
  border-bottom: 1px solid #1a1d28;
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: #374151;
}
.thead-pts { grid-template-columns: 24px 1fr 52px 64px 64px; }
.thead-cat { grid-template-columns: 24px 1fr 56px 48px 48px 48px; }
.pth-rank  { text-align: right; }
.pth-team  { text-align: left; }
.pth-rec   { text-align: center; }
.pth-col   { text-align: center; }
.pth-cat   { text-align: center; color: #4b5563; }

/* Rows */
.preview-rank-row {
  display: grid;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  border-bottom: 1px solid #1a1d28;
  transition: background 0.1s;
}
.preview-rank-row:last-of-type { border-bottom: none; }
.row-pts { grid-template-columns: 24px 1fr 52px 64px 64px; }
.row-cat { grid-template-columns: 24px 1fr 56px 48px 48px 48px; }
.row-first { background: rgba(234,179,8,0.04); }

.prev-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.9rem; color: #4b5563; text-align: right;
}
.prev-rank.gold   { color: #eab308; }
.prev-rank.silver { color: #9ca3af; }
.prev-rank.bronze { color: #b45309; }

.prev-team-cell { display: flex; align-items: center; gap: 8px; min-width: 0; }
.prev-avatar {
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.55rem; font-weight: 700; color: #fff;
  border: 1.5px solid rgba(255,255,255,0.1);
}
.prev-name { font-size: 0.82rem; color: #d1d5db; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prev-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 700; color: #9ca3af; text-align: center;
}
.prev-record.cat-rec { font-size: 0.72rem; }
.prev-pts {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 700; color: #9ca3af; text-align: center;
}
.prev-allplay {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; color: #6b7280; text-align: center;
}
.prev-cat {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 700; color: #6b7280; text-align: center;
}
.row-first .prev-cat { color: #9ca3af; }
.row-first .prev-record { color: #e5e7eb; }
.row-first .prev-pts { color: #eab308; }


/* ══════════════════════════════════════════════
   GALLERY SECTION
══════════════════════════════════════════════ */
.gallery-section {
  position: relative;
  padding: 100px 0;
  background: #08090f;
  overflow: hidden;
}
.gallery-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 36px;
}
.gallery-filter {
  padding: 7px 16px;
  background: transparent;
  border: 1px solid #1e2130;
  border-radius: 6px;
  color: #6b7280;
  font-family: 'Barlow', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.gallery-filter:hover { border-color: #374151; color: #d1d5db; }
.gallery-filter.active { background: rgba(234,179,8,0.1); border-color: rgba(234,179,8,0.4); color: #eab308; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}
.share-card { }

/* ══════════════════════════════════════════════
   SHARE CARDS — authentic UFD output style
══════════════════════════════════════════════ */
.sc-card {
  border-radius: 14px;
  overflow: hidden;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  font-family: 'Barlow', sans-serif;
}
.sc-card:hover { transform: scale(1.02) rotate(-0.4deg); box-shadow: 0 20px 60px rgba(0,0,0,0.6); }

/* Brand header row on every card */
.sc-brand-row {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px 8px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.sc-brand-logo {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.65rem; font-weight: 900;
  color: #eab308;
  letter-spacing: 0.08em;
  background: rgba(234,179,8,0.08);
  border: 1px solid rgba(234,179,8,0.2);
  border-radius: 4px;
  padding: 1px 5px;
}
.sc-brand-sport { font-size: 0.65rem; font-weight: 600; color: #6b7280; flex: 1; }
.sc-brand-week  { font-size: 0.6rem; color: #374151; font-weight: 700; letter-spacing: 0.08em; }
.sc-watermark   { font-size: 0.55rem; color: #1e2130; font-weight: 500; padding: 6px 16px; font-family: 'Barlow', sans-serif; }

/* ─ Power Rankings card */
.sc-pr-card {
  background: linear-gradient(145deg, #0c0f1a 0%, #0f1220 100%);
  border: 1px solid rgba(234,179,8,0.15);
}
.sc-pr-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem; font-weight: 900; letter-spacing: 0.04em;
  color: #fff; padding: 10px 16px 8px; text-transform: uppercase;
}
.sc-pr-table { display: flex; flex-direction: column; }
.sc-pr-thead {
  display: grid;
  grid-template-columns: 26px 18px 1fr 72px 38px;
  gap: 6px;
  padding: 4px 16px;
  font-size: 0.55rem; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: #374151;
  border-bottom: 1px solid #1a1d28;
}
.sc-pr-row {
  display: grid;
  grid-template-columns: 26px 18px 1fr 72px 38px;
  gap: 6px; align-items: center;
  padding: 6px 16px;
  border-bottom: 1px solid #1a1d28;
}
.sc-pr-row:last-of-type { border-bottom: none; }
.sc-pr-leader { background: rgba(234,179,8,0.05); }
.sc-pr-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: #1e2130; color: #6b7280;
  font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 0.68rem;
  display: flex; align-items: center; justify-content: center;
}
.num-gold   { background: rgba(234,179,8,0.15); color: #eab308; }
.num-silver { background: rgba(156,163,175,0.1); color: #9ca3af; }
.num-bronze { background: rgba(180,83,9,0.1);   color: #b45309; }
.sc-pr-chg { font-family: 'Barlow Condensed', sans-serif; font-size: 0.68rem; font-weight: 700; }
.chg-up   { color: #10b981; }
.chg-dn   { color: #ef4444; }
.chg-flat { color: #374151; }
.sc-pr-team-cell { display: flex; align-items: center; gap: 5px; min-width: 0; }
.sc-pr-initials {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.5rem; font-weight: 700; color: #fff;
  border: 1.5px solid #2a2d3a;
}
.init-0 { background: linear-gradient(135deg,#eab308,#d97706); border-color: #eab308; }
.init-1 { background: linear-gradient(135deg,#10b981,#059669); }
.init-2 { background: linear-gradient(135deg,#8b5cf6,#7c3aed); }
.init-3 { background: linear-gradient(135deg,#ef4444,#dc2626); }
.init-4 { background: linear-gradient(135deg,#6b7280,#4b5563); }
.sc-pr-name { font-size: 0.7rem; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.name-gold { color: #eab308; font-weight: 700; }
.sc-pr-bar-wrap { display: flex; align-items: center; gap: 4px; }
.sc-pr-bar { height: 4px; border-radius: 2px; flex-shrink: 0; background: linear-gradient(90deg,#22c55e,#16a34a); }
.sc-pr-bar-num { font-family: 'Barlow Condensed', sans-serif; font-size: 0.68rem; font-weight: 700; color: #22c55e; }
.sc-pr-rec { font-size: 0.65rem; color: #6b7280; text-align: right; }

/* ─ Matchup card (share version — more visual than hero panel) */
.sc-matchup-card {
  background: linear-gradient(145deg, #0a0d16 0%, #0f1322 100%);
  border: 1px solid rgba(99,102,241,0.2);
}
.sc-matchup-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem; font-weight: 900; letter-spacing: 0.04em;
  color: #fff; padding: 8px 16px; text-transform: uppercase;
}
.sc-mu-team {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.sc-mu-team.mu-winner { background: rgba(16,185,129,0.05); }
.sc-mu-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.62rem; font-weight: 700; color: #fff;
  position: relative;
}
.sc-mu-star {
  position: absolute; top: -3px; right: -3px;
  width: 10px; height: 10px; border-radius: 50%;
  background: #eab308; color: #0a0c14;
  font-size: 5px; display: flex; align-items: center; justify-content: center;
}
.sc-mu-info { flex: 1; min-width: 0; }
.sc-mu-name { font-size: 0.8rem; font-weight: 600; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-mu-name.mu-mine   { color: #eab308; }
.sc-mu-name.mu-win-name { color: #10b981; }
.sc-mu-rec  { font-size: 0.62rem; color: #6b7280; }
.sc-mu-score { font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; font-weight: 900; flex-shrink: 0; }
.sc-score-win  { color: #10b981; }
.sc-score-loss { color: #4b5563; }
.sc-score-mine { color: #eab308; }
.sc-score-neutral { color: #9ca3af; }
.sc-mu-divider { display: flex; align-items: center; padding: 2px 16px; }
.sc-mu-divider span { font-size: 0.6rem; color: #374151; font-weight: 700; letter-spacing: 0.1em; }
.sc-mu-prob-bar { height: 3px; background: #1a1d28; border-radius: 2px; overflow: hidden; margin: 0 16px 4px; }
.sc-mu-prob-fill { height: 100%; background: linear-gradient(90deg,#6366f1,#818cf8); border-radius: 2px; }
.sc-mu-prob-label { font-size: 0.62rem; color: #6b7280; padding: 0 16px 8px; }
.sc-matchup-status {
  font-size: 0.62rem; font-weight: 700; padding: 2px 7px; border-radius: 999px;
}
.status-live { background: rgba(16,185,129,0.15); color: #10b981; }
.status-final { background: #1e2130; color: #6b7280; }
.status-upcoming { background: rgba(59,130,246,0.15); color: #60a5fa; }

/* ─ Weekly Recap card */
.sc-recap-card2 {
  background: linear-gradient(145deg, #0c0f18 0%, #111827 100%);
  border: 1px solid rgba(234,179,8,0.12);
}
.sc-recap-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem; font-weight: 900; letter-spacing: 0.04em;
  color: #fff; padding: 10px 16px 8px; text-transform: uppercase;
}
.sc-recap-rows { display: flex; flex-direction: column; gap: 1px; padding: 0 16px 8px; }
.sc-recap-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid #1a1d28; }
.sc-recap-row:last-of-type { border-bottom: none; }
.rcap-icon { font-size: 1rem; width: 22px; text-align: center; flex-shrink: 0; }
.rcap-lbl { font-size: 0.62rem; color: #6b7280; font-weight: 600; }
.rcap-val { font-size: 0.78rem; font-weight: 700; color: #e5e7eb; margin-top: 1px; }
.yellow-val { color: #eab308; }
.green-val  { color: #10b981; }
.red-val    { color: #ef4444; }

/* ─ Standings card */
.sc-standings-card {
  background: linear-gradient(145deg, #0c0f18 0%, #0f1222 100%);
  border: 1px solid rgba(34,197,94,0.12);
}
.sc-standings-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem; font-weight: 900; letter-spacing: 0.04em;
  color: #fff; padding: 10px 16px 6px; text-transform: uppercase;
}
.sc-standings-thead {
  display: grid;
  grid-template-columns: 28px 1fr 40px 44px 36px;
  gap: 6px;
  padding: 4px 16px;
  font-size: 0.55rem; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: #374151;
  border-bottom: 1px solid #1a1d28;
}
.sc-standings-row {
  display: grid;
  grid-template-columns: 28px 1fr 40px 44px 36px;
  gap: 6px; align-items: center;
  padding: 6px 16px;
  border-bottom: 1px solid #1a1d28;
}
.sc-standings-row:last-of-type { border-bottom: none; }
.std-playoff { background: rgba(34,197,94,0.03); }
.std-myteam  { background: rgba(234,179,8,0.06); }
.std-rank-val {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 900;
  font-size: 0.8rem; color: #4b5563; display: flex; align-items: center; gap: 2px;
}
.rank-gold   { color: #eab308; }
.rank-silver { color: #9ca3af; }
.rank-bronze { color: #b45309; }
.std-playoff-dot { color: #22c55e; font-size: 0.5rem; }
.std-team-cell { display: flex; align-items: center; gap: 5px; min-width: 0; }
.std-avatar {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.5rem; font-weight: 700; color: #fff;
  border: 1.5px solid #2a2d3a;
  position: relative;
}
.stdav-0 { background: linear-gradient(135deg,#eab308,#d97706); border-color: #eab308; }
.stdav-1 { background: linear-gradient(135deg,#10b981,#059669); }
.stdav-2 { background: linear-gradient(135deg,#8b5cf6,#7c3aed); }
.stdav-3 { background: linear-gradient(135deg,#ef4444,#dc2626); }
.stdav-4 { background: linear-gradient(135deg,#3b82f6,#2563eb); }
.stdav-5 { background: linear-gradient(135deg,#6b7280,#4b5563); }
.std-my-star {
  position: absolute; top: -3px; right: -3px;
  width: 8px; height: 8px; border-radius: 50%;
  background: #eab308; color: #0a0c14;
  font-size: 4px; display: flex; align-items: center; justify-content: center;
}
.std-name { font-size: 0.7rem; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.std-mine-name { color: #eab308; font-weight: 700; }
.std-rec-val { font-size: 0.68rem; color: #9ca3af; font-weight: 600; }
.std-pf-val  { font-size: 0.68rem; color: #9ca3af; text-align: right; }
.std-streak-val { font-size: 0.65rem; font-weight: 700; text-align: right; }
.str-w { color: #10b981; }
.str-l { color: #ef4444; }

/* ─ Trade Analyzer card */
.sc-trade-card {
  background: linear-gradient(145deg, #0c1016 0%, #0f1420 100%);
  border: 1px solid rgba(139,92,246,0.2);
}
.sc-trade-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem; font-weight: 900; letter-spacing: 0.04em;
  color: #fff; padding: 10px 16px 8px; text-transform: uppercase;
}
.sc-trade-teams {
  display: grid; grid-template-columns: 1fr 24px 1fr;
  gap: 8px; align-items: start;
  padding: 0 16px 12px;
}
.sc-trade-arrow { font-size: 1.1rem; color: #6b7280; text-align: center; padding-top: 20px; }
.sc-trade-manager { font-size: 0.62rem; color: #6b7280; font-weight: 700; margin-bottom: 8px; }
.sc-trade-player {
  display: flex; align-items: center; gap: 5px;
  padding: 5px 6px; background: #1a1d28; border-radius: 6px; margin-bottom: 5px;
}
.sc-trade-player-pos {
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.58rem; font-weight: 700;
  padding: 1px 4px; border-radius: 3px; flex-shrink: 0;
}
.pos-wr { background: rgba(59,130,246,0.2); color: #60a5fa; }
.pos-rb { background: rgba(34,197,94,0.2); color: #22c55e; }
.pos-qb { background: rgba(239,68,68,0.2); color: #ef4444; }
.pos-te { background: rgba(234,179,8,0.2); color: #eab308; }
.sc-trade-player-name { font-size: 0.68rem; color: #d1d5db; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-trade-player-val  { font-family: 'Barlow Condensed', sans-serif; font-size: 0.72rem; font-weight: 700; flex-shrink: 0; }
.sc-trade-verdict {
  margin: 0 16px 4px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.75rem; font-weight: 600;
}
.verdict-win  { background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
.verdict-fair { background: rgba(234,179,8,0.08); color: #eab308; border: 1px solid rgba(234,179,8,0.2); }
.verdict-loss { background: rgba(239,68,68,0.08); color: #ef4444; border: 1px solid rgba(239,68,68,0.2); }

/* ─ Power Rankings line chart card */
.sc-pr-chart-card {
  background: linear-gradient(145deg, #0c0f1a 0%, #0f1220 100%);
  border: 1px solid rgba(234,179,8,0.15);
}
.sc-prc-chart-wrap { padding: 4px 8px 0; }
.sc-prc-svg { width: 100%; height: auto; display: block; overflow: visible; }
.sc-prc-xlabel { font-size: 0.6rem; color: #374151; text-align: center; padding-bottom: 4px; }
.sc-prc-legend { display: flex; gap: 12px; flex-wrap: wrap; padding: 4px 16px 8px; }
.sc-prc-legend-item { display: flex; align-items: center; gap: 4px; font-size: 0.65rem; color: #6b7280; }
.sc-prc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* ─ Win Probability card */
.sc-winprob-card {
  background: linear-gradient(145deg, #080d14 0%, #0a1020 100%);
  border: 1px solid rgba(6,182,212,0.2);
}
.sc-wp-teams { display: grid; grid-template-columns: 1fr 32px 1fr; align-items: center; gap: 4px; padding: 8px 16px 10px; }
.sc-wp-team { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
.sc-wp-t1 { align-items: flex-start; text-align: left; }
.sc-wp-t2 { align-items: flex-end; text-align: right; }
.sc-wp-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  border: 3px solid transparent; display: flex; align-items: center; justify-content: center;
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.65rem; font-weight: 700; color: #fff;
  background: #1a1d28; margin-bottom: 4px;
}
.sc-wp-name { font-size: 0.78rem; font-weight: 700; line-height: 1.1; }
.sc-wp-pct  { font-family: 'Barlow Condensed', sans-serif; font-size: 2rem; font-weight: 900; line-height: 1; }
.sc-wp-sub  { font-size: 0.72rem; color: #e5e7eb; font-weight: 600; }
.sc-wp-proj { font-size: 0.65rem; font-weight: 600; }
.sc-wp-vs   { font-family: 'Barlow Condensed', sans-serif; font-size: 0.7rem; font-weight: 900; color: #374151; text-align: center; letter-spacing: 0.1em; }
.sc-wp-bar-wrap {
  position: relative; height: 28px; margin: 0 16px 8px; border-radius: 6px; overflow: hidden;
  background: #1a1d28;
}
.sc-wp-bar-fill { position: absolute; inset: 0; border-radius: 6px; }
.sc-wp-bar-t1, .sc-wp-bar-t2 {
  position: absolute; top: 0; height: 100%;
  display: flex; align-items: center; font-size: 0.62rem; font-weight: 700; color: rgba(255,255,255,0.85);
}
.sc-wp-bar-t1 { left: 8px; }
.sc-wp-bar-t2 { right: 8px; }

/* ─ Win Probability trend chart card */
.sc-wpc-card {
  background: linear-gradient(145deg, #080d14 0%, #0a1020 100%);
  border: 1px solid rgba(6,182,212,0.15);
}
.sc-wpc-chart-wrap { padding: 4px 8px 0; }
.sc-wpc-svg { width: 100%; height: auto; display: block; overflow: visible; }

/* ─ History: Season finishes card */
.sc-hist-card {
  background: linear-gradient(145deg, #0c0f18 0%, #0f1224 100%);
  border: 1px solid rgba(139,92,246,0.15);
}
.sc-hist-thead {
  display: grid; grid-template-columns: 1fr 44px 44px 44px 44px 40px;
  gap: 4px; padding: 5px 16px;
  font-size: 0.58rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #374151;
  border-bottom: 1px solid #1a1d28;
}
.sc-hist-th-team { text-align: left; }
.sc-hist-th-yr, .sc-hist-th-avg { text-align: center; }
.sc-hist-row {
  display: grid; grid-template-columns: 1fr 44px 44px 44px 44px 40px;
  gap: 4px; align-items: center;
  padding: 6px 16px; border-bottom: 1px solid #1a1d28;
}
.sc-hist-row:last-of-type { border-bottom: none; }
.sc-hist-first { background: rgba(234,179,8,0.04); }
.sc-hist-team-cell { display: flex; align-items: center; gap: 6px; min-width: 0; }
.sc-hist-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.sc-hist-name { font-size: 0.72rem; color: #d1d5db; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sc-hist-finish {
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 900;
  text-align: center; color: #4b5563;
  width: 26px; height: 26px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
  margin: 0 auto;
}
.fin-gold   { background: rgba(234,179,8,0.15); color: #eab308; }
.fin-silver { background: rgba(156,163,175,0.1); color: #9ca3af; }
.fin-bronze { background: rgba(180,83,9,0.1);   color: #b45309; }
.fin-last   { background: rgba(239,68,68,0.08); color: #ef4444; opacity: 0.6; }
.sc-hist-avg { font-family: 'Barlow Condensed', sans-serif; font-size: 0.8rem; font-weight: 700; text-align: center; color: #6b7280; }
.avg-good { color: #10b981; }
.avg-meh  { color: #6b7280; }

/* ─ H2H Matrix card */
.sc-h2h-card {
  background: linear-gradient(145deg, #0c0f18 0%, #0f1222 100%);
  border: 1px solid rgba(99,102,241,0.15);
}
.sc-h2h-subtitle { font-size: 0.62rem; color: #4b5563; padding: 0 16px 8px; }
.sc-h2h-table-wrap { overflow-x: auto; padding: 0 16px; }
.sc-h2h-table { width: 100%; border-collapse: collapse; font-size: 0.65rem; }
.sc-h2h-corner { width: 48px; padding: 4px; }
.sc-h2h-th {
  padding: 4px 2px; text-align: center; border: 1px solid #1e2130;
  font-size: 0.6rem; color: #9ca3af;
}
.sc-h2h-th-dot { width: 8px; height: 8px; border-radius: 50%; margin: 0 auto 2px; }
.sc-h2h-row-label {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 6px; border: 1px solid #1e2130;
  font-weight: 700; color: #9ca3af; white-space: nowrap;
}
.sc-h2h-cell {
  padding: 5px 3px; text-align: center; border: 1px solid #1a1d28;
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 0.72rem;
}
.h2h-self  { background: #0f1220; color: #374151; }
.h2h-win   { background: rgba(16,185,129,0.1); color: #10b981; }
.h2h-loss  { background: rgba(239,68,68,0.08); color: #ef4444; }
.h2h-even  { background: rgba(234,179,8,0.06); color: #eab308; }
.h2h-dash  { color: #1e2130; }
.sc-h2h-legend { display: flex; gap: 10px; padding: 6px 16px 4px; flex-wrap: wrap; }
.h2h-leg-item { display: flex; align-items: center; gap: 4px; font-size: 0.6rem; color: #6b7280; }
.h2h-leg-swatch { width: 10px; height: 10px; border-radius: 2px; }

/* ─ Legacy standings card */
.sc-legacy-card {
  background: linear-gradient(145deg, #0c0f14 0%, #101420 100%);
  border: 1px solid rgba(234,179,8,0.15);
}
.sc-leg-list { display: flex; flex-direction: column; }
.sc-leg-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-bottom: 1px solid #1a1d28;
}
.sc-leg-row:last-of-type { border-bottom: none; }
.leg-myteam { background: rgba(234,179,8,0.05); }
.sc-leg-rank {
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.8rem; font-weight: 900;
}
.leg-gold   { background: #eab308; color: #0a0c14; }
.leg-silver { background: #9ca3af; color: #0a0c14; }
.leg-bronze { background: #b45309; color: #fff; }
.leg-other  { background: #1e2130; color: #9ca3af; }
.sc-leg-avatar {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.55rem; font-weight: 700; color: #fff;
  position: relative;
}
.sc-leg-star {
  position: absolute; top: -3px; right: -3px;
  width: 9px; height: 9px; border-radius: 50%;
  background: #eab308; color: #0a0c14;
  font-size: 5px; display: flex; align-items: center; justify-content: center;
}
.sc-leg-info { flex: 1; min-width: 0; }
.sc-leg-name { font-size: 0.75rem; font-weight: 600; color: #d1d5db; margin-bottom: 2px; }
.leg-mine { color: #eab308; }
.sc-leg-badges { display: flex; gap: 4px; margin-bottom: 4px; flex-wrap: wrap; }
.sc-leg-badge {
  font-size: 0.55rem; font-weight: 700; padding: 1px 5px; border-radius: 999px;
}
.badge-champ   { background: rgba(234,179,8,0.15); color: #eab308; }
.badge-playoff { background: rgba(59,130,246,0.12); color: #60a5fa; }
.badge-seasons { background: rgba(255,255,255,0.05); color: #6b7280; }
.sc-leg-bar-wrap { height: 3px; background: #1a1d28; border-radius: 2px; overflow: hidden; }
.sc-leg-bar { height: 100%; border-radius: 2px; transition: width 0.5s ease; opacity: 0.7; }
.sc-leg-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem; font-weight: 900; color: #6b7280; flex-shrink: 0; text-align: right;
}
.leg-score-gold { color: #eab308; }


.hiw-section {
  padding: 100px 0;
  background: #05060a;
}
.hiw-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  position: relative;
}
.hiw-step {
  padding: 32px;
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 16px;
  margin: 0 -1px;
  position: relative;
  transition: border-color 0.2s;
}
.hiw-step:hover { border-color: rgba(234,179,8,0.3); z-index: 1; }
.hiw-step-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 3.5rem;
  font-weight: 900;
  color: #1a1d28;
  line-height: 1;
  margin-bottom: 16px;
}
.hiw-icon-wrap {
  width: 52px; height: 52px;
  background: rgba(234,179,8,0.08);
  border: 1px solid rgba(234,179,8,0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 16px;
}
.hiw-step h3 {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.hiw-step p {
  font-size: 0.9rem;
  color: #6b7280;
  line-height: 1.65;
}
.hiw-connector {
  position: absolute;
  right: -20px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, #1e2130, #374151);
  z-index: 2;
  display: none;
}

/* ══════════════════════════════════════════════
   SOCIAL PROOF
══════════════════════════════════════════════ */
.proof-section {
  position: relative;
  padding: 100px 0;
  background: #08090f;
  overflow: hidden;
}
.chat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 64px;
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
}
.chat-bubble {
  padding: 18px 20px;
  border-radius: 16px;
  position: relative;
}
.chat-bubble.left {
  background: #0d0f1a;
  border: 1px solid #1e2130;
  border-bottom-left-radius: 4px;
}
.chat-bubble.right {
  background: #111622;
  border: 1px solid rgba(234,179,8,0.1);
  border-bottom-right-radius: 4px;
}
.chat-meta { font-size: 0.7rem; color: #4b5563; margin-bottom: 8px; font-weight: 600; }
.chat-text { font-size: 0.9rem; color: #d1d5db; line-height: 1.5; margin-bottom: 10px; }
.chat-reaction { font-size: 1.2rem; }

.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  max-width: 700px;
  margin: 0 auto;
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 16px;
  overflow: hidden;
}
.stat-block {
  flex: 1;
  text-align: center;
  padding: 28px 20px;
}
.stat-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 2.4rem;
  font-weight: 900;
  color: #eab308;
  line-height: 1;
  margin-bottom: 6px;
}
.stat-label { font-size: 0.78rem; color: #6b7280; font-weight: 500; }
.stat-divider { width: 1px; height: 60px; background: #1e2130; flex-shrink: 0; }

/* ══════════════════════════════════════════════
   SECTION CTA STRIPS
══════════════════════════════════════════════ */
.section-cta-strip {
  padding: 32px 24px;
  display: flex;
  justify-content: center;
  background: #05060a;
  border-top: 1px solid #0f1018;
  border-bottom: 1px solid #0f1018;
}

/* ══════════════════════════════════════════════
   FEATURES SECTION
══════════════════════════════════════════════ */
.features-section {
  padding: 100px 0;
  background: #05060a;
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  border: 1px solid #1e2130;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 48px;
}
.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 18px 24px;
  border-right: 1px solid #1e2130;
  border-bottom: 1px solid #1e2130;
  font-size: 0.88rem;
  color: #9ca3af;
  line-height: 1.45;
  transition: background 0.15s;
}
.feature-item:hover { background: rgba(234,179,8,0.03); color: #d1d5db; }
.feature-item:nth-child(3n) { border-right: none; }
.feature-item:nth-last-child(-n+3) { border-bottom: none; }
.feat-check {
  color: #10b981;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
  margin-top: 1px;
}
.features-cta-row {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}


/* ══════════════════════════════════════════════
   FAQ
══════════════════════════════════════════════ */
.faq-section {
  padding: 100px 0;
  background: #08090f;
}
.faq-headline { font-size: clamp(1.8rem, 4vw, 2.8rem); margin-bottom: 40px; }
.faq-list-full { display: flex; flex-direction: column; max-width: 800px; }
.faq-item {
  border-bottom: 1px solid #1e2130;
  padding: 18px 0;
  cursor: pointer;
  transition: all 0.15s;
}
.faq-item:first-child { border-top: 1px solid #1e2130; }
.faq-q {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-family: 'Barlow', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: #d1d5db;
}
.faq-arrow {
  font-size: 1.4rem;
  color: #4b5563;
  transition: transform 0.2s;
  flex-shrink: 0;
  line-height: 1;
}
.faq-arrow.open { transform: rotate(90deg); color: #eab308; }
.faq-a {
  font-size: 0.88rem;
  color: #6b7280;
  line-height: 1.65;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, margin-top 0.2s;
}
.faq-a.visible { max-height: 200px; margin-top: 12px; }

/* ══════════════════════════════════════════════
   FINAL CTA
══════════════════════════════════════════════ */
.final-cta-section {
  position: relative;
  padding: 120px 0;
  background: #05060a;
  overflow: hidden;
  text-align: center;
}
.final-glow-left {
  position: absolute; left: -200px; top: 50%; transform: translateY(-50%);
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.final-glow-right {
  position: absolute; right: -200px; top: 50%; transform: translateY(-50%);
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.final-inner { position: relative; z-index: 2; }
.final-eyebrow { font-size: 1.1rem; margin-bottom: 20px; display: block; }
.final-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2.8rem, 7vw, 5rem);
  font-weight: 900;
  line-height: 1.0;
  color: #fff;
  text-transform: uppercase;
  margin-bottom: 40px;
}
.final-accent { color: #eab308; }
.final-trust {
  margin-top: 18px;
  font-size: 0.82rem;
  color: #4b5563;
  letter-spacing: 0.03em;
}

/* ══════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════ */
@media (max-width: 900px) {
  .hero-cards-row { grid-template-columns: 1fr; gap: 12px; }
  .hc-left, .hc-right { display: none; }
  .picker-grid { grid-template-columns: 1fr; gap: 24px; }
  .card-grid { grid-template-columns: 1fr 1fr; }
  .hiw-steps { grid-template-columns: 1fr; gap: 16px; }
  .hiw-step { margin: 0; }
  .features-grid { grid-template-columns: 1fr 1fr; }
  .features-cta-row { flex-direction: column; align-items: flex-start; }
  .chat-grid { grid-template-columns: 1fr; }
  .stats-row { flex-wrap: wrap; }
  .preview-rank-row { grid-template-columns: 24px 28px 1fr 60px; }
  .prev-name { font-size: 0.75rem; }
}

@media (max-width: 600px) {
  .card-grid { grid-template-columns: 1fr; }
  .hero-headline { font-size: 3rem; }
  .section-headline { font-size: 1.8rem; }
}
</style>
