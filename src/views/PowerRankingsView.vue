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
        <select v-model="selectedSeason" @change="onSeasonChange" class="select">
          <option v-for="season in leagueStore.historicalSeasons" :key="season.season" :value="season.season">
            {{ season.season }} Season
          </option>
        </select>
        <select v-model="selectedWeek" @change="loadPowerRankings" class="select">
          <option value="">Select Week...</option>
          <option v-for="week in availableWeeks" :key="week" :value="week">
            Through Week {{ week }}
          </option>
        </select>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
        <p class="text-dark-textMuted">Loading power rankings...</p>
      </div>
    </div>

    <template v-else-if="powerRankings.length > 0">
      <!-- Legend Card -->
      <div class="card bg-dark-card/50">
        <div class="card-body py-3">
          <div class="flex items-center gap-6 text-sm">
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <span class="text-[8px] text-gray-900">★</span>
              </div>
              <span class="text-dark-textMuted">My Team</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 rounded-full ring-2 ring-cyan-500 bg-dark-card"></div>
              <span class="text-dark-textMuted">Other Teams</span>
            </div>
            <div class="hidden sm:flex items-center gap-2 text-dark-textMuted">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <span>Click team for details</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Power Rankings Table (Full Width) -->
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
                  class="text-primary hover:text-yellow-500 text-xs font-semibold transition-colors mt-1"
                >
                  Customize Formula →
                </button>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <select v-model="downloadFormat" class="bg-dark-card border border-dark-border rounded px-3 py-2 text-sm text-dark-text">
                <option value="png">Static Image (PNG)</option>
                <option value="gif">Animated GIF</option>
              </select>
              <button @click="downloadRankings" :disabled="isGeneratingDownload" class="btn-primary flex items-center gap-2">
                <svg v-if="!isGeneratingDownload" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isGeneratingDownload ? 'Generating...' : 'Share' }}
              </button>
            </div>
          </div>
        </div>
        <div class="card-body overflow-x-auto scrollbar-thin">
          <table class="w-full">
            <thead class="bg-dark-border/30">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-20">Rank</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-24">Change</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-dark-textMuted uppercase tracking-wider">Team</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-32">Power Score</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-28">Record</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-32">Total Points</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-32">All-Play</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-32">Recent Avg</th>
                <th class="px-4 py-3 text-center text-xs font-semibold text-dark-textMuted uppercase tracking-wider w-32">Proj PPG</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-dark-border/30">
              <tr 
                v-for="(team, idx) in powerRankings" 
                :key="team.roster_id"
                @click="openTeamDetailModal(team, idx)"
                :class="[
                  'transition-colors cursor-pointer',
                  isMyTeam(team.roster_id) 
                    ? 'bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary' 
                    : 'hover:bg-dark-border/20'
                ]"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center">
                    <span :class="[
                      'inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg',
                      isMyTeam(team.roster_id) ? 'bg-primary/20 text-primary' : 'bg-dark-border/50 text-dark-text'
                    ]">
                      {{ idx + 1 }}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center">
                    <span v-if="team.change > 0" class="text-green-400 font-semibold flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded">
                      ↑ {{ team.change }}
                    </span>
                    <span v-else-if="team.change < 0" class="text-red-400 font-semibold flex items-center gap-1 bg-red-500/10 px-2 py-1 rounded">
                      ↓ {{ Math.abs(team.change) }}
                    </span>
                    <span v-else class="text-dark-textMuted">—</span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <div :class="[
                        'w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2',
                        isMyTeam(team.roster_id) ? 'ring-primary' : 'ring-cyan-500'
                      ]">
                        <img
                          :src="team.avatar_url"
                          :alt="team.team_name"
                          class="w-full h-full object-cover"
                          @error="handleImageError"
                        />
                      </div>
                      <!-- Gold star for user's team -->
                      <div v-if="isMyTeam(team.roster_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <span class="text-xs text-gray-900 font-bold">★</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span :class="[
                        'font-semibold',
                        isMyTeam(team.roster_id) ? 'text-primary' : 'text-dark-text'
                      ]">
                        {{ team.team_name }}
                      </span>
                      <svg class="w-4 h-4 text-dark-textMuted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-center">
                  <span :class="[
                    'text-xl font-black',
                    isMyTeam(team.roster_id) ? 'text-primary' : 'text-cyan-400'
                  ]">
                    {{ team.powerScore.toFixed(1) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="text-dark-text font-medium">
                    {{ team.wins }}-{{ team.losses }}{{ team.ties > 0 ? `-${team.ties}` : '' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="text-dark-text font-medium">
                    {{ team.totalPointsFor.toFixed(1) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center whitespace-nowrap">
                  <span class="text-dark-textSecondary">
                    {{ team.allPlayWins }}-{{ team.allPlayLosses }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="text-dark-textSecondary">
                    {{ team.recentAvg.toFixed(1) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center">
                  <span v-if="team.projectedPPG" :class="[
                    'font-semibold',
                    isMyTeam(team.roster_id) ? 'text-primary' : 'text-cyan-400'
                  ]">
                    {{ team.projectedPPG.toFixed(1) }}
                  </span>
                  <span v-else class="text-dark-textMuted text-sm">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Power Score Trend Chart -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Power Score Trends</h2>
          </div>
          <p class="card-subtitle">Track how power scores have evolved throughout the season</p>
        </div>
        <div class="card-body relative">
          <div class="relative">
            <apexchart
              ref="trendChart"
              v-if="chartOptions"
              type="line"
              height="450"
              :options="chartOptions"
              :series="chartSeries"
            />
            <!-- Team avatar overlays at end of lines -->
            <div 
              v-for="(team, idx) in powerRankings" 
              :key="'avatar-' + team.roster_id"
              class="absolute pointer-events-none"
              :style="getAvatarPosition(team, idx)"
            >
              <div class="relative">
                <img 
                  :src="team.avatar_url" 
                  :alt="team.team_name"
                  :class="[
                    'w-7 h-7 rounded-full ring-2 object-cover',
                    isMyTeam(team.roster_id) ? 'ring-primary' : 'ring-cyan-500/70'
                  ]"
                  @error="handleImageError"
                />
                <div v-if="isMyTeam(team.roster_id)" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full flex items-center justify-center">
                  <span class="text-[6px] text-gray-900 font-bold">★</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rankings Insights (moved under chart) -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Biggest Climber -->
        <div :class="[
          'card rounded-xl border-2 transition-all',
          biggestClimber && isMyTeam(biggestClimber.roster_id) 
            ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5' 
            : 'border-dark-border'
        ]">
          <div class="card-header pb-2">
            <div class="text-sm text-dark-textMuted uppercase tracking-wide">📈 Biggest Climber</div>
          </div>
          <div class="card-body pt-2" v-if="biggestClimber">
            <div class="flex items-center gap-3 mb-2">
              <div class="relative">
                <img 
                  :src="biggestClimber.avatar_url" 
                  :alt="biggestClimber.team_name" 
                  :class="[
                    'w-12 h-12 rounded-full ring-2',
                    isMyTeam(biggestClimber.roster_id) ? 'ring-primary' : 'ring-cyan-500'
                  ]"
                  @error="handleImageError" 
                />
                <div v-if="isMyTeam(biggestClimber.roster_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-xs text-gray-900 font-bold">★</span>
                </div>
              </div>
              <div class="flex-1">
                <div :class="[
                  'font-bold',
                  isMyTeam(biggestClimber.roster_id) ? 'text-primary' : 'text-dark-text'
                ]">{{ biggestClimber.team_name }}</div>
                <div class="text-xs text-dark-textMuted">Started #{{ biggestClimber.firstRank }}</div>
              </div>
            </div>
            <div class="text-center mt-3 p-3 bg-green-500/10 rounded-xl">
              <div class="text-2xl font-bold text-green-400">↑{{ biggestClimber.climb }}</div>
              <div class="text-xs text-dark-textMuted mt-1">positions up</div>
            </div>
          </div>
        </div>

        <!-- Biggest Faller -->
        <div :class="[
          'card rounded-xl border-2 transition-all',
          biggestFaller && isMyTeam(biggestFaller.roster_id) 
            ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5' 
            : 'border-dark-border'
        ]">
          <div class="card-header pb-2">
            <div class="text-sm text-dark-textMuted uppercase tracking-wide">📉 Biggest Faller</div>
          </div>
          <div class="card-body pt-2" v-if="biggestFaller">
            <div class="flex items-center gap-3 mb-2">
              <div class="relative">
                <img 
                  :src="biggestFaller.avatar_url" 
                  :alt="biggestFaller.team_name" 
                  :class="[
                    'w-12 h-12 rounded-full ring-2',
                    isMyTeam(biggestFaller.roster_id) ? 'ring-primary' : 'ring-cyan-500'
                  ]"
                  @error="handleImageError" 
                />
                <div v-if="isMyTeam(biggestFaller.roster_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-xs text-gray-900 font-bold">★</span>
                </div>
              </div>
              <div class="flex-1">
                <div :class="[
                  'font-bold',
                  isMyTeam(biggestFaller.roster_id) ? 'text-primary' : 'text-dark-text'
                ]">{{ biggestFaller.team_name }}</div>
                <div class="text-xs text-dark-textMuted">Started #{{ biggestFaller.firstRank }}</div>
              </div>
            </div>
            <div class="text-center mt-3 p-3 bg-red-500/10 rounded-xl">
              <div class="text-2xl font-bold text-red-400">↓{{ biggestFaller.fall }}</div>
              <div class="text-xs text-dark-textMuted mt-1">positions down</div>
            </div>
          </div>
        </div>

        <!-- Most Consistent -->
        <div :class="[
          'card rounded-xl border-2 transition-all',
          mostConsistent && isMyTeam(mostConsistent.roster_id) 
            ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5' 
            : 'border-dark-border'
        ]">
          <div class="card-header pb-2">
            <div class="text-sm text-dark-textMuted uppercase tracking-wide">🎯 Most Consistent</div>
          </div>
          <div class="card-body pt-2" v-if="mostConsistent">
            <div class="flex items-center gap-3 mb-2">
              <div class="relative">
                <img 
                  :src="mostConsistent.avatar_url" 
                  :alt="mostConsistent.team_name" 
                  :class="[
                    'w-12 h-12 rounded-full ring-2',
                    isMyTeam(mostConsistent.roster_id) ? 'ring-primary' : 'ring-cyan-500'
                  ]"
                  @error="handleImageError" 
                />
                <div v-if="isMyTeam(mostConsistent.roster_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-xs text-gray-900 font-bold">★</span>
                </div>
              </div>
              <div class="flex-1">
                <div :class="[
                  'font-bold',
                  isMyTeam(mostConsistent.roster_id) ? 'text-primary' : 'text-dark-text'
                ]">{{ mostConsistent.team_name }}</div>
                <div class="text-xs text-dark-textMuted">Avg Rank #{{ mostConsistent.avgRank }}</div>
              </div>
            </div>
            <div class="text-center mt-3 p-3 bg-cyan-500/10 rounded-xl">
              <div class="text-2xl font-bold text-cyan-400">{{ mostConsistent.variance.toFixed(1) }}</div>
              <div class="text-xs text-dark-textMuted mt-1">rank variance</div>
            </div>
          </div>
        </div>

        <!-- Most Volatile -->
        <div :class="[
          'card rounded-xl border-2 transition-all',
          mostVolatile && isMyTeam(mostVolatile.roster_id) 
            ? 'border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5' 
            : 'border-dark-border'
        ]">
          <div class="card-header pb-2">
            <div class="text-sm text-dark-textMuted uppercase tracking-wide">🎢 Most Volatile</div>
          </div>
          <div class="card-body pt-2" v-if="mostVolatile">
            <div class="flex items-center gap-3 mb-2">
              <div class="relative">
                <img 
                  :src="mostVolatile.avatar_url" 
                  :alt="mostVolatile.team_name" 
                  :class="[
                    'w-12 h-12 rounded-full ring-2',
                    isMyTeam(mostVolatile.roster_id) ? 'ring-primary' : 'ring-cyan-500'
                  ]"
                  @error="handleImageError" 
                />
                <div v-if="isMyTeam(mostVolatile.roster_id)" class="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <span class="text-xs text-gray-900 font-bold">★</span>
                </div>
              </div>
              <div class="flex-1">
                <div :class="[
                  'font-bold',
                  isMyTeam(mostVolatile.roster_id) ? 'text-primary' : 'text-dark-text'
                ]">{{ mostVolatile.team_name }}</div>
                <div class="text-xs text-dark-textMuted">Swings #{{ mostVolatile.minRank }}-{{ mostVolatile.maxRank }}</div>
              </div>
            </div>
            <div class="text-center mt-3 p-3 bg-orange-500/10 rounded-xl">
              <div class="text-2xl font-bold text-orange-400">{{ mostVolatile.variance.toFixed(1) }}</div>
              <div class="text-xs text-dark-textMuted mt-1">rank variance</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Rest of Season Projections by Position -->
      <div v-if="rosProjectionsData.length > 0" class="card">
        <div class="card-header">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2 mb-2">
                <span class="text-2xl">🔮</span>
                <h2 class="card-title">Rest of Season Projections by Position</h2>
              </div>
              <p class="card-subtitle">Total projected starter points for remaining regular season weeks</p>
            </div>
            <!-- Position color legend -->
            <div class="flex items-center gap-4 text-xs">
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 rounded" style="background-color: #f59e0b;"></div>
                <span class="text-dark-textMuted">QB</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 rounded" style="background-color: #10b981;"></div>
                <span class="text-dark-textMuted">RB</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 rounded" style="background-color: #3b82f6;"></div>
                <span class="text-dark-textMuted">WR</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 rounded" style="background-color: #8b5cf6;"></div>
                <span class="text-dark-textMuted">TE</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="w-3 h-3 rounded" style="background-color: #ec4899;"></div>
                <span class="text-dark-textMuted">FLEX</span>
              </div>
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <!-- Custom stacked bar visualization -->
          <div class="space-y-2 p-4">
            <div 
              v-for="(team, idx) in sortedRosTeams" 
              :key="team.roster_id"
              :class="[
                'flex items-center gap-3 p-3 rounded-xl transition-all',
                isMyTeam(team.roster_id) 
                  ? 'bg-primary/10 border border-primary/30' 
                  : 'hover:bg-dark-border/20'
              ]"
            >
              <!-- Rank -->
              <div class="w-8 text-center">
                <span :class="[
                  'font-bold text-lg',
                  isMyTeam(team.roster_id) ? 'text-primary' : 'text-dark-textMuted'
                ]">{{ idx + 1 }}</span>
              </div>
              
              <!-- Team Avatar & Name -->
              <div class="flex items-center gap-2 w-40 flex-shrink-0">
                <div class="relative">
                  <img 
                    :src="team.avatar_url" 
                    :alt="team.team_name"
                    :class="[
                      'w-8 h-8 rounded-full ring-2',
                      isMyTeam(team.roster_id) ? 'ring-primary' : 'ring-cyan-500/50'
                    ]"
                    @error="handleImageError"
                  />
                  <div v-if="isMyTeam(team.roster_id)" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span class="text-[8px] text-gray-900 font-bold">★</span>
                  </div>
                </div>
                <span :class="[
                  'font-medium text-sm truncate',
                  isMyTeam(team.roster_id) ? 'text-primary' : 'text-dark-text'
                ]">{{ team.team_name }}</span>
              </div>
              
              <!-- Stacked Bar Container - width varies based on team total relative to max -->
              <div class="flex-1 flex items-center">
                <div 
                  class="h-8 bg-dark-border/30 rounded-lg overflow-hidden flex"
                  :style="{ width: getTeamBarWidthPercent(team) + '%' }"
                >
                  <div 
                    v-for="pos in ['QB', 'RB', 'WR', 'TE', 'FLEX']"
                    :key="pos"
                    class="h-full flex items-center justify-center text-xs font-bold text-white transition-all"
                    :style="{ 
                      width: getPositionWidthPercent(team, pos) + '%',
                      backgroundColor: getPositionColor(pos)
                    }"
                    :title="`${pos}: ${(team.positionProjections?.[pos] || 0).toFixed(1)}`"
                  >
                    <span v-if="(team.positionProjections?.[pos] || 0) > 15">
                      {{ (team.positionProjections?.[pos] || 0).toFixed(0) }}
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- Total -->
              <div class="w-20 text-right">
                <span :class="[
                  'font-bold text-lg',
                  isMyTeam(team.roster_id) ? 'text-primary' : 'text-cyan-400'
                ]">{{ getTeamRosTotal(team).toFixed(1) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Position Strength Rankings -->
      <div v-if="positionRankings.length > 0" class="card">
        <div class="card-header">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-2xl">📊</span>
            <h2 class="card-title">Position Strength Rankings</h2>
          </div>
          <p class="card-subtitle">Rankings by projected points per position (1 = best)</p>
        </div>
        <div class="card-body overflow-x-auto scrollbar-thin">
          <table class="table">
            <thead>
              <tr>
                <th>Team</th>
                <th class="text-center w-24 cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortPositionRankings('QB')">
                  <div class="flex items-center justify-center gap-1">
                    QB
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span v-if="positionSortColumn === 'QB' && positionSortDirection === 'asc'" class="text-primary">▲</span>
                      <span v-else-if="positionSortColumn !== 'QB'" class="text-dark-textMuted">▲</span>
                      <span v-else class="text-dark-border">▲</span>
                      
                      <span v-if="positionSortColumn === 'QB' && positionSortDirection === 'desc'" class="text-primary">▼</span>
                      <span v-else-if="positionSortColumn !== 'QB'" class="text-dark-textMuted">▼</span>
                      <span v-else class="text-dark-border">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center w-24 cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortPositionRankings('RB')">
                  <div class="flex items-center justify-center gap-1">
                    RB
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span v-if="positionSortColumn === 'RB' && positionSortDirection === 'asc'" class="text-primary">▲</span>
                      <span v-else-if="positionSortColumn !== 'RB'" class="text-dark-textMuted">▲</span>
                      <span v-else class="text-dark-border">▲</span>
                      
                      <span v-if="positionSortColumn === 'RB' && positionSortDirection === 'desc'" class="text-primary">▼</span>
                      <span v-else-if="positionSortColumn !== 'RB'" class="text-dark-textMuted">▼</span>
                      <span v-else class="text-dark-border">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center w-24 cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortPositionRankings('WR')">
                  <div class="flex items-center justify-center gap-1">
                    WR
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span v-if="positionSortColumn === 'WR' && positionSortDirection === 'asc'" class="text-primary">▲</span>
                      <span v-else-if="positionSortColumn !== 'WR'" class="text-dark-textMuted">▲</span>
                      <span v-else class="text-dark-border">▲</span>
                      
                      <span v-if="positionSortColumn === 'WR' && positionSortDirection === 'desc'" class="text-primary">▼</span>
                      <span v-else-if="positionSortColumn !== 'WR'" class="text-dark-textMuted">▼</span>
                      <span v-else class="text-dark-border">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center w-24 cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortPositionRankings('TE')">
                  <div class="flex items-center justify-center gap-1">
                    TE
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span v-if="positionSortColumn === 'TE' && positionSortDirection === 'asc'" class="text-primary">▲</span>
                      <span v-else-if="positionSortColumn !== 'TE'" class="text-dark-textMuted">▲</span>
                      <span v-else class="text-dark-border">▲</span>
                      
                      <span v-if="positionSortColumn === 'TE' && positionSortDirection === 'desc'" class="text-primary">▼</span>
                      <span v-else-if="positionSortColumn !== 'TE'" class="text-dark-textMuted">▼</span>
                      <span v-else class="text-dark-border">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center w-24 cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortPositionRankings('FLEX')">
                  <div class="flex items-center justify-center gap-1">
                    FLEX
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span v-if="positionSortColumn === 'FLEX' && positionSortDirection === 'asc'" class="text-primary">▲</span>
                      <span v-else-if="positionSortColumn !== 'FLEX'" class="text-dark-textMuted">▲</span>
                      <span v-else class="text-dark-border">▲</span>
                      
                      <span v-if="positionSortColumn === 'FLEX' && positionSortDirection === 'desc'" class="text-primary">▼</span>
                      <span v-else-if="positionSortColumn !== 'FLEX'" class="text-dark-textMuted">▼</span>
                      <span v-else class="text-dark-border">▼</span>
                    </span>
                  </div>
                </th>
                <th class="text-center w-32 cursor-pointer hover:bg-dark-border/30 transition-colors" @click="sortPositionRankings('ROS_TOTAL')">
                  <div class="flex items-center justify-center gap-1">
                    ROS Total
                    <span class="inline-flex flex-col" style="font-size: 10px; line-height: 8px;">
                      <span v-if="positionSortColumn === 'ROS_TOTAL' && positionSortDirection === 'asc'" class="text-primary">▲</span>
                      <span v-else-if="positionSortColumn !== 'ROS_TOTAL'" class="text-dark-textMuted">▲</span>
                      <span v-else class="text-dark-border">▲</span>
                      
                      <span v-if="positionSortColumn === 'ROS_TOTAL' && positionSortDirection === 'desc'" class="text-primary">▼</span>
                      <span v-else-if="positionSortColumn !== 'ROS_TOTAL'" class="text-dark-textMuted">▼</span>
                      <span v-else class="text-dark-border">▼</span>
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="team in sortedPositionRankings" 
                :key="team.roster_id"
                :class="[
                  'transition-colors',
                  isMyTeam(team.roster_id) 
                    ? 'bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary' 
                    : 'hover:bg-dark-border/20'
                ]"
              >
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="relative">
                      <div :class="[
                        'w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2',
                        isMyTeam(team.roster_id) ? 'ring-primary' : 'ring-cyan-500'
                      ]">
                        <img
                          :src="team.avatar_url"
                          :alt="team.team_name"
                          class="w-full h-full object-cover"
                          @error="handleImageError"
                        />
                      </div>
                      <!-- Gold star for user's team -->
                      <div v-if="isMyTeam(team.roster_id)" class="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <span class="text-[10px] text-gray-900 font-bold">★</span>
                      </div>
                    </div>
                    <span :class="[
                      'font-semibold',
                      isMyTeam(team.roster_id) ? 'text-primary' : 'text-dark-text'
                    ]">{{ team.team_name }}</span>
                  </div>
                </td>
                <td class="text-center">
                  <span :class="getRankClass(team.rankings.QB)" class="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm">
                    {{ team.rankings.QB }}
                  </span>
                </td>
                <td class="text-center">
                  <span :class="getRankClass(team.rankings.RB)" class="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm">
                    {{ team.rankings.RB }}
                  </span>
                </td>
                <td class="text-center">
                  <span :class="getRankClass(team.rankings.WR)" class="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm">
                    {{ team.rankings.WR }}
                  </span>
                </td>
                <td class="text-center">
                  <span :class="getRankClass(team.rankings.TE)" class="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm">
                    {{ team.rankings.TE }}
                  </span>
                </td>
                <td class="text-center">
                  <span :class="getRankClass(team.rankings.FLEX)" class="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm">
                    {{ team.rankings.FLEX }}
                  </span>
                </td>
                <td class="text-center">
                  <span :class="[
                    'font-semibold text-base',
                    isMyTeam(team.roster_id) ? 'text-primary' : 'text-cyan-400'
                  ]">
                    {{ team.rosTotal.toFixed(1) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <div v-else class="card">
      <div class="card-body text-center py-12">
        <p class="text-dark-textMuted">Select a season and week to view power rankings</p>
      </div>
    </div>
    
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
                :src="selectedTeamDetail?.avatar_url" 
                :alt="selectedTeamDetail?.team_name"
                class="w-12 h-12 rounded-full ring-2 ring-primary"
                @error="handleImageError"
              />
              <div>
                <h3 class="text-xl font-bold text-dark-text">{{ selectedTeamDetail?.team_name }}</h3>
                <p class="text-sm text-dark-textMuted">Power Ranking Details - Week {{ selectedWeek }}</p>
              </div>
            </div>
            <button @click="closeTeamDetailModal" class="p-2 rounded-lg hover:bg-dark-border/50 transition-colors">
              <svg class="w-5 h-5 text-dark-textMuted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Power Score Overview -->
          <div class="p-6 border-b border-dark-border bg-gradient-to-r from-primary/10 to-transparent">
            <div class="flex items-center justify-between mb-4">
              <div>
                <div class="text-sm text-dark-textMuted uppercase tracking-wider">Current Power Rank</div>
                <div class="text-4xl font-black text-primary">#{{ teamDetailRank }}</div>
              </div>
              <div class="text-right">
                <div class="text-sm text-dark-textMuted uppercase tracking-wider">Power Score</div>
                <div class="text-4xl font-black text-cyan-400">{{ selectedTeamDetail?.powerScore?.toFixed(1) }}</div>
              </div>
            </div>
            <div v-if="selectedTeamDetail?.change !== 0" class="flex items-center gap-2">
              <span 
                v-if="selectedTeamDetail?.change > 0" 
                class="text-green-400 font-semibold flex items-center gap-1 bg-green-500/10 px-3 py-1 rounded-full"
              >
                ↑ {{ selectedTeamDetail.change }} from last week
              </span>
              <span 
                v-else-if="selectedTeamDetail?.change < 0" 
                class="text-red-400 font-semibold flex items-center gap-1 bg-red-500/10 px-3 py-1 rounded-full"
              >
                ↓ {{ Math.abs(selectedTeamDetail.change) }} from last week
              </span>
            </div>
          </div>
          
          <!-- Power Rank Trend Chart -->
          <div class="p-6 border-b border-dark-border">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Power Rank Progress</h4>
            <div class="h-48">
              <apexchart 
                v-if="teamDetailTrendChartOptions" 
                type="line" 
                height="100%" 
                :options="teamDetailTrendChartOptions" 
                :series="teamDetailTrendChartSeries" 
              />
            </div>
          </div>
          
          <!-- Metrics Breakdown -->
          <div class="p-6 border-b border-dark-border">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Power Score Components</h4>
            <div class="space-y-4">
              <div v-for="metric in teamDetailMetrics" :key="metric.name" class="space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <div class="flex items-center gap-2">
                    <span class="text-dark-text font-medium">{{ metric.name }}</span>
                    <span class="text-dark-textMuted">({{ metric.weight }})</span>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-dark-textMuted">{{ metric.value }}</span>
                    <span 
                      class="px-2 py-0.5 rounded text-xs font-semibold"
                      :class="getRankClass(metric.rank, powerRankings.length)"
                    >
                      #{{ metric.rank }}
                    </span>
                  </div>
                </div>
                <div class="h-2.5 bg-dark-border rounded-full overflow-hidden">
                  <div 
                    class="h-full rounded-full transition-all duration-500"
                    :style="{ width: `${metric.score}%`, backgroundColor: metric.color }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Quick Stats Grid -->
          <div class="p-6">
            <h4 class="text-sm font-semibold text-dark-textMuted uppercase tracking-wider mb-4">Season Stats</h4>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-lg font-bold text-dark-text">{{ selectedTeamDetail?.wins }}-{{ selectedTeamDetail?.losses }}</div>
                <div class="text-xs text-dark-textMuted">Record</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-lg font-bold text-dark-text">{{ selectedTeamDetail?.totalPointsFor?.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Total Points</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-lg font-bold text-dark-text">{{ selectedTeamDetail?.allPlayWins }}-{{ selectedTeamDetail?.allPlayLosses }}</div>
                <div class="text-xs text-dark-textMuted">All-Play Record</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-lg font-bold text-dark-text">{{ selectedTeamDetail?.avgScore?.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Avg Score</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-lg font-bold text-dark-text">{{ selectedTeamDetail?.recentAvg?.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Recent Avg</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-lg font-bold text-dark-text">{{ selectedTeamDetail?.projectedPPG?.toFixed(1) || '—' }}</div>
                <div class="text-xs text-dark-textMuted">Projected PPG</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-lg font-bold text-dark-text">{{ selectedTeamDetail?.stdDev?.toFixed(1) }}</div>
                <div class="text-xs text-dark-textMuted">Std Dev</div>
              </div>
              <div class="bg-dark-border/20 rounded-xl p-4 text-center">
                <div class="text-lg font-bold text-dark-text">{{ selectedTeamDetail?.weekCount }}</div>
                <div class="text-xs text-dark-textMuted">Weeks Played</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
    
    <!-- Power Rankings Settings Modal -->
    <div v-if="showPowerRankingSettings" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="showPowerRankingSettings = false">
      <div class="bg-dark-elevated rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-dark-border">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <div>
            <h3 class="text-xl font-bold text-dark-text">Power Rankings Settings</h3>
            <p class="text-sm text-dark-textMuted">Customize how power rankings are calculated</p>
          </div>
          <button @click="showPowerRankingSettings = false" class="p-2 hover:bg-dark-border/50 rounded-lg transition-colors">
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
              v-for="preset in powerRankingPresets"
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
              v-for="factor in powerRankingFactors" 
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
            @click="resetToDefault"
            class="px-4 py-2 text-sm text-dark-textMuted hover:text-dark-text transition-colors"
          >
            Reset to Default
          </button>
          <div class="flex items-center gap-3">
            <button @click="showPowerRankingSettings = false" class="px-4 py-2 rounded-lg bg-dark-border hover:bg-dark-border/70 text-dark-text font-medium transition-colors">
              Cancel
            </button>
            <button @click="applySettings" class="px-4 py-2 rounded-lg bg-primary hover:bg-yellow-500 text-dark-bg font-semibold transition-colors">
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useLeagueStore } from '@/stores/league'
import { sleeperService } from '@/services/sleeper'
import type { SleeperRoster, SleeperMatchup } from '@/types/sleeper'
import { calculateAllPlayRecord } from '@/utils/calculations'
import { getOptimalLineupProjection, calculateAverageProjection, getPositionProjections } from '@/utils/projections'
import html2canvas from 'html2canvas'
import { 
  DEFAULT_POWER_FACTORS, 
  POWER_RANKING_PRESETS,
  type PowerRankingFactorConfig,
  type PowerRankingPreset
} from '@/services/powerRankingFactors'
import ApexCharts from 'apexcharts'

const leagueStore = useLeagueStore()

// Check if a roster belongs to the current user
function isMyTeam(rosterId: number): boolean {
  const rosters = leagueStore.historicalRosters.get(selectedSeason.value) || []
  const roster = rosters.find(r => r.roster_id === rosterId)
  if (!roster) return false
  return roster.owner_id === leagueStore.currentUserId
}

// State
const selectedSeason = ref('')
const selectedWeek = ref('')
const isLoading = ref(false)
const powerRankings = ref<any[]>([])
const historicalPowerRanks = ref<Map<number, number[]>>(new Map())
const rosProjectionsData = ref<any[]>([])
const rosChartOptions = ref<any>(null)
const rosChartSeries = ref<any[]>([])
const positionRankings = ref<any[]>([])
const positionSortColumn = ref<string>('ROS_TOTAL')
const positionSortDirection = ref<'asc' | 'desc'>('desc')
const downloadFormat = ref<'png' | 'gif'>('png')
const isGeneratingDownload = ref(false)

// Power Rankings Settings State
const showPowerRankingSettings = ref(false)
const powerRankingFactors = ref<PowerRankingFactorConfig[]>(JSON.parse(JSON.stringify(DEFAULT_POWER_FACTORS)))
const powerRankingPresets = POWER_RANKING_PRESETS
const currentPresetId = ref('balanced')

const totalWeight = computed(() => {
  return powerRankingFactors.value.filter(f => f.enabled).reduce((sum, f) => sum + f.weight, 0)
})

const currentFormulaDisplay = computed(() => {
  const enabledFactors = powerRankingFactors.value.filter(f => f.enabled && f.weight > 0)
  if (enabledFactors.length === 0) return 'No factors enabled'
  
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  return 'Formula: ' + enabledFactors.map(f => {
    const normalizedWeight = Math.round((f.weight / totalWeight) * 100)
    const shortName = f.name.replace('Win-Loss ', '').replace(' Scored', '').replace('Total ', '').replace(' (Last 3 Weeks)', '').replace('Projected ROS ', '')
    return `${shortName} (${normalizedWeight}%)`
  }).join(' + ')
})

function applyPreset(preset: PowerRankingPreset) {
  currentPresetId.value = preset.id
  powerRankingFactors.value.forEach(factor => {
    const presetFactor = preset.factors[factor.id]
    if (presetFactor) {
      factor.enabled = presetFactor.enabled
      factor.weight = presetFactor.weight
    } else {
      factor.enabled = false
      factor.weight = 0
    }
  })
}

function onFactorChange() {
  // Mark as custom if doesn't match any preset
  currentPresetId.value = ''
}

function resetToDefault() {
  powerRankingFactors.value = JSON.parse(JSON.stringify(DEFAULT_POWER_FACTORS))
  currentPresetId.value = 'balanced'
}

function applySettings() {
  showPowerRankingSettings.value = false
  loadPowerRankings() // Recalculate with new settings
}

// Team Detail Modal State
const showTeamDetailModal = ref(false)
const selectedTeamDetail = ref<any>(null)
const teamDetailRank = ref(0)
const teamDetailTrendChartOptions = ref<any>(null)
const teamDetailTrendChartSeries = ref<any[]>([])
const teamDetailMetrics = ref<{
  name: string
  weight: string
  value: string
  score: number
  rank: number
  color: string
}[]>([])

function openTeamDetailModal(team: any, idx: number) {
  selectedTeamDetail.value = team
  teamDetailRank.value = idx + 1
  
  // Calculate metrics breakdown using custom factors
  const totalTeams = powerRankings.value.length
  const maxPointsFor = Math.max(...powerRankings.value.map(t => t.totalPointsFor))
  const maxRecentAvg = Math.max(...powerRankings.value.map(t => t.recentAvg))
  const maxStdDev = Math.max(...powerRankings.value.map(t => t.stdDev))
  const maxProjected = Math.max(...powerRankings.value.map(t => t.projectedPPG || 0))
  const maxPointsAgainst = Math.max(...powerRankings.value.map(t => t.pointsAgainst || 0))
  const minPointsAgainst = Math.min(...powerRankings.value.map(t => t.pointsAgainst || 0))
  
  // Get enabled factors and their normalized weights
  const enabledFactors = powerRankingFactors.value.filter(f => f.enabled && f.weight > 0)
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  // Calculate individual scores and ranks for each enabled metric
  const sortedByRecord = [...powerRankings.value].sort((a, b) => {
    const aWinPct = (a.wins + a.losses + a.ties) > 0 ? (a.wins + a.ties * 0.5) / (a.wins + a.losses + a.ties) : 0
    const bWinPct = (b.wins + b.losses + b.ties) > 0 ? (b.wins + b.ties * 0.5) / (b.wins + b.losses + b.ties) : 0
    return bWinPct - aWinPct
  })
  const sortedByPoints = [...powerRankings.value].sort((a, b) => b.totalPointsFor - a.totalPointsFor)
  const sortedByAllPlay = [...powerRankings.value].sort((a, b) => b.allPlayWins - a.allPlayWins)
  const sortedByRecent = [...powerRankings.value].sort((a, b) => b.recentAvg - a.recentAvg)
  const sortedByProjected = [...powerRankings.value].sort((a, b) => (b.projectedPPG || 0) - (a.projectedPPG || 0))
  const sortedByConsistency = [...powerRankings.value].sort((a, b) => a.stdDev - b.stdDev) // Lower is better
  const sortedByPointsAgainst = [...powerRankings.value].sort((a, b) => (a.pointsAgainst || 0) - (b.pointsAgainst || 0)) // Lower is better
  
  // Build metrics array based on enabled factors
  teamDetailMetrics.value = enabledFactors.map(factor => {
    const normalizedWeight = Math.round((factor.weight / totalWeight) * 100)
    let value = ''
    let score = 0
    let rank = totalTeams
    
    const totalGames = team.wins + team.losses + team.ties
    const winPct = totalGames > 0 ? (team.wins + team.ties * 0.5) / totalGames : 0
    const allPlayTotal = team.allPlayWins + team.allPlayLosses
    const allPlayPct = allPlayTotal > 0 ? team.allPlayWins / allPlayTotal : 0
    
    switch (factor.id) {
      case 'record':
        value = `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''} (${(winPct * 100).toFixed(0)}%)`
        score = winPct * 100
        rank = sortedByRecord.findIndex(t => t.roster_id === team.roster_id) + 1
        break
      case 'pointsFor':
        value = team.totalPointsFor.toFixed(1)
        score = maxPointsFor > 0 ? (team.totalPointsFor / maxPointsFor) * 100 : 0
        rank = sortedByPoints.findIndex(t => t.roster_id === team.roster_id) + 1
        break
      case 'allPlay':
        value = `${team.allPlayWins}-${team.allPlayLosses} (${(allPlayPct * 100).toFixed(0)}%)`
        score = allPlayPct * 100
        rank = sortedByAllPlay.findIndex(t => t.roster_id === team.roster_id) + 1
        break
      case 'recentForm':
        value = `${team.recentAvg.toFixed(1)} PPG`
        score = maxRecentAvg > 0 ? (team.recentAvg / maxRecentAvg) * 100 : 0
        rank = sortedByRecent.findIndex(t => t.roster_id === team.roster_id) + 1
        break
      case 'projectedStrength':
        value = team.projectedPPG ? `${team.projectedPPG.toFixed(1)} PPG` : 'N/A'
        score = maxProjected > 0 && team.projectedPPG ? (team.projectedPPG / maxProjected) * 100 : 0
        rank = team.projectedPPG ? sortedByProjected.findIndex(t => t.roster_id === team.roster_id) + 1 : totalTeams
        break
      case 'consistency':
        value = `${team.stdDev.toFixed(1)} std dev`
        score = maxStdDev > 0 ? ((maxStdDev - team.stdDev) / maxStdDev) * 100 : 50
        rank = sortedByConsistency.findIndex(t => t.roster_id === team.roster_id) + 1
        break
      case 'pointsAgainst':
        value = team.pointsAgainst?.toFixed(1) || 'N/A'
        const range = maxPointsAgainst - minPointsAgainst
        score = range > 0 && team.pointsAgainst !== undefined ? ((maxPointsAgainst - team.pointsAgainst) / range) * 100 : 50
        rank = sortedByPointsAgainst.findIndex(t => t.roster_id === team.roster_id) + 1
        break
      case 'strengthOfSchedule':
        value = 'N/A'
        score = 50
        rank = Math.ceil(totalTeams / 2)
        break
    }
    
    return {
      name: factor.name,
      weight: `${normalizedWeight}%`,
      value,
      score,
      rank,
      color: factor.color
    }
  })
  
  // Build trend chart for this team
  const teamHistory = historicalPowerRanks.value.get(team.roster_id) || []
  const weeks = historicalWeeks.value
  
  teamDetailTrendChartSeries.value = [{
    name: 'Power Rank',
    data: teamHistory
  }]
  
  teamDetailTrendChartOptions.value = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#f5c451'],
    markers: { size: 4, strokeWidth: 0 },
    xaxis: {
      categories: weeks.map(w => `Wk ${w}`),
      labels: { style: { colors: '#8b8ea1' } }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: totalTeams,
      labels: { 
        style: { colors: '#8b8ea1' },
        formatter: (v: number) => Math.round(v).toString()
      }
    },
    grid: { borderColor: '#3a3d52', strokeDashArray: 4 },
    tooltip: { 
      theme: 'dark',
      y: { formatter: (v: number) => `#${v}` }
    }
  }
  
  showTeamDetailModal.value = true
}

function closeTeamDetailModal() {
  showTeamDetailModal.value = false
  selectedTeamDetail.value = null
}

function getRankClass(rank: number, total: number): string {
  const percentile = rank / total
  if (percentile <= 0.25) return 'bg-green-500/20 text-green-400'
  if (percentile <= 0.5) return 'bg-blue-500/20 text-blue-400'
  if (percentile <= 0.75) return 'bg-yellow-500/20 text-yellow-400'
  return 'bg-red-500/20 text-red-400'
}

// Historical rankings computed properties
const historicalWeeks = computed(() => {
  if (!selectedWeek.value || !selectedSeason.value) return []
  const weeks = []
  const endWeek = parseInt(selectedWeek.value)
  for (let i = 3; i <= endWeek; i++) {
    weeks.push(i)
  }
  return weeks
})

const biggestClimber = computed(() => {
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let maxClimb = 0
  let climber = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.roster_id) || []
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
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let maxFall = 0
  let faller = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.roster_id) || []
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
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let minVariance = Infinity
  let consistent = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.roster_id) || []
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
  if (powerRankings.value.length === 0 || historicalWeeks.value.length < 2) return null
  
  let maxVariance = 0
  let volatile = null
  
  powerRankings.value.forEach(team => {
    const ranks = historicalPowerRanks.value.get(team.roster_id) || []
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

interface PowerRankingData {
  roster_id: number
  team_name: string
  avatar_url: string
  powerScore: number
  avgScore: number
  wins: number
  losses: number
  ties: number
  totalPointsFor: number
  allPlayWins: number
  allPlayLosses: number
  recentAvg: number
  stdDev: number
  weekCount: number
  change: number
  prevRank: number
  projectedPPG?: number
  positionProjections?: Record<string, number>
}

// Computed
const availableWeeks = computed(() => {
  if (!selectedSeason.value) return []
  
  const matchups = leagueStore.historicalMatchups.get(selectedSeason.value)
  if (!matchups) return []
  
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const playoffStart = seasonInfo?.settings?.playoff_week_start || 15
  
  return Array.from(matchups.keys())
    .filter(w => w < playoffStart && w >= 3) // Start from week 3 (need 3 weeks of data)
    .sort((a, b) => a - b)
})

// Chart configuration
const chartOptions = computed(() => {
  if (powerRankings.value.length === 0) return null

  return {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    theme: {
      mode: 'dark'
    },
    colors: powerRankings.value.map((team) => isMyTeam(team.roster_id) ? '#F5C451' : getTeamColor(powerRankings.value.indexOf(team))),
    stroke: {
      width: powerRankings.value.map((team) => isMyTeam(team.roster_id) ? 4 : 2),
      curve: 'smooth'
    },
    markers: {
      size: 0,
      hover: {
        size: 6
      }
    },
    xaxis: {
      categories: getWeekLabels(),
      labels: {
        style: {
          colors: '#9ca3af'
        }
      },
      title: {
        text: 'Week',
        style: {
          color: '#9ca3af'
        }
      }
    },
    yaxis: {
      reversed: true,
      min: 1,
      max: powerRankings.value.length,
      labels: {
        style: {
          colors: '#9ca3af'
        },
        formatter: (value: number) => `#${Math.round(value)}`
      },
      title: {
        text: 'Power Rank',
        style: {
          color: '#9ca3af'
        }
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      labels: {
        colors: '#9ca3af'
      }
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false
    },
    grid: {
      borderColor: '#374151',
      padding: {
        right: 50 // Add padding for avatars
      }
    }
  }
})

const chartSeries = computed(() => {
  if (powerRankings.value.length === 0) return []

  return powerRankings.value.map(team => {
    const ranks = historicalPowerRanks.value.get(team.roster_id) || []
    return {
      name: team.team_name,
      data: ranks
    }
  })
})

// Sorted teams for ROS projections visualization
const sortedRosTeams = computed(() => {
  const teamsWithProjections = powerRankings.value.filter(t => t.positionProjections)
  return [...teamsWithProjections].sort((a, b) => {
    const totalA = getTeamRosTotal(a)
    const totalB = getTeamRosTotal(b)
    return totalB - totalA
  })
})

// Get total ROS projection for a team
function getTeamRosTotal(team: any): number {
  if (!team.positionProjections) return 0
  return Object.values(team.positionProjections).reduce((sum: number, v) => sum + (v as number), 0)
}

// Get width percentage for a position bar segment
function getPositionWidthPercent(team: any, position: string): number {
  if (!team.positionProjections) return 0
  const total = getTeamRosTotal(team)
  if (total === 0) return 0
  const posValue = team.positionProjections[position] || 0
  return (posValue / total) * 100
}

// Get color for position in ROS chart
function getPositionColor(position: string): string {
  const colors: Record<string, string> = {
    'QB': '#f59e0b',   // amber-500
    'RB': '#10b981',   // emerald-500
    'WR': '#3b82f6',   // blue-500
    'TE': '#8b5cf6',   // violet-500
    'FLEX': '#ec4899'  // pink-500
  }
  return colors[position] || '#6b7280'
}

// Calculate avatar position for chart overlay
function getAvatarPosition(team: any, teamIndex: number): Record<string, string> {
  const ranks = historicalPowerRanks.value.get(team.roster_id) || []
  const lastRank = ranks[ranks.length - 1]
  if (!lastRank) return { display: 'none' }
  
  const totalTeams = powerRankings.value.length
  const chartHeight = 450 // Same as chart height
  const chartPadding = { top: 30, bottom: 70 } // Approximate ApexChart padding
  const usableHeight = chartHeight - chartPadding.top - chartPadding.bottom
  
  // Y position: rank 1 is at top, rank N is at bottom (reversed axis)
  const yPercent = (lastRank - 1) / (totalTeams - 1)
  const yPos = chartPadding.top + (yPercent * usableHeight) - 14 // -14 to center the 28px avatar
  
  return {
    right: '15px',
    top: `${yPos}px`
  }
}

// Get max ROS total across all teams for scaling bar widths
const maxRosTotal = computed(() => {
  if (sortedRosTeams.value.length === 0) return 0
  return Math.max(...sortedRosTeams.value.map(t => getTeamRosTotal(t)))
})

// Get bar width as percentage of max team total
function getTeamBarWidthPercent(team: any): number {
  const max = maxRosTotal.value
  if (max === 0) return 100
  const teamTotal = getTeamRosTotal(team)
  // Minimum 40% width so even lowest teams are visible
  return Math.max(40, (teamTotal / max) * 100)
}

const sortedPositionRankings = computed(() => {
  if (positionRankings.value.length === 0) return []
  
  const sorted = [...positionRankings.value]
  
  sorted.sort((a, b) => {
    let valA, valB
    
    if (positionSortColumn.value === 'ROS_TOTAL') {
      valA = a.rosTotal
      valB = b.rosTotal
    } else {
      valA = a.rankings[positionSortColumn.value]
      valB = b.rankings[positionSortColumn.value]
    }
    
    if (positionSortDirection.value === 'asc') {
      return valA - valB
    } else {
      return valB - valA
    }
  })
  
  return sorted
})

// Methods
function handleImageError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = 'https://sleepercdn.com/avatars/thumbs/default'
}

function getWeekLabels(): string[] {
  const startWeek = 3
  const endWeek = parseInt(selectedWeek.value)
  const weeks = []
  for (let i = startWeek; i <= endWeek; i++) {
    weeks.push(`Week ${i}`)
  }
  return weeks
}

function getTeamColor(idx: number): string {
  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#f43f5e'
  ]
  return colors[idx % colors.length]
}

async function calculatePowerScoreForWeek(
  rosters: SleeperRoster[],
  users: any[],
  matchupsByWeek: Map<number, SleeperMatchup[]>,
  throughWeek: number,
  playoffStart: number,
  league: any,
  season: string
): Promise<PowerRankingData[]> {
  const rankings: PowerRankingData[] = []

  rosters.forEach(roster => {
    const user = users.find(u => u.user_id === roster.owner_id)
    
    // 1. Calculate actual W-L record through this week
    let wins = 0
    let losses = 0
    let ties = 0
    
    for (let week = 1; week <= throughWeek; week++) {
      if (week >= playoffStart) continue
      const matchups = matchupsByWeek.get(week) || []
      const myMatchup = matchups.find(m => m.roster_id === roster.roster_id)
      
      if (myMatchup && myMatchup.matchup_id) {
        const opponent = matchups.find(
          m => m.matchup_id === myMatchup.matchup_id && m.roster_id !== roster.roster_id
        )
        
        if (opponent) {
          if ((myMatchup.points || 0) > (opponent.points || 0)) wins++
          else if ((myMatchup.points || 0) < (opponent.points || 0)) losses++
          else ties++
        }
      }
    }
    
    // 2. Calculate total points for (offensive power)
    let totalPointsFor = 0
    let weekCount = 0
    const weeklyScores: number[] = []
    
    for (let week = 1; week <= throughWeek; week++) {
      if (week >= playoffStart) continue
      const matchups = matchupsByWeek.get(week) || []
      const myMatchup = matchups.find(m => m.roster_id === roster.roster_id)
      if (myMatchup && myMatchup.points) {
        totalPointsFor += myMatchup.points
        weeklyScores.push(myMatchup.points)
        weekCount++
      }
    }
    
    // 3. Calculate all-play record (true strength)
    let allPlayWins = 0
    let allPlayLosses = 0
    
    for (let week = 1; week <= throughWeek; week++) {
      if (week >= playoffStart) continue
      const matchups = matchupsByWeek.get(week) || []
      const myMatchup = matchups.find(m => m.roster_id === roster.roster_id)
      
      if (myMatchup) {
        const myPoints = myMatchup.points || 0
        matchups.forEach(opponent => {
          if (opponent.roster_id !== roster.roster_id) {
            const oppPoints = opponent.points || 0
            if (myPoints > oppPoints) allPlayWins++
            else if (myPoints < oppPoints) allPlayLosses++
          }
        })
      }
    }
    
    // 4. Calculate recent form (last 3 weeks weighted)
    const recentWeeks = []
    for (let week = Math.max(1, throughWeek - 2); week <= throughWeek; week++) {
      if (week < playoffStart) recentWeeks.push(week)
    }
    
    let recentScore = 0
    let recentWeights = [3, 2, 1] // Most recent gets 3x weight
    
    let recentTotal = 0
    let recentCount = 0
    
    recentWeeks.forEach((week) => {
      const matchups = matchupsByWeek.get(week) || []
      const myMatchup = matchups.find(m => m.roster_id === roster.roster_id)
      if (myMatchup && myMatchup.points) {
        recentTotal += myMatchup.points || 0
        recentCount++
      }
    })
    
    const recentAvg = recentCount > 0 ? recentTotal / recentCount : 0
    
    // 5. Calculate consistency (standard deviation - lower is better)
    let stdDev = 0
    if (weeklyScores.length > 1) {
      const mean = totalPointsFor / weekCount
      const squaredDiffs = weeklyScores.map(score => Math.pow(score - mean, 2))
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / weeklyScores.length
      stdDev = Math.sqrt(variance)
    }
    
    rankings.push({
      roster_id: roster.roster_id,
      team_name: sleeperService.getTeamName(roster, user),
      avatar_url: sleeperService.getAvatarUrl(roster, user, league),
      powerScore: 0,
      avgScore: weekCount > 0 ? totalPointsFor / weekCount : 0,
      wins,
      losses,
      ties,
      totalPointsFor,
      allPlayWins,
      allPlayLosses,
      recentAvg,
      stdDev,
      weekCount,
      change: 0,
      prevRank: 0
    })
  })
  
  // Fetch projections for remaining regular season weeks (always through Week 18)
  const remainingWeeks: number[] = []
  const endOfRegularSeason = 18 // NFL regular season always ends Week 18
  for (let week = throughWeek + 1; week <= endOfRegularSeason; week++) {
    remainingWeeks.push(week)
  }

  let weekProjections = new Map<number, Map<string, any>>()
  let players: Record<string, any> = {}
  let hasProjections = false

  if (remainingWeeks.length > 0) {
    try {
      // Get all unique player IDs from all rosters
      const allPlayerIds = Array.from(
        new Set(
          rosters.flatMap(r => r.players || []).filter(Boolean)
        )
      )

      // Fetch player data and projections
      players = await sleeperService.getPlayers()
      weekProjections = await sleeperService.getMultiWeekProjections(
        season,
        remainingWeeks,
        allPlayerIds
      )
      hasProjections = weekProjections.size > 0
    } catch (error) {
      console.error('Error fetching projections:', error)
    }
  }

  // Calculate projections for each team
  console.log('hasProjections:', hasProjections, 'weekProjections size:', weekProjections.size)
  
  if (hasProjections) {
    console.log('Calculating projections for', rankings.length, 'teams')
    let teamsWithProjections = 0
    
    rankings.forEach(team => {
      const roster = rosters.find(r => r.roster_id === team.roster_id)
      if (roster && roster.players && roster.players.length > 0) {
        try {
          // Calculate average projected PPG
          const avgProjected = calculateAverageProjection(
            roster.players,
            weekProjections,
            players,
            league.roster_positions || [],
            'pts_ppr'
          )
          
          team.projectedPPG = avgProjected

          // Get position-specific projections
          const positionProj = getPositionProjections(
            roster.players,
            weekProjections,
            players,
            league.roster_positions || [],
            'pts_ppr'
          )
          team.positionProjections = positionProj
          
          if (positionProj) {
            teamsWithProjections++
            if (teamsWithProjections === 1) {
              console.log('Sample position projections:', positionProj)
            }
          }
        } catch (error) {
          console.error('Error calculating projections for team:', team.team_name, error)
        }
      }
    })
    
    console.log('Teams with position projections:', teamsWithProjections)
  }
  
  // Calculate normalized scores for each component
  const maxWins = Math.max(...rankings.map(r => r.wins))
  const maxPointsFor = Math.max(...rankings.map(r => r.totalPointsFor))
  const maxAllPlayWins = Math.max(...rankings.map(r => r.allPlayWins))
  const maxRecentAvg = Math.max(...rankings.map(r => r.recentAvg))
  const maxStdDev = Math.max(...rankings.map(r => r.stdDev))
  const maxProjected = Math.max(...rankings.map(r => r.projectedPPG || 0))
  const maxPointsAgainst = Math.max(...rankings.map(r => r.pointsAgainst || 0))
  const minPointsAgainst = Math.min(...rankings.map(r => r.pointsAgainst || 0))
  
  // Get enabled factors and normalize weights
  const enabledFactors = powerRankingFactors.value.filter(f => f.enabled && f.weight > 0)
  const totalWeight = enabledFactors.reduce((sum, f) => sum + f.weight, 0)
  
  rankings.forEach(team => {
    let powerScore = 0
    
    enabledFactors.forEach(factor => {
      const normalizedWeight = factor.weight / totalWeight
      let componentScore = 0
      
      switch (factor.id) {
        case 'record': {
          const totalGames = team.wins + team.losses + team.ties
          const winPct = totalGames > 0 ? (team.wins + team.ties * 0.5) / totalGames : 0
          componentScore = winPct * 100
          break
        }
        case 'pointsFor': {
          componentScore = maxPointsFor > 0 ? (team.totalPointsFor / maxPointsFor) * 100 : 0
          break
        }
        case 'allPlay': {
          const allPlayTotal = team.allPlayWins + team.allPlayLosses
          const allPlayPct = allPlayTotal > 0 ? team.allPlayWins / allPlayTotal : 0
          componentScore = allPlayPct * 100
          break
        }
        case 'recentForm': {
          componentScore = maxRecentAvg > 0 ? (team.recentAvg / maxRecentAvg) * 100 : 0
          break
        }
        case 'projectedStrength': {
          componentScore = maxProjected > 0 && team.projectedPPG 
            ? (team.projectedPPG / maxProjected) * 100 
            : 0
          break
        }
        case 'consistency': {
          // Lower stdDev is better
          componentScore = maxStdDev > 0 ? ((maxStdDev - team.stdDev) / maxStdDev) * 100 : 50
          break
        }
        case 'pointsAgainst': {
          // Lower points against is better (luckier schedule)
          const range = maxPointsAgainst - minPointsAgainst
          if (range > 0 && team.pointsAgainst !== undefined) {
            componentScore = ((maxPointsAgainst - team.pointsAgainst) / range) * 100
          }
          break
        }
        case 'strengthOfSchedule': {
          // Placeholder - would need opponent data
          componentScore = 50
          break
        }
      }
      
      powerScore += componentScore * normalizedWeight
    })
    
    team.powerScore = powerScore
  })
  
  // Sort by power score
  rankings.sort((a, b) => b.powerScore - a.powerScore)
  
  return rankings
}

async function loadPowerRankings() {
  if (!selectedSeason.value || !selectedWeek.value) return
  
  isLoading.value = true
  
  try {
    const season = selectedSeason.value
    const rosters = leagueStore.historicalRosters.get(season) || []
    const users = leagueStore.historicalUsers.get(season) || []
    const matchupsByWeek = leagueStore.historicalMatchups.get(season) || new Map()
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === season)
    
    if (!seasonInfo) return
    
    const playoffStart = seasonInfo.settings?.playoff_week_start || 15
    const throughWeek = parseInt(selectedWeek.value)
    
    // Calculate current week rankings
    const currentRankings = await calculatePowerScoreForWeek(
      rosters,
      users,
      matchupsByWeek,
      throughWeek,
      playoffStart,
      seasonInfo,
      season
    )
    
    // Calculate previous week rankings for change indicator
    if (throughWeek > 3) {
      const previousRankings = await calculatePowerScoreForWeek(
        rosters,
        users,
        matchupsByWeek,
        throughWeek - 1,
        playoffStart,
        seasonInfo,
        season
      )
      
      currentRankings.forEach((team, idx) => {
        const prevIdx = previousRankings.findIndex(t => t.roster_id === team.roster_id)
        team.change = prevIdx - idx
        team.prevRank = prevIdx + 1
      })
    }
    
    // Calculate historical power RANKS (not scores) for chart
    const ranksByTeam = new Map<number, number[]>()
    
    for (let week = 3; week <= throughWeek; week++) {
      const weekRankings = await calculatePowerScoreForWeek(
        rosters,
        users,
        matchupsByWeek,
        week,
        playoffStart,
        seasonInfo,
        season
      )
      
      weekRankings.forEach((team, idx) => {
        if (!ranksByTeam.has(team.roster_id)) {
          ranksByTeam.set(team.roster_id, [])
        }
        ranksByTeam.get(team.roster_id)!.push(idx + 1) // Store rank (1-based), not score
      })
    }
    
    historicalPowerRanks.value = ranksByTeam
    powerRankings.value = currentRankings
    
    // Build ROS charts if projections are available
    buildROSCharts()
    buildPositionRankings()
    
    buildChart()
    buildRankingsOverTimeChart()
  } catch (error) {
    console.error('Failed to calculate power rankings:', error)
  } finally {
    isLoading.value = false
  }
}

function buildRankingsOverTimeChart() {
  const chartElement = document.getElementById('rankings-over-time-chart')
  if (!chartElement || historicalWeeks.value.length === 0) return

  // Prepare data series for each team
  const series = powerRankings.value.map((team, idx) => {
    const ranks = historicalPowerRanks.value.get(team.roster_id) || []
    return {
      name: team.team_name,
      data: ranks.map((rank, weekIdx) => ({
        x: historicalWeeks.value[weekIdx],
        y: rank
      }))
    }
  })

  const options = {
    chart: {
      type: 'line',
      height: 400,
      background: 'transparent',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: false,
          zoomin: false,
          zoomout: false,
          pan: false,
          reset: false
        }
      },
      animations: {
        enabled: true,
        speed: 800
      }
    },
    stroke: {
      width: 3,
      curve: 'smooth'
    },
    markers: {
      size: 4,
      hover: {
        size: 7
      }
    },
    colors: [
      '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', 
      '#ef4444', '#06b6d4', '#84cc16', '#ec4899',
      '#6366f1', '#14b8a6', '#f97316', '#a855f7'
    ],
    xaxis: {
      title: {
        text: 'Week',
        style: {
          color: '#9CA3AF',
          fontSize: '12px',
          fontWeight: 600
        }
      },
      labels: {
        style: {
          colors: '#9CA3AF'
        }
      },
      tickAmount: historicalWeeks.value.length
    },
    yaxis: {
      title: {
        text: 'Power Ranking',
        style: {
          color: '#9CA3AF',
          fontSize: '12px',
          fontWeight: 600
        }
      },
      labels: {
        style: {
          colors: '#9CA3AF'
        },
        formatter: (val: number) => `#${val}`
      },
      reversed: true, // Lower numbers at top
      min: 1,
      max: powerRankings.value.length
    },
    grid: {
      borderColor: '#374151',
      strokeDashArray: 4
    },
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'center',
      labels: {
        colors: '#9CA3AF'
      },
      markers: {
        width: 12,
        height: 12,
        radius: 6
      }
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val: number) => `Rank #${val}`
      }
    }
  }

  const chart = new ApexCharts(chartElement, {
    series,
    ...options
  })

  chart.render()
}

function buildChart() {
  // Existing buildChart logic (if any)
  // This function might already exist elsewhere
}

async function downloadRankingsImage() {
  // We'll use html2canvas to convert the rankings to an image
  const html2canvas = (await import('html2canvas')).default
  
  const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
  const leagueName = seasonInfo?.name || 'League'
  
  // Load UFD logo
  const loadUFDLogo = async (): Promise<string> => {
    try {
      const response = await fetch('/ufd-logo.png')
      if (!response.ok) return ''
      const blob = await response.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => resolve('')
        reader.readAsDataURL(blob)
      })
    } catch (e) {
      console.warn('Failed to load UFD logo:', e)
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
      // Draw background circle
      ctx.fillStyle = '#3a3d52'
      ctx.beginPath()
      ctx.arc(32, 32, 32, 0, Math.PI * 2)
      ctx.fill()
      // Draw initial
      ctx.fillStyle = '#f5c451'
      ctx.font = 'bold 28px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(teamName.charAt(0).toUpperCase(), 32, 34)
    }
    return canvas.toDataURL('image/png')
  }
  
  // Load UFD logo
  const ufdLogoBase64 = await loadUFDLogo()
  
  // Pre-load all team images as data URLs using a CORS proxy
  const imagePromises = powerRankings.value.map(team => {
    return new Promise((resolve) => {
      // Try multiple approaches to load the image
      const tryLoadImage = async () => {
        // Approach 1: Try direct load with CORS
        try {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          const loadPromise = new Promise<string>((imgResolve, imgReject) => {
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas')
                canvas.width = 64
                canvas.height = 64
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.beginPath()
                  ctx.arc(32, 32, 32, 0, Math.PI * 2)
                  ctx.closePath()
                  ctx.clip()
                  ctx.drawImage(img, 0, 0, 64, 64)
                }
                // This will throw if canvas is tainted
                const dataUrl = canvas.toDataURL('image/png')
                imgResolve(dataUrl)
              } catch (e) {
                imgReject(e)
              }
            }
            img.onerror = () => imgReject(new Error('Failed to load'))
            // Add a timeout
            setTimeout(() => imgReject(new Error('Timeout')), 5000)
          })
          
          img.src = team.avatar_url
          const dataUrl = await loadPromise
          return resolve({ roster_id: team.roster_id, dataUrl })
        } catch (e) {
          console.log(`Direct CORS failed for ${team.team_name}, trying proxy...`)
        }
        
        // Approach 2: Try loading via a CORS proxy
        try {
          const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(team.avatar_url)}`
          const img = new Image()
          img.crossOrigin = 'anonymous'
          
          const loadPromise = new Promise<string>((imgResolve, imgReject) => {
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas')
                canvas.width = 64
                canvas.height = 64
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.beginPath()
                  ctx.arc(32, 32, 32, 0, Math.PI * 2)
                  ctx.closePath()
                  ctx.clip()
                  ctx.drawImage(img, 0, 0, 64, 64)
                }
                const dataUrl = canvas.toDataURL('image/png')
                imgResolve(dataUrl)
              } catch (e) {
                imgReject(e)
              }
            }
            img.onerror = () => imgReject(new Error('Proxy failed'))
            setTimeout(() => imgReject(new Error('Timeout')), 5000)
          })
          
          img.src = proxyUrl
          const dataUrl = await loadPromise
          return resolve({ roster_id: team.roster_id, dataUrl })
        } catch (e) {
          console.log(`CORS proxy failed for ${team.team_name}, using placeholder`)
        }
        
        // Approach 3: Use placeholder
        resolve({ roster_id: team.roster_id, dataUrl: createPlaceholder(team.team_name) })
      }
      
      tryLoadImage()
    })
  })
  
  const loadedImages = await Promise.all(imagePromises)
  const imageMap = new Map(loadedImages.map((item: any) => [item.roster_id, item.dataUrl]))
  
  // Create a temporary container for the image
  const container = document.createElement('div')
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    width: 1200px;
    padding: 32px;
    background: linear-gradient(135deg, #1a1d2e 0%, #0d0f18 100%);
    color: #f7f7ff;
    font-family: system-ui, -apple-system, sans-serif;
  `
  
  // Split rankings into two columns (1-5 and 6-10)
  const firstHalf = powerRankings.value.slice(0, 5)
  const secondHalf = powerRankings.value.slice(5, 10)
  
  // Helper to generate a single ranking row
  const generateRankingRow = (team: any, rank: number) => `
    <div style="display: flex; align-items: center; padding: 14px 20px; background: rgba(38, 42, 58, 0.5); border-radius: 12px; margin-bottom: 10px; height: 76px; box-sizing: border-box;">
      <!-- Left section: Rank + Change -->
      <div style="display: flex; align-items: center; justify-content: flex-start; margin-right: 12px; flex-shrink: 0; width: 65px; height: 48px;">
        <span style="font-size: 28px; font-weight: bold; color: #f5c451; display: flex; align-items: center; height: 48px;">${rank}</span>
        ${team.change !== 0 ? `
          <span style="font-size: 13px; font-weight: 600; color: ${team.change > 0 ? '#10b981' : '#ef4444'}; margin-left: 6px; display: flex; align-items: center; height: 48px;">
            ${team.change > 0 ? '↑' : '↓'}${Math.abs(team.change)}
          </span>
        ` : ''}
      </div>
      
      <!-- Team Logo -->
      <img src="${imageMap.get(team.roster_id) || ''}" style="width: 52px; height: 52px; border-radius: 50%; margin-right: 14px; flex-shrink: 0; border: 2px solid #3a3d52; background: #262a3a; object-fit: cover;" />
      
      <!-- Team Info -->
      <div style="flex: 1; min-width: 0; max-width: 220px;">
        <div style="font-size: 16px; font-weight: 600; color: #f7f7ff; margin-bottom: 4px; white-space: nowrap; overflow: visible;">${team.team_name}</div>
        <div style="font-size: 13px; color: #b0b3c2;">${team.wins}-${team.losses} • ${team.totalPointsFor.toFixed(0)} pts</div>
      </div>
      
      <!-- Power Score -->
      <div style="text-align: right; margin-left: auto; padding-left: 12px;">
        <div style="font-size: 26px; font-weight: bold; color: #f5c451; line-height: 1;">${team.powerScore.toFixed(1)}</div>
        <div style="font-size: 10px; color: #7b7f92; text-transform: uppercase; margin-top: 2px;">Power</div>
      </div>
    </div>
  `
  
  container.innerHTML = `
    <div style="background: linear-gradient(135deg, rgba(19, 22, 32, 0.98), rgba(10, 12, 20, 0.98)); border: 1px solid #2a2f42; border-radius: 16px; padding: 32px; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);">
      <!-- Header with Logo and Title -->
      <div style="display: flex; justify-content: center; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 20px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 70px; height: 70px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 32px; font-weight: 800; color: #f7f7ff;">⚡ Power Rankings</div>
            <div style="font-size: 16px; color: #9ca3af;">${leagueName} &bull; Week ${selectedWeek.value}</div>
          </div>
        </div>
      </div>
      
      <!-- Divider -->
      <div style="height: 1px; background: linear-gradient(to right, rgba(245, 196, 81, 0.5), rgba(245, 196, 81, 0.1)); margin-bottom: 24px;"></div>
      
      <!-- POWER RANKINGS (Two Columns) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px;">
        <!-- Left Column (1-5) -->
        <div>
          ${firstHalf.map((team, idx) => generateRankingRow(team, idx + 1)).join('')}
        </div>
        
        <!-- Right Column (6-10) -->
        <div>
          ${secondHalf.map((team, idx) => generateRankingRow(team, idx + 6)).join('')}
        </div>
      </div>
      
      <!-- POWER RANKINGS TREND (Line Chart) -->
      <div style="background: rgba(38, 42, 58, 0.5); border-radius: 12px; padding: 24px; margin-bottom: 20px;">
        <h3 style="color: #f5c451; font-size: 18px; margin: 0 0 16px 0; text-align: center;">📈 Power Rankings Trend</h3>
        <div id="trend-chart-container" style="height: 300px; position: relative;"></div>
      </div>
      
      <!-- Formula Display -->
      <div style="text-align: center; font-size: 11px; color: #7b7f92; margin-bottom: 20px;">
        ${currentFormulaDisplay.value}
      </div>
      
      <!-- Footer with Promo -->
      <div style="text-align: center; padding-top: 16px; border-top: 1px solid rgba(58, 61, 82, 0.5);">
        <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
          ${ufdLogoBase64 ? `<img src="${ufdLogoBase64}" style="width: 48px; height: 48px; object-fit: contain;" />` : ''}
          <div>
            <div style="font-size: 14px; color: #9ca3af;">
              See a complete breakdown of every team in your league at
            </div>
            <div style="font-size: 18px; font-weight: bold; color: #facc15;">
              ultimatefantasydashboard.com/power-rankings
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(container)
  
  // Create Power Rankings Trend chart using ApexCharts
  const trendChartContainer = container.querySelector('#trend-chart-container')
  if (trendChartContainer && chartSeries.value.length > 0) {
    const trendChart = new ApexCharts(trendChartContainer, {
      chart: {
        type: 'line',
        height: 300,
        background: 'transparent',
        toolbar: { show: false },
        animations: { enabled: false },
        parentHeightOffset: 0
      },
      series: chartSeries.value,
      colors: powerRankings.value.map((_, idx) => getTeamColor(idx)),
      stroke: {
        width: 3,
        curve: 'smooth'
      },
      xaxis: {
        categories: getWeekLabels(),
        labels: {
          style: {
            colors: '#9ca3af',
            fontSize: '11px'
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
            fontSize: '11px'
          },
          formatter: (value: number) => `#${Math.round(value)}`
        }
      },
      legend: {
        show: false // Hide legend, use avatars instead
      },
      grid: {
        borderColor: '#374151',
        strokeDashArray: 4,
        padding: {
          right: 50 // Make room for avatars
        }
      },
      tooltip: {
        enabled: false
      }
    })
    
    trendChart.render()
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Add team avatars at the end of each line
    // Get the chart's plot area dimensions
    const chartWrapper = trendChartContainer as HTMLElement
    const svgElement = chartWrapper.querySelector('.apexcharts-svg')
    if (svgElement) {
      const plotArea = svgElement.querySelector('.apexcharts-plot-series')
      if (plotArea) {
        const chartRect = svgElement.getBoundingClientRect()
        const wrapperRect = chartWrapper.getBoundingClientRect()
        
        // Calculate positions for each team based on their current rank
        powerRankings.value.forEach((team, idx) => {
          const currentRank = idx + 1
          const totalTeams = powerRankings.value.length
          
          // Y position: map rank (1 to N) to chart height
          // Chart area is roughly from 10% to 85% of height
          const topPadding = 25
          const bottomPadding = 45
          const usableHeight = 300 - topPadding - bottomPadding
          const yPos = topPadding + ((currentRank - 1) / (totalTeams - 1)) * usableHeight
          
          // Create avatar element
          const avatarDiv = document.createElement('div')
          avatarDiv.style.cssText = `
            position: absolute;
            right: 8px;
            top: ${yPos - 12}px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            overflow: hidden;
            border: 2px solid ${getTeamColor(idx)};
            background: #262a3a;
          `
          
          const avatarImg = document.createElement('img')
          avatarImg.src = imageMap.get(team.roster_id) as string || ''
          avatarImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover;'
          avatarDiv.appendChild(avatarImg)
          
          chartWrapper.appendChild(avatarDiv)
        })
      }
    }
  }
  
  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#0d0f18',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.download = `${leagueName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-power-rankings-week-${selectedWeek.value}.png`
        link.href = url
        link.click()
        URL.revokeObjectURL(url)
      }
    })
  } finally {
    document.body.removeChild(container)
  }
}

// Router function to choose download type
async function downloadRankings() {
  if (downloadFormat.value === 'gif') {
    await downloadRankingsAnimatedGif()
  } else {
    await downloadRankingsImage()
  }
}

// Generate animated GIF with reveal sequence
async function downloadRankingsAnimatedGif() {
  isGeneratingDownload.value = true
  
  try {
    // Dynamically import gifenc from CDN (works with Vite)
    const { GIFEncoder, quantize, applyPalette } = await import('https://unpkg.com/gifenc@1.0.3/dist/gifenc.esm.js')
    
    const html2canvas = (await import('html2canvas')).default
    
    const seasonInfo = leagueStore.historicalSeasons.find(s => s.season === selectedSeason.value)
    const leagueName = seasonInfo?.name || 'League'
    
    // Team colors matching the website
    const teamColors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
      '#14b8a6', '#f43f5e'
    ]
    
    // Helper to create placeholder avatar
    const createPlaceholder = (teamName: string): string => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#3a3d52'
        ctx.beginPath()
        ctx.arc(32, 32, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#f5c451'
        ctx.font = 'bold 28px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(teamName.charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    // Pre-load all team images
    const imagePromises = powerRankings.value.map(team => {
      return new Promise((resolve) => {
        const tryLoadImage = async () => {
          try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(team.avatar_url)}`
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            const loadPromise = new Promise<string>((imgResolve, imgReject) => {
              img.onload = () => {
                try {
                  const canvas = document.createElement('canvas')
                  canvas.width = 64
                  canvas.height = 64
                  const ctx = canvas.getContext('2d')
                  if (ctx) {
                    ctx.beginPath()
                    ctx.arc(32, 32, 32, 0, Math.PI * 2)
                    ctx.closePath()
                    ctx.clip()
                    ctx.drawImage(img, 0, 0, 64, 64)
                  }
                  imgResolve(canvas.toDataURL('image/png'))
                } catch (e) {
                  imgReject(e)
                }
              }
              img.onerror = () => imgReject(new Error('Failed'))
              setTimeout(() => imgReject(new Error('Timeout')), 3000)
            })
            
            img.src = proxyUrl
            const dataUrl = await loadPromise
            return resolve({ roster_id: team.roster_id, dataUrl })
          } catch (e) {
            resolve({ roster_id: team.roster_id, dataUrl: createPlaceholder(team.team_name) })
          }
        }
        tryLoadImage()
      })
    })
    
    const loadedImages = await Promise.all(imagePromises)
    const imageMap = new Map(loadedImages.map((item: any) => [item.roster_id, item.dataUrl]))
    
    const WIDTH = 600
    const HEIGHT = 550
    
    // Create GIF encoder
    const gif = GIFEncoder()
    
    const totalTeams = Math.min(powerRankings.value.length, 10)
    const weeks = historicalWeeks.value
    
    // Get team trend data
    const getTeamTrendData = (teamIndex: number) => {
      const team = powerRankings.value[teamIndex]
      if (!team) return []
      const ranks = historicalPowerRanks.value.get(team.roster_id) || []
      return ranks
    }
    
    // Helper to generate ranking row HTML - compact for GIF with proper vertical alignment
    const generateRankingRow = (team: any, rank: number, slideOffset: number = 0, opacity: number = 1) => `
      <div style="display: flex; align-items: center; padding: 0 8px; background: rgba(38, 42, 58, 0.85); border-radius: 6px; margin-bottom: 3px; height: 32px; box-sizing: border-box; transform: translateX(${slideOffset}px); opacity: ${opacity};">
        <div style="width: 24px; height: 32px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <span style="font-size: 14px; font-weight: bold; color: #f5c451; line-height: 1;">${rank}</span>
        </div>
        ${team.change !== 0 ? `
          <div style="width: 20px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 9px; font-weight: 600; color: ${team.change > 0 ? '#10b981' : '#ef4444'}; line-height: 1;">
              ${team.change > 0 ? '↑' : '↓'}${Math.abs(team.change)}
            </span>
          </div>
        ` : '<div style="width: 20px;"></div>'}
        <div style="width: 24px; height: 32px; display: flex; align-items: center; justify-content: center; margin: 0 6px; flex-shrink: 0;">
          <img src="${imageMap.get(team.roster_id) || ''}" style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid #3a3d52;" />
        </div>
        <div style="flex: 1; min-width: 0; height: 32px; display: flex; align-items: center;">
          <span style="font-size: 10px; font-weight: 600; color: #f7f7ff; white-space: nowrap; line-height: 1;">${team.team_name.length > 14 ? team.team_name.substring(0, 14) + '...' : team.team_name}</span>
        </div>
        <div style="height: 32px; display: flex; align-items: center; justify-content: flex-end; padding-left: 4px;">
          <span style="font-size: 12px; font-weight: bold; color: #f5c451; line-height: 1;">${team.powerScore.toFixed(1)}</span>
        </div>
      </div>
    `
    
    // Chart dimensions for trend area at bottom
    const chartLeft = 45
    const chartWidth = WIDTH - 90
    const chartTop = 15
    const chartHeight = 130
    
    // Generate SVG trend lines
    const generateTrendSVG = (revealedTeamIndices: Set<number>, currentTeamIndex: number, sweepProgress: number) => {
      let paths = ''
      
      // Y-axis labels
      for (let rank = 1; rank <= totalTeams; rank++) {
        const y = chartTop + ((rank - 1) / (totalTeams - 1)) * chartHeight
        paths += `<text x="${chartLeft - 8}" y="${y + 3}" fill="#6b7280" font-size="9" text-anchor="end" font-family="system-ui, sans-serif">#${rank}</text>`
      }
      
      // X-axis labels (weeks)
      if (weeks.length > 0) {
        weeks.forEach((week, index) => {
          const x = chartLeft + (index / Math.max(weeks.length - 1, 1)) * chartWidth
          paths += `<text x="${x}" y="${chartTop + chartHeight + 14}" fill="#6b7280" font-size="8" text-anchor="middle" font-family="system-ui, sans-serif">W${week}</text>`
        })
      }
      
      // Grid lines
      for (let rank = 1; rank <= totalTeams; rank++) {
        const y = chartTop + ((rank - 1) / (totalTeams - 1)) * chartHeight
        paths += `<line x1="${chartLeft}" y1="${y}" x2="${chartLeft + chartWidth}" y2="${y}" stroke="#2a2f42" stroke-width="1" stroke-dasharray="3,3" />`
      }
      
      // Draw lines for all revealed teams
      revealedTeamIndices.forEach(teamIndex => {
        const team = powerRankings.value[teamIndex]
        const ranks = getTeamTrendData(teamIndex)
        const color = teamColors[teamIndex % teamColors.length]
        const isCurrentTeam = teamIndex === currentTeamIndex
        
        if (ranks.length < 2) return
        
        // Build path points
        const points: {x: number, y: number}[] = []
        ranks.forEach((rank, weekIndex) => {
          if (rank === null || rank === undefined) return
          const x = chartLeft + (weekIndex / Math.max(weeks.length - 1, 1)) * chartWidth
          const y = chartTop + ((rank - 1) / (totalTeams - 1)) * chartHeight
          points.push({ x, y })
        })
        
        if (points.length < 2) return
        
        // For current team being revealed, only show up to sweep progress
        const pointsToDraw = isCurrentTeam 
          ? Math.max(2, Math.ceil(points.length * sweepProgress))
          : points.length
        
        const visiblePoints = points.slice(0, pointsToDraw)
        
        // Create smooth curve path using quadratic bezier
        let pathD = `M ${visiblePoints[0].x} ${visiblePoints[0].y}`
        for (let i = 1; i < visiblePoints.length; i++) {
          const prev = visiblePoints[i - 1]
          const curr = visiblePoints[i]
          const midX = (prev.x + curr.x) / 2
          const midY = (prev.y + curr.y) / 2
          pathD += ` Q ${prev.x} ${prev.y}, ${midX} ${midY}`
        }
        if (visiblePoints.length > 1) {
          const last = visiblePoints[visiblePoints.length - 1]
          pathD += ` L ${last.x} ${last.y}`
        }
        
        paths += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`
        
        // End dot
        const lastPoint = visiblePoints[visiblePoints.length - 1]
        paths += `<circle cx="${lastPoint.x}" cy="${lastPoint.y}" r="4" fill="${color}" />`
      })
      
      return paths
    }
    
    // Create container for frames
    const container = document.createElement('div')
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      width: ${WIDTH}px;
      height: ${HEIGHT}px;
      background: radial-gradient(ellipse at top, #1a1d2e 0%, #0d0f18 100%);
      color: #f7f7ff;
      font-family: system-ui, -apple-system, sans-serif;
      box-sizing: border-box;
      overflow: hidden;
    `
    document.body.appendChild(container)
    
    // Helper to add frame to GIF (delay in centiseconds - 1/100th of second)
    const addFrame = async (delayCentiseconds: number) => {
      const canvas = await html2canvas(container, {
        backgroundColor: '#0d0f18',
        scale: 1,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: WIDTH,
        height: HEIGHT
      })
      
      const ctx = canvas.getContext('2d')!
      const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT)
      const { data } = imageData
      
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      gif.writeFrame(index, WIDTH, HEIGHT, { palette, delay: delayCentiseconds })
    }
    
    // Helper to generate the main layout with rankings and chart
    const generateMainLayout = (
      revealedTeamIndices: Set<number>,
      revealingTeamIndex: number,
      slideOffset: number,
      slideOpacity: number,
      trendTeamIndices: Set<number>,
      currentTrendTeam: number,
      sweepProgress: number
    ) => `
      <div style="padding: 12px; height: 100%; box-sizing: border-box;">
        <div style="background: linear-gradient(145deg, rgba(22, 25, 38, 0.95), rgba(13, 15, 24, 0.98)); border: 1px solid #2a2f42; border-radius: 12px; padding: 10px; height: 100%; box-sizing: border-box;">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 6px;">
            <h1 style="font-size: 16px; font-weight: bold; color: #f5c451; margin: 0;">${leagueName}</h1>
            <p style="font-size: 10px; color: #9ca3af; margin: 2px 0 0 0;">⚡ Power Rankings - Week ${selectedWeek.value}</p>
          </div>
          
          <!-- Rankings Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <div>
              ${[1,2,3,4,5].map(rank => {
                const team = powerRankings.value[rank - 1]
                if (!team) return ''
                const isRevealed = revealedTeamIndices.has(rank - 1)
                const isNew = (rank - 1) === revealingTeamIndex
                
                if (!isRevealed) {
                  return `<div style="height: 32px; margin-bottom: 3px; background: rgba(38, 42, 58, 0.3); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: #3a3d52; font-size: 12px; font-weight: bold;">#${rank}</span>
                  </div>`
                }
                return generateRankingRow(team, rank, isNew ? slideOffset : 0, isNew ? slideOpacity : 1)
              }).join('')}
            </div>
            <div>
              ${[6,7,8,9,10].map(rank => {
                const team = powerRankings.value[rank - 1]
                if (!team || rank > totalTeams) return ''
                const isRevealed = revealedTeamIndices.has(rank - 1)
                const isNew = (rank - 1) === revealingTeamIndex
                
                if (!isRevealed) {
                  return `<div style="height: 32px; margin-bottom: 3px; background: rgba(38, 42, 58, 0.3); border-radius: 6px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: #3a3d52; font-size: 12px; font-weight: bold;">#${rank}</span>
                  </div>`
                }
                return generateRankingRow(team, rank, isNew ? slideOffset : 0, isNew ? slideOpacity : 1)
              }).join('')}
            </div>
          </div>
          
          <!-- Trend Chart Area -->
          <div style="background: rgba(13, 15, 24, 0.6); border-radius: 8px; padding: 8px; height: 175px; position: relative;">
            <div style="font-size: 10px; color: #6b7280; margin-bottom: 2px; text-align: center;">Power Ranking Trend</div>
            <svg width="${WIDTH - 48}" height="155" style="display: block;">
              ${generateTrendSVG(trendTeamIndices, currentTrendTeam, sweepProgress)}
            </svg>
          </div>
        </div>
      </div>
    `
    
    // ============================================================
    // PHASE 1: TITLE CARD (3 seconds, then hard cut)
    // ============================================================
    container.innerHTML = `
      <div style="height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 40px;">
        <div style="font-size: 56px; margin-bottom: 24px;">⚡</div>
        <h1 style="font-size: 38px; font-weight: bold; color: #f5c451; margin: 0 0 16px 0; text-align: center; text-shadow: 0 2px 10px rgba(245, 196, 81, 0.3);">${leagueName}</h1>
        <p style="font-size: 26px; color: #f7f7ff; margin: 0; font-weight: 500;">Power Rankings</p>
        <p style="font-size: 22px; color: #9ca3af; margin-top: 12px;">Week ${selectedWeek.value}</p>
      </div>
    `
    await addFrame(400) // 4 seconds on title card
    
    // ============================================================
    // PHASE 2: Reveal Power Rankings 10 to 1 with trend chart
    // ============================================================
    
    for (let revealCount = 1; revealCount <= totalTeams; revealCount++) {
      // Which team rank we're revealing (10, 9, 8, ... 1)
      const revealingRank = totalTeams - revealCount + 1
      const revealingTeamIndex = revealingRank - 1
      
      // Track all revealed teams
      const revealedTeamIndices = new Set<number>()
      for (let r = totalTeams; r >= revealingRank; r--) {
        revealedTeamIndices.add(r - 1)
      }
      
      // Previously revealed teams (for trend chart - before this team)
      const previouslyRevealedIndices = new Set<number>()
      for (let r = totalTeams; r > revealingRank; r--) {
        previouslyRevealedIndices.add(r - 1)
      }
      
      // STEP A: Slide-in animation for the ranking row (3 frames)
      for (let slideStep = 0; slideStep < 3; slideStep++) {
        const slideProgress = (slideStep + 1) / 3
        const slideOffset = (1 - slideProgress) * 200
        const slideOpacity = slideProgress
        
        container.innerHTML = generateMainLayout(
          revealedTeamIndices,
          revealingTeamIndex,
          slideOffset,
          slideOpacity,
          previouslyRevealedIndices, // Don't show current team's trend yet
          -1,
          1
        )
        await addFrame(12) // Quick slide frames
      }
      
      // STEP B: Brief pause with team revealed but no trend yet (0.5 seconds)
      container.innerHTML = generateMainLayout(
        revealedTeamIndices,
        -1, // No sliding
        0,
        1,
        previouslyRevealedIndices,
        -1,
        1
      )
      await addFrame(50) // 0.5 second pause
      
      // STEP C: Sweep reveal the new team's trend line (15 frames for slower animation)
      for (let sweepStep = 1; sweepStep <= 15; sweepStep++) {
        const sweepProgress = sweepStep / 15
        
        container.innerHTML = generateMainLayout(
          revealedTeamIndices,
          -1,
          0,
          1,
          revealedTeamIndices, // Include current team now
          revealingTeamIndex,
          sweepProgress
        )
        await addFrame(12) // ~0.12 sec per frame, total ~1.8 seconds for sweep
      }
      
      // STEP D: Hold with complete trend line (2 seconds, 10 for final to pause before loop)
      const holdTime = revealCount === totalTeams ? 1000 : 200  // 10 seconds on final frame
      
      container.innerHTML = generateMainLayout(
        revealedTeamIndices,
        -1,
        0,
        1,
        revealedTeamIndices,
        -1,
        1
      )
      
      // Add "Generated by" text on final frame
      if (revealCount === totalTeams) {
        const finalHtml = container.innerHTML.replace(
          '</svg>',
          '</svg><div style="position: absolute; bottom: 4px; right: 8px; font-size: 8px; color: #4a4f62;">Generated by Fantasy Dashboard</div>'
        )
        container.innerHTML = finalHtml
      }
      
      await addFrame(holdTime)
    }
    
    // Clean up container
    document.body.removeChild(container)
    
    // Finish and download
    gif.finish()
    const output = gif.bytes()
    
    const blob = new Blob([output], { type: 'image/gif' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `${leagueName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-power-rankings-week-${selectedWeek.value}.gif`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
    
  } catch (error) {
    console.error('Failed to generate animated GIF:', error)
    alert('Failed to generate animated GIF. Falling back to static image.')
    await downloadRankingsImage()
  } finally {
    isGeneratingDownload.value = false
  }
}
function onSeasonChange() {
  selectedWeek.value = ''
  powerRankings.value = []
  
  // Auto-select most recent week
  if (availableWeeks.value.length > 0) {
    selectedWeek.value = availableWeeks.value[availableWeeks.value.length - 1].toString()
    loadPowerRankings()
  }
}

function getRankBadgeClass(rank: number | undefined): string {
  if (!rank) return 'bg-dark-border text-dark-textMuted'
  const total = powerRankings.value.length
  const topTier = Math.ceil(total * 0.25)
  const bottomTier = Math.floor(total * 0.75)
  
  if (rank <= topTier) return 'bg-green-500/20 text-green-400'
  if (rank >= bottomTier) return 'bg-red-500/20 text-red-400'
  return 'bg-dark-border/50 text-dark-textSecondary'
}

function getTeamRankForWeek(rosterId: number, week: number): number | undefined {
  const ranks = historicalPowerRanks.value.get(rosterId) || []
  const weekIndex = historicalWeeks.value.indexOf(week)
  if (weekIndex === -1 || weekIndex >= ranks.length) return undefined
  return ranks[weekIndex]
}

function buildROSCharts() {
  console.log('buildROSCharts called, powerRankings length:', powerRankings.value.length)
  
  if (powerRankings.value.length === 0) {
    console.log('No power rankings yet')
    return
  }
  
  // Filter teams with projections
  const teamsWithProjections = powerRankings.value.filter(t => t.positionProjections)
  console.log('Teams with projections:', teamsWithProjections.length)
  console.log('Sample team:', teamsWithProjections[0])
  
  if (teamsWithProjections.length === 0) {
    console.log('No teams have position projections')
    rosProjectionsData.value = []
    return
  }

  // Sort by total projected points (descending)
  const sortedTeams = [...teamsWithProjections].sort((a, b) => {
    const totalA = Object.values(a.positionProjections!).reduce((sum: number, val) => sum + (val as number), 0)
    const totalB = Object.values(b.positionProjections!).reduce((sum: number, val) => sum + (val as number), 0)
    return totalB - totalA
  })

  rosProjectionsData.value = sortedTeams

  // Build chart series
  rosChartSeries.value = [
    {
      name: 'QB',
      data: sortedTeams.map(t => t.positionProjections!.QB || 0)
    },
    {
      name: 'RB',
      data: sortedTeams.map(t => t.positionProjections!.RB || 0)
    },
    {
      name: 'WR',
      data: sortedTeams.map(t => t.positionProjections!.WR || 0)
    },
    {
      name: 'TE',
      data: sortedTeams.map(t => t.positionProjections!.TE || 0)
    },
    {
      name: 'FLEX',
      data: sortedTeams.map(t => t.positionProjections!.FLEX || 0)
    }
  ]

  // Build chart options
  rosChartOptions.value = {
    chart: {
      type: 'bar',
      height: 600,
      stacked: true,
      toolbar: { show: false },
      background: 'transparent'
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 0,
        borderRadiusApplication: 'end',
        dataLabels: {
          total: {
            enabled: true,
            offsetX: 15, // Add space between bar and total
            style: {
              fontSize: '13px',
              fontWeight: 600,
              color: '#f5c451'
            },
            formatter: function(val: any, opts: any) {
              const teamIndex = opts.dataPointIndex
              const team = sortedTeams[teamIndex]
              const total = Object.values(team.positionProjections!).reduce((sum: number, v) => sum + (v as number), 0)
              return total.toFixed(1)
            }
          }
        }
      }
    },
    stroke: {
      width: 1,
      colors: ['#1f2937'] // Dark separator lines between sections
    },
    colors: ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
    xaxis: {
      categories: sortedTeams.map(t => t.team_name),
      labels: {
        style: {
          colors: '#9ca3af',
          fontSize: '12px'
        }
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: '#9ca3af',
          fontSize: '12px'
        }
      }
    },
    grid: {
      borderColor: '#374151',
      strokeDashArray: 4
    },
    legend: {
      position: 'top',
      horizontalAlign: 'center',
      labels: {
        colors: '#9ca3af'
      },
      markers: {
        width: 12,
        height: 12
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function(val: number) {
        return val > 0 ? val.toFixed(1) : ''
      },
      style: {
        fontSize: '11px',
        fontWeight: 600,
        colors: ['#fff']
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 1,
        blur: 1,
        opacity: 0.5
      }
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (val: number) => val.toFixed(1) + ' pts'
      }
    }
  }
}

function buildPositionRankings() {
  console.log('buildPositionRankings called')
  
  if (powerRankings.value.length === 0) {
    console.log('No power rankings for position rankings')
    return
  }

  const teamsWithProjections = powerRankings.value.filter(t => t.positionProjections)
  console.log('Teams with projections for position rankings:', teamsWithProjections.length)
  
  if (teamsWithProjections.length === 0) {
    positionRankings.value = []
    return
  }

  const positions = ['QB', 'RB', 'WR', 'TE', 'FLEX']
  
  // For each position, rank teams
  const positionRanks: Record<string, Map<number, number>> = {}
  
  positions.forEach(position => {
    const sorted = [...teamsWithProjections].sort((a, b) => {
      const valA = a.positionProjections![position] || 0
      const valB = b.positionProjections![position] || 0
      return valB - valA
    })
    
    const rankMap = new Map<number, number>()
    sorted.forEach((team, idx) => {
      rankMap.set(team.roster_id, idx + 1)
    })
    
    positionRanks[position] = rankMap
  })

  // Build final rankings data
  positionRankings.value = teamsWithProjections.map(team => {
    // Calculate ROS total
    const rosTotal = Object.values(team.positionProjections!).reduce((sum: number, v) => sum + (v as number), 0)
    
    return {
      roster_id: team.roster_id,
      team_name: team.team_name,
      avatar_url: team.avatar_url,
      rosTotal,
      rankings: {
        QB: positionRanks.QB.get(team.roster_id) || 0,
        RB: positionRanks.RB.get(team.roster_id) || 0,
        WR: positionRanks.WR.get(team.roster_id) || 0,
        TE: positionRanks.TE.get(team.roster_id) || 0,
        FLEX: positionRanks.FLEX.get(team.roster_id) || 0
      }
    }
  })

  // Default sort by ROS Total descending (highest first)
  positionSortColumn.value = 'ROS_TOTAL'
  positionSortDirection.value = 'desc' // desc will show highest first
}

function sortPositionRankings(column: string) {
  if (positionSortColumn.value === column) {
    // Toggle direction if clicking same column
    positionSortDirection.value = positionSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New column, default to asc
    positionSortColumn.value = column
    positionSortDirection.value = 'asc'
  }
}


// Initialize
onMounted(() => {
  if (leagueStore.historicalSeasons.length > 0) {
    selectedSeason.value = leagueStore.historicalSeasons[0].season
    onSeasonChange()
  }
})

// Watch for league changes
watch(
  () => leagueStore.activeLeagueId,
  () => {
    if (leagueStore.historicalSeasons.length > 0) {
      selectedSeason.value = leagueStore.historicalSeasons[0].season
      onSeasonChange()
    }
  }
)
</script>
