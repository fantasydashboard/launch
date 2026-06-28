<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Trajectory } from '@/league/powerTrajectory'

const props = withDefaults(defineProps<{ trajectory: Trajectory; height?: number }>(), { height: 360 })

const ME = '#5ec8e6' // cyan — matches the matchup win-prob chart
// Field palette: brand-muted, neighbours contrast, and clear of the reserved cyan
// (you) and lime (strength bars). Lines only need to be traceable — the endpoint
// logos carry identity, so colours stay quiet.
const PALETTE = ['#d68a4a', '#c879a6', '#6a93c4', '#5ea372', '#c9a84a', '#9b87c4', '#c4756f', '#4fa39a', '#c98a52', '#8f86c9', '#bd6f6f', '#b6a24a']

// ── Layout (fixed viewBox, scales to width) ────────────────────────────────────
const W = 1000
const H = computed(() => props.height)
const M = { top: 18, right: 52, bottom: 28, left: 30 }
const plotW = W - M.left - M.right
const plotH = computed(() => H.value - M.top - M.bottom)

const weeks = computed(() => props.trajectory.weeks)
const teamCount = computed(() => props.trajectory.teams.filter((t) => t.standings.length).length)

const xOf = (week: number) => {
  const ws = weeks.value
  if (ws.length <= 1) return M.left + plotW / 2
  const min = ws[0]
  const max = ws[ws.length - 1]
  return M.left + ((week - min) / (max - min)) * plotW
}
const yOf = (rank: number) => {
  const n = teamCount.value
  if (n <= 1) return M.top + plotH.value / 2
  return M.top + ((rank - 1) / (n - 1)) * plotH.value
}

const hovered = ref<string | null>(null)

interface Line {
  teamKey: string
  teamName: string
  isMe: boolean
  color: string
  width: number
  dash: string
  path: string
  end: { x: number; y: number; rank: number }
  logo?: string
}

// Corner-rounded path: straight segments, but each elbow is filleted with an arc
// (radius capped to half the shorter neighbouring segment, so it never overshoots
// past a real rank or bulges between weeks the way a bezier spline would). Soft
// look, honest data, crossings stay clean — they happen mid-segment, still straight.
const CORNER_R = 14
function roundedPath(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1]
    const d1 = Math.hypot(x1 - x0, y1 - y0), d2 = Math.hypot(x2 - x1, y2 - y1)
    if (d1 === 0 || d2 === 0) { d += ` L${x1.toFixed(1)},${y1.toFixed(1)}`; continue }
    const r1 = Math.min(CORNER_R, d1 / 2), r2 = Math.min(CORNER_R, d2 / 2)
    const ax = x1 - ((x1 - x0) / d1) * r1, ay = y1 - ((y1 - y0) / d1) * r1
    const bx = x1 + ((x2 - x1) / d2) * r2, by = y1 + ((y2 - y1) / d2) * r2
    d += ` L${ax.toFixed(1)},${ay.toFixed(1)} Q${x1.toFixed(1)},${y1.toFixed(1)} ${bx.toFixed(1)},${by.toFixed(1)}`
  }
  const last = pts[pts.length - 1]
  d += ` L${last[0].toFixed(1)},${last[1].toFixed(1)}`
  return d
}

const lines = computed<Line[]>(() => {
  const out: Line[] = []
  let ci = 0
  for (const t of props.trajectory.teams) {
    if (!t.standings.length) continue
    const color = t.isMe ? ME : PALETTE[ci % PALETTE.length]
    if (!t.isMe) ci++
    const pts = t.standings.map((p) => [xOf(p.week), yOf(p.rank)] as [number, number])
    const last = t.standings[t.standings.length - 1]
    out.push({
      teamKey: t.teamKey,
      teamName: t.teamName,
      isMe: t.isMe,
      color,
      width: t.isMe ? 3.5 : 1.75,
      dash: '',
      path: roundedPath(pts),
      end: { x: xOf(last.week), y: yOf(last.rank), rank: last.rank },
      logo: t.teamLogo,
    })
  }
  // Your talent (power-rank) line — dashed — once there's a real segment.
  const me = props.trajectory.teams.find((t) => t.isMe)
  if (me && props.trajectory.hasTalentHistory && me.talent.length >= 2) {
    const pts = me.talent.map((p) => [xOf(p.week), yOf(p.rank)] as [number, number])
    out.push({
      teamKey: `${me.teamKey}__talent`,
      teamName: `${me.teamName} · talent`,
      isMe: true,
      color: ME,
      width: 2,
      dash: '5 4',
      path: roundedPath(pts),
      end: { x: 0, y: 0, rank: 0 },
    })
  }
  return out
})

const ranks = computed(() => Array.from({ length: teamCount.value }, (_, i) => i + 1))
// Thin week labels if they'd crowd.
const weekStep = computed(() => (weeks.value.length > 14 ? 2 : 1))

// The you-standings line and your dashed talent line share a base key so hovering
// one keeps both lit.
const baseKey = (k: string) => (k.endsWith('__talent') ? k.slice(0, -'__talent'.length) : k)
const dimmed = (key: string) => hovered.value != null && baseKey(hovered.value) !== baseKey(key)
const initials = (name: string) => name.replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 1).toUpperCase() || '?'
// Yahoo team keys contain dots — sanitize for safe SVG id / url(#…) references.
const safeId = (key: string) => key.replace(/[^A-Za-z0-9_-]/g, '-')
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" :style="{ height: H + 'px' }" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Standings rank by week">
    <!-- gridlines + rank labels -->
    <g>
      <line v-for="r in ranks" :key="`g${r}`" :x1="M.left" :x2="M.left + plotW" :y1="yOf(r)" :y2="yOf(r)" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
      <text v-for="r in ranks" :key="`rl${r}`" :x="M.left - 8" :y="yOf(r) + 3" text-anchor="end" class="fill-dark-textMuted font-mono" font-size="11">{{ r }}</text>
    </g>

    <!-- week labels -->
    <text
      v-for="(w, i) in weeks"
      v-show="i % weekStep === 0 || i === weeks.length - 1"
      :key="`w${w}`"
      :x="xOf(w)"
      :y="H - 8"
      text-anchor="middle"
      class="fill-dark-textMuted font-mono"
      font-size="10"
    >Wk {{ w }}</text>

    <!-- lines -->
    <g>
      <path
        v-for="l in lines"
        :key="l.teamKey"
        :d="l.path"
        fill="none"
        :stroke="l.color"
        :stroke-width="l.width"
        :stroke-dasharray="l.dash || undefined"
        stroke-linejoin="round"
        stroke-linecap="round"
        :style="{ opacity: dimmed(l.teamKey) ? 0.12 : 1, transition: 'opacity 150ms ease' }"
        @mouseenter="hovered = l.teamKey"
        @mouseleave="hovered = null"
      />
    </g>

    <!-- endpoint logos (identity, replaces the legend) -->
    <g>
      <template v-for="l in lines.filter((x) => x.end.rank > 0)" :key="`e${l.teamKey}`">
        <defs>
          <clipPath :id="`clip-${safeId(l.teamKey)}`">
            <circle :cx="l.end.x + 22" :cy="l.end.y" r="11" />
          </clipPath>
        </defs>
        <g
          :style="{ opacity: dimmed(l.teamKey) ? 0.15 : 1, transition: 'opacity 150ms ease', cursor: 'default' }"
          @mouseenter="hovered = l.teamKey"
          @mouseleave="hovered = null"
        >
          <circle :cx="l.end.x + 22" :cy="l.end.y" r="12.5" :fill="l.isMe ? 'rgba(94,200,230,0.15)' : '#1a1f2b'" :stroke="l.color" :stroke-width="l.isMe ? 2 : 1.25" />
          <image
            v-if="l.logo"
            :href="l.logo"
            :x="l.end.x + 22 - 11"
            :y="l.end.y - 11"
            width="22"
            height="22"
            :clip-path="`url(#clip-${safeId(l.teamKey)})`"
            preserveAspectRatio="xMidYMid slice"
          />
          <text v-else :x="l.end.x + 22" :y="l.end.y + 4" text-anchor="middle" class="font-mono" font-size="11" :fill="l.color">{{ initials(l.teamName) }}</text>
          <title>{{ l.teamName }} · #{{ l.end.rank }}</title>
        </g>
      </template>
    </g>
  </svg>
</template>
