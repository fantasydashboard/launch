# Setting Up OpenAI API for League News

## Step 1: Get Your OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click **"Create new secret key"**
4. **Copy the key** (you'll only see it once!)
5. **Revoke your old key** if you accidentally shared it

## Step 2: Add to Your Project

Create a `.env` file in your project root:

```bash
# In the fantasy-dashboard-v2 folder
touch .env
```

Add your key:

```
VITE_OPENAI_API_KEY=sk-your-actual-key-here
```

**Important**: Never commit `.env` to Git! It's already in `.gitignore`.

## Step 3: Update the Code

The code is already set up! When you click "Generate News →" it will:

1. Gather league context (standings, week, etc.)
2. Send to OpenAI GPT-4
3. Display 3-4 news items

## Step 4: Test It

```bash
npm run dev
```

Then:
1. Load a league
2. Go to Standings
3. Click "Generate News →"
4. Wait 2-3 seconds for AI response

## Costs

- GPT-4 Turbo: ~$0.01 per request
- 100 requests = ~$1.00
- Very affordable for personal use!

## Troubleshooting

### "API key not configured"
- Make sure `.env` file exists
- Key starts with `VITE_` (required for Vite)
- Restart dev server after creating `.env`

### "Failed to fetch"
- Check your API key is valid
- Make sure you have credits in your OpenAI account
- Check browser console for detailed errors

### CORS errors
For production (GitHub Pages), you'll need:
- A serverless function (Vercel/Netlify)
- Or a simple proxy server

But for local development, it should work directly!

## Alternative: Mock Data (For Testing)

If you want to test without OpenAI first, replace the `generateLeagueNews` function to return:

```typescript
return [
  "The playoff race heats up with three teams tied at 7-5!",
  "Team Alpha has won 4 straight - hottest team in the league right now.",
  "Bottom feeders Team Zeta and Team Omega face off in the toilet bowl.",
  "Magic number watch: Team Beta needs just 1 win to clinch playoffs."
]
```

## Next Steps

Once working locally, we can deploy with:
1. Vercel serverless function (keeps key secure)
2. Environment variables in Vercel dashboard
3. Auto-deploys on Git push

Ready to try it?
