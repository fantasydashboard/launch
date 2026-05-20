<template>
  <div class="home">
    <!-- ─────────────────────────────────────────────────────────────
         1. THE HEADLINE — Story of Week 11
         Editorial hero, protagonist vs antagonist face-off.
    ────────────────────────────────────────────────────────────── -->
    <section class="hero" aria-labelledby="hero-headline">
      <div class="hero-copy">
        <p class="hero-eyebrow">
          <span class="hero-eyebrow-bar" aria-hidden="true"></span>
          Story of Week {{ currentWeek }}
        </p>
        <h1 class="hero-headline" id="hero-headline">{{ headline.headline }}</h1>
        <p class="hero-body">{{ headline.body }}</p>
        <button
          type="button"
          class="hero-share"
          aria-label="Share this story to your league chat"
          @click="$emit('open-signup')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share this story
        </button>
      </div>

      <div class="hero-faceoff" aria-label="Built Different overtaking Throne Vacant for first place">
        <article class="faceoff-team faceoff-rise">
          <div class="faceoff-avatar" :style="{ background: `linear-gradient(135deg, ${protagonist.avatarColor})` }">
            <img v-if="protagonist.avatarUrl" :src="protagonist.avatarUrl" class="avatar-image" alt="" />
            <span v-else>{{ protagonist.ownerInitials }}</span>
          </div>
          <div class="faceoff-meta">
            <p class="faceoff-name">{{ protagonist.name }}</p>
            <p class="faceoff-owner">{{ protagonist.ownerName }}</p>
            <div class="faceoff-rankrow">
              <span class="faceoff-rankchip faceoff-rankchip-now">#1</span>
              <span class="faceoff-trend faceoff-trend-up">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="6 15 12 9 18 15"/>
                </svg>
                +2
              </span>
            </div>
          </div>
        </article>

        <div class="faceoff-verb" aria-hidden="true">
          <span class="faceoff-verb-line"></span>
          <span class="faceoff-verb-word">overtakes</span>
          <span class="faceoff-verb-line"></span>
        </div>

        <article class="faceoff-team faceoff-fall">
          <div class="faceoff-avatar faceoff-avatar-dim" :style="{ background: `linear-gradient(135deg, ${antagonist.avatarColor})` }">
            <img v-if="antagonist.avatarUrl" :src="antagonist.avatarUrl" class="avatar-image" alt="" />
            <span v-else>{{ antagonist.ownerInitials }}</span>
          </div>
          <div class="faceoff-meta">
            <p class="faceoff-name">{{ antagonist.name }}</p>
            <p class="faceoff-owner">{{ antagonist.ownerName }}</p>
            <div class="faceoff-rankrow">
              <span class="faceoff-rankchip faceoff-rankchip-fell">#2</span>
              <span class="faceoff-trend faceoff-trend-down">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                -1
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         2. RACE FOR THE PLAYOFFS — Seeds 5–8 bubble comparison.
         Top 6 make playoffs. The bubble is the four teams in seeds
         5–8. Rows stack vertically with a teal cutoff between seed 6
         and seed 7 marking the playoff line.
         The jc row carries a subtle yellow tint as wayfinding (mirrors
         the standings table treatment). No "you" copy anywhere.
    ────────────────────────────────────────────────────────────── -->
    <section class="bubble" aria-labelledby="bubble-headline">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta">Playoff push</p>
        <h2 class="bubble-headline" id="bubble-headline">Four teams. Two spots.</h2>
        <p class="bubble-deck">Three weeks left to settle the bubble.</p>
      </header>

      <ol class="bubble-list" role="list">
        <template v-for="(row, idx) in bubbleRows" :key="row.teamId">
          <li
            class="bubble-row"
            :class="{
              'bubble-row-in':  row.inPlayoffs,
              'bubble-row-out': !row.inPlayoffs,
              'bubble-row-mine': getTeam(row.teamId).isMyTeam,
            }"
          >
            <span class="bubble-seed" :class="{ 'bubble-seed-in': row.inPlayoffs }">{{ row.rank }}</span>

            <div class="bubble-team">
              <div
                class="bubble-avatar"
                :style="{ background: `linear-gradient(135deg, ${getTeam(row.teamId).avatarColor})` }"
              >
                <img
                  v-if="getTeam(row.teamId).avatarUrl"
                  :src="getTeam(row.teamId).avatarUrl"
                  class="avatar-image"
                  alt=""
                />
                <span v-else>{{ getTeam(row.teamId).ownerInitials }}</span>
                <span
                  v-if="getTeam(row.teamId).isMyTeam"
                  class="bubble-star"
                  aria-label="My team marker"
                  title="My team"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <polygon points="12 2 15 9 22 9.5 16.5 14.5 18 22 12 18 6 22 7.5 14.5 2 9.5 9 9"/>
                  </svg>
                </span>
              </div>
              <div class="bubble-name-block">
                <p class="bubble-name">{{ getTeam(row.teamId).name }}</p>
                <p class="bubble-owner">{{ getTeam(row.teamId).ownerName }}</p>
              </div>
            </div>

            <span class="bubble-record">{{ row.wins }}-{{ row.losses }}</span>

            <span class="bubble-dots" :aria-label="`Last 5 games: ${row.lastFive.join(', ')}`">
              <span
                v-for="(r, i) in row.lastFive"
                :key="i"
                class="bubble-dot"
                :class="r === 'W' ? 'bubble-dot-w' : 'bubble-dot-l'"
                aria-hidden="true"
              ></span>
            </span>

            <span
              class="bubble-streak"
              :class="row.streak.startsWith('W') ? 'bubble-streak-win' : 'bubble-streak-loss'"
            >{{ row.streak }}</span>

            <span class="bubble-gap" :class="{ 'bubble-gap-out': !row.inPlayoffs }">
              <template v-if="row.inPlayoffs">in</template>
              <template v-else>+{{ row.gamesBack }} to bubble</template>
            </span>
          </li>

          <!-- Playoff line sits between seed 6 (idx 1) and seed 7 (idx 2). -->
          <li v-if="idx === 1" class="bubble-cutoff" aria-hidden="true">
            <span class="bubble-cutoff-line"></span>
            <span class="bubble-cutoff-label">Playoff line</span>
            <span class="bubble-cutoff-line"></span>
          </li>
        </template>
      </ol>

      <p class="bubble-closer">
        By the Numbers and Reign Delay hold the last two seats. Commish Impossible and 5th Year Senior need wins.
      </p>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         3. WEEK 10 RESULTS — Horizontal editorial track (5 pages)
    ────────────────────────────────────────────────────────────── -->
    <section class="story-track-section" aria-labelledby="recap-h">
      <header class="section-head section-head-flex">
        <div>
          <p class="section-eyebrow section-eyebrow-mute">Week {{ currentWeek - 1 }} results</p>
          <h2 id="recap-h" class="section-headline">Five stories from last week.</h2>
        </div>
        <div class="track-arrows" aria-hidden="false">
          <button
            type="button"
            class="arrow-btn"
            :disabled="atStart"
            aria-label="Previous page"
            @click="scrollTrack(-1)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            type="button"
            class="arrow-btn"
            :disabled="atEnd"
            aria-label="Next page"
            @click="scrollTrack(1)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </header>

      <div
        ref="trackRef"
        class="story-track"
        role="region"
        aria-roledescription="carousel"
        aria-label="Week 10 stories"
      >
        <!-- ─── PAGE 1: PERFORMANCE OF THE WEEK ───────────────── -->
        <article
          v-if="storyPagePerformance"
          class="story-page story-page-performance"
          :style="{ '--page-tint': storyPagePerformance.tint }"
          :aria-label="`Page 1 of 5: Performance of the week, ${storyPagePerformance.player}`"
        >
          <img
            class="story-mascot story-mascot-right-bleed"
            :src="`/demo-logos/${storyPagePerformance.teamId}.jpg`"
            :alt="`${storyPagePerformance.teamName} logo`"
          />
          <div class="story-content">
            <div class="story-head">
              <span class="story-index">01 / 05</span>
              <span class="story-tag story-tag-teal">Performance of the week</span>
            </div>
            <h3 class="story-headline">Gibbs went off.</h3>
            <div class="story-stat-block">
              <p class="story-stat-hero story-stat-hero-teal">{{ storyPagePerformance.points.toFixed(1) }}</p>
              <p class="story-stat-label">Fantasy points</p>
              <p class="story-stat-line">{{ storyPagePerformance.statLine }}</p>
            </div>
            <p class="story-body">
              Almost Famous hung 142.1, the highest score of the slate. They put away
              By the Numbers by 23.4.
            </p>
          </div>
        </article>

        <!-- ─── PAGE 2: THE COLLAPSE ──────────────────────────── -->
        <article
          v-if="storyPageCollapse"
          class="story-page story-page-collapse"
          :aria-label="`Page 2 of 5: The collapse, ${storyPageCollapse.player}`"
        >
          <img
            class="story-mascot story-mascot-stamp"
            :src="`/demo-logos/${storyPageCollapse.teamId}.jpg`"
            :alt="`${storyPageCollapse.teamName} logo`"
          />
          <div class="story-content">
            <div class="story-head">
              <span class="story-index">02 / 05</span>
              <span class="story-tag story-tag-magenta">The collapse</span>
            </div>
            <h3 class="story-headline">Nabers vanished.</h3>
            <div class="story-stat-block">
              <p class="story-stat-hero story-stat-hero-magenta">
                {{ storyPageCollapse.points.toFixed(1) }}
                <span class="story-stat-glyph" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </span>
              </p>
              <p class="story-stat-label">Fantasy points</p>
              <p class="story-stat-line">{{ storyPageCollapse.statLine }}</p>
            </div>
            <p class="story-body">
              Reign Delay needed a real game from him. Three catches on seven targets,
              fourteen yards. The Glow Up ran them off the field by 30.3.
            </p>
          </div>
        </article>

        <!-- ─── PAGE 3: STATEMENT WIN ─────────────────────────── -->
        <article
          v-if="storyPageStatement"
          class="story-page story-page-statement"
          :style="{ '--page-tint': storyPageStatement.tint }"
          :aria-label="`Page 3 of 5: Statement win, ${storyPageStatement.player}`"
        >
          <img
            class="story-mascot story-mascot-corner-bleed"
            :src="`/demo-logos/${storyPageStatement.teamId}.jpg`"
            :alt="`${storyPageStatement.teamName} logo`"
          />
          <div class="story-content">
            <div class="story-head">
              <span class="story-index">03 / 05</span>
              <span class="story-tag story-tag-green">Statement win</span>
            </div>
            <h3 class="story-headline">Henry steamrolled.</h3>
            <div class="story-stat-block">
              <p class="story-stat-hero story-stat-hero-green">{{ storyPageStatement.points.toFixed(1) }}</p>
              <p class="story-stat-label">Fantasy points</p>
              <p class="story-stat-line">{{ storyPageStatement.statLine }}</p>
            </div>
            <p class="story-body">
              138.6 to 108.3. The Glow Up just announced themselves as a problem for anyone
              left in the bracket.
            </p>
          </div>
        </article>

        <!-- ─── PAGE 4: PLAYOFF KEEPER ────────────────────────── -->
        <article
          v-if="storyPageYourWeek"
          class="story-page story-page-keeper"
          :aria-label="`Page 4 of 5: Playoff keeper, ${storyPageYourWeek.player}`"
        >
          <img
            class="story-mascot story-mascot-dual-top"
            src="/demo-logos/jc.jpg"
            alt="Commish Impossible logo"
          />
          <img
            class="story-mascot story-mascot-dual-bottom"
            src="/demo-logos/bn.jpg"
            alt="5th Year Senior logo"
          />
          <div class="story-content">
            <div class="story-head">
              <span class="story-index">04 / 05</span>
              <span class="story-tag story-tag-green">Playoff keeper</span>
            </div>
            <h3 class="story-headline">{{ storyPageYourWeek.surname }} kept Commish Impossible alive.</h3>
            <div class="story-stat-block">
              <p class="story-stat-hero story-stat-hero-green">{{ storyPageYourWeek.points.toFixed(1) }}</p>
              <p class="story-stat-label">Fantasy points</p>
              <p class="story-stat-line">{{ storyPageYourWeek.statLine }}</p>
            </div>
            <p class="story-body">
              Commish Impossible beat 5th Year Senior 124.7 to 108.2. One step toward
              the bubble.
            </p>
          </div>
        </article>

        <!-- ─── PAGE 5: RECEIPTS ──────────────────────────────── -->
        <article
          class="story-page story-page-receipts"
          aria-label="Page 5 of 5: All five scores"
        >
          <div class="story-content story-content-receipts">
            <div class="story-head">
              <span class="story-index">05 / 05</span>
              <span class="story-tag story-tag-mute">All five scores</span>
            </div>
            <h3 class="story-headline story-headline-receipts">Receipts.</h3>
            <ol class="receipts-list" role="list">
              <li
                v-for="row in receiptsRows"
                :key="row.id"
                class="receipts-row"
              >
                <div class="receipts-side receipts-side-winner">
                  <span
                    class="receipts-avatar"
                    :style="{ background: `linear-gradient(135deg, ${getTeam(row.winnerId).avatarColor})` }"
                  >
                    <img
                      v-if="getTeam(row.winnerId).avatarUrl"
                      class="avatar-image"
                      :src="getTeam(row.winnerId).avatarUrl"
                      alt=""
                    />
                    <span v-else>{{ getTeam(row.winnerId).ownerInitials }}</span>
                  </span>
                  <span class="receipts-name">{{ getTeam(row.winnerId).name }}</span>
                  <span class="receipts-score">{{ row.winnerScore.toFixed(1) }}</span>
                </div>
                <span class="receipts-sep" aria-hidden="true">·</span>
                <div class="receipts-side receipts-side-loser">
                  <span
                    class="receipts-avatar receipts-avatar-dim"
                    :style="{ background: `linear-gradient(135deg, ${getTeam(row.loserId).avatarColor})` }"
                  >
                    <img
                      v-if="getTeam(row.loserId).avatarUrl"
                      class="avatar-image"
                      :src="getTeam(row.loserId).avatarUrl"
                      alt=""
                    />
                    <span v-else>{{ getTeam(row.loserId).ownerInitials }}</span>
                  </span>
                  <span class="receipts-name receipts-name-dim">{{ getTeam(row.loserId).name }}</span>
                  <span class="receipts-score receipts-score-dim">{{ row.loserScore.toFixed(1) }}</span>
                </div>
                <span
                  class="receipts-margin"
                  :class="row.margin > 25 ? 'receipts-margin-big' : 'receipts-margin-flat'"
                >+{{ row.margin.toFixed(1) }}</span>
              </li>
            </ol>
          </div>
        </article>
      </div>

      <div class="track-dots" role="tablist" aria-label="Page indicator">
        <button
          v-for="i in 5"
          :key="i"
          type="button"
          class="track-dot"
          :class="{ active: activePage === i }"
          :aria-selected="activePage === i"
          role="tab"
          :aria-label="`Go to page ${i} of 5`"
          @click="goToPage(i)"
        />
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         4. WEEK 11 — LIVE TODAY (compact preview of matchups)
    ────────────────────────────────────────────────────────────── -->
    <section class="live" aria-labelledby="live-headline">
      <header class="section-head section-head-flex">
        <div>
          <p class="section-eyebrow section-eyebrow-teal live-eyebrow">
            <span class="live-eyebrow-dot" aria-hidden="true"></span>
            Week {{ currentWeek }} · Live today
          </p>
          <h2 class="live-headline" id="live-headline">What's happening now.</h2>
        </div>
        <router-link to="/demo/matchups" class="section-link">
          View full matchups
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </router-link>
      </header>

      <ul class="live-list" role="list">
        <li
          v-for="m in matchupsWeek11"
          :key="m.id"
          class="live-row"
          :class="{ 'live-row-spotlight': m.id === matchupOfTheWeekId }"
          tabindex="0"
          role="link"
          :aria-label="`Open ${getTeam(m.homeTeamId).name} versus ${getTeam(m.awayTeamId).name}`"
          @click="goToMatchups"
          @keydown.enter.prevent="goToMatchups"
          @keydown.space.prevent="goToMatchups"
        >
          <span class="live-spotlight-edge" v-if="m.id === matchupOfTheWeekId" aria-hidden="true"></span>

          <!-- Status pip -->
          <span class="live-status" :class="`live-status-${m.status}`">
            <span v-if="m.status === 'live'" class="live-status-dot" aria-hidden="true"></span>
            <svg v-else-if="m.status === 'final'" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span v-if="m.status === 'live'">LIVE</span>
            <span v-else-if="m.status === 'final'">FINAL</span>
            <span v-else>SOON</span>
          </span>

          <!-- Home team -->
          <div class="live-team" :class="{ 'live-team-winning': isHomeWinning(m), 'live-team-losing': isHomeLosing(m) }">
            <div class="live-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(m.homeTeamId).avatarColor})` }">
              <img v-if="getTeam(m.homeTeamId).avatarUrl" :src="getTeam(m.homeTeamId).avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ getTeam(m.homeTeamId).ownerInitials }}</span>
            </div>
            <p class="live-team-name">{{ getTeam(m.homeTeamId).name }}</p>
            <p class="live-team-score">{{ m.status === 'upcoming' ? m.homeProjected.toFixed(1) : m.homeScore.toFixed(1) }}</p>
          </div>

          <span class="live-vs" aria-hidden="true">vs</span>

          <!-- Away team -->
          <div class="live-team" :class="{ 'live-team-winning': isAwayWinning(m), 'live-team-losing': isAwayLosing(m) }">
            <div class="live-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(m.awayTeamId).avatarColor})` }">
              <img v-if="getTeam(m.awayTeamId).avatarUrl" :src="getTeam(m.awayTeamId).avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ getTeam(m.awayTeamId).ownerInitials }}</span>
            </div>
            <p class="live-team-name">{{ getTeam(m.awayTeamId).name }}</p>
            <p class="live-team-score">{{ m.status === 'upcoming' ? m.awayProjected.toFixed(1) : m.awayScore.toFixed(1) }}</p>
          </div>

          <!-- Win prob chip -->
          <span
            v-if="m.status !== 'final'"
            class="live-prob"
            :style="{ color: probColorFor(m), borderColor: probBorderFor(m), background: probBgFor(m) }"
          >
            {{ probSideLabel(m) }} {{ probDisplayValue(m) }}%
          </span>
          <span v-else class="live-prob live-prob-final">FINAL</span>
        </li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         5. STANDINGS — Compact (top 6 playoff line)
    ────────────────────────────────────────────────────────────── -->
    <section class="standings" aria-labelledby="standings-headline">
      <header class="section-head section-head-flex">
        <div>
          <p class="section-eyebrow section-eyebrow-magenta">Standings</p>
          <h2 class="standings-headline" id="standings-headline">Top {{ playoffCutoff }} make the playoffs.</h2>
        </div>
        <router-link to="/demo/power-rankings" class="section-link">
          View full rankings
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </router-link>
      </header>

      <div class="stand-head" role="presentation" aria-hidden="true">
        <span class="stand-head-cell stand-head-rank"></span>
        <span class="stand-head-cell stand-head-team">Team</span>
        <span class="stand-head-cell stand-head-rec">W-L</span>
        <span class="stand-head-cell stand-head-pf">PF</span>
        <span class="stand-head-cell stand-head-allplay">All-Play</span>
        <span class="stand-head-cell stand-head-last6">Last 6</span>
        <span class="stand-head-cell stand-head-streak">Streak</span>
      </div>

      <ol class="stand-list" role="list">
        <li
          v-for="row in standings"
          :key="row.teamId"
          class="stand-row"
          :class="{ 'stand-row-mine': getTeam(row.teamId).isMyTeam, 'stand-row-cutoff': row.rank === 6 }"
          tabindex="0"
          role="button"
          :aria-label="`Open team detail for ${getTeam(row.teamId).name}`"
          @click="openTeamDetail(row.teamId)"
          @keydown.enter.prevent="openTeamDetail(row.teamId)"
          @keydown.space.prevent="openTeamDetail(row.teamId)"
        >
          <span class="stand-rank" :class="{ 'stand-rank-playoff': row.playoff }">
            {{ row.rank }}
            <span v-if="row.playoff" class="stand-rank-dot" aria-hidden="true"></span>
          </span>

          <div class="stand-team">
            <div class="stand-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(row.teamId).avatarColor})` }">
              <img v-if="getTeam(row.teamId).avatarUrl" :src="getTeam(row.teamId).avatarUrl" class="avatar-image" alt="" />
              <span v-else>{{ getTeam(row.teamId).ownerInitials }}</span>
              <span v-if="getTeam(row.teamId).isMyTeam" class="stand-star" aria-label="Your team" title="Your team">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <polygon points="12 2 15 9 22 9.5 16.5 14.5 18 22 12 18 6 22 7.5 14.5 2 9.5 9 9"/>
                </svg>
              </span>
            </div>
            <div class="stand-name-block">
              <p class="stand-name">{{ getTeam(row.teamId).name }}</p>
              <p class="stand-owner">{{ getTeam(row.teamId).ownerName }}</p>
            </div>
          </div>

          <span class="stand-record">{{ row.wins }}-{{ row.losses }}</span>

          <span class="stand-pf">{{ formatPf(row.pointsFor) }}</span>

          <span class="stand-allplay">{{ allPlayFor(row.teamId) }}</span>

          <span class="stand-last6" aria-hidden="true">
            <svg class="stand-spark" viewBox="0 0 80 24" preserveAspectRatio="none">
              <path
                class="stand-spark-line"
                :d="rowSparkPath(row.teamId)"
                :stroke="sparkStrokeFor(row.teamId)"
              />
              <circle
                class="stand-spark-dot"
                :cx="rowSparkEnd(row.teamId).x"
                :cy="rowSparkEnd(row.teamId).y"
                r="2"
                :fill="sparkStrokeFor(row.teamId)"
              />
            </svg>
          </span>

          <span
            class="stand-streak"
            :class="row.streak.startsWith('W') ? 'stand-streak-win' : 'stand-streak-loss'"
          >{{ row.streak }}</span>
        </li>
      </ol>

      <TeamSeasonModal
        v-if="activeTeamId"
        :team-id="activeTeamId"
        @close="activeTeamId = null"
        @open-signup="$emit('open-signup')"
      />
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         5b. POINTS PER WEEK — multi-team chart with featured lines
    ────────────────────────────────────────────────────────────── -->
    <section class="ppw" aria-labelledby="ppw-headline">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal">Points per week</p>
        <h2 class="ppw-headline" id="ppw-headline">Who's been heating up.</h2>
      </header>

      <div class="ppw-chart-wrap">
        <svg
          class="ppw-chart"
          :viewBox="`0 0 ${PPW_W} ${PPW_H}`"
          role="img"
          aria-label="Weekly points-for trajectory for every team in the league"
          preserveAspectRatio="none"
        >
          <!-- Gridlines -->
          <g class="ppw-grid" aria-hidden="true">
            <line
              v-for="gy in ppwGridY"
              :key="`pgl-${gy.value}`"
              :x1="PPW_PAD_L"
              :x2="PPW_W - PPW_PAD_R"
              :y1="gy.y"
              :y2="gy.y"
            />
            <text
              v-for="gy in ppwGridY"
              :key="`pgt-${gy.value}`"
              class="ppw-grid-label"
              :x="PPW_PAD_L - 8"
              :y="gy.y + 3"
              text-anchor="end"
            >{{ gy.value }}</text>
          </g>

          <!-- Background lines (the 8 non-featured teams) — quiet so the featured trio dominates. -->
          <!-- League average dashed line -->
          <path
            class="ppw-line-avg"
            :d="ppwAvgPath"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-dasharray="4 4"
          />

          <!-- Featured top scorer -->
          <path
            class="ppw-line-top"
            :d="topScorerPath"
            fill="none"
            :stroke="topScorerColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Featured my team -->
          <path
            class="ppw-line-mine"
            :d="myTeamPath"
            fill="none"
            stroke="var(--accent-primary)"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />

          <!-- Endpoint labels — y values run through endpointY() so any pair within
               14px of each other gets staggered downward to avoid label collisions. -->
          <g v-if="topScorerEnd" class="ppw-end-label">
            <text
              :x="topScorerEnd.x + 6"
              :y="endpointY('top', topScorerEnd.y) + 4"
              :fill="topScorerColor"
              text-anchor="start"
            >{{ topScorerTeam.name }}</text>
          </g>
          <g v-if="myTeamEnd" class="ppw-end-label">
            <text
              :x="myTeamEnd.x + 6"
              :y="endpointY('mine', myTeamEnd.y) + 4"
              fill="var(--accent-primary)"
              text-anchor="start"
            >{{ myTeam.name }}</text>
          </g>
          <g v-if="avgEnd" class="ppw-end-label">
            <text
              :x="avgEnd.x + 6"
              :y="endpointY('avg', avgEnd.y) + 4"
              fill="var(--ink-4)"
              text-anchor="start"
            >League avg</text>
          </g>

          <!-- X axis week labels -->
          <g class="ppw-x-labels" aria-hidden="true">
            <text
              v-for="(_, i) in ppwWeekXs"
              :key="`pxl-${i}`"
              class="ppw-x-label"
              :x="ppwWeekXs[i]"
              :y="PPW_H - 6"
              text-anchor="middle"
            >Wk {{ i + 1 }}</text>
          </g>

          <!-- Annotation: Wk 8 Built Different takes #1 -->
          <g v-if="annotation" class="ppw-annotation">
            <line
              :x1="annotation.dotX"
              :y1="annotation.dotY"
              :x2="annotation.labelX"
              :y2="annotation.labelY - 6"
              stroke="var(--accent-secondary)"
              stroke-width="1"
              stroke-dasharray="2 3"
            />
            <circle :cx="annotation.dotX" :cy="annotation.dotY" r="4" fill="var(--accent-secondary)" />
            <text
              class="ppw-annotation-label"
              :x="annotation.labelX"
              :y="annotation.labelY"
              text-anchor="middle"
              fill="var(--accent-secondary)"
            >Wk 8: Built Different takes #1</text>
          </g>
        </svg>
      </div>

      <ul class="ppw-legend" role="list">
        <li class="ppw-legend-pill">
          <span class="ppw-legend-dot ppw-legend-dot-mine" aria-hidden="true"></span>
          Your team
        </li>
        <li class="ppw-legend-pill">
          <span class="ppw-legend-dot" :style="{ background: topScorerColor }" aria-hidden="true"></span>
          Top scorer this season ({{ topScorerTeam.name }})
        </li>
        <li class="ppw-legend-pill">
          <span class="ppw-legend-dash" aria-hidden="true"></span>
          League average
        </li>
      </ul>

      <p class="ppw-caption">Tap a team in the standings above to see their full weekly trajectory.</p>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         6. AROUND THE LEAGUE — 5 news ticker rows
    ────────────────────────────────────────────────────────────── -->
    <section class="ticker" aria-labelledby="ticker-headline">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-mute">Around the league</p>
        <h2 class="ticker-headline" id="ticker-headline">Five things worth knowing.</h2>
      </header>

      <ul class="ticker-list" role="list">
        <li
          v-for="(item, i) in tickerItems"
          :key="i"
          class="ticker-row"
          :class="[`ticker-row-${item.tone}`, item.edge ? 'ticker-row-edged' : 'ticker-row-flat']"
        >
          <span class="ticker-edge" :class="`ticker-edge-${item.tone}`" v-if="item.edge" aria-hidden="true"></span>
          <span class="ticker-dot" :class="`ticker-dot-${item.tone}`" aria-hidden="true"></span>
          <span class="ticker-tag" :class="`ticker-tag-${item.tone}`">{{ item.tag }}</span>
          <p class="ticker-copy">{{ item.copy }}</p>
        </li>
      </ul>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         7. QUICK READS — footer pills
    ────────────────────────────────────────────────────────────── -->
    <section class="quick" aria-labelledby="quick-heading">
      <h2 class="section-eyebrow section-eyebrow-mute" id="quick-heading">Quick reads</h2>
      <ul class="pills" role="list">
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-tertiary" aria-hidden="true"></span>
          <span class="pill-label">Top scorer this week</span>
          <span class="pill-value">5th Year Senior · 124.7</span>
        </li>
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-secondary" aria-hidden="true"></span>
          <span class="pill-label">Biggest upset</span>
          <span class="pill-value">Commish Impossible over Reign Delay · +15.5</span>
        </li>
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-up" aria-hidden="true"></span>
          <span class="pill-label">Hottest streak</span>
          <span class="pill-value">Built Different · W3</span>
        </li>
        <li class="pill" role="listitem">
          <span class="pill-dot pill-dot-mute" aria-hidden="true"></span>
          <span class="pill-label">On the bubble</span>
          <span class="pill-value">{{ ordinal(myStanding.rank) }} place {{ myTeam.name }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  teams,
  standings2025Week11,
  matchupsWeek10,
  matchupsWeek11,
  matchupOfTheWeekId,
  headlineThisWeek,
  currentWeek,
  playoffCutoff,
  getTeam,
  seasonRankHistory,
  teamSeasonStats,
  teamLastFiveResults,
  weeklyPF,
  weeklyLeagueAverage,
  week10PlayerCallouts,
  type Matchup,
} from '@/fixtures/pillarsLeague'
import TeamSeasonModal from '@/components/demo/TeamSeasonModal.vue'
import { accentFor, accentStops } from '@/utils/teamColor'
import { smoothPath, type Point } from '@/utils/svgPath'
import { ordinal } from '@/utils/format'

defineEmits<{ (e: 'open-signup'): void }>()

const router = useRouter()

const headline = headlineThisWeek
const protagonist = getTeam(headline.protagonistTeamId)
const antagonist = getTeam(headline.antagonistTeamId)

// My team = Commish Impossible (jc). Used only for the standings/chart
// wayfinding affordances and the closing Quick Reads pill.
const myTeam = teams.find(t => t.isMyTeam)!
const myStanding = standings2025Week11.find(s => s.teamId === myTeam.id)!

/* ─────────────────────────────────────────────────────────────────
   PLAYOFF BUBBLE — Seeds 5–8 only. Rows render in seed order so the
   playoff line lands between seed 6 and seed 7 by index. Games-back
   is computed relative to the last in-playoff seed (6); ties on
   record fall back to a fractional 1-game gap based on which side
   of the line the team sits, so the chip stays meaningful.
───────────────────────────────────────────────────────────────── */
interface BubbleRow {
  teamId: string
  rank: number
  wins: number
  losses: number
  streak: string
  inPlayoffs: boolean
  gamesBack: number
  lastFive: ('W' | 'L')[]
}
const bubbleRows = computed<BubbleRow[]>(() => {
  const rows = standings2025Week11.filter(s => s.rank >= 5 && s.rank <= 8)
  const cutoffStanding = standings2025Week11.find(s => s.rank === playoffCutoff)
  const cutoffWins = cutoffStanding?.wins ?? 0
  return rows.map(s => {
    const inPlayoffs = s.rank <= playoffCutoff
    // Whole-game gap from the last playoff seed. Ties (e.g. wg 5-6 vs jc 5-6)
    // resolve to 1, mirroring how the standings table treats them.
    let gamesBack = 0
    if (!inPlayoffs) {
      const diff = cutoffWins - s.wins
      gamesBack = diff > 0 ? diff : 1
    }
    return {
      teamId: s.teamId,
      rank: s.rank,
      wins: s.wins,
      losses: s.losses,
      streak: s.streak,
      inPlayoffs,
      gamesBack,
      lastFive: teamLastFiveResults[s.teamId] ?? [],
    }
  })
})

// Week 10 receipts rows (ordered by margin descending — the scoreboard page
// reads as its own narrative arc: biggest blowouts first).
const receiptsRows = computed(() => {
  return matchupsWeek10
    .map(m => {
      const homeWon = m.homeScore > m.awayScore
      const winnerId = homeWon ? m.homeTeamId : m.awayTeamId
      const loserId = homeWon ? m.awayTeamId : m.homeTeamId
      const winnerScore = homeWon ? m.homeScore : m.awayScore
      const loserScore = homeWon ? m.awayScore : m.homeScore
      return {
        id: m.id,
        winnerId,
        loserId,
        winnerScore,
        loserScore,
        margin: winnerScore - loserScore,
      }
    })
    .sort((a, b) => b.margin - a.margin)
})

/* ─────────────────────────────────────────────────────────────────
   STORY TRACK — Five editorial pages for Week 10. Each card binds
   its hero stat to a Week10PlayerCallout entry so copy stays in
   sync with the fixture.
───────────────────────────────────────────────────────────────── */
interface StoryPageData {
  player: string
  surname: string
  position: string
  points: number
  statLine: string
  teamId: string
  teamName: string
  tint: string
}
function calloutToPage(role: 'hero' | 'collapse' | 'closer' | 'your-team'): StoryPageData | null {
  const c = week10PlayerCallouts.find(x => x.role === role)
  if (!c) return null
  const team = getTeam(c.fantasyTeamId)
  const tint = accentFor(team).replace(/\)$/, ' / 0.08)')
  const parts = c.playerName.split(' ')
  const surname = parts[parts.length - 1] ?? c.playerName
  return {
    player: c.playerName,
    surname,
    position: c.position,
    points: c.fantasyPoints,
    statLine: c.statLine.toUpperCase(),
    teamId: c.fantasyTeamId,
    teamName: team.name,
    tint,
  }
}
const storyPagePerformance = computed(() => calloutToPage('hero'))
const storyPageCollapse    = computed(() => calloutToPage('collapse'))
const storyPageStatement   = computed(() => calloutToPage('closer'))
const storyPageYourWeek    = computed(() => calloutToPage('your-team'))

// Track state — IntersectionObserver tracks which page is active, arrows
// step one page, dots jump directly.
const trackRef = ref<HTMLElement | null>(null)
const activePage = ref(1)
const atStart = ref(true)
const atEnd = ref(false)
let trackObserver: IntersectionObserver | null = null

function scrollTrack(direction: -1 | 1) {
  const el = trackRef.value
  if (!el) return
  const firstPage = el.querySelector('.story-page') as HTMLElement | null
  const pageWidth = firstPage?.clientWidth ?? 520
  el.scrollBy({ left: direction * (pageWidth + 16), behavior: 'smooth' })
}

function goToPage(n: number) {
  const el = trackRef.value
  if (!el) return
  const pages = el.querySelectorAll('.story-page')
  const target = pages[n - 1] as HTMLElement | undefined
  target?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
}

function updateTrackEdges() {
  const el = trackRef.value
  if (!el) return
  atStart.value = el.scrollLeft < 4
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
}

onMounted(() => {
  const el = trackRef.value
  if (!el) return
  const pages = Array.from(el.querySelectorAll('.story-page'))
  trackObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        const idx = pages.indexOf(entry.target as Element) + 1
        if (idx > 0) activePage.value = idx
      }
    })
    updateTrackEdges()
  }, { root: el, threshold: 0.5 })
  pages.forEach(p => trackObserver?.observe(p))

  el.addEventListener('scroll', updateTrackEdges, { passive: true })
  updateTrackEdges()
})

onBeforeUnmount(() => {
  trackObserver?.disconnect()
  trackObserver = null
  const el = trackRef.value
  el?.removeEventListener('scroll', updateTrackEdges)
})

const standings = standings2025Week11

// Around-the-league ticker items.
// `edge: true` means render a 2px tinted left edge for emphasis.
interface TickerItem {
  tone: 'up' | 'down' | 'neutral'
  tag: string
  copy: string
  edge: boolean
}
const tickerItems: TickerItem[] = [
  {
    tone: 'up',
    tag: 'Hot streak',
    copy: 'Built Different just took #1 from Throne Vacant. First time in two years.',
    edge: true,
  },
  {
    tone: 'down',
    tag: 'Rough patch',
    copy: 'Reign Delay: 3 straight losses. The defending champ is collapsing.',
    edge: true,
  },
  {
    tone: 'neutral',
    tag: 'Bubble watch',
    copy: 'Commish Impossible clawed back to .500. Now 1 game from the bubble.',
    edge: false,
  },
  {
    tone: 'neutral',
    tag: 'Top scorer',
    copy: '5th Year Senior posted 124.7 last week. Highest score of the slate.',
    edge: false,
  },
  {
    tone: 'down',
    tag: 'Blowout',
    copy: 'Auto-Draft Allstars: 5-game losing streak. Toilet bowl bound.',
    edge: false,
  },
]

// Live row helpers
function isHomeWinning(m: Matchup) {
  if (m.status === 'upcoming') return false
  return m.homeScore > m.awayScore
}
function isAwayWinning(m: Matchup) {
  if (m.status === 'upcoming') return false
  return m.awayScore > m.homeScore
}
function isHomeLosing(m: Matchup) {
  if (m.status !== 'final') return false
  return m.homeScore < m.awayScore
}
function isAwayLosing(m: Matchup) {
  if (m.status !== 'final') return false
  return m.awayScore < m.homeScore
}

// Win-prob chip: show the side that's favored (home if winProb>=50, else away).
function probFavorsHome(m: Matchup) {
  return m.winProb >= 50
}
function probDisplayValue(m: Matchup) {
  return probFavorsHome(m) ? m.winProb : 100 - m.winProb
}
function probSideLabel(m: Matchup) {
  const favored = probFavorsHome(m) ? getTeam(m.homeTeamId) : getTeam(m.awayTeamId)
  // Use a compact 2-letter token from the team id so the chip stays short.
  return favored.id.toUpperCase()
}
function probColorFor(m: Matchup) {
  const favored = probFavorsHome(m) ? getTeam(m.homeTeamId) : getTeam(m.awayTeamId)
  return accentFor(favored)
}
function probBorderFor(m: Matchup) {
  const color = probColorFor(m)
  // Inject alpha into the oklch() string: "oklch(L C H)" -> "oklch(L C H / 0.36)"
  return color.replace(/\)$/, ' / 0.36)')
}
function probBgFor(m: Matchup) {
  const color = probColorFor(m)
  return color.replace(/\)$/, ' / 0.10)')
}

// Navigation
function goToMatchups() {
  router.push('/demo/matchups')
}

// Team detail modal state (opens when a standings row is clicked).
const activeTeamId = ref<string | null>(null)
function openTeamDetail(teamId: string) {
  activeTeamId.value = teamId
}

// Standings extras: formatted PF, all-play record, and the last-6 sparkline.
function formatPf(pf: number) {
  return pf.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
function allPlayFor(teamId: string) {
  const s = teamSeasonStats[teamId]
  return `${s.allPlayWins}-${s.allPlayLosses}`
}

// Sparkline — last 6 weeks of rank, mirrors the inline approach in DemoPowerRankingsView.
// (Fixture only carries rank history, not weekly PF, so we reuse the rank shape as the
// "form" sparkline — same data the full Power Rankings table renders.)
const SPARK_W = 80
const SPARK_H = 24
const SPARK_PAD_X = 3
const SPARK_PAD_Y = 3
const RANK_COUNT = 10

function rankHistoryFor(teamId: string): number[] {
  return seasonRankHistory.slice(-6).map(w => w.ranks[teamId] ?? 10)
}
function rowSparkPoints(teamId: string) {
  const ranks = rankHistoryFor(teamId)
  return ranks.map((r, i) => ({
    x: SPARK_PAD_X + (i / (ranks.length - 1)) * (SPARK_W - SPARK_PAD_X * 2),
    // Lower rank = higher on chart (invert: rank 1 → top)
    y: SPARK_PAD_Y + ((r - 1) / (RANK_COUNT - 1)) * (SPARK_H - SPARK_PAD_Y * 2),
  }))
}
function rowSparkPath(teamId: string): string {
  return smoothPath(rowSparkPoints(teamId))
}
function rowSparkEnd(teamId: string) {
  const pts = rowSparkPoints(teamId)
  return pts[pts.length - 1] ?? { x: 0, y: 0 }
}
function sparkStrokeFor(teamId: string) {
  // First OKLCH stop from the team's avatar gradient, at ~80% alpha.
  return accentFor(getTeam(teamId)).replace(/\)$/, ' / 0.80)')
}

/* ─────────────────────────────────────────────────────────────────
   POINTS PER WEEK CHART — multi-team trajectory.
   Top scorer + my-team are featured; other 7 teams fade to 25%.
   League average line lays a quiet baseline behind everything.
───────────────────────────────────────────────────────────────── */
const PPW_W = 960
const PPW_H = 280
const PPW_PAD_L = 40
const PPW_PAD_R = 110  // extra right padding for endpoint labels
const PPW_PAD_T = 18
const PPW_PAD_B = 24
const PPW_Y_MIN = 50
const PPW_Y_MAX = 160
const PPW_WEEKS = 11

function ppwX(week: number): number {
  return PPW_PAD_L + ((week - 1) / (PPW_WEEKS - 1)) * (PPW_W - PPW_PAD_L - PPW_PAD_R)
}
function ppwY(v: number): number {
  const clamped = Math.max(PPW_Y_MIN, Math.min(PPW_Y_MAX, v))
  const t = (clamped - PPW_Y_MIN) / (PPW_Y_MAX - PPW_Y_MIN)
  return PPW_PAD_T + (1 - t) * (PPW_H - PPW_PAD_T - PPW_PAD_B)
}

const ppwGridY = computed(() =>
  [75, 100, 125, 150].map((v) => ({ value: v, y: ppwY(v) })),
)
const ppwWeekXs = computed(() => Array.from({ length: PPW_WEEKS }, (_, i) => ppwX(i + 1)))

interface PPWPoint { x: number; y: number; week: number; value: number }
function ppwPoints(arr: number[]): PPWPoint[] {
  const pts: PPWPoint[] = []
  arr.forEach((v, idx) => {
    if (v > 0) pts.push({ x: ppwX(idx + 1), y: ppwY(v), week: idx + 1, value: v })
  })
  return pts
}
function ppwSmooth(pts: PPWPoint[]): string {
  return smoothPath(pts as Point[])
}
function ppwAccentStops(teamId: string): string[] {
  return accentStops(getTeam(teamId))
}

// Top scorer = team with highest cumulative PF across the season.
const topScorerTeam = computed(() => {
  let bestId = teams[0].id
  let best = -Infinity
  for (const t of teams) {
    const total = weeklyPF[t.id].reduce((a, b) => a + b, 0)
    if (total > best) { best = total; bestId = t.id }
  }
  return getTeam(bestId)
})
// Use the team's secondary OKLCH stop for the top-scorer line so it visually
// separates from the yellow my-team line even when the team's primary color
// sits in the same hue family.
const topScorerColor = computed(() => {
  const stops = ppwAccentStops(topScorerTeam.value.id)
  return stops[1] ?? stops[0]
})

const topScorerPoints = computed(() => ppwPoints(weeklyPF[topScorerTeam.value.id]))
const topScorerPath = computed(() => ppwSmooth(topScorerPoints.value))
const topScorerEnd = computed(() => topScorerPoints.value.at(-1) ?? null)

const myTeamPoints = computed(() => ppwPoints(weeklyPF[myTeam.id]))
const myTeamPath = computed(() => ppwSmooth(myTeamPoints.value))
const myTeamEnd = computed(() => myTeamPoints.value.at(-1) ?? null)

const avgPpwPoints = computed(() =>
  weeklyLeagueAverage.map((v, idx) => ({ x: ppwX(idx + 1), y: ppwY(v), week: idx + 1, value: v })),
)
const ppwAvgPath = computed(() => ppwSmooth(avgPpwPoints.value))
const avgEnd = computed(() => avgPpwPoints.value.at(-1) ?? null)


// Annotation: Built Different first leads the league in cumulative PF at Week 8.
// Verified against weeklyPF: at end of Wk 8, mm's cumulative is 1088.0, edging tc's 968.8.
// The dot attaches to the mm (Built Different) line at the (week 8, weeklyPF['mm'][7]) point.
interface Annotation { dotX: number; dotY: number; labelX: number; labelY: number }
const annotation = computed<Annotation | null>(() => {
  const idx = 7 // week 8 → index 7
  const mmScore = weeklyPF['mm']?.[idx]
  if (!mmScore) return null
  const dotX = ppwX(8)
  const dotY = ppwY(mmScore)
  return {
    dotX,
    dotY,
    labelX: dotX,
    labelY: dotY - 16,
  }
})

/* Endpoint label de-confliction.
   When the top-scorer (mm) and another endpoint (tc / avg / mine) sit within
   ~14px vertically, the labels stack on top of each other on the right edge.
   We collect all rendered endpoints, sort top→bottom, and walk through pushing
   any label that's too close to its predecessor downward by a small offset.
   Each `text` element then reads `endpointLabels[id].y` instead of the raw Y. */
const ENDPOINT_MIN_GAP = 14
interface EndpointLabel { id: string; rawY: number; y: number }
const endpointLabels = computed<Record<string, EndpointLabel>>(() => {
  const items: EndpointLabel[] = []
  if (topScorerEnd.value) items.push({ id: 'top', rawY: topScorerEnd.value.y, y: topScorerEnd.value.y })
  if (myTeamEnd.value) items.push({ id: 'mine', rawY: myTeamEnd.value.y, y: myTeamEnd.value.y })
  if (avgEnd.value) items.push({ id: 'avg', rawY: avgEnd.value.y, y: avgEnd.value.y })
  // Stable sort by raw Y ascending (top → bottom).
  items.sort((a, b) => a.rawY - b.rawY)
  for (let i = 1; i < items.length; i++) {
    const prev = items[i - 1]
    if (items[i].y - prev.y < ENDPOINT_MIN_GAP) {
      items[i].y = prev.y + ENDPOINT_MIN_GAP
    }
  }
  const map: Record<string, EndpointLabel> = {}
  for (const it of items) map[it.id] = it
  return map
})
function endpointY(id: 'top' | 'mine' | 'avg', rawY: number): number {
  return endpointLabels.value[id]?.y ?? rawY
}
</script>

<style scoped>
/* Tokens (--ink-N, --accent-*) inherited from .demo-shell in DemoLayout. */
.home {
  display: flex;
  flex-direction: column;
  gap: 56px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

/* ─── Shared section heading typography ───────────────────────── */
.section-head { margin-bottom: 18px; }
.section-head-flex {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-2);
  margin: 0 0 6px;
}
.section-eyebrow-teal    { color: var(--accent-tertiary); }
.section-eyebrow-magenta { color: var(--accent-secondary); }
.section-eyebrow-mute    { color: var(--ink-3); }

.section-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-2);
  text-decoration: none;
  padding: 6px 10px;
  border-radius: 999px;
  transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.section-link:hover { color: var(--ink-1); }
@media (prefers-reduced-motion: no-preference) {
  .section-link:hover { transform: translateX(2px); }
}
.section-link:active {
  transform: translateX(0);
  transition-duration: 100ms;
}
.section-link:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}

/* ─── 1. HERO ─────────────────────────────────────────────────── */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 40px;
  padding: 36px 36px 32px;
  background:
    radial-gradient(ellipse at top right, oklch(0.70 0.27 350 / 0.10), transparent 60%),
    oklch(0.10 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  border-radius: 24px;
  align-items: center;
}
.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 12px;
}
.hero-eyebrow-bar {
  width: 24px;
  height: 1px;
  background: var(--accent-secondary);
}
.hero-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5.5vw, 4.2rem);
  line-height: 0.92;
  letter-spacing: -0.015em;
  color: var(--ink-1);
  margin: 0 0 20px;
}
.hero-body {
  font-size: 1.02rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0 0 24px;
  max-width: 52ch;
}
.hero-share {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.32 0.012 90);
  padding: 8px 14px;
  border-radius: 999px;
  cursor: pointer;
  transition:
    transform 160ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 160ms cubic-bezier(0.22, 1, 0.36, 1),
    color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.hero-share:hover { color: var(--ink-1); border-color: oklch(0.50 0.015 90); }
@media (prefers-reduced-motion: no-preference) {
  .hero-share:hover { transform: translateY(-1px); }
}
.hero-share:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.hero-share:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}

.hero-faceoff {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 18px;
  align-items: center;
}
.faceoff-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.faceoff-avatar {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.15rem;
  letter-spacing: 0.04em;
  color: oklch(0.12 0.012 90);
  box-shadow: 0 6px 24px -10px oklch(0 0 0 / 0.6);
  overflow: hidden;
}
.faceoff-avatar-dim { opacity: 0.55; filter: saturate(0.7); }
.faceoff-meta { display: flex; flex-direction: column; gap: 2px; }
.faceoff-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
  color: var(--ink-1);
  margin: 0;
}
.faceoff-owner { font-size: 0.74rem; color: var(--ink-3); margin: 0; }
.faceoff-rankrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  margin-top: 4px;
}
.faceoff-rankchip {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  background: oklch(0.20 0.015 90);
  color: var(--ink-2);
}
.faceoff-rankchip-now  { background: oklch(0.70 0.27 350 / 0.18); color: oklch(0.85 0.20 350); }
.faceoff-rankchip-fell { background: oklch(0.20 0.015 90); color: var(--ink-3); }
.faceoff-trend {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
}
.faceoff-trend-up   { color: var(--accent-up); }
.faceoff-trend-down { color: var(--accent-down); }

.faceoff-verb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.faceoff-verb-line { width: 1px; height: 18px; background: oklch(0.30 0.015 90); }
.faceoff-verb-word {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-3);
}

@media (max-width: 880px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 28px 22px 26px;
    gap: 28px;
  }
}

/* ─── 2. BUBBLE (Race for the Playoffs) ───────────────────────── */
.bubble {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 20px;
  padding: 28px 28px 26px;
}
.bubble-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.6rem, 2.8vw, 2.2rem);
  line-height: 1.02;
  letter-spacing: -0.01em;
  color: var(--ink-1);
  margin: 0;
}
.bubble-deck {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 8px 0 0;
  max-width: 50ch;
}
.bubble-list {
  list-style: none;
  padding: 0;
  margin: 22px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bubble-row {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 56px auto 52px 96px;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: oklch(0.11 0.015 90 / 0.5);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 10px;
  transition: border-color 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.bubble-row-in  { background: oklch(0.11 0.015 90 / 0.6); }
.bubble-row-out { background: oklch(0.10 0.015 90 / 0.5); }
.bubble-row-mine {
  background: oklch(0.78 0.18 92 / 0.04);
  border-color: oklch(0.78 0.18 92 / 0.28);
}
.bubble-seed {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.5rem;
  letter-spacing: 0.01em;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.bubble-seed-in { color: var(--ink-1); }
.bubble-team {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.bubble-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: visible;
}
.bubble-avatar .avatar-image {
  border-radius: 10px;
  overflow: hidden;
}
.bubble-star {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: oklch(0.12 0.012 90);
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px oklch(0.10 0.015 90);
}
.bubble-name-block { min-width: 0; }
.bubble-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  letter-spacing: 0.005em;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bubble-owner {
  font-size: 0.75rem;
  color: var(--ink-3);
  margin: 1px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bubble-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
  justify-self: start;
}
.bubble-dots {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  justify-self: center;
}
.bubble-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.bubble-dot-w { background: var(--accent-up); }
.bubble-dot-l { background: var(--accent-secondary); }
.bubble-streak {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
  justify-self: end;
}
.bubble-streak-win  { color: var(--accent-up);        background: oklch(0.74 0.18 145 / 0.12); }
.bubble-streak-loss { color: var(--accent-secondary); background: oklch(0.70 0.27 350 / 0.12); }
.bubble-gap {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  justify-self: end;
  white-space: nowrap;
}
.bubble-gap-out { color: var(--ink-2); }

.bubble-cutoff {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 10px;
  margin: 6px 4px;
  list-style: none;
}
.bubble-cutoff-line {
  height: 1px;
  background: oklch(0.72 0.18 195 / 0.40);
}
.bubble-cutoff-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.64rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-tertiary);
}

.bubble-closer {
  margin: 18px 0 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: var(--ink-3);
  max-width: 50ch;
}

@media (max-width: 720px) {
  .bubble { padding: 22px 18px 20px; }
  .bubble-row {
    grid-template-columns: 24px minmax(0, 1fr) auto auto;
    grid-template-areas:
      "seed team   team   team"
      "seed record dots   streak"
      "seed gap    gap    gap";
    row-gap: 6px;
    column-gap: 10px;
    padding: 10px 12px;
  }
  .bubble-row > .bubble-seed   { grid-area: seed; align-self: center; }
  .bubble-row > .bubble-team   { grid-area: team; }
  .bubble-row > .bubble-record { grid-area: record; }
  .bubble-row > .bubble-dots   { grid-area: dots; justify-self: start; }
  .bubble-row > .bubble-streak { grid-area: streak; }
  .bubble-row > .bubble-gap    { grid-area: gap; justify-self: start; }
}

/* ─── 3. STORY TRACK (Week 10 results) ────────────────────────── */
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.35rem, 2.4vw, 1.6rem);
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
}

.track-arrows {
  display: flex;
  gap: 8px;
}
.arrow-btn {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: transparent;
  border: 1px solid oklch(0.28 0.012 90);
  color: oklch(0.85 0.008 90);
  cursor: pointer;
  transition:
    transform 200ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 200ms cubic-bezier(0.22, 1, 0.36, 1),
    color 200ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.arrow-btn:hover:not(:disabled) {
  color: var(--ink-1);
  border-color: oklch(0.48 0.014 90);
}
@media (prefers-reduced-motion: no-preference) {
  .arrow-btn:hover:not(:disabled) { transform: scale(1.05); }
}
.arrow-btn:active:not(:disabled) {
  transform: scale(0.95);
  transition-duration: 100ms;
}
.arrow-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.arrow-btn:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}

.story-track {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding-bottom: 8px;
}
.story-track::-webkit-scrollbar { display: none; }
.story-track { scrollbar-width: none; }

.story-page {
  flex: 0 0 520px;
  height: 440px;
  scroll-snap-align: start;
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
  padding: 32px;
  display: flex;
}

/* Page-specific tinted backgrounds ─────────────────────────────── */
.story-page-performance {
  background:
    radial-gradient(ellipse at top right, var(--page-tint, oklch(0.62 0.20 280 / 0.08)), transparent 62%),
    oklch(0.11 0.015 90);
}
.story-page-collapse {
  background:
    linear-gradient(to bottom, oklch(0.70 0.27 350 / 0.06), transparent 65%),
    oklch(0.11 0.015 90);
}
.story-page-statement {
  background:
    radial-gradient(ellipse at bottom right, var(--page-tint, oklch(0.66 0.22 30 / 0.07)), transparent 60%),
    oklch(0.11 0.015 90);
}
.story-page-keeper {
  background:
    radial-gradient(ellipse at top left, oklch(0.74 0.18 145 / 0.05), transparent 60%),
    oklch(0.11 0.015 90);
}
.story-page-receipts {
  background: oklch(0.12 0.014 90);
  border-color: oklch(0.28 0.012 90 / 0.3);
}

/* Mascot placements ─────────────────────────────────────────────── */
.story-mascot {
  position: absolute;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}
.story-mascot-right-bleed {
  width: 320px;
  height: 320px;
  right: -80px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  object-fit: contain;
}
.story-mascot-stamp {
  width: 80px;
  height: 80px;
  left: 24px;
  top: 24px;
  filter: saturate(0.5);
  transform: rotate(-8deg);
  border-radius: 12px;
  object-fit: contain;
}
.story-mascot-corner-bleed {
  width: 240px;
  height: 240px;
  right: -60px;
  bottom: -50px;
  opacity: 0.85;
  object-fit: contain;
}
.story-mascot-dual-top {
  width: 100px;
  height: 100px;
  left: 20px;
  top: 20px;
  border-radius: 16px;
  object-fit: contain;
}
.story-mascot-dual-bottom {
  width: 70px;
  height: 70px;
  right: 24px;
  bottom: 24px;
  border-radius: 12px;
  opacity: 0.8;
  object-fit: contain;
}

/* Card content ──────────────────────────────────────────────────── */
.story-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 320px;
  margin-top: auto;
  margin-bottom: 0;
}
.story-page-collapse .story-content,
.story-page-keeper .story-content { margin-top: 120px; }
.story-page-statement .story-content { max-width: 300px; }
.story-content-receipts {
  max-width: none;
  width: 100%;
  margin-top: 0;
  gap: 16px;
}

.story-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.story-index {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--ink-4);
  font-variant-numeric: tabular-nums;
}
.story-tag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.story-tag-teal    { color: var(--accent-tertiary); }
.story-tag-magenta { color: var(--accent-secondary); }
.story-tag-green   { color: var(--accent-up); }
.story-tag-mute    { color: var(--ink-4); }

.story-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.6rem;
  line-height: 0.94;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0;
}
.story-headline-receipts { font-size: 1.6rem; }

.story-stat-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.story-stat-hero {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 4.5rem;
  line-height: 0.92;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.story-stat-hero-teal    { color: var(--accent-tertiary); }
.story-stat-hero-magenta { color: var(--accent-secondary); }
.story-stat-hero-green   { color: var(--accent-up); }
.story-stat-glyph {
  display: inline-flex;
  align-items: center;
  color: currentColor;
}
.story-stat-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin: 4px 0 0;
}
.story-stat-line {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.story-body {
  font-family: 'Barlow', sans-serif;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0;
  max-width: 38ch;
}

/* Receipts page rows ────────────────────────────────────────────── */
.receipts-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.receipts-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid oklch(0.22 0.015 90);
}
.receipts-row:last-child { border-bottom: 0; }
.receipts-side {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.receipts-side-loser { justify-content: flex-start; }
.receipts-avatar {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.6rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: hidden;
}
.receipts-avatar-dim { opacity: 0.55; filter: saturate(0.7); }
.receipts-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 600;
  font-size: 0.88rem;
  letter-spacing: 0.01em;
  color: var(--ink-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}
.receipts-name-dim { color: var(--ink-3); font-weight: 500; }
.receipts-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.receipts-score-dim { color: var(--ink-3); font-weight: 600; }
.receipts-sep {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink-4);
  line-height: 1;
}
.receipts-margin {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}
.receipts-margin-big {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.12);
}
.receipts-margin-flat {
  color: var(--ink-3);
  background: transparent;
  border: 1px solid oklch(0.32 0.012 90);
}

/* Track dots ────────────────────────────────────────────────────── */
.track-dots {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-top: 16px;
}
.track-dot {
  width: 8px;
  height: 8px;
  padding: 0;
  border-radius: 999px;
  background: oklch(0.40 0.012 90 / 0.4);
  border: 0;
  cursor: pointer;
  transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1), background-color 200ms cubic-bezier(0.22, 1, 0.36, 1);
}
.track-dot.active {
  background: var(--accent-tertiary);
}
@media (prefers-reduced-motion: no-preference) {
  .track-dot.active { transform: scale(1.3); }
}
.track-dot:active {
  transform: scale(0.9);
  transition-duration: 100ms;
}
.track-dot:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}

@media (max-width: 720px) {
  .story-page { flex: 0 0 88vw; height: auto; min-height: 380px; padding: 24px; }
  .track-arrows { display: none; }
  .story-headline { font-size: 2.1rem; }
  .story-stat-hero { font-size: 3.6rem; }
  .story-mascot-right-bleed { width: 220px; height: 220px; right: -60px; opacity: 0.55; }
  .story-mascot-corner-bleed { width: 180px; height: 180px; right: -50px; bottom: -40px; opacity: 0.55; }
  .story-page-collapse .story-content,
  .story-page-keeper .story-content { margin-top: 80px; }
}

/* ─── 4. LIVE (Week 11 today) ─────────────────────────────────── */
.live-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 6px;
}
.live-eyebrow-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-up);
  display: inline-block;
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes home-pulse {
    0%, 60%, 100% { opacity: 1; transform: scale(1); }
    30% { opacity: 0.4; transform: scale(1.5); }
  }
  .live-eyebrow-dot { animation: home-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
  .live-status-dot { animation: home-pulse 2.4s infinite cubic-bezier(0.22, 1, 0.36, 1); }
}
.live-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.35rem, 2.4vw, 1.6rem);
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
}
.live-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.live-row {
  position: relative;
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}
.live-row:hover { border-color: oklch(0.30 0.015 90); }
@media (prefers-reduced-motion: no-preference) {
  .live-row:hover { transform: translateY(-1px); }
}
.live-row:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.live-row:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}
.live-row-spotlight {
  border-color: oklch(0.70 0.27 350 / 0.40);
  background:
    linear-gradient(90deg, oklch(0.70 0.27 350 / 0.06), oklch(0.11 0.015 90) 30%);
}
.live-spotlight-edge {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 2px;
  background: var(--accent-secondary);
}
.live-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 6px;
  white-space: nowrap;
  justify-self: start;
}
.live-status-live {
  color: var(--accent-down);
  background: oklch(0.65 0.20 25 / 0.10);
  border: 1px solid oklch(0.65 0.20 25 / 0.30);
}
.live-status-final {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border: 1px solid oklch(0.74 0.18 145 / 0.30);
}
.live-status-upcoming {
  color: var(--ink-3);
  background: oklch(0.16 0.015 90);
  border: 1px solid oklch(0.22 0.015 90);
}
.live-status-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--accent-down);
  display: inline-block;
}
.live-team {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.live-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.7rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: hidden;
}
.live-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.92rem;
  color: var(--ink-2);
  margin: 0;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.live-team-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 1rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  margin: 0;
  flex-shrink: 0;
}
.live-team-winning .live-team-name,
.live-team-winning .live-team-score { color: var(--ink-1); font-weight: 900; }
.live-team-losing .live-team-name,
.live-team-losing .live-team-score { color: var(--ink-3); }
.live-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.live-prob {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid oklch(0.22 0.015 90);
  background: oklch(0.16 0.015 90);
  color: var(--ink-2);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  justify-self: end;
}
.live-prob-final {
  color: var(--accent-up);
  background: oklch(0.74 0.18 145 / 0.10);
  border-color: oklch(0.74 0.18 145 / 0.30);
}

@media (max-width: 720px) {
  .live-row {
    grid-template-columns: 60px minmax(0, 1fr);
    grid-template-areas:
      "status home"
      "status away"
      "prob   prob";
    row-gap: 6px;
    padding: 10px 12px;
  }
  .live-row > .live-status { grid-area: status; align-self: center; }
  .live-row > .live-team:first-of-type { grid-area: home; }
  .live-row > .live-team:last-of-type { grid-area: away; }
  .live-row > .live-vs { display: none; }
  .live-row > .live-prob { grid-area: prob; justify-self: start; }
}

/* ─── 5. STANDINGS (compact) ──────────────────────────────────── */
.standings-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.2rem, 2.1vw, 1.4rem);
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
}
.stand-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
/* Standings column header strip — tiny small-caps cues above the rows. */
.stand-head {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 56px 68px 70px 80px 52px;
  align-items: center;
  gap: 14px;
  padding: 0 14px 6px;
  margin-bottom: 2px;
}
.stand-head-cell {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.stand-head-rec,
.stand-head-streak { justify-self: start; }
.stand-head-pf,
.stand-head-allplay { justify-self: end; }
.stand-head-last6 { justify-self: center; }
.stand-row {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 56px 68px 70px 80px 52px;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background: oklch(0.10 0.015 90 / 0.5);
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 160ms cubic-bezier(0.22, 1, 0.36, 1), transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.stand-row:hover { border-color: oklch(0.30 0.015 90); }
@media (prefers-reduced-motion: no-preference) {
  .stand-row:hover { transform: translateX(2px); }
}
.stand-row:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.stand-row:focus-visible {
  outline: 2px solid var(--accent-tertiary);
  outline-offset: 2px;
}
.stand-row-cutoff {
  border-bottom: 1px solid oklch(0.72 0.18 195 / 0.30);
  position: relative;
}
.stand-row-mine {
  background: oklch(0.78 0.18 92 / 0.06);
  border-color: oklch(0.78 0.18 92 / 0.28);
}
.stand-rank {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--ink-3);
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}
.stand-rank-playoff { color: var(--ink-1); }
.stand-rank-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-tertiary);
  display: inline-block;
}
.stand-team {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.stand-avatar {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.7rem;
  color: oklch(0.12 0.012 90);
  flex-shrink: 0;
  overflow: visible;
}
.stand-avatar .avatar-image {
  border-radius: 8px;
  overflow: hidden;
}
.stand-star {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: oklch(0.12 0.012 90);
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 2px oklch(0.10 0.015 90);
}
.stand-name-block { min-width: 0; }
.stand-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.94rem;
  letter-spacing: 0.01em;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stand-owner {
  font-size: 0.74rem;
  color: var(--ink-3);
  margin: 1px 0 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stand-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.92rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  justify-self: start;
}
.stand-pf {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.86rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  justify-self: end;
}
.stand-allplay {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.86rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  justify-self: end;
}
.stand-last6 {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 24px;
  justify-self: center;
}
.stand-spark {
  width: 80px;
  height: 24px;
  display: block;
  overflow: visible;
}
.stand-spark-line {
  fill: none;
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}
.stand-spark-dot {
  stroke: oklch(0.10 0.015 90);
  stroke-width: 1;
}
.stand-streak {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  padding: 3px 8px;
  border-radius: 6px;
  justify-self: end;
  font-variant-numeric: tabular-nums;
}
.stand-streak-win  { color: var(--accent-up);   background: oklch(0.74 0.18 145 / 0.12); }
.stand-streak-loss { color: var(--accent-down); background: oklch(0.65 0.20 25 / 0.12); }

@media (max-width: 720px) {
  .stand-head {
    grid-template-columns: 28px minmax(0, 1fr) 48px 60px 48px;
    gap: 10px;
    padding: 0 12px 6px;
  }
  .stand-head-pf,
  .stand-head-last6 { display: none; }
  .stand-row {
    grid-template-columns: 28px minmax(0, 1fr) 48px 60px 48px;
    gap: 10px;
    padding: 9px 12px;
  }
  .stand-pf,
  .stand-last6 { display: none; }
  .stand-name { font-size: 0.88rem; }
  .stand-owner { display: none; }
}

/* ─── 5b. POINTS PER WEEK ─────────────────────────────────────── */
.ppw-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  line-height: 1.1;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.ppw-chart-wrap {
  width: 100%;
  margin-top: 6px;
}
.ppw-chart {
  width: 100%;
  height: 280px;
  display: block;
  color: var(--ink-4);
}
.ppw-grid line {
  stroke: oklch(0.16 0.015 90);
  stroke-width: 1;
}
.ppw-grid-label,
.ppw-x-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 10px;
  fill: var(--ink-4);
  letter-spacing: 0.04em;
}
.ppw-end-label text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.ppw-annotation-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.ppw-legend {
  list-style: none;
  padding: 0;
  margin: 14px 0 8px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.ppw-legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-2);
  background: transparent;
  border: 1px solid oklch(0.20 0.015 90);
  padding: 6px 11px;
  border-radius: 999px;
}
.ppw-legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}
.ppw-legend-dot-mine {
  background: var(--accent-primary);
}
.ppw-legend-dash {
  width: 14px;
  height: 2px;
  background: linear-gradient(to right, var(--ink-4) 0 4px, transparent 4px 8px, var(--ink-4) 8px 12px, transparent 12px 14px);
}
.ppw-caption {
  margin: 8px 0 0;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--ink-3);
}

/* ─── 6. TICKER (Around the league) ───────────────────────────── */
.ticker-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.2rem, 2.1vw, 1.4rem);
  line-height: 1.05;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
}
.ticker-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ticker-row {
  position: relative;
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 10px 14px 10px 18px;
  border-radius: 8px;
  background: oklch(0.10 0.015 90 / 0.5);
  border: 1px solid oklch(0.16 0.015 90);
  overflow: hidden;
}
.ticker-row-flat {
  background: transparent;
  border-color: oklch(0.14 0.015 90);
}
.ticker-edge {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 0;
  width: 2px;
  border-radius: 0 2px 2px 0;
}
.ticker-edge-up    { background: var(--accent-up); }
.ticker-edge-down  { background: var(--accent-down); }
.ticker-edge-neutral { background: var(--accent-tertiary); }
.ticker-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
.ticker-dot-up    { background: var(--accent-up); }
.ticker-dot-down  { background: var(--accent-down); }
.ticker-dot-neutral { background: var(--accent-tertiary); }
.ticker-tag {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
}
.ticker-tag-up    { color: var(--accent-up);   background: oklch(0.74 0.18 145 / 0.10); }
.ticker-tag-down  { color: var(--accent-down); background: oklch(0.65 0.20 25 / 0.10); }
.ticker-tag-neutral { color: var(--accent-tertiary); background: oklch(0.72 0.18 195 / 0.10); }
.ticker-copy {
  font-size: 0.94rem;
  line-height: 1.4;
  color: var(--ink-2);
  margin: 0;
  min-width: 0;
}

@media (max-width: 720px) {
  .ticker-row {
    grid-template-columns: auto auto;
    grid-template-areas:
      "dot tag"
      "copy copy";
    row-gap: 6px;
    padding: 10px 14px 10px 16px;
  }
  .ticker-row > .ticker-dot { grid-area: dot; }
  .ticker-row > .ticker-tag { grid-area: tag; justify-self: start; }
  .ticker-row > .ticker-copy { grid-area: copy; }
  .ticker-copy { font-size: 0.88rem; }
}

/* ─── 7. QUICK READS (footer pills) ───────────────────────────── */
.quick { display: flex; flex-direction: column; gap: 12px; }
.pills {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: oklch(0.10 0.015 90 / 0.5);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 999px;
  font-family: 'Barlow', sans-serif;
}
.pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pill-dot-tertiary  { background: var(--accent-tertiary); }
.pill-dot-secondary { background: var(--accent-secondary); }
.pill-dot-up        { background: var(--accent-up); }
.pill-dot-mute      { background: oklch(0.30 0.012 90); }
.pill-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
  flex-shrink: 0;
}
.pill-value {
  font-size: 0.86rem;
  color: var(--ink-1);
  margin-left: auto;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* ─── Shared avatar image ─────────────────────────────────────── */
.avatar-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: inherit;
}
</style>
