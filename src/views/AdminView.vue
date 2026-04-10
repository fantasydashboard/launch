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
      <button @click="adminTab='content'" :class="['admin-tab', adminTab==='content'?'admin-tab-active':'']">
        <span class="admin-tab-icon">📅</span> Content
      </button>
      <button @click="adminTab='email'" :class="['admin-tab', adminTab==='email'?'admin-tab-active':'']">
        <span class="admin-tab-icon">✉️</span> Email
      </button>
      <button @click="adminTab='social'" :class="['admin-tab', adminTab==='social'?'admin-tab-active':'']">
        <span class="admin-tab-icon">📸</span> Social
      </button>
    </div>

    <!-- ── Auth still loading — wait before showing denied ── -->
    <div v-if="!authStore.initialized || authStore.loading" class="access-denied">
      <div style="width:32px;height:32px;border:3px solid #1e2130;border-top-color:#22c55e;border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 16px;"></div>
      <p style="color:#6b7280;font-size:14px;">Loading...</p>
    </div>

    <!-- ── Access Denied — only show once auth is confirmed loaded ── -->
    <div v-else-if="!isAdmin" class="access-denied">
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

      <!-- ══════════════════════════════════════ CONTENT TAB ══ -->
      <template v-if="adminTab === 'content'">
      <section class="section">
        <ContentCalendarView :embed-mode="true" />
      </section>
      </template><!-- end content tab -->

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

            <!-- ── HTML Template Library ── -->
            <div class="ctrl-group">
              <label class="ctrl-label">📬 Ready-Made Email Templates</label>
              <div class="tpl-library">
                <!-- Series selector -->
                <select v-model="selectedSeries" class="ctrl-input" @change="selectedHtmlTemplate = ''">
                  <option value="">— Select a series —</option>
                  <option v-for="s in EMAIL_SERIES" :key="s.id" :value="s.id">{{ s.label }}</option>
                </select>

                <!-- Email picker within series -->
                <select v-if="selectedSeries" v-model="selectedHtmlTemplate" class="ctrl-input">
                  <option value="">— Select an email —</option>
                  <option v-for="t in EMAIL_SERIES.find(s => s.id === selectedSeries)?.emails || []" :key="t.id" :value="t.id">
                    {{ t.name }}
                  </option>
                </select>

                <!-- Copy HTML button -->
                <div v-if="selectedHtmlTemplate" class="tpl-action-row">
                  <div class="tpl-meta">
                    <div class="tpl-subject">{{ currentHtmlTemplate?.subject }}</div>
                    <div class="tpl-preview-text">{{ currentHtmlTemplate?.preview }}</div>
                  </div>
                  <button class="tpl-copy-btn" @click="copyTemplateHtml">
                    <span v-if="htmlCopied2">✓ Copied!</span>
                    <span v-else>Copy HTML</span>
                  </button>
                </div>
              </div>
            </div>
            <div class="template-divider" style="margin-top:4px;"></div>

            <!-- ── Custom / Override composer ── -->
            <div class="tpl-composer-label">✏️ Or compose a custom email</div>
            <div class="template-divider" style="margin:4px 0 8px;"></div>

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
        <SocialTemplatesView :embed-mode="true" />
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
              style="border-bottom:1px solid #0f1017;cursor:pointer;"
              @click.stop="openUserDetail(u)"
              @mouseover="$event.currentTarget.style.background='rgba(255,255,255,0.03)'"
              @mouseout="$event.currentTarget.style.background=''">
              <td style="padding:11px 16px;color:#22c55e;font-weight:600;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(34,197,94,0.4);">{{ u.full_name || u.email || '—' }}</td>
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

  <!-- ── User Detail Slide-in Panel ── -->
  <Teleport to="body">
    <div v-if="userDetail" class="ud-backdrop" @click.self="closeUserDetail" style="position:fixed;inset:0;z-index:100001;background:rgba(0,0,0,0.6);display:flex;justify-content:flex-end;">
        <div class="ud-panel" style="width:100%;max-width:480px;height:100%;background:#0d0f18;border-left:1px solid #1e2130;display:flex;flex-direction:column;box-shadow:-8px 0 40px rgba(0,0,0,0.5);overflow-y:auto;margin-left:auto;">

          <!-- Header -->
          <div class="ud-header">
            <div class="ud-avatar">{{ (userDetail.full_name || userDetail.email || '?')[0].toUpperCase() }}</div>
            <div class="ud-header-info">
              <div class="ud-name">{{ userDetail.full_name || '—' }}</div>
              <div class="ud-email">{{ userDetail.email }}</div>
            </div>
            <button class="ud-close" @click="closeUserDetail">✕</button>
          </div>

          <!-- Loading -->
          <div v-if="userDetail._loading" class="ud-loading">Loading profile…</div>

          <!-- Error -->
          <div v-else-if="userDetail._error" class="ud-error">{{ userDetail._error }}</div>

          <!-- Content -->
          <div v-else class="ud-body">

            <!-- Status badges -->
            <div class="ud-badges">
              <span class="ud-badge" :style="userDetail.summary?.has_paid ? 'background:rgba(34,197,94,0.15);color:#22c55e;border-color:rgba(34,197,94,0.3)' : userDetail.summary?.trial_active ? 'background:rgba(6,182,212,0.15);color:#06b6d4;border-color:rgba(6,182,212,0.3)' : 'background:rgba(239,68,68,0.15);color:#ef4444;border-color:rgba(239,68,68,0.3)'">
                {{ userDetail.summary?.has_paid ? '✓ Paid' : userDetail.summary?.trial_active ? '⏳ Free Trial' : '🔒 Expired' }}
              </span>
              <span v-for="p in (userDetail.summary?.platforms_used || [])" :key="p" class="ud-badge" style="background:rgba(234,179,8,0.1);color:#eab308;border-color:rgba(234,179,8,0.25);">
                {{ platformLabel(p) }}
              </span>
              <span v-for="s in (userDetail.summary?.sports || [])" :key="s" class="ud-badge" style="background:rgba(255,255,255,0.05);color:#9ca3af;border-color:#1e2130;">
                {{ sportEmoji(s) }} {{ s }}
              </span>
            </div>

            <!-- Key stats row -->
            <div class="ud-stats-row">
              <div class="ud-stat">
                <div class="ud-stat-val">{{ userDetail.summary?.league_count ?? 0 }}</div>
                <div class="ud-stat-label">Leagues</div>
              </div>
              <div class="ud-stat">
                <div class="ud-stat-val">{{ userDetail.summary?.platform_count ?? 0 }}</div>
                <div class="ud-stat-label">Platforms</div>
              </div>
              <div class="ud-stat">
                <div class="ud-stat-val">{{ (userDetail.passes || []).length }}</div>
                <div class="ud-stat-label">Passes Bought</div>
              </div>
            </div>

            <!-- Timeline -->
            <div class="ud-section">
              <div class="ud-section-title">Timeline</div>
              <div class="ud-timeline">
                <div class="ud-timeline-row">
                  <span class="ud-tl-label">Joined</span>
                  <span class="ud-tl-val">{{ formatDate(userDetail.profile?.created_at) }}</span>
                </div>
                <div class="ud-timeline-row">
                  <span class="ud-tl-label">Last Sign In</span>
                  <span class="ud-tl-val">{{ formatDate(userDetail.profile?.last_sign_in) }}</span>
                </div>
                <div class="ud-timeline-row">
                  <span class="ud-tl-label">Trial Started</span>
                  <span class="ud-tl-val">{{ formatDate(userDetail.profile?.trial_started_at) }}</span>
                </div>
                <div class="ud-timeline-row">
                  <span class="ud-tl-label">Trial Expires</span>
                  <span class="ud-tl-val" :style="userDetail.summary?.trial_expired ? 'color:#ef4444' : ''">
                    {{ formatDate(userDetail.profile?.trial_expires_at) }}
                  </span>
                </div>
                <div v-if="userDetail.subscription" class="ud-timeline-row">
                  <span class="ud-tl-label">Subscribed</span>
                  <span class="ud-tl-val" style="color:#22c55e;">{{ formatDate(userDetail.subscription?.created_at) }} · {{ userDetail.subscription?.tier }}</span>
                </div>
                <div v-if="userDetail.subscription" class="ud-timeline-row">
                  <span class="ud-tl-label">Renews</span>
                  <span class="ud-tl-val">{{ formatDate(userDetail.subscription?.current_period_end) }}</span>
                </div>
              </div>
            </div>

            <!-- Connected Leagues -->
            <div class="ud-section" v-if="(userDetail.leagues || []).length">
              <div class="ud-section-title">Connected Leagues ({{ userDetail.leagues.length }})</div>
              <div class="ud-league-list">
                <div v-for="l in userDetail.leagues" :key="l.league_id" class="ud-league-row">
                  <span class="ud-league-sport">{{ sportEmoji(l.sport) }}</span>
                  <div class="ud-league-info">
                    <div class="ud-league-name">{{ l.league_name || l.league_id }}</div>
                    <div class="ud-league-meta">{{ platformLabel(l.platform) }} · {{ l.sport }} · {{ l.season }}</div>
                  </div>
                  <span class="ud-league-type">{{ l.scoring_type || '' }}</span>
                </div>
              </div>
            </div>
            <div class="ud-section" v-else>
              <div class="ud-section-title">Connected Leagues</div>
              <div class="ud-empty">No leagues connected yet</div>
            </div>

            <!-- League Passes purchased -->
            <div class="ud-section" v-if="(userDetail.passes || []).length">
              <div class="ud-section-title">League Passes Purchased</div>
              <div class="ud-league-list">
                <div v-for="p in userDetail.passes" :key="p.league_id + p.created_at" class="ud-league-row">
                  <span class="ud-league-sport">🎟️</span>
                  <div class="ud-league-info">
                    <div class="ud-league-name">{{ p.league_id }}</div>
                    <div class="ud-league-meta">{{ platformLabel(p.platform) }} · {{ p.sport }} · Expires {{ formatDate(p.expires_at) }}</div>
                  </div>
                  <span class="ud-badge" :style="p.active && new Date(p.expires_at) > new Date() ? 'background:rgba(34,197,94,0.1);color:#22c55e;border-color:rgba(34,197,94,0.3)' : 'background:rgba(239,68,68,0.1);color:#ef4444;border-color:rgba(239,68,68,0.3)'">
                    {{ p.active && new Date(p.expires_at) > new Date() ? 'Active' : 'Expired' }}
                  </span>
                </div>
              </div>
            </div>

          </div><!-- end ud-body -->
        </div><!-- end ud-panel -->
      </div>
  </Teleport>

</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFeatureAccess } from '@/composables/useFeatureAccess'
import { supabase } from '@/lib/supabase'
import VueApexCharts from 'vue3-apexcharts'
import SocialTemplatesView from '@/views/SocialTemplatesView.vue'
import ContentCalendarView from '@/views/ContentCalendarView.vue'

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

// ── User Detail Panel ────────────────────────────────────────────────────────
const userDetail = ref<any>(null)
const userDetailLoading = ref(false)

async function openUserDetail(user: any) {
  console.log('[admin] openUserDetail called for:', user.id, user.email)
  console.log('[admin] userDetail before set:', userDetail.value)
  userDetailLoading.value = true
  userDetail.value = { ...user, _loading: true }
  try {
    const data = await callAdmin({ action: 'user_detail', user_id: user.id })
    console.log('[admin] user_detail response:', data)
    userDetail.value = { ...user, ...data, _loading: false }
  } catch (e: any) {
    console.error('[admin] user_detail error:', e)
    userDetail.value = { ...user, _error: e.message, _loading: false }
  } finally {
    userDetailLoading.value = false
  }
}

function closeUserDetail() { userDetail.value = null }

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function sportEmoji(sport: string) {
  const map: Record<string,string> = { football: '🏈', baseball: '⚾', basketball: '🏀', hockey: '🏒' }
  return map[sport] || '🏆'
}

function platformLabel(p: string) {
  const map: Record<string,string> = { espn: 'ESPN', yahoo: 'Yahoo', sleeper: 'Sleeper' }
  return map[p] || p
}
// ─────────────────────────────────────────────────────────────────────────────

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
// ── Email Templates ──────────────────────────────────────────────────────────
// ── HTML Email Template Library ──────────────────────────────────────────────
const selectedSeries  = ref('')
const selectedHtmlTemplate = ref('')
const htmlCopied2 = ref(false)

const WELCOME_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#05060a;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#05060a;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0c14;border:1px solid #1e2130;border-radius:12px;overflow:hidden;"><!-- HEADER --><tr><td style="background:#0a0c14;border-bottom:2px solid #22c55e;padding:16px 28px;text-align:center;"><img src="https://ultimatefantasydashboard.com/UFD_V8.png" height="26" alt="Ultimate Fantasy Dashboard" style="display:inline-block;"></td></tr><!-- BANNER --><tr><td style="background:linear-gradient(90deg,#0a1f0f,#0c1824);border-bottom:1px solid rgba(34,197,94,0.2);padding:11px 28px;text-align:center;font-size:12px;color:#86efac;letter-spacing:0.03em;">&#x1F44B; Welcome &#x2014; your league analytics start here</td></tr><!-- BODY --><tr><td style="padding:36px 32px 28px;background:#0a0c14;"><p style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#22c55e;margin:0 0 10px;">GETTING STARTED</p><h1 style="font-size:27px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-0.02em;margin:0 0 18px;">Welcome to Ultimate Fantasy Dashboard.</h1><!-- SECTION 1: Connect Your League --><p style="font-size:16px;font-weight:800;color:#fff;margin:0 0 12px;">Connect Your League</p><table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 10px;"><tr><td style="padding:10px 14px;background:#11131a;border:1px solid #1e2130;border-radius:10px;margin-bottom:8px;display:block;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="26" style="text-align:center;"><div style="width:22px;height:22px;border-radius:50%;background:#22c55e;color:#0a0c14;font-size:11px;font-weight:900;text-align:center;line-height:22px;display:inline-block;">1</div></td><td style="padding-left:10px;font-size:13px;color:#d1d5db;">Log in and click <strong style="color:#fff;">"Add League"</strong> in the top right</td></tr></table></td></tr><tr><td height="8"></td></tr><tr><td style="padding:10px 14px;background:#11131a;border:1px solid #1e2130;border-radius:10px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="26" style="text-align:center;"><div style="width:22px;height:22px;border-radius:50%;background:#22c55e;color:#0a0c14;font-size:11px;font-weight:900;text-align:center;line-height:22px;display:inline-block;">2</div></td><td style="padding-left:10px;font-size:13px;color:#d1d5db;">Choose your platform &#x2014; <strong style="color:#fff;">ESPN, Yahoo, or Sleeper</strong></td></tr></table></td></tr><tr><td height="8"></td></tr><tr><td style="padding:10px 14px;background:#11131a;border:1px solid #1e2130;border-radius:10px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="26" style="text-align:center;"><div style="width:22px;height:22px;border-radius:50%;background:#22c55e;color:#0a0c14;font-size:11px;font-weight:900;text-align:center;line-height:22px;display:inline-block;">3</div></td><td style="padding-left:10px;font-size:13px;color:#d1d5db;">Follow the prompts &#x2014; <strong style="color:#fff;">your full dashboard loads automatically</strong></td></tr></table></td></tr></table><p style="font-size:12px;color:#6b7280;font-style:italic;margin:0 0 22px;">Takes about 60 seconds. Works for football, baseball, basketball and hockey.</p><!-- SECTION 2: Your Dashboards --><p style="font-size:16px;font-weight:800;color:#fff;margin:0 0 12px;">Your Dashboards</p><table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td width="48%" valign="top" style="padding-right:6px;"><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F3C6;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Power Rankings</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Weekly algorithm combining record, points, all-play, form and consistency. Updated every week automatically.</div></div><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F4CB;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Draft Grades</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Every pick graded against where players actually finished. Team grades, steals, busts.</div></div></td><td width="4%"></td><td width="48%" valign="top" style="padding-left:6px;"><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">&#x26A1;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Win Probability</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Monte Carlo simulation running 10,000 projections daily. Real odds for your current matchup.</div></div><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F4DC;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">League History</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">All-time records, awards, H2H matrix, Tale of the Tape. Every season your league has played.</div></div></td></tr></table><!-- SECTION 3: Share It --><div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.22);border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.7;"><div style="font-size:12px;font-weight:800;color:#67e8f9;letter-spacing:0.04em;margin-bottom:6px;">&#x1F4F2; Drop it in the group chat</div>Every dashboard has a <strong style="color:#e5e7eb;">Share button</strong>. One tap downloads a branded graphic ready to send. Nothing starts a league argument faster.</div><!-- SPORT COVERAGE --><div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.22);border-radius:10px;padding:14px 16px;margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.7;"><div style="font-size:12px;font-weight:800;color:#fbbf24;letter-spacing:0.04em;margin-bottom:6px;">&#x1F3C8; &#x26BE; &#x1F3C0; &#x1F3D2; Built for all four sports</div><strong style="color:#e5e7eb;">Football, baseball, basketball and hockey</strong> &#x2014; every UFD feature is built for all four, with stats, rankings and visuals tuned to how each one is actually played.</div><!-- POINTS VS CATEGORY --><div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.22);border-radius:10px;padding:14px 16px;margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.7;"><div style="font-size:12px;font-weight:800;color:#67e8f9;letter-spacing:0.04em;margin-bottom:6px;">&#x1F4CA; Points leagues &amp; H2H category leagues</div><strong style="color:#e5e7eb;">Points or category</strong> &#x2014; UFD knows the difference. Standings, scoring and head-to-head are all calculated the right way for your league format, automatically.</div><!-- PLATFORM SUPPORT --><div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.22);border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.7;"><div style="font-size:12px;font-weight:800;color:#86efac;letter-spacing:0.04em;margin-bottom:6px;">&#x1F517; Sleeper, ESPN &amp; Yahoo</div><strong style="color:#e5e7eb;">All three platforms supported</strong> &#x2014; once your league is connected, everything loads automatically. Nothing to upload, nothing to configure.</div><hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;"><p style="font-size:13px;color:#6b7280;font-style:italic;margin:0 0 24px;">You have 7 days of full access &#x2014; no credit card required. Connect your first league and see everything.</p><div style="text-align:center;margin:0 0 8px;"><a href="https://ultimatefantasydashboard.com" style="display:inline-block;background:#22c55e;color:#0a0c14;font-size:14px;font-weight:800;letter-spacing:0.05em;padding:14px 36px;border-radius:10px;text-decoration:none;">CONNECT MY FIRST LEAGUE &#x2192;</a></div><p style="font-size:11px;color:#374151;text-align:center;margin:0;">Takes about 60 seconds &middot; ESPN, Yahoo &amp; Sleeper supported</p></td></tr><!-- FOOTER --><tr><td style="background:#080a10;padding:14px 28px;border-top:1px solid #1e2130;text-align:center;font-size:11px;color:#374151;">ultimatefantasydashboard.com &nbsp;&middot;&nbsp; <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#374151;text-decoration:none;">Unsubscribe</a></td></tr></table></td></tr></table></body></html>`

const NO_LEAGUES_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#05060a;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#05060a;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0c14;border:1px solid #1e2130;border-radius:12px;overflow:hidden;"><tr><td style="background:#0a0c14;border-bottom:2px solid #22c55e;padding:16px 28px;text-align:center;"><img src="https://ultimatefantasydashboard.com/UFD_V8.png" height="26" alt="Ultimate Fantasy Dashboard" style="display:inline-block;"></td></tr><tr><td style="background:linear-gradient(90deg,#0a1f0f,#0c1824);border-bottom:1px solid rgba(34,197,94,0.2);padding:11px 28px;text-align:center;font-size:12px;color:#86efac;letter-spacing:0.03em;">⚾ Baseball season is here. Your league is waiting — connect in 60 seconds.</td></tr><tr><td style="padding:36px 32px 28px;background:#0a0c14;"><p style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#22c55e;margin:0 0 10px;">YOU ARE ONE STEP AWAY</p><h1 style="font-size:27px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-0.02em;margin:0 0 18px;">Your account is ready. Your league is not connected yet.</h1><p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 16px;">Hey — you created an Ultimate Fantasy Dashboard account but never connected a league. That means <strong style="color:#e5e7eb;">you have not seen any of it yet.</strong> No power rankings. No win probability. No shareable graphics for your group chat.</p><p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 18px;">It takes about 60 seconds. Here is how:</p><table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="padding:10px 14px;background:#11131a;border:1px solid #1e2130;border-radius:10px;margin-bottom:8px;display:block;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="26" style="text-align:center;"><div style="width:22px;height:22px;border-radius:50%;background:#22c55e;color:#0a0c14;font-size:11px;font-weight:900;text-align:center;line-height:22px;display:inline-block;">1</div></td><td style="padding-left:10px;font-size:13px;color:#d1d5db;">Log in and click <strong style="color:#fff;">"Add League"</strong> in the top right</td></tr></table></td></tr><tr><td height="8"></td></tr><tr><td style="padding:10px 14px;background:#11131a;border:1px solid #1e2130;border-radius:10px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="26" style="text-align:center;"><div style="width:22px;height:22px;border-radius:50%;background:#22c55e;color:#0a0c14;font-size:11px;font-weight:900;text-align:center;line-height:22px;display:inline-block;">2</div></td><td style="padding-left:10px;font-size:13px;color:#d1d5db;">Choose your platform — <strong style="color:#fff;">ESPN, Yahoo, or Sleeper</strong></td></tr></table></td></tr><tr><td height="8"></td></tr><tr><td style="padding:10px 14px;background:#11131a;border:1px solid #1e2130;border-radius:10px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="26" style="text-align:center;"><div style="width:22px;height:22px;border-radius:50%;background:#22c55e;color:#0a0c14;font-size:11px;font-weight:900;text-align:center;line-height:22px;display:inline-block;">3</div></td><td style="padding-left:10px;font-size:13px;color:#d1d5db;">Follow the prompts — <strong style="color:#fff;">your full dashboard loads automatically</strong></td></tr></table></td></tr></table><hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;"><p style="font-size:13px;color:#6b7280;font-style:italic;margin:0 0 24px;">You are in your free trial right now — full access, no credit card needed. Do not let it run out before you even see what the app does.</p><div style="text-align:center;margin:0 0 8px;"><a href="https://ultimatefantasydashboard.com" style="display:inline-block;background:#22c55e;color:#0a0c14;font-size:14px;font-weight:800;letter-spacing:0.05em;padding:14px 36px;border-radius:10px;text-decoration:none;">CONNECT MY LEAGUE NOW →</a></div><p style="font-size:11px;color:#374151;text-align:center;margin:0;">Takes about 60 seconds · ESPN, Yahoo &amp; Sleeper supported</p></td></tr><tr><td style="background:#080a10;padding:14px 28px;border-top:1px solid #1e2130;text-align:center;font-size:11px;color:#374151;">ultimatefantasydashboard.com &nbsp;&middot;&nbsp; <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#374151;text-decoration:none;">Unsubscribe</a></td></tr></table></td></tr></table></body></html>`

const FREE_TRIAL_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#05060a;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#05060a;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0c14;border:1px solid #1e2130;border-radius:12px;overflow:hidden;"><tr><td style="background:#0a0c14;border-bottom:2px solid #22c55e;padding:16px 28px;text-align:center;"><img src="https://ultimatefantasydashboard.com/UFD_V8.png" height="26" alt="Ultimate Fantasy Dashboard" style="display:inline-block;"></td></tr><tr><td style="background:linear-gradient(90deg,#0a1f0f,#0c1824);border-bottom:1px solid rgba(34,197,94,0.2);padding:11px 28px;text-align:center;font-size:12px;color:#86efac;">🆕 New: connect your league for free and get 7 days of full access — no credit card required.</td></tr><tr><td style="padding:36px 32px 28px;background:#0a0c14;"><p style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#22c55e;margin:0 0 10px;">YOUR FREE TRIAL IS WAITING</p><h1 style="font-size:27px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-0.02em;margin:0 0 18px;">Full access. Free. 7 days. No card required.</h1><p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 16px;">Hey — we made a change and wanted to make sure you knew about it. When you created your account, <strong style="color:#e5e7eb;">we did not have a free trial. Now we do.</strong> And yours is already waiting for you.</p><div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:10px;padding:14px 18px;margin:20px 0;"><table cellpadding="0" cellspacing="0"><tr><td style="font-size:32px;font-weight:900;color:#22c55e;line-height:1;padding-right:14px;">7</td><td style="font-size:13px;color:#9ca3af;line-height:1.45;"><strong style="color:#e5e7eb;">days of full access, completely free</strong><br>Starts the moment you connect your first league. No credit card. No catch.</td></tr></table></div><table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td width="48%" valign="top" style="padding-right:6px;"><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:18px;margin-bottom:5px;">🏆</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Power Rankings</div><div style="font-size:11px;color:#6b7280;">Weekly algorithm + trend graph</div></div><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:18px;margin-bottom:5px;">📜</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">League History</div><div style="font-size:11px;color:#6b7280;">Career stats + H2H records</div></div></td><td width="4%"></td><td width="48%" valign="top" style="padding-left:6px;"><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:18px;margin-bottom:5px;">⚡</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Win Probability</div><div style="font-size:11px;color:#6b7280;">Live day-by-day matchup odds</div></div><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:18px;margin-bottom:5px;">📲</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Shareable Graphics</div><div style="font-size:11px;color:#6b7280;">Drop them in your group chat</div></div></td></tr></table><hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;"><p style="font-size:13px;color:#6b7280;margin:0 0 24px;">You can connect as many leagues as you want — <strong style="color:#e5e7eb;">ESPN, Yahoo, and Sleeper</strong> all supported. Takes about 60 seconds. Your account is already created.</p><div style="text-align:center;margin:0 0 8px;"><a href="https://ultimatefantasydashboard.com" style="display:inline-block;background:#22c55e;color:#0a0c14;font-size:14px;font-weight:800;letter-spacing:0.05em;padding:14px 36px;border-radius:10px;text-decoration:none;">START MY FREE TRIAL →</a></div><p style="font-size:11px;color:#374151;text-align:center;margin:0;">7 days free · No credit card · Cancel anytime</p></td></tr><tr><td style="background:#080a10;padding:14px 28px;border-top:1px solid #1e2130;text-align:center;font-size:11px;color:#374151;">ultimatefantasydashboard.com &nbsp;&middot;&nbsp; <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#374151;text-decoration:none;">Unsubscribe</a></td></tr></table></td></tr></table></body></html>`

const POWER_RANKINGS_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#05060a;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#05060a;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0c14;border:1px solid #1e2130;border-radius:12px;overflow:hidden;"><tr><td style="background:#080a10;padding:9px 28px;border-bottom:1px solid #1e2130;text-align:center;font-size:11px;color:#6b7280;line-height:1.5;">&#x1F4C5; <strong style="color:#9ca3af;font-weight:700;">Free trial only:</strong> we&#x2019;re sending you daily emails this week to show off everything UFD can do. After your trial ends, you&#x2019;ll only hear from us when there&#x2019;s something worth saying.</td></tr><tr><td style="background:#0a0c14;border-bottom:2px solid #22c55e;padding:16px 28px;text-align:center;"><img src="https://ultimatefantasydashboard.com/UFD_V8.png" height="26" alt="Ultimate Fantasy Dashboard" style="display:inline-block;"></td></tr><tr><td style="background:linear-gradient(90deg,#0a1f0f,#0c1824);border-bottom:1px solid rgba(34,197,94,0.2);padding:11px 28px;text-align:center;font-size:12px;color:#86efac;letter-spacing:0.03em;">🏆 Welcome to your trial — let's show you what UFD can do</td></tr><tr><td style="padding:36px 32px 28px;background:#0a0c14;"><p style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#22c55e;margin:0 0 10px;">POWER RANKINGS</p><h1 style="font-size:27px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-0.02em;margin:0 0 18px;">Who's actually the best team in your league right now?</h1><p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 16px;">Standings lie. A 3-4 team can be outperforming a 5-2 team every single week. <strong style="color:#e5e7eb;">UFD Power Rankings cut through the noise</strong> — combining your record, total points, all-play record, recent form, and consistency into one score that tells the real story.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#11131a;border:1px solid #1e2130;border-radius:12px;overflow:hidden;margin:20px 0;"><tr><td style="background:#0a0c14;border-bottom:1px solid #1e2130;padding:11px 14px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:11px;font-weight:800;color:#22c55e;letter-spacing:0.08em;text-transform:uppercase;">&#x26A1; Power Rankings &mdash; Week 12</td><td align="right" style="font-size:9px;color:#6b7280;">League Standings</td></tr></table></td></tr><tr style="background:#080a10;"><td style="padding:7px 14px;border-bottom:1px solid #1e2130;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="22" style="font-size:9px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">#</td><td width="26" align="center" style="font-size:9px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">+/-</td><td style="font-size:9px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding-left:6px;">Team</td><td align="right" style="font-size:9px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding-right:8px;">Score</td><td width="46" align="right" style="font-size:9px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding-right:6px;">W-L</td><td width="42" align="right" style="font-size:9px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Win%</td></tr></table></td></tr><tr><td style="padding:9px 14px;border-bottom:1px solid #0f1017;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="22" style="font-size:12px;font-weight:800;color:#eab308;">1</td><td width="26" align="center" style="font-size:9px;font-weight:700;color:#22c55e;">&#x25B2;2</td><td style="padding:0 8px 0 6px;"><div style="font-size:12px;font-weight:700;color:#e5e7eb;margin-bottom:4px;">Wild Rotos</div><div style="height:4px;border-radius:2px;background:#1e2130;"><div style="width:96%;height:4px;background:linear-gradient(90deg,#22c55e,#16a34a);border-radius:2px;"></div></div></td><td align="right" style="font-size:12px;font-weight:800;color:#22c55e;padding-right:8px;">91.2</td><td width="46" align="right" style="font-size:11px;color:#9ca3af;padding-right:6px;">9-2</td><td width="42" align="right" style="font-size:11px;font-weight:700;color:#22c55e;">81.8%</td></tr></table></td></tr><tr><td style="padding:9px 14px;border-bottom:1px solid #0f1017;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="22" style="font-size:12px;font-weight:800;color:#eab308;">2</td><td width="26" align="center" style="font-size:9px;font-weight:700;color:#ef4444;">&#x25BC;1</td><td style="padding:0 8px 0 6px;"><div style="font-size:12px;font-weight:700;color:#e5e7eb;margin-bottom:4px;">Crazy Eights</div><div style="height:4px;border-radius:2px;background:#1e2130;"><div style="width:84%;height:4px;background:linear-gradient(90deg,#22c55e,#16a34a);border-radius:2px;"></div></div></td><td align="right" style="font-size:12px;font-weight:800;color:#22c55e;padding-right:8px;">82.5</td><td width="46" align="right" style="font-size:11px;color:#9ca3af;padding-right:6px;">8-3</td><td width="42" align="right" style="font-size:11px;font-weight:700;color:#22c55e;">72.7%</td></tr></table></td></tr><tr><td style="padding:9px 14px;border-bottom:1px solid #0f1017;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="22" style="font-size:12px;font-weight:800;color:#9ca3af;">3</td><td width="26" align="center" style="font-size:9px;font-weight:700;color:#22c55e;">&#x25B2;1</td><td style="padding:0 8px 0 6px;"><div style="font-size:12px;font-weight:700;color:#e5e7eb;margin-bottom:4px;">The Hot Corner</div><div style="height:4px;border-radius:2px;background:#1e2130;"><div style="width:74%;height:4px;background:linear-gradient(90deg,#eab308,#ca8a04);border-radius:2px;"></div></div></td><td align="right" style="font-size:12px;font-weight:800;color:#eab308;padding-right:8px;">71.8</td><td width="46" align="right" style="font-size:11px;color:#9ca3af;padding-right:6px;">7-4</td><td width="42" align="right" style="font-size:11px;font-weight:700;color:#9ca3af;">63.6%</td></tr></table></td></tr><tr><td style="padding:9px 14px;border-bottom:1px solid #0f1017;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="22" style="font-size:12px;font-weight:800;color:#9ca3af;">4</td><td width="26" align="center" style="font-size:9px;color:#6b7280;">&mdash;</td><td style="padding:0 8px 0 6px;"><div style="font-size:12px;font-weight:700;color:#e5e7eb;margin-bottom:4px;">Juggernauts</div><div style="height:4px;border-radius:2px;background:#1e2130;"><div style="width:62%;height:4px;background:linear-gradient(90deg,#eab308,#ca8a04);border-radius:2px;"></div></div></td><td align="right" style="font-size:12px;font-weight:800;color:#eab308;padding-right:8px;">60.4</td><td width="46" align="right" style="font-size:11px;color:#9ca3af;padding-right:6px;">6-5</td><td width="42" align="right" style="font-size:11px;font-weight:700;color:#9ca3af;">54.5%</td></tr></table></td></tr><tr><td style="padding:9px 14px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="22" style="font-size:12px;font-weight:800;color:#9ca3af;">5</td><td width="26" align="center" style="font-size:9px;font-weight:700;color:#ef4444;">&#x25BC;2</td><td style="padding:0 8px 0 6px;"><div style="font-size:12px;font-weight:700;color:#e5e7eb;margin-bottom:4px;">Pink Panther</div><div style="height:4px;border-radius:2px;background:#1e2130;"><div style="width:48%;height:4px;background:linear-gradient(90deg,#f97316,#ea580c);border-radius:2px;"></div></div></td><td align="right" style="font-size:12px;font-weight:800;color:#f97316;padding-right:8px;">46.7</td><td width="46" align="right" style="font-size:11px;color:#9ca3af;padding-right:6px;">4-7</td><td width="42" align="right" style="font-size:11px;font-weight:700;color:#ef4444;">36.4%</td></tr></table></td></tr></table>

<!-- POWER SCORE TREND -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#11131a;border:1px solid #1e2130;border-radius:12px;overflow:hidden;margin:0 0 22px;"><tr><td style="padding:14px 16px 6px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:13px;font-weight:800;color:#fff;">&#x1F4C8; Power Score Trend</td><td align="right" style="font-size:9px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Wks 1 &mdash; 12</td></tr></table><div style="font-size:11px;color:#9ca3af;margin-top:2px;">Track every team&#x2019;s ranking, week by week.</div></td></tr><tr><td style="padding:6px 14px 14px;">
<!-- Power Score Trend line graph (hosted SVG) -->
<a href="https://ultimatefantasydashboard.com" style="display:block;text-decoration:none;border:0;outline:0;"><img src="https://ultimatefantasydashboard.com/email/power-trend-demo.svg" alt="Power Score Trend - week by week ranking changes" width="540" style="display:block;width:100%;max-width:540px;height:auto;border:0;outline:none;border-radius:8px;background:#0a0c14;"></a>
<!-- Team color legend -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;"><tr>
<td align="center" style="font-size:9px;color:#9ca3af;padding:0 4px;"><span style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Wild Rotos</td>
<td align="center" style="font-size:9px;color:#9ca3af;padding:0 4px;"><span style="display:inline-block;width:10px;height:10px;background:#eab308;border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Crazy Eights</td>
<td align="center" style="font-size:9px;color:#9ca3af;padding:0 4px;"><span style="display:inline-block;width:10px;height:10px;background:#06b6d4;border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Hot Corner</td>
<td align="center" style="font-size:9px;color:#9ca3af;padding:0 4px;"><span style="display:inline-block;width:10px;height:10px;background:#a78bfa;border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Juggernauts</td>
<td align="center" style="font-size:9px;color:#9ca3af;padding:0 4px;"><span style="display:inline-block;width:10px;height:10px;background:#ec4899;border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Pink Panther</td>
</tr></table>
</td></tr></table>
</td></tr></table><hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;"><p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 8px;">What goes into the score?</p><div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.25);border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.7;"><strong style="color:#a78bfa;">Win-Loss Record (32%)</strong> · Your actual record is the foundation.<br><strong style="color:#a78bfa;">Total Points Scored (21%)</strong> · How much are you actually putting up?<br><strong style="color:#a78bfa;">All-Play Record (19%)</strong> · If you played every team, where would you rank?<br><strong style="color:#a78bfa;">Recent Form — Last 3 (16%)</strong> · Are you heating up or cooling down?<br><strong style="color:#a78bfa;">Consistency (13%)</strong> · Boom-or-bust vs steady every week.</div><table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td width="48%" valign="top" style="padding-right:6px;"><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">🎛️</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Customize the Formula</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Adjust the weights to rank teams your way.</div></div><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">🔍</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Team Deep Dive</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Click any team to see what's driving their score.</div></div></td><td width="4%"></td><td width="48%" valign="top" style="padding-left:6px;"><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">📈</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Trend Graph</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Watch every team's ranking move week by week.</div></div><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">📅</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Any Week</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">View rankings from any point in the season.</div></div></td></tr></table><div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);border-radius:10px;padding:16px 18px;margin:0 0 20px;"><span style="font-size:22px;">📲</span>&nbsp;&nbsp;<span style="font-size:13px;color:#9ca3af;line-height:1.6;"><strong style="color:#06b6d4;">Drop it in your group chat.</strong> Hit Share on the rankings page to download a graphic ready to send. Nothing starts a league argument faster.</span></div><!-- SPORT COVERAGE -->
<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.22);border-radius:10px;padding:14px 16px;margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#fbbf24;letter-spacing:0.04em;margin-bottom:6px;">&#x1F3C8; &#x26BE; &#x1F3C0; &#x1F3D2; Built for all four sports</div>
<strong style="color:#e5e7eb;">Football, baseball, basketball and hockey</strong> &#x2014; every UFD feature is built for all four, with stats, rankings and visuals tuned to how each one is actually played.
</div>

<!-- POINTS VS CATEGORY -->
<div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.22);border-radius:10px;padding:14px 16px;margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#67e8f9;letter-spacing:0.04em;margin-bottom:6px;">&#x1F4CA; Points leagues &amp; H2H category leagues</div>
<strong style="color:#e5e7eb;">Points or category</strong> &#x2014; UFD knows the difference. Standings, scoring and head-to-head are all calculated the right way for your league format, automatically.
</div>

<!-- PLATFORM SUPPORT -->
<div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.22);border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#86efac;letter-spacing:0.04em;margin-bottom:6px;">&#x1F517; Sleeper, ESPN &amp; Yahoo</div>
<strong style="color:#e5e7eb;">All three platforms supported</strong> &#x2014; once your league is connected, everything loads automatically. Nothing to upload, nothing to configure.
</div>

<hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;"><p style="font-size:13px;color:#6b7280;font-style:italic;margin:0 0 24px;">You have full access right now during your free trial. Power Rankings update every week automatically.</p><div style="text-align:center;margin:0 0 8px;"><a href="https://ultimatefantasydashboard.com" style="display:inline-block;background:#22c55e;color:#0a0c14;font-size:14px;font-weight:800;letter-spacing:0.05em;padding:14px 36px;border-radius:10px;text-decoration:none;">VIEW MY POWER RANKINGS →</a></div><p style="font-size:11px;color:#374151;text-align:center;margin:0;">ESPN · Yahoo · Sleeper · All leagues supported</p></td></tr><tr><td style="background:#080a10;padding:14px 28px;border-top:1px solid #1e2130;text-align:center;font-size:11px;color:#374151;">ultimatefantasydashboard.com &nbsp;&middot;&nbsp; <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#374151;text-decoration:none;">Unsubscribe</a></td></tr></table></td></tr></table></body></html>`

const MATCHUP_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#05060a;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#05060a;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0c14;border:1px solid #1e2130;border-radius:12px;overflow:hidden;"><tr><td style="background:#080a10;padding:9px 28px;border-bottom:1px solid #1e2130;text-align:center;font-size:11px;color:#6b7280;line-height:1.5;">&#x1F4C5; <strong style="color:#9ca3af;font-weight:700;">Free trial only:</strong> we&#x2019;re sending you daily emails this week to show off everything UFD can do. After your trial ends, you&#x2019;ll only hear from us when there&#x2019;s something worth saying.</td></tr>

<tr><td style="background:#0a0c14;border-bottom:2px solid #22c55e;padding:16px 28px;text-align:center;"><img src="https://ultimatefantasydashboard.com/UFD_V8.png" height="26" alt="Ultimate Fantasy Dashboard" style="display:inline-block;"></td></tr>

<tr><td style="background:linear-gradient(90deg,#0a1824,#0c1424);border-bottom:1px solid rgba(6,182,212,0.25);padding:11px 28px;text-align:center;font-size:12px;color:#67e8f9;letter-spacing:0.03em;">⚡ Your matchup never looked like this before</td></tr>

<tr><td style="padding:36px 32px 28px;background:#0a0c14;">
<p style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#06b6d4;margin:0 0 10px;">MATCHUP ANALYTICS</p>
<h1 style="font-size:27px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-0.02em;margin:0 0 18px;">You don't have to wait until Sunday night to know where you stand.</h1>
<p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 16px;">UFD tracks your matchup <strong style="color:#e5e7eb;">every single day</strong> — updating your win probability in real time as players score, so you always know exactly where you are in the week. Not a guess. Not vibes. A number.</p>

<!-- Win Probability Chart Header -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#11131a;border:1px solid #1e2130;border-radius:12px;overflow:hidden;margin:20px 0;">
<tr><td style="padding:14px 16px 4px;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td><div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#4b5563;margin-bottom:6px;">Win Probability — This Week</div></td>
    <td align="right"><div style="font-size:22px;font-weight:900;color:#22c55e;line-height:1;">73%</div><div style="font-size:10px;color:#4b5563;text-align:right;">Your current odds</div></td>
  </tr></table>
</td></tr>
<tr><td style="padding:0 16px 16px;" align="center"><img src="https://quickchart.io/chart?v=4&bkg=%2311131a&w=1000&h=500&c=%7B%22type%22%3A%22line%22%2C%22data%22%3A%7B%22labels%22%3A%5B%22Mon%22%2C%22Tue%22%2C%22Wed%22%2C%22Thu%22%2C%22Fri%22%2C%22Sat%22%5D%2C%22datasets%22%3A%5B%7B%22label%22%3A%22Your%20Team%22%2C%22data%22%3A%5B51%2C58%2C62%2C31%2C59%2C73%5D%2C%22borderColor%22%3A%22rgb(34%2C197%2C94)%22%2C%22backgroundColor%22%3A%22rgba(34%2C197%2C94%2C0.2)%22%2C%22fill%22%3Atrue%2C%22tension%22%3A0.35%2C%22borderWidth%22%3A4%2C%22pointRadius%22%3A6%2C%22pointBackgroundColor%22%3A%22rgb(34%2C197%2C94)%22%2C%22pointBorderColor%22%3A%22%230a0c14%22%2C%22pointBorderWidth%22%3A2%2C%22datalabels%22%3A%7B%22align%22%3A%22top%22%2C%22anchor%22%3A%22end%22%2C%22backgroundColor%22%3A%22rgb(34%2C197%2C94)%22%2C%22borderRadius%22%3A6%2C%22color%22%3A%22%23fff%22%2C%22font%22%3A%7B%22weight%22%3A%22bold%22%2C%22size%22%3A15%7D%2C%22padding%22%3A7%7D%7D%2C%7B%22label%22%3A%22Opponent%22%2C%22data%22%3A%5B49%2C42%2C38%2C69%2C41%2C27%5D%2C%22borderColor%22%3A%22rgb(239%2C68%2C68)%22%2C%22backgroundColor%22%3A%22rgba(239%2C68%2C68%2C0.1)%22%2C%22fill%22%3Atrue%2C%22tension%22%3A0.35%2C%22borderWidth%22%3A3%2C%22pointRadius%22%3A5%2C%22pointBackgroundColor%22%3A%22rgb(239%2C68%2C68)%22%2C%22pointBorderColor%22%3A%22%230a0c14%22%2C%22pointBorderWidth%22%3A2%2C%22datalabels%22%3A%7B%22align%22%3A%22bottom%22%2C%22anchor%22%3A%22start%22%2C%22backgroundColor%22%3A%22rgb(239%2C68%2C68)%22%2C%22borderRadius%22%3A6%2C%22color%22%3A%22%23fff%22%2C%22font%22%3A%7B%22weight%22%3A%22bold%22%2C%22size%22%3A15%7D%2C%22padding%22%3A7%7D%7D%5D%7D%2C%22options%22%3A%7B%22layout%22%3A%7B%22padding%22%3A%7B%22top%22%3A40%2C%22bottom%22%3A20%2C%22left%22%3A20%2C%22right%22%3A20%7D%7D%2C%22plugins%22%3A%7B%22legend%22%3A%7B%22position%22%3A%22bottom%22%2C%22labels%22%3A%7B%22color%22%3A%22rgb(156%2C163%2C175)%22%2C%22font%22%3A%7B%22size%22%3A20%7D%2C%22padding%22%3A24%2C%22usePointStyle%22%3Atrue%7D%7D%2C%22datalabels%22%3A%7B%22display%22%3Atrue%7D%7D%2C%22scales%22%3A%7B%22y%22%3A%7B%22min%22%3A0%2C%22max%22%3A100%2C%22beginAtZero%22%3Atrue%2C%22ticks%22%3A%7B%22color%22%3A%22rgb(75%2C85%2C99)%22%2C%22font%22%3A%7B%22size%22%3A14%7D%2C%22stepSize%22%3A25%7D%2C%22grid%22%3A%7B%22color%22%3A%22rgb(30%2C33%2C48)%22%7D%7D%2C%22x%22%3A%7B%22ticks%22%3A%7B%22color%22%3A%22rgb(75%2C85%2C99)%22%2C%22font%22%3A%7B%22size%22%3A18%7D%7D%2C%22grid%22%3A%7B%22color%22%3A%22rgb(30%2C33%2C48)%22%7D%7D%7D%7D%7D" width="500" alt="Win Probability — This Week" style="display:block;width:100%;max-width:500px;height:auto;border-radius:8px;border:0;outline:none;text-decoration:none;"></td></tr>
<tr><td style="padding:0 16px 14px;border-top:1px solid #1e2130;">
  <div style="background:rgba(34,197,94,0.07);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:10px 12px;font-size:11px;color:#6b7280;">
    <strong style="color:#22c55e;">Thursday comeback:</strong> Down to 31% after your opponent hit 3 big players. Your RB dropped 34 pts Friday — win probability jumped 28 points overnight.
  </div>
</td></tr>
</table>

<!-- Monte Carlo -->
<div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.3);border-radius:10px;padding:16px 18px;margin:20px 0;">
  <div style="font-size:13px;font-weight:800;color:#a78bfa;margin-bottom:6px;">🎲 How is win probability calculated?</div>
  <div style="font-size:13px;color:#9ca3af;line-height:1.65;">UFD runs a <strong style="color:#a78bfa;">Monte Carlo simulation</strong> — thousands of randomized projections based on each player's historical performance and remaining schedule. The result is a true probability, not a prediction. It accounts for uncertainty, boom-or-bust variance, and everything still left to play.</div>
</div>

<hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;">

<p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 8px;">Daily trash talk ammunition 🗣️</p>
<p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 14px;">Every day that shifts the win probability is a moment in your group chat. UFD shows you exactly which players moved the needle — so you always have receipts.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.25);border-radius:10px;overflow:hidden;margin:0 0 20px;">
<tr><td style="padding:14px 16px 8px;font-size:13px;font-weight:800;color:#f87171;">Real moments. Real data. Real chaos.</td></tr>
<tr><td style="padding:0 12px 8px;">
  <div style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:10px 12px;margin-bottom:6px;">
    <div style="font-size:10px;color:#4b5563;font-weight:700;margin-bottom:3px;">TUESDAY AFTER YOUR RB HIT 30 PTS</div>
    <div style="font-size:12px;color:#d1d5db;">"My win probability just jumped 18 points in one day. That's not me being confident, that's literally the math. 📈"</div>
  </div>
  <div style="background:#11131a;border:1px solid #1e2130;border-radius:8px;padding:10px 12px;margin-bottom:6px;">
    <div style="font-size:10px;color:#4b5563;font-weight:700;margin-bottom:3px;">THURSDAY COMEBACK</div>
    <div style="font-size:12px;color:#d1d5db;">"Was down to 31% odds on Thursday. Sitting at 74% now. If you didn't want the drama, you shouldn't have started that RB."</div>
  </div>
  <div style="background:rgba(34,197,94,0.05);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:10px 12px;">
    <div style="font-size:10px;color:#4b5563;font-weight:700;margin-bottom:3px;">SUNDAY LOCK-IN</div>
    <div style="font-size:12px;color:#d1d5db;">"87% win probability going into Sunday. I'll just leave this here. 🏆"</div>
  </div>
</td></tr>
<tr><td style="padding:0 0 4px;"></td></tr>
</table>

<hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;">

<p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 8px;">You've played this person before.</p>
<p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 14px;">UFD shows your full head-to-head record against every manager in your league across every season — so you always know the context going into the week.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#11131a;border:1px solid #1e2130;border-radius:12px;overflow:hidden;margin:0 0 20px;">
<tr><td style="background:#0a0c14;border-bottom:1px solid #1e2130;padding:10px 16px;font-size:11px;font-weight:700;color:#4b5563;letter-spacing:0.1em;text-transform:uppercase;">🆚 Head-to-Head History</td></tr>
<tr><td style="padding:0;"><table width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;"><colgroup><col style="width:42%"><col style="width:16%"><col style="width:42%"></colgroup>
<tr><td style="padding:10px 16px;border-bottom:1px solid #0f1017;font-size:12px;color:#6b7280;">2024 · Week 7</td><td align="center" style="padding:10px 8px;border-bottom:1px solid #0f1017;font-size:12px;font-weight:700;color:#22c55e;">W</td><td align="right" style="padding:10px 16px;border-bottom:1px solid #0f1017;font-size:11px;color:#6b7280;">134.2 — 118.7</td></tr>
<tr><td style="padding:10px 16px;border-bottom:1px solid #0f1017;font-size:12px;color:#6b7280;">2024 · Week 14</td><td align="center" style="padding:10px 8px;border-bottom:1px solid #0f1017;font-size:12px;font-weight:700;color:#ef4444;">L</td><td align="right" style="padding:10px 16px;border-bottom:1px solid #0f1017;font-size:11px;color:#6b7280;">98.4 — 121.3</td></tr>
<tr><td style="padding:10px 16px;border-bottom:1px solid #0f1017;font-size:12px;color:#6b7280;">2023 · Playoffs</td><td align="center" style="padding:10px 8px;border-bottom:1px solid #0f1017;font-size:12px;font-weight:700;color:#22c55e;">W</td><td align="right" style="padding:10px 16px;border-bottom:1px solid #0f1017;font-size:11px;color:#6b7280;">142.1 — 109.8</td></tr>
<tr><td style="padding:10px 16px;background:rgba(34,197,94,0.05);font-size:12px;font-weight:700;color:#22c55e;">All-time record</td><td align="center" style="padding:10px 8px;background:rgba(34,197,94,0.05);font-size:12px;font-weight:700;color:#22c55e;">5-2</td><td align="right" style="padding:10px 16px;background:rgba(34,197,94,0.05);font-size:11px;color:#22c55e;">You're winning this rivalry</td></tr>
</table></td></tr>
</table>

<!-- Feature grid -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>
<td width="48%" valign="top" style="padding-right:6px;">
  <div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">🎲</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Monte Carlo Simulation</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Thousands of projections run every day to give you a true probability, not a guess.</div></div>
  <div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">🆚</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">H2H History</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Full head-to-head records against every manager across every season.</div></div>
</td><td width="4%"></td>
<td width="48%" valign="top" style="padding-left:6px;">
  <div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">📈</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Daily Line Graph</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">See how your win probability moved every single day of the matchup week.</div></div>
  <div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">🗣️</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Daily Receipts</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Know which players moved the needle so you always have something to say.</div></div>
</td>
</tr></table>

<!-- SPORT COVERAGE -->
<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.22);border-radius:10px;padding:14px 16px;margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#fbbf24;letter-spacing:0.04em;margin-bottom:6px;">&#x1F3C8; &#x26BE; &#x1F3C0; &#x1F3D2; Built for all four sports</div>
<strong style="color:#e5e7eb;">Football, baseball, basketball and hockey</strong> &#x2014; every UFD feature is built for all four, with stats, rankings and visuals tuned to how each one is actually played.
</div>

<!-- POINTS VS CATEGORY -->
<div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.22);border-radius:10px;padding:14px 16px;margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#67e8f9;letter-spacing:0.04em;margin-bottom:6px;">&#x1F4CA; Points leagues &amp; H2H category leagues</div>
<strong style="color:#e5e7eb;">Points or category</strong> &#x2014; UFD knows the difference. Standings, scoring and head-to-head are all calculated the right way for your league format, automatically.
</div>

<!-- PLATFORM SUPPORT -->
<div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.22);border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#86efac;letter-spacing:0.04em;margin-bottom:6px;">&#x1F517; Sleeper, ESPN &amp; Yahoo</div>
<strong style="color:#e5e7eb;">All three platforms supported</strong> &#x2014; once your league is connected, everything loads automatically. Nothing to upload, nothing to configure.
</div>

<hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;">
<p style="font-size:13px;color:#6b7280;font-style:italic;margin:0 0 24px;">The Matchups page updates automatically throughout the week. Open it Tuesday morning and you already have something to drop in the chat.</p>
<div style="text-align:center;margin:0 0 8px;"><a href="https://ultimatefantasydashboard.com" style="display:inline-block;background:#06b6d4;color:#0a0c14;font-size:14px;font-weight:800;letter-spacing:0.05em;padding:14px 36px;border-radius:10px;text-decoration:none;">CHECK MY MATCHUP NOW →</a></div>
<p style="font-size:11px;color:#374151;text-align:center;margin:0;">Updates daily · All leagues · ESPN, Yahoo &amp; Sleeper</p>
</td></tr>

<tr><td style="background:#080a10;padding:14px 28px;border-top:1px solid #1e2130;text-align:center;font-size:11px;color:#374151;">ultimatefantasydashboard.com &nbsp;&middot;&nbsp; <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#374151;text-decoration:none;">Unsubscribe</a></td></tr>

</table></td></tr></table></body></html>`

const DRAFT_TOOLS_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#05060a;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#05060a;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0c14;border:1px solid #1e2130;border-radius:12px;overflow:hidden;">
<!-- TRIAL NOTICE -->
<tr><td style="background:#080a10;padding:9px 28px;border-bottom:1px solid #1e2130;text-align:center;font-size:11px;color:#6b7280;line-height:1.5;">&#x1F4C5; <strong style="color:#9ca3af;font-weight:700;">Free trial only:</strong> we&#x2019;re sending you daily emails this week to show off everything UFD can do. After your trial ends, you&#x2019;ll only hear from us when there&#x2019;s something worth saying.</td></tr>
<!-- HEADER -->
<tr><td style="background:#0a0c14;border-bottom:2px solid #f59e0b;padding:16px 28px;text-align:center;"><img src="https://ultimatefantasydashboard.com/UFD_V8.png" height="26" alt="Ultimate Fantasy Dashboard" style="display:inline-block;"></td></tr>
<!-- BANNER -->
<tr><td style="background:linear-gradient(90deg,#241606,#0c1824);border-bottom:1px solid rgba(245,158,11,0.25);padding:11px 28px;text-align:center;font-size:12px;color:#fcd34d;letter-spacing:0.03em;">&#x1F4CB; Did you actually win your draft? Now you&#x2019;ll know &#x2014; pick by pick.</td></tr>
<!-- BODY -->
<tr><td style="padding:36px 32px 28px;background:#0a0c14;">
<p style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#f59e0b;margin:0 0 10px;">DRAFT TOOLS</p>
<h1 style="font-size:27px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-0.02em;margin:0 0 18px;">Your draft just got graded.</h1>
<p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 16px;">Everybody walks away from the draft thinking they crushed it. <strong style="color:#e5e7eb;">UFD Draft Tools tell you who actually did.</strong> Every pick gets a verdict. Every team gets a grade. Steals, hits, misses and busts &#x2014; the whole draft, scored against where players actually finished the season.</p>

<!-- TEAM GRADES -->
<p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 10px;">&#x1F3C5; Team grades &#x2014; who nailed the draft?</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
<tr>
<td width="32%" valign="top" style="background:#11131a;border:1px solid rgba(34,197,94,0.35);border-radius:10px;padding:12px 10px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="top"><div style="font-size:9px;color:#fbbf24;font-weight:800;background:#1c1408;border:1px solid rgba(245,158,11,0.4);border-radius:10px;padding:2px 6px;display:inline-block;">#1</div><div style="font-size:12px;font-weight:800;color:#fff;margin-top:6px;line-height:1.2;">Wild Rotos</div><div style="font-size:9px;color:#6b7280;margin-top:2px;">14 picks &middot; +9.0</div></td>
<td align="right" valign="top"><div style="font-size:24px;font-weight:900;color:#22c55e;line-height:1;">A+</div></td>
</tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;font-size:9px;text-align:center;"><tr>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#22c55e;">3</div><div style="color:#6b7280;text-transform:uppercase;">Steals</div></td>
<td width="3"></td>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#86efac;">2</div><div style="color:#6b7280;text-transform:uppercase;">Hits</div></td>
<td width="3"></td>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#eab308;">0</div><div style="color:#6b7280;text-transform:uppercase;">Miss</div></td>
<td width="3"></td>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#ef4444;">2</div><div style="color:#6b7280;text-transform:uppercase;">Bust</div></td>
</tr></table>
<div style="margin-top:10px;font-size:9px;color:#9ca3af;">Early Round Hit Rate <strong style="color:#22c55e;float:right;">60%</strong></div>
</td>
<td width="2%"></td>
<td width="32%" valign="top" style="background:#11131a;border:1px solid rgba(134,239,172,0.25);border-radius:10px;padding:12px 10px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="top"><div style="font-size:9px;color:#fbbf24;font-weight:800;background:#1c1408;border:1px solid rgba(245,158,11,0.4);border-radius:10px;padding:2px 6px;display:inline-block;">#2</div><div style="font-size:12px;font-weight:800;color:#fff;margin-top:6px;line-height:1.2;">Crazy Eights</div><div style="font-size:9px;color:#6b7280;margin-top:2px;">14 picks &middot; +3.3</div></td>
<td align="right" valign="top"><div style="font-size:24px;font-weight:900;color:#86efac;line-height:1;">A-</div></td>
</tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;font-size:9px;text-align:center;"><tr>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#22c55e;">4</div><div style="color:#6b7280;text-transform:uppercase;">Steals</div></td>
<td width="3"></td>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#86efac;">2</div><div style="color:#6b7280;text-transform:uppercase;">Hits</div></td>
<td width="3"></td>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#eab308;">1</div><div style="color:#6b7280;text-transform:uppercase;">Miss</div></td>
<td width="3"></td>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#ef4444;">2</div><div style="color:#6b7280;text-transform:uppercase;">Bust</div></td>
</tr></table>
<div style="margin-top:10px;font-size:9px;color:#9ca3af;">Early Round Hit Rate <strong style="color:#eab308;float:right;">40%</strong></div>
</td>
<td width="2%"></td>
<td width="32%" valign="top" style="background:#11131a;border:1px solid rgba(234,179,8,0.25);border-radius:10px;padding:12px 10px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td valign="top"><div style="font-size:9px;color:#fbbf24;font-weight:800;background:#1c1408;border:1px solid rgba(245,158,11,0.4);border-radius:10px;padding:2px 6px;display:inline-block;">#3</div><div style="font-size:12px;font-weight:800;color:#fff;margin-top:6px;line-height:1.2;">The Hot Corner</div><div style="font-size:9px;color:#6b7280;margin-top:2px;">14 picks &middot; +1.8</div></td>
<td align="right" valign="top"><div style="font-size:24px;font-weight:900;color:#86efac;line-height:1;">B+</div></td>
</tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;font-size:9px;text-align:center;"><tr>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#22c55e;">1</div><div style="color:#6b7280;text-transform:uppercase;">Steals</div></td>
<td width="3"></td>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#86efac;">1</div><div style="color:#6b7280;text-transform:uppercase;">Hits</div></td>
<td width="3"></td>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#eab308;">2</div><div style="color:#6b7280;text-transform:uppercase;">Miss</div></td>
<td width="3"></td>
<td style="background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:5px 0;"><div style="font-size:13px;font-weight:900;color:#ef4444;">1</div><div style="color:#6b7280;text-transform:uppercase;">Bust</div></td>
</tr></table>
<div style="margin-top:10px;font-size:9px;color:#9ca3af;">Early Round Hit Rate <strong style="color:#eab308;float:right;">40%</strong></div>
</td>
</tr>
</table>

<!-- DRAFT BOARD MINI -->
<p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 8px;">&#x1F9ED; The full draft board, rebuilt with value baked in</p>
<p style="font-size:12px;color:#9ca3af;margin:0 0 12px;line-height:1.55;">Every pick is color-coded by value. Green means you got more than you paid for. Red means you reached. The number under each player is the difference between where they were drafted and where they actually finished.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#11131a;border:1px solid #1e2130;border-radius:12px;overflow:hidden;margin:0 0 20px;">
<tr><td style="padding:10px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="33%" valign="top" style="padding:0 3px;"><div style="text-align:center;font-size:10px;font-weight:800;color:#fff;padding-bottom:4px;">Wild Rotos</div><div style="text-align:center;font-size:11px;font-weight:900;color:#22c55e;padding-bottom:6px;">A+</div></td>
<td width="33%" valign="top" style="padding:0 3px;"><div style="text-align:center;font-size:10px;font-weight:800;color:#fff;padding-bottom:4px;">Crazy Eights</div><div style="text-align:center;font-size:11px;font-weight:900;color:#86efac;padding-bottom:6px;">A-</div></td>
<td width="33%" valign="top" style="padding:0 3px;"><div style="text-align:center;font-size:10px;font-weight:800;color:#fff;padding-bottom:4px;">Juggernauts</div><div style="text-align:center;font-size:11px;font-weight:900;color:#eab308;padding-bottom:6px;">C+</div></td>
</tr>
<tr>
<td valign="top" style="padding:0 3px 6px;"><div style="background:#0a1a0e;border:1px solid rgba(34,197,94,0.4);border-radius:6px;padding:6px 8px;"><div style="font-size:10px;color:#9ca3af;">Pick #2</div><div style="font-size:11px;color:#fff;font-weight:700;">Top WR</div><div style="font-size:9px;color:#22c55e;font-weight:800;margin-top:2px;">+20.0</div></div></td>
<td valign="top" style="padding:0 3px 6px;"><div style="background:#0a1a0e;border:1px solid rgba(34,197,94,0.4);border-radius:6px;padding:6px 8px;"><div style="font-size:10px;color:#9ca3af;">Pick #1</div><div style="font-size:11px;color:#fff;font-weight:700;">Elite RB</div><div style="font-size:9px;color:#22c55e;font-weight:800;margin-top:2px;">+15.5</div></div></td>
<td valign="top" style="padding:0 3px 6px;"><div style="background:#1a0a0a;border:1px solid rgba(239,68,68,0.4);border-radius:6px;padding:6px 8px;"><div style="font-size:10px;color:#9ca3af;">Pick #3</div><div style="font-size:11px;color:#fff;font-weight:700;">Top WR</div><div style="font-size:9px;color:#ef4444;font-weight:800;margin-top:2px;">&#x2212;37.5</div></div></td>
</tr>
<tr>
<td valign="top" style="padding:0 3px 6px;"><div style="background:#0a1a0e;border:1px solid rgba(34,197,94,0.4);border-radius:6px;padding:6px 8px;"><div style="font-size:10px;color:#9ca3af;">Pick #19</div><div style="font-size:11px;color:#fff;font-weight:700;">QB1</div><div style="font-size:9px;color:#22c55e;font-weight:800;margin-top:2px;">+33.0</div></div></td>
<td valign="top" style="padding:0 3px 6px;"><div style="background:#1a1408;border:1px solid rgba(234,179,8,0.4);border-radius:6px;padding:6px 8px;"><div style="font-size:10px;color:#9ca3af;">Pick #20</div><div style="font-size:11px;color:#fff;font-weight:700;">RB</div><div style="font-size:9px;color:#eab308;font-weight:800;margin-top:2px;">&#x2212;7.5</div></div></td>
<td valign="top" style="padding:0 3px 6px;"><div style="background:#1a0a0a;border:1px solid rgba(239,68,68,0.4);border-radius:6px;padding:6px 8px;"><div style="font-size:10px;color:#9ca3af;">Pick #18</div><div style="font-size:11px;color:#fff;font-weight:700;">RB</div><div style="font-size:9px;color:#ef4444;font-weight:800;margin-top:2px;">&#x2212;85.0</div></div></td>
</tr>
<tr>
<td valign="top" style="padding:0 3px;"><div style="background:#0a1a0e;border:1px solid rgba(34,197,94,0.4);border-radius:6px;padding:6px 8px;"><div style="font-size:10px;color:#9ca3af;">Pick #38</div><div style="font-size:11px;color:#fff;font-weight:700;">RB</div><div style="font-size:9px;color:#22c55e;font-weight:800;margin-top:2px;">+48.0</div></div></td>
<td valign="top" style="padding:0 3px;"><div style="background:#0a1a0e;border:1px solid rgba(34,197,94,0.4);border-radius:6px;padding:6px 8px;"><div style="font-size:10px;color:#9ca3af;">Pick #43</div><div style="font-size:11px;color:#fff;font-weight:700;">WR</div><div style="font-size:9px;color:#22c55e;font-weight:800;margin-top:2px;">+20.0</div></div></td>
<td valign="top" style="padding:0 3px;"><div style="background:#1a0a0a;border:1px solid rgba(239,68,68,0.4);border-radius:6px;padding:6px 8px;"><div style="font-size:10px;color:#9ca3af;">Pick #42</div><div style="font-size:11px;color:#fff;font-weight:700;">RB</div><div style="font-size:9px;color:#ef4444;font-weight:800;margin-top:2px;">&#x2212;21.5</div></div></td>
</tr>
</table>
</td></tr></table>

<!-- PICK BY PICK VERDICTS -->
<p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 8px;">&#x1F50D; Pick-by-pick verdicts &#x2014; every pick scored</p>
<p style="font-size:12px;color:#9ca3af;margin:0 0 12px;line-height:1.55;">Every pick gets a tier (where it was drafted) vs. where the player actually finished, plus a verdict and a letter grade. Sort by pick, by team, by best steals, or by worst busts &#x2014; whatever you want to argue about.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#11131a;border:1px solid #1e2130;border-radius:12px;overflow:hidden;margin:0 0 20px;">
<tr style="background:#0a0c14;border-bottom:1px solid #1e2130;">
<td style="font-size:9px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:8px 12px;">Pick</td>
<td style="font-size:9px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:8px 6px;">Team</td>
<td align="center" style="font-size:9px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:8px 6px;">Verdict</td>
<td align="right" style="font-size:9px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:8px 12px;">Grade</td>
</tr>
<tr style="border-bottom:1px solid #0f1017;">
<td style="font-size:11px;color:#9ca3af;padding:9px 12px;">1.1</td>
<td style="font-size:11px;color:#e5e7eb;padding:9px 6px;">Crazy Eights</td>
<td align="center" style="padding:9px 6px;"><span style="font-size:9px;font-weight:800;color:#fca5a5;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.35);border-radius:10px;padding:2px 6px;">&#x1F4A5; DISASTER</span></td>
<td align="right" style="font-size:13px;font-weight:900;color:#ef4444;padding:9px 12px;">F</td>
</tr>
<tr style="border-bottom:1px solid #0f1017;">
<td style="font-size:11px;color:#9ca3af;padding:9px 12px;">1.2</td>
<td style="font-size:11px;color:#e5e7eb;padding:9px 6px;">Wild Rotos</td>
<td align="center" style="padding:9px 6px;"><span style="font-size:9px;font-weight:800;color:#86efac;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);border-radius:10px;padding:2px 6px;">&#x2705; STEAL</span></td>
<td align="right" style="font-size:13px;font-weight:900;color:#22c55e;padding:9px 12px;">A+</td>
</tr>
<tr style="border-bottom:1px solid #0f1017;">
<td style="font-size:11px;color:#9ca3af;padding:9px 12px;">1.3</td>
<td style="font-size:11px;color:#e5e7eb;padding:9px 6px;">The Hot Corner</td>
<td align="center" style="padding:9px 6px;"><span style="font-size:9px;font-weight:800;color:#fde68a;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.35);border-radius:10px;padding:2px 6px;">&#x274C; MISS</span></td>
<td align="right" style="font-size:13px;font-weight:900;color:#eab308;padding:9px 12px;">C+</td>
</tr>
<tr style="border-bottom:1px solid #0f1017;">
<td style="font-size:11px;color:#9ca3af;padding:9px 12px;">1.4</td>
<td style="font-size:11px;color:#e5e7eb;padding:9px 6px;">Juggernauts</td>
<td align="center" style="padding:9px 6px;"><span style="font-size:9px;font-weight:800;color:#86efac;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);border-radius:10px;padding:2px 6px;">&#x2705; HIT</span></td>
<td align="right" style="font-size:13px;font-weight:900;color:#86efac;padding:9px 12px;">A-</td>
</tr>
<tr>
<td style="font-size:11px;color:#9ca3af;padding:9px 12px;">1.5</td>
<td style="font-size:11px;color:#e5e7eb;padding:9px 6px;">Pink Panther</td>
<td align="center" style="padding:9px 6px;"><span style="font-size:9px;font-weight:800;color:#cbd5e1;background:rgba(148,163,184,0.12);border:1px solid rgba(148,163,184,0.35);border-radius:10px;padding:2px 6px;">&#x1F538; SOLID</span></td>
<td align="right" style="font-size:13px;font-weight:900;color:#86efac;padding:9px 12px;">B</td>
</tr>
</table>

<!-- FEATURE CARDS -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
<tr>
<td width="48%" valign="top" style="padding-right:6px;">
<div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F9ED;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Full Draft Board</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Every pick, every team, every round &#x2014; rebuilt with positional value baked in.</div></div>
<div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F3AF;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Steal &amp; Bust Finder</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">The biggest values and the worst overdrafts in your league, instantly sorted.</div></div>
</td>
<td width="4%"></td>
<td width="48%" valign="top" style="padding-left:6px;">
<div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F4CA;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Team Deep Dive</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Click any team to see every pick they made and the verdict on each one.</div></div>
<div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F4C5;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Any Past Season</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Re-grade old drafts and finally settle who&#x2019;s actually been drafting well for years.</div></div>
</td>
</tr>
</table>

<!-- SPORT COVERAGE -->
<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.22);border-radius:10px;padding:14px 16px;margin:0 0 14px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#fbbf24;letter-spacing:0.04em;margin-bottom:6px;">&#x1F3C8; &#x26BE; &#x1F3C0; &#x1F3D2; Built for all four sports</div>
<strong style="color:#e5e7eb;">Football, baseball, basketball and hockey</strong> &#x2014; positional value, replacement level, and end-of-season finishes are calculated separately for each sport, so a 1.4 RB and a 1.4 SS are graded against the right pool of players.
</div>

<!-- POINTS VS CATEGORY -->
<div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.22);border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#67e8f9;letter-spacing:0.04em;margin-bottom:6px;">&#x1F4CA; Points leagues &amp; H2H category leagues</div>
In a <strong style="color:#e5e7eb;">points league</strong>, picks are graded against final-season points totals. In a <strong style="color:#e5e7eb;">category league</strong>, they&#x2019;re graded against contribution across the categories your league actually counts &#x2014; not a generic ranking. Either way, the verdict fits your format.
</div>

<hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;">
<p style="font-size:13px;color:#6b7280;font-style:italic;margin:0 0 24px;">Draft Tools work the same on <strong style="color:#9ca3af;">Sleeper, ESPN, and Yahoo</strong>. Once your league is connected, your draft is already loaded and graded &#x2014; nothing to upload.</p>
<div style="text-align:center;margin:0 0 8px;"><a href="https://ultimatefantasydashboard.com" style="display:inline-block;background:#f59e0b;color:#0a0c14;font-size:14px;font-weight:800;letter-spacing:0.05em;padding:14px 36px;border-radius:10px;text-decoration:none;">GRADE MY DRAFT &#x2192;</a></div>
<p style="font-size:11px;color:#374151;text-align:center;margin:0;">ESPN &middot; Yahoo &middot; Sleeper &middot; Football, Baseball, Basketball, Hockey</p>
</td></tr>
<!-- FOOTER -->
<tr><td style="background:#080a10;padding:14px 28px;border-top:1px solid #1e2130;text-align:center;font-size:11px;color:#374151;">ultimatefantasydashboard.com &nbsp;&middot;&nbsp; <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#374151;text-decoration:none;">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`

const TRIAL_ENDING_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#05060a;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#05060a;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0c14;border:1px solid #1e2130;border-radius:12px;overflow:hidden;">
<!-- TRIAL NOTICE -->
<tr><td style="background:#080a10;padding:9px 28px;border-bottom:1px solid #1e2130;text-align:center;font-size:11px;color:#6b7280;line-height:1.5;">&#x23F0; Your free trial ends in <strong style="color:#f59e0b;font-weight:700;">2 days</strong>. Here&#x2019;s what you&#x2019;ll lose access to.</td></tr>
<!-- HEADER -->
<tr><td style="background:#0a0c14;border-bottom:2px solid #f59e0b;padding:16px 28px;text-align:center;"><img src="https://ultimatefantasydashboard.com/UFD_V8.png" height="26" alt="Ultimate Fantasy Dashboard" style="display:inline-block;"></td></tr>
<!-- BANNER -->
<tr><td style="background:linear-gradient(90deg,#241606,#1a0c06);border-bottom:1px solid rgba(245,158,11,0.25);padding:11px 28px;text-align:center;font-size:12px;color:#fcd34d;letter-spacing:0.03em;">&#x23F3; Your league&#x2019;s analytics go dark in 48 hours</td></tr>
<!-- BODY -->
<tr><td style="padding:36px 32px 28px;background:#0a0c14;">
<p style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#f59e0b;margin:0 0 10px;">DON&#x2019;T LOSE ACCESS</p>
<h1 style="font-size:27px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-0.02em;margin:0 0 18px;">Everything goes dark in 48 hours.</h1>
<p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 16px;">You&#x2019;ve had full access to your league&#x2019;s analytics all week. Power rankings, win probability, draft grades, full league history &#x2014; all of it. In two days, <strong style="color:#e5e7eb;">it all goes away unless you upgrade.</strong></p>
<p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 10px;">&#x1F4CB; Here&#x2019;s what you&#x2019;ve been using:</p>
<!-- FEATURE RECAP — 4 cards -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
<tr>
<td width="48%" valign="top" style="padding-right:6px;">
<div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F3C6;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Power Rankings</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Weekly algorithm combining record, points, all-play, form and consistency.</div></div>
<div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F4DC;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">League History</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">All-time records, H2H matrix, Tale of the Tape, career awards.</div></div>
</td>
<td width="4%"></td>
<td width="48%" valign="top" style="padding-left:6px;">
<div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">&#x26A1;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Win Probability</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Monte Carlo simulation updated daily &#x2014; real odds, not vibes.</div></div>
<div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F4CB;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Draft Grades</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Pick-by-pick verdicts, team grades, steals and busts.</div></div>
</td>
</tr>
</table>
<div style="background:rgba(6,182,212,0.08);border:1px solid rgba(6,182,212,0.25);border-radius:10px;padding:16px 18px;margin:0 0 20px;"><span style="font-size:22px;">&#x1F4F2;</span>&nbsp;&nbsp;<span style="font-size:13px;color:#9ca3af;line-height:1.6;"><strong style="color:#06b6d4;">Plus shareable graphics for the group chat.</strong> One tap to download a branded card. Nothing starts a league argument faster.</span></div>
<!-- PRICING -->
<p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 10px;">&#x1F4B0; Two ways to keep access:</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
<tr>
<td width="48%" valign="top" style="padding-right:6px;">
<div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.25);border-radius:10px;padding:16px;">
<div style="font-size:12px;font-weight:800;color:#22c55e;letter-spacing:0.04em;margin-bottom:6px;">INDIVIDUAL</div>
<div style="font-size:28px;font-weight:900;color:#fff;">$4<span style="font-size:14px;font-weight:600;color:#9ca3af;">/mo</span></div>
<div style="font-size:11px;color:#6b7280;margin-top:4px;">billed annually at $49/yr</div>
<div style="font-size:11px;color:#9ca3af;margin-top:8px;line-height:1.5;">All your leagues. All sports. Just you.</div>
</div>
</td>
<td width="4%"></td>
<td width="48%" valign="top" style="padding-left:6px;">
<div style="background:rgba(234,179,8,0.06);border:1px solid rgba(234,179,8,0.25);border-radius:10px;padding:16px;">
<div style="font-size:12px;font-weight:800;color:#eab308;letter-spacing:0.04em;margin-bottom:6px;">LEAGUE PASS</div>
<div style="font-size:28px;font-weight:900;color:#fff;">$29<span style="font-size:14px;font-weight:600;color:#9ca3af;"> once</span></div>
<div style="font-size:11px;color:#6b7280;margin-top:4px;">one league, 365 days, everyone included</div>
<div style="font-size:11px;color:#9ca3af;margin-top:8px;line-height:1.5;">Buy it once. Your whole league gets in.</div>
</div>
</td>
</tr>
</table>
<!-- SPORT COVERAGE -->
<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.22);border-radius:10px;padding:14px 16px;margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#fbbf24;letter-spacing:0.04em;margin-bottom:6px;">&#x1F3C8; &#x26BE; &#x1F3C0; &#x1F3D2; Built for all four sports</div>
<strong style="color:#e5e7eb;">Football, baseball, basketball and hockey</strong> &#x2014; every UFD feature is built for all four, with stats, rankings and visuals tuned to how each one is actually played.
</div>
<div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.22);border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#86efac;letter-spacing:0.04em;margin-bottom:6px;">&#x1F517; Sleeper, ESPN &amp; Yahoo</div>
<strong style="color:#e5e7eb;">All three platforms supported</strong> &#x2014; once your league is connected, everything loads automatically.
</div>
<hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;">
<p style="font-size:13px;color:#6b7280;font-style:italic;margin:0 0 24px;">Your league is still playing. Your analytics are still running. The only question is whether you&#x2019;ll still be able to see them after Thursday.</p>
<div style="text-align:center;margin:0 0 8px;"><a href="https://ultimatefantasydashboard.com/pricing" style="display:inline-block;background:#f59e0b;color:#0a0c14;font-size:14px;font-weight:800;letter-spacing:0.05em;padding:14px 36px;border-radius:10px;text-decoration:none;">KEEP MY ACCESS &#x2192;</a></div>
<p style="font-size:11px;color:#374151;text-align:center;margin:0;">Individual $4/mo &middot; League Pass $29 &middot; Cancel anytime</p>
</td></tr>
<!-- FOOTER -->
<tr><td style="background:#080a10;padding:14px 28px;border-top:1px solid #1e2130;text-align:center;font-size:11px;color:#374151;">ultimatefantasydashboard.com &nbsp;&middot;&nbsp; <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#374151;text-decoration:none;">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`

const TRIAL_EXPIRED_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#05060a;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#05060a;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0c14;border:1px solid #1e2130;border-radius:12px;overflow:hidden;">
<!-- HEADER -->
<tr><td style="background:#0a0c14;border-bottom:2px solid #22c55e;padding:16px 28px;text-align:center;"><img src="https://ultimatefantasydashboard.com/UFD_V8.png" height="26" alt="Ultimate Fantasy Dashboard" style="display:inline-block;"></td></tr>
<!-- BANNER -->
<tr><td style="background:linear-gradient(90deg,#0a0c14,#0c1824);border-bottom:1px solid rgba(34,197,94,0.15);padding:11px 28px;text-align:center;font-size:12px;color:#9ca3af;letter-spacing:0.03em;">&#x23F8;&#xFE0F; Your free trial ended &#x2014; your league data is still here</td></tr>
<!-- BODY -->
<tr><td style="padding:36px 32px 28px;background:#0a0c14;">
<p style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#22c55e;margin:0 0 10px;">PICK UP WHERE YOU LEFT OFF</p>
<h1 style="font-size:27px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-0.02em;margin:0 0 18px;">Your league is still playing. You&#x2019;re just not watching.</h1>
<p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 16px;">Your power rankings are still updating every week. Win probability still runs every day. Your league history is still growing. <strong style="color:#e5e7eb;">You just can&#x2019;t see any of it.</strong></p>
<p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 20px;">We&#x2019;re not going to pretend you forgot &#x2014; you know what UFD does. We shipped a lot during your trial week. Here&#x2019;s what&#x2019;s waiting if you come back:</p>
<!-- WHAT'S WAITING — mini recap cards -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#11131a;border:1px solid #1e2130;border-radius:12px;overflow:hidden;margin:0 0 20px;">
<tr><td style="background:#080a10;padding:10px 16px;border-bottom:1px solid #1e2130;"><div style="font-size:11px;font-weight:700;color:#4b5563;letter-spacing:0.1em;text-transform:uppercase;">&#x1F513; What you&#x2019;re missing right now</div></td></tr>
<tr><td style="padding:14px 16px;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:8px 0;border-bottom:1px solid #0f1017;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="34" style="font-size:18px;text-align:center;">&#x1F3C6;</td>
<td style="padding-left:10px;"><div style="font-size:13px;font-weight:700;color:#e5e7eb;">Power Rankings</div><div style="font-size:11px;color:#6b7280;">Updated every week. Your league&#x2019;s real #1 might surprise you.</div></td>
<td width="50" align="right" style="font-size:11px;font-weight:700;color:#f59e0b;">LOCKED</td>
</tr></table>
</td>
</tr>
<tr>
<td style="padding:8px 0;border-bottom:1px solid #0f1017;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="34" style="font-size:18px;text-align:center;">&#x26A1;</td>
<td style="padding-left:10px;"><div style="font-size:13px;font-weight:700;color:#e5e7eb;">Win Probability</div><div style="font-size:11px;color:#6b7280;">Monte Carlo odds running daily. Your current matchup has a number.</div></td>
<td width="50" align="right" style="font-size:11px;font-weight:700;color:#f59e0b;">LOCKED</td>
</tr></table>
</td>
</tr>
<tr>
<td style="padding:8px 0;border-bottom:1px solid #0f1017;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="34" style="font-size:18px;text-align:center;">&#x1F4CB;</td>
<td style="padding-left:10px;"><div style="font-size:13px;font-weight:700;color:#e5e7eb;">Draft Grades</div><div style="font-size:11px;color:#6b7280;">Your draft has been graded. Steals, busts, and verdicts are waiting.</div></td>
<td width="50" align="right" style="font-size:11px;font-weight:700;color:#f59e0b;">LOCKED</td>
</tr></table>
</td>
</tr>
<tr>
<td style="padding:8px 0;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td width="34" style="font-size:18px;text-align:center;">&#x1F4DC;</td>
<td style="padding-left:10px;"><div style="font-size:13px;font-weight:700;color:#e5e7eb;">League History</div><div style="font-size:11px;color:#6b7280;">Every season, every rivalry, every title. The receipts keep growing.</div></td>
<td width="50" align="right" style="font-size:11px;font-weight:700;color:#f59e0b;">LOCKED</td>
</tr></table>
</td>
</tr>
</table>
</td></tr>
</table>
<!-- PRICING -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
<tr>
<td width="48%" valign="top" style="padding-right:6px;">
<div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.25);border-radius:10px;padding:16px;">
<div style="font-size:12px;font-weight:800;color:#22c55e;letter-spacing:0.04em;margin-bottom:6px;">INDIVIDUAL</div>
<div style="font-size:28px;font-weight:900;color:#fff;">$4<span style="font-size:14px;font-weight:600;color:#9ca3af;">/mo</span></div>
<div style="font-size:11px;color:#6b7280;margin-top:4px;">billed annually at $49/yr</div>
<div style="font-size:11px;color:#9ca3af;margin-top:8px;line-height:1.5;">All your leagues. All sports. Just you.</div>
</div>
</td>
<td width="4%"></td>
<td width="48%" valign="top" style="padding-left:6px;">
<div style="background:rgba(234,179,8,0.06);border:1px solid rgba(234,179,8,0.25);border-radius:10px;padding:16px;">
<div style="font-size:12px;font-weight:800;color:#eab308;letter-spacing:0.04em;margin-bottom:6px;">LEAGUE PASS</div>
<div style="font-size:28px;font-weight:900;color:#fff;">$29<span style="font-size:14px;font-weight:600;color:#9ca3af;"> once</span></div>
<div style="font-size:11px;color:#6b7280;margin-top:4px;">one league, 365 days, everyone included</div>
<div style="font-size:11px;color:#9ca3af;margin-top:8px;line-height:1.5;">Buy it once. Your whole league gets in.</div>
</div>
</td>
</tr>
</table>
<!-- SPORT COVERAGE -->
<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.22);border-radius:10px;padding:14px 16px;margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#fbbf24;letter-spacing:0.04em;margin-bottom:6px;">&#x1F3C8; &#x26BE; &#x1F3C0; &#x1F3D2; Built for all four sports</div>
<strong style="color:#e5e7eb;">Football, baseball, basketball and hockey</strong> &#x2014; every UFD feature is built for all four, with stats, rankings and visuals tuned to how each one is actually played.
</div>
<div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.22);border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#86efac;letter-spacing:0.04em;margin-bottom:6px;">&#x1F517; Sleeper, ESPN &amp; Yahoo</div>
<strong style="color:#e5e7eb;">All three platforms supported</strong> &#x2014; once your league is connected, everything loads automatically.
</div>
<hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;">
<p style="font-size:13px;color:#6b7280;font-style:italic;margin:0 0 24px;">Nothing to re-connect. Nothing to set up again. Your league data is saved &#x2014; just pick up where you left off.</p>
<div style="text-align:center;margin:0 0 8px;"><a href="https://ultimatefantasydashboard.com/pricing" style="display:inline-block;background:#22c55e;color:#0a0c14;font-size:14px;font-weight:800;letter-spacing:0.05em;padding:14px 36px;border-radius:10px;text-decoration:none;">UNLOCK MY LEAGUE &#x2192;</a></div>
<p style="font-size:11px;color:#374151;text-align:center;margin:0;">Individual $4/mo &middot; League Pass $29 &middot; Cancel anytime</p>
</td></tr>
<!-- FOOTER -->
<tr><td style="background:#080a10;padding:14px 28px;border-top:1px solid #1e2130;text-align:center;font-size:11px;color:#374151;">ultimatefantasydashboard.com &nbsp;&middot;&nbsp; <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#374151;text-decoration:none;">Unsubscribe</a></td></tr>
</table></td></tr></table></body></html>`

const EMAIL_SERIES = [
  {
    id: 'onboarding',
    label: '📬 Onboarding — No League Connected',
    emails: [
      { id: 'no_leagues', name: '👀 No Leagues Connected', subject: 'You signed up but never connected a league 👀', preview: 'It takes about 60 seconds. Here is exactly how to do it.', html: NO_LEAGUES_HTML },
      { id: 'free_trial_invite', name: '🎁 Free Trial Invite (pre-trial users)', subject: 'We just gave you 7 days of full access — for free 🎁', preview: 'Connect as many leagues as you want. No credit card. No catch.', html: FREE_TRIAL_HTML },
    ]
  },
  {
    id: 'trial_series',
    label: '🏆 Free Trial Education Series',
    emails: [
      { id: 'trial_welcome', name: 'Email 0 — Welcome', subject: "Welcome to Ultimate Fantasy Dashboard — here's how to get started \u{1F44B}", preview: "Connect your league, explore your dashboards, and drop your first graphic in the chat.", html: WELCOME_HTML },
      { id: 'trial_power_rankings', name: 'Email 1 — Power Rankings', subject: "Your power rankings are ready — here's how to read them 🏆", preview: "Who's actually winning your league? It's not always who you think.", html: POWER_RANKINGS_HTML },
      { id: 'trial_matchups', name: 'Email 2 — Matchup Analytics', subject: "Your matchup is live — here's what's actually happening ⚡", preview: "Real-time win probability. Daily comebacks. A week's worth of trash talk ammunition.", html: MATCHUP_HTML },
      { id: 'trial_league_history', name: 'Email 3 — League History', subject: "Every win. Every rivalry. The full history of your league is here 📜", preview: "Career records, all-time awards, and who actually has your number in head-to-head.", html: LEAGUE_HISTORY_HTML },
      { id: 'trial_draft_tools', name: 'Email 4 — Draft Tools', subject: "Your draft just got graded — pick by pick 📋", preview: "Team grades, pick verdicts, steals & busts. Did you actually win the draft?", html: DRAFT_TOOLS_HTML },
      { id: 'trial_ending', name: 'Email 5 — Trial Ending Soon', subject: "Your free trial ends in 2 days — here's everything you'd lose 📊", preview: "Power rankings, win probability, draft grades, league history — all going dark.", html: TRIAL_ENDING_HTML },
      { id: 'trial_expired', name: 'Email 6 — Trial Expired', subject: "Your trial ended — but your league data is still here ⏸️", preview: "Everything we built for your league is saved. Pick up where you left off.", html: TRIAL_EXPIRED_HTML },
    ]
  },
]


const LEAGUE_HISTORY_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#05060a;font-family:Helvetica Neue,Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#05060a;"><tr><td align="center" style="padding:24px 16px;"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0a0c14;border:1px solid #1e2130;border-radius:12px;overflow:hidden;"><tr><td style="background:#080a10;padding:9px 28px;border-bottom:1px solid #1e2130;text-align:center;font-size:11px;color:#6b7280;line-height:1.5;">&#x1F4C5; <strong style="color:#9ca3af;font-weight:700;">Free trial only:</strong> we&#x2019;re sending you daily emails this week to show off everything UFD can do. After your trial ends, you&#x2019;ll only hear from us when there&#x2019;s something worth saying.</td></tr><!-- HEADER --><tr><td style="background:#0a0c14;border-bottom:2px solid #22c55e;padding:16px 28px;text-align:center;"><img src="https://ultimatefantasydashboard.com/UFD_V8.png" height="26" alt="Ultimate Fantasy Dashboard" style="display:inline-block;"></td></tr><!-- BANNER --><tr><td style="background:linear-gradient(90deg,#0a1f0f,#0c1824);border-bottom:1px solid rgba(34,197,94,0.2);padding:11px 28px;text-align:center;font-size:12px;color:#86efac;letter-spacing:0.03em;">&#x1F4DC; Every win. Every rivalry. Every title. All in one place.</td></tr><!-- BODY --><tr><td style="padding:36px 32px 28px;background:#0a0c14;"><p style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#22c55e;margin:0 0 10px;">LEAGUE HISTORY</p><h1 style="font-size:27px;font-weight:900;color:#fff;line-height:1.1;letter-spacing:-0.02em;margin:0 0 18px;">Who actually runs your league? The receipts are in.</h1><p style="font-size:14px;color:#9ca3af;line-height:1.75;margin:0 0 16px;">Everybody has an opinion about who the best manager is. <strong style="color:#e5e7eb;">UFD League History settles it.</strong> Career records, all-time leaders, head-to-head breakdowns, and awards handed out week by week and season by season &#x2014; everything your league has ever done, finally in one place.</p><!-- AWARDS SECTION --><p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 10px;">&#x1F3C5; Awards &#x2014; weekly, seasonal &amp; all-time</p><table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td width="48%" valign="top" style="padding-right:6px;"><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">&#x26A1;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Weekly Awards</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Highest scorer, biggest blowout, luckiest win &#x2014; recognized every single week.</div></div><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F3C6;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Season Awards</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Points champion, most consistent, best record &#x2014; who owned each season.</div></div></td><td width="4%"></td><td width="48%" valign="top" style="padding-left:6px;"><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;margin-bottom:10px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F451;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">All-Time Awards</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Career win %, most championships, all-time scoring leader across every season.</div></div><div style="background:#11131a;border:1px solid #1e2130;border-radius:10px;padding:14px;"><div style="font-size:20px;margin-bottom:6px;">&#x1F4CA;</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:3px;">Points vs Category</div><div style="font-size:11px;color:#6b7280;line-height:1.5;">Awards built for your league type &#x2014; scoring totals for points leagues, category dominance for H2H.</div></div></td></tr></table><!-- TALE OF THE TAPE — All-time matchup comparison --><p style="font-size:12px;color:#9ca3af;margin:0 0 12px;line-height:1.55;">Drop any two managers in your league side-by-side and see the receipts. Career records, championships, head-to-head margin, biggest blowouts &#x2014; the whole story.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#11131a;border:1px solid #1e2130;border-radius:12px;overflow:hidden;margin:0 0 12px;"><tr><td style="padding:14px 16px 6px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:14px;font-weight:800;color:#fff;">&#x1F94A; Tale of the Tape</td><td align="right" style="font-size:11px;color:#6b7280;">All-time comparison</td></tr></table></td></tr><tr><td style="padding:6px 14px 14px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><!-- TEAM 1 --><td width="42%" valign="top" style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.3);border-radius:10px;padding:14px 12px;"><div style="text-align:center;margin-bottom:10px;"><div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:rgba(6,182,212,0.18);border:2px solid #06b6d4;line-height:46px;font-size:22px;">&#x1F3B1;</div><div style="font-size:13px;font-weight:800;color:#fff;margin-top:6px;">Crazy Eights</div></div><table width="100%" cellpadding="0" cellspacing="0" style="font-size:11px;"><tr><td style="color:#9ca3af;padding:2px 0;">&#x1F3C6; Championships</td><td align="right" style="color:#fff;font-weight:700;">2</td></tr><tr><td style="color:#9ca3af;padding:2px 0;">&#x1F4C8; Playoff Apps</td><td align="right" style="color:#fff;font-weight:700;">5</td></tr><tr><td style="color:#9ca3af;padding:2px 0;">Record</td><td align="right" style="color:#fff;font-weight:700;">59-37</td></tr><tr><td style="color:#9ca3af;padding:2px 0;">Win %</td><td align="right" style="color:#22c55e;font-weight:800;">61.5%</td></tr><tr><td style="color:#9ca3af;padding:2px 0;">Avg PPW</td><td align="right" style="color:#fff;font-weight:700;">117.1</td></tr><tr><td style="color:#9ca3af;padding:2px 0;">Total Points</td><td align="right" style="color:#fff;font-weight:700;">11,239</td></tr></table></td><!-- VS COLUMN --><td width="16%" valign="top" align="center" style="padding:0 6px;"><div style="font-size:22px;font-weight:900;color:#9ca3af;margin-top:32px;">VS</div><div style="font-size:9px;color:#6b7280;margin-top:4px;letter-spacing:0.06em;text-transform:uppercase;">H2H Record</div><div style="font-size:18px;font-weight:900;color:#fff;margin-top:4px;">9 &#x2013; 7</div><div style="margin-top:10px;background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:6px 6px;"><div style="font-size:9px;color:#6b7280;text-transform:uppercase;">Total Meetings</div><div style="font-size:13px;font-weight:800;color:#fff;">16</div></div><div style="margin-top:6px;background:#0a0c14;border:1px solid #1e2130;border-radius:6px;padding:6px 6px;"><div style="font-size:9px;color:#6b7280;text-transform:uppercase;">Avg Margin</div><div style="font-size:13px;font-weight:800;color:#eab308;">24.9</div></div></td><!-- TEAM 2 --><td width="42%" valign="top" style="background:rgba(249,115,22,0.06);border:1px solid rgba(249,115,22,0.3);border-radius:10px;padding:14px 12px;"><div style="text-align:center;margin-bottom:10px;"><div style="display:inline-block;width:48px;height:48px;border-radius:50%;background:rgba(249,115,22,0.18);border:2px solid #f97316;line-height:46px;font-size:22px;">&#x26BE;</div><div style="font-size:13px;font-weight:800;color:#fff;margin-top:6px;">The Hot Corner</div></div><table width="100%" cellpadding="0" cellspacing="0" style="font-size:11px;"><tr><td style="color:#9ca3af;padding:2px 0;">&#x1F3C6; Championships</td><td align="right" style="color:#fff;font-weight:700;">1</td></tr><tr><td style="color:#9ca3af;padding:2px 0;">&#x1F4C8; Playoff Apps</td><td align="right" style="color:#fff;font-weight:700;">3</td></tr><tr><td style="color:#9ca3af;padding:2px 0;">Record</td><td align="right" style="color:#fff;font-weight:700;">52-44</td></tr><tr><td style="color:#9ca3af;padding:2px 0;">Win %</td><td align="right" style="color:#22c55e;font-weight:800;">54.2%</td></tr><tr><td style="color:#9ca3af;padding:2px 0;">Avg PPW</td><td align="right" style="color:#fff;font-weight:700;">120.2</td></tr><tr><td style="color:#9ca3af;padding:2px 0;">Total Points</td><td align="right" style="color:#fff;font-weight:700;">11,538</td></tr></table></td></tr></table></td></tr><!-- HIGHLIGHT BOXES --><tr><td style="padding:0 14px 14px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="32%" valign="top" style="background:#0a0c14;border:1px solid #1e2130;border-radius:8px;padding:10px;"><div style="font-size:9px;color:#fbbf24;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">&#x1F4A5; Biggest Blowout</div><div style="font-size:12px;font-weight:800;color:#fff;margin-top:4px;">Crazy Eights</div><div style="font-size:14px;font-weight:900;color:#22c55e;margin-top:2px;">99.2 points</div><div style="font-size:9px;color:#6b7280;margin-top:2px;">2019 Week 6</div></td><td width="2%"></td><td width="32%" valign="top" style="background:#0a0c14;border:1px solid #1e2130;border-radius:8px;padding:10px;"><div style="font-size:9px;color:#fbbf24;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">&#x1F3AF; Closest Game</div><div style="font-size:12px;font-weight:800;color:#fff;margin-top:4px;">The Hot Corner</div><div style="font-size:14px;font-weight:900;color:#22c55e;margin-top:2px;">1.5 points</div><div style="font-size:9px;color:#6b7280;margin-top:2px;">2024 Week 5</div></td><td width="2%"></td><td width="32%" valign="top" style="background:#0a0c14;border:1px solid #1e2130;border-radius:8px;padding:10px;"><div style="font-size:9px;color:#fbbf24;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">&#x1F525; Highest Scoring</div><div style="font-size:12px;font-weight:800;color:#fff;margin-top:4px;">306.0 total</div><div style="font-size:14px;font-weight:900;color:#22c55e;margin-top:2px;">202.6 &#x2013; 103.4</div><div style="font-size:9px;color:#6b7280;margin-top:2px;">2019 Week 6</div></td></tr></table></td></tr></table><!-- STANDINGS TABLE --><p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 8px;">&#x1F4CB; All-time standings table</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#11131a;border:1px solid #1e2130;border-radius:12px;overflow:hidden;margin:0 0 20px;"><tr style="background:#0a0c14;border-bottom:1px solid #1e2130;"><td width="45%" style="font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:8px 14px;">Manager</td><td width="20%" align="center" style="font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:8px 6px;">W-L</td><td width="20%" align="center" style="font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:8px 6px;">Win%</td><td width="15%" align="right" style="font-size:11px;color:#4b5563;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:8px 14px;">Titles</td></tr><tr style="border-bottom:1px solid #0f1017;"><td style="font-size:13px;font-weight:600;color:#e5e7eb;padding:9px 14px;">You</td><td align="center" style="font-size:12px;color:#9ca3af;padding:9px 6px;">47-29</td><td align="center" style="font-size:12px;font-weight:700;color:#22c55e;padding:9px 6px;">61.8%</td><td align="right" style="font-size:12px;font-weight:700;color:#eab308;padding:9px 14px;">2 &#x1F3C6;</td></tr><tr style="border-bottom:1px solid #0f1017;"><td style="font-size:13px;font-weight:600;color:#e5e7eb;padding:9px 14px;">Rival Manager</td><td align="center" style="font-size:12px;color:#9ca3af;padding:9px 6px;">52-24</td><td align="center" style="font-size:12px;font-weight:700;color:#22c55e;padding:9px 6px;">68.4%</td><td align="right" style="font-size:12px;font-weight:700;color:#eab308;padding:9px 14px;">3 &#x1F3C6;</td></tr><tr><td style="font-size:13px;font-weight:600;color:#e5e7eb;padding:9px 14px;">Third Manager</td><td align="center" style="font-size:12px;color:#9ca3af;padding:9px 6px;">31-45</td><td align="center" style="font-size:12px;font-weight:700;color:#ef4444;padding:9px 6px;">40.8%</td><td align="right" style="font-size:12px;color:#6b7280;padding:9px 14px;">0</td></tr></table><!-- H2H MATRIX --><p style="font-size:13px;font-weight:700;color:#fff;margin:0 0 8px;">&#x1F578;&#xFE0F; Head-to-Head Matrix &#x2014; every manager vs. every manager</p><p style="font-size:12px;color:#9ca3af;margin:0 0 12px;line-height:1.55;">One grid, every rivalry. Instantly see who owns who across every game ever played in your league. Color-coded so you know exactly where you stand against every other manager.</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#11131a;border:1px solid #1e2130;border-radius:12px;overflow:hidden;margin:0 0 20px;"><tr style="background:#0a0c14;border-bottom:1px solid #1e2130;"><td style="font-size:9px;color:#4b5563;font-weight:700;padding:7px 8px;text-transform:uppercase;letter-spacing:0.06em;">Team</td><td align="center" style="font-size:9px;color:#4b5563;font-weight:700;padding:7px 6px;">CE</td><td align="center" style="font-size:9px;color:#4b5563;font-weight:700;padding:7px 6px;">HC</td><td align="center" style="font-size:9px;color:#4b5563;font-weight:700;padding:7px 6px;">WR</td><td align="center" style="font-size:9px;color:#4b5563;font-weight:700;padding:7px 6px;">JU</td><td align="center" style="font-size:9px;color:#4b5563;font-weight:700;padding:7px 6px;">PP</td></tr><tr style="border-bottom:1px solid #0f1017;"><td style="font-size:11px;color:#e5e7eb;font-weight:600;padding:8px 10px;">Crazy Eights</td><td align="center" style="font-size:11px;color:#374151;padding:8px 6px;">&#x2014;</td><td align="center" style="font-size:11px;color:#22c55e;font-weight:700;padding:8px 6px;background:rgba(34,197,94,0.07);">9-7</td><td align="center" style="font-size:11px;color:#ef4444;font-weight:700;padding:8px 6px;background:rgba(239,68,68,0.07);">4-10</td><td align="center" style="font-size:11px;color:#ef4444;font-weight:700;padding:8px 6px;background:rgba(239,68,68,0.07);">4-6</td><td align="center" style="font-size:11px;color:#ef4444;font-weight:700;padding:8px 6px;background:rgba(239,68,68,0.07);">3-5</td></tr><tr style="border-bottom:1px solid #0f1017;"><td style="font-size:11px;color:#e5e7eb;font-weight:600;padding:8px 10px;">The Hot Corner</td><td align="center" style="font-size:11px;color:#ef4444;font-weight:700;padding:8px 6px;background:rgba(239,68,68,0.07);">7-9</td><td align="center" style="font-size:11px;color:#374151;padding:8px 6px;">&#x2014;</td><td align="center" style="font-size:11px;color:#22c55e;font-weight:700;padding:8px 6px;background:rgba(34,197,94,0.07);">10-4</td><td align="center" style="font-size:11px;color:#ef4444;font-weight:700;padding:8px 6px;background:rgba(239,68,68,0.07);">5-6</td><td align="center" style="font-size:11px;color:#22c55e;font-weight:700;padding:8px 6px;background:rgba(34,197,94,0.07);">4-3</td></tr><tr style="border-bottom:1px solid #0f1017;"><td style="font-size:11px;color:#e5e7eb;font-weight:600;padding:8px 10px;">Wild Rotos</td><td align="center" style="font-size:11px;color:#22c55e;font-weight:700;padding:8px 6px;background:rgba(34,197,94,0.07);">10-4</td><td align="center" style="font-size:11px;color:#ef4444;font-weight:700;padding:8px 6px;background:rgba(239,68,68,0.07);">4-10</td><td align="center" style="font-size:11px;color:#374151;padding:8px 6px;">&#x2014;</td><td align="center" style="font-size:11px;color:#22c55e;font-weight:700;padding:8px 6px;background:rgba(34,197,94,0.07);">9-6</td><td align="center" style="font-size:11px;color:#ef4444;font-weight:700;padding:8px 6px;background:rgba(239,68,68,0.07);">4-5</td></tr><tr style="border-bottom:1px solid #0f1017;"><td style="font-size:11px;color:#e5e7eb;font-weight:600;padding:8px 10px;">Juggernauts</td><td align="center" style="font-size:11px;color:#22c55e;font-weight:700;padding:8px 6px;background:rgba(34,197,94,0.07);">6-4</td><td align="center" style="font-size:11px;color:#22c55e;font-weight:700;padding:8px 6px;background:rgba(34,197,94,0.07);">6-5</td><td align="center" style="font-size:11px;color:#ef4444;font-weight:700;padding:8px 6px;background:rgba(239,68,68,0.07);">6-9</td><td align="center" style="font-size:11px;color:#374151;padding:8px 6px;">&#x2014;</td><td align="center" style="font-size:11px;color:#22c55e;font-weight:700;padding:8px 6px;background:rgba(34,197,94,0.07);">7-6</td></tr><tr><td style="font-size:11px;color:#e5e7eb;font-weight:600;padding:8px 10px;">Pink Panther</td><td align="center" style="font-size:11px;color:#22c55e;font-weight:700;padding:8px 6px;background:rgba(34,197,94,0.07);">5-3</td><td align="center" style="font-size:11px;color:#ef4444;font-weight:700;padding:8px 6px;background:rgba(239,68,68,0.07);">3-4</td><td align="center" style="font-size:11px;color:#22c55e;font-weight:700;padding:8px 6px;background:rgba(34,197,94,0.07);">5-4</td><td align="center" style="font-size:11px;color:#ef4444;font-weight:700;padding:8px 6px;background:rgba(239,68,68,0.07);">6-7</td><td align="center" style="font-size:11px;color:#374151;padding:8px 6px;">&#x2014;</td></tr></table><p style="font-size:11px;color:#4b5563;text-align:center;margin:-12px 0 20px;font-style:italic;">Showing 5 of 10 managers. Full league matrix on UFD.</p><!-- SPORT COVERAGE -->
<div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.22);border-radius:10px;padding:14px 16px;margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#fbbf24;letter-spacing:0.04em;margin-bottom:6px;">&#x1F3C8; &#x26BE; &#x1F3C0; &#x1F3D2; Built for all four sports</div>
<strong style="color:#e5e7eb;">Football, baseball, basketball and hockey</strong> &#x2014; every UFD feature is built for all four, with stats, rankings and visuals tuned to how each one is actually played.
</div>

<!-- POINTS VS CATEGORY -->
<div style="background:rgba(6,182,212,0.06);border:1px solid rgba(6,182,212,0.22);border-radius:10px;padding:14px 16px;margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#67e8f9;letter-spacing:0.04em;margin-bottom:6px;">&#x1F4CA; Points leagues &amp; H2H category leagues</div>
<strong style="color:#e5e7eb;">Points or category</strong> &#x2014; UFD knows the difference. Standings, scoring and head-to-head are all calculated the right way for your league format, automatically.
</div>

<!-- PLATFORM SUPPORT -->
<div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.22);border-radius:10px;padding:14px 16px;margin:0 0 20px;font-size:12px;color:#9ca3af;line-height:1.7;">
<div style="font-size:12px;font-weight:800;color:#86efac;letter-spacing:0.04em;margin-bottom:6px;">&#x1F517; Sleeper, ESPN &amp; Yahoo</div>
<strong style="color:#e5e7eb;">All three platforms supported</strong> &#x2014; once your league is connected, everything loads automatically. Nothing to upload, nothing to configure.
</div>

<hr style="border:none;border-top:1px solid #1e2130;margin:22px 0;"><p style="font-size:13px;color:#6b7280;font-style:italic;margin:0 0 24px;">Every win, every rivalry, every title &#x2014; the receipts are all waiting on UFD.</p><div style="text-align:center;margin:0 0 8px;"><a href="https://ultimatefantasydashboard.com" style="display:inline-block;background:#22c55e;color:#0a0c14;font-size:14px;font-weight:800;letter-spacing:0.05em;padding:14px 36px;border-radius:10px;text-decoration:none;">SEE MY LEAGUE HISTORY &#x2192;</a></div><p style="font-size:11px;color:#374151;text-align:center;margin:0;">ESPN &middot; Yahoo &middot; Sleeper &middot; All leagues supported</p></td></tr><!-- FOOTER --><tr><td style="background:#080a10;padding:14px 28px;border-top:1px solid #1e2130;text-align:center;font-size:11px;color:#374151;">ultimatefantasydashboard.com &nbsp;&middot;&nbsp; <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#374151;text-decoration:none;">Unsubscribe</a></td></tr></table></td></tr></table></body></html>`
const currentHtmlTemplate = computed(() => {
  for (const series of EMAIL_SERIES) {
    const found = series.emails.find(e => e.id === selectedHtmlTemplate.value)
    if (found) return found
  }
  return null
})

function copyTemplateHtml() {
  const t = currentHtmlTemplate.value
  if (!t?.html) return
  navigator.clipboard.writeText(t.html).then(() => {
    htmlCopied2.value = true
    setTimeout(() => { htmlCopied2.value = false }, 2500)
  })
}

// Legacy template selector (kept for custom composer)
const selectedTemplate = ref('')
function applyTemplate() {
  // Legacy — kept for custom composer if needed
}
// ─────────────────────────────────────────────────────────────────────────────

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

/* ── User Detail Panel ── */
.ud-backdrop {
  position: fixed; inset: 0; z-index: 100000;
  background: rgba(0,0,0,0.5);
  display: flex; justify-content: flex-end;
}
.ud-panel {
  width: 100%; max-width: 480px; height: 100%;
  background: #0d0f18; border-left: 1px solid #1e2130;
  display: flex; flex-direction: column;
  box-shadow: -8px 0 40px rgba(0,0,0,0.5);
  overflow: hidden;
}
.ud-header {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px; border-bottom: 1px solid #1e2130; flex-shrink: 0;
  background: #0a0c14;
}
.ud-avatar {
  width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg,#22c55e,#06b6d4);
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 900; color: #0a0c14;
}
.ud-header-info { flex: 1; min-width: 0; }
.ud-name { font-size: 15px; font-weight: 800; color: #fff; }
.ud-email { font-size: 12px; color: #6b7280; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ud-close {
  width: 30px; height: 30px; border-radius: 50%; border: 1px solid #374151;
  background: rgba(255,255,255,0.05); color: #9ca3af; cursor: pointer;
  display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0;
}
.ud-close:hover { background: rgba(255,255,255,0.1); color: #fff; }
.ud-loading, .ud-error { padding: 40px 24px; text-align: center; color: #6b7280; font-size: 13px; }
.ud-error { color: #ef4444; }
.ud-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }

.ud-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.ud-badge {
  font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 20px;
  border: 1px solid; letter-spacing: 0.04em;
}

.ud-stats-row {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
}
.ud-stat {
  background: #11131a; border: 1px solid #1e2130; border-radius: 10px;
  padding: 12px; text-align: center;
}
.ud-stat-val { font-size: 22px; font-weight: 900; color: #fff; }
.ud-stat-label { font-size: 11px; color: #6b7280; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }

.ud-section { display: flex; flex-direction: column; gap: 8px; }
.ud-section-title { font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.12em; }

.ud-timeline { background: #11131a; border: 1px solid #1e2130; border-radius: 10px; overflow: hidden; }
.ud-timeline-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 14px; border-bottom: 1px solid #1a1c26;
}
.ud-timeline-row:last-child { border-bottom: none; }
.ud-tl-label { font-size: 12px; color: #6b7280; }
.ud-tl-val { font-size: 12px; color: #e5e7eb; font-weight: 500; }

.ud-league-list { display: flex; flex-direction: column; gap: 6px; }
.ud-league-row {
  display: flex; align-items: center; gap: 10px;
  background: #11131a; border: 1px solid #1e2130; border-radius: 10px; padding: 10px 12px;
}
.ud-league-sport { font-size: 18px; flex-shrink: 0; }
.ud-league-info { flex: 1; min-width: 0; }
.ud-league-name { font-size: 13px; font-weight: 600; color: #e5e7eb; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ud-league-meta { font-size: 11px; color: #6b7280; margin-top: 2px; }
.ud-league-type { font-size: 11px; color: #4b5563; flex-shrink: 0; }
.ud-empty { font-size: 13px; color: #374151; font-style: italic; padding: 8px 0; }

/* Slide-in transition */
.ud-slide-enter-active { transition: transform 0.25s cubic-bezier(0.34,1.1,0.64,1); }
.ud-slide-leave-active { transition: transform 0.2s ease; }
.ud-slide-enter-from, .ud-slide-leave-to { transform: translateX(100%); }

/* ── Email Template Picker ── */
.template-picker { display: flex; flex-direction: column; gap: 8px; }
.template-badge {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-radius: 8px;
  background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.25);
  font-size: 12px; color: #22c55e; font-weight: 600;
}
.template-clear { background: none; border: none; color: #6b7280; font-size: 11px; cursor: pointer; padding: 0; }
.template-clear:hover { color: #ef4444; }
.template-divider { border: none; border-top: 1px solid #1e2130; margin: 4px 0 8px; }

/* ── HTML Template Library ── */
.tpl-library { display: flex; flex-direction: column; gap: 8px; }
.tpl-action-row {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px; padding: 12px 14px;
  background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.2);
  border-radius: 10px;
}
.tpl-meta { flex: 1; min-width: 0; }
.tpl-subject { font-size: 13px; font-weight: 600; color: #e5e7eb; margin-bottom: 3px; }
.tpl-preview-text { font-size: 11px; color: #6b7280; }
.tpl-copy-btn {
  padding: 8px 18px; background: #22c55e; color: #0a0c14;
  font-size: 12px; font-weight: 800; letter-spacing: 0.04em;
  border: none; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  transition: background 0.15s;
}
.tpl-copy-btn:hover { background: #16a34a; }
.tpl-composer-label { font-size: 11px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 8px; }
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
        <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="font-size:11px;color:#374151;text-decoration:none;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">Unsubscribe</a>
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
