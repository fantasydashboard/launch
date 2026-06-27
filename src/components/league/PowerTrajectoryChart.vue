<script setup lang="ts">
import { computed } from 'vue'
import type { Trajectory } from '@/league/powerTrajectory'

const props = withDefaults(defineProps<{ trajectory: Trajectory; height?: number }>(), { height: 320 })

const ME = '#5ec8e6' // cyan — matches the matchup win-prob chart
// Muted, distinguishable palette for the rest of the field.
const PALETTE = ['#e69a4a', '#9b87f5', '#4ade80', '#f472b6', '#fbbf24', '#fb7185', '#34d399', '#c084fc', '#60a5fa', '#f87171', '#a3e635', '#22d3ee']

const teamCount = computed(() => props.trajectory.teams.length)

interface Built {
  series: { name: string; data: { x: number; y: number }[] }[]
  colors: string[]
  widths: number[]
  dashes: number[]
}

const built = computed<Built>(() => {
  const series: Built['series'] = []
  const colors: string[] = []
  const widths: number[] = []
  const dashes: number[] = []

  let ci = 0
  for (const t of props.trajectory.teams) {
    if (!t.standings.length) continue
    series.push({ name: t.teamName, data: t.standings.map((p) => ({ x: p.week, y: p.rank })) })
    colors.push(t.isMe ? ME : PALETTE[ci % PALETTE.length])
    widths.push(t.isMe ? 3.5 : 1.75)
    dashes.push(0)
    if (!t.isMe) ci++
  }

  // Overlay YOUR talent (power-rank) line — dashed — so the luck gap is visible.
  const me = props.trajectory.teams.find((t) => t.isMe)
  if (me && me.talent.length) {
    series.push({ name: `${me.teamName} · talent`, data: me.talent.map((p) => ({ x: p.week, y: p.rank })) })
    colors.push(ME)
    widths.push(2)
    dashes.push(5)
  }
  return { series, colors, widths, dashes }
})

const chartOptions = computed(() => ({
  chart: { type: 'line', background: 'transparent', toolbar: { show: false }, zoom: { enabled: false }, animations: { enabled: false }, fontFamily: 'inherit' },
  theme: { mode: 'dark' },
  colors: built.value.colors,
  stroke: { curve: 'straight', width: built.value.widths, dashArray: built.value.dashes },
  markers: { size: 0, hover: { size: 4 } },
  legend: { show: true, position: 'bottom', fontSize: '11px', labels: { colors: '#9ca3af' }, itemMargin: { horizontal: 6, vertical: 2 }, markers: { width: 8, height: 8 } },
  grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 3, padding: { left: 4, right: 8 } },
  xaxis: {
    type: 'numeric',
    tickAmount: Math.max(1, props.trajectory.weeks.length - 1),
    labels: { style: { colors: '#6b7280', fontSize: '10px' }, formatter: (v: number) => `Wk ${Math.round(v)}` },
    axisBorder: { show: false },
    axisTicks: { show: false },
    title: { text: undefined },
  },
  yaxis: {
    reversed: true, // rank 1 at the top
    min: 1,
    max: teamCount.value,
    tickAmount: Math.max(1, teamCount.value - 1),
    labels: { style: { colors: '#6b7280', fontSize: '10px' }, formatter: (v: number) => `${Math.round(v)}` },
  },
  tooltip: {
    theme: 'dark',
    shared: false,
    intersect: false,
    x: { formatter: (v: number) => `Week ${Math.round(v)}` },
    y: { formatter: (v: number) => `#${Math.round(v)}` },
  },
}))
</script>

<template>
  <div v-if="built.series.length">
    <apexchart type="line" :height="height" :options="chartOptions" :series="built.series" />
  </div>
</template>
