<script setup lang="ts">
import { computed } from 'vue'
import type { TrendPoint } from '@/myteam/winProbTrend'

const props = withDefaults(
  defineProps<{
    points: TrendPoint[] // captured actual readings (solid)
    projected: TrendPoint[] // flat tail to week end (dotted)
    meName: string
    oppName: string
    height?: number
  }>(),
  { height: 160 },
)

const ME = '#5ec8e6'
const OPP = '#e69a4a'

// Parse 'YYYY-MM-DD' to a local noon timestamp so the datetime axis labels the
// right calendar day regardless of timezone (UTC-midnight parsing can shift).
function ts(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d, 12).getTime()
}

const series = computed(() => [
  { name: `${props.meName} (actual)`, data: props.points.map((p) => ({ x: ts(p.date), y: p.my })) },
  { name: `${props.oppName} (actual)`, data: props.points.map((p) => ({ x: ts(p.date), y: p.opp })) },
  { name: `${props.meName} (projected)`, data: props.projected.map((p) => ({ x: ts(p.date), y: p.my })) },
  { name: `${props.oppName} (projected)`, data: props.projected.map((p) => ({ x: ts(p.date), y: p.opp })) },
])

const options = computed(() => ({
  chart: {
    type: 'line',
    height: props.height,
    background: 'transparent',
    toolbar: { show: false },
    zoom: { enabled: false },
    animations: { enabled: false },
    fontFamily: 'monospace',
  },
  colors: [ME, OPP, ME, OPP],
  stroke: { width: 2, curve: 'straight', dashArray: [0, 0, 5, 5] },
  markers: { size: [4, 4, 0, 0], strokeWidth: 0, hover: { sizeOffset: 2 } },
  dataLabels: { enabled: false },
  xaxis: {
    type: 'datetime',
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: '#9ca3af', fontSize: '9px' }, datetimeUTC: false, format: 'ddd' },
  },
  yaxis: {
    min: 0,
    max: 100,
    tickAmount: 2,
    labels: {
      style: { colors: '#9ca3af', fontSize: '9px' },
      formatter: (v: number) => `${Math.round(v)}%`,
    },
  },
  grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 3, padding: { left: 4, right: 8 } },
  legend: { show: false },
  tooltip: { theme: 'dark', x: { format: 'ddd MMM d' } },
  annotations: {
    yaxis: [{ y: 50, borderColor: 'rgba(255,255,255,0.18)', strokeDashArray: 4 }],
  },
}))
</script>

<template>
  <apexchart type="line" :height="height" :options="options" :series="series" />
</template>
