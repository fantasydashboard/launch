<template>
  <div class="space-y-6">
    <!-- Header with Controls -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-dark-text mb-2">Category Power Rankings</h1>
        <p class="text-base text-dark-textMuted">
          H2H Category rankings based on category dominance and balance
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button 
          @click="showSettings = true" 
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

    <!-- Offseason Notice Banner - Only show when season is complete -->
    <div v-if="isSeasonComplete" class="bg-slate-500/10 border border-slate-500/30 rounded-xl p-4 flex items-start gap-3">
      <div class="text-slate-400 text-xl flex-shrink-0">📅</div>
      <div>
        <p class="text-slate-200 font-semibold">It's the offseason</p>
        <p class="text-slate-400 text-sm mt-1">You're viewing last season's data ({{ currentSeason }}). The {{ Number(currentSeason) + 1 }} season will appear automatically once Week 1 begins.</p>
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
                  @click="showSettings = true" 
                  class="text-yellow-400 hover:text-yellow-300 text-xs font-semibold transition-colors mt-1"
                >
                  Customize Formula →
                </button>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <button 
                @click="downloadRankings" 
                :disabled="isGeneratingDownload" 
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
                style="background: transparent; color: #facc15; border: 1px solid #facc15;"
                @mouseover="$event.currentTarget.style.background = '#facc15'; $event.currentTarget.style.color = '#111827'"
                @mouseout="$event.currentTarget.style.background = 'transparent'; $event.currentTarget.style.color = '#facc15'"
              >
                <svg v-if="!isGeneratingDownload" class="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isGeneratingDownload ? 'Generating...' : 'Share' }}
              </button>
            </div>
          </div>
        </div>
        <div class="card-body">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="text-left text-xs text-dark-textMuted uppercase border-b border-dark-border">
                  <th class="py-3 px-4">Rank</th>
                  <th class="py-3 px-4 w-6">+/-</th>
                  <th class="py-3 px-4">Team</th>
                  <th 
                    class="py-3 px-4 text-center cursor-pointer hover:text-red-400 transition-colors"
                    @click="sortPowerRankings('powerScore')"
                  >
                    <div class="flex items-center justify-center gap-1">
                      Power Score
                      <span v-if="sortColumn === 'powerScore'" class="text-red-400">
                        {{ sortDirection === 'desc' ? '↓' : '↑' }}
                      </span>
                    </div>
                  </th>
                  <th 
                    class="py-3 px-4 text-center cursor-pointer hover:text-red-400 transition-colors"
                    @click="sortPowerRankings('catWins')"
                  >
                    <div class="flex items-center justify-center gap-1">
                      Cat W-L-T
                      <span v-if="sortColumn === 'catWins'" class="text-red-400">
                        {{ sortDirection === 'desc' ? '↓' : '↑' }}
                      </span>
                    </div>
                  </th>
                  <th 
                    class="py-3 px-4 text-center cursor-pointer hover:text-red-400 transition-colors"
                    @click="sortPowerRankings('catWinPct')"
                  >
                    <div class="flex items-center justify-center gap-1">
                      Cat Win %
                      <span v-if="sortColumn === 'catWinPct'" class="text-red-400">
                        {{ sortDirection === 'desc' ? '↓' : '↑' }}
                      </span>
                    </div>
                  </th>
                  <th 
                    class="py-3 px-4 text-center hidden md:table-cell cursor-pointer hover:text-red-400 transition-colors"
                    @click="sortPowerRankings('dominant')"
                  >
                    <div class="flex items-center justify-center gap-1">
                      Dominant
                      <span v-if="sortColumn === 'dominant'" class="text-red-400">
                        {{ sortDirection === 'desc' ? '↓' : '↑' }}
                      </span>
                    </div>
                  </th>
                  <th 
                    class="py-3 px-4 text-center hidden md:table-cell cursor-pointer hover:text-red-400 transition-colors"
                    @click="sortPowerRankings('weak')"
                  >
                    <div class="flex items-center justify-center gap-1">
                      Weak
                      <span v-if="sortColumn === 'weak'" class="text-red-400">
                        {{ sortDirection === 'desc' ? '↓' : '↑' }}
                      </span>
                    </div>
                  </th>
                  <th 
                    class="py-3 px-4 text-center hidden lg:table-cell cursor-pointer hover:text-red-400 transition-colors"
                    @click="sortPowerRankings('avgCats')"
                  >
                    <div class="flex items-center justify-center gap-1">
                      Avg/Week
                      <span v-if="sortColumn === 'avgCats'" class="text-red-400">
                        {{ sortDirection === 'desc' ? '↓' : '↑' }}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="team in sortedPowerRankings" 
                  :key="team.team_key"
                  @click="openTeamModal(team)"
                  class="border-b border-dark-border/50 hover:bg-dark-border/20 transition-colors cursor-pointer"
                  :class="{ 
                    'bg-yellow-500/10 ring-2 ring-yellow-500/50 ring-inset': team.is_my_team 
                  }"
                >
                  <td class="py-3 px-4">
                    <span 
                      class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="getRankClass(team.rank)"
                    >
                      {{ team.rank }}
                    </span>
                  </td>
                  <td class="py-3 px-4">
                    <div v-if="team.change !== 0" class="flex items-center gap-1">
                      <span v-if="team.change > 0" class="text-green-400 text-sm font-bold">▲{{ team.change }}</span>
                      <span v-else class="text-red-400 text-sm font-bold">▼{{ Math.abs(team.change) }}</span>
                    </div>
                    <span v-else class="text-dark-textMuted text-sm">—</span>
                  </td>
                  <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                      <div class="relative">
                        <img 
                          :src="team.logo_url || defaultAvatar" 
                          :alt="team.name"
                          class="w-8 h-8 rounded-full object-cover ring-2"
                          :class="team.is_my_team ? 'ring-yellow-500' : 'ring-cyan-500/50'"
                          @error="handleImageError"
                        />
                        <div v-if="team.is_my_team" class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                          <span class="text-[8px] text-gray-900 font-bold">★</span>
                        </div>
                      </div>
                      <span class="font-semibold text-dark-text">{{ team.name }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <div class="flex items-center justify-center gap-2">
                      <div class="w-16 h-2 bg-dark-border rounded-full overflow-hidden">
                        <div 
                          class="h-full rounded-full"
                          :class="getPowerScoreBarClass(team.powerScore)"
                          :style="{ width: `${team.powerScore}%` }"
                        ></div>
                      </div>
                      <span class="font-bold" :class="getPowerScoreTextClass(team.powerScore)">{{ team.powerScore.toFixed(1) }}</span>
                    </div>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="font-medium text-dark-text">
                      {{ team.totalCatWins }}-{{ team.totalCatLosses }}-{{ team.totalCatTies }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center">
                    <span class="font-bold" :class="getCatWinPctClass(team.catWinPct)">
                      {{ (team.catWinPct * 100).toFixed(1) }}%
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center hidden md:table-cell">
                    <span class="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">
                      {{ team.dominantCategories }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center hidden md:table-cell">
                    <span class="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400">
                      {{ team.weakCategories }}
                    </span>
                  </td>
                  <td class="py-3 px-4 text-center hidden lg:table-cell">
                    <span class="font-medium" :class="getAvgCatsClass(team.avgCatsWonPerWeek)">
                      {{ team.avgCatsWonPerWeek.toFixed(1) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Historical Chart (Power Rankings Over Time) -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📈</span>
            <h2 class="card-title">Power Rankings Over Time</h2>
          </div>
        </div>
        <div class="card-body">
          <div v-if="chartSeries.length > 0" class="relative">
            <apexchart ref="apexChartRef" type="line" :height="chartHeight" :options="chartOptions" :series="chartSeries" />
            
            <!-- Team avatar overlays at end of lines - positioned after chart renders -->
            <div 
              v-for="(team, idx) in powerRankings" 
              :key="'avatar-' + team.team_key"
              class="absolute cursor-pointer transition-opacity duration-200"
              :class="{ 'opacity-30': chartHoveredTeamKey && chartHoveredTeamKey !== team.team_key }"
              :style="getChartAvatarStyle(team)"
              @mouseenter="chartHoveredTeamKey = team.team_key"
              @mouseleave="chartHoveredTeamKey = null"
            >
              <div class="relative">
                <img 
                  :src="team.logo_url || defaultAvatar" 
                  :alt="team.name"
                  class="w-6 h-6 rounded-full ring-2 object-cover"
                  :class="team.is_my_team ? 'ring-yellow-500' : 'ring-dark-border'"
                  @error="handleImageError"
                />
                <div v-if="team.is_my_team" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span class="text-[6px] text-gray-900 font-bold">★</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12 text-dark-textMuted">
            Not enough data for chart
          </div>
        </div>
      </div>

      <!-- Rankings Insights -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Biggest Climber -->
        <div 
          :class="[
          'card rounded-xl border-2 transition-all cursor-pointer',
          biggestClimber && biggestClimber.is_my_team 
            ? 'border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5' 
            : 'border-dark-border'
        ]"
          @mouseenter="biggestClimber && (chartHoveredTeamKey = biggestClimber.team_key)"
          @mouseleave="chartHoveredTeamKey = null"
        >
          <div class="card-header pb-2">
            <div class="text-sm text-dark-textMuted uppercase tracking-wide">📈 Biggest Climber</div>
          </div>
          <div class="card-body pt-2" v-if="biggestClimber">
            <div class="flex items-center gap-3 mb-2">
              <div class="relative">
                <img 
                  :src="biggestClimber.logo_url || defaultAvatar" 
                  :alt="biggestClimber.name" 
                  :class="[
                    'w-12 h-12 rounded-full ring-2 object-cover',
                    biggestClimber.is_my_team ? 'ring-yellow-500' : 'ring-cyan-500'
                  ]"
                  @error="handleImageError" 
                />
                <div v-if="biggestClimber.is_my_team" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-xs text-gray-900 font-bold">★</span>
                </div>
              </div>
              <div class="flex-1">
                <div :class="[
                  'font-bold',
                  biggestClimber.is_my_team ? 'text-yellow-400' : 'text-dark-text'
                ]">{{ biggestClimber.name }}</div>
                <div class="text-xs text-dark-textMuted">Started #{{ biggestClimber.firstRank }}</div>
              </div>
            </div>
            <div class="text-center mt-3 p-3 bg-green-500/10 rounded-xl">
              <div class="text-2xl font-bold text-green-400">↑{{ biggestClimber.climb }}</div>
              <div class="text-xs text-dark-textMuted mt-1">positions up</div>
            </div>
          </div>
          <div v-else class="card-body pt-2 text-center text-dark-textMuted text-sm">
            Need more weeks of data
          </div>
        </div>

        <!-- Biggest Faller -->
        <div 
          :class="[
          'card rounded-xl border-2 transition-all cursor-pointer',
          biggestFaller && biggestFaller.is_my_team 
            ? 'border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5' 
            : 'border-dark-border'
        ]"
          @mouseenter="biggestFaller && (chartHoveredTeamKey = biggestFaller.team_key)"
          @mouseleave="chartHoveredTeamKey = null"
        >
          <div class="card-header pb-2">
            <div class="text-sm text-dark-textMuted uppercase tracking-wide">📉 Biggest Faller</div>
          </div>
          <div class="card-body pt-2" v-if="biggestFaller">
            <div class="flex items-center gap-3 mb-2">
              <div class="relative">
                <img 
                  :src="biggestFaller.logo_url || defaultAvatar" 
                  :alt="biggestFaller.name" 
                  :class="[
                    'w-12 h-12 rounded-full ring-2 object-cover',
                    biggestFaller.is_my_team ? 'ring-yellow-500' : 'ring-cyan-500'
                  ]"
                  @error="handleImageError" 
                />
                <div v-if="biggestFaller.is_my_team" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-xs text-gray-900 font-bold">★</span>
                </div>
              </div>
              <div class="flex-1">
                <div :class="[
                  'font-bold',
                  biggestFaller.is_my_team ? 'text-yellow-400' : 'text-dark-text'
                ]">{{ biggestFaller.name }}</div>
                <div class="text-xs text-dark-textMuted">Started #{{ biggestFaller.firstRank }}</div>
              </div>
            </div>
            <div class="text-center mt-3 p-3 bg-red-500/10 rounded-xl">
              <div class="text-2xl font-bold text-red-400">↓{{ biggestFaller.fall }}</div>
              <div class="text-xs text-dark-textMuted mt-1">positions down</div>
            </div>
          </div>
          <div v-else class="card-body pt-2 text-center text-dark-textMuted text-sm">
            Need more weeks of data
          </div>
        </div>

        <!-- Most Consistent -->
        <div 
          :class="[
          'card rounded-xl border-2 transition-all cursor-pointer',
          mostConsistent && mostConsistent.is_my_team 
            ? 'border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5' 
            : 'border-dark-border'
        ]"
          @mouseenter="mostConsistent && (chartHoveredTeamKey = mostConsistent.team_key)"
          @mouseleave="chartHoveredTeamKey = null"
        >
          <div class="card-header pb-2">
            <div class="text-sm text-dark-textMuted uppercase tracking-wide">🎯 Most Consistent</div>
          </div>
          <div class="card-body pt-2" v-if="mostConsistent">
            <div class="flex items-center gap-3 mb-2">
              <div class="relative">
                <img 
                  :src="mostConsistent.logo_url || defaultAvatar" 
                  :alt="mostConsistent.name" 
                  :class="[
                    'w-12 h-12 rounded-full ring-2 object-cover',
                    mostConsistent.is_my_team ? 'ring-yellow-500' : 'ring-cyan-500'
                  ]"
                  @error="handleImageError" 
                />
                <div v-if="mostConsistent.is_my_team" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-xs text-gray-900 font-bold">★</span>
                </div>
              </div>
              <div class="flex-1">
                <div :class="[
                  'font-bold',
                  mostConsistent.is_my_team ? 'text-yellow-400' : 'text-dark-text'
                ]">{{ mostConsistent.name }}</div>
                <div class="text-xs text-dark-textMuted">Avg Rank #{{ mostConsistent.avgRank }}</div>
              </div>
            </div>
            <div class="text-center mt-3 p-3 bg-cyan-500/10 rounded-xl">
              <div class="text-2xl font-bold text-cyan-400">{{ mostConsistent.variance.toFixed(1) }}</div>
              <div class="text-xs text-dark-textMuted mt-1">rank variance</div>
            </div>
          </div>
          <div v-else class="card-body pt-2 text-center text-dark-textMuted text-sm">
            Need more weeks of data
          </div>
        </div>

        <!-- Most Volatile -->
        <div 
          :class="[
          'card rounded-xl border-2 transition-all cursor-pointer',
          mostVolatile && mostVolatile.is_my_team 
            ? 'border-yellow-500/40 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5' 
            : 'border-dark-border'
        ]"
          @mouseenter="mostVolatile && (chartHoveredTeamKey = mostVolatile.team_key)"
          @mouseleave="chartHoveredTeamKey = null"
        >
          <div class="card-header pb-2">
            <div class="text-sm text-dark-textMuted uppercase tracking-wide">🎢 Most Volatile</div>
          </div>
          <div class="card-body pt-2" v-if="mostVolatile">
            <div class="flex items-center gap-3 mb-2">
              <div class="relative">
                <img 
                  :src="mostVolatile.logo_url || defaultAvatar" 
                  :alt="mostVolatile.name" 
                  :class="[
                    'w-12 h-12 rounded-full ring-2 object-cover',
                    mostVolatile.is_my_team ? 'ring-yellow-500' : 'ring-cyan-500'
                  ]"
                  @error="handleImageError" 
                />
                <div v-if="mostVolatile.is_my_team" class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-xs text-gray-900 font-bold">★</span>
                </div>
              </div>
              <div class="flex-1">
                <div :class="[
                  'font-bold',
                  mostVolatile.is_my_team ? 'text-yellow-400' : 'text-dark-text'
                ]">{{ mostVolatile.name }}</div>
                <div class="text-xs text-dark-textMuted">Swings #{{ mostVolatile.minRank }}-{{ mostVolatile.maxRank }}</div>
              </div>
            </div>
            <div class="text-center mt-3 p-3 bg-orange-500/10 rounded-xl">
              <div class="text-2xl font-bold text-orange-400">{{ mostVolatile.variance.toFixed(1) }}</div>
              <div class="text-xs text-dark-textMuted mt-1">rank variance</div>
            </div>
          </div>
          <div v-else class="card-body pt-2 text-center text-dark-textMuted text-sm">
            Need more weeks of data
          </div>
        </div>
      </div>
    </template>

    <!-- Empty State -->
    <div v-else class="text-center py-20">
      <div class="text-6xl mb-4">📊</div>
      <h3 class="text-xl font-bold text-dark-text mb-2">Select a Week</h3>
      <p class="text-dark-textMuted">Choose a week to view power rankings</p>
    </div>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div 
        v-if="showSettings" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showSettings = false"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-dark-border">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-dark-text">Power Rankings Settings</h3>
              <p class="text-sm text-dark-textMuted">Customize how category power rankings are calculated</p>
            </div>
            <button @click="showSettings = false" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Presets -->
          <div class="px-6 py-4 border-b border-dark-border">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Quick Presets</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="preset in powerPresets"
                :key="preset.id"
                @click="applyPreset(preset)"
                class="p-3 rounded-xl border transition-colors text-left"
                :class="currentPresetId === preset.id 
                  ? 'border-primary bg-primary/10' 
                  : 'border-dark-border hover:border-dark-textMuted bg-dark-border/20'"
              >
                <div class="flex items-start gap-2">
                  <span class="text-xl flex-shrink-0">{{ preset.icon }}</span>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-semibold" :class="currentPresetId === preset.id ? 'text-primary' : 'text-dark-text'">{{ preset.name }}</div>
                    <div class="text-xs text-dark-textMuted mt-0.5 leading-tight">{{ preset.description }}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
          
          <!-- Factors -->
          <div class="px-6 py-4 overflow-y-auto max-h-[45vh]">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider">Ranking Factors</h4>
              <span class="text-xs text-dark-textMuted">Total: {{ totalWeight }}%</span>
            </div>
            
            <div class="space-y-3">
              <div 
                v-for="factor in powerFactors" 
                :key="factor.id"
                class="bg-dark-border/20 rounded-xl p-4"
              >
                <div class="flex items-start justify-between gap-4 mb-2">
                  <div class="flex items-start gap-3 flex-1 min-w-0">
                    <span class="text-2xl flex-shrink-0 mt-0.5">{{ factor.icon }}</span>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold text-dark-text text-sm">{{ factor.name }}</div>
                      <p class="text-xs text-dark-textMuted mt-1 leading-relaxed">{{ factor.description }}</p>
                    </div>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      v-model="factor.enabled" 
                      @change="onFactorChange"
                      class="sr-only peer"
                    />
                    <div class="w-11 h-6 bg-dark-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
                
                <div v-if="factor.enabled" class="flex items-center gap-4 mt-3 pt-3 border-t border-dark-border/30">
                  <input 
                    type="range" 
                    v-model.number="factor.weight" 
                    min="0" 
                    max="100" 
                    step="5"
                    @input="onFactorChange"
                    class="flex-1 h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div class="w-16 flex items-center gap-1 flex-shrink-0">
                    <input 
                      type="number" 
                      v-model.number="factor.weight" 
                      min="0" 
                      max="100"
                      @input="onFactorChange"
                      class="w-12 px-2 py-1 rounded bg-dark-bg border border-dark-border text-dark-text text-sm text-center"
                    />
                    <span class="text-dark-textMuted text-sm">%</span>
                  </div>
                </div>
                
                <!-- Weight bar visualization -->
                <div v-if="factor.enabled" class="mt-2 h-1.5 bg-dark-border rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all"
                    :style="{ width: `${factor.weight}%`, backgroundColor: factor.color }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="px-6 py-4 border-t border-dark-border flex items-center justify-between">
            <button 
              @click="resetFactors"
              class="px-4 py-2 text-sm text-dark-textMuted hover:text-dark-text transition-colors"
            >
              Reset to Default
            </button>
            <div class="flex items-center gap-3">
              <button @click="showSettings = false" class="px-4 py-2 rounded-lg bg-dark-border hover:bg-dark-border/70 text-dark-text font-medium transition-colors">
                Cancel
              </button>
              <button @click="applySettings" class="btn-primary">
                Apply & Recalculate
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Team Detail Modal -->
    <Teleport to="body">
      <div 
        v-if="showTeamModal && selectedTeam" 
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="showTeamModal = false"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div class="relative bg-dark-elevated rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-dark-border">
          <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
            <div class="flex items-center gap-3">
              <img :src="selectedTeam.logo_url || defaultAvatar" class="w-10 h-10 rounded-full" @error="handleImageError" />
              <div>
                <h3 class="text-lg font-bold text-dark-text">{{ selectedTeam.name }}</h3>
                <p class="text-sm text-dark-textMuted">Category Breakdown</p>
              </div>
            </div>
            <button @click="showTeamModal = false" class="p-2 rounded-lg hover:bg-dark-border/50">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-2 gap-4 mb-6">
              <div class="text-center p-3 bg-dark-card rounded-lg">
                <div class="text-2xl font-black" :class="getPowerScoreTextClass(selectedTeam.powerScore)">{{ selectedTeam.powerScore.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Power Score</div>
              </div>
              <div class="text-center p-3 bg-dark-card rounded-lg">
                <div class="text-2xl font-black text-dark-text">{{ selectedTeam.totalCatWins }}-{{ selectedTeam.totalCatLosses }}</div>
                <div class="text-xs text-dark-textMuted">Cat W-L</div>
              </div>
            </div>
            <div class="space-y-2">
              <div 
                v-for="cat in displayCategories" 
                :key="cat.stat_id"
                class="flex items-center gap-2"
              >
                <span class="w-12 text-xs text-dark-textMuted">{{ cat.display_name }}</span>
                <div class="flex-1 h-3 bg-dark-border rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full"
                    :class="getCategoryBarClass(selectedTeam.categoryRanks[cat.stat_id])"
                    :style="{ width: `${(selectedTeam.categoryWins[cat.stat_id] || 0) / maxCategoryWins * 100}%` }"
                  ></div>
                </div>
                <span class="w-8 text-sm font-bold text-right" :class="getCategoryClass(selectedTeam.categoryRanks[cat.stat_id])">
                  {{ selectedTeam.categoryWins[cat.stat_id] || 0 }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, Teleport } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import { espnService } from '@/services/espn'
import { calculateCategoryBalance } from '@/services/categoryPowerRankingFactors'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

// Platform detection
const isEspn = computed(() => leagueStore.activePlatform === 'espn')

// State
const isLoading = ref(false)
const loadingMessage = ref('Loading...')
const loadingProgress = ref({
  currentStep: '',
  week: 0,
  maxWeek: 0
})
const selectedWeek = ref('')
const powerRankings = ref<any[]>([])
const displayCategories = ref<any[]>([])
const totalWeeksLoaded = ref(0)
const defaultAvatar = computed(() => {
  if (isEspn.value) return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwIiB5PSI1OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzg4OCIgZm9udC1zaXplPSIxOCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiPkVTUE48L3RleHQ+PC9zdmc+'
  return 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_2_g.png'
})

// Power rankings table sorting
const sortColumn = ref<string>('powerScore')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Modals
const showSettings = ref(false)
const showTeamModal = ref(false)
const selectedTeam = ref<any>(null)

// Chart
const chartSeries = ref<any[]>([])
const chartOptions = ref<any>(null)
const historicalRanks = ref<Map<string, number[]>>(new Map())
const chartWeeks = ref<number[]>([])
const chartHeight = 400

// Chart refs for avatar positioning
const apexChartRef = ref<any>(null)
const avatarPositions = ref<Map<string, { top: number, right: number }>>(new Map())
const chartHoveredTeamKey = ref<string | null>(null)

// Team colors
const teamColors = ['#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#84CC16', '#6366F1', '#14B8A6', '#F43F5E']

function getTeamColor(index: number) {
  return teamColors[index % teamColors.length]
}

// Power ranking factors for H2H Categories
const powerFactors = ref([
  {
    id: 'catWinPct',
    name: 'Category Win %',
    description: 'Overall category win percentage across all matchups',
    enabled: true,
    weight: 35,
    icon: '🏆',
    color: '#22c55e'
  },
  {
    id: 'dominantCategories',
    name: 'Category Dominance',
    description: 'Number of categories where team ranks in top 2',
    enabled: true,
    weight: 25,
    icon: '💪',
    color: '#f5c451'
  },
  {
    id: 'categoryBalance',
    name: 'Category Balance',
    description: 'How evenly wins are distributed across categories',
    enabled: true,
    weight: 15,
    icon: '⚖️',
    color: '#3b82f6'
  },
  {
    id: 'weakCategories',
    name: 'Weak Category Penalty',
    description: 'Penalty for categories where team ranks in bottom 2',
    enabled: true,
    weight: 15,
    icon: '📉',
    color: '#ef4444'
  },
  {
    id: 'avgCatsPerWeek',
    name: 'Avg Cats Won/Week',
    description: 'Average number of categories won each week',
    enabled: true,
    weight: 10,
    icon: '📊',
    color: '#a855f7'
  }
])

const powerPresets = [
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Default balanced approach',
    icon: '⚖️',
    factors: {
      catWinPct: { enabled: true, weight: 35 },
      dominantCategories: { enabled: true, weight: 25 },
      categoryBalance: { enabled: true, weight: 15 },
      weakCategories: { enabled: true, weight: 15 },
      avgCatsPerWeek: { enabled: true, weight: 10 }
    }
  },
  {
    id: 'dominator',
    name: 'Category Dominator',
    description: 'Rewards owning specific categories',
    icon: '💪',
    factors: {
      catWinPct: { enabled: true, weight: 25 },
      dominantCategories: { enabled: true, weight: 45 },
      categoryBalance: { enabled: false, weight: 0 },
      weakCategories: { enabled: true, weight: 20 },
      avgCatsPerWeek: { enabled: true, weight: 10 }
    }
  },
  {
    id: 'wellRounded',
    name: 'Well-Rounded',
    description: 'Favors balanced production',
    icon: '🎯',
    factors: {
      catWinPct: { enabled: true, weight: 25 },
      dominantCategories: { enabled: true, weight: 15 },
      categoryBalance: { enabled: true, weight: 40 },
      weakCategories: { enabled: true, weight: 15 },
      avgCatsPerWeek: { enabled: true, weight: 5 }
    }
  },
  {
    id: 'winPctFocused',
    name: 'Win % Focused',
    description: 'Pure category win rate',
    icon: '🏆',
    factors: {
      catWinPct: { enabled: true, weight: 60 },
      dominantCategories: { enabled: true, weight: 15 },
      categoryBalance: { enabled: true, weight: 10 },
      weakCategories: { enabled: true, weight: 10 },
      avgCatsPerWeek: { enabled: true, weight: 5 }
    }
  },
  {
    id: 'noWeakness',
    name: 'No Weaknesses',
    description: 'Heavy penalty for weak categories',
    icon: '🛡️',
    factors: {
      catWinPct: { enabled: true, weight: 30 },
      dominantCategories: { enabled: true, weight: 15 },
      categoryBalance: { enabled: true, weight: 15 },
      weakCategories: { enabled: true, weight: 35 },
      avgCatsPerWeek: { enabled: true, weight: 5 }
    }
  },
  {
    id: 'simple',
    name: 'Simple',
    description: 'Just win percentage',
    icon: '📈',
    factors: {
      catWinPct: { enabled: true, weight: 100 },
      dominantCategories: { enabled: false, weight: 0 },
      categoryBalance: { enabled: false, weight: 0 },
      weakCategories: { enabled: false, weight: 0 },
      avgCatsPerWeek: { enabled: false, weight: 0 }
    }
  }
]

const currentPresetId = ref('balanced')
const isGeneratingDownload = ref(false)

const totalWeight = computed(() => {
  return powerFactors.value.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0)
})

const currentFormulaDisplay = computed(() => {
  const enabledFactors = powerFactors.value.filter(f => f.enabled && f.weight > 0)
  if (enabledFactors.length === 0) return 'No factors enabled'
  
  const total = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  return 'Formula: ' + enabledFactors.map(f => {
    const pct = Math.round((f.weight / total) * 100)
    return `${f.icon} ${f.name}: ${pct}%`
  }).join(' • ')
})

function applyPreset(preset: any) {
  currentPresetId.value = preset.id
  powerFactors.value.forEach(factor => {
    const presetFactor = preset.factors[factor.id]
    if (presetFactor) {
      factor.enabled = presetFactor.enabled
      factor.weight = presetFactor.weight
    }
  })
}

function onFactorChange() {
  currentPresetId.value = ''
}

function resetFactors() {
  applyPreset(powerPresets[0])
}

function applySettings() {
  showSettings.value = false
  loadPowerRankings()
}

// Download/Share functionality
async function downloadRankings() {
  isGeneratingDownload.value = true
  
  try {
    const html2canvas = (await import('html2canvas')).default
    
    const leagueName = leagueInfo.value?.name || 'League'
    
    // Load main UFD logo (same as header)
    const loadLogo = async (): Promise<string> => {
      try {
        const response = await fetch('/UFD_V5.png')
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
    
    // Helper to load image from ui-avatars.com (CORS-safe)
    const loadFromUiAvatars = async (name: string): Promise<string> => {
      const colors = ['0D8ABC', '3498DB', '9B59B6', 'E91E63', 'F39C12', '1ABC9C', '2ECC71', 'E74C3C', '00BCD4', '8E44AD']
      const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
      const bgColor = colors[colorIndex]
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&size=64&bold=true&format=png`
      
      try {
        console.log(`[Download] Fetching ui-avatar for ${name}`)
        const response = await fetch(avatarUrl, { signal: AbortSignal.timeout(5000) })
        console.log(`[Download] ui-avatars response for ${name}: status=${response.status}, ok=${response.ok}`)
        
        if (response.ok) {
          const blob = await response.blob()
          console.log(`[Download] Got blob for ${name}: type=${blob.type}, size=${blob.size}`)
          
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const result = reader.result as string
              console.log(`[Download] FileReader result for ${name}: starts with data:=${result?.startsWith('data:')}, length=${result?.length}`)
              if (result && result.startsWith('data:')) {
                resolve(result)
              } else {
                console.log(`[Download] Invalid result for ${name}, using placeholder`)
                resolve(createPlaceholder(name))
              }
            }
            reader.onerror = (e) => {
              console.log(`[Download] FileReader error for ${name}:`, e)
              resolve(createPlaceholder(name))
            }
            reader.readAsDataURL(blob)
          })
        } else {
          console.log(`[Download] ui-avatars not ok for ${name}, using placeholder`)
        }
      } catch (e) {
        console.log(`[Download] ui-avatars fetch failed for ${name}:`, e)
      }
      return createPlaceholder(name)
    }
    
    // Helper to load image as base64 with CORS handling
    const loadImageAsBase64 = async (url: string, teamName: string): Promise<string> => {
      if (!url) return createPlaceholder(teamName)
      
      // For Sleeper CDN URLs, use ui-avatars.com directly (sleepercdn blocks CORS)
      if (url.includes('sleepercdn.com')) {
        console.log(`[Download] Sleeper URL for ${teamName}, using ui-avatars`)
        try {
          const result = await loadFromUiAvatars(teamName)
          // If we got a valid base64, use it
          if (result && result.startsWith('data:') && result.length > 100) {
            return result
          }
        } catch (e) {
          console.log(`[Download] ui-avatars error for ${teamName}, using canvas placeholder`)
        }
        // Fallback to canvas placeholder
        console.log(`[Download] Using canvas placeholder for ${teamName}`)
        return createPlaceholder(teamName)
      }
      
      // For other URLs, try loading with CORS proxy
      const corsProxies = [
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      ]
      
      for (const proxyFn of corsProxies) {
        try {
          const proxyUrl = proxyFn(url)
          const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(4000) })
          if (!response.ok) continue
          
          const blob = await response.blob()
          if (!blob.type.startsWith('image/') || blob.size < 100) continue
          
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              const result = reader.result as string
              if (result && result.startsWith('data:image')) {
                resolve(result)
              } else {
                resolve(createPlaceholder(teamName))
              }
            }
            reader.onerror = () => resolve(createPlaceholder(teamName))
            reader.readAsDataURL(blob)
          })
        } catch (e) {
          continue
        }
      }
      
      // Fallback to canvas placeholder
      return createPlaceholder(teamName)
    }
    
    // Pre-load all team images using CORS-safe method
    console.log('[Download] Loading team images...')
    const imageMap = new Map<string, string>()
    const imagePromises = powerRankings.value.map(async (team) => {
      const base64 = await loadImageAsBase64(team.logo_url || '', team.name)
      return { teamKey: team.team_key, base64 }
    })
    
    const results = await Promise.all(imagePromises)
    results.forEach(({ teamKey, base64 }) => {
      imageMap.set(teamKey, base64)
      console.log(`[Download] imageMap set ${teamKey}: starts with data:=${base64?.startsWith('data:')}, length=${base64?.length}`)
    })
    console.log(`[Download] Loaded ${imageMap.size} team images`)
    
    // Create container - narrower for mobile
    const container = document.createElement('div')
    container.style.cssText = 'position: absolute; left: -9999px; top: 0; width: 800px; font-family: system-ui, -apple-system, sans-serif;'
    
    // Split teams for two columns
    const midpoint = Math.ceil(powerRankings.value.length / 2)
    const firstHalf = powerRankings.value.slice(0, midpoint)
    const secondHalf = powerRankings.value.slice(midpoint)
    
    // Ranking row - manual padding to align everything at same vertical center
    const generateRankingRow = (team: any, rank: number) => {
      const powerPct = Math.min(100, Math.max(0, team.powerScore)) // 0-100 scale
      // Conditional bar color: green for 70+, yellow for 40-69, red for below 40
      const barColor = team.powerScore >= 70 ? '#10b981' : (team.powerScore >= 40 ? '#f59e0b' : '#ef4444')
      const imgSrc = imageMap.get(team.team_key) || ''
      console.log(`[Download] Row ${rank} (${team.name}): imgSrc length=${imgSrc.length}, starts with data:=${imgSrc.startsWith('data:')}`)
      
      return `
      <div style="display: flex; height: 80px; padding: 0 12px; background: rgba(38, 42, 58, 0.4); border-radius: 10px; margin-bottom: 6px; border: 1px solid rgba(58, 61, 82, 0.4); box-sizing: border-box;">
        <!-- Rank Number - much less padding to move it UP -->
        <div style="width: 44px; flex-shrink: 0; padding-top: 8px;">
          <span style="font-size: 36px; font-weight: 900; color: #ffffff; font-family: 'Impact', 'Arial Black', sans-serif; letter-spacing: -2px; line-height: 1;">${rank}</span>
          ${team.change !== 0 ? `
            <span style="font-size: 10px; font-weight: 700; color: ${team.change > 0 ? '#10b981' : '#ef4444'}; margin-left: 2px;">
              ${team.change > 0 ? '▲' : '▼'}${Math.abs(team.change)}
            </span>
          ` : ''}
        </div>
        <!-- Team Logo - 48px logo centered in 80px = 16px padding top -->
        <div style="width: 60px; flex-shrink: 0; padding-top: 16px;">
          <img src="${imgSrc}" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #3a3d52; background: #262a3a; object-fit: cover;" />
        </div>
        <!-- Team Info - move up to align with logo center -->
        <div style="flex: 1; min-width: 0; padding-top: 16px;">
          <div style="font-size: 14px; font-weight: 700; color: #f7f7ff; white-space: nowrap; overflow: visible; text-overflow: ellipsis; line-height: 1.2;">${team.name}</div>
          <div style="font-size: 11px; color: #9ca3af; line-height: 1.2; margin-top: 4px;">${team.totalCatWins}-${team.totalCatLosses} • ${(team.catWinPct * 100).toFixed(0)}%</div>
        </div>
        <!-- Power Score with conditional bar - move up -->
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
        
        <!-- Top Yellow Bar with site name -->
        <div style="background: #facc15; padding: 10px 24px 10px 24px; text-align: center; overflow: visible;">
          <span style="font-size: 16px; font-weight: 700; color: #0a0c14; text-transform: uppercase; letter-spacing: 3px; display: block; margin-top: -17px;">Ultimate Fantasy Dashboard</span>
        </div>
        
        <!-- HEADER - Logo on left with text next to it -->
        <div style="display: flex; padding: 16px 24px; border-bottom: 1px solid rgba(250, 204, 21, 0.2); position: relative; z-index: 10;">
          <!-- Main Logo - maintain aspect ratio -->
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 70px; width: auto; flex-shrink: 0; margin-right: 24px; display: block;" />` : ''}
          <!-- Title and League Info - use margin-top to move up -->
          <div style="flex: 1; margin-top: -14px;">
            <div style="font-size: 42px; font-weight: 900; color: #ffffff; text-transform: uppercase; letter-spacing: 2px; text-shadow: 0 2px 8px rgba(250, 204, 21, 0.4); line-height: 1;">Power Rankings</div>
            <div style="font-size: 20px; margin-top: 6px; font-weight: 600; line-height: 1;">
              <span style="color: #e5e7eb;">${leagueName}</span>
              <span style="color: #6b7280; margin: 0 8px;">•</span>
              <span style="color: #facc15; font-weight: 700;">Week ${selectedWeek.value}</span>
            </div>
          </div>
        </div>
        
        <!-- Main content area -->
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
        
        <!-- Footer - negative margin to pull up -->
        <div style="padding: 20px 24px 20px 24px; text-align: center; position: relative; z-index: 1;">
          <span style="font-size: 24px; font-weight: bold; color: #facc15; letter-spacing: -0.5px; display: block; margin-top: -35px;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    
    // Create trend chart with team logos at endpoints
    const trendChartContainer = container.querySelector('#trend-chart-container')
    if (trendChartContainer && chartWeeks.value.length >= 2) {
      const ApexCharts = (await import('apexcharts')).default
      
      // Get last 7 weeks of data
      const maxWeeksToShow = 7
      const startIdx = Math.max(0, chartWeeks.value.length - maxWeeksToShow)
      const weeksToShow = chartWeeks.value.slice(startIdx)
      
      // Build series with last 7 weeks
      const trendSeries = powerRankings.value.map((team, idx) => {
        const allRanks = historicalRanks.value.get(team.team_key) || []
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
        colors: powerRankings.value.map((team, idx) => 
          team.is_my_team ? '#F5C451' : getTeamColor(idx)
        ),
        stroke: {
          width: powerRankings.value.map(team => team.is_my_team ? 4 : 2),
          curve: 'smooth'
        },
        markers: {
          size: 0, // Hide default markers, we'll add logo images
          strokeWidth: 0
        },
        xaxis: {
          categories: weeksToShow.map(w => `Wk ${w}`),
          labels: {
            style: {
              colors: '#9ca3af',
              fontSize: '10px'
            }
          }
        },
        yaxis: {
          reversed: true,
          min: 1,
          max: powerRankings.value.length,
          labels: {
            style: {
              colors: '#9ca3af',
              fontSize: '10px'
            },
            formatter: (value: number) => `#${Math.round(value)}`
          }
        },
        legend: {
          show: false // Hide legend, logos will identify teams
        },
        grid: {
          borderColor: '#374151',
          strokeDashArray: 3,
          padding: { right: 50 }
        },
        tooltip: { enabled: false }
      })
      
      await trendChart.render()
      
      // Wait for chart to render, then add team logos at endpoints
      await new Promise(resolve => setTimeout(resolve, 600))
      
      // Add team logos at the final data point of each line
      const chartEl = trendChartContainer.querySelector('.apexcharts-inner') as HTMLElement
      const plotArea = trendChartContainer.querySelector('.apexcharts-plot-series') as HTMLElement
      
      if (chartEl && plotArea) {
        const plotRect = plotArea.getBoundingClientRect()
        const containerRect = (trendChartContainer as HTMLElement).getBoundingClientRect()
        
        const plotLeft = plotRect.left - containerRect.left
        const plotTop = plotRect.top - containerRect.top
        const plotHeight = plotRect.height
        const plotWidth = plotRect.width
        
        const numTeams = powerRankings.value.length
        
        const logoContainer = document.createElement('div')
        logoContainer.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10;'
        
        for (let i = 0; i < powerRankings.value.length; i++) {
          const team = powerRankings.value[i]
          const seriesData = trendSeries[i]?.data || []
          if (seriesData.length === 0) continue
          
          const lastRank = seriesData[seriesData.length - 1]
          
          // Calculate y position based on rank (inverted axis: rank 1 at top, rank N at bottom)
          const yPercent = (lastRank - 1) / (numTeams - 1)
          const yPos = plotTop + (yPercent * plotHeight)
          
          // X position is at the right edge of the plot area
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
            border: 2px solid ${team.is_my_team ? '#F5C451' : getTeamColor(i)};
            background: #262a3a;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          `
          logoDiv.innerHTML = `<img src="${imageMap.get(team.team_key) || ''}" style="width: 100%; height: 100%; object-fit: cover;" />`
          logoContainer.appendChild(logoDiv)
        }
        
        ;(trendChartContainer as HTMLElement).style.position = 'relative'
        trendChartContainer.appendChild(logoContainer)
      }
      
      // Wait for logos to render
      await new Promise(resolve => setTimeout(resolve, 300))
    } else {
      // No chart data - wait for images only
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // Capture the image with fixed width
    const canvas = await html2canvas(container, {
      backgroundColor: '#0a0c14',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: 800
    })
    
    document.body.removeChild(container)
    
    // Download the image
    const link = document.createElement('a')
    link.download = `category-power-rankings-week-${selectedWeek.value}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    
  } catch (e) {
    console.error('Error generating image:', e)
    alert('Failed to generate image. Please try again.')
  } finally {
    isGeneratingDownload.value = false
  }
}

// Update avatar positions based on actual chart rendering
function updateAvatarPositions() {
  if (!apexChartRef.value?.chart) return
  
  const chart = apexChartRef.value.chart
  const weeks = chartWeeks.value
  if (weeks.length === 0) return
  
  const newPositions = new Map<string, { top: number, right: number }>()
  
  powerRankings.value.forEach((team) => {
    const ranks = historicalRanks.value.get(team.team_key) || []
    const lastRank = ranks[ranks.length - 1]
    if (!lastRank) return
    
    // Get the actual Y position from ApexCharts
    try {
      const w = chart.w
      const plotHeight = w.globals.gridHeight
      const plotTop = w.globals.translateY
      
      // Calculate Y position - reversed axis means rank 1 is at top
      const totalTeams = powerRankings.value.length
      const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
      const yPos = plotTop + (yPercent * plotHeight) - 12 // -12 to center 24px avatar
      
      // X position - right edge of plot
      const rightPadding = 8
      
      newPositions.set(team.team_key, { top: yPos, right: rightPadding })
    } catch (e) {
      // Fallback positioning
      const totalTeams = powerRankings.value.length
      const chartPadding = { top: 30, bottom: 80 }
      const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom
      const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
      const yPos = chartPadding.top + (yPercent * usableHeight) - 12
      newPositions.set(team.team_key, { top: yPos, right: 8 })
    }
  })
  
  avatarPositions.value = newPositions
}

// Get avatar style for a team
function getChartAvatarStyle(team: any): Record<string, string> {
  const pos = avatarPositions.value.get(team.team_key)
  if (pos) {
    return {
      top: `${pos.top}px`,
      right: `${pos.right}px`
    }
  }
  
  // Fallback: calculate position
  const ranks = historicalRanks.value.get(team.team_key) || []
  const lastRank = ranks[ranks.length - 1]
  if (!lastRank) return { display: 'none' }
  
  const totalTeams = powerRankings.value.length
  const chartPadding = { top: 30, bottom: 80 }
  const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const yPercent = (lastRank - 1) / Math.max(1, totalTeams - 1)
  const yPos = chartPadding.top + (yPercent * usableHeight) - 12
  
  return {
    right: '8px',
    top: `${yPos}px`
  }
}

// Computed
// yahooLeague is an array - index 0 contains league metadata
// For ESPN, it's stored differently
const leagueInfo = computed(() => {
  if (isEspn.value) {
    // ESPN league info from store
    const espnLeague = leagueStore.yahooLeague // ESPN data is also stored here
    if (Array.isArray(espnLeague)) {
      return espnLeague[0] || {}
    }
    return espnLeague || {}
  }
  
  // Yahoo league info
  const league = leagueStore.yahooLeague
  if (Array.isArray(league)) {
    return league[0] || {}
  }
  return league || {}
})

const currentWeek = computed(() => {
  // Get yahooLeague data (may be array or object)
  const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) 
    ? leagueStore.yahooLeague[0] 
    : leagueStore.yahooLeague
  
  if (isEspn.value) {
    // For ESPN, try multiple sources
    // 1. currentLeague settings
    if (leagueStore.currentLeague?.settings?.leg) {
      console.log('currentWeek computed (ESPN from currentLeague.settings.leg):', leagueStore.currentLeague.settings.leg)
      return parseInt(leagueStore.currentLeague.settings.leg) || 1
    }
    // 2. yahooLeague (which holds ESPN data too)
    if (yahooLeagueData?.current_week) {
      console.log('currentWeek computed (ESPN from yahooLeague):', yahooLeagueData.current_week)
      return parseInt(yahooLeagueData.current_week) || 1
    }
    // 3. currentLeague status
    if (leagueStore.currentLeague?.status?.currentMatchupPeriod) {
      console.log('currentWeek computed (ESPN from status):', leagueStore.currentLeague.status.currentMatchupPeriod)
      return parseInt(leagueStore.currentLeague.status.currentMatchupPeriod) || 1
    }
    console.log('currentWeek computed (ESPN): defaulting to 1')
    return 1
  }
  const week = leagueInfo.value?.current_week
  console.log('currentWeek computed:', week, 'from leagueInfo:', leagueInfo.value)
  return parseInt(week) || 1
})

const totalWeeks = computed(() => {
  // Get yahooLeague data (may be array or object)
  const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) 
    ? leagueStore.yahooLeague[0] 
    : leagueStore.yahooLeague
  
  if (isEspn.value) {
    // For ESPN, try multiple sources
    // 1. currentLeague settings
    if (leagueStore.currentLeague?.settings?.end_week) {
      console.log('totalWeeks computed (ESPN from currentLeague.settings.end_week):', leagueStore.currentLeague.settings.end_week)
      return parseInt(leagueStore.currentLeague.settings.end_week) || 25
    }
    // 2. yahooLeague
    if (yahooLeagueData?.end_week) {
      console.log('totalWeeks computed (ESPN from yahooLeague):', yahooLeagueData.end_week)
      return parseInt(yahooLeagueData.end_week) || 25
    }
    // 3. currentLeague status
    if (leagueStore.currentLeague?.status?.finalMatchupPeriod) {
      console.log('totalWeeks computed (ESPN from status):', leagueStore.currentLeague.status.finalMatchupPeriod)
      return parseInt(leagueStore.currentLeague.status.finalMatchupPeriod) || 25
    }
    console.log('totalWeeks computed (ESPN): defaulting to 25')
    return 25
  }
  const endWeek = leagueInfo.value?.end_week
  console.log('totalWeeks computed:', endWeek)
  return parseInt(endWeek) || 25
})

const isSeasonComplete = computed(() => {
  // Get yahooLeague data (may be array or object)
  const yahooLeagueData = Array.isArray(leagueStore.yahooLeague) 
    ? leagueStore.yahooLeague[0] 
    : leagueStore.yahooLeague
  
  if (isEspn.value) {
    // For ESPN, check multiple sources
    // 1. currentLeague status
    if (leagueStore.currentLeague?.status === 'complete') {
      console.log('isSeasonComplete computed (ESPN): true from status string')
      return true
    }
    // 2. yahooLeague is_finished
    if (yahooLeagueData?.is_finished === 1 || yahooLeagueData?.is_finished === true) {
      console.log('isSeasonComplete computed (ESPN): true from yahooLeague')
      return true
    }
    // 3. currentLeague status object
    if (leagueStore.currentLeague?.status?.isFinished) {
      console.log('isSeasonComplete computed (ESPN): true from status.isFinished')
      return true
    }
    console.log('isSeasonComplete computed (ESPN): false')
    return false
  }
  const finished = leagueInfo.value?.is_finished
  console.log('isSeasonComplete computed:', finished)
  return finished === 1 || finished === '1'
})

const currentSeason = computed(() => leagueStore.currentLeague?.season || new Date().getFullYear().toString())

const numCategories = computed(() => displayCategories.value.length || 12)

const availableWeeks = computed(() => {
  const endWeek = isSeasonComplete.value ? totalWeeks.value : currentWeek.value
  console.log(`availableWeeks: isComplete=${isSeasonComplete.value}, totalWeeks=${totalWeeks.value}, currentWeek=${currentWeek.value}, endWeek=${endWeek}`)
  return Array.from({ length: endWeek }, (_, i) => i + 1)
})

const maxCategoryWins = computed(() => {
  let max = 1
  for (const team of powerRankings.value) {
    for (const wins of Object.values(team.categoryWins || {})) {
      if ((wins as number) > max) max = wins as number
    }
  }
  return max
})

// Insight card computeds
const biggestClimber = computed(() => {
  if (powerRankings.value.length === 0 || chartWeeks.value.length < 2) return null
  
  let maxClimb = 0
  let climber = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const firstRank = ranks[0]
    const lastRank = ranks[ranks.length - 1]
    const climb = firstRank - lastRank // Positive = moved up
    
    if (climb > maxClimb) {
      maxClimb = climb
      climber = {
        ...team,
        climb,
        firstRank,
        lastRank
      }
    }
  })
  
  return climber
})

const biggestFaller = computed(() => {
  if (powerRankings.value.length === 0 || chartWeeks.value.length < 2) return null
  
  let maxFall = 0
  let faller = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const firstRank = ranks[0]
    const lastRank = ranks[ranks.length - 1]
    const fall = lastRank - firstRank // Positive = moved down
    
    if (fall > maxFall) {
      maxFall = fall
      faller = {
        ...team,
        fall,
        firstRank,
        lastRank
      }
    }
  })
  
  return faller
})

const mostConsistent = computed(() => {
  if (powerRankings.value.length === 0 || chartWeeks.value.length < 2) return null
  
  let minVariance = Infinity
  let consistent = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length
    const variance = ranks.reduce((sum, rank) => sum + Math.pow(rank - avg, 2), 0) / ranks.length
    
    if (variance < minVariance) {
      minVariance = variance
      consistent = {
        ...team,
        variance,
        avgRank: Math.round(avg)
      }
    }
  })
  
  return consistent
})

const mostVolatile = computed(() => {
  if (powerRankings.value.length === 0 || chartWeeks.value.length < 2) return null
  
  let maxVariance = 0
  let volatile = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalRanks.value.get(team.team_key) || []
    if (ranks.length < 2) return
    
    const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length
    const variance = ranks.reduce((sum, rank) => sum + Math.pow(rank - avg, 2), 0) / ranks.length
    const minRank = Math.min(...ranks)
    const maxRank = Math.max(...ranks)
    
    if (variance > maxVariance) {
      maxVariance = variance
      volatile = {
        ...team,
        variance,
        minRank,
        maxRank
      }
    }
  })
  
  return volatile
})

// Sorted power rankings
const sortedPowerRankings = computed(() => {
  const teams = [...powerRankings.value]
  const col = sortColumn.value
  const dir = sortDirection.value
  
  teams.sort((a, b) => {
    let aVal: number, bVal: number
    
    switch (col) {
      case 'powerScore':
        aVal = a.powerScore || 0
        bVal = b.powerScore || 0
        break
      case 'catWinPct':
        aVal = a.catWinPct || 0
        bVal = b.catWinPct || 0
        break
      case 'dominant':
        aVal = a.dominantCategories || 0
        bVal = b.dominantCategories || 0
        break
      case 'weak':
        aVal = a.weakCategories || 0
        bVal = b.weakCategories || 0
        break
      case 'avgCats':
        aVal = a.avgCatsWonPerWeek || 0
        bVal = b.avgCatsWonPerWeek || 0
        break
      case 'catWins':
        aVal = a.totalCatWins || 0
        bVal = b.totalCatWins || 0
        break
      default:
        aVal = a.powerScore || 0
        bVal = b.powerScore || 0
    }
    
    if (dir === 'desc') {
      return bVal - aVal
    } else {
      return aVal - bVal
    }
  })
  
  return teams
})

// Sort power rankings table
function sortPowerRankings(column: string) {
  if (sortColumn.value === column) {
    // Toggle direction
    sortDirection.value = sortDirection.value === 'desc' ? 'asc' : 'desc'
  } else {
    // New column, default to descending
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

// Helpers
function handleImageError(e: Event) { (e.target as HTMLImageElement).src = defaultAvatar.value }
function getRankClass(rank: number) {
  return 'bg-dark-border text-dark-text'
}
function getCatWinPctClass(pct: number) {
  if (pct >= 0.55) return 'text-green-400'
  if (pct <= 0.45) return 'text-red-400'
  return 'text-dark-text'
}
function getPowerScoreTextClass(score: number) {
  if (score >= 70) return 'text-green-400'
  if (score >= 40) return 'text-yellow-400'
  return 'text-red-400'
}
function getPowerScoreBarClass(score: number) {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-yellow-500'
  return 'bg-red-500'
}
function getAvgCatsClass(avg: number) {
  const mid = numCategories.value / 2
  if (avg >= mid + 1) return 'text-green-400'
  if (avg <= mid - 1) return 'text-red-400'
  return 'text-dark-text'
}
function getCategoryClass(rank: number) {
  const numTeams = leagueStore.yahooTeams.length
  if (rank <= 2) return 'text-green-400 font-bold'
  if (rank >= numTeams - 1) return 'text-red-400'
  return 'text-yellow-400'
}
function getCategoryBarClass(rank: number) {
  const numTeams = leagueStore.yahooTeams.length
  if (rank <= 2) return 'bg-green-500'
  if (rank >= numTeams - 1) return 'bg-red-500'
  return 'bg-yellow-500'
}
function openTeamModal(team: any) { selectedTeam.value = team; showTeamModal.value = true }

// Load categories
async function loadCategories() {
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey) {
    console.log('[loadCategories] No leagueKey, returning')
    return
  }
  
  console.log('[loadCategories] Starting, leagueKey:', leagueKey, 'isEspn:', isEspn.value)
  
  try {
    if (isEspn.value) {
      // ESPN categories - get from scoring settings
      const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueKey)
      console.log('[loadCategories ESPN] savedLeague:', savedLeague)
      
      // Parse ESPN league ID, sport, and season
      // The leagueKey format is: espn_baseball_1880415994_2025
      // We need to extract: sport = baseball, leagueId = 1880415994, season = 2025
      let espnLeagueId: string | number = ''
      let season = new Date().getFullYear()
      let sport: 'football' | 'baseball' | 'basketball' | 'hockey' = 'baseball'
      
      // Always parse from leagueKey to get the numeric ID and sport
      if (typeof leagueKey === 'string' && leagueKey.startsWith('espn_')) {
        const parts = leagueKey.split('_')
        // parts[0] = 'espn', parts[1] = 'baseball/hockey/etc', parts[2] = leagueId, parts[3] = season
        if (parts.length >= 4) {
          sport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
          espnLeagueId = parts[2]
          season = parseInt(parts[3]) || new Date().getFullYear()
        } else if (parts.length >= 2) {
          // Fallback: espn_123456
          espnLeagueId = parts[1]
        }
      }
      
      // Override with savedLeague values if they exist and are numeric
      if (savedLeague?.espn_id && !String(savedLeague.espn_id).includes('_')) {
        espnLeagueId = savedLeague.espn_id
      }
      if (savedLeague?.season) {
        season = savedLeague.season
      }
      if (savedLeague?.sport) {
        sport = savedLeague.sport as 'football' | 'baseball' | 'basketball' | 'hockey'
      }
      
      console.log('[loadCategories ESPN] Parsed espnLeagueId:', espnLeagueId, 'season:', season, 'sport:', sport)
      
      if (!espnLeagueId) {
        console.error('[loadCategories ESPN] Could not parse ESPN league ID from:', leagueKey)
        return
      }
      
      // Get scoring settings which has the stat categories
      const scoringSettings = await espnService.getScoringSettings(sport, espnLeagueId, season)
      console.log('[loadCategories ESPN] scoringSettings:', scoringSettings)
      console.log('[loadCategories ESPN] scoringSettings keys:', scoringSettings ? Object.keys(scoringSettings) : 'null')
      
      const scoringItems = scoringSettings?.scoringItems || []
      console.log('[loadCategories ESPN] scoringItems count:', scoringItems.length)
      if (scoringItems.length > 0) {
        console.log('[loadCategories ESPN] First scoring item:', scoringItems[0])
      }
      
      // ESPN stat ID mappings by sport - comprehensive list
      const espnBaseballStatNames: Record<number, { name: string; display: string; isNegative?: boolean }> = {
        // Batting stats
        0: { name: 'At Bats', display: 'AB' },
        1: { name: 'Hits', display: 'H' },
        2: { name: 'Runs', display: 'R' },
        3: { name: 'Home Runs', display: 'HR' },
        4: { name: 'RBI', display: 'RBI' },
        5: { name: 'Stolen Bases', display: 'SB' },
        6: { name: 'Walks (Batting)', display: 'BB' },
        7: { name: 'Strikeouts (Batting)', display: 'K', isNegative: true },
        8: { name: 'Batting Average', display: 'AVG' },
        9: { name: 'On Base Pct', display: 'OBP' },
        10: { name: 'Slugging Pct', display: 'SLG' },
        11: { name: 'OPS', display: 'OPS' },
        12: { name: 'Grounded Into DP', display: 'GIDP', isNegative: true },
        13: { name: 'Singles', display: '1B' },
        14: { name: 'Doubles', display: '2B' },
        15: { name: 'Triples', display: '3B' },
        16: { name: 'Total Bases', display: 'TB' },
        17: { name: 'Games Played', display: 'G' },
        18: { name: 'Plate Appearances', display: 'PA' },
        19: { name: 'Extra Base Hits', display: 'XBH' },
        20: { name: 'Hit By Pitch', display: 'HBP' },
        21: { name: 'Intentional Walks', display: 'IBB' },
        22: { name: 'Sac Bunts', display: 'SAC' },
        23: { name: 'Sacrifice Flies', display: 'SF' },
        24: { name: 'Errors', display: 'E', isNegative: true },
        25: { name: 'Fielder\'s Choice', display: 'FC' },
        26: { name: 'Fielding Percentage', display: 'FPCT' },
        27: { name: 'Outfield Assists', display: 'OFAST' },
        28: { name: 'Double Plays Turned', display: 'DP' },
        29: { name: 'Putouts', display: 'PO' },
        30: { name: 'Assists', display: 'A' },
        31: { name: 'Total Chances', display: 'TC' },
        32: { name: 'Caught Stealing', display: 'CS', isNegative: true },
        33: { name: 'Stolen Base Percentage', display: 'SB%' },
        34: { name: 'Net Stolen Bases', display: 'NSB' },
        // Pitching stats
        35: { name: 'Wins', display: 'W' },
        36: { name: 'Losses', display: 'L', isNegative: true },
        37: { name: 'Saves', display: 'SV' },
        38: { name: 'Holds', display: 'HD' },
        39: { name: 'Innings Pitched', display: 'IP' },
        40: { name: 'Earned Runs', display: 'ER', isNegative: true },
        41: { name: 'Hits Allowed', display: 'HA', isNegative: true },
        42: { name: 'Walks Allowed', display: 'BBI', isNegative: true },
        43: { name: 'Strikeouts (Pitching)', display: 'Ks' },
        44: { name: 'Complete Games', display: 'CG' },
        45: { name: 'Shutouts', display: 'SHO' },
        46: { name: 'No Hitters', display: 'NH' },
        47: { name: 'ERA', display: 'ERA', isNegative: true },
        48: { name: 'WHIP', display: 'WHIP', isNegative: true },
        49: { name: 'Opponent Batting Avg', display: 'OBA', isNegative: true },
        50: { name: 'Runs Allowed', display: 'RA', isNegative: true },
        51: { name: 'Home Runs Allowed', display: 'HRA', isNegative: true },
        52: { name: 'Batters Faced', display: 'BF' },
        53: { name: 'Quality Starts', display: 'QS' },
        54: { name: 'Pitches Thrown', display: 'PC' },
        55: { name: 'Pickoffs', display: 'PKO' },
        56: { name: 'Wild Pitches', display: 'WP', isNegative: true },
        57: { name: 'Blown Saves', display: 'BS', isNegative: true },
        58: { name: 'Relief Wins', display: 'RW' },
        59: { name: 'Relief Losses', display: 'RL', isNegative: true },
        60: { name: 'Save Opportunities', display: 'SVO' },
        61: { name: 'Inherited Runners Scored', display: 'IRS', isNegative: true },
        62: { name: 'Strikeout to Walk Ratio', display: 'K/BB' },
        63: { name: 'Games Started', display: 'GS' },
        64: { name: 'Hit Batters', display: 'HB', isNegative: true },
        65: { name: 'Balks', display: 'BK', isNegative: true },
        66: { name: 'Ground Outs', display: 'GO' },
        67: { name: 'Fly Outs', display: 'AO' },
        68: { name: 'K/9', display: 'K/9' },
        69: { name: 'BB/9', display: 'BB/9', isNegative: true },
        70: { name: 'H/9', display: 'H/9', isNegative: true },
        71: { name: 'Saves + Holds', display: 'SVHD' },
        72: { name: 'Relief Appearances', display: 'RAPP' },
        73: { name: 'Total Bases Allowed', display: 'TBA', isNegative: true },
        74: { name: 'Win Percentage', display: 'W%' },
        76: { name: 'BABIP', display: 'BABIP' },
        77: { name: 'FIP', display: 'FIP', isNegative: true },
        78: { name: 'xFIP', display: 'xFIP', isNegative: true },
        79: { name: 'WAR (Batting)', display: 'WAR' },
        80: { name: 'WAR (Pitching)', display: 'WAR' },
        81: { name: 'wOBA', display: 'wOBA' },
        82: { name: 'wRC+', display: 'wRC+' },
        83: { name: 'Perfect Games', display: 'PG' },
        99: { name: 'Games Pitched', display: 'GP' }
      }
      
      // ESPN Hockey stat ID mapping
      const espnHockeyStatNames: Record<number, { name: string; display: string; isNegative?: boolean }> = {
        0: { name: 'Goals', display: 'G' },
        1: { name: 'Assists', display: 'A' },
        2: { name: 'Points', display: 'PTS' },
        3: { name: 'Plus/Minus', display: '+/-' },
        4: { name: 'Penalty Minutes', display: 'PIM' },
        5: { name: 'Powerplay Goals', display: 'PPG' },
        6: { name: 'Powerplay Assists', display: 'PPA' },
        7: { name: 'Powerplay Points', display: 'PPP' },
        8: { name: 'Shorthanded Goals', display: 'SHG' },
        9: { name: 'Shorthanded Assists', display: 'SHA' },
        10: { name: 'Shorthanded Points', display: 'SHP' },
        11: { name: 'Game-Winning Goals', display: 'GWG' },
        12: { name: 'Shots on Goal', display: 'SOG' },
        13: { name: 'Shooting Percentage', display: 'SH%' },
        14: { name: 'Faceoffs Won', display: 'FOW' },
        15: { name: 'Faceoffs Lost', display: 'FOL', isNegative: true },
        16: { name: 'Hits', display: 'HIT' },
        17: { name: 'Blocks', display: 'BLK' },
        18: { name: 'Takeaways', display: 'TK' },
        19: { name: 'Wins', display: 'W' },
        20: { name: 'Losses', display: 'L', isNegative: true },
        21: { name: 'Goals Against', display: 'GA', isNegative: true },
        22: { name: 'Goals Against Average', display: 'GAA', isNegative: true },
        23: { name: 'Saves', display: 'SV' },
        24: { name: 'Save Percentage', display: 'SV%' },
        25: { name: 'Shutouts', display: 'SHO' },
        26: { name: 'Overtime Losses', display: 'OTL' },
        27: { name: 'Games Started', display: 'GS' },
        28: { name: 'Giveaways', display: 'GV', isNegative: true },
        29: { name: 'Avg Time on Ice', display: 'ATOI' },
        30: { name: 'Games Played', display: 'GP' },
        31: { name: 'Hat Tricks', display: 'HAT' },
        32: { name: 'Defensemen Points', display: 'DEF' },
        33: { name: 'Special Teams Points', display: 'STP' },
        34: { name: 'Faceoff Win Pct', display: 'FO%' },
        35: { name: 'Minutes', display: 'MIN' },
        36: { name: 'Shots', display: 'SH' },
        37: { name: 'Goalie Wins', display: 'GW' },
        38: { name: 'Shots Against', display: 'SA' },
        39: { name: 'Goals Saved Above Avg', display: 'GSAA' }
      }
      
      // ESPN Basketball stat ID mapping
      const espnBasketballStatNames: Record<number, { name: string; display: string; isNegative?: boolean }> = {
        0: { name: 'Points', display: 'PTS' },
        1: { name: 'Blocks', display: 'BLK' },
        2: { name: 'Steals', display: 'STL' },
        3: { name: 'Assists', display: 'AST' },
        6: { name: 'Rebounds', display: 'REB' },
        11: { name: 'Turnovers', display: 'TO', isNegative: true },
        13: { name: 'Field Goals Made', display: 'FGM' },
        14: { name: 'Field Goals Attempted', display: 'FGA' },
        15: { name: 'Field Goal Pct', display: 'FG%' },
        16: { name: 'Free Throws Made', display: 'FTM' },
        17: { name: 'Free Throws Attempted', display: 'FTA' },
        18: { name: 'Free Throw Pct', display: 'FT%' },
        19: { name: '3-Pointers Made', display: '3PM' },
        20: { name: '3-Pointers Attempted', display: '3PA' },
        21: { name: '3-Point Pct', display: '3P%' }
      }
      
      // Select stat names based on sport
      const statNames = sport === 'hockey' ? espnHockeyStatNames 
        : sport === 'basketball' ? espnBasketballStatNames 
        : espnBaseballStatNames
      
      displayCategories.value = scoringItems
        .map((item: any) => {
          const statId = String(item.statId || item.id)
          
          // Try to get name from ESPN's scoring item first, fallback to our dictionary
          const espnAbbrev = item.label || item.abbreviation || item.abbrev
          const espnName = item.displayName || item.name
          
          const statInfo = statNames[parseInt(statId)] || { 
            name: espnName || `Stat ${statId}`, 
            display: espnAbbrev || `S${statId}` 
          }
          
          return {
            stat_id: statId,
            name: espnName || statInfo.name,
            display_name: espnAbbrev || statInfo.display,
            is_negative: statInfo.isNegative
          }
        })
        .filter((c: any) => c.stat_id)
      
      console.log(`[ESPN ${sport}] Loaded ${displayCategories.value.length} categories:`, displayCategories.value.map(c => c.display_name))
    } else {
      // Yahoo categories
      const settings = await yahooService.getLeagueScoringSettings(leagueKey)
      if (settings?.stat_categories) {
        displayCategories.value = settings.stat_categories
          .map((c: any) => ({
            stat_id: String(c.stat?.stat_id || c.stat_id),
            name: c.stat?.name || c.name,
            display_name: c.stat?.display_name || c.display_name,
            is_only_display_stat: c.stat?.is_only_display_stat || c.is_only_display_stat
          }))
          .filter((c: any) => c.stat_id && c.is_only_display_stat !== '1' && c.is_only_display_stat !== 1)
        
        console.log(`[Yahoo] Loaded ${displayCategories.value.length} categories:`, displayCategories.value.map(c => c.display_name))
      }
    }
  } catch (e) {
    console.error('Error loading categories:', e)
  }
}

// Main function to load all matchup data and calculate rankings
async function loadPowerRankings() {
  if (!selectedWeek.value) return
  
  const leagueKey = leagueStore.activeLeagueId
  if (!leagueKey) return
  
  isLoading.value = true
  const throughWeek = parseInt(selectedWeek.value)
  loadingProgress.value = { currentStep: 'Initializing...', week: 0, maxWeek: throughWeek }
  
  try {
    // Ensure categories are loaded
    if (displayCategories.value.length === 0) {
      loadingMessage.value = 'Loading categories...'
      loadingProgress.value = { ...loadingProgress.value, currentStep: 'Loading scoring categories...' }
      await loadCategories()
    }
    
    console.log('[Power Rankings] Categories loaded:', displayCategories.value.map(c => ({ id: c.stat_id, name: c.display_name })))
    
    // Initialize team stats - we'll track cumulative stats as we go through each week
    const teamStats = new Map<string, any>()
    for (const team of leagueStore.yahooTeams) {
      const categoryWins: Record<string, number> = {}
      const categoryLosses: Record<string, number> = {}
      const categoryTies: Record<string, number> = {}
      
      for (const cat of displayCategories.value) {
        categoryWins[cat.stat_id] = 0
        categoryLosses[cat.stat_id] = 0
        categoryTies[cat.stat_id] = 0
      }
      
      teamStats.set(team.team_key, {
        team_key: team.team_key,
        name: team.name,
        logo_url: team.logo_url,
        is_my_team: team.is_my_team,
        categoryWins,
        categoryLosses,
        categoryTies,
        totalCatWins: 0,
        totalCatLosses: 0,
        totalCatTies: 0
      })
    }
    
    // Debug: Log first team's initial state
    const firstTeamKey = [...teamStats.keys()][0]
    if (firstTeamKey) {
      console.log('[Power Rankings] First team initial state:', {
        key: firstTeamKey,
        name: teamStats.get(firstTeamKey)?.name,
        categoryWinsKeys: Object.keys(teamStats.get(firstTeamKey)?.categoryWins || {})
      })
    }
    
    // Track historical rankings for chart
    const rankHistory = new Map<string, number[]>()
    const weeksForChart: number[] = []
    
    // Initialize rank history for each team
    for (const team of leagueStore.yahooTeams) {
      rankHistory.set(team.team_key, [])
    }
    
    console.log(`=== Loading ${throughWeek} weeks of matchup data ===`)
    
    // Debug: Log team keys being used
    console.log('[Power Rankings] Team keys in teamStats:', [...teamStats.keys()])
    console.log('[Power Rankings] Categories:', displayCategories.value.map(c => c.stat_id))
    
    // Get ESPN league info if needed
    let espnLeagueId: string | number = ''
    let espnSeason = new Date().getFullYear()
    let espnSport: 'football' | 'baseball' | 'basketball' | 'hockey' = 'baseball'
    if (isEspn.value) {
      // Always parse from leagueKey to get the numeric ID and sport
      // Format: espn_hockey_1880415994_2025
      if (typeof leagueKey === 'string' && leagueKey.startsWith('espn_')) {
        const parts = leagueKey.split('_')
        if (parts.length >= 4) {
          espnSport = parts[1] as 'football' | 'baseball' | 'basketball' | 'hockey'
          espnLeagueId = parts[2]
          espnSeason = parseInt(parts[3]) || new Date().getFullYear()
        } else if (parts.length >= 2) {
          espnLeagueId = parts[1]
        }
      }
      
      // Override with savedLeague values if they exist and are numeric
      const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueKey)
      if (savedLeague?.espn_id && !String(savedLeague.espn_id).includes('_')) {
        espnLeagueId = savedLeague.espn_id
      }
      if (savedLeague?.season) {
        espnSeason = savedLeague.season
      }
      if (savedLeague?.sport) {
        espnSport = savedLeague.sport as 'football' | 'baseball' | 'basketball' | 'hockey'
      }
      
      console.log('[Power Rankings ESPN] Parsed espnLeagueId:', espnLeagueId, 'season:', espnSeason, 'sport:', espnSport)
    }
    
    // Track total processed for debugging
    let totalMatchupsProcessed = 0
    let totalCategoryWinsRecorded = 0
    
    // Load each week's matchup data and calculate running rankings
    for (let week = 1; week <= throughWeek; week++) {
      loadingMessage.value = `Loading matchup data...`
      loadingProgress.value = { currentStep: `Processing week ${week} matchups...`, week, maxWeek: throughWeek }
      
      try {
        if (isEspn.value) {
          // ESPN matchups - use per-category results
          // Always force refresh to ensure we get the per-category data
          const matchups = await espnService.getMatchups(espnSport, espnLeagueId, espnSeason, week, true)
          
          console.log(`[Power Rankings ESPN] Week ${week}: ${matchups.length} matchups`)
          
          // Debug first week extensively
          if (week === 1 && matchups.length > 0) {
            console.log('[Power Rankings ESPN] Week 1 first matchup FULL:', matchups[0])
            console.log('[Power Rankings ESPN] Week 1 first matchup:', {
              homeTeamId: matchups[0].homeTeamId,
              awayTeamId: matchups[0].awayTeamId,
              homeKey: `espn_${matchups[0].homeTeamId}`,
              hasHomePerCategoryResults: !!matchups[0].homePerCategoryResults,
              homePerCategoryResultsKeys: matchups[0].homePerCategoryResults ? Object.keys(matchups[0].homePerCategoryResults) : [],
              homePerCategoryResults: matchups[0].homePerCategoryResults
            })
          }
          
          for (const matchup of matchups) {
            if (!matchup.awayTeamId) continue // Skip bye weeks
            
            // Build team keys that match the format used in teamStats
            // teamStats uses team_key from yahooTeams which is: espn_LEAGUEID_SEASON_TEAMID
            const homeKey = `espn_${espnLeagueId}_${espnSeason}_${matchup.homeTeamId}`
            const awayKey = `espn_${espnLeagueId}_${espnSeason}_${matchup.awayTeamId}`
            
            const homeStats = teamStats.get(homeKey)
            const awayStats = teamStats.get(awayKey)
            
            // Debug: Log if team not found
            if (week === 1 && (!homeStats || !awayStats)) {
              console.log('[Power Rankings ESPN] Team not found!', {
                homeKey,
                awayKey,
                homeFound: !!homeStats,
                awayFound: !!awayStats,
                availableKeys: [...teamStats.keys()].slice(0, 3)
              })
            }
            
            if (!homeStats || !awayStats) continue
            
            totalMatchupsProcessed++
            
            // Process home team per-category results
            if (matchup.homePerCategoryResults && Object.keys(matchup.homePerCategoryResults).length > 0) {
              const resultsCount = Object.keys(matchup.homePerCategoryResults).length
              if (week === 1 && totalMatchupsProcessed === 1) {
                console.log('[Power Rankings ESPN] Processing homePerCategoryResults:', matchup.homePerCategoryResults)
              }
              
              for (const [statId, result] of Object.entries(matchup.homePerCategoryResults)) {
                if (result === 'WIN') {
                  homeStats.categoryWins[statId] = (homeStats.categoryWins[statId] || 0) + 1
                  awayStats.categoryLosses[statId] = (awayStats.categoryLosses[statId] || 0) + 1
                  homeStats.totalCatWins++
                  awayStats.totalCatLosses++
                  totalCategoryWinsRecorded++
                } else if (result === 'LOSS') {
                  homeStats.categoryLosses[statId] = (homeStats.categoryLosses[statId] || 0) + 1
                  awayStats.categoryWins[statId] = (awayStats.categoryWins[statId] || 0) + 1
                  homeStats.totalCatLosses++
                  awayStats.totalCatWins++
                  totalCategoryWinsRecorded++
                } else if (result === 'TIE') {
                  homeStats.categoryTies[statId] = (homeStats.categoryTies[statId] || 0) + 1
                  awayStats.categoryTies[statId] = (awayStats.categoryTies[statId] || 0) + 1
                  homeStats.totalCatTies++
                  awayStats.totalCatTies++
                }
              }
            } else if (matchup.homeCategoryWins !== undefined || matchup.awayCategoryWins !== undefined) {
              // Fallback: Use total category wins/losses when per-category results aren't available
              if (week === 1 && totalMatchupsProcessed === 1) {
                console.log('[Power Rankings ESPN] Using fallback category totals:', {
                  homeCategoryWins: matchup.homeCategoryWins,
                  homeCategoryLosses: matchup.homeCategoryLosses,
                  awayCategoryWins: matchup.awayCategoryWins,
                  awayCategoryLosses: matchup.awayCategoryLosses
                })
              }
              
              // Add total category wins (not per-category, but at least gives overall picture)
              homeStats.totalCatWins += matchup.homeCategoryWins || 0
              homeStats.totalCatLosses += matchup.homeCategoryLosses || 0
              homeStats.totalCatTies += matchup.homeCategoryTies || 0
              awayStats.totalCatWins += matchup.awayCategoryWins || 0
              awayStats.totalCatLosses += matchup.awayCategoryLosses || 0
              awayStats.totalCatTies += matchup.awayCategoryTies || 0
              totalCategoryWinsRecorded += (matchup.homeCategoryWins || 0) + (matchup.awayCategoryWins || 0)
            } else {
              if (week === 1 && totalMatchupsProcessed === 1) {
                console.log('[Power Rankings ESPN] NO category data on matchup!', {
                  matchupKeys: Object.keys(matchup),
                  homePerCategoryResults: matchup.homePerCategoryResults,
                  homeCategoryWins: matchup.homeCategoryWins
                })
              }
            }
          }
        } else {
          // Yahoo matchups - use stat_winners
          const matchups = await yahooService.getCategoryMatchups(leagueKey, week)
          
          // Process this week's matchups
          for (const matchup of matchups) {
            if (!matchup.teams || matchup.teams.length < 2) continue
            
            const team1Key = matchup.teams[0]?.team_key
            const team2Key = matchup.teams[1]?.team_key
            
            if (!team1Key || !team2Key) continue
            
            const team1Stats = teamStats.get(team1Key)
            const team2Stats = teamStats.get(team2Key)
            
            if (!team1Stats || !team2Stats) continue
            
            // Process stat winners if available
            if (matchup.stat_winners && matchup.stat_winners.length > 0) {
              for (const sw of matchup.stat_winners) {
                const statId = String(sw.stat_id)
                
                if (sw.is_tied) {
                  team1Stats.categoryTies[statId] = (team1Stats.categoryTies[statId] || 0) + 1
                  team2Stats.categoryTies[statId] = (team2Stats.categoryTies[statId] || 0) + 1
                  team1Stats.totalCatTies++
                  team2Stats.totalCatTies++
                } else if (sw.winner_team_key === team1Key) {
                  team1Stats.categoryWins[statId] = (team1Stats.categoryWins[statId] || 0) + 1
                  team2Stats.categoryLosses[statId] = (team2Stats.categoryLosses[statId] || 0) + 1
                  team1Stats.totalCatWins++
                  team2Stats.totalCatLosses++
                } else if (sw.winner_team_key === team2Key) {
                  team2Stats.categoryWins[statId] = (team2Stats.categoryWins[statId] || 0) + 1
                  team1Stats.categoryLosses[statId] = (team1Stats.categoryLosses[statId] || 0) + 1
                  team2Stats.totalCatWins++
                  team1Stats.totalCatLosses++
                }
              }
            }
          }
        }
        
        // Calculate power rankings at this point in the season (every 2 weeks for chart)
        if (week >= 2 && (week % 2 === 0 || week === throughWeek)) {
          weeksForChart.push(week)
          
          // Calculate current power scores for all teams
          const weekRankings = calculatePowerScores(teamStats, week)
          
          // Store each team's rank for this week
          weekRankings.forEach((team, idx) => {
            const ranks = rankHistory.get(team.team_key) || []
            ranks.push(idx + 1)
            rankHistory.set(team.team_key, ranks)
          })
        }
        
      } catch (e) {
        console.error(`Error loading week ${week}:`, e)
      }
    }
    
    totalWeeksLoaded.value = throughWeek
    historicalRanks.value = rankHistory
    chartWeeks.value = weeksForChart
    
    // Debug summary
    console.log(`[Power Rankings] Processing complete:`)
    console.log(`  - Weeks processed: ${throughWeek}`)
    console.log(`  - Total matchups processed: ${totalMatchupsProcessed}`)
    console.log(`  - Total category wins recorded: ${totalCategoryWinsRecorded}`)
    
    // Debug: Log final team stats after all weeks processed
    if (isEspn.value) {
      console.log('[Power Rankings ESPN] Final team stats after all weeks:')
      for (const [key, stats] of teamStats) {
        console.log(`  ${stats.name}: W=${stats.totalCatWins}, L=${stats.totalCatLosses}, T=${stats.totalCatTies}`)
      }
    }
    
    // Calculate final rankings
    loadingMessage.value = 'Calculating final rankings...'
    loadingProgress.value = { currentStep: 'Calculating power scores...', week: throughWeek, maxWeek: throughWeek }
    const finalRankings = calculatePowerScores(teamStats, throughWeek)
    
    // Calculate change from previous week
    if (throughWeek > 1) {
      finalRankings.forEach((team, idx) => {
        const ranks = rankHistory.get(team.team_key) || []
        if (ranks.length >= 2) {
          const prevRank = ranks[ranks.length - 2] || idx + 1
          team.change = prevRank - (idx + 1)
          team.prevRank = prevRank
        }
      })
    }
    
    // Log results
    console.log('=== POWER RANKINGS COMPLETE ===')
    finalRankings.slice(0, 3).forEach((t, i) => {
      console.log(`#${i+1}: ${t.name} - Score: ${t.powerScore.toFixed(1)}, Cat W-L: ${t.totalCatWins}-${t.totalCatLosses}`)
    })
    
    // Add rank property to each team based on power score order
    finalRankings.forEach((team, idx) => {
      team.rank = idx + 1
    })
    
    powerRankings.value = finalRankings
    buildChart()
    
  } catch (e) {
    console.error('Error loading power rankings:', e)
  } finally {
    isLoading.value = false
  }
}

// Calculate power scores for current team stats state using customizable factors
function calculatePowerScores(teamStats: Map<string, any>, currentWeek: number): any[] {
  const rankings: any[] = []
  const numTeams = leagueStore.yahooTeams.length
  
  for (const [teamKey, stats] of teamStats) {
    const totalGames = stats.totalCatWins + stats.totalCatLosses + stats.totalCatTies
    const catWinPct = totalGames > 0 ? stats.totalCatWins / totalGames : 0
    const avgCatsWonPerWeek = currentWeek > 0 ? stats.totalCatWins / currentWeek : 0
    
    // Deep copy category data
    const categoryWins = { ...stats.categoryWins }
    const categoryLosses = { ...stats.categoryLosses }
    const categoryTies = { ...stats.categoryTies }
    
    rankings.push({
      team_key: stats.team_key,
      name: stats.name,
      logo_url: stats.logo_url,
      is_my_team: stats.is_my_team,
      categoryWins,
      categoryLosses,
      categoryTies,
      totalCatWins: stats.totalCatWins,
      totalCatLosses: stats.totalCatLosses,
      totalCatTies: stats.totalCatTies,
      catWinPct,
      avgCatsWonPerWeek,
      powerScore: 0,
      change: 0,
      prevRank: 0,
      dominantCategories: 0,
      weakCategories: 0,
      categoryRanks: {},
      categoryBalance: 0
    })
  }
  
  // Calculate category ranks for each category
  for (const cat of displayCategories.value) {
    const sorted = [...rankings].sort((a, b) => 
      (b.categoryWins[cat.stat_id] || 0) - (a.categoryWins[cat.stat_id] || 0)
    )
    sorted.forEach((team, idx) => {
      team.categoryRanks[cat.stat_id] = idx + 1
    })
  }
  
  // Count dominant/weak categories and calculate balance
  for (const team of rankings) {
    let dominant = 0, weak = 0
    for (const cat of displayCategories.value) {
      const rank = team.categoryRanks[cat.stat_id] || numTeams
      if (rank <= 2) dominant++
      if (rank >= numTeams - 1) weak++
    }
    team.dominantCategories = dominant
    team.weakCategories = weak
    team.categoryBalance = calculateCategoryBalance(team.categoryWins)
  }
  
  // Get enabled factors and calculate normalized weights
  const enabledFactors = powerFactors.value.filter(f => f.enabled && f.weight > 0)
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  if (totalWeight === 0 || enabledFactors.length === 0) {
    // Fallback: just use cat win pct
    for (const team of rankings) {
      team.powerScore = team.catWinPct * 100
    }
  } else {
    // Calculate max values for normalization
    const maxCatWinPct = Math.max(...rankings.map(t => t.catWinPct), 0.01)
    const maxDominant = Math.max(...rankings.map(t => t.dominantCategories), 1)
    const maxAvgCats = Math.max(...rankings.map(t => t.avgCatsWonPerWeek), 1)
    const maxWeak = Math.max(...rankings.map(t => t.weakCategories), 1)
    
    for (const team of rankings) {
      let score = 0
      
      for (const factor of enabledFactors) {
        const normalizedWeight = factor.weight / totalWeight
        let componentScore = 0
        
        switch (factor.id) {
          case 'catWinPct':
            componentScore = (team.catWinPct / maxCatWinPct) * 100
            break
          case 'dominantCategories':
            componentScore = (team.dominantCategories / maxDominant) * 100
            break
          case 'categoryBalance':
            componentScore = team.categoryBalance
            break
          case 'weakCategories':
            // Inverse: fewer weak categories = higher score
            componentScore = ((maxWeak - team.weakCategories) / Math.max(maxWeak, 1)) * 100
            break
          case 'avgCatsPerWeek':
            componentScore = (team.avgCatsWonPerWeek / maxAvgCats) * 100
            break
        }
        
        score += componentScore * normalizedWeight
      }
      
      team.powerScore = Math.max(0, Math.min(100, score))
    }
  }
  
  // Sort by power score
  rankings.sort((a, b) => b.powerScore - a.powerScore)
  
  return rankings
}

function buildChart() {
  if (powerRankings.value.length === 0 || chartWeeks.value.length < 2) {
    chartSeries.value = []
    chartOptions.value = null
    return
  }
  
  // Get the index of the hovered team
  const hoveredIdx = chartHoveredTeamKey.value 
    ? powerRankings.value.findIndex((t: any) => t.team_key === chartHoveredTeamKey.value)
    : -1
  
  // Get colors for each team - faded when another team is hovered
  const colors = powerRankings.value.map((team: any, idx: number) => {
    const baseColor = team.is_my_team ? '#F5C451' : getTeamColor(idx)
    // If someone is hovered and it's not this team, fade it
    if (hoveredIdx !== -1 && idx !== hoveredIdx) {
      const r = parseInt(baseColor.slice(1, 3), 16)
      const g = parseInt(baseColor.slice(3, 5), 16)
      const b = parseInt(baseColor.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, 0.2)`
    }
    return baseColor
  })
  
  // Stroke widths - hovered line is thicker
  const strokeWidths = powerRankings.value.map((team: any, idx: number) => {
    if (hoveredIdx === -1) return team.is_my_team ? 4 : 2
    return idx === hoveredIdx ? 4 : 2
  })
  
  // Marker sizes - only show markers for hovered team
  const markerSizes = powerRankings.value.map((_: any, idx: number) => {
    if (hoveredIdx === -1) return 0
    return idx === hoveredIdx ? 10 : 0
  })
  
  // Build series data for each team
  const series = powerRankings.value.map((team, idx) => {
    const ranks = historicalRanks.value.get(team.team_key) || []
    return {
      name: team.name,
      data: ranks
    }
  })
  
  chartSeries.value = series
  
  chartOptions.value = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
      events: {
        mounted: () => setTimeout(updateAvatarPositions, 100),
        updated: () => setTimeout(updateAvatarPositions, 100)
      }
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
        fontSize: '11px',
        fontWeight: 'bold',
        colors: ['#fff']
      },
      background: {
        enabled: false
      },
      offsetY: 0
    },
    xaxis: {
      categories: chartWeeks.value.map(w => `Wk ${w}`),
      labels: {
        style: { colors: '#9ca3af' }
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: powerRankings.value.length,
      labels: {
        style: { colors: '#9ca3af' },
        formatter: (value: number) => Math.round(value).toString()
      }
    },
    legend: {
      show: false
    },
    grid: { 
      borderColor: '#374151', 
      strokeDashArray: 3, 
      padding: { right: 50 } 
    },
    tooltip: { enabled: false }
  }
}

// Watch for hover changes and rebuild chart
watch(chartHoveredTeamKey, () => {
  if (powerRankings.value.length > 0) {
    buildChart()
  }
})

// Initialize
watch(() => leagueStore.yahooTeams, async () => {
  if (leagueStore.yahooTeams.length > 0) {
    await loadCategories()
    
    // Use the computed values which now correctly parse the array
    const endWeek = totalWeeks.value
    const currWeek = currentWeek.value
    const isFinished = isSeasonComplete.value
    const defaultWeek = isFinished ? endWeek : currWeek
    
    console.log(`Init: endWeek=${endWeek}, currWeek=${currWeek}, isFinished=${isFinished}, default=${defaultWeek}`)
    console.log('yahooLeague raw:', leagueStore.yahooLeague)
    
    if (defaultWeek >= 1) {
      selectedWeek.value = defaultWeek.toString()
      loadPowerRankings()
    }
  }
}, { immediate: true })

onMounted(async () => {
  if (authStore.user?.id) {
    if (isEspn.value) {
      // ESPN is initialized elsewhere, but ensure credentials are set
      const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueStore.activeLeagueId)
      if (savedLeague?.espn_s2 && savedLeague?.swid) {
        espnService.setCredentials({
          espn_s2: savedLeague.espn_s2,
          swid: savedLeague.swid
        })
      }
    } else {
      await yahooService.initialize(authStore.user.id)
    }
  }
})
</script>
