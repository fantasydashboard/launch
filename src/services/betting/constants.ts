// services/betting/constants.ts
//
// Client-side mirror of the book groupings in api/betting/providers.js.
// Kept as its own file rather than imported across the api/src boundary, which
// would drag a serverless module into the browser bundle.

/** The only licensed sportsbook a Florida user can act on. */
export const FL_SPORTSBOOKS = ['hardrockbet_fl', 'hardrockbet']

/**
 * Pick'em apps. Sleeper is in this list even though no feed carries it, because
 * hand-entered Sleeper lines flow through exactly the same evaluation path as
 * the ones that arrive automatically.
 */
export const DFS_BOOKS = ['prizepicks', 'underdog', 'sleeper']

/** Everywhere a Florida user can actually place the pick. */
export const FL_BETTABLE = [...FL_SPORTSBOOKS, ...DFS_BOOKS]
