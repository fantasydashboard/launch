<template>
  <div class="hist">
    <!-- ─────────────────────────────────────────────────────────────
         PAGE HEADER
    ────────────────────────────────────────────────────────────── -->
    <header class="page-head" aria-labelledby="page-headline">
      <div class="page-head-copy">
        <p class="page-eyebrow">
          <span class="page-eyebrow-bar" aria-hidden="true"></span>
          League history
        </p>
        <h1 id="page-headline" class="page-headline">Six years of receipts.</h1>
        <p class="page-sub">Champions, rivalries, awards, and the all-time ranking.</p>
      </div>
      <ul class="page-context" role="list">
        <li class="page-context-pill"><span class="page-context-num">{{ seasonHistory.length + 1 }}</span><span class="page-context-lbl">Seasons</span></li>
        <li class="page-context-pill"><span class="page-context-num">{{ seasonHistory.length }}</span><span class="page-context-lbl">Champions</span></li>
        <li class="page-context-pill"><span class="page-context-num">{{ teams.length }}</span><span class="page-context-lbl">Teams</span></li>
      </ul>
    </header>

    <!-- ─────────────────────────────────────────────────────────────
         1. HALL OF CHAMPIONS — horizontally scrolling ribbon
    ────────────────────────────────────────────────────────────── -->
    <section class="champs" aria-labelledby="champs-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-gold" id="champs-heading">Hall of champions</p>
        <h2 class="section-headline">Five trophies.</h2>
      </header>

      <div class="champs-rail" role="list">
        <article
          v-for="rec in seasons"
          :key="rec.year"
          class="champ-card"
          role="listitem"
          :aria-label="`${rec.year} champion ${getTeam(rec.championTeamId).name}`"
        >
          <p class="champ-year">{{ rec.year }}</p>
          <p class="champ-era">{{ rec.eraTag }}</p>

          <div
            class="champ-avatar"
            :style="{ background: `linear-gradient(135deg, ${getTeam(rec.championTeamId).avatarColor})` }"
          >
            <img v-if="getTeam(rec.championTeamId).avatarUrl" :src="getTeam(rec.championTeamId).avatarUrl" class="champ-avatar-img" alt="" />
            <span v-else>{{ getTeam(rec.championTeamId).ownerInitials }}</span>
          </div>

          <p class="champ-team">{{ getTeam(rec.championTeamId).name }}</p>
          <p class="champ-score">{{ rec.championScore }}</p>

          <footer class="champ-foot">
            <p class="champ-foot-row">
              <span class="champ-foot-lbl">Runner-up</span>
              <span class="champ-foot-val">{{ getTeam(rec.runnerUpTeamId).name }}</span>
            </p>
            <p class="champ-foot-row">
              <span class="champ-foot-lbl">Toilet bowl</span>
              <span class="champ-foot-val">{{ getTeam(rec.toiletBowlTeamId).name }}</span>
            </p>
          </footer>
        </article>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         2. LEGACY LEADERBOARD — podium + ranked rows
    ────────────────────────────────────────────────────────────── -->
    <section class="legacy" aria-labelledby="legacy-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="legacy-heading">All-time</p>
        <h2 class="section-headline">Who's the best to ever do it.</h2>
      </header>

      <div class="podium" role="list">
        <!-- #2 -->
        <button
          type="button"
          class="podium-card podium-2"
          role="listitem"
          @click="openLegacyModal(podium[1].teamId)"
          :aria-label="`Rank 2 ${getTeam(podium[1].teamId).name}, ${podium[1].totalScore} points`"
        >
          <span class="podium-rank-badge">#2</span>
          <div
            class="podium-avatar podium-avatar-2"
            :style="{ background: `linear-gradient(135deg, ${getTeam(podium[1].teamId).avatarColor})` }"
          >
            <img v-if="getTeam(podium[1].teamId).avatarUrl" :src="getTeam(podium[1].teamId).avatarUrl" class="podium-avatar-img" alt="" />
            <span v-else>{{ getTeam(podium[1].teamId).ownerInitials }}</span>
          </div>
          <p class="podium-score podium-score-2">{{ podium[1].totalScore }}</p>
          <p class="podium-team">{{ getTeam(podium[1].teamId).name }}</p>
          <ul class="podium-badges" role="list">
            <li class="podium-badge">Titles {{ careerOf(podium[1].teamId).championships }}</li>
            <li class="podium-badge">Playoffs {{ careerOf(podium[1].teamId).playoffAppearances }}</li>
          </ul>
        </button>

        <!-- #1 -->
        <button
          type="button"
          class="podium-card podium-1"
          role="listitem"
          @click="openLegacyModal(podium[0].teamId)"
          :aria-label="`Rank 1 ${getTeam(podium[0].teamId).name}, ${podium[0].totalScore} points`"
        >
          <span class="podium-rank-badge podium-rank-1">#1</span>
          <div
            class="podium-avatar podium-avatar-1"
            :style="{ background: `linear-gradient(135deg, ${getTeam(podium[0].teamId).avatarColor})` }"
          >
            <img v-if="getTeam(podium[0].teamId).avatarUrl" :src="getTeam(podium[0].teamId).avatarUrl" class="podium-avatar-img" alt="" />
            <span v-else>{{ getTeam(podium[0].teamId).ownerInitials }}</span>
          </div>
          <p class="podium-score podium-score-1">{{ podium[0].totalScore }}</p>
          <p class="podium-team">{{ getTeam(podium[0].teamId).name }}</p>
          <ul class="podium-badges" role="list">
            <li class="podium-badge">Titles {{ careerOf(podium[0].teamId).championships }}</li>
            <li class="podium-badge">Playoffs {{ careerOf(podium[0].teamId).playoffAppearances }}</li>
          </ul>
          <p class="podium-1-sub">Highest legacy score in league history.</p>
        </button>

        <!-- #3 -->
        <button
          type="button"
          class="podium-card podium-3"
          role="listitem"
          @click="openLegacyModal(podium[2].teamId)"
          :aria-label="`Rank 3 ${getTeam(podium[2].teamId).name}, ${podium[2].totalScore} points`"
        >
          <span class="podium-rank-badge">#3</span>
          <div
            class="podium-avatar podium-avatar-3"
            :style="{ background: `linear-gradient(135deg, ${getTeam(podium[2].teamId).avatarColor})` }"
          >
            <img v-if="getTeam(podium[2].teamId).avatarUrl" :src="getTeam(podium[2].teamId).avatarUrl" class="podium-avatar-img" alt="" />
            <span v-else>{{ getTeam(podium[2].teamId).ownerInitials }}</span>
          </div>
          <p class="podium-score podium-score-3">{{ podium[2].totalScore }}</p>
          <p class="podium-team">{{ getTeam(podium[2].teamId).name }}</p>
          <ul class="podium-badges" role="list">
            <li class="podium-badge">Titles {{ careerOf(podium[2].teamId).championships }}</li>
            <li class="podium-badge">Playoffs {{ careerOf(podium[2].teamId).playoffAppearances }}</li>
          </ul>
        </button>
      </div>

      <ol class="legacy-rows" role="list">
        <li v-for="entry in legacyTail" :key="entry.teamId" role="listitem">
          <button
            type="button"
            class="legacy-row"
            @click="openLegacyModal(entry.teamId)"
            :class="getTeam(entry.teamId).isMyTeam ? 'legacy-row-me' : ''"
            :aria-label="`Rank ${entry.rank} ${getTeam(entry.teamId).name}, ${entry.totalScore} points`"
          >
            <span class="legacy-rank">{{ entry.rank }}</span>
            <div
              class="legacy-avatar"
              :style="{ background: `linear-gradient(135deg, ${getTeam(entry.teamId).avatarColor})` }"
            >
              <img v-if="getTeam(entry.teamId).avatarUrl" :src="getTeam(entry.teamId).avatarUrl" class="legacy-avatar-img" alt="" />
              <span v-else>{{ getTeam(entry.teamId).ownerInitials }}</span>
            </div>
            <div class="legacy-meta">
              <p class="legacy-team">{{ getTeam(entry.teamId).name }}</p>
              <p class="legacy-seasons">{{ careerOf(entry.teamId).seasonsPlayed }} seasons</p>
            </div>
            <ul class="legacy-badges" role="list">
              <li v-if="careerOf(entry.teamId).championships > 0" class="legacy-badge legacy-badge-gold">{{ careerOf(entry.teamId).championships }} title{{ careerOf(entry.teamId).championships > 1 ? 's' : '' }}</li>
              <li class="legacy-badge">{{ careerOf(entry.teamId).playoffAppearances }} playoffs</li>
              <li class="legacy-badge">{{ careerOf(entry.teamId).totalWins }} wins</li>
            </ul>
            <span class="legacy-score">{{ entry.totalScore }}</span>
          </button>
        </li>
      </ol>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         3. LEGACY SCORE TRENDS — multi-line chart
    ────────────────────────────────────────────────────────────── -->
    <section class="trends" aria-labelledby="trends-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="trends-heading">Across the years</p>
        <h2 class="section-headline">When the empires rose.</h2>
      </header>

      <div class="trends-chart-wrap">
        <svg
          class="trends-chart"
          :viewBox="`0 0 ${TX_W} ${TX_H}`"
          preserveAspectRatio="none"
          role="img"
          aria-label="Cumulative legacy score per team across seasons 2020 through 2025"
        >
          <!-- Faint gridlines -->
          <g class="trends-grid">
            <line v-for="g in gridLines" :key="`g-${g.v}`"
              :x1="0" :y1="g.y" :x2="TX_W" :y2="g.y" />
          </g>
          <!-- X-axis ticks -->
          <g class="trends-xticks">
            <text v-for="(y, i) in years" :key="`yr-${y}`"
              :x="xFor(i)" :y="TX_H - 6"
              text-anchor="middle">{{ y }}</text>
          </g>

          <!-- Lines -->
          <g
            v-for="row in legacyTrend"
            :key="`line-${row.teamId}`"
            :class="['trends-line-group', getTeam(row.teamId).isMyTeam ? 'is-me' : '']"
          >
            <path
              :d="pathFor(row.cumulative)"
              :stroke="getTeam(row.teamId).isMyTeam ? 'oklch(0.84 0.16 90)' : accentOf(row.teamId)"
              :stroke-width="getTeam(row.teamId).isMyTeam ? 2.6 : 1.6"
              fill="none"
              stroke-linejoin="round"
              stroke-linecap="round"
              :style="getTeam(row.teamId).isMyTeam ? 'filter: drop-shadow(0 0 4px oklch(0.84 0.16 90 / 0.55))' : ''"
            />
            <!-- Endpoint circle -->
            <circle
              :cx="xFor(row.cumulative.length - 1)"
              :cy="yFor(row.cumulative[row.cumulative.length - 1])"
              :r="getTeam(row.teamId).isMyTeam ? 5 : 3.5"
              :fill="getTeam(row.teamId).isMyTeam ? 'oklch(0.84 0.16 90)' : accentOf(row.teamId)"
            />
          </g>

          <!-- Right-edge labels (team id chips) -->
          <g class="trends-endlabels">
            <text v-for="row in legacyTrend" :key="`lbl-${row.teamId}`"
              :x="xFor(row.cumulative.length - 1) + 10"
              :y="yFor(row.cumulative[row.cumulative.length - 1]) + 4"
              :fill="getTeam(row.teamId).isMyTeam ? 'oklch(0.84 0.16 90)' : 'oklch(0.78 0.008 90)'"
            >{{ getTeam(row.teamId).name.split(' ')[0] }}</text>
          </g>
        </svg>
      </div>

      <ol class="trends-legend" role="list">
        <li v-for="entry in legacyScores" :key="`lg-${entry.teamId}`" role="listitem">
          <span class="legend-pill" :class="getTeam(entry.teamId).isMyTeam ? 'legend-pill-me' : ''">
            <span class="legend-dot" :style="{ background: accentOf(entry.teamId) }" aria-hidden="true"></span>
            <span class="legend-rank">{{ entry.rank }}</span>
            <span class="legend-name">{{ getTeam(entry.teamId).name }}</span>
            <span class="legend-score">{{ entry.totalScore }}</span>
          </span>
        </li>
      </ol>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         4. HEAD-TO-HEAD MATRIX
    ────────────────────────────────────────────────────────────── -->
    <section class="h2h" aria-labelledby="h2h-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="h2h-heading">All-time series</p>
        <h2 class="section-headline">Who owns who.</h2>
        <p class="section-sub">Read horizontally. Each row shows that team's record against opponents.</p>
      </header>

      <!-- Desktop matrix -->
      <div class="h2h-matrix-wrap">
        <table class="h2h-matrix" role="table" aria-label="All-time head-to-head matrix">
          <thead>
            <tr>
              <th scope="col" class="h2h-corner" aria-label="Team"></th>
              <th
                v-for="cid in teamIds"
                :key="`col-${cid}`"
                scope="col"
                class="h2h-col-head"
              >
                <div
                  class="h2h-col-avatar"
                  :style="{ background: `linear-gradient(135deg, ${getTeam(cid).avatarColor})` }"
                  :title="getTeam(cid).name"
                >
                  <img v-if="getTeam(cid).avatarUrl" :src="getTeam(cid).avatarUrl" class="h2h-col-avatar-img" alt="" />
                  <span v-else>{{ getTeam(cid).ownerInitials }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rid in teamIds" :key="`row-${rid}`">
              <th scope="row" class="h2h-row-head">
                <div
                  class="h2h-row-avatar"
                  :style="{ background: `linear-gradient(135deg, ${getTeam(rid).avatarColor})` }"
                >
                  <img v-if="getTeam(rid).avatarUrl" :src="getTeam(rid).avatarUrl" class="h2h-row-avatar-img" alt="" />
                  <span v-else>{{ getTeam(rid).ownerInitials }}</span>
                </div>
                <span class="h2h-row-name">{{ getTeam(rid).name }}</span>
              </th>
              <td
                v-for="cid in teamIds"
                :key="`cell-${rid}-${cid}`"
                class="h2h-cell"
                :class="cellClass(rid, cid)"
              >
                <span v-if="rid === cid" class="h2h-cell-self" aria-hidden="true">—</span>
                <button
                  v-else
                  type="button"
                  class="h2h-cell-btn"
                  :style="{ '--cell-tint': cellTint(rid, cid) } as any"
                  :aria-label="`${getTeam(rid).name} vs ${getTeam(cid).name}: ${cellRecord(rid, cid)}`"
                  @click="openRivalryModal(rid, cid)"
                >{{ cellRecord(rid, cid) }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile: top rivalries list -->
      <ol class="h2h-rivalries" role="list" aria-label="Top rivalries">
        <li v-for="r in topRivalries" :key="`rv-${r.teamA}-${r.teamB}`" role="listitem">
          <button
            type="button"
            class="h2h-rivalry"
            @click="openRivalryModal(r.teamA, r.teamB)"
            :aria-label="`${getTeam(r.teamA).name} vs ${getTeam(r.teamB).name}, ${r.aWins} to ${r.bWins}`"
          >
            <div class="h2h-rivalry-pair">
              <div
                class="h2h-rivalry-avatar"
                :style="{ background: `linear-gradient(135deg, ${getTeam(r.teamA).avatarColor})` }"
              >
                <img v-if="getTeam(r.teamA).avatarUrl" :src="getTeam(r.teamA).avatarUrl" alt="" />
                <span v-else>{{ getTeam(r.teamA).ownerInitials }}</span>
              </div>
              <span class="h2h-rivalry-vs">vs</span>
              <div
                class="h2h-rivalry-avatar"
                :style="{ background: `linear-gradient(135deg, ${getTeam(r.teamB).avatarColor})` }"
              >
                <img v-if="getTeam(r.teamB).avatarUrl" :src="getTeam(r.teamB).avatarUrl" alt="" />
                <span v-else>{{ getTeam(r.teamB).ownerInitials }}</span>
              </div>
            </div>
            <div class="h2h-rivalry-meta">
              <p class="h2h-rivalry-names">
                {{ getTeam(r.teamA).name }} <span class="h2h-rivalry-mid">vs</span> {{ getTeam(r.teamB).name }}
              </p>
              <p class="h2h-rivalry-record">{{ r.aWins }}-{{ r.bWins }} <span class="h2h-rivalry-dim">({{ r.aWins + r.bWins }} meetings)</span></p>
            </div>
            <span class="h2h-rivalry-arrow" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 6 15 12 9 18"/>
              </svg>
            </span>
          </button>
        </li>
      </ol>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         5. AWARDS — Hall of Fame + Hall of Shame, varied tiles
    ────────────────────────────────────────────────────────────── -->
    <section class="awards" aria-labelledby="awards-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="awards-heading">The record book</p>
        <h2 class="section-headline">Hall of Fame. Hall of Shame.</h2>
      </header>

      <!-- Filter chips -->
      <div class="awards-filters" role="tablist" aria-label="Award scope">
        <button
          type="button"
          class="awards-filter"
          :class="{ 'awards-filter-active': activeAwardScope === 'all-time' }"
          role="tab"
          :aria-selected="activeAwardScope === 'all-time'"
          @click="activeAwardScope = 'all-time'"
        >All-time</button>
        <button
          type="button"
          class="awards-filter"
          :class="{ 'awards-filter-active': activeAwardScope === 'season' }"
          role="tab"
          :aria-selected="activeAwardScope === 'season'"
          @click="activeAwardScope = 'season'"
        >Season</button>
      </div>

      <!-- Year picker — visible only when Season scope is active -->
      <div
        v-if="activeAwardScope === 'season'"
        class="awards-years"
        role="tablist"
        aria-label="Season year"
      >
        <span class="awards-years-label">Year</span>
        <button
          v-for="year in availableSeasons"
          :key="year"
          type="button"
          class="awards-year"
          :class="{ 'awards-year-active': selectedSeason === year }"
          role="tab"
          :aria-selected="selectedSeason === year"
          @click="selectedSeason = year"
        >{{ year }}</button>
      </div>

      <!-- HALL OF FAME -->
      <h3 class="awards-sub awards-sub-fame">Hall of Fame</h3>
      <div class="fame-grid">
        <!-- Tile A: weekly high / season PPW (LARGE full-width) -->
        <button type="button" class="fame-a" @click="openAwardModal(fameA.id)" :aria-label="`Open top 10 for ${fameA.label}`">
          <span class="fame-a-eyebrow">{{ fameA.label }}</span>
          <div class="fame-a-body">
            <div class="fame-a-id">
              <div class="fame-a-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(fameA.headline.teamId).avatarColor})` }">
                <img v-if="getTeam(fameA.headline.teamId).avatarUrl" :src="getTeam(fameA.headline.teamId).avatarUrl" alt="" />
                <span v-else>{{ getTeam(fameA.headline.teamId).ownerInitials }}</span>
              </div>
              <div class="fame-a-id-text">
                <p class="fame-a-team">{{ getTeam(fameA.headline.teamId).name }}</p>
                <p class="fame-a-when">
                  <template v-if="fameA.headline.week">{{ fameA.headline.season }}, Week {{ fameA.headline.week }}</template>
                  <template v-else>{{ fameA.headline.season }} season</template>
                </p>
              </div>
            </div>
            <p class="fame-a-value">{{ fameA.headline.value.toFixed(1) }}</p>
          </div>
          <p class="fame-a-trail">{{ fameA.description }}</p>
        </button>

        <!-- Tile B: career wins / season wins (medium half-width) -->
        <button type="button" class="fame-b" @click="openAwardModal(fameB.id)" :aria-label="`Open top 10 for ${fameB.label}`">
          <span class="fame-tile-eyebrow">{{ fameB.label }}</span>
          <div class="fame-b-mid">
            <div class="fame-b-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(fameB.headline.teamId).avatarColor})` }">
              <img v-if="getTeam(fameB.headline.teamId).avatarUrl" :src="getTeam(fameB.headline.teamId).avatarUrl" alt="" />
              <span v-else>{{ getTeam(fameB.headline.teamId).ownerInitials }}</span>
            </div>
            <p class="fame-b-team">{{ getTeam(fameB.headline.teamId).name }}</p>
          </div>
          <p class="fame-b-value">{{ fameB.headline.value }}</p>
          <p class="fame-b-sub">{{ fameB.headline.season ? `wins · ${fameB.headline.season} season` : 'career wins' }}</p>
        </button>

        <!-- Tile C: career PPW / season PF (medium half-width, different bg) -->
        <button type="button" class="fame-c" @click="openAwardModal(fameC.id)" :aria-label="`Open top 10 for ${fameC.label}`">
          <span class="fame-tile-eyebrow">{{ fameC.label }}</span>
          <div class="fame-c-row">
            <p class="fame-c-value">{{ fameC.headline.value.toFixed(1) }}</p>
            <div class="fame-c-id">
              <div class="fame-c-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(fameC.headline.teamId).avatarColor})` }">
                <img v-if="getTeam(fameC.headline.teamId).avatarUrl" :src="getTeam(fameC.headline.teamId).avatarUrl" alt="" />
                <span v-else>{{ getTeam(fameC.headline.teamId).ownerInitials }}</span>
              </div>
              <p class="fame-c-team">{{ getTeam(fameC.headline.teamId).name }}</p>
            </div>
          </div>
          <p class="fame-c-sub">{{ fameC.description }}</p>
        </button>

        <!-- Tile D: best win % (small inline strip) -->
        <button type="button" class="fame-d" @click="openAwardModal(fameD.id)" :aria-label="`Open top 10 for ${fameD.label}`">
          <span class="fame-d-eyebrow">Best record</span>
          <p class="fame-d-text">
            <strong>{{ getTeam(fameD.headline.teamId).name }}</strong>
            <span class="fame-d-dot" aria-hidden="true">·</span>
            <span class="fame-d-pct">{{ fameD.headline.value.toFixed(1) }}%</span>
            <span class="fame-d-dot" aria-hidden="true">·</span>
            <span class="fame-d-rec">{{ fameD.label }}</span>
          </p>
        </button>
      </div>

      <!-- HALL OF SHAME -->
      <h3 class="awards-sub awards-sub-shame">Hall of Shame</h3>
      <div class="shame-grid">
        <!-- Tile A: lowest week / worst season PPW (medium half-width) -->
        <button type="button" class="shame-a" @click="openAwardModal(shameA.id)" :aria-label="`Open top 10 for ${shameA.label}`">
          <span class="shame-tile-eyebrow">{{ shameA.label }}</span>
          <p class="shame-a-value">{{ shameA.headline.value.toFixed(1) }}</p>
          <div class="shame-a-foot">
            <div class="shame-a-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(shameA.headline.teamId).avatarColor})` }">
              <img v-if="getTeam(shameA.headline.teamId).avatarUrl" :src="getTeam(shameA.headline.teamId).avatarUrl" alt="" />
              <span v-else>{{ getTeam(shameA.headline.teamId).ownerInitials }}</span>
            </div>
            <div>
              <p class="shame-a-team">{{ getTeam(shameA.headline.teamId).name }}</p>
              <p class="shame-a-when">
                <template v-if="shameA.headline.week">{{ shameA.headline.season }}, Week {{ shameA.headline.week }}</template>
                <template v-else>{{ shameA.headline.season }} season</template>
              </p>
            </div>
          </div>
        </button>

        <!-- Tile B: career losses / season losses (medium half-width, logo on right) -->
        <button type="button" class="shame-b" @click="openAwardModal(shameB.id)" :aria-label="`Open top 10 for ${shameB.label}`">
          <span class="shame-tile-eyebrow">{{ shameB.label }}</span>
          <div class="shame-b-row">
            <div class="shame-b-text">
              <p class="shame-b-value">{{ shameB.headline.value }}</p>
              <p class="shame-b-sub">{{ shameB.description }}</p>
              <p class="shame-b-team">{{ getTeam(shameB.headline.teamId).name }}</p>
            </div>
            <div class="shame-b-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(shameB.headline.teamId).avatarColor})` }">
              <img v-if="getTeam(shameB.headline.teamId).avatarUrl" :src="getTeam(shameB.headline.teamId).avatarUrl" alt="" />
              <span v-else>{{ getTeam(shameB.headline.teamId).ownerInitials }}</span>
            </div>
          </div>
        </button>

        <!-- Tile C: career PPW / fewest season PF (LARGE full-width text strip) -->
        <button type="button" class="shame-c" @click="openAwardModal(shameC.id)" :aria-label="`Open top 10 for ${shameC.label}`">
          <span class="shame-c-eyebrow">{{ shameC.label }}</span>
          <p class="shame-c-text">
            <strong>{{ getTeam(shameC.headline.teamId).name }}</strong>
            <span class="shame-c-dot" aria-hidden="true">·</span>
            <span class="shame-c-value">{{ shameC.headline.value.toFixed(1) }}</span>
            <span class="shame-c-dot" aria-hidden="true">·</span>
            <span class="shame-c-trail">{{ shameC.description }}</span>
          </p>
        </button>

        <!-- Tile D: worst win pct (small pill) -->
        <button type="button" class="shame-d" @click="openAwardModal(shameD.id)" :aria-label="`Open top 10 for ${shameD.label}`">
          <span class="shame-d-eyebrow">Worst record</span>
          <p class="shame-d-text">
            <strong>{{ getTeam(shameD.headline.teamId).name }}</strong>
            <span class="shame-d-dot" aria-hidden="true">·</span>
            <span class="shame-d-pct">{{ shameD.headline.value.toFixed(1) }}%</span>
          </p>
        </button>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         6. CAREER STATS TABLE
    ────────────────────────────────────────────────────────────── -->
    <section class="career" aria-labelledby="career-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-mute" id="career-heading">Career statistics</p>
        <h2 class="section-headline">The whole picture.</h2>
      </header>

      <div class="career-table-wrap">
        <table class="career-table" aria-label="All-time team statistics">
          <thead>
            <tr>
              <th scope="col" class="th-team">Team</th>
              <th scope="col" class="th-num">Seasons</th>
              <th scope="col" class="th-num">Titles</th>
              <th scope="col" class="th-num">Record</th>
              <th scope="col" class="th-num">Win %</th>
              <th scope="col" class="th-num">Avg PPW</th>
              <th scope="col" class="th-num">Total PF</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in careerRows" :key="row.teamId">
              <th scope="row" class="td-team">
                <button type="button" class="career-row-btn" @click="openLegacyModal(row.teamId)" :aria-label="`Open legacy detail for ${getTeam(row.teamId).name}`">
                  <div class="career-avatar" :style="{ background: `linear-gradient(135deg, ${getTeam(row.teamId).avatarColor})` }">
                    <img v-if="getTeam(row.teamId).avatarUrl" :src="getTeam(row.teamId).avatarUrl" alt="" />
                    <span v-else>{{ getTeam(row.teamId).ownerInitials }}</span>
                  </div>
                  <span class="career-team-name">{{ getTeam(row.teamId).name }}</span>
                </button>
              </th>
              <td class="td-num">{{ row.seasonsPlayed }}</td>
              <td class="td-num">
                <span v-if="row.championships > 0" class="career-title-chip">{{ row.championships }}</span>
                <span v-else class="career-dash">—</span>
              </td>
              <td class="td-num">{{ row.totalWins }}-{{ row.totalLosses }}</td>
              <td class="td-num">{{ ((row.totalWins / (row.totalWins + row.totalLosses)) * 100).toFixed(1) }}%</td>
              <td class="td-num">{{ row.avgPPW.toFixed(1) }}</td>
              <td class="td-num">{{ row.totalPF.toFixed(1) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ─────────────────────────────────────────────────────────────
         7. FOOTER PILLS
    ────────────────────────────────────────────────────────────── -->
    <section class="quick" aria-labelledby="quick-heading">
      <h2 class="section-eyebrow section-eyebrow-mute" id="quick-heading">Footnotes</h2>
      <ul class="pills" role="list">
        <li class="pill"><span class="pill-dot pill-dot-gold" aria-hidden="true"></span><span class="pill-label">Longest dynasty</span><span class="pill-value">Throne Vacant · 2 straight in 2022-23</span></li>
        <li class="pill"><span class="pill-dot pill-dot-secondary" aria-hidden="true"></span><span class="pill-label">Biggest blowout ever</span><span class="pill-value">Reign Delay over Auto-Draft Allstars · 154.2 to 38.7</span></li>
        <li class="pill"><span class="pill-dot pill-dot-tertiary" aria-hidden="true"></span><span class="pill-label">Closest championship</span><span class="pill-value">2021 One Hit Wonder over Reign Delay · 124.8 to 116.2</span></li>
        <li class="pill"><span class="pill-dot pill-dot-mute" aria-hidden="true"></span><span class="pill-label">Most consistent</span><span class="pill-value">Almost Famous · 5 playoff apps, 0 titles</span></li>
        <li class="pill"><span class="pill-dot pill-dot-secondary" aria-hidden="true"></span><span class="pill-label">Most volatile</span><span class="pill-value">One Hit Wonder · 1 title, 4 toilet bowls</span></li>
      </ul>
    </section>

    <!-- ─── Modals ─────────────────────────────────────────────── -->
    <TeamLegacyModal
      v-if="activeLegacyTeamId"
      :team-id="activeLegacyTeamId"
      @close="activeLegacyTeamId = null"
      @open-signup="$emit('open-signup')"
    />
    <RivalryDetailModal
      v-if="activeRivalry"
      :team-a-id="activeRivalry.a"
      :team-b-id="activeRivalry.b"
      @close="activeRivalry = null"
    />
    <AwardTopTenModal
      v-if="activeAward"
      :record="activeAward"
      @close="activeAward = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  teams,
  seasonHistory,
  teamCareerStats,
  h2hMatrix,
  allTimeRecords,
  legacyScores,
  legacyTrend,
  getTeam,
  type AllTimeRecord,
} from '@/fixtures/pillarsLeague'
import TeamLegacyModal from '@/components/demo/TeamLegacyModal.vue'
import RivalryDetailModal from '@/components/demo/RivalryDetailModal.vue'
import AwardTopTenModal from '@/components/demo/AwardTopTenModal.vue'
import { accentFor } from '@/utils/teamColor'
import { linearPath, type Point } from '@/utils/svgPath'

defineEmits<{ (e: 'open-signup'): void }>()

/* ─── Data ──────────────────────────────────────────────────── */
const seasons = computed(() => [...seasonHistory].sort((a, b) => b.year - a.year))
const podium = computed(() => legacyScores.slice(0, 3))
const legacyTail = computed(() => legacyScores.slice(3))
const teamIds = teams.map(t => t.id)
const careerOf = (id: string) => teamCareerStats[id]

const careerRows = computed(() => {
  return [...Object.values(teamCareerStats)].sort((a, b) => {
    if (b.championships !== a.championships) return b.championships - a.championships
    return b.totalWins - a.totalWins
  })
})

function recordById(id: string): AllTimeRecord {
  return allTimeRecords.find(r => r.id === id)!
}

/* ─── Award scope toggle + season picker ──────────────────────── */
const activeAwardScope = ref<'all-time' | 'season'>('all-time')

// Years available in the season picker — completed seasons (newest first).
// 2025 is in progress so we exclude it.
const availableSeasons = [2024, 2023, 2022, 2021, 2020] as const
const selectedSeason = ref<number>(availableSeasons[0])

const FAME_IDS = {
  'all-time': ['highest-single-week', 'most-career-wins', 'highest-career-ppw', 'best-win-pct'],
  'season':   ['best-season-ppw', 'most-season-wins', 'most-season-pf', 'best-season-win-pct'],
} as const

const SHAME_IDS = {
  'all-time': ['lowest-single-week', 'most-career-losses', 'lowest-career-ppw', 'worst-win-pct'],
  'season':   ['worst-season-ppw', 'most-season-losses', 'fewest-season-pf', 'worst-season-win-pct'],
} as const

// For season scope, the headline is the top topTen entry for the selected year.
// Returns the record with its `headline` swapped to that year's leader (or the
// original headline as a fallback if the year isn't represented).
function withScopedHeadline(record: ReturnType<typeof recordById>) {
  if (activeAwardScope.value !== 'season') return record
  const seasonLeader = record.topTen.find(e => e.season === selectedSeason.value)
  return seasonLeader ? { ...record, headline: seasonLeader } : record
}

const fameA = computed(() => withScopedHeadline(recordById(FAME_IDS[activeAwardScope.value][0])))
const fameB = computed(() => withScopedHeadline(recordById(FAME_IDS[activeAwardScope.value][1])))
const fameC = computed(() => withScopedHeadline(recordById(FAME_IDS[activeAwardScope.value][2])))
const fameD = computed(() => withScopedHeadline(recordById(FAME_IDS[activeAwardScope.value][3])))
const shameA = computed(() => withScopedHeadline(recordById(SHAME_IDS[activeAwardScope.value][0])))
const shameB = computed(() => withScopedHeadline(recordById(SHAME_IDS[activeAwardScope.value][1])))
const shameC = computed(() => withScopedHeadline(recordById(SHAME_IDS[activeAwardScope.value][2])))
const shameD = computed(() => withScopedHeadline(recordById(SHAME_IDS[activeAwardScope.value][3])))

function accentOf(id: string) {
  return accentFor(getTeam(id))
}

/* ─── Legacy trend chart geometry ─────────────────────────────── */
const TX_W = 1000
const TX_H = 320
const TX_PAD_L = 36
const TX_PAD_R = 110 // room for endpoint labels
const TX_PAD_T = 18
const TX_PAD_B = 28
const Y_MAX = 1400 // chart max y value to make all teams visible
const years = [2020, 2021, 2022, 2023, 2024, 2025]
const gridLines = [200, 400, 600, 800, 1000, 1200].map(v => ({ v, y: yFor(v) }))

function xFor(i: number) {
  const span = years.length - 1
  return TX_PAD_L + ((TX_W - TX_PAD_L - TX_PAD_R) * (i / span))
}
function yFor(v: number) {
  // 0 at bottom, Y_MAX at top
  const yRange = TX_H - TX_PAD_T - TX_PAD_B
  return TX_PAD_T + yRange * (1 - v / Y_MAX)
}
function pathFor(values: number[]) {
  const pts: Point[] = values.map((v, i) => ({ x: xFor(i), y: yFor(v) }))
  return linearPath(pts)
}

/* ─── H2H matrix helpers ──────────────────────────────────────── */
function getH2H(a: string, b: string) {
  if (a === b) return null
  const direct = h2hMatrix.find(r => r.teamA === a && r.teamB === b)
  if (direct) return { aWins: direct.aWins, bWins: direct.bWins }
  const reverse = h2hMatrix.find(r => r.teamA === b && r.teamB === a)
  if (reverse) return { aWins: reverse.bWins, bWins: reverse.aWins }
  return null
}
function cellRecord(rid: string, cid: string) {
  if (rid === cid) return '—'
  const r = getH2H(rid, cid)
  if (!r) return '—'
  return `${r.aWins}-${r.bWins}`
}
function cellClass(rid: string, cid: string) {
  if (rid === cid) return 'h2h-cell-diag'
  const r = getH2H(rid, cid)
  if (!r) return ''
  const diff = r.aWins - r.bWins
  if (Math.abs(diff) <= 1) return 'h2h-cell-even'
  return diff > 0 ? 'h2h-cell-win' : 'h2h-cell-loss'
}
function cellTint(rid: string, cid: string) {
  if (rid === cid) return '0'
  const r = getH2H(rid, cid)
  if (!r) return '0'
  const total = r.aWins + r.bWins
  if (!total) return '0'
  const diff = r.aWins - r.bWins
  // 0 = neutral; 1 = max saturation
  const ratio = Math.min(1, Math.abs(diff) / Math.max(4, total))
  return ratio.toFixed(2)
}

const topRivalries = computed(() => {
  // Sort matrix by total meetings desc; pick 8 records.
  // For records involving 'ww' (only 2 seasons), limit count to keep them out of top list unless they're competitive.
  return [...h2hMatrix]
    .map(r => ({
      ...r,
      total: r.aWins + r.bWins,
      margin: Math.abs(r.aWins - r.bWins),
    }))
    .filter(r => r.total >= 6)
    // Mix: half by meetings, half by lopsidedness; favor compelling pairs
    .sort((a, b) => {
      const interest = (x: typeof a) => x.total + x.margin * 0.6
      return interest(b) - interest(a)
    })
    .slice(0, 8)
})

/* ─── Modals state ───────────────────────────────────────────── */
const activeLegacyTeamId = ref<string | null>(null)
const activeRivalry = ref<{ a: string; b: string } | null>(null)
const activeAward = ref<AllTimeRecord | null>(null)

function openLegacyModal(id: string) { activeLegacyTeamId.value = id }
function openRivalryModal(a: string, b: string) { activeRivalry.value = { a, b } }
function openAwardModal(id: string) { activeAward.value = recordById(id) }
</script>

<style scoped>
/* Tokens (--ink-N, --accent-*) inherited from .demo-shell in DemoLayout.
   History adds medal tokens (--gold, --silver, --bronze) used by the
   Hall of Champions ribbon. */
.hist {
  --gold:   oklch(0.84 0.16 90);
  --silver: oklch(0.80 0.012 90);
  --bronze: oklch(0.62 0.12 50);

  display: flex;
  flex-direction: column;
  gap: 56px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

/* ─── Shared section heading typography ───────────────────────── */
.section-head { margin-bottom: 18px; }
.section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-2);
  margin: 0 0 6px;
}
.section-eyebrow-teal    { color: var(--accent-tertiary); }
.section-eyebrow-magenta { color: var(--accent-secondary); }
.section-eyebrow-mute    { color: var(--ink-3); }
.section-eyebrow-gold    { color: var(--gold); }
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.8rem, 3.6vw, 2.4rem);
  line-height: 0.96;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 4px;
}
.section-sub {
  font-size: 0.88rem;
  color: var(--ink-3);
  margin: 0;
  max-width: 65ch;
  line-height: 1.5;
}

/* ─── Page header ─────────────────────────────────────────────── */
.page-head {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) auto;
  align-items: end;
  gap: 32px;
  padding: 24px 0 18px;
  border-bottom: 1px solid oklch(0.16 0.015 90);
}
.page-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 0 0 10px;
}
.page-eyebrow-bar { width: 24px; height: 1px; background: var(--accent-secondary); }
.page-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2rem, 5.4vw, 2.6rem);
  line-height: 0.94;
  letter-spacing: -0.015em;
  color: var(--ink-1);
  margin: 0 0 8px;
}
.page-sub {
  font-size: 1rem;
  color: var(--ink-2);
  margin: 0;
  max-width: 56ch;
  line-height: 1.5;
}
.page-context {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid oklch(0.18 0.015 90);
  background: oklch(0.10 0.015 90);
}
.page-context-pill {
  padding: 10px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-right: 1px solid oklch(0.18 0.015 90);
}
.page-context-pill:last-child { border-right: none; }
.page-context-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.4rem;
  line-height: 1;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}
.page-context-lbl {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  margin-top: 4px;
}
@media (max-width: 720px) {
  .page-head { grid-template-columns: 1fr; gap: 18px; }
  .page-context { align-self: flex-start; }
  .page-context-pill { padding: 8px 14px; }
}

/* ─── 1. HALL OF CHAMPIONS ────────────────────────────────────── */
.champs-rail {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 4px 4px 12px;
  margin: 0 -4px;
}
.champs-rail::-webkit-scrollbar { height: 6px; }
.champs-rail::-webkit-scrollbar-thumb { background: oklch(0.20 0.015 90); border-radius: 3px; }
.champ-card {
  flex: 0 0 280px;
  height: 380px;
  scroll-snap-align: start;
  position: relative;
  border: 1px solid oklch(0.22 0.04 90);
  border-radius: 18px;
  padding: 22px 22px 18px;
  background:
    radial-gradient(ellipse at top, oklch(0.84 0.16 90 / 0.12), transparent 60%),
    linear-gradient(180deg, oklch(0.13 0.015 90), oklch(0.08 0.014 90));
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}
.champ-year {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 4rem;
  line-height: 0.88;
  color: var(--gold);
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0;
  align-self: flex-start;
}
.champ-era {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 4px 0 18px;
  align-self: flex-start;
}
.champ-avatar {
  width: 84px; height: 84px;
  border-radius: 16px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.6rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  border: 2px solid var(--gold);
  box-shadow:
    0 0 0 4px oklch(0.84 0.16 90 / 0.12),
    0 12px 32px -12px oklch(0 0 0 / 0.6);
  margin-bottom: 14px;
}
.champ-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.champ-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.2rem;
  line-height: 1.1;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0 0 6px;
  text-align: center;
}
.champ-score {
  font-size: 0.84rem;
  color: var(--ink-3);
  margin: 0 0 auto;
  text-align: center;
  max-width: 24ch;
  line-height: 1.4;
}
.champ-foot {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px solid oklch(0.18 0.015 90);
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.champ-foot-row {
  margin: 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  font-size: 0.74rem;
}
.champ-foot-lbl {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-4);
}
.champ-foot-val {
  color: var(--ink-2);
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ─── 2. LEGACY LEADERBOARD ───────────────────────────────────── */
.podium {
  display: grid;
  grid-template-columns: 1fr 1.18fr 1fr;
  align-items: end;
  gap: 14px;
  margin-bottom: 24px;
}
.podium-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-radius: 16px;
  padding: 18px 16px 16px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  border: 1px solid;
}
.podium-card:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: no-preference) {
  .podium-card { transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1); }
  .podium-card:hover { transform: translateY(-2px); }
}
.podium-card:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.podium-1 {
  order: 2;
  border-color: oklch(0.50 0.10 90);
  background:
    radial-gradient(ellipse at top, oklch(0.84 0.16 90 / 0.20), transparent 65%),
    linear-gradient(180deg, oklch(0.16 0.04 90), oklch(0.10 0.02 90));
  padding-top: 26px;
  padding-bottom: 22px;
  min-height: 260px;
}
.podium-2 { order: 1; border-color: oklch(0.30 0.012 90);
  background: linear-gradient(180deg, oklch(0.13 0.012 90), oklch(0.10 0.012 90));
  min-height: 220px;
}
.podium-3 { order: 3; border-color: oklch(0.30 0.06 50);
  background:
    radial-gradient(ellipse at top, oklch(0.62 0.12 50 / 0.10), transparent 60%),
    linear-gradient(180deg, oklch(0.13 0.02 90), oklch(0.10 0.012 90));
  min-height: 200px;
}
.podium-rank-badge {
  position: absolute;
  top: 12px;
  left: 14px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 900;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}
.podium-rank-1 { color: var(--gold); }
.podium-avatar {
  border-radius: 16px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 10px 28px -12px oklch(0 0 0 / 0.6);
  margin-bottom: 8px;
}
.podium-avatar-1 { width: 72px; height: 72px; font-size: 1.4rem; border: 2px solid var(--gold); }
.podium-avatar-2 { width: 60px; height: 60px; font-size: 1.1rem; border: 2px solid var(--silver); }
.podium-avatar-3 { width: 52px; height: 52px; font-size: 1rem; border: 2px solid var(--bronze); }
.podium-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.podium-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  line-height: 0.86;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin: 0 0 4px;
}
.podium-score-1 { font-size: 4rem; color: var(--gold); }
.podium-score-2 { font-size: 3rem; color: var(--silver); }
.podium-score-3 { font-size: 2.4rem; color: var(--bronze); }
.podium-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  line-height: 1.1;
  color: var(--ink-1);
  margin: 0 0 10px;
}
.podium-badges {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: center;
}
.podium-badge {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-2);
  background: oklch(0.18 0.015 90 / 0.7);
  border: 1px solid oklch(0.22 0.015 90);
  padding: 3px 8px;
  border-radius: 999px;
}
.podium-1-sub {
  margin: 12px 0 0;
  font-size: 0.8rem;
  color: var(--ink-3);
  max-width: 24ch;
}

.legacy-rows { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.legacy-row {
  display: grid;
  grid-template-columns: 28px 36px minmax(0, 1.3fr) minmax(0, 2.2fr) 70px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 12px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
  width: 100%;
}
.legacy-row-me { border-color: oklch(0.78 0.18 92 / 0.55); }
.legacy-row:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
@media (prefers-reduced-motion: no-preference) {
  .legacy-row { transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
  .legacy-row:hover { transform: translateY(-1px); border-color: oklch(0.30 0.015 90); }
}
.legacy-row:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.legacy-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: var(--ink-3);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.legacy-avatar {
  width: 36px; height: 36px; border-radius: 9px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.legacy-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.legacy-meta { min-width: 0; }
.legacy-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  line-height: 1.1;
  color: var(--ink-1);
  margin: 0;
}
.legacy-seasons {
  font-size: 0.74rem;
  color: var(--ink-4);
  margin: 2px 0 0;
}
.legacy-badges {
  list-style: none; padding: 0; margin: 0;
  display: inline-flex; gap: 6px; flex-wrap: wrap;
}
.legacy-badge {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3);
  background: oklch(0.13 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  padding: 3px 7px;
  border-radius: 999px;
}
.legacy-badge-gold {
  color: var(--gold);
  border-color: oklch(0.50 0.12 90 / 0.5);
  background: oklch(0.84 0.16 90 / 0.08);
}
.legacy-score {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1.4rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  text-align: right;
  letter-spacing: -0.005em;
}

@media (max-width: 720px) {
  .podium {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .podium-1, .podium-2, .podium-3 { order: 0; min-height: auto; }
  .legacy-row {
    grid-template-columns: 24px 32px minmax(0, 1fr) 60px;
    gap: 8px;
  }
  .legacy-badges { grid-column: 1 / -1; padding-left: 56px; }
}

/* ─── 3. LEGACY TRENDS CHART ──────────────────────────────────── */
.trends-chart-wrap {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 12px 8px 4px;
  margin-bottom: 14px;
}
.trends-chart {
  width: 100%;
  height: 360px;
  display: block;
}
@media (max-width: 720px) {
  .trends-chart { height: 240px; }
}
.trends-grid line {
  stroke: oklch(0.18 0.015 90);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}
.trends-xticks text {
  fill: var(--ink-4);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}
.trends-line-group path { opacity: 0.86; }
.trends-line-group.is-me path { opacity: 1; }
.trends-endlabels text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.trends-legend {
  list-style: none; padding: 0; margin: 0;
  display: flex; flex-wrap: wrap; gap: 6px;
}
.legend-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px 5px 8px;
  border-radius: 999px;
  background: oklch(0.12 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  color: var(--ink-2);
}
.legend-pill-me { border-color: oklch(0.84 0.16 90 / 0.55); }
.legend-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.legend-rank { font-weight: 900; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.legend-name { color: var(--ink-1); }
.legend-score {
  font-weight: 900;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}

/* ─── 4. H2H MATRIX ───────────────────────────────────────────── */
.h2h-matrix-wrap {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 14px;
  overflow-x: auto;
}
.h2h-matrix {
  border-collapse: separate;
  border-spacing: 4px;
  width: 100%;
  min-width: 720px;
}
.h2h-corner { width: 160px; }
.h2h-col-head {
  padding: 2px 0;
  text-align: center;
}
.h2h-col-avatar, .h2h-row-avatar {
  width: 30px; height: 30px;
  border-radius: 8px;
  display: inline-grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.72rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  vertical-align: middle;
}
.h2h-col-avatar-img, .h2h-row-avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.h2h-row-head {
  text-align: left;
  font-weight: 600;
  padding-right: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.h2h-row-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.82rem;
  color: var(--ink-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 130px;
}
.h2h-cell {
  text-align: center;
  padding: 0;
}
.h2h-cell-self {
  display: inline-block;
  width: 100%;
  padding: 8px 0;
  color: var(--ink-5);
}
.h2h-cell-btn {
  width: 100%;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 6px;
  background: oklch(0.12 0.015 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  padding: 0;
}
.h2h-cell-win .h2h-cell-btn {
  background: color-mix(in oklch, oklch(0.74 0.18 145) calc(var(--cell-tint, 0) * 32%), oklch(0.12 0.015 90));
  border-color: oklch(0.74 0.18 145 / 0.4);
}
.h2h-cell-loss .h2h-cell-btn {
  background: color-mix(in oklch, oklch(0.70 0.27 350) calc(var(--cell-tint, 0) * 32%), oklch(0.12 0.015 90));
  border-color: oklch(0.70 0.27 350 / 0.4);
}
.h2h-cell-even .h2h-cell-btn { background: oklch(0.14 0.015 90); }
.h2h-cell-btn:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 1px; }
@media (prefers-reduced-motion: no-preference) {
  .h2h-cell-btn { transition: transform 140ms cubic-bezier(0.22, 1, 0.36, 1), border-color 140ms cubic-bezier(0.22, 1, 0.36, 1); }
  @media (hover: hover) and (pointer: fine) {
    .h2h-cell-btn:hover { transform: scale(1.04); border-color: oklch(0.40 0.015 90); }
  }
}
.h2h-cell-btn:active { transform: scale(0.98); transition-duration: 100ms; }

/* Mobile rivalry list */
.h2h-rivalries {
  display: none;
  list-style: none;
  padding: 0;
  margin: 0;
  flex-direction: column;
  gap: 8px;
}
.h2h-rivalry {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 12px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  text-align: left;
}
.h2h-rivalry:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.h2h-rivalry-pair { display: inline-flex; align-items: center; gap: 6px; }
.h2h-rivalry-avatar {
  width: 32px; height: 32px;
  border-radius: 8px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.74rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.h2h-rivalry-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.h2h-rivalry-vs {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 700;
  color: var(--ink-4); letter-spacing: 0.1em; text-transform: uppercase;
}
.h2h-rivalry-meta { flex: 1; min-width: 0; }
.h2h-rivalry-names {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.92rem;
  color: var(--ink-1);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.h2h-rivalry-mid { color: var(--ink-4); font-weight: 700; }
.h2h-rivalry-record {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.84rem;
  color: var(--ink-2);
  margin: 2px 0 0;
  font-variant-numeric: tabular-nums;
}
.h2h-rivalry-dim { color: var(--ink-4); }
.h2h-rivalry-arrow { color: var(--ink-3); }

@media (max-width: 720px) {
  .h2h-matrix-wrap { display: none; }
  .h2h-rivalries { display: flex; }
}

/* ─── 5. AWARDS ───────────────────────────────────────────────── */
.awards-filters {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  margin-bottom: 18px;
}
.awards-filter {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-3);
  background: transparent;
  border: none;
  padding: 5px 14px;
  border-radius: 999px;
  cursor: pointer;
}
.awards-filter[disabled] { color: var(--ink-5); cursor: not-allowed; }
.awards-filter-active {
  background: oklch(0.18 0.015 90);
  color: var(--ink-1);
}
.awards-filter:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }

/* Year picker — appears below the All-time/Season chips when Season is active */
.awards-years {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  margin-left: 4px;
  flex-wrap: wrap;
}
.awards-years-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin-right: 6px;
}
.awards-year {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.86rem;
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
  color: var(--ink-3);
  background: transparent;
  border: 1px solid oklch(0.18 0.015 90);
  border-radius: 999px;
  padding: 4px 12px;
  cursor: pointer;
}
@media (prefers-reduced-motion: no-preference) {
  .awards-year { transition: color 160ms cubic-bezier(0.22, 1, 0.36, 1), background-color 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1); }
}
.awards-year:hover { color: var(--ink-1); border-color: oklch(0.30 0.018 90); }
.awards-year:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.awards-year:focus-visible { outline: 2px solid var(--accent-secondary); outline-offset: 2px; }
.awards-year-active {
  color: oklch(0.10 0.012 90);
  background: var(--accent-secondary);
  border-color: var(--accent-secondary);
}

.awards-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.86rem; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  margin: 26px 0 12px;
}
.awards-sub-fame  { color: var(--accent-up); }
.awards-sub-shame { color: var(--accent-secondary); }

/* Fame grid: large A spans full row, then B+C share a row, then D strip */
.fame-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.fame-a { grid-column: 1 / -1; }
.fame-d { grid-column: 1 / -1; }

.fame-a, .fame-b, .fame-c, .fame-d {
  text-align: left;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 16px 18px;
  cursor: pointer;
  color: inherit;
  font: inherit;
}
.fame-a, .fame-b, .fame-c, .fame-d {
  border-left: 3px solid var(--accent-up);
}
.fame-a:focus-visible, .fame-b:focus-visible, .fame-c:focus-visible, .fame-d:focus-visible {
  outline: 2px solid var(--accent-primary); outline-offset: 2px;
}
@media (prefers-reduced-motion: no-preference) {
  .fame-a, .fame-b, .fame-c, .fame-d {
    transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .fame-a:hover, .fame-b:hover, .fame-c:hover, .fame-d:hover { transform: translateY(-1px); border-color: oklch(0.30 0.015 90); border-left-color: var(--accent-up); }
}
.fame-a:active, .fame-b:active, .fame-c:active, .fame-d:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.fame-tile-eyebrow, .fame-a-eyebrow, .fame-d-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--accent-up);
  display: block;
  margin-bottom: 8px;
}
/* Fame A (LARGE) */
.fame-a {
  background:
    radial-gradient(ellipse at right, oklch(0.74 0.18 145 / 0.08), transparent 60%),
    oklch(0.10 0.015 90);
}
.fame-a-body {
  display: flex;
  align-items: center;
  gap: 22px;
  justify-content: space-between;
  flex-wrap: wrap;
}
.fame-a-id { display: flex; align-items: center; gap: 12px; }
.fame-a-avatar {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.fame-a-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fame-a-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.1rem;
  color: var(--ink-1);
  margin: 0;
}
.fame-a-when {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 2px 0 0;
}
.fame-a-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(3.4rem, 9vw, 5rem);
  line-height: 0.86;
  letter-spacing: -0.02em;
  color: var(--accent-up);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.fame-a-trail {
  margin: 12px 0 0;
  font-size: 0.86rem;
  color: var(--ink-3);
}

/* Fame B (medium half-width — logo on top) */
.fame-b-mid {
  display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
  margin-bottom: 8px;
}
.fame-b-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.fame-b-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fame-b-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-1);
  margin: 0;
}
.fame-b-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.4rem;
  line-height: 0.9;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.fame-b-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 4px 0 0;
}

/* Fame C (medium half-width — different background, inline row) */
.fame-c {
  background:
    linear-gradient(135deg, oklch(0.14 0.04 145 / 0.18), oklch(0.10 0.015 90) 70%);
}
.fame-c-row {
  display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;
}
.fame-c-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.6rem;
  line-height: 0.86;
  color: var(--accent-up);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.fame-c-id { display: inline-flex; align-items: center; gap: 8px; }
.fame-c-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.fame-c-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.fame-c-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800; font-size: 0.92rem;
  color: var(--ink-1);
  margin: 0;
}
.fame-c-sub {
  font-size: 0.82rem;
  color: var(--ink-3);
  margin: 10px 0 0;
}

/* Fame D (text strip) */
.fame-d { padding: 12px 16px; display: flex; align-items: baseline; gap: 14px; }
.fame-d-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.96rem;
  color: var(--ink-2);
  margin: 0;
}
.fame-d-text strong { color: var(--ink-1); font-weight: 900; }
.fame-d-pct { color: var(--accent-up); font-weight: 900; }
.fame-d-rec { color: var(--ink-3); }
.fame-d-dot { color: var(--ink-5); margin: 0 6px; }

/* Shame grid */
.shame-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.shame-c { grid-column: 1 / -1; }
.shame-d { grid-column: 1 / -1; }

.shame-a, .shame-b, .shame-c, .shame-d {
  text-align: left;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 16px 18px;
  cursor: pointer;
  color: inherit;
  font: inherit;
  border-left: 3px solid var(--accent-secondary);
}
.shame-a:focus-visible, .shame-b:focus-visible, .shame-c:focus-visible, .shame-d:focus-visible {
  outline: 2px solid var(--accent-primary); outline-offset: 2px;
}
@media (prefers-reduced-motion: no-preference) {
  .shame-a, .shame-b, .shame-c, .shame-d {
    transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .shame-a:hover, .shame-b:hover, .shame-c:hover, .shame-d:hover {
    transform: translateY(-1px); border-color: oklch(0.30 0.015 90);
    border-left-color: var(--accent-secondary);
  }
}
.shame-a:active, .shame-b:active, .shame-c:active, .shame-d:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.shame-tile-eyebrow, .shame-c-eyebrow, .shame-d-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--accent-secondary);
  display: block;
  margin-bottom: 8px;
}
/* Shame A: value top, logo+meta foot */
.shame-a-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 3.4rem;
  line-height: 0.86;
  letter-spacing: -0.02em;
  color: var(--accent-secondary);
  font-variant-numeric: tabular-nums;
  margin: 0 0 12px;
}
.shame-a-foot { display: flex; align-items: center; gap: 10px; }
.shame-a-avatar {
  width: 40px; height: 40px; border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.92rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.shame-a-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.shame-a-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-1);
  margin: 0;
}
.shame-a-when {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 2px 0 0;
}

/* Shame B: row with logo on right */
.shame-b-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.shame-b-text { min-width: 0; }
.shame-b-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.6rem;
  line-height: 0.86;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  margin: 0;
}
.shame-b-sub {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  margin: 4px 0 6px;
}
.shame-b-team {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.96rem;
  color: var(--ink-2);
  margin: 0;
}
.shame-b-avatar {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 1rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  flex-shrink: 0;
}
.shame-b-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Shame C: full-width text strip */
.shame-c { padding: 14px 18px; }
.shame-c-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.05rem;
  color: var(--ink-2);
  margin: 0;
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px;
}
.shame-c-text strong { color: var(--ink-1); font-weight: 900; }
.shame-c-value {
  font-weight: 900;
  font-size: 1.5rem;
  color: var(--accent-secondary);
  font-variant-numeric: tabular-nums;
}
.shame-c-trail { color: var(--ink-3); font-weight: 600; font-size: 0.92rem; }
.shame-c-dot { color: var(--ink-5); margin: 0 6px; }

/* Shame D: inline pill */
.shame-d {
  padding: 12px 16px;
  display: flex; align-items: baseline; gap: 14px;
}
.shame-d-text {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.96rem;
  color: var(--ink-2);
  margin: 0;
}
.shame-d-text strong { color: var(--ink-1); font-weight: 900; }
.shame-d-pct { color: var(--accent-secondary); font-weight: 900; }
.shame-d-dot { color: var(--ink-5); margin: 0 6px; }

@media (max-width: 720px) {
  .fame-grid, .shame-grid { grid-template-columns: 1fr; }
  .fame-a-value { font-size: 3rem; }
  .shame-a-value { font-size: 2.8rem; }
}

/* ─── 6. CAREER STATS TABLE ───────────────────────────────────── */
.career-table-wrap {
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.16 0.015 90);
  border-radius: 14px;
  padding: 6px 0;
  overflow-x: auto;
}
.career-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
}
.career-table thead th {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ink-3);
  text-align: left;
  padding: 12px 14px;
  border-bottom: 1px solid oklch(0.18 0.015 90);
}
.career-table thead th.th-num { text-align: right; }
.career-table tbody tr { border-bottom: 1px solid oklch(0.14 0.015 90); }
.career-table tbody tr:last-child { border-bottom: none; }
.career-table .td-team { padding: 0 14px; text-align: left; font-weight: inherit; }
.career-row-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  padding: 10px 0;
  text-align: left;
}
.career-row-btn:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.career-avatar {
  width: 32px; height: 32px; border-radius: 8px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900; font-size: 0.78rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.career-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.career-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.96rem;
  color: var(--ink-1);
}
.career-table .td-num {
  padding: 10px 14px;
  text-align: right;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  font-size: 0.94rem;
  color: var(--ink-2);
  font-variant-numeric: tabular-nums;
}
.career-title-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 6px;
  background: oklch(0.84 0.16 90 / 0.14);
  color: var(--gold);
  font-weight: 900;
  font-size: 0.86rem;
}
.career-dash { color: var(--ink-5); }

/* ─── Footer pills ────────────────────────────────────────────── */
.pills {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex; flex-wrap: wrap; gap: 8px;
}
.pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-radius: 999px;
  background: oklch(0.10 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  font-size: 0.84rem;
  color: var(--ink-2);
}
.pill-dot { width: 8px; height: 8px; border-radius: 50%; }
.pill-dot-gold { background: var(--gold); }
.pill-dot-secondary { background: var(--accent-secondary); }
.pill-dot-tertiary { background: var(--accent-tertiary); }
.pill-dot-mute { background: var(--ink-4); }
.pill-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem; font-weight: 800;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-3);
}
.pill-value { color: var(--ink-1); font-weight: 600; }
</style>
