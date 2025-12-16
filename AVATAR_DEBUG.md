# Avatar Debugging Guide

## The Problem

Team logos are showing the league logo instead of individual team logos.

## How Sleeper Avatars Work

Sleeper stores team avatars in multiple places (in priority order):

1. **`roster.metadata.avatar`** - Team-specific avatar set in league settings (BEST)
2. **`roster.settings.avatar`** - Alternative location for roster avatar
3. **`user.avatar`** - User's personal Sleeper avatar (fallback)
4. **`league.avatar`** - League-wide default avatar (last resort)

## Debugging Steps

### Step 1: Check Browser Console

Open DevTools (F12) and look for logs like:

```
Team 1 Avatar Debug: {
  teamName: "Team Alpha",
  metadataAvatar: "abc123...",  // <- This is what we want!
  settingsAvatar: undefined,
  userAvatar: "xyz789...",
  leagueAvatar: "league123...",
  finalUrl: "https://sleepercdn.com/avatars/thumbs/abc123..."
}
```

### Step 2: Understand the Results

**If `metadataAvatar` is present:**
✅ Team HAS a custom avatar - should show correctly

**If `metadataAvatar` is undefined/null:**
❌ Team has NOT set a custom avatar in league settings
→ Will fallback to user avatar or league avatar

### Step 3: Set Team Avatars in Sleeper

Teams need to set their avatars in Sleeper:

1. Open Sleeper app/website
2. Go to your league
3. Click on your team
4. Click "Edit Team"
5. Click on the team avatar/logo
6. Upload or select a new avatar
7. Save

**Important:** Each team manager needs to do this for their own team!

### Step 4: Verify in API Response

You can check what Sleeper returns directly:

```javascript
// In browser console:
fetch('https://api.sleeper.app/v1/league/YOUR_LEAGUE_ID/rosters')
  .then(r => r.json())
  .then(rosters => {
    rosters.forEach(roster => {
      console.log('Roster', roster.roster_id, ':', {
        metadata: roster.metadata,
        settings_avatar: roster.settings?.avatar
      })
    })
  })
```

Replace `YOUR_LEAGUE_ID` with your actual league ID.

## Common Scenarios

### Scenario 1: All Teams Show League Logo
**Problem:** No teams have set custom avatars
**Solution:** Each manager needs to set their team avatar in Sleeper

### Scenario 2: Some Teams Show, Some Don't
**Problem:** Only some managers set custom avatars
**Solution:** Managers who haven't set avatars need to do so

### Scenario 3: Wrong Avatar Showing
**Problem:** Avatar URL is correct but points to wrong image
**Solution:** Manager needs to update their avatar in Sleeper

## Test with a Known League

Try with a popular public league to see if it's a Sleeper data issue or our code issue.

Example league to test: `1046758447775186944` (a public league with avatars)

## If Still Not Working

Check these potential issues:

1. **CDN URL**: Should be `https://sleepercdn.com/avatars/thumbs/`
2. **Avatar ID format**: Should be a string, not manipulated
3. **Image loading**: Check Network tab for 404 errors
4. **CORS**: Sleeper CDN should allow cross-origin requests

## Quick Fix: Use User Avatars

If team avatars aren't set, our code falls back to user avatars, which should at least show something different per team.

If you're seeing the SAME avatar for all teams, that means:
- Teams haven't set custom avatars
- Users haven't set personal avatars  
- It's falling back to league avatar for everyone

**The fix:** Have each manager set their avatar in Sleeper!
