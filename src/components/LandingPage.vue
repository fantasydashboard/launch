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
          <img src="/UFD_V5.png" alt="Ultimate Fantasy Dashboard" class="hero-logo" />
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
    <section class="picker-section" id="picker">
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
                @click="selectedSport = s.id"
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
                class="picker-option"
                :class="{ active: selectedPlatform === p.id }"
                @click="selectedPlatform = p.id"
              >
                <span class="picker-emoji">{{ p.emoji }}</span>
                <span>{{ p.name }}</span>
              </button>
            </div>
          </div>

          <!-- Step 3: Format -->
          <div class="picker-step">
            <div class="picker-step-label"><span class="step-num">03</span> Your format</div>
            <div class="picker-options">
              <button
                v-for="f in formats[selectedSport]" :key="f"
                class="picker-option"
                :class="{ active: selectedFormat === f }"
                @click="selectedFormat = f"
              >{{ f }}</button>
            </div>
          </div>
        </div>

        <!-- Dynamic preview card -->
        <div class="picker-preview">
          <div class="preview-badge">{{ activeSport.emoji }} {{ activeSport.name }} · {{ selectedPlatform.toUpperCase() }} · {{ selectedFormat }}</div>
          <div class="preview-card">
            <div class="preview-header">
              <span class="preview-title">Your Dashboard Would Look Like This</span>
              <span class="preview-week">Week {{ currentWeek }}</span>
            </div>
            <div class="preview-rankings">
              <div v-for="(team, i) in previewTeams" :key="i" class="preview-rank-row">
                <span class="prev-rank" :class="i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''">{{ i + 1 }}</span>
                <span class="prev-avatar" :style="{ background: team.color }">{{ team.icon }}</span>
                <span class="prev-name">{{ team.name }}</span>
                <span class="prev-record">{{ team.record }}</span>
                <div class="prev-bar-wrap"><div class="prev-bar" :style="{ width: team.score + '%', background: i === 0 ? '#eab308' : '#374151' }"></div></div>
                <span class="prev-pts">{{ team.pts }}</span>
              </div>
            </div>
          </div>
          <button class="cta-primary mt-6" @click="$emit('open-signup')">
            Connect My {{ selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1) }} League Free
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </section>

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
            <div class="share-card" :class="card.size">

              <!-- POWER RANKINGS CARD — matches actual app PR table output -->
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
                      <span class="sc-pr-chg" :class="t.trend>0?'chg-up':t.trend<0?'chg-dn':'chg-flat'">
                        {{ t.trend>0?'▲'+t.trend : t.trend<0?'▼'+Math.abs(t.trend):'—' }}
                      </span>
                      <div class="sc-pr-team-cell">
                        <div class="sc-pr-initials" :class="'init-'+i">{{ t.name.split(' ').map(w=>w[0]).join('').slice(0,2) }}</div>
                        <span class="sc-pr-name" :class="i===0?'name-gold':''">{{ t.name }}</span>
                      </div>
                      <div class="sc-pr-bar-wrap">
                        <div class="sc-pr-bar" :style="{width: t.score+'%', opacity: Math.max(0.3, 1-(i*0.15))}"></div>
                        <span class="sc-pr-bar-num">{{ t.pscore }}</span>
                      </div>
                      <span class="sc-pr-rec">{{ t.record }}</span>
                    </div>
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- MATCHUP CARD — matches PointsMatchupCard exactly -->
              <template v-else-if="card.type === 'matchup'">
                <div class="sc-card sc-matchup-card">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-matchup-status" :class="card.status === 'Live' ? 'status-live' : card.status === 'Final' ? 'status-final' : 'status-upcoming'">
                      {{ card.status === 'Live' ? '● ' + card.status : card.status }}
                    </span>
                  </div>
                  <div class="sc-matchup-label">⚔️ WEEK {{ card.week }} MATCHUP</div>
                  <!-- Team 1 -->
                  <div class="sc-mu-team" :class="card.team1Won ? 'mu-winner' : ''">
                    <div class="sc-mu-avatar" :style="{background: card.team1Color}">
                      <span>{{ card.team1.split(' ').map(w=>w[0]).join('').slice(0,2) }}</span>
                      <div v-if="card.myTeam === 1" class="sc-mu-star">★</div>
                    </div>
                    <div class="sc-mu-info">
                      <div class="sc-mu-name" :class="card.myTeam===1?'mu-mine':card.team1Won?'mu-win-name':''">{{ card.team1 }}</div>
                      <div class="sc-mu-rec">{{ card.record1 }}</div>
                    </div>
                    <div class="sc-mu-score" :class="card.team1Won?'sc-score-win':card.status==='Final'?'sc-score-loss':card.myTeam===1?'sc-score-mine':'sc-score-neutral'">
                      {{ card.score1 }}
                    </div>
                  </div>
                  <!-- Divider with vs -->
                  <div class="sc-mu-divider"><span>vs</span></div>
                  <!-- Team 2 -->
                  <div class="sc-mu-team" :class="card.team2Won ? 'mu-winner' : ''">
                    <div class="sc-mu-avatar" :style="{background: card.team2Color}">
                      <span>{{ card.team2.split(' ').map(w=>w[0]).join('').slice(0,2) }}</span>
                    </div>
                    <div class="sc-mu-info">
                      <div class="sc-mu-name" :class="card.team2Won?'mu-win-name':''">{{ card.team2 }}</div>
                      <div class="sc-mu-rec">{{ card.record2 }}</div>
                    </div>
                    <div class="sc-mu-score" :class="card.team2Won?'sc-score-win':card.status==='Final'?'sc-score-loss':'sc-score-neutral'">
                      {{ card.score2 }}
                    </div>
                  </div>
                  <!-- Win probability bar (if not final or upcoming) -->
                  <template v-if="card.prob && card.status !== 'Final'">
                    <div class="sc-mu-prob-bar"><div class="sc-mu-prob-fill" :style="{width: card.prob+'%'}"></div></div>
                    <div class="sc-mu-prob-label">{{ card.prob }}% win probability · {{ card.team1 }}</div>
                  </template>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- WEEKLY RECAP — matches the League Highlights + leaders style -->
              <template v-else-if="card.type === 'recap'">
                <div class="sc-card sc-recap-card2">
                  <div class="sc-brand-row">
                    <span class="sc-brand-logo">UFD</span>
                    <span class="sc-brand-sport">{{ card.sportLabel }}</span>
                    <span class="sc-brand-week">WK {{ card.week }} RECAP</span>
                  </div>
                  <div class="sc-recap-title">📰 LEAGUE DIGEST</div>
                  <div class="sc-recap-rows">
                    <div class="sc-recap-row"><span class="rcap-icon">🏆</span><div><div class="rcap-lbl">Top Score</div><div class="rcap-val yellow-val">{{ card.topScore }}</div></div></div>
                    <div class="sc-recap-row"><span class="rcap-icon">💀</span><div><div class="rcap-lbl">Lowest Score</div><div class="rcap-val red-val">{{ card.lowScore }}</div></div></div>
                    <div class="sc-recap-row"><span class="rcap-icon">💣</span><div><div class="rcap-lbl">Biggest Blowout</div><div class="rcap-val">{{ card.blowout }}</div></div></div>
                    <div class="sc-recap-row"><span class="rcap-icon">😤</span><div><div class="rcap-lbl">Closest Game</div><div class="rcap-val green-val">{{ card.closest }}</div></div></div>
                    <div class="sc-recap-row"><span class="rcap-icon">🔥</span><div><div class="rcap-lbl">On Fire</div><div class="rcap-val">{{ card.onFire }}</div></div></div>
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- STANDINGS CARD — exact standings table output -->
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
                  <div v-for="(t, i) in card.teams" :key="i" class="sc-standings-row" :class="[t.playoff?'std-playoff':'', t.myTeam?'std-myteam':'']">
                    <span class="std-rank-val" :class="i===0?'rank-gold':i===1?'rank-silver':i===2?'rank-bronze':''">
                      {{ i+1 }}<span v-if="t.playoff" class="std-playoff-dot">●</span>
                    </span>
                    <div class="std-team-cell">
                      <div class="std-avatar" :class="'stdav-'+i">
                        {{ t.name.split(' ').map(w=>w[0]).join('').slice(0,2) }}
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

              <!-- TRADE ANALYZER CARD -->
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
                        <span class="sc-trade-player-val" :class="p.val > 0 ? 'green-val' : 'red-val'">{{ p.val > 0 ? '+' : '' }}{{ p.val }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="sc-trade-verdict" :class="card.verdict === 'Fair' ? 'verdict-fair' : card.verdict === 'Win' ? 'verdict-win' : 'verdict-loss'">
                    {{ card.verdict === 'Win' ? '✓ ' + card.team1 + ' wins this trade' : card.verdict === 'Fair' ? '≈ Fair trade' : '✗ Unfavorable for ' + card.team1 }}
                  </div>
                  <div class="sc-watermark">ultimatefantasydashboard.com</div>
                </div>
              </template>

            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         HOW IT WORKS
    ══════════════════════════════════════════════ -->
    <section class="hiw-section" id="how-it-works">
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

    <!-- ══════════════════════════════════════════════
         PRICING TEASER
    ══════════════════════════════════════════════ -->
    <section class="pricing-section">
      <div class="section-inner">
        <div class="section-eyebrow">Pricing</div>
        <h2 class="section-headline">Start free. <span class="accent">Go deeper</span> when you're ready.</h2>
        <p class="section-sub">Preview your league at no cost. Unlock the full arsenal when your league is ready.</p>

        <!-- Beta banner -->
        <div class="beta-banner">
          <span class="beta-dot"></span>
          <strong>Currently in Beta</strong> — All features are completely free right now. Lock in early access pricing before we launch.
        </div>

        <div class="pricing-cards">
          <div class="pricing-card free-card">
            <div class="pc-tier">Free Preview</div>
            <div class="pc-price">$0</div>
            <div class="pc-desc">See what your league looks like. No commitment, no card.</div>
            <ul class="pc-features">
              <li><span class="check">✓</span> Connect any league</li>
              <li><span class="check">✓</span> Current week standings</li>
              <li><span class="check">✓</span> This week's matchups</li>
              <li><span class="x">✗</span> <span class="muted">Power rankings</span></li>
              <li><span class="x">✗</span> <span class="muted">Share cards</span></li>
              <li><span class="x">✗</span> <span class="muted">Season history</span></li>
            </ul>
            <button class="pc-cta free-cta" @click="$emit('open-signup')">Start Free →</button>
          </div>

          <div class="pricing-card league-card popular">
            <div class="popular-badge">Most Popular</div>
            <div class="pc-tier">League Pass</div>
            <div class="pc-price">Early Access Pricing</div>
            <div class="pc-desc">Everything your league needs. Per league, per season.</div>
            <ul class="pc-features">
              <li><span class="check">✓</span> Full season history</li>
              <li><span class="check">✓</span> Weekly power rankings</li>
              <li><span class="check">✓</span> All share cards</li>
              <li><span class="check">✓</span> Commissioner tools</li>
              <li><span class="check">✓</span> Trade analyzer</li>
              <li><span class="check">✓</span> Weekly recaps</li>
            </ul>
            <button class="pc-cta league-cta" @click="$emit('open-signup')">Get Early Access →</button>
          </div>

          <div class="pricing-card ultimate-card">
            <div class="pc-tier">Ultimate</div>
            <div class="pc-price">Coming Soon</div>
            <div class="pc-desc">The full edge. For the manager who doesn't lose on purpose.</div>
            <ul class="pc-features">
              <li><span class="check">✓</span> Everything in League Pass</li>
              <li><span class="check">✓</span> Start/sit projections</li>
              <li><span class="check">✓</span> Waiver wire grades</li>
              <li><span class="check">✓</span> Cross-league analytics</li>
              <li><span class="check">✓</span> Multi-sport dashboard</li>
              <li><span class="check">✓</span> Priority features</li>
            </ul>
            <button class="pc-cta ultimate-cta" @click="$emit('open-signup')">Join Waitlist →</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         FAQ TEASER
    ══════════════════════════════════════════════ -->
    <section class="faq-section">
      <div class="section-inner faq-inner">
        <div>
          <div class="section-eyebrow">Questions</div>
          <h2 class="section-headline faq-headline">Got questions?<br/><span class="accent">We've got answers.</span></h2>
        </div>
        <div class="faq-list">
          <div v-for="(faq, i) in faqs" :key="i" class="faq-item" @click="toggleFaq(i)">
            <div class="faq-q">
              <span>{{ faq.q }}</span>
              <span class="faq-arrow" :class="{ open: openFaq === i }">›</span>
            </div>
            <div class="faq-a" :class="{ visible: openFaq === i }">{{ faq.a }}</div>
          </div>
          <a href="/faq" class="faq-more-link">See all FAQs →</a>
        </div>
      </div>
    </section>

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

    <!-- Footer handled by AppFooter in App.vue -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineEmits<{ (e: 'open-signup'): void }>()

// ── Sport / Platform / Format Picker ────────────────────────────────────────
const sports = [
  { id: 'football', name: 'Football', emoji: '🏈' },
  { id: 'baseball', name: 'Baseball', emoji: '⚾' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'hockey', name: 'Hockey', emoji: '🏒' },
]
const platforms = [
  { id: 'sleeper', name: 'Sleeper', emoji: '💤' },
  { id: 'yahoo', name: 'Yahoo', emoji: 'Y!' },
  { id: 'espn', name: 'ESPN', emoji: 'E' },
]
const formats: Record<string, string[]> = {
  football: ['H2H Points', 'H2H Categories', 'Dynasty', 'Keeper'],
  baseball: ['H2H Points', 'H2H Categories', 'Roto'],
  basketball: ['H2H Points', 'H2H Categories', 'Roto'],
  hockey: ['H2H Points', 'H2H Categories', 'Roto'],
}

const selectedSport = ref('football')
const selectedPlatform = ref('sleeper')
const selectedFormat = ref('H2H Points')

const activeSport = computed(() => sports.find(s => s.id === selectedSport.value)!)
const currentWeek = computed(() => selectedSport.value === 'baseball' ? 18 : selectedSport.value === 'football' ? 11 : 14)

const previewTeamsBySport: Record<string, any[]> = {
  football: [
    { name: 'Mahomes Magic', record: '9-2', pts: '1,456', score: 92, color: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '🔥' },
    { name: 'The Algorithm', record: '8-3', pts: '1,342', score: 84, color: 'linear-gradient(135deg,#6366f1,#4f46e5)', icon: '⚡' },
    { name: 'Trash Can Wins', record: '7-4', pts: '1,298', score: 78, color: 'linear-gradient(135deg,#10b981,#059669)', icon: '🗑️' },
    { name: 'Waiver Wire Kid', record: '6-5', pts: '1,187', score: 68, color: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: '📋' },
    { name: 'Toilet Bowl FC', record: '3-8', pts: '982', score: 44, color: 'linear-gradient(135deg,#6b7280,#4b5563)', icon: '🚽' },
  ],
  baseball: [
    { name: 'Dingers Only', record: '88-62', pts: '87.5', score: 92, color: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '💣' },
    { name: 'ERA Zero', record: '82-68', pts: '82.0', score: 82, color: 'linear-gradient(135deg,#06b6d4,#0891b2)', icon: '⚾' },
    { name: 'Steals & Deals', record: '79-71', pts: '78.5', score: 76, color: 'linear-gradient(135deg,#10b981,#059669)', icon: '🏃' },
    { name: 'K-Rate Kings', record: '74-76', pts: '73.0', score: 67, color: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon: '🔺' },
    { name: 'Sub-.35 ERA or Bust', record: '61-89', pts: '58.5', score: 42, color: 'linear-gradient(135deg,#6b7280,#4b5563)', icon: '😤' },
  ],
  basketball: [
    { name: 'Triple Double', record: '9-3', pts: '1,234', score: 90, color: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '🏀' },
    { name: 'Giannis Mode', record: '8-4', pts: '1,189', score: 84, color: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: '🦌' },
    { name: 'Points Only', record: '7-5', pts: '1,102', score: 75, color: 'linear-gradient(135deg,#6366f1,#4f46e5)', icon: '📊' },
    { name: 'Bench Warmers', record: '6-6', pts: '1,041', score: 64, color: 'linear-gradient(135deg,#10b981,#059669)', icon: '🪑' },
    { name: 'Box Score Fraud', record: '4-8', pts: '891', score: 40, color: 'linear-gradient(135deg,#6b7280,#4b5563)', icon: '📋' },
  ],
  hockey: [
    { name: 'Save % Kings', record: '10-2', pts: '1,567', score: 94, color: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '🥅' },
    { name: 'Hat Trick City', record: '8-4', pts: '1,423', score: 85, color: 'linear-gradient(135deg,#06b6d4,#0891b2)', icon: '🏒' },
    { name: 'Power Play FC', record: '7-5', pts: '1,312', score: 74, color: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon: '⚡' },
    { name: 'Empty Net Bros', record: '5-7', pts: '1,189', score: 61, color: 'linear-gradient(135deg,#10b981,#059669)', icon: '🥶' },
    { name: 'Penalty Box FC', record: '3-9', pts: '978', score: 38, color: 'linear-gradient(135deg,#6b7280,#4b5563)', icon: '📦' },
  ],
}
const previewTeams = computed(() => previewTeamsBySport[selectedSport.value] || previewTeamsBySport.football)

// ── Gallery ─────────────────────────────────────────────────────────────────
const galleryFilters = [
  { id: 'all', label: 'All Cards' },
  { id: 'power-rankings', label: '⚡ Power Rankings' },
  { id: 'matchup', label: '⚔️ Matchups' },
  { id: 'standings', label: '🏆 Standings' },
  { id: 'recap', label: '📰 Weekly Recap' },
  { id: 'trade', label: '🤝 Trade Analysis' },
]
const activeGalleryFilter = ref('all')

const galleryCards = [
  {
    id: 1, sport: 'football', type: 'power-rankings', size: 'card-tall', week: 11,
    teams: [
      { name: 'Mahomes Magic', score: 92, trend: 2, pscore: '87.4', record: '9-2' },
      { name: 'Trash Can Wins', score: 78, trend: -1, pscore: '74.1', record: '8-3' },
      { name: 'The Algorithm',  score: 66, trend:  0, pscore: '68.9', record: '7-4' },
      { name: 'Waiver Wire Kid',score: 55, trend:  1, pscore: '61.2', record: '6-5' },
      { name: 'Toilet Bowl FC', score: 38, trend: -2, pscore: '44.8', record: '3-8' },
    ]
  },
  {
    id: 2, sport: 'football', type: 'matchup', size: 'card-normal', week: 11,
    sportLabel: '🏈 NFL Fantasy · PPR',
    team1: 'Mahomes Magic', team1Color: 'linear-gradient(135deg,#eab308,#d97706)', record1: '9-2 · proj 148.2', score1: '142.7', team1Won: true, myTeam: 1,
    team2: 'The Algorithm',  team2Color: 'linear-gradient(135deg,#6366f1,#4f46e5)', record2: '7-4 · proj 121.4', score2: '98.4',  team2Won: false,
    prob: 64, status: 'Live'
  },
  {
    id: 3, sport: 'football', type: 'recap', size: 'card-normal', week: 11,
    sportLabel: '🏈 NFL Fantasy · PPR',
    topScore:  'Trash Can Wins · 164.2',
    lowScore:  'Toilet Bowl FC · 72.4',
    blowout:   'Trash Can def. TB · 91.8 pts',
    closest:   'WW Kid def. B.Boss · 2.1 pts',
    onFire:    'Mahomes Magic · W3'
  },
  {
    id: 4, sport: 'football', type: 'standings', size: 'card-tall', week: 11,
    sportLabel: '🏈 NFL Fantasy · PPR',
    teams: [
      { name: 'Mahomes Magic',  wins: 9, losses: 2, pf: '1,456', streak: 'W3', playoff: true,  myTeam: true  },
      { name: 'Trash Can Wins', wins: 8, losses: 3, pf: '1,342', streak: 'W2', playoff: true,  myTeam: false },
      { name: 'The Algorithm',  wins: 7, losses: 4, pf: '1,298', streak: 'L1', playoff: true,  myTeam: false },
      { name: 'Waiver Wire Kid',wins: 6, losses: 5, pf: '1,187', streak: 'W1', playoff: false, myTeam: false },
      { name: 'Bench Boss',     wins: 5, losses: 6, pf: '1,102', streak: 'L2', playoff: false, myTeam: false },
      { name: 'Toilet Bowl FC', wins: 3, losses: 8, pf: '982',   streak: 'L4', playoff: false, myTeam: false },
    ]
  },
  {
    id: 5, sport: 'baseball', type: 'matchup', size: 'card-normal', week: 18,
    sportLabel: '⚾ MLB Fantasy · H2H',
    team1: 'Dingers Only', team1Color: 'linear-gradient(135deg,#f59e0b,#d97706)', record1: '82-68 · proj 98.5', score1: '94.0', team1Won: false, myTeam: null,
    team2: 'ERA Zero',     team2Color: 'linear-gradient(135deg,#06b6d4,#0891b2)', record2: '88-62 · proj 105.0', score2: '102.5', team2Won: true,
    prob: null, status: 'Final'
  },
  {
    id: 6, sport: 'football', type: 'trade', size: 'card-normal',
    sportLabel: '🏈 NFL Fantasy · PPR',
    team1: 'Mahomes Magic', team2: 'Waiver Wire Kid',
    gives1: [
      { name: 'Justin Jefferson', pos: 'WR', val: 8.2 },
    ],
    gives2: [
      { name: 'Amon-Ra St. Brown', pos: 'WR', val: 6.4 },
      { name: 'Rhamondre Stevenson', pos: 'RB', val: 4.1 },
    ],
    verdict: 'Win'
  },
]

const filteredCards = computed(() =>
  activeGalleryFilter.value === 'all'
    ? galleryCards
    : galleryCards.filter(c => c.type === activeGalleryFilter.value)
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

// ── Utils ────────────────────────────────────────────────────────────────────
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

.picker-preview { text-align: center; }
.preview-badge {
  display: inline-block;
  padding: 5px 14px;
  background: rgba(234,179,8,0.08);
  border: 1px solid rgba(234,179,8,0.2);
  border-radius: 999px;
  font-size: 0.78rem;
  color: #eab308;
  font-weight: 600;
  margin-bottom: 20px;
}
.preview-card {
  background: #0d0f1a;
  border: 1px solid #1e2130;
  border-radius: 16px;
  padding: 24px;
  max-width: 680px;
  margin: 0 auto;
}
.preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.preview-title { font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.1em; color: #4b5563; text-transform: uppercase; }
.preview-week { font-size: 0.78rem; color: #374151; }
.preview-rankings { display: flex; flex-direction: column; gap: 10px; }
.preview-rank-row { display: grid; grid-template-columns: 24px 32px 1fr 70px 120px 56px; align-items: center; gap: 10px; }
.prev-rank { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1rem; color: #374151; text-align: right; }
.prev-rank.gold { color: #eab308; }
.prev-rank.silver { color: #9ca3af; }
.prev-rank.bronze { color: #b45309; }
.prev-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }
.prev-name { font-size: 0.85rem; color: #d1d5db; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prev-record { font-size: 0.75rem; color: #4b5563; text-align: right; }
.prev-bar-wrap { height: 5px; background: #1a1d28; border-radius: 3px; overflow: hidden; }
.prev-bar { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.prev-pts { font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 700; color: #9ca3af; text-align: right; }

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

/* ══════════════════════════════════════════════
   HOW IT WORKS
══════════════════════════════════════════════ */
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
   PRICING
══════════════════════════════════════════════ */
.pricing-section {
  padding: 100px 0;
  background: #05060a;
}
.beta-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.25);
  border-radius: 10px;
  font-size: 0.88rem;
  color: #93c5fd;
  margin-bottom: 40px;
  max-width: 700px;
}
.beta-dot {
  width: 8px; height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse-dot 2s infinite;
}

.pricing-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}
.pricing-card {
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 16px;
  padding: 32px;
  position: relative;
  transition: border-color 0.2s;
}
.pricing-card:hover { border-color: #374151; }
.league-card {
  border-color: rgba(234,179,8,0.35);
  background: linear-gradient(145deg, #0d0f1a, #111622);
  box-shadow: 0 0 60px rgba(234,179,8,0.06);
}
.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 16px;
  background: #eab308;
  color: #0a0c14;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 999px;
  white-space: nowrap;
}

.pc-tier {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 10px;
}
.pc-price {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
  color: #fff;
  margin-bottom: 10px;
  line-height: 1;
}
.league-card .pc-price { color: #eab308; }
.pc-desc { font-size: 0.85rem; color: #6b7280; margin-bottom: 24px; line-height: 1.5; }
.pc-features { list-style: none; padding: 0; margin: 0 0 28px; display: flex; flex-direction: column; gap: 10px; }
.pc-features li { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: #9ca3af; }
.check { color: #10b981; font-weight: 700; font-size: 0.9rem; }
.x { color: #374151; font-weight: 700; font-size: 0.9rem; }

.pc-cta {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: all 0.2s;
}
.free-cta { background: #1e2130; color: #9ca3af; border: 1px solid #2a2d3a; }
.free-cta:hover { background: #2a2d3a; color: #d1d5db; }
.league-cta { background: #eab308; color: #0a0c14; }
.league-cta:hover { background: #fbbf24; transform: translateY(-1px); }
.ultimate-cta { background: transparent; color: #9ca3af; border: 1px solid #2a2d3a; }
.ultimate-cta:hover { border-color: #4b5563; color: #d1d5db; }

/* ══════════════════════════════════════════════
   FAQ
══════════════════════════════════════════════ */
.faq-section {
  padding: 100px 0;
  background: #08090f;
}
.faq-inner {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 80px;
  align-items: start;
}
.faq-headline { font-size: clamp(1.8rem, 4vw, 2.8rem); }
.faq-list { display: flex; flex-direction: column; }
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
.faq-more-link {
  display: inline-block;
  margin-top: 20px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: #eab308;
  text-decoration: none;
  letter-spacing: 0.04em;
  transition: color 0.15s;
}
.faq-more-link:hover { color: #fbbf24; }

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
  .pricing-cards { grid-template-columns: 1fr; }
  .faq-inner { grid-template-columns: 1fr; gap: 40px; }
  .chat-grid { grid-template-columns: 1fr; }
  .stats-row { flex-wrap: wrap; }
  .preview-rank-row { grid-template-columns: 24px 28px 1fr 60px; }
  .prev-bar-wrap, .prev-pts { display: none; }
}

@media (max-width: 600px) {
  .card-grid { grid-template-columns: 1fr; }
  .hero-headline { font-size: 3rem; }
  .section-headline { font-size: 1.8rem; }
}
</style>
