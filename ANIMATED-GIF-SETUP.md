# Animated GIF Feature Setup

The Power Rankings page now supports generating animated GIFs that reveal rankings dramatically!

## Installation

**No additional dependencies required!** The GIF encoder is loaded directly from a CDN.

Just copy the updated `PowerRankingsView.vue` file to your project.

## Usage

1. Go to the Power Rankings page
2. Select a season and week
3. Use the dropdown next to "Share" to choose between:
   - **Static Image (PNG)** - The original single-image download
   - **Animated GIF** - A dramatic reveal animation

4. Click "Share" to generate and download

## What the Animated GIF Shows

The animation plays through several phases:

1. **Power Rankings Reveal (10 → 1)**
   - Teams are revealed one at a time from worst (#10) to best (#1)
   - Each team slides in with their stats and power score
   - "Revealing #X..." text shows which rank is coming next

2. **ROS Projections Title Card**
   - "Rest of Season Projections" title with 🔮 emoji

3. **ROS Projections Reveal**
   - Teams revealed from worst to best projected ROS
   - Stacked bar chart showing position breakdown (QB, RB, WR, TE, FLEX)

## Technical Details

- Uses [gifenc](https://github.com/mattdesl/gifenc) library loaded from unpkg CDN
- No npm packages required - works out of the box
- Each frame is rendered via html2canvas
- GIF dimensions: 600x450 pixels
- Typical file size: 2-5MB
- Generation time: 15-45 seconds depending on your device

## Troubleshooting

### "Failed to generate animated GIF"
- Check browser console for specific errors
- Make sure you have internet access (for CDN)
- Try the static PNG option as a fallback

### GIF takes too long to generate
- This is normal! Generating GIFs is CPU-intensive
- The "Generating..." spinner will show while processing
- Typical generation time is 15-45 seconds

### GIF doesn't play properly
- Make sure you're viewing it in a browser or image viewer that supports animated GIFs
- Some social media platforms may convert GIFs to video format
