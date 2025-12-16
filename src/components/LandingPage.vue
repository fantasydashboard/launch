<template>
  <div class="min-h-screen" style="background: radial-gradient(circle at top, #1c2030, #05060a 55%);">
    <!-- Hero Section -->
    <section class="relative overflow-hidden">
      <!-- Background Glow -->
      <div class="absolute inset-0 overflow-hidden">
        <div class="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl"></div>
      </div>
      
      <div class="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <!-- Badge -->
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8">
          <span class="text-primary text-sm font-medium">🏈 Powered by Sleeper API</span>
        </div>
        
        <!-- Main Headline -->
        <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
          The Only Fantasy Football<br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary via-yellow-300 to-primary">Dashboard You'll Ever Need</span>
        </h1>
        
        <!-- Subheadline -->
        <p class="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
          Elegant, modern charts and deep analytics that <span class="text-white font-medium">increase league engagement</span>, 
          give you the <span class="text-white font-medium">data edge over your leaguemates</span>, 
          reveal <span class="text-white font-medium">strengths and weaknesses of every team</span>, 
          help you <span class="text-white font-medium">identify trade targets</span>, and so much more.
        </p>
        
        <!-- CTA Buttons -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            @click="$emit('openSignup')"
            class="px-8 py-4 rounded-xl bg-primary text-gray-900 font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105"
          >
            Create Free Account
          </button>
          <a
            href="#demo"
            class="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-semibold text-lg hover:bg-white/10 transition-all"
          >
            See Demo ↓
          </a>
        </div>
        
        <!-- Feature Pills -->
        <div class="flex flex-wrap justify-center gap-3">
          <div class="px-4 py-2 rounded-full bg-dark-card/50 border border-dark-border text-sm text-gray-300">
            📊 Power Rankings
          </div>
          <div class="px-4 py-2 rounded-full bg-dark-card/50 border border-dark-border text-sm text-gray-300">
            📈 Advanced Projections
          </div>
          <div class="px-4 py-2 rounded-full bg-dark-card/50 border border-dark-border text-sm text-gray-300">
            🏆 League History
          </div>
          <div class="px-4 py-2 rounded-full bg-dark-card/50 border border-dark-border text-sm text-gray-300">
            🔄 Trade Analyzer
          </div>
          <div class="px-4 py-2 rounded-full bg-dark-card/50 border border-dark-border text-sm text-gray-300">
            📋 Draft Grades
          </div>
        </div>
      </div>
    </section>

    <!-- Demo Section -->
    <section id="demo" class="py-16 border-t border-dark-border/50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-10">
          <h2 class="text-3xl font-bold text-white mb-3">See What You'll Get</h2>
          <p class="text-gray-400">Explore our demo league to preview all features</p>
        </div>
        
        <!-- Demo Navigation -->
        <div class="flex justify-center mb-8">
          <div class="inline-flex items-center gap-2 bg-dark-bg/50 rounded-full p-1.5 border border-dark-border">
            <button
              v-for="tab in demoTabs"
              :key="tab.id"
              @click="activeDemoTab = tab.id"
              class="px-5 py-2 text-sm font-semibold rounded-full transition-all duration-200"
              :class="[
                activeDemoTab === tab.id
                  ? 'bg-primary text-gray-900 shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-dark-border/50'
              ]"
            >
              {{ tab.name }}
            </button>
          </div>
        </div>
        
        <!-- Demo Content -->
        <div class="bg-dark-card rounded-2xl border border-dark-border overflow-hidden shadow-2xl">
          <!-- Demo Header -->
          <div class="bg-dark-bg/50 px-6 py-4 border-b border-dark-border flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-yellow-600 flex items-center justify-center">
                <span class="font-bold text-gray-900">DL</span>
              </div>
              <div>
                <div class="font-semibold text-white">Demo League</div>
                <div class="text-xs text-gray-400">12 Teams • PPR • Redraft</div>
              </div>
            </div>
            <div class="text-sm text-gray-400">2024 Season • Week 14</div>
          </div>
          
          <!-- Demo Views -->
          <div class="p-6">
            <!-- Power Rankings Demo -->
            <div v-if="activeDemoTab === 'power'" class="space-y-4">
              <div v-for="(team, index) in demoTeams.slice(0, 6)" :key="team.name" 
                class="flex items-center gap-4 p-4 rounded-xl bg-dark-bg/50 border border-dark-border/50">
                <div class="text-2xl font-bold w-8" :class="index < 3 ? 'text-primary' : 'text-gray-500'">{{ index + 1 }}</div>
                <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl" :style="{ background: team.color }">
                  {{ team.emoji }}
                </div>
                <div class="flex-1">
                  <div class="font-semibold text-white">{{ team.name }}</div>
                  <div class="text-sm text-gray-400">{{ team.record }}</div>
                </div>
                <div class="text-right">
                  <div class="text-lg font-bold text-white">{{ team.powerScore }}</div>
                  <div class="text-xs text-gray-400">Power Score</div>
                </div>
                <div class="w-32 h-2 rounded-full bg-dark-border overflow-hidden">
                  <div class="h-full rounded-full bg-gradient-to-r from-primary to-yellow-500" :style="{ width: `${team.powerScore}%` }"></div>
                </div>
              </div>
            </div>
            
            <!-- Matchups Demo -->
            <div v-if="activeDemoTab === 'matchups'" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="matchup in demoMatchups" :key="matchup.id" 
                class="p-4 rounded-xl bg-dark-bg/50 border border-dark-border/50">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center" :style="{ background: matchup.team1.color }">
                      {{ matchup.team1.emoji }}
                    </div>
                    <div>
                      <div class="font-semibold text-white text-sm">{{ matchup.team1.name }}</div>
                      <div class="text-2xl font-bold" :class="matchup.team1.score > matchup.team2.score ? 'text-green-400' : 'text-white'">
                        {{ matchup.team1.score }}
                      </div>
                    </div>
                  </div>
                  <div class="text-gray-500 font-bold">VS</div>
                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <div class="font-semibold text-white text-sm">{{ matchup.team2.name }}</div>
                      <div class="text-2xl font-bold" :class="matchup.team2.score > matchup.team1.score ? 'text-green-400' : 'text-white'">
                        {{ matchup.team2.score }}
                      </div>
                    </div>
                    <div class="w-10 h-10 rounded-full flex items-center justify-center" :style="{ background: matchup.team2.color }">
                      {{ matchup.team2.emoji }}
                    </div>
                  </div>
                </div>
                <div class="mt-3 pt-3 border-t border-dark-border/50 flex justify-between text-xs text-gray-400">
                  <span>Proj: {{ matchup.team1.proj }}</span>
                  <span>Proj: {{ matchup.team2.proj }}</span>
                </div>
              </div>
            </div>
            
            <!-- Projections Demo -->
            <div v-if="activeDemoTab === 'projections'" class="space-y-3">
              <div class="grid grid-cols-6 gap-4 text-xs text-gray-400 font-medium px-4 pb-2 border-b border-dark-border/50">
                <div>RANK</div>
                <div class="col-span-2">PLAYER</div>
                <div class="text-center">POS</div>
                <div class="text-center">PPG</div>
                <div class="text-center">ROS</div>
              </div>
              <div v-for="(player, index) in demoPlayers" :key="player.name"
                class="grid grid-cols-6 gap-4 items-center p-3 rounded-lg hover:bg-dark-border/30 transition-colors">
                <div class="font-bold text-white">{{ index + 1 }}</div>
                <div class="col-span-2 flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-dark-border flex items-center justify-center overflow-hidden">
                    <span class="text-lg">{{ player.emoji }}</span>
                  </div>
                  <div>
                    <div class="font-semibold text-white">{{ player.name }}</div>
                    <div class="text-xs text-gray-400">{{ player.team }}</div>
                  </div>
                </div>
                <div class="text-center">
                  <span class="px-2 py-1 rounded text-xs font-bold" :class="getPositionClass(player.position)">
                    {{ player.position }}
                  </span>
                </div>
                <div class="text-center font-semibold text-white">{{ player.ppg }}</div>
                <div class="text-center font-bold text-primary">{{ player.ros }}</div>
              </div>
            </div>
            
            <!-- History Demo -->
            <div v-if="activeDemoTab === 'history'" class="space-y-6">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-dark-bg/50 rounded-xl p-4 text-center border border-dark-border/50">
                  <div class="text-3xl mb-2">🏆</div>
                  <div class="text-2xl font-bold text-primary">3x</div>
                  <div class="text-sm text-gray-400">Championships</div>
                </div>
                <div class="bg-dark-bg/50 rounded-xl p-4 text-center border border-dark-border/50">
                  <div class="text-3xl mb-2">📊</div>
                  <div class="text-2xl font-bold text-white">847</div>
                  <div class="text-sm text-gray-400">Total Games</div>
                </div>
                <div class="bg-dark-bg/50 rounded-xl p-4 text-center border border-dark-border/50">
                  <div class="text-3xl mb-2">🔥</div>
                  <div class="text-2xl font-bold text-white">198.4</div>
                  <div class="text-sm text-gray-400">High Score</div>
                </div>
                <div class="bg-dark-bg/50 rounded-xl p-4 text-center border border-dark-border/50">
                  <div class="text-3xl mb-2">📅</div>
                  <div class="text-2xl font-bold text-white">6</div>
                  <div class="text-sm text-gray-400">Seasons</div>
                </div>
              </div>
              <div class="bg-dark-bg/50 rounded-xl p-4 border border-dark-border/50">
                <h4 class="font-semibold text-white mb-4">Championship History</h4>
                <div class="space-y-3">
                  <div v-for="champ in demoChampions" :key="champ.year" class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="text-primary font-bold">{{ champ.year }}</span>
                      <div class="w-8 h-8 rounded-full flex items-center justify-center" :style="{ background: champ.color }">
                        {{ champ.emoji }}
                      </div>
                      <span class="text-white font-medium">{{ champ.team }}</span>
                    </div>
                    <span class="text-gray-400">{{ champ.score }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Draft Demo -->
            <div v-if="activeDemoTab === 'draft'" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div v-for="team in demoDraftGrades" :key="team.name"
                  class="bg-dark-bg/50 rounded-xl p-4 border border-dark-border/50">
                  <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-2">
                      <div class="w-8 h-8 rounded-full flex items-center justify-center" :style="{ background: team.color }">
                        {{ team.emoji }}
                      </div>
                      <span class="font-semibold text-white text-sm">{{ team.name }}</span>
                    </div>
                    <div class="text-2xl font-bold" :class="getGradeClass(team.grade)">{{ team.grade }}</div>
                  </div>
                  <div class="space-y-1 text-sm">
                    <div class="flex justify-between">
                      <span class="text-gray-400">Value Score</span>
                      <span class="text-white">{{ team.value }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-gray-400">Best Pick</span>
                      <span class="text-green-400">{{ team.bestPick }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- CTA Below Demo -->
        <div class="text-center mt-12">
          <p class="text-gray-400 mb-4">Ready to analyze your league?</p>
          <button
            @click="$emit('openSignup')"
            class="px-8 py-4 rounded-xl bg-primary text-gray-900 font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
          >
            Get Started Free →
          </button>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="py-16 border-t border-dark-border/50">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-white mb-3">Everything You Need to Dominate</h2>
          <p class="text-gray-400">Comprehensive tools for serious fantasy managers</p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="feature in features" :key="feature.title"
            class="bg-dark-card/50 rounded-xl p-6 border border-dark-border hover:border-primary/50 transition-colors">
            <div class="text-3xl mb-4">{{ feature.icon }}</div>
            <h3 class="text-lg font-bold text-white mb-2">{{ feature.title }}</h3>
            <p class="text-gray-400 text-sm">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="py-20 border-t border-dark-border/50">
      <div class="max-w-3xl mx-auto px-4 text-center">
        <h2 class="text-3xl sm:text-4xl font-bold text-white mb-4">Start Winning Today</h2>
        <p class="text-gray-400 mb-8">Join thousands of fantasy managers using Ultimate Fantasy Dashboard</p>
        <button
          @click="$emit('openSignup')"
          class="px-10 py-4 rounded-xl bg-primary text-gray-900 font-bold text-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105"
        >
          Create Your Free Account
        </button>
        <p class="text-gray-500 text-sm mt-4">No credit card required • Works with Sleeper leagues</p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-dark-border/50 py-8">
      <div class="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
        <p>© 2024 Ultimate Fantasy Dashboard. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineEmits<{
  (e: 'openSignup'): void
}>()

const activeDemoTab = ref('power')

const demoTabs = [
  { id: 'power', name: 'Power Rankings' },
  { id: 'matchups', name: 'Matchups' },
  { id: 'projections', name: 'Projections' },
  { id: 'history', name: 'History' },
  { id: 'draft', name: 'Draft' }
]

const demoTeams = [
  { name: 'Mahomes Magic', record: '10-3', powerScore: 94, emoji: '🎯', color: '#ef4444' },
  { name: 'CMC Express', record: '9-4', powerScore: 89, emoji: '🚂', color: '#3b82f6' },
  { name: 'Hill Climbers', record: '9-4', powerScore: 86, emoji: '⛰️', color: '#22c55e' },
  { name: 'Kelce Kingdom', record: '8-5', powerScore: 82, emoji: '👑', color: '#a855f7' },
  { name: 'Chase Chasers', record: '7-6', powerScore: 78, emoji: '🏃', color: '#f97316' },
  { name: 'Jefferson Flyers', record: '7-6', powerScore: 75, emoji: '✈️', color: '#06b6d4' }
]

const demoMatchups = [
  { 
    id: 1,
    team1: { name: 'Mahomes Magic', score: 142.5, proj: 138.2, emoji: '🎯', color: '#ef4444' },
    team2: { name: 'Kelce Kingdom', score: 128.3, proj: 131.5, emoji: '👑', color: '#a855f7' }
  },
  { 
    id: 2,
    team1: { name: 'CMC Express', score: 156.8, proj: 145.0, emoji: '🚂', color: '#3b82f6' },
    team2: { name: 'Hill Climbers', score: 134.2, proj: 142.1, emoji: '⛰️', color: '#22c55e' }
  },
  { 
    id: 3,
    team1: { name: 'Chase Chasers', score: 118.9, proj: 125.5, emoji: '🏃', color: '#f97316' },
    team2: { name: 'Jefferson Flyers', score: 145.6, proj: 132.8, emoji: '✈️', color: '#06b6d4' }
  },
  { 
    id: 4,
    team1: { name: 'Burrow Bros', score: 131.2, proj: 128.9, emoji: '🦁', color: '#eab308' },
    team2: { name: 'Allen Army', score: 127.8, proj: 135.2, emoji: '⚡', color: '#8b5cf6' }
  }
]

const demoPlayers = [
  { name: 'Ja\'Marr Chase', team: 'CIN', position: 'WR', ppg: '22.4', ros: '284.2', emoji: '🏈' },
  { name: 'Saquon Barkley', team: 'PHI', position: 'RB', ppg: '21.8', ros: '276.5', emoji: '🏈' },
  { name: 'Lamar Jackson', team: 'BAL', position: 'QB', ppg: '24.1', ros: '265.3', emoji: '🏈' },
  { name: 'Derrick Henry', team: 'BAL', position: 'RB', ppg: '19.2', ros: '248.9', emoji: '🏈' },
  { name: 'Amon-Ra St. Brown', team: 'DET', position: 'WR', ppg: '18.9', ros: '241.6', emoji: '🏈' },
  { name: 'Brock Bowers', team: 'LV', position: 'TE', ppg: '14.8', ros: '189.2', emoji: '🏈' }
]

const demoChampions = [
  { year: '2024', team: 'Mahomes Magic', emoji: '🎯', color: '#ef4444', score: '168.4 - 142.1' },
  { year: '2023', team: 'CMC Express', emoji: '🚂', color: '#3b82f6', score: '156.2 - 148.9' },
  { year: '2022', team: 'Hill Climbers', emoji: '⛰️', color: '#22c55e', score: '172.8 - 155.3' }
]

const demoDraftGrades = [
  { name: 'Mahomes Magic', grade: 'A+', value: '+42.3', bestPick: 'Chase (Rd 1)', emoji: '🎯', color: '#ef4444' },
  { name: 'CMC Express', grade: 'A', value: '+35.8', bestPick: 'Barkley (Rd 1)', emoji: '🚂', color: '#3b82f6' },
  { name: 'Hill Climbers', grade: 'B+', value: '+18.2', bestPick: 'Henry (Rd 2)', emoji: '⛰️', color: '#22c55e' }
]

const features = [
  { icon: '📊', title: 'Power Rankings', description: 'Advanced algorithms rank every team based on points scored, consistency, and strength of schedule.' },
  { icon: '📈', title: 'ROS Projections', description: 'Rest-of-season projections with customizable ranking factors to match your strategy.' },
  { icon: '🏆', title: 'League History', description: 'Complete historical stats, championship records, and all-time leaderboards.' },
  { icon: '🔄', title: 'Trade Analyzer', description: 'Evaluate trades with projected values and see if you\'re getting fair value.' },
  { icon: '📋', title: 'Draft Grades', description: 'See how every team drafted with value-over-replacement analysis.' },
  { icon: '⚔️', title: 'Matchup Analysis', description: 'Weekly matchup breakdowns with win probabilities and key player matchups.' }
]

function getPositionClass(position: string): string {
  const classes: Record<string, string> = {
    QB: 'bg-red-500/20 text-red-400',
    RB: 'bg-green-500/20 text-green-400',
    WR: 'bg-blue-500/20 text-blue-400',
    TE: 'bg-yellow-500/20 text-yellow-400'
  }
  return classes[position] || 'bg-gray-500/20 text-gray-400'
}

function getGradeClass(grade: string): string {
  if (grade.startsWith('A')) return 'text-green-400'
  if (grade.startsWith('B')) return 'text-blue-400'
  if (grade.startsWith('C')) return 'text-yellow-400'
  return 'text-red-400'
}
</script>
