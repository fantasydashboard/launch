<template>
  <div class="pricing-root">

    <!-- ── HERO ── -->
    <section class="p-hero">
      <div class="p-noise"></div>
      <div class="p-grid-bg"></div>
      <div class="p-inner">
        <div class="p-eyebrow">League Pass</div>
        <h1 class="p-headline">
          Stop watching your<br/>
          league from the <span class="p-accent">cheap seats.</span>
        </h1>
        <p class="p-sub">
          Everything locked in your dashboard right now? One purchase unlocks it all —
          for you <em>and</em> every teammate in your league.
        </p>
        <div class="p-trust-strip">
          <span>🔒 Secure checkout · Stripe</span>
          <span class="p-trust-dot">·</span>
          <span>⚡ Instant access</span>
          <span class="p-trust-dot">·</span>
          <span>👥 Whole league gets access</span>
          <span class="p-trust-dot">·</span>
          <span>🏈 ⚾ 🏀 🏒 All 4 sports</span>
        </div>
      </div>
    </section>

    <!-- ── WHAT YOU'RE MISSING ── -->
    <section class="p-locked-section">
      <div class="p-inner">
        <div class="p-eyebrow">What you're missing right now</div>
        <h2 class="p-section-headline">Every feature. <span class="p-accent">One unlock.</span></h2>

        <div class="p-features-grid">
          <div v-for="f in lockedFeatures" :key="f.title" class="p-feature-card" :class="f.hot ? 'p-feat-hot' : ''">
            <div class="p-feat-icon">{{ f.icon }}</div>
            <div class="p-feat-body">
              <div class="p-feat-title">{{ f.title }}</div>
              <div class="p-feat-desc">{{ f.desc }}</div>
            </div>
            <div class="p-feat-tag" :class="f.hot ? 'tag-hot' : 'tag-pass'">League Pass</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── PRICE CARD + CALCULATOR ── -->
    <section class="p-purchase-section" id="upgrade">
      <div class="p-inner p-purchase-inner">

        <!-- Left: price card -->
        <div class="p-price-card">
          <div class="p-popular-badge">Most Popular</div>
          <div class="p-card-eyebrow">League Pass</div>
          <div class="p-price-display">
            <span class="p-price-dollar">$</span>
            <span class="p-price-num">29</span>
            <span class="p-price-per">/season</span>
          </div>
          <div class="p-price-note">Per league · One person pays · Everyone benefits</div>

          <!-- Slider calculator -->
          <div class="p-calc-box">
            <div class="p-calc-label">
              <span>How many teams in your league?</span>
              <span class="p-calc-count">{{ teamCount }} teams</span>
            </div>
            <input
              v-model.number="teamCount"
              type="range" min="4" max="20" step="1"
              class="p-slider"
            />
            <div class="p-calc-marks">
              <span>4</span><span>8</span><span>12</span><span>16</span><span>20</span>
            </div>
            <div class="p-calc-result">
              <div class="p-calc-result-main">
                <span class="p-calc-ppp">${{ perPersonCost }}</span>
                <span class="p-calc-ppp-label">per person</span>
              </div>
              <div class="p-calc-result-math">
                $29 ÷ {{ teamCount }} teammates
              </div>
            </div>
            <div class="p-calc-callout">
              For less than a coffee, your whole league gets the full experience.
            </div>
          </div>

          <!-- Feature list -->
          <ul class="p-card-features">
            <li v-for="f in cardFeatures" :key="f"><span class="p-cf-check">✓</span>{{ f }}</li>
          </ul>

          <button class="p-buy-btn" @click="handlePurchase">
            Get League Pass · $29
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>

          <div class="p-one-pays">
            <span class="p-one-pays-icon">👥</span>
            <span><strong>One person pays, everyone benefits.</strong> Every league mate gets full access the moment they connect their account — no extra charge.</span>
          </div>
        </div>

        <!-- Right: how it works -->
        <div class="p-hiw-col">
          <div class="p-eyebrow">How it works</div>
          <h3 class="p-hiw-headline">Up and running<br/><span class="p-accent">in 3 minutes.</span></h3>

          <div class="p-steps">
            <div class="p-step" v-for="(s, i) in steps" :key="i">
              <div class="p-step-num">0{{ i + 1 }}</div>
              <div class="p-step-body">
                <div class="p-step-title">{{ s.title }}</div>
                <div class="p-step-desc">{{ s.desc }}</div>
              </div>
            </div>
          </div>

          <div class="p-guarantee">
            <div class="p-guarantee-icon">🛡️</div>
            <div>
              <div class="p-guarantee-title">Built to last the season</div>
              <div class="p-guarantee-desc">Your League Pass covers the full season. Historical data stays yours forever, even after the season ends.</div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- ── COMPARISON TABLE ── -->
    <section class="p-compare-section">
      <div class="p-inner">
        <div class="p-eyebrow">Full breakdown</div>
        <h2 class="p-section-headline">Free vs. <span class="p-accent">League Pass</span></h2>

        <div class="p-table-wrap">
          <table class="p-table">
            <thead>
              <tr>
                <th class="p-th-feature">Feature</th>
                <th class="p-th-free">Free</th>
                <th class="p-th-pass">League Pass</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in comparisonRows" :key="row.feature" :class="row.section ? 'p-tr-section' : ''">
                <td v-if="row.section" colspan="3" class="p-td-section-label">{{ row.feature }}</td>
                <template v-else>
                  <td class="p-td-feature">{{ row.feature }}</td>
                  <td class="p-td-val" :class="row.free ? 'p-td-yes' : 'p-td-no'">
                    <span v-if="row.free">✓</span>
                    <span v-else class="p-td-dash">—</span>
                  </td>
                  <td class="p-td-val p-td-pass-col" :class="row.pass ? 'p-td-yes p-td-pass-yes' : 'p-td-no'">
                    <span v-if="row.pass">✓</span>
                    <span v-else class="p-td-dash">—</span>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <!-- ── FAQ ── -->
    <section class="p-faq-section">
      <div class="p-inner">
        <div class="p-eyebrow">Questions</div>
        <h2 class="p-section-headline">Got questions?<br/><span class="p-accent">We've got answers.</span></h2>

        <div class="p-faq-list">
          <div
            v-for="(faq, i) in faqs" :key="i"
            class="p-faq-item"
            @click="openFaq = openFaq === i ? null : i"
          >
            <div class="p-faq-q">
              <span>{{ faq.q }}</span>
              <span class="p-faq-arrow" :class="{ open: openFaq === i }">›</span>
            </div>
            <div class="p-faq-a" :class="{ visible: openFaq === i }">{{ faq.a }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── FINAL CTA ── -->
    <section class="p-final-section">
      <div class="p-final-glow-l"></div>
      <div class="p-final-glow-r"></div>
      <div class="p-inner p-final-inner">
        <div class="p-final-eyebrow">🏆 Ready?</div>
        <h2 class="p-final-headline">
          Your league is already<br/>talking about it.<br/>
          <span class="p-accent">Be the one who started it.</span>
        </h2>
        <button class="p-buy-btn p-buy-xl" @click="handlePurchase">
          Get League Pass · $29
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <div class="p-final-trust">
          $29 per league · Whole league gets access · Setup in 3 minutes
        </div>
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const teamCount = ref(10)
const openFaq = ref<number | null>(null)

const perPersonCost = computed(() => {
  return (29 / teamCount.value).toFixed(2)
})

function handlePurchase() {
  // TODO: wire to Stripe checkout
  alert('Stripe checkout coming soon!')
}

const lockedFeatures = [
  { icon: '⚡', title: 'Power Rankings', desc: 'Weekly auto-generated rankings with trend arrows and score bars. Share straight to the group chat.', hot: true },
  { icon: '📜', title: 'Season History', desc: 'Every season going back years. Final standings, who won, who choked — all of it.', hot: false },
  { icon: '🆚', title: 'All-Time H2H Matrix', desc: 'Every rivalry laid out in one grid. Who owns who over the last 6 seasons.', hot: false },
  { icon: '👑', title: 'Legacy Standings', desc: 'Cumulative scores across all seasons. The definitive answer to who the best manager is.', hot: true },
  { icon: '🎯', title: 'Win Probability', desc: 'Live & Monte Carlo projected win probability, updated daily throughout the week.', hot: false },
  { icon: '📊', title: 'Start / Sit Projections', desc: 'Scoring projections for every player on your roster to help you make the right call.', hot: false },
  { icon: '🤝', title: 'Trade Analyzer', desc: 'Fair value grades on any deal. Stop getting fleeced by your league mates.', hot: false },
  { icon: '🃏', title: 'Shareable Cards', desc: 'Power rankings, matchup breakdowns, standings — all as one-tap shareable images.', hot: true },
  { icon: '📈', title: 'Ranking Trends', desc: 'Line charts showing every team\'s ranking movement throughout the season.', hot: false },
  { icon: '🔥', title: 'Hottest / Coldest Teams', desc: 'Streak tracking and recent form analysis across all teams in your league.', hot: false },
  { icon: '📋', title: 'Draft History & Balance', desc: 'Which draft slots win more? Who\'s actually good at drafting?', hot: false },
  { icon: '⚾', title: 'All 4 Sports', desc: 'Football, baseball, basketball, hockey — full H2H and category league support.', hot: false },
]

const cardFeatures = [
  'Power rankings — auto every week',
  'All shareable card types',
  'Full season history, years back',
  'All-time H2H matrix',
  'Legacy standings & scoring',
  'Win probability (live + projected)',
  'Start/sit projections',
  'Trade analyzer with fair value',
  'Hottest/coldest team tracking',
  'Draft history & balance reports',
  'All 4 sports supported',
  'Every league mate gets access free',
]

const steps = [
  { title: 'You purchase League Pass', desc: 'One flat $29 fee covers your entire league for the season. No per-person charges.' },
  { title: 'Share the dashboard link', desc: 'Drop the link in your group chat. League mates create a free account — takes 60 seconds.' },
  { title: 'Everyone gets full access', desc: 'We detect they\'re in your league and unlock everything automatically. No codes, no friction.' },
]

const comparisonRows = [
  { section: true, feature: 'Standings & Matchups' },
  { feature: 'Current week standings', free: true,  pass: true  },
  { feature: 'Weekly matchup scores', free: true,  pass: true  },
  { feature: 'Division standings',    free: true,  pass: true  },
  { section: true, feature: 'Power Rankings' },
  { feature: 'Power rankings preview (top 3)', free: true,  pass: true  },
  { feature: 'Full power rankings (all teams)',free: false, pass: true  },
  { feature: 'Ranking trend line charts',      free: false, pass: true  },
  { feature: 'Hottest & coldest teams',        free: false, pass: true  },
  { section: true, feature: 'History' },
  { feature: 'Season history (all years)',  free: false, pass: true  },
  { feature: 'All-time H2H matrix',        free: false, pass: true  },
  { feature: 'Legacy standings & scoring', free: false, pass: true  },
  { feature: 'Season finish comparison',   free: false, pass: true  },
  { section: true, feature: 'Deep Analytics' },
  { feature: 'Win probability (live)',     free: false, pass: true  },
  { feature: 'Win probability trend chart',free: false, pass: true  },
  { feature: 'Start / sit projections',   free: false, pass: true  },
  { feature: 'Trade analyzer',            free: false, pass: true  },
  { feature: 'Draft history & balance',   free: false, pass: true  },
  { section: true, feature: 'Share Cards' },
  { feature: 'Power rankings card',   free: false, pass: true  },
  { feature: 'Matchup card',          free: false, pass: true  },
  { feature: 'Standings card',        free: false, pass: true  },
  { feature: 'H2H & legacy cards',    free: false, pass: true  },
  { feature: 'Trade analysis card',   free: false, pass: true  },
]

const faqs = [
  {
    q: 'Does every league mate need to pay?',
    a: 'No. One person buys League Pass for the league — that unlocks it for everyone. League mates just create a free account, connect their league, and we detect they\'re covered automatically.',
  },
  {
    q: 'Can I split the cost with my league?',
    a: 'Absolutely. At $29 for a 10-team league, that\'s $2.90 per person — less than a coffee. Just Venmo/Cashapp the league before or after and you\'re done.',
  },
  {
    q: 'What if I\'m in multiple leagues?',
    a: 'Each League Pass covers one league for the season. If you\'re in 3 leagues, you\'d need 3 passes. Many people find that being commissioner of one covered league is enough.',
  },
  {
    q: 'When does my League Pass expire?',
    a: 'It covers the full current season. Your historical data never expires — all those years of matchup history and legacy scores are yours to keep and reference anytime.',
  },
  {
    q: 'What sports are supported?',
    a: 'Football, baseball, basketball, and hockey — all on Sleeper, Yahoo, and ESPN. H2H points and H2H category leagues both fully supported.',
  },
  {
    q: 'Is there a refund policy?',
    a: 'Due to instant access to digital content, we don\'t offer refunds. We recommend connecting your league on the free tier first to make sure it loads correctly before purchasing.',
  },
  {
    q: 'How do I know it works with my league?',
    a: 'Connect your league for free first — you\'ll see the standings, matchups, and a preview of power rankings before spending anything. If it loads, it works.',
  },
]
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=Barlow:ital,wght@0,400;0,500;0,600;1,400&display=swap');

/* ── Root ── */
.pricing-root {
  font-family: 'Barlow', sans-serif;
  background: #05060a;
  color: #e5e7eb;
  min-height: 100vh;
}
.p-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 0 28px;
}
.p-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #eab308;
  margin-bottom: 14px;
}
.p-accent { color: #eab308; }
.p-section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2rem, 4.5vw, 3rem);
  font-weight: 900;
  line-height: 1.05;
  color: #fff;
  margin-bottom: 48px;
}

/* ── Hero ── */
.p-hero {
  position: relative;
  padding: 80px 0 72px;
  background: #05060a;
  overflow: hidden;
  border-bottom: 1px solid #0f1018;
}
.p-noise {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
}
.p-grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(234,179,8,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(234,179,8,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%);
}
.p-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2.8rem, 6vw, 4.5rem);
  font-weight: 900;
  line-height: 1.0;
  color: #fff;
  text-transform: uppercase;
  margin-bottom: 20px;
}
.p-sub {
  font-size: 1.1rem;
  color: #9ca3af;
  max-width: 560px;
  line-height: 1.6;
  margin-bottom: 28px;
}
.p-trust-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: #4b5563;
}
.p-trust-dot { color: #1e2130; }

/* ── Locked Features ── */
.p-locked-section {
  padding: 80px 0;
  background: #08090f;
  border-bottom: 1px solid #0f1018;
}
.p-features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: #1e2130;
  border: 1px solid #1e2130;
  border-radius: 16px;
  overflow: hidden;
}
.p-feature-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 20px 22px;
  background: #0a0c14;
  transition: background 0.15s;
  position: relative;
}
.p-feature-card:hover { background: #0d0f1c; }
.p-feat-hot { background: linear-gradient(135deg, rgba(234,179,8,0.04), #0a0c14) !important; }
.p-feat-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
  margin-top: 2px;
}
.p-feat-body { flex: 1; min-width: 0; }
.p-feat-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: #e5e7eb;
  margin-bottom: 4px;
}
.p-feat-desc { font-size: 0.78rem; color: #6b7280; line-height: 1.4; }
.p-feat-tag {
  position: absolute; top: 12px; right: 12px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.55rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
}
.tag-pass { background: rgba(234,179,8,0.1); color: #eab308; border: 1px solid rgba(234,179,8,0.2); }
.tag-hot  { background: rgba(234,179,8,0.18); color: #eab308; border: 1px solid rgba(234,179,8,0.35); }

/* ── Purchase section ── */
.p-purchase-section {
  padding: 80px 0;
  background: #05060a;
  border-bottom: 1px solid #0f1018;
}
.p-purchase-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: start;
}

/* Price card */
.p-price-card {
  background: linear-gradient(145deg, #0d1020, #0a0d1a);
  border: 2px solid rgba(234,179,8,0.35);
  border-radius: 20px;
  padding: 40px;
  position: relative;
  box-shadow: 0 0 80px rgba(234,179,8,0.07), inset 0 1px 0 rgba(255,255,255,0.03);
}
.p-popular-badge {
  position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
  padding: 4px 18px;
  background: #eab308; color: #0a0c14;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  border-radius: 999px; white-space: nowrap;
}
.p-card-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: #eab308; margin-bottom: 12px;
}
.p-price-display { display: flex; align-items: flex-start; gap: 2px; margin-bottom: 6px; }
.p-price-dollar { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 900; color: #eab308; margin-top: 8px; }
.p-price-num { font-family: 'Barlow Condensed', sans-serif; font-size: 5rem; font-weight: 900; color: #fff; line-height: 1; }
.p-price-per { font-size: 0.85rem; color: #6b7280; align-self: flex-end; padding-bottom: 12px; margin-left: 4px; }
.p-price-note { font-size: 0.78rem; color: #4b5563; margin-bottom: 28px; }

/* Calculator */
.p-calc-box {
  background: rgba(0,0,0,0.3);
  border: 1px solid #1e2130;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 28px;
}
.p-calc-label {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 0.82rem; color: #9ca3af; margin-bottom: 12px;
}
.p-calc-count { font-family: 'Barlow Condensed', sans-serif; font-weight: 700; color: #eab308; font-size: 0.9rem; }
.p-slider {
  width: 100%; height: 4px;
  -webkit-appearance: none; appearance: none;
  background: #1e2130; border-radius: 2px; outline: none; margin-bottom: 4px;
  cursor: pointer;
}
.p-slider::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
  background: #eab308; cursor: pointer;
  box-shadow: 0 0 0 3px rgba(234,179,8,0.2);
}
.p-slider::-moz-range-thumb {
  width: 18px; height: 18px; border-radius: 50%;
  background: #eab308; cursor: pointer; border: none;
}
.p-calc-marks {
  display: flex; justify-content: space-between;
  font-size: 0.62rem; color: #374151; margin-bottom: 16px;
}
.p-calc-result {
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(234,179,8,0.06);
  border: 1px solid rgba(234,179,8,0.15);
  border-radius: 10px; padding: 12px 16px; margin-bottom: 10px;
}
.p-calc-result-main { display: flex; align-items: baseline; gap: 6px; }
.p-calc-ppp {
  font-family: 'Barlow Condensed', sans-serif; font-size: 2.2rem; font-weight: 900; color: #eab308;
}
.p-calc-ppp-label { font-size: 0.8rem; color: #9ca3af; }
.p-calc-result-math { font-size: 0.75rem; color: #4b5563; }
.p-calc-callout {
  font-size: 0.72rem; color: #6b7280; line-height: 1.4; font-style: italic;
}

/* Card feature list */
.p-card-features {
  list-style: none; padding: 0; margin: 0 0 28px;
  display: flex; flex-direction: column; gap: 9px;
}
.p-card-features li { display: flex; align-items: flex-start; gap: 10px; font-size: 0.85rem; color: #9ca3af; }
.p-cf-check { color: #10b981; font-weight: 700; flex-shrink: 0; font-size: 0.9rem; }

/* Buy button */
.p-buy-btn {
  display: inline-flex; align-items: center; gap: 10px;
  width: 100%; justify-content: center;
  padding: 16px 28px;
  background: #eab308; color: #0a0c14;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.2rem; font-weight: 800; letter-spacing: 0.03em;
  border: none; border-radius: 10px; cursor: pointer;
  transition: background 0.15s, transform 0.15s;
  margin-bottom: 20px;
}
.p-buy-btn:hover { background: #fbbf24; transform: translateY(-2px); }
.p-buy-xl { font-size: 1.35rem; padding: 18px 40px; width: auto; border-radius: 12px; }

/* One pays note */
.p-one-pays {
  display: flex; gap: 12px; align-items: flex-start;
  background: rgba(255,255,255,0.03);
  border: 1px solid #1e2130; border-radius: 10px;
  padding: 14px 16px; font-size: 0.78rem; color: #6b7280; line-height: 1.5;
}
.p-one-pays strong { color: #d1d5db; }
.p-one-pays-icon { font-size: 1.2rem; flex-shrink: 0; }

/* How it works col */
.p-hiw-col { padding-top: 8px; }
.p-hiw-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2rem, 3.5vw, 2.8rem);
  font-weight: 900; line-height: 1.05; color: #fff;
  margin-bottom: 40px;
}
.p-steps { display: flex; flex-direction: column; gap: 0; margin-bottom: 40px; }
.p-step {
  display: flex; gap: 20px; padding: 24px 0;
  border-bottom: 1px solid #1e2130;
}
.p-step:first-child { border-top: 1px solid #1e2130; }
.p-step-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 2.5rem; font-weight: 900; color: rgba(234,179,8,0.25);
  flex-shrink: 0; line-height: 1; min-width: 48px;
}
.p-step-title { font-size: 0.95rem; font-weight: 700; color: #e5e7eb; margin-bottom: 6px; }
.p-step-desc { font-size: 0.83rem; color: #6b7280; line-height: 1.5; }
.p-guarantee {
  display: flex; gap: 14px; align-items: flex-start;
  background: rgba(16,185,129,0.05);
  border: 1px solid rgba(16,185,129,0.15);
  border-radius: 12px; padding: 18px 20px;
}
.p-guarantee-icon { font-size: 1.4rem; flex-shrink: 0; }
.p-guarantee-title { font-size: 0.9rem; font-weight: 700; color: #10b981; margin-bottom: 4px; }
.p-guarantee-desc { font-size: 0.78rem; color: #6b7280; line-height: 1.45; }

/* ── Comparison table ── */
.p-compare-section {
  padding: 80px 0;
  background: #08090f;
  border-bottom: 1px solid #0f1018;
}
.p-table-wrap { overflow-x: auto; }
.p-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.p-th-feature {
  text-align: left; padding: 12px 20px;
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.7rem;
  font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  color: #374151; border-bottom: 1px solid #1e2130;
}
.p-th-free {
  text-align: center; padding: 12px 24px;
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 700;
  color: #6b7280; border-bottom: 1px solid #1e2130; white-space: nowrap;
}
.p-th-pass {
  text-align: center; padding: 12px 24px;
  font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 800;
  color: #eab308; border-bottom: 1px solid #1e2130; white-space: nowrap;
  background: rgba(234,179,8,0.03);
}
.p-tr-section td { padding: 0; border: none; }
.p-td-section-label {
  padding: 20px 20px 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.65rem; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase;
  color: #374151;
}
.p-td-feature {
  padding: 11px 20px; color: #9ca3af;
  border-bottom: 1px solid rgba(30,33,48,0.7);
}
.p-td-val {
  text-align: center; padding: 11px 24px;
  font-size: 0.85rem; font-weight: 700;
  border-bottom: 1px solid rgba(30,33,48,0.7);
}
.p-td-pass-col { background: rgba(234,179,8,0.02); }
.p-td-yes { color: #10b981; }
.p-td-pass-yes { color: #eab308 !important; font-size: 1rem; }
.p-td-no { color: #1e2130; }
.p-td-dash { color: #1e2130; }

/* ── FAQ ── */
.p-faq-section {
  padding: 80px 0;
  background: #05060a;
  border-bottom: 1px solid #0f1018;
}
.p-faq-list { max-width: 780px; }
.p-faq-item {
  border-bottom: 1px solid #1e2130; padding: 18px 0; cursor: pointer;
}
.p-faq-item:first-child { border-top: 1px solid #1e2130; }
.p-faq-q {
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  font-size: 0.95rem; font-weight: 600; color: #d1d5db;
}
.p-faq-arrow {
  font-size: 1.5rem; color: #4b5563;
  transition: transform 0.2s, color 0.2s; flex-shrink: 0; line-height: 1;
}
.p-faq-arrow.open { transform: rotate(90deg); color: #eab308; }
.p-faq-a {
  font-size: 0.88rem; color: #6b7280; line-height: 1.65;
  max-height: 0; overflow: hidden;
  transition: max-height 0.3s ease, margin-top 0.2s;
}
.p-faq-a.visible { max-height: 200px; margin-top: 12px; }

/* ── Final CTA ── */
.p-final-section {
  position: relative; padding: 100px 0;
  background: #05060a; overflow: hidden; text-align: center;
}
.p-final-glow-l {
  position: absolute; left: -200px; top: 50%; transform: translateY(-50%);
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(234,179,8,0.07) 0%, transparent 70%);
  pointer-events: none;
}
.p-final-glow-r {
  position: absolute; right: -200px; top: 50%; transform: translateY(-50%);
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(234,179,8,0.07) 0%, transparent 70%);
  pointer-events: none;
}
.p-final-inner { position: relative; z-index: 2; }
.p-final-eyebrow { font-size: 1rem; margin-bottom: 20px; color: #eab308; }
.p-final-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2.8rem, 6vw, 4.5rem);
  font-weight: 900; line-height: 1.0; color: #fff;
  text-transform: uppercase; margin-bottom: 40px;
}
.p-final-trust { margin-top: 18px; font-size: 0.82rem; color: #4b5563; letter-spacing: 0.03em; }

/* ── Responsive ── */
@media (max-width: 960px) {
  .p-purchase-inner { grid-template-columns: 1fr; gap: 48px; }
  .p-features-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .p-features-grid { grid-template-columns: 1fr; }
  .p-price-card { padding: 28px 24px; }
  .p-headline { font-size: 2.5rem; }
}
</style>
