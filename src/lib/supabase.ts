/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for authentication and database access.
 * Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// In production/Safari, route through same-origin Vercel proxy to bypass ITP.
// In dev, use the real Supabase URL directly.
const supabaseUrl = import.meta.env.DEV
  ? import.meta.env.VITE_SUPABASE_URL
  : `${window.location.origin}/api/supabase`

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not configured. Authentication features will be disabled.',
    '\n   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  )
}

// Create a single supabase client for interacting with your database
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!supabase

// Export types for use in components
export type { User, Session } from '@supabase/supabase-js'
