# Power Rankings - New Features Guide

## 🎯 Updated Formula (FantasyPros-Style)

Your Power Rankings now use a **5-component formula** that's similar to how FantasyPros ranks teams:

### Formula Breakdown:
```
Power Score = (Record × 35%) + 
              (Total Points × 25%) + 
              (All-Play Record × 20%) + 
              (Recent Form × 15%) + 
              (Consistency × 5%)
```

### What Each Component Means:

**1. Record (35%)** - Your actual W-L record
- Most important factor - you can't argue with wins
- Includes ties as 0.5 wins
- Example: 8-2 gets higher score than 6-4

**2. Total Points (25%)** - Your cumulative scoring
- Rewards offensive firepower
- High scorers are dangerous even with bad luck
- Example: 1,200 pts gets higher score than 950 pts

**3. All-Play Record (20%)** - How you'd do vs everyone
- Removes schedule luck
- True measure of team strength
- Example: Going 72-18 all-play vs 65-25

**4. Recent Form (15%)** - Last 3 weeks weighted
- Most recent week gets 3x weight, then 2x, then 1x
- Captures momentum heading into playoffs
- Example: Averaging 130 pts last 3 weeks vs 95 pts

**5. Consistency (5%)** - Standard deviation of scores
- Lower is better - rewards reliability
- Penalizes boom/bust teams
- Example: Scoring 110-120 each week vs 70-150

## 📊 Chart Shows RANKS Not Scores

The trend chart now displays **rank position (1-10)** instead of raw power scores:
- Y-axis is inverted (1 at top, 10 at bottom)
- Easier to see who's climbing/falling
- Better for visual storytelling

## 🤖 AI Analysis Feature

**What It Does:**
- Generates 150-200 word analysis of current power rankings
- Highlights who's surging, who's falling
- Discusses playoff implications
- Written in a fun, engaging tone

**How To Use:**
1. Make sure you have `VITE_OPENAI_API_KEY` in your `.env` file
2. Select a season and week
3. Click "Generate Analysis →" in the AI card
4. Wait 2-3 seconds for GPT-4 to analyze
5. Click "Regenerate" if you want a different take

**Cost:** ~$0.01 per analysis (very affordable!)

## 📥 Share Feature (Download Image)

**What It Does:**
Creates a shareable image perfect for Sleeper chat or social media.

**Image Includes:**
- League name at top
- Week number
- All team rankings with logos
- Rank changes (↑/↓)
- Power scores
- Dark theme matching your site

**How To Use:**
1. Click the "Share" button (download icon)
2. Wait 1-2 seconds
3. Image automatically downloads as PNG
4. Share in Sleeper, Discord, text, etc.

**Image Size:**
- 800px wide
- Mobile-friendly
- Optimized for chat apps
- High resolution (2x scale)

## 🚀 Setup Instructions

### First Time Setup:

```bash
# Extract the new version
cd fantasy-dashboard-v2

# Install new dependencies (html2canvas)
npm install --legacy-peer-deps

# Start the server
npm run dev
```

### For AI Analysis:

Add to your `.env` file:
```
VITE_OPENAI_API_KEY=sk-proj-your-key-here
```

Then restart the server!

## 📱 Perfect for League Sharing

The combination of AI analysis + downloadable image makes this perfect for:
- Weekly power rankings posts in Sleeper
- League group chats
- Social media flexing
- Commissioner reports
- Trash talk ammunition

## 🎨 Example Use Case:

**Every Tuesday:**
1. Select current week
2. Generate AI analysis
3. Download the rankings image
4. Post in Sleeper chat with AI analysis as caption
5. Watch the reactions roll in! 🔥

## 🔧 Troubleshooting

**"Generate Analysis" doesn't work:**
- Check `.env` file has `VITE_OPENAI_API_KEY`
- Make sure you restarted server after adding key
- Check browser console for errors

**"Share" button doesn't download:**
- Make sure you ran `npm install` to get html2canvas
- Check browser console for errors
- Try a different browser

**Rankings seem wrong:**
- Formula is working as designed - compares multiple factors
- A team with good record but low scoring won't rank as high
- Consistency matters - boom/bust teams get penalized slightly

## 💡 Pro Tips

1. **AI Analysis Variety**: If you don't like the first AI analysis, click "Regenerate" - each one is unique!

2. **Historical Analysis**: Change weeks to see how rankings evolved - AI will analyze that specific week

3. **Share Timing**: Generate rankings on Tuesday (after MNF) for maximum league engagement

4. **Custom Prompts**: You can modify the AI prompt in the code to match your league's personality

Enjoy your new FantasyPros-style Power Rankings! 🏆
