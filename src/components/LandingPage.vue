<template>
  <div class="min-h-screen" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <!-- Hero Section -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl"></div>
      </div>
      
      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
        <div class="flex justify-center mb-8">
          <img src="/ufd-logo.png" alt="Ultimate Fantasy Dashboard" class="w-28 h-28 sm:w-36 sm:h-36" />
        </div>
        
        <!-- Sport Selector -->
        <div class="flex flex-wrap items-center justify-center gap-3 mb-8">
          <span class="text-gray-400 text-sm">Available for:</span>
          <router-link
            v-for="sport in sports"
            :key="sport.id"
            :to="'/' + sport.id"
            class="flex items-center gap-2 px-4 py-2 rounded-full border transition-all hover:scale-105"
            :class="[
              sport.id === 'football' 
                ? 'bg-primary/20 border-primary text-primary' 
                : 'bg-dark-card/50 border-dark-border text-gray-300 hover:border-primary/50'
            ]"
          >
            <span class="text-lg">{{ sport.emoji }}</span>
            <span class="font-medium">{{ sport.name }}</span>
          </router-link>
        </div>
        
        <h1 class="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
          The Ultimate Fantasy Sports<br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-300 to-primary">Dashboard Experience</span>
        </h1>
        
        <p class="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Beautiful, shareable dashboards that <span class="text-white font-medium">increase league engagement</span>, 
          powerful projections to <span class="text-white font-medium">make better lineup decisions</span>, 
          and comprehensive history tracking for <span class="text-white font-medium">every milestone in your league's journey</span>.
        </p>
        
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <button @click="$emit('openSignup')" class="px-8 py-4 rounded-xl bg-primary text-gray-900 font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105">
            Create Free Account
          </button>
          <button @click="scrollToDemo" class="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-lg hover:bg-white/10 transition-all">
            See Demo ↓
          </button>
        </div>
      </div>
    </section>

    <!-- Feature 1: Shareable Dashboards -->
    <section class="py-20 border-t border-dark-border/30">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 mb-4">
              <span class="text-cyan-400 text-sm font-medium">📊 Shareable Dashboards</span>
            </div>
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Trash Talk with Data</h2>
            <p class="text-gray-400 text-lg mb-6 leading-relaxed">Generate stunning, shareable graphics for every matchup, power ranking, and weekly highlight. Fuel your league's group chat with beautiful visualizations that spark engagement.</p>
            <ul class="space-y-3 text-gray-300">
              <li class="flex items-center gap-3"><span class="text-cyan-400">✓</span>One-click shareable matchup previews</li>
              <li class="flex items-center gap-3"><span class="text-cyan-400">✓</span>Win probability charts and comparisons</li>
              <li class="flex items-center gap-3"><span class="text-cyan-400">✓</span>Weekly power rankings with trend indicators</li>
            </ul>
          </div>
          <div class="relative">
            <div class="bg-dark-card rounded-2xl border border-dark-border p-4 shadow-2xl">
              <div class="bg-dark-bg/50 rounded-xl p-4 space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center text-xl">🎯</div>
                    <div><div class="font-bold text-white">Mahomes Magic</div><div class="text-sm text-gray-400">9-3 • 1,456.2 PF</div></div>
                  </div>
                  <div class="text-2xl font-bold text-green-400">68%</div>
                </div>
                <div class="h-3 rounded-full bg-dark-border overflow-hidden"><div class="h-full w-[68%] rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"></div></div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-xl">👑</div>
                    <div><div class="font-bold text-white">Kelce Kingdom</div><div class="text-sm text-gray-400">7-5 • 1,389.4 PF</div></div>
                  </div>
                  <div class="text-2xl font-bold text-gray-400">32%</div>
                </div>
              </div>
              <div class="mt-3 flex gap-2">
                <button class="flex-1 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium">Share Preview</button>
                <button class="flex-1 py-2 rounded-lg bg-dark-border text-gray-300 text-sm font-medium">Share Comparison</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 2: Projections -->
    <section class="py-20 border-t border-dark-border/30 bg-dark-bg/30">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="order-2 lg:order-1 relative">
            <div class="bg-dark-card rounded-2xl border border-dark-border p-4 shadow-2xl">
              <div class="space-y-2">
                <div class="flex items-center justify-between p-3 rounded-lg bg-dark-bg/50 border-l-4 border-green-500">
                  <div class="flex items-center gap-3"><span class="text-xs font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded">RB</span><div><div class="font-semibold text-white text-sm">Saquon Barkley</div><div class="text-xs text-gray-400">PHI • vs DAL</div></div></div>
                  <div class="text-right"><div class="font-bold text-green-400">A+</div><div class="text-xs text-gray-400">23.4 proj</div></div>
                </div>
                <div class="flex items-center justify-between p-3 rounded-lg bg-dark-bg/50 border-l-4 border-blue-500">
                  <div class="flex items-center gap-3"><span class="text-xs font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded">WR</span><div><div class="font-semibold text-white text-sm">Ja'Marr Chase</div><div class="text-xs text-gray-400">CIN • vs CLE</div></div></div>
                  <div class="text-right"><div class="font-bold text-green-400">A</div><div class="text-xs text-gray-400">21.8 proj</div></div>
                </div>
                <div class="flex items-center justify-between p-3 rounded-lg bg-dark-bg/50 border-l-4 border-yellow-500">
                  <div class="flex items-center gap-3"><span class="text-xs font-bold bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">TE</span><div><div class="font-semibold text-white text-sm">Brock Bowers</div><div class="text-xs text-gray-400">LV • @ KC</div></div></div>
                  <div class="text-right"><div class="font-bold text-cyan-400">B+</div><div class="text-xs text-gray-400">14.2 proj</div></div>
                </div>
              </div>
              <div class="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/30"><div class="text-xs text-gray-400 mb-1">Suggested Lineup Total</div><div class="text-xl font-bold text-primary">156.8 pts</div></div>
            </div>
          </div>
          <div class="order-1 lg:order-2">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 mb-4">
              <span class="text-orange-400 text-sm font-medium">📈 Smart Projections</span>
            </div>
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Make Better Lineup Decisions</h2>
            <p class="text-gray-400 text-lg mb-6 leading-relaxed">View rest-of-season projections by team, weekly projections with matchup context, and start/sit recommendations. Use our data-backed projections or <span class="text-white font-medium">import your own from your favorite analyst</span>.</p>
            <ul class="space-y-3 text-gray-300">
              <li class="flex items-center gap-3"><span class="text-orange-400">✓</span>Rest-of-season team rankings with grades</li>
              <li class="flex items-center gap-3"><span class="text-orange-400">✓</span>Weekly start/sit helper with recommendations</li>
              <li class="flex items-center gap-3"><span class="text-orange-400">✓</span>Import custom projections from any source</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 3: League History -->
    <section class="py-20 border-t border-dark-border/30">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 mb-4">
              <span class="text-purple-400 text-sm font-medium">🏆 League History</span>
            </div>
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Every Milestone, Forever</h2>
            <p class="text-gray-400 text-lg mb-6 leading-relaxed">Track your league's complete history across every season. Celebrate when you become the team with the most all-time wins, or set a new record for points scored. <span class="text-white font-medium">Share awards for all-time, seasonal, and weekly achievements</span>.</p>
            <ul class="space-y-3 text-gray-300">
              <li class="flex items-center gap-3"><span class="text-purple-400">✓</span>All-time records and milestones</li>
              <li class="flex items-center gap-3"><span class="text-purple-400">✓</span>Championship history and trophy case</li>
              <li class="flex items-center gap-3"><span class="text-purple-400">✓</span>Weekly awards: best/worst performances</li>
            </ul>
          </div>
          <div class="relative">
            <div class="bg-dark-card rounded-2xl border border-dark-border p-4 shadow-2xl">
              <div class="grid grid-cols-2 gap-3 mb-4">
                <div class="bg-dark-bg/50 rounded-xl p-3 text-center"><div class="text-2xl mb-1">🏆</div><div class="text-xl font-bold text-primary">3x</div><div class="text-xs text-gray-400">Championships</div></div>
                <div class="bg-dark-bg/50 rounded-xl p-3 text-center"><div class="text-2xl mb-1">📊</div><div class="text-xl font-bold text-white">847</div><div class="text-xs text-gray-400">Games Played</div></div>
              </div>
              <div class="bg-dark-bg/50 rounded-xl p-3"><div class="text-xs text-gray-400 mb-2">🎉 Recent Milestone</div><div class="text-sm text-white font-medium">Mahomes Magic passed CMC Express for most all-time wins (98)!</div><div class="text-xs text-primary mt-1">Week 12, 2024</div></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 4: Analysis -->
    <section class="py-20 border-t border-dark-border/30 bg-dark-bg/30">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div class="order-2 lg:order-1 relative">
            <div class="bg-dark-card rounded-2xl border border-dark-border p-4 shadow-2xl">
              <div class="space-y-3">
                <div class="bg-dark-bg/50 rounded-xl p-3"><div class="flex items-center justify-between mb-2"><span class="text-xs font-bold text-green-400 bg-green-500/20 px-2 py-0.5 rounded">TRADE WIN</span><span class="text-xs text-gray-400">Week 6, 2024</span></div><div class="flex items-center justify-between text-sm"><div class="text-gray-300">Sent: D. Henry</div><div class="text-gray-300">Got: J. Chase + 2nd</div></div><div class="text-xs text-green-400 mt-1">+42.3 pts value gained</div></div>
                <div class="bg-dark-bg/50 rounded-xl p-3"><div class="flex items-center justify-between mb-2"><span class="text-xs font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded">WAIVER STEAL</span><span class="text-xs text-gray-400">Week 4, 2024</span></div><div class="text-sm text-gray-300">Added: Brock Bowers (TE)</div><div class="text-xs text-cyan-400 mt-1">TE3 ROS • 156.2 pts scored</div></div>
                <div class="bg-dark-bg/50 rounded-xl p-3"><div class="flex items-center justify-between mb-2"><span class="text-xs font-bold text-primary bg-primary/20 px-2 py-0.5 rounded">DRAFT PICK</span><span class="text-xs text-gray-400">Rd 1, Pick 3</span></div><div class="text-sm text-gray-300">Ja'Marr Chase • WR1</div><div class="text-xs text-primary mt-1">Best value pick of draft (+38.2 ADP)</div></div>
              </div>
            </div>
          </div>
          <div class="order-1 lg:order-2">
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30 mb-4">
              <span class="text-green-400 text-sm font-medium">🔍 Deep Analysis</span>
            </div>
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Track Every Move That Matters</h2>
            <p class="text-gray-400 text-lg mb-6 leading-relaxed">Analyze trades, draft picks, and waiver wire pickups to ensure you're making the best moves. See which decisions made the <span class="text-white font-medium">biggest impact over time</span> across every season.</p>
            <ul class="space-y-3 text-gray-300">
              <li class="flex items-center gap-3"><span class="text-green-400">✓</span>Trade analyzer with value comparison</li>
              <li class="flex items-center gap-3"><span class="text-green-400">✓</span>Draft grades and value-over-ADP</li>
              <li class="flex items-center gap-3"><span class="text-green-400">✓</span>Waiver wire impact tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 5: Tools -->
    <section class="py-20 border-t border-dark-border/30">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 mb-4">
              <span class="text-primary text-sm font-medium">🛠️ Powerful Tools</span>
            </div>
            <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">League Commissioner's Dream</h2>
            <p class="text-gray-400 text-lg mb-6 leading-relaxed">Powerful, beautiful tools that make running your league easier. Generate custom schedules, determine draft order fairly, and analyze <span class="text-white font-medium">strength of schedule for every position</span>.</p>
            <ul class="space-y-3 text-gray-300">
              <li class="flex items-center gap-3"><span class="text-primary">✓</span>Custom schedule generator with division support</li>
              <li class="flex items-center gap-3"><span class="text-primary">✓</span>Draft order generator (weighted or random)</li>
              <li class="flex items-center gap-3"><span class="text-primary">✓</span>Strength of schedule analysis by position</li>
            </ul>
          </div>
          <div class="relative">
            <div class="bg-dark-card rounded-2xl border border-dark-border p-4 shadow-2xl">
              <div class="grid grid-cols-2 gap-3">
                <div class="bg-dark-bg/50 rounded-xl p-4 text-center hover:bg-dark-border/30 transition-colors cursor-pointer"><div class="text-3xl mb-2">📅</div><div class="text-sm font-semibold text-white">Schedule Generator</div><div class="text-xs text-gray-400 mt-1">Custom matchups</div></div>
                <div class="bg-dark-bg/50 rounded-xl p-4 text-center hover:bg-dark-border/30 transition-colors cursor-pointer"><div class="text-3xl mb-2">🎲</div><div class="text-sm font-semibold text-white">Draft Order</div><div class="text-xs text-gray-400 mt-1">Fair randomization</div></div>
                <div class="bg-dark-bg/50 rounded-xl p-4 text-center hover:bg-dark-border/30 transition-colors cursor-pointer"><div class="text-3xl mb-2">📊</div><div class="text-sm font-semibold text-white">SoS Analysis</div><div class="text-xs text-gray-400 mt-1">By position</div></div>
                <div class="bg-dark-bg/50 rounded-xl p-4 text-center hover:bg-dark-border/30 transition-colors cursor-pointer"><div class="text-3xl mb-2">🏆</div><div class="text-sm font-semibold text-white">Playoff Bracket</div><div class="text-xs text-gray-400 mt-1">Visual tracker</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-16 border-t border-dark-border/30 bg-gradient-to-b from-dark-bg/50 to-transparent">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to See It In Action?</h2>
        <p class="text-gray-400 text-lg mb-8">Explore a fully-functional demo with sample league data below, or create your free account to connect your own Sleeper league.</p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button @click="$emit('openSignup')" class="px-8 py-4 rounded-xl bg-primary text-gray-900 font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">Create Free Account</button>
          <button @click="scrollToDemo" class="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-lg hover:bg-white/10 transition-all">Explore Demo Below ↓</button>
        </div>
      </div>
    </section>

    <!-- Live Demo Section -->
    <section id="live-demo" class="border-t border-primary/30 bg-dark-bg/50">
      <div class="max-w-7xl mx-auto">
        <div class="text-center py-8 border-b border-dark-border/50 bg-gradient-to-b from-primary/5 to-transparent">
          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
            <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span class="text-primary text-sm font-medium">Live Demo</span>
          </div>
          <h2 class="text-2xl sm:text-3xl font-bold text-white mb-2">Interactive Demo Dashboard</h2>
          <p class="text-gray-400">Explore all features with sample league data • Click any tab to navigate</p>
        </div>
        
        <div class="min-h-[800px]">
          <div class="bg-dark-card border-b border-dark-border px-4 py-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3"><img src="/ufd-logo.png" alt="UFD" class="w-8 h-8" /><span class="font-bold text-white hidden sm:inline">Ultimate Fantasy Dashboard</span></div>
              <div class="flex items-center gap-1 overflow-x-auto">
                <button v-for="tab in demoNavTabs" :key="tab.id" @click="activeDemoView = tab.id" class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap" :class="activeDemoView === tab.id ? 'bg-primary text-gray-900' : 'text-gray-400 hover:text-white hover:bg-dark-border/50'">{{ tab.name }}</button>
              </div>
              <div class="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-medium">Demo Mode</div>
            </div>
          </div>

          <div class="p-6 bg-dark-bg min-h-[700px]">
            <!-- Home View -->
            <div v-if="activeDemoView === 'home'" class="space-y-6">
              <div class="flex items-center justify-between"><h1 class="text-2xl font-bold text-white">League of Record</h1><div class="text-sm text-gray-400">Week 15 • 2024 Season</div></div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-dark-card rounded-xl p-4 border border-dark-border"><div class="text-sm text-gray-400 mb-1">Your Record</div><div class="text-2xl font-bold text-white">10-4</div><div class="text-sm text-green-400">2nd Place</div></div>
                <div class="bg-dark-card rounded-xl p-4 border border-dark-border"><div class="text-sm text-gray-400 mb-1">Points For</div><div class="text-2xl font-bold text-white">1,587.4</div><div class="text-sm text-primary">League Leader</div></div>
                <div class="bg-dark-card rounded-xl p-4 border border-dark-border"><div class="text-sm text-gray-400 mb-1">This Week</div><div class="text-2xl font-bold text-green-400">W 142-128</div><div class="text-sm text-gray-400">vs Kelce Kingdom</div></div>
              </div>
              <div class="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
                <div class="px-4 py-3 border-b border-dark-border"><h3 class="font-semibold text-white">Week 15 Matchups</h3></div>
                <div class="divide-y divide-dark-border">
                  <div v-for="matchup in demoMatchups.slice(0, 3)" :key="matchup.id" class="p-4 flex items-center justify-between">
                    <div class="flex items-center gap-3"><div class="w-10 h-10 rounded-full flex items-center justify-center" :style="{ background: matchup.team1.color }">{{ matchup.team1.emoji }}</div><div><div class="font-medium text-white text-sm">{{ matchup.team1.name }}</div><div class="text-lg font-bold" :class="matchup.team1.score > matchup.team2.score ? 'text-green-400' : 'text-white'">{{ matchup.team1.score }}</div></div></div>
                    <div class="text-gray-500 font-bold text-sm">VS</div>
                    <div class="flex items-center gap-3"><div class="text-right"><div class="font-medium text-white text-sm">{{ matchup.team2.name }}</div><div class="text-lg font-bold" :class="matchup.team2.score > matchup.team1.score ? 'text-green-400' : 'text-white'">{{ matchup.team2.score }}</div></div><div class="w-10 h-10 rounded-full flex items-center justify-center" :style="{ background: matchup.team2.color }">{{ matchup.team2.emoji }}</div></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Power Rankings View -->
            <div v-if="activeDemoView === 'power'" class="space-y-4">
              <h1 class="text-2xl font-bold text-white">Power Rankings</h1>
              <div v-for="(team, index) in demoTeams" :key="team.name" class="flex items-center gap-4 p-4 rounded-xl bg-dark-card border border-dark-border">
                <div class="text-2xl font-bold w-8" :class="index < 3 ? 'text-primary' : 'text-gray-500'">{{ index + 1 }}</div>
                <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl" :style="{ background: team.color }">{{ team.emoji }}</div>
                <div class="flex-1"><div class="font-semibold text-white">{{ team.name }}</div><div class="text-sm text-gray-400">{{ team.record }}</div></div>
                <div class="text-right"><div class="text-lg font-bold text-white">{{ team.powerScore }}</div><div class="text-xs text-gray-400">Power Score</div></div>
                <div class="w-32 h-2 rounded-full bg-dark-border overflow-hidden"><div class="h-full rounded-full bg-gradient-to-r from-primary to-yellow-500" :style="{ width: `${team.powerScore}%` }"></div></div>
              </div>
            </div>

            <!-- Matchups View -->
            <div v-if="activeDemoView === 'matchups'" class="space-y-4">
              <h1 class="text-2xl font-bold text-white">Week 15 Matchups</h1>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="matchup in demoMatchups" :key="matchup.id" class="p-4 rounded-xl bg-dark-card border border-dark-border">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3"><div class="w-12 h-12 rounded-full flex items-center justify-center" :style="{ background: matchup.team1.color }">{{ matchup.team1.emoji }}</div><div><div class="font-semibold text-white text-sm">{{ matchup.team1.name }}</div><div class="text-2xl font-bold" :class="matchup.team1.score > matchup.team2.score ? 'text-green-400' : 'text-white'">{{ matchup.team1.score }}</div></div></div>
                    <div class="text-gray-500 font-bold">VS</div>
                    <div class="flex items-center gap-3"><div class="text-right"><div class="font-semibold text-white text-sm">{{ matchup.team2.name }}</div><div class="text-2xl font-bold" :class="matchup.team2.score > matchup.team1.score ? 'text-green-400' : 'text-white'">{{ matchup.team2.score }}</div></div><div class="w-12 h-12 rounded-full flex items-center justify-center" :style="{ background: matchup.team2.color }">{{ matchup.team2.emoji }}</div></div>
                  </div>
                  <div class="mt-3 flex gap-2"><button class="flex-1 py-2 rounded-lg bg-primary/20 text-primary text-sm font-medium">View Details</button><button class="flex-1 py-2 rounded-lg bg-dark-border text-gray-300 text-sm font-medium">Share</button></div>
                </div>
              </div>
            </div>

            <!-- History View -->
            <div v-if="activeDemoView === 'history'" class="space-y-6">
              <h1 class="text-2xl font-bold text-white">League History</h1>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-dark-card rounded-xl p-4 text-center border border-dark-border"><div class="text-3xl mb-2">🏆</div><div class="text-2xl font-bold text-primary">6</div><div class="text-sm text-gray-400">Seasons</div></div>
                <div class="bg-dark-card rounded-xl p-4 text-center border border-dark-border"><div class="text-3xl mb-2">📊</div><div class="text-2xl font-bold text-white">847</div><div class="text-sm text-gray-400">Games Played</div></div>
                <div class="bg-dark-card rounded-xl p-4 text-center border border-dark-border"><div class="text-3xl mb-2">🔥</div><div class="text-2xl font-bold text-white">198.4</div><div class="text-sm text-gray-400">All-Time High</div></div>
                <div class="bg-dark-card rounded-xl p-4 text-center border border-dark-border"><div class="text-3xl mb-2">👑</div><div class="text-2xl font-bold text-white">12</div><div class="text-sm text-gray-400">Active Managers</div></div>
              </div>
              <div class="bg-dark-card rounded-xl p-4 border border-dark-border">
                <h4 class="font-semibold text-white mb-4">Championship History</h4>
                <div class="space-y-3">
                  <div v-for="champ in demoChampions" :key="champ.year" class="flex items-center justify-between p-3 rounded-lg bg-dark-bg/50">
                    <div class="flex items-center gap-3"><span class="text-primary font-bold">{{ champ.year }}</span><div class="w-8 h-8 rounded-full flex items-center justify-center" :style="{ background: champ.color }">{{ champ.emoji }}</div><span class="text-white font-medium">{{ champ.team }}</span></div>
                    <span class="text-gray-400 text-sm">{{ champ.score }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tools View -->
            <div v-if="activeDemoView === 'tools'" class="space-y-4">
              <h1 class="text-2xl font-bold text-white">League Tools</h1>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="bg-dark-card rounded-xl p-6 border border-dark-border hover:border-primary/50 transition-colors cursor-pointer"><div class="text-4xl mb-3">📅</div><h3 class="text-lg font-bold text-white mb-2">Schedule Generator</h3><p class="text-gray-400 text-sm">Create custom league schedules with division support.</p></div>
                <div class="bg-dark-card rounded-xl p-6 border border-dark-border hover:border-primary/50 transition-colors cursor-pointer"><div class="text-4xl mb-3">🎲</div><h3 class="text-lg font-bold text-white mb-2">Draft Order Generator</h3><p class="text-gray-400 text-sm">Generate fair draft orders with weighted or random options.</p></div>
                <div class="bg-dark-card rounded-xl p-6 border border-dark-border hover:border-primary/50 transition-colors cursor-pointer"><div class="text-4xl mb-3">📊</div><h3 class="text-lg font-bold text-white mb-2">Strength of Schedule</h3><p class="text-gray-400 text-sm">Analyze schedule difficulty by position for every team.</p></div>
                <div class="bg-dark-card rounded-xl p-6 border border-dark-border hover:border-primary/50 transition-colors cursor-pointer"><div class="text-4xl mb-3">🔄</div><h3 class="text-lg font-bold text-white mb-2">Trade Analyzer</h3><p class="text-gray-400 text-sm">Evaluate trades with projected values and fairness scores.</p></div>
                <div class="bg-dark-card rounded-xl p-6 border border-dark-border hover:border-primary/50 transition-colors cursor-pointer"><div class="text-4xl mb-3">🏆</div><h3 class="text-lg font-bold text-white mb-2">Playoff Bracket</h3><p class="text-gray-400 text-sm">Visual playoff bracket with live updates.</p></div>
                <div class="bg-dark-card rounded-xl p-6 border border-dark-border hover:border-primary/50 transition-colors cursor-pointer"><div class="text-4xl mb-3">📈</div><h3 class="text-lg font-bold text-white mb-2">Performance Compare</h3><p class="text-gray-400 text-sm">Compare teams head-to-head across any time period.</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="py-20 border-t border-dark-border/50 bg-gradient-to-b from-dark-bg/50 to-transparent">
      <div class="max-w-3xl mx-auto px-4 text-center">
        <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Transform Your League?</h2>
        <p class="text-gray-400 mb-8">Join thousands of fantasy managers using Ultimate Fantasy Dashboard.</p>
        <button @click="$emit('openSignup')" class="px-10 py-4 rounded-xl bg-primary text-gray-900 font-bold text-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105">Create Your Free Account</button>
        <p class="text-gray-500 text-sm mt-4">No credit card required • Works with Sleeper leagues</p>
      </div>
    </section>

    <footer class="border-t border-dark-border/50 py-8">
      <div class="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">© 2024 Ultimate Fantasy Dashboard. All rights reserved.</div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineEmits<{ (e: 'openSignup'): void }>()

const sports = [
  { id: 'football', name: 'Football', emoji: '🏈' },
  { id: 'baseball', name: 'Baseball', emoji: '⚾' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'hockey', name: 'Hockey', emoji: '🏒' }
]

const activeDemoView = ref('home')

const demoNavTabs = [
  { id: 'home', name: 'Home' },
  { id: 'power', name: 'Rankings' },
  { id: 'matchups', name: 'Matchups' },
  { id: 'history', name: 'History' },
  { id: 'tools', name: 'Tools' }
]

const demoTeams = [
  { name: 'Mahomes Magic', record: '10-4', powerScore: 94, emoji: '🎯', color: '#ef4444' },
  { name: 'CMC Express', record: '9-5', powerScore: 89, emoji: '🚂', color: '#3b82f6' },
  { name: 'Hill Climbers', record: '9-5', powerScore: 86, emoji: '⛰️', color: '#22c55e' },
  { name: 'Kelce Kingdom', record: '8-6', powerScore: 82, emoji: '👑', color: '#a855f7' },
  { name: 'Chase Chasers', record: '8-6', powerScore: 78, emoji: '🏃', color: '#f97316' },
  { name: 'Jefferson Flyers', record: '7-7', powerScore: 75, emoji: '✈️', color: '#06b6d4' }
]

const demoMatchups = [
  { id: 1, team1: { name: 'Mahomes Magic', score: 142.5, emoji: '🎯', color: '#ef4444' }, team2: { name: 'Kelce Kingdom', score: 128.3, emoji: '👑', color: '#a855f7' } },
  { id: 2, team1: { name: 'CMC Express', score: 156.8, emoji: '🚂', color: '#3b82f6' }, team2: { name: 'Hill Climbers', score: 134.2, emoji: '⛰️', color: '#22c55e' } },
  { id: 3, team1: { name: 'Chase Chasers', score: 118.9, emoji: '🏃', color: '#f97316' }, team2: { name: 'Jefferson Flyers', score: 145.6, emoji: '✈️', color: '#06b6d4' } },
  { id: 4, team1: { name: 'Burrow Bros', score: 131.2, emoji: '🦁', color: '#eab308' }, team2: { name: 'Allen Army', score: 127.8, emoji: '⚡', color: '#8b5cf6' } }
]

const demoChampions = [
  { year: '2024', team: 'In Progress', emoji: '🏈', color: '#6b7280', score: 'Playoffs Week 1' },
  { year: '2023', team: 'Mahomes Magic', emoji: '🎯', color: '#ef4444', score: '168.4 - 142.1' },
  { year: '2022', team: 'CMC Express', emoji: '🚂', color: '#3b82f6', score: '156.2 - 148.9' },
  { year: '2021', team: 'Hill Climbers', emoji: '⛰️', color: '#22c55e', score: '172.8 - 155.3' },
  { year: '2020', team: 'Mahomes Magic', emoji: '🎯', color: '#ef4444', score: '165.2 - 152.8' }
]

function scrollToDemo() {
  document.getElementById('live-demo')?.scrollIntoView({ behavior: 'smooth' })
}
</script>
