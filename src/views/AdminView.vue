<template>
  <div class="admin-root">

    <!-- ── Header ── -->
    <div class="admin-header">
      <div class="admin-header-left">
        <div class="admin-badge">⚙️ ADMIN</div>
        <div>
          <h1 class="admin-title">Command Center</h1>
          <p class="admin-sub">ultimatefantasydashboard.com · internal analytics</p>
        </div>
      </div>
      <div class="admin-header-right">
        <!-- Time Range Filter -->
        <div class="time-filter">
          <button v-for="tf in TIME_FILTERS" :key="tf.key"
            @click="setTimeFilter(tf.key)"
            :class="['tf-btn', activeFilter === tf.key ? 'tf-btn-active' : '']">
            {{ tf.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Access Denied ── -->
    <div v-if="!isAdmin" class="access-denied">
      <div class="ad-icon">🔒</div>
      <h2>Admin Access Required</h2>
      <p>This page is only accessible to administrators.</p>
    </div>

    <template v-else>

      <!-- ── Loading Overlay ── -->
      <div v-if="isLoading" class="admin-loading">
        <div class="spinner"></div>
        <span>Loading data…</span>
      </div>

      <!-- ── Error Banner ── -->
      <div v-if="apiError" class="error-banner">
        ⚠️ {{ apiError }}
        <button @click="apiError = null" class="error-close">×</button>
      </div>

      <!-- ══════════════════════════════════════
           KPI CARDS
      ══════════════════════════════════════ -->
      <section class="section">
        <div class="section-label">📊 Key Metrics
          <span class="filter-badge">{{ activeFilterLabel }}</span>
        </div>
        <div class="kpi-grid">
          <div class="kpi-card kpi-accent-cyan">
            <div class="kpi-icon">👤</div>
            <div class="kpi-val">{{ fmt(kpis.totalUsers) }}</div>
            <div class="kpi-label">Total Users</div>
            <div v-if="activeFilter !== 'all'" class="kpi-new">+{{ fmt(kpis.newUsers) }} new</div>
          </div>
          <div class="kpi-card kpi-accent-gold">
            <div class="kpi-icon">🎟️</div>
            <div class="kpi-val">{{ fmt(kpis.activePasses) }}</div>
            <div class="kpi-label">Active League Passes</div>
            <div class="kpi-sub">{{ fmt(kpis.activePassUsers) }} unique users</div>
          </div>
          <div class="kpi-card kpi-accent-red">
            <div class="kpi-icon">🔓</div>
            <div class="kpi-val">{{ fmt(kpis.noPassUsers) }}</div>
            <div class="kpi-label">Users — No Pass</div>
            <div class="kpi-sub">{{ noPassPct }}% of total</div>
          </div>
          <div class="kpi-card kpi-accent-orange">
            <div class="kpi-icon">⏰</div>
            <div class="kpi-val">{{ fmt(kpis.expiringUsers) }}</div>
            <div class="kpi-label">Expiring ≤ 30 Days</div>
            <div class="kpi-sub">{{ fmt(kpis.expiringPasses) }} passes</div>
          </div>
          <div class="kpi-card kpi-accent-green">
            <div class="kpi-icon">📋</div>
            <div class="kpi-val">{{ fmt(kpis.totalPasses) }}</div>
            <div class="kpi-label">Total Passes (All Time)</div>
            <div v-if="activeFilter !== 'all'" class="kpi-new">+{{ fmt(kpis.newPasses) }} new</div>
          </div>
          <div class="kpi-card kpi-accent-purple">
            <div class="kpi-icon">⭐</div>
            <div class="kpi-val">{{ fmt(kpis.multiPassUsers) }}</div>
            <div class="kpi-label">Users with 2+ Passes</div>
            <div class="kpi-sub">multi-league customers</div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════
           CHARTS
      ══════════════════════════════════════ -->
      <section class="section">
        <div class="section-label">📈 Trends
          <span class="filter-badge">{{ activeFilterLabel }}</span>
        </div>
        <div class="charts-row">
          <!-- Signups chart -->
          <div class="chart-card">
            <div class="chart-title">New Signups</div>
            <apexchart v-if="signupSeries.length"
              type="area" height="200"
              :options="signupChartOpts"
              :series="signupSeries"
            />
            <div v-else class="chart-empty">No signup data for this period</div>
          </div>
          <!-- Passes chart -->
          <div class="chart-card">
            <div class="chart-title">New League Passes</div>
            <apexchart v-if="passSeries.length"
              type="bar" height="200"
              :options="passChartOpts"
              :series="passSeries"
            />
            <div v-else class="chart-empty">No pass data for this period</div>
          </div>
        </div>
      </section>

      <!-- ══════════════════════════════════════
           EMAIL SEGMENTS
      ══════════════════════════════════════ -->
      <section class="section">
        <div class="section-label">✉️ Email Segments</div>

        <!-- Segment tabs -->
        <div class="seg-tabs">
          <button v-for="seg in SEGMENTS" :key="seg.key"
            @click="activeSeg = seg.key; loadSegment(seg.key)"
            :class="['seg-tab', activeSeg === seg.key ? 'seg-tab-active' : '']">
            <span class="seg-tab-dot" :style="{ background: seg.color }"></span>
            {{ seg.label }}
            <span class="seg-count" v-if="segCounts[seg.key] !== undefined">
              {{ fmt(segCounts[seg.key]) }}
            </span>
          </button>

          <!-- Expiring days control (only for expiring segment) -->
          <div v-if="activeSeg === 'expiring'" class="expiring-ctrl">
            <label>Expiring within</label>
            <select v-model.number="expiringDays" @change="loadSegment('expiring')" class="admin-select">
              <option :value="7">7 days</option>
              <option :value="14">14 days</option>
              <option :value="30">30 days</option>
              <option :value="60">60 days</option>
              <option :value="90">90 days</option>
            </select>
          </div>
        </div>

        <!-- Segment description -->
        <div class="seg-desc" v-if="activeSeg">
          <span>{{ currentSegDesc }}</span>
        </div>

        <!-- Segment actions bar -->
        <div class="seg-actions" v-if="segRows.length > 0">
          <span class="seg-result-count">{{ segRows.length }} users</span>
          <button @click="copyEmails" class="btn-action btn-copy">
            <span v-if="copied">✓ Copied!</span>
            <span v-else>📋 Copy Emails</span>
          </button>
          <button @click="downloadCsv" class="btn-action btn-csv">⬇️ Download CSV</button>
          <input v-model="segSearch" class="seg-search" placeholder="🔍 Filter by name or email…" />
        </div>

        <!-- Segment table -->
        <div class="seg-table-wrap" v-if="!segLoading">
          <div v-if="segRows.length === 0 && activeSeg" class="seg-empty">
            No users in this segment.
          </div>
          <table v-else-if="segRows.length > 0" class="seg-table">
            <thead>
              <tr>
                <th @click="sortSeg('email')" class="sortable">
                  Email <span class="sort-arrow">{{ sortIcon('email') }}</span>
                </th>
                <th @click="sortSeg('name')" class="sortable">
                  Name <span class="sort-arrow">{{ sortIcon('name') }}</span>
                </th>
                <th @click="sortSeg('joined')" class="sortable">
                  Joined <span class="sort-arrow">{{ sortIcon('joined') }}</span>
                </th>
                <th v-if="activeSeg === 'active'" @click="sortSeg('passes')" class="sortable">
                  Passes <span class="sort-arrow">{{ sortIcon('passes') }}</span>
                </th>
                <th v-if="activeSeg === 'active'" @click="sortSeg('expires')" class="sortable">
                  Expires <span class="sort-arrow">{{ sortIcon('expires') }}</span>
                </th>
                <th v-if="activeSeg === 'nopass'">Tier</th>
                <th v-if="activeSeg === 'expiring'" @click="sortSeg('daysLeft')" class="sortable">
                  Days Left <span class="sort-arrow">{{ sortIcon('daysLeft') }}</span>
                </th>
                <th v-if="activeSeg === 'expiring'" @click="sortSeg('expires')" class="sortable">
                  Expires <span class="sort-arrow">{{ sortIcon('expires') }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in filteredSortedRows" :key="i" class="seg-row">
                <td class="td-email">{{ row.email }}</td>
                <td class="td-name">{{ row.name || '—' }}</td>
                <td class="td-date">{{ row.joined }}</td>
                <td v-if="activeSeg === 'active'" class="td-num">
                  <span class="pass-badge">{{ row.passes }}</span>
                </td>
                <td v-if="activeSeg === 'active'" class="td-date">{{ row.expires }}</td>
                <td v-if="activeSeg === 'nopass'">
                  <span class="tier-badge" :class="'tier-' + row.tier">{{ row.tier }}</span>
                </td>
                <td v-if="activeSeg === 'expiring'">
                  <span class="days-badge" :class="row.daysLeft <= 7 ? 'days-urgent' : 'days-soon'">
                    {{ row.daysLeft }}d
                  </span>
                </td>
                <td v-if="activeSeg === 'expiring'" class="td-date">{{ row.expires }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="segRows.length > 0" class="table-footer">
            Showing {{ filteredSortedRows.length }} of {{ segRows.length }} results
          </div>
        </div>
        <div v-if="segLoading" class="seg-loading">
          <div class="spinner sm"></div> Loading…
        </div>
      </section>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { supabase } from '@/lib/supabase'
import VueApexCharts from 'vue3-apexcharts'

const apexchart = VueApexCharts

const authStore = useAuthStore()
const { isAdmin } = useFeatureAccess()

// ── Time filters ─────────────────────────────────────────────────────────────
const TIME_FILTERS = [
  { key: 'today',  label: 'Today',     days: 1   },
  { key: '7d',     label: '7 Days',    days: 7   },
  { key: '15d',    label: '15 Days',   days: 15  },
  { key: '30d',    label: '30 Days',   days: 30  },
  { key: '90d',    label: '90 Days',   days: 90  },
  { key: '1yr',    label: '1 Year',    days: 365 },
  { key: 'all',    label: 'All Time',  days: null },
]
const activeFilter = ref('30d')
const activeFilterLabel = computed(() => TIME_FILTERS.find(f => f.key === activeFilter.value)?.label || '')

function setTimeFilter(key: string) {
  activeFilter.value = key
  loadStats()
}

function getFromDate(key: string): string | null {
  const tf = TIME_FILTERS.find(f => f.key === key)
  if (!tf || !tf.days) return null
  const d = new Date()
  d.setDate(d.getDate() - tf.days)
  return d.toISOString()
}

// ── Segments ──────────────────────────────────────────────────────────────────
const SEGMENTS = [
  { key: 'active',   label: 'Active Pass Holders', color: '#22c55e' },
  { key: 'nopass',   label: 'No League Pass',       color: '#ef4444' },
  { key: 'expiring', label: 'Expiring Soon',         color: '#f97316' },
]
const SEGMENT_DESC: Record<string, string> = {
  active:   'Users who currently have at least one active, non-expired league pass.',
  nopass:   'Users who have created an account but have never purchased a league pass.',
  expiring: 'Users whose league pass expires within the selected window.',
}
const activeSeg = ref<string>('')
const currentSegDesc = computed(() => SEGMENT_DESC[activeSeg.value] || '')
const expiringDays = ref(30)

// ── State ─────────────────────────────────────────────────────────────────────
const isLoading = ref(false)
const segLoading = ref(false)
const apiError = ref<string | null>(null)
const copied = ref(false)
const segSearch = ref('')

const kpis = ref({
  totalUsers: 0, newUsers: 0,
  totalPasses: 0, newPasses: 0,
  activePasses: 0, activePassUsers: 0,
  noPassUsers: 0,
  expiringPasses: 0, expiringUsers: 0,
  multiPassUsers: 0,
})
const signupsByDay = ref<{date:string,count:number}[]>([])
const passesByDay = ref<{date:string,count:number}[]>([])
const segRows = ref<any[]>([])
const segCounts = ref<Record<string, number>>({})

// Sort state
const sortCol = ref('joined')
const sortDir = ref<'asc'|'desc'>('desc')

const noPassPct = computed(() => {
  if (!kpis.value.totalUsers) return '0'
  return ((kpis.value.noPassUsers / kpis.value.totalUsers) * 100).toFixed(0)
})

// ── API call helper ───────────────────────────────────────────────────────────
async function callAdmin(body: object) {
  const session = await supabase?.auth.getSession()
  const token = session?.data?.session?.access_token
  if (!token) throw new Error('Not authenticated')

  const res = await fetch('/api/admin/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
  return json
}

// ── Load stats ────────────────────────────────────────────────────────────────
async function loadStats() {
  if (!isAdmin.value) return
  isLoading.value = true
  apiError.value = null
  try {
    const data = await callAdmin({
      action: 'stats',
      from_date: getFromDate(activeFilter.value),
      expiring_days: expiringDays.value,
    })
    kpis.value = data.kpis
    signupsByDay.value = data.charts.signupsByDay
    passesByDay.value = data.charts.passesByDay
  } catch (e: any) {
    apiError.value = e.message
  } finally {
    isLoading.value = false
  }
}

// ── Load email segment ────────────────────────────────────────────────────────
async function loadSegment(seg: string) {
  if (!isAdmin.value) return
  segLoading.value = true
  segSearch.value = ''
  sortCol.value = seg === 'expiring' ? 'daysLeft' : 'joined'
  sortDir.value = seg === 'expiring' ? 'asc' : 'desc'
  try {
    const data = await callAdmin({
      action: 'emails',
      segment: seg,
      expiring_days: expiringDays.value,
    })
    segRows.value = data.rows
    segCounts.value = { ...segCounts.value, [seg]: data.rows.length }
  } catch (e: any) {
    apiError.value = e.message
  } finally {
    segLoading.value = false
  }
}

// ── Sorting & filtering ───────────────────────────────────────────────────────
function sortSeg(col: string) {
  if (sortCol.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCol.value = col
    sortDir.value = 'asc'
  }
}

function sortIcon(col: string) {
  if (sortCol.value !== col) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}

const filteredSortedRows = computed(() => {
  let rows = [...segRows.value]
  const q = segSearch.value.toLowerCase()
  if (q) rows = rows.filter(r => r.email?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q))

  rows.sort((a, b) => {
    const av = a[sortCol.value] ?? ''
    const bv = b[sortCol.value] ?? ''
    let cmp = 0
    if (typeof av === 'number') cmp = av - bv
    else cmp = String(av).localeCompare(String(bv))
    return sortDir.value === 'asc' ? cmp : -cmp
  })
  return rows
})

// ── Copy emails ───────────────────────────────────────────────────────────────
function copyEmails() {
  const emails = filteredSortedRows.value.map(r => r.email).join('\n')
  navigator.clipboard.writeText(emails).then(() => {
    copied.value = true
    setTimeout(() => { copied.value = false }, 2200)
  })
}

// ── Download CSV ──────────────────────────────────────────────────────────────
function downloadCsv() {
  const rows = filteredSortedRows.value
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ufd-${activeSeg.value}-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Chart data ────────────────────────────────────────────────────────────────
const signupSeries = computed(() => {
  if (!signupsByDay.value.length) return []
  return [{ name: 'New Signups', data: signupsByDay.value.map(d => ({ x: d.date, y: d.count })) }]
})

const passSeries = computed(() => {
  if (!passesByDay.value.length) return []
  return [{ name: 'New Passes', data: passesByDay.value.map(d => ({ x: d.date, y: d.count })) }]
})

const baseChartOpts = {
  chart: { background: 'transparent', toolbar: { show: false }, sparkline: { enabled: false } },
  grid: { borderColor: '#1e2130', strokeDashArray: 3 },
  xaxis: {
    type: 'datetime',
    labels: { style: { colors: '#4b5563', fontSize: '10px' }, datetimeUTC: false },
    axisBorder: { show: false }, axisTicks: { show: false }
  },
  yaxis: { labels: { style: { colors: '#4b5563', fontSize: '10px' } }, min: 0 },
  tooltip: { theme: 'dark', x: { format: 'MMM d, yyyy' } },
  dataLabels: { enabled: false },
}

const signupChartOpts = computed(() => ({
  ...baseChartOpts,
  colors: ['#06b6d4'],
  fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] } },
  stroke: { curve: 'smooth', width: 2 },
}))

const passChartOpts = computed(() => ({
  ...baseChartOpts,
  colors: ['#eab308'],
  plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
  fill: { opacity: 0.85 },
}))

// ── Formatting ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return (n || 0).toLocaleString()
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  await authStore.initialize?.()
  await loadStats()
})
</script>

<style scoped>
*, *::before, *::after { box-sizing: border-box; }

.admin-root {
  min-height: 100vh;
  background: #05060a;
  color: #f7f7ff;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  padding-bottom: 80px;
}

/* ── Header ── */
.admin-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
  padding: 24px 32px;
  border-bottom: 1px solid #1e2130;
  background: linear-gradient(180deg, #0a0c14, #05060a);
  position: sticky; top: 0; z-index: 20;
  backdrop-filter: blur(12px);
}
.admin-header-left { display: flex; align-items: center; gap: 14px; }
.admin-badge {
  font-size: 11px; font-weight: 800; letter-spacing: 0.15em;
  background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.35);
  color: #eab308; padding: 5px 12px; border-radius: 6px;
}
.admin-title { font-size: 20px; font-weight: 900; margin: 0; letter-spacing: -0.02em; }
.admin-sub { font-size: 11px; color: #4b5563; margin: 2px 0 0; }

/* Time filter */
.time-filter { display: flex; gap: 4px; flex-wrap: wrap; }
.tf-btn {
  padding: 6px 12px; border-radius: 6px; border: 1px solid #262a3a;
  background: #0a0c14; color: #6b7280; font-size: 12px; font-weight: 600; cursor: pointer;
  transition: all 0.12s;
}
.tf-btn:hover { border-color: #374151; color: #9ca3af; }
.tf-btn-active {
  border-color: #eab308; background: rgba(234,179,8,0.1);
  color: #eab308; font-weight: 700;
}

/* ── Sections ── */
.section { padding: 28px 32px 0; }
.section-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase;
  color: #4b5563; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;
}
.filter-badge {
  font-size: 10px; padding: 2px 8px; border-radius: 4px;
  background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.25); color: #eab308;
  letter-spacing: 0.05em;
}

/* ── KPI Cards ── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
}
.kpi-card {
  background: #11131a; border: 1px solid #1e2130; border-radius: 12px;
  padding: 18px 20px; position: relative; overflow: hidden;
  transition: border-color 0.2s;
}
.kpi-card:hover { border-color: #374151; }
.kpi-icon { font-size: 20px; margin-bottom: 10px; }
.kpi-val { font-size: 32px; font-weight: 900; letter-spacing: -0.03em; margin-bottom: 4px; }
.kpi-label { font-size: 12px; font-weight: 600; color: #6b7280; }
.kpi-sub { font-size: 11px; color: #374151; margin-top: 4px; }
.kpi-new { font-size: 11px; margin-top: 4px; font-weight: 700; }

/* KPI accent colors */
.kpi-accent-cyan  { border-top: 3px solid #06b6d4; }
.kpi-accent-cyan  .kpi-val { color: #06b6d4; }
.kpi-accent-cyan  .kpi-new { color: #06b6d4; }
.kpi-accent-gold  { border-top: 3px solid #eab308; }
.kpi-accent-gold  .kpi-val { color: #eab308; }
.kpi-accent-gold  .kpi-new { color: #eab308; }
.kpi-accent-red   { border-top: 3px solid #ef4444; }
.kpi-accent-red   .kpi-val { color: #ef4444; }
.kpi-accent-orange{ border-top: 3px solid #f97316; }
.kpi-accent-orange .kpi-val { color: #f97316; }
.kpi-accent-green { border-top: 3px solid #22c55e; }
.kpi-accent-green .kpi-val { color: #22c55e; }
.kpi-accent-green .kpi-new { color: #22c55e; }
.kpi-accent-purple{ border-top: 3px solid #a78bfa; }
.kpi-accent-purple .kpi-val { color: #a78bfa; }

/* ── Charts ── */
.charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 768px) { .charts-row { grid-template-columns: 1fr; } }
.chart-card {
  background: #11131a; border: 1px solid #1e2130; border-radius: 12px; padding: 18px 20px;
}
.chart-title { font-size: 13px; font-weight: 700; color: #9ca3af; margin-bottom: 12px; }
.chart-empty { font-size: 12px; color: #374151; padding: 40px 0; text-align: center; }

/* ── Segment tabs ── */
.seg-tabs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.seg-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 16px; border-radius: 8px; border: 1px solid #262a3a;
  background: #0a0c14; color: #6b7280; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all 0.12s;
}
.seg-tab:hover { border-color: #374151; color: #9ca3af; }
.seg-tab-active { border-color: #374151; background: #11131a; color: #e5e7eb; }
.seg-tab-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.seg-count {
  font-size: 11px; font-weight: 700; background: #1e2130;
  padding: 1px 7px; border-radius: 10px; color: #9ca3af;
}

.expiring-ctrl {
  display: flex; align-items: center; gap: 8px; margin-left: 8px;
  font-size: 12px; color: #6b7280;
}
.admin-select {
  background: #0a0c14; border: 1px solid #262a3a; border-radius: 6px;
  color: #e5e7eb; font-size: 12px; padding: 5px 8px; outline: none; cursor: pointer;
}
.admin-select:focus { border-color: #eab308; }

.seg-desc { font-size: 12px; color: #4b5563; margin-bottom: 14px; padding: 0 2px; }

/* ── Segment actions ── */
.seg-actions {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-bottom: 14px;
}
.seg-result-count { font-size: 12px; color: #4b5563; margin-right: 4px; }
.btn-action {
  padding: 7px 14px; border-radius: 7px; border: none;
  font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.12s;
}
.btn-copy {
  background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.3);
  color: #06b6d4;
}
.btn-copy:hover { background: rgba(6,182,212,0.18); }
.btn-csv {
  background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3);
  color: #22c55e;
}
.btn-csv:hover { background: rgba(34,197,94,0.18); }
.seg-search {
  flex: 1; max-width: 280px;
  background: #0a0c14; border: 1px solid #262a3a; border-radius: 7px;
  color: #e5e7eb; font-size: 12px; padding: 7px 12px; outline: none;
  transition: border-color 0.15s;
}
.seg-search:focus { border-color: #374151; }

/* ── Segment table ── */
.seg-table-wrap {
  background: #11131a; border: 1px solid #1e2130; border-radius: 12px;
  overflow: hidden; margin-top: 4px;
}
.seg-table { width: 100%; border-collapse: collapse; }
.seg-table thead { background: rgba(255,255,255,0.025); }
.seg-table th {
  padding: 10px 16px; font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: #4b5563; text-align: left; white-space: nowrap;
  border-bottom: 1px solid #1e2130;
}
.seg-table th.sortable { cursor: pointer; user-select: none; }
.seg-table th.sortable:hover { color: #9ca3af; }
.sort-arrow { color: #374151; margin-left: 3px; }
.seg-row { border-bottom: 1px solid #1e2130; transition: background 0.1s; }
.seg-row:hover { background: rgba(255,255,255,0.025); }
.seg-row:last-child { border-bottom: none; }
.seg-table td { padding: 10px 16px; font-size: 13px; vertical-align: middle; }
.td-email { color: #e5e7eb; font-family: monospace; font-size: 12px; }
.td-name { color: #9ca3af; }
.td-date { color: #6b7280; font-size: 11px; white-space: nowrap; }
.td-num { text-align: center; }

.pass-badge {
  display: inline-block; background: rgba(234,179,8,0.12);
  border: 1px solid rgba(234,179,8,0.3); color: #eab308;
  padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;
}
.tier-badge {
  padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;
}
.tier-free   { background: rgba(75,85,99,0.2); color: #6b7280; }
.tier-pro    { background: rgba(6,182,212,0.12); color: #06b6d4; }
.tier-premium{ background: rgba(234,179,8,0.12); color: #eab308; }
.tier-admin  { background: rgba(167,139,250,0.12); color: #a78bfa; }
.days-badge {
  padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;
}
.days-urgent { background: rgba(239,68,68,0.15); color: #ef4444; }
.days-soon   { background: rgba(249,115,22,0.12); color: #f97316; }

.table-footer {
  padding: 10px 16px; font-size: 11px; color: #374151;
  border-top: 1px solid #1e2130; background: rgba(0,0,0,0.15);
}

/* ── Loading & errors ── */
.admin-loading {
  display: flex; align-items: center; gap: 10px; justify-content: center;
  padding: 48px; color: #6b7280; font-size: 14px;
}
.seg-loading { display: flex; align-items: center; gap: 8px; padding: 28px 0; color: #6b7280; font-size: 13px; }
.seg-empty { padding: 32px; text-align: center; color: #374151; font-size: 13px; }
.error-banner {
  margin: 16px 32px 0;
  padding: 12px 16px;
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 8px;
  color: #fca5a5; font-size: 13px; display: flex; justify-content: space-between; align-items: center;
}
.error-close {
  background: none; border: none; color: #fca5a5; cursor: pointer; font-size: 18px; padding: 0 4px;
}
.access-denied {
  text-align: center; padding: 80px 32px; color: #6b7280;
}
.ad-icon { font-size: 48px; margin-bottom: 16px; }

@keyframes spin { to { transform: rotate(360deg); } }
.spinner {
  width: 24px; height: 24px; border: 2px solid #1e2130; border-top-color: #eab308;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
.spinner.sm { width: 16px; height: 16px; }
</style>
