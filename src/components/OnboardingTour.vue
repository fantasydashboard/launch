<!--
  One card, shown once, when somebody's first league connects.

  WHAT THIS REPLACED, AND WHY. A five-step modal tour. Its copy promised "full access to power
  rankings, matchup analytics, league history and shareable graphics" to a reader who was about
  to meet a $39 wall on the Wire — the same failure as badging Yahoo "Connected" on a platform
  that could not return a league: an affordance describing our plumbing rather than the
  reader's outcome. It listed the product from two redesigns ago and never mentioned the four
  decisions the Season Pass actually sells. It pitched "Best Batters / Pitchers" to football
  leagues, and had done for months, because a modal that narrates the whole product drifts
  every time the product changes and nothing fails when it does.

  It also arrived at the worst possible moment: somebody had just connected their league and
  wanted to look at it, and got five screens of being told about menu items instead.

  So: one card. It says what just happened, what is free, what is not, and gets out of the way.
  Anything a surface needs to explain about itself belongs on that surface, the first time it
  is opened — where it can be specific, and where it fails visibly when it goes stale.
-->
<template>
  <Teleport to="body">
    <Transition name="tour-fade">
      <div v-if="show" class="tour-backdrop" @click.self="finish">
        <div class="tour-modal">
          <button class="tour-close" @click="finish" title="Close">✕</button>

          <div class="tour-slide">
            <div class="tour-eyebrow">Connected</div>
            <h2 class="tour-title">
              {{ leagueName ? leagueName : 'Your league' }} is in.
            </h2>

            <p class="tour-body">
              Standings, power rankings, the league page and your full history are free, for
              every league you're in, with no expiry.
            </p>
            <p class="tour-body tour-body-dim">
              The weekly calls — who to start, who to claim, what to trade, and the draft
              board — are the Season Pass.
            </p>

            <button class="tour-btn-done" @click="finish">Show me my league</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{ show: boolean; leagueName?: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

function finish() {
  emit('close')
}
</script>

<style scoped>
.tour-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(3, 5, 10, 0.78);
  backdrop-filter: blur(3px);
}

.tour-modal {
  position: relative;
  width: 100%;
  max-width: 440px;
  border-radius: 16px;
  border: 1px solid #1e2130;
  background: radial-gradient(ellipse 90% 70% at 50% 0%, #161a26 0%, #0b0e15 70%);
  padding: 30px 28px 26px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
}
/* The hairline the rest of the product uses, so this reads as the same publication. */
.tour-modal::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 16px 16px 0 0;
  background: linear-gradient(90deg, transparent, rgba(198, 255, 58, 0.85) 50%, transparent);
}

.tour-close {
  position: absolute;
  top: 12px;
  right: 14px;
  border: 0;
  background: none;
  color: #4b5563;
  font-size: 15px;
  cursor: pointer;
  line-height: 1;
}
.tour-close:hover { color: #c6d0dc; }

.tour-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #c6ff3a;
  margin-bottom: 10px;
}

.tour-title {
  margin: 0 0 14px;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.8px;
  line-height: 1.1;
  color: #f2f5f2;
}

.tour-body {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.55;
  color: #c6d0dc;
}
.tour-body-dim { color: #8a93a0; }

.tour-btn-done {
  margin-top: 18px;
  width: 100%;
  border: 0;
  border-radius: 10px;
  background: #c6ff3a;
  color: #05060a;
  font-weight: 700;
  font-size: 14px;
  padding: 11px 16px;
  cursor: pointer;
  transition: filter 0.15s ease;
}
.tour-btn-done:hover { filter: brightness(1.06); }

.tour-fade-enter-active,
.tour-fade-leave-active { transition: opacity 0.18s ease; }
.tour-fade-enter-from,
.tour-fade-leave-to { opacity: 0; }
</style>
