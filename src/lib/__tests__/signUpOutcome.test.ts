import { describe, it, expect } from 'vitest'
import { classifySignUp } from '../signUpOutcome'

describe('classifySignUp', () => {
  it('reports a genuinely new account', () => {
    expect(classifySignUp({ user: { identities: [{ id: 'i1' }] }, session: null }))
      .toEqual({ kind: 'created', needsConfirmation: true })
  })

  it('knows when confirmation is not pending', () => {
    expect(classifySignUp({ user: { identities: [{ id: 'i1' }] }, session: { access_token: 'x' } }))
      .toEqual({ kind: 'created', needsConfirmation: false })
  })

  /*
   * THE BUG. Supabase returns 200 and no error for an address that already exists, with an
   * empty identities array, and sends nothing. Read as success, the modal promises a link that
   * will never arrive — the single most expensive way for a signup to fail, because the person
   * believes it worked.
   */
  it('detects the already-registered signup that sends no email', () => {
    expect(classifySignUp({ user: { identities: [] }, session: null }))
      .toEqual({ kind: 'already_registered' })
  })

  it('does not mistake a missing identities field for an existing account', () => {
    /* Absent is not empty. Only an explicit empty array carries the meaning. */
    expect(classifySignUp({ user: {}, session: null }))
      .toMatchObject({ kind: 'created' })
    expect(classifySignUp({ user: { identities: null }, session: null }))
      .toMatchObject({ kind: 'created' })
  })

  it('passes Supabase errors through with their message', () => {
    expect(classifySignUp(null, { message: 'Password should be at least 6 characters' }))
      .toEqual({ kind: 'error', message: 'Password should be at least 6 characters' })
  })

  it('never reports an empty response as success', () => {
    expect(classifySignUp(null)).toEqual({ kind: 'no_user' })
    expect(classifySignUp({})).toEqual({ kind: 'no_user' })
    expect(classifySignUp({ user: null })).toEqual({ kind: 'no_user' })
  })

  it('falls back to a message when the error carries none', () => {
    expect(classifySignUp(null, {})).toEqual({ kind: 'error', message: 'Sign up failed' })
  })
})
