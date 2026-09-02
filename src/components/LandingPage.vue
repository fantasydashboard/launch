<template>
  <div class="landing-root">

    <!-- ══════════════════════════════════════════════
         HERO
    ══════════════════════════════════════════════ -->
    <section class="hero-section" aria-label="Ultimate Fantasy Dashboard">
      <div class="hero-inner">
        <!--
          The mark alone reads "UFD_", which means nothing to a stranger. The full name is
          set as text beside it so it is always legible, always correct, and never depends
          on someone recognising a logo they have never seen.
        -->
        <div class="hero-logo-wrap">
          <img src="/brand/ufd-primary-dark.png" alt="" class="hero-logo" aria-hidden="true" />
          <span class="hero-wordmark">Ultimate&nbsp;Fantasy&nbsp;Dashboard</span>
        </div>

        <div class="hero-eyebrow"><span class="eyebrow-dot eyebrow-dot-primary"></span>Draft &middot; Waiver &middot; Start/sit &middot; Trade</div>

        <h1 class="hero-headline">
          <span class="headline-final">Don't tell your league.</span>
        </h1>

        <p class="hero-sub">
          Everyone in your league is deciding off the same projections their platform handed
          them. These are rankings built for your league's exact scoring — for the draft, the
          rest of the season, and this week — and you can swap in your own any time.
        </p>

        <div class="hero-ctas">
          <button class="cta-primary" @click="$emit('open-signup')" aria-label="Connect your league for free">
            Connect a league. Free.
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <a href="#picker" class="cta-ghost" @click.prevent="scrollTo('picker')" aria-label="See what you would get">
            See what you'd get
          </a>
        </div>

        <!--
          A top-five list was the wrong thing to show. The top of any board is the one place
          our rankings and the market agree, so it is the worst possible place to demonstrate a
          disagreement — and it forced an indefensible claim (a TE at 2 overall) to manufacture
          one. The middle rounds are where the edge actually lives.

          The numbers here are internally consistent with the real rule in
          src/draft/room/marketDisagreement.ts: the flag fires at one full round of
          disagreement, and the gap shown is (adp - ours) / teams at 12 teams.
        -->
        <div class="hero-stage board-stage" aria-hidden="true">
          <div class="board-card">
            <div class="board-head">
              <span class="board-title">Your board &middot; rounds 3&ndash;6</span>
              <span class="board-tag">12-team &middot; Half-PPR &middot; TE premium</span>
            </div>
            <div class="board-thead">
              <span class="bd-nm">Player</span>
              <span class="bd-num">Sleeper ADP</span>
              <span class="bd-num">Your rank</span>
              <span class="bd-flag">Read</span>
            </div>

            <div class="board-row row-value">
              <span class="bd-nm"><b>Chase Brown</b><span class="cmp-pos pos-rb">RB</span></span>
              <span class="bd-num">5.02</span>
              <span class="bd-num bd-ours">3.10</span>
              <span class="bd-flag"><span class="flag flag-value">Value</span><span class="bd-gap">+1.3 rds</span></span>
            </div>
            <div class="board-row row-value">
              <span class="bd-nm"><b>Trey McBride</b><span class="cmp-pos pos-te">TE</span></span>
              <span class="bd-num">4.08</span>
              <span class="bd-num bd-ours">3.03</span>
              <span class="bd-flag"><span class="flag flag-value">Value</span><span class="bd-gap">+1.4 rds</span></span>
            </div>
            <div class="board-row">
              <span class="bd-nm"><b>Jaxon Smith-Njigba</b><span class="cmp-pos pos-wr">WR</span></span>
              <span class="bd-num">3.05</span>
              <span class="bd-num bd-ours">3.09</span>
              <span class="bd-flag"><span class="bd-inline">in line</span></span>
            </div>
            <div class="board-row row-fade">
              <span class="bd-nm"><b>Tony Pollard</b><span class="cmp-pos pos-rb">RB</span></span>
              <span class="bd-num">4.11</span>
              <span class="bd-num bd-ours">6.03</span>
              <span class="bd-flag"><span class="flag flag-fade">Fade</span><span class="bd-gap bd-gap-neg">&minus;1.3 rds</span></span>
            </div>
          </div>
          <p class="board-caption">
            The flag only fires when your rankings and the room disagree by a <b>full round</b> —
            rare on purpose, so it means something when it shows up. Your board is built from your
            league's scoring, not a generic list.
          </p>
        </div>
      </div>
    </section>


    <!-- ══════════════════════════════════════════════
         THE THREE DECISIONS
    ══════════════════════════════════════════════ -->
    <section class="tools-section" aria-label="The three decisions UFD makes for you">
      <div class="section-inner">
        <!--
          "All off the same numbers" described our architecture, not the buyer's advantage.
          Nobody has ever bought a shared engine. The claim that matters is that the output is
          an instruction, not another list to interpret.
        -->
        <div class="section-eyebrow eyebrow-secondary">Where seasons are won</div>
        <h2 class="section-headline">Everyone gets rankings.<br/><span class="accent-secondary">You get the decision.</span></h2>
        <p class="section-sub tools-sub">
          Four calls decide your season, and every one of them reads your league before it answers:
          your exact scoring, the holes in your own roster, what the other eleven teams are
          rostering, and how those managers have drafted before. What comes back is a move.
        </p>

        <div class="tools-grid tools-grid-4">
          <article class="tool-card">
            <div class="tool-num">01 &middot; Draft</div>
            <h3 class="tool-name">The Draft Room</h3>
            <div class="tool-vis" aria-hidden="true">
              <div class="tv-row tv-take">
                <span class="tv-label">Take</span>
                <span class="tv-name">Sam LaPorta</span>
                <span class="tv-pos pos-te">TE</span>
              </div>
              <div class="tv-stats">
                <span><b>+18.4</b> edge</span>
                <span><b>12%</b> lasts</span>
                <span class="tv-cliff">cliff after him</span>
              </div>
            </div>
            <p class="tool-body">
              Live, pick by pick. What it costs to wait, who survives to your next turn, and where
              the board falls off. It learns how your league mates actually draft from their own
              past drafts.
            </p>
            <p class="tool-scope">Live Sleeper football drafts &middot; basketball and hockey before their seasons</p>
          </article>

          <article class="tool-card">
            <div class="tool-num">02 &middot; Waiver</div>
            <h3 class="tool-name">The Wire</h3>
            <div class="tool-vis" aria-hidden="true">
              <div class="tv-row">
                <span class="tv-name">Jaylen Warren</span>
                <span class="tv-pos pos-rb">RB</span>
                <span class="tv-gain">+11.2 / wk</span>
              </div>
              <div class="tv-sub">replaces your RB2 &middot; 3% rostered</div>
            </div>
            <p class="tool-body">
              Ranked by what a player adds to <em>your</em> starting lineup, not by who scored most
              last week. The upgrades that are actually upgrades.
            </p>
            <p class="tool-scope">Every league, all four sports &middot; points and category</p>
          </article>

          <article class="tool-card">
            <div class="tool-num">03 &middot; Start/sit</div>
            <h3 class="tool-name">Suggested Lineup</h3>
            <div class="tool-vis" aria-hidden="true">
              <div class="tv-row tv-start"><span class="tv-flag">Start</span><span class="tv-name">Tank Dell</span><span class="tv-proj">14.8</span></div>
              <div class="tv-row tv-sit"><span class="tv-flag">Sit</span><span class="tv-name">Chris Godwin</span><span class="tv-proj">11.1</span></div>
            </div>
            <p class="tool-body">
              Your optimal lineup for this week, in your scoring, with the reason attached. The
              close calls are where seasons quietly leak away.
            </p>
            <p class="tool-scope">Every league, all four sports</p>
          </article>

          <article class="tool-card">
            <div class="tool-num">04 &middot; Trade</div>
            <h3 class="tool-name">Trade Analyzer</h3>
            <div class="tool-vis" aria-hidden="true">
              <div class="tv-row tv-verdict">
                <span class="tv-flag tv-flag-lev">Leverage</span>
                <span class="tv-name">You win by 6.1 / wk</span>
              </div>
              <div class="tv-sub">a reach for them &middot; they start 2 RBs and roster 3</div>
            </div>
            <p class="tool-body">
              It reads every roster in your league to find the manager who's desperate for what
              you're sitting on — then scores the deal for both sides and tells you when you have
              the leverage to ask for more than fair.
            </p>
            <p class="tool-scope">Every league, all four sports &middot; points and category</p>
          </article>
        </div>

        <!--
          This block used to read as a footnote about file uploads. It is actually the answer to
          the single biggest objection on the page — "why would I trust your projections" — so it
          says the real thing: the rankings are an input you can replace, and the product is what
          gets done with them.
        -->
        <div class="tools-rankings">
          <div class="tools-rankings-label">Don't trust our numbers? Use someone else's.</div>
          <p class="tools-rankings-body">
            The rankings are the input, not the product. Paste or upload any list — the subscription
            you already pay for, the analyst you actually listen to, your own spreadsheet — and every
            recommendation on every page rebuilds off it: draft picks, waiver targets, lineup calls,
            trade grades. <b>You keep your source. You get the decisions.</b>
          </p>
          <div class="horizons" aria-hidden="true">
            <span class="horizon"><b>Draft</b>August, once a year</span>
            <span class="horizon"><b>Rest of season</b>trades and holds</span>
            <span class="horizon"><b>This week</b>waivers and start/sit</span>
            <span class="horizon horizon-upload"><b>Yours</b>paste or upload &middot; CSV</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         PICKER
    ══════════════════════════════════════════════ -->
    <section class="rules-section" id="picker" aria-label="Works with your league's exact rules">
      <div class="section-inner">
        <div class="section-eyebrow eyebrow-secondary">Your league, your rules</div>
        <h2 class="section-headline">One player.<br/><span class="accent-secondary">Three answers.</span></h2>
        <p class="section-sub rules-sub">
          Your settings are not a detail on a signup form — they change the call. Same receiver,
          same Sunday, three sets of rules.
        </p>

        <!--
          The picker that lived here was interactive and resolved to a standings table: the user
          did work, and the payoff was the least valuable screen we own. This makes the same
          "it fits your league" argument with the most valuable one — a decision that flips
          because the rules changed, which is precisely what a default projection cannot see.
        -->
        <div class="rules-block" aria-hidden="true">
          <div class="rules-player">
            <span class="rp-name">Jaylen Waddle</span>
            <span class="cmp-pos pos-wr">WR</span>
            <span class="rp-meta">Week 11 &middot; at KC &middot; on your bench</span>
          </div>

          <div class="rules-cards">
            <div class="rule-card">
              <div class="rc-league">10-team &middot; Standard</div>
              <div class="rc-verdict rc-sit">Sit</div>
              <div class="rc-detail"><b>8.1</b> proj &middot; WR38 this week</div>
              <div class="rc-slot">your WR4</div>
            </div>
            <div class="rule-card">
              <div class="rc-league">12-team &middot; Half-PPR</div>
              <div class="rc-verdict rc-flex">Flex</div>
              <div class="rc-detail"><b>11.4</b> proj &middot; WR26 this week</div>
              <div class="rc-slot">your WR3</div>
            </div>
            <div class="rule-card rule-card-hi">
              <div class="rc-league">14-team &middot; Full PPR</div>
              <div class="rc-verdict rc-start">Start</div>
              <div class="rc-detail"><b>14.6</b> proj &middot; WR14 this week</div>
              <div class="rc-slot">your WR2</div>
            </div>
          </div>

          <p class="rules-caption">
            Nothing about the player changed. Reception scoring and league size did — and that is
            the difference between leaving him on your bench and starting him.
          </p>
        </div>

        <div class="compat">
          <div class="compat-row">
            <span class="compat-label">Platforms</span>
            <span class="compat-vals">
              <span class="compat-plat"><img src="/sleeper.svg" alt="" aria-hidden="true" class="compat-logo" />Sleeper</span>
              <span class="compat-plat"><img src="/yahoo-fantasy.svg" alt="" aria-hidden="true" class="compat-logo" />Yahoo</span>
              <span class="compat-plat"><img src="/espn-logo.svg" alt="" aria-hidden="true" class="compat-logo" />ESPN</span>
            </span>
          </div>
          <div class="compat-row">
            <span class="compat-label">Sports</span>
            <span class="compat-vals">Football &middot; Baseball &middot; Basketball &middot; Hockey</span>
          </div>
          <div class="compat-row">
            <span class="compat-label">Formats</span>
            <span class="compat-vals">Points &middot; Head-to-head categories &middot; Redraft, keeper and dynasty</span>
          </div>
          <div class="compat-row">
            <span class="compat-label">Setup</span>
            <span class="compat-vals">Paste a league link or sign in. Nothing changes on your league's end.</span>
          </div>
        </div>

        <button class="cta-primary rules-cta" @click="$emit('open-signup')" aria-label="Connect your league for free">
          Connect your league. Free.
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      </div>
    </section>


    <!-- ══════════════════════════════════════════════
         THE PITCH — trade leverage
    ══════════════════════════════════════════════ -->
    <!--
      This slot used to hold "It tells you when it doesn't know" — an argument for STAYING,
      spent in the place a stranger decides whether to TRY. The restraint claim still lives in
      the FAQ, where a skeptic goes looking for it. What belongs here is the single most
      differentiated thing the product does and the page never mentioned: it reads the other
      rosters, finds who is desperate, and drafts the message.
    -->
    <section class="pitch-section" aria-label="How the trade analyzer finds leverage and writes your offer">
      <div class="section-inner pitch-inner">
        <div class="pitch-copy">
          <div class="section-eyebrow eyebrow-tertiary">The part nobody else does</div>
          <h2 class="section-headline">It finds who's desperate.<br/><span class="accent-tertiary">Then it writes the message.</span></h2>
          <p class="section-sub">
            A value chart has never seen your league. This reads every roster in it, finds the
            manager whose hole your bench player fills, and scores the deal from both sides — so you
            know whether you're asking for fair or asking for more than fair, before you send it.
          </p>
          <p class="section-sub pitch-sub-2">
            Then it drafts the opener, leading with <em>their</em> angle, because that's the one
            that gets a reply.
          </p>
          <button class="cta-primary pitch-cta" @click="$emit('open-signup')" aria-label="Connect a league for free">
            Connect a league. Free.
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>

        <div class="pitch-stage" role="img" aria-label="A trade suggestion card: get Garrett Wilson, give Rhamondre Stevenson, flagged as leverage and a reach for the other manager, with a ready-to-send message.">
          <div class="deal-card" aria-hidden="true">
            <div class="deal-head">
              <span class="deal-flags"><b class="deal-lev">Leverage</b><span class="deal-sep">&middot;</span>a reach for them</span>
              <span class="deal-meter">+6.1 / wk</span>
            </div>

            <div class="deal-line">
              <span class="deal-tag deal-get">Get</span>
              <span class="deal-nm">Garrett Wilson</span>
              <span class="cmp-pos pos-wr">WR</span>
              <span class="deal-from">from Trash&nbsp;Can&nbsp;Wins</span>
            </div>
            <div class="deal-line">
              <span class="deal-tag deal-give">Give</span>
              <span class="deal-nm deal-nm-give">Rhamondre Stevenson</span>
              <span class="cmp-pos pos-rb">RB</span>
            </div>

            <div class="deal-why">
              <div class="dw-head">why this works</div>
              <div class="dw-row"><span class="dw-k">You</span><span class="dw-v">WR2 &rarr; WR1 &middot; <b class="dw-up">+6.1 / wk</b> in your scoring</span></div>
              <div class="dw-row"><span class="dw-k">Them</span><span class="dw-v">start 2 RBs, roster 3 &middot; 0&ndash;3 since their RB1 went down</span></div>
            </div>

            <div class="deal-pitch">
              <div class="dp-head">Pitch<span class="dp-copy">copy</span></div>
              <p class="dp-body">
                “Trash Can Wins is thin at RB — Stevenson helps there and gives you a starter this
                week. Offer Stevenson for Garrett Wilson, who fills your WR2.”
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         THE DASHBOARD (free layer)
    ══════════════════════════════════════════════ -->
    <section class="dash-section" aria-label="Everything included free">
      <div class="section-inner">
        <div class="section-eyebrow eyebrow-primary">And the rest of it, free</div>
        <h2 class="section-headline">The dashboard part<br/><span class="accent-primary">is the free part.</span></h2>
        <p class="section-sub dash-sub">
          The decisions are what you pay for. Everything that tells you where you stand — for every
          league you're in, in all four sports — costs nothing and never expires.
        </p>
        <div class="dash-grid">
          <div class="dash-item"><b>Power rankings</b>Ranked by roster strength, not record — with all-play and the luck read.</div>
          <div class="dash-item"><b>League history</b>Every season your league has played. Records, head-to-head, career stats.</div>
          <div class="dash-item"><b>Standings &amp; scores</b>Live through the week, in points or category formats.</div>
          <div class="dash-item"><b>Every league you're in</b>ESPN, Yahoo and Sleeper. Football, baseball, basketball, hockey.</div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         FINAL CTA
    ══════════════════════════════════════════════ -->
    <section class="final-cta-section" aria-label="Connect your league">
      <div class="section-inner final-inner">
        <div class="section-eyebrow eyebrow-primary">Ready</div>
        <h2 class="final-headline">
          Everyone in your league<br/>has the same projections.<br/>
          <span class="final-accent">You don't have to.</span>
        </h2>
        <button class="cta-primary cta-xl" @click="$emit('open-signup')" aria-label="Connect your league for free">
          Connect your league. Free.
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <div class="final-trust">No credit card. Sleeper, Yahoo, ESPN. Four sports. Setup in 3 minutes.</div>
        <!--
          Pricing was only linked from the legal bar, beside Privacy and Contact — the place
          people look for terms, not for what something costs. Someone who has read this far
          is deciding, and "what does it cost" is the next question they have.
        -->
        <router-link to="/pricing" class="final-pricing-link">
          Free forever, or $39 a year for the decisions &rarr;
        </router-link>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         FAQ
    ══════════════════════════════════════════════ -->
    <section class="faq-section" aria-label="Frequently asked questions about Ultimate Fantasy Dashboard">
      <div class="section-inner">
        <div class="section-eyebrow eyebrow-secondary">Questions</div>
        <h2 class="section-headline faq-headline">Got questions?<br/><span class="accent-secondary">We've got answers.</span></h2>
        <div class="faq-list faq-list-full">
          <div v-for="(faq, i) in faqs" :key="i" class="faq-item">
            <button
              class="faq-q"
              :aria-expanded="openFaq === i"
              :aria-controls="`faq-a-${i}`"
              @click="toggleFaq(i)"
            >
              <span>{{ faq.q }}</span>
              <span class="faq-arrow" :class="{ open: openFaq === i }" aria-hidden="true">›</span>
            </button>
            <div
              :id="`faq-a-${i}`"
              class="faq-a-wrap"
              :class="{ open: openFaq === i }"
              role="region"
            >
              <div class="faq-a">{{ faq.a }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer handled by AppFooter in App.vue -->

    <!-- Minimal legal bar for landing page -->
    <div class="legal-bar">
      <span class="legal-text">© {{ new Date().getFullYear() }} Ultimate Fantasy Dashboard</span>
      <router-link to="/free-tools" class="legal-link">Free tools</router-link>
      <router-link to="/resources" class="legal-link">Resources</router-link>
      <router-link to="/privacy" class="legal-link">Privacy</router-link>
      <a href="mailto:support@ultimatefantasydashboard.com" class="legal-link">Contact</a>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

defineEmits<{ (e: 'open-signup'): void }>()

// ── FAQ ────────────────────────────────────────────────────────────────────
const openFaq = ref<number | null>(null)
const faqs = [
  {
    q: 'Does it work with my existing Sleeper / Yahoo / ESPN league?',
    a: "Yes. Paste your league link or connect your account. All three platforms, across football, baseball, basketball and hockey. Nothing to change on your league's end.",
  },
  {
    q: 'What do I actually get for free?',
    a: "Power rankings, all-play, standings, scores and your full league history — for every league you're in, with no time limit and no card. It isn't a trial. The Season Pass adds the decisions: the Draft Room, waiver targets, trade analysis and the matchup deep dive.",
  },
  {
    q: 'What does the Draft Room actually do?',
    a: "It watches your draft live and tells you who to take next — what it costs to wait on a position, who is likely to survive until your next pick, and where the board is about to break. It also learns how your league mates draft from their past drafts. Today it covers live Sleeper football drafts; basketball and hockey arrive before those seasons. The Wire and Trades already work in every league and all four sports.",
  },
  {
    q: 'Do my league mates need to sign up?',
    a: "No, and most of the time you would rather they didn't. This is your edge, not a league-wide tool. Only you need an account.",
  },
  {
    q: 'Is this just for football?',
    a: "No. Football, baseball, basketball and hockey, in points and category formats, all in one account. If you play more than one sport, they all sit in the same place.",
  },
  {
    q: "Why does it sometimes refuse to tell me something?",
    a: "Because three weeks of results cannot tell you who is lucky, and a draft with no picks in it cannot tell you who is falling. When there isn't enough evidence yet, it says so rather than inventing a confident answer. That restraint is the whole point.",
  },
  {
    q: 'How current is the data?',
    a: 'Standings, scores and rosters update through the week. Projections refresh daily, and the draft board updates pick by pick while you are drafting.',
  },
  {
    q: 'Can I connect multiple leagues?',
    a: 'Yes, and one Season Pass covers all of them — different platforms, different sports, dynasty, redraft and keeper, in one dashboard.',
  },
]

function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}

// ── Utils ──────────────────────────────────────────────────────────────────
function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' })
}
</script>

<style scoped>
/* ── Fonts ─────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');

/* ── Tokens ────────────────────────────────────────────────────── */
.landing-root {
  /* Neutrals tinted warm toward brand hue (no pure black/white) */
  --ink-1: oklch(0.97 0.005 90);   /* near-white, off-warm */
  --ink-2: oklch(0.86 0.008 90);   /* light text */
  --ink-3: oklch(0.66 0.010 90);   /* muted text */
  --ink-3-soft: oklch(0.55 0.010 90);
  --ink-4: oklch(0.36 0.012 90);   /* dim text / borders */
  --ink-5: oklch(0.25 0.015 90);   /* dark surface */
  --ink-6: oklch(0.18 0.015 90);   /* deeper surface */
  --ink-7: oklch(0.14 0.018 90);   /* near-black bg, warm tinted */
  --ink-8: oklch(0.10 0.018 90);   /* deepest bg */

  /* Brand */
  --accent-primary: oklch(0.78 0.18 92);    /* yellow. CTA + my-team only */
  --accent-primary-soft: oklch(0.78 0.18 92 / 0.14);
  --accent-primary-faint: oklch(0.78 0.18 92 / 0.06);
  --accent-primary-border: oklch(0.78 0.18 92 / 0.35);
  --accent-secondary: oklch(0.70 0.27 350);  /* magenta-pink */
  --accent-secondary-soft: oklch(0.70 0.27 350 / 0.14);
  --accent-secondary-border: oklch(0.70 0.27 350 / 0.35);
  --accent-tertiary: oklch(0.72 0.18 195);   /* teal */
  --accent-tertiary-soft: oklch(0.72 0.18 195 / 0.14);
  --accent-tertiary-border: oklch(0.72 0.18 195 / 0.35);

  /* Signals */
  --signal-pos: oklch(0.72 0.16 160);
  --signal-neg: oklch(0.63 0.22 25);

  /* iMessage greys (slightly warm) */
  --imsg-grey: oklch(0.32 0.008 270);
  --imsg-grey-2: oklch(0.42 0.008 270);
}

/* ── Root ──────────────────────────────────────────────────────── */
.landing-root {
  font-family: 'Barlow', sans-serif;
  background: var(--ink-8);
  color: var(--ink-2);
  overflow-x: hidden;
}

/* ── Shared section styles ─────────────────────────────────────── */
.section-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
.section-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent-primary);
  margin-bottom: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.eyebrow-primary   { color: var(--accent-primary); }
.eyebrow-secondary { color: var(--accent-secondary); }
.eyebrow-tertiary  { color: var(--accent-tertiary); }
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 900;
  line-height: 1.05;
  color: var(--ink-1);
  margin-bottom: 16px;
  max-width: 22ch;
}
.section-sub {
  font-size: 1.05rem;
  color: var(--ink-3);
  margin-bottom: 40px;
  max-width: 65ch;
  line-height: 1.55;
}
.accent-primary   { color: var(--accent-primary); }
.accent-secondary { color: var(--accent-secondary); }
.accent-tertiary  { color: var(--accent-tertiary); }

/* ── CTAs ──────────────────────────────────────────────────────── */
.cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: var(--accent-primary);
  color: var(--ink-8);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  text-decoration: none;
}
.cta-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 14px 22px;
  background: transparent;
  color: var(--ink-2);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  border: 1px solid var(--ink-5);
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
}
.cta-xl { padding: 18px 40px; font-size: 1.25rem; }

/* Hover & focus (motion-aware) */
@media (prefers-reduced-motion: no-preference) {
  .cta-primary { transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), background 0.18s, box-shadow 0.18s; }
  .cta-primary:hover { background: oklch(0.84 0.18 92); transform: translateY(-2px); box-shadow: 0 12px 36px oklch(0.78 0.18 92 / 0.28); }
  .cta-ghost { transition: color 0.18s, border-color 0.18s, background 0.18s; }
  .cta-ghost:hover { color: var(--ink-1); border-color: var(--ink-4); background: oklch(0.18 0.015 90 / 0.6); }}
.cta-primary:focus-visible,
.cta-ghost:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 3px;
}

/* ══════════════════════════════════════════════
   HERO
══════════════════════════════════════════════ */
.hero-section {
  position: relative;
  padding: 96px 0 64px;
  overflow: hidden;
}
.hero-inner {
  position: relative;
  z-index: 2;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 24px;
  text-align: center;
}
.hero-logo-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 28px;
}
.hero-logo {
  height: 72px;
  width: auto;
  object-fit: contain;
  opacity: 1;
}
@media (max-width: 720px) {
  .hero-logo { height: 56px; }}

.hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-3);
  margin-bottom: 22px;
  padding: 6px 14px;
  border: 1px solid var(--ink-5);
  border-radius: 999px;
  background: oklch(0.18 0.015 90 / 0.5);
}
.eyebrow-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--accent-primary);
  box-shadow: 0 0 12px var(--accent-primary);
}

.hero-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 900;
  line-height: 0.95;
  color: var(--ink-1);
  text-transform: uppercase;
  letter-spacing: -0.015em;
  margin: 0 auto 22px;
  max-width: 18ch;
}
.headline-final {
  display: block;
  color: var(--accent-primary);
}

.hero-sub {
  font-size: 1.15rem;
  color: var(--ink-3);
  max-width: 56ch;
  margin: 0 auto 32px;
  line-height: 1.6;
}

.hero-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-bottom: 72px;
}

/* Hero stage: card + handwritten caption */
.hero-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 36px;
  max-width: 880px;
  margin: 0 auto;
}

/* Small breathing room between successive outgoing attachment bubbles */
/* ── Wordmark: the mark says UFD_, the text says what that stands for ───── */
.hero-logo-wrap { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
.hero-wordmark {
  font-family: 'Barlow Condensed', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: clamp(0.82rem, 1.5vw, 1rem);
  color: var(--ink-3);
  white-space: nowrap;
}
.cmp-pos {
  font-size: 0.62rem; font-weight: 700; letter-spacing: 0.05em;
  padding: 2px 5px; border-radius: 4px;
}
.pos-rb { background: oklch(0.62 0.16 150 / 0.18); color: oklch(0.78 0.16 150); }
.pos-wr { background: oklch(0.62 0.16 250 / 0.18); color: oklch(0.78 0.14 250); }
.pos-te { background: oklch(0.68 0.16 60 / 0.18); color: oklch(0.82 0.15 60); }

/* ── The free dashboard layer ──────────────────────────────────────────── */
.dash-section { padding: clamp(56px, 8vw, 104px) 0; }
.dash-sub { max-width: 62ch; margin-bottom: clamp(28px, 4vw, 44px); }
.dash-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; }
.dash-item {
  display: flex; flex-direction: column; gap: 6px;
  padding: 18px 18px 16px; border-radius: 13px;
  background: oklch(0.13 0.012 265);
  border: 1px solid oklch(0.23 0.012 265);
  font-size: 0.86rem; line-height: 1.55; color: var(--ink-3);
}
.dash-item b {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.06em;
  font-size: 0.92rem; color: var(--ink-1);
}

/* ── Decision-card visuals: a peek at the actual output ────────────────── */
.tools-grid-4 { grid-template-columns: repeat(auto-fit, minmax(248px, 1fr)); }
.tool-vis {
  border-radius: 10px;
  padding: 11px 12px;
  margin-bottom: 14px;
  background: oklch(0.11 0.012 265);
  border: 1px solid oklch(0.22 0.012 265);
  font-size: 0.82rem;
}
.tv-row { display: flex; align-items: center; gap: 8px; }
.tv-row + .tv-row { margin-top: 7px; }
.tv-label, .tv-flag {
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
  padding: 2px 6px; border-radius: 4px;
  background: var(--accent-primary-soft); color: var(--accent-primary);
}
.tv-sit .tv-flag { background: oklch(0.6 0.02 265 / 0.2); color: var(--ink-3-soft); }
.tv-name { color: var(--ink-1); font-weight: 600; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tv-pos { font-size: 0.6rem; font-weight: 700; padding: 2px 5px; border-radius: 4px; }
.tv-proj, .tv-gain { font-variant-numeric: tabular-nums; color: var(--ink-2); font-size: 0.8rem; }
.tv-gain { color: oklch(0.78 0.16 150); font-weight: 700; }
.tv-sit .tv-name, .tv-sit .tv-proj { color: var(--ink-3-soft); }
.tv-stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 9px; font-size: 0.72rem; color: var(--ink-3-soft); }
.tv-stats b { color: var(--ink-1); font-variant-numeric: tabular-nums; }
.tv-cliff { color: oklch(0.7 0.18 25); }
.tv-sub { margin-top: 7px; font-size: 0.72rem; color: var(--ink-3-soft); }

/* ── Ranking horizons ──────────────────────────────────────────────────── */
.horizons { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.horizon {
  display: flex; flex-direction: column; gap: 2px;
  padding: 9px 13px; border-radius: 9px;
  background: oklch(0.12 0.012 265);
  border: 1px solid oklch(0.24 0.012 265);
  font-size: 0.7rem; color: var(--ink-3-soft);
}
.horizon b {
  font-family: 'Barlow Condensed', sans-serif; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em;
  font-size: 0.78rem; color: var(--ink-2);
}
.horizon-upload { border-color: var(--accent-tertiary-border); }
.horizon-upload b { color: var(--accent-tertiary); }

/* ── The three decisions ───────────────────────────────────────────────── */
.tools-section { padding: clamp(64px, 9vw, 120px) 0; }
.tools-sub { max-width: 62ch; margin-bottom: clamp(32px, 5vw, 52px); }
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(268px, 1fr));
  gap: 18px;
  margin-bottom: 28px;
}
.tool-card {
  display: flex;
  flex-direction: column;
  padding: 26px 24px 22px;
  border-radius: 16px;
  background: oklch(0.155 0.012 265);
  border: 1px solid oklch(0.26 0.012 265);
}
.tool-num {
  font-family: var(--font-display, inherit);
  font-size: 0.78rem;
  letter-spacing: 0.2em;
  color: oklch(0.66 0.17 350);
  margin-bottom: 14px;
}
.tool-name {
  font-family: var(--font-display, inherit);
  font-size: clamp(1.35rem, 2.4vw, 1.7rem);
  font-weight: 800;
  color: #fff;
  margin: 0 0 12px;
  line-height: 1.05;
}
.tool-body {
  font-size: 0.95rem;
  line-height: 1.62;
  color: oklch(0.74 0.01 265);
  margin: 0 0 16px;
  flex: 1;
}
.tool-body em { font-style: normal; color: #fff; }
/* The scope line is deliberately not hidden in a tooltip: the Draft Room does not work
   everywhere yet, and finding that out after paying is the one thing this page must
   never do. */
.tool-scope {
  font-size: 0.76rem;
  line-height: 1.5;
  color: oklch(0.56 0.012 265);
  margin: 0;
  padding-top: 12px;
  border-top: 1px solid oklch(0.24 0.012 265);
}
.tools-rankings {
  border-radius: 16px;
  padding: 24px 26px;
  background: oklch(0.14 0.02 265);
  border: 1px solid oklch(0.3 0.05 265);
}
.tools-rankings-label {
  font-size: 0.74rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: oklch(0.78 0.14 200);
  margin-bottom: 10px;
}
.tools-rankings-body {
  font-size: 0.98rem;
  line-height: 1.65;
  color: oklch(0.76 0.01 265);
  margin: 0;
  max-width: 74ch;
}
@media (prefers-reduced-motion: no-preference) {
  @keyframes imsg-blink {
    0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
    30%           { opacity: 1;   transform: translateY(-2px); }
  }}

/* ══════════════════════════════════════════════
   FINAL CTA
══════════════════════════════════════════════ */
.final-cta-section {
  position: relative;
  padding: 120px 0;
  background: var(--ink-8);
  overflow: hidden;
  text-align: center;
}
.final-cta-section::before {
  content: "";
  position: absolute;
  top: 50%; left: 50%;
  width: 800px; height: 400px;
  transform: translate(-50%, -50%);
  background: radial-gradient(ellipse, oklch(0.78 0.18 92 / 0.06) 0%, transparent 65%);
  pointer-events: none;
}
.final-inner { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; }
.final-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2.6rem, 6.5vw, 4.6rem);
  font-weight: 900;
  line-height: 1.0;
  color: var(--ink-1);
  text-transform: uppercase;
  margin: 16px 0 36px;
  max-width: 18ch;
}
.final-accent { color: var(--accent-primary); }
.final-pricing-link {
  display: inline-block;
  margin-top: 1.1rem;
  font-size: 0.95rem;
  color: #9ca3af;
  text-decoration: none;
  border-bottom: 1px solid rgba(156, 163, 175, 0.35);
  padding-bottom: 2px;
  transition: color 0.15s ease, border-color 0.15s ease;
}
.final-pricing-link:hover,
.final-pricing-link:focus-visible {
  color: #fff;
  border-color: #fff;
}
.final-trust {
  margin-top: 18px;
  font-size: 0.85rem;
  color: var(--ink-3-soft);
  letter-spacing: 0.03em;
}

/* ══════════════════════════════════════════════
   FAQ
══════════════════════════════════════════════ */
.faq-section {
  padding: 100px 0;
  background: var(--ink-7);
}
.faq-headline { font-size: clamp(1.8rem, 4vw, 2.8rem); margin-bottom: 40px; }
.faq-list-full { display: flex; flex-direction: column; max-width: 800px; }
.faq-item {
  border-bottom: 1px solid var(--ink-5);
}
.faq-item:first-child { border-top: 1px solid var(--ink-5); }
.faq-q {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 20px 0;
  background: transparent;
  border: none;
  font-family: 'Barlow', sans-serif;
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--ink-2);
  text-align: left;
  cursor: pointer;
}
.faq-q:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: 4px;
}
.faq-arrow {
  font-size: 1.5rem;
  color: var(--ink-4);
  flex-shrink: 0;
  line-height: 1;
}
@media (prefers-reduced-motion: no-preference) {
  .faq-arrow { transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), color 0.22s; }
  .faq-a-wrap { transition: grid-template-rows 0.28s cubic-bezier(0.22, 1, 0.36, 1), padding-bottom 0.22s; }}
.faq-arrow.open { transform: rotate(90deg); color: var(--accent-primary); }
/* Non-clipping accordion via grid 0fr → 1fr trick */
.faq-a-wrap {
  display: grid;
  grid-template-rows: 0fr;
  padding-bottom: 0;
}
.faq-a-wrap.open {
  grid-template-rows: 1fr;
  padding-bottom: 20px;
}
.faq-a-wrap > .faq-a {
  min-height: 0;
  overflow: hidden;
  font-size: 0.92rem;
  color: var(--ink-3);
  line-height: 1.65;
  max-width: 70ch;
}

/* ══════════════════════════════════════════════
   LEGAL BAR
══════════════════════════════════════════════ */
.legal-bar {
  background: var(--ink-8);
  border-top: 1px solid var(--ink-6);
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  flex-wrap: wrap;
}
.legal-text { font-size: 12px; color: var(--ink-4); }
.legal-link {
  font-size: 12px;
  color: var(--ink-4);
  text-decoration: none;
}
.legal-link:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
  border-radius: 3px;
}
@media (prefers-reduced-motion: no-preference) {
  .legal-link { transition: color 0.15s; }
  .legal-link:hover { color: var(--signal-pos); }}

/* ══════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════ */
@media (max-width: 900px) {
  .hero-stage { flex-direction: column; gap: 14px; }}

@media (max-width: 600px) {
  .hero-headline { font-size: 3rem; }
  .section-headline { font-size: 1.8rem; }
  .hero-section { padding: 64px 0 48px; }}

/* ══════════════════════════════════════════════
   REDUCED MOTION FALLBACK
══════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
  }}
/* ── The board slice: where our rank and the market disagree ────────────── */
/* The hero stage is a flex row built for a card beside a caption; the board
   wants the caption underneath it, so this variant overrides the axis rather
   than adding a second stage class. */
.board-stage { flex-direction: column; gap: 16px; max-width: 720px; }
.board-card {
  /* The hero centres its text; a data table must not inherit that or the column
     headers float in the middle of their columns. */
  text-align: left;
  width: 100%;
  border-radius: 14px;
  background: oklch(0.11 0.012 265);
  border: 1px solid oklch(0.24 0.012 265);
  box-shadow: 0 18px 48px oklch(0.05 0.02 265 / 0.55);
  overflow: hidden;
}
.board-head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap;
  padding: 12px 16px;
  border-bottom: 1px solid oklch(0.22 0.012 265);
  background: oklch(0.13 0.014 265);
}
.board-title {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.82rem; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase;
  color: var(--ink-1);
}
.board-tag {
  font-size: 0.68rem; font-weight: 600; letter-spacing: 0.05em;
  color: var(--accent-primary);
  background: var(--accent-primary-faint);
  border: 1px solid var(--accent-primary-border);
  border-radius: 999px; padding: 2px 9px;
}
.board-thead, .board-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 74px 74px 118px;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
}
.board-thead {
  padding-top: 9px; padding-bottom: 7px;
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.11em; text-transform: uppercase;
  color: var(--ink-4);
}
.board-thead .bd-num, .board-thead .bd-flag { text-align: right; }
.board-row {
  padding-top: 9px; padding-bottom: 9px;
  border-top: 1px solid oklch(0.19 0.012 265);
}
.board-row .bd-nm { display: flex; align-items: center; gap: 7px; min-width: 0; }
.board-row .bd-nm b {
  font-size: 0.88rem; font-weight: 600; color: var(--ink-2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bd-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.84rem; color: var(--ink-3);
}
.bd-ours { color: var(--ink-1); font-weight: 700; }
.bd-flag { display: flex; align-items: center; justify-content: flex-end; gap: 7px; }
.flag {
  font-size: 0.6rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 3px 7px; border-radius: 4px;
}
.flag-value { background: oklch(0.62 0.16 150 / 0.18); color: oklch(0.80 0.16 150); }
.flag-fade  { background: oklch(0.63 0.22 25 / 0.16);  color: oklch(0.75 0.19 25); }
.bd-gap {
  font-variant-numeric: tabular-nums;
  font-size: 0.72rem; font-weight: 700; color: oklch(0.80 0.16 150);
  min-width: 54px; text-align: right;
}
.bd-gap-neg { color: oklch(0.75 0.19 25); }
.bd-inline { font-size: 0.72rem; color: var(--ink-4); }
.row-value .bd-nm b { color: var(--ink-1); }
.row-value { background: oklch(0.62 0.16 150 / 0.05); }
.row-fade  { background: oklch(0.63 0.22 25 / 0.04); }
.row-fade .bd-nm b, .row-fade .bd-num { color: var(--ink-3-soft); }
.board-caption {
  max-width: 620px; margin: 0 auto;
  font-size: 0.86rem; line-height: 1.6; color: var(--ink-3); text-align: center;
}
.board-caption b { color: var(--ink-1); font-weight: 700; }

@media (max-width: 620px) {
  .board-thead, .board-row { grid-template-columns: minmax(0, 1fr) 46px 46px 74px; gap: 6px; padding: 0 11px; }
  .board-row { padding-top: 9px; padding-bottom: 9px; }
  .board-thead { padding-top: 9px; padding-bottom: 7px; }
  .bd-gap { display: none; }
  /* A truncated player name proves nothing. Let the name wrap rather than
     ellipsis away the exact thing the table is here to show. */
  .board-row .bd-nm { align-items: baseline; }
  .board-row .bd-nm b {
    white-space: normal; overflow: visible; text-overflow: clip;
    font-size: 0.8rem; line-height: 1.25;
  }
  .bd-num { font-size: 0.78rem; }
  .flag { padding: 3px 5px; letter-spacing: 0.06em; }
}

/* ── Trade card leverage flag ───────────────────────────────────────────── */
.tv-flag-lev { background: var(--accent-tertiary-soft); color: var(--accent-tertiary); }

/* ── Same player, three rule sets ───────────────────────────────────────── */
.rules-section { padding: clamp(64px, 9vw, 120px) 0; }
.rules-sub { max-width: 620px; }
.rules-block {
  margin-top: 34px;
  border-radius: 16px;
  border: 1px solid oklch(0.22 0.012 265);
  background: oklch(0.11 0.012 265);
  padding: 20px;
}
.rules-player {
  display: flex; align-items: center; gap: 9px; flex-wrap: wrap;
  padding-bottom: 16px; margin-bottom: 18px;
  border-bottom: 1px solid oklch(0.20 0.012 265);
}
.rp-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.4rem; font-weight: 800; letter-spacing: 0.01em; color: var(--ink-1);
}
.rp-meta { font-size: 0.78rem; color: var(--ink-3-soft); margin-left: 4px; }
.rules-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
.rule-card {
  border-radius: 12px;
  border: 1px solid oklch(0.22 0.012 265);
  background: oklch(0.13 0.014 265);
  padding: 14px;
}
.rule-card-hi {
  border-color: var(--accent-primary-border);
  background: var(--accent-primary-faint);
}
.rc-league {
  font-size: 0.66rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink-3-soft); margin-bottom: 10px;
}
.rc-verdict {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.65rem; font-weight: 900; line-height: 1; text-transform: uppercase;
  letter-spacing: 0.02em; margin-bottom: 9px;
}
.rc-sit   { color: var(--ink-4); }
.rc-flex  { color: oklch(0.80 0.15 75); }
.rc-start { color: oklch(0.80 0.16 150); }
.rc-detail { font-size: 0.8rem; color: var(--ink-3); font-variant-numeric: tabular-nums; }
.rc-detail b { color: var(--ink-1); font-weight: 700; }
.rc-slot { margin-top: 4px; font-size: 0.74rem; color: var(--ink-4); }
.rules-caption {
  margin: 18px 2px 0;
  font-size: 0.86rem; line-height: 1.6; color: var(--ink-3);
}

/* ── Compatibility facts (replaces the interactive picker) ──────────────── */
.compat {
  margin-top: 26px;
  border-top: 1px solid oklch(0.20 0.012 265);
}
.compat-row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding: 13px 2px;
  border-bottom: 1px solid oklch(0.18 0.012 265);
}
.compat-label {
  font-size: 0.66rem; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase;
  color: var(--ink-4);
}
.compat-vals {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px 16px;
  font-size: 0.9rem; color: var(--ink-2);
}
.compat-plat { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; }
.compat-logo { width: 17px; height: 17px; object-fit: contain; flex-shrink: 0; }
.rules-cta { margin-top: 28px; }

@media (max-width: 560px) {
  .compat-row { grid-template-columns: 1fr; gap: 6px; }
}

/* ── The pitch: leverage, and the message it writes ─────────────────────── */
.pitch-section { padding: 96px 0; background: var(--ink-7); }
.pitch-inner {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 56px;
  align-items: center;
}
.pitch-copy .section-headline { margin-bottom: 18px; }
.pitch-sub-2 { margin-top: -6px; }
.pitch-cta { margin-top: 26px; }
.pitch-stage { display: flex; justify-content: center; }

.deal-card {
  width: 100%; max-width: 420px;
  border-radius: 14px;
  background: oklch(0.11 0.012 265);
  border: 1px solid var(--accent-tertiary-border);
  box-shadow: 0 20px 52px oklch(0.05 0.02 265 / 0.6);
  overflow: hidden;
}
.deal-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 10px 14px;
  background: var(--accent-tertiary-soft);
  border-bottom: 1px solid oklch(0.22 0.012 265);
  font-size: 0.68rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--ink-3);
}
.deal-flags { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.deal-lev { color: var(--accent-tertiary); font-weight: 800; letter-spacing: 0.1em; }
.deal-sep { color: var(--ink-4); }
.deal-meter {
  font-variant-numeric: tabular-nums; font-weight: 800; letter-spacing: 0.02em;
  color: oklch(0.80 0.16 150); white-space: nowrap;
}
.deal-line { display: flex; align-items: center; gap: 8px; padding: 11px 14px 0; }
.deal-line:last-of-type { padding-bottom: 12px; }
.deal-tag {
  font-size: 0.58rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;
  width: 34px; flex-shrink: 0;
}
.deal-get  { color: oklch(0.80 0.16 150); }
.deal-give { color: var(--ink-4); }
.deal-nm {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem; font-weight: 800; color: var(--ink-1);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.deal-nm-give { color: var(--ink-3); font-weight: 700; }
.deal-from { margin-left: auto; font-size: 0.7rem; color: var(--ink-4); white-space: nowrap; }

.deal-why { padding: 11px 14px; border-top: 1px solid oklch(0.19 0.012 265); }
.dw-head {
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-4); margin-bottom: 8px;
}
.dw-row { display: flex; gap: 10px; font-size: 0.78rem; line-height: 1.5; }
.dw-row + .dw-row { margin-top: 5px; }
.dw-k { width: 38px; flex-shrink: 0; color: var(--ink-4); font-weight: 700; }
.dw-v { color: var(--ink-3); min-width: 0; }
.dw-up { color: oklch(0.80 0.16 150); font-weight: 700; font-variant-numeric: tabular-nums; }

.deal-pitch {
  padding: 11px 14px 13px;
  border-top: 1px solid oklch(0.19 0.012 265);
  background: oklch(0.13 0.014 265);
}
.dp-head {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 0.6rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-4); margin-bottom: 7px;
}
.dp-copy {
  font-size: 0.58rem; letter-spacing: 0.08em;
  color: var(--accent-tertiary);
  border: 1px solid var(--accent-tertiary-border);
  border-radius: 4px; padding: 2px 7px;
}
.dp-body { font-size: 0.84rem; line-height: 1.62; color: var(--ink-2); }

@media (max-width: 900px) {
  .pitch-inner { grid-template-columns: 1fr; gap: 36px; }
  .pitch-section { padding: 72px 0; }
}
</style>
