/**
 * Supabase Client Configuration
 *
 * Uses a Vercel proxy at /api/supabase/* in production so all Supabase traffic
 * is same-origin. This is required for Safari, which blocks cross-origin fetch
 * to supabase.co due to ITP (Intelligent Tracking Prevention).
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { makeTimeoutLock } from './authLock'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase credentials not configured. Authentication features will be disabled.',
    '\n   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  )
}

/**
 * Rewrite a Supabase URL to go through our Vercel same-origin proxy.
 * Works whether the input is a string or a URL object.
 */
function rewriteUrl(input: string | URL | Request): string | Request {
  // In dev, skip the proxy — direct requests work fine
  if (import.meta.env.DEV) return input

  const proxyBase = `${window.location.origin}/api/supabase`

  if (typeof input === 'string') {
    return supabaseUrl ? input.replace(supabaseUrl, proxyBase) : input
  }

  if (input instanceof URL) {
    const rewritten = input.href.replace(supabaseUrl ?? '', proxyBase)
    return rewritten
  }

  if (input instanceof Request) {
    const rewritten = input.url.replace(supabaseUrl ?? '', proxyBase)
    // Clone the request with the new URL — preserves method, headers, body
    return new Request(rewritten, {
      method: input.method,
      headers: input.headers,
      body: input.body,
      // @ts-ignore — duplex is needed for POST with body in some environments
      duplex: 'half',
      credentials: input.credentials,
      cache: input.cache,
      redirect: input.redirect,
      referrer: input.referrer,
      integrity: input.integrity,
    })
  }

  return input
}

/**
 * Custom fetch that routes all Supabase requests through /api/supabase/*
 * in production to bypass Safari ITP.
 */
// Auth endpoints must bypass the proxy — proxying them breaks session persistence
// because cookies/localStorage tokens get set on the wrong origin
const AUTH_PASSTHROUGH_PATHS = [
  '/auth/v1/',
  '/auth/token',
  '/auth/logout',
  '/auth/user',
]

function isAuthRequest(input: string | URL | Request): boolean {
  const url = typeof input === 'string' ? input
    : input instanceof URL ? input.href
    : (input as Request).url
  return AUTH_PASSTHROUGH_PATHS.some(path => url.includes(path))
}

const proxyFetch: typeof fetch = (input, init) => {
  // Skip proxy for auth requests — must go direct to preserve sessions
  if (isAuthRequest(input as string | URL | Request)) {
    return fetch(input as Parameters<typeof fetch>[0], init)
  }
  const rewritten = rewriteUrl(input as string | URL | Request)
  return fetch(rewritten as Parameters<typeof fetch>[0], init)
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'implicit',  // Tokens arrive in URL hash — no code exchange needed, proxy-safe
          /*
           * A lock that gives up rather than waiting forever.
           *
           * supabase-js serialises auth behind a Web Lock so two tabs cannot refresh one token
           * at once, and waits for it with no timeout. In production a client took
           * `lock:sb-<ref>-auth-token` exclusively and never released it — navigator.locks
           * showed it held with another request pending indefinitely — and everything behind
           * it stopped: getSession never settled, queries queued on it hung, the profile fetch
           * never returned, and a null profile reads as tier 'free'. An admin was shown a
           * paywall by a stuck lock in a tab they had forgotten about.
           */
          lock: makeTimeoutLock(3000),
        },
        global: {
          fetch: proxyFetch,
        },
      })
    : null

export const isSupabaseConfigured = () => !!supabase

export type { User, Session } from '@supabase/supabase-js'
