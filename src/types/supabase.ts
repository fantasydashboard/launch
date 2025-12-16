/**
 * Supabase Database Types
 * 
 * These types are auto-generated from your Supabase schema.
 * Run `npx supabase gen types typescript` to regenerate after schema changes.
 * 
 * For now, this is a placeholder that will be replaced when you set up your database.
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          sleeper_user_id: string | null
          subscription_tier: 'free' | 'pro' | 'premium'
          subscription_status: 'active' | 'canceled' | 'past_due' | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          sleeper_user_id?: string | null
          subscription_tier?: 'free' | 'pro' | 'premium'
          subscription_status?: 'active' | 'canceled' | 'past_due' | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          sleeper_user_id?: string | null
          subscription_tier?: 'free' | 'pro' | 'premium'
          subscription_status?: 'active' | 'canceled' | 'past_due' | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_leagues: {
        Row: {
          id: string
          user_id: string
          league_id: string
          league_name: string
          platform: 'sleeper' | 'espn' | 'yahoo'
          is_primary: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          league_id: string
          league_name: string
          platform?: 'sleeper' | 'espn' | 'yahoo'
          is_primary?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          league_id?: string
          league_name?: string
          platform?: 'sleeper' | 'espn' | 'yahoo'
          is_primary?: boolean
          created_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          ranking_factors: Record<string, any> | null
          weekly_factors: Record<string, any> | null
          theme: 'dark' | 'light'
          default_view: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ranking_factors?: Record<string, any> | null
          weekly_factors?: Record<string, any> | null
          theme?: 'dark' | 'light'
          default_view?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ranking_factors?: Record<string, any> | null
          weekly_factors?: Record<string, any> | null
          theme?: 'dark' | 'light'
          default_view?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {
      subscription_tier: 'free' | 'pro' | 'premium'
      subscription_status: 'active' | 'canceled' | 'past_due'
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserLeague = Database['public']['Tables']['user_leagues']['Row']
export type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
