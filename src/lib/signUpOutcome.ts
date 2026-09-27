/**
 * Reading what Supabase actually did on signUp, which is not what the status code says.
 *
 * THE FAILURE THIS EXISTS TO CATCH. When the address already has an account, Supabase does not
 * return an error. It returns 200 with an obfuscated user whose `identities` array is EMPTY,
 * and sends no email — anti-enumeration, working as designed. Code that reads "no error" as
 * "account created" then promises a confirmation link that is never coming. The person waits,
 * finds nothing, and does not come back. Nothing throws, nothing logs, and no row appears
 * anywhere to count, so the loss is invisible from the inside.
 *
 * An identity is created for a genuinely new user, so an empty array on an otherwise good
 * response means exactly one thing. That is the whole test.
 */

export type SignUpOutcome =
  /** A new account exists. Confirmation may or may not be required; either way it was created. */
  | { kind: 'created'; needsConfirmation: boolean }
  /** The address already has an account. No email was sent and none will be. */
  | { kind: 'already_registered' }
  /** Supabase said no. */
  | { kind: 'error'; message: string }
  /** 200, but nothing usable came back. Never expected — and never to be reported as success. */
  | { kind: 'no_user' }

export interface SignUpLike {
  user?: { identities?: unknown[] | null } | null
  session?: unknown | null
}

export function classifySignUp(data: SignUpLike | null | undefined, error?: unknown): SignUpOutcome {
  if (error) {
    const m = (error as { message?: unknown })?.message
    return { kind: 'error', message: typeof m === 'string' && m.trim() ? m : 'Sign up failed' }
  }

  const user = data?.user
  if (!user) return { kind: 'no_user' }

  const identities = user.identities
  if (Array.isArray(identities) && identities.length === 0) {
    return { kind: 'already_registered' }
  }

  /* No session means the confirmation link is the next step, which is the normal configured
     path here. A session present means confirmations are off and they are already in. */
  return { kind: 'created', needsConfirmation: !data?.session }
}
