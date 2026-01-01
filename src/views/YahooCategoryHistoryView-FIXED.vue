<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-dark-text mb-2">League History</h1>
      <p class="text-base text-dark-textMuted">
        Career statistics, championship records, and category dominance
      </p>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <div class="text-dark-textMuted">{{ loadingMessage }}</div>
      </div>
    </div>

    <template v-else>
      <!-- Career Records (4 Cards) -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">👑</span>
            <h2 class="card-title">Career Records</h2>
          </div>
          <p class="card-subtitle mt-2">All-time league leaders</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div v-for="record in careerRecords" :key="record.label" 
                 class="relative overflow-hidden">
              <div class="p-6 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 hover:border-primary/40 transition-all">
                <div class="flex items-start justify-between mb-4">
                  <div class="text-4xl">{{ record.icon }}</div>
                  <div class="text-right">
                    <div class="text-4xl font-black text-primary mb-1">{{ record.value }}</div>
                  </div>
                </div>
                <div class="space-y-1">
                  <div class="text-xs text-dark-textMuted uppercase tracking-wider font-bold">{{ record.label }}</div>
                  <div class="font-bold text-lg text-dark-text">{{ record.team }}</div>
                  <div class="text-xs text-dark-textMuted">{{ record.detail }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Career Statistics Table -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Career Statistics</h2>
            </div>
            <div class="flex items-center gap-4">
              <div class="text-sm text-dark-textMuted">
                All-time regular season records
              </div>
              <!-- Toggle for current members only -->
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="text-sm text-dark-textMuted">Current members only</span>
                <div class="relative">
                  <input type="checkbox" v-model="showCurrentMembersOnly" class="sr-only">
                  <div :class="[
                    'w-10 h-5 rounded-full transition-colors',
                    showCurrentMembersOnly ? 'bg-primary' : 'bg-dark-border'
                  ]"></div>
                  <div :class="[
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    showCurrentMembersOnly ? 'translate-x-5' : 'translate-x-0'
                  ]"></div>
                </div>
              </label>
              <button 
                @click="downloadCareerStats"
                :disabled="isDownloading"
                class="btn-primary flex items-center gap-2 text-sm"
              >
                <svg v-if="!isDownloading" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloading ? 'Generating...' : 'Share' }}
              </button>
            </div>
          </div>
        </div>
        <div class="card-body overflow-x-auto">
          <table ref="careerTableRef" class="w-full text-sm">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Team</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('seasons')">
                  <div class="flex items-center justify-center gap-1">
                    Seasons
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'seasons' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'seasons' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('championships')">
                  <div class="flex items-center justify-center gap-1">
                    🏆
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'championships' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'championships' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('matchup_wins')">
                  <div class="flex items-center justify-center gap-1">
                    Record
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'matchup_wins' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'matchup_wins' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('matchup_win_pct')">
                  <div class="flex items-center justify-center gap-1">
                    Win %
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'matchup_win_pct' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'matchup_win_pct' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('hitting_cat_wins')">
                  <div class="flex items-center justify-center gap-1">
                    Hitting Cat W
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'hitting_cat_wins' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'hitting_cat_wins' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('pitching_cat_wins')">
                  <div class="flex items-center justify-center gap-1">
                    Pitching Cat W
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'pitching_cat_wins' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'pitching_cat_wins' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortBy('cat_diff')">
                  <div class="flex items-center justify-center gap-1">
                    Cat +/-
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span :class="sortColumn === 'cat_diff' && sortDirection === 'asc' ? 'text-primary' : 'text-dark-textMuted'">▲</span>
                      <span :class="sortColumn === 'cat_diff' && sortDirection === 'desc' ? 'text-primary' : 'text-dark-textMuted'">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Best Cat</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Worst Cat</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(stat, idx) in filteredCareerStats" :key="stat.team_key" 
                  class="border-b border-dark-border hover:bg-dark-border/30 transition-colors">
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img
                        :src="stat.logo_url || defaultAvatar"
                        :alt="stat.team_name"
                        class="w-full h-full object-cover"
                        @error="handleImageError"
                      />
                    </div>
                    <div class="font-semibold text-dark-text">{{ stat.team_name }}</div>
                  </div>
                </td>
                <td class="text-center py-3 px-4 text-dark-text">{{ stat.seasons }}</td>
                <td class="text-center py-3 px-4">
                  <span v-if="stat.championships > 0" class="text-primary font-bold">
                    🏆 {{ stat.championships }}
                  </span>
                  <span v-else class="text-dark-textMuted">—</span>
                </td>
                <td class="text-center py-3 px-4 font-semibold" :class="getRecordClass(stat, 'matchup_wins')">
                  {{ stat.matchup_wins }}-{{ stat.matchup_losses }}-{{ stat.matchup_ties }}
                </td>
                <td class="text-center py-3 px-4">
                  <span :class="getRecordClass(stat, 'matchup_win_pct')">
                    {{ (stat.matchup_win_pct * 100).toFixed(1) }}%
                  </span>
                </td>
                <td class="text-center py-3 px-4" :class="getRecordClass(stat, 'hitting_cat_wins')">
                  {{ stat.hitting_cat_wins }}
                </td>
                <td class="text-center py-3 px-4" :class="getRecordClass(stat, 'pitching_cat_wins')">
                  {{ stat.pitching_cat_wins }}
                </td>
                <td class="text-center py-3 px-4">
                  <span :class="stat.cat_diff >= 0 ? 'text-green-400' : 'text-red-400'" class="font-semibold">
                    {{ stat.cat_diff >= 0 ? '+' : '' }}{{ stat.cat_diff }}
                  </span>
                </td>
                <td class="text-center py-3 px-4">
                  <span class="px-2 py-1 rounded text-xs font-bold bg-green-500/20 text-green-400">
                    {{ stat.best_category || '—' }}
                  </span>
                </td>
                <td class="text-center py-3 px-4">
                  <span class="px-2 py-1 rounded text-xs font-bold bg-red-500/20 text-red-400">
                    {{ stat.worst_category || '—' }}
                  </span>
                </td>
              </tr>
              <tr v-if="filteredCareerStats.length === 0">
                <td colspan="10" class="py-8 text-center text-dark-textMuted">
                  No historical data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Category Dominance Leaders -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🎯</span>
            <h2 class="card-title">Category Dominance</h2>
          </div>
          <p class="card-subtitle mt-2">All-time category leaders by win rate</p>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div v-for="cat in categoryLeaders" :key="cat.name" class="bg-dark-border/20 rounded-xl p-4">
              <div class="text-center mb-3">
                <span class="px-3 py-1 rounded-full text-sm font-bold" :class="getCategoryColorClass(cat.name)">
                  {{ cat.name }}
                </span>
              </div>
              <div v-if="cat.leader" class="space-y-2">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                    <img :src="cat.leader.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-dark-text text-sm truncate">{{ cat.leader.team_name }}</div>
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-black text-primary">{{ (cat.leader.win_rate * 100).toFixed(0) }}%</div>
                  <div class="text-xs text-dark-textMuted">{{ cat.leader.wins }}-{{ cat.leader.losses }} in {{ cat.name }}</div>
                </div>
              </div>
              <div v-else class="text-center text-sm text-dark-textMuted italic py-4">
                No data
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Season-by-Season Records -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📅</span>
              <h2 class="card-title">Season-by-Season Records</h2>
            </div>
            <button 
              @click="downloadSeasonHistory"
              :disabled="isDownloadingSeason"
              class="btn-primary flex items-center gap-2 text-sm"
            >
              <svg v-if="!isDownloadingSeason" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isDownloadingSeason ? 'Generating...' : 'Share' }}
            </button>
          </div>
          <p class="card-subtitle mt-2">Historical performance by year</p>
        </div>
        <div class="card-body overflow-x-auto">
          <table ref="seasonTableRef" class="w-full text-sm">
            <thead>
              <tr class="border-b border-dark-border">
                <th class="text-left py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Season</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Teams</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Most Dominant</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Most Categories Won</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Fewest Categories Won</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Closest Matchup</th>
                <th class="text-center py-3 px-4 font-semibold text-dark-textSecondary uppercase tracking-wider">Champion</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="season in seasonRecords" :key="season.year" 
                  class="border-b border-dark-border hover:bg-dark-border/30 transition-colors">
                <td class="py-3 px-4 font-bold text-dark-text text-lg">{{ season.year }}</td>
                <td class="text-center py-3 px-4 text-dark-text">{{ season.teamCount }}</td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="season.mostDominant?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-green-400">{{ season.mostDominant?.name || 'N/A' }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ season.mostDominant?.record || '' }}</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="season.mostCatWins?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-green-400">{{ season.mostCatWins?.name || 'N/A' }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ season.mostCatWins?.value || '' }} cat wins</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="season.fewestCatWins?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-red-400">{{ season.fewestCatWins?.name || 'N/A' }}</span>
                  </div>
                  <div class="text-xs text-dark-textMuted">{{ season.fewestCatWins?.value || '' }} cat wins</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="text-yellow-400 font-semibold">{{ season.closestMatchup?.score || 'N/A' }}</div>
                  <div class="text-xs text-dark-textMuted">{{ season.closestMatchup?.teams || '' }}</div>
                </td>
                <td class="text-center py-3 px-4">
                  <div class="flex items-center justify-center gap-2">
                    <span class="text-lg">🏆</span>
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="season.champion?.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="font-semibold text-primary">{{ season.champion?.name || 'TBD' }}</span>
                  </div>
                </td>
              </tr>
              <tr v-if="seasonRecords.length === 0">
                <td colspan="7" class="py-8 text-center text-dark-textMuted">
                  No season data available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Head-to-Head Matrix -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">⚔️</span>
              <h2 class="card-title">Head-to-Head Matrix</h2>
            </div>
            <div class="flex items-center gap-4">
              <!-- Toggle for current members only -->
              <label class="flex items-center gap-2 cursor-pointer">
                <span class="text-sm text-dark-textMuted">Current members only</span>
                <div class="relative">
                  <input type="checkbox" v-model="showCurrentMembersOnlyH2H" class="sr-only">
                  <div :class="[
                    'w-10 h-5 rounded-full transition-colors',
                    showCurrentMembersOnlyH2H ? 'bg-primary' : 'bg-dark-border'
                  ]"></div>
                  <div :class="[
                    'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                    showCurrentMembersOnlyH2H ? 'translate-x-5' : 'translate-x-0'
                  ]"></div>
                </div>
              </label>
              <button 
                @click="downloadH2HMatrix"
                :disabled="isDownloadingH2H"
                class="btn-primary flex items-center gap-2 text-sm"
              >
                <svg v-if="!isDownloadingH2H" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingH2H ? 'Generating...' : 'Share' }}
              </button>
            </div>
          </div>
          <p class="card-subtitle mt-2">All-time records between teams (read horizontally: each row shows that team's record vs opponents)</p>
        </div>
        <div class="card-body overflow-x-auto scrollbar-thin">
          <table ref="h2hTableRef" class="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th class="sticky left-0 bg-dark-elevated z-10 px-3 py-2 text-left border border-dark-border min-w-[120px]">Team</th>
                <th 
                  v-for="team in filteredH2HTeams" 
                  :key="`header-${team.team_key}`"
                  class="px-2 py-2 text-center border border-dark-border font-semibold text-dark-textSecondary uppercase tracking-wider"
                  style="min-width: 90px;"
                >
                  <div class="flex flex-col items-center gap-1">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border">
                      <img :src="team.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="truncate text-[10px]" :title="team.team_name">{{ team.team_name.substring(0, 8) }}</div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rowTeam in filteredH2HTeams" :key="`row-${rowTeam.team_key}`">
                <td class="sticky left-0 bg-dark-elevated z-10 px-3 py-2 font-semibold text-dark-text border border-dark-border whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-dark-border flex-shrink-0">
                      <img :src="rowTeam.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <span class="truncate">{{ rowTeam.team_name }}</span>
                  </div>
                </td>
                <td 
                  v-for="colTeam in filteredH2HTeams" 
                  :key="`cell-${rowTeam.team_key}-${colTeam.team_key}`"
                  class="px-2 py-2 text-center border border-dark-border"
                  :class="getH2HCellClass(rowTeam.team_key, colTeam.team_key)"
                >
                  <template v-if="rowTeam.team_key === colTeam.team_key">
                    <span class="text-dark-textMuted">—</span>
                  </template>
                  <template v-else>
                    <div class="font-bold">{{ getH2HRecord(rowTeam.team_key, colTeam.team_key) }}</div>
                    <div class="text-[9px] opacity-75">{{ getH2HCatDiff(rowTeam.team_key, colTeam.team_key) }}</div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- H2H Legend -->
        <div class="card-footer border-t border-dark-border">
          <div class="flex items-center justify-center gap-6 text-xs">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded bg-green-500/20 border border-green-500/50"></div>
              <span class="text-dark-textMuted">Winning Record</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded bg-red-500/20 border border-red-500/50"></div>
              <span class="text-dark-textMuted">Losing Record</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded bg-yellow-500/20 border border-yellow-500/50"></div>
              <span class="text-dark-textMuted">Even Record</span>
            </div>
            <div class="text-dark-textMuted">
              <span class="font-semibold">Format:</span> W-L-T (Cat +/-)
            </div>
          </div>
        </div>
      </div>

      <!-- League Awards -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div class="flex items-center gap-2">
              <span class="text-2xl">🏆</span>
              <h2 class="card-title">League Awards</h2>
            </div>
          </div>
          <p class="card-subtitle mt-2">All-time records and achievements</p>
        </div>
        <div class="card-body">
          <!-- Hall of Fame -->
          <div class="mb-8">
            <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
              <span>🏅</span>
              <span>Hall of Fame</span>
            </h3>
            
            <!-- Overall Dominance Awards -->
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Overall Dominance</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div v-for="award in hallOfFameOverall" :key="award.title" class="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 rounded-xl p-4 border border-yellow-500/20">
                  <div class="text-sm text-yellow-400 uppercase tracking-wide mb-2 font-semibold">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0 ring-2 ring-yellow-500/50">
                      <img :src="award.winner.logo_url || defaultAvatar" :alt="award.winner.team_name" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ award.winner.season || 'All-Time' }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="flex items-center justify-between">
                    <div class="text-2xl font-black text-yellow-400">{{ award.winner.value }}</div>
                    <div class="text-xs text-dark-textMuted">{{ award.winner.detail }}</div>
                  </div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                </div>
              </div>
            </div>
            
            <!-- Category Kings - Hitting -->
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">👑 Hitting Category Kings (Best Single Season)</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div v-for="award in hallOfFameHitting" :key="award.category" class="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-4 border border-blue-500/20">
                  <div class="text-center mb-2">
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/30 text-blue-400">{{ award.category }}</span>
                  </div>
                  <div v-if="award.winner" class="text-center">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-blue-500/50">
                      <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                    <div class="text-2xl font-black text-blue-400">{{ award.winner.value }}</div>
                    <div class="text-xs text-dark-textMuted">wins in {{ award.winner.season }}</div>
                  </div>
                  <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                </div>
              </div>
            </div>
            
            <!-- Category Kings - Pitching -->
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">👑 Pitching Category Kings (Best Single Season)</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div v-for="award in hallOfFamePitching" :key="award.category" class="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-4 border border-purple-500/20">
                  <div class="text-center mb-2">
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/30 text-purple-400">{{ award.category }}</span>
                  </div>
                  <div v-if="award.winner" class="text-center">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-purple-500/50">
                      <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                    <div class="text-2xl font-black text-purple-400">{{ award.winner.value }}</div>
                    <div class="text-xs text-dark-textMuted">wins in {{ award.winner.season }}</div>
                  </div>
                  <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Hall of Shame -->
          <div>
            <h3 class="text-xl font-bold text-dark-text mb-4 flex items-center gap-2">
              <span>💩</span>
              <span>Hall of Shame</span>
            </h3>
            
            <!-- Overall Struggles -->
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">Overall Struggles</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div v-for="award in hallOfShameOverall" :key="award.title" class="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl p-4 border border-red-500/20">
                  <div class="text-sm text-red-400 uppercase tracking-wide mb-2 font-semibold">{{ award.title }}</div>
                  <div v-if="award.winner" class="flex items-center gap-3 mb-2">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border flex-shrink-0 ring-2 ring-red-500/50">
                      <img :src="award.winner.logo_url || defaultAvatar" :alt="award.winner.team_name" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="flex-1">
                      <div class="font-bold text-dark-text">{{ award.winner.team_name }}</div>
                      <div class="text-xs text-dark-textMuted">{{ award.winner.season || 'All-Time' }}</div>
                    </div>
                  </div>
                  <div v-if="award.winner" class="flex items-center justify-between">
                    <div class="text-2xl font-black text-red-400">{{ award.winner.value }}</div>
                    <div class="text-xs text-dark-textMuted">{{ award.winner.detail }}</div>
                  </div>
                  <div v-else class="text-sm text-dark-textMuted italic">No data available</div>
                </div>
              </div>
            </div>
            
            <!-- Category Struggles - Hitting -->
            <div class="mb-6">
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">💀 Hitting Category Struggles (Worst Single Season)</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div v-for="award in hallOfShameHitting" :key="award.category" class="bg-gradient-to-br from-gray-500/10 to-gray-600/5 rounded-xl p-4 border border-gray-500/20">
                  <div class="text-center mb-2">
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/30 text-gray-400">{{ award.category }}</span>
                  </div>
                  <div v-if="award.winner" class="text-center">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-gray-500/50">
                      <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                    <div class="text-2xl font-black text-gray-400">{{ award.winner.value }}</div>
                    <div class="text-xs text-dark-textMuted">wins in {{ award.winner.season }}</div>
                  </div>
                  <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                </div>
              </div>
            </div>
            
            <!-- Category Struggles - Pitching -->
            <div>
              <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-3">💀 Pitching Category Struggles (Worst Single Season)</h4>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div v-for="award in hallOfShamePitching" :key="award.category" class="bg-gradient-to-br from-gray-500/10 to-gray-600/5 rounded-xl p-4 border border-gray-500/20">
                  <div class="text-center mb-2">
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-gray-500/30 text-gray-400">{{ award.category }}</span>
                  </div>
                  <div v-if="award.winner" class="text-center">
                    <div class="w-10 h-10 rounded-full overflow-hidden bg-dark-border mx-auto mb-2 ring-2 ring-gray-500/50">
                      <img :src="award.winner.logo_url || defaultAvatar" class="w-full h-full object-cover" @error="handleImageError" />
                    </div>
                    <div class="font-semibold text-dark-text text-sm truncate">{{ award.winner.team_name }}</div>
                    <div class="text-2xl font-black text-gray-400">{{ award.winner.value }}</div>
                    <div class="text-xs text-dark-textMuted">wins in {{ award.winner.season }}</div>
                  </div>
                  <div v-else class="text-center text-sm text-dark-textMuted italic py-4">No data</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'
import { yahooService } from '@/services/yahoo'
import html2canvas from 'html2canvas'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

interface CareerStat {
  team_key: string
  team_name: string
  logo_url: string
  seasons: number
  championships: number
  matchup_wins: number
  matchup_losses: number
  matchup_ties: number
  matchup_win_pct: number
  total_cat_wins: number
  total_cat_losses: number
  hitting_cat_wins: number
  pitching_cat_wins: number
  avg_cat_wins: number
  cat_diff: number
  total_matchups: number
  best_category: string
  worst_category: string
  category_records: Record<string, { wins: number; losses: number }>
}

const isLoading = ref(true)
const loadingMessage = ref('Loading historical data...')
const isDownloading = ref(false)
const isDownloadingSeason = ref(false)
const isDownloadingH2H = ref(false)
const showCurrentMembersOnly = ref(false)
const showCurrentMembersOnlyH2H = ref(false)
const sortColumn = ref('matchup_wins')
const sortDirection = ref<'asc' | 'desc'>('desc')

const careerTableRef = ref<HTMLElement | null>(null)
const seasonTableRef = ref<HTMLElement | null>(null)
const h2hTableRef = ref<HTMLElement | null>(null)
const historicalData = ref<Record<string, any>>({})
const currentMembers = ref<Set<string>>(new Set())
const allTeams = ref<Record<string, any>>({})
const leagueCategories = ref<string[]>([])
const h2hRecords = ref<Record<string, Record<string, { wins: number; losses: number; ties: number; catWins: number; catLosses: number }>>>({})

const defaultAvatar = 'https://s.yimg.com/cv/apiv2/default/mlb/mlb_dp_2_72.png'

// Career Records - top 4 stats
const careerRecords = computed(() => {
  const stats = careerStats.value
  if (stats.length === 0) return []
  
  const mostChampionships = [...stats].sort((a, b) => b.championships - a.championships)[0]
  const mostCatWins = [...stats].sort((a, b) => b.total_cat_wins - a.total_cat_wins)[0]
  const mostHittingWins = [...stats].sort((a, b) => b.hitting_cat_wins - a.hitting_cat_wins)[0]
  const mostPitchingWins = [...stats].sort((a, b) => b.pitching_cat_wins - a.pitching_cat_wins)[0]
  
  return [
    {
      label: 'Most Championships',
      team: mostChampionships?.team_name || 'N/A',
      value: mostChampionships?.championships || 0,
      icon: '🏆',
      detail: `${mostChampionships?.seasons || 0} season(s) played`
    },
    {
      label: 'Total Categories Won',
      team: mostCatWins?.team_name || 'N/A',
      value: mostCatWins?.total_cat_wins || 0,
      icon: '🎯',
      detail: `+${mostCatWins?.cat_diff || 0} category differential`
    },
    {
      label: 'Hitting Categories Won',
      team: mostHittingWins?.team_name || 'N/A',
      value: mostHittingWins?.hitting_cat_wins || 0,
      icon: '⚾',
      detail: `${mostHittingWins?.seasons || 0} season(s) played`
    },
    {
      label: 'Pitching Categories Won',
      team: mostPitchingWins?.team_name || 'N/A',
      value: mostPitchingWins?.pitching_cat_wins || 0,
      icon: '💪',
      detail: `${mostPitchingWins?.seasons || 0} season(s) played`
    }
  ]
})

// Calculate variance in category performance
function calculateCategoryVariance(stat: CareerStat): number {
  const records = Object.values(stat.category_records || {})
  if (records.length === 0) return Infinity
  
  const winRates = records.map(r => r.wins / (r.wins + r.losses) || 0)
  const avg = winRates.reduce((a, b) => a + b, 0) / winRates.length
  const variance = winRates.reduce((sum, rate) => sum + Math.pow(rate - avg, 2), 0) / winRates.length
  return variance
}

// Computed: Career Stats
const careerStats = computed((): CareerStat[] => {
  const statsMap: Record<string, CareerStat> = {}
  
  // Aggregate stats across all seasons
  for (const [season, seasonData] of Object.entries(historicalData.value)) {
    const standings = seasonData.standings || []
    const matchups = seasonData.matchups || []
    
    for (const team of standings) {
      const teamKey = team.team_key
      const existing = statsMap[teamKey]
      
      const teamInfo = allTeams.value[teamKey]
      const logoUrl = teamInfo?.logo_url || team.logo_url || ''
      
      // Parse wins/losses/ties from standings (H2H Categories format)
      const wins = team.wins || 0
      const losses = team.losses || 0
      const ties = team.ties || 0
      
      if (existing) {
        existing.seasons++
        existing.matchup_wins += wins
        existing.matchup_losses += losses
        existing.matchup_ties += ties
        existing.total_matchups += wins + losses + ties
        if (team.is_champion) existing.championships++
        if (logoUrl && !existing.logo_url) existing.logo_url = logoUrl
      } else {
        statsMap[teamKey] = {
          team_key: teamKey,
          team_name: team.name || 'Unknown Team',
          logo_url: logoUrl,
          seasons: 1,
          championships: team.is_champion ? 1 : 0,
          matchup_wins: wins,
          matchup_losses: losses,
          matchup_ties: ties,
          matchup_win_pct: 0,
          total_cat_wins: 0,
          total_cat_losses: 0,
          hitting_cat_wins: 0,
          pitching_cat_wins: 0,
          avg_cat_wins: 0,
          cat_diff: 0,
          total_matchups: wins + losses + ties,
          best_category: '',
          worst_category: '',
          category_records: {}
        }
      }
    }
    
    // Process matchups to get category-level data
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      
      // stat_winners is on the matchup level, not team level
      const statWinners = matchup.stat_winners || []
      
      for (const team of matchup.teams) {
        const teamKey = team.team_key
        if (!statsMap[teamKey]) continue
        
        const stat = statsMap[teamKey]
        
        // Category wins/losses from matchup - is_tied is a boolean now
        const catWins = statWinners.filter((w: any) => !w.is_tied && w.winner_team_key === teamKey).length || 0
        const catLosses = statWinners.filter((w: any) => !w.is_tied && w.winner_team_key && w.winner_team_key !== teamKey).length || 0
        
        stat.total_cat_wins += catWins
        stat.total_cat_losses += catLosses
        
        // Track category-specific records and hitting/pitching splits
        for (const catResult of statWinners) {
          const catId = catResult.stat_id
          const catName = getCategoryDisplayName(catId)
          
          if (!stat.category_records[catId]) {
            stat.category_records[catId] = { wins: 0, losses: 0 }
          }
          
          // is_tied is a boolean (false = not tied, true = tied)
          if (!catResult.is_tied) {
            if (catResult.winner_team_key === teamKey) {
              stat.category_records[catId].wins++
              // Track hitting vs pitching
              if (isHittingCategory(catName)) {
                stat.hitting_cat_wins++
              } else {
                stat.pitching_cat_wins++
              }
            } else if (catResult.winner_team_key) {
              stat.category_records[catId].losses++
            }
          }
        }
      }
    }
  }
  
  // Calculate derived stats and find best/worst categories
  const stats = Object.values(statsMap).map(stat => {
    const totalGames = stat.matchup_wins + stat.matchup_losses + stat.matchup_ties
    stat.matchup_win_pct = totalGames > 0 ? (stat.matchup_wins + stat.matchup_ties * 0.5) / totalGames : 0
    stat.cat_diff = stat.total_cat_wins - stat.total_cat_losses
    stat.avg_cat_wins = stat.total_matchups > 0 ? stat.total_cat_wins / stat.total_matchups : 0
    
    // Find best and worst categories
    const catRecords = Object.entries(stat.category_records)
    if (catRecords.length > 0) {
      const sorted = catRecords.sort((a, b) => {
        const aRate = a[1].wins / (a[1].wins + a[1].losses) || 0
        const bRate = b[1].wins / (b[1].wins + b[1].losses) || 0
        return bRate - aRate
      })
      stat.best_category = getCategoryDisplayName(sorted[0][0])
      stat.worst_category = getCategoryDisplayName(sorted[sorted.length - 1][0])
    }
    
    return stat
  })
  
  return sortStats(stats)
})

// Filtered career stats
const filteredCareerStats = computed(() => {
  if (!showCurrentMembersOnly.value) return careerStats.value
  return careerStats.value.filter(stat => currentMembers.value.has(stat.team_key))
})

// Category leaders
const categoryLeaders = computed(() => {
  const categories = leagueCategories.value.length > 0 ? leagueCategories.value : ['HR', 'RBI', 'R', 'SB', 'AVG', 'W', 'K', 'ERA', 'WHIP', 'SV']
  
  return categories.slice(0, 10).map(cat => {
    // Find team with best win rate in this category
    let bestTeam: any = null
    let bestRate = 0
    
    for (const stat of careerStats.value) {
      const record = stat.category_records[cat]
      if (!record || record.wins + record.losses < 5) continue
      
      const rate = record.wins / (record.wins + record.losses)
      if (rate > bestRate) {
        bestRate = rate
        bestTeam = {
          team_name: stat.team_name,
          logo_url: stat.logo_url,
          win_rate: rate,
          wins: record.wins,
          losses: record.losses
        }
      }
    }
    
    return { name: cat, leader: bestTeam }
  })
})

// Season-by-Season Records
const seasonRecords = computed(() => {
  const records: any[] = []
  
  for (const [year, data] of Object.entries(historicalData.value)) {
    const standings = data.standings || []
    const matchups = data.matchups || []
    
    if (standings.length === 0) continue
    
    // Find champion
    const champion = standings.find((t: any) => t.rank === 1 || t.is_champion)
    
    // Find most dominant (best record)
    const sorted = [...standings].sort((a: any, b: any) => {
      const aWinPct = (a.wins || 0) / ((a.wins || 0) + (a.losses || 0) + (a.ties || 0)) || 0
      const bWinPct = (b.wins || 0) / ((b.wins || 0) + (b.losses || 0) + (b.ties || 0)) || 0
      return bWinPct - aWinPct
    })
    const mostDominant = sorted[0]
    
    // Calculate average category wins per week
    let totalCatWins = 0
    let totalMatchups = 0
    for (const team of standings) {
      totalMatchups += (team.wins || 0) + (team.losses || 0) + (team.ties || 0)
    }
    // Estimate avg cat wins (would be more accurate with matchup data)
    const avgCatWins = totalMatchups > 0 ? 5.0 : 0 // Placeholder - would calculate from matchups
    
    // Find closest and biggest blowout matchups
    let closestMatchup: any = null
    let biggestBlowout: any = null
    let closestDiff = Infinity
    let biggestDiff = 0
    
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      
      const team1 = matchup.teams[0]
      const team2 = matchup.teams[1]
      const statWinners = matchup.stat_winners || []
      
      // Calculate category differential for this matchup - use matchup.stat_winners
      const t1CatWins = statWinners.filter((w: any) => w.winner_team_key === team1.team_key && !w.is_tied).length || 0
      const t2CatWins = statWinners.filter((w: any) => w.winner_team_key === team2.team_key && !w.is_tied).length || 0
      const diff = Math.abs(t1CatWins - t2CatWins)
      
      const team1Name = allTeams.value[team1.team_key]?.name || team1.name || 'Team 1'
      const team2Name = allTeams.value[team2.team_key]?.name || team2.name || 'Team 2'
      
      if (diff < closestDiff && diff <= 2) {
        closestDiff = diff
        closestMatchup = {
          score: `${Math.max(t1CatWins, t2CatWins)}-${Math.min(t1CatWins, t2CatWins)}`,
          teams: `${team1Name} vs ${team2Name}`
        }
      }
      
      if (diff > biggestDiff) {
        biggestDiff = diff
        biggestBlowout = {
          score: `${Math.max(t1CatWins, t2CatWins)}-${Math.min(t1CatWins, t2CatWins)}`,
          teams: `${t1CatWins > t2CatWins ? team1Name : team2Name} def. ${t1CatWins > t2CatWins ? team2Name : team1Name}`
        }
      }
    }
    
    // Calculate category wins per team for the season
    const teamCatWins: Record<string, number> = {}
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      const statWinners = matchup.stat_winners || []
      for (const team of matchup.teams) {
        const teamKey = team.team_key
        if (!teamKey) continue
        const catWins = statWinners.filter((w: any) => w.winner_team_key === teamKey && !w.is_tied).length || 0
        teamCatWins[teamKey] = (teamCatWins[teamKey] || 0) + catWins
      }
    }
    
    // Find most and fewest category wins
    const catWinEntries = Object.entries(teamCatWins).sort((a, b) => b[1] - a[1])
    const mostCatWinsTeam = catWinEntries[0]
    const fewestCatWinsTeam = catWinEntries[catWinEntries.length - 1]
    
    records.push({
      year,
      teamCount: standings.length,
      avgCatWins,
      champion: champion ? {
        name: champion.name,
        logo_url: allTeams.value[champion.team_key]?.logo_url || champion.logo_url
      } : null,
      mostDominant: mostDominant ? {
        name: mostDominant.name,
        logo_url: allTeams.value[mostDominant.team_key]?.logo_url || mostDominant.logo_url,
        record: `${mostDominant.wins || 0}-${mostDominant.losses || 0}-${mostDominant.ties || 0}`
      } : null,
      mostCatWins: mostCatWinsTeam ? {
        name: allTeams.value[mostCatWinsTeam[0]]?.name || standings.find((t: any) => t.team_key === mostCatWinsTeam[0])?.name || 'Unknown',
        logo_url: allTeams.value[mostCatWinsTeam[0]]?.logo_url || '',
        value: mostCatWinsTeam[1]
      } : null,
      fewestCatWins: fewestCatWinsTeam ? {
        name: allTeams.value[fewestCatWinsTeam[0]]?.name || standings.find((t: any) => t.team_key === fewestCatWinsTeam[0])?.name || 'Unknown',
        logo_url: allTeams.value[fewestCatWinsTeam[0]]?.logo_url || '',
        value: fewestCatWinsTeam[1]
      } : null,
      closestMatchup: closestMatchup || { score: 'N/A', teams: '' }
    })
  }
  
  return records.sort((a, b) => parseInt(b.year) - parseInt(a.year))
})

// Build season-level category data for awards
const seasonCategoryData = computed(() => {
  const data: any[] = []
  
  for (const [year, seasonData] of Object.entries(historicalData.value)) {
    const matchups = seasonData.matchups || []
    const standings = seasonData.standings || []
    
    // Track category wins per team for this season
    const teamCatWins: Record<string, Record<string, number>> = {}
    const teamTotalCatWins: Record<string, number> = {}
    
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      const statWinners = matchup.stat_winners || []
      
      for (const team of matchup.teams) {
        const teamKey = team.team_key
        if (!teamKey) continue
        
        if (!teamCatWins[teamKey]) teamCatWins[teamKey] = {}
        if (!teamTotalCatWins[teamKey]) teamTotalCatWins[teamKey] = 0
        
        for (const catResult of statWinners) {
          const catId = catResult.stat_id
          const catName = getCategoryDisplayName(catId)
          
          if (!catResult.is_tied && catResult.winner_team_key === teamKey) {
            if (!teamCatWins[teamKey][catName]) teamCatWins[teamKey][catName] = 0
            teamCatWins[teamKey][catName]++
            teamTotalCatWins[teamKey]++
          }
        }
      }
    }
    
    // Get team info
    for (const [teamKey, catWins] of Object.entries(teamCatWins)) {
      const teamInfo = allTeams.value[teamKey] || standings.find((t: any) => t.team_key === teamKey) || {}
      const teamStanding = standings.find((t: any) => t.team_key === teamKey)
      
      data.push({
        year,
        team_key: teamKey,
        team_name: teamInfo.name || 'Unknown',
        logo_url: teamInfo.logo_url || '',
        category_wins: catWins,
        total_cat_wins: teamTotalCatWins[teamKey] || 0,
        matchup_wins: teamStanding?.wins || 0,
        matchup_losses: teamStanding?.losses || 0,
        matchup_ties: teamStanding?.ties || 0
      })
    }
  }
  
  return data
})

// Get all unique categories from the data
const allCategories = computed(() => {
  const cats = new Set<string>()
  for (const season of seasonCategoryData.value) {
    for (const cat of Object.keys(season.category_wins || {})) {
      cats.add(cat)
    }
  }
  return Array.from(cats)
})

// Hall of Fame - Overall Dominance
const hallOfFameOverall = computed(() => {
  const stats = careerStats.value
  const seasonData = seasonCategoryData.value
  
  // Most Championships
  const mostChamps = [...stats].sort((a, b) => b.championships - a.championships)[0]
  
  // Most Category Wins in a Single Season
  const bestCatSeason = [...seasonData].sort((a, b) => b.total_cat_wins - a.total_cat_wins)[0]
  
  // Best Single Season Win Rate
  const bestWinRate = [...seasonData]
    .filter(s => (s.matchup_wins + s.matchup_losses + s.matchup_ties) >= 10)
    .sort((a, b) => {
      const aRate = a.matchup_wins / (a.matchup_wins + a.matchup_losses + a.matchup_ties)
      const bRate = b.matchup_wins / (b.matchup_wins + b.matchup_losses + b.matchup_ties)
      return bRate - aRate
    })[0]
  
  // Most Total Category Wins All-Time
  const mostTotalCats = [...stats].sort((a, b) => b.total_cat_wins - a.total_cat_wins)[0]
  
  return [
    {
      title: '🏆 Dynasty Builder',
      winner: mostChamps ? {
        team_name: mostChamps.team_name,
        logo_url: mostChamps.logo_url,
        value: mostChamps.championships,
        detail: 'championships',
        season: 'All-Time'
      } : null
    },
    {
      title: '🎯 Category Machine',
      winner: bestCatSeason ? {
        team_name: bestCatSeason.team_name,
        logo_url: bestCatSeason.logo_url,
        value: bestCatSeason.total_cat_wins,
        detail: 'cat wins',
        season: bestCatSeason.year
      } : null
    },
    {
      title: '📊 Mr. Perfect',
      winner: bestWinRate ? {
        team_name: bestWinRate.team_name,
        logo_url: bestWinRate.logo_url,
        value: `${((bestWinRate.matchup_wins / (bestWinRate.matchup_wins + bestWinRate.matchup_losses + bestWinRate.matchup_ties)) * 100).toFixed(0)}%`,
        detail: `${bestWinRate.matchup_wins}-${bestWinRate.matchup_losses}-${bestWinRate.matchup_ties}`,
        season: bestWinRate.year
      } : null
    },
    {
      title: '💎 Category King',
      winner: mostTotalCats ? {
        team_name: mostTotalCats.team_name,
        logo_url: mostTotalCats.logo_url,
        value: mostTotalCats.total_cat_wins,
        detail: 'all-time cat wins',
        season: 'All-Time'
      } : null
    }
  ]
})

// Hall of Fame - Hitting Categories (Best Single Season)
const hallOfFameHitting = computed(() => {
  const hittingCats = allCategories.value.filter(cat => isHittingCategory(cat))
  
  return hittingCats.map(cat => {
    let bestSeason: any = null
    let bestValue = 0
    
    for (const season of seasonCategoryData.value) {
      const catWins = season.category_wins[cat] || 0
      if (catWins > bestValue) {
        bestValue = catWins
        bestSeason = {
          team_name: season.team_name,
          logo_url: season.logo_url,
          value: catWins,
          season: season.year
        }
      }
    }
    
    return { category: cat, winner: bestSeason }
  })
})

// Hall of Fame - Pitching Categories (Best Single Season)
const hallOfFamePitching = computed(() => {
  const pitchingCats = allCategories.value.filter(cat => !isHittingCategory(cat))
  
  return pitchingCats.map(cat => {
    let bestSeason: any = null
    let bestValue = 0
    
    for (const season of seasonCategoryData.value) {
      const catWins = season.category_wins[cat] || 0
      if (catWins > bestValue) {
        bestValue = catWins
        bestSeason = {
          team_name: season.team_name,
          logo_url: season.logo_url,
          value: catWins,
          season: season.year
        }
      }
    }
    
    return { category: cat, winner: bestSeason }
  })
})

// Hall of Shame - Overall Struggles
const hallOfShameOverall = computed(() => {
  const seasonData = seasonCategoryData.value
  
  // Worst Single Season Record
  const worstRecord = [...seasonData]
    .filter(s => (s.matchup_wins + s.matchup_losses + s.matchup_ties) >= 10)
    .sort((a, b) => {
      const aRate = a.matchup_wins / (a.matchup_wins + a.matchup_losses + a.matchup_ties)
      const bRate = b.matchup_wins / (b.matchup_wins + b.matchup_losses + b.matchup_ties)
      return aRate - bRate
    })[0]
  
  // Fewest Category Wins in a Season
  const fewestCats = [...seasonData]
    .filter(s => s.total_cat_wins > 0)
    .sort((a, b) => a.total_cat_wins - b.total_cat_wins)[0]
  
  // Most Ties in a Season
  const mostTies = [...seasonData].sort((a, b) => b.matchup_ties - a.matchup_ties)[0]
  
  // Worst Category Differential All-Time
  const stats = careerStats.value
  const worstDiff = [...stats].sort((a, b) => a.cat_diff - b.cat_diff)[0]
  
  return [
    {
      title: '💩 Basement Dweller',
      winner: worstRecord ? {
        team_name: worstRecord.team_name,
        logo_url: worstRecord.logo_url,
        value: `${((worstRecord.matchup_wins / (worstRecord.matchup_wins + worstRecord.matchup_losses + worstRecord.matchup_ties)) * 100).toFixed(0)}%`,
        detail: `${worstRecord.matchup_wins}-${worstRecord.matchup_losses}-${worstRecord.matchup_ties}`,
        season: worstRecord.year
      } : null
    },
    {
      title: '📉 Category Crater',
      winner: fewestCats ? {
        team_name: fewestCats.team_name,
        logo_url: fewestCats.logo_url,
        value: fewestCats.total_cat_wins,
        detail: 'cat wins',
        season: fewestCats.year
      } : null
    },
    {
      title: '😢 Mr. Indecisive',
      winner: mostTies && mostTies.matchup_ties > 0 ? {
        team_name: mostTies.team_name,
        logo_url: mostTies.logo_url,
        value: mostTies.matchup_ties,
        detail: 'ties',
        season: mostTies.year
      } : null
    },
    {
      title: '🕳️ Category Hole',
      winner: worstDiff ? {
        team_name: worstDiff.team_name,
        logo_url: worstDiff.logo_url,
        value: worstDiff.cat_diff,
        detail: 'cat differential',
        season: 'All-Time'
      } : null
    }
  ]
})

// Hall of Shame - Hitting Categories (Worst Single Season)
const hallOfShameHitting = computed(() => {
  const hittingCats = allCategories.value.filter(cat => isHittingCategory(cat))
  
  return hittingCats.map(cat => {
    let worstSeason: any = null
    let worstValue = Infinity
    
    for (const season of seasonCategoryData.value) {
      const catWins = season.category_wins[cat]
      if (catWins !== undefined && catWins < worstValue) {
        worstValue = catWins
        worstSeason = {
          team_name: season.team_name,
          logo_url: season.logo_url,
          value: catWins,
          season: season.year
        }
      }
    }
    
    return { category: cat, winner: worstSeason }
  })
})

// Hall of Shame - Pitching Categories (Worst Single Season)
const hallOfShamePitching = computed(() => {
  const pitchingCats = allCategories.value.filter(cat => !isHittingCategory(cat))
  
  return pitchingCats.map(cat => {
    let worstSeason: any = null
    let worstValue = Infinity
    
    for (const season of seasonCategoryData.value) {
      const catWins = season.category_wins[cat]
      if (catWins !== undefined && catWins < worstValue) {
        worstValue = catWins
        worstSeason = {
          team_name: season.team_name,
          logo_url: season.logo_url,
          value: catWins,
          season: season.year
        }
      }
    }
    
    return { category: cat, winner: worstSeason }
  })
})

// H2H Teams list
const h2hTeams = computed(() => {
  const teams: any[] = []
  const seen = new Set<string>()
  
  for (const stat of careerStats.value) {
    if (!seen.has(stat.team_key)) {
      seen.add(stat.team_key)
      teams.push({
        team_key: stat.team_key,
        team_name: stat.team_name,
        logo_url: stat.logo_url
      })
    }
  }
  
  return teams.sort((a, b) => a.team_name.localeCompare(b.team_name))
})

// Filtered H2H teams
const filteredH2HTeams = computed(() => {
  if (!showCurrentMembersOnlyH2H.value) return h2hTeams.value
  return h2hTeams.value.filter(t => currentMembers.value.has(t.team_key))
})

// Get H2H record between two teams
function getH2HRecord(team1Key: string, team2Key: string): string {
  const record = h2hRecords.value[team1Key]?.[team2Key]
  if (!record) return '0-0-0'
  return `${record.wins}-${record.losses}-${record.ties}`
}

// Get H2H category differential
function getH2HCatDiff(team1Key: string, team2Key: string): string {
  const record = h2hRecords.value[team1Key]?.[team2Key]
  if (!record) return ''
  const diff = record.catWins - record.catLosses
  if (diff > 0) return `+${diff} cats`
  if (diff < 0) return `${diff} cats`
  return 'Even'
}

// Get H2H cell background class
function getH2HCellClass(team1Key: string, team2Key: string): string {
  if (team1Key === team2Key) return 'bg-dark-border/50'
  
  const record = h2hRecords.value[team1Key]?.[team2Key]
  if (!record) return ''
  
  if (record.wins > record.losses) return 'bg-green-500/20 text-green-400'
  if (record.losses > record.wins) return 'bg-red-500/20 text-red-400'
  if (record.wins === record.losses && record.wins > 0) return 'bg-yellow-500/10 text-yellow-400'
  return ''
}

// Sort functions
function sortBy(column: string) {
  if (sortColumn.value === column) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = column
    sortDirection.value = 'desc'
  }
}

function sortStats(stats: CareerStat[]): CareerStat[] {
  return [...stats].sort((a, b) => {
    let aVal = (a as any)[sortColumn.value] || 0
    let bVal = (b as any)[sortColumn.value] || 0
    
    if (sortDirection.value === 'asc') {
      return aVal - bVal
    }
    return bVal - aVal
  })
}

function getRecordClass(stat: CareerStat, column: string): string {
  const stats = careerStats.value
  if (stats.length === 0) return 'text-dark-text'
  
  const values = stats.map(s => (s as any)[column] || 0)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const val = (stat as any)[column] || 0
  
  if (val === max && column !== 'matchup_losses') return 'text-green-400 font-bold'
  if (val === min && column === 'matchup_losses') return 'text-green-400 font-bold'
  if (val === min && column !== 'matchup_losses') return 'text-red-400'
  if (val === max && column === 'matchup_losses') return 'text-red-400'
  return 'text-dark-text'
}

function getCategoryDisplayName(statId: string): string {
  // Map stat IDs to display names (this would ideally come from league settings)
  const mapping: Record<string, string> = {
    '7': 'R', '12': 'HR', '13': 'RBI', '16': 'SB', '3': 'AVG',
    '28': 'W', '32': 'SV', '42': 'K', '26': 'ERA', '27': 'WHIP',
    '60': 'OPS', '8': 'H', '55': 'OBP', '56': 'SLG'
  }
  return mapping[statId] || statId
}

function isHittingCategory(catName: string): boolean {
  const hittingCats = ['HR', 'RBI', 'R', 'SB', 'AVG', 'OPS', 'OBP', 'SLG', 'H', 'TB', 'BB', 'XBH', 'AB', 'PA']
  return hittingCats.includes(catName)
}

function getCategoryColorClass(cat: string): string {
  const hittingCats = ['HR', 'RBI', 'R', 'SB', 'AVG', 'OPS', 'OBP', 'SLG', 'H']
  if (hittingCats.includes(cat)) return 'bg-blue-500/30 text-blue-400'
  return 'bg-purple-500/30 text-purple-400'
}

function handleImageError(e: Event) {
  const img = e.target as HTMLImageElement
  img.src = defaultAvatar
}

async function downloadCareerStats() {
  if (!careerTableRef.value) return
  isDownloading.value = true
  try {
    const canvas = await html2canvas(careerTableRef.value, {
      backgroundColor: '#1a1d23',
      scale: 2
    })
    const link = document.createElement('a')
    link.download = 'category-league-career-stats.png'
    link.href = canvas.toDataURL()
    link.click()
  } finally {
    isDownloading.value = false
  }
}

async function downloadSeasonHistory() {
  if (!seasonTableRef.value) return
  isDownloadingSeason.value = true
  try {
    const canvas = await html2canvas(seasonTableRef.value, {
      backgroundColor: '#1a1d23',
      scale: 2
    })
    const link = document.createElement('a')
    link.download = 'category-league-season-history.png'
    link.href = canvas.toDataURL()
    link.click()
  } finally {
    isDownloadingSeason.value = false
  }
}

async function downloadH2HMatrix() {
  if (!h2hTableRef.value) return
  isDownloadingH2H.value = true
  try {
    const canvas = await html2canvas(h2hTableRef.value, {
      backgroundColor: '#1a1d23',
      scale: 2
    })
    const link = document.createElement('a')
    link.download = 'category-league-h2h-matrix.png'
    link.href = canvas.toDataURL()
    link.click()
  } finally {
    isDownloadingH2H.value = false
  }
}

// Build H2H records from matchup data
function buildH2HRecords() {
  const records: Record<string, Record<string, { wins: number; losses: number; ties: number; catWins: number; catLosses: number }>> = {}
  
  for (const [year, data] of Object.entries(historicalData.value)) {
    const matchups = data.matchups || []
    
    for (const matchup of matchups) {
      if (!matchup.teams || matchup.teams.length < 2) continue
      
      const team1 = matchup.teams[0]
      const team2 = matchup.teams[1]
      const team1Key = team1.team_key
      const team2Key = team2.team_key
      const statWinners = matchup.stat_winners || []
      
      if (!team1Key || !team2Key) continue
      
      // Initialize records if needed
      if (!records[team1Key]) records[team1Key] = {}
      if (!records[team2Key]) records[team2Key] = {}
      if (!records[team1Key][team2Key]) records[team1Key][team2Key] = { wins: 0, losses: 0, ties: 0, catWins: 0, catLosses: 0 }
      if (!records[team2Key][team1Key]) records[team2Key][team1Key] = { wins: 0, losses: 0, ties: 0, catWins: 0, catLosses: 0 }
      
      // Calculate category wins for each team - use matchup.stat_winners
      const t1CatWins = statWinners.filter((w: any) => w.winner_team_key === team1Key && !w.is_tied).length || 0
      const t2CatWins = statWinners.filter((w: any) => w.winner_team_key === team2Key && !w.is_tied).length || 0
      const ties = statWinners.filter((w: any) => w.is_tied).length || 0
      
      // Determine matchup winner
      if (t1CatWins > t2CatWins) {
        records[team1Key][team2Key].wins++
        records[team2Key][team1Key].losses++
      } else if (t2CatWins > t1CatWins) {
        records[team1Key][team2Key].losses++
        records[team2Key][team1Key].wins++
      } else {
        records[team1Key][team2Key].ties++
        records[team2Key][team1Key].ties++
      }
      
      // Track category totals
      records[team1Key][team2Key].catWins += t1CatWins
      records[team1Key][team2Key].catLosses += t2CatWins
      records[team2Key][team1Key].catWins += t2CatWins
      records[team2Key][team1Key].catLosses += t1CatWins
    }
  }
  
  h2hRecords.value = records
}

async function loadHistoricalData() {
  isLoading.value = true
  loadingMessage.value = 'Connecting to Yahoo...'
  
  try {
    const leagueKey = leagueStore.activeLeagueId
    if (!leagueKey || !authStore.user?.id) {
      isLoading.value = false
      return
    }
    
    await yahooService.initialize(authStore.user.id)
    
    const gameKey = leagueKey.split('.')[0]
    
    // Baseball game keys by year
    const gameKeys: Record<string, string> = {
      '2025': '458', '2024': '431', '2023': '422', '2022': '412',
      '2021': '404', '2020': '398', '2019': '388', '2018': '378',
      '2017': '370', '2016': '357', '2015': '346', '2014': '328'
    }
    
    // Extract league ID from current league key
    const leagueId = leagueKey.split('.l.')[1]
    loadingMessage.value = `Loading league ${leagueId} history...`
    
    // Try to load multiple seasons
    const data: Record<string, any> = {}
    const years = Object.keys(gameKeys).sort((a, b) => parseInt(b) - parseInt(a))
    
    for (const year of years.slice(0, 5)) { // Load last 5 years max
      const yearGameKey = gameKeys[year]
      const yearLeagueKey = `${yearGameKey}.l.${leagueId}`
      
      loadingMessage.value = `Loading ${year} season...`
      
      try {
        const standings = await yahooService.getStandings(yearLeagueKey)
        if (standings && standings.length > 0) {
          // Determine champion (rank 1 at end of playoffs)
          const champion = standings.find((t: any) => t.rank === 1)
          if (champion) champion.is_champion = true
          
          data[year] = { standings, matchups: [] }
          
          // Store current members from most recent season
          if (Object.keys(data).length === 1) {
            standings.forEach((t: any) => {
              currentMembers.value.add(t.team_key)
              allTeams.value[t.team_key] = t
            })
          } else {
            // Also store team info from older seasons
            standings.forEach((t: any) => {
              if (!allTeams.value[t.team_key]) {
                allTeams.value[t.team_key] = t
              }
            })
          }
          
          // Try to load matchups for category data
          try {
            loadingMessage.value = `Loading ${year} matchups...`
            const matchups = await yahooService.getMatchups(yearLeagueKey)
            if (matchups) data[year].matchups = matchups
          } catch (e) {
            console.log(`Could not load matchups for ${year}`)
          }
        }
      } catch (e) {
        console.log(`Could not load ${year} season`)
      }
    }
    
    historicalData.value = data
    
    // Build H2H records from matchup data
    loadingMessage.value = 'Building head-to-head records...'
    buildH2HRecords()
    
    loadingMessage.value = 'Done!'
    
  } catch (e) {
    console.error('Error loading history:', e)
    loadingMessage.value = 'Error loading data'
  } finally {
    isLoading.value = false
  }
}

watch(() => leagueStore.activeLeagueId, (id) => {
  if (id && leagueStore.activePlatform === 'yahoo') loadHistoricalData()
}, { immediate: true })

onMounted(() => {
  if (leagueStore.activeLeagueId && leagueStore.activePlatform === 'yahoo') {
    loadHistoricalData()
  }
})
</script>
