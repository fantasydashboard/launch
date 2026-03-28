<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Power Rankings</h1>
        <p class="text-base text-dark-textMuted">
          Comprehensive team rankings based on performance metrics
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          @click="showPowerRankingSettings = true" 
          class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors" 
          title="Customize Power Rankings"
        >
          <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <select v-model="selectedWeek" @change="loadPowerRankings" class="select">
          <option value="">Select Week...</option>
          <option v-for="week in availableWeeks" :key="week" :value="week">
            Through Week {{ week }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
      <LoadingSpinner size="xl" :message="loadingMessage" />
      
      <!-- Detailed progress -->
      <div class="mt-4 text-center space-y-2">
        <div v-if="loadingProgress.currentStep" class="text-sm text-dark-textMuted">
          {{ loadingProgress.currentStep }}
        </div>
        
        <!-- Week progress bar -->
        <div v-if="loadingProgress.maxWeek > 0" class="w-64 mx-auto">
          <div class="flex justify-between text-xs text-dark-textMuted/70 mb-1">
            <span>Week {{ loadingProgress.week }}</span>
            <span>{{ loadingProgress.week }}/{{ loadingProgress.maxWeek }}</span>
          </div>
          <div class="h-1.5 bg-dark-border rounded-full overflow-hidden">
            <div 
              class="h-full bg-yellow-400 transition-all duration-300"
              :style="{ width: `${(loadingProgress.week / loadingProgress.maxWeek) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <template v-else-if="powerRankings.length > 0">
      <!-- Offseason Notice Banner - Only show when season is complete -->
      <div v-if="isSeasonComplete" class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
        <div class="text-slate-400 text-xl flex-shrink-0">📅</div>
        <div>
          <p class="text-slate-200 font-semibold">It's the offseason</p>
          <p class="text-slate-400 text-sm mt-1">You're viewing last season's data ({{ currentSeason }}). The {{ Number(currentSeason) + 1 }} season will appear automatically once Week 1 begins.</p>
        </div>
      </div>

      <!-- Power Rankings Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-2xl">⚡</span>
                <h2 class="card-title">Power Rankings - Week {{ selectedWeek }}</h2>
              </div>
              <div class="mt-2">
                <p class="card-subtitle text-sm leading-relaxed">
                  {{ currentFormulaDisplay }}
                </p>
                <button 
                  @click="showPowerRankingSettings = true" 
                  class="text-yellow-400 hover:text-yellow-300 text-xs font-semibold transition-colors mt-1"
                >
                  Customize Formula →
                </button>
              </div>
              <div class="flex items-center gap-2 text-sm mt-2">
                <svg class="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                <span class="text-dark-textMuted">Select <span class="text-yellow-400">team</span> for details</span>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <!-- Share: League Pass only -->
              <button
                v-if="hasLeagueAccess"
                @click="downloadRankings"
                :disabled="isGeneratingDownload"
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                :style="shareToast === 'success' ? 'background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid #10b981;' : 'background: transparent; color: #facc15; border: 1px solid #facc15;'"
              >
                <svg v-if="isGeneratingDownload" class="w-5 h-5 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else-if="shareToast === 'success'" class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                {{ isGeneratingDownload ? 'Generating...' : shareToast === 'success' ? 'Copied! 📋' : 'Share' }}
              </button>
              <!-- Locked share for free users -->
              <button
                v-else
                @click="goToPricing"
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all"
                style="background: rgba(30,33,48,0.8); color: #6b7280; border: 1px solid #374151;"
                title="League Pass required to share"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Share
              </button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <!-- Power Rankings Table -->
          <div class="sm:hidden flex items-center justify-center gap-3 py-2 border-b border-dark-border/30">
          <button @click="prTablePage = Math.max(0, prTablePage - 1)" :disabled="prTablePage === 0"
            class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            :class="prTablePage === 0 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="flex gap-1.5">
            <div v-for="(_, i) in 3" :key="i"
              class="w-2 h-2 rounded-full transition-colors"
              :class="i === prTablePage ? 'bg-yellow-400' : 'bg-dark-border/60'"
            />
          </div>
          <button @click="prTablePage = Math.min(2, prTablePage + 1)" :disabled="prTablePage >= 2"
            class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            :class="prTablePage >= 2 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
          <div ref="rankingsTableRef" class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                  <!-- Rank: always visible -->
                  <th class="py-3 px-2 sm:px-4">Rank</th>
                  <!-- +/-: page 0 only on mobile -->
                  <th class="py-3 px-2 sm:px-4 w-6" :class="prTablePage > 0 ? 'hidden sm:table-cell' : ''">+/-</th>
                  <!-- Team: page 0 on mobile (name truncated), pages 1+ show logo only -->
                  <th class="py-3 px-2 sm:px-4" :class="prTablePage > 0 ? 'hidden sm:table-cell' : ''">Team</th>
                  <!-- Logo-only header for pages 1+ -->
                  <th class="py-3 px-2 sm:hidden" v-if="prTablePage > 0"></th>
                  <!-- Power Score: pages 0+1 on mobile, always desktop -->
                  <th class="py-3 px-2 sm:px-4 text-center" :class="prTablePage === 2 ? 'hidden sm:table-cell' : ''">Score</th>
                  <!-- Record: page 1 mobile -->
                  <th class="py-3 px-2 sm:px-4 text-center" :class="prTablePage === 1 ? '' : 'hidden sm:table-cell'">Rec</th>
                  <!-- All-Play: page 1 mobile -->
                  <th class="py-3 px-2 sm:px-4 text-center" :class="prTablePage === 1 ? '' : 'hidden sm:table-cell'">All-Play</th>
                  <!-- PPW: page 2 mobile, hidden md on desktop (already was) -->
                  <th class="py-3 px-2 sm:px-4 text-right" :class="prTablePage === 2 ? '' : 'hidden sm:table-cell'">PPW</th>
                  <!-- Last 3: page 2 mobile -->
                  <th class="py-3 px-2 sm:px-4 text-right" :class="prTablePage === 2 ? '' : 'hidden sm:table-cell'">Last 3</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(team, idx) in powerRankings" 
                  :key="team.team_key"
                  @click="hasLeagueAccess || idx < 3 ? openTeamDetailModal(team) : null"
                  class="border-b border-dark-border/50 transition-colors"
                  :class="{
                    'bg-yellow-500/10 ring-2 ring-yellow-500/50 ring-inset': team.is_my_team && (hasLeagueAccess || idx < 3),
                    'cursor-pointer hover:bg-dark-border/20': hasLeagueAccess || idx < 3,
                    'blur-row': !hasLeagueAccess && idx >= 3
                  }"
                >
                  <td class="py-3 px-2 sm:px-4">
                    <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-dark-border text-dark-text">
                      {{ idx + 1 }}
                    </span>
                  </td>
                  <td class="py-3 px-2 sm:px-4" :class="prTablePage > 0 ? 'hidden sm:table-cell' : ''">
                    <div v-if="team.change !== 0" class="flex items-center gap-1">
                      <span v-if="team.change > 0" class="text-green-400 text-sm font-bold">▲{{ team.change }}</span>
                      <span v-else class="text-red-400 text-sm font-bold">▼{{ Math.abs(team.change) }}</span>
                    </div>
                    <span v-else class="text-dark-textMuted text-sm">—</span>
                  </td>
                  <!-- Team cell: full on page 0 (truncated name), logo-only on pages 1+ -->
                  <td class="py-3 px-2 sm:px-4" :class="prTablePage > 0 ? 'hidden sm:table-cell' : ''">
                    <div class="flex items-center gap-2">
                      <div class="relative flex-shrink-0">
                        <img 
                          :src="team.logo_url || defaultAvatar" 
                          :alt="team.name"
                          class="w-8 h-8 rounded-full object-cover ring-2"
                          :class="team.is_my_team ? 'ring-yellow-500' : 'ring-dark-border'"
                          @error="handleImageError"
                        />
                        <div v-if="team.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span class="text-[8px] text-gray-900 font-bold">★</span>
                        </div>
                      </div>
                      <div class="flex items-center gap-1 min-w-0">
                        <span class="font-semibold text-dark-text truncate sm:max-w-none max-w-[90px] text-sm sm:text-base">{{ team.name }}</span>
                      </div>
                    </div>
                  </td>
                  <!-- Logo-only for pages 1+ on mobile -->
                  <td class="py-3 px-2 sm:hidden" v-if="prTablePage > 0">
                    <div class="relative inline-flex">
                      <img :src="team.logo_url || defaultAvatar" :alt="team.name"
                        class="w-7 h-7 rounded-full object-cover ring-2"
                        :class="team.is_my_team ? 'ring-yellow-500' : 'ring-dark-border'"
                        @error="handleImageError" />
                      <div v-if="team.is_my_team" class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span class="text-[6px] text-gray-900 font-bold">★</span>
                      </div>
                    </div>
                  </td>
                  <!-- Power Score: pages 0+1 -->
                  <td class="py-3 px-2 sm:px-4 text-center" :class="prTablePage === 2 ? 'hidden sm:table-cell' : ''">
                    <div class="flex items-center justify-center gap-1.5">
                      <div class="w-10 sm:w-16 h-2 bg-dark-border rounded-full overflow-hidden hidden sm:block">
                        <div class="h-full rounded-full transition-all duration-500"
                          :class="getPowerScoreBarClass(team.powerScore)"
                          :style="{ width: `${team.powerScore}%` }"></div>
                      </div>
                      <span class="font-bold text-sm" :class="getPowerScoreTextClass(team.powerScore)">{{ team.powerScore.toFixed(1) }}</span>
                    </div>
                  </td>
                  <!-- Record: page 1 mobile -->
                  <td class="py-3 px-2 sm:px-4 text-center" :class="prTablePage === 1 ? '' : 'hidden sm:table-cell'">
                    <span class="font-medium text-sm" :class="getRecordColumnClass(team)">{{ team.wins }}-{{ team.losses }}</span>
                  </td>
                  <!-- All-Play: page 1 mobile -->
                  <td class="py-3 px-2 sm:px-4 text-center" :class="prTablePage === 1 ? '' : 'hidden sm:table-cell'">
                    <span class="text-sm" :class="getAllPlayColumnClass(team)">{{ team.allPlayWins }}-{{ team.allPlayLosses }}</span>
                  </td>
                  <!-- PPW: page 2 mobile -->
                  <td class="py-3 px-2 sm:px-4 text-right" :class="prTablePage === 2 ? '' : 'hidden sm:table-cell'">
                    <span class="font-medium text-sm" :class="getAvgScoreColumnClass(team)">{{ team.avgScore.toFixed(1) }}</span>
                  </td>
                  <!-- Last 3: page 2 mobile -->
                  <td class="py-3 px-2 sm:px-4 text-right" :class="prTablePage === 2 ? '' : 'hidden sm:table-cell'">
                    <span class="text-sm" :class="getRecentAvgColumnClass(team)">{{ team.recentAvg.toFixed(1) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Early upgrade CTA — right after top 3 rows -->
          <div v-if="!hasLeagueAccess && powerRankings.length > 3" class="early-gate-banner" style="margin: 12px 0 0;">
            <div class="early-gate-inner">
              <div class="early-gate-left">
                <span class="early-gate-icon">⚡</span>
                <div>
                  <div class="early-gate-headline">{{ powerRankings.length - 3 }} more teams are locked</div>
                  <div class="early-gate-sub">Plus trend charts, movers, position breakdowns &amp; share graphics</div>
                </div>
              </div>
              <button class="gate-cta-btn" @click="goToPricing">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                GET LEAGUE PASS
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Power Score Trend Chart — blurred when locked -->
      <div :class="!hasLeagueAccess ? 'locked-section' : ''">
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Power Score Trend</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-1">Track power ranking changes throughout the season</p>
        </div>
        <div class="card-body">
          <div v-if="chartSeries.length > 0">
            <!-- Desktop: full chart with avatars -->
            <div class="hidden sm:block relative power-chart-container">
              <apexchart 
                ref="powerChartRef"
                type="line" 
                height="400" 
                :options="chartOptions" 
                :series="chartSeries"
              />
              <div 
                v-for="(team, idx) in powerRankings" 
                :key="'avatar-' + team.team_key"
                class="absolute cursor-pointer transition-opacity duration-200" 
                :class="{ 'opacity-30': hoveredTeamKey && hoveredTeamKey !== team.team_key }"
                :style="getAvatarPosition(team)"
                @mouseenter="hoveredTeamKey = team.team_key"
                @mouseleave="hoveredTeamKey = null"
              >
                <div class="relative">
                  <img :src="team.logo_url || defaultAvatar" :alt="team.name"
                    class="w-6 h-6 rounded-full object-cover"
                    :style="{ boxShadow: `0 0 0 2px ${team.is_my_team ? '#F5C451' : getTeamColor(idx)}` }"
                    @error="handleImageError" />
                  <div v-if="team.is_my_team" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span class="text-[6px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Mobile: windowed 6-week chart -->
            <div class="sm:hidden">
              <div class="relative">
                <apexchart type="line" height="300" :options="prMobileChartOptions" :series="prMobileChartSeries" />
                <!-- Avatars at right edge using justify-between -->
                <div class="absolute right-0 top-0 bottom-0 flex flex-col justify-between items-end pointer-events-none"
                  style="padding-top: 10px; padding-bottom: 33px; padding-right: 2px;">
                  <div v-for="team in prMobileTeamOrder" :key="'pr-mob-' + team.team_key">
                    <img :src="team.logo_url || defaultAvatar" :alt="team.name"
                      class="w-4 h-4 rounded-full object-cover flex-shrink-0"
                      :style="{ boxShadow: `0 0 0 2px ${team.is_my_team ? '#F5C451' : getTeamColor(powerRankings.indexOf(team))}` }"
                      @error="handleImageError" />
                  </div>
                </div>
              </div>
              <!-- Nav -->
              <div class="flex items-center justify-center gap-3 mt-3">
                <button @click="prChartOffset = Math.min(prChartOffset + 6, Math.max(0, (chartOptions?.xaxis?.categories?.length || 0) - 6))"
                  :disabled="prChartOffset >= Math.max(0, (chartOptions?.xaxis?.categories?.length || 0) - 6)"
                  class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  :class="prChartOffset >= Math.max(0, (chartOptions?.xaxis?.categories?.length || 0) - 6) ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                </button>
                <div class="flex gap-1.5">
                  <div v-for="(_, i) in prChartTotalPages" :key="i"
                    class="w-2 h-2 rounded-full transition-colors"
                    :class="i === prChartCurrentPage ? 'bg-yellow-400' : 'bg-dark-border/60'" />
                </div>
                <button @click="prChartOffset = Math.max(0, prChartOffset - 6)"
                  :disabled="prChartOffset === 0"
                  class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  :class="prChartOffset === 0 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </button>
              </div>
              <p class="text-center text-xs text-dark-textMuted mt-1">{{ prMobileChartLabel }}</p>
            </div>
          </div>
          <div v-else class="text-center py-12 text-dark-textMuted">
            <p>Not enough data for trend chart</p>
            <p class="text-sm mt-1">Chart will appear after Week 3</p>
          </div>
        </div>
      </div>
      </div>

      <!-- Movers & Shakers — blurred when locked -->
      <div :class="!hasLeagueAccess ? 'locked-section' : ''">
      <!-- Desktop: grid of 4 cards -->
      <div class="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Biggest Climber -->
        <div class="card bg-gradient-to-br from-green-500/10 to-transparent border-green-500/20 cursor-pointer transition-all hover:border-green-500/40"
          @mouseenter="biggestClimber && (hoveredTeamKey = biggestClimber.team_key)" @mouseleave="hoveredTeamKey = null">
          <div class="card-body">
            <div class="text-xs uppercase tracking-wider text-green-400 font-bold mb-3">🚀 Biggest Climber</div>
            <div v-if="biggestClimber" class="flex items-center gap-3">
              <img :src="biggestClimber.logo_url || defaultAvatar" :alt="biggestClimber.name" class="w-12 h-12 rounded-full border-2 border-green-500/50 object-cover" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate">{{ biggestClimber.name }}</div>
                <div class="text-sm text-dark-textMuted">#{{ biggestClimber.firstRank }} → #{{ biggestClimber.lastRank }}</div>
              </div>
              <div class="text-2xl font-black text-green-400">+{{ biggestClimber.climb }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </div>
        </div>
        <!-- Biggest Faller -->
        <div class="card bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20 cursor-pointer transition-all hover:border-red-500/40"
          @mouseenter="biggestFaller && (hoveredTeamKey = biggestFaller.team_key)" @mouseleave="hoveredTeamKey = null">
          <div class="card-body">
            <div class="text-xs uppercase tracking-wider text-red-400 font-bold mb-3">📉 Biggest Faller</div>
            <div v-if="biggestFaller" class="flex items-center gap-3">
              <img :src="biggestFaller.logo_url || defaultAvatar" :alt="biggestFaller.name" class="w-12 h-12 rounded-full border-2 border-red-500/50 object-cover" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate">{{ biggestFaller.name }}</div>
                <div class="text-sm text-dark-textMuted">#{{ biggestFaller.firstRank }} → #{{ biggestFaller.lastRank }}</div>
              </div>
              <div class="text-2xl font-black text-red-400">-{{ biggestFaller.fall }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </div>
        </div>
        <!-- Most Consistent -->
        <div class="card bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20 cursor-pointer transition-all hover:border-blue-500/40"
          @mouseenter="mostConsistent && (hoveredTeamKey = mostConsistent.team_key)" @mouseleave="hoveredTeamKey = null">
          <div class="card-body">
            <div class="text-xs uppercase tracking-wider text-blue-400 font-bold mb-3">🎯 Most Consistent</div>
            <div v-if="mostConsistent" class="flex items-center gap-3">
              <img :src="mostConsistent.logo_url || defaultAvatar" :alt="mostConsistent.name" class="w-12 h-12 rounded-full border-2 border-blue-500/50 object-cover" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate">{{ mostConsistent.name }}</div>
                <div class="text-sm text-dark-textMuted">Avg Rank: #{{ mostConsistent.avgRank }}</div>
              </div>
              <div class="text-lg font-black text-blue-400">±{{ mostConsistent.variance.toFixed(1) }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </div>
        </div>
        <!-- Most Volatile -->
        <div class="card bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20 cursor-pointer transition-all hover:border-purple-500/40"
          @mouseenter="mostVolatile && (hoveredTeamKey = mostVolatile.team_key)" @mouseleave="hoveredTeamKey = null">
          <div class="card-body">
            <div class="text-xs uppercase tracking-wider text-purple-400 font-bold mb-3">🎢 Most Volatile</div>
            <div v-if="mostVolatile" class="flex items-center gap-3">
              <img :src="mostVolatile.logo_url || defaultAvatar" :alt="mostVolatile.name" class="w-12 h-12 rounded-full border-2 border-purple-500/50 object-cover" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate">{{ mostVolatile.name }}</div>
                <div class="text-sm text-dark-textMuted">#{{ mostVolatile.minRank }} ↔ #{{ mostVolatile.maxRank }}</div>
              </div>
              <div class="text-lg font-black text-purple-400">±{{ mostVolatile.variance.toFixed(1) }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </div>
        </div>
      </div>

      <!-- Mobile: single card carousel -->
      <div class="md:hidden card p-0 overflow-hidden">
        <div class="p-4">
          <template v-if="prMoverIndex === 0">
            <div class="text-xs uppercase tracking-wider text-green-400 font-bold mb-3">🚀 Biggest Climber</div>
            <div v-if="biggestClimber" class="flex items-center gap-3">
              <img :src="biggestClimber.logo_url || defaultAvatar" class="w-14 h-14 rounded-full border-2 border-green-500/50 object-cover" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate text-base">{{ biggestClimber.name }}</div>
                <div class="text-sm text-dark-textMuted">#{{ biggestClimber.firstRank }} → #{{ biggestClimber.lastRank }}</div>
              </div>
              <div class="text-3xl font-black text-green-400">+{{ biggestClimber.climb }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </template>
          <template v-else-if="prMoverIndex === 1">
            <div class="text-xs uppercase tracking-wider text-red-400 font-bold mb-3">📉 Biggest Faller</div>
            <div v-if="biggestFaller" class="flex items-center gap-3">
              <img :src="biggestFaller.logo_url || defaultAvatar" class="w-14 h-14 rounded-full border-2 border-red-500/50 object-cover" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate text-base">{{ biggestFaller.name }}</div>
                <div class="text-sm text-dark-textMuted">#{{ biggestFaller.firstRank }} → #{{ biggestFaller.lastRank }}</div>
              </div>
              <div class="text-3xl font-black text-red-400">-{{ biggestFaller.fall }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </template>
          <template v-else-if="prMoverIndex === 2">
            <div class="text-xs uppercase tracking-wider text-blue-400 font-bold mb-3">🎯 Most Consistent</div>
            <div v-if="mostConsistent" class="flex items-center gap-3">
              <img :src="mostConsistent.logo_url || defaultAvatar" class="w-14 h-14 rounded-full border-2 border-blue-500/50 object-cover" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate text-base">{{ mostConsistent.name }}</div>
                <div class="text-sm text-dark-textMuted">Avg Rank: #{{ mostConsistent.avgRank }}</div>
              </div>
              <div class="text-2xl font-black text-blue-400">±{{ mostConsistent.variance.toFixed(1) }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </template>
          <template v-else>
            <div class="text-xs uppercase tracking-wider text-purple-400 font-bold mb-3">🎢 Most Volatile</div>
            <div v-if="mostVolatile" class="flex items-center gap-3">
              <img :src="mostVolatile.logo_url || defaultAvatar" class="w-14 h-14 rounded-full border-2 border-purple-500/50 object-cover" @error="handleImageError" />
              <div class="flex-1 min-w-0">
                <div class="font-bold text-dark-text truncate text-base">{{ mostVolatile.name }}</div>
                <div class="text-sm text-dark-textMuted">#{{ mostVolatile.minRank }} ↔ #{{ mostVolatile.maxRank }}</div>
              </div>
              <div class="text-2xl font-black text-purple-400">±{{ mostVolatile.variance.toFixed(1) }}</div>
            </div>
            <div v-else class="text-dark-textMuted text-sm">Not enough data</div>
          </template>
        </div>
        <!-- Nav -->
        <div class="flex items-center justify-center gap-3 pb-3">
          <button @click="prMoverIndex = Math.max(0, prMoverIndex - 1)" :disabled="prMoverIndex === 0"
            class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            :class="prMoverIndex === 0 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <div class="flex gap-1.5">
            <div v-for="(_, i) in 4" :key="i" class="w-2 h-2 rounded-full transition-colors"
              :class="i === prMoverIndex ? 'bg-yellow-400' : 'bg-dark-border/60'" />
          </div>
          <button @click="prMoverIndex = Math.min(3, prMoverIndex + 1)" :disabled="prMoverIndex >= 3"
            class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
            :class="prMoverIndex >= 3 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
      </div>


      <!-- Projected Points by Position - Stacked Bar Visualization -->
      <LeagueGate wrap :locked="!hasLeagueAccess" label="Projected Points by Position">
      <div class="card">
        <div class="card-header">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-2xl">🔮</span>
                <h2 class="card-title">Projected Points by Position</h2>
              </div>
              <p class="text-sm text-dark-textMuted">Total projected points by position group</p>
            </div>
            <!-- Position color legend -->
            <div v-if="rosProjectionsAvailable" class="flex flex-wrap items-center gap-2 text-xs">
              <div v-for="pos in baseballPositions.slice(0, 8)" :key="pos.id" class="flex items-center gap-1">
                <div class="w-3 h-3 rounded" :style="{ backgroundColor: getBaseballPositionColor(pos.id) }"></div>
                <span class="text-dark-textMuted">{{ pos.abbrev }}</span>
              </div>
            </div>
            <!-- Loading indicator instead of button -->
            <div v-if="!rosProjectionsAvailable && isLoadingPlayers" class="flex items-center gap-2 text-sm text-dark-textMuted">
              <LoadingSpinner size="sm" />
              <span>Loading player data...</span>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div v-if="isLoadingPlayers" class="text-center py-8">
            <LoadingSpinner size="md" />
            <p class="text-dark-textMuted">Loading player data...</p>
          </div>
          <div v-else-if="rosProjectionsAvailable" class="space-y-2 p-4">
            <!-- Stacked bar for each team -->
            <div 
              v-for="(team, idx) in positionStrengthData" 
              :key="`proj-${team.team_key}`"
              :class="[
                'rounded-xl transition-all overflow-hidden cursor-pointer',
                team.is_my_team 
                  ? 'bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15' 
                  : 'border border-dark-border/30 hover:border-dark-border/50 hover:bg-dark-border/10'
              ]"
              @click="openProjectedTeamModal(team)"
            >
              <!-- Team Row -->
              <div class="p-3">
                <!-- Desktop: Horizontal layout -->
                <div class="hidden sm:flex items-center gap-3">
                  <!-- Rank -->
                  <div class="w-8 text-center">
                    <span :class="[
                      'font-bold text-lg',
                      team.is_my_team ? 'text-yellow-400' : 'text-dark-textMuted'
                    ]">{{ idx + 1 }}</span>
                  </div>
                  
                  <!-- Team Avatar & Name -->
                  <div class="flex items-center gap-2 w-40 flex-shrink-0">
                    <div class="relative">
                      <img 
                        :src="team.logo_url" 
                        :alt="team.name"
                        loading="lazy"
                        decoding="async"
                        :class="[
                          'w-8 h-8 rounded-full ring-2 object-cover',
                          team.is_my_team ? 'ring-yellow-500' : 'ring-dark-border'
                        ]"
                        @error="handleImageError"
                      />
                      <div v-if="team.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                        <span class="text-[8px] text-gray-900 font-bold">★</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1">
                      <span :class="[
                        'font-medium text-sm truncate',
                        team.is_my_team ? 'text-yellow-400' : 'text-dark-text'
                      ]">{{ team.name }}</span>
                      <svg class="w-4 h-4 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  
                  <!-- Stacked Bar Container -->
                  <div class="flex-1 flex items-center">
                    <div 
                      class="h-8 bg-dark-border/30 rounded-lg overflow-hidden flex"
                      :style="{ width: getTeamBarWidth(team) + '%' }"
                    >
                      <div 
                        v-for="pos in baseballPositions.slice(0, 8)"
                        :key="pos.id"
                        class="h-full flex items-center justify-center text-xs font-bold text-white transition-all"
                        :style="{ 
                          width: getPositionBarWidth(team, pos.id) + '%',
                          backgroundColor: getBaseballPositionColor(pos.id)
                        }"
                        :title="`${pos.abbrev}: ${(team.positionTotals?.[pos.id] || 0).toFixed(1)}`"
                      >
                        <span v-if="(team.positionTotals?.[pos.id] || 0) > 50" class="text-[10px]">
                          {{ (team.positionTotals?.[pos.id] || 0).toFixed(0) }}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Total -->
                  <div class="w-20 text-right">
                    <span :class="[
                      'font-bold text-lg',
                      team.is_my_team ? 'text-yellow-400' : 'text-dark-text'
                    ]">{{ team.rosTotal?.toFixed(0) || 0 }}</span>
                  </div>
                </div>
                
                <!-- Mobile: Stacked layout -->
                <div class="sm:hidden">
                  <div class="flex items-center gap-2 mb-3">
                    <div class="w-6 text-center">
                      <span :class="[
                        'font-bold text-base',
                        team.is_my_team ? 'text-yellow-400' : 'text-dark-textMuted'
                      ]">{{ idx + 1 }}</span>
                    </div>
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <img 
                        :src="team.logo_url" 
                        :alt="team.name"
                        loading="lazy"
                        decoding="async"
                        :class="[
                          'w-8 h-8 rounded-full ring-2 object-cover',
                          team.is_my_team ? 'ring-yellow-500' : 'ring-dark-border'
                        ]"
                        @error="handleImageError"
                      />
                      <span :class="[
                        'font-medium text-sm truncate',
                        team.is_my_team ? 'text-yellow-400' : 'text-dark-text'
                      ]">{{ team.name }}</span>
                    </div>
                    <div class="text-right flex-shrink-0 flex items-center gap-2">
                      <span :class="[
                        'font-bold text-lg',
                        team.is_my_team ? 'text-yellow-400' : 'text-dark-text'
                      ]">{{ team.rosTotal?.toFixed(0) || 0 }}</span>
                      <svg class="w-4 h-4 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                  <div class="ml-8">
                    <div 
                      class="h-7 bg-dark-border/30 rounded-lg overflow-hidden flex"
                      :style="{ width: getTeamBarWidth(team) + '%' }"
                    >
                      <div 
                        v-for="pos in baseballPositions.slice(0, 8)"
                        :key="pos.id"
                        class="h-full flex items-center justify-center text-xs font-bold text-white transition-all"
                        :style="{ 
                          width: getPositionBarWidth(team, pos.id) + '%',
                          backgroundColor: getBaseballPositionColor(pos.id)
                        }"
                      >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 px-4">
            <div v-if="isLoadingPlayers">
              <LoadingSpinner size="md" />
              <p class="text-dark-textMuted mt-2">Loading player data...</p>
            </div>
            <div v-else>
              <div class="text-4xl mb-3">📊</div>
              <p class="text-dark-text font-medium">No Player Data Available</p>
              <p class="text-sm text-dark-textMuted mt-2 max-w-md mx-auto">
                Unable to load position data for this league.
              </p>
            </div>
          </div>
        </div>
      </div>

      </LeagueGate>

      <!-- Position Strength Rankings Table -->
      <LeagueGate wrap :locked="!hasLeagueAccess" label="Position Strength Rankings">
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">💪</span>
            <h2 class="card-title">Position Strength Rankings</h2>
          </div>
          <p class="text-sm text-dark-textMuted mt-1">Rankings by points per position (1 = best)</p>
        </div>
        <div class="card-body">
          <div v-if="positionStrengthData.length > 0">
            <!-- Mobile nav -->
            <div class="sm:hidden flex items-center justify-center gap-3 py-2 border-b border-dark-border/30">
              <button @click="prPosPage = Math.max(0, prPosPage - 1)" :disabled="prPosPage === 0"
                class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                :class="prPosPage === 0 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="flex gap-1.5">
                <div v-for="(_, i) in prPosTotalPages" :key="i"
                  class="w-2 h-2 rounded-full transition-colors"
                  :class="i === prPosPage ? 'bg-yellow-400' : 'bg-dark-border/60'"
                />
              </div>
              <button @click="prPosPage = Math.min(prPosTotalPages - 1, prPosPage + 1)" :disabled="prPosPage >= prPosTotalPages - 1"
                class="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                :class="prPosPage >= prPosTotalPages - 1 ? 'text-dark-border cursor-default' : 'text-yellow-400 hover:bg-yellow-400/10'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                  <th class="py-3 px-4">Team</th>
                  <th 
                    v-for="(pos, posIdx) in baseballPositions.slice(0, 8)" 
                    :key="pos.id"
                    class="py-3 px-2 sm:px-4 text-center cursor-pointer hover:text-yellow-400 w-14"
                    :class="Math.floor(posIdx / 4) !== prPosPage ? 'hidden sm:table-cell' : ''"
                    @click="sortPositionBy(pos.id)"
                  >
                    {{ pos.abbrev }} <span v-if="positionSortColumn === pos.id" class="text-yellow-400">{{ positionSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                  <th class="py-3 px-2 sm:px-4 text-center cursor-pointer hover:text-yellow-400 w-16" @click="sortPositionBy('total')">
                    Total <span v-if="positionSortColumn === 'total'" class="text-yellow-400">{{ positionSortDirection === 'asc' ? '↑' : '↓' }}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="team in sortedPositionStrength" 
                  :key="team.team_key"
                  :class="[
                    'transition-colors border-b border-dark-border/30',
                    team.is_my_team 
                      ? 'bg-yellow-500/10 hover:bg-yellow-500/15 border-l-4 border-l-yellow-500' 
                      : 'hover:bg-dark-border/20'
                  ]"
                >
                  <td class="py-3 px-2 sm:px-4" style="max-width: 0; width: 35%;">
                    <div class="flex items-center gap-2">
                      <div class="relative flex-shrink-0">
                        <img 
                          :src="team.logo_url" 
                          :alt="team.name"
                          loading="lazy"
                          decoding="async"
                          :class="[
                            'w-7 h-7 sm:w-10 sm:h-10 rounded-full ring-2 object-cover',
                            team.is_my_team ? 'ring-yellow-500' : 'ring-dark-border'
                          ]"
                          @error="handleImageError"
                        />
                        <div v-if="team.is_my_team" class="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span class="text-[8px] text-gray-900 font-bold">★</span>
                        </div>
                      </div>
                      <span :class="[
                        'font-semibold truncate text-sm',
                        team.is_my_team ? 'text-yellow-400' : 'text-dark-text'
                      ]">{{ team.name }}</span>
                    </div>
                  </td>
                  <td v-for="(pos, posIdx) in baseballPositions.slice(0, 8)" :key="pos.id" class="py-3 px-2 sm:px-4 text-center"
                    :class="Math.floor(posIdx / 4) !== prPosPage ? 'hidden sm:table-cell' : ''">
                    <span 
                      :class="getRankClass(team.rankings?.[pos.id] || 99, positionStrengthData.length)" 
                      class="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm"
                    >
                      {{ team.rankings?.[pos.id] || '-' }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span :class="[
                      'font-semibold text-base',
                      team.is_my_team ? 'text-yellow-400' : 'text-dark-text'
                    ]">
                      {{ team.rosTotal?.toFixed(0) || 0 }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            </div><!-- end overflow-x-auto -->
          </div><!-- end positionStrengthData check -->
          <div v-else class="text-center py-8">
            <div v-if="isLoadingPlayers">
              <LoadingSpinner size="md" />
              <p class="text-dark-textMuted">Loading player data...</p>
            </div>
            <div v-else>
              <div class="text-4xl mb-3">🏋️</div>
              <p class="text-dark-text font-medium">No Position Data Available</p>
              <p class="text-sm text-dark-textMuted mt-2 max-w-md mx-auto">
                Unable to load position strength data for this league.
              </p>
            </div>
          </div>
        </div>
      </div>
      </LeagueGate>
    </template>

    <!-- Week 1 Pending State -->
    <div v-else-if="isPendingWeek1" class="pr-pending-wrap">
      <div class="card pr-ghost-card" aria-hidden="true">
        <div class="card-body">
          <table class="w-full">
            <thead>
              <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                <th class="py-3 px-4">Rank</th>
                <th class="py-3 px-4">+/-</th>
                <th class="py-3 px-4">Team</th>
                <th class="py-3 px-4 text-center">Score</th>
                <th class="py-3 px-4 text-center">Rec</th>
                <th class="py-3 px-4 text-center hidden sm:table-cell">All-Play</th>
                <th class="py-3 px-4 text-right hidden sm:table-cell">PPW</th>
                <th class="py-3 px-4 text-right hidden sm:table-cell">Last 3</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in 10" :key="i" class="border-b border-dark-border/50">
                <td class="py-3 px-4">
                  <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-dark-border text-dark-text">{{ i }}</span>
                </td>
                <td class="py-3 px-4"><span class="text-dark-textMuted text-sm">—</span></td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-dark-border flex-shrink-0"></div>
                    <div class="h-3 bg-dark-border rounded-full" :style="{ width: (60 + (i * 13) % 40) + 'px' }"></div>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2 justify-center">
                    <div class="h-2 rounded-full bg-dark-border" :style="{ width: (30 + (i * 7) % 30) + 'px' }"></div>
                    <div class="w-8 h-3 bg-dark-border rounded-full"></div>
                  </div>
                </td>
                <td class="py-3 px-4 text-center"><div class="w-10 h-3 bg-dark-border rounded-full mx-auto"></div></td>
                <td class="py-3 px-4 text-center hidden sm:table-cell"><div class="w-10 h-3 bg-dark-border rounded-full mx-auto"></div></td>
                <td class="py-3 px-4 text-right hidden sm:table-cell"><div class="w-8 h-3 bg-dark-border rounded-full ml-auto"></div></td>
                <td class="py-3 px-4 text-right hidden sm:table-cell"><div class="w-8 h-3 bg-dark-border rounded-full ml-auto"></div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="pr-pending-overlay">
        <div class="pr-pending-card">
          <div class="pr-pending-icon">⚡</div>
          <h3 class="pr-pending-title">Power Rankings are almost here</h3>
          <p class="pr-pending-body">Rankings populate once Week 1 is in the books. Check back after your first week of matchups wraps up.</p>
          <div class="pr-pending-badge">
            <span class="pr-pending-dot"></span>
            Week 1 in progress
          </div>
        </div>
      </div>
    </div>

    <!-- Fallback empty state -->
    <div v-else class="text-center py-20">
      <div class="text-6xl mb-4">⚡</div>
      <h2 class="text-2xl font-bold text-dark-text mb-2">Select a Week</h2>
      <p class="text-dark-textMuted">Choose a week above to view power rankings</p>
    </div>

    <!-- Power Ranking Settings Modal -->
    <Teleport to="body">
      <div 
        v-if="showPowerRankingSettings" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showPowerRankingSettings = false"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">Customize Power Rankings</h3>
              <p class="text-sm text-dark-textMuted">Adjust weights to personalize your rankings</p>
            </div>
            <button @click="showPowerRankingSettings = false" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Presets -->
          <div class="p-6 border-b border-dark-border">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Quick Presets</h4>
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="preset in powerRankingPresets" 
                :key="preset.id"
                @click="applyPreset(preset)"
                class="px-3 py-2 rounded-lg border border-dark-border text-sm hover:border-primary hover:text-primary transition-colors"
              >
                {{ preset.icon }} {{ preset.name }}
              </button>
            </div>
          </div>

          <!-- Factors -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Factor Weights</h4>
            <div class="space-y-4">
              <div 
                v-for="factor in powerRankingFactors" 
                :key="factor.id"
                class="bg-dark-border/30 rounded-xl p-4"
              >
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="text-lg">{{ factor.icon }}</span>
                    <span class="font-medium text-dark-text">{{ factor.name }}</span>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" v-model="factor.enabled" class="sr-only peer" @change="recalculatePowerRankings">
                    <div class="w-9 h-5 bg-dark-border rounded-full peer peer-checked:bg-primary transition-colors"></div>
                    <div class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
                  </label>
                </div>
                <p class="text-xs text-dark-textMuted mb-3">{{ factor.description }}</p>
                <div v-if="factor.enabled" class="flex items-center gap-3">
                  <input 
                    type="range" 
                    v-model.number="factor.weight" 
                    min="0" 
                    max="100" 
                    class="flex-1 h-2 bg-dark-border rounded-lg appearance-none cursor-pointer"
                    @input="recalculatePowerRankings"
                  />
                  <span class="text-sm font-bold text-primary w-12 text-right">{{ factor.weight }}%</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="sticky bottom-0 px-6 py-4 border-t border-dark-border bg-dark-elevated flex items-center justify-between">
            <button @click="resetFactors" class="text-sm text-dark-textMuted hover:text-dark-text transition-colors">
              Reset to Default
            </button>
            <button @click="showPowerRankingSettings = false" class="btn-primary">
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Team Detail Modal -->
    <Teleport to="body">
      <div 
        v-if="showTeamDetailModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeTeamDetailModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div class="flex items-center gap-4">
              <img 
                :src="selectedTeamDetail?.logo_url || defaultAvatar" 
                :alt="selectedTeamDetail?.name"
                class="w-12 h-12 rounded-full ring-2 ring-primary object-cover"
                @error="handleImageError"
              />
              <div>
                <h3 class="text-xl font-bold text-dark-text">{{ selectedTeamDetail?.name }}</h3>
                <p class="text-sm text-dark-textMuted">Power Rank #{{ selectedTeamDetail ? powerRankings.indexOf(selectedTeamDetail) + 1 : '-' }}</p>
              </div>
            </div>
            <button @click="closeTeamDetailModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Stats Overview -->
          <div class="p-6 border-b border-dark-border">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-yellow-400">{{ selectedTeamDetail?.powerScore.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Power Score</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeamDetail?.wins }}-{{ selectedTeamDetail?.losses }}</div>
                <div class="text-xs text-dark-textMuted">Record</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeamDetail?.allPlayWins }}-{{ selectedTeamDetail?.allPlayLosses }}</div>
                <div class="text-xs text-dark-textMuted">All-Play</div>
              </div>
              <div class="bg-dark-border/30 rounded-xl p-4 text-center">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeamDetail?.avgScore.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">PPW</div>
              </div>
            </div>
          </div>
          
          <!-- Factor Breakdown -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Power Score Breakdown</h4>
            <div class="space-y-3">
              <div 
                v-for="factor in teamDetailFactors" 
                :key="factor.id"
                class="flex items-center gap-3"
              >
                <span class="text-lg w-8">{{ factor.icon }}</span>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm text-dark-text">{{ factor.name }}</span>
                    <span class="text-sm text-dark-textMuted">{{ factor.weight }}</span>
                  </div>
                  <div class="h-2 bg-dark-border rounded-full overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500"
                      :style="{ width: `${factor.score}%`, backgroundColor: factor.color }"
                    ></div>
                  </div>
                </div>
                <div class="w-16 text-right">
                  <span class="text-sm font-bold" :style="{ color: factor.color }">{{ factor.score.toFixed(1) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Position Modal -->
    <Teleport to="body">
      <div 
        v-if="showPositionModal" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closePositionModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">{{ selectedPosition?.name }} Rankings</h3>
              <p class="text-sm text-dark-textMuted">Season points by team</p>
            </div>
            <button @click="closePositionModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Position Rankings Content -->
          <div class="p-6">
            <div v-if="positionStrengthData.length > 0 && selectedPosition">
              <!-- Team Rankings for this position -->
              <div class="space-y-2">
                <div 
                  v-for="(team, idx) in getTeamsRankedByPosition(selectedPosition.id)" 
                  :key="team.team_key"
                  class="flex items-center gap-4 p-3 rounded-lg bg-dark-border/20"
                  :class="{ 'ring-2 ring-yellow-500/50': team.is_my_team }"
                >
                  <span 
                    class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    :class="idx === 0 ? 'bg-green-500/20 text-green-400' : idx === getTeamsRankedByPosition(selectedPosition.id).length - 1 ? 'bg-red-500/20 text-red-400' : 'bg-dark-border text-dark-textMuted'"
                  >
                    {{ idx + 1 }}
                  </span>
                  <img :src="team.logo_url || defaultAvatar" class="w-8 h-8 rounded-full" />
                  <div class="flex-1">
                    <div class="font-medium text-dark-text">{{ team.name }}</div>
                    <div class="text-xs text-dark-textMuted">{{ getTeamPlayersAtPosition(team.team_key, selectedPosition.id).length }} players</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold text-primary">{{ team.positionTotals?.[selectedPosition.id]?.toFixed(0) || 0 }}</div>
                    <div class="text-xs text-dark-textMuted">points</div>
                  </div>
                </div>
              </div>
              
              <!-- Top Players at this position -->
              <div class="mt-6">
                <h4 class="text-lg font-bold text-dark-text mb-3">Top Players at {{ selectedPosition.name }}</h4>
                <div class="space-y-2">
                  <div 
                    v-for="(player, idx) in getTopPlayersAtPosition(selectedPosition.id).slice(0, 10)" 
                    :key="player.player_key"
                    class="flex items-center gap-3 p-2 rounded-lg bg-dark-border/10"
                  >
                    <span class="w-6 text-center text-sm text-dark-textMuted">{{ idx + 1 }}</span>
                    <img :src="player.headshot || defaultAvatar" class="w-8 h-8 rounded-full" />
                    <div class="flex-1">
                      <div class="text-sm font-medium text-dark-text">{{ player.full_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ player.mlb_team }} • {{ player.fantasy_team || 'Free Agent' }}</div>
                    </div>
                    <div class="text-right">
                      <div class="font-bold text-primary">{{ player.total_points?.toFixed(1) || 0 }}</div>
                      <div class="text-xs text-dark-textMuted">pts</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-8">
              <div class="text-4xl mb-3">📊</div>
              <p class="text-dark-text font-medium">No Data Available</p>
              <p class="text-sm text-dark-textMuted mt-2">Load player data to see position rankings.</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Projected Team Players Modal -->
    <Teleport to="body">
      <div 
        v-if="showProjectedTeamModal && selectedProjectedTeam" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="closeProjectedTeamModal"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-dark-border">
          <!-- Header -->
          <div class="sticky top-0 z-10 px-6 py-4 border-b border-dark-border bg-dark-elevated">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <img 
                  :src="selectedProjectedTeam.logo_url || defaultAvatar" 
                  :alt="selectedProjectedTeam.name"
                  class="w-12 h-12 rounded-full ring-2 object-cover"
                  :class="selectedProjectedTeam.is_my_team ? 'ring-yellow-500' : 'ring-dark-border'"
                />
                <div>
                  <h3 class="text-xl font-bold text-dark-text">{{ selectedProjectedTeam.name }}</h3>
                  <p class="text-sm text-dark-textMuted">
                    <span class="text-primary font-bold">{{ selectedProjectedTeam.rosTotal?.toFixed(0) || 0 }}</span> total points
                  </p>
                </div>
              </div>
              <button @click="closeProjectedTeamModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
                <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <!-- Position color legend -->
            <div class="flex flex-wrap items-center gap-3 mt-4">
              <div v-for="pos in baseballPositions.slice(0, 8)" :key="pos.id" class="flex items-center gap-1.5">
                <div class="w-3 h-3 rounded" :style="{ backgroundColor: getBaseballPositionColor(pos.id) }"></div>
                <span class="text-xs text-dark-textMuted">{{ pos.abbrev }}</span>
                <span class="text-xs font-semibold text-dark-text">{{ (selectedProjectedTeam.positionTotals?.[pos.id] || 0).toFixed(0) }}</span>
              </div>
            </div>
          </div>
          
          <!-- Players by Position -->
          <div class="p-4">
            <div class="grid gap-4">
              <div 
                v-for="pos in baseballPositions.slice(0, 8)" 
                :key="`modal-${pos.id}`"
                class="bg-dark-card/50 rounded-xl p-4"
              >
                <!-- Position Header -->
                <div class="flex items-center gap-2 mb-3">
                  <div 
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    :style="{ backgroundColor: getBaseballPositionColor(pos.id) }"
                  >
                    {{ pos.abbrev }}
                  </div>
                  <div>
                    <span class="font-semibold text-dark-text">{{ pos.name }}</span>
                    <span class="text-sm text-dark-textMuted ml-2">
                      {{ getTeamPlayersAtPosition(selectedProjectedTeam.team_key, pos.id).length }} players
                    </span>
                  </div>
                  <div class="ml-auto">
                    <span class="text-lg font-bold" :style="{ color: getBaseballPositionColor(pos.id) }">
                      {{ (selectedProjectedTeam.positionTotals?.[pos.id] || 0).toFixed(0) }}
                    </span>
                    <span class="text-xs text-dark-textMuted ml-1">pts</span>
                  </div>
                </div>
                
                <!-- Player Cards -->
                <div 
                  v-if="getTeamPlayersAtPosition(selectedProjectedTeam.team_key, pos.id).length > 0"
                  class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2"
                >
                  <div 
                    v-for="player in getTeamPlayersAtPosition(selectedProjectedTeam.team_key, pos.id).sort((a, b) => (b.total_points || 0) - (a.total_points || 0))"
                    :key="player.player_key"
                    class="flex items-center gap-3 p-2 rounded-lg bg-dark-border/30"
                  >
                    <img 
                      :src="getPlayerHeadshot(player)"
                      :alt="player.name"
                      class="w-10 h-10 rounded-full object-cover bg-dark-border flex-shrink-0"
                      @error="handlePlayerImageError"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="text-sm font-medium text-dark-text truncate">{{ player.name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ player.position }}</div>
                    </div>
                    <div class="text-right flex-shrink-0">
                      <div class="text-lg font-bold text-primary">{{ (player.total_points || 0).toFixed(0) }}</div>
                      <div class="text-[10px] text-dark-textMuted">pts</div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-sm text-dark-textMuted italic">No players at this position</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Platform Badge -->
    <div class="flex justify-center mt-8">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border" :class="platformBadgeClass">
        <img 
          :src="platformLogo" 
          :alt="platformName"
          class="w-5 h-5"
        />
        <span class="text-sm" :class="platformSubTextClass">{{ platformName }} Fantasy {{ sportName }} • {{ scoringTypeLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import { useAuthStore } from '@/stores/auth'
import html2canvas from 'html2canvas'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import LeagueGate from '@/components/LeagueGate.vue'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const leagueStore = useLeagueStore()
const router = useRouter()
const { hasLeagueAccess } = useFeatureAccess()

function goToPricing() {
  const params = new URLSearchParams()
  if (leagueStore.activeLeagueId) params.set('league', leagueStore.activeLeagueId)
  if (leagueStore.activePlatform) params.set('platform', leagueStore.activePlatform)
  router.push(`/pricing?${params.toString()}`)
}
const authStore = useAuthStore()

const defaultAvatar = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'https://g.espncdn.com/lm-static/ffl/images/default_logos/team_0.svg'
  if (leagueStore.activePlatform === 'sleeper') return 'https://ui-avatars.com/api/?name=S&background=01b5a5&color=fff&size=64'
  return 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_1_100.png'
})

// Platform styling
const platformName = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'ESPN'
  if (leagueStore.activePlatform === 'sleeper') return 'Sleeper'
  return 'Yahoo!'
})

const platformLogo = computed(() => {
  if (leagueStore.activePlatform === 'espn') return '/espn-logo.svg'
  if (leagueStore.activePlatform === 'sleeper') return '/sleeper-logo.svg'
  return '/yahoo-fantasy.svg'
})

const platformBadgeClass = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'bg-[#5b8def]/10 border-[#5b8def]/30'
  if (leagueStore.activePlatform === 'sleeper') return 'bg-[#01b5a5]/10 border-[#01b5a5]/30'
  return 'bg-purple-600/10 border-purple-600/30'
})

const platformSubTextClass = computed(() => {
  if (leagueStore.activePlatform === 'espn') return 'text-[#5b8def]'
  if (leagueStore.activePlatform === 'sleeper') return 'text-[#01b5a5]'
  return 'text-purple-300'
})

const sportName = computed(() => {
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  const sport = saved?.sport || 'football'
  const names: Record<string, string> = { football: 'Football', baseball: 'Baseball', basketball: 'Basketball', hockey: 'Hockey' }
  return names[sport] || 'Fantasy'
})

// Scoring type label for badge
const scoringTypeLabel = computed(() => {
  const st = (leagueStore.currentLeague?.scoring_type || leagueStore.yahooLeague?.scoring_type || '').toLowerCase()
  if (st.includes('roto')) return 'Roto'
  if (st.includes('point') || st === 'headpoint') return 'H2H Points'
  if (st.includes('head')) return 'H2H Categories'
  return 'H2H Points'
})

// State
const isLoading = ref(false)
const loadingMessage = ref('Loading...')
const loadingProgress = ref({
  currentStep: '',
  week: 0,
  maxWeek: 0
})
const selectedWeek = ref('')
const downloadFormat = ref<'png' | 'gif'>('png')
const isGeneratingDownload = ref(false)
const shareToast = ref<'idle'|'success'|'error'>('idle')
const rankingsTableRef = ref<HTMLElement | null>(null)
const isLoadingPlayers = ref(false)

// Player data for position strength
const allRosteredPlayers = ref<any[]>([])

// Modal state
const showPowerRankingSettings = ref(false)
const showTeamDetailModal = ref(false)
const showPositionModal = ref(false)
const selectedTeamDetail = ref<PowerRankingData | null>(null)
const selectedPosition = ref<{ id: string; name: string } | null>(null)

// Expanded team for projected points by position section (now a modal)
const expandedProjectedTeam = ref<string | null>(null)
const showProjectedTeamModal = ref(false)
const selectedProjectedTeam = ref<any>(null)

// Hovered team for chart highlighting
const hoveredTeamKey = ref<string | null>(null)
const powerChartRef = ref<any>(null)

// ── Mobile carousel/pagination refs ───────────────────────────────────────
const prTablePage = ref(0)    // 0=Score, 1=Record+AllPlay, 2=PPW+Last3
const prMoverIndex = ref(0)   // 0-3: Climber, Faller, Consistent, Volatile
const prChartOffset = ref(0)  // 0=latest weeks, higher=older
const prPosPage = ref(0)      // 0=first 4 positions, 1=next 4

const PR_WEEKS = 6  // weeks visible in mobile chart window

const prChartTotalPages = computed(() => {
  const total = chartOptions.value?.xaxis?.categories?.length || 0
  if (total <= PR_WEEKS) return 1
  const maxOffset = Math.max(0, total - PR_WEEKS)
  return Math.ceil(maxOffset / PR_WEEKS) + 1
})
const prChartCurrentPage = computed(() => {
  const total = chartOptions.value?.xaxis?.categories?.length || 0
  const maxOffset = Math.max(0, total - PR_WEEKS)
  const maxStep = Math.ceil(maxOffset / PR_WEEKS)
  return maxStep - Math.round(prChartOffset.value / PR_WEEKS)
})
const prMobileChartLabel = computed(() => {
  const cats = chartOptions.value?.xaxis?.categories || []
  const total = cats.length
  if (total === 0) return ''
  const endIdx = total - prChartOffset.value
  const startIdx = Math.max(0, endIdx - PR_WEEKS)
  return `${cats[startIdx] || ''} – ${cats[endIdx - 1] || ''}`
})
const prMobileChartSeries = computed(() => {
  if (!chartSeries.value.length || !chartOptions.value) return []
  const total = chartOptions.value?.xaxis?.categories?.length || 0
  const endIdx = total - prChartOffset.value
  const startIdx = Math.max(0, endIdx - PR_WEEKS)
  return chartSeries.value.map((s: any) => ({ ...s, data: (s.data || []).slice(startIdx, endIdx) }))
})
const prMobileChartOptions = computed(() => {
  if (!chartOptions.value) return null
  const cats = chartOptions.value?.xaxis?.categories || []
  const total = cats.length
  const endIdx = total - prChartOffset.value
  const startIdx = Math.max(0, endIdx - PR_WEEKS)
  return {
    ...chartOptions.value,
    chart: { ...chartOptions.value.chart, toolbar: { show: false }, animations: { enabled: false } },
    xaxis: { ...chartOptions.value.xaxis, categories: cats.slice(startIdx, endIdx) },
    legend: { show: false },
    yaxis: { ...chartOptions.value.yaxis, reversed: true, min: 1, max: powerRankings.value.length || 10 }
  }
})
const prMobileTeamOrder = computed(() => {
  if (!chartSeries.value.length || !powerRankings.value.length) return powerRankings.value
  const total = chartOptions.value?.xaxis?.categories?.length || 0
  const endIdx = total - prChartOffset.value
  const lastIdx = Math.max(0, endIdx - 1)
  const rankAtEnd = chartSeries.value.map((s: any) => ({ name: s.name, rank: s.data?.[lastIdx] ?? 999 }))
  return [...powerRankings.value].sort((a, b) => {
    const ra = rankAtEnd.find((r: any) => r.name === a.name)?.rank ?? 999
    const rb = rankAtEnd.find((r: any) => r.name === b.name)?.rank ?? 999
    return ra - rb
  })
})
const prPosTotalPages = computed(() => {
  const numPos = baseballPositions.value?.length || 8
  return Math.ceil(Math.min(numPos, 8) / 4)
})

// Computed: get the series index of the hovered team
const hoveredSeriesIndex = computed(() => {
  if (!hoveredTeamKey.value) return -1
  return powerRankings.value.findIndex(t => t.team_key === hoveredTeamKey.value)
})

// Position sorting
const positionSortColumn = ref<string>('total')
const positionSortDirection = ref<'asc' | 'desc'>('desc')

// Power rankings data
const powerRankings = ref<PowerRankingData[]>([])
const gatedPowerRankings = computed(() =>
  hasLeagueAccess.value ? powerRankings.value : powerRankings.value.slice(0, 3)
)
const historicalPowerRanks = ref<Map<string, number[]>>(new Map())
const allMatchups = ref<Map<number, any[]>>(new Map())

// Power ranking factors
const powerRankingFactors = ref<PowerRankingFactorConfig[]>([
  { id: 'record', name: 'Win-Loss Record', description: 'Team record and winning percentage', enabled: true, weight: 30, icon: '🏆', color: '#22c55e' },
  { id: 'pointsFor', name: 'Total Points Scored', description: 'Total points for the season', enabled: true, weight: 20, icon: '📊', color: '#f5c451' },
  { id: 'allPlay', name: 'All-Play Record', description: 'Record if you played every team every week', enabled: true, weight: 18, icon: '⚔️', color: '#3b82f6' },
  { id: 'recentForm', name: 'Recent Form (Last 3)', description: 'Average points over last 3 weeks', enabled: true, weight: 15, icon: '🔥', color: '#a855f7' },
  { id: 'consistency', name: 'Consistency', description: 'Lower variance = more reliable', enabled: true, weight: 12, icon: '🎯', color: '#ec4899' },
  { id: 'pointsAgainst', name: 'Points Against (Luck)', description: 'Lower PA can indicate schedule luck', enabled: false, weight: 5, icon: '🍀', color: '#10b981' }
])

const powerRankingPresets = [
  { id: 'balanced', name: 'Balanced', icon: '⚖️', factors: { record: 30, pointsFor: 20, allPlay: 18, recentForm: 15, consistency: 12, pointsAgainst: 5 } },
  { id: 'winsMatter', name: 'Wins Matter', icon: '🏆', factors: { record: 50, pointsFor: 15, allPlay: 15, recentForm: 10, consistency: 10, pointsAgainst: 0 } },
  { id: 'trueStrength', name: 'True Strength', icon: '💪', factors: { record: 15, pointsFor: 30, allPlay: 30, recentForm: 10, consistency: 10, pointsAgainst: 5 } },
  { id: 'hotHand', name: 'Hot Hand', icon: '🔥', factors: { record: 20, pointsFor: 15, allPlay: 10, recentForm: 40, consistency: 10, pointsAgainst: 5 } }
]

// Baseball positions
// Sport-specific position configurations
const positionsBySport: Record<string, Array<{ id: string; name: string; abbrev: string; icon: string }>> = {
  baseball: [
    { id: 'C', name: 'Catcher', abbrev: 'C', icon: '🥎' },
    { id: '1B', name: 'First Base', abbrev: '1B', icon: '1️⃣' },
    { id: '2B', name: 'Second Base', abbrev: '2B', icon: '2️⃣' },
    { id: '3B', name: 'Third Base', abbrev: '3B', icon: '3️⃣' },
    { id: 'SS', name: 'Shortstop', abbrev: 'SS', icon: '⚡' },
    { id: 'OF', name: 'Outfield', abbrev: 'OF', icon: '🌿' },
    { id: 'SP', name: 'Starting Pitcher', abbrev: 'SP', icon: '⚾' },
    { id: 'RP', name: 'Relief Pitcher', abbrev: 'RP', icon: '🔥' },
  ],
  basketball: [
    { id: 'PG', name: 'Point Guard', abbrev: 'PG', icon: '🏀' },
    { id: 'SG', name: 'Shooting Guard', abbrev: 'SG', icon: '🎯' },
    { id: 'SF', name: 'Small Forward', abbrev: 'SF', icon: '🏃' },
    { id: 'PF', name: 'Power Forward', abbrev: 'PF', icon: '💪' },
    { id: 'C', name: 'Center', abbrev: 'C', icon: '🗼' },
  ],
  football: [
    { id: 'QB', name: 'Quarterback', abbrev: 'QB', icon: '🏈' },
    { id: 'RB', name: 'Running Back', abbrev: 'RB', icon: '🏃' },
    { id: 'WR', name: 'Wide Receiver', abbrev: 'WR', icon: '🎯' },
    { id: 'TE', name: 'Tight End', abbrev: 'TE', icon: '🤲' },
    { id: 'K', name: 'Kicker', abbrev: 'K', icon: '🦵' },
    { id: 'DEF', name: 'Defense', abbrev: 'DEF', icon: '🛡️' },
  ],
  hockey: [
    { id: 'C', name: 'Center', abbrev: 'C', icon: '🏒' },
    { id: 'LW', name: 'Left Wing', abbrev: 'LW', icon: '⬅️' },
    { id: 'RW', name: 'Right Wing', abbrev: 'RW', icon: '➡️' },
    { id: 'D', name: 'Defenseman', abbrev: 'D', icon: '🛡️' },
    { id: 'G', name: 'Goalie', abbrev: 'G', icon: '🥅' },
  ]
}

// Position color palettes per sport
const positionColorsBySport: Record<string, Record<string, string>> = {
  baseball: {
    'C': '#ef4444', '1B': '#10b981', '2B': '#3b82f6', '3B': '#f59e0b',
    'SS': '#ec4899', 'OF': '#8b5cf6', 'SP': '#06b6d4', 'RP': '#f97316',
  },
  basketball: {
    'PG': '#3b82f6', 'SG': '#10b981', 'SF': '#f59e0b', 'PF': '#ef4444', 'C': '#8b5cf6',
  },
  football: {
    'QB': '#ef4444', 'RB': '#3b82f6', 'WR': '#10b981', 'TE': '#f59e0b', 'K': '#ec4899', 'DEF': '#8b5cf6',
  },
  hockey: {
    'C': '#3b82f6', 'LW': '#10b981', 'RW': '#f59e0b', 'D': '#ef4444', 'G': '#8b5cf6',
  }
}

// Position normalization rules per sport (maps variant positions to display positions)
const positionNormalizationBySport: Record<string, Record<string, string>> = {
  baseball: {
    'LF': 'OF', 'CF': 'OF', 'RF': 'OF', 'P': 'SP', 'DH': 'OF', 'UTIL': 'OF',
  },
  basketball: {
    'G': 'SG', 'F': 'SF', 'UTIL': 'PF', 'G-F': 'SF', 'F-C': 'PF',
  },
  football: {
    'D/ST': 'DEF', 'DST': 'DEF', 'FLEX': 'RB', 'UTIL': 'RB',
  },
  hockey: {
    'W': 'LW', 'F': 'C', 'UTIL': 'C',
  }
}

// Current sport detection
const currentSport = computed(() => {
  const saved = leagueStore.savedLeagues.find(l => l.league_id === leagueStore.activeLeagueId)
  return saved?.sport || 'football'
})

// Dynamic position list based on current sport
const sportPositions = computed(() => {
  return positionsBySport[currentSport.value] || positionsBySport.football
})

// Keep baseballPositions as alias for backward compat in template
const baseballPositions = sportPositions

// Interfaces
interface PowerRankingData {
  team_key: string
  name: string
  logo_url: string
  is_my_team: boolean
  powerScore: number
  avgScore: number
  wins: number
  losses: number
  ties: number
  totalPointsFor: number
  pointsAgainst: number
  allPlayWins: number
  allPlayLosses: number
  recentAvg: number
  stdDev: number
  weekCount: number
  change: number
  prevRank: number
}

interface PowerRankingFactorConfig {
  id: string
  name: string
  description: string
  enabled: boolean
  weight: number
  icon: string
  color: string
}

// Computed
const isSeasonComplete = computed(() => {
  if (leagueStore.currentLeague?.status === 'complete') return true
  // yahooLeague can be an array - check first element
  const yahooData = Array.isArray(leagueStore.yahooLeague) 
    ? leagueStore.yahooLeague[0] 
    : leagueStore.yahooLeague
  if (yahooData?.is_finished === 1 || yahooData?.is_finished === '1') return true
  // Also check ESPN status object
  if (leagueStore.currentLeague?.status?.isFinished) return true
  return false
})

const currentWeek = computed(() => {
  const leg = leagueStore.currentLeague?.settings?.leg || 1
  const endWeek = parseInt(leagueStore.currentLeague?.settings?.end_week) || 0
  
  // For completed seasons, leg can reset to 1 during offseason
  // Use end_week (regular season length) as fallback
  if (isSeasonComplete.value && leg <= 1 && endWeek > 1) {
    console.log(`[PowerRankings] Season complete but leg=${leg}, using end_week=${endWeek}`)
    return endWeek
  }
  // Also handle case where season is complete and leg is valid but end_week might be better
  // (e.g., leg stuck at some intermediate value)
  if (isSeasonComplete.value && endWeek > 0) {
    return Math.max(leg, endWeek)
  }
  return leg
})

// Effective league key - use the actually loaded league (might be previous season)
const effectiveLeagueKey = computed(() => {
  // If currentLeague has a league_id set (might be previous season), use that
  if (leagueStore.currentLeague?.league_id) return leagueStore.currentLeague.league_id
  // Fall back to active league
  return leagueStore.activeLeagueId
})

const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())

const availableWeeks = computed(() => {
  const weeks = []
  // For in-season leagues, currentWeek is the in-progress week, so completed = currentWeek - 1
  // For completed seasons, use currentWeek as-is
  const maxWeek = isSeasonComplete.value ? currentWeek.value : Math.max(0, currentWeek.value - 1)
  for (let i = 1; i <= maxWeek; i++) {
    weeks.push(i)
  }
  return weeks
})

// True when the new season is active (drafted) but Week 1 hasn't finished yet.
// availableWeeks will be empty in this window.
const isPendingWeek1 = computed(() => {
  if (isLoading.value) return false
  if (isSeasonComplete.value) return false
  return availableWeeks.value.length === 0
})

const historicalWeeks = computed(() => {
  if (!selectedWeek.value) return []
  const weeks = []
  const endWeek = parseInt(selectedWeek.value)
  for (let i = 1; i <= endWeek; i++) {
    weeks.push(i)
  }
  return weeks
})

const currentFormulaDisplay = computed(() => {
  const enabled = powerRankingFactors.value.filter(f => f.enabled && f.weight > 0)
  if (enabled.length === 0) return 'No factors enabled'
  
  const total = enabled.reduce((sum, f) => sum + f.weight, 0)
  return enabled.map(f => `${f.name} (${Math.round(f.weight / total * 100)}%)`).join(' + ')
})

const rosProjectionsAvailable = computed(() => allRosteredPlayers.value.length > 0)

// Position strength data - calculated from rostered players
const positionStrengthData = computed(() => {
  if (allRosteredPlayers.value.length === 0) return []
  
  // Group players by team
  const teamPlayers = new Map<string, any[]>()
  const teamInfo = new Map<string, { name: string; logo_url: string; is_my_team: boolean }>()
  
  // Get default avatar once (outside loop for stability)
  const defaultAvatarUrl = defaultAvatar.value
  
  for (const player of allRosteredPlayers.value) {
    if (!player.fantasy_team_key) continue
    
    if (!teamPlayers.has(player.fantasy_team_key)) {
      teamPlayers.set(player.fantasy_team_key, [])
      // Try to find team info from leagueStore
      const teamData = leagueStore.yahooTeams.find(t => t.team_key === player.fantasy_team_key)
      // Priority: teamData.logo_url (from store) > player.logo_url (from API) > default
      const logoUrl = teamData?.logo_url || player.logo_url || defaultAvatarUrl
      teamInfo.set(player.fantasy_team_key, {
        name: player.fantasy_team || teamData?.name || 'Unknown',
        logo_url: logoUrl,
        is_my_team: teamData?.is_my_team || player.is_my_team || false
      })
    }
    teamPlayers.get(player.fantasy_team_key)!.push(player)
  }
  
  // Calculate position totals for each team
  const positionTotals = new Map<string, Map<string, number>>()
  const sport = currentSport.value
  const displayPositions = sportPositions.value.map(p => p.id)
  const normRules = positionNormalizationBySport[sport] || {}
  
  for (const [teamKey, players] of teamPlayers) {
    const totals = new Map<string, number>()
    
    for (const player of players) {
      const pos = player.position || 'UTIL'
      let normalizedPos = pos
      
      // Apply sport-specific normalization
      if (normRules[pos]) {
        normalizedPos = normRules[pos]
      }
      // Handle multi-position players (e.g., "PG/SG", "1B/DH", "SS/2B")
      else if (pos.includes('/')) {
        const positions = pos.split('/')
        normalizedPos = positions.find(p => displayPositions.includes(p)) || normRules[positions[0]] || positions[0]
      }
      
      // If still not in display positions, try normalization or default to first display position
      if (!displayPositions.includes(normalizedPos)) {
        normalizedPos = displayPositions[0]
      }
      
      const currentTotal = totals.get(normalizedPos) || 0
      totals.set(normalizedPos, currentTotal + (player.total_points || 0))
    }
    
    positionTotals.set(teamKey, totals)
  }
  
  // Calculate rankings per position
  const positions = displayPositions
  const positionRankings = new Map<string, Map<string, number>>() // teamKey -> position -> rank
  
  for (const pos of positions) {
    // Get all teams' totals for this position
    const teamTotalsForPos: { teamKey: string; total: number }[] = []
    for (const [teamKey, totals] of positionTotals) {
      teamTotalsForPos.push({ teamKey, total: totals.get(pos) || 0 })
    }
    
    // Sort by total (descending) and assign ranks
    teamTotalsForPos.sort((a, b) => b.total - a.total)
    teamTotalsForPos.forEach((item, idx) => {
      if (!positionRankings.has(item.teamKey)) {
        positionRankings.set(item.teamKey, new Map())
      }
      positionRankings.get(item.teamKey)!.set(pos, idx + 1)
    })
  }
  
  // Build final data structure
  const result: any[] = []
  
  for (const [teamKey, players] of teamPlayers) {
    const info = teamInfo.get(teamKey)!
    const totals = positionTotals.get(teamKey)!
    const rankings = positionRankings.get(teamKey)!
    
    // Calculate ROS total (sum of all position points)
    let rosTotal = 0
    for (const [, pts] of totals) {
      rosTotal += pts
    }
    
    // Convert rankings map to object
    const rankingsObj: Record<string, number> = {}
    for (const [pos, rank] of rankings) {
      rankingsObj[pos] = rank
    }
    
    result.push({
      team_key: teamKey,
      name: info.name,
      logo_url: info.logo_url,
      is_my_team: info.is_my_team,
      rosTotal,
      rankings: rankingsObj,
      positionTotals: Object.fromEntries(totals)
    })
  }
  
  // Sort by rosTotal descending (overall ranking)
  result.sort((a, b) => b.rosTotal - a.rosTotal)
  
  return result
})

const sortedPositionStrength = computed(() => {
  if (positionStrengthData.value.length === 0) return []
  
  const sorted = [...positionStrengthData.value]
  
  if (positionSortColumn.value === 'rank') {
    // Already sorted by rank (rosTotal)
  } else if (positionSortColumn.value === 'total') {
    sorted.sort((a: any, b: any) => {
      return positionSortDirection.value === 'asc' 
        ? (a.rosTotal || 0) - (b.rosTotal || 0)
        : (b.rosTotal || 0) - (a.rosTotal || 0)
    })
  } else {
    // Sort by position rank
    sorted.sort((a: any, b: any) => {
      const aRank = a.rankings?.[positionSortColumn.value] || 999
      const bRank = b.rankings?.[positionSortColumn.value] || 999
      return positionSortDirection.value === 'asc' ? aRank - bRank : bRank - aRank
    })
  }
  
  return sorted
})

// Team detail factors for modal
const teamDetailFactors = computed(() => {
  if (!selectedTeamDetail.value) return []
  
  const team = selectedTeamDetail.value
  const enabled = powerRankingFactors.value.filter(f => f.enabled)
  const totalWeight = enabled.reduce((sum, f) => sum + f.weight, 0)
  
  return enabled.map(factor => {
    const normalizedWeight = Math.round(factor.weight / totalWeight * 100)
    let score = 0
    
    switch (factor.id) {
      case 'record':
        const games = team.wins + team.losses
        score = games > 0 ? (team.wins / games) * 100 : 0
        break
      case 'pointsFor':
        const maxPF = Math.max(...powerRankings.value.map(t => t.totalPointsFor))
        score = maxPF > 0 ? (team.totalPointsFor / maxPF) * 100 : 0
        break
      case 'allPlay':
        const allPlayTotal = team.allPlayWins + team.allPlayLosses
        score = allPlayTotal > 0 ? (team.allPlayWins / allPlayTotal) * 100 : 0
        break
      case 'recentForm':
        const maxRecent = Math.max(...powerRankings.value.map(t => t.recentAvg))
        score = maxRecent > 0 ? (team.recentAvg / maxRecent) * 100 : 0
        break
      case 'consistency':
        const maxStdDev = Math.max(...powerRankings.value.map(t => t.stdDev))
        score = maxStdDev > 0 ? ((maxStdDev - team.stdDev) / maxStdDev) * 100 : 50
        break
      case 'pointsAgainst':
        const maxPA = Math.max(...powerRankings.value.map(t => t.pointsAgainst))
        const minPA = Math.min(...powerRankings.value.map(t => t.pointsAgainst))
        const range = maxPA - minPA
        score = range > 0 ? ((maxPA - team.pointsAgainst) / range) * 100 : 50
        break
    }
    
    return { ...factor, weight: `${normalizedWeight}%`, score }
  })
})

// Chart configuration
const chartOptions = computed(() => {
  if (powerRankings.value.length === 0) return null
  
  // Get the index of the hovered team
  const hoveredIdx = hoveredTeamKey.value 
    ? powerRankings.value.findIndex(t => t.team_key === hoveredTeamKey.value)
    : -1
  
  // Get colors for each team - faded when another team is hovered
  const colors = powerRankings.value.map((team, idx) => {
    const baseColor = team.is_my_team ? '#F5C451' : getTeamColor(idx)
    // If someone is hovered and it's not this team, fade it
    if (hoveredIdx !== -1 && idx !== hoveredIdx) {
      // Convert to rgba with low opacity
      const r = parseInt(baseColor.slice(1, 3), 16)
      const g = parseInt(baseColor.slice(3, 5), 16)
      const b = parseInt(baseColor.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, 0.2)`
    }
    return baseColor
  })
  
  // Stroke widths - hovered line is thicker
  const strokeWidths = powerRankings.value.map((_, idx) => {
    if (hoveredIdx === -1) return 2  // No hover, all same
    return idx === hoveredIdx ? 3 : 2
  })
  
  // Marker sizes - only show markers for hovered team
  const markerSizes = powerRankings.value.map((_, idx) => {
    if (hoveredIdx === -1) return 0  // No hover, no markers
    return idx === hoveredIdx ? 12 : 0  // Only hovered team shows markers
  })
  
  return {
    chart: { 
      type: 'line', 
      background: 'transparent', 
      toolbar: { show: false }, 
      zoom: { enabled: false },
      animations: { enabled: false }
      // No mouse events on chart - hover only from logos and cards
    },
    theme: { mode: 'dark' },
    colors: colors,
    stroke: { 
      width: strokeWidths,
      curve: 'smooth' 
    },
    markers: { 
      size: markerSizes,
      strokeWidth: 0,
      hover: { size: 0 }
    },
    dataLabels: {
      enabled: hoveredIdx !== -1,
      enabledOnSeries: hoveredIdx !== -1 ? [hoveredIdx] : [],
      formatter: function(val: number) {
        return val.toString()
      },
      style: {
        fontSize: '10px',
        fontWeight: 'bold',
        colors: ['#fff']
      },
      background: {
        enabled: false
      },
      offsetY: 0
    },
    xaxis: {
      categories: historicalWeeks.value.map(w => `Wk ${w}`),
      tickAmount: historicalWeeks.value.length,
      tickPlacement: 'on',
      labels: {
        style: { colors: '#9ca3af', fontSize: '11px' },
        rotate: 0,
        hideOverlappingLabels: false,
        trim: false
      }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: powerRankings.value.length,
      labels: { 
        style: { colors: '#9ca3af' }, 
        formatter: (v: number) => `#${Math.round(v)}`,
        offsetX: 0
      }
    },
    legend: { show: false },
    tooltip: { 
      enabled: false  // Disable tooltip since we show markers with labels
    },
    grid: { 
      borderColor: '#374151', 
      padding: { left: 5, right: 45, top: 10, bottom: 0 } 
    },
    states: {
      hover: {
        filter: { type: 'none' }
      },
      active: {
        filter: { type: 'none' }
      }
    }
  }
})

const chartSeries = computed(() => {
  if (powerRankings.value.length === 0) return []
  return powerRankings.value.map(team => ({
    name: team.name,
    data: historicalPowerRanks.value.get(team.team_key) || []
  }))
})

// Movers & Shakers
const biggestClimber = computed(() => {
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let maxClimb = 0
  let climber = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const currentRank = ranks[ranks.length - 1]
    // Find worst (highest number) rank this team has held
    const worstRank = Math.max(...ranks)
    const climb = worstRank - currentRank
    
    if (climb > maxClimb) {
      maxClimb = climb
      climber = { ...team, climb, firstRank: worstRank, lastRank: currentRank }
    }
  })
  
  return climber
})

const biggestFaller = computed(() => {
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let maxFall = 0
  let faller = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const currentRank = ranks[ranks.length - 1]
    // Find best (lowest number) rank this team has held
    const bestRank = Math.min(...ranks)
    const fall = currentRank - bestRank
    
    if (fall > maxFall) {
      maxFall = fall
      faller = { ...team, fall, firstRank: bestRank, lastRank: currentRank }
    }
  })
  
  return faller
})

const mostConsistent = computed(() => {
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let minVariance = Infinity
  let consistent = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length
    const variance = ranks.reduce((sum, rank) => sum + Math.pow(rank - avg, 2), 0) / ranks.length
    
    if (variance < minVariance) {
      minVariance = variance
      consistent = { ...team, variance, avgRank: Math.round(avg) }
    }
  })
  
  return consistent
})

const mostVolatile = computed(() => {
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let maxVariance = 0
  let volatile = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length
    const variance = ranks.reduce((sum, rank) => sum + Math.pow(rank - avg, 2), 0) / ranks.length
    const minRank = Math.min(...ranks)
    const maxRank = Math.max(...ranks)
    
    if (variance > maxVariance) {
      maxVariance = variance
      volatile = { ...team, variance, minRank, maxRank }
    }
  })
  
  return volatile
})

// Methods
function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.dataset.errored) return
  img.dataset.errored = 'true'
  img.src = defaultAvatar.value
}

// Power Score coloring - green for best, yellow for middle, red for worst
function getPowerScoreBarClass(score: number): string {
  const scores = powerRankings.value.map(t => t.powerScore).sort((a, b) => b - a)
  const numTeams = scores.length
  if (numTeams === 0) return 'bg-yellow-500'
  
  // Find position of this score
  const position = scores.indexOf(score) + 1
  const percentile = position / numTeams
  
  // Top 25% = green, Bottom 25% = red, Middle 50% = yellow
  if (percentile <= 0.25) return 'bg-green-500'
  if (percentile > 0.75) return 'bg-red-500'
  return 'bg-yellow-500'
}

function getPowerScoreTextClass(score: number): string {
  const scores = powerRankings.value.map(t => t.powerScore).sort((a, b) => b - a)
  const numTeams = scores.length
  if (numTeams === 0) return 'text-yellow-400'
  
  // Find position of this score
  const position = scores.indexOf(score) + 1
  const percentile = position / numTeams
  
  // Top 25% = green, Bottom 25% = red, Middle 50% = yellow
  if (percentile <= 0.25) return 'text-green-400'
  if (percentile > 0.75) return 'text-red-400'
  return 'text-yellow-400'
}

// Record column - only top green, only bottom red
function getRecordColumnClass(team: any): string {
  const teams = powerRankings.value
  if (teams.length === 0) return 'text-dark-text'
  const sortedByWins = [...teams].sort((a, b) => b.wins - a.wins)
  const maxWins = sortedByWins[0]?.wins
  const minWins = sortedByWins[sortedByWins.length - 1]?.wins
  if (team.wins === maxWins && maxWins > minWins) return 'text-green-400'
  if (team.wins === minWins && maxWins > minWins) return 'text-red-400'
  return 'text-dark-text'
}

// All-Play column - only top green, only bottom red
function getAllPlayColumnClass(team: any): string {
  const teams = powerRankings.value
  if (teams.length === 0) return 'text-dark-textMuted'
  const sortedByAllPlay = [...teams].sort((a, b) => b.allPlayWins - a.allPlayWins)
  const maxWins = sortedByAllPlay[0]?.allPlayWins
  const minWins = sortedByAllPlay[sortedByAllPlay.length - 1]?.allPlayWins
  if (team.allPlayWins === maxWins && maxWins > minWins) return 'text-green-400'
  if (team.allPlayWins === minWins && maxWins > minWins) return 'text-red-400'
  return 'text-dark-textMuted'
}

// Avg Score column - only top green, only bottom red
function getAvgScoreColumnClass(team: any): string {
  const teams = powerRankings.value
  if (teams.length === 0) return 'text-dark-text'
  const sortedByAvg = [...teams].sort((a, b) => b.avgScore - a.avgScore)
  const maxAvg = sortedByAvg[0]?.avgScore
  const minAvg = sortedByAvg[sortedByAvg.length - 1]?.avgScore
  if (team.avgScore === maxAvg && maxAvg > minAvg) return 'text-green-400'
  if (team.avgScore === minAvg && maxAvg > minAvg) return 'text-red-400'
  return 'text-dark-text'
}

// Recent Avg column - only top green, only bottom red
function getRecentAvgColumnClass(team: any): string {
  const teams = powerRankings.value
  if (teams.length === 0) return 'text-dark-textMuted'
  const sortedByRecent = [...teams].sort((a, b) => b.recentAvg - a.recentAvg)
  const maxRecent = sortedByRecent[0]?.recentAvg
  const minRecent = sortedByRecent[sortedByRecent.length - 1]?.recentAvg
  if (team.recentAvg === maxRecent && maxRecent > minRecent) return 'text-green-400'
  if (team.recentAvg === minRecent && maxRecent > minRecent) return 'text-red-400'
  return 'text-dark-textMuted'
}

function getTeamColor(idx: number): string {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#f43f5e']
  return colors[idx % colors.length]
}

function getRankClass(rank: number, total: number): string {
  if (!rank || rank === 99) return 'bg-dark-border text-dark-textMuted'
  
  // Top 1/3 = green, Bottom 1/3 = red, Middle = default gray
  const topThird = Math.ceil(total / 3)
  const bottomThirdStart = total - Math.floor(total / 3) + 1
  
  if (rank <= topThird) return 'bg-green-500/20 text-green-400'
  if (rank >= bottomThirdStart) return 'bg-red-500/20 text-red-400'
  return 'bg-dark-border text-dark-text'
}

function getPositionRankClass(rank: number, total: number): string {
  if (!rank) return 'text-dark-textMuted'
  const percentile = rank / total
  if (percentile <= 0.25) return 'text-green-400'
  if (percentile <= 0.5) return 'text-blue-400'
  if (percentile <= 0.75) return 'text-yellow-400'
  return 'text-red-400'
}

function getAvatarPosition(team: PowerRankingData): { top: string; left: string } {
  const ranks = historicalPowerRanks.value.get(team.team_key) || []
  if (ranks.length === 0) return { top: '0px', left: '0px' }
  
  const lastRank = ranks[ranks.length - 1]
  const numTeams = powerRankings.value.length
  const chartHeight = 400
  const yPercent = ((lastRank - 1) / (numTeams - 1)) * 100
  const top = (chartHeight * 0.08) + (chartHeight * 0.82 * yPercent / 100) - 14
  
  return { top: `${top}px`, left: 'calc(100% - 40px)' }
}

function getPositionLeader(posId: string): string {
  if (positionStrengthData.value.length === 0) return 'Loading...'
  
  // Find the team with rank 1 for this position
  const leader = positionStrengthData.value.find((team: any) => team.rankings?.[posId] === 1)
  if (!leader) return 'N/A'
  
  const points = leader.positionTotals?.[posId] || 0
  return `${leader.name} (${points.toFixed(0)} pts)`
}

function getTeamsRankedByPosition(posId: string): any[] {
  if (positionStrengthData.value.length === 0) return []
  
  // Sort teams by their points at this position
  return [...positionStrengthData.value].sort((a: any, b: any) => {
    const aPoints = a.positionTotals?.[posId] || 0
    const bPoints = b.positionTotals?.[posId] || 0
    return bPoints - aPoints
  })
}

function getTeamPlayersAtPosition(teamKey: string, posId: string): any[] {
  const sport = currentSport.value
  const normRules = positionNormalizationBySport[sport] || {}
  
  return allRosteredPlayers.value.filter(p => {
    if (p.fantasy_team_key !== teamKey) return false
    const pos = p.position || ''
    // Check if position normalizes to the target posId
    if (normRules[pos] === posId) return true
    if (pos.includes('/')) {
      const positions = pos.split('/')
      return positions.includes(posId) || positions.some(pp => normRules[pp] === posId)
    }
    return pos === posId
  })
}

function getTopPlayersAtPosition(posId: string): any[] {
  const sport = currentSport.value
  const normRules = positionNormalizationBySport[sport] || {}
  
  return allRosteredPlayers.value
    .filter(p => {
      const pos = p.position || ''
      if (normRules[pos] === posId) return true
      if (pos.includes('/')) {
        const positions = pos.split('/')
        return positions.includes(posId) || positions.some(pp => normRules[pp] === posId)
      }
      return pos === posId
    })
    .sort((a, b) => (b.total_points || 0) - (a.total_points || 0))
}

// Get color for position in ROS chart (sport-aware)
function getBaseballPositionColor(position: string): string {
  const colors = positionColorsBySport[currentSport.value] || positionColorsBySport.football
  return colors[position] || '#a855f7'
}

// Get max ROS total across all teams for scaling bar widths
const maxRosTotal = computed(() => {
  if (positionStrengthData.value.length === 0) return 0
  return Math.max(...positionStrengthData.value.map((t: any) => t.rosTotal || 0))
})

// Get bar width as percentage of max team total
function getTeamBarWidth(team: any): number {
  const max = maxRosTotal.value
  if (max === 0) return 100
  const teamTotal = team.rosTotal || 0
  // Minimum 40% width so even lowest teams are visible
  return Math.max(40, (teamTotal / max) * 100)
}

// Get width percentage for a position bar segment
function getPositionBarWidth(team: any, position: string): number {
  const total = team.rosTotal || 0
  if (total === 0) return 0
  const posValue = team.positionTotals?.[position] || 0
  return (posValue / total) * 100
}

function sortPositionBy(column: string) {
  if (positionSortColumn.value === column) {
    positionSortDirection.value = positionSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    positionSortColumn.value = column
    positionSortDirection.value = column === 'rank' ? 'asc' : 'desc'
  }
}

function applyPreset(preset: any) {
  powerRankingFactors.value.forEach(factor => {
    if (preset.factors[factor.id] !== undefined) {
      factor.weight = preset.factors[factor.id]
      factor.enabled = preset.factors[factor.id] > 0
    }
  })
  recalculatePowerRankings()
}

function resetFactors() {
  powerRankingFactors.value = [
    { id: 'record', name: 'Win-Loss Record', description: 'Team record and winning percentage', enabled: true, weight: 30, icon: '🏆', color: '#22c55e' },
    { id: 'pointsFor', name: 'Total Points Scored', description: 'Total points for the season', enabled: true, weight: 20, icon: '📊', color: '#f5c451' },
    { id: 'allPlay', name: 'All-Play Record', description: 'Record if you played every team every week', enabled: true, weight: 18, icon: '⚔️', color: '#3b82f6' },
    { id: 'recentForm', name: 'Recent Form (Last 3)', description: 'Average points over last 3 weeks', enabled: true, weight: 15, icon: '🔥', color: '#a855f7' },
    { id: 'consistency', name: 'Consistency', description: 'Lower variance = more reliable', enabled: true, weight: 12, icon: '🎯', color: '#ec4899' },
    { id: 'pointsAgainst', name: 'Points Against (Luck)', description: 'Lower PA can indicate schedule luck', enabled: false, weight: 5, icon: '🍀', color: '#10b981' }
  ]
  recalculatePowerRankings()
}

function openTeamDetailModal(team: PowerRankingData) {
  selectedTeamDetail.value = team
  showTeamDetailModal.value = true
}

function closeTeamDetailModal() {
  showTeamDetailModal.value = false
  selectedTeamDetail.value = null
}

function openPositionModal(posId: string) {
  const pos = baseballPositions.find(p => p.id === posId)
  if (pos) {
    selectedPosition.value = pos
    showPositionModal.value = true
  }
}

function closePositionModal() {
  showPositionModal.value = false
  selectedPosition.value = null
}

// Open modal for projected team players
function openProjectedTeamModal(team: any) {
  selectedProjectedTeam.value = team
  showProjectedTeamModal.value = true
}

// Close projected team modal
function closeProjectedTeamModal() {
  showProjectedTeamModal.value = false
  selectedProjectedTeam.value = null
}

// Get team's weekly points for a specific week (for tooltip)
function getTeamWeeklyPoints(teamKey: string | undefined, week: number): number | null {
  if (!teamKey) return null
  
  // Try to get from matchup data
  const weekMatchups = allMatchups.value.get(week)
  if (!weekMatchups) return null
  
  for (const matchup of weekMatchups) {
    const teamData = matchup.teams?.find((t: any) => t.team_key === teamKey)
    if (teamData) {
      return teamData.points || null
    }
  }
  return null
}

// Get ranks for the currently hovered team
function getHoveredTeamRanks(): number[] {
  if (!hoveredTeamKey.value) return []
  return historicalPowerRanks.value.get(hoveredTeamKey.value) || []
}

// Get position for rank badge based on week index and rank
function getRankBadgePosition(weekIdx: number, rank: number): Record<string, string> {
  const totalWeeks = historicalWeeks.value.length
  const numTeams = powerRankings.value.length
  const chartHeight = 400
  
  // Y position calculation - must match ApexCharts' reversed Y-axis
  // ApexCharts with yaxis.reversed=true places rank 1 at top
  // Chart area: approximately 32px from top (8%), usable height ~328px (82%)
  const chartTopOffset = 32  // ~8% of 400
  const chartUsableHeight = 328  // ~82% of 400
  
  // For reversed Y-axis: rank 1 is at top, rank N is at bottom
  const yRatio = (rank - 1) / Math.max(1, numTeams - 1)
  const top = chartTopOffset + (chartUsableHeight * yRatio)
  
  // X position calculation
  // ApexCharts with our padding (left: 5, right: 45) and y-axis labels (~30px)
  // The plotting area starts at roughly 35px from left edge
  // Avatar is at calc(100% - 40px), so last point is around there
  // For a container of ~600px width: left edge ~6%, right edge ~93%
  const xStart = 6  // First data point percentage from left
  const xEnd = 93   // Last data point percentage from left
  const xRange = xEnd - xStart
  
  const xPercent = totalWeeks > 1 
    ? xStart + (weekIdx / (totalWeeks - 1)) * xRange
    : 50  // center if only one week
  
  return {
    left: `${xPercent}%`,
    top: `${top}px`
  }
}

// Get color for the hovered team
function getHoveredTeamColor(): string {
  if (!hoveredTeamKey.value) return '#F5C451'
  
  const team = powerRankings.value.find(t => t.team_key === hoveredTeamKey.value)
  if (team?.is_my_team) return '#F5C451'
  
  const idx = powerRankings.value.findIndex(t => t.team_key === hoveredTeamKey.value)
  return idx >= 0 ? getTeamColor(idx) : '#F5C451'
}

// Convert number to ordinal (1st, 2nd, 3rd, etc.)
function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ESPN sport-to-headshot path mapping
const espnHeadshotSport: Record<string, string> = {
  baseball: 'mlb',
  basketball: 'nba',
  football: 'nfl',
  hockey: 'nhl'
}

// Get player headshot URL - ESPN players don't have headshots in the roster API
function getPlayerHeadshot(player: any): string {
  // If player has a headshot URL, use it
  if (player.headshot) return player.headshot
  
  // For ESPN, try to construct headshot URL from player ID using correct sport
  if (player.player_id && leagueStore.activePlatform === 'espn') {
    const sport = currentSport.value
    const espnSport = espnHeadshotSport[sport] || 'nfl'
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/${espnSport}/players/full/${player.player_id}.png&w=96&h=70&cb=1`
  }
  
  // Fallback to default avatar
  return defaultAvatar.value
}

// Handle player image error - show initials fallback (prevents flicker loop)
function handlePlayerImageError(event: Event) {
  const img = event.target as HTMLImageElement
  // Prevent infinite error loop - only replace once
  if (img.dataset.errored) return
  img.dataset.errored = 'true'
  img.src = defaultAvatar.value
}

async function downloadRankings() {
  isGeneratingDownload.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    const ApexCharts = (await import('apexcharts')).default
    
    const leagueName = leagueStore.currentLeague?.name || 'League'
    
    // Team colors for chart
    const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']
    const getTeamColor = (idx: number) => teamColors[idx % teamColors.length]
    
    // Load main UFD logo
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/UFD_V8.png')
        if (!response.ok) return ''
        const blob = await response.blob()
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => resolve('')
          reader.readAsDataURL(blob)
        })
      } catch (e) {
        console.warn('Failed to load logo:', e)
        return ''
      }
    }
    
    // Helper to create placeholder avatar
    const createPlaceholder = (teamName: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Use a consistent color based on team name
        const colors = ['#0D8ABC', '#3498DB', '#9B59B6', '#E91E63', '#F39C12', '#1ABC9C', '#2ECC71', '#E74C3C', '#00BCD4', '#8E44AD']
        const colorIndex = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
        ctx.fillStyle = colors[colorIndex]
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(teamName.charAt(0).toUpperCase(), 32, 34)
      }
      const result = canvas.toDataURL('image/png')
      console.log(`[Download] createPlaceholder for ${teamName}: length=${result.length}, starts with data:image=${result.startsWith('data:image')}`)
      return result
    }
    
    const logoBase64 = await loadLogo()
    
    // Load team image - exactly like matchups page

    // Load team logo via own Vercel proxy (server-side, no CORS issues)
    const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string || '')
      reader.onerror = () => resolve('')
      reader.readAsDataURL(blob)
    })

    const drawCircle = (img: HTMLImageElement): string => {
      const c = document.createElement('canvas')
      c.width = 64; c.height = 64
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.beginPath(); ctx.arc(32, 32, 32, 0, Math.PI * 2); ctx.closePath(); ctx.clip()
        ctx.drawImage(img, 0, 0, 64, 64)
      }
      return c.toDataURL('image/png')
    }

    const loadTeamImage = async (team: any): Promise<string> => {
      const url = team.logo_url || ''
      if (!url) return createPlaceholder(team.name)

      const tryFetch = async (fetchUrl: string): Promise<string> => {
        try {
          const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(8000) })
          if (!res.ok) return ''
          const blob = await res.blob()
          if (blob.size < 100) return ''
          const dataUrl = await blobToDataUrl(blob)
          if (!dataUrl.startsWith('data:')) return ''
          return await new Promise<string>((resolve) => {
            const img = new Image()
            img.onload = () => { try { resolve(drawCircle(img)) } catch { resolve('') } }
            img.onerror = () => resolve('')
            img.src = dataUrl
          })
        } catch { return '' }
      }

      // 1. Own proxy (most reliable)
      const r1 = await tryFetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
      if (r1) return r1

      // 2. Direct fetch (works for ESPN which allows CORS)
      const r2 = await tryFetch(url)
      if (r2) return r2

      // 3. img tag (works if browser cached it)
      const r3 = await new Promise<string>((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => { try { resolve(drawCircle(img)) } catch { resolve('') } }
        img.onerror = () => resolve('')
        img.src = url
        setTimeout(() => resolve(''), 3000)
      })
      if (r3) return r3

      return createPlaceholder(team.name)
    }

    // Pre-load all team images
    console.log('[Download] Loading team images...')
    const imageMap = new Map<string, string>()
    const imagePromises = powerRankings.value.map(async (team) => {
      const base64 = await loadTeamImage(team)
      return { teamKey: team.team_key, base64 }
    })
    
    const results = await Promise.all(imagePromises)
    results.forEach(({ teamKey, base64 }) => {
      imageMap.set(teamKey, base64)
    })
    console.log(`[Download] Loaded ${imageMap.size} team images`)
    
    // Create container
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px; font-family: system-ui, -apple-system, sans-serif;'
    
    // Split teams for two columns
    const midpoint = Math.ceil(powerRankings.value.length / 2)
    const firstHalf = powerRankings.value.slice(0, midpoint)
    const secondHalf = powerRankings.value.slice(midpoint)
    const numTeams = powerRankings.value.length
    
    // Ranking row generator
    const generateRankingRow = (team: PowerRankingData, rank: number) => {
      const powerPct = Math.min(100, Math.max(0, team.powerScore))
      const barColor = team.powerScore >= 70 ? '#10b981' : (team.powerScore >= 40 ? '#f59e0b' : '#ef4444')
      const record = `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''}`
      const imgSrc = imageMap.get(team.team_key) || ''
      console.log(`[Download] Row ${rank} (${team.name}): imgSrc length=${imgSrc.length}, starts with data:=${imgSrc.startsWith('data:')}`)
      
      return `
      <div style="display: flex; height: 80px; padding: 0 12px; background: rgba(38, 42, 58, 0.4); border-radius: 10px; margin-bottom: 6px; border: 1px solid rgba(58, 61, 82, 0.4); box-sizing: border-box;">
        <div style="width: 44px; flex-shrink: 0; padding-top: 8px;">
          <span style="font-size: 36px; font-weight: 900; color: #ffffff; font-family: 'Impact', 'Arial Black', sans-serif; letter-spacing: -2px; line-height: 1;">${rank}</span>
          ${team.change !== 0 ? `
            <span style="font-size: 10px; font-weight: 700; color: ${team.change > 0 ? '#10b981' : '#ef4444'}; margin-left: 2px;">
              ${team.change > 0 ? '▲' : '▼'}${Math.abs(team.change)}
            </span>
          ` : ''}
        </div>
        <div style="width: 60px; flex-shrink: 0; padding-top: 16px;">
          <img src="${imgSrc}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #3a3d52; background: #262a3a; object-fit: cover;" />
        </div>
        <div style="flex: 1; min-width: 0; padding-top: 16px;">
          <div style="font-size: 14px; font-weight: 700; color: #f7f7ff; white-space: nowrap; overflow: visible; line-height: 1.2;">${team.name}</div>
          <div style="font-size: 11px; color: #9ca3af; line-height: 1.2; margin-top: 4px;">${record} • ${team.avgScore.toFixed(1)} PPG</div>
        </div>
        <div style="width: 55px; flex-shrink: 0; text-align: center; padding-top: 14px;">
          <div style="font-size: 18px; font-weight: bold; color: #ffffff; line-height: 1;">${team.powerScore.toFixed(1)}</div>
          <div style="width: 100%; height: 5px; background: rgba(58, 61, 82, 0.8); border-radius: 3px; overflow: hidden; margin-top: 12px;">
            <div style="width: ${powerPct}%; height: 100%; background: ${barColor}; border-radius: 3px;"></div>
          </div>
        </div>
      </div>
    `}
    
    container.innerHTML = `
      <div style="background: linear-gradient(160deg, #0f1219 0%, #0a0c14 50%, #0d1117 100%); border-radius: 16px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden;">
        
        <!-- Top Yellow Bar -->
        <div style="background: #facc15; padding: 10px 24px 10px 24px; text-align: center; overflow: visible;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px; display: block; margin-top: -17px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- Header -->
        <div style="display: flex; padding: 16px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2); position: relative; z-index: 10;">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px; display: block;" />` : ''}
          <div style="flex: 1; margin-top: -14px;">
            <div style="font-size: 42px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(250, 204, 21, 0.4); line-height: 1;">Power Rankings</div>
            <div style="font-size: 20px; margin-top: 6px; font-weight: 600; line-height: 1;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #facc15; font-weight: 700;">Week ${selectedWeek.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Main content -->
        <div style="padding: 16px 24px 12px 24px; position: relative;">
          
          <!-- Rankings (Two Columns) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; position: relative; z-index: 1;">
            <div>${firstHalf.map((team, idx) => generateRankingRow(team, idx + 1)).join('')}</div>
            <div>${secondHalf.map((team, idx) => generateRankingRow(team, idx + midpoint + 1)).join('')}</div>
          </div>
          
          <!-- Trend Chart -->
          <div style="background: rgba(38, 42, 58, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 12px; border: 1px solid rgba(250, 204, 21, 0.2); position: relative; z-index: 1;">
            <h3 style="color: #facc15; font-size: 18px; margin: 0 0 12px 0; text-align: center; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Rankings Trend</h3>
            <div id="trend-chart-container" style="height: 220px; position: relative;"></div>
          </div>
          
          <!-- Formula Display -->
          <div style="text-align: center; font-size: 9px; color: #6b7280; margin-bottom: 4px; position: relative; z-index: 1;">
            ${currentFormulaDisplay.value}
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 20px 24px 20px 24px; text-align: center; position: relative; z-index: 1;">
          <span style="font-size: 24px; font-weight: bold; color: #facc15; letter-spacing: -0.5px; display: block; margin-top: -35px;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    // Create trend chart
    const trendChartContainer = container.querySelector('#trend-chart-container')
    if (trendChartContainer && historicalWeeks.value.length >= 2) {
      const maxWeeksToShow = 7
      const startIdx = Math.max(0, historicalWeeks.value.length - maxWeeksToShow)
      const weeksToShow = historicalWeeks.value.slice(startIdx)
      
      const trendSeries = powerRankings.value.map((team) => {
        const allRanks = historicalPowerRanks.value.get(team.team_key) || []
        const ranksToShow = allRanks.slice(startIdx)
        return {
          name: team.name,
          data: ranksToShow
        }
      })
      
      const trendChart = new ApexCharts(trendChartContainer, {
        chart: {
          type: 'line',
          height: 220,
          background: 'transparent',
          toolbar: { show: false },
          animations: { enabled: false }
        },
        series: trendSeries,
        colors: powerRankings.value.map((_, idx) => getTeamColor(idx)),
        stroke: {
          width: 2,
          curve: 'smooth'
        },
        markers: { size: 0, strokeWidth: 0 },
        xaxis: {
          categories: weeksToShow.map(w => `Wk ${w}`),
          tickAmount: weeksToShow.length,
          tickPlacement: 'on',
          labels: {
            style: { colors: '#9ca3af', fontSize: '10px' },
            rotate: 0,
            hideOverlappingLabels: false,
            trim: false
          }
        },
        yaxis: {
          reversed: true,
          min: 1,
          max: numTeams,
          labels: {
            style: { colors: '#9ca3af', fontSize: '10px' },
            formatter: (value: number) => `#${Math.round(value)}`
          }
        },
        legend: { show: false },
        grid: { borderColor: '#374151', strokeDashArray: 3, padding: { right: 50 } },
        tooltip: { enabled: false }
      })
      
      await trendChart.render()
      
      // Wait for chart to render, then add team logos
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const chartEl = trendChartContainer.querySelector('.apexcharts-inner') as HTMLElement
      const plotArea = trendChartContainer.querySelector('.apexcharts-plot-series') as HTMLElement
      
      if (chartEl && plotArea) {
        const plotRect = plotArea.getBoundingClientRect()
        const containerRect = (trendChartContainer as HTMLElement).getBoundingClientRect()
        
        const plotLeft = plotRect.left - containerRect.left
        const plotTop = plotRect.top - containerRect.top
        const plotHeight = plotRect.height
        const plotWidth = plotRect.width
        
        const logoContainer = document.createElement('div')
        logoContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;'
        
        for (let i = 0; i < powerRankings.value.length; i++) {
          const team = powerRankings.value[i]
          const seriesData = trendSeries[i]?.data || []
          if (seriesData.length === 0) continue
          
          const lastRank = seriesData[seriesData.length - 1]
          const yPercent = (lastRank - 1) / (numTeams - 1)
          const yPos = plotTop + (yPercent * plotHeight)
          const xPos = plotLeft + plotWidth
          const logoSize = 20
          
          const logoDiv = document.createElement('div')
          logoDiv.style.cssText = `
            position: absolute;
            left: ${xPos - logoSize / 2 + 4}px;
            top: ${yPos - logoSize / 2}px;
            width: ${logoSize}px;
            height: ${logoSize}px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid ${getTeamColor(i)};
            background: #262a3a;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `
          logoDiv.innerHTML = `<img src="${imageMap.get(team.team_key) || ''}" style="width: 100%; height: 100%; object-fit: cover;" />`
          logoContainer.appendChild(logoDiv)
        }
        
        ;(trendChartContainer as HTMLElement).style.position = 'relative'
        trendChartContainer.appendChild(logoContainer)
      }
      
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    // Capture image
    const canvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: 800
    })
    
    document.body.removeChild(container)
    
    // Download
    const link = document.createElement('a')
    const safeLeagueName = leagueName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')
        const _shareBlobPromise = new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/png')
        })
        if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': _shareBlobPromise })])
          shareToast.value = 'success'
          setTimeout(() => { shareToast.value = 'idle' }, 3000)
        } else {
          const _shareUrl = URL.createObjectURL(await _shareBlobPromise)
          const link = document.createElement('a')
          link.download = `Power-Rankings-Week-${selectedWeek.value}-${safeLeagueName}.png`
          link.href = _shareUrl
          link.click()
          URL.revokeObjectURL(_shareUrl)
        }
    
  } catch (e) {
    console.error('Error generating download:', e)
    shareToast.value = 'error'
      setTimeout(() => { shareToast.value = 'idle' }, 4000)
  } finally {
    isGeneratingDownload.value = false
  }
}

function calculatePowerScore(team: any, allTeams: any[]): number {
  const enabled = powerRankingFactors.value.filter(f => f.enabled)
  const totalWeight = enabled.reduce((sum, f) => sum + f.weight, 0)
  if (totalWeight === 0) return 0
  
  let score = 0
  
  const maxPointsFor = Math.max(...allTeams.map(t => t.totalPointsFor))
  const maxRecentAvg = Math.max(...allTeams.map(t => t.recentAvg))
  const maxStdDev = Math.max(...allTeams.map(t => t.stdDev))
  const maxPA = Math.max(...allTeams.map(t => t.pointsAgainst))
  const minPA = Math.min(...allTeams.map(t => t.pointsAgainst))
  
  enabled.forEach(factor => {
    const normalizedWeight = factor.weight / totalWeight
    let componentScore = 0
    
    switch (factor.id) {
      case 'record':
        const games = team.wins + team.losses
        componentScore = games > 0 ? (team.wins / games) * 100 : 0
        break
      case 'pointsFor':
        componentScore = maxPointsFor > 0 ? (team.totalPointsFor / maxPointsFor) * 100 : 0
        break
      case 'allPlay':
        const apTotal = team.allPlayWins + team.allPlayLosses
        componentScore = apTotal > 0 ? (team.allPlayWins / apTotal) * 100 : 0
        break
      case 'recentForm':
        componentScore = maxRecentAvg > 0 ? (team.recentAvg / maxRecentAvg) * 100 : 0
        break
      case 'consistency':
        componentScore = maxStdDev > 0 ? ((maxStdDev - team.stdDev) / maxStdDev) * 100 : 50
        break
      case 'pointsAgainst':
        const range = maxPA - minPA
        componentScore = range > 0 ? ((maxPA - team.pointsAgainst) / range) * 100 : 50
        break
    }
    
    score += componentScore * normalizedWeight
  })
  
  return score
}

async function calculatePowerRankingsForWeek(throughWeek: number): Promise<PowerRankingData[]> {
  const teams = leagueStore.yahooTeams
  const rankings: PowerRankingData[] = []
  
  // Get matchups for all weeks up to throughWeek
  let matchupsNeeded = false
  for (let w = 1; w <= throughWeek; w++) {
    if (!allMatchups.value.has(w)) {
      matchupsNeeded = true
      break
    }
  }
  
  if (matchupsNeeded) {
    const leagueKey = effectiveLeagueKey.value
    
    if (leagueStore.activePlatform === 'sleeper') {
      // Sleeper: Use historical matchups from store
      console.log(`[Sleeper] Loading matchups for power rankings`)
      const season = leagueStore.currentLeague?.season || new Date().getFullYear().toString()
      
      for (let w = 1; w <= throughWeek; w++) {
        if (!allMatchups.value.has(w)) {
          const sleeperMatchups = leagueStore.historicalMatchups.get(season)?.get(w) || []
          
          // Group by matchup_id and transform
          const matchupMap = new Map<number, any>()
          for (const m of sleeperMatchups) {
            if (!matchupMap.has(m.matchup_id)) {
              matchupMap.set(m.matchup_id, { matchup_id: m.matchup_id, week: w, teams: [] })
            }
            const team = teams.find(t => t.roster_id === m.roster_id)
            matchupMap.get(m.matchup_id).teams.push({
              team_key: `sleeper_${m.roster_id}`,
              points: m.points || 0
            })
          }
          
          allMatchups.value.set(w, Array.from(matchupMap.values()))
        }
      }
    } else if (leagueStore.activePlatform === 'espn') {
      // ESPN: Use ESPN service to load matchups
      console.log(`[ESPN] Loading matchups for power rankings, league: ${leagueKey}`)
      
      // Parse ESPN league info from league key (format: espn_{sport}_LEAGUEID_SEASON)
      const parts = leagueKey.split('_')
      const espnSport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
      const espnLeagueId = parts[2]
      const season = parseInt(parts[3]) || new Date().getFullYear()
      
      for (let w = 1; w <= throughWeek; w++) {
        if (!allMatchups.value.has(w)) {
          try {
            const espnMatchups = await espnService.getMatchups(espnSport, espnLeagueId, season, w)
            // Convert ESPN matchup format to Yahoo format
            const convertedMatchups = espnMatchups.map(m => {
              const homeTeam = teams.find(t => t.team_id === m.homeTeamId?.toString())
              const awayTeam = teams.find(t => t.team_id === m.awayTeamId?.toString())
              return {
                matchup_id: m.id,
                week: w,
                teams: [
                  homeTeam ? { team_key: homeTeam.team_key, points: m.homeScore || 0 } : null,
                  awayTeam ? { team_key: awayTeam.team_key, points: m.awayScore || 0 } : null
                ].filter(Boolean)
              }
            })
            allMatchups.value.set(w, convertedMatchups)
          } catch (e) {
            console.error(`[ESPN] Error fetching week ${w}:`, e)
          }
        }
      }
    } else if (leagueKey && authStore.user?.id) {
      // Yahoo: Use Yahoo service
      await yahooService.initialize(authStore.user.id)
      console.log(`Loading matchups for power rankings using league: ${leagueKey}`)
      for (let w = 1; w <= throughWeek; w++) {
        if (!allMatchups.value.has(w)) {
          try {
            const matchups = await yahooService.getMatchups(leagueKey, w)
            allMatchups.value.set(w, matchups)
          } catch (e) {
            console.error(`Error fetching week ${w}:`, e)
          }
        }
      }
    }
  }
  
  // Calculate stats for each team
  teams.forEach(team => {
    let wins = 0, losses = 0, ties = 0
    let totalPointsFor = 0, totalPointsAgainst = 0
    let allPlayWins = 0, allPlayLosses = 0
    let weekCount = 0
    const weeklyScores: number[] = []
    
    // Calculate from matchups
    for (let week = 1; week <= throughWeek; week++) {
      const matchups = allMatchups.value.get(week) || []
      
      // Find this team's matchup
      for (const matchup of matchups) {
        const myTeam = matchup.teams.find((t: any) => t.team_key === team.team_key)
        const opponent = matchup.teams.find((t: any) => t.team_key !== team.team_key)
        
        if (myTeam && opponent) {
          const myPoints = myTeam.points || 0
          const oppPoints = opponent.points || 0
          
          totalPointsFor += myPoints
          totalPointsAgainst += oppPoints
          weeklyScores.push(myPoints)
          weekCount++
          
          if (myPoints > oppPoints) wins++
          else if (myPoints < oppPoints) losses++
          else ties++
        }
      }
      
      // All-play calculation
      const weekScores: { team_key: string; points: number }[] = []
      for (const matchup of matchups) {
        for (const t of matchup.teams) {
          weekScores.push({ team_key: t.team_key, points: t.points || 0 })
        }
      }
      
      const myScore = weekScores.find(s => s.team_key === team.team_key)
      if (myScore) {
        weekScores.forEach(opp => {
          if (opp.team_key !== team.team_key) {
            if (myScore.points > opp.points) allPlayWins++
            else if (myScore.points < opp.points) allPlayLosses++
          }
        })
      }
    }
    
    // Recent form (last 3)
    const recentScores = weeklyScores.slice(-3)
    const recentAvg = recentScores.length > 0 ? recentScores.reduce((a, b) => a + b, 0) / recentScores.length : 0
    
    // Consistency (std dev)
    let stdDev = 0
    if (weeklyScores.length > 1) {
      const mean = totalPointsFor / weekCount
      const variance = weeklyScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / weeklyScores.length
      stdDev = Math.sqrt(variance)
    }
    
    rankings.push({
      team_key: team.team_key,
      name: team.name,
      logo_url: team.logo_url,
      is_my_team: team.is_my_team,
      powerScore: 0,
      avgScore: weekCount > 0 ? totalPointsFor / weekCount : 0,
      wins,
      losses,
      ties,
      totalPointsFor,
      pointsAgainst: totalPointsAgainst,
      allPlayWins,
      allPlayLosses,
      recentAvg,
      stdDev,
      weekCount,
      change: 0,
      prevRank: 0
    })
  })
  
  // Calculate power scores
  rankings.forEach(team => {
    team.powerScore = calculatePowerScore(team, rankings)
  })
  
  // Sort by power score
  rankings.sort((a, b) => b.powerScore - a.powerScore)
  
  return rankings
}

async function loadPowerRankings() {
  if (!selectedWeek.value) return
  
  isLoading.value = true
  const throughWeek = parseInt(selectedWeek.value)
  loadingMessage.value = 'Loading power rankings...'
  loadingProgress.value = { currentStep: 'Initializing...', week: 0, maxWeek: throughWeek }
  
  try {
    // Calculate rankings for current week
    loadingProgress.value = { currentStep: 'Calculating current week rankings...', week: throughWeek, maxWeek: throughWeek }
    const currentRankings = await calculatePowerRankingsForWeek(throughWeek)
    
    // Calculate rankings for previous week to get change
    if (throughWeek > 1) {
      loadingProgress.value = { currentStep: 'Calculating previous week for changes...', week: throughWeek - 1, maxWeek: throughWeek }
      const prevRankings = await calculatePowerRankingsForWeek(throughWeek - 1)
      
      currentRankings.forEach((team, idx) => {
        const prevIdx = prevRankings.findIndex(t => t.team_key === team.team_key)
        if (prevIdx !== -1) {
          team.prevRank = prevIdx + 1
          team.change = team.prevRank - (idx + 1)
        }
      })
    }
    
    // Calculate historical rankings for chart
    loadingMessage.value = 'Building historical data...'
    const historical = new Map<string, number[]>()
    
    for (let week = 1; week <= throughWeek; week++) {
      loadingProgress.value = { currentStep: `Processing week ${week} history...`, week, maxWeek: throughWeek }
      const weekRankings = await calculatePowerRankingsForWeek(week)
      
      weekRankings.forEach((team, idx) => {
        const ranks = historical.get(team.team_key) || []
        ranks.push(idx + 1)
        historical.set(team.team_key, ranks)
      })
    }
    
    powerRankings.value = currentRankings
    historicalPowerRanks.value = historical
    
    // Also load rostered players for position strength (if not already loaded)
    if (allRosteredPlayers.value.length === 0) {
      loadRosteredPlayers()
    }
  } catch (e) {
    console.error('Error loading power rankings:', e)
  } finally {
    isLoading.value = false
  }
}

async function loadRosteredPlayers() {
  const leagueKey = effectiveLeagueKey.value
  if (!leagueKey) return
  
  isLoadingPlayers.value = true
  
  try {
    // Handle ESPN leagues
    if (leagueStore.activePlatform === 'espn') {
      console.log('[ESPN] Loading rostered players for position strength...')
      
      // Parse league key to get ESPN details
      const parts = leagueKey.split('_')
      const sport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
      const espnLeagueId = parts[2]
      const season = parseInt(parts[3])
      
      // Dynamically import ESPN service
      const { espnService } = await import('@/services/espn')
      
      // Get teams with rosters
      const teamsWithRosters = await espnService.getTeamsWithRosters(sport, espnLeagueId, season)
      console.log('[ESPN] Loaded', teamsWithRosters.length, 'teams with rosters')
      
      // Flatten all players with their team info
      const allPlayers: any[] = []
      const positionCounts = new Map<string, number>()
      
      for (const team of teamsWithRosters) {
        if (!team.roster || team.roster.length === 0) continue
        
        // Use the FULL team key format that matches leagueStore.yahooTeams
        // Format: espn_leagueId_season_teamId (e.g., espn_12345_2024_1)
        const teamKey = `espn_${espnLeagueId}_${season}_${team.id}`
        const teamData = leagueStore.yahooTeams.find(t => t.team_key === teamKey)
        
        console.log(`[ESPN] Team ${team.name}: teamKey=${teamKey}, found=${!!teamData}, logo=${teamData?.logo_url?.slice(0, 50)}...`)
        
        for (const player of team.roster) {
          // Calculate PPG using completed weeks from the league
          const leg = leagueStore.currentLeague?.settings?.leg || 1
          const endWk = parseInt(leagueStore.currentLeague?.settings?.end_week) || leg
          const effectiveWeeks = isSeasonComplete.value ? Math.max(leg, endWk) : Math.max(1, leg - 1)
          const completedWeeks = Math.max(1, effectiveWeeks)
          const ppg = player.actualPoints > 0 ? player.actualPoints / completedWeeks : 0
          
          // Track position counts for debugging
          const pos = player.position || 'Unknown'
          positionCounts.set(pos, (positionCounts.get(pos) || 0) + 1)
          
          // Log position details for first few players to debug
          if (allPlayers.length < 5) {
            console.log(`[ESPN] Player ${player.fullName}: position=${player.position}, positionId=${player.positionId}, actualPoints=${player.actualPoints}`)
          }
          
          allPlayers.push({
            player_key: `espn_${player.playerId}`,
            player_id: player.playerId,
            name: player.fullName,
            position: player.position,
            positionId: player.positionId,
            fantasy_team_key: teamKey,
            fantasy_team: team.name,
            logo_url: teamData?.logo_url || '', // Include logo_url directly
            total_points: player.actualPoints || 0,
            ppg: ppg,
            is_my_team: teamData?.is_my_team || false
          })
        }
      }
      
      console.log('[ESPN] Position counts:', Object.fromEntries(positionCounts))
      allRosteredPlayers.value = allPlayers
      console.log(`[ESPN] Loaded ${allPlayers.length} rostered players`)
      
    } else {
      // Handle Yahoo leagues
      if (!authStore.user?.id) {
        isLoadingPlayers.value = false
        return
      }
      
      await yahooService.initialize(authStore.user.id)
      console.log('Loading rostered players for position strength...')
      
      const rostered = await yahooService.getAllRosteredPlayers(leagueKey)
      
      // Calculate PPG for each player (total_points / ~25 weeks)
      rostered.forEach(p => {
        p.ppg = p.total_points > 0 ? p.total_points / 25 : 0
      })
      
      allRosteredPlayers.value = rostered
      console.log(`Loaded ${rostered.length} rostered players`)
    }
  } catch (e) {
    console.error('Error loading rostered players:', e)
  } finally {
    isLoadingPlayers.value = false
  }
}

function recalculatePowerRankings() {
  if (selectedWeek.value) {
    loadPowerRankings()
  }
}

// Watch for league changes
watch(() => leagueStore.yahooTeams, () => {
  if (leagueStore.yahooTeams.length > 0) {
    // Skip if all teams have zero data - store may be about to fallback to previous season
    const hasData = leagueStore.yahooTeams.some(t => 
      (t.wins || 0) > 0 || (t.losses || 0) > 0 || (t.points_for || 0) > 0
    )
    if (!hasData) {
      console.log('[PointsPowerRankings] Teams have no data, waiting for possible fallback...')
      return
    }
    
    if (!selectedWeek.value) {
      const completedWeek = isSeasonComplete.value ? currentWeek.value : Math.max(1, currentWeek.value - 1)
      if (completedWeek >= 1) {
        selectedWeek.value = completedWeek.toString()
        loadPowerRankings()
      }
    }
  }
}, { immediate: true })

// Watch for currentLeague changes (happens when fallback to previous season occurs)
watch(() => leagueStore.currentLeague?.league_id, (newKey, oldKey) => {
  if (newKey && newKey !== oldKey) {
    console.log(`[PointsPowerRankings] League changed from ${oldKey} to ${newKey}, clearing cache...`)
    // Clear cached matchups since we're loading a different league
    allMatchups.value.clear()
    
    // Recalculate week and reload
    const completedWeek = isSeasonComplete.value ? currentWeek.value : Math.max(1, currentWeek.value - 1)
    console.log(`[PointsPowerRankings] After league change: isComplete=${isSeasonComplete.value}, currentWeek=${currentWeek.value}, completedWeek=${completedWeek}`)
    if (completedWeek >= 1) {
      selectedWeek.value = completedWeek.toString()
      loadPowerRankings()
    }
  }
})

onMounted(() => {
  // Always try to load power rankings if we have teams with actual data
  if (leagueStore.yahooTeams.length > 0) {
    const hasData = leagueStore.yahooTeams.some(t => 
      (t.wins || 0) > 0 || (t.losses || 0) > 0 || (t.points_for || 0) > 0
    )
    if (!hasData) {
      console.log('[PointsPowerRankings] onMounted: Teams have no data, waiting for fallback...')
      return
    }
    
    // Default to last completed week (currentWeek is the in-progress week)
    const completedWeek = isSeasonComplete.value ? currentWeek.value : Math.max(1, currentWeek.value - 1)
    selectedWeek.value = completedWeek.toString()
    loadPowerRankings()
  }
  
  // Also auto-load player data for position strength
  // Don't wait for power rankings - start loading players immediately
  if (leagueStore.yahooTeams.length > 0 && allRosteredPlayers.value.length === 0 && !isLoadingPlayers.value) {
    loadRosteredPlayers()
  }
})
</script>

<style scoped>
/* Power chart - make lines easier to hover */
.power-chart-container :deep(.apexcharts-series path) {
  cursor: pointer;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: stroke-opacity 0.2s ease;
}

/* Ensure tooltip is always on top */
.power-chart-container :deep(.apexcharts-tooltip) {
  z-index: 100;
}
</style>

<style scoped>
.blur-row {
  filter: blur(4px);
  pointer-events: none;
  user-select: none;
}
/* ── Blurred locked sections ── */
.locked-section {
  filter: blur(6px);
  pointer-events: none;
  user-select: none;
  opacity: 0.4;
  transition: filter 0.2s, opacity 0.2s;
}

/* ── Early gate banner (appears right after top-3, above blurred content) ── */
.early-gate-banner {
  position: relative;
  z-index: 10;
  padding: 4px 0 20px;
}
.early-gate-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  background: linear-gradient(135deg, #0f1118 0%, #0c0f1c 100%);
  border: 1px solid rgba(234,179,8,0.35);
  border-left: 3px solid #eab308;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(234,179,8,0.08);
}
.early-gate-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.early-gate-icon {
  font-size: 1.4rem;
  filter: drop-shadow(0 0 8px rgba(234,179,8,0.6));
}
.early-gate-headline {
  font-size: 0.95rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 2px;
  font-family: 'Barlow Condensed', sans-serif;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
.early-gate-sub {
  font-size: 0.75rem;
  color: #6b7280;
}

/* ── Shared CTA button used across all gate styles ── */
.gate-cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
  color: #0a0c14;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.9rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  box-shadow: 0 2px 12px rgba(234,179,8,0.3);
  flex-shrink: 0;
}
.gate-cta-btn:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #eab308 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(234,179,8,0.45);
}
.gate-cta-btn:active {
  transform: translateY(0);
}

/* ── Week 1 Pending State ── */
.pr-pending-wrap { position: relative; }
.pr-ghost-card { filter: blur(3px); opacity: 0.35; pointer-events: none; user-select: none; }
.pr-pending-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center; padding: 24px;
}
.pr-pending-card {
  background: linear-gradient(135deg, #0f1118, #0c0f1c);
  border: 1px solid rgba(234,179,8,0.3);
  border-left: 3px solid #eab308;
  border-radius: 16px; padding: 28px 36px;
  max-width: 440px; width: 100%; text-align: center;
  box-shadow: 0 0 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(234,179,8,0.07);
}
.pr-pending-icon { font-size: 2.5rem; margin-bottom: 12px; }
.pr-pending-title { font-size: 1.2rem; font-weight: 900; color: #fff; margin-bottom: 10px; letter-spacing: -0.01em; }
.pr-pending-body { font-size: 0.875rem; color: #6b7280; line-height: 1.6; margin-bottom: 18px; }
.pr-pending-badge {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: #eab308; background: rgba(234,179,8,0.1); border: 1px solid rgba(234,179,8,0.25);
  padding: 5px 14px; border-radius: 20px;
}
.pr-pending-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #eab308;
  animation: pr-pulse 1.6s ease-in-out infinite;
}
@keyframes pr-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.65); }
}
</style>
