// =====================================================
// LIVE GAMES SERVICE - Frontend Integration
// =====================================================
// Purpose: Consume live games data from Supabase
// Location: src/services/live-games.ts
// =====================================================

import { supabase } from '@/lib/supabase'
import type { Sport } from '@/types/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface LiveGame {
  gameId: string
  sport: Sport
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  status: 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled'
  period: string | null
  timeRemaining: string | null
  gameTime: string
  gameDate: string
  venue: string | null
}

export interface PlayerGameInfo {
  hasGame: boolean
  opponent: string | null
  isHome: boolean
  gameTime: string | null
  status: 'scheduled' | 'live' | 'final' | null
  period: string | null
  timeRemaining: string | null
  score: string | null
  isLive: boolean
  gameId: string | null
}

export interface GamesSummary {
  total: number
  live: number
  scheduled: number
  final: number
}

class LiveGamesService {
  
  /**
   * Get today's games for a specific sport
   */
  async getTodaysGames(sport: Sport): Promise<LiveGame[]> {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('games_schedule')
      .select('*')
      .eq('sport', this.mapSportToDbValue(sport))
      .eq('game_date', today)
      .order('game_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching today\'s games:', error)
      throw error
    }
    
    return (data || []).map(this.mapDbGameToLiveGame)
  }
  
  /**
   * Get tomorrow's games for a specific sport
   */
  async getTomorrowsGames(sport: Sport): Promise<LiveGame[]> {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('games_schedule')
      .select('*')
      .eq('sport', this.mapSportToDbValue(sport))
      .eq('game_date', dateStr)
      .order('game_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching tomorrow\'s games:', error)
      throw error
    }
    
    return (data || []).map(this.mapDbGameToLiveGame)
  }
  
  /**
   * Get games for a specific date
   */
  async getGamesByDate(sport: Sport, date: Date): Promise<LiveGame[]> {
    // Use local date string to avoid UTC timezone shift causing wrong day queries
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    
    const { data, error } = await supabase
      .from('games_schedule')
      .select('*')
      .eq('sport', this.mapSportToDbValue(sport))
      .eq('game_date', dateStr)
      .order('game_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching games by date:', error)
      throw error
    }
    
    return (data || []).map(this.mapDbGameToLiveGame)
  }

  /**
   * Get games for a LOCAL calendar date, handling UTC storage offset.
   *
   * Problem: Scrapers may store game_date in UTC. An NBA game at 7 PM EST on
   * March 4 = 00:00 UTC March 5, so it gets stored under game_date='2026-03-05'.
   * Conversely, a March 3 game finishing at 11 PM EST = 04:00 UTC March 4, so
   * it might appear under game_date='2026-03-04'.
   *
   * Solution: Query BOTH localDate AND localDate+1 in UTC, then filter to only
   * games whose game_time actually falls within ±14 hours of the local midnight.
   * That window captures all games that a user would consider "today".
   */
  async getGamesForLocalDate(sport: Sport, localDate: Date): Promise<LiveGame[]> {
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    const localDateStr = fmt(localDate)
    const nextDay = new Date(localDate.getTime() + 86400000)
    const nextDateStr = fmt(nextDay)

    // Fetch both dates in parallel
    const [r1, r2] = await Promise.all([
      supabase.from('games_schedule').select('*')
        .eq('sport', this.mapSportToDbValue(sport)).eq('game_date', localDateStr)
        .order('game_time', { ascending: true }),
      supabase.from('games_schedule').select('*')
        .eq('sport', this.mapSportToDbValue(sport)).eq('game_date', nextDateStr)
        .order('game_time', { ascending: true })
    ])

    const allRows = [...(r1.data || []), ...(r2.data || [])]
    
    // Define the valid window: local midnight  -2h  to  local midnight +26h
    // This gives us a 28-hour window that catches every game a user would consider "today"
    const localMidnight = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), 0, 0, 0)
    const windowStart = localMidnight.getTime() - 2 * 3600 * 1000    // 2h before midnight
    const windowEnd   = localMidnight.getTime() + 26 * 3600 * 1000   // 26h after midnight (2 AM next day)

    const games = allRows
      .map(this.mapDbGameToLiveGame)
      // Deduplicate by gameId in case same game returned from both date queries
      .filter((g, idx, arr) => !g.gameId || arr.findIndex(x => x.gameId === g.gameId) === idx)
      // Keep only games whose start time falls within today's local window
      .filter(g => {
        if (!g.gameTime) return true // no timestamp? keep it
        const t = new Date(g.gameTime).getTime()
        return t >= windowStart && t <= windowEnd
      })
      // Sort by game time
      .sort((a, b) => {
        if (!a.gameTime) return 1
        if (!b.gameTime) return -1
        return new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime()
      })

    console.log(`[LiveGames] getGamesForLocalDate(${localDateStr}): queried ${localDateStr}+${nextDateStr}, found ${allRows.length} raw → ${games.length} in window`)
    return games
  }
  
  /**
   * Get all live games across all sports
   */
  async getAllLiveGames(): Promise<LiveGame[]> {
    const { data, error } = await supabase
      .from('games_schedule')
      .select('*')
      .eq('status', 'live')
      .order('game_time', { ascending: true })
    
    if (error) {
      console.error('Error fetching live games:', error)
      throw error
    }
    
    return (data || []).map(this.mapDbGameToLiveGame)
  }
  
  /**
   * Get summary stats for games
   */
  getGamesSummary(games: LiveGame[]): GamesSummary {
    return {
      total: games.length,
      live: games.filter(g => g.status === 'live').length,
      scheduled: games.filter(g => g.status === 'scheduled').length,
      final: games.filter(g => g.status === 'final').length
    }
  }
  
  /**
   * Check if a player has a game and get game info
   * @param playerTeam - Team abbreviation (e.g., "LAL", "BOS", "TOR")
   * @param games - Array of games to search through
   */
  getPlayerGameInfo(playerTeam: string, games: LiveGame[]): PlayerGameInfo {
    if (!playerTeam) {
      return this.noGameInfo()
    }
    
    // Always compare uppercase - Yahoo returns mixed case like "Wpg", "Tor", "TB"
    const upper = playerTeam.toUpperCase()
    const normalized = this.normalizeTeamAbbr(upper)
    
    // Find game where player's team is playing.
    // DB team values are stored uppercase from scrapers.
    // Exclude 'final' games that appear in today's date due to UTC storage
    // (e.g. a 7:30 PM ET March 3 game stored as game_date='March 4' in UTC).
    // We still include finals that started recently (within last 5 hours) for live score display.
    const now = Date.now()
    const FIVE_HOURS = 5 * 60 * 60 * 1000
    const game = games.find(g => {
      const home = (g.homeTeam || '').toUpperCase()
      const away = (g.awayTeam || '').toUpperCase()
      const teamMatches = home === upper || away === upper || home === normalized || away === normalized
      if (!teamMatches) return false
      // Skip games that are 'final' and started more than 5 hours ago
      // (these are yesterday's games stored with UTC date)
      if (g.status === 'final' && g.gameTime) {
        const gameStart = new Date(g.gameTime).getTime()
        if (now - gameStart > FIVE_HOURS) return false
      }
      return true
    })
    
    if (!game) {
      return this.noGameInfo()
    }
    
    const isHome = (game.homeTeam || '').toUpperCase() === upper || (game.homeTeam || '').toUpperCase() === normalized
    const opponent = isHome ? game.awayTeam : game.homeTeam
    const myScore = isHome ? game.homeScore : game.awayScore
    const oppScore = isHome ? game.awayScore : game.homeScore
    
    // Format opponent string
    const opponentStr = `${isHome ? 'vs' : '@'} ${opponent}`
    
    // Format score if game is live or final
    let scoreStr = null
    if (game.status === 'live' || game.status === 'final') {
      scoreStr = `${myScore}-${oppScore}`
    }
    
    return {
      hasGame: true,
      opponent: opponentStr,
      isHome,
      gameTime: game.gameTime,
      status: game.status,
      period: game.period,
      timeRemaining: game.timeRemaining,
      score: scoreStr,
      isLive: game.status === 'live',
      gameId: game.gameId
    }
  }
  
  /**
   * Subscribe to live game updates using Supabase Realtime
   * Returns unsubscribe function
   */
  subscribeToLiveGames(
    sport: Sport, 
    date: Date,
    callback: (games: LiveGame[]) => void
  ): RealtimeChannel {
    // Use local date string to avoid UTC timezone shift causing wrong day queries
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
    const sportStr = this.mapSportToDbValue(sport)
    
    console.log(`[LiveGames] Subscribing to ${sport} games on ${dateStr}`)
    
    const channel = supabase
      .channel(`live-games-${sport}-${dateStr}`)
      .on(
        'postgres_changes',
        {
          event: '*', // All events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'games_schedule',
          filter: `sport=eq.${sportStr},game_date=eq.${dateStr}`
        },
        async (payload) => {
          console.log(`[LiveGames] Game update received:`, payload)
          
          // Refetch all games for the day (using the local-date aware method)
          const games = await this.getGamesForLocalDate(sport, date)
          callback(games)
        }
      )
      .subscribe((status) => {
        console.log(`[LiveGames] Subscription status:`, status)
      })
    
    return channel
  }
  
  /**
   * Get formatted game time
   */
  formatGameTime(gameTime: string): string {
    const date = new Date(gameTime)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }
  
  /**
   * Get game status display text
   */
  getGameStatusText(game: LiveGame): string {
    if (game.status === 'live') {
      let text = '🔴 LIVE'
      if (game.period) {
        text += ` - ${game.period}`
      }
      if (game.timeRemaining) {
        text += ` ${game.timeRemaining}`
      }
      return text
    }
    
    if (game.status === 'final') {
      return '✅ FINAL'
    }
    
    if (game.status === 'postponed') {
      return '⏸️ PPD'
    }
    
    if (game.status === 'cancelled') {
      return '❌ CANCELLED'
    }
    
    // Scheduled - show time
    return `⏰ ${this.formatGameTime(game.gameTime)}`
  }
  
  /**
   * Check if scraper is healthy
   */
  async checkScraperHealth(scraperName: string): Promise<{
    isHealthy: boolean
    lastSuccess: string | null
    minutesSinceSuccess: number | null
    status: string | null
    errorMessage: string | null
  }> {
    const { data, error } = await supabase
      .from('scraper_status')
      .select('*')
      .eq('scraper_name', scraperName)
      .single()
    
    if (error || !data) {
      return {
        isHealthy: false,
        lastSuccess: null,
        minutesSinceSuccess: null,
        status: 'unknown',
        errorMessage: error?.message || 'Scraper not found'
      }
    }
    
    const lastSuccess = data.last_success ? new Date(data.last_success) : null
    const now = new Date()
    const minutesSinceSuccess = lastSuccess 
      ? Math.floor((now.getTime() - lastSuccess.getTime()) / 1000 / 60)
      : null
    
    const isHealthy = minutesSinceSuccess !== null && minutesSinceSuccess < 10
    
    return {
      isHealthy,
      lastSuccess: data.last_success,
      minutesSinceSuccess,
      status: data.status,
      errorMessage: data.error_message
    }
  }
  
  /**
   * Get all scraper health statuses
   */
  async getAllScraperHealth(): Promise<Record<string, any>> {
    const scrapers = ['nba_games', 'nhl_games', 'mlb_games']
    const results: Record<string, any> = {}
    
    for (const scraper of scrapers) {
      results[scraper] = await this.checkScraperHealth(scraper)
    }
    
    return results
  }
  
  // ==================== PRIVATE HELPERS ====================
  
  private mapSportToDbValue(sport: Sport): string {
    const mapping: Record<Sport, string> = {
      'basketball': 'basketball',
      'hockey': 'hockey',
      'baseball': 'baseball',
      'football': 'football'
    }
    return mapping[sport] || sport
  }
  
  /**
   * Normalize team abbreviations across platforms
   * Yahoo, ESPN, and the DB may use slightly different formats
   */
  private normalizeTeamAbbr(team: string): string {
    // All inputs should already be uppercase. Maps alternate/short forms to common forms.
    const MAP: Record<string, string> = {
      // NHL alternates (Yahoo uses these)
      'TB': 'TBL', 'NJ': 'NJD', 'LA': 'LAK', 'SJ': 'SJS',
      'VGS': 'VGK', 'PHX': 'ARI', 'ATL': 'WPG',
      // NHL reverse (if DB uses short form)
      'TBL': 'TB', 'NJD': 'NJ', 'LAK': 'LA', 'SJS': 'SJ', 'VGK': 'VGS',
      // NBA alternates
      'GS': 'GSW', 'NY': 'NYK', 'NO': 'NOP', 'SA': 'SAS', 'UTAH': 'UTA',
      'GS WARRIORS': 'GSW', 'NETS': 'BKN', 'KNICKS': 'NYK',
      // NBA reverse
      'GSW': 'GS', 'NYK': 'NY', 'NOP': 'NO', 'SAS': 'SA',
      // MLB alternates
      'CWS': 'CHW', 'CHW': 'CWS', 'KC': 'KCR', 'KCR': 'KC',
      'TB': 'TBR', 'TBR': 'TB', 'WSH': 'WAS', 'WAS': 'WSH',
      'SD': 'SDP', 'SDP': 'SD', 'SF': 'SFG', 'SFG': 'SF',
    }
    return MAP[team] || team
  }

  private mapDbGameToLiveGame(dbGame: any): LiveGame {
    return {
      gameId: dbGame.game_id,
      sport: dbGame.sport as Sport,
      homeTeam: dbGame.home_team,
      awayTeam: dbGame.away_team,
      homeScore: dbGame.home_score || 0,
      awayScore: dbGame.away_score || 0,
      status: dbGame.status,
      period: dbGame.period,
      timeRemaining: dbGame.time_remaining,
      gameTime: dbGame.game_time,
      gameDate: dbGame.game_date,
      venue: dbGame.venue
    }
  }
  
  private noGameInfo(): PlayerGameInfo {
    return {
      hasGame: false,
      opponent: null,
      isHome: false,
      gameTime: null,
      status: null,
      period: null,
      timeRemaining: null,
      score: null,
      isLive: false,
      gameId: null
    }
  }
}

// Export singleton instance
export const liveGamesService = new LiveGamesService()

// Export types
export type { LiveGame, PlayerGameInfo, GamesSummary }
