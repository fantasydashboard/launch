<template>
  <div class="landing-root">

    <!-- ══════════════════════════════════════════════
         HERO
    ══════════════════════════════════════════════ -->
    <section class="hero-section">
      <!-- Noise overlay -->
      <div class="noise-overlay"></div>
      <!-- Grid lines -->
      <div class="grid-bg"></div>
      <!-- Glow blob -->
      <div class="hero-glow"></div>

      <div class="hero-inner">
        <!-- Eyebrow badge -->
        <div class="eyebrow-badge">
          <span class="badge-dot"></span>
          Now in Beta — All Features Free
        </div>

        <!-- Headline -->
        <h1 class="hero-headline">
          Stop arguing.<br />
          <span class="headline-accent">Post the receipts.</span>
        </h1>

        <p class="hero-sub">
          Turn your Sleeper, Yahoo, or ESPN league into a war room.
          Power rankings, share cards, and weekly recaps that fuel
          <em>every group chat, every week.</em>
        </p>

        <!-- CTA row -->
        <div class="hero-ctas">
          <button class="cta-primary" @click="$emit('open-signup')">
            Preview My League Free
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
          <a href="#how-it-works" class="cta-ghost" @click.prevent="scrollTo('how-it-works')">
            See How It Works
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          </a>
        </div>

        <!-- Trust strip -->
        <div class="trust-strip">
          <span class="trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            No credit card
          </span>
          <span class="trust-sep">·</span>
          <span class="trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Sleeper · Yahoo · ESPN
          </span>
          <span class="trust-sep">·</span>
          <span class="trust-item">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Setup in 3 minutes
          </span>
        </div>

        <!-- Floating hero cards -->
        <div class="hero-cards-row">
          <div class="hero-card hc-left">
            <div class="hcard-label">POWER RANKINGS</div>
            <div class="hcard-rank-row"><span class="hcard-num yellow">1</span><span class="hcard-name">Mahomes Magic</span><span class="hcard-arrow up">↑2</span></div>
            <div class="hcard-rank-row"><span class="hcard-num">2</span><span class="hcard-name">Trash Can Wins</span><span class="hcard-arrow down">↓1</span></div>
            <div class="hcard-rank-row"><span class="hcard-num">3</span><span class="hcard-name">The Algorithm</span><span class="hcard-arrow flat">—</span></div>
            <div class="hcard-footer">Week 11 · 12-team PPR</div>
          </div>
          <div class="hero-card hc-center">
            <div class="hcard-matchup-header">WEEK 11</div>
            <div class="hcard-matchup-vs">
              <div class="hcard-team">
                <div class="hcard-avatar" style="background: linear-gradient(135deg,#f59e0b,#d97706)">🔥</div>
                <span>Mahomes Magic</span>
                <strong class="score-yellow">142.7</strong>
              </div>
              <div class="hcard-vs-badge">VS</div>
              <div class="hcard-team">
                <div class="hcard-avatar" style="background: linear-gradient(135deg,#6366f1,#4338ca)">⚡</div>
                <span>The Algorithm</span>
                <strong class="score-dim">98.4</strong>
              </div>
            </div>
            <div class="hcard-win-bar">
              <div class="win-fill" style="width:64%"></div>
            </div>
            <div class="hcard-footer hcard-footer-row"><span class="win-pct">64% win probability</span><span class="live-dot">● LIVE</span></div>
          </div>
          <div class="hero-card hc-right">
            <div class="hcard-label">WEEK RECAP</div>
            <div class="hcard-stat-row"><span>Top Scorer</span><strong class="yellow">Trash Can Wins · 189.2</strong></div>
            <div class="hcard-stat-row"><span>Biggest Blowout</span><strong>44.3 pts</strong></div>
            <div class="hcard-stat-row"><span>Lucky Win</span><strong class="red">Toilet Bowl FC</strong></div>
            <div class="hcard-divider"></div>
            <div class="hcard-stat-row"><span>Most Adds</span><strong>Waiver Wire Kid · 3</strong></div>
            <div class="hcard-footer">Share → Drop in chat</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         SPORT / HOST / FORMAT PICKER
    ══════════════════════════════════════════════ -->
    <section class="picker-section" id="picker">
      <div class="section-inner">
        <div class="section-eyebrow">Your league, your rules</div>
        <h2 class="section-headline">Works with <span class="accent">your</span> league. Right now.</h2>
        <p class="section-sub">Pick your setup — we'll show you exactly what you'd get.</p>

        <!-- Picker UI -->
        <div class="picker-grid">
          <!-- Step 1: Sport -->
          <div class="picker-step">
            <div class="picker-step-label"><span class="step-num">01</span> Your sport</div>
            <div class="picker-options">
              <button
                v-for="s in sports" :key="s.id"
                class="picker-option"
                :class="{ active: selectedSport === s.id }"
                @click="selectedSport = s.id"
              >
                <span class="picker-emoji">{{ s.emoji }}</span>
                <span>{{ s.name }}</span>
              </button>
            </div>
          </div>

          <!-- Step 2: Platform -->
          <div class="picker-step">
            <div class="picker-step-label"><span class="step-num">02</span> Your platform</div>
            <div class="picker-options">
              <button
                v-for="p in platforms" :key="p.id"
                class="picker-option"
                :class="{ active: selectedPlatform === p.id }"
                @click="selectedPlatform = p.id"
              >
                <span class="picker-emoji">{{ p.emoji }}</span>
                <span>{{ p.name }}</span>
              </button>
            </div>
          </div>

          <!-- Step 3: Format -->
          <div class="picker-step">
            <div class="picker-step-label"><span class="step-num">03</span> Your format</div>
            <div class="picker-options">
              <button
                v-for="f in formats[selectedSport]" :key="f"
                class="picker-option"
                :class="{ active: selectedFormat === f }"
                @click="selectedFormat = f"
              >{{ f }}</button>
            </div>
          </div>
        </div>

        <!-- Dynamic preview card -->
        <div class="picker-preview">
          <div class="preview-badge">{{ activeSport.emoji }} {{ activeSport.name }} · {{ selectedPlatform.toUpperCase() }} · {{ selectedFormat }}</div>
          <div class="preview-card">
            <div class="preview-header">
              <span class="preview-title">Your Dashboard Would Look Like This</span>
              <span class="preview-week">Week {{ currentWeek }}</span>
            </div>
            <div class="preview-rankings">
              <div v-for="(team, i) in previewTeams" :key="i" class="preview-rank-row">
                <span class="prev-rank" :class="i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''">{{ i + 1 }}</span>
                <span class="prev-avatar" :style="{ background: team.color }">{{ team.icon }}</span>
                <span class="prev-name">{{ team.name }}</span>
                <span class="prev-record">{{ team.record }}</span>
                <div class="prev-bar-wrap"><div class="prev-bar" :style="{ width: team.score + '%', background: i === 0 ? '#eab308' : '#374151' }"></div></div>
                <span class="prev-pts">{{ team.pts }}</span>
              </div>
            </div>
          </div>
          <button class="cta-primary mt-6" @click="$emit('open-signup')">
            Connect My {{ selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1) }} League Free
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         SHARE CARD GALLERY
    ══════════════════════════════════════════════ -->
    <section class="gallery-section">
      <div class="gallery-noise"></div>
      <div class="section-inner">
        <div class="section-eyebrow">Drop these in the group chat</div>
        <h2 class="section-headline">Cards your league will <span class="accent">actually</span> screenshot.</h2>
        <p class="section-sub">Stop sending raw box scores. Send this.</p>

        <!-- Filter tabs -->
        <div class="gallery-filters">
          <button
            v-for="f in galleryFilters" :key="f.id"
            class="gallery-filter"
            :class="{ active: activeGalleryFilter === f.id }"
            @click="activeGalleryFilter = f.id"
          >{{ f.label }}</button>
        </div>

        <!-- Card grid -->
        <div class="card-grid">
          <template v-for="card in filteredCards" :key="card.id">
            <div class="share-card" :class="card.size">

              <!-- POWER RANKINGS CARD -->
              <template v-if="card.type === 'power-rankings'">
                <div class="sc-card football-card">
                  <div class="sc-header"><span class="sc-sport-badge">🏈 NFL FANTASY</span><span class="sc-week">WK {{ card.week }}</span></div>
                  <div class="sc-title">POWER RANKINGS</div>
                  <div class="sc-ranks">
                    <div v-for="(t,i) in card.teams" :key="i" class="sc-rank-row">
                      <span class="sc-num" :class="i===0?'sc-gold':''">{{ i+1 }}</span>
                      <div class="sc-bar-bg"><div class="sc-bar" :style="{width: t.score+'%', opacity: 1-(i*0.15)}"></div></div>
                      <span class="sc-team-name">{{ t.name }}</span>
                      <span class="sc-trend" :class="t.trend>0?'up':t.trend<0?'dn':'fl'">{{ t.trend>0?'↑'+t.trend:t.trend<0?'↓'+Math.abs(t.trend):'—' }}</span>
                    </div>
                  </div>
                  <div class="sc-footer">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- BLOWOUT CARD -->
              <template v-else-if="card.type === 'blowout'">
                <div class="sc-card blowout-card">
                  <div class="sc-header"><span class="sc-sport-badge">🏀 NBA FANTASY</span><span class="sc-week">WK {{ card.week }}</span></div>
                  <div class="sc-blowout-title">💣 BIGGEST<br/>BLOWOUT</div>
                  <div class="sc-blowout-score">
                    <div class="sc-bl-team win">
                      <span class="sc-bl-name">{{ card.winner }}</span>
                      <span class="sc-bl-pts win-pts">{{ card.winScore }}</span>
                    </div>
                    <div class="sc-bl-vs">def.</div>
                    <div class="sc-bl-team lose">
                      <span class="sc-bl-name">{{ card.loser }}</span>
                      <span class="sc-bl-pts lose-pts">{{ card.loseScore }}</span>
                    </div>
                  </div>
                  <div class="sc-margin">{{ card.margin }} point margin · Week {{ card.week }}</div>
                  <div class="sc-footer">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- MATCHUP CARD -->
              <template v-else-if="card.type === 'matchup'">
                <div class="sc-card matchup-card">
                  <div class="sc-header"><span class="sc-sport-badge">⚾ MLB FANTASY</span><span class="sc-week">WK {{ card.week }}</span></div>
                  <div class="sc-title small">HEAD-TO-HEAD</div>
                  <div class="sc-matchup-row">
                    <div class="sc-team-block">
                      <div class="sc-team-circle" :style="{background: card.team1Color}">{{ card.team1Icon }}</div>
                      <div class="sc-team-nm">{{ card.team1 }}</div>
                      <div class="sc-team-sc">{{ card.score1 }}</div>
                    </div>
                    <div class="sc-vs-circle">VS</div>
                    <div class="sc-team-block right">
                      <div class="sc-team-circle" :style="{background: card.team2Color}">{{ card.team2Icon }}</div>
                      <div class="sc-team-nm">{{ card.team2 }}</div>
                      <div class="sc-team-sc dim">{{ card.score2 }}</div>
                    </div>
                  </div>
                  <div class="sc-win-bar-wrap">
                    <div class="sc-win-fill" :style="{width: card.prob+'%'}"></div>
                  </div>
                  <div class="sc-win-label">{{ card.prob }}% win probability</div>
                  <div class="sc-footer">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- MVP RACE CARD -->
              <template v-else-if="card.type === 'mvp'">
                <div class="sc-card mvp-card">
                  <div class="sc-header"><span class="sc-sport-badge">🏒 NHL FANTASY</span><span class="sc-week">SEASON</span></div>
                  <div class="sc-mvp-crown">👑</div>
                  <div class="sc-title">MVP RACE</div>
                  <div class="sc-mvp-list">
                    <div v-for="(m,i) in card.managers" :key="i" class="sc-mvp-row">
                      <span class="sc-mvp-rank">{{ ['🥇','🥈','🥉'][i] || (i+1) }}</span>
                      <span class="sc-mvp-name">{{ m.name }}</span>
                      <div class="sc-mvp-bar-wrap"><div class="sc-mvp-bar" :style="{width: m.pct+'%'}"></div></div>
                      <span class="sc-mvp-pts">{{ m.pts }}</span>
                    </div>
                  </div>
                  <div class="sc-footer">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- ELIMINATED CARD -->
              <template v-else-if="card.type === 'eliminated'">
                <div class="sc-card elim-card">
                  <div class="sc-header"><span class="sc-sport-badge">🏈 NFL FANTASY</span><span class="sc-week">PLAYOFFS</span></div>
                  <div class="sc-elim-top">☠️</div>
                  <div class="sc-elim-title">YOU JUST<br/>GOT BOUNCED</div>
                  <div class="sc-elim-name">{{ card.eliminated }}</div>
                  <div class="sc-elim-score">Lost {{ card.score1 }} – {{ card.score2 }}</div>
                  <div class="sc-elim-by">Eliminated by <strong>{{ card.by }}</strong></div>
                  <div class="sc-footer">ultimatefantasydashboard.com</div>
                </div>
              </template>

              <!-- WEEKLY RECAP CARD -->
              <template v-else-if="card.type === 'recap'">
                <div class="sc-card recap-card">
                  <div class="sc-header"><span class="sc-sport-badge">🏈 NFL FANTASY</span><span class="sc-week">WK {{ card.week }} RECAP</span></div>
                  <div class="sc-title small">LEAGUE DIGEST</div>
                  <div class="sc-recap-stats">
                    <div class="sc-rs-item"><span class="sc-rs-label">🔥 Top Score</span><strong>{{ card.topScore }}</strong></div>
                    <div class="sc-rs-item"><span class="sc-rs-label">💀 Lowest</span><strong class="red">{{ card.lowScore }}</strong></div>
                    <div class="sc-rs-item"><span class="sc-rs-label">💣 Blowout</span><strong>{{ card.blowout }}</strong></div>
                    <div class="sc-rs-item"><span class="sc-rs-label">😤 Closest</span><strong>{{ card.closest }}</strong></div>
                  </div>
                  <div class="sc-footer">ultimatefantasydashboard.com</div>
                </div>
              </template>

            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         HOW IT WORKS
    ══════════════════════════════════════════════ -->
    <section class="hiw-section" id="how-it-works">
      <div class="section-inner">
        <div class="section-eyebrow">Dead simple</div>
        <h2 class="section-headline">From league to loaded in <span class="accent">3 minutes.</span></h2>

        <div class="hiw-steps">
          <div class="hiw-step">
            <div class="hiw-step-num">01</div>
            <div class="hiw-icon-wrap"><span class="hiw-icon">🔗</span></div>
            <h3>Connect Your League</h3>
            <p>Paste your Sleeper, Yahoo, or ESPN league link. No CSV exports, no manual entry, no BS. One link and you're in.</p>
            <div class="hiw-connector"></div>
          </div>
          <div class="hiw-step">
            <div class="hiw-step-num">02</div>
            <div class="hiw-icon-wrap"><span class="hiw-icon">⚡</span></div>
            <h3>Your Data, Instantly</h3>
            <p>Power rankings, full season history, matchup breakdowns, and weekly projections — generated automatically every week without lifting a finger.</p>
            <div class="hiw-connector"></div>
          </div>
          <div class="hiw-step">
            <div class="hiw-step-num">03</div>
            <div class="hiw-icon-wrap"><span class="hiw-icon">💣</span></div>
            <h3>Drop It In the Chat</h3>
            <p>One-tap share cards ready every week. Power rankings, blowout alerts, weekly recaps. Your group chat will not stop talking about it.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         SOCIAL PROOF
    ══════════════════════════════════════════════ -->
    <section class="proof-section">
      <div class="proof-noise"></div>
      <div class="section-inner">
        <div class="section-eyebrow">Real leagues, real chaos</div>
        <h2 class="section-headline">Your league will not <span class="accent">stop talking</span> about this.</h2>

        <!-- Chat bubbles -->
        <div class="chat-grid">
          <div v-for="msg in chatMessages" :key="msg.id" class="chat-bubble" :class="msg.side">
            <div class="chat-meta">{{ msg.name }} · {{ msg.context }}</div>
            <div class="chat-text">{{ msg.text }}</div>
            <div v-if="msg.reaction" class="chat-reaction">{{ msg.reaction }}</div>
          </div>
        </div>

        <!-- Stats callout row -->
        <div class="stats-row">
          <div class="stat-block">
            <div class="stat-num">12K+</div>
            <div class="stat-label">Leagues Connected</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-block">
            <div class="stat-num">4</div>
            <div class="stat-label">Sports Supported</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-block">
            <div class="stat-num">Free</div>
            <div class="stat-label">To Preview</div>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-block">
            <div class="stat-num">3 min</div>
            <div class="stat-label">To Get Started</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         PRICING TEASER
    ══════════════════════════════════════════════ -->
    <section class="pricing-section">
      <div class="section-inner">
        <div class="section-eyebrow">Pricing</div>
        <h2 class="section-headline">Start free. <span class="accent">Go deeper</span> when you're ready.</h2>
        <p class="section-sub">Preview your league at no cost. Unlock the full arsenal when your league is ready.</p>

        <!-- Beta banner -->
        <div class="beta-banner">
          <span class="beta-dot"></span>
          <strong>Currently in Beta</strong> — All features are completely free right now. Lock in early access pricing before we launch.
        </div>

        <div class="pricing-cards">
          <div class="pricing-card free-card">
            <div class="pc-tier">Free Preview</div>
            <div class="pc-price">$0</div>
            <div class="pc-desc">See what your league looks like. No commitment, no card.</div>
            <ul class="pc-features">
              <li><span class="check">✓</span> Connect any league</li>
              <li><span class="check">✓</span> Current week standings</li>
              <li><span class="check">✓</span> This week's matchups</li>
              <li><span class="x">✗</span> <span class="muted">Power rankings</span></li>
              <li><span class="x">✗</span> <span class="muted">Share cards</span></li>
              <li><span class="x">✗</span> <span class="muted">Season history</span></li>
            </ul>
            <button class="pc-cta free-cta" @click="$emit('open-signup')">Start Free →</button>
          </div>

          <div class="pricing-card league-card popular">
            <div class="popular-badge">Most Popular</div>
            <div class="pc-tier">League Pass</div>
            <div class="pc-price">Early Access Pricing</div>
            <div class="pc-desc">Everything your league needs. Per league, per season.</div>
            <ul class="pc-features">
              <li><span class="check">✓</span> Full season history</li>
              <li><span class="check">✓</span> Weekly power rankings</li>
              <li><span class="check">✓</span> All share cards</li>
              <li><span class="check">✓</span> Commissioner tools</li>
              <li><span class="check">✓</span> Trade analyzer</li>
              <li><span class="check">✓</span> Weekly recaps</li>
            </ul>
            <button class="pc-cta league-cta" @click="$emit('open-signup')">Get Early Access →</button>
          </div>

          <div class="pricing-card ultimate-card">
            <div class="pc-tier">Ultimate</div>
            <div class="pc-price">Coming Soon</div>
            <div class="pc-desc">The full edge. For the manager who doesn't lose on purpose.</div>
            <ul class="pc-features">
              <li><span class="check">✓</span> Everything in League Pass</li>
              <li><span class="check">✓</span> Start/sit projections</li>
              <li><span class="check">✓</span> Waiver wire grades</li>
              <li><span class="check">✓</span> Cross-league analytics</li>
              <li><span class="check">✓</span> Multi-sport dashboard</li>
              <li><span class="check">✓</span> Priority features</li>
            </ul>
            <button class="pc-cta ultimate-cta" @click="$emit('open-signup')">Join Waitlist →</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         FAQ TEASER
    ══════════════════════════════════════════════ -->
    <section class="faq-section">
      <div class="section-inner faq-inner">
        <div>
          <div class="section-eyebrow">Questions</div>
          <h2 class="section-headline faq-headline">Got questions?<br/><span class="accent">We've got answers.</span></h2>
        </div>
        <div class="faq-list">
          <div v-for="(faq, i) in faqs" :key="i" class="faq-item" @click="toggleFaq(i)">
            <div class="faq-q">
              <span>{{ faq.q }}</span>
              <span class="faq-arrow" :class="{ open: openFaq === i }">›</span>
            </div>
            <div class="faq-a" :class="{ visible: openFaq === i }">{{ faq.a }}</div>
          </div>
          <a href="/faq" class="faq-more-link">See all FAQs →</a>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════════════
         FINAL CTA
    ══════════════════════════════════════════════ -->
    <section class="final-cta-section">
      <div class="final-noise"></div>
      <div class="final-glow-left"></div>
      <div class="final-glow-right"></div>
      <div class="section-inner final-inner">
        <div class="final-eyebrow">🏆 Ready?</div>
        <h2 class="final-headline">
          Your league is already<br/>talking about it.<br/>
          <span class="final-accent">Be the one who started it.</span>
        </h2>
        <button class="cta-primary cta-xl" @click="$emit('open-signup')">
          Connect Your League Free
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
        <div class="final-trust">
          No credit card &nbsp;·&nbsp; Sleeper, Yahoo &amp; ESPN &nbsp;·&nbsp; Setup in 3 minutes
        </div>
      </div>
    </section>

    <!-- Footer handled by AppFooter in App.vue -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineEmits<{ (e: 'open-signup'): void }>()

// ── Sport / Platform / Format Picker ────────────────────────────────────────
const sports = [
  { id: 'football', name: 'Football', emoji: '🏈' },
  { id: 'baseball', name: 'Baseball', emoji: '⚾' },
  { id: 'basketball', name: 'Basketball', emoji: '🏀' },
  { id: 'hockey', name: 'Hockey', emoji: '🏒' },
]
const platforms = [
  { id: 'sleeper', name: 'Sleeper', emoji: '💤' },
  { id: 'yahoo', name: 'Yahoo', emoji: 'Y!' },
  { id: 'espn', name: 'ESPN', emoji: 'E' },
]
const formats: Record<string, string[]> = {
  football: ['H2H Points', 'H2H Categories', 'Dynasty', 'Keeper'],
  baseball: ['H2H Points', 'H2H Categories', 'Roto'],
  basketball: ['H2H Points', 'H2H Categories', 'Roto'],
  hockey: ['H2H Points', 'H2H Categories', 'Roto'],
}

const selectedSport = ref('football')
const selectedPlatform = ref('sleeper')
const selectedFormat = ref('H2H Points')

const activeSport = computed(() => sports.find(s => s.id === selectedSport.value)!)
const currentWeek = computed(() => selectedSport.value === 'baseball' ? 18 : selectedSport.value === 'football' ? 11 : 14)

const previewTeamsBySport: Record<string, any[]> = {
  football: [
    { name: 'Mahomes Magic', record: '9-2', pts: '1,456', score: 92, color: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '🔥' },
    { name: 'The Algorithm', record: '8-3', pts: '1,342', score: 84, color: 'linear-gradient(135deg,#6366f1,#4f46e5)', icon: '⚡' },
    { name: 'Trash Can Wins', record: '7-4', pts: '1,298', score: 78, color: 'linear-gradient(135deg,#10b981,#059669)', icon: '🗑️' },
    { name: 'Waiver Wire Kid', record: '6-5', pts: '1,187', score: 68, color: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: '📋' },
    { name: 'Toilet Bowl FC', record: '3-8', pts: '982', score: 44, color: 'linear-gradient(135deg,#6b7280,#4b5563)', icon: '🚽' },
  ],
  baseball: [
    { name: 'Dingers Only', record: '88-62', pts: '87.5', score: 92, color: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '💣' },
    { name: 'ERA Zero', record: '82-68', pts: '82.0', score: 82, color: 'linear-gradient(135deg,#06b6d4,#0891b2)', icon: '⚾' },
    { name: 'Steals & Deals', record: '79-71', pts: '78.5', score: 76, color: 'linear-gradient(135deg,#10b981,#059669)', icon: '🏃' },
    { name: 'K-Rate Kings', record: '74-76', pts: '73.0', score: 67, color: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon: '🔺' },
    { name: 'Sub-.35 ERA or Bust', record: '61-89', pts: '58.5', score: 42, color: 'linear-gradient(135deg,#6b7280,#4b5563)', icon: '😤' },
  ],
  basketball: [
    { name: 'Triple Double', record: '9-3', pts: '1,234', score: 90, color: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '🏀' },
    { name: 'Giannis Mode', record: '8-4', pts: '1,189', score: 84, color: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: '🦌' },
    { name: 'Points Only', record: '7-5', pts: '1,102', score: 75, color: 'linear-gradient(135deg,#6366f1,#4f46e5)', icon: '📊' },
    { name: 'Bench Warmers', record: '6-6', pts: '1,041', score: 64, color: 'linear-gradient(135deg,#10b981,#059669)', icon: '🪑' },
    { name: 'Box Score Fraud', record: '4-8', pts: '891', score: 40, color: 'linear-gradient(135deg,#6b7280,#4b5563)', icon: '📋' },
  ],
  hockey: [
    { name: 'Save % Kings', record: '10-2', pts: '1,567', score: 94, color: 'linear-gradient(135deg,#f59e0b,#d97706)', icon: '🥅' },
    { name: 'Hat Trick City', record: '8-4', pts: '1,423', score: 85, color: 'linear-gradient(135deg,#06b6d4,#0891b2)', icon: '🏒' },
    { name: 'Power Play FC', record: '7-5', pts: '1,312', score: 74, color: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', icon: '⚡' },
    { name: 'Empty Net Bros', record: '5-7', pts: '1,189', score: 61, color: 'linear-gradient(135deg,#10b981,#059669)', icon: '🥶' },
    { name: 'Penalty Box FC', record: '3-9', pts: '978', score: 38, color: 'linear-gradient(135deg,#6b7280,#4b5563)', icon: '📦' },
  ],
}
const previewTeams = computed(() => previewTeamsBySport[selectedSport.value] || previewTeamsBySport.football)

// ── Gallery ─────────────────────────────────────────────────────────────────
const galleryFilters = [
  { id: 'all', label: 'All Cards' },
  { id: 'football', label: '🏈 Football' },
  { id: 'baseball', label: '⚾ Baseball' },
  { id: 'basketball', label: '🏀 Basketball' },
  { id: 'hockey', label: '🏒 Hockey' },
]
const activeGalleryFilter = ref('all')

const galleryCards = [
  {
    id: 1, sport: 'football', type: 'power-rankings', size: 'card-tall', week: 11,
    teams: [
      { name: 'Mahomes Magic', score: 92, trend: 2 },
      { name: 'The Algorithm', score: 84, trend: -1 },
      { name: 'Trash Can Wins', score: 76, trend: 1 },
      { name: 'Waiver Wire Kid', score: 64, trend: -2 },
      { name: 'Toilet Bowl FC', score: 44, trend: 0 },
    ]
  },
  {
    id: 2, sport: 'basketball', type: 'blowout', size: 'card-normal', week: 14,
    winner: 'Triple Double', winScore: '1,312.4',
    loser: 'Box Score Fraud', loseScore: '891.2', margin: '421.2'
  },
  {
    id: 3, sport: 'baseball', type: 'matchup', size: 'card-normal', week: 18,
    team1: 'Dingers Only', team1Icon: '💣', team1Color: 'linear-gradient(135deg,#f59e0b,#d97706)', score1: '102.5',
    team2: 'ERA Zero', team2Icon: '⚾', team2Color: 'linear-gradient(135deg,#06b6d4,#0891b2)', score2: '88.0',
    prob: 67
  },
  {
    id: 4, sport: 'hockey', type: 'mvp', size: 'card-tall', week: 12,
    managers: [
      { name: 'Save % Kings', pts: '1,567', pct: 94 },
      { name: 'Hat Trick City', pts: '1,423', pct: 85 },
      { name: 'Power Play FC', pts: '1,312', pct: 74 },
      { name: 'Empty Net Bros', pts: '1,189', pct: 61 },
    ]
  },
  {
    id: 5, sport: 'football', type: 'eliminated', size: 'card-normal',
    eliminated: 'Toilet Bowl FC', score1: '98.4', score2: '142.7', by: 'Mahomes Magic'
  },
  {
    id: 6, sport: 'football', type: 'recap', size: 'card-normal', week: 11,
    topScore: 'Mahomes Magic · 189.2',
    lowScore: 'Toilet Bowl FC · 72.4',
    blowout: '116.8 pts',
    closest: '2.1 pts'
  },
]

const filteredCards = computed(() =>
  activeGalleryFilter.value === 'all'
    ? galleryCards
    : galleryCards.filter(c => c.sport === activeGalleryFilter.value)
)

// ── Chat messages ────────────────────────────────────────────────────────────
const chatMessages = [
  { id: 1, name: 'Chad', context: 'Dynasty League · Sleeper', text: 'bro how do you have my stats going back to 2019??? this is genuinely terrifying', reaction: '😭', side: 'left' },
  { id: 2, name: 'Commissioner Mike', context: '12-team PPR · Yahoo', text: 'these power rankings are going to CAUSE PROBLEMS in the group chat and i am here for it', reaction: '💀', side: 'right' },
  { id: 3, name: 'Jessica', context: '10-team Keeper · ESPN', text: 'the share cards are actually insane. i sent one and now the entire league wants access', reaction: '🔥', side: 'left' },
  { id: 4, name: 'Taylor', context: '8-year league · Sleeper', text: 'finally something that makes my commish work look professional instead of just a google sheet', reaction: '👑', side: 'right' },
  { id: 5, name: 'Darnell', context: 'H2H Categories · Yahoo', text: 'the weekly recap card hit the group chat at 9am monday and our whole office is still arguing about it', reaction: '😂', side: 'left' },
  { id: 6, name: 'Rob', context: 'Redraft · Sleeper', text: 'i have been commish for 7 years and this is the first tool that actually makes running the league fun', reaction: '🙌', side: 'right' },
]

// ── FAQ ──────────────────────────────────────────────────────────────────────
const openFaq = ref<number | null>(null)
const faqs = [
  {
    q: 'Does it work with my existing Sleeper / Yahoo / ESPN league?',
    a: 'Yes — just paste your league link or connect your account. We support all three platforms across football, baseball, basketball, and hockey. No setup required on your league end.',
  },
  {
    q: 'Do all my league mates need to sign up?',
    a: 'Nope. Only the person connecting the league needs an account. You can share cards and recaps with your whole league without them needing to log in.',
  },
  {
    q: 'How current is the data?',
    a: 'Standings, matchup scores, and rosters update throughout the week. Power rankings and weekly recaps generate automatically after each week locks.',
  },
  {
    q: 'Can I connect multiple leagues?',
    a: 'Yes. You can connect leagues across different platforms and sports in the same dashboard. Manage your dynasty, redraft, and keeper all in one place.',
  },
]

function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}

// ── Utils ────────────────────────────────────────────────────────────────────
function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
/* ── Fonts ─────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');

/* ── Root ──────────────────────────────────────────────────────── */
.landing-root {
  font-family: 'Barlow', sans-serif;
  background: #05060a;
  color: #e5e7eb;
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
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #eab308;
  margin-bottom: 12px;
}
.section-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2rem, 5vw, 3.25rem);
  font-weight: 900;
  line-height: 1.05;
  color: #fff;
  margin-bottom: 16px;
}
.section-sub {
  font-size: 1.05rem;
  color: #9ca3af;
  margin-bottom: 40px;
  max-width: 560px;
}
.accent { color: #eab308; }
.yellow { color: #eab308; }
.red { color: #ef4444; }
.muted { color: #6b7280; }

/* ── CTAs ──────────────────────────────────────────────────────── */
.cta-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: #eab308;
  color: #0a0c14;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}
.cta-primary:hover { background: #fbbf24; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(234,179,8,0.35); }
.cta-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 14px 24px;
  background: transparent;
  color: #9ca3af;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  border: 1px solid #2a2d3a;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}
.cta-ghost:hover { color: #fff; border-color: #4b5563; }
.cta-xl { padding: 18px 40px; font-size: 1.25rem; }
.mt-6 { margin-top: 24px; }

/* ── Noise / texture ───────────────────────────────────────────── */
.noise-overlay, .gallery-noise, .proof-noise, .final-noise {
  position: absolute; inset: 0; pointer-events: none; z-index: 1;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}

/* ══════════════════════════════════════════════
   HERO
══════════════════════════════════════════════ */
.hero-section {
  position: relative;
  padding: 80px 0 0;
  overflow: hidden;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.grid-bg {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(234,179,8,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(234,179,8,0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
}
.hero-glow {
  position: absolute;
  top: -20%;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 600px;
  background: radial-gradient(ellipse, rgba(234,179,8,0.08) 0%, transparent 70%);
  pointer-events: none;
}
.hero-inner {
  position: relative;
  z-index: 2;
  max-width: 1200px;
  margin: 0 auto;
  padding: 60px 24px 0;
  text-align: center;
}

.eyebrow-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(234,179,8,0.08);
  border: 1px solid rgba(234,179,8,0.25);
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #eab308;
  margin-bottom: 28px;
  letter-spacing: 0.04em;
}
.badge-dot {
  width: 7px; height: 7px;
  background: #eab308;
  border-radius: 50%;
  animation: pulse-dot 2s infinite;
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.hero-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(3.5rem, 9vw, 7rem);
  font-weight: 900;
  line-height: 0.95;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: -0.01em;
  margin-bottom: 24px;
}
.headline-accent {
  color: #eab308;
  display: block;
  text-shadow: 0 0 80px rgba(234,179,8,0.4);
}

.hero-sub {
  font-size: 1.15rem;
  color: #9ca3af;
  max-width: 580px;
  margin: 0 auto 36px;
  line-height: 1.65;
}
.hero-sub em { color: #fff; font-style: normal; font-weight: 600; }

.hero-ctas {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
  margin-bottom: 24px;
}

.trust-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 64px;
}
.trust-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  color: #6b7280;
}
.trust-item svg { color: #eab308; }
.trust-sep { color: #374151; }

/* ── Hero floating cards ────────────────────────────────────────── */
.hero-cards-row {
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  gap: 16px;
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 0;
}
.hero-card {
  background: #0d0f1a;
  border: 1px solid #1e2130;
  border-radius: 14px;
  padding: 18px;
  font-size: 0.8rem;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
}
.hc-left { transform: rotate(-1.5deg) translateY(8px); }
.hc-right { transform: rotate(1.5deg) translateY(12px); }
.hc-center { transform: translateY(-8px); border-color: rgba(234,179,8,0.3); box-shadow: 0 24px 60px rgba(0,0,0,0.5), 0 0 40px rgba(234,179,8,0.08); }

.hcard-label { font-family: 'Barlow Condensed', sans-serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; color: #4b5563; margin-bottom: 12px; text-transform: uppercase; }
.hcard-rank-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #1a1d28; }
.hcard-rank-row:last-of-type { border-bottom: none; }
.hcard-num { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1rem; color: #4b5563; width: 18px; text-align: right; }
.hcard-num.yellow { color: #eab308; }
.hcard-name { flex: 1; color: #d1d5db; font-size: 0.78rem; }
.hcard-arrow { font-family: 'Barlow Condensed', sans-serif; font-size: 0.75rem; font-weight: 700; }
.hcard-arrow.up { color: #10b981; }
.hcard-arrow.down { color: #ef4444; }
.hcard-arrow.flat { color: #4b5563; }
.hcard-footer { font-size: 0.65rem; color: #374151; margin-top: 12px; }
.hcard-footer-row { display: flex; justify-content: space-between; align-items: center; }

.hcard-matchup-header { font-family: 'Barlow Condensed', sans-serif; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.15em; color: #4b5563; margin-bottom: 14px; text-transform: uppercase; text-align: center; }
.hcard-matchup-vs { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.hcard-team { display: flex; align-items: center; gap: 8px; }
.hcard-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0; }
.hcard-team span { flex: 1; font-size: 0.78rem; color: #d1d5db; }
.hcard-vs-badge { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 0.7rem; color: #374151; text-align: center; letter-spacing: 0.1em; }
.score-yellow { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; color: #eab308; font-size: 1rem; }
.score-dim { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; color: #4b5563; font-size: 1rem; }
.win-bar { height: 4px; background: #1a1d28; border-radius: 2px; overflow: hidden; margin-bottom: 10px; }
.win-fill { height: 100%; background: linear-gradient(90deg, #eab308, #fbbf24); border-radius: 2px; }
.win-pct { color: #9ca3af; font-size: 0.7rem; }
.live-dot { color: #10b981; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.05em; animation: pulse-dot 1.5s infinite; }

.hcard-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #1a1d28; font-size: 0.76rem; }
.hcard-stat-row:last-of-type { border-bottom: none; }
.hcard-stat-row span { color: #6b7280; }
.hcard-stat-row strong { color: #d1d5db; font-weight: 600; }
.hcard-stat-row strong.yellow { color: #eab308; }
.hcard-stat-row strong.red { color: #ef4444; }
.hcard-divider { height: 1px; background: #1a1d28; margin: 8px 0; }

/* ══════════════════════════════════════════════
   PICKER SECTION
══════════════════════════════════════════════ */
.picker-section {
  padding: 100px 0 80px;
  background: linear-gradient(180deg, #05060a 0%, #0a0c18 50%, #05060a 100%);
}
.picker-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  margin-bottom: 40px;
}
.picker-step { }
.picker-step-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 12px;
}
.step-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.65rem;
  font-weight: 900;
  color: #eab308;
  border: 1px solid rgba(234,179,8,0.3);
  padding: 1px 5px;
  border-radius: 3px;
}
.picker-options { display: flex; flex-wrap: wrap; gap: 8px; }
.picker-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid #1e2130;
  border-radius: 8px;
  color: #6b7280;
  font-family: 'Barlow', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.picker-option:hover { border-color: #374151; color: #d1d5db; }
.picker-option.active { background: rgba(234,179,8,0.1); border-color: rgba(234,179,8,0.4); color: #eab308; }
.picker-emoji { font-size: 1rem; }

.picker-preview { text-align: center; }
.preview-badge {
  display: inline-block;
  padding: 5px 14px;
  background: rgba(234,179,8,0.08);
  border: 1px solid rgba(234,179,8,0.2);
  border-radius: 999px;
  font-size: 0.78rem;
  color: #eab308;
  font-weight: 600;
  margin-bottom: 20px;
}
.preview-card {
  background: #0d0f1a;
  border: 1px solid #1e2130;
  border-radius: 16px;
  padding: 24px;
  max-width: 680px;
  margin: 0 auto;
}
.preview-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.preview-title { font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 700; letter-spacing: 0.1em; color: #4b5563; text-transform: uppercase; }
.preview-week { font-size: 0.78rem; color: #374151; }
.preview-rankings { display: flex; flex-direction: column; gap: 10px; }
.preview-rank-row { display: grid; grid-template-columns: 24px 32px 1fr 70px 120px 56px; align-items: center; gap: 10px; }
.prev-rank { font-family: 'Barlow Condensed', sans-serif; font-weight: 900; font-size: 1rem; color: #374151; text-align: right; }
.prev-rank.gold { color: #eab308; }
.prev-rank.silver { color: #9ca3af; }
.prev-rank.bronze { color: #b45309; }
.prev-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; }
.prev-name { font-size: 0.85rem; color: #d1d5db; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prev-record { font-size: 0.75rem; color: #4b5563; text-align: right; }
.prev-bar-wrap { height: 5px; background: #1a1d28; border-radius: 3px; overflow: hidden; }
.prev-bar { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
.prev-pts { font-family: 'Barlow Condensed', sans-serif; font-size: 0.85rem; font-weight: 700; color: #9ca3af; text-align: right; }

/* ══════════════════════════════════════════════
   GALLERY SECTION
══════════════════════════════════════════════ */
.gallery-section {
  position: relative;
  padding: 100px 0;
  background: #08090f;
  overflow: hidden;
}
.gallery-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 36px;
}
.gallery-filter {
  padding: 7px 16px;
  background: transparent;
  border: 1px solid #1e2130;
  border-radius: 6px;
  color: #6b7280;
  font-family: 'Barlow', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}
.gallery-filter:hover { border-color: #374151; color: #d1d5db; }
.gallery-filter.active { background: rgba(234,179,8,0.1); border-color: rgba(234,179,8,0.4); color: #eab308; }

.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}
.share-card { }

/* ── Base share card styles ─────────────────── */
.sc-card {
  border-radius: 14px;
  padding: 20px;
  font-family: 'Barlow Condensed', sans-serif;
  position: relative;
  overflow: hidden;
  transition: transform 0.2s;
  cursor: pointer;
}
.sc-card:hover { transform: scale(1.02) rotate(-0.5deg); }

.football-card {
  background: linear-gradient(145deg, #0d1117 0%, #111827 100%);
  border: 1px solid rgba(234,179,8,0.2);
}
.blowout-card {
  background: linear-gradient(145deg, #120a0a 0%, #1c1010 100%);
  border: 1px solid rgba(239,68,68,0.2);
}
.matchup-card {
  background: linear-gradient(145deg, #0a0d14 0%, #0f1220 100%);
  border: 1px solid rgba(99,102,241,0.2);
}
.mvp-card {
  background: linear-gradient(145deg, #0a0f0a 0%, #0f1a0f 100%);
  border: 1px solid rgba(16,185,129,0.2);
}
.elim-card {
  background: linear-gradient(145deg, #120a0a 0%, #1a0d0d 100%);
  border: 1px solid rgba(239,68,68,0.35);
  text-align: center;
}
.recap-card {
  background: linear-gradient(145deg, #0a0c16 0%, #111827 100%);
  border: 1px solid rgba(234,179,8,0.15);
}

.sc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.sc-sport-badge { font-size: 0.58rem; font-weight: 700; letter-spacing: 0.15em; color: #4b5563; text-transform: uppercase; }
.sc-week { font-size: 0.58rem; color: #374151; }
.sc-title { font-size: 1.2rem; font-weight: 900; color: #fff; letter-spacing: 0.04em; margin-bottom: 14px; text-transform: uppercase; }
.sc-title.small { font-size: 0.95rem; margin-bottom: 12px; }
.sc-footer { font-size: 0.55rem; color: #2a2d3a; margin-top: 14px; font-family: 'Barlow', sans-serif; }

/* Power rankings */
.sc-ranks { display: flex; flex-direction: column; gap: 8px; }
.sc-rank-row { display: grid; grid-template-columns: 18px 1fr auto; gap: 8px; align-items: center; }
.sc-num { font-size: 0.85rem; font-weight: 900; color: #374151; }
.sc-num.sc-gold { color: #eab308; }
.sc-bar-bg { height: 5px; background: #1a1d28; border-radius: 3px; overflow: hidden; }
.sc-bar { height: 100%; background: linear-gradient(90deg, #eab308, #fbbf24); border-radius: 3px; }
.sc-team-name { font-size: 0.75rem; color: #d1d5db; grid-column: 2 / 3; }
.sc-trend { font-size: 0.72rem; font-weight: 700; }
.sc-trend.up { color: #10b981; }
.sc-trend.dn { color: #ef4444; }
.sc-trend.fl { color: #374151; }

/* Blowout */
.sc-blowout-title { font-size: 2rem; font-weight: 900; line-height: 1; color: #ef4444; margin-bottom: 16px; text-transform: uppercase; }
.sc-blowout-score { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
.sc-bl-team { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; border-radius: 6px; }
.sc-bl-team.win { background: rgba(239,68,68,0.1); }
.sc-bl-team.lose { background: rgba(17,24,39,0.5); }
.sc-bl-name { font-size: 0.78rem; color: #d1d5db; }
.sc-bl-pts { font-size: 1rem; font-weight: 900; }
.win-pts { color: #ef4444; }
.lose-pts { color: #374151; }
.sc-bl-vs { text-align: center; font-size: 0.65rem; color: #4b5563; letter-spacing: 0.1em; }
.sc-margin { font-size: 0.65rem; color: #6b7280; text-align: center; margin-top: 4px; }

/* Matchup */
.sc-matchup-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sc-team-block { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1; }
.sc-team-block.right { align-items: flex-end; }
.sc-team-circle { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
.sc-team-nm { font-size: 0.72rem; color: #d1d5db; text-align: center; }
.sc-team-sc { font-size: 1.1rem; font-weight: 900; color: #eab308; }
.sc-team-sc.dim { color: #374151; }
.sc-vs-circle { width: 30px; height: 30px; border-radius: 50%; background: #1a1d28; border: 1px solid #374151; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: #6b7280; font-weight: 900; flex-shrink: 0; }
.sc-win-bar-wrap { height: 4px; background: #1a1d28; border-radius: 2px; overflow: hidden; margin-bottom: 6px; }
.sc-win-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #818cf8); border-radius: 2px; }
.sc-win-label { font-size: 0.62rem; color: #6b7280; text-align: center; }

/* MVP */
.sc-mvp-crown { font-size: 1.5rem; text-align: center; margin-bottom: 4px; }
.sc-mvp-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
.sc-mvp-row { display: grid; grid-template-columns: 22px 1fr 60px 40px; align-items: center; gap: 6px; }
.sc-mvp-rank { font-size: 0.85rem; }
.sc-mvp-name { font-size: 0.75rem; color: #d1d5db; }
.sc-mvp-bar-wrap { height: 4px; background: #1a1d28; border-radius: 2px; overflow: hidden; }
.sc-mvp-bar { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 2px; }
.sc-mvp-pts { font-size: 0.72rem; font-weight: 700; color: #10b981; text-align: right; }

/* Eliminated */
.sc-elim-top { font-size: 2.5rem; margin-bottom: 8px; }
.sc-elim-title { font-size: 1.6rem; font-weight: 900; color: #ef4444; text-transform: uppercase; line-height: 1; margin-bottom: 12px; }
.sc-elim-name { font-size: 0.85rem; color: #d1d5db; margin-bottom: 6px; }
.sc-elim-score { font-size: 1.1rem; font-weight: 900; color: #374151; margin-bottom: 8px; }
.sc-elim-by { font-size: 0.72rem; color: #6b7280; }
.sc-elim-by strong { color: #eab308; }

/* Recap */
.sc-recap-stats { display: flex; flex-direction: column; gap: 10px; }
.sc-rs-item { display: flex; justify-content: space-between; align-items: center; padding: 7px 8px; background: rgba(255,255,255,0.02); border-radius: 6px; }
.sc-rs-label { font-size: 0.72rem; color: #6b7280; }
.sc-rs-item strong { font-size: 0.75rem; color: #d1d5db; }
.sc-rs-item strong.red { color: #ef4444; }

/* ══════════════════════════════════════════════
   HOW IT WORKS
══════════════════════════════════════════════ */
.hiw-section {
  padding: 100px 0;
  background: #05060a;
}
.hiw-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  position: relative;
}
.hiw-step {
  padding: 32px;
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 16px;
  margin: 0 -1px;
  position: relative;
  transition: border-color 0.2s;
}
.hiw-step:hover { border-color: rgba(234,179,8,0.3); z-index: 1; }
.hiw-step-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 3.5rem;
  font-weight: 900;
  color: #1a1d28;
  line-height: 1;
  margin-bottom: 16px;
}
.hiw-icon-wrap {
  width: 52px; height: 52px;
  background: rgba(234,179,8,0.08);
  border: 1px solid rgba(234,179,8,0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  margin-bottom: 16px;
}
.hiw-step h3 {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.hiw-step p {
  font-size: 0.9rem;
  color: #6b7280;
  line-height: 1.65;
}
.hiw-connector {
  position: absolute;
  right: -20px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 2px;
  background: linear-gradient(90deg, #1e2130, #374151);
  z-index: 2;
  display: none;
}

/* ══════════════════════════════════════════════
   SOCIAL PROOF
══════════════════════════════════════════════ */
.proof-section {
  position: relative;
  padding: 100px 0;
  background: #08090f;
  overflow: hidden;
}
.chat-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 64px;
  max-width: 860px;
  margin-left: auto;
  margin-right: auto;
}
.chat-bubble {
  padding: 18px 20px;
  border-radius: 16px;
  position: relative;
}
.chat-bubble.left {
  background: #0d0f1a;
  border: 1px solid #1e2130;
  border-bottom-left-radius: 4px;
}
.chat-bubble.right {
  background: #111622;
  border: 1px solid rgba(234,179,8,0.1);
  border-bottom-right-radius: 4px;
}
.chat-meta { font-size: 0.7rem; color: #4b5563; margin-bottom: 8px; font-weight: 600; }
.chat-text { font-size: 0.9rem; color: #d1d5db; line-height: 1.5; margin-bottom: 10px; }
.chat-reaction { font-size: 1.2rem; }

.stats-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  max-width: 700px;
  margin: 0 auto;
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 16px;
  overflow: hidden;
}
.stat-block {
  flex: 1;
  text-align: center;
  padding: 28px 20px;
}
.stat-num {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 2.4rem;
  font-weight: 900;
  color: #eab308;
  line-height: 1;
  margin-bottom: 6px;
}
.stat-label { font-size: 0.78rem; color: #6b7280; font-weight: 500; }
.stat-divider { width: 1px; height: 60px; background: #1e2130; flex-shrink: 0; }

/* ══════════════════════════════════════════════
   PRICING
══════════════════════════════════════════════ */
.pricing-section {
  padding: 100px 0;
  background: #05060a;
}
.beta-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: rgba(59,130,246,0.08);
  border: 1px solid rgba(59,130,246,0.25);
  border-radius: 10px;
  font-size: 0.88rem;
  color: #93c5fd;
  margin-bottom: 40px;
  max-width: 700px;
}
.beta-dot {
  width: 8px; height: 8px;
  background: #3b82f6;
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse-dot 2s infinite;
}

.pricing-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: start;
}
.pricing-card {
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 16px;
  padding: 32px;
  position: relative;
  transition: border-color 0.2s;
}
.pricing-card:hover { border-color: #374151; }
.league-card {
  border-color: rgba(234,179,8,0.35);
  background: linear-gradient(145deg, #0d0f1a, #111622);
  box-shadow: 0 0 60px rgba(234,179,8,0.06);
}
.popular-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 16px;
  background: #eab308;
  color: #0a0c14;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  border-radius: 999px;
  white-space: nowrap;
}

.pc-tier {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: #6b7280;
  margin-bottom: 10px;
}
.pc-price {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
  color: #fff;
  margin-bottom: 10px;
  line-height: 1;
}
.league-card .pc-price { color: #eab308; }
.pc-desc { font-size: 0.85rem; color: #6b7280; margin-bottom: 24px; line-height: 1.5; }
.pc-features { list-style: none; padding: 0; margin: 0 0 28px; display: flex; flex-direction: column; gap: 10px; }
.pc-features li { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: #9ca3af; }
.check { color: #10b981; font-weight: 700; font-size: 0.9rem; }
.x { color: #374151; font-weight: 700; font-size: 0.9rem; }

.pc-cta {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: all 0.2s;
}
.free-cta { background: #1e2130; color: #9ca3af; border: 1px solid #2a2d3a; }
.free-cta:hover { background: #2a2d3a; color: #d1d5db; }
.league-cta { background: #eab308; color: #0a0c14; }
.league-cta:hover { background: #fbbf24; transform: translateY(-1px); }
.ultimate-cta { background: transparent; color: #9ca3af; border: 1px solid #2a2d3a; }
.ultimate-cta:hover { border-color: #4b5563; color: #d1d5db; }

/* ══════════════════════════════════════════════
   FAQ
══════════════════════════════════════════════ */
.faq-section {
  padding: 100px 0;
  background: #08090f;
}
.faq-inner {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 80px;
  align-items: start;
}
.faq-headline { font-size: clamp(1.8rem, 4vw, 2.8rem); }
.faq-list { display: flex; flex-direction: column; }
.faq-item {
  border-bottom: 1px solid #1e2130;
  padding: 18px 0;
  cursor: pointer;
  transition: all 0.15s;
}
.faq-item:first-child { border-top: 1px solid #1e2130; }
.faq-q {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  font-family: 'Barlow', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: #d1d5db;
}
.faq-arrow {
  font-size: 1.4rem;
  color: #4b5563;
  transition: transform 0.2s;
  flex-shrink: 0;
  line-height: 1;
}
.faq-arrow.open { transform: rotate(90deg); color: #eab308; }
.faq-a {
  font-size: 0.88rem;
  color: #6b7280;
  line-height: 1.65;
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, margin-top 0.2s;
}
.faq-a.visible { max-height: 200px; margin-top: 12px; }
.faq-more-link {
  display: inline-block;
  margin-top: 20px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: #eab308;
  text-decoration: none;
  letter-spacing: 0.04em;
  transition: color 0.15s;
}
.faq-more-link:hover { color: #fbbf24; }

/* ══════════════════════════════════════════════
   FINAL CTA
══════════════════════════════════════════════ */
.final-cta-section {
  position: relative;
  padding: 120px 0;
  background: #05060a;
  overflow: hidden;
  text-align: center;
}
.final-glow-left {
  position: absolute; left: -200px; top: 50%; transform: translateY(-50%);
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.final-glow-right {
  position: absolute; right: -200px; top: 50%; transform: translateY(-50%);
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%);
  pointer-events: none;
}
.final-inner { position: relative; z-index: 2; }
.final-eyebrow { font-size: 1.1rem; margin-bottom: 20px; display: block; }
.final-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2.8rem, 7vw, 5rem);
  font-weight: 900;
  line-height: 1.0;
  color: #fff;
  text-transform: uppercase;
  margin-bottom: 40px;
}
.final-accent { color: #eab308; }
.final-trust {
  margin-top: 18px;
  font-size: 0.82rem;
  color: #4b5563;
  letter-spacing: 0.03em;
}

/* ══════════════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════════════ */
@media (max-width: 900px) {
  .hero-cards-row { grid-template-columns: 1fr; gap: 12px; }
  .hc-left, .hc-right { display: none; }
  .picker-grid { grid-template-columns: 1fr; gap: 24px; }
  .card-grid { grid-template-columns: 1fr 1fr; }
  .hiw-steps { grid-template-columns: 1fr; gap: 16px; }
  .hiw-step { margin: 0; }
  .pricing-cards { grid-template-columns: 1fr; }
  .faq-inner { grid-template-columns: 1fr; gap: 40px; }
  .chat-grid { grid-template-columns: 1fr; }
  .stats-row { flex-wrap: wrap; }
  .preview-rank-row { grid-template-columns: 24px 28px 1fr 60px; }
  .prev-bar-wrap, .prev-pts { display: none; }
}

@media (max-width: 600px) {
  .card-grid { grid-template-columns: 1fr; }
  .hero-headline { font-size: 3rem; }
  .section-headline { font-size: 1.8rem; }
}
</style>
