import { describe, it, expect } from 'vitest'
import { shouldWelcome } from '../welcomeCard'

/*
 * The old tour fired on "first league added" as recorded in localStorage alone, which is a
 * fact about a BROWSER rather than about a person. A customer of a year opening the site on a
 * new phone was greeted with "Welcome to Ultimate Fantasy Dashboard — let us show you around."
 * Whether somebody is new is a question the account can answer: they have one league, and it
 * is the one they just added.
 */
describe('shouldWelcome', () => {
  it('welcomes somebody whose first league has just connected', () => {
    expect(shouldWelcome({ leagueCount: 1, seenBefore: false })).toBe(true)
  })

  it('stays out of the way once it has been seen', () => {
    expect(shouldWelcome({ leagueCount: 1, seenBefore: true })).toBe(false)
  })

  it('does not welcome somebody adding their second league', () => {
    expect(shouldWelcome({ leagueCount: 2, seenBefore: false })).toBe(false)
  })

  /* The case that made this worth extracting: an established account on a new browser has an
     empty localStorage and a full shelf of leagues. Nothing about them is new. */
  it('does not welcome an established account on a fresh browser', () => {
    expect(shouldWelcome({ leagueCount: 7, seenBefore: false })).toBe(false)
  })

  /* Nothing has connected yet, so there is nothing to welcome them to. */
  it('says nothing when no league is loaded', () => {
    expect(shouldWelcome({ leagueCount: 0, seenBefore: false })).toBe(false)
  })
})
