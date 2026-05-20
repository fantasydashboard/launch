<template>
  <div class="draft">
    <!-- ─── 1. PAGE HEADER ──────────────────────────────────────────── -->
    <header class="page-head">
      <div class="page-head-copy">
        <p class="page-eyebrow">
          <span class="page-eyebrow-bar" aria-hidden="true"></span>
          Draft 2025
        </p>
        <h1 class="page-headline">The receipts.</h1>
        <p class="page-sub">Eleven weeks in. Who drafted like a contender. Who autodrafted in week 1.</p>
      </div>
      <ul class="page-context" role="list" aria-label="Draft at a glance">
        <li class="page-context-stat">
          <span class="page-context-num">100</span>
          <span class="page-context-label">picks</span>
        </li>
        <li class="page-context-sep" aria-hidden="true"></li>
        <li class="page-context-stat">
          <span class="page-context-num">11</span>
          <span class="page-context-label">weeks scored</span>
        </li>
        <li class="page-context-sep" aria-hidden="true"></li>
        <li class="page-context-stat">
          <span class="page-context-num page-context-num-pos">{{ stealCount }}</span>
          <span class="page-context-label">steals</span>
        </li>
        <li class="page-context-sep" aria-hidden="true"></li>
        <li class="page-context-stat">
          <span class="page-context-num page-context-num-neg">{{ disasterCount }}</span>
          <span class="page-context-label">disasters</span>
        </li>
      </ul>
    </header>

    <!-- ─── 2. DRAFT AWARDS HERO ────────────────────────────────────── -->
    <section class="awards" aria-labelledby="awards-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="awards-heading">The awards</p>
        <h2 class="awards-headline">Three things you need to know.</h2>
      </header>

      <div class="awards-grid">
        <!-- Best Team (top, full width) -->
        <article class="award-best">
          <span class="award-best-chrome-top" aria-hidden="true"></span>
          <span class="award-best-chrome-bottom" aria-hidden="true"></span>
          <span class="award-best-glow" aria-hidden="true"></span>
          <div class="award-best-portrait">
            <div
              class="award-best-avatar"
              :style="{ background: `linear-gradient(135deg, ${bestTeam.avatarColor})` }"
            >
              <img v-if="bestTeam.avatarUrl" :src="bestTeam.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ bestTeam.ownerInitials }}</span>
            </div>
          </div>
          <div class="award-best-body">
            <p class="award-best-eyebrow">Best draft of 2025</p>
            <h3 class="award-best-headline">{{ bestAward.headline }}</h3>
            <p class="award-best-copy">{{ bestAward.body }}</p>
            <ul class="award-best-stats" role="list">
              <li><span class="award-best-stat-num award-best-stat-num-pos">{{ bestTeamGrade.steals }}</span> <span class="award-best-stat-label">steals</span></li>
              <li class="award-best-stat-sep" aria-hidden="true"></li>
              <li><span class="award-best-stat-num">{{ bestTeamGrade.hits }}</span> <span class="award-best-stat-label">hits</span></li>
              <li class="award-best-stat-sep" aria-hidden="true"></li>
              <li><span class="award-best-stat-num award-best-stat-num-neg">{{ bestTeamGrade.busts }}</span> <span class="award-best-stat-label">busts</span></li>
              <li class="award-best-stat-sep" aria-hidden="true"></li>
              <li><span class="award-best-stat-num">{{ bestTeamGrade.earlyRoundHitRate }}%</span> <span class="award-best-stat-label">early hit rate</span></li>
            </ul>
            <button
              type="button"
              class="award-best-cta"
              :aria-label="`Open ${bestTeam.name} draft breakdown`"
              @click="openTeamModal(bestTeam.id, $event)"
            >
              Open team draft
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
          <p class="award-best-grade" :aria-label="`Grade ${bestTeamGrade.grade}`">{{ bestTeamGrade.grade }}</p>
        </article>

        <!-- Steal of the Draft (bottom-left, medium-large) -->
        <article class="award-steal" @click="openPickModal(stealPick.pickNumber)" tabindex="0" role="button"
          :aria-label="`Open ${stealPick.playerName} pick detail`"
          @keydown.enter.prevent="openPickModal(stealPick.pickNumber)"
          @keydown.space.prevent="openPickModal(stealPick.pickNumber)">
          <span class="award-steal-edge" aria-hidden="true"></span>
          <p class="award-steal-eyebrow">Steal of the draft</p>
          <div class="award-steal-row">
            <div class="award-steal-glyph" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="12" rx="8" ry="5" transform="rotate(-30 12 12)"/>
                <line x1="8" y1="14" x2="16" y2="10"/>
              </svg>
            </div>
            <div class="award-steal-text">
              <h3 class="award-steal-name">{{ stealPick.playerName }}</h3>
              <p class="award-steal-meta">
                <span class="award-pos-pill award-pos-pill-qb">{{ stealPick.position }}{{ stealPick.positionRankAtDraft }}</span>
                <span class="dot" aria-hidden="true">·</span>
                R{{ stealPick.round }}
                <span class="dot" aria-hidden="true">·</span>
                Pick #{{ stealPick.pickNumber }}
              </p>
            </div>
          </div>
          <p class="award-steal-value">+{{ stealPick.valueScore }}</p>
          <p class="award-steal-body">{{ stealAward.body }}</p>
          <div class="award-steal-by">
            <div
              class="award-by-avatar"
              :style="{ background: `linear-gradient(135deg, ${stealTeam.avatarColor})` }"
            >
              <img v-if="stealTeam.avatarUrl" :src="stealTeam.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ stealTeam.ownerInitials }}</span>
            </div>
            <span class="award-by-label">Drafted by {{ stealTeam.name }}</span>
          </div>
        </article>

        <!-- Bust of the Draft (bottom-right, smaller) -->
        <article class="award-bust" @click="openPickModal(bustPick.pickNumber)" tabindex="0" role="button"
          :aria-label="`Open ${bustPick.playerName} pick detail`"
          @keydown.enter.prevent="openPickModal(bustPick.pickNumber)"
          @keydown.space.prevent="openPickModal(bustPick.pickNumber)">
          <span class="award-bust-tape" aria-hidden="true"></span>
          <p class="award-bust-eyebrow">Bust of the draft</p>
          <h3 class="award-bust-name">{{ bustPick.playerName }}</h3>
          <p class="award-bust-meta">
            <span class="award-pos-pill award-pos-pill-wr">{{ bustPick.position }}{{ bustPick.positionRankAtDraft }}</span>
            <span class="dot" aria-hidden="true">·</span>
            R{{ bustPick.round }}
            <span class="dot" aria-hidden="true">·</span>
            Pick #{{ bustPick.pickNumber }}
          </p>
          <p class="award-bust-value">{{ bustPick.valueScore }}</p>
          <p class="award-bust-body">{{ bustAward.body }}</p>
          <div class="award-steal-by">
            <div
              class="award-by-avatar"
              :style="{ background: `linear-gradient(135deg, ${bustTeam.avatarColor})` }"
            >
              <img v-if="bustTeam.avatarUrl" :src="bustTeam.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ bustTeam.ownerInitials }}</span>
            </div>
            <span class="award-by-label">Drafted by {{ bustTeam.name }}</span>
          </div>
        </article>
      </div>
    </section>

    <!-- ─── 3. TEAM STANDINGS — PODIUM + COMPACT ROWS ───────────────── -->
    <section class="standings" aria-labelledby="standings-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="standings-heading">The grades</p>
        <h2 class="standings-headline">Where ten owners landed.</h2>
      </header>

      <!-- Podium top 3 -->
      <div class="podium">
        <!-- #2 silver (middle) -->
        <article class="podium-card podium-silver" :class="{ 'is-my-team': teamFor(podiumRanks[1]).isMyTeam }"
          tabindex="0" role="button"
          :aria-label="`Open ${teamFor(podiumRanks[1]).name} draft breakdown`"
          @click="openTeamModal(podiumRanks[1].teamId, $event)"
          @keydown.enter.prevent="openTeamModal(podiumRanks[1].teamId, $event)"
          @keydown.space.prevent="openTeamModal(podiumRanks[1].teamId, $event)">
          <span class="podium-medal podium-medal-silver" aria-hidden="true">2</span>
          <div class="podium-avatar podium-avatar-silver"
            :style="{ background: `linear-gradient(135deg, ${teamFor(podiumRanks[1]).avatarColor})` }">
            <img v-if="teamFor(podiumRanks[1]).avatarUrl" :src="teamFor(podiumRanks[1]).avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ teamFor(podiumRanks[1]).ownerInitials }}</span>
          </div>
          <p class="podium-team-name">{{ teamFor(podiumRanks[1]).name }}</p>
          <p class="podium-team-owner">{{ teamFor(podiumRanks[1]).ownerName }}</p>
          <p class="podium-grade podium-grade-silver">{{ podiumRanks[1].grade }}</p>
          <p class="podium-stats">
            <span class="podium-stat-pos">{{ podiumRanks[1].steals }} steal{{ podiumRanks[1].steals === 1 ? '' : 's' }}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span>{{ podiumRanks[1].hits }} hits</span>
            <span class="dot" aria-hidden="true">·</span>
            <span class="podium-stat-neg">{{ podiumRanks[1].busts }} busts</span>
          </p>
          <p class="podium-editorial">{{ podiumRanks[1].editorialCopy }}</p>
        </article>

        <!-- #1 gold (tallest, center-left in podium layout but rendered first via order) -->
        <article class="podium-card podium-gold" :class="{ 'is-my-team': teamFor(podiumRanks[0]).isMyTeam }"
          tabindex="0" role="button"
          :aria-label="`Open ${teamFor(podiumRanks[0]).name} draft breakdown`"
          @click="openTeamModal(podiumRanks[0].teamId, $event)"
          @keydown.enter.prevent="openTeamModal(podiumRanks[0].teamId, $event)"
          @keydown.space.prevent="openTeamModal(podiumRanks[0].teamId, $event)">
          <span class="podium-medal podium-medal-gold" aria-hidden="true">1</span>
          <div class="podium-avatar podium-avatar-gold"
            :style="{ background: `linear-gradient(135deg, ${teamFor(podiumRanks[0]).avatarColor})` }">
            <img v-if="teamFor(podiumRanks[0]).avatarUrl" :src="teamFor(podiumRanks[0]).avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ teamFor(podiumRanks[0]).ownerInitials }}</span>
          </div>
          <p class="podium-team-name podium-team-name-large">{{ teamFor(podiumRanks[0]).name }}</p>
          <p class="podium-team-owner">{{ teamFor(podiumRanks[0]).ownerName }}</p>
          <p class="podium-grade podium-grade-gold">{{ podiumRanks[0].grade }}</p>
          <p class="podium-stats">
            <span class="podium-stat-pos">{{ podiumRanks[0].steals }} steal{{ podiumRanks[0].steals === 1 ? '' : 's' }}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span>{{ podiumRanks[0].hits }} hits</span>
            <span class="dot" aria-hidden="true">·</span>
            <span class="podium-stat-neg">{{ podiumRanks[0].busts }} busts</span>
          </p>
          <p class="podium-editorial">{{ podiumRanks[0].editorialCopy }}</p>
        </article>

        <!-- #3 bronze (compact) -->
        <article class="podium-card podium-bronze" :class="{ 'is-my-team': teamFor(podiumRanks[2]).isMyTeam }"
          tabindex="0" role="button"
          :aria-label="`Open ${teamFor(podiumRanks[2]).name} draft breakdown`"
          @click="openTeamModal(podiumRanks[2].teamId, $event)"
          @keydown.enter.prevent="openTeamModal(podiumRanks[2].teamId, $event)"
          @keydown.space.prevent="openTeamModal(podiumRanks[2].teamId, $event)">
          <span class="podium-medal podium-medal-bronze" aria-hidden="true">3</span>
          <div class="podium-avatar podium-avatar-bronze"
            :style="{ background: `linear-gradient(135deg, ${teamFor(podiumRanks[2]).avatarColor})` }">
            <img v-if="teamFor(podiumRanks[2]).avatarUrl" :src="teamFor(podiumRanks[2]).avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ teamFor(podiumRanks[2]).ownerInitials }}</span>
          </div>
          <p class="podium-team-name">{{ teamFor(podiumRanks[2]).name }}</p>
          <p class="podium-team-owner">{{ teamFor(podiumRanks[2]).ownerName }}</p>
          <p class="podium-grade podium-grade-bronze">{{ podiumRanks[2].grade }}</p>
          <p class="podium-stats">
            <span class="podium-stat-pos">{{ podiumRanks[2].steals }} steal{{ podiumRanks[2].steals === 1 ? '' : 's' }}</span>
            <span class="dot" aria-hidden="true">·</span>
            <span>{{ podiumRanks[2].hits }} hits</span>
            <span class="dot" aria-hidden="true">·</span>
            <span class="podium-stat-neg">{{ podiumRanks[2].busts }} busts</span>
          </p>
          <p class="podium-editorial">{{ podiumRanks[2].editorialCopy }}</p>
        </article>
      </div>

      <!-- Compact rows 4-10 -->
      <ul class="rest" role="list">
        <li
          v-for="g in restRanks"
          :key="g.teamId"
          class="rest-row"
          :class="{ 'is-my-team': teamFor(g).isMyTeam }"
          tabindex="0"
          role="button"
          :aria-label="`Open ${teamFor(g).name} draft breakdown`"
          @click="openTeamModal(g.teamId, $event)"
          @keydown.enter.prevent="openTeamModal(g.teamId, $event)"
          @keydown.space.prevent="openTeamModal(g.teamId, $event)"
        >
          <span class="rest-rank">{{ g.rank }}</span>
          <div class="rest-avatar"
            :style="{ background: `linear-gradient(135deg, ${teamFor(g).avatarColor})` }">
            <img v-if="teamFor(g).avatarUrl" :src="teamFor(g).avatarUrl" class="avatar-img" alt="" />
            <span v-else>{{ teamFor(g).ownerInitials }}</span>
          </div>
          <div class="rest-text">
            <p class="rest-name">{{ teamFor(g).name }}</p>
            <p class="rest-owner">{{ teamFor(g).ownerName }}</p>
          </div>
          <span class="rest-grade" :class="`rest-grade-${gradeBand(g.grade)}`">{{ g.grade }}</span>
          <p class="rest-stats">
            <span class="rest-stat-pos">{{ g.steals }} S</span>
            <span class="rest-sep" aria-hidden="true"></span>
            <span>{{ g.hits }} H</span>
            <span class="rest-sep" aria-hidden="true"></span>
            <span>{{ g.misses }} M</span>
            <span class="rest-sep" aria-hidden="true"></span>
            <span class="rest-stat-neg">{{ g.busts }} B</span>
          </p>
        </li>
      </ul>
    </section>

    <!-- ─── 4. THE BOARD — heat-map grid ───────────────────────────── -->
    <section class="board" aria-labelledby="board-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-magenta" id="board-heading">The board</p>
        <h2 class="board-headline">All 100 picks. Color-coded by value.</h2>
        <p class="section-sub">Snake order. Green is positive value over draft slot, magenta is negative. Click any pick.</p>
      </header>

      <div class="board-scroll">
        <div class="board-grid" :style="{ '--team-count': teams.length }">
          <!-- Column headers: team logos + grade -->
          <div
            v-for="t in teams"
            :key="`hdr-${t.id}`"
            class="board-col-head"
            :class="{ 'is-my-team': t.isMyTeam }"
          >
            <div class="board-col-avatar"
              :style="{ background: `linear-gradient(135deg, ${t.avatarColor})` }">
              <img v-if="t.avatarUrl" :src="t.avatarUrl" class="avatar-img" alt="" />
              <span v-else>{{ t.ownerInitials }}</span>
            </div>
            <p class="board-col-name">{{ t.name }}</p>
            <span class="board-col-grade" :class="`rest-grade-${gradeBand(gradeForTeam(t.id).grade)}`">{{ gradeForTeam(t.id).grade }}</span>
          </div>

          <!-- 100 cells -->
          <button
            v-for="cell in boardCells"
            :key="cell.pick.pickNumber"
            type="button"
            class="board-cell"
            :style="{ background: cellBg(cell.pick.valueScore), borderColor: cellBorder(cell.pick.valueScore) }"
            :aria-label="`${cell.pick.playerName}, ${cell.pick.position}, pick ${cell.pick.pickNumber}, value ${cell.pick.valueScore}`"
            @click="openPickModal(cell.pick.pickNumber)"
          >
            <span class="board-cell-num">#{{ cell.pick.pickNumber }}</span>
            <span class="board-cell-name">{{ cell.pick.playerName }}</span>
            <div class="board-cell-foot">
              <span class="board-cell-pos" :style="{ background: posBg(cell.pick.position), color: posFg(cell.pick.position) }">{{ cell.pick.position }}</span>
              <span class="board-cell-val" :style="{ color: valueColor(cell.pick.valueScore) }">
                {{ cell.pick.valueScore > 0 ? '+' : '' }}{{ cell.pick.valueScore }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </section>

    <!-- ─── 5. ROUND-BY-ROUND ANALYSIS ──────────────────────────────── -->
    <section class="rounds" aria-labelledby="rounds-heading">
      <header class="section-head">
        <p class="section-eyebrow section-eyebrow-teal" id="rounds-heading">By the round</p>
        <h2 class="rounds-headline">When the draft delivered. When it didn't.</h2>
      </header>

      <ul class="rounds-list" role="list">
        <li v-for="r in roundSummary" :key="r.round" class="rounds-row">
          <span class="rounds-chip">R{{ r.round }}</span>
          <div class="rounds-bar" :aria-label="`Round ${r.round}: ${r.hits} hits, ${r.misses} misses`">
            <span class="rounds-bar-hits" :style="{ width: `${(r.hits / 10) * 100}%` }">{{ r.hits }} hit{{ r.hits === 1 ? '' : 's' }}</span>
            <span class="rounds-bar-neutral" :style="{ width: `${(r.neutral / 10) * 100}%` }"></span>
            <span class="rounds-bar-misses" :style="{ width: `${(r.misses / 10) * 100}%` }">{{ r.misses }} miss{{ r.misses === 1 ? '' : 'es' }}</span>
          </div>
          <span class="rounds-avg" :style="{ color: valueColor(r.avgValue) }">
            {{ r.avgValue >= 0 ? '+' : '' }}{{ r.avgValue.toFixed(1) }}
            <span class="rounds-avg-label">avg</span>
          </span>
        </li>
      </ul>

      <p class="rounds-pills-eyebrow">Position breakdown</p>
      <ul class="rounds-pills" role="list">
        <li
          v-for="pb in positionBreakdown"
          :key="pb.position"
          class="rounds-pill"
          :style="{ background: posBg(pb.position), color: posFg(pb.position), borderColor: posBg(pb.position) }"
        >
          <span class="rounds-pill-pos">{{ pb.position }}</span>
          <span class="rounds-pill-sep" aria-hidden="true">·</span>
          <span class="rounds-pill-count">{{ pb.count }} drafted</span>
          <span class="rounds-pill-sep" aria-hidden="true">·</span>
          <span class="rounds-pill-avg">avg {{ pb.avgValue >= 0 ? '+' : '' }}{{ pb.avgValue.toFixed(1) }}</span>
        </li>
      </ul>
    </section>

    <!-- Modals -->
    <TeamDraftModal
      v-if="teamModalId"
      :team-id="teamModalId"
      @close="closeTeamModal"
      @open-signup="$emit('open-signup')"
    />
    <PlayerPickModal
      v-if="pickModalNumber !== null"
      :pick-number="pickModalNumber"
      @close="closePickModal"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  teams,
  getTeam,
  draftPicks,
  teamDraftGrades,
  draftAwards,
  type PlayerPosition,
  type TeamDraftGrade,
} from '@/fixtures/pillarsLeague'
import TeamDraftModal from '@/components/demo/TeamDraftModal.vue'
import PlayerPickModal from '@/components/demo/PlayerPickModal.vue'

defineEmits<{ (e: 'open-signup'): void }>()

/* ─── Awards data ────────────────────────────────────────────── */
const bestAward = draftAwards.find(a => a.type === 'best-team')!
const stealAward = draftAwards.find(a => a.type === 'steal')!
const bustAward = draftAwards.find(a => a.type === 'bust')!

const bestTeam = computed(() => getTeam(bestAward.teamId!))
const bestTeamGrade = computed(() => teamDraftGrades.find(g => g.teamId === bestAward.teamId)!)
const stealPick = computed(() => draftPicks.find(p => p.pickNumber === stealAward.pickNumber)!)
const stealTeam = computed(() => getTeam(stealPick.value.draftedByTeamId))
const bustPick = computed(() => draftPicks.find(p => p.pickNumber === bustAward.pickNumber)!)
const bustTeam = computed(() => getTeam(bustPick.value.draftedByTeamId))

/* ─── Page header context counts ─────────────────────────────── */
const stealCount = computed(
  () => draftPicks.filter(p => p.verdict === 'STEAL' || p.verdict === 'JACKPOT').length,
)
const disasterCount = computed(
  () => draftPicks.filter(p => p.verdict === 'DISASTER').length,
)

/* ─── Team standings (ordered by draft grade rank) ───────────── */
const sortedGrades = computed(() => [...teamDraftGrades].sort((a, b) => a.rank - b.rank))
const podiumRanks = computed(() => sortedGrades.value.slice(0, 3))
const restRanks = computed(() => sortedGrades.value.slice(3))

function teamFor(g: TeamDraftGrade) {
  return getTeam(g.teamId)
}

function gradeBand(grade: string): 'aplus' | 'a' | 'b' | 'c' | 'd' {
  if (grade === 'A+') return 'aplus'
  if (grade.startsWith('A')) return 'a'
  if (grade.startsWith('B')) return 'b'
  if (grade.startsWith('C')) return 'c'
  return 'd'
}

function gradeForTeam(teamId: string) {
  return teamDraftGrades.find(g => g.teamId === teamId)!
}

/* ─── Board grid ─────────────────────────────────────────────── */
// Render 10x10 grid: columns are teams (1-10), rows are rounds.
// Map each (team, round) to the actual pick.
interface BoardCell {
  pick: typeof draftPicks[0]
}
const boardCells = computed<BoardCell[]>(() => {
  const cells: BoardCell[] = []
  // Iterate rows = rounds, columns = teams
  for (let round = 1; round <= 10; round++) {
    for (const team of teams) {
      const pick = draftPicks.find(p => p.draftedByTeamId === team.id && p.round === round)
      if (pick) cells.push({ pick })
    }
  }
  return cells
})

function cellBg(val: number) {
  const intensity = Math.min(Math.abs(val) / 80, 1) // cap at 1
  if (val >= 5) {
    const alpha = 0.10 + intensity * 0.30
    return `oklch(0.72 0.18 145 / ${alpha.toFixed(2)})`
  }
  if (val <= -5) {
    const alpha = 0.10 + intensity * 0.30
    return `oklch(0.70 0.27 350 / ${alpha.toFixed(2)})`
  }
  return 'oklch(0.14 0.018 90)'
}
function cellBorder(val: number) {
  if (val >= 25) return 'oklch(0.72 0.18 145 / 0.55)'
  if (val >= 5)  return 'oklch(0.72 0.18 145 / 0.30)'
  if (val <= -25)return 'oklch(0.70 0.27 350 / 0.55)'
  if (val <= -5) return 'oklch(0.70 0.27 350 / 0.30)'
  return 'oklch(0.20 0.015 90)'
}
function valueColor(val: number) {
  if (val >= 5)  return 'oklch(0.86 0.18 145)'
  if (val <= -5) return 'oklch(0.80 0.20 350)'
  return 'oklch(0.78 0.008 90)'
}

function posBg(pos: PlayerPosition) {
  switch (pos) {
    case 'QB': return 'oklch(0.65 0.20 25 / 0.20)'
    case 'RB': return 'oklch(0.72 0.18 145 / 0.20)'
    case 'WR': return 'oklch(0.68 0.18 245 / 0.22)'
    case 'TE': return 'oklch(0.74 0.15 60 / 0.22)'
    case 'K':  return 'oklch(0.55 0.02 270 / 0.30)'
    case 'DST':return 'oklch(0.40 0.02 270 / 0.34)'
  }
}
function posFg(pos: PlayerPosition) {
  switch (pos) {
    case 'QB': return 'oklch(0.80 0.20 25)'
    case 'RB': return 'oklch(0.84 0.18 145)'
    case 'WR': return 'oklch(0.82 0.18 245)'
    case 'TE': return 'oklch(0.84 0.15 60)'
    case 'K':  return 'oklch(0.82 0.02 90)'
    case 'DST':return 'oklch(0.82 0.02 90)'
  }
}

/* ─── Round summary ──────────────────────────────────────────── */
interface RoundRow {
  round: number
  hits: number
  misses: number
  neutral: number
  avgValue: number
}
const roundSummary = computed<RoundRow[]>(() => {
  const out: RoundRow[] = []
  for (let r = 1; r <= 10; r++) {
    const picks = draftPicks.filter(p => p.round === r)
    let hits = 0, misses = 0, neutral = 0, sum = 0
    for (const p of picks) {
      if (p.valueScore >= 5) hits++
      else if (p.valueScore <= -5) misses++
      else neutral++
      sum += p.valueScore
    }
    out.push({ round: r, hits, misses, neutral, avgValue: sum / picks.length })
  }
  return out
})

/* ─── Position breakdown ─────────────────────────────────────── */
interface PosBreak {
  position: PlayerPosition
  count: number
  avgValue: number
}
const positionBreakdown = computed<PosBreak[]>(() => {
  const positions: PlayerPosition[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
  return positions.map(pos => {
    const picks = draftPicks.filter(p => p.position === pos)
    const sum = picks.reduce((s, p) => s + p.valueScore, 0)
    return {
      position: pos,
      count: picks.length,
      avgValue: picks.length > 0 ? sum / picks.length : 0,
    }
  }).filter(pb => pb.count > 0)
})

/* ─── Modal state + focus restore ────────────────────────────── */
const teamModalId = ref<string | null>(null)
const pickModalNumber = ref<number | null>(null)
const lastFocused = ref<HTMLElement | null>(null)

function openTeamModal(teamId: string, ev?: Event) {
  lastFocused.value = (ev?.currentTarget as HTMLElement | null) ?? null
  teamModalId.value = teamId
}
function closeTeamModal() {
  teamModalId.value = null
  nextTick(() => lastFocused.value?.focus?.())
}
function openPickModal(pickNumber: number) {
  lastFocused.value = (document.activeElement as HTMLElement) ?? null
  pickModalNumber.value = pickNumber
}
function closePickModal() {
  pickModalNumber.value = null
  nextTick(() => lastFocused.value?.focus?.())
}
</script>

<style scoped>
/* Tokens (--ink-N, --accent-*) inherited from .demo-shell in DemoLayout.
   --accent-positive is draft-specific (slightly hotter green than --accent-up). */
.draft {
  --accent-positive: oklch(0.72 0.18 145);  /* green — positive draft value */

  display: flex;
  flex-direction: column;
  gap: 64px;
  font-family: 'Barlow', sans-serif;
  color: var(--ink-1);
}

/* ─── Shared section headings ────────────────────────────────── */
.section-head { margin-bottom: 18px; }
.section-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin: 0 0 8px;
}
.section-eyebrow-magenta { color: var(--accent-secondary); }
.section-eyebrow-teal    { color: var(--accent-tertiary); }
.section-eyebrow::before {
  content: '';
  width: 24px;
  height: 1px;
  background: currentColor;
}
.section-sub {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-3);
  margin: 8px 0 0;
  max-width: 60ch;
}

/* ─── Page header ────────────────────────────────────────────── */
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 28px;
  flex-wrap: wrap;
  padding-top: 4px;
}
.page-head-copy { max-width: 60ch; }
.page-eyebrow {
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
.page-eyebrow-bar { width: 24px; height: 1px; background: var(--accent-secondary); }
.page-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.25rem, 5vw, 3.4rem);
  line-height: 0.94;
  letter-spacing: -0.012em;
  color: var(--ink-1);
  margin: 0 0 10px;
}
.page-sub {
  font-size: 1.02rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0;
  max-width: 52ch;
}
.page-context {
  list-style: none;
  padding: 0;
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.page-context-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.page-context-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.05rem;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}
.page-context-num-pos { color: var(--accent-positive); }
.page-context-num-neg { color: var(--accent-secondary); }
.page-context-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.page-context-sep {
  width: 1px; height: 14px;
  background: var(--ink-5);
  display: inline-block;
}

@media (max-width: 720px) {
  .page-head { flex-direction: column; align-items: flex-start; gap: 16px; }
  .page-context { gap: 10px; }
}

/* ─── 2. AWARDS ──────────────────────────────────────────────── */
.awards-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 0;
}
.awards-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 18px;
}

/* Best team — spans top row */
.award-best {
  grid-column: 1 / -1;
  position: relative;
  display: grid;
  grid-template-columns: 132px 1fr auto;
  gap: 28px;
  align-items: center;
  padding: 26px 30px;
  border-radius: 18px;
  background:
    radial-gradient(ellipse 50% 100% at 0% 50%, oklch(0.78 0.18 92 / 0.12), transparent 65%),
    oklch(0.11 0.015 90);
  border: 1px solid oklch(0.78 0.18 92 / 0.30);
  overflow: hidden;
}
.award-best-chrome-top,
.award-best-chrome-bottom {
  position: absolute;
  left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg,
    transparent,
    oklch(0.78 0.18 92 / 0.7) 30%,
    oklch(0.92 0.16 92) 50%,
    oklch(0.78 0.18 92 / 0.7) 70%,
    transparent);
  pointer-events: none;
}
.award-best-chrome-top { top: 0; }
.award-best-chrome-bottom { bottom: 0; }
.award-best-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(ellipse 30% 60% at 80% 50%, oklch(0.78 0.18 92 / 0.20), transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.award-best > * { position: relative; z-index: 1; }
.award-best-portrait {
  width: 96px; height: 96px;
}
.award-best-avatar {
  width: 96px; height: 96px;
  border-radius: 22px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 2.2rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  box-shadow: 0 12px 32px -10px oklch(0 0 0 / 0.55);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.award-best-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-primary);
  margin: 0 0 8px;
}
.award-best-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.6rem, 3.6vw, 2.5rem);
  line-height: 0.98;
  letter-spacing: -0.01em;
  color: var(--ink-1);
  margin: 0 0 12px;
  max-width: 34ch;
}
.award-best-copy {
  font-size: 1rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0 0 16px;
  max-width: 56ch;
}
.award-best-stats {
  list-style: none;
  padding: 0;
  margin: 0 0 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  font-family: 'Barlow Condensed', sans-serif;
}
.award-best-stats li {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 0.86rem;
}
.award-best-stat-num {
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  font-size: 1rem;
  color: var(--ink-1);
}
.award-best-stat-num-pos { color: var(--accent-positive); }
.award-best-stat-num-neg { color: var(--accent-secondary); }
.award-best-stat-label {
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.award-best-stat-sep {
  width: 1px; height: 12px;
  background: var(--ink-5);
}
.award-best-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.88rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: oklch(0.10 0.012 90);
  background: var(--accent-primary);
  border: none;
  padding: 10px 18px;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), background-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .award-best-cta:hover { transform: translateY(-1px); background: oklch(0.82 0.18 92); }
}
.award-best-cta:active {
  transform: scale(0.97);
  transition-duration: 100ms;
}
.award-best-cta:focus-visible {
  outline: 2px solid var(--ink-1);
  outline-offset: 2px;
}
.award-best-grade {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(5rem, 12vw, 8rem);
  line-height: 0.84;
  letter-spacing: -0.04em;
  color: oklch(0.92 0.18 92);
  margin: 0;
  filter: drop-shadow(0 0 30px oklch(0.78 0.18 92 / 0.6));
  align-self: center;
}

/* Steal (bottom-left, medium) */
.award-steal {
  position: relative;
  padding: 22px 24px;
  border-radius: 18px;
  background: oklch(0.72 0.18 145 / 0.06);
  border: 1px solid oklch(0.72 0.18 145 / 0.25);
  cursor: pointer;
  overflow: hidden;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: no-preference) {
  .award-steal:hover { transform: translateY(-1px); border-color: oklch(0.72 0.18 145 / 0.50); }
  .award-bust:hover  { transform: translateY(-1px); border-color: oklch(0.70 0.27 350 / 0.50); }
}
.award-steal:active,
.award-bust:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.award-steal:focus-visible, .award-bust:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
.award-steal-edge {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 3px;
  background: var(--accent-positive);
}
.award-steal-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.86 0.18 145);
  margin: 0 0 12px;
}
.award-steal-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
}
.award-steal-glyph {
  width: 44px; height: 44px;
  border-radius: 12px;
  display: grid; place-items: center;
  background: oklch(0.65 0.20 25 / 0.20);
  color: oklch(0.82 0.20 25);
  flex-shrink: 0;
}
.award-steal-text { min-width: 0; }
.award-steal-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.4rem, 2.6vw, 1.9rem);
  line-height: 1.0;
  letter-spacing: -0.008em;
  color: var(--ink-1);
  margin: 0;
}
.award-steal-meta {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.dot { color: var(--ink-4); }
.award-pos-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-weight: 800;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
}
.award-pos-pill-qb {
  background: oklch(0.65 0.20 25 / 0.20);
  color: oklch(0.82 0.20 25);
}
.award-pos-pill-wr {
  background: oklch(0.68 0.18 245 / 0.22);
  color: oklch(0.82 0.18 245);
}
.award-steal-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(3.5rem, 8vw, 5rem);
  line-height: 0.86;
  letter-spacing: -0.025em;
  color: oklch(0.84 0.18 145);
  margin: 4px 0 12px;
  font-variant-numeric: tabular-nums;
}
.award-steal-body {
  font-size: 0.96rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0 0 16px;
  max-width: 44ch;
}
.award-steal-by, .award-bust .award-steal-by {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.award-by-avatar {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.76rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.award-by-label {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-2);
}

/* Bust (bottom-right, smaller) */
.award-bust {
  position: relative;
  padding: 20px 22px 22px;
  border-radius: 18px;
  background: oklch(0.70 0.27 350 / 0.06);
  border: 1px solid oklch(0.70 0.27 350 / 0.25);
  cursor: pointer;
  overflow: hidden;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
}
.award-bust-tape {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 7px;
  background-image: repeating-linear-gradient(
    -45deg,
    oklch(0.78 0.18 92) 0 12px,
    oklch(0.16 0.018 90) 12px 24px
  );
}
.award-bust-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-secondary);
  margin: 12px 0 12px;
}
.award-bust-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(1.1rem, 2.0vw, 1.6rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 0;
}
.award-bust-meta {
  margin: 4px 0 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.award-bust-value {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: clamp(2.4rem, 5vw, 3rem);
  line-height: 0.86;
  letter-spacing: -0.025em;
  color: oklch(0.78 0.22 350);
  margin: 8px 0 10px;
  font-variant-numeric: tabular-nums;
}
.award-bust-body {
  font-size: 0.92rem;
  line-height: 1.5;
  color: var(--ink-2);
  margin: 0 0 14px;
  max-width: 38ch;
}

@media (max-width: 920px) {
  .award-best { grid-template-columns: 80px 1fr; gap: 18px; padding: 20px 22px; }
  .award-best-grade { display: none; }
  .award-best-portrait, .award-best-avatar { width: 80px; height: 80px; }
}
@media (max-width: 720px) {
  .awards-grid { grid-template-columns: 1fr; }
}

/* ─── 3. STANDINGS PODIUM ────────────────────────────────────── */
.standings-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 18px;
}
.podium {
  display: grid;
  grid-template-columns: 0.9fr 1.05fr 0.85fr;
  gap: 16px;
  align-items: end;
  margin-bottom: 18px;
}
.podium-card {
  position: relative;
  border-radius: 16px;
  padding: 22px;
  cursor: pointer;
  text-align: left;
  transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1), border-color 180ms cubic-bezier(0.22, 1, 0.36, 1);
  border: 1px solid oklch(0.20 0.015 90);
  background: oklch(0.11 0.015 90);
}
@media (prefers-reduced-motion: no-preference) {
  .podium-card:hover { transform: translateY(-2px); }
}
.podium-card:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.podium-card:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.podium-card.is-my-team { border-color: oklch(0.78 0.18 92 / 0.55); }
.podium-medal {
  display: inline-grid;
  place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.92rem;
  letter-spacing: -0.005em;
  width: 28px; height: 28px;
  border-radius: 999px;
  margin-bottom: 14px;
}
.podium-medal-gold {
  background: oklch(0.78 0.18 92 / 0.20);
  color: oklch(0.92 0.18 92);
  border: 1px solid oklch(0.78 0.18 92 / 0.45);
}
.podium-medal-silver {
  background: oklch(0.78 0.008 90 / 0.18);
  color: oklch(0.92 0.008 90);
  border: 1px solid oklch(0.78 0.008 90 / 0.40);
}
.podium-medal-bronze {
  background: oklch(0.62 0.10 60 / 0.18);
  color: oklch(0.80 0.12 60);
  border: 1px solid oklch(0.62 0.10 60 / 0.40);
}
.podium-avatar {
  border-radius: 16px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
  margin-bottom: 14px;
  box-shadow: 0 12px 32px -10px oklch(0 0 0 / 0.55);
}
.podium-avatar-gold { width: 72px; height: 72px; }
.podium-avatar-silver { width: 64px; height: 64px; }
.podium-avatar-bronze { width: 56px; height: 56px; }

.podium-gold {
  background:
    radial-gradient(ellipse 80% 90% at 20% 0%, oklch(0.78 0.18 92 / 0.10), transparent 65%),
    oklch(0.12 0.015 90);
  border-color: oklch(0.78 0.18 92 / 0.32);
  padding: 30px 26px;
}
.podium-silver {
  background:
    radial-gradient(ellipse 80% 90% at 20% 0%, oklch(0.78 0.008 90 / 0.06), transparent 65%),
    oklch(0.11 0.015 90);
  border-color: oklch(0.78 0.008 90 / 0.20);
}
.podium-bronze {
  background:
    radial-gradient(ellipse 80% 90% at 20% 0%, oklch(0.62 0.10 60 / 0.06), transparent 65%),
    oklch(0.11 0.015 90);
  border-color: oklch(0.62 0.10 60 / 0.22);
}

.podium-team-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.15rem;
  line-height: 1.0;
  color: var(--ink-1);
  margin: 0 0 4px;
}
.podium-team-name-large { font-size: 1.4rem; }
.podium-team-owner {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 14px;
}
.podium-grade {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  line-height: 0.86;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  margin: 0 0 14px;
}
.podium-grade-gold {
  font-size: clamp(3.5rem, 7vw, 5rem);
  color: oklch(0.92 0.18 92);
  filter: drop-shadow(0 0 24px oklch(0.78 0.18 92 / 0.45));
}
.podium-grade-silver {
  font-size: clamp(2.8rem, 5.5vw, 4rem);
  color: oklch(0.92 0.008 90);
}
.podium-grade-bronze {
  font-size: clamp(2.4rem, 4.5vw, 3.4rem);
  color: oklch(0.80 0.12 60);
}
.podium-stats {
  margin: 0 0 12px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-2);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.podium-stat-pos { color: var(--accent-positive); }
.podium-stat-neg { color: var(--accent-secondary); }
.podium-editorial {
  font-size: 0.9rem;
  line-height: 1.55;
  color: var(--ink-2);
  margin: 0;
  max-width: 40ch;
}

/* Visual ordering: silver | gold | bronze (gold tallest in middle) */
.podium > :nth-child(1) { order: 1; }
.podium > :nth-child(2) { order: 2; }
.podium > :nth-child(3) { order: 3; }

@media (max-width: 880px) {
  .podium {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .podium > :nth-child(1) { order: 2; }
  .podium > :nth-child(2) { order: 1; }
  .podium > :nth-child(3) { order: 3; }
}

/* Rows 4-10 */
.rest {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rest-row {
  display: grid;
  grid-template-columns: 24px 36px minmax(0, 1fr) 48px auto;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  background: oklch(0.11 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
  cursor: pointer;
  transition: background 160ms cubic-bezier(0.22, 1, 0.36, 1), border-color 160ms cubic-bezier(0.22, 1, 0.36, 1);
}
.rest-row:hover { background: oklch(0.14 0.015 90); border-color: oklch(0.26 0.015 90); }
.rest-row:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.rest-row:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; }
.rest-row.is-my-team {
  border-color: oklch(0.78 0.18 92 / 0.50);
  background: oklch(0.78 0.18 92 / 0.05);
}
.rest-rank {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  color: var(--ink-3);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.rest-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.rest-text { min-width: 0; }
.rest-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.98rem;
  color: var(--ink-1);
  margin: 0;
}
.rest-owner {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 1px 0 0;
}
.rest-grade {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.rest-grade-aplus { color: oklch(0.92 0.18 92); }
.rest-grade-a     { color: oklch(0.86 0.16 145); }
.rest-grade-b     { color: oklch(0.86 0.10 195); }
.rest-grade-c     { color: oklch(0.78 0.18 50); }
.rest-grade-d     { color: oklch(0.78 0.22 350); }
.rest-stats {
  margin: 0;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-2);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.rest-stat-pos { color: var(--accent-positive); }
.rest-stat-neg { color: var(--accent-secondary); }
.rest-sep {
  width: 1px; height: 10px;
  background: var(--ink-5);
}

@media (max-width: 600px) {
  .rest-row { grid-template-columns: 20px 32px minmax(0, 1fr) auto; grid-template-rows: auto auto; }
  .rest-stats { grid-column: 2 / -1; grid-row: 2; }
}

/* ─── 4. THE BOARD ───────────────────────────────────────────── */
.board-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 0;
}
.board-scroll {
  overflow-x: auto;
  margin-top: 16px;
  scrollbar-width: thin;
}
.board-grid {
  display: grid;
  grid-template-columns: repeat(var(--team-count, 10), minmax(110px, 1fr));
  gap: 6px;
  min-width: 1100px;
}
.board-col-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 4px 12px;
  border-bottom: 1px solid oklch(0.18 0.015 90);
}
.board-col-head.is-my-team .board-col-name { color: var(--accent-primary); }
.board-col-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: grid; place-items: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.82rem;
  color: oklch(0.12 0.012 90);
  overflow: hidden;
}
.board-col-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.74rem;
  letter-spacing: 0.04em;
  color: var(--ink-2);
  text-align: center;
  max-width: 100px;
  line-height: 1.05;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.board-col-grade {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.82rem;
  letter-spacing: -0.01em;
}
.board-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 8px 7px;
  border-radius: 8px;
  border: 1px solid;
  cursor: pointer;
  text-align: left;
  color: var(--ink-1);
  font-family: 'Barlow', sans-serif;
  transition: transform 160ms cubic-bezier(0.22, 1, 0.36, 1);
  min-height: 70px;
}
@media (prefers-reduced-motion: no-preference) {
  .board-cell:hover { transform: translateY(-1px); }
}
.board-cell:active {
  transform: scale(0.99);
  transition-duration: 100ms;
}
.board-cell:focus-visible { outline: 2px solid var(--accent-primary); outline-offset: 2px; z-index: 1; }
.board-cell-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--ink-3);
}
.board-cell-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.84rem;
  line-height: 1.05;
  color: var(--ink-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.board-cell-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.board-cell-pos {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  padding: 2px 5px;
  border-radius: 4px;
}
.board-cell-val {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
}

/* ─── 5. ROUNDS ──────────────────────────────────────────────── */
.rounds-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 3.2vw, 2.25rem);
  line-height: 1.0;
  letter-spacing: -0.005em;
  color: var(--ink-1);
  margin: 6px 0 18px;
}
.rounds-list {
  list-style: none;
  padding: 0;
  margin: 0 0 28px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rounds-row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 92px;
  align-items: center;
  gap: 14px;
}
.rounds-chip {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  letter-spacing: -0.01em;
  color: var(--ink-2);
  text-align: center;
  padding: 6px 0;
  border-radius: 8px;
  background: oklch(0.13 0.015 90);
  border: 1px solid oklch(0.20 0.015 90);
}
.rounds-bar {
  position: relative;
  display: flex;
  align-items: stretch;
  height: 28px;
  border-radius: 6px;
  overflow: hidden;
  background: oklch(0.13 0.015 90);
  border: 1px solid oklch(0.18 0.015 90);
}
.rounds-bar-hits, .rounds-bar-neutral, .rounds-bar-misses {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 800;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}
.rounds-bar-hits {
  background: oklch(0.72 0.18 145 / 0.40);
  color: oklch(0.94 0.10 145);
}
.rounds-bar-neutral {
  background: transparent;
}
.rounds-bar-misses {
  background: oklch(0.70 0.27 350 / 0.40);
  color: oklch(0.94 0.10 350);
}
.rounds-avg {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 900;
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.005em;
  text-align: right;
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 6px;
}
.rounds-avg-label {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-3);
}

.rounds-pills-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin: 0 0 12px;
}
.rounds-pills {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.rounds-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}
.rounds-pill-pos { font-weight: 900; letter-spacing: 0.08em; }
.rounds-pill-sep { color: oklch(0.20 0.015 90); }
.rounds-pill-count, .rounds-pill-avg { color: inherit; }
</style>
