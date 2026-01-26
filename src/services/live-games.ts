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
    const dateStr = date.toISOString().split('T')[0]
    
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
    
    // Find game where player's team is playing
    const game = games.find(g => 
      g.homeTeam === playerTeam || g.awayTeam === playerTeam
    )
    
    if (!game) {
      return this.noGameInfo()
    }
    
    const isHome = game.homeTeam === playerTeam
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
    const dateStr = date.toISOString().split('T')[0]
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
          
          // Refetch all games for the day
          const games = await this.getGamesByDate(sport, date)
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
