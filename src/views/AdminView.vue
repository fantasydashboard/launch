<template>
  <div class="admin-root">

    <!-- ── Header ── -->
    <div class="admin-header">
      <div class="admin-header-left">
        <div class="admin-badge">⚙️ ADMIN</div>
        <div>
          <h1 class="admin-title">Admin</h1>
          <p class="admin-sub">ultimatefantasydashboard.com · internal tools</p>
        </div>
      </div>
      <div class="admin-header-right">
        <!-- Time Range Filter — only on Metrics tab -->
        <div v-if="adminTab === 'metrics'" class="time-filter">
          <button v-for="tf in TIME_FILTERS" :key="tf.key"
            @click="setTimeFilter(tf.key)"
            :class="['tf-btn', activeFilter === tf.key ? 'tf-btn-active' : '']">
            {{ tf.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── Top Nav Tabs ── -->
    <div class="admin-tabs">
      <button @click="adminTab='metrics'" :class="['admin-tab', adminTab==='metrics'?'admin-tab-active':'']">
        <span class="admin-tab-icon">📊</span> Metrics
      </button>
      <button @click="adminTab='email'" :class="['admin-tab', adminTab==='email'?'admin-tab-active':'']">
        <span class="admin-tab-icon">✉️</span> Email
      </button>
      <button @click="adminTab='social'" :class="['admin-tab', adminTab==='social'?'admin-tab-active':'']">
        <span class="admin-tab-icon">📸</span> Social
      </button>
    </div>

    <!-- ── Access Denied ── -->
    <div v-if="!isAdmin" class="access-denied">
      <div class="ad-icon">🔒</div>
      <h2>Admin Access Required</h2>
      <p>This page is only accessible to administrators.</p>
      <p style="font-size:12px;color:#374151;margin-top:8px">
        isAdmin: {{ isAdmin }} · tier: {{ authStore.profile?.subscription_tier || 'not loaded' }}
      </p>
    </div>

    <!-- Show spinner while auth is still hydrating -->
    <div v-else-if="isLoading && kpis.totalUsers === 0" class="admin-loading">
      <div class="spinner"></div>
      <span>Loading admin data…</span>
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

      <!-- ══ METRICS TAB ══ -->
      <template v-if="adminTab === 'metrics'">
      <section class="section">
        <div class="section-label">📊 Key Metrics
          <span class="filter-badge">{{ activeFilterLabel }}</span>
        </div>
        <div class="kpi-grid">

          <!-- Total Users -->
          <div class="kpi-card kpi-accent-cyan kpi-clickable" @click="openKpiDetail('total_users')">
            <div class="kpi-icon">👤</div>
            <div class="kpi-val">{{ fmt(kpis.totalUsers) }}</div>
            <div class="kpi-label">Total Users</div>
            <div v-if="activeFilter !== 'all'" class="kpi-new">+{{ fmt(kpis.newUsers) }} new</div>
          </div>

          <!-- Free Trial (active, no pass) -->
          <div class="kpi-card kpi-accent-green kpi-clickable" @click="openKpiDetail('free_trial')">
            <div class="kpi-icon">⏳</div>
            <div class="kpi-val">{{ fmt(kpis.freeTrial) }}</div>
            <div class="kpi-label">Free Trial</div>
            <div class="kpi-sub">Active trial · no paid plan</div>
            <div v-if="activeFilter !== 'all'" class="kpi-new">+{{ fmt(kpis.newFreeTrial) }} new</div>
          </div>

          <!-- Total Passes -->
          <div class="kpi-card kpi-accent-gold kpi-clickable" @click="openKpiDetail('total_passes')">
            <div class="kpi-icon">🎟️</div>
            <div class="kpi-val">{{ fmt(kpis.totalPasses) }}</div>
            <div class="kpi-label">Total Passes</div>
            <div class="kpi-sub">All paid plans combined</div>
            <div v-if="activeFilter !== 'all'" class="kpi-new">+{{ fmt(kpis.newPasses) }} new</div>
          </div>

          <!-- Individual Monthly -->
          <div class="kpi-card kpi-accent-cyan kpi-clickable" @click="openKpiDetail('individual_monthly')">
            <div class="kpi-icon">📅</div>
            <div class="kpi-val">{{ fmt(kpis.individualMonthly) }}</div>
            <div class="kpi-label">Individual — Monthly</div>
            <div class="kpi-sub">Active subscriptions</div>
            <div v-if="activeFilter !== 'all'" class="kpi-new">+{{ fmt(kpis.newIndividualMonthly) }} new</div>
          </div>

          <!-- Individual Annual -->
          <div class="kpi-card kpi-accent-purple kpi-clickable" @click="openKpiDetail('individual_annual')">
            <div class="kpi-icon">📆</div>
            <div class="kpi-val">{{ fmt(kpis.individualAnnual) }}</div>
            <div class="kpi-label">Individual — Annual</div>
            <div class="kpi-sub">Active subscriptions</div>
            <div v-if="activeFilter !== 'all'" class="kpi-new">+{{ fmt(kpis.newIndividualAnnual) }} new</div>
          </div>

          <!-- League Passes -->
          <div class="kpi-card kpi-accent-orange kpi-clickable" @click="openKpiDetail('league_passes')">
            <div class="kpi-icon">🏆</div>
            <div class="kpi-val">{{ fmt(kpis.leaguePasses) }}</div>
            <div class="kpi-label">League Passes</div>
            <div class="kpi-sub">Active league passes</div>
            <div v-if="activeFilter !== 'all'" class="kpi-new">+{{ fmt(kpis.newLeaguePasses) }} new</div>
          </div>

          <!-- Expired (trial done, no pass) -->
          <div class="kpi-card kpi-accent-red kpi-clickable" @click="openKpiDetail('expired')">
            <div class="kpi-icon">🔒</div>
            <div class="kpi-val">{{ fmt(kpis.expired) }}</div>
            <div class="kpi-label">Expired</div>
            <div class="kpi-sub">Trial ended · no paid plan</div>
          </div>

        </div>
      </section>

      <!-- KPI Detail Modal rendered at root level below -->

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
            <div class="chart-title">New Users</div>
            <apexchart v-if="signupSeries.length"
              type="area" height="200"
              :options="signupChartOpts"
              :series="signupSeries"
            />
            <div v-else class="chart-empty">No signup data for this period</div>
          </div>
          <!-- Passes chart -->
          <div class="chart-card">
            <div class="chart-title">New Passes</div>
            <apexchart v-if="passSeries.length"
              type="bar" height="200"
              :options="passChartOpts"
              :series="passSeries"
            />
            <div v-else class="chart-empty">No pass data for this period</div>
          </div>
        </div>
      </section>

      </template><!-- end metrics tab -->

      <!-- ══ EMAIL TAB ══ -->
      <template v-if="adminTab === 'email'">

      <!-- EMAIL SEGMENTS -->
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

      <!-- ══════════════════════════════════════
           EMAIL CAMPAIGNS
      ══════════════════════════════════════ -->
      <section class="section">
        <div class="section-label">📧 Email Campaigns</div>

        <!-- Campaign builder tabs -->
        <div class="seg-tabs" style="margin-bottom:20px">
          <button @click="activeCampaign='nopass'"
            :class="['seg-tab', activeCampaign==='nopass'?'seg-tab-active':'']">
            <span class="seg-tab-dot" style="background:#ef4444"></span>
            No League Pass
            <span class="seg-count" v-if="campaignRecipients.length">{{ campaignRecipients.length }}</span>
          </button>
          <button @click="activeCampaign='active'"
            :class="['seg-tab', activeCampaign==='active'?'seg-tab-active':'']">
            <span class="seg-tab-dot" style="background:#22c55e"></span>
            Active Pass Holders
            <span class="seg-count" v-if="activeCampaign==='active' && campaignRecipients.length">{{ campaignRecipients.length }}</span>
          </button>
          <button @click="activeCampaign='expiring'"
            :class="['seg-tab', activeCampaign==='expiring'?'seg-tab-active':'']">
            <span class="seg-tab-dot" style="background:#f97316"></span>
            Expiring Soon
            <span class="seg-count" v-if="activeCampaign==='expiring' && campaignRecipients.length">{{ campaignRecipients.length }}</span>
          </button>
        </div>

        <!-- Controls -->
        <div class="campaign-controls-wrap">
          <div class="campaign-controls">
            <div class="ctrl-group">
              <label class="ctrl-label">Subject Line</label>
              <input v-model="emailSubject" class="ctrl-input" placeholder="Your league deserves better analytics" />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label">Overline Label (above headline)</label>
              <input v-model="emailOverline" class="ctrl-input" placeholder="e.g. THIS WEEK ONLY" />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label">Top Banner (optional — leave blank to hide)</label>
              <input v-model="emailBanner" class="ctrl-input" placeholder="e.g. ⚾ Fantasy baseball season is here. Week 1 power rankings..." />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label">Preview Text (shown in inbox)</label>
              <input v-model="emailPreview" class="ctrl-input" placeholder="Power rankings, win probability, draft grades — unlock everything." />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label">Hero Headline</label>
              <input v-model="emailHeadline" class="ctrl-input" placeholder="Your league deserves better analytics." />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label">Body (above image)</label>
              <textarea v-model="emailBody" class="ctrl-textarea" rows="3" placeholder="You connected your league — now unlock everything..."></textarea>
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label">Mid-Body Image URL <span style="font-weight:400;color:#6b7280">(optional — leave blank for no image)</span></label>
              <input v-model="emailImage" class="ctrl-input" placeholder="https://your-image-url.com/photo.jpg" />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label">Body (below image) <span style="font-weight:400;color:#6b7280">(optional)</span></label>
              <textarea v-model="emailBody2" class="ctrl-textarea" rows="3" placeholder="Leave blank if no second body block needed..."></textarea>
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label">CTA Button Text</label>
              <input v-model="emailCta" class="ctrl-input" placeholder="GET LEAGUE PASS →" />
            </div>
            <div class="ctrl-group">
              <label class="ctrl-label">CTA URL</label>
              <input v-model="emailCtaUrl" class="ctrl-input" placeholder="https://ultimatefantasydashboard.com/pricing" />
            </div>

            <!-- Recipient count -->
            <div class="campaign-recipients-info" v-if="campaignRecipients.length">
              <span class="recip-dot"></span>
              <span>{{ campaignRecipients.length }} recipients loaded</span>
              <button @click="loadCampaignRecipients" class="btn-reload">↺ Refresh</button>
            </div>
            <div class="campaign-recipients-info warn" v-else>
              <span>⚠️ No recipients loaded</span>
              <button @click="loadCampaignRecipients" class="btn-reload">Load Recipients</button>
            </div>

            <!-- Action buttons -->
            <div class="campaign-actions">
              <button @click="copyEmailHtml" class="btn-action btn-copy" style="flex:1">
                <span v-if="htmlCopied">✓ HTML Copied!</span>
                <span v-else>📋 Copy HTML</span>
              </button>
              <button @click="downloadCampaignCsv" class="btn-action btn-csv" style="flex:1">⬇️ Download CSV</button>
              <button @click="sendCampaign(true)" class="btn-action btn-preview" style="flex:1">
                🔍 Preview Send
              </button>
              <button @click="sendCampaign(false)"
                :disabled="sending || !campaignRecipients.length"
                class="btn-action btn-send" style="flex:1">
                <span v-if="sending">⏳ Sending…</span>
                <span v-else>🚀 Send Campaign</span>
              </button>
            </div>

            <!-- Send result -->
            <div v-if="sendResult" class="send-result" :class="sendResult.error ? 'send-error' : 'send-success'">
              <span v-if="sendResult.preview">
                ✓ Preview OK · {{ sendResult.recipient_count }} recipients · Subject: "{{ sendResult.subject }}"
              </span>
              <span v-else-if="sendResult.error">⚠️ {{ sendResult.error }}</span>
              <span v-else>✓ Sent {{ sendResult.sent }} emails<span v-if="sendResult.failed"> · {{ sendResult.failed }} failed</span></span>
            </div>


          </div>
        </div>

        <!-- Full-width email preview below -->
        <div class="campaign-preview-wrap">
          <div class="preview-label">
            Live Preview
            <span class="preview-badge">{{ campaignRecipients.length || '—' }} recipients</span>
          </div>
          <div class="email-preview-frame">
            <iframe
              ref="previewFrame"
              :srcdoc="renderedEmailHtml"
              sandbox="allow-same-origin"
              class="email-iframe"
              title="Email preview"
            ></iframe>
          </div>
        </div>
      </section>

      </template><!-- end email tab -->

      <!-- ══════════════════════════════════════ SOCIAL TAB ══ -->
      <template v-if="adminTab === 'social'">
      <section class="section">
        <div class="section-label">📸 Social Templates</div>
        <div class="social-iframe-wrap">
          <iframe
            src="/socialtemplates?embed=true"
            class="social-iframe"
            title="Social Templates"
          ></iframe>
        </div>
      </section>
      </template><!-- end social tab -->

    </template>
  </div>
  <!-- ── KPI Detail Modal ── -->
  <Teleport to="body">
  <div v-if="kpiDetail.show"
    style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;"
    @click.self="kpiDetail.show = false">
    <div style="background:#0d0f18;border:1px solid #1e2130;border-radius:16px;width:100%;max-width:960px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,0.6);overflow:hidden;">

      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 24px;border-bottom:1px solid #1e2130;flex-shrink:0;flex-wrap:wrap;gap:12px;">
        <div>
          <div style="font-size:16px;font-weight:800;color:#fff;">{{ kpiDetail.title }}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">{{ kpiDetailFiltered.length }} users</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <input v-model="kpiDetail.search"
            style="padding:7px 14px;border-radius:8px;border:1px solid #374151;background:#11131a;color:#e5e7eb;font-size:13px;width:220px;"
            placeholder="🔍 Search name or email…" />
          <button @click="downloadKpiCsv"
            style="padding:8px 16px;background:#22c55e;color:#0a0c14;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">
            ⬇ Download CSV
          </button>
          <button @click="kpiDetail.show = false"
            style="width:30px;height:30px;border-radius:50%;border:1px solid #374151;background:rgba(255,255,255,0.05);color:#9ca3af;cursor:pointer;font-size:13px;">
            ✕
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="kpiDetail.loading" style="padding:48px;text-align:center;color:#6b7280;font-size:14px;">
        Loading…
      </div>

      <!-- Empty -->
      <div v-else-if="kpiDetailFiltered.length === 0" style="padding:48px;text-align:center;color:#4b5563;font-style:italic;font-size:14px;">
        No users in this group.
      </div>

      <!-- Table -->
      <div v-else style="overflow-y:auto;flex:1;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#0a0c14;border-bottom:1px solid #1e2130;">
              <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;position:sticky;top:0;background:#0a0c14;">Name</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;position:sticky;top:0;background:#0a0c14;">Email</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;position:sticky;top:0;background:#0a0c14;">Status</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;position:sticky;top:0;background:#0a0c14;">Joined</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;position:sticky;top:0;background:#0a0c14;">Trial Expires</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;position:sticky;top:0;background:#0a0c14;">Plan</th>
              <th style="padding:10px 16px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;position:sticky;top:0;background:#0a0c14;">Leagues</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in kpiDetailFiltered" :key="u.id"
              style="border-bottom:1px solid #0f1017;"
              onmouseover="this.style.background='rgba(255,255,255,0.02)'"
              onmouseout="this.style.background=''">
              <td style="padding:11px 16px;color:#fff;font-weight:600;">{{ u.full_name || '—' }}</td>
              <td style="padding:11px 16px;color:#9ca3af;">{{ u.email }}</td>
              <td style="padding:11px 16px;">
                <span :style="`display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${u.status_color || '#22c55e'}22;color:${u.status_color || '#22c55e'};border:1px solid ${u.status_color || '#22c55e'}44`">
                  {{ u.status }}
                </span>
              </td>
              <td style="padding:11px 16px;color:#6b7280;font-size:12px;">{{ u.joined }}</td>
              <td style="padding:11px 16px;color:#6b7280;font-size:12px;">{{ u.trial_expires || '—' }}</td>
              <td style="padding:11px 16px;color:#9ca3af;font-size:12px;">{{ u.plan || '—' }}</td>
              <td style="padding:11px 16px;color:#6b7280;font-size:12px;text-align:center;">{{ u.league_count ?? '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  </div>
  </Teleport>

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
const adminTab = ref('metrics')
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
  freeTrial: 0, newFreeTrial: 0,
  totalPasses: 0, newPasses: 0,
  individualMonthly: 0, newIndividualMonthly: 0,
  individualAnnual: 0, newIndividualAnnual: 0,
  leaguePasses: 0, newLeaguePasses: 0,
  expired: 0,
  // legacy kept for charts
  activePasses: 0, activePassUsers: 0,
  noPassUsers: 0,
  expiringPasses: 0, expiringUsers: 0,
  multiPassUsers: 0,
})

// ── KPI Detail Modal state ────────────────────────────────────────────────────
const kpiDetail = ref({
  show: false,
  loading: false,
  title: '',
  type: '',
  rows: [] as any[],
  search: '',
})

const kpiDetailFiltered = computed(() => {
  const q = kpiDetail.value.search.toLowerCase()
  if (!q) return kpiDetail.value.rows
  return kpiDetail.value.rows.filter(u =>
    (u.full_name || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q)
  )
})

const KPI_TITLES: Record<string, string> = {
  total_users:        'All Users',
  free_trial:         'Free Trial — Active (No Paid Plan)',
  total_passes:       'All Paid Plans',
  individual_monthly: 'Individual — Monthly Subscribers',
  individual_annual:  'Individual — Annual Subscribers',
  league_passes:      'Active League Passes',
  expired:            'Expired Trial — No Paid Plan',
}

async function openKpiDetail(type: string) {
  kpiDetail.value = { show: true, loading: true, title: KPI_TITLES[type] || type, type, rows: [], search: '' }
  try {
    const data = await callAdmin({ action: 'kpi_detail', type })
    kpiDetail.value.rows = data.rows
  } catch (e: any) {
    apiError.value = e.message
    kpiDetail.value.show = false
  } finally {
    kpiDetail.value.loading = false
  }
}

function downloadKpiCsv() {
  const rows = kpiDetailFiltered.value
  if (!rows.length) return
  const headers = ['Name', 'Email', 'Status', 'Joined', 'Trial Expires', 'Plan', 'Leagues']
  const csvRows = [
    headers.join(','),
    ...rows.map(u => [
      `"${u.full_name || ''}"`,
      `"${u.email || ''}"`,
      `"${u.status || ''}"`,
      `"${u.joined || ''}"`,
      `"${u.trial_expires || ''}"`,
      `"${u.plan || ''}"`,
      u.league_count ?? '',
    ].join(','))
  ]
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `ufd_${kpiDetail.value.type}_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
}
const signupsByDay = ref<{date:string,count:number}[]>([])
const passesByDay = ref<{date:string,count:number}[]>([])
const passesByDayBreakdown = ref<{
  date: string
  individual_monthly: number
  individual_annual: number
  league_passes: number
}[]>([])
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
    passesByDayBreakdown.value = data.charts.passesByDayBreakdown || []
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

// ── Download CSV for campaign segment ────────────────────────────────────────
function downloadCampaignCsv() {
  const rows = campaignRecipients.value
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map((r: any) => headers.map((h: string) => JSON.stringify(r[h] ?? '')).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ufd-campaign-${activeCampaign.value}-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Chart data ────────────────────────────────────────────────────────────────
const signupSeries = computed(() => {
  if (!signupsByDay.value.length) return []
  return [{ name: 'New Users', data: signupsByDay.value.map(d => ({ x: d.date, y: d.count })) }]
})

const passSeries = computed(() => {
  // Use breakdown data if available, fall back to single series
  if (passesByDayBreakdown.value.length) {
    return [
      {
        name: 'Individual Monthly',
        data: passesByDayBreakdown.value.map(d => ({ x: d.date, y: d.individual_monthly || 0 }))
      },
      {
        name: 'Individual Annual',
        data: passesByDayBreakdown.value.map(d => ({ x: d.date, y: d.individual_annual || 0 }))
      },
      {
        name: 'League Passes',
        data: passesByDayBreakdown.value.map(d => ({ x: d.date, y: d.league_passes || 0 }))
      },
    ]
  }
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
  // Individual Monthly = cyan, Individual Annual = purple, League Passes = orange
  // Matching the KPI card accent colors above
  colors: ['#06b6d4', '#8b5cf6', '#f97316'],
  chart: {
    ...baseChartOpts.chart,
    stacked: true,
  },
  plotOptions: {
    bar: {
      borderRadius: 3,
      columnWidth: '60%',
      borderRadiusApplication: 'end',
    }
  },
  fill: { opacity: 0.9 },
  legend: {
    show: true,
    position: 'top',
    labels: { colors: '#9ca3af' },
    markers: { width: 8, height: 8, radius: 4 },
    fontSize: '11px',
    fontFamily: 'inherit',
    itemMargin: { horizontal: 8 },
  },
  tooltip: {
    ...baseChartOpts.tooltip,
    shared: true,
    intersect: false,
  },
}))

// ── Email Campaign ────────────────────────────────────────────────────────────
const activeCampaign = ref('nopass')
const emailSubject = ref("You're one step away from unlocking your league")
const emailPreview = ref('Power rankings, win probability, draft grades, league history — all waiting for you.')
const emailHeadline = ref("One step to keep your league talking all season.")
const emailBody = ref("You've already connected your league — the hard part is done. One League Pass unlocks power rankings, live win probability, draft grades, full league history, and shareable graphics for your entire league. Everything you need to keep the conversation going from draft day to the championship.")
const emailOverline = ref('THIS WEEK ONLY')
const emailBanner = ref('⚾ Fantasy baseball season is here. Week 1 power rankings are already cooking — be the first to drop them in your league chat.')
const emailImage = ref('')
const emailBody2 = ref('')
const emailCta = ref('UNLOCK YOUR LEAGUE →')
const emailCtaUrl = ref('https://ultimatefantasydashboard.com/pricing')
const campaignRecipients = ref<any[]>([])
const sending = ref(false)
const sendResult = ref<any>(null)
const htmlCopied = ref(false)
const previewFrame = ref<HTMLIFrameElement | null>(null)

// Load recipients for the active campaign segment
async function loadCampaignRecipients() {
  try {
    const data = await callAdmin({ action: 'emails', segment: activeCampaign.value, expiring_days: 30 })
    campaignRecipients.value = data.rows || []
  } catch (e: any) {
    apiError.value = e.message
  }
}

// Watch campaign tab changes
watch(activeCampaign, () => {
  campaignRecipients.value = []
  sendResult.value = null
  loadCampaignRecipients()
}, { immediate: true })

// Build the email HTML from current editor fields
const renderedEmailHtml = computed(() => {
  return buildEmailHtml({
    subject: emailSubject.value,
    previewText: emailPreview.value,
    overline: emailOverline.value,
    banner: emailBanner.value,
    headline: emailHeadline.value,
    body: emailBody.value,
    image: emailImage.value,
    body2: emailBody2.value,
    cta: emailCta.value,
    ctaUrl: emailCtaUrl.value,
  })
})

function buildEmailHtml({ subject, previewText, overline, banner, headline, body, image, body2, cta, ctaUrl }: {
  subject: string, previewText: string, overline: string, banner: string, headline: string, body: string, image: string, body2: string, cta: string, ctaUrl: string
}) {
  return `<!DOCTYPE html>
<html lang="en" style="background-color:#05060a !important;">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${subject}</title>
<style>
  :root { color-scheme: dark; }
  html, body {
    background-color: #05060a !important;
    background: #05060a !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  @media (prefers-color-scheme: dark) {
    html, body { background-color: #05060a !important; }
    table { background-color: #05060a !important; }
  }
  @media (prefers-color-scheme: light) {
    html, body { background-color: #05060a !important; }
    table { background-color: #05060a !important; }
  }


/* ── Clickable KPI cards ── */
.kpi-clickable { cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }
.kpi-clickable:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }


/* ── KPI Detail Modal ── */
.kpi-modal-backdrop {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.kpi-modal {
  background: #0d0f18; border: 1px solid #1e2130; border-radius: 16px;
  width: 100%; max-width: 900px; max-height: 80vh;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6);
  overflow: hidden;
}
.kpi-modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; gap: 12px; flex-wrap: wrap;
  border-bottom: 1px solid #1e2130; flex-shrink: 0;
}
.kpi-modal-title { font-size: 15px; font-weight: 800; color: #fff; }
.kpi-modal-count { font-size: 12px; color: #6b7280; margin-top: 2px; }
.kpi-modal-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.kpi-modal-search {
  padding: 6px 12px; border-radius: 8px; border: 1px solid #374151;
  background: #11131a; color: #e5e7eb; font-size: 12px; width: 200px;
}
.kpi-modal-search:focus { outline: none; border-color: #22c55e; }
.kpi-modal-close {
  width: 28px; height: 28px; border-radius: 50%; border: 1px solid #374151;
  background: rgba(255,255,255,0.05); color: #9ca3af; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 12px;
}
.kpi-modal-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.kpi-modal-loading { padding: 40px; text-align: center; color: #6b7280; }
.kpi-modal-empty { padding: 40px; text-align: center; color: #4b5563; font-style: italic; }
.kpi-modal-table-wrap { overflow-y: auto; flex: 1; }
.kpi-modal-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.kpi-modal-table th {
  position: sticky; top: 0; background: #0a0c14; padding: 10px 14px;
  text-align: left; font-size: 11px; font-weight: 700; color: #6b7280;
  letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #1e2130;
}
.kpi-modal-table td { padding: 10px 14px; border-bottom: 1px solid #11131a; }
.kpi-modal-table tr:hover td { background: rgba(255,255,255,0.02); }
.kpi-badge {
  display: inline-block; font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 20px; border: 1px solid;
  background: rgba(34,197,94,0.1); color: #22c55e; border-color: rgba(34,197,94,0.3);
}
</style>
</head>
<body bgcolor="#05060a" style="margin:0;padding:0;background-color:#05060a !important;background:#05060a !important;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#05060a;">${previewText}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#05060a" style="background-color:#05060a !important;background:#05060a !important;">
<tr><td align="center" bgcolor="#05060a" style="padding:24px 16px;background-color:#05060a !important;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr><td style="background-color:#0a0c14;border-radius:16px 16px 0 0;border:1px solid #1e2130;border-bottom:none;padding:20px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td><img src="https://ultimatefantasydashboard.com/UFD_V8.png" alt="Ultimate Fantasy Dashboard" width="160" height="auto" style="display:block;height:auto;max-height:52px;width:auto;max-width:160px;" /></td>
      <td align="right"><span style="font-size:11px;color:#374151;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">ultimatefantasydashboard.com</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:linear-gradient(90deg,#05060a,#eab308,#05060a);height:2px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- Optional banner strip -->
  ${banner ? `<tr><td style="background-color:#0f1a0f;border-left:1px solid #22c55e33;border-right:1px solid #22c55e33;border-top:1px solid #22c55e22;border-bottom:1px solid #22c55e22;padding:14px 28px;text-align:center;">
    <p style="margin:0;font-size:13px;line-height:1.5;color:#86efac;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${banner}</p>
  </td></tr>` : ''}

  <!-- Hero -->
  <tr><td style="background-color:#0a0c14;border-left:1px solid #1e2130;border-right:1px solid #1e2130;padding:44px 36px 36px;">
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#eab308;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${overline || 'Almost There'}</p>
    <h1 style="margin:0 0 18px;font-size:34px;font-weight:900;line-height:1.1;letter-spacing:-0.02em;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${headline}</h1>
    <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#9ca3af;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${body.replace(/\n/g, '<br>')}</p>
    ${image ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
      <tr><td style="border-radius:12px;overflow:hidden;line-height:0;">
        <img src="${image}" alt="" width="100%" style="display:block;width:100%;max-width:528px;height:auto;border-radius:12px;" />
      </td></tr>
    </table>` : ''}
    ${body2 ? `<p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#9ca3af;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${body2.replace(/\n/g, '<br>')}</p>` : ''}
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background-color:#eab308;border-radius:10px;">
        <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:800;letter-spacing:0.04em;text-decoration:none;color:#0a0c14;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${cta}</a>
      </td>
    </tr></table>
    <p style="margin:12px 0 0;font-size:12px;color:#374151;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">One flat fee · Unlocks your whole league · All season</p>
  </td></tr>

  <tr><td style="border-left:1px solid #1e2130;border-right:1px solid #1e2130;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#1e2130;height:1px;"></td></tr></table></td></tr>

  <!-- What unlocks -->
  <tr><td style="background-color:#0d0f18;border-left:1px solid #1e2130;border-right:1px solid #1e2130;padding:36px 36px 32px;">
    <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#4b5563;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">What you unlock</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Everything your league needs to stay engaged from week 1 through the championship.</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;"><tr>
      <td width="48%" style="background-color:#11131a;border:1px solid #1e2130;border-left:3px solid #eab308;border-radius:10px;padding:16px 18px;vertical-align:top;">
        <p style="margin:0 0 5px;font-size:18px;line-height:1;">⚡</p>
        <p style="margin:0 0 5px;font-size:13px;font-weight:800;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Power Rankings</p>
        <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Weekly scores that actually reflect who's playing well — not just who has the best record.</p>
      </td>
      <td width="4%"></td>
      <td width="48%" style="background-color:#11131a;border:1px solid #1e2130;border-left:3px solid #06b6d4;border-radius:10px;padding:16px 18px;vertical-align:top;">
        <p style="margin:0 0 5px;font-size:18px;line-height:1;">⚔️</p>
        <p style="margin:0 0 5px;font-size:13px;font-weight:800;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Win Probability</p>
        <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Live daily charts that show exactly how each matchup is trending. Post it and watch the chaos.</p>
      </td>
    </tr></table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;"><tr>
      <td width="48%" style="background-color:#11131a;border:1px solid #1e2130;border-left:3px solid #8b5cf6;border-radius:10px;padding:16px 18px;vertical-align:top;">
        <p style="margin:0 0 5px;font-size:18px;line-height:1;">📋</p>
        <p style="margin:0 0 5px;font-size:13px;font-weight:800;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Draft Grades</p>
        <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Letter grades for every pick, tracked all season. See who won the draft before the standings tell you.</p>
      </td>
      <td width="4%"></td>
      <td width="48%" style="background-color:#11131a;border:1px solid #1e2130;border-left:3px solid #22c55e;border-radius:10px;padding:16px 18px;vertical-align:top;">
        <p style="margin:0 0 5px;font-size:18px;line-height:1;">🏆</p>
        <p style="margin:0 0 5px;font-size:13px;font-weight:800;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">League History</p>
        <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Every season, every matchup, every champion. Your league's full story in one place.</p>
      </td>
    </tr></table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td width="48%" style="background-color:#11131a;border:1px solid #1e2130;border-left:3px solid #f97316;border-radius:10px;padding:16px 18px;vertical-align:top;">
        <p style="margin:0 0 5px;font-size:18px;line-height:1;">📸</p>
        <p style="margin:0 0 5px;font-size:13px;font-weight:800;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Share Graphics</p>
        <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Download and post power rankings, matchup results, and more to your group chat.</p>
      </td>
      <td width="4%"></td>
      <td width="48%" style="background-color:#11131a;border:1px solid #1e2130;border-left:3px solid #ec4899;border-radius:10px;padding:16px 18px;vertical-align:top;">
        <p style="margin:0 0 5px;font-size:18px;line-height:1;">🌐</p>
        <p style="margin:0 0 5px;font-size:13px;font-weight:800;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">All Platforms</p>
        <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Works with ESPN, Yahoo, and Sleeper. Points leagues, roto, and category leagues.</p>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="border-left:1px solid #1e2130;border-right:1px solid #1e2130;"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#1e2130;height:1px;"></td></tr></table></td></tr>

  <!-- Quote -->
  <tr><td style="background-color:#0a0c14;border-left:1px solid #1e2130;border-right:1px solid #1e2130;padding:32px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background-color:#0d1018;border:1px solid #1e2130;border-radius:12px;padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.12em;color:#4b5563;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">ROB · REDRAFT · YAHOO</p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#d1d5db;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">i have been commish for 7 years and this is the first tool that actually makes running the league fun 🙌</p>
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="background:rgba(234,179,8,0.08);border:1px solid rgba(234,179,8,0.2);border-radius:4px;padding:3px 10px;">
            <span style="font-size:11px;font-weight:700;color:#eab308;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Verified User</span>
          </td>
        </tr></table>
      </td>
    </tr></table>
  </td></tr>

  <!-- CTA repeat -->
  <tr><td style="background-color:#0f1118;border-left:1px solid #1e2130;border-right:1px solid #1e2130;padding:32px 36px;text-align:center;">
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:900;color:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Your league is one step away.</h2>
    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">One pass unlocks everything for your entire league, all season long.</p>
    <table cellpadding="0" cellspacing="0" border="0" align="center"><tr>
      <td style="background-color:#eab308;border-radius:10px;">
        <a href="${ctaUrl}" style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:800;letter-spacing:0.04em;text-decoration:none;color:#0a0c14;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">${cta}</a>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="background:linear-gradient(90deg,#05060a,#eab308,#05060a);height:2px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- Footer -->
  <tr><td style="background-color:#0a0c14;border-radius:0 0 16px 16px;border:1px solid #1e2130;border-top:none;padding:24px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td>
        <img src="https://ultimatefantasydashboard.com/UFD_V8.png" alt="UFD" width="80" height="auto" style="display:block;height:auto;max-height:28px;width:auto;margin-bottom:6px;" />
        <p style="margin:0;font-size:11px;color:#374151;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Built by fantasy managers, for fantasy managers.</p>
      </td>
      <td align="right" style="vertical-align:top;">
        <a href="https://ultimatefantasydashboard.com" style="font-size:11px;color:#374151;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Visit site</a>
        <span style="color:#374151;margin:0 6px;">·</span>
        <a href="{{unsubscribe_url}}" style="font-size:11px;color:#374151;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Unsubscribe</a>
      </td>
    </tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`
}

async function sendCampaign(previewOnly: boolean) {
  if (!campaignRecipients.value.length) {
    apiError.value = 'Load recipients first'
    return
  }
  sending.value = !previewOnly
  sendResult.value = null
  try {
    const session = await supabase?.auth.getSession()
    const token = session?.data?.session?.access_token
    const res = await fetch('/api/admin/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        subject: emailSubject.value,
        html: renderedEmailHtml.value,
        recipients: campaignRecipients.value,
        preview_only: previewOnly,
      })
    })
    sendResult.value = await res.json()
  } catch (e: any) {
    sendResult.value = { error: e.message }
  } finally {
    sending.value = false
  }
}

function copyEmailHtml() {
  navigator.clipboard.writeText(renderedEmailHtml.value).then(() => {
    htmlCopied.value = true
    setTimeout(() => { htmlCopied.value = false }, 2500)
  })
}

// ── Formatting ────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return (n || 0).toLocaleString()
}

// ── Init ──────────────────────────────────────────────────────────────────────
// Watch for isAdmin to become true (profile loads async after mount)
watch(() => isAdmin.value, (val) => {
  if (val && kpis.value.totalUsers === 0) {
    loadStats()
  }
}, { immediate: true })

onMounted(async () => {
  // Give the auth store a moment to hydrate the profile
  if (authStore.initialize) await authStore.initialize()
  // If already admin by now, load immediately
  if (isAdmin.value) await loadStats()
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

/* ── EMAIL CAMPAIGN ── */
.campaign-controls-wrap { margin-bottom: 24px; }
.campaign-controls { display: flex; flex-direction: column; gap: 14px; }
.ctrl-group { display: flex; flex-direction: column; gap: 5px; }
.ctrl-label { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #4b5563; }
.ctrl-input, .ctrl-textarea {
  background: #0a0c14; border: 1px solid #262a3a; border-radius: 8px;
  color: #e5e7eb; font-size: 13px; padding: 8px 12px; outline: none;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  transition: border-color 0.15s; width: 100%; box-sizing: border-box;
}
.ctrl-input:focus, .ctrl-textarea:focus { border-color: #eab308; }
.ctrl-textarea { resize: vertical; line-height: 1.5; }
.campaign-recipients-info {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #6b7280; padding: 8px 12px;
  background: #0a0c14; border: 1px solid #1e2130; border-radius: 8px;
}
.campaign-recipients-info.warn { border-color: rgba(234,179,8,0.2); color: #eab308; }
.recip-dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }
.btn-reload {
  margin-left: auto; padding: 3px 10px; border-radius: 5px;
  border: 1px solid #262a3a; background: #11131a; color: #9ca3af;
  font-size: 11px; cursor: pointer; transition: all 0.12s;
}
.btn-reload:hover { border-color: #374151; color: #e5e7eb; }
.campaign-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-preview { background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.3); color: #eab308; }
.btn-preview:hover { background: rgba(234,179,8,0.18); }
.btn-send { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); color: #22c55e; }
.btn-send:hover:not(:disabled) { background: rgba(34,197,94,0.18); }
.btn-send:disabled { opacity: 0.4; cursor: not-allowed; }
.send-result { padding: 10px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.send-success { background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); color: #4ade80; }
.send-error   { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); color: #fca5a5; }
.resend-notice {
  font-size: 11px; color: #374151; padding: 8px 0;
  display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
}
.resend-notice code { background: #11131a; border: 1px solid #1e2130; padding: 1px 6px; border-radius: 4px; color: #9ca3af; font-size: 11px; }
.resend-notice a { color: #4b5563; text-decoration: none; }
.resend-notice a:hover { color: #9ca3af; }
.resend-notice-label { color: #4b5563; }
.campaign-preview-wrap { display: flex; flex-direction: column; gap: 10px; }
.preview-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: #4b5563; display: flex; align-items: center; gap: 10px;
}
.preview-badge {
  font-size: 10px; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.04em;
  background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.2); color: #eab308;
}
.email-preview-frame {
  border: 1px solid #1e2130; border-radius: 12px; overflow: hidden; background: #05060a;
}
.email-iframe { width: 100%; height: 900px; border: none; display: block; background: #fff; }

/* ── ADMIN TABS ── */
.admin-tabs {
  display: flex; gap: 0; border-bottom: 1px solid #1e2130;
  background: #0a0c14; padding: 0 32px;
  position: sticky; top: 73px; z-index: 18;
  backdrop-filter: blur(12px);
}
.admin-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 14px 20px; font-size: 13px; font-weight: 600;
  color: #6b7280; border: none; background: none; cursor: pointer;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  transition: all 0.15s; white-space: nowrap;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
}
.admin-tab:hover { color: #9ca3af; }
.admin-tab-active { color: #e5e7eb; border-bottom-color: #eab308; }
.admin-tab-icon { font-size: 15px; }
.social-iframe-wrap {
  border: 1px solid #1e2130; border-radius: 12px; overflow: hidden;
  height: calc(100vh - 220px); min-height: 700px;
}
.social-iframe { width: 100%; height: 100%; border: none; display: block; }
</style>
