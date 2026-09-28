<template>
  <Teleport to="body">
    <Transition name="nudge-slide">
      <div v-if="show" class="nudge-wrap">

        <!-- Collapsed tab (always reachable after a collapse) -->
        <div v-if="collapsed" class="nudge-tab" @click="collapsed = false">
          <span class="nudge-tab-icon">⚡</span>
          <span class="nudge-tab-text">Unlock the decisions</span>
          <span class="nudge-tab-caret">▲</span>
        </div>

        <div v-else class="nudge-panel">
          <div class="nudge-header">
            <div class="nudge-headings">
              <div class="nudge-title"><span class="nudge-emoji">⚡</span>Unlock the decisions</div>
              <div class="nudge-sub">
                Power rankings, standings and league history stay free, in all four sports.
                The Season Pass adds the calls.
              </div>
            </div>
            <div class="nudge-header-right">
              <button class="nudge-icon-btn" @click="collapsed = true" title="Collapse" aria-label="Collapse">▼</button>
              <button class="nudge-icon-btn" @click="dismiss" title="Dismiss for today" aria-label="Dismiss for today">✕</button>
            </div>
          </div>

          <div class="nudge-body">
            <ul class="nudge-features">
              <li v-for="f in features" :key="f" class="nudge-feature">
                <span class="nudge-check">✓</span><span>{{ f }}</span>
              </li>
            </ul>

            <div class="nudge-buy">
              <div class="nudge-badge">Founding price</div>
              <div class="nudge-price">
                <span class="nudge-amount">$39</span><span class="nudge-period">/year</span>
              </div>
              <button class="nudge-cta" @click="goToPricing">Get the Season Pass →</button>
              <div class="nudge-fine">365 days · every league · cancel anytime</div>
            </div>
          </div>
        </div>

      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFeatureAccess } from '@/composables/useFeatureAccess'

const router = useRouter()
const { isTrialExpired, isPaid } = useFeatureAccess()

const STORAGE_KEY = 'ufd_upgrade_nudge_last_shown'

const show = ref(false)
const collapsed = ref(false)

/*
 * These name the calls the Season Pass actually buys, and they are the same four the pricing
 * page, Settings and every in-app wall already name. They used to lead with "Full power
 * rankings with trend graph" and "Complete league history" — directly under a line saying
 * power rankings and history stay free, so the card sold as its headline benefits the two
 * things it had just given away.
 */
const features = [
  'The draft pick — and what it costs you to wait',
  'The waiver call — what clears your roster, and who to cut',
  'Your start/sit, closest calls first',
  'Trades scored for both sides, with the message to send',
  'Your own rankings, swapped in any time',
]

function getTodayStr() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function shouldShow() {
  if (!isTrialExpired.value || isPaid.value) return false
  const last = localStorage.getItem(STORAGE_KEY)
  return last !== getTodayStr()
}

function dismiss() {
  show.value = false
  localStorage.setItem(STORAGE_KEY, getTodayStr())
}

/*
 * One plan, because there is only one plan.
 *
 * This card used to offer a $29 one-time League Pass beside a "$7.99/mo billed monthly"
 * line. Both were retired — PricingView sells `individual_annual` and nothing else — so the
 * League Pass button sent people to a page where that product did not exist, and the monthly
 * line quoted a price nobody could pay. A checkout that contradicts the thing that sold it is
 * worse than no nudge at all.
 */
function goToPricing() {
  dismiss()
  router.push('/pricing?intent=individual')
}

onMounted(() => {
  // Small delay so it doesn't pop immediately on page load
  setTimeout(() => {
    if (shouldShow()) show.value = true
  }, 2500)
})

// Also re-check when trial/paid status changes
watch([isTrialExpired, isPaid], () => {
  if (shouldShow() && !show.value) {
    setTimeout(() => { show.value = true }, 1000)
  } else if (isPaid.value) {
    show.value = false
  }
})
</script>

<style scoped>
/* The brand accent. The panel used to be bordered and glowed in gold (234,179,8) while every
   other surface in the app is lime, so the one component asking for money was the one that
   looked like it came from somewhere else. Written as literal rgb because --color-primary has
   no alpha slot to borrow. */
:host, .nudge-wrap { --nudge-accent: var(--color-primary, #C6FF3A); }

.nudge-wrap {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 9000;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* ── Collapsed tab ── */
.nudge-tab {
  pointer-events: all;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: #0f1118;
  border: 1px solid rgba(198, 255, 58, 0.35);
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  cursor: pointer;
  transition: background 0.15s;
}
.nudge-tab:hover { background: #161a24; }
.nudge-tab-icon { font-size: 13px; }
.nudge-tab-text {
  font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--color-primary, #C6FF3A);
}
.nudge-tab-caret { font-size: 9px; color: #6b7280; }

/* ── Panel ── */
.nudge-panel {
  pointer-events: all;
  width: 100%;
  max-width: 720px;
  background: linear-gradient(135deg, #10131c, #0b0e18);
  border: 1px solid rgba(198, 255, 58, 0.28);
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -10px 44px rgba(0, 0, 0, 0.55);
  padding: 16px 20px 18px;
  box-sizing: border-box;
}

.nudge-header { display: flex; align-items: flex-start; gap: 12px; }
.nudge-headings { flex: 1; min-width: 0; }
.nudge-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 800; color: #F2F5F2; letter-spacing: -0.01em;
}
.nudge-emoji { font-size: 15px; }
.nudge-sub { margin-top: 3px; font-size: 12.5px; line-height: 1.45; color: #9aa6b4; }

.nudge-header-right { display: flex; gap: 6px; flex-shrink: 0; }
.nudge-icon-btn {
  width: 24px; height: 24px; line-height: 1;
  display: grid; place-items: center;
  font-size: 11px; color: #8b95a5;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px; cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.nudge-icon-btn:hover { color: #F2F5F2; background: rgba(255, 255, 255, 0.11); }

/* Bullets and the buy block sit side by side, and stack on a phone. */
.nudge-body {
  display: flex; align-items: stretch; gap: 22px;
  margin-top: 14px; flex-wrap: wrap;
}
.nudge-features {
  flex: 1 1 340px; min-width: 0;
  margin: 0; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 6px;
  align-self: center;
}
.nudge-feature {
  display: flex; align-items: flex-start; gap: 9px;
  font-size: 12.5px; line-height: 1.4; color: #c9d2dd;
}
.nudge-check { color: var(--color-primary, #C6FF3A); font-weight: 800; flex-shrink: 0; }

.nudge-buy {
  flex: 0 1 220px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; text-align: center;
  padding: 14px 16px;
  background: color-mix(in oklab, var(--color-primary, #C6FF3A) 7%, transparent);
  border: 1px solid rgba(198, 255, 58, 0.3);
  border-radius: 12px;
}
.nudge-badge {
  font-size: 9.5px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase;
  color: #0a0c14; background: var(--color-primary, #C6FF3A);
  padding: 3px 9px; border-radius: 999px;
}
.nudge-price { display: flex; align-items: baseline; gap: 2px; }
.nudge-amount { font-size: 30px; font-weight: 900; color: var(--color-primary, #C6FF3A); line-height: 1; }
.nudge-period { font-size: 12px; color: #6b7280; }
.nudge-cta {
  width: 100%;
  padding: 9px 14px;
  font-size: 13px; font-weight: 800;
  color: #0a0c14; background: var(--color-primary, #C6FF3A);
  border: none; border-radius: 9px; cursor: pointer;
  transition: filter 0.15s, transform 0.15s;
}
.nudge-cta:hover { filter: brightness(1.08); transform: translateY(-1px); }
.nudge-fine { font-size: 10.5px; color: #6b7280; line-height: 1.35; }

/* On a phone the buy block stops being a stacked column.
   Badge, price, button and fine print as four separate rows put the sheet at 421px on a 390
   screen — better than half the viewport, for a card nobody asked to see. The badge and the
   price share a line and the button spans, which is the same information two rows shorter. */
@media (max-width: 560px) {
  .nudge-panel { padding: 13px 15px 15px; }
  .nudge-body { gap: 12px; margin-top: 11px; }
  .nudge-features { flex: 1 1 100%; gap: 5px; }
  .nudge-feature { font-size: 12px; }
  .nudge-sub { font-size: 12px; }
  .nudge-buy {
    flex: 1 1 100%;
    flex-direction: row; flex-wrap: wrap;
    align-items: center; justify-content: center;
    gap: 8px; padding: 11px 12px;
  }
  .nudge-badge { order: 0; }
  .nudge-price { order: 1; }
  .nudge-cta { order: 2; width: 100%; }
  .nudge-fine { order: 3; flex: 1 1 100%; }
}

/* ── Transition ── */
.nudge-slide-enter-active, .nudge-slide-leave-active { transition: transform 0.28s ease, opacity 0.28s ease; }
.nudge-slide-enter-from, .nudge-slide-leave-to { transform: translateY(100%); opacity: 0; }
</style>
