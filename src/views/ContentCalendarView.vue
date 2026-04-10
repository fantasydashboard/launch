<template>
  <div :class="['calendar-root', { 'calendar-embed': isEmbed }]">

    <!-- ══════════════════════════════════════ HEADER ══ -->
    <div v-if="!isEmbed" class="calendar-header">
      <img src="/UFD_V8.png" alt="UFD" class="calendar-logo" />
      <div>
        <h1>Content Marketing Calendar</h1>
        <p>Plan &amp; track content across all four sports</p>
      </div>
    </div>

    <div class="calendar-toolbar">
      <h2 v-if="isEmbed" class="calendar-embed-title">Content Calendar</h2>
      <div class="toolbar-spacer"></div>
      <button class="reset-btn" @click="resetToDefaults">↻ Reset to defaults</button>
    </div>

    <!-- ══════════════════════════════════════ ANNUAL OVERVIEW STRIP ══ -->
    <div class="annual-strip-scroll">
      <div class="annual-strip">
        <div
          v-for="month in calendarData"
          :key="month.id"
          :class="[
            'month-card',
            intensityClass(month.intensity),
            { 'month-card-current': month.id === currentMonthId },
            { 'month-card-selected': month.id === selectedMonthId }
          ]"
          @click="selectedMonthId = month.id"
        >
          <div class="month-card-name">{{ shortLabel(month.label) }}</div>
          <div class="month-card-icons">
            <span v-for="s in month.activeSports" :key="s.sport" :title="s.sport">{{ s.icon }}</span>
          </div>
          <div class="month-card-pill">{{ month.postsPerWeek }}/wk</div>
          <div class="month-card-budget">${{ month.paidBudget }}</div>
        </div>
      </div>
    </div>

    <!-- ══════════════════════════════════════ MONTHLY DETAIL ══ -->
    <div v-if="selectedMonth" class="detail-section">

      <!-- ── Row 1: Header ── -->
      <div class="detail-header">
        <div class="detail-header-left">
          <h2 class="detail-month-title">{{ selectedMonth.label }} 2026</h2>
          <span :class="['intensity-badge', intensityBadgeClass(selectedMonth.intensity)]">
            {{ intensityLabel(selectedMonth.intensity) }}
          </span>
        </div>
        <div class="detail-header-stats">
          <div class="stat-block">
            <div class="stat-number">
              <input
                v-model="selectedMonth.postsPerWeek"
                class="inline-input inline-input-lg"
                style="width: 80px"
              />
            </div>
            <div class="stat-label">posts / week</div>
          </div>
          <div class="stat-block">
            <div class="stat-number">
              <span class="dollar-sign">$</span>
              <input
                v-model.number="selectedMonth.paidBudget"
                type="number"
                class="inline-input inline-input-lg"
                style="width: 90px"
              />
            </div>
            <div class="stat-label">paid budget</div>
          </div>
          <div class="stat-block stat-block-posture">
            <div class="stat-label">Paid Posture</div>
            <input
              v-model="selectedMonth.paidPosture"
              class="inline-input inline-input-posture"
            />
          </div>
        </div>
      </div>

      <!-- ── Row 2: Two columns ── -->
      <div class="detail-columns">

        <!-- LEFT COLUMN -->
        <div class="detail-left">

          <!-- Key Moments -->
          <div class="detail-card">
            <div class="section-label">Key Moments</div>
            <div class="key-moments-list">
              <div
                v-for="(moment, idx) in selectedMonth.keyMoments"
                :key="idx"
                class="key-moment-row"
              >
                <span class="key-moment-bullet">▸</span>
                <input
                  :value="moment"
                  @input="updateMoment(idx, ($event.target as HTMLInputElement).value)"
                  class="inline-input inline-input-moment"
                />
                <button class="moment-remove" @click="removeMoment(idx)" title="Remove">×</button>
              </div>
              <button class="moment-add" @click="addMoment">+ Add moment</button>
            </div>
          </div>

          <!-- Platform Notes -->
          <div class="detail-card">
            <div class="section-label">Platform Notes</div>
            <div class="platform-notes-list">
              <div
                v-for="(pn, idx) in selectedMonth.platformNotes"
                :key="idx"
                class="platform-note-card"
              >
                <div class="platform-note-header">
                  <span class="platform-note-icon">{{ pn.icon }}</span>
                  <span class="platform-note-name">{{ pn.platform }}</span>
                </div>
                <textarea
                  v-model="selectedMonth.platformNotes[idx].note"
                  class="platform-note-textarea"
                  rows="2"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- FB Group Focus -->
          <div class="detail-card">
            <div class="section-label">FB Group Focus</div>
            <input
              v-model="selectedMonth.fbGroupFocus"
              class="inline-input inline-input-full"
            />
          </div>

        </div>

        <!-- RIGHT COLUMN -->
        <div class="detail-right">

          <!-- Sport Split -->
          <div class="detail-card">
            <div class="section-label">Sport Split</div>
            <div class="stacked-bar">
              <div
                v-for="seg in selectedMonth.sportSplit"
                :key="seg.sport"
                class="bar-segment"
                :style="{ width: seg.pct + '%', backgroundColor: seg.color }"
                :title="seg.sport + ': ' + seg.pct + '%'"
              ></div>
            </div>
            <div class="bar-labels">
              <div v-for="(seg, idx) in selectedMonth.sportSplit" :key="seg.sport" class="bar-label-item">
                <span class="bar-label-dot" :style="{ backgroundColor: seg.color }"></span>
                <span class="bar-label-icon">{{ seg.icon }}</span>
                <span class="bar-label-text">{{ seg.sport }}</span>
                <input
                  v-model.number="selectedMonth.sportSplit[idx].pct"
                  type="number"
                  class="inline-input inline-input-pct"
                  min="0"
                  max="100"
                />
                <span class="bar-label-pct">%</span>
              </div>
            </div>
          </div>

          <!-- Pillar Mix -->
          <div class="detail-card">
            <div class="section-label">Pillar Mix</div>
            <div class="stacked-bar">
              <div
                v-for="seg in selectedMonth.pillarMix"
                :key="seg.pillar"
                class="bar-segment"
                :style="{ width: seg.pct + '%', backgroundColor: seg.color }"
                :title="seg.pillar + ': ' + seg.pct + '%'"
              ></div>
            </div>
            <div class="bar-labels">
              <div v-for="(seg, idx) in selectedMonth.pillarMix" :key="seg.pillar" class="bar-label-item">
                <span class="bar-label-dot" :style="{ backgroundColor: seg.color }"></span>
                <span class="bar-label-text">{{ seg.pillar }}</span>
                <input
                  v-model.number="selectedMonth.pillarMix[idx].pct"
                  type="number"
                  class="inline-input inline-input-pct"
                  min="0"
                  max="100"
                />
                <span class="bar-label-pct">%</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      <!-- ── Row 3: Notes ── -->
      <div class="detail-card notes-card">
        <div class="section-label">Notes</div>
        <textarea
          v-model="selectedMonth.notes"
          class="notes-textarea"
          rows="4"
          placeholder="Add notes for this month..."
        ></textarea>
      </div>

    </div>

    <!-- ══════════════════════════════════════ DAILY PLANNER ══ -->
    <div v-if="selectedMonth" class="daily-planner-section">
      <div class="daily-planner-header-row">
        <h2 class="daily-planner-title">📅 Daily Planner — {{ selectedMonth.label }} {{ plannerYear }}</h2>
        <button v-if="isAprilSelected" class="generate-defaults-btn-sm" @click="populateAprilDefaults">🤖 Generate defaults</button>
      </div>

      <!-- April empty banner -->
      <div v-if="aprilIsEmpty" class="april-generate-banner">
        <p>No content cards for April yet. Pre-populate with the full April 2026 content plan?</p>
        <button class="april-generate-btn" @click="populateAprilDefaults">🤖 Generate April content plan</button>
      </div>

      <!-- Filter Bar -->
      <div class="dp-filter-bar">
        <div class="dp-filter-group">
          <span class="dp-filter-group-label">Sport</span>
          <div class="dp-filter-pills">
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-sport-active': filterSport === 'all' }]" @click="filterSport = 'all'">All</button>
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-sport-active': filterSport === 'Football' }]" @click="filterSport = 'Football'">🏈</button>
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-sport-active': filterSport === 'Baseball' }]" @click="filterSport = 'Baseball'">⚾</button>
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-sport-active': filterSport === 'Basketball' }]" @click="filterSport = 'Basketball'">🏀</button>
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-sport-active': filterSport === 'Hockey' }]" @click="filterSport = 'Hockey'">🏒</button>
          </div>
        </div>
        <div class="dp-filter-group">
          <span class="dp-filter-group-label">Type</span>
          <div class="dp-filter-pills">
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-type-all': filterType === 'all' }]" @click="filterType = 'all'">All</button>
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-type-social': filterType === 'social' }]" @click="filterType = 'social'">🟢 Social</button>
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-type-community': filterType === 'community' }]" @click="filterType = 'community'">🟣 Community</button>
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-type-email': filterType === 'email' }]" @click="filterType = 'email'">🔵 Email</button>
          </div>
        </div>
        <div class="dp-filter-group">
          <span class="dp-filter-group-label">Platform</span>
          <div class="dp-filter-pills">
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-platform-active': filterPlatform === 'all' }]" @click="filterPlatform = 'all'">All</button>
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-platform-active': filterPlatform === 'x' }]" @click="filterPlatform = 'x'">X</button>
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-platform-active': filterPlatform === 'ig' }]" @click="filterPlatform = 'ig'">IG</button>
            <button :class="['dp-filter-pill', { 'dp-filter-pill-active dp-filter-platform-active': filterPlatform === 'fb' }]" @click="filterPlatform = 'fb'">FB</button>
          </div>
        </div>
      </div>

      <!-- Calendar Header Row -->
      <div class="dp-calendar-grid">
        <div class="dp-header-cell" v-for="day in weekDayLabels" :key="day">{{ day }}</div>

        <!-- Calendar Day Cells -->
        <template v-for="(day, idx) in calendarGrid" :key="idx">
          <div
            :class="[
              'dp-day-cell',
              { 'dp-day-outside': !day.inMonth },
              { 'dp-day-weekend': day.isWeekend },
              { 'dp-day-today': day.isToday }
            ]"
          >
            <div class="dp-day-header">
              <span :class="['dp-day-number', { 'dp-day-number-today': day.isToday }]">
                {{ day.dayNum }}
              </span>
              <button
                v-if="day.inMonth"
                class="dp-add-btn"
                @click="openCardEditor(day.dateStr, null)"
                title="Add post"
              >+</button>
            </div>
            <div class="dp-cards-list" v-if="day.inMonth">
              <div
                v-for="card in getFilteredCardsForDate(day.dateStr)"
                :key="card.id"
                :class="[
                  'dp-card-pill',
                  'dp-card-type-' + card.type,
                  'dp-card-status-' + card.status
                ]"
                @click="openCardEditor(day.dateStr, card)"
              >
                <span class="dp-card-icon">{{ cardTypeIcon(card.type) }}</span>
                <span v-if="sportEmoji(card.sport)" class="dp-card-sport">{{ sportEmoji(card.sport) }}</span>
                <span class="dp-card-title">{{ truncate(card.title || 'Untitled', 25) }}</span>
                <span v-if="card.status === 'posted'" class="dp-card-check">&#10003;</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- ══════════════════════════════════════ CARD EDITOR MODAL ══ -->
    <div v-if="editorOpen" class="dp-modal-overlay" @click.self="closeEditor">
      <div class="dp-modal">
        <div class="dp-modal-header">
          <h3 class="dp-modal-title">{{ editingCard ? 'Edit Post' : 'New Post' }} — {{ editorDateLabel }}</h3>
          <button class="dp-modal-close" @click="closeEditor">&times;</button>
        </div>

        <!-- Card Type Selector -->
        <div class="dp-type-selector">
          <button
            v-for="t in cardTypes"
            :key="t.value"
            :class="['dp-type-btn', { 'dp-type-btn-active': editorForm.type === t.value }]"
            @click="editorForm.type = t.value"
          >{{ t.icon }} {{ t.label }}</button>
        </div>

        <div class="dp-modal-body">
          <!-- Social fields -->
          <template v-if="editorForm.type === 'social'">
            <div class="dp-field">
              <label class="dp-label">Platforms</label>
              <div class="dp-checkbox-row">
                <label v-for="p in platformOptions" :key="p.value" class="dp-checkbox-label">
                  <input
                    type="checkbox"
                    :value="p.value"
                    v-model="editorForm.platforms"
                    class="dp-checkbox"
                  />
                  {{ p.label }}
                </label>
              </div>
            </div>
            <div class="dp-field-row">
              <div class="dp-field">
                <label class="dp-label">Pillar</label>
                <select v-model="editorForm.pillar" class="dp-select">
                  <option value="">Select pillar</option>
                  <option v-for="p in pillarOptions" :key="p" :value="p">{{ p }}</option>
                </select>
              </div>
              <div class="dp-field">
                <label class="dp-label">Sport</label>
                <select v-model="editorForm.sport" class="dp-select">
                  <option value="">Select sport</option>
                  <option v-for="s in sportOptions" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
            </div>
          </template>

          <!-- Community fields -->
          <template v-if="editorForm.type === 'community'">
            <div class="dp-field-row">
              <div class="dp-field" style="flex:2">
                <label class="dp-label">Group / Subreddit</label>
                <input v-model="editorForm.group" class="dp-input" placeholder="e.g. r/fantasyfootball" />
              </div>
              <div class="dp-field" style="flex:1">
                <label class="dp-label">Action</label>
                <select v-model="editorForm.action" class="dp-select">
                  <option value="post">Post</option>
                  <option value="comment">Comment</option>
                  <option value="reply">Reply</option>
                </select>
              </div>
            </div>
          </template>

          <!-- Email fields -->
          <template v-if="editorForm.type === 'email'">
            <div class="dp-field">
              <label class="dp-label">Segment</label>
              <select v-model="editorForm.segment" class="dp-select">
                <option value="">Select segment</option>
                <option value="trial">Free Trial</option>
                <option value="active">Active Subscribers</option>
                <option value="lapsed">Lapsed / Expired</option>
              </select>
            </div>
          </template>

          <!-- Common fields -->
          <div class="dp-field">
            <label class="dp-label">{{ editorForm.type === 'email' ? 'Subject Line' : 'Title' }}</label>
            <input v-model="editorForm.title" class="dp-input" :placeholder="editorForm.type === 'email' ? 'Email subject line' : 'Short description / headline'" />
          </div>

          <!-- Social: Concept + per-platform copy -->
          <template v-if="editorForm.type === 'social'">
            <div class="dp-field">
              <label class="dp-label">Concept / Hook</label>
              <textarea v-model="editorForm.copy" class="dp-textarea" rows="3" placeholder="General idea / hook for this post..."></textarea>
            </div>

            <div v-if="editorForm.platforms && editorForm.platforms.includes('x')" class="dp-field">
              <label class="dp-label">X Copy <span class="dp-label-hint">(ideally &le;280 chars)</span></label>
              <textarea v-model="editorForm.xCopy" class="dp-textarea" rows="4" placeholder="Twitter/X specific copy..."></textarea>
            </div>

            <div v-if="editorForm.platforms && editorForm.platforms.includes('ig')" class="dp-field">
              <label class="dp-label">Instagram Caption</label>
              <textarea v-model="editorForm.igCaption" class="dp-textarea" rows="6" placeholder="Instagram caption with hashtags..."></textarea>
            </div>

            <div v-if="editorForm.platforms && editorForm.platforms.includes('fb')" class="dp-field">
              <label class="dp-label">Facebook Copy</label>
              <textarea v-model="editorForm.fbCopy" class="dp-textarea" rows="5" placeholder="Facebook copy..."></textarea>
            </div>

            <div class="dp-field">
              <label class="dp-label">Creative / Visual Direction</label>
              <textarea v-model="editorForm.creativeNotes" class="dp-textarea" rows="3" placeholder="What image, screenshot, or graphic to use..."></textarea>
            </div>
          </template>

          <!-- Non-social: single copy field -->
          <template v-else>
            <div class="dp-field">
              <label class="dp-label">Copy</label>
              <textarea v-model="editorForm.copy" class="dp-textarea" rows="5" placeholder="Draft copy..."></textarea>
            </div>
          </template>
          <div class="dp-field-row">
            <div class="dp-field">
              <label class="dp-label">Status</label>
              <select v-model="editorForm.status" class="dp-select">
                <option value="idea">💡 Idea</option>
                <option value="drafted">📝 Drafted</option>
                <option value="scheduled">📅 Scheduled</option>
                <option value="posted">✅ Posted</option>
              </select>
            </div>
          </div>
          <div class="dp-field">
            <label class="dp-label">Notes</label>
            <textarea v-model="editorForm.notes" class="dp-textarea" rows="2" placeholder="Internal notes..."></textarea>
          </div>
        </div>

        <div class="dp-modal-footer">
          <button v-if="editingCard" class="dp-btn dp-btn-delete" @click="deleteCard">Delete</button>
          <div class="dp-modal-footer-right">
            <button class="dp-btn dp-btn-cancel" @click="closeEditor">Cancel</button>
            <button class="dp-btn dp-btn-save" @click="saveCard">Save</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'

/* ── Props ── */
const props = defineProps<{ embedMode?: boolean }>()
const route = useRoute()
const isEmbed = computed(() => props.embedMode === true || route.query.embed === 'true')

/* ── Types ── */
interface SportEntry {
  sport: string
  icon: string
  color: string
}

interface SportSplit {
  sport: string
  icon: string
  pct: number
  color: string
}

interface PillarMix {
  pillar: string
  pct: number
  color: string
}

interface PlatformNote {
  platform: string
  icon: string
  note: string
}

interface MonthPlan {
  id: string
  label: string
  activeSports: SportEntry[]
  postsPerWeek: string
  intensity: 'base' | 'standard' | 'multi-sport' | 'peak'
  sportSplit: SportSplit[]
  pillarMix: PillarMix[]
  keyMoments: string[]
  platformNotes: PlatformNote[]
  fbGroupFocus: string
  paidBudget: number
  paidPosture: string
  notes: string
}

/* ── Sport & Pillar References ── */
const FOOTBALL: SportEntry = { sport: 'Football', icon: '🏈', color: '#22c55e' }
const BASEBALL: SportEntry = { sport: 'Baseball', icon: '⚾', color: '#ef4444' }
const BASKETBALL: SportEntry = { sport: 'Basketball', icon: '🏀', color: '#f97316' }
const HOCKEY: SportEntry = { sport: 'Hockey', icon: '🏒', color: '#06b6d4' }

const PILLAR_COLORS: Record<string, string> = {
  'League Culture': '#a78bfa',
  'Analytical Wedge': '#22c55e',
  'League Archaeology': '#eab308',
  'Founder POV': '#06b6d4',
  'Topical / Cultural': '#ec4899',
}

function pillar(name: string, pct: number): PillarMix {
  return { pillar: name, pct, color: PILLAR_COLORS[name] || '#6b7280' }
}

function sportSplit(sport: SportEntry, pct: number): SportSplit {
  return { sport: sport.sport, icon: sport.icon, pct, color: sport.color }
}

function evergreenSplit(pct: number): SportSplit {
  return { sport: 'Evergreen', icon: '🌿', pct, color: '#6b7280' }
}

function footballOffseasonSplit(pct: number): SportSplit {
  return { sport: 'Football Offseason', icon: '🏈', pct, color: '#22c55e' }
}

function footballFASplit(pct: number): SportSplit {
  return { sport: 'Football Free Agency', icon: '🏈', pct, color: '#22c55e' }
}

function footballDraftSplit(pct: number): SportSplit {
  return { sport: 'Football Draft', icon: '🏈', pct, color: '#22c55e' }
}

/* ── Default Data ── */
function getDefaultData(): MonthPlan[] {
  return [
    {
      id: 'jan', label: 'January',
      activeSports: [FOOTBALL, BASKETBALL, HOCKEY],
      postsPerWeek: '7', intensity: 'multi-sport',
      sportSplit: [sportSplit(FOOTBALL, 50), sportSplit(BASKETBALL, 25), sportSplit(HOCKEY, 15), evergreenSplit(10)],
      pillarMix: [pillar('Topical / Cultural', 35), pillar('League Archaeology', 25), pillar('League Culture', 20), pillar('Analytical Wedge', 15), pillar('Founder POV', 5)],
      keyMoments: ['NFL Wild Card + Divisional + Championship', 'Fantasy football championship hangover', 'NBA/NHL mid-season'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'NFL playoff reactions — highest-reach content of the year' },
        { platform: 'Instagram', icon: '📸', note: 'End-of-season recap carousels (league history visuals)' },
        { platform: 'Facebook', icon: '👥', note: 'Football groups wrapping up. Engage more in basketball/hockey groups.' },
      ],
      fbGroupFocus: 'Football (playoffs), Basketball, Hockey',
      paidBudget: 175, paidPosture: 'Conversion campaigns winding down from peak', notes: '',
    },
    {
      id: 'feb', label: 'February',
      activeSports: [BASKETBALL, HOCKEY],
      postsPerWeek: '5', intensity: 'base',
      sportSplit: [sportSplit(BASKETBALL, 40), sportSplit(HOCKEY, 30), footballOffseasonSplit(15), evergreenSplit(15)],
      pillarMix: [pillar('League Culture', 35), pillar('Founder POV', 25), pillar('League Archaeology', 20), pillar('Topical / Cultural', 15), pillar('Analytical Wedge', 5)],
      keyMoments: ['Super Bowl', 'NFL Combine (late Feb)', 'NBA All-Star Weekend', 'Spring training camps open'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'Lowest-volume month. Quality over quantity.' },
        { platform: 'Instagram', icon: '📸', note: 'Founder story carousels, evergreen culture content.' },
        { platform: 'Facebook', icon: '👥', note: 'Basketball/hockey groups. Football groups go dormant.' },
      ],
      fbGroupFocus: 'Basketball, Hockey',
      paidBudget: 50, paidPosture: 'Audience building only', notes: '',
    },
    {
      id: 'mar', label: 'March',
      activeSports: [BASEBALL, BASKETBALL, HOCKEY],
      postsPerWeek: '6-7', intensity: 'standard',
      sportSplit: [sportSplit(BASEBALL, 35), sportSplit(BASKETBALL, 25), sportSplit(HOCKEY, 20), footballFASplit(10), evergreenSplit(10)],
      pillarMix: [pillar('Topical / Cultural', 30), pillar('League Culture', 25), pillar('Analytical Wedge', 20), pillar('Founder POV', 15), pillar('League Archaeology', 10)],
      keyMoments: ['Spring training games begin', 'Fantasy baseball drafts start', 'NBA trade deadline', 'NHL trade deadline', 'NFL free agency opens'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'Trade deadline content is gold. React fast — same-day takes only.' },
        { platform: 'Instagram', icon: '📸', note: 'Baseball draft prep carousels.' },
        { platform: 'Facebook', icon: '👥', note: 'Engage in Fantasy Baseball groups. They wake up now.' },
      ],
      fbGroupFocus: 'Baseball (waking up), Basketball, Hockey',
      paidBudget: 50, paidPosture: 'Audience building', notes: '',
    },
    {
      id: 'apr', label: 'April',
      activeSports: [BASEBALL, BASKETBALL, HOCKEY, FOOTBALL],
      postsPerWeek: '7-8', intensity: 'multi-sport',
      sportSplit: [sportSplit(BASEBALL, 35), sportSplit(BASKETBALL, 25), sportSplit(HOCKEY, 20), footballDraftSplit(10), evergreenSplit(10)],
      pillarMix: [pillar('Topical / Cultural', 30), pillar('Analytical Wedge', 25), pillar('League Culture', 25), pillar('Founder POV', 10), pillar('League Archaeology', 10)],
      keyMoments: ['MLB Opening Day', 'NBA/NHL playoffs begin', 'NFL Draft (late Apr)', 'Fantasy baseball leagues generating data'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'NFL Draft weekend is massive. React through the fantasy-league lens.' },
        { platform: 'Instagram', icon: '📸', note: 'Baseball screenshots + carousels. City Connect–style content.' },
        { platform: 'Facebook', icon: '👥', note: 'Active in baseball groups. Basketball groups spike for playoffs.' },
      ],
      fbGroupFocus: 'Baseball, Basketball (playoffs), Hockey (playoffs)',
      paidBudget: 150, paidPosture: 'Engagement boost + small conversion test', notes: '',
    },
    {
      id: 'may', label: 'May',
      activeSports: [BASEBALL, BASKETBALL, HOCKEY],
      postsPerWeek: '7', intensity: 'multi-sport',
      sportSplit: [sportSplit(BASEBALL, 35), sportSplit(BASKETBALL, 35), sportSplit(HOCKEY, 20), evergreenSplit(10)],
      pillarMix: [pillar('Analytical Wedge', 30), pillar('Topical / Cultural', 30), pillar('League Culture', 20), pillar('League Archaeology', 10), pillar('Founder POV', 10)],
      keyMoments: ['NBA Conference Finals', 'NHL Conference Finals', 'Baseball early-season power rankings meaningful', 'Fantasy basketball/hockey playoffs'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'NBA/NHL playoff discourse is massive. Insert fantasy-league takes.' },
        { platform: 'Instagram', icon: '📸', note: 'Baseball mid-season carousels. NBA/NHL fantasy recap graphics.' },
        { platform: 'Facebook', icon: '👥', note: 'Basketball and hockey groups most active now (playoffs).' },
      ],
      fbGroupFocus: 'Basketball (playoffs), Hockey (playoffs), Baseball',
      paidBudget: 150, paidPosture: 'Engagement boosts + baseball conversion test', notes: '',
    },
    {
      id: 'jun', label: 'June',
      activeSports: [BASEBALL, BASKETBALL, HOCKEY],
      postsPerWeek: '6', intensity: 'standard',
      sportSplit: [sportSplit(BASEBALL, 45), sportSplit(BASKETBALL, 25), sportSplit(HOCKEY, 20), evergreenSplit(10)],
      pillarMix: [pillar('Analytical Wedge', 30), pillar('League Archaeology', 25), pillar('Topical / Cultural', 20), pillar('League Culture', 15), pillar('Founder POV', 10)],
      keyMoments: ['NBA Finals', 'Stanley Cup Finals', 'Baseball approaching All-Star break', 'Fantasy basketball/hockey seasons end'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'Finals discourse. Last big non-football moment.' },
        { platform: 'Instagram', icon: '📸', note: 'End-of-season recap carousels for basketball/hockey.' },
        { platform: 'Facebook', icon: '👥', note: 'Basketball/hockey groups slow down. Baseball groups primary.' },
      ],
      fbGroupFocus: 'Baseball, Basketball/Hockey (wrapping up)',
      paidBudget: 175, paidPosture: 'Start ramping. Test football-themed creative.', notes: '',
    },
    {
      id: 'jul', label: 'July',
      activeSports: [FOOTBALL, BASEBALL],
      postsPerWeek: '6-7', intensity: 'standard',
      sportSplit: [sportSplit(FOOTBALL, 50), sportSplit(BASEBALL, 35), evergreenSplit(15)],
      pillarMix: [pillar('Topical / Cultural', 35), pillar('Analytical Wedge', 25), pillar('League Culture', 25), pillar('Founder POV', 10), pillar('League Archaeology', 5)],
      keyMoments: ['NFL training camps open (late Jul)', 'Fantasy football mock draft season', 'Baseball All-Star break', 'Baseball trade deadline approaches'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'Fantasy football Twitter wakes up late July. Post DAILY.' },
        { platform: 'Instagram', icon: '📸', note: 'Draft prep carousels. Commissioner setup guides.' },
        { platform: 'Facebook', icon: '👥', note: 'Fantasy Football groups come ALIVE. Engage aggressively.' },
      ],
      fbGroupFocus: 'Football (WAKES UP), Baseball',
      paidBudget: 250, paidPosture: 'Conversion campaigns begin. Football-themed creative.', notes: '',
    },
    {
      id: 'aug', label: 'August',
      activeSports: [FOOTBALL, BASEBALL],
      postsPerWeek: '8-10', intensity: 'peak',
      sportSplit: [sportSplit(FOOTBALL, 65), sportSplit(BASEBALL, 25), evergreenSplit(10)],
      pillarMix: [pillar('Analytical Wedge', 35), pillar('Topical / Cultural', 30), pillar('League Culture', 20), pillar('Founder POV', 10), pillar('League Archaeology', 5)],
      keyMoments: ['Fantasy football drafts EVERYWHERE', 'NFL preseason games', 'Baseball trade deadline (early Aug)', 'Baseball playoff push'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'POST DAILY. 2-3x/day. React to every fantasy moment.' },
        { platform: 'Instagram', icon: '📸', note: 'Draft results carousels. Post-draft grade screenshots. Reels potential.' },
        { platform: 'Facebook', icon: '👥', note: 'Post actively in Football, Sleeper, Commissioners groups. Share draft grades.' },
      ],
      fbGroupFocus: 'ALL football groups. Be everywhere.',
      paidBudget: 400, paidPosture: 'MAXIMUM SPEND. Conversion campaigns. Retarget April-July audience.', notes: '',
    },
    {
      id: 'sep', label: 'September',
      activeSports: [FOOTBALL, BASEBALL],
      postsPerWeek: '8-10', intensity: 'peak',
      sportSplit: [sportSplit(FOOTBALL, 60), sportSplit(BASEBALL, 30), evergreenSplit(10)],
      pillarMix: [pillar('Analytical Wedge', 40), pillar('Topical / Cultural', 30), pillar('League Culture', 15), pillar('Founder POV', 10), pillar('League Archaeology', 5)],
      keyMoments: ['NFL Week 1', 'First real power rankings + win probability data', 'Baseball playoff races / postseason begins'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'Weekly rhythm. Power rankings every Tue/Wed. React to every game day.' },
        { platform: 'Instagram', icon: '📸', note: 'Weekly power rankings carousels. Win probability graphics.' },
        { platform: 'Facebook', icon: '👥', note: 'Weekly conversation starters in football groups. Commissioners group peak.' },
      ],
      fbGroupFocus: 'Football (all groups), Baseball (playoffs)',
      paidBudget: 350, paidPosture: 'Sustained conversion. Retargeting performing well.', notes: '',
    },
    {
      id: 'oct', label: 'October',
      activeSports: [FOOTBALL, BASEBALL, BASKETBALL, HOCKEY],
      postsPerWeek: '8-10', intensity: 'peak',
      sportSplit: [sportSplit(FOOTBALL, 40), sportSplit(BASEBALL, 15), sportSplit(BASKETBALL, 20), sportSplit(HOCKEY, 15), evergreenSplit(10)],
      pillarMix: [pillar('Analytical Wedge', 35), pillar('Topical / Cultural', 30), pillar('League Culture', 20), pillar('Founder POV', 10), pillar('League Archaeology', 5)],
      keyMoments: ['NFL mid-season (weeks 4-8)', 'World Series', 'NBA season opens', 'NHL season opens', 'ALL FOUR SPORTS ACTIVE'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'Multi-sport content. Show dashboard across all four sports.' },
        { platform: 'Instagram', icon: '📸', note: 'Multi-sport carousels. Most visually differentiated month.' },
        { platform: 'Facebook', icon: '👥', note: 'Engage across ALL group types. You are in every conversation.' },
      ],
      fbGroupFocus: 'ALL groups active. Football primary, basketball/hockey opening.',
      paidBudget: 300, paidPosture: 'Sustained conversion. Multi-sport creative angle.', notes: '',
    },
    {
      id: 'nov', label: 'November',
      activeSports: [FOOTBALL, BASKETBALL, HOCKEY],
      postsPerWeek: '7', intensity: 'multi-sport',
      sportSplit: [sportSplit(FOOTBALL, 50), sportSplit(BASKETBALL, 25), sportSplit(HOCKEY, 15), evergreenSplit(10)],
      pillarMix: [pillar('Analytical Wedge', 35), pillar('Topical / Cultural', 30), pillar('League Culture', 20), pillar('League Archaeology', 10), pillar('Founder POV', 5)],
      keyMoments: ['NFL trade deadline', 'NFL mid/late-season', 'NBA/NHL regular season', 'Fantasy football trade deadlines', 'Fantasy playoff seeding battles'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'NFL trade deadline is massive engagement. Weekly content machine.' },
        { platform: 'Instagram', icon: '📸', note: 'Playoff race carousels. Trade deadline screenshots.' },
        { platform: 'Facebook', icon: '👥', note: 'Football groups at peak. Help commissioners navigate end-of-season.' },
      ],
      fbGroupFocus: 'Football (peak), Basketball, Hockey',
      paidBudget: 275, paidPosture: 'Sustained conversion. League Pass gift angle starts.', notes: '',
    },
    {
      id: 'dec', label: 'December',
      activeSports: [FOOTBALL, BASKETBALL, HOCKEY],
      postsPerWeek: '7', intensity: 'multi-sport',
      sportSplit: [sportSplit(FOOTBALL, 50), sportSplit(BASKETBALL, 25), sportSplit(HOCKEY, 15), evergreenSplit(10)],
      pillarMix: [pillar('Analytical Wedge', 30), pillar('Topical / Cultural', 25), pillar('League Archaeology', 20), pillar('League Culture', 15), pillar('Founder POV', 10)],
      keyMoments: ['Fantasy football playoffs (Weeks 14-17)', 'Fantasy football championships', 'NBA/NHL regular season', 'Baseball Winter Meetings / Hot Stove'],
      platformNotes: [
        { platform: 'X', icon: '𝕏', note: 'Championship week win probability is the most shareable content of the year.' },
        { platform: 'Instagram', icon: '📸', note: 'End-of-season recap carousels. Championship screenshots.' },
        { platform: 'Facebook', icon: '👥', note: 'Football groups intensely active. Transition to offseason prep after championships.' },
      ],
      fbGroupFocus: 'Football (championships), Basketball, Hockey',
      paidBudget: 225, paidPosture: 'Wind down conversion. League Pass gift angle. Audience building for next year.', notes: '',
    },
  ]
}

/* ── State ── */
const STORAGE_KEY = 'ufd_content_calendar'
const calendarData = ref<MonthPlan[]>(getDefaultData())

const monthIds = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const now = new Date()
const currentMonthId = monthIds[now.getMonth()]
const selectedMonthId = ref<string>(currentMonthId)

const selectedMonth = computed(() => {
  return calendarData.value.find(m => m.id === selectedMonthId.value) || null
})

/* ── Helpers ── */
function shortLabel(label: string): string {
  return label.substring(0, 3)
}

function intensityClass(intensity: string): string {
  return 'intensity-' + intensity
}

function intensityBadgeClass(intensity: string): string {
  return 'badge-' + intensity
}

function intensityLabel(intensity: string): string {
  const labels: Record<string, string> = {
    base: 'Base',
    standard: 'Standard',
    'multi-sport': 'Multi-Sport',
    peak: 'Peak',
  }
  return labels[intensity] || intensity
}

/* ── Key Moments editing ── */
function updateMoment(idx: number, value: string) {
  if (selectedMonth.value) {
    selectedMonth.value.keyMoments[idx] = value
  }
}

function removeMoment(idx: number) {
  if (selectedMonth.value) {
    selectedMonth.value.keyMoments.splice(idx, 1)
  }
}

function addMoment() {
  if (selectedMonth.value) {
    selectedMonth.value.keyMoments.push('')
  }
}

/* ── Persistence ── */
let saveTimeout: ReturnType<typeof setTimeout> | null = null

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(calendarData.value))
  } catch { /* ignore */ }
}

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as MonthPlan[]
      if (Array.isArray(parsed) && parsed.length === 12) {
        calendarData.value = parsed
      }
    }
  } catch { /* ignore */ }
}

function resetToDefaults() {
  if (confirm('Reset all calendar data to defaults? Your edits will be lost.')) {
    calendarData.value = getDefaultData()
    dailyPlans.value = {}
    localStorage.removeItem(DAILY_STORAGE_KEY)
    saveToStorage()
  }
}

onMounted(() => {
  loadFromStorage()
})

watch(calendarData, () => {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(saveToStorage, 500)
}, { deep: true })

/* ══════════════════════════════════════════════════════
   DAILY PLANNER
   ══════════════════════════════════════════════════════ */

/* ── Types ── */
interface PostCard {
  id: string
  type: 'social' | 'community' | 'email'
  platforms?: string[]
  pillar?: string
  sport?: string
  group?: string
  action?: string
  segment?: string
  title: string
  copy: string
  xCopy?: string
  igCaption?: string
  fbCopy?: string
  creativeNotes?: string
  status: 'idea' | 'drafted' | 'scheduled' | 'posted'
  notes: string
}

interface DayPlan {
  date: string
  cards: PostCard[]
}

/* ── Constants ── */
const DAILY_STORAGE_KEY = 'ufd_daily_plans'
const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const cardTypes = [
  { value: 'social' as const, label: 'Social', icon: '📱' },
  { value: 'community' as const, label: 'Community', icon: '👥' },
  { value: 'email' as const, label: 'Email', icon: '📧' },
]

const platformOptions = [
  { value: 'x', label: 'X' },
  { value: 'ig', label: 'Instagram' },
  { value: 'fb', label: 'Facebook' },
]

const pillarOptions = ['League Culture', 'Analytical Wedge', 'League Archaeology', 'Founder POV', 'Topical / Cultural']
const sportOptions = ['Football', 'Baseball', 'Basketball', 'Hockey', 'General']

/* -- Filters -- */
const filterSport = ref<string>('all')
const filterType = ref<string>('all')
const filterPlatform = ref<string>('all')

function getFilteredCardsForDate(dateStr: string): PostCard[] {
  const cards = getCardsForDate(dateStr)
  return cards.filter(card => {
    if (filterSport.value !== 'all') {
      const cardSport = (card.sport || '').toLowerCase()
      if (cardSport !== filterSport.value.toLowerCase() && cardSport !== 'general' && cardSport !== '') {
        return false
      }
    }
    if (filterType.value !== 'all') {
      if (card.type !== filterType.value) return false
    }
    if (filterPlatform.value !== 'all') {
      if (card.type === 'social') {
        if (!card.platforms || !card.platforms.includes(filterPlatform.value)) return false
      }
    }
    return true
  })
}

/* ── Month ID to index mapping ── */
const monthIndexMap: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

const plannerYear = computed(() => {
  return new Date().getFullYear()
})

/* ── Calendar Grid Computation ── */
interface CalendarDay {
  dayNum: number
  dateStr: string
  inMonth: boolean
  isWeekend: boolean
  isToday: boolean
}

const calendarGrid = computed<CalendarDay[]>(() => {
  const monthIdx = monthIndexMap[selectedMonthId.value]
  if (monthIdx === undefined) return []
  const year = plannerYear.value
  const firstDay = new Date(year, monthIdx, 1)
  const lastDay = new Date(year, monthIdx + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startDow = firstDay.getDay() // 0=Sun

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const grid: CalendarDay[] = []

  // Previous month padding
  if (startDow > 0) {
    const prevLastDay = new Date(year, monthIdx, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevLastDay - i
      const m = monthIdx === 0 ? 12 : monthIdx
      const y = monthIdx === 0 ? year - 1 : year
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dow = grid.length % 7
      grid.push({ dayNum: d, dateStr, inMonth: false, isWeekend: dow === 0 || dow === 6, isToday: dateStr === todayStr })
    }
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dow = grid.length % 7
    grid.push({ dayNum: d, dateStr, inMonth: true, isWeekend: dow === 0 || dow === 6, isToday: dateStr === todayStr })
  }

  // Next month padding to complete last row
  const remaining = grid.length % 7
  if (remaining > 0) {
    const fill = 7 - remaining
    for (let d = 1; d <= fill; d++) {
      const m = monthIdx + 2 > 12 ? 1 : monthIdx + 2
      const y = monthIdx + 2 > 12 ? year + 1 : year
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dow = grid.length % 7
      grid.push({ dayNum: d, dateStr, inMonth: false, isWeekend: dow === 0 || dow === 6, isToday: dateStr === todayStr })
    }
  }

  return grid
})

/* ── Daily Plans State ── */
const dailyPlans = ref<Record<string, DayPlan>>({})

function getCardsForDate(dateStr: string): PostCard[] {
  return dailyPlans.value[dateStr]?.cards || []
}

function cardTypeIcon(type: string): string {
  const icons: Record<string, string> = { social: '📱', community: '👥', email: '📧' }
  return icons[type] || '📄'
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.substring(0, max) + '...' : text
}

function sportEmoji(sport?: string): string {
  const map: Record<string, string> = {
    'Football': '🏈',
    'Baseball': '⚾',
    'Basketball': '🏀',
    'Hockey': '🏒',
  }
  return sport ? (map[sport] || '') : ''
}

/* ── Card Editor State ── */
const editorOpen = ref(false)
const editorDateStr = ref('')
const editingCard = ref<PostCard | null>(null)

const editorDateLabel = computed(() => {
  if (!editorDateStr.value) return ''
  const [y, m, d] = editorDateStr.value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
})

function getDefaultCardForm(): PostCard {
  return {
    id: '',
    type: 'social',
    platforms: [],
    pillar: '',
    sport: '',
    group: '',
    action: 'post',
    segment: '',
    title: '',
    copy: '',
    xCopy: '',
    igCaption: '',
    fbCopy: '',
    creativeNotes: '',
    status: 'idea',
    notes: '',
  }
}

const editorForm = ref<PostCard>(getDefaultCardForm())

function openCardEditor(dateStr: string, card: PostCard | null) {
  editorDateStr.value = dateStr
  editingCard.value = card
  if (card) {
    editorForm.value = { ...card, platforms: card.platforms ? [...card.platforms] : [], xCopy: card.xCopy || '', igCaption: card.igCaption || '', fbCopy: card.fbCopy || '', creativeNotes: card.creativeNotes || '' }
  } else {
    editorForm.value = getDefaultCardForm()
  }
  editorOpen.value = true
}

function closeEditor() {
  editorOpen.value = false
  editingCard.value = null
}

function saveCard() {
  const dateStr = editorDateStr.value
  if (!dailyPlans.value[dateStr]) {
    dailyPlans.value[dateStr] = { date: dateStr, cards: [] }
  }

  if (editingCard.value) {
    // Update existing
    const idx = dailyPlans.value[dateStr].cards.findIndex(c => c.id === editingCard.value!.id)
    if (idx !== -1) {
      dailyPlans.value[dateStr].cards[idx] = { ...editorForm.value }
    }
  } else {
    // New card
    const newCard: PostCard = {
      ...editorForm.value,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
    }
    dailyPlans.value[dateStr].cards.push(newCard)
  }

  closeEditor()
}

function deleteCard() {
  if (!editingCard.value) return
  if (!confirm('Delete this post card?')) return
  const dateStr = editorDateStr.value
  if (dailyPlans.value[dateStr]) {
    dailyPlans.value[dateStr].cards = dailyPlans.value[dateStr].cards.filter(c => c.id !== editingCard.value!.id)
    if (dailyPlans.value[dateStr].cards.length === 0) {
      delete dailyPlans.value[dateStr]
    }
  }
  closeEditor()
}

/* ── Daily Plans Persistence ── */
let dailySaveTimeout: ReturnType<typeof setTimeout> | null = null

function saveDailyPlans() {
  try {
    localStorage.setItem(DAILY_STORAGE_KEY, JSON.stringify(dailyPlans.value))
  } catch { /* ignore */ }
}

function loadDailyPlans() {
  try {
    const stored = localStorage.getItem(DAILY_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === 'object') {
        dailyPlans.value = parsed
      }
    }
  } catch { /* ignore */ }
}

// Load daily plans on mount (hook into existing onMounted by using another one)
onMounted(() => {
  loadDailyPlans()
})

watch(dailyPlans, () => {
  if (dailySaveTimeout) clearTimeout(dailySaveTimeout)
  dailySaveTimeout = setTimeout(saveDailyPlans, 500)
}, { deep: true })

/* ── April 2026 Content Plan Defaults ── */
const isAprilSelected = computed(() => selectedMonthId.value === 'apr')

const aprilIsEmpty = computed(() => {
  if (!isAprilSelected.value) return false
  const year = plannerYear.value
  for (let d = 1; d <= 30; d++) {
    const dateStr = `${year}-04-${String(d).padStart(2, '0')}`
    if (dailyPlans.value[dateStr]?.cards?.length) return false
  }
  return true
})

function uid(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 8)
}

function getAprilDefaults(): Record<string, DayPlan> {
  const y = plannerYear.value
  const plans: Record<string, DayPlan> = {}

  function d(day: number): string {
    return `${y}-04-${String(day).padStart(2, '0')}`
  }
  function mkCard(id: string, partial: Partial<PostCard>): PostCard {
    return {
      id,
      type: 'social',
      platforms: [],
      pillar: '',
      sport: '',
      group: '',
      action: '',
      segment: '',
      title: '',
      copy: '',
      xCopy: '',
      igCaption: '',
      fbCopy: '',
      creativeNotes: '',
      status: 'idea',
      notes: '',
      ...partial,
    }
  }
  function addCard(day: number, idx: number, partial: Partial<PostCard>) {
    const ds = d(day)
    if (!plans[ds]) plans[ds] = { date: ds, cards: [] }
    plans[ds].cards.push(mkCard(`apr${day}_${idx}`, partial))
  }

  // -- Apr 13 (Mon) — LAUNCH DAY --
  addCard(13, 1, {
    type: 'social', platforms: ['x', 'ig', 'fb'], pillar: 'Founder POV', sport: 'General',
    title: 'The Tuesday Night Origin Story',
    copy: 'The founder origin story — automated my league\'s power rankings after years of doing it by hand.',
    xCopy: `THREAD (7 tweets)

Tweet 1:
I've always been a sucker for power rankings.

For years I spent every Tuesday night building them manually for my fantasy league.

Then I finally automated the whole thing. Here's exactly how I did it: \u{1F9F5}

Tweet 2:
1. I stopped pulling stats manually.

Every major fantasy platform has an API \u2014 ESPN, Yahoo, Sleeper. The data is all there. You just have to know where to find it.

Once you tap in, your entire league's stats are available in seconds.

Tweet 3:
2. I stopped calculating rankings by hand.

Win-loss record is lazy. Real power rankings factor in recent form, scoring trends, schedule strength, and which teams are peaking right now.

Build the right algorithm once and it does the work every week.

Tweet 4:
3. I stopped wrestling with Canva.

The data means nothing if nobody looks at it. Graphics that are clean, branded, and ready to drop in a group chat are what start the conversations.

Presentation is half the battle.

Tweet 5:
4. I stopped being the only one who cared on Tuesday nights.

When the rankings hit the chat, the league woke up. Debates. Trash talk. Everyone had a problem with where they ranked.

The data wasn't just info \u2014 it was chaos fuel.

Tweet 6:
5. I turned all of it into one tool.

ESPN. Yahoo. Sleeper.
Football, baseball, basketball, hockey.
Power rankings, win probability, draft grades, full league history.

All automated. All shareable.

Tweet 7:
I built it because I needed it. I think you do too.

@ufdashboard if you want to see what your league actually looks like.

---
IMAGES: No images needed for the thread. Let the text carry it.
POSTING NOTES: Post as a thread. After posting, reply to Tweet 7 with a link to ultimatefantasydashboard.com (keep the link out of the main thread \u2014 the algorithm down-ranks tweets with links). Pin this thread to your profile.`,
    igCaption: `FEED CAROUSEL (8 slides)

CAPTION:
For years I spent every Tuesday night building power rankings for my league by hand.

Then I finally automated the whole thing. Here's how \u2192

1\uFE0F\u20E3 Stopped pulling stats manually. Every platform has an API \u2014 tap in once and your whole league is there.

2\uFE0F\u20E3 Stopped calculating by hand. Win-loss is lazy. Real rankings factor in form, scoring trends, and who's peaking.

3\uFE0F\u20E3 Stopped wrestling with Canva. Graphics ready for the group chat are what start conversations.

4\uFE0F\u20E3 Stopped being the only one who cared on Tuesday nights. The data wasn't just info \u2014 it was chaos fuel.

5\uFE0F\u20E3 Turned it all into one tool. ESPN \u00B7 Yahoo \u00B7 Sleeper. All four sports.

I built it because I needed it. I think you do too.

@ufdashboard

.
.
.
#FantasyFootball #FantasyBaseball #FantasyBasketball #FantasyHockey #FantasySports #PowerRankings #BuildInPublic #FounderStory #FantasyCommissioner #GroupChat

---
SLIDES:
Slide 1 (cover): Dark background. Text: "I built UFD because I was tired of doing this by hand." Sub: "Here's the whole thing \u2192" Small @ufdashboard at bottom.
Slide 2: Big "1" in green. "Stop pulling stats by hand." Sub: "Every platform has an API. Tap in once and your whole league is there in seconds."
Slide 3: Big "2". "Win-loss record is lazy." Sub: "Real rankings factor in form, scoring trends, schedule, and who's peaking."
Slide 4: Big "3". "Stop wrestling with Canva." Sub: "Graphics ready for the group chat are what start the conversations."
Slide 5: Big "4". "The league woke up." Sub: "When the rankings hit the chat, everyone had a problem with their rank."
Slide 6 (quote slide): Big italic text: "The data wasn't just information. It was chaos fuel."
Slide 7: Big "5". "One tool for all of it." Sub: "ESPN \u00B7 Yahoo \u00B7 Sleeper. Football, baseball, basketball, hockey."
Slide 8 (outro): "I built it because I needed it. I think you do too." @ufdashboard

DESIGN: Dark background (#0a0c14). White text. Green (#22c55e) accent for numbers. Same template style as the City Connect carousel slides. Create in Canva or Instagram Edits \u2014 1080\u00D71350 portrait format.
POSTING NOTES: Post to feed. 24 hours later, re-export the carousel slides as a Reel (1.2 sec per slide + trending audio) using Instagram Edits for extra reach.`,
    fbCopy: `PAGE POST + GROUP POST

PAGE POST:
For years I spent every Tuesday night building power rankings for my fantasy league by hand. Then I finally automated the whole thing. Here's exactly how:

1. I stopped pulling stats manually. Every major fantasy platform has an API \u2014 ESPN, Yahoo, Sleeper. The data is all there. You just have to know where to find it. Once you tap in, your entire league's stats are available in seconds.

2. I stopped calculating rankings by hand. Win-loss record is lazy. Real power rankings factor in recent form, scoring trends, schedule strength, and which teams are peaking right now. Build the right algorithm once and it does the work every single week.

3. I stopped wrestling with Canva. The data means nothing if nobody looks at it. Graphics that are clean, branded, and ready to drop in a group chat are what actually start conversations. Presentation is half the battle.

4. I stopped being the only one who cared on Tuesday nights. When the rankings hit the group chat, the league woke up. Debates. Trash talk. Someone always had a problem with where they ranked. The data wasn't just information \u2014 it was chaos fuel.

5. I turned all of it into one tool. ESPN. Yahoo. Sleeper. Football, baseball, basketball, hockey. Power rankings, win probability, draft grades, full league history \u2014 all automated, all shareable.

I built it because I needed it. I think you do too.

\u2014 Josh, building Ultimate Fantasy Dashboard

---
IMAGES: Attach Slide 1 of the IG carousel as the post image.
POSTING NOTES: Post on UFD Facebook Page. Do NOT cross-post to FB groups yet \u2014 save group posting for week 3+ after you've built a face through commenting.`,
    status: 'drafted',
  })
  addCard(13, 2, {
    type: 'community', group: 'Fantasy Football Commissioners', action: 'comment',
    title: 'Introduce yourself \u2014 comment on a rankings-related post',
    copy: 'Scroll through recent posts in Fantasy Football Commissioners group. Find one about power rankings, league engagement, or tools. Comment from your PERSONAL profile (not the UFD page \u2014 most groups block page comments).\n\nSample comment: \'I\'ve been building my league\'s power rankings manually for years \u2014 it\'s honestly the one thing that keeps our group chat alive in October. Anyone else do this or am I the only one wasting Tuesday nights on it?\'\n\nDo NOT mention UFD by name. Just be a commissioner sharing your experience. The goal is to be a recognized face before you ever post product content (that comes in week 3+).',
    status: 'idea',
  })

  // -- Apr 14 (Tue) --
  addCard(14, 5, {
    type: 'social', platforms: ['x', 'ig'], pillar: 'League Culture', sport: 'General',
    title: 'Commissioner chaos rule',
    copy: 'Engagement bait asking commissioners about their most chaotic league rule.',
    xCopy: `SINGLE TWEET

Commissioners \u2014 what's the one rule in your league that's caused the most chaos?

Mine: vetoing trades requires 75% league approval. Three years in, not a single veto has hit the threshold. Pure mayhem in the chat every time someone tries.

Drop yours below \u2B07\uFE0F

---
IMAGES: No image needed. Text-only engagement bait performs best.
POSTING NOTES: Reply to your own tweet with a follow-up: "The best part is watching someone rally 7 other managers to hit the threshold and failing every single time." This seeds the conversation and shows people how to engage. Reply to every response for the first 2 hours.`,
    igCaption: `STORY (not a feed post \u2014 Stories are better for engagement bait)

STORY SETUP:
Screen 1: Text overlay on dark background: "Commissioners \u2014 what's the one rule in your league that's caused the most chaos?"
Screen 2: Add Poll sticker: "Your league's trade rules:" Option A: "Veto-friendly" Option B: "Anything goes"
Screen 3: Add Question sticker: "Drop your league's most chaotic rule \u2B07\uFE0F"

---
DESIGN: Use dark background. White text. Green accent.
POSTING NOTES: Post as 3 sequential Stories. Check responses throughout the day and reshare the best ones to your Story with your reaction.`,
    fbCopy: `PAGE POST + GROUP POST

PAGE POST:
Commissioners \u2014 what's the one rule in your league that's caused the most chaos?

Mine: vetoing trades requires 75% league approval. Three years in, not a single veto has hit the threshold. Pure mayhem in the chat every time someone tries.

Drop yours below \u2B07\uFE0F

GROUP POST \u2014 Fantasy Football Commissioners (from personal profile):
Same text as above \u2014 this post was MADE for this group. Drop it as-is. It will get engagement because it's a genuine question that every commissioner has an opinion about.

---
IMAGES: No image needed.
POSTING NOTES: Post on UFD page first. Then post the same content in Fantasy Football Commissioners group from your personal profile. This is your first post in a group \u2014 make sure you've already commented on 2-3 posts in this group before dropping your own.`,
    status: 'drafted',
  })
  addCard(14, 6, {
    type: 'community', group: 'r/fantasyfootball', action: 'comment',
    title: 'Reply to 3 offseason discussion threads',
    copy: 'Find 3 posts in r/fantasyfootball about dynasty rankings, offseason moves, or league format debates. Reply with substance from your experience as a commissioner.\n\nSample reply style: \'We switched to a 6-team playoff two years ago and it changed everything \u2014 the teams on the bubble in weeks 12-13 actually mattered for once.\'\n\nDo NOT mention UFD. Just be a real fantasy player contributing to the discussion. Build karma and name recognition first.',
    status: 'idea',
  })

  // -- Apr 15 (Wed) --
  addCard(15, 5, {
    type: 'community', group: 'r/fantasybaseball', action: 'comment',
    title: 'Engage in early-season baseball threads',
    copy: 'Comment on 2-3 posts about early-season surprises, waiver pickups, or league standings. Add analytical perspective.\n\nSample reply: \'Two weeks in and standings are already misleading \u2014 the team in 1st in our league has the 6th-best scoring average. All-play record is a better indicator this early.\'\n\nPersonal profile. No UFD mention.',
    status: 'idea',
  })
  addCard(15, 6, {
    type: 'social', platforms: ['x'], pillar: 'Topical / Cultural', sport: 'Baseball',
    title: 'Baseball early-season observation',
    copy: '',
    xCopy: `SINGLE TWEET

Two weeks into fantasy baseball and at least one team in every league is 7-2 with the worst scoring in the league.

Standings are lying to you already. It's April.

---
IMAGES: No image.
POSTING NOTES: Quick take. Post in the morning when baseball Twitter is active. If it gets engagement, quote-tweet it later with "This is why I built power rankings that go beyond W-L."`,
    status: 'idea',
  })

  // -- Apr 16 (Thu) --
  addCard(16, 5, {
    type: 'social', platforms: ['ig'], pillar: 'Founder POV', sport: 'General',
    title: 'IG Story: Sunday content batch',
    copy: '',
    igCaption: `STORY (3 screens)

Screen 1: Screenshot of your content calendar in the admin page. Text overlay: "Sunday content batch. Planning the week ahead."
Screen 2: Add Poll sticker: "What should I post about this week?" Option A: "Power Rankings breakdown" Option B: "League culture content"
Screen 3: Text: "Week 1 in the books. The origin story thread got the most engagement. Leaning into founder content this week too."

---
POSTING NOTES: Casual, behind-the-scenes energy. Don't overthink the visuals \u2014 phone screenshots are fine. The authenticity is the point.`,
    status: 'idea',
  })
  addCard(16, 6, {
    type: 'community', group: 'Fantasy Baseball Today', action: 'comment',
    title: 'Comment on 2 early-season posts',
    copy: 'Build presence in baseball groups. Comment on posts about standings, early-season surprises, or league dynamics. Personal profile, no promo.\n\nSample: \'Our league\'s first power rankings just came out and the guy in 1st by record is actually 5th by scoring. Love early-season chaos.\'',
    status: 'idea',
  })

  // -- Apr 14 (Mon) --
  addCard(14, 1, {
    type: 'social', platforms: ['x', 'ig', 'fb'], pillar: 'Analytical Wedge', sport: 'Baseball',
    title: 'Your record is lying to you',
    copy: 'Product proof \u2014 show what real power rankings look like vs. standings.',
    xCopy: `SINGLE TWEET + IMAGE

Your record is lying to you.

A 7-4 team can be outscoring your 9-2 team every single week. Most fantasy apps will never tell you that.

Here's what your league actually looks like when you run the numbers \u2193

---
IMAGES: Attach the Power Rankings phone mockup PNG (download from Admin \u2192 Social \u2192 Static \u2192 Power Rankings General \u2192 Square \u2B07 PNG).
POSTING NOTES: Post at 10am ET when fantasy Twitter is most active. If this gets >50 likes, it's your boost candidate for the paid campaign. Reply to any comments about what platforms you support with "ESPN, Yahoo, and Sleeper \u2014 all four sports."`,
    igCaption: `FEED SINGLE IMAGE

CAPTION:
Your record is lying to you. \u{1F4CA}

A 7-4 team can be outscoring your 9-2 team every single week \u2014 and your standings page will never tell you.

This is what real power rankings look like. Built for your league. Updated every week. Automated.

ESPN \u00B7 Yahoo \u00B7 Sleeper \u00B7 Football, baseball, basketball, hockey.

@ufdashboard

.
.
.
#FantasyBaseball #PowerRankings #FantasyAnalytics #FantasySports #SleeperFantasy #ESPNFantasy #YahooFantasy #FantasyCommissioner #StandingsLie #GroupChat

---
IMAGE: Use the Power Rankings phone mockup from Admin \u2192 Social \u2192 Static \u2192 Power Rankings General \u2192 Square 1080\u00D71080 PNG.
POSTING NOTES: Post to feed. This is your primary product-proof post of the week. If it gets >3% engagement rate and >10 comments within 48 hours, BOOST IT (see the paid ads card on this same day).`,
    fbCopy: `PAGE POST

Your record is lying to you.

A 7-4 team can be outscoring your 9-2 team every single week. Most fantasy apps will never tell you that.

Here's what your league actually looks like when you run the numbers. Power rankings built for YOUR league \u2014 not generic player rankings, but your actual teams, weighted by record + points + all-play + recent form + consistency.

Works with ESPN, Yahoo & Sleeper. Football, baseball, basketball, hockey.

\u2014 Ultimate Fantasy Dashboard

---
IMAGES: Attach the Power Rankings phone mockup PNG.
POSTING NOTES: Post on UFD page only. Do NOT cross-post to FB groups yet \u2014 product screenshots in groups require trust earned through commenting first.`,
    status: 'idea',
  })
  addCard(14, 2, {
    type: 'community', group: 'Fantasy Baseball Today', action: 'comment',
    title: 'Comment on standings/surprises posts',
    copy: 'Find 2-3 posts where people talk about standings or early-season surprises. Comment with analytical perspective.\n\nSample: \'Standings this early are noise \u2014 in our league we use a composite score that factors in scoring average and all-play record. Tells a completely different story than W-L.\'\n\nNaturally positions you as someone who thinks deeply about rankings without being promotional.',
    status: 'idea',
  })
  addCard(17, 3, {
    type: 'social', platforms: ['ig'], pillar: 'Analytical Wedge', sport: 'General',
    title: 'PAID: Boost best organic post from Week 1 ($100)',
    copy: '',
    igCaption: `PAID BOOST INSTRUCTIONS

Step 1: Check which organic post from Apr 13-16 performed best (highest engagement rate, most comments).
Step 2: If it hit >3% engagement rate and >10 comments, open that post in the IG app and tap "Boost post."
Step 3: Settings:
  - Goal: "More profile visits" (NOT website visits)
  - Audience: Create "Fantasy Sports US" \u2014 United States only, age 22-55, interests: Fantasy sports, Fantasy football, ESPN Fantasy, Yahoo Fantasy, Sleeper, Major League Baseball, Baseball
  - Duration: 5 days
  - Budget: $20/day = $100 total
Step 4: Submit for review.
Step 5: If NOTHING hit the thresholds, DO NOT boost. Hold the $100 for next month.

---
POSTING NOTES: This is not a post \u2014 it's a paid campaign action. The post being boosted is the organic one that already performed. Only boost winners, never losers.`,
    status: 'idea',
    notes: 'Only boost if organic engagement rate >3%, comments >10.',
  })
  addCard(17, 4, {
    type: 'social', platforms: ['ig', 'fb'], pillar: 'Analytical Wedge', sport: 'General',
    title: 'PAID: Ad Set 2 \u2014 Conversion test ($50)',
    copy: '',
    igCaption: `PAID CONVERSION TEST INSTRUCTIONS

Set up in Meta Ads Manager (not the IG boost button \u2014 this is a real campaign):

Campaign:
  - Objective: Conversions (Trial Signup event)
  - Campaign name: META_Conv_FantasyInterests_FreeTrial_Apr26

Ad Set:
  - Budget: $10/day \u00D7 5 days = $50
  - Audience: United States, age 22-55
  - Interests: Fantasy sports, Fantasy football, ESPN Fantasy, Yahoo Fantasy Sports, Sleeper, MLB, MLB Network
  - Placements: Automatic (let Meta decide)
  - Optimization: Trial Signup conversion event

Ad Creative:
  - Image: Power Rankings phone mockup (download Square 1080\u00D71080 from Admin \u2192 Social \u2192 Static)
  - Primary text: "Power rankings built for your league. Updated every week, automatically. ESPN, Yahoo & Sleeper. Free trial."
  - Headline: "Power rankings, automated."
  - Description: "Built for your league."
  - CTA button: "Start Free Trial"
  - URL: https://ultimatefantasydashboard.com/pricing

---
POSTING NOTES: At $50, expect 0-2 trial signups. Don't measure by trials \u2014 measure by cost-per-click and whether the pixel fires correctly. You're testing the plumbing, not selling.`,
    status: 'idea',
    notes: 'Test campaign \u2014 measuring pixel and CPC, not conversions.',
  })

  // -- Apr 15 (Tue) --
  addCard(15, 1, {
    type: 'social', platforms: ['x', 'ig', 'fb'], pillar: 'League Culture', sport: 'General',
    title: '8 types of league mates, ranked',
    copy: 'Culture content ranking the archetypes every fantasy league has.',
    xCopy: `THREAD (10 tweets)

Tweet 1:
The 8 types of fantasy league mates, ranked from best to worst \u{1F9F5}

Tweet 2:
#1 \u2014 The Commissioner Who Cares

Sets up the league, runs the draft, fines you for missing waivers, posts power rankings, designs the trophy. Every great league has one. Treat them like royalty.

Tweet 3:
#2 \u2014 The Trash Talker

Has a take on every game. Ratios people in the chat. Their team isn't always good but they make the league more fun. Never vote them out.

Tweet 4:
#3 \u2014 The Quiet Sniper

Never says a word in the chat. Drafts top-3 every year. Drops 180 in Week 14 and wins the championship while you're not paying attention. Mysterious. Unkillable.

Tweet 5:
#4 \u2014 The Lurker

Reads every chat. Reacts to nothing. Texts the commissioner directly when they have a complaint. Dependable but never adds to the vibe.

Tweet 6:
#5 \u2014 The "I'm Out" Guy

Threatens to leave the league every November. Always re-signs in July. Performative. Annoying. Necessary.

Tweet 7:
#6 \u2014 The Auto-Drafter

Doesn't show up to the draft. Doesn't set their lineup. Has a bye-week QB starting in Week 9. Drains the league of life.

Tweet 8:
#7 \u2014 The Veto-Caller

Cries about every trade they don't like. Files a formal complaint in the chat. Wants the commissioner to overturn a deal involving 3 RB1s for a flex. Make it stop.

Tweet 9:
#8 \u2014 The Ghost

Joined the league in August. Hasn't been heard from since Labor Day. Currently 0-11 with a kicker on bye. Why are they in this league?

Tweet 10:
Tag the #1 in your league. Roast the #8.

@ufdashboard

---
IMAGES: No images needed. The text is the content.
POSTING NOTES: This thread has the highest viral potential of the month. Reply to every comment. Retweet the funniest responses. If this pops, it's next week's boost candidate.`,
    igCaption: `FEED CAROUSEL (10 slides)

CAPTION:
The 8 types of fantasy league mates, ranked from best to worst \u{1F447}

1\uFE0F\u20E3 The Commissioner Who Cares \u2014 every great league has one
2\uFE0F\u20E3 The Trash Talker \u2014 makes the league fun even when losing
3\uFE0F\u20E3 The Quiet Sniper \u2014 never talks, always wins
4\uFE0F\u20E3 The Lurker \u2014 reads every chat, reacts to nothing
5\uFE0F\u20E3 The "I'm Out" Guy \u2014 threatens to leave every November, re-signs in July
6\uFE0F\u20E3 The Auto-Drafter \u2014 doesn't show up, doesn't set lineups
7\uFE0F\u20E3 The Veto-Caller \u2014 cries about every trade
8\uFE0F\u20E3 The Ghost \u2014 joined in August, hasn't been seen since

Tag the #1 in your league. Roast the #8 \u2B07\uFE0F

@ufdashboard

.
.
.
#FantasyFootball #FantasyBaseball #FantasyLeague #LeagueMates #FantasySports #FantasyCommissioner #GroupChat #LeagueCulture

---
SLIDES:
Slide 1 (cover): Dark bg. "The 8 types of fantasy league mates, ranked" + "SWIPE \u2192"
Slide 2: "#1 \u2014 The Commissioner Who Cares" + one-liner
Slide 3: "#2 \u2014 The Trash Talker" + one-liner
Slide 4: "#3 \u2014 The Quiet Sniper" + one-liner
Slide 5: "#4 \u2014 The Lurker" + one-liner
Slide 6: "#5 \u2014 The 'I'm Out' Guy" + one-liner
Slide 7: "#6 \u2014 The Auto-Drafter" + one-liner
Slide 8: "#7 \u2014 The Veto-Caller" + one-liner
Slide 9: "#8 \u2014 The Ghost" + one-liner
Slide 10 (outro): "Tag the #1. Roast the #8." + @ufdashboard

DESIGN: Same dark template as City Connect carousel. Green accent numbers. White text on dark (#0a0c14) background. 1080\u00D71350 portrait. Create in Canva or Instagram Edits.
POSTING NOTES: 24 hours after posting, re-export as a Reel (1.2 sec per slide + trending audio) for extra reach.`,
    fbCopy: `PAGE POST + GROUP POST

PAGE POST:
The 8 types of fantasy league mates, ranked from best to worst:

#1 \u2014 The Commissioner Who Cares
Sets up the league, runs the draft, fines you for missing waivers, posts power rankings, designs the trophy. Every great league has one. Treat them like royalty.

#2 \u2014 The Trash Talker
Has a take on every game. Ratios people in the chat. Their team isn't always good but they make the league more fun. Never vote them out.

#3 \u2014 The Quiet Sniper
Never says a word. Then drops 180 points and wins the championship while you're not paying attention. Mysterious. Unkillable.

#4 \u2014 The Lurker
Reads every chat. Reacts to nothing. Texts the commissioner directly when they have a complaint. Dependable but never adds to the vibe.

#5 \u2014 The "I'm Out" Guy
Threatens to leave the league every November. Always re-signs in July. Performative. Annoying. Necessary.

#6 \u2014 The Auto-Drafter
Doesn't show up to the draft. Doesn't set their lineup. Has a bye-week QB starting in Week 9. Drains the league of life.

#7 \u2014 The Veto-Caller
Cries about every trade they don't like. Files a formal complaint in the chat. Wants the commissioner to overturn a deal involving 3 RB1s for a flex. Make it stop.

#8 \u2014 The Ghost
Joined the league in August. Hasn't been heard from since Labor Day. Currently 0-11 with a kicker on bye. Why are they in this league?

Tag the commissioner saving your league. Roast the ghost killing it.

GROUP POSTS (from personal profile):
Fantasy Football: Post the full list as-is with closer: "8 types I've seen in 12 years of fantasy. Which ones are in YOUR league? What type am I missing?"
Fantasy Football Commissioners: Same post, slightly different angle: "Every commissioner has dealt with all 8 of these. Which one causes you the most headaches?"
Everything NFL & Fantasy Football: Same post, shorter intro: "The 8 types of fantasy league mates. Which ones does your league have?"

---
IMAGES: Attach Slide 1 of the IG carousel.
POSTING NOTES: Post on UFD page first. Cross-post to 2-3 FB groups from personal profile throughout the day (don't dump all at once \u2014 stagger by 2-3 hours). This is your highest-engagement potential post of the month for groups because it's pure culture content that invites everyone to share their own experience.`,
    status: 'idea',
  })

  // -- Apr 16 (Wed) --
  addCard(16, 1, {
    type: 'social', platforms: ['x'], pillar: 'Topical / Cultural', sport: 'Baseball',
    title: 'Fantasy baseball \u2014 aged-like-milk hot takes',
    copy: '',
    xCopy: `SINGLE TWEET

Fantasy baseball is 2 weeks in.

Drop a hot take from draft day that aged like milk.

I'll go first.

---
IMAGES: No image.
POSTING NOTES: Reply to your own tweet immediately with your personal hot take (e.g., "I drafted [player] in round 2. Again. I never learn."). This seeds the conversation. X-only post \u2014 too short for IG/FB.`,
    status: 'idea',
  })
  addCard(16, 2, {
    type: 'social', platforms: ['ig'], pillar: 'Analytical Wedge', sport: 'Baseball',
    title: 'IG Story: Baseball power rankings screenshot',
    copy: '',
    igCaption: `STORY (2 screens)

Screen 1: Screenshot of a baseball league's power rankings from the UFD app. Text overlay: "Two weeks in \u2014 your standings are already lying."
Screen 2: Poll sticker: "Trust your record this early?" Option A: "Yes" Option B: "Not a chance"

---
POSTING NOTES: Takes 2 minutes. Screenshot your actual baseball league if you have one, or use the demo data.`,
    status: 'idea',
  })
  addCard(16, 3, {
    type: 'community', group: 'Fantasy Baseball Talk and Advice', action: 'comment',
    title: 'Engage in early-season discussion',
    copy: 'This is a Tier 3 (advice-focused) group \u2014 LURK AND COMMENT ONLY. Don\'t post original content here. Find 2 posts about early-season standings or waiver moves. Comment with analytical perspective.\n\nSample: \'Two weeks is way too early to trust standings. I look at scoring average and all-play record to figure out who\'s actually performing \u2014 tells a completely different story right now.\'',
    status: 'idea',
  })

  // -- Apr 17 (Thu) --
  addCard(17, 1, {
    type: 'social', platforms: ['x', 'ig'], pillar: 'Founder POV', sport: 'General',
    title: 'Why I built this for all four sports',
    copy: '',
    xCopy: `SINGLE TWEET + IMAGE

Most fantasy tools only do football.

I play in football, baseball, basketball and hockey leagues. Building for one sport was never an option.

Here's what it looks like when one tool covers all of them \u2193

---
IMAGES: Screenshot showing UFD dashboard with multiple sport tabs visible, or the Power Rankings phone mockup.
POSTING NOTES: This positions UFD's key differentiator (4 sports vs. competitors' 1). If anyone asks "which sports do you support?" reply: "Football, baseball, basketball, hockey. ESPN, Yahoo, Sleeper. Points and category leagues."`,
    igCaption: `FEED SINGLE IMAGE or CAROUSEL (4 slides, one per sport)

CAPTION:
Most fantasy tools only do football.

I play in football, baseball, basketball and hockey leagues. Building for one sport was never an option.

Power rankings, win probability, draft grades, league history \u2014 for every league you're in, on every platform.

ESPN \u00B7 Yahoo \u00B7 Sleeper

@ufdashboard

.
.
.
#FantasyFootball #FantasyBaseball #FantasyBasketball #FantasyHockey #FantasySports #AllSports #MultiSport #PowerRankings

---
IMAGE OPTIONS:
Option A (easier): Single image \u2014 the Power Rankings phone mockup.
Option B (better): 4-slide carousel, each slide showing a power rankings screenshot for a different sport (football, baseball, basketball, hockey). If you don't have screenshots for all 4, use the phone mockup as a single image.
POSTING NOTES: This is a brand-positioning post, not an engagement post. Lower engagement is expected \u2014 the goal is to establish the multi-sport identity.`,
    status: 'idea',
  })

  // -- Apr 18 (Fri) --
  addCard(18, 1, {
    type: 'social', platforms: ['x', 'ig'], pillar: 'League Culture', sport: 'General',
    title: 'Best league name drop \u2014 engagement bait',
    copy: '',
    xCopy: `SINGLE TWEET

Best fantasy league name you've ever seen?

Drop it in the replies. I'll rank the top 10 tomorrow.

---
IMAGES: No image.
POSTING NOTES: Engagement bait. Reply to every response with a quick reaction ("that's elite" / "criminal" / "top 3 for sure"). The promise to "rank the top 10 tomorrow" creates a reason for people to come back \u2014 follow through on it with a short thread the next day.`,
    igCaption: `STORY (not feed)

Screen 1: Dark bg, text: "Best fantasy league name you've ever seen?"
Screen 2: Question sticker: "Drop your league name \u2B07\uFE0F"
Screen 3 (post later): Reshare the best responses to your Story with your reactions.

---
POSTING NOTES: Stories are better than feed for engagement bait questions. Check responses throughout the day. If you get 10+ responses, compile them into a feed carousel the next day ("Top 10 league names you sent me, ranked").`,
    status: 'idea',
  })
  addCard(18, 2, {
    type: 'community', group: 'r/fantasybball', action: 'comment',
    title: 'Engage in NBA playoff fantasy discussions',
    copy: 'NBA playoffs are underway. Comment on 2-3 posts about playoff fantasy strategy, category league adjustments, or end-of-season takes.\n\nSample: \'Playoff fantasy is a completely different game \u2014 we switched to total points for playoffs and it eliminated the \'one hot week\' flukes.\'',
    status: 'idea',
  })

  // -- Apr 19 (Sat) --
  addCard(19, 1, {
    type: 'community', group: 'Fantasy Football on Sleeper App', action: 'comment',
    title: 'Build face in Sleeper community',
    copy: 'Comment on 2 posts in the Sleeper group. These are your direct platform users \u2014 they already know what Sleeper is, and UFD connects to Sleeper natively.\n\nSample: \'Sleeper\'s platform is great for managing the league but I\'ve always wished the analytics went deeper \u2014 especially power rankings that factor in more than just W-L.\'\n\nThis is as close to \'soft promo\' as you should get in a group comment. It positions the problem without naming your product.',
    status: 'idea',
  })

  // -- Apr 20 (Sun) --
  addCard(20, 1, {
    type: 'social', platforms: ['ig'], pillar: 'Founder POV', sport: 'General',
    title: 'IG Story: Week 2 recap + poll',
    copy: '',
    igCaption: `STORY (3 screens)

Screen 1: Screenshot of your IG insights showing follower growth or top post. Text: "Week 2 of building @ufdashboard. Here's what worked."
Screen 2: Text: "Best-performing post: [name of post]. Lesson: [what you learned]."
Screen 3: Poll: "What do you want to see more of?" Option A: "Product screenshots" Option B: "League culture takes"

---
POSTING NOTES: Also use this Sunday to batch content for Mon-Fri of Week 3. Review which posts hit, which flopped. Write out the posts for next week using this calendar.`,
    status: 'idea',
    notes: 'Sunday batch: write Mon-Fri posts for Week 3. Review Week 2 performance.',
  })
  addCard(20, 2, {
    type: 'community', group: 'NHL Fantasy Hockey Talk', action: 'comment',
    title: 'Engage in NHL playoff discussion',
    copy: 'NHL playoffs are starting. Smaller community = less competition for attention. Comment on 2 posts about playoff fantasy hockey.\n\nSample: \'NHL fantasy playoffs are chaos \u2014 one hot goalie run can swing the whole thing. Do you adjust your scoring for playoffs?\'',
    status: 'idea',
  })

  // -- Apr 21 (Mon) --
  addCard(21, 1, {
    type: 'social', platforms: ['x', 'ig', 'fb'], pillar: 'Analytical Wedge', sport: 'Baseball',
    title: 'Win probability \u2014 not vibes, a number',
    copy: '',
    xCopy: `SINGLE TWEET + IMAGE

You don't have to wait until Sunday night to know where you stand.

UFD tracks your matchup every single day \u2014 10,000 simulations running daily.

Not a guess. Not vibes. A number.

---
IMAGES: Attach a Win Probability chart screenshot from the app, ideally one showing a dramatic mid-week lead change.
POSTING NOTES: "Not a guess. Not vibes. A number." is a signature UFD line \u2014 use it consistently. Reply to anyone asking "how does it work?" with "Monte Carlo simulation \u2014 10,000 projections based on each player's historical performance."`,
    igCaption: `FEED SINGLE IMAGE

CAPTION:
You don't have to wait until Sunday night to know where you stand. \u{1F4C8}

UFD tracks your matchup every single day \u2014 10,000 Monte Carlo simulations running daily. Real odds for your current matchup.

Not a guess. Not vibes. A number.

ESPN \u00B7 Yahoo \u00B7 Sleeper \u00B7 All four sports.

@ufdashboard

.
.
.
#FantasyBaseball #WinProbability #FantasyAnalytics #MonteCarlo #FantasySports #DataDriven #NotVibes

---
IMAGE: Win Probability chart screenshot showing a dramatic crossover point mid-week. If you don't have a real one, use a product screenshot from the demo.
POSTING NOTES: Product-proof post. Pairs well with the "standings lie" post from last week \u2014 together they establish the analytical brand.`,
    fbCopy: `PAGE POST

You don't have to wait until Sunday night to know where you stand.

UFD tracks your matchup every single day \u2014 updating your win probability in real time as players score. 10,000 Monte Carlo simulations run daily to give you a real number, not a guess.

Tuesday morning to Sunday night, in one chart.

Works with ESPN, Yahoo & Sleeper. Football, baseball, basketball, hockey.

\u2014 Ultimate Fantasy Dashboard

---
IMAGES: Attach Win Probability chart screenshot.
POSTING NOTES: Page post only. No group cross-posting for product screenshots.`,
    status: 'idea',
  })
  addCard(21, 2, {
    type: 'community', group: 'DynastyNerds.com group', action: 'comment',
    title: 'Engage in dynasty offseason discussion',
    copy: 'DynastyNerds members are the most data-savvy fantasy players \u2014 highest fit for UFD\'s analytical angle. Comment on 2 posts about dynasty rankings, player valuations, or league formats.\n\nSample: \'Dynasty leagues are where analytics matter most \u2014 you\'re making decisions across multiple seasons. I\'ve been tracking all-time H2H records in our league and the data tells a completely different story than the current standings.\'',
    status: 'idea',
  })

  // -- Apr 22 (Tue) --
  addCard(22, 1, {
    type: 'social', platforms: ['x', 'ig'], pillar: 'League Archaeology', sport: 'General',
    title: 'Your league has history you\'ve never seen',
    copy: '',
    xCopy: `SINGLE TWEET + IMAGE

Your league has been around for 6 years and you've never seen this view.

All-time records. H2H matrix. Every rivalry. Every title.

The receipts are heavy.

---
IMAGES: Attach a screenshot of the H2H Matrix from UFD \u2014 the one with green/red cells showing every manager vs. every manager.
POSTING NOTES: The H2H matrix is the most visually striking screenshot UFD has. It stops the scroll because people immediately try to read it. If anyone asks what this is, reply: "It's every matchup your league has ever played, manager vs. manager. Built from your ESPN/Yahoo/Sleeper data automatically."`,
    igCaption: `FEED SINGLE IMAGE

CAPTION:
Your league has been around for years and you've never seen this view. \u{1F3C6}

All-time records. Head-to-head matrix. Career awards. Every rivalry, every title, every blowout.

The receipts are heavy.

@ufdashboard

.
.
.
#FantasyFootball #FantasyBaseball #LeagueHistory #AllTimeRecords #FantasySports #FantasyReceipts #H2H #GroupChat

---
IMAGE: H2H Matrix screenshot or Tale of the Tape screenshot from UFD. The matrix with green/red cells is the most visually compelling.
POSTING NOTES: This post targets the "League Archaeology" pillar \u2014 appealing to long-running leagues that have years of history they've never analyzed.`,
    status: 'idea',
  })

  // -- Apr 23 (Wed) --
  addCard(23, 1, {
    type: 'social', platforms: ['x'], pillar: 'Topical / Cultural', sport: 'Basketball',
    title: 'NBA playoffs fantasy take',
    copy: '',
    xCopy: `SINGLE TWEET

NBA playoffs start this week.

If your fantasy basketball league doesn't have a playoff format, your commissioner is asleep at the wheel.

The regular season is just qualifying.

---
IMAGES: No image.
POSTING NOTES: Quick hot take. X-only. Reply to any major NBA playoff news throughout the day with fantasy-league-angle reactions.`,
    status: 'idea',
  })
  addCard(23, 2, {
    type: 'social', platforms: ['ig'], pillar: 'Topical / Cultural', sport: 'Basketball',
    title: 'IG Story: NBA playoffs reaction',
    copy: '',
    igCaption: `STORY (2 screens)

Screen 1: Screenshot of NBA playoff bracket or a box score. Text overlay: "NBA playoffs. Fantasy impact?"
Screen 2: Text: "Your fantasy basketball league should have a playoff format. If it doesn't, your commissioner is sleeping." Add "Agree/Disagree" slider sticker.

---
POSTING NOTES: React to the biggest NBA playoff moment of the day. Quick, reactive, low effort.`,
    status: 'idea',
  })
  addCard(23, 3, {
    type: 'community', group: 'Fantasy Basketball Discussion', action: 'post',
    title: 'Ask about playoff scoring strategies',
    copy: 'Post from personal profile: \'How does your league handle playoff scoring? Standard categories, or do you switch to cumulative? We\'ve been debating this for 3 years and can\'t agree.\'\n\nThis is a genuine question that invites discussion. Every commissioner in this group has an opinion.',
    status: 'idea',
  })

  // -- Apr 24 (Thu -- NFL Draft Day 1) --
  addCard(24, 1, {
    type: 'social', platforms: ['x', 'ig', 'fb'], pillar: 'Topical / Cultural', sport: 'Football',
    title: 'NFL Draft night \u2014 league chaos thread',
    copy: '',
    xCopy: `THREAD (1 intro tweet + live reactions)

Tweet 1 (post BEFORE the draft starts):
NFL Draft night.

Not ranking the picks \u2014 ranking the fantasy LEAGUES that just got chaos injected into them.

Your dynasty group chat is about to explode. \u{1F9F5}

Live reactions below as picks come in \u2193

THEN: post 5-10 individual reaction tweets during the draft. Each one reacts to a pick through the lens of "what this does to your fantasy league":
- "How many dynasty leagues just lost their mind over this pick?"
- "Every redraft league with a top-3 pick just got reshuffled"
- "This is the pick that's going to cause the most arguments in group chats tonight"
- "[Team] just gave dynasty owners a headache for the next 3 years"
- "This is the kind of pick that makes one guy in every league say 'I told you so' for the rest of the offseason"

---
IMAGES: No images during live-tweeting. Speed > polish.
POSTING NOTES: LIVE-TWEET DURING THE DRAFT. This is the biggest X engagement opportunity of the month. Be fast, be opinionated, react through the fantasy-league lens (not the NFL team lens). Reply to every response. Quote-tweet other people's reactions with your take. Stay active for the full first round.`,
    igCaption: `FEED POST (post the MORNING AFTER the draft, not during)

CAPTION:
NFL Draft night. \u{1F3C8}

Not ranking the picks. Ranking the fantasy leagues that just got chaos injected into them.

Your dynasty group chat is about to explode.

Drop your biggest draft night reaction below \u2B07\uFE0F

@ufdashboard

.
.
.
#NFLDraft #NFLDraft2026 #FantasyFootball #DynastyFF #FantasyDraft #FantasySports #DraftNight #GroupChat

---
IMAGE: A graphic with "NFL DRAFT 2026 \u2014 THE FANTASY LEAGUE PERSPECTIVE" on dark background. Or a screenshot of your most-engaged draft reaction tweet.
POSTING NOTES: Post this the MORNING AFTER the draft \u2014 IG is not a real-time platform. The X thread handles real-time; IG handles the recap.`,
    fbCopy: `PAGE POST + GROUP POSTS

PAGE POST (morning after):
NFL Draft night. Not ranking the picks \u2014 ranking the fantasy leagues that just got chaos injected.

Every dynasty group chat in America exploded last night. Here's my take on which picks caused the most league chaos: [share your top 3-5 reactions from your X thread].

Drop your biggest draft night reaction below.

GROUP POSTS (from personal profile, stagger throughout the day):
r/DynastyFF: Reply to 3-5 hot draft reaction threads with your dynasty league perspective. This sub will be at peak engagement.
Fantasy Football: "What was the pick that caused the most chaos in your dynasty league last night?"
Everything NFL & Fantasy Football: Same question, broader audience.

---
IMAGES: Screenshot of your best-performing draft reaction tweet.
POSTING NOTES: The NFL Draft is the 2nd-biggest content moment of April (behind the origin story launch). Be everywhere today.`,
    status: 'idea',
  })

  // -- Apr 25 (Fri -- NFL Draft Day 2) --
  addCard(25, 1, {
    type: 'social', platforms: ['x'], pillar: 'Topical / Cultural', sport: 'Football',
    title: 'Draft day 2 \u2014 dynasty takes',
    copy: '',
    xCopy: `SINGLE TWEET + LIVE REACTIONS

Day 2 picks that dynasty owners are losing sleep over tonight.

Not player analysis \u2014 league reaction analysis.

The group chats are on fire.

THEN: 3-5 reaction tweets during Day 2 picks, same style as Day 1 but focused on dynasty impact.

---
IMAGES: No images during live reactions.
POSTING NOTES: Lower volume than Day 1 \u2014 the frenzy has calmed slightly. Focus on the picks with the biggest dynasty impact. Reply to dynasty-focused accounts.`,
    status: 'idea',
  })
  addCard(25, 2, {
    type: 'community', group: 'r/DynastyFF', action: 'comment',
    title: 'Reply to draft reaction threads',
    copy: 'r/DynastyFF is at PEAK engagement today. Reply to 3-5 hot threads about Day 1 and Day 2 picks.\n\nSample: \'This pick is going to split dynasty group chats right down the middle \u2014 half the league thinks this is a league-winner, the other half thinks it was a reach.\'\n\nDo NOT mention UFD. Just be a dynasty player with strong opinions.',
    status: 'idea',
  })

  // -- Apr 26 (Sat -- NFL Draft Day 3) --
  addCard(26, 1, {
    type: 'social', platforms: ['x', 'ig'], pillar: 'Topical / Cultural', sport: 'Football',
    title: 'NFL Draft recap \u2014 the league chat perspective',
    copy: '',
    xCopy: `SINGLE TWEET

The NFL Draft is over.

Now rank: whose fantasy league group chat was the most chaotic this weekend?

Dynasty owners or redraft guys?

I'll take dynasty by a mile.

---
IMAGES: No image.
POSTING NOTES: Engagement closer for the draft weekend. Let people debate dynasty vs. redraft. Reply to responses.`,
    igCaption: `FEED CAROUSEL (6 slides)

CAPTION:
The NFL Draft is over. \u{1F3C8}

Ranking the top 5 picks by dynasty chaos impact \u2014 not by NFL value, but by how much damage they did to league group chats this weekend.

Dynasty owners or redraft guys \u2014 whose chat was more chaotic? \u2B07\uFE0F

@ufdashboard

.
.
.
#NFLDraft #NFLDraft2026 #DynastyFF #FantasyFootball #FantasyDraft #DraftRecap #GroupChat

---
SLIDES:
Slide 1 (cover): "NFL Draft 2026 \u2014 Ranked by Fantasy League Chaos" + SWIPE \u2192
Slides 2-6: Top 5 picks ranked by dynasty impact. Each slide: pick number, player name, team, and a one-liner about the dynasty impact. (Fill in the actual picks after the draft happens \u2014 you can't write these in advance.)

DESIGN: Dark background, same carousel template. Use the team colors as accent for each slide if you want to get fancy.
POSTING NOTES: This carousel needs to be designed AFTER the draft happens (you need the actual picks). Batch it Saturday morning while it's fresh.`,
    status: 'idea',
  })

  // -- Apr 27 (Sun) --
  addCard(27, 1, {
    type: 'social', platforms: ['ig'], pillar: 'Founder POV', sport: 'General',
    title: 'IG Story: Draft weekend recap',
    copy: '',
    igCaption: `STORY (3 screens)

Screen 1: Screenshot of your X analytics from draft weekend showing engagement spike. Text: "NFL Draft weekend was wild. Here's what happened for @ufdashboard."
Screen 2: Text: "Best performing tweet: [your top draft reaction]. [X] likes, [X] retweets."
Screen 3: Text: "Final week of April coming up. Then we start planning May \u2014 NBA/NHL playoffs are deepening and baseball is hitting mid-season."

---
POSTING NOTES: Sunday batch day. Write posts for Mon-Fri of the final April week. Review April performance so far: which pillar performed best? Which platform? Use this data to shape May's plan.`,
    status: 'idea',
    notes: 'Sunday batch: plan final week of April. Prep May content. Review April performance.',
  })
  addCard(27, 2, {
    type: 'community', group: 'Everything NFL & Fantasy Football', action: 'comment',
    title: 'Comment on post-draft reaction threads',
    copy: 'The day after the draft, these groups are buzzing with reactions. Comment on 2-3 posts about draft picks from a commissioner/analytical angle.\n\nSample: \'Every dynasty league I\'m in had at least 3 trades happen within an hour of the first round ending. The draft is the biggest trade catalyst of the offseason.\'',
    status: 'idea',
  })

  // -- Apr 28 (Mon) --
  addCard(28, 1, {
    type: 'social', platforms: ['x', 'ig', 'fb'], pillar: 'Analytical Wedge', sport: 'General',
    title: 'Draft grades \u2014 did you actually win the draft?',
    copy: '',
    xCopy: `SINGLE TWEET + IMAGE

Did you actually win your draft?

UFD grades every pick against where players actually finished the season. Steals, busts, and everything in between.

Here's what real draft grades look like \u2193

---
IMAGES: Use a Draft Grades screenshot from the app showing team grades and pick verdicts. Or reference the Draft Tools email visuals.
POSTING NOTES: This tweet naturally follows the NFL Draft weekend \u2014 people are still thinking about drafts. Riding the momentum.`,
    igCaption: `FEED SINGLE IMAGE

CAPTION:
Did you actually win your draft? \u{1F4CB}

Every pick graded against where players actually finished. Team grades. Pick-by-pick verdicts. Steals and busts.

Your draft, scored.

ESPN \u00B7 Yahoo \u00B7 Sleeper \u00B7 All four sports.

@ufdashboard

.
.
.
#FantasyDraft #DraftGrades #FantasyFootball #FantasyBaseball #FantasyAnalytics #FantasySports #DraftDay

---
IMAGE: Draft Grades screenshot from the app, or the Draft Tools phone mockup if one exists in Admin \u2192 Social \u2192 Static.`,
    fbCopy: `PAGE POST

Did you actually win your draft?

Everybody walks away from the draft thinking they crushed it. UFD Draft Tools tell you who actually did.

Every pick gets a verdict. Every team gets a grade. Steals, hits, misses and busts \u2014 the whole draft, scored against where players actually finished the season.

Works with ESPN, Yahoo & Sleeper. Football, baseball, basketball, hockey.

\u2014 Ultimate Fantasy Dashboard

---
IMAGES: Draft Grades screenshot.
POSTING NOTES: Page post only. This is a product-proof post that follows the NFL Draft weekend naturally.`,
    status: 'idea',
  })
  addCard(28, 2, {
    type: 'community', group: 'Fantasy Football Commissioners', action: 'post',
    title: 'First soft UFD post \u2014 share a power rankings screenshot',
    copy: 'THIS IS YOUR FIRST PRODUCT-RELATED POST IN ANY FB GROUP. Only do this because you\'ve been commenting for 2+ weeks.\n\nPost from personal profile:\n\n\'Curious how other commissioners handle this. I built a tool that generates power rankings for my league automatically \u2014 here\'s what it looks like [attach UFD power rankings screenshot].\n\nI was doing this manually every Tuesday night for years and finally got tired of it. Now I\'m wondering: how many of you actually do power rankings for your league? And if you do \u2014 how are you putting them together? Manual? A spreadsheet? Some tool?\n\nI\'m Josh \u2014 built this trying to scratch my own itch. Just curious how widespread the manual pain really is.\'\n\nThis frames it as a DISCUSSION with product context, not a promo. Read the room \u2014 if the group seems hostile to any product mentions, wait another week.',
    status: 'idea',
    notes: 'ONLY post this after 2+ weeks of genuine commenting in this group. If you haven\'t been active enough, push this to May.',
  })

  // -- Apr 29 (Tue) --
  addCard(29, 1, {
    type: 'social', platforms: ['x', 'ig'], pillar: 'League Culture', sport: 'General',
    title: 'What makes a great fantasy rivalry',
    copy: '',
    xCopy: `SINGLE TWEET

The best fantasy rivalries aren't about who's winning.

They're about who can't stop talking about the time they lost.

What's your league's defining rivalry moment?

---
IMAGES: No image.
POSTING NOTES: Engagement bait. Reply to responses with reactions. If someone shares a great rivalry story, quote-tweet it with your take.`,
    igCaption: `FEED SINGLE IMAGE or STORY

CAPTION (if feed):
The best fantasy rivalries aren't about who's winning.

They're about who can't stop talking about the time they lost.

Drop your league's defining rivalry moment \u2B07\uFE0F

@ufdashboard

.
.
.
#FantasyFootball #FantasyBaseball #FantasyRivalry #LeagueCulture #FantasySports #GroupChat #Receipts

---
IMAGE: Text-on-dark-background graphic with the quote. Or post as a Story with Question sticker instead of a feed post \u2014 "Drop your league's defining rivalry moment."
POSTING NOTES: This is a light engagement post to close out the month. Lower effort, higher engagement potential.`,
    status: 'idea',
  })

  // -- Apr 30 (Wed) --
  addCard(30, 1, {
    type: 'social', platforms: ['x', 'ig', 'fb'], pillar: 'Founder POV', sport: 'General',
    title: 'April recap \u2014 one month of building in public',
    copy: '',
    xCopy: `THREAD (4 tweets)

Tweet 1:
One month of building UFD's social presence.

Here's what I learned: \u{1F9F5}

Tweet 2:
What worked:
- The origin story thread outperformed everything
- Culture content (league mates, commissioner chaos) > product screenshots for engagement
- NFL Draft weekend was the biggest traffic spike
- The "group chat" angle resonates every single time

Tweet 3:
What I'd do differently:
- More video content (even static slideshows as Reels)
- More engagement in Reddit (I was too focused on FB groups)
- Less product-first posts, more opinion-first posts

Tweet 4:
May plan:
- NBA and NHL playoffs are deepening
- Baseball is hitting mid-season \u2014 power rankings matter now
- Football mock draft season starts in late May/early June

If you followed along this month \u2014 thank you. This is just getting started.

@ufdashboard

---
IMAGES: Screenshot of your best X analytics from the month (showing follower growth or top tweet).
POSTING NOTES: "Build in public" content performs well because it's transparent and relatable. End the month strong. Use the insights from this thread to shape May's content plan.`,
    igCaption: `FEED CAROUSEL (5 slides)

CAPTION:
One month of building @ufdashboard's social presence. Here's what I learned \u{1F4CA}

\u2192 The origin story thread outperformed everything
\u2192 Culture content beats product content for engagement
\u2192 NFL Draft weekend was the biggest traffic spike
\u2192 The "group chat" angle resonates every single time

May: NBA/NHL playoffs deepen, baseball mid-season power rankings, and football mock draft season starts.

@ufdashboard

.
.
.
#BuildInPublic #FounderJourney #FantasySports #ContentStrategy #StartupLife #FantasyFootball #FantasyBaseball

---
SLIDES:
Slide 1: "One month. Here's what I learned." + @ufdashboard
Slide 2: "What worked" \u2014 bullet points from the caption
Slide 3: "What I'd do differently" \u2014 bullet points
Slide 4: "May plan" \u2014 NBA/NHL playoffs, baseball mid-season, football mock drafts
Slide 5: "This is just getting started. Follow along." + @ufdashboard

DESIGN: Dark bg, white text, green accent. Same carousel template.
POSTING NOTES: Last feed post of the month. Use actual data from your analytics, not placeholder numbers.`,
    fbCopy: `PAGE POST

One month of building UFD's social presence. Here's what I learned:

1. The origin story thread outperformed everything else \u2014 people connect with the "I built this because I needed it" narrative more than product features.

2. Culture content (league mates ranked, commissioner chaos rules) gets more engagement than product screenshots \u2014 by a lot.

3. NFL Draft weekend was the biggest traffic spike of the month \u2014 even though UFD is primarily a regular-season tool, draft weekend is when fantasy people are most active online.

4. The "group chat" angle resonates every single time \u2014 anything framed around "drop this in your group chat" or "the chat is about to blow up" gets attention.

May plan: NBA and NHL playoffs are deepening, baseball is hitting mid-season, and football mock draft season starts in late May/early June.

If you've been following along \u2014 thank you. This is just getting started.

\u2014 Josh, building Ultimate Fantasy Dashboard

---
IMAGES: Screenshot of best analytics or the Slide 1 cover from the IG carousel.
POSTING NOTES: Page post only. Honest, reflective, founder-voice. End the month with gratitude and a forward look.`,
    status: 'idea',
  })
  addCard(30, 2, {
    type: 'email', segment: 'lapsed',
    title: 'Baseball is in full swing \u2014 your league has power rankings waiting',
    copy: 'SEND VIA: Admin \u2192 Email tab \u2192 compose using the Trial Expired template as the base.\n\nSUBJECT: Your fantasy baseball league has power rankings waiting \u26BE\nPREVIEW: Two weeks of data. Real rankings. Your league is already connected.\n\nANGLE: Baseball-focused seasonal hook. Their league is already connected from when they signed up \u2014 the data is waiting, they just can\'t see it.\n\nKEY LINES:\n- \'Your baseball league is two weeks in. Power rankings are already running.\'\n- \'You don\'t need to reconnect anything \u2014 your league data is saved.\'\n- \'Individual: $4/mo. League Pass: $29. Your commissioner would probably buy it for the whole league if you asked.\'\n\nSEGMENT: Lapsed/expired users who have at least one baseball league connected.\nTIMING: Send late morning (10-11am ET) when people check email at work.',
    status: 'idea',
  })

  return plans
}

function populateAprilDefaults() {
  const defaults = getAprilDefaults()
  // Clear all existing April cards first, then set fresh defaults
  for (const key of Object.keys(dailyPlans.value)) {
    if (key.startsWith(`${plannerYear.value}-04-`)) {
      delete dailyPlans.value[key]
    }
  }
  for (const [dateStr, dayPlan] of Object.entries(defaults)) {
    dailyPlans.value[dateStr] = { date: dateStr, cards: [...dayPlan.cards] }
  }
}
</script>

<style scoped>
/* ══════════════════════════════════════════════════════
   CONTENT CALENDAR — DARK THEME
   ══════════════════════════════════════════════════════ */

.calendar-root {
  background: #0a0c14;
  color: #e5e7eb;
  min-height: 100vh;
  padding: 32px 28px;
  font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.calendar-embed {
  min-height: auto;
  padding: 0;
  background: transparent;
}

/* ── Header (standalone mode) ── */
.calendar-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 28px;
}

.calendar-logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
}

.calendar-header h1 {
  font-size: 22px;
  font-weight: 800;
  color: #e5e7eb;
  margin: 0;
  line-height: 1.2;
}

.calendar-header p {
  font-size: 13px;
  color: #6b7280;
  margin: 4px 0 0;
}

/* ── Toolbar ── */
.calendar-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
}

.calendar-embed-title {
  font-size: 18px;
  font-weight: 800;
  color: #e5e7eb;
  margin: 0;
}

.toolbar-spacer {
  flex: 1;
}

.reset-btn {
  background: #1e2130;
  color: #6b7280;
  border: 1px solid #2a2d3e;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.reset-btn:hover {
  color: #e5e7eb;
  border-color: #ef4444;
  background: #ef444415;
}

/* ══════════════════════════════════════════════════════
   ANNUAL OVERVIEW STRIP
   ══════════════════════════════════════════════════════ */

.annual-strip-scroll {
  overflow-x: auto;
  margin-bottom: 28px;
  padding-bottom: 4px;
  -webkit-overflow-scrolling: touch;
}

.annual-strip-scroll::-webkit-scrollbar {
  height: 6px;
}

.annual-strip-scroll::-webkit-scrollbar-track {
  background: #0a0c14;
}

.annual-strip-scroll::-webkit-scrollbar-thumb {
  background: #1e2130;
  border-radius: 3px;
}

.annual-strip {
  display: flex;
  gap: 8px;
  min-width: max-content;
}

.month-card {
  width: 85px;
  min-width: 85px;
  padding: 12px 8px 10px;
  border-radius: 10px;
  border: 1px solid #1e2130;
  cursor: pointer;
  transition: all 0.18s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  position: relative;
}

.month-card:hover {
  border-color: #2a2d3e;
  transform: translateY(-2px);
}

.month-card-current {
  border-bottom: 3px solid #eab308;
}

.month-card-selected {
  border-color: #22c55e !important;
  box-shadow: 0 0 0 1px #22c55e40;
}

/* Intensity backgrounds */
.intensity-base {
  background: #11131a;
}

.intensity-standard {
  background: #11131a;
  box-shadow: inset 0 0 30px #22c55e08;
}

.intensity-multi-sport {
  background: #11131a;
  box-shadow: inset 0 0 30px #eab30808;
}

.intensity-peak {
  background: #11131a;
  box-shadow: inset 0 0 30px #ef444412;
}

.month-card-name {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #e5e7eb;
}

.month-card-icons {
  font-size: 13px;
  display: flex;
  gap: 2px;
  justify-content: center;
  line-height: 1;
}

.month-card-pill {
  font-size: 10px;
  font-weight: 700;
  background: #22c55e18;
  color: #22c55e;
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
}

.month-card-budget {
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
}

/* ══════════════════════════════════════════════════════
   MONTHLY DETAIL
   ══════════════════════════════════════════════════════ */

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Detail Header ── */
.detail-header {
  background: #11131a;
  border: 1px solid #1e2130;
  border-radius: 10px;
  padding: 24px 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 20px;
}

.detail-header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.detail-month-title {
  font-size: 28px;
  font-weight: 900;
  color: #e5e7eb;
  margin: 0;
  line-height: 1;
}

/* Intensity badges */
.intensity-badge {
  border-radius: 20px;
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.badge-base {
  background: #374151;
  color: #9ca3af;
}

.badge-standard {
  background: #22c55e15;
  color: #22c55e;
  border: 1px solid #22c55e30;
}

.badge-multi-sport {
  background: #eab30815;
  color: #eab308;
  border: 1px solid #eab30830;
}

.badge-peak {
  background: #ef444420;
  color: #ef4444;
  border: 1px solid #ef444440;
}

.detail-header-stats {
  display: flex;
  align-items: flex-start;
  gap: 28px;
  flex-wrap: wrap;
}

.stat-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.stat-block-posture {
  max-width: 280px;
}

.stat-number {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.dollar-sign {
  font-size: 22px;
  font-weight: 800;
  color: #22c55e;
}

.stat-label {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ── Detail Columns ── */
.detail-columns {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 20px;
}

@media (max-width: 900px) {
  .detail-columns {
    grid-template-columns: 1fr;
  }
}

.detail-left,
.detail-right {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Cards ── */
.detail-card {
  background: #11131a;
  border: 1px solid #1e2130;
  border-radius: 10px;
  padding: 20px 22px;
}

.section-label {
  font-size: 13px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

/* ── Key Moments ── */
.key-moments-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.key-moment-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.key-moment-bullet {
  color: #22c55e;
  font-size: 12px;
  flex-shrink: 0;
}

.inline-input-moment {
  flex: 1;
}

.moment-remove {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s ease;
  flex-shrink: 0;
}

.moment-remove:hover {
  color: #ef4444;
}

.moment-add {
  background: none;
  border: 1px dashed #1e2130;
  border-radius: 8px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  margin-top: 4px;
}

.moment-add:hover {
  border-color: #22c55e;
  color: #22c55e;
}

/* ── Platform Notes ── */
.platform-notes-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.platform-note-card {
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 8px;
  padding: 12px 14px;
}

.platform-note-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.platform-note-icon {
  font-size: 14px;
}

.platform-note-name {
  font-size: 12px;
  font-weight: 700;
  color: #e5e7eb;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.platform-note-textarea {
  width: 100%;
  background: #11131a;
  border: 1px solid #1e2130;
  color: #e5e7eb;
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  line-height: 1.5;
  transition: border-color 0.15s ease;
}

.platform-note-textarea:focus {
  outline: none;
  border-color: #22c55e60;
}

/* ── Stacked Bar Charts ── */
.stacked-bar {
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.bar-segment {
  height: 100%;
  transition: width 0.3s ease;
  position: relative;
}

.bar-segment:first-child {
  border-radius: 6px 0 0 6px;
}

.bar-segment:last-child {
  border-radius: 0 6px 6px 0;
}

.bar-segment:only-child {
  border-radius: 6px;
}

.bar-labels {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.bar-label-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.bar-label-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}

.bar-label-icon {
  font-size: 13px;
  flex-shrink: 0;
}

.bar-label-text {
  color: #9ca3af;
  font-weight: 500;
  min-width: 80px;
}

.bar-label-pct {
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
}

/* ── Notes ── */
.notes-card {
  /* extra bottom margin */
}

.notes-textarea {
  width: 100%;
  background: #0a0c14;
  border: 1px solid #1e2130;
  color: #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  line-height: 1.6;
  min-height: 80px;
  transition: border-color 0.15s ease;
}

.notes-textarea:focus {
  outline: none;
  border-color: #22c55e60;
}

.notes-textarea::placeholder {
  color: #374151;
}

/* ── Inline Inputs (shared) ── */
.inline-input {
  background: #0a0c14;
  border: 1px solid #1e2130;
  color: #e5e7eb;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  font-family: inherit;
  transition: border-color 0.15s ease;
}

.inline-input:focus {
  outline: none;
  border-color: #22c55e60;
}

.inline-input-lg {
  font-size: 36px;
  font-weight: 900;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
}

.inline-input-lg:hover {
  border-color: #1e2130;
}

.inline-input-lg:focus {
  border-color: #22c55e60;
  background: #0a0c14;
}

.inline-input-posture {
  width: 100%;
  font-size: 12px;
  font-style: italic;
  color: #9ca3af;
  padding: 4px 8px;
  background: transparent;
  border: 1px solid transparent;
}

.inline-input-posture:hover {
  border-color: #1e2130;
}

.inline-input-posture:focus {
  border-color: #22c55e60;
  background: #0a0c14;
}

.inline-input-full {
  width: 100%;
}

.inline-input-pct {
  width: 48px;
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 6px;
  background: transparent;
  border: 1px solid transparent;
}

.inline-input-pct:hover {
  border-color: #1e2130;
}

.inline-input-pct:focus {
  border-color: #22c55e60;
  background: #0a0c14;
}

/* Hide number input spinners */
.inline-input-pct::-webkit-inner-spin-button,
.inline-input-pct::-webkit-outer-spin-button,
.inline-input-lg::-webkit-inner-spin-button,
.inline-input-lg::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.inline-input-pct[type='number'],
.inline-input-lg[type='number'] {
  -moz-appearance: textfield;
}

/* ══════════════════════════════════════════════════════
   SCROLLBAR GLOBAL (within this component)
   ══════════════════════════════════════════════════════ */

.calendar-root ::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.calendar-root ::-webkit-scrollbar-track {
  background: transparent;
}

.calendar-root ::-webkit-scrollbar-thumb {
  background: #1e2130;
  border-radius: 3px;
}

.calendar-root ::-webkit-scrollbar-thumb:hover {
  background: #2a2d3e;
}

/* ══════════════════════════════════════════════════════
   DAILY PLANNER
   ══════════════════════════════════════════════════════ */

.daily-planner-section {
  margin-top: 32px;
}

.daily-planner-title {
  font-size: 20px;
  font-weight: 800;
  color: #e5e7eb;
  margin: 0 0 20px;
}

/* ── Calendar Grid ── */
.dp-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.dp-header-cell {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
  padding: 8px 0;
}

/* ── Day Cell ── */
.dp-day-cell {
  background: #11131a;
  border: 1px solid #1e2130;
  border-radius: 8px;
  min-height: 100px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: border-color 0.15s ease;
}

.dp-day-cell:hover {
  border-color: #2a2d3e;
}

.dp-day-outside {
  opacity: 0.3;
  pointer-events: none;
}

.dp-day-weekend {
  background: #0e1018;
}

.dp-day-today {
  border-color: #22c55e40;
}

.dp-day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.dp-day-number {
  font-size: 13px;
  font-weight: 700;
  color: #e5e7eb;
  line-height: 1;
}

.dp-day-outside .dp-day-number {
  color: #6b7280;
}

.dp-day-number-today {
  background: #22c55e;
  color: #0a0c14;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.dp-add-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #1e2130;
  color: #6b7280;
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: all 0.15s ease;
  opacity: 0;
  padding: 0;
}

.dp-day-cell:hover .dp-add-btn {
  opacity: 1;
}

.dp-add-btn:hover {
  background: #22c55e;
  color: #0a0c14;
}

/* ── Card Pills ── */
.dp-cards-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  overflow-y: auto;
}

.dp-card-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 6px;
  background: #0a0c14;
  border-left: 3px solid #6b7280;
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
  overflow: hidden;
}

.dp-card-pill:hover {
  background: #161825;
}

/* Type colors */
.dp-card-type-social {
  border-left-color: #22c55e;
}

.dp-card-type-community {
  border-left-color: #a78bfa;
}

.dp-card-type-email {
  border-left-color: #06b6d4;
}

/* Status modifiers */
.dp-card-status-idea {
  opacity: 0.65;
  border-left-style: dashed;
}

.dp-card-status-drafted {
  /* normal — solid border is default */
}

.dp-card-status-scheduled {
  opacity: 0.95;
}

.dp-card-status-posted {
  opacity: 0.5;
}

.dp-card-icon {
  font-size: 10px;
  flex-shrink: 0;
}

.dp-card-title {
  overflow: hidden;
  text-overflow: ellipsis;
  color: #9ca3af;
  font-weight: 500;
}

.dp-card-check {
  color: #22c55e;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  margin-left: auto;
}

/* ══════════════════════════════════════════════════════
   CARD EDITOR MODAL
   ══════════════════════════════════════════════════════ */

.dp-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.dp-modal {
  background: #11131a;
  border: 1px solid #1e2130;
  border-radius: 12px;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dp-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #1e2130;
}

.dp-modal-title {
  font-size: 16px;
  font-weight: 800;
  color: #e5e7eb;
  margin: 0;
}

.dp-modal-close {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 24px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s ease;
}

.dp-modal-close:hover {
  color: #e5e7eb;
}

/* ── Type Selector ── */
.dp-type-selector {
  display: flex;
  gap: 8px;
  padding: 16px 24px 0;
}

.dp-type-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  background: #0a0c14;
  border: 1px solid #1e2130;
  color: #6b7280;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dp-type-btn:hover {
  border-color: #2a2d3e;
  color: #9ca3af;
}

.dp-type-btn-active {
  border-color: #22c55e;
  color: #22c55e;
  background: #22c55e10;
}

/* ── Modal Body ── */
.dp-modal-body {
  padding: 16px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.dp-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dp-field-row {
  display: flex;
  gap: 12px;
}

.dp-field-row .dp-field {
  flex: 1;
}

.dp-label {
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.dp-input,
.dp-select {
  background: #0a0c14;
  border: 1px solid #1e2130;
  color: #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: inherit;
  transition: border-color 0.15s ease;
  width: 100%;
}

.dp-input:focus,
.dp-select:focus {
  outline: none;
  border-color: #22c55e60;
}

.dp-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M3 5l3 3 3-3'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 28px;
}

.dp-textarea {
  background: #0a0c14;
  border: 1px solid #1e2130;
  color: #e5e7eb;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  line-height: 1.5;
  transition: border-color 0.15s ease;
  width: 100%;
}

.dp-textarea:focus {
  outline: none;
  border-color: #22c55e60;
}

/* ── Checkboxes ── */
.dp-checkbox-row {
  display: flex;
  gap: 16px;
}

.dp-checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #9ca3af;
  cursor: pointer;
}

.dp-checkbox {
  accent-color: #22c55e;
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* ── Modal Footer ── */
.dp-modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px 20px;
  border-top: 1px solid #1e2130;
  gap: 12px;
}

.dp-modal-footer-right {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.dp-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}

.dp-btn-save {
  background: #22c55e;
  color: #0a0c14;
}

.dp-btn-save:hover {
  background: #16a34a;
}

.dp-btn-cancel {
  background: #1e2130;
  color: #6b7280;
}

.dp-btn-cancel:hover {
  color: #e5e7eb;
}

.dp-btn-delete {
  background: transparent;
  color: #ef4444;
  border: 1px solid #ef444440;
}

.dp-btn-delete:hover {
  background: #ef444415;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .dp-calendar-grid {
    gap: 4px;
  }

  .dp-day-cell {
    min-height: 70px;
    padding: 6px;
  }

  .dp-card-pill {
    font-size: 10px;
    padding: 3px 6px;
  }

  .dp-card-icon {
    display: none;
  }

  .dp-modal {
    max-width: 100%;
    max-height: 95vh;
    border-radius: 10px;
  }

  .dp-field-row {
    flex-direction: column;
    gap: 14px;
  }
}

/* ── April Generate Defaults ── */
.daily-planner-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 0;
}
.daily-planner-header-row .daily-planner-title {
  margin-bottom: 0;
}
.generate-defaults-btn-sm {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #86efac;
  font-size: 12px;
  font-weight: 600;
  padding: 6px 14px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s;
}
.generate-defaults-btn-sm:hover {
  background: rgba(34, 197, 94, 0.2);
}
.april-generate-banner {
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 10px;
  padding: 16px 20px;
  margin-bottom: 16px;
  text-align: center;
}
.april-generate-banner p {
  color: #9ca3af;
  font-size: 13px;
  margin: 0 0 12px;
}
.april-generate-btn {
  background: #22c55e;
  color: #0a0c14;
  border: none;
  font-size: 14px;
  font-weight: 700;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}
.april-generate-btn:hover {
  background: #16a34a;
}

/* -- Filter Bar -- */
.dp-filter-bar {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #11131a;
  border: 1px solid #1e2130;
  border-radius: 10px;
}

.dp-filter-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dp-filter-group-label {
  font-size: 10px;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.dp-filter-pills {
  display: flex;
  gap: 4px;
}

.dp-filter-pill {
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 20px;
  background: #1e2130;
  color: #6b7280;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.dp-filter-pill:hover {
  color: #9ca3af;
  border-color: #2a2d3e;
}

.dp-filter-pill-active {
  color: #e5e7eb;
}

.dp-filter-sport-active {
  background: #22c55e20;
  color: #22c55e;
  border-color: #22c55e40;
}

.dp-filter-type-all {
  background: #22c55e20;
  color: #22c55e;
  border-color: #22c55e40;
}

.dp-filter-type-social {
  background: #22c55e20;
  color: #22c55e;
  border-color: #22c55e40;
}

.dp-filter-type-community {
  background: #a78bfa20;
  color: #a78bfa;
  border-color: #a78bfa40;
}

.dp-filter-type-email {
  background: #06b6d420;
  color: #06b6d4;
  border-color: #06b6d440;
}

.dp-filter-platform-active {
  background: #eab30820;
  color: #eab308;
  border-color: #eab30840;
}

.dp-card-sport {
  font-size: 10px;
  flex-shrink: 0;
  line-height: 1;
}

.dp-label-hint {
  font-weight: 500;
  color: #4b5563;
  text-transform: none;
  letter-spacing: 0;
}

</style>
