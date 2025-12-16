# AI Analysis Setup Guide

The Fantasy Dashboard includes AI-powered analysis features for Power Rankings and Matchup Previews. Here's how to set them up:

## Quick Start (No AI Required)

**The app works without any AI configuration!** If no API keys are configured, the app will automatically generate local analysis based on the league data. This gives you useful insights without any setup.

## Option 1: Serverless Function (Recommended)

This is the most reliable method as it avoids browser CORS issues.

### Step 1: Deploy the serverless function

The file `api/generate-analysis.js` contains a serverless function that can be deployed to:
- **Vercel**: Just deploy your project to Vercel and it will automatically detect the `/api` folder
- **Netlify**: Rename to `netlify/functions/generate-analysis.js`
- **AWS Lambda**: Use the code as a base for your Lambda function

### Step 2: Set environment variables on your hosting platform

On Vercel/Netlify, add these environment variables:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here
```

### Step 3: Configure your frontend

Create a `.env` file in your project root:
```
VITE_API_URL=https://your-project.vercel.app/api
```

## Option 2: Direct API Calls (Development)

For local development, you can call the APIs directly from the browser. Note: This may have CORS issues in production.

### Anthropic Claude

1. Get an API key from https://console.anthropic.com/
2. Add to your `.env` file:
```
VITE_ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### OpenAI GPT

1. Get an API key from https://platform.openai.com/api-keys
2. Add to your `.env` file:
```
VITE_OPENAI_API_KEY=sk-your-key-here
```

## How It Works

The app tries these methods in order:

1. **Serverless function** (if `VITE_API_URL` is configured)
2. **Direct Anthropic API** (if `VITE_ANTHROPIC_API_KEY` is configured)
3. **Direct OpenAI API** (if `VITE_OPENAI_API_KEY` is configured)
4. **Local generation** (always works, no API needed)

## Troubleshooting

### "Failed to generate AI analysis"

1. Check browser console for specific error messages
2. Verify your API key is correct
3. Check if you have API credits/quota remaining
4. Try the serverless function approach if getting CORS errors

### CORS Errors

Browser security prevents direct API calls to some services. Solutions:
- Use the serverless function approach
- Some APIs (like Anthropic) require the `anthropic-dangerous-direct-browser-access` header which we include

### Rate Limits

If you're hitting rate limits:
- The app caches AI responses per matchup/week
- Consider upgrading your API plan
- The local fallback will still work
