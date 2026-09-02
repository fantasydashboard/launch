<!--
  Connect a league WITHOUT an account.

  The landing CTA said "Connect your league. Free." and opened a password form. That is a
  promise the next screen did not keep, and it asked for commitment before the visitor had
  seen a single thing that belongs to them.

  Sleeper's read API is public, and `leagueStore.saveLeague` already writes to localStorage
  first and treats Supabase as a best-effort background sync — so an anonymous visitor can
  connect a real league and see their real dashboard today. Nothing here is a demo or a
  fixture; it is their league.

  Yahoo and ESPN genuinely cannot work this way: Yahoo needs somewhere to keep an OAuth
  token and ESPN needs stored credentials. Those keep a sign-in gate, with the reason
  stated rather than implied — the account is doing real work for the user, not for us.

  The account ask moves to the moment it is worth something: once they are looking at their
  own league and would lose it. See the anonymous banner in App.vue.
-->
<template>
  <div class="connect-root">
    <div class="connect-inner">

      <div class="c-eyebrow">Free · no card · nothing to change in your league</div>
      <h1 class="c-headline">Connect your league.</h1>
      <p class="c-sub">
        Power rankings, all-play, standings and your full league history — for your actual
        league, in about thirty seconds. You don't need an account to look.
      </p>

      <!-- ── Platform ─────────────────────────────────────────────── -->
      <div class="c-step-label"><span class="c-step-num">01</span> Where do you play?</div>
      <div class="c-platforms" role="group" aria-label="Choose your platform">
        <button
          v-for="p in PLATFORMS" :key="p.id"
          class="c-plat"
          :class="{ active: platform === p.id }"
          :aria-pressed="platform === p.id"
          @click="selectPlatform(p.id)"
        >
          <img :src="p.logo" alt="" aria-hidden="true" class="c-plat-logo" />
          <span class="c-plat-name">{{ p.name }}</span>
          <span class="c-plat-note">{{ p.id === 'sleeper' ? 'No account needed' : 'Needs an account' }}</span>
        </button>
      </div>

      <!-- ── Sleeper: the anonymous path ──────────────────────────── -->
      <template v-if="platform === 'sleeper'">
        <div class="c-step-label"><span class="c-step-num">02</span> Your Sleeper username</div>
        <form class="c-form" @submit.prevent="lookup">
          <input
            v-model="input"
            type="text"
            class="c-input"
            :class="{ 'c-input-err': !!error }"
            autocomplete="username"
            autocapitalize="none"
            spellcheck="false"
            placeholder="username, or paste a league link"
            aria-label="Your Sleeper username, or a Sleeper league link"
            :disabled="loading"
          />
          <button type="submit" class="c-submit" :disabled="!input.trim() || loading">
            {{ loading ? 'Looking…' : 'Find my leagues' }}
          </button>
        </form>
        <p class="c-help">
          Your username is the one your league mates see. Nothing is posted, changed or shared —
          Sleeper's data is read-only.
        </p>

        <p v-if="error" class="c-error" role="alert">{{ error }}</p>

        <!-- League picker -->
        <div v-if="leagues.length" class="c-leagues">
          <div class="c-leagues-head">
            {{ leagues.length }} league{{ leagues.length === 1 ? '' : 's' }} found. Pick one to start —
            you can add the rest later.
          </div>
          <button
            v-for="l in leagues" :key="l.league_id"
            class="c-league"
            :disabled="saving"
            @click="choose(l)"
          >
            <span class="c-league-main">
              <span class="c-league-name">{{ l.name }}</span>
              <span class="c-league-meta">
                {{ SPORT_LABEL[sportOf(l)] }} &middot; {{ l.total_rosters || l.settings?.num_teams || '?' }} teams &middot; {{ l.season }}
              </span>
            </span>
            <span class="c-league-go" aria-hidden="true">→</span>
          </button>
        </div>

        <p v-else-if="searched && !error && !loading" class="c-empty">
          No leagues on that account for {{ season }}. Check the spelling, or paste a league link
          instead — that works for any sport and any season.
        </p>
      </template>

      <!-- ── Yahoo / ESPN: the honest gate ────────────────────────── -->
      <template v-else-if="platform">
        <div class="c-gate">
          <div class="c-gate-eyebrow">One step first</div>
          <h2 class="c-gate-headline">{{ platformName }} needs an account.</h2>
          <p class="c-gate-body">
            <template v-if="platform === 'yahoo'">
              Yahoo signs you in through their own login, and that connection has to be stored
              somewhere so you aren't reconnecting on every visit. That somewhere is a UFD account.
            </template>
            <template v-else>
              ESPN leagues are read with credentials from your browser, and those have to be kept
              somewhere so your league still loads tomorrow. That somewhere is a UFD account.
            </template>
            It's free, and it takes a moment.
          </p>
          <button class="c-submit c-gate-cta" @click="$emit('open-signup')">
            Create a free account
          </button>
          <p class="c-gate-alt">
            On Sleeper too?
            <button type="button" class="c-linkbtn" @click="selectPlatform('sleeper')">
              Start there instead
            </button>
            — no account needed.
          </p>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { sleeperService } from '@/services/sleeper'
import { useLeagueStore } from '@/stores/league'
import { useSportStore } from '@/stores/sport'

defineEmits<{ (e: 'open-signup'): void }>()

const router = useRouter()
const leagueStore = useLeagueStore()
const sportStore = useSportStore()

type Platform = 'sleeper' | 'yahoo' | 'espn'
type Sport = 'football' | 'baseball' | 'basketball' | 'hockey'

const PLATFORMS: { id: Platform; name: string; logo: string }[] = [
  { id: 'sleeper', name: 'Sleeper', logo: '/sleeper.svg' },
  { id: 'yahoo', name: 'Yahoo', logo: '/yahoo-fantasy.svg' },
  { id: 'espn', name: 'ESPN', logo: '/espn-logo.svg' },
]
const SPORT_LABEL: Record<Sport, string> = {
  football: 'Football', baseball: 'Baseball', basketball: 'Basketball', hockey: 'Hockey',
}
/* Sleeper's league objects carry the league's sport in its own vocabulary. */
const SPORT_BY_SLEEPER: Record<string, Sport> = {
  nfl: 'football', mlb: 'baseball', nba: 'basketball', nhl: 'hockey',
}

const platform = ref<Platform | null>('sleeper')
const input = ref('')
const loading = ref(false)
const saving = ref(false)
const searched = ref(false)
const error = ref('')
const leagues = ref<any[]>([])
const username = ref('')
const sleeperUserId = ref('')

const season = String(new Date().getFullYear())
const platformName = computed(() => PLATFORMS.find((p) => p.id === platform.value)?.name ?? '')

function sportOf(l: any): Sport {
  return SPORT_BY_SLEEPER[String(l?.sport ?? 'nfl').toLowerCase()] ?? 'football'
}

function selectPlatform(p: Platform) {
  platform.value = p
  error.value = ''
  leagues.value = []
  searched.value = false
}

/**
 * A league link and a username are the two things a person actually has to hand, so accept
 * either rather than making them figure out which one we want. A Sleeper league id is a long
 * run of digits, whether it arrives bare or inside a URL.
 */
function leagueIdFrom(raw: string): string | null {
  const fromUrl = raw.match(/leagues?\/(\d{6,})/)
  if (fromUrl) return fromUrl[1]
  return /^\d{6,}$/.test(raw) ? raw : null
}

async function lookup() {
  const raw = input.value.trim()
  if (!raw || loading.value) return
  loading.value = true
  error.value = ''
  leagues.value = []
  searched.value = false

  try {
    const id = leagueIdFrom(raw)
    if (id) {
      const league = await sleeperService.getLeague(id)
      if (!league) throw new Error('League not found')
      leagues.value = [league]
      username.value = ''
      sleeperUserId.value = ''
    } else {
      const user = await sleeperService.getUser(raw)
      if (!user?.user_id) throw new Error('User not found')
      username.value = user.username || raw
      sleeperUserId.value = user.user_id
      /* Sleeper keys leagues by season, and "this year" is wrong for a chunk of the calendar:
         in the weeks after a season ends, and for anyone who has not rolled a dynasty league
         over yet, the current year is simply empty. Falling back one season turns a dead end
         into a working connect. */
      leagues.value = await sleeperService.getUserLeagues(user.user_id, season)
      if (leagues.value.length === 0) {
        leagues.value = await sleeperService.getUserLeagues(user.user_id, String(Number(season) - 1))
      }
    }
    searched.value = true
  } catch (e: any) {
    const msg = String(e?.message || '')
    error.value = /user not found/i.test(msg)
      ? `No Sleeper account called “${raw}”. Usernames are case-insensitive but the spelling has to match.`
      : /league not found/i.test(msg)
        ? "That league link didn't resolve. Copy it straight from your browser's address bar."
        : 'Sleeper did not respond just now. Try again in a moment.'
  } finally {
    loading.value = false
  }
}

async function choose(league: any) {
  if (saving.value) return
  saving.value = true
  try {
    const sport = sportOf(league)
    /* saveLeague writes to localStorage synchronously and only touches Supabase when a user
       id is present, so this is the same call the signed-in flow makes. */
    await leagueStore.saveLeague(league, username.value, sleeperUserId.value, sport)
    sportStore.setSport(sport)
    /* setActiveLeague is what actually pulls rosters, users and matchups. Awaiting it here
       means the dashboard has data the moment it renders instead of flashing an empty shell. */
    await leagueStore.setActiveLeague(league.league_id)
    router.push('/')
  } catch (e) {
    console.error('[Connect] saveLeague failed', e)
    error.value = "Couldn't open that league. Try another, or reload and try again."
    saving.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=Barlow:wght@400;500;600&display=swap');

.connect-root {
  --ink-1: oklch(0.97 0.005 90);
  --ink-2: oklch(0.86 0.008 90);
  --ink-3: oklch(0.66 0.010 90);
  --ink-4: oklch(0.36 0.012 90);
  --accent: oklch(0.78 0.18 92);
  --accent-faint: oklch(0.78 0.18 92 / 0.08);
  --accent-border: oklch(0.78 0.18 92 / 0.38);
  --surface: oklch(0.13 0.014 265);
  --surface-2: oklch(0.11 0.012 265);
  --line: oklch(0.24 0.012 265);
  --danger: oklch(0.70 0.19 25);

  font-family: 'Barlow', sans-serif;
  color: var(--ink-2);
  min-height: 100vh;
  padding: clamp(32px, 7vw, 76px) 20px 96px;
}
.connect-inner { max-width: 620px; margin: 0 auto; }

.c-eyebrow {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.74rem; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 14px;
}
.c-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: clamp(2.1rem, 6vw, 3.1rem); font-weight: 900; line-height: 0.98;
  text-transform: uppercase; letter-spacing: 0.005em;
  color: var(--ink-1); margin-bottom: 14px; text-wrap: balance;
}
.c-sub { font-size: 1rem; line-height: 1.62; color: var(--ink-3); max-width: 52ch; margin-bottom: 38px; }

.c-step-label {
  display: flex; align-items: center; gap: 9px;
  font-size: 0.7rem; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase;
  color: var(--ink-3); margin-bottom: 13px;
}
.c-step-num {
  font-variant-numeric: tabular-nums; color: var(--accent);
  border: 1px solid var(--accent-border); border-radius: 4px; padding: 1px 5px; font-size: 0.65rem;
}

.c-platforms { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 34px; }
.c-plat {
  display: flex; flex-direction: column; align-items: flex-start; gap: 5px;
  padding: 13px 14px; border-radius: 11px; text-align: left;
  border: 1px solid var(--line); background: var(--surface);
  color: var(--ink-2); cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.c-plat:hover { border-color: oklch(0.34 0.012 265); }
.c-plat.active { border-color: var(--accent-border); background: var(--accent-faint); }
.c-plat:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.c-plat-logo { width: 22px; height: 22px; object-fit: contain; }
.c-plat-name { font-weight: 700; font-size: 0.98rem; color: var(--ink-1); }
.c-plat-note { font-size: 0.72rem; color: var(--ink-4); }
.c-plat.active .c-plat-note { color: var(--ink-3); }

.c-form { display: flex; gap: 10px; flex-wrap: wrap; }
.c-input {
  flex: 1 1 240px; min-width: 0;
  padding: 12px 14px; border-radius: 10px;
  border: 1px solid var(--line); background: var(--surface-2);
  color: var(--ink-1); font-size: 0.98rem; font-family: inherit;
}
.c-input::placeholder { color: var(--ink-4); }
.c-input:focus { outline: none; border-color: var(--accent-border); }
.c-input-err { border-color: var(--danger); }
.c-submit {
  padding: 12px 20px; border-radius: 10px; border: none;
  background: var(--accent); color: oklch(0.18 0.02 90);
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1rem; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase;
  cursor: pointer; transition: filter 0.15s;
}
.c-submit:hover:not(:disabled) { filter: brightness(1.07); }
.c-submit:disabled { opacity: 0.45; cursor: not-allowed; }
.c-submit:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.c-help { margin-top: 11px; font-size: 0.82rem; line-height: 1.55; color: var(--ink-4); }
.c-error { margin-top: 14px; font-size: 0.88rem; line-height: 1.55; color: var(--danger); }
.c-empty { margin-top: 18px; font-size: 0.88rem; line-height: 1.6; color: var(--ink-3); }

.c-leagues { margin-top: 28px; display: flex; flex-direction: column; gap: 8px; }
.c-leagues-head {
  font-size: 0.78rem; color: var(--ink-4); margin-bottom: 4px; line-height: 1.5;
}
.c-league {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  width: 100%; padding: 14px 16px; border-radius: 11px; text-align: left;
  border: 1px solid var(--line); background: var(--surface);
  color: var(--ink-2); cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.c-league:hover:not(:disabled) { border-color: var(--accent-border); background: var(--accent-faint); }
.c-league:disabled { opacity: 0.5; cursor: wait; }
.c-league:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.c-league-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.c-league-name {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.16rem; font-weight: 800; color: var(--ink-1);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.c-league-meta { font-size: 0.78rem; color: var(--ink-4); }
.c-league-go { color: var(--accent); font-size: 1.1rem; flex-shrink: 0; }

.c-gate {
  margin-top: 6px; padding: 22px; border-radius: 14px;
  border: 1px solid var(--line); background: var(--surface);
}
.c-gate-eyebrow {
  font-size: 0.68rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 9px;
}
.c-gate-headline {
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.5rem; font-weight: 800; text-transform: uppercase;
  color: var(--ink-1); margin-bottom: 10px;
}
.c-gate-body { font-size: 0.93rem; line-height: 1.62; color: var(--ink-3); margin-bottom: 18px; }
.c-gate-cta { width: 100%; }
.c-gate-alt { margin-top: 14px; font-size: 0.84rem; color: var(--ink-4); line-height: 1.55; }
.c-linkbtn {
  background: none; border: none; padding: 0; cursor: pointer;
  color: var(--accent); font: inherit; text-decoration: underline;
}
.c-linkbtn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
