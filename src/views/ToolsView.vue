<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-dark-text mb-2">League Tools</h1>
      <p class="text-base text-dark-textMuted">Generate draft orders and custom schedules for your league</p>
    </div>

    <!-- Tool Selector Tabs -->
    <div class="flex gap-2 flex-wrap">
      <button @click="activeTool = 'draft'" :class="activeTool === 'draft' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'" class="px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
        <span class="text-xl">🎱</span> Draft Order Generator
      </button>
      <button @click="activeTool = 'schedule'" :class="activeTool === 'schedule' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'" class="px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
        <span class="text-xl">📅</span> Schedule Generator
      </button>
      <button @click="activeTool = 'sos'" :class="activeTool === 'sos' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-card text-dark-textSecondary hover:bg-dark-border/50'" class="px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
        <span class="text-xl">🛡️</span> Schedule Analysis
      </button>
    </div>

    <!-- ==================== DRAFT ORDER GENERATOR ==================== -->
    <template v-if="activeTool === 'draft'">
      <!-- Import League Card -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🔗</span>
            <h2 class="card-title">Import League (Optional)</h2>
          </div>
        </div>
        <div class="card-body space-y-4">
          <!-- Current League Auto-Import (if logged in) -->
          <div v-if="isLoggedIn && currentPlatform && currentLeagueName" class="p-4 rounded-lg bg-dark-border/20 border border-dark-border">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-xl">{{ currentPlatform === 'yahoo' ? '🟣' : currentPlatform === 'sleeper' ? '💤' : '🔵' }}</span>
                <span class="font-semibold text-dark-text">{{ currentLeagueName }}</span>
                <span class="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">Connected</span>
              </div>
              <button 
                @click="loadCurrentLeagueTeams('draft')" 
                :disabled="isLoadingPlatformTeams" 
                class="px-4 py-2 rounded-lg bg-green-500 text-gray-900 font-semibold hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {{ isLoadingPlatformTeams ? 'Loading...' : 'Import Teams' }}
              </button>
            </div>
            <p v-if="platformTeamsError" class="text-red-400 text-sm">{{ platformTeamsError }}</p>
            
            <!-- Team Selection after loading -->
            <div v-if="draftImportTeams.length > 0" class="mt-4">
              <div class="flex items-center justify-between mb-3">
                <label class="text-sm font-semibold text-dark-text">Select Teams to Include</label>
                <div class="flex gap-2">
                  <button @click="draftImportTeams.forEach(t => t.selected = true)" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">Select All</button>
                  <button @click="draftImportTeams.forEach(t => t.selected = false)" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">Deselect All</button>
                </div>
              </div>
              <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <div v-for="(team, idx) in draftImportTeams" :key="idx" 
                  @click="team.selected = !team.selected"
                  :class="team.selected ? 'border-yellow-400 bg-yellow-400/10' : 'border-dark-border/50 hover:border-dark-border'"
                  class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all">
                  <div class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                    :class="team.selected ? 'bg-yellow-400 border-yellow-400' : 'border-dark-border'">
                    <span v-if="team.selected" class="text-gray-900 text-xs font-bold">✓</span>
                  </div>
                  <img v-if="team.avatar" :src="team.avatar" class="w-8 h-8 rounded-full flex-shrink-0 object-cover" @error="handleImgError" />
                  <div v-else class="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center flex-shrink-0">
                    <span class="text-xs text-dark-textMuted">{{ (team.name || 'T').charAt(0) }}</span>
                  </div>
                  <span class="text-dark-text text-sm truncate">{{ team.name }}</span>
                </div>
              </div>
              <div class="mt-4 flex items-center justify-between">
                <span class="text-sm text-dark-textMuted">{{ draftImportTeams.filter(t => t.selected).length }} of {{ draftImportTeams.length }} teams selected</span>
                <button @click="confirmDraftImport" :disabled="draftImportTeams.filter(t => t.selected).length === 0" class="px-4 py-2 rounded-lg bg-green-500 text-gray-900 font-semibold hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Use {{ draftImportTeams.filter(t => t.selected).length }} Teams
                </button>
              </div>
            </div>
          </div>

          <!-- Import from Another League -->
          <div class="border-t border-dark-border pt-4">
            <button 
              @click="showSleeperImport = !showSleeperImport"
              class="flex items-center gap-2 text-sm text-dark-textMuted hover:text-dark-text transition-colors"
            >
              <span :class="showSleeperImport ? 'rotate-90' : ''" class="transition-transform">▶</span>
              {{ isLoggedIn ? 'Import from a different league' : 'Import from Sleeper' }}
            </button>
            
            <div v-if="showSleeperImport" class="mt-4 p-4 rounded-lg bg-dark-border/20 border border-dark-border">
              <div class="flex items-center gap-2 mb-3">
                <span class="text-xl">💤</span>
                <span class="font-semibold text-dark-text">Import from Sleeper</span>
              </div>
              <p class="text-sm text-dark-textMuted mb-3">Enter your Sleeper username to import team names and logos.</p>
              <div class="flex items-center gap-3 flex-wrap">
                <input v-model="sleeperUsername" type="text" placeholder="Enter Sleeper Username" class="input w-56" @keyup.enter="loadSleeperLeagues" />
                <button @click="loadSleeperLeagues" :disabled="isLoadingSleeper || !sleeperUsername.trim()" class="px-4 py-2 rounded-lg bg-green-500 text-gray-900 font-semibold hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {{ isLoadingSleeper ? 'Loading...' : 'Load Leagues' }}
                </button>
                <select v-if="sleeperLeagues.length > 0" v-model="selectedSleeperLeague" @change="loadSleeperTeams" class="select min-w-[200px]">
                  <option value="">Select a League...</option>
                  <option v-for="league in sleeperLeagues" :key="league.league_id" :value="league.league_id">{{ league.name }}</option>
                </select>
              </div>
              <p v-if="sleeperError" class="text-red-400 mt-2 text-sm">{{ sleeperError }}</p>
              
              <!-- Sleeper Team Selection -->
              <div v-if="availableSleeperTeams.length > 0" class="mt-4">
                <div class="flex items-center justify-between mb-3">
                  <label class="text-sm font-semibold text-dark-text">Select Teams to Include</label>
                  <div class="flex gap-2">
                    <button @click="selectAllSleeperTeams" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">Select All</button>
                    <button @click="deselectAllSleeperTeams" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">Deselect All</button>
                  </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  <div v-for="team in availableSleeperTeams" :key="team.oddsIdx" 
                    @click="toggleSleeperTeam(team)"
                    :class="team.selected ? 'border-yellow-400 bg-yellow-400/10' : 'border-dark-border/50 hover:border-dark-border'"
                    class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all">
                    <div class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                      :class="team.selected ? 'bg-yellow-400 border-yellow-400' : 'border-dark-border'">
                      <span v-if="team.selected" class="text-gray-900 text-xs font-bold">✓</span>
                    </div>
                    <img v-if="team.avatar" :src="getAvatarUrl(team.avatar)" class="w-8 h-8 rounded-full flex-shrink-0" />
                    <div v-else class="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center flex-shrink-0">
                      <span class="text-xs text-dark-textMuted">{{ (team.name || 'T').charAt(0) }}</span>
                    </div>
                    <span class="text-dark-text text-sm truncate">{{ team.name }}</span>
                  </div>
                </div>
                <div class="mt-4 flex items-center justify-between">
                  <span class="text-sm text-dark-textMuted">{{ selectedSleeperCount }} of {{ availableSleeperTeams.length }} teams selected</span>
                  <button @click="importSelectedTeams" :disabled="selectedSleeperCount === 0" class="px-4 py-2 rounded-lg bg-green-500 text-gray-900 font-semibold hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Use {{ selectedSleeperCount }} Teams
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div v-if="sleeperImported" class="text-green-400 flex items-center gap-1">
            <span>✓</span> Teams imported successfully!
          </div>
        </div>
      </div>

      <!-- Setup Card -->
      <div class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⚙️</span>
            <h2 class="card-title">Draft Lottery Setup</h2>
          </div>
        </div>
        <div class="card-body space-y-6">
          <!-- Number of Teams -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-2">Number of Teams</label>
            <div class="flex items-center gap-4">
              <input v-model.number="draftConfig.numTeams" type="range" min="4" max="20" class="flex-1 accent-green-500" @input="updateDraftTeams" />
              <span class="text-2xl font-bold text-green-500 w-12 text-center">{{ draftConfig.numTeams }}</span>
            </div>
          </div>

          <!-- Reveal Order -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-2">Reveal Order</label>
            <div class="flex gap-3">
              <button @click="draftConfig.revealOrder = 'last-to-first'" :class="draftConfig.revealOrder === 'last-to-first' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'" class="px-4 py-2 rounded-lg font-medium transition-all">
                {{ draftConfig.numTeams }} → 1 (Last Pick First)
              </button>
              <button @click="draftConfig.revealOrder = 'first-to-last'" :class="draftConfig.revealOrder === 'first-to-last' ? 'bg-yellow-400 text-gray-900' : 'bg-dark-border/50 text-dark-textSecondary'" class="px-4 py-2 rounded-lg font-medium transition-all">
                1 → {{ draftConfig.numTeams }} (First Pick First)
              </button>
            </div>
          </div>

          <!-- Weighted Picks Toggle -->
          <div class="flex items-center justify-between p-4 bg-dark-border/20 rounded-xl">
            <div>
              <div class="font-semibold text-dark-text">Weighted Lottery</div>
              <div class="text-sm text-dark-textMuted">Give some teams more lottery balls for better odds</div>
            </div>
            <button @click="draftConfig.weighted = !draftConfig.weighted" :class="draftConfig.weighted ? 'bg-primary' : 'bg-dark-border'" class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors">
              <span :class="draftConfig.weighted ? 'translate-x-6' : 'translate-x-1'" class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform" />
            </button>
          </div>

          <!-- Team Names & Weights -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-3">Team Names {{ draftConfig.weighted ? '& Lottery Balls' : '' }}</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div v-for="(team, idx) in draftTeams" :key="idx" class="flex items-center gap-3 p-3 bg-dark-border/20 rounded-lg">
                <span class="text-dark-textMuted font-medium w-6">{{ idx + 1 }}.</span>
                <div v-if="team.avatar" class="w-8 h-8 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                  <img :src="getAvatarUrl(team.avatar)" :alt="team.name" class="w-full h-full object-cover" />
                </div>
                <div v-else class="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center flex-shrink-0">
                  <span class="text-xs text-dark-textMuted">{{ (team.name || 'T').charAt(0) }}</span>
                </div>
                <input v-model="team.name" type="text" :placeholder="'Team ' + (idx + 1)" class="input flex-1" />
                <div v-if="draftConfig.weighted" class="flex items-center gap-2">
                  <button @click="team.balls = Math.max(1, team.balls - 1)" class="w-8 h-8 rounded-lg bg-dark-border/50 hover:bg-dark-border text-dark-text font-bold transition-colors">−</button>
                  <span class="w-8 text-center font-bold text-primary">{{ team.balls }}</span>
                  <button @click="team.balls = Math.min(20, team.balls + 1)" class="w-8 h-8 rounded-lg bg-dark-border/50 hover:bg-dark-border text-dark-text font-bold transition-colors">+</button>
                  <span class="text-xs text-dark-textMuted">🎱</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Odds Preview -->
          <div v-if="draftConfig.weighted" class="p-4 bg-dark-border/20 rounded-xl">
            <div class="text-sm font-semibold text-dark-text mb-3">Lottery Odds Preview</div>
            <div class="space-y-2">
              <div v-for="(team, idx) in draftTeams" :key="idx" class="flex items-center gap-3">
                <span class="text-dark-textMuted w-24 truncate text-sm">{{ team.name || 'Team ' + (idx + 1) }}</span>
                <div class="flex-1 h-4 bg-dark-border/50 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-primary to-yellow-400 rounded-full transition-all" :style="{ width: getTeamOdds(idx) + '%' }"></div>
                </div>
                <span class="text-sm font-medium text-primary w-16 text-right">{{ getTeamOdds(idx).toFixed(1) }}%</span>
              </div>
            </div>
          </div>

          <!-- Generate Button -->
          <button @click="startLotteryAnimation" :disabled="isAnimating" class="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3" :class="isAnimating ? 'bg-dark-border text-dark-textMuted cursor-not-allowed' : 'bg-gradient-to-r from-green-500 to-emerald-400 text-gray-900 hover:shadow-lg hover:shadow-green-500/30'">
            <span class="text-2xl">🎰</span>
            {{ isAnimating ? 'Drawing...' : 'Generate Draft Order' }}
          </button>
        </div>
      </div>

      <!-- Lottery Animation Modal -->
      <Teleport to="body">
        <div v-if="showLotteryModal" class="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
          <div ref="lotteryModalRef" class="bg-dark-card rounded-2xl p-8 max-w-2xl w-full mx-4 border border-dark-border shadow-2xl">
            <div class="text-center mb-6">
              <div class="text-4xl mb-3">🎱</div>
              <h3 class="text-2xl font-bold text-dark-text mb-1">Draft Lottery</h3>
              <p class="text-dark-textMuted text-sm">
                {{ draftConfig.revealOrder === 'last-to-first' ? 'Revealing picks from last to first' : 'Revealing picks from first to last' }}
              </p>
            </div>

            <div class="relative h-56 mb-6">
              <!-- Lottery Ball Machine Animation -->
              <div v-if="currentAnimationPhase === 'spinning'" class="absolute inset-0 flex items-center justify-center">
                <div class="relative w-48 h-48">
                  <div class="absolute inset-0 rounded-full border-4 border-primary/30 overflow-hidden">
                    <div class="absolute inset-2 rounded-full bg-dark-border/50 flex items-center justify-center">
                      <div class="lottery-spinner">
                        <div v-for="(team, i) in remainingSpinnerTeams" :key="team.originalIdx" class="lottery-ball" :style="getSpinnerBallStyle(i, remainingSpinnerTeams.length)">
                          <img v-if="team.avatar" :src="getAvatarUrl(team.avatar)" class="w-9 h-9 rounded-full border-2 border-white/30" />
                          <span v-else class="text-2xl">🎱</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="absolute inset-0 rounded-full animate-pulse bg-primary/20"></div>
                </div>
              </div>

              <!-- Revealed Pick -->
              <div v-if="currentAnimationPhase === 'reveal'" class="absolute inset-0 flex items-center justify-center">
                <div class="text-center animate-bounce-in">
                  <div class="text-5xl font-black text-primary mb-3">Pick #{{ currentRevealPick }}</div>
                  <div class="flex items-center justify-center gap-3">
                    <img v-if="currentRevealAvatar" :src="getAvatarUrl(currentRevealAvatar)" class="w-14 h-14 rounded-full border-2 border-primary" />
                    <div class="text-2xl font-bold text-dark-text">{{ currentRevealTeam }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Live Odds Display (Weighted Only) -->
            <div v-if="draftConfig.weighted && currentAnimationPhase === 'spinning' && remainingSpinnerTeams.length > 1" class="mb-6 p-4 bg-dark-border/20 rounded-xl">
              <div class="text-xs font-semibold text-dark-textMuted mb-2 uppercase tracking-wide">Current Odds</div>
              <div class="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                <div v-for="team in remainingSpinnerTeams" :key="team.originalIdx" class="flex items-center gap-2 text-sm">
                  <img v-if="team.avatar" :src="getAvatarUrl(team.avatar)" class="w-5 h-5 rounded-full" />
                  <span v-else class="w-5 h-5 rounded-full bg-dark-border flex items-center justify-center text-xs">{{ team.name.charAt(0) }}</span>
                  <span class="text-dark-text truncate flex-1">{{ team.name }}</span>
                  <span class="text-primary font-bold">{{ getLiveOdds(team.originalIdx).toFixed(1) }}%</span>
                </div>
              </div>
            </div>

            <!-- Revealed Picks List -->
            <div v-if="revealedPicks.length > 0" class="mb-6">
              <div class="text-sm font-semibold text-dark-textMuted mb-3 uppercase tracking-wide">Revealed Picks</div>
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <div v-for="pick in leftColumnPicks" :key="pick.pick" class="flex items-center gap-2 p-2 bg-dark-border/30 rounded-lg">
                    <span class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">{{ pick.pick }}</span>
                    <img v-if="pick.avatar" :src="getAvatarUrl(pick.avatar)" class="w-6 h-6 rounded-full flex-shrink-0" />
                    <span class="text-dark-text font-medium truncate">{{ pick.team }}</span>
                  </div>
                </div>
                <div class="space-y-2">
                  <div v-for="pick in rightColumnPicks" :key="pick.pick" class="flex items-center gap-2 p-2 bg-dark-border/30 rounded-lg">
                    <span class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">{{ pick.pick }}</span>
                    <img v-if="pick.avatar" :src="getAvatarUrl(pick.avatar)" class="w-6 h-6 rounded-full flex-shrink-0" />
                    <span class="text-dark-text font-medium truncate">{{ pick.team }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Progress -->
            <div class="mb-6">
              <div class="flex justify-between text-sm text-dark-textMuted mb-2">
                <span>Progress</span>
                <span>{{ revealedPicks.length }} / {{ draftConfig.numTeams }}</span>
              </div>
              <div class="h-2 bg-dark-border/50 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-primary to-yellow-400 transition-all duration-300" :style="{ width: (revealedPicks.length / draftConfig.numTeams) * 100 + '%' }"></div>
              </div>
            </div>

            <!-- Close Button -->
            <button v-if="revealedPicks.length === draftConfig.numTeams" @click="closeLotteryModal" class="w-full py-3 rounded-xl bg-primary text-gray-900 font-bold hover:bg-primary/90 transition-colors">
              View Final Draft Order
            </button>
          </div>
        </div>
      </Teleport>

      <!-- Final Draft Order Results -->
      <div v-if="finalDraftOrder.length > 0 && !showLotteryModal" class="card">
        <div class="card-header flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-2xl">🏆</span>
            <h2 class="card-title">Final Draft Order</h2>
          </div>
          <div class="flex gap-2">
            <button 
              @click="downloadDraftOrderImage" 
              :disabled="isDownloadingDraft" 
              class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm"
              style="background: #dc2626; color: #ffffff;"
              @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
              @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
            >
              <svg v-if="!isDownloadingDraft" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ isDownloadingDraft ? 'Saving...' : 'Share' }}
            </button>
            <button 
              @click="downloadDraftAnimation" 
              :disabled="isDownloadingAnimation" 
              class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm"
              style="background: #dc2626; color: #ffffff;"
              @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
              @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
            >
              <span class="pointer-events-none">🎬</span>
              {{ isDownloadingAnimation ? 'Recording...' : 'Download GIF' }}
            </button>
          </div>
        </div>
        <div class="card-body">
          <div class="grid grid-cols-2 gap-6">
            <div class="space-y-3">
              <div v-for="pick in leftColumnFinal" :key="pick.pickNumber" class="flex items-center gap-4 p-4 rounded-xl transition-all" :class="pick.pickNumber === 1 ? 'bg-gradient-to-r from-primary/20 to-yellow-400/20 border border-primary/30' : 'bg-dark-border/20'">
                <div class="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl flex-shrink-0" :class="pick.pickNumber === 1 ? 'bg-primary text-gray-900' : 'bg-dark-border text-dark-text'">{{ pick.pickNumber }}</div>
                <img v-if="pick.avatar" :src="getAvatarUrl(pick.avatar)" class="w-10 h-10 rounded-full flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-dark-text text-lg truncate">{{ pick.team }}</div>
                  <div class="text-sm text-dark-textMuted">Pick #{{ pick.pickNumber }}</div>
                </div>
                <div v-if="pick.pickNumber === 1" class="text-2xl flex-shrink-0">👑</div>
              </div>
            </div>
            <div class="space-y-3">
              <div v-for="pick in rightColumnFinal" :key="pick.pickNumber" class="flex items-center gap-4 p-4 rounded-xl bg-dark-border/20">
                <div class="w-12 h-12 rounded-full flex items-center justify-center font-black text-xl bg-dark-border text-dark-text flex-shrink-0">{{ pick.pickNumber }}</div>
                <img v-if="pick.avatar" :src="getAvatarUrl(pick.avatar)" class="w-10 h-10 rounded-full flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="font-bold text-dark-text text-lg truncate">{{ pick.team }}</div>
                  <div class="text-sm text-dark-textMuted">Pick #{{ pick.pickNumber }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== SCHEDULE GENERATOR ==================== -->
    <template v-if="activeTool === 'schedule'">
      <!-- Step Indicator -->
      <div class="card">
        <div class="card-body py-4">
          <div class="flex items-center justify-between max-w-3xl mx-auto">
            <div v-for="(step, idx) in scheduleSteps" :key="idx" class="flex items-center">
              <div 
                class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all"
                :class="scheduleStep >= idx ? 'bg-primary text-gray-900' : 'bg-dark-border text-dark-textMuted'"
              >
                {{ idx + 1 }}
              </div>
              <div class="ml-2 hidden sm:block">
                <div class="text-sm font-semibold" :class="scheduleStep >= idx ? 'text-dark-text' : 'text-dark-textMuted'">
                  {{ step.title }}
                </div>
              </div>
              <div v-if="idx < scheduleSteps.length - 1" class="w-6 sm:w-12 h-0.5 mx-2 sm:mx-3" :class="scheduleStep > idx ? 'bg-primary' : 'bg-dark-border'"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 1: League Setup (Teams & Weeks Only) -->
      <div v-if="scheduleStep === 0" class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">⚙️</span>
            <h2 class="card-title">League Setup</h2>
          </div>
        </div>
        <div class="card-body space-y-6">
          <!-- Import League Section -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-3">Import League (Optional)</label>
            
            <!-- Current League Auto-Import (if logged in) -->
            <div v-if="isLoggedIn && currentPlatform && currentLeagueName" class="p-4 rounded-lg bg-dark-border/20 border border-dark-border mb-4">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xl">{{ currentPlatform === 'yahoo' ? '🟣' : currentPlatform === 'sleeper' ? '💤' : '🔵' }}</span>
                  <span class="font-semibold text-dark-text">{{ currentLeagueName }}</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">Connected</span>
                </div>
                <button 
                  @click="loadCurrentLeagueTeams('schedule')" 
                  :disabled="isLoadingPlatformTeams" 
                  class="px-4 py-2 rounded-lg bg-green-500 text-gray-900 font-semibold hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {{ isLoadingPlatformTeams ? 'Loading...' : 'Import Teams' }}
                </button>
              </div>
              <p v-if="platformTeamsError" class="text-red-400 text-sm">{{ platformTeamsError }}</p>
              
              <!-- Team Selection after loading -->
              <div v-if="scheduleImportTeams.length > 0" class="mt-4">
                <div class="flex items-center justify-between mb-3">
                  <label class="text-sm font-semibold text-dark-text">Select Teams to Include</label>
                  <div class="flex gap-2">
                    <button @click="scheduleImportTeams.forEach(t => t.selected = true)" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">Select All</button>
                    <button @click="scheduleImportTeams.forEach(t => t.selected = false)" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">Deselect All</button>
                  </div>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  <div v-for="(team, idx) in scheduleImportTeams" :key="idx" 
                    @click="team.selected = !team.selected"
                    :class="team.selected ? 'border-yellow-400 bg-yellow-400/10' : 'border-dark-border/50 hover:border-dark-border'"
                    class="flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all">
                    <div class="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                      :class="team.selected ? 'bg-yellow-400 border-yellow-400' : 'border-dark-border'">
                      <span v-if="team.selected" class="text-gray-900 text-xs font-bold">✓</span>
                    </div>
                    <img v-if="team.avatar" :src="team.avatar" class="w-8 h-8 rounded-full flex-shrink-0 object-cover" @error="handleImgError" />
                    <div v-else class="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center flex-shrink-0">
                      <span class="text-xs text-dark-textMuted">{{ (team.name || 'T').charAt(0) }}</span>
                    </div>
                    <span class="text-dark-text text-sm truncate">{{ team.name }}</span>
                  </div>
                </div>
                <div class="mt-4 flex items-center justify-between">
                  <span class="text-sm text-dark-textMuted">{{ scheduleImportTeams.filter(t => t.selected).length }} of {{ scheduleImportTeams.length }} teams selected</span>
                  <button @click="confirmScheduleImport" :disabled="scheduleImportTeams.filter(t => t.selected).length === 0" class="px-4 py-2 rounded-lg bg-green-500 text-gray-900 font-semibold hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    Use {{ scheduleImportTeams.filter(t => t.selected).length }} Teams
                  </button>
                </div>
              </div>
            </div>

            <!-- Import from Another League -->
            <div :class="isLoggedIn ? 'border-t border-dark-border pt-4' : ''">
              <button 
                @click="showScheduleSleeperImport = !showScheduleSleeperImport"
                class="flex items-center gap-2 text-sm text-dark-textMuted hover:text-dark-text transition-colors"
              >
                <span :class="showScheduleSleeperImport ? 'rotate-90' : ''" class="transition-transform">▶</span>
                {{ isLoggedIn ? 'Import from a different league' : 'Import from Sleeper' }}
              </button>
              
              <div v-if="showScheduleSleeperImport" class="mt-4 p-4 rounded-lg bg-dark-border/20 border border-dark-border">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-xl">💤</span>
                  <span class="font-semibold text-dark-text">Import from Sleeper</span>
                </div>
                <p class="text-sm text-dark-textMuted mb-3">Enter your Sleeper username to import team names and logos.</p>
                <div class="flex items-center gap-3 flex-wrap">
                  <input v-model="scheduleSleeperUsername" type="text" placeholder="Enter Sleeper Username" class="input w-48" @keyup.enter="loadScheduleSleeperLeagues" />
                  <button @click="loadScheduleSleeperLeagues" :disabled="isLoadingScheduleSleeper || !scheduleSleeperUsername.trim()" class="px-4 py-2 rounded-lg bg-green-500 text-gray-900 font-semibold hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ isLoadingScheduleSleeper ? 'Loading...' : 'Load Leagues' }}
                  </button>
                  <select v-if="scheduleSleeperLeagues.length > 0" v-model="selectedScheduleSleeperLeague" @change="loadScheduleSleeperTeams" class="select min-w-[200px]">
                    <option value="">Select a League...</option>
                    <option v-for="league in scheduleSleeperLeagues" :key="league.league_id" :value="league.league_id">{{ league.name }} ({{ league.total_rosters }} teams)</option>
                  </select>
                </div>
                <p v-if="scheduleSleeperError" class="text-red-400 mt-2 text-sm">{{ scheduleSleeperError }}</p>
              </div>
            </div>
            
            <div v-if="scheduleSleeperImported" class="text-green-400 flex items-center gap-1 mt-3">
              <span>✓</span> {{ scheduleTeams.length }} teams imported successfully!
            </div>
          </div>

          <!-- Teams and Weeks -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-semibold text-dark-text mb-2">Number of Teams</label>
              <div class="flex items-center gap-4">
                <input v-model.number="scheduleConfig.numTeams" type="range" min="6" max="16" step="2" class="flex-1 accent-green-500" @input="onTeamsChange" />
                <span class="text-2xl font-bold text-green-500 w-12 text-center">{{ scheduleConfig.numTeams }}</span>
              </div>
              <div class="text-xs text-dark-textMuted mt-1">Even numbers only (6-16)</div>
            </div>
            <div>
              <label class="block text-sm font-semibold text-dark-text mb-2">Regular Season Weeks</label>
              <div class="flex items-center gap-4">
                <input v-model.number="scheduleConfig.numWeeks" type="range" min="18" max="26" class="flex-1 accent-green-500" @input="generateScheduleFormats" />
                <span class="text-2xl font-bold text-green-500 w-12 text-center">{{ scheduleConfig.numWeeks }}</span>
              </div>
              <div class="text-xs text-dark-textMuted mt-1">Baseball regular season: 20-24 weeks typical</div>
            </div>
          </div>

          <!-- Team Names with Avatars -->
          <div>
            <label class="block text-sm font-semibold text-dark-text mb-3">Team Names</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div 
                v-for="(team, idx) in scheduleTeams" 
                :key="idx" 
                class="flex items-center gap-3 p-3 rounded-lg bg-dark-border/20"
              >
                <span class="text-dark-textMuted font-medium w-6">{{ idx + 1 }}.</span>
                <div v-if="team.avatar" class="w-8 h-8 rounded-full bg-dark-border overflow-hidden flex-shrink-0">
                  <img :src="getScheduleAvatarUrl(team.avatar)" :alt="team.name" class="w-full h-full object-cover" />
                </div>
                <div v-else class="w-8 h-8 rounded-full bg-dark-border flex items-center justify-center flex-shrink-0">
                  <span class="text-xs text-dark-textMuted">{{ (team.name || 'T').charAt(0) }}</span>
                </div>
                <input v-model="team.name" type="text" :placeholder="'Team ' + (idx + 1)" class="input flex-1" />
              </div>
            </div>
          </div>

          <!-- Next Button -->
          <div class="flex justify-end">
            <button 
              @click="scheduleStep = 1; generateScheduleFormats()"
              class="px-6 py-3 rounded-xl font-bold text-lg transition-all flex items-center gap-2 bg-yellow-400 text-gray-900 hover:bg-yellow-300"
            >
              Next: Choose Format
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2: Choose Schedule Format -->
      <div v-if="scheduleStep === 1" class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">📋</span>
            <h2 class="card-title">Choose Schedule Format</h2>
          </div>
          <div class="text-sm text-dark-textMuted">
            {{ scheduleConfig.numTeams }} teams • {{ scheduleConfig.numWeeks }} weeks
          </div>
        </div>
        <div class="card-body space-y-4">
          <!-- Format Options -->
          <div class="space-y-3">
            <div 
              v-for="(format, idx) in availableFormats" 
              :key="idx"
              @click="selectScheduleFormat(format)"
              :class="selectedFormat?.id === format.id ? 'border-primary bg-primary/5' : 'border-dark-border hover:border-dark-textMuted'"
              class="p-4 rounded-xl border-2 cursor-pointer transition-all"
            >
              <div class="flex items-start justify-between gap-4">
                <div class="flex-1">
                  <!-- Header with icon and title -->
                  <div class="flex items-center gap-3 mb-2">
                    <span class="text-2xl">{{ format.icon }}</span>
                    <div>
                      <div class="font-bold text-dark-text text-lg">{{ format.title }}</div>
                      <div class="text-sm text-dark-textMuted">{{ format.subtitle }}</div>
                    </div>
                  </div>
                  
                  <!-- Breakdown -->
                  <div class="flex flex-wrap gap-4 mt-3 text-sm">
                    <div v-if="format.divisionGames > 0" class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span class="text-dark-textMuted">Division: <span class="text-dark-text font-medium">{{ format.divisionOpponents }} opponents × {{ format.divisionGames }}x = {{ format.divisionOpponents * format.divisionGames }} games</span></span>
                    </div>
                    <div v-if="format.nonDivisionGames > 0" class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                      <span class="text-dark-textMuted">Non-Division: <span class="text-dark-text font-medium">{{ format.nonDivisionOpponents }} opponents × {{ format.nonDivisionGames }}x = {{ format.nonDivisionOpponents * format.nonDivisionGames }} games</span></span>
                    </div>
                    <div v-if="format.divisions === 0" class="flex items-center gap-2">
                      <span class="w-2 h-2 rounded-full bg-green-400"></span>
                      <span class="text-dark-textMuted">All opponents: <span class="text-dark-text font-medium">{{ format.nonDivisionOpponents }} × {{ format.nonDivisionGames }}x = {{ format.nonDivisionOpponents * format.nonDivisionGames }} games</span></span>
                    </div>
                  </div>
                </div>
                
                <!-- Tags -->
                <div class="flex flex-col gap-1 items-end flex-shrink-0">
                  <span v-if="format.isPerfect" class="px-2 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                    ✓ Perfect Balance
                  </span>
                  <span v-if="format.isRecommended" class="px-2 py-1 rounded-full text-xs font-semibold bg-primary/20 text-primary">
                    🎯 Recommended
                  </span>
                  <span v-if="format.isDivisionOnly" class="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                    🔥 Division Only
                  </span>
                  <span v-if="format.isRivalryMode" class="px-2 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                    🔥 Rivalry Mode
                  </span>
                  <span v-if="format.needsSelection" class="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                    ⚠️ Selection Required
                  </span>
                </div>
              </div>
              
              <!-- Selection info if needed -->
              <div v-if="format.needsSelection && format.selectionInfo" class="mt-3 pt-3 border-t border-dark-border/50 text-sm text-dark-textMuted">
                {{ format.selectionInfo }}
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <div class="flex justify-between pt-4">
            <button 
              @click="scheduleStep = 0"
              class="px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 bg-dark-border text-dark-text hover:bg-dark-border/80"
            >
              <span>←</span>
              Back
            </button>
            <button 
              @click="proceedFromFormatSelection"
              :disabled="!selectedFormat"
              class="px-6 py-3 rounded-xl font-bold text-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-yellow-400 text-gray-900 hover:bg-yellow-300"
            >
              {{ selectedFormat?.needsSelection ? 'Next: Assign Matchups' : 'Next: Assign Divisions' }}
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Step 3: Division Assignment & Rivalry Pairing -->
      <div v-if="scheduleStep === 2" class="card">
        <div class="card-header">
          <div class="flex items-center gap-2">
            <span class="text-2xl">👥</span>
            <h2 class="card-title">{{ selectedFormat?.needsSelection ? 'Assign Divisions & Rivalries' : 'Assign Divisions' }}</h2>
          </div>
        </div>
        <div class="card-body space-y-6">
          <!-- Division Assignment (if divisions > 0) -->
          <div v-if="selectedFormat && selectedFormat.divisions > 0">
            <label class="block text-sm font-semibold text-dark-text mb-3">
              Division Names & Team Assignment
            </label>
            
            <!-- Division name inputs -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div v-for="(div, idx) in scheduleConfig.divisions" :key="idx" class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ background: divisionColors[idx] }"></span>
                <input v-model="div.name" type="text" :placeholder="'Division ' + (idx + 1)" class="input flex-1" />
              </div>
            </div>
            
            <!-- Team to division assignment -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div 
                v-for="(team, idx) in scheduleTeams" 
                :key="idx" 
                class="flex items-center gap-3 p-3 rounded-lg"
                :style="{ background: divisionColors[team.division] + '15', borderLeft: '3px solid ' + divisionColors[team.division] }"
              >
                <span class="text-dark-textMuted font-medium w-6">{{ idx + 1 }}.</span>
                <span class="flex-1 font-medium text-dark-text">{{ team.name || 'Team ' + (idx + 1) }}</span>
                <select v-model="team.division" class="select w-32">
                  <option v-for="(div, dIdx) in scheduleConfig.divisions" :key="dIdx" :value="dIdx">
                    {{ div.name || 'Div ' + (dIdx + 1) }}
                  </option>
                </select>
              </div>
            </div>
            
            <!-- Division balance warning -->
            <div v-if="!divisionsBalanced" class="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div class="flex items-center gap-2 text-red-400">
                <span>⚠️</span>
                <span class="font-semibold">Divisions must be balanced</span>
              </div>
              <div class="text-sm text-red-400/80 mt-1">
                Each division needs exactly {{ scheduleConfig.numTeams / selectedFormat.divisions }} teams.
                Current: {{ divisionCounts.join(', ') }}
              </div>
            </div>
          </div>

          <!-- Rivalry Pairing Section (only if selection needed) -->
          <div v-if="selectedFormat?.needsSelection && divisionsBalanced">
            <div class="border-t border-dark-border pt-6 mt-6">
              <label class="block text-sm font-semibold text-dark-text mb-2">
                {{ rivalryPairingTitle }}
              </label>
              <p class="text-sm text-dark-textMuted mb-4">{{ rivalryPairingDescription }}</p>
              
              <!-- 2 Divisions: Per-Team Selection UI -->
              <div v-if="selectedFormat.divisions === 2" class="space-y-4">
                <div class="flex items-center justify-end gap-2 mb-2">
                  <button @click="randomizeRivalryPairings" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">
                    Randomize All
                  </button>
                  <button @click="clearRivalryPairings" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">
                    Clear All
                  </button>
                </div>
                
                <!-- Show each Division A team with dropdown to select their extra/excluded opponent -->
                <div class="space-y-3">
                  <div class="text-sm font-semibold flex items-center gap-2 mb-2">
                    <span class="w-3 h-3 rounded-full" :style="{ background: divisionColors[0] }"></span>
                    {{ scheduleConfig.divisions[0]?.name || 'Division 1' }} Teams
                  </div>
                  
                  <div 
                    v-for="team in divisionATeams" 
                    :key="team.index"
                    class="flex items-center gap-4 p-3 rounded-lg bg-dark-border/20"
                  >
                    <div v-if="team.avatar" class="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                      <img :src="getScheduleAvatarUrl(team.avatar)" class="w-full h-full object-cover" />
                    </div>
                    <span class="font-medium text-dark-text flex-1">{{ team.name || 'Team ' + (team.index + 1) }}</span>
                    <span class="text-sm text-dark-textMuted">{{ selectionType === 'extra' ? 'Extra game vs:' : 'Skip game vs:' }}</span>
                    <select 
                      :value="rivalryPairings[team.index] ?? ''"
                      @change="setRivalryPairingTwoDiv(team.index, ($event.target as HTMLSelectElement).value)"
                      class="select w-44"
                    >
                      <option value="">Select opponent...</option>
                      <option 
                        v-for="opp in divisionBTeams" 
                        :key="opp.index" 
                        :value="opp.index"
                        :disabled="isOpponentFullyPaired(opp.index, team.index)"
                      >
                        {{ opp.name || 'Team ' + (opp.index + 1) }}
                        {{ isOpponentFullyPaired(opp.index, team.index) ? '(full)' : '' }}
                      </option>
                    </select>
                  </div>
                </div>
                
                <!-- Summary showing Division B pairings -->
                <div class="mt-6 pt-4 border-t border-dark-border">
                  <div class="text-sm font-semibold flex items-center gap-2 mb-3">
                    <span class="w-3 h-3 rounded-full" :style="{ background: divisionColors[1] }"></span>
                    {{ scheduleConfig.divisions[1]?.name || 'Division 2' }} Matchups (Auto-assigned)
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <div 
                      v-for="team in divisionBTeams" 
                      :key="team.index"
                      class="flex items-center gap-2 p-2 rounded bg-dark-border/10 text-sm"
                    >
                      <span class="font-medium text-dark-text">{{ team.name || 'Team ' + (team.index + 1) }}:</span>
                      <span class="text-dark-textMuted">
                        {{ getDivBTeamPairings(team.index) || 'None yet' }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <!-- Pairing progress -->
                <div class="mt-4 p-3 rounded-lg bg-dark-border/20">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-dark-textMuted">Teams assigned:</span>
                    <span :class="rivalryPairingsComplete ? 'text-green-400' : 'text-dark-text'" class="font-bold">
                      {{ Object.keys(rivalryPairings).length }} / {{ divisionATeams.length }}
                    </span>
                  </div>
                  <div v-if="!rivalryPairingsComplete" class="mt-2 text-sm text-yellow-400">
                    Each {{ scheduleConfig.divisions[0]?.name || 'Division 1' }} team needs an opponent selected
                  </div>
                </div>
              </div>
              
              <!-- 3+ Divisions: Dropdown Grid UI -->
              <div v-else-if="selectedFormat.divisions >= 3" class="space-y-4">
                <div class="flex items-center justify-end gap-2 mb-2">
                  <button @click="randomizeRivalryPairings" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">
                    Randomize
                  </button>
                  <button @click="clearRivalryPairings" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">
                    Clear All
                  </button>
                </div>
                
                <div v-for="(div, divIdx) in scheduleConfig.divisions" :key="divIdx" class="mb-6">
                  <div class="text-sm font-semibold mb-3 flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" :style="{ background: divisionColors[divIdx] }"></span>
                    {{ div.name || 'Division ' + (divIdx + 1) }}
                  </div>
                  <div class="space-y-2">
                    <div 
                      v-for="team in getTeamsInDivision(divIdx)" 
                      :key="team.index"
                      class="flex items-center gap-4 p-3 rounded-lg bg-dark-border/20"
                    >
                      <span class="font-medium text-dark-text flex-1">{{ team.name || 'Team ' + (team.index + 1) }}</span>
                      <select 
                        :value="rivalryPairings[team.index] ?? ''"
                        @change="setRivalryPairing(team.index, ($event.target as HTMLSelectElement).value)"
                        class="select w-48"
                        :disabled="getRivalryPairReverse(team.index) !== null"
                      >
                        <option value="">{{ selectionType === 'extra' ? 'Select extra opponent...' : 'Select to exclude...' }}</option>
                        <option 
                          v-for="opp in getAvailableOpponents(team.index, divIdx)" 
                          :key="opp.index" 
                          :value="opp.index"
                        >
                          {{ opp.name || 'Team ' + (opp.index + 1) }} ({{ scheduleConfig.divisions[opp.division]?.name || 'Div ' + (opp.division + 1) }})
                        </option>
                      </select>
                      <span v-if="getRivalryPairReverse(team.index) !== null" class="text-xs text-green-400 w-32 text-right">
                        ↔ {{ getTeamName(getRivalryPairReverse(team.index)!) }}
                      </span>
                    </div>
                  </div>
                </div>
                
                <!-- Pairing progress -->
                <div class="mt-4 p-3 rounded-lg bg-dark-border/20">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-dark-textMuted">Pairings complete:</span>
                    <span :class="rivalryPairingsComplete ? 'text-green-400' : 'text-dark-text'" class="font-bold">
                      {{ Object.keys(rivalryPairings).length }} / {{ requiredPairings }}
                    </span>
                  </div>
                </div>
              </div>
              
              <!-- No divisions but selection needed -->
              <div v-else-if="selectedFormat.divisions === 0" class="space-y-4">
                <div class="flex items-center justify-end gap-2 mb-2">
                  <button @click="randomizeRivalryPairings" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">
                    Randomize
                  </button>
                  <button @click="clearRivalryPairings" class="text-xs px-3 py-1 rounded bg-dark-border/50 text-dark-textSecondary hover:bg-dark-border">
                    Clear All
                  </button>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                  <div 
                    v-for="team in scheduleTeams.map((t, i) => ({ ...t, index: i }))" 
                    :key="team.index"
                    class="flex items-center gap-3 p-3 rounded-lg bg-dark-border/20"
                  >
                    <span class="font-medium text-dark-text flex-1">{{ team.name || 'Team ' + (team.index + 1) }}</span>
                    <select 
                      :value="rivalryPairings[team.index] ?? ''"
                      @change="setRivalryPairing(team.index, ($event.target as HTMLSelectElement).value)"
                      class="select w-40"
                      :disabled="getRivalryPairReverse(team.index) !== null"
                    >
                      <option value="">Select opponent...</option>
                      <option 
                        v-for="opp in getAvailableOpponentsNoDivision(team.index)" 
                        :key="opp.index" 
                        :value="opp.index"
                      >
                        {{ opp.name || 'Team ' + (opp.index + 1) }}
                      </option>
                    </select>
                    <span v-if="getRivalryPairReverse(team.index) !== null" class="text-xs text-green-400">
                      ↔ {{ getTeamName(getRivalryPairReverse(team.index)!) }}
                    </span>
                  </div>
                </div>
                
                <!-- Pairing progress -->
                <div class="mt-4 p-3 rounded-lg bg-dark-border/20">
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-dark-textMuted">Pairings complete:</span>
                    <span :class="rivalryPairingsComplete ? 'text-green-400' : 'text-dark-text'" class="font-bold">
                      {{ Object.keys(rivalryPairings).length }} / {{ requiredPairings }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <div class="flex justify-between pt-4">
            <button 
              @click="scheduleStep = 1"
              class="px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 bg-dark-border text-dark-text hover:bg-dark-border/80"
            >
              <span>←</span>
              Back
            </button>
            <button 
              @click="scheduleStep = 3; generateSchedule()"
              :disabled="!canGenerateSchedule"
              class="px-6 py-3 rounded-xl font-bold text-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-green-500 to-emerald-400 text-gray-900 hover:shadow-lg"
            >
              <span class="text-xl">📅</span>
              Generate Schedule
            </button>
          </div>
        </div>
      </div>

      <!-- Step 4: Generated Schedule -->
      <div v-if="scheduleStep === 3" class="space-y-6">
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📅</span>
              <h2 class="card-title">Generated Schedule</h2>
            </div>
            <div class="flex gap-2">
              <button 
                @click="scheduleStep = 0; generatedSchedule = []"
                class="px-4 py-2 rounded-lg bg-dark-border/50 hover:bg-dark-border text-dark-text font-medium transition-colors flex items-center gap-2"
              >
                <span>🔄</span> Start Over
              </button>
              <button 
                @click="downloadScheduleCSV"
                class="px-4 py-2 rounded-lg bg-dark-border/50 hover:bg-dark-border text-dark-text font-medium transition-colors flex items-center gap-2"
              >
                <span>📄</span> Download CSV
              </button>
              <button 
                @click="downloadScheduleImage"
                :disabled="isDownloadingSchedule"
                class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm"
                style="background: #dc2626; color: #ffffff;"
                @mouseover="$event.currentTarget.style.background = '#eab308'; $event.currentTarget.style.color = '#0a0c14'"
                @mouseout="$event.currentTarget.style.background = '#dc2626'; $event.currentTarget.style.color = '#ffffff'"
              >
                <svg v-if="!isDownloadingSchedule" class="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <svg v-else class="w-4 h-4 animate-spin pointer-events-none" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isDownloadingSchedule ? 'Saving...' : 'Share' }}
              </button>
            </div>
          </div>
          <div class="card-body">
            <!-- Schedule Stats -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div class="p-3 rounded-lg bg-dark-border/20 text-center">
                <div class="text-lg font-bold text-primary">{{ scheduleConfig.numTeams }}</div>
                <div class="text-xs text-dark-textMuted">Teams</div>
              </div>
              <div class="p-3 rounded-lg bg-dark-border/20 text-center">
                <div class="text-lg font-bold text-primary">{{ scheduleConfig.numWeeks }}</div>
                <div class="text-xs text-dark-textMuted">Weeks</div>
              </div>
              <div v-if="scheduleConfig.numDivisions > 0" class="p-3 rounded-lg bg-dark-border/20 text-center">
                <div class="text-lg font-bold text-cyan-400">{{ divisionGamesTotal }}</div>
                <div class="text-xs text-dark-textMuted">Division Games</div>
              </div>
              <div class="p-3 rounded-lg bg-dark-border/20 text-center">
                <div class="text-lg font-bold text-green-400">0</div>
                <div class="text-xs text-dark-textMuted">Back-to-Backs</div>
              </div>
            </div>

            <!-- Schedule Table -->
            <div class="overflow-x-auto" id="schedule-table">
              <table class="w-full border-collapse">
                <thead>
                  <tr>
                    <th class="p-3 text-left bg-dark-border/30 font-semibold text-dark-text sticky left-0 z-10 min-w-[160px]" style="background: #1a1d2a;">Team</th>
                    <th v-for="week in scheduleConfig.numWeeks" :key="week" class="p-3 text-center bg-dark-border/30 font-semibold text-dark-text min-w-[100px]">
                      Wk {{ week }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(team, idx) in scheduleTeams" :key="idx" class="border-t border-dark-border/30">
                    <td class="p-3 sticky left-0 z-10" style="background: #1a1d2a;">
                      <div class="flex items-center gap-2">
                        <div v-if="team.avatar" class="w-7 h-7 rounded-full overflow-hidden flex-shrink-0">
                          <img :src="getScheduleAvatarUrl(team.avatar)" class="w-full h-full object-cover" />
                        </div>
                        <span class="font-semibold text-dark-text">{{ team.name || 'Team ' + (idx + 1) }}</span>
                        <span 
                          v-if="scheduleConfig.numDivisions > 0" 
                          class="text-xs px-2 py-0.5 rounded-full text-white"
                          :style="{ background: divisionColors[team.division] }"
                        >
                          {{ scheduleConfig.divisions[team.division]?.name || 'D' + (team.division + 1) }}
                        </span>
                      </div>
                    </td>
                    <td 
                      v-for="week in scheduleConfig.numWeeks" 
                      :key="week" 
                      class="p-3 text-center"
                      :class="getMatchupClass(idx, week - 1)"
                    >
                      {{ getOpponentName(idx, week - 1) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Division Legend -->
            <div v-if="scheduleConfig.numDivisions > 0" class="mt-6 flex items-center gap-6 flex-wrap">
              <span class="text-sm text-dark-textMuted">Legend:</span>
              <div v-for="(div, idx) in scheduleConfig.divisions" :key="idx" class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" :style="{ background: divisionColors[idx] }"></span>
                <span class="text-sm text-dark-text">{{ div.name || 'Division ' + (idx + 1) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-4 h-4 rounded bg-primary/30"></span>
                <span class="text-sm text-dark-textMuted">Division Game</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Matchup Summary -->
        <div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2">
              <span class="text-2xl">📊</span>
              <h2 class="card-title">Matchup Summary</h2>
            </div>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div 
                v-for="(team, idx) in scheduleTeams" 
                :key="idx"
                class="p-4 rounded-lg bg-dark-border/20"
              >
                <div class="font-semibold text-dark-text mb-2">{{ team.name || 'Team ' + (idx + 1) }}</div>
                <div class="text-xs text-dark-textMuted space-y-1">
                  <div v-for="(count, oppIdx) in getOpponentCounts(idx)" :key="oppIdx" class="flex justify-between">
                    <span :class="isSameDivision(idx, Number(oppIdx)) ? 'text-cyan-400' : ''">
                      {{ scheduleTeams[Number(oppIdx)]?.name || 'Team ' + (Number(oppIdx) + 1) }}
                    </span>
                    <span class="font-medium">{{ count }}x</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ==================== SCHEDULE ANALYSIS (SOS) ==================== -->
    <template v-if="activeTool === 'sos'">
      <ScheduleAnalysis />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import ScheduleAnalysis from '@/components/ScheduleAnalysis.vue'
import { useLeagueStore } from '@/stores/league'
import { useAuthStore } from '@/stores/auth'

const leagueStore = useLeagueStore()
const authStore = useAuthStore()

const activeTool = ref<'draft' | 'schedule' | 'sos'>('draft')

// Platform detection
const currentPlatform = computed(() => leagueStore.activePlatform || null)
const isLoggedIn = computed(() => !!authStore.user?.id)
const currentLeagueName = computed(() => {
  if (!leagueStore.activeLeagueId) return ''
  const savedLeague = leagueStore.savedLeagues?.find((l: any) => l.league_id === leagueStore.activeLeagueId?.split('.l.')[1])
  return savedLeague?.league_name || leagueStore.yahooLeague?.name || 'Current League'
})

// UI state
const showSleeperImport = ref(false)
const showScheduleSleeperImport = ref(false)

// Platform teams state
const isLoadingPlatformTeams = ref(false)
const platformTeamsError = ref('')

// Draft import teams (separate from draft teams so we can select/deselect)
const draftImportTeams = ref<{ name: string; avatar: string | null; selected: boolean }[]>([])

// Schedule import teams
const scheduleImportTeams = ref<{ name: string; avatar: string | null; selected: boolean }[]>([])

// Handle image error
function handleImgError(event: Event) {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
}

// Load teams from current platform (Yahoo/Sleeper)
async function loadCurrentLeagueTeams(target: 'draft' | 'schedule') {
  if (!leagueStore.activeLeagueId) {
    platformTeamsError.value = 'No league selected'
    return
  }
  
  isLoadingPlatformTeams.value = true
  platformTeamsError.value = ''
  
  try {
    // Use yahooTeams from the store - these are already loaded when user selects a league
    const teams = leagueStore.yahooTeams
    
    if (teams && teams.length > 0) {
      const mappedTeams = teams.map((team: any) => ({
        name: team.name || 'Team',
        avatar: team.logo_url || null, // Yahoo teams use logo_url
        selected: true
      }))
      
      if (target === 'draft') {
        draftImportTeams.value = mappedTeams
      } else {
        scheduleImportTeams.value = mappedTeams
      }
    } else {
      platformTeamsError.value = 'No teams found in current league. Make sure you have a league selected.'
    }
  } catch (e: any) {
    console.error('Error loading teams:', e)
    platformTeamsError.value = e.message || 'Failed to load teams'
  } finally {
    isLoadingPlatformTeams.value = false
  }
}

// Confirm draft import - apply selected teams to draft config
function confirmDraftImport() {
  const selected = draftImportTeams.value.filter(t => t.selected)
  if (selected.length === 0) return
  
  draftConfig.value.numTeams = selected.length
  draftTeams.value = selected.map(t => ({
    name: t.name,
    balls: 1,
    avatar: t.avatar
  }))
  
  sleeperImported.value = true
  draftImportTeams.value = [] // Clear after import
  setTimeout(() => sleeperImported.value = false, 3000)
}

// Confirm schedule import - apply selected teams to schedule config
function confirmScheduleImport() {
  const selected = scheduleImportTeams.value.filter(t => t.selected)
  if (selected.length === 0) return
  
  // Adjust numTeams to be even (required for schedule generation)
  let numTeams = selected.length
  if (numTeams % 2 !== 0) {
    numTeams = numTeams - 1 // Drop the last one if odd
  }
  
  scheduleConfig.value.numTeams = numTeams
  scheduleTeams.value = selected.slice(0, numTeams).map(t => ({
    name: t.name,
    division: 0,
    avatar: t.avatar
  }))
  
  scheduleSleeperImported.value = true
  scheduleImportTeams.value = [] // Clear after import
  setTimeout(() => scheduleSleeperImported.value = false, 3000)
}

// Sleeper Integration
const sleeperUsername = ref('')
const sleeperLeagues = ref<any[]>([])
const selectedSleeperLeague = ref('')
const isLoadingSleeper = ref(false)
const sleeperImported = ref(false)
const sleeperError = ref('')

interface SleeperTeamOption {
  name: string
  avatar: string | null
  oddsIdx: number
  selected: boolean
}
const availableSleeperTeams = ref<SleeperTeamOption[]>([])

const selectedSleeperCount = computed(() => availableSleeperTeams.value.filter(t => t.selected).length)

function getAvatarUrl(avatarId: string | null): string {
  if (!avatarId) return ''
  // If it's already a full URL, return it directly
  if (avatarId.startsWith('http://') || avatarId.startsWith('https://')) {
    return avatarId
  }
  // Otherwise, treat it as a Sleeper avatar ID
  return `https://sleepercdn.com/avatars/thumbs/${avatarId}`
}

async function loadSleeperLeagues() {
  if (!sleeperUsername.value.trim()) return
  isLoadingSleeper.value = true
  sleeperError.value = ''
  sleeperLeagues.value = []
  availableSleeperTeams.value = []
  try {
    const userRes = await fetch(`https://api.sleeper.app/v1/user/${sleeperUsername.value}`)
    if (!userRes.ok) throw new Error('User not found')
    const user = await userRes.json()
    const leaguesRes = await fetch(`https://api.sleeper.app/v1/user/${user.user_id}/leagues/nfl/2024`)
    if (!leaguesRes.ok) throw new Error('Could not load leagues')
    sleeperLeagues.value = await leaguesRes.json()
  } catch (e: any) {
    sleeperError.value = e.message || 'Failed to load Sleeper data'
  } finally {
    isLoadingSleeper.value = false
  }
}

async function loadSleeperTeams() {
  if (!selectedSleeperLeague.value) return
  isLoadingSleeper.value = true
  sleeperError.value = ''
  availableSleeperTeams.value = []
  try {
    const rostersRes = await fetch(`https://api.sleeper.app/v1/league/${selectedSleeperLeague.value}/rosters`)
    if (!rostersRes.ok) throw new Error('Could not load rosters')
    const rosters = await rostersRes.json()
    const usersRes = await fetch(`https://api.sleeper.app/v1/league/${selectedSleeperLeague.value}/users`)
    if (!usersRes.ok) throw new Error('Could not load users')
    const users = await usersRes.json()
    
    availableSleeperTeams.value = rosters.map((roster: any, idx: number) => {
      const user = users.find((u: any) => u.user_id === roster.owner_id)
      return {
        name: roster.metadata?.team_name || user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`,
        avatar: user?.avatar || null,
        oddsIdx: idx,
        selected: true
      }
    })
  } catch (e: any) {
    sleeperError.value = e.message || 'Failed to load teams'
  } finally {
    isLoadingSleeper.value = false
  }
}

function toggleSleeperTeam(team: SleeperTeamOption) {
  team.selected = !team.selected
}

function selectAllSleeperTeams() {
  availableSleeperTeams.value.forEach(t => t.selected = true)
}

function deselectAllSleeperTeams() {
  availableSleeperTeams.value.forEach(t => t.selected = false)
}

function importSelectedTeams() {
  const selected = availableSleeperTeams.value.filter(t => t.selected)
  if (selected.length === 0) return
  
  draftConfig.value.numTeams = selected.length
  draftTeams.value = selected.map(t => ({
    name: t.name,
    balls: 1,
    avatar: t.avatar
  }))
  
  sleeperImported.value = true
  setTimeout(() => sleeperImported.value = false, 3000)
}

// Draft Order Generator
interface DraftTeam { name: string; balls: number; avatar?: string | null }

const draftConfig = ref({
  numTeams: 10,
  weighted: false,
  revealOrder: 'last-to-first' as 'last-to-first' | 'first-to-last'
})

const draftTeams = ref<DraftTeam[]>([])
const isAnimating = ref(false)
const showLotteryModal = ref(false)
const currentAnimationPhase = ref<'spinning' | 'reveal'>('spinning')
const currentRevealPick = ref(0)
const currentRevealTeam = ref('')
const currentRevealAvatar = ref<string | null>(null)
const revealedPicks = ref<{ pick: number; team: string; avatar?: string | null }[]>([])
const finalDraftOrder = ref<{ team: string; avatar?: string | null; pickNumber: number }[]>([])
const isDownloadingDraft = ref(false)
const isDownloadingAnimation = ref(false)
const lotteryModalRef = ref<HTMLElement | null>(null)

// Track remaining teams during animation
const drawnTeamIndices = ref<Set<number>>(new Set())

const remainingSpinnerTeams = computed(() => {
  return draftTeams.value
    .map((t, idx) => ({ ...t, originalIdx: idx }))
    .filter(t => !drawnTeamIndices.value.has(t.originalIdx))
    .slice(0, 8)
})

function getSpinnerBallStyle(index: number, total: number) {
  const angle = (index / total) * 360
  const radius = 55
  const x = Math.cos((angle - 90) * Math.PI / 180) * radius
  const y = Math.sin((angle - 90) * Math.PI / 180) * radius
  return {
    transform: `translate(${x}px, ${y}px)`,
    animationDelay: `${index * 0.08}s`
  }
}

const sortedRevealedPicks = computed(() => [...revealedPicks.value].sort((a, b) => a.pick - b.pick))
const leftColumnPicks = computed(() => {
  const half = Math.ceil(draftConfig.value.numTeams / 2)
  return sortedRevealedPicks.value.filter(p => p.pick <= half)
})
const rightColumnPicks = computed(() => {
  const half = Math.ceil(draftConfig.value.numTeams / 2)
  return sortedRevealedPicks.value.filter(p => p.pick > half)
})
const leftColumnFinal = computed(() => {
  const half = Math.ceil(finalDraftOrder.value.length / 2)
  return finalDraftOrder.value.slice(0, half)
})
const rightColumnFinal = computed(() => {
  const half = Math.ceil(finalDraftOrder.value.length / 2)
  return finalDraftOrder.value.slice(half)
})

function updateDraftTeams() {
  const target = draftConfig.value.numTeams
  while (draftTeams.value.length < target) draftTeams.value.push({ name: '', balls: 1, avatar: null })
  if (draftTeams.value.length > target) draftTeams.value = draftTeams.value.slice(0, target)
}

function getTeamOdds(teamIdx: number): number {
  const total = draftTeams.value.reduce((sum, t) => sum + t.balls, 0)
  return (draftTeams.value[teamIdx].balls / total) * 100
}

function getLiveOdds(teamIdx: number): number {
  const remaining = draftTeams.value.filter((_, idx) => !drawnTeamIndices.value.has(idx))
  const total = remaining.reduce((sum, t) => sum + t.balls, 0)
  if (total === 0) return 0
  return (draftTeams.value[teamIdx].balls / total) * 100
}

// Animation recording state
const animationFrames = ref<string[]>([])
const recordedDraftOrder = ref<{ team: string; avatar?: string | null; pickNumber: number }[]>([])

async function startLotteryAnimation() {
  isAnimating.value = true
  showLotteryModal.value = true
  revealedPicks.value = []
  finalDraftOrder.value = []
  drawnTeamIndices.value = new Set()
  animationFrames.value = []
  
  const pool: number[] = []
  draftTeams.value.forEach((team, idx) => {
    const balls = draftConfig.value.weighted ? team.balls : 1
    for (let i = 0; i < balls; i++) pool.push(idx)
  })
  
  const drawnTeams: number[] = []
  while (drawnTeams.length < draftConfig.value.numTeams) {
    const available = pool.filter(idx => !drawnTeams.includes(idx))
    if (available.length === 0) break
    const drawnIdx = available[Math.floor(Math.random() * available.length)]
    drawnTeams.push(drawnIdx)
  }
  
  const revealOrder = draftConfig.value.revealOrder === 'last-to-first'
    ? [...drawnTeams].reverse().map((teamIdx, i) => ({ teamIdx, pick: draftConfig.value.numTeams - i }))
    : drawnTeams.map((teamIdx, i) => ({ teamIdx, pick: i + 1 }))
  
  for (const { teamIdx, pick } of revealOrder) {
    currentAnimationPhase.value = 'spinning'
    await delay(1500)
    
    currentAnimationPhase.value = 'reveal'
    currentRevealPick.value = pick
    currentRevealTeam.value = draftTeams.value[teamIdx].name || `Team ${teamIdx + 1}`
    currentRevealAvatar.value = draftTeams.value[teamIdx].avatar || null
    
    await delay(500)
    
    revealedPicks.value.push({ pick, team: currentRevealTeam.value, avatar: currentRevealAvatar.value })
    drawnTeamIndices.value.add(teamIdx)
    
    await delay(1000)
  }
  
  finalDraftOrder.value = revealedPicks.value.sort((a, b) => a.pick - b.pick).map(p => ({ team: p.team, avatar: p.avatar, pickNumber: p.pick }))
  recordedDraftOrder.value = [...finalDraftOrder.value]
  isAnimating.value = false
}

function closeLotteryModal() { showLotteryModal.value = false }

async function downloadDraftOrderImage() {
  isDownloadingDraft.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const numTeams = finalDraftOrder.value.length
    const half = Math.ceil(numTeams / 2)
    const WIDTH = 600
    const COL_WIDTH = 270
    const ROW_HEIGHT = 44
    const HEIGHT = 140 + half * ROW_HEIGHT + 60
    
    // Load UFD logo
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
      } catch (e) { return '' }
    }
    
    // Create placeholder avatar
    const createPlaceholder = (name: string): string => {
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
        ctx.fillText((name || 'T').charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    // Preload all team avatars as base64
    const loadTeamAvatar = async (pick: any): Promise<{ pickNumber: number; dataUrl: string }> => {
      const avatarUrl = pick.avatar ? getAvatarUrl(pick.avatar) : null
      if (!avatarUrl) {
        return { pickNumber: pick.pickNumber, dataUrl: createPlaceholder(pick.team) }
      }
      
      // Approach 1: Try direct load with CORS
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve, reject) => {
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
              resolve(canvas.toDataURL('image/png'))
            } catch (e) { reject(e) }
          }
          img.onerror = () => reject(new Error('Failed'))
          setTimeout(() => reject(new Error('Timeout')), 3000)
        })
        img.src = avatarUrl
        const dataUrl = await loadPromise
        return { pickNumber: pick.pickNumber, dataUrl }
      } catch (e) {
        console.log(`Direct CORS failed for ${pick.team}, trying proxy...`)
      }
      
      // Approach 2: Try CORS proxy
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(avatarUrl)}`
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve, reject) => {
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
              resolve(canvas.toDataURL('image/png'))
            } catch (e) { reject(e) }
          }
          img.onerror = () => reject(new Error('Proxy failed'))
          setTimeout(() => reject(new Error('Timeout')), 5000)
        })
        img.src = proxyUrl
        const dataUrl = await loadPromise
        return { pickNumber: pick.pickNumber, dataUrl }
      } catch (e) {
        console.log(`CORS proxy failed for ${pick.team}, using placeholder`)
      }
      
      // Approach 3: Use placeholder
      return { pickNumber: pick.pickNumber, dataUrl: createPlaceholder(pick.team) }
    }
    
    const logoBase64 = await loadLogo()
    const avatarResults = await Promise.all(finalDraftOrder.value.map(loadTeamAvatar))
    const avatarMap = new Map(avatarResults.map(r => [r.pickNumber, r.dataUrl]))
    
    const container = document.createElement('div')
    container.style.cssText = `position:absolute;left:-9999px;width:${WIDTH}px;font-family:system-ui,-apple-system,sans-serif;`
    
    const leftColumn = finalDraftOrder.value.slice(0, half)
    const rightColumn = finalDraftOrder.value.slice(half)
    
    const buildRow = (pick: any) => {
      const avatarDataUrl = avatarMap.get(pick.pickNumber) || createPlaceholder(pick.team)
      const isFirst = pick.pickNumber === 1
      const numColor = isFirst ? '#eab308' : '#e5e7eb'
      return `<div style="display:flex;align-items:center;padding:8px 12px;background:rgba(58,61,82,0.3);border-radius:8px;margin-bottom:6px;">
        <div style="font-size:22px;font-weight:900;color:${numColor};width:32px;text-align:center;margin-right:10px;flex-shrink:0;">${pick.pickNumber}</div>
        <img src="${avatarDataUrl}" style="width:32px;height:32px;border-radius:50%;margin-right:10px;flex-shrink:0;object-fit:cover;" />
        <div style="font-weight:600;font-size:14px;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${pick.team}</div>
      </div>`
    }
    
    container.innerHTML = `
      <div style="background:linear-gradient(160deg,#0f1219 0%,#0a0c14 50%,#0d1117 100%);border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.5);width:${WIDTH}px;">
        <div style="background:#dc2626;padding:8px 20px;text-align:center;">
          <span style="font-size:12px;font-weight:700;color:#0a0c14;text-transform:uppercase;letter-spacing:2px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="display:flex;align-items:center;padding:14px 24px;border-bottom:1px solid rgba(220,38,38,0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height:44px;width:auto;flex-shrink:0;margin-right:14px;" />` : ''}
          <div style="flex:1;">
            <div style="font-size:22px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">🏆 Draft Order</div>
            <div style="font-size:12px;margin-top:3px;">
              <span style="color:#e5e7eb;">${numTeams} Teams</span>
              <span style="color:#6b7280;margin:0 6px;">•</span>
              <span style="color:#dc2626;font-weight:600;">${new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div style="padding:16px 20px;display:flex;gap:16px;">
          <div style="flex:1;">${leftColumn.map(p => buildRow(p)).join('')}</div>
          <div style="flex:1;">${rightColumn.map(p => buildRow(p)).join('')}</div>
        </div>
        <div style="padding:12px 20px;text-align:center;border-top:1px solid rgba(220,38,38,0.2);">
          <span style="font-size:14px;font-weight:bold;color:#dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 300))
    const canvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true, width: WIDTH })
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = `draft-order-${numTeams}teams.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (e) { console.error(e); alert('Failed to generate image') }
  finally { isDownloadingDraft.value = false }
}

async function downloadDraftAnimation() {
  if (recordedDraftOrder.value.length === 0) {
    alert('No draft order to animate. Please generate a draft order first.')
    return
  }
  
  isDownloadingAnimation.value = true
  
  try {
    const { GIFEncoder, quantize, applyPalette } = await import('https://unpkg.com/gifenc@1.0.3/dist/gifenc.esm.js')
    const html2canvas = (await import('html2canvas')).default
    
    const WIDTH = 600
    const HEIGHT = 620
    
    const order = recordedDraftOrder.value
    const numTeams = order.length
    const half = Math.ceil(numTeams / 2)
    
    // Create placeholder avatar
    const createPlaceholder = (name: string): string => {
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
        ctx.fillText((name || 'T').charAt(0).toUpperCase(), 32, 34)
      }
      return canvas.toDataURL('image/png')
    }
    
    // Preload all team avatars as base64 BEFORE generating any frames
    const loadTeamAvatar = async (pick: any): Promise<{ pickNumber: number; dataUrl: string }> => {
      const avatarUrl = pick.avatar ? getAvatarUrl(pick.avatar) : null
      if (!avatarUrl) {
        return { pickNumber: pick.pickNumber, dataUrl: createPlaceholder(pick.team) }
      }
      
      // Approach 1: Try direct load with CORS
      try {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve, reject) => {
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
              resolve(canvas.toDataURL('image/png'))
            } catch (e) { reject(e) }
          }
          img.onerror = () => reject(new Error('Failed'))
          setTimeout(() => reject(new Error('Timeout')), 3000)
        })
        img.src = avatarUrl
        const dataUrl = await loadPromise
        return { pickNumber: pick.pickNumber, dataUrl }
      } catch (e) {
        console.log(`Direct CORS failed for ${pick.team}, trying proxy...`)
      }
      
      // Approach 2: Try CORS proxy
      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(avatarUrl)}`
        const img = new Image()
        img.crossOrigin = 'anonymous'
        const loadPromise = new Promise<string>((resolve, reject) => {
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
              resolve(canvas.toDataURL('image/png'))
            } catch (e) { reject(e) }
          }
          img.onerror = () => reject(new Error('Proxy failed'))
          setTimeout(() => reject(new Error('Timeout')), 5000)
        })
        img.src = proxyUrl
        const dataUrl = await loadPromise
        return { pickNumber: pick.pickNumber, dataUrl }
      } catch (e) {
        console.log(`CORS proxy failed for ${pick.team}, using placeholder`)
      }
      
      // Approach 3: Use placeholder
      return { pickNumber: pick.pickNumber, dataUrl: createPlaceholder(pick.team) }
    }
    
    // Preload all avatars
    const avatarResults = await Promise.all(order.map(loadTeamAvatar))
    const avatarMap = new Map(avatarResults.map(r => [r.pickNumber, r.dataUrl]))
    
    const revealSequence = draftConfig.value.revealOrder === 'last-to-first'
      ? [...order].sort((a, b) => b.pickNumber - a.pickNumber)
      : [...order].sort((a, b) => a.pickNumber - b.pickNumber)
    
    const gif = GIFEncoder()
    
    const addFrame = (canvas: HTMLCanvasElement, delayMs: number) => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const imageData = ctx.getImageData(0, 0, WIDTH, HEIGHT)
      const { data } = imageData
      const palette = quantize(data, 256)
      const index = applyPalette(data, palette)
      gif.writeFrame(index, WIDTH, HEIGHT, { palette, delay: delayMs })
    }
    
    // Build row using preloaded avatars
    const buildRow = (p: any, highlight: boolean = false) => {
      const avatarDataUrl = avatarMap.get(p.pickNumber) || createPlaceholder(p.team)
      const isFirst = p.pickNumber === 1
      const numColor = isFirst ? '#eab308' : (highlight ? '#22c55e' : '#e5e7eb')
      const bgStyle = highlight ? 'background:rgba(34,197,94,0.2);border:2px solid #22c55e;' : 'background:rgba(58,61,82,0.3);'
      return `<div style="display:flex;align-items:center;padding:6px 10px;border-radius:8px;margin-bottom:5px;${bgStyle}">
        <div style="font-size:20px;font-weight:900;color:${numColor};width:28px;text-align:center;margin-right:8px;flex-shrink:0;">${p.pickNumber}</div>
        <img src="${avatarDataUrl}" style="width:28px;height:28px;border-radius:50%;margin-right:8px;flex-shrink:0;object-fit:cover;" />
        <div style="font-weight:600;font-size:13px;color:#ffffff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.team}</div>
      </div>`
    }
    
    // Title frame
    const titleFrame = document.createElement('div')
    titleFrame.style.cssText = `position:absolute;left:-9999px;width:${WIDTH}px;height:${HEIGHT}px;font-family:system-ui;`
    titleFrame.innerHTML = `
      <div style="width:100%;height:100%;background:linear-gradient(160deg,#0f1219 0%,#0a0c14 50%,#0d1117 100%);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">
        <div style="background:#dc2626;padding:8px 20px;text-align:center;">
          <span style="font-size:12px;font-weight:700;color:#0a0c14;text-transform:uppercase;letter-spacing:2px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <div style="font-size:80px;margin-bottom:20px;">🎱</div>
          <div style="font-size:36px;font-weight:900;color:#ffffff;text-transform:uppercase;">Draft Lottery</div>
          <div style="font-size:16px;color:#9ca3af;margin-top:12px;">${numTeams} Teams</div>
        </div>
        <div style="padding:12px 20px;text-align:center;border-top:1px solid rgba(220,38,38,0.2);">
          <span style="font-size:14px;font-weight:bold;color:#dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    document.body.appendChild(titleFrame)
    let canvas = await html2canvas(titleFrame, { backgroundColor: '#0a0c14', scale: 1, width: WIDTH, height: HEIGHT })
    addFrame(canvas, 2000)
    document.body.removeChild(titleFrame)
    
    // Reveal frames
    const revealed: typeof order = []
    for (const pick of revealSequence) {
      revealed.push(pick)
      const sorted = [...revealed].sort((a, b) => a.pickNumber - b.pickNumber)
      const left = sorted.filter(p => p.pickNumber <= half)
      const right = sorted.filter(p => p.pickNumber > half)
      
      const frame = document.createElement('div')
      frame.style.cssText = `position:absolute;left:-9999px;width:${WIDTH}px;height:${HEIGHT}px;font-family:system-ui;`
      frame.innerHTML = `
        <div style="width:100%;height:100%;background:linear-gradient(160deg,#0f1219 0%,#0a0c14 50%,#0d1117 100%);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">
          <div style="background:#dc2626;padding:8px 20px;text-align:center;">
            <span style="font-size:12px;font-weight:700;color:#0a0c14;text-transform:uppercase;letter-spacing:2px;">Ultimate Fantasy Dashboard</span>
          </div>
          <div style="padding:14px 24px;border-bottom:1px solid rgba(220,38,38,0.2);text-align:center;">
            <div style="font-size:13px;color:#9ca3af;">Pick #${pick.pickNumber} Revealed</div>
            <div style="font-size:22px;font-weight:900;color:#ffffff;margin-top:4px;">${pick.team}</div>
          </div>
          <div style="flex:1;padding:12px 20px;display:flex;gap:16px;overflow:hidden;">
            <div style="flex:1;">${left.map(p => buildRow(p, p.pickNumber === pick.pickNumber)).join('')}</div>
            <div style="flex:1;">${right.map(p => buildRow(p, p.pickNumber === pick.pickNumber)).join('')}</div>
          </div>
          <div style="padding:10px 20px;text-align:center;border-top:1px solid rgba(220,38,38,0.2);display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:#6b7280;">${revealed.length} of ${numTeams} revealed</span>
            <span style="font-size:14px;font-weight:bold;color:#dc2626;">ultimatefantasydashboard.com</span>
          </div>
        </div>
      `
      document.body.appendChild(frame)
      await new Promise(r => setTimeout(r, 100))
      canvas = await html2canvas(frame, { backgroundColor: '#0a0c14', scale: 1, width: WIDTH, height: HEIGHT, useCORS: true, allowTaint: true })
      addFrame(canvas, 1500)
      document.body.removeChild(frame)
    }
    
    // Final frame
    const finalFrame = document.createElement('div')
    const leftFinal = order.slice(0, half)
    const rightFinal = order.slice(half)
    
    finalFrame.style.cssText = `position:absolute;left:-9999px;width:${WIDTH}px;height:${HEIGHT}px;font-family:system-ui;`
    finalFrame.innerHTML = `
      <div style="width:100%;height:100%;background:linear-gradient(160deg,#0f1219 0%,#0a0c14 50%,#0d1117 100%);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;">
        <div style="background:#dc2626;padding:8px 20px;text-align:center;">
          <span style="font-size:12px;font-weight:700;color:#0a0c14;text-transform:uppercase;letter-spacing:2px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="padding:14px 24px;border-bottom:1px solid rgba(220,38,38,0.2);text-align:center;">
          <div style="font-size:26px;font-weight:900;color:#ffffff;">🏆 Final Draft Order</div>
          <div style="font-size:12px;color:#9ca3af;margin-top:4px;">${numTeams} Teams</div>
        </div>
        <div style="flex:1;padding:12px 20px;display:flex;gap:16px;overflow:hidden;">
          <div style="flex:1;">${leftFinal.map(p => buildRow(p)).join('')}</div>
          <div style="flex:1;">${rightFinal.map(p => buildRow(p)).join('')}</div>
        </div>
        <div style="padding:10px 20px;text-align:center;border-top:1px solid rgba(220,38,38,0.2);">
          <span style="font-size:14px;font-weight:bold;color:#dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    document.body.appendChild(finalFrame)
    await new Promise(r => setTimeout(r, 100))
    canvas = await html2canvas(finalFrame, { backgroundColor: '#0a0c14', scale: 1, width: WIDTH, height: HEIGHT, useCORS: true, allowTaint: true })
    addFrame(canvas, 5000)
    document.body.removeChild(finalFrame)
    
    // Finish and download
    gif.finish()
    const bytes = gif.bytes()
    const blob = new Blob([bytes], { type: 'image/gif' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `draft-lottery-${numTeams}teams.gif`
    link.href = url
    link.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Animation download failed:', e)
    alert('Failed to generate animation. Please try again.')
  } finally {
    isDownloadingAnimation.value = false
  }
}

function delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }

// ==================== SCHEDULE GENERATOR ====================
interface ScheduleTeam { name: string; division: number; avatar?: string | null }
interface Division { name: string }
interface ScheduleFormat {
  id: string
  icon: string
  title: string
  subtitle: string
  divisions: number
  divisionSize: number
  divisionOpponents: number
  nonDivisionOpponents: number
  divisionGames: number
  nonDivisionGames: number
  totalGames: number
  isPerfect: boolean
  isRecommended: boolean
  isDivisionOnly: boolean
  isRivalryMode: boolean
  needsSelection: boolean
  selectionType: 'extra' | 'exclude' | null
  selectionsNeeded: number
  selectionInfo: string
}

const scheduleStep = ref(0)
const scheduleSteps = [
  { title: 'Setup' },
  { title: 'Format' },
  { title: 'Divisions' },
  { title: 'Schedule' }
]

const scheduleConfig = ref({
  numTeams: 12,
  numWeeks: 22,
  numDivisions: 0,
  divisionGames: 2,
  divisions: [] as Division[]
})

const scheduleTeams = ref<ScheduleTeam[]>([])
const generatedSchedule = ref<number[][]>([])
const isGeneratingSchedule = ref(false)
const isDownloadingSchedule = ref(false)

const availableFormats = ref<ScheduleFormat[]>([])
const selectedFormat = ref<ScheduleFormat | null>(null)

// Sleeper import state for schedule generator
const scheduleSleeperUsername = ref('')
const scheduleSleeperLeagues = ref<any[]>([])
const selectedScheduleSleeperLeague = ref('')
const isLoadingScheduleSleeper = ref(false)
const scheduleSleeperError = ref('')
const scheduleSleeperImported = ref(false)

// Rivalry pairing state
const rivalryPairings = ref<Record<number, number>>({}) // teamIndex -> pairedTeamIndex
const selectedRivalryTeamA = ref<number | null>(null)
const selectedRivalryTeamB = ref<number | null>(null)

const divisionColors = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899']

// Sleeper import functions for schedule generator
function getScheduleAvatarUrl(avatarId: string | null): string {
  if (!avatarId) return ''
  // If it's already a full URL, return it directly
  if (avatarId.startsWith('http://') || avatarId.startsWith('https://')) {
    return avatarId
  }
  // Otherwise, treat it as a Sleeper avatar ID
  return `https://sleepercdn.com/avatars/thumbs/${avatarId}`
}

async function loadScheduleSleeperLeagues() {
  if (!scheduleSleeperUsername.value.trim()) return
  isLoadingScheduleSleeper.value = true
  scheduleSleeperError.value = ''
  scheduleSleeperLeagues.value = []
  scheduleSleeperImported.value = false
  try {
    const userRes = await fetch(`https://api.sleeper.app/v1/user/${scheduleSleeperUsername.value}`)
    if (!userRes.ok) throw new Error('User not found')
    const user = await userRes.json()
    const leaguesRes = await fetch(`https://api.sleeper.app/v1/user/${user.user_id}/leagues/nfl/2024`)
    if (!leaguesRes.ok) throw new Error('Could not load leagues')
    scheduleSleeperLeagues.value = await leaguesRes.json()
  } catch (e: any) {
    scheduleSleeperError.value = e.message || 'Failed to load Sleeper data'
  } finally {
    isLoadingScheduleSleeper.value = false
  }
}

async function loadScheduleSleeperTeams() {
  if (!selectedScheduleSleeperLeague.value) return
  isLoadingScheduleSleeper.value = true
  scheduleSleeperError.value = ''
  try {
    const rostersRes = await fetch(`https://api.sleeper.app/v1/league/${selectedScheduleSleeperLeague.value}/rosters`)
    if (!rostersRes.ok) throw new Error('Could not load rosters')
    const rosters = await rostersRes.json()
    const usersRes = await fetch(`https://api.sleeper.app/v1/league/${selectedScheduleSleeperLeague.value}/users`)
    if (!usersRes.ok) throw new Error('Could not load users')
    const users = await usersRes.json()
    
    const teams = rosters.map((roster: any) => {
      const user = users.find((u: any) => u.user_id === roster.owner_id)
      return {
        name: roster.metadata?.team_name || user?.metadata?.team_name || user?.display_name || `Team ${roster.roster_id}`,
        avatar: user?.avatar || null,
        division: 0
      }
    })
    
    // Update team count and teams
    const teamCount = teams.length
    // Round to nearest even number if odd
    const adjustedCount = teamCount % 2 === 0 ? teamCount : teamCount - 1
    
    if (adjustedCount >= 6 && adjustedCount <= 16) {
      scheduleConfig.value.numTeams = adjustedCount
      scheduleTeams.value = teams.slice(0, adjustedCount)
      scheduleSleeperImported.value = true
      generateScheduleFormats()
      setTimeout(() => scheduleSleeperImported.value = false, 3000)
    } else {
      scheduleSleeperError.value = `League has ${teamCount} teams. Schedule generator supports 6-16 teams (even numbers only).`
    }
  } catch (e: any) {
    scheduleSleeperError.value = e.message || 'Failed to load teams'
  } finally {
    isLoadingScheduleSleeper.value = false
  }
}

// Generate all available schedule formats based on team count and weeks
function generateScheduleFormats() {
  const n = scheduleConfig.value.numTeams
  const w = scheduleConfig.value.numWeeks
  const formats: ScheduleFormat[] = []
  
  // Possible division counts for this team count
  const possibleDivs = [0] // No divisions always available
  if (n % 2 === 0 && n >= 4) possibleDivs.push(2)
  if (n % 3 === 0 && n >= 6) possibleDivs.push(3)
  if (n % 4 === 0 && n >= 8) possibleDivs.push(4)
  if (n % 5 === 0 && n >= 10) possibleDivs.push(5)
  if (n % 6 === 0 && n >= 12) possibleDivs.push(6)
  if (n % 7 === 0 && n >= 14) possibleDivs.push(7)
  if (n % 8 === 0 && n >= 16) possibleDivs.push(8)
  
  for (const numDivs of possibleDivs) {
    if (numDivs === 0) {
      // No divisions - calculate options
      const opponents = n - 1
      const baseGames = Math.floor(w / opponents)
      const extraGames = w % opponents
      
      if (baseGames >= 1) {
        const isPerfect = extraGames === 0
        formats.push({
          id: `no-div-${baseGames}x`,
          icon: '🎲',
          title: 'No Divisions',
          subtitle: `Play all ${opponents} opponents ${baseGames}x${extraGames > 0 ? ` (+${extraGames} extra)` : ''}`,
          divisions: 0,
          divisionSize: n,
          divisionOpponents: 0,
          nonDivisionOpponents: opponents,
          divisionGames: 0,
          nonDivisionGames: baseGames,
          totalGames: w,
          isPerfect,
          isRecommended: isPerfect && baseGames >= 1,
          isDivisionOnly: false,
          isRivalryMode: false,
          needsSelection: !isPerfect,
          selectionType: extraGames > 0 ? 'extra' : null,
          selectionsNeeded: extraGames,
          selectionInfo: extraGames > 0 ? `Select ${extraGames} opponent(s) to play ${baseGames + 1}x instead of ${baseGames}x` : ''
        })
      }
    } else {
      // With divisions
      const divSize = n / numDivs
      const divOpponents = divSize - 1
      const nonDivOpponents = n - divSize
      
      // Try different division game counts
      for (let divGames = 1; divGames <= Math.min(Math.floor(w / divOpponents), 15); divGames++) {
        const divWeeks = divOpponents * divGames
        const remainingWeeks = w - divWeeks
        
        if (remainingWeeks < 0) continue
        
        // Calculate non-division games
        if (remainingWeeks === 0) {
          // Division only
          formats.push({
            id: `${numDivs}div-${divGames}x-only`,
            icon: '🏟️',
            title: `${numDivs} Divisions (${divSize} teams each)`,
            subtitle: `Division only - play rivals ${divGames}x each`,
            divisions: numDivs,
            divisionSize: divSize,
            divisionOpponents: divOpponents,
            nonDivisionOpponents: nonDivOpponents,
            divisionGames: divGames,
            nonDivisionGames: 0,
            totalGames: w,
            isPerfect: true,
            isRecommended: false,
            isDivisionOnly: true,
            isRivalryMode: divGames >= 5,
            needsSelection: false,
            selectionType: null,
            selectionsNeeded: 0,
            selectionInfo: ''
          })
        } else if (nonDivOpponents > 0) {
          const baseNonDivGames = Math.floor(remainingWeeks / nonDivOpponents)
          const extraNonDivGames = remainingWeeks % nonDivOpponents
          
          if (baseNonDivGames >= 1 || (baseNonDivGames === 0 && remainingWeeks > 0)) {
            const actualBaseGames = baseNonDivGames > 0 ? baseNonDivGames : 1
            const isPerfect = extraNonDivGames === 0 && baseNonDivGames >= 1
            const needsExclusion = baseNonDivGames === 0 && remainingWeeks < nonDivOpponents
            const exclusionsNeeded = needsExclusion ? nonDivOpponents - remainingWeeks : 0
            
            // Skip if we'd need to exclude too many teams
            if (exclusionsNeeded > nonDivOpponents / 2) continue
            
            const selectionType = needsExclusion ? 'exclude' : (extraNonDivGames > 0 ? 'extra' : null)
            const selectionsNeeded = needsExclusion ? exclusionsNeeded : extraNonDivGames
            
            let selectionInfo = ''
            if (needsExclusion) {
              selectionInfo = `Select ${exclusionsNeeded} non-division team(s) to NOT play`
            } else if (extraNonDivGames > 0) {
              selectionInfo = `Select ${extraNonDivGames} non-division team(s) to play ${baseNonDivGames + 1}x instead of ${baseNonDivGames}x`
            }
            
            // Determine if this is a good recommended option
            const isRecommended = isPerfect && divGames >= 2 && baseNonDivGames >= 1
            
            formats.push({
              id: `${numDivs}div-${divGames}x-${baseNonDivGames}x`,
              icon: '🏟️',
              title: `${numDivs} Divisions (${divSize} teams each)`,
              subtitle: `Division ${divGames}x, Non-division ${needsExclusion ? 'partial' : baseNonDivGames + 'x'}${extraNonDivGames > 0 ? ` (+${extraNonDivGames})` : ''}`,
              divisions: numDivs,
              divisionSize: divSize,
              divisionOpponents: divOpponents,
              nonDivisionOpponents: nonDivOpponents,
              divisionGames: divGames,
              nonDivisionGames: baseNonDivGames,
              totalGames: w,
              isPerfect,
              isRecommended,
              isDivisionOnly: false,
              isRivalryMode: divGames >= 5,
              needsSelection: selectionType !== null,
              selectionType,
              selectionsNeeded,
              selectionInfo
            })
          }
        }
      }
    }
  }
  
  // Sort: Perfect & Recommended first, then by divisions, then by division games
  formats.sort((a, b) => {
    if (a.isRecommended !== b.isRecommended) return a.isRecommended ? -1 : 1
    if (a.isPerfect !== b.isPerfect) return a.isPerfect ? -1 : 1
    if (a.divisions !== b.divisions) return a.divisions - b.divisions
    return b.divisionGames - a.divisionGames
  })
  
  // Limit to reasonable number of options
  availableFormats.value = formats.slice(0, 15)
  
  // Auto-select first recommended or first perfect
  const recommended = formats.find(f => f.isRecommended)
  const perfect = formats.find(f => f.isPerfect)
  selectedFormat.value = recommended || perfect || formats[0] || null
}

function selectScheduleFormat(format: ScheduleFormat) {
  selectedFormat.value = format
  
  // Update config based on selected format
  scheduleConfig.value.numDivisions = format.divisions
  scheduleConfig.value.divisionGames = format.divisionGames
  
  // Setup divisions
  setupScheduleDivisions()
  
  // Clear rivalry pairings
  rivalryPairings.value = {}
  selectedRivalryTeamA.value = null
  selectedRivalryTeamB.value = null
}

function proceedFromFormatSelection() {
  if (!selectedFormat.value) return
  scheduleStep.value = 2
}

// Computed values for divisions
const possibleDivisions = computed(() => {
  const n = scheduleConfig.value.numTeams
  const divs: number[] = []
  if (n % 2 === 0 && n >= 4) divs.push(2)
  if (n % 3 === 0 && n >= 6) divs.push(3)
  if (n % 4 === 0 && n >= 8) divs.push(4)
  return divs
})

const divisionSize = computed(() => {
  if (!selectedFormat.value || selectedFormat.value.divisions === 0) return scheduleConfig.value.numTeams
  return selectedFormat.value.divisionSize
})

const divisionOpponents = computed(() => {
  if (!selectedFormat.value) return 0
  return selectedFormat.value.divisionOpponents
})

const nonDivisionOpponents = computed(() => {
  if (!selectedFormat.value) return scheduleConfig.value.numTeams - 1
  return selectedFormat.value.nonDivisionOpponents
})

const selectionType = computed(() => {
  return selectedFormat.value?.selectionType || null
})

const requiredPairings = computed(() => {
  if (!selectedFormat.value?.needsSelection) return 0
  return selectedFormat.value.selectionsNeeded
})

const rivalryPairingsComplete = computed(() => {
  if (!selectedFormat.value?.needsSelection) return true
  
  if (selectedFormat.value.divisions === 2) {
    // For 2 divisions, check that all Div A teams have an opponent selected
    return divisionATeams.value.every(team => rivalryPairings.value[team.index] !== undefined)
  }
  
  // For other cases, check count
  return Object.keys(rivalryPairings.value).length >= requiredPairings.value
})

const canGenerateSchedule = computed(() => {
  if (!selectedFormat.value) return false
  if (selectedFormat.value.divisions > 0 && !divisionsBalanced.value) return false
  if (selectedFormat.value.needsSelection && !rivalryPairingsComplete.value) return false
  return true
})

// Division balance check
const divisionCounts = computed(() => {
  if (!selectedFormat.value || selectedFormat.value.divisions === 0) return []
  const counts = Array(selectedFormat.value.divisions).fill(0)
  scheduleTeams.value.forEach(t => {
    if (t.division >= 0 && t.division < counts.length) {
      counts[t.division]++
    }
  })
  return counts
})

const divisionsBalanced = computed(() => {
  if (!selectedFormat.value || selectedFormat.value.divisions === 0) return true
  const expected = selectedFormat.value.divisionSize
  return divisionCounts.value.every(c => c === expected)
})

const divisionGamesTotal = computed(() => {
  if (!selectedFormat.value) return 0
  return selectedFormat.value.divisionOpponents * selectedFormat.value.divisionGames
})

// Teams by division
const divisionATeams = computed(() => {
  return scheduleTeams.value
    .map((t, i) => ({ ...t, index: i }))
    .filter(t => t.division === 0)
})

const divisionBTeams = computed(() => {
  return scheduleTeams.value
    .map((t, i) => ({ ...t, index: i }))
    .filter(t => t.division === 1)
})

function getTeamsInDivision(divIdx: number) {
  return scheduleTeams.value
    .map((t, i) => ({ ...t, index: i }))
    .filter(t => t.division === divIdx)
}

// Rivalry pairing helpers
const rivalryPairingTitle = computed(() => {
  if (!selectedFormat.value) return ''
  if (selectionType.value === 'exclude') {
    return 'Assign Teams to NOT Play'
  }
  return 'Assign Extra Matchups (Rivalries)'
})

const rivalryPairingDescription = computed(() => {
  if (!selectedFormat.value) return ''
  const count = requiredPairings.value
  if (selectionType.value === 'exclude') {
    return `Each team in ${scheduleConfig.value.divisions[0]?.name || 'Division 1'} needs to select one opponent from ${scheduleConfig.value.divisions[1]?.name || 'Division 2'} that they will NOT play.`
  }
  return `Each team in ${scheduleConfig.value.divisions[0]?.name || 'Division 1'} needs to select one opponent from ${scheduleConfig.value.divisions[1]?.name || 'Division 2'} to play an extra game against.`
})

function getTeamName(index: number): string {
  return scheduleTeams.value[index]?.name || `Team ${index + 1}`
}

function getRivalryPair(teamIndex: number): number | null {
  return rivalryPairings.value[teamIndex] ?? null
}

function getRivalryPairReverse(teamIndex: number): number | null {
  for (const [key, value] of Object.entries(rivalryPairings.value)) {
    if (value === teamIndex) return parseInt(key)
  }
  return null
}

function isTeamAvailableForPairing(teamIndex: number): boolean {
  // Check if this team is already paired (either direction)
  if (rivalryPairings.value[teamIndex] !== undefined) return false
  if (getRivalryPairReverse(teamIndex) !== null) return false
  return true
}

// Check if a Division B team has reached their max pairings
function isOpponentFullyPaired(oppIndex: number, excludeTeamIndex: number): boolean {
  // For the 2-division setup, we allow any Div B team to be selected multiple times
  // The schedule generator will handle making sure the matchups are reciprocal
  // So we don't limit selections here - return false to allow all selections
  return false
}

// Get the list of Div A teams that have selected a given Div B team
function getDivBTeamPairings(divBTeamIndex: number): string {
  const pairedTeams: string[] = []
  for (const [teamIdx, pairedOpp] of Object.entries(rivalryPairings.value)) {
    if (pairedOpp === divBTeamIndex) {
      pairedTeams.push(getTeamName(parseInt(teamIdx)))
    }
  }
  return pairedTeams.join(', ')
}

// Set pairing for 2-division setup
function setRivalryPairingTwoDiv(teamIndex: number, opponentIndexStr: string) {
  if (opponentIndexStr === '') {
    delete rivalryPairings.value[teamIndex]
  } else {
    const oppIndex = parseInt(opponentIndexStr)
    rivalryPairings.value[teamIndex] = oppIndex
  }
  rivalryPairings.value = { ...rivalryPairings.value }
}

function selectRivalryTeam(teamIndex: number, divisionSide: 0 | 1) {
  if (divisionSide === 0) {
    // Division A team selected
    if (selectedRivalryTeamA.value === teamIndex) {
      selectedRivalryTeamA.value = null
    } else if (getRivalryPair(teamIndex) === null) {
      selectedRivalryTeamA.value = teamIndex
      selectedRivalryTeamB.value = null
      
      // If we already have enough pairings, don't allow more
      if (Object.keys(rivalryPairings.value).length >= requiredPairings.value) {
        selectedRivalryTeamA.value = null
      }
    }
  } else {
    // Division B team selected
    if (selectedRivalryTeamA.value !== null && isTeamAvailableForPairing(teamIndex)) {
      // Create pairing
      rivalryPairings.value[selectedRivalryTeamA.value] = teamIndex
      rivalryPairings.value = { ...rivalryPairings.value } // Trigger reactivity
      selectedRivalryTeamA.value = null
      selectedRivalryTeamB.value = null
    }
  }
}

function getAvailableOpponents(teamIndex: number, teamDivision: number) {
  // Get non-division opponents that aren't already paired
  return scheduleTeams.value
    .map((t, i) => ({ ...t, index: i }))
    .filter(t => {
      if (t.division === teamDivision) return false // Same division
      if (t.index === teamIndex) return false // Self
      if (rivalryPairings.value[t.index] !== undefined) return false // Already has pairing
      if (getRivalryPairReverse(t.index) !== null) return false // Is paired to someone
      return true
    })
}

function getAvailableOpponentsNoDivision(teamIndex: number) {
  return scheduleTeams.value
    .map((t, i) => ({ ...t, index: i }))
    .filter(t => {
      if (t.index === teamIndex) return false
      if (rivalryPairings.value[t.index] !== undefined) return false
      if (getRivalryPairReverse(t.index) !== null) return false
      return true
    })
}

function setRivalryPairing(teamIndex: number, opponentIndexStr: string) {
  if (opponentIndexStr === '') {
    // Remove pairing
    delete rivalryPairings.value[teamIndex]
  } else {
    const oppIndex = parseInt(opponentIndexStr)
    rivalryPairings.value[teamIndex] = oppIndex
  }
  rivalryPairings.value = { ...rivalryPairings.value }
}

function randomizeRivalryPairings() {
  rivalryPairings.value = {}
  
  if (!selectedFormat.value) return
  
  if (selectedFormat.value.divisions === 2) {
    // For 2 divisions, each Div A team picks a random Div B team
    const divA = [...divisionATeams.value]
    const divB = [...divisionBTeams.value]
    shuffle(divB)
    
    // Each Div A team gets assigned a Div B opponent
    for (let i = 0; i < divA.length; i++) {
      rivalryPairings.value[divA[i].index] = divB[i % divB.length].index
    }
  } else if (selectedFormat.value.divisions === 0) {
    // No divisions - random pairings
    const teams = scheduleTeams.value.map((t, i) => i)
    shuffle(teams)
    
    const needed = requiredPairings.value
    for (let i = 0; i < needed * 2 && i < teams.length - 1; i += 2) {
      rivalryPairings.value[teams[i]] = teams[i + 1]
    }
  } else {
    // 3+ divisions - each team picks a random cross-division opponent
    const allTeams = scheduleTeams.value.map((t, i) => ({ index: i, division: t.division }))
    
    for (const team of allTeams) {
      // Find available opponents from other divisions
      const opponents = allTeams.filter(t => t.division !== team.division)
      if (opponents.length > 0) {
        const randomOpp = opponents[Math.floor(Math.random() * opponents.length)]
        rivalryPairings.value[team.index] = randomOpp.index
      }
    }
  }
  
  rivalryPairings.value = { ...rivalryPairings.value }
}

function clearRivalryPairings() {
  rivalryPairings.value = {}
  selectedRivalryTeamA.value = null
  selectedRivalryTeamB.value = null
}

// Functions
function onTeamsChange() {
  updateScheduleTeams()
  generateScheduleFormats()
}

function updateScheduleTeams() {
  const target = scheduleConfig.value.numTeams
  while (scheduleTeams.value.length < target) {
    scheduleTeams.value.push({ 
      name: '', 
      division: 0
    })
  }
  if (scheduleTeams.value.length > target) {
    scheduleTeams.value = scheduleTeams.value.slice(0, target)
  }
}

function setupScheduleDivisions() {
  const numDiv = selectedFormat.value?.divisions || 0
  scheduleConfig.value.numDivisions = numDiv
  
  if (numDiv === 0) {
    scheduleConfig.value.divisions = []
    scheduleTeams.value.forEach(t => t.division = 0)
    return
  }
  
  const defaults = ['East', 'West', 'North', 'South', 'Central', 'Atlantic', 'Pacific', 'Mountain']
  scheduleConfig.value.divisions = []
  for (let i = 0; i < numDiv; i++) {
    scheduleConfig.value.divisions.push({ 
      name: defaults[i] || `Division ${i + 1}` 
    })
  }
  
  // Auto-assign teams to divisions evenly
  const perDiv = scheduleConfig.value.numTeams / numDiv
  scheduleTeams.value.forEach((t, i) => t.division = Math.floor(i / perDiv))
}

function isSameDivision(team1: number, team2: number): boolean {
  if (!selectedFormat.value || selectedFormat.value.divisions === 0) return false
  return scheduleTeams.value[team1]?.division === scheduleTeams.value[team2]?.division
}

function getMatchupClass(teamIdx: number, week: number): string {
  const opp = generatedSchedule.value[teamIdx]?.[week]
  if (opp === undefined || opp === -1) return 'text-dark-textMuted'
  if (isSameDivision(teamIdx, opp)) {
    return 'bg-primary/10 text-primary font-medium'
  }
  return 'text-dark-text'
}

function getOpponentName(idx: number, wk: number): string {
  const opp = generatedSchedule.value[idx]?.[wk]
  if (opp === undefined || opp === -1) return '—'
  return scheduleTeams.value[opp]?.name || 'Team ' + (opp + 1)
}

function getOpponentCounts(teamIdx: number): Record<number, number> {
  const counts: Record<number, number> = {}
  const schedule = generatedSchedule.value[teamIdx]
  if (!schedule) return counts
  
  schedule.forEach(opp => {
    if (opp >= 0) {
      counts[opp] = (counts[opp] || 0) + 1
    }
  })
  
  return counts
}

// Main schedule generation
function generateSchedule() {
  if (!selectedFormat.value) return
  
  isGeneratingSchedule.value = true
  const n = scheduleConfig.value.numTeams
  const w = scheduleConfig.value.numWeeks
  
  // Initialize empty schedule
  generatedSchedule.value = Array(n).fill(null).map(() => Array(w).fill(-1))
  
  setTimeout(() => {
    const format = selectedFormat.value!
    
    // Build matchup requirements
    const matchupsNeeded: Map<string, number> = new Map()
    
    if (format.divisions === 0) {
      // No divisions
      const baseGames = format.nonDivisionGames
      const extraPairs = new Set<string>()
      
      // Add extra games from rivalry pairings
      for (const [teamA, teamB] of Object.entries(rivalryPairings.value)) {
        const a = parseInt(teamA)
        const key = a < teamB ? `${a}-${teamB}` : `${teamB}-${a}`
        extraPairs.add(key)
      }
      
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const key = `${i}-${j}`
          let games = baseGames
          if (extraPairs.has(key)) {
            games = baseGames + 1
          }
          matchupsNeeded.set(key, games)
        }
      }
    } else {
      // With divisions
      const divGames = format.divisionGames
      const nonDivGames = format.nonDivisionGames
      
      // Group teams by division
      const divisions: number[][] = Array(format.divisions).fill(null).map(() => [])
      scheduleTeams.value.forEach((t, i) => divisions[t.division].push(i))
      
      // Division matchups
      for (let d = 0; d < format.divisions; d++) {
        const divTeams = divisions[d]
        for (let i = 0; i < divTeams.length; i++) {
          for (let j = i + 1; j < divTeams.length; j++) {
            const key = `${divTeams[i]}-${divTeams[j]}`
            matchupsNeeded.set(key, divGames)
          }
        }
      }
      
      // Non-division matchups
      if (nonDivGames > 0 || format.needsSelection) {
        // Build set of extra/excluded pairs
        const specialPairs = new Set<string>()
        for (const [teamA, teamB] of Object.entries(rivalryPairings.value)) {
          const a = parseInt(teamA)
          const key = a < teamB ? `${a}-${teamB}` : `${teamB}-${a}`
          specialPairs.add(key)
        }
        
        for (let d1 = 0; d1 < format.divisions; d1++) {
          for (let d2 = d1 + 1; d2 < format.divisions; d2++) {
            for (const t1 of divisions[d1]) {
              for (const t2 of divisions[d2]) {
                const key = t1 < t2 ? `${t1}-${t2}` : `${t2}-${t1}`
                
                let games = nonDivGames
                if (specialPairs.has(key)) {
                  if (format.selectionType === 'exclude') {
                    games = 0
                  } else {
                    games = nonDivGames + 1
                  }
                }
                
                if (games > 0) {
                  matchupsNeeded.set(key, games)
                }
              }
            }
          }
        }
      }
    }
    
    scheduleMatchups(matchupsNeeded)
    isGeneratingSchedule.value = false
  }, 300)
}

function scheduleMatchups(matchupsNeeded: Map<string, number>) {
  const n = scheduleConfig.value.numTeams
  const w = scheduleConfig.value.numWeeks
  
  // Convert to list of matchups
  const allMatchups: [number, number][] = []
  matchupsNeeded.forEach((count, key) => {
    const [a, b] = key.split('-').map(Number)
    for (let i = 0; i < count; i++) {
      allMatchups.push([a, b])
    }
  })
  
  // Shuffle for randomness
  shuffle(allMatchups)
  
  // Try to place each matchup
  const lastPlayedWeek: Map<string, number> = new Map()
  
  for (const [team1, team2] of allMatchups) {
    const key = `${Math.min(team1, team2)}-${Math.max(team1, team2)}`
    const lastWeek = lastPlayedWeek.get(key) ?? -2
    
    // Find best week for this matchup (avoiding back-to-back)
    let bestWeek = -1
    let bestScore = -Infinity
    
    for (let wk = 0; wk < w; wk++) {
      if (generatedSchedule.value[team1][wk] !== -1) continue
      if (generatedSchedule.value[team2][wk] !== -1) continue
      
      // Skip if this would be back-to-back
      if (Math.abs(wk - lastWeek) <= 1) continue
      
      const distFromLast = Math.abs(wk - lastWeek)
      const score = distFromLast
      
      if (score > bestScore) {
        bestScore = score
        bestWeek = wk
      }
    }
    
    // If no week found avoiding back-to-back, find any available week
    if (bestWeek === -1) {
      for (let wk = 0; wk < w; wk++) {
        if (generatedSchedule.value[team1][wk] === -1 && 
            generatedSchedule.value[team2][wk] === -1 &&
            Math.abs(wk - lastWeek) > 1) {
          bestWeek = wk
          break
        }
      }
    }
    
    // Last resort - any available week
    if (bestWeek === -1) {
      for (let wk = 0; wk < w; wk++) {
        if (generatedSchedule.value[team1][wk] === -1 && 
            generatedSchedule.value[team2][wk] === -1) {
          bestWeek = wk
          break
        }
      }
    }
    
    if (bestWeek !== -1) {
      generatedSchedule.value[team1][bestWeek] = team2
      generatedSchedule.value[team2][bestWeek] = team1
      lastPlayedWeek.set(key, bestWeek)
    }
  }
  
  // Fill any remaining empty slots
  for (let wk = 0; wk < w; wk++) {
    const unpaired: number[] = []
    for (let t = 0; t < n; t++) {
      if (generatedSchedule.value[t][wk] === -1) {
        unpaired.push(t)
      }
    }
    
    shuffle(unpaired)
    for (let i = 0; i < unpaired.length - 1; i += 2) {
      generatedSchedule.value[unpaired[i]][wk] = unpaired[i + 1]
      generatedSchedule.value[unpaired[i + 1]][wk] = unpaired[i]
    }
  }
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
}

function downloadScheduleCSV() {
  const n = scheduleConfig.value.numTeams
  const w = scheduleConfig.value.numWeeks
  
  let csv = 'Team'
  for (let wk = 1; wk <= w; wk++) csv += `,Week ${wk}`
  csv += '\n'
  
  scheduleTeams.value.forEach((team, idx) => {
    csv += `"${team.name || 'Team ' + (idx + 1)}"`
    for (let wk = 0; wk < w; wk++) {
      csv += `,"${getOpponentName(idx, wk)}"`
    }
    csv += '\n'
  })
  
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = `schedule-${n}teams-${w}weeks.csv`
  link.href = url
  link.click()
  URL.revokeObjectURL(url)
}

async function downloadScheduleImage() {
  isDownloadingSchedule.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const n = scheduleConfig.value.numTeams, w = scheduleConfig.value.numWeeks
    const CELL_WIDTH = 70
    const WIDTH = 200 + w * CELL_WIDTH + 48
    const HEIGHT = 180 + n * 44 + 60
    
    // Load UFD logo
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
      } catch (e) { return '' }
    }
    
    const logoBase64 = await loadLogo()
    
    const container = document.createElement('div')
    container.style.cssText = `position:absolute;left:-9999px;width:${WIDTH}px;font-family:system-ui,-apple-system,sans-serif;`
    
    let hdr = '<th style="padding:10px;text-align:left;background:rgba(58,61,82,0.5);font-weight:bold;color:#f7f7ff;min-width:180px;position:sticky;left:0;">Team</th>'
    for (let i = 0; i < w; i++) hdr += `<th style="padding:8px;text-align:center;background:rgba(58,61,82,0.5);font-weight:bold;color:#f7f7ff;min-width:${CELL_WIDTH}px;font-size:11px;">Wk ${i+1}</th>`
    
    let rows = ''
    scheduleTeams.value.forEach((t, idx) => {
      const avatarImg = t.avatar 
        ? `<img src="${getScheduleAvatarUrl(t.avatar)}" style="width:24px;height:24px;border-radius:50%;margin-right:8px;object-fit:cover;" crossorigin="anonymous" />` 
        : `<div style="width:24px;height:24px;border-radius:50%;background:#3a3d52;margin-right:8px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:10px;">${(t.name || 'T').charAt(0)}</div>`
      const divBadge = selectedFormat.value && selectedFormat.value.divisions > 0 
        ? `<span style="font-size:9px;padding:2px 6px;border-radius:9999px;background:${divisionColors[t.division]};color:white;margin-left:6px;">${scheduleConfig.value.divisions[t.division]?.name || 'D'+(t.division+1)}</span>` 
        : ''
      let cells = `<td style="padding:8px;background:rgba(38,42,58,0.3);border-bottom:1px solid rgba(58,61,82,0.3);"><div style="display:flex;align-items:center;">${avatarImg}<span style="font-weight:600;color:#f7f7ff;font-size:12px;">${t.name || 'Team '+(idx+1)}</span>${divBadge}</div></td>`
      for (let wk = 0; wk < w; wk++) {
        const opp = generatedSchedule.value[idx]?.[wk]
        const isDivGame = opp >= 0 && isSameDivision(idx, opp)
        const bgColor = isDivGame ? 'rgba(220,38,38,0.15)' : 'rgba(38,42,58,0.15)'
        const textColor = isDivGame ? '#dc2626' : '#d1d5db'
        cells += `<td style="padding:8px;text-align:center;background:${bgColor};border-bottom:1px solid rgba(58,61,82,0.3);color:${textColor};font-weight:${isDivGame ? '600' : '400'};font-size:11px;">${getOpponentName(idx, wk)}</td>`
      }
      rows += `<tr>${cells}</tr>`
    })
    
    const title = selectedFormat.value && selectedFormat.value.divisions > 0 
      ? `League Schedule (${selectedFormat.value.divisions} Divisions)` 
      : 'League Schedule'
    
    container.innerHTML = `
      <div style="background:linear-gradient(160deg,#0f1219 0%,#0a0c14 50%,#0d1117 100%);border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,0.5);">
        <div style="background:#dc2626;padding:8px 20px;text-align:center;">
          <span style="font-size:12px;font-weight:700;color:#0a0c14;text-transform:uppercase;letter-spacing:2px;">Ultimate Fantasy Dashboard</span>
        </div>
        <div style="display:flex;align-items:center;padding:12px 20px;border-bottom:1px solid rgba(220,38,38,0.2);">
          ${logoBase64 ? `<img src="${logoBase64}" style="height:40px;width:auto;flex-shrink:0;margin-right:12px;" />` : ''}
          <div style="flex:1;">
            <div style="font-size:20px;font-weight:900;color:#ffffff;text-transform:uppercase;letter-spacing:0.5px;">📅 ${title}</div>
            <div style="font-size:12px;margin-top:2px;">
              <span style="color:#e5e7eb;">${n} Teams • ${w} Weeks</span>
              <span style="color:#6b7280;margin:0 4px;">•</span>
              <span style="color:#22c55e;font-weight:600;">No Back-to-Back Games</span>
            </div>
          </div>
        </div>
        <div style="padding:16px 20px;overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;"><thead><tr>${hdr}</tr></thead><tbody>${rows}</tbody></table>
        </div>
        <div style="padding:12px 20px;text-align:center;border-top:1px solid rgba(220,38,38,0.2);">
          <span style="font-size:14px;font-weight:bold;color:#dc2626;">ultimatefantasydashboard.com</span>
        </div>
      </div>
    `
    
    document.body.appendChild(container)
    await new Promise(r => setTimeout(r, 200)) // Allow images to load
    const canvas = await html2canvas(container, { backgroundColor: '#0a0c14', scale: 2, useCORS: true, allowTaint: true })
    document.body.removeChild(container)
    
    const link = document.createElement('a')
    link.download = `schedule-${n}teams-${w}weeks.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  } catch (e) { console.error(e); alert('Failed to generate image') }
  finally { isDownloadingSchedule.value = false }
}

// Initialize
updateDraftTeams()
updateScheduleTeams()
generateScheduleFormats()
</script>

<style scoped>
.lottery-spinner { position: relative; width: 100%; height: 100%; animation: spin 0.6s linear infinite; }
.lottery-ball { position: absolute; top: 50%; left: 50%; margin-top: -18px; margin-left: -18px; animation: pulse 0.4s ease-in-out infinite alternate; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes pulse { from { transform: scale(1); } to { transform: scale(1.1); } }
.animate-bounce-in { animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }
@keyframes bounceIn { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
</style>
