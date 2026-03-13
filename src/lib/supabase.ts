/**
 * Supabase Client Configuration
 * 
 * This file initializes the Supabase client for authentication and database access.
 * Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not configured. Authentication features will be disabled.',
    '\n   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  )
}

// Create a single supabase client for interacting with your database
// Custom fetch that routes through our Vercel proxy in production.
// This bypasses Safari ITP which blocks direct calls to supabase.co.
const proxyFetch: typeof fetch = (input, init) => {
  if (typeof input === 'string' && supabaseUrl) {
    const proxyBase = import.meta.env.DEV
      ? null
      : `${window.location.origin}/api/supabase`
    if (proxyBase) {
      input = input.replace(supabaseUrl, proxyBase)
    }
  }
  return fetch(input, init)
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      global: {
        fetch: proxyFetch
      }
    })
  : null

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => !!supabase

// Export types for use in components
export type { User, Session } from '@supabase/supabase-js'
