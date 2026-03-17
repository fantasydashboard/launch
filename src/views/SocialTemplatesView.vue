<template>
  <div class="social-root">
    <!-- Header -->
    <div class="page-header">
      <img src="/UFD_V8.png" alt="UFD" class="header-logo" />
      <div>
        <h1>Social Media Studio</h1>
        <p>Create, preview, and download branded content for UFD marketing</p>
      </div>
    </div>

    <!-- NAV TABS -->
    <div class="tab-bar">
      <button v-for="tab in tabs" :key="tab.id" :class="['tab-btn', { active: activeTab === tab.id }]" @click="activeTab = tab.id">
        <span class="tab-icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- ─────────────────────────────────────────── -->
    <!-- TAB 1: FACEBOOK BANNER -->
    <!-- ─────────────────────────────────────────── -->
    <div v-if="activeTab === 'banner'" class="tab-content">
      <div class="section-header">
        <h2>Facebook Page Banner</h2>
        <p>851 × 315px — drag the background selector to customize</p>
      </div>

      <div class="controls-row">
        <label>Style:</label>
        <div class="style-pills">
          <button v-for="s in bannerStyles" :key="s.id" :class="['pill', { active: bannerStyle === s.id }]" @click="bannerStyle = s.id">{{ s.label }}</button>
        </div>
      </div>

      <!-- Preview -->
      <div class="preview-wrap banner-wrap">
        <div id="banner-canvas" class="banner-canvas" :style="bannerBg">
          <div class="banner-noise"></div>
          <div class="banner-glow"></div>
          <div class="banner-left">
            <img src="/UFD_V8.png" alt="UFD" class="banner-logo" />
            <div class="banner-tagline">Built by fantasy managers, for fantasy managers.</div>
          </div>
          <div class="banner-right">
            <div class="banner-feature" v-for="f in bannerFeatures" :key="f">
              <span class="feat-dot">▶</span>{{ f }}
            </div>
            <div class="banner-url">ultimatefantasydashboard.com</div>
          </div>
        </div>
      </div>

      <button class="dl-btn" @click="download('banner-canvas', 'ufd-facebook-banner')">
        ⬇ Download Banner (PNG)
      </button>
    </div>

    <!-- ─────────────────────────────────────────── -->
    <!-- TAB 2: SQUARE POSTS -->
    <!-- ─────────────────────────────────────────── -->
    <div v-if="activeTab === 'square'" class="tab-content">
      <div class="section-header">
        <h2>Square Social Posts</h2>
        <p>1080 × 1080px — pick a template, customize text, download</p>
      </div>

      <div class="square-grid">
        <!-- Post A: Hero -->
        <div class="sq-card">
          <div class="sq-label">Template A · Hero</div>
          <div class="sq-preview-wrap">
            <div id="sq-a" class="sq-canvas sq-hero">
              <div class="sq-noise"></div>
              <img src="/ufd-badge.png" alt="" class="sq-shield" />
              <div class="sq-hero-text">
                <div class="sq-eyebrow">FANTASY INTELLIGENCE</div>
                <div class="sq-headline">Know Your<br/><span class="gold">League</span><br/>Better.</div>
                <div class="sq-sub">Power rankings · Matchup analysis · Full history</div>
              </div>
              <div class="sq-url">ultimatefantasydashboard.com</div>
            </div>
          </div>
          <button class="dl-btn sm" @click="download('sq-a', 'ufd-post-hero')">⬇ Download</button>
        </div>

        <!-- Post B: Feature callout -->
        <div class="sq-card">
          <div class="sq-label">Template B · Features</div>
          <div class="sq-preview-wrap">
            <div id="sq-b" class="sq-canvas sq-features">
              <div class="sq-noise"></div>
              <div class="sq-feat-header">
                <img src="/UFD_V8.png" alt="UFD" class="sq-logo-sm" />
              </div>
              <div class="sq-feat-title">Everything your league<br/>is missing.</div>
              <div class="sq-feat-list">
                <div class="sq-feat-item" v-for="f in squareFeatures" :key="f.label">
                  <span class="sq-feat-icon">{{ f.icon }}</span>
                  <div>
                    <div class="sq-feat-name">{{ f.label }}</div>
                    <div class="sq-feat-desc">{{ f.desc }}</div>
                  </div>
                </div>
              </div>
              <div class="sq-url">ultimatefantasydashboard.com</div>
            </div>
          </div>
          <button class="dl-btn sm" @click="download('sq-b', 'ufd-post-features')">⬇ Download</button>
        </div>

        <!-- Post C: Platforms -->
        <div class="sq-card">
          <div class="sq-label">Template C · Multi-Platform</div>
          <div class="sq-preview-wrap">
            <div id="sq-c" class="sq-canvas sq-platforms">
              <div class="sq-noise"></div>
              <img src="/ufd-badge.png" alt="" class="sq-badge-bg" />
              <div class="sq-plat-content">
                <div class="sq-plat-eyebrow">WORKS WITH</div>
                <div class="sq-plat-logos">
                  <div class="plat-chip espn">ESPN</div>
                  <div class="plat-chip yahoo">Yahoo</div>
                  <div class="plat-chip sleeper">Sleeper</div>
                </div>
                <div class="sq-plat-headline">One dashboard.<br/><span class="gold">Every platform.</span></div>
                <div class="sq-plat-sub">Football · Baseball · Basketball · Hockey</div>
                <div class="sq-url mt">ultimatefantasydashboard.com</div>
              </div>
            </div>
          </div>
          <button class="dl-btn sm" @click="download('sq-c', 'ufd-post-platforms')">⬇ Download</button>
        </div>

        <!-- Post D: CTA -->
        <div class="sq-card">
          <div class="sq-label">Template D · CTA</div>
          <div class="sq-preview-wrap">
            <div id="sq-d" class="sq-canvas sq-cta">
              <div class="sq-noise"></div>
              <div class="sq-cta-inner">
                <img src="/ufd-badge.png" alt="" class="sq-cta-shield" />
                <div class="sq-cta-headline">Stop losing<br/>on bad data.</div>
                <div class="sq-cta-body">The advanced fantasy dashboard your league has been waiting for. Free to start.</div>
                <div class="sq-cta-btn">Get Started Free →</div>
                <div class="sq-url">ultimatefantasydashboard.com</div>
              </div>
            </div>
          </div>
          <button class="dl-btn sm" @click="download('sq-d', 'ufd-post-cta')">⬇ Download</button>
        </div>
      </div>
    </div>

    <!-- ─────────────────────────────────────────── -->
    <!-- TAB 3: SCREENSHOT MOCKUP -->
    <!-- ─────────────────────────────────────────── -->
    <div v-if="activeTab === 'mockup'" class="tab-content">
      <div class="section-header">
        <h2>Screenshot → Social Post</h2>
        <p>Upload 1–3 screenshots from the dashboard and we'll wrap them in a branded post</p>
      </div>

      <div class="upload-zone" :class="{ 'drag-over': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="handleDrop"
        @click="$refs.fileInput.click()">
        <input ref="fileInput" type="file" accept="image/*" multiple class="hidden-input" @change="handleFileInput" />
        <div class="upload-icon">📸</div>
        <div class="upload-text">Drop screenshots here or click to browse</div>
        <div class="upload-sub">Up to 3 images · PNG, JPG</div>
      </div>

      <div v-if="mockupImages.length" class="mockup-thumbs">
        <div v-for="(img, i) in mockupImages" :key="i" class="thumb-wrap">
          <img :src="img" class="thumb" />
          <button class="thumb-remove" @click="mockupImages.splice(i, 1)">✕</button>
        </div>
      </div>

      <div v-if="mockupImages.length" class="controls-row">
        <label>Caption:</label>
        <input v-model="mockupCaption" class="text-input" placeholder="Your league dashboard, finally sorted." maxlength="120" />
      </div>

      <!-- Mockup Preview -->
      <div v-if="mockupImages.length" class="preview-wrap">
        <div id="mockup-canvas" class="mockup-canvas">
          <div class="sq-noise"></div>
          <div class="mockup-header">
            <img src="/UFD_V8.png" alt="UFD" class="mockup-logo" />
          </div>
          <div class="mockup-screens" :class="`screens-${mockupImages.length}`">
            <div v-for="(img, i) in mockupImages.slice(0,3)" :key="i" class="screen-frame">
              <img :src="img" class="screen-img" />
            </div>
          </div>
          <div class="mockup-caption">{{ mockupCaption || 'Your league dashboard, finally sorted.' }}</div>
          <div class="sq-url">ultimatefantasydashboard.com</div>
        </div>
      </div>

      <button v-if="mockupImages.length" class="dl-btn" @click="download('mockup-canvas', 'ufd-screenshot-post')">
        ⬇ Download Post (PNG)
      </button>
    </div>

    <!-- ─────────────────────────────────────────── -->
    <!-- TAB 4: TESTIMONIAL -->
    <!-- ─────────────────────────────────────────── -->
    <div v-if="activeTab === 'testimonial'" class="tab-content">
      <div class="section-header">
        <h2>Testimonial Post</h2>
        <p>Type in a quote and it generates a branded social card</p>
      </div>

      <div class="testimonial-form">
        <div class="form-group">
          <label>Quote</label>
          <textarea v-model="testQuote" class="text-area" rows="3" placeholder="these power rankings are going to CAUSE PROBLEMS in the group chat and i am here for it" maxlength="200"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Name</label>
            <input v-model="testName" class="text-input" placeholder="Commissioner Mike" maxlength="40" />
          </div>
          <div class="form-group">
            <label>Context</label>
            <input v-model="testContext" class="text-input" placeholder="12-team PPR · Yahoo" maxlength="50" />
          </div>
          <div class="form-group">
            <label>Reaction</label>
            <input v-model="testReaction" class="text-input emoji-input" placeholder="💀" maxlength="4" />
          </div>
        </div>
        <div class="form-group">
          <label>Style</label>
          <div class="style-pills">
            <button v-for="s in testStyles" :key="s.id" :class="['pill', { active: testStyle === s.id }]" @click="testStyle = s.id">{{ s.label }}</button>
          </div>
        </div>
      </div>

      <!-- Testimonial Preview -->
      <div class="preview-wrap">
        <div id="test-canvas" class="sq-canvas test-canvas" :class="`test-${testStyle}`">
          <div class="sq-noise"></div>
          <div class="test-top">
            <img src="/ufd-badge.png" alt="" class="test-shield" />
            <div class="test-reaction">{{ testReaction || '💀' }}</div>
          </div>
          <div class="test-quote">"{{ testQuote || 'these power rankings are going to CAUSE PROBLEMS in the group chat and i am here for it' }}"</div>
          <div class="test-attribution">
            <div class="test-name">{{ testName || 'Commissioner Mike' }}</div>
            <div class="test-context">{{ testContext || '12-team PPR · Yahoo' }}</div>
          </div>
          <div class="test-logo-row">
            <img src="/UFD_V8.png" alt="UFD" class="test-logo" />
          </div>
        </div>
      </div>

      <button class="dl-btn" @click="download('test-canvas', 'ufd-testimonial')">
        ⬇ Download Testimonial (PNG)
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import html2canvas from 'html2canvas'

const activeTab = ref('banner')

const tabs = [
  { id: 'banner', icon: '🖼', label: 'FB Banner' },
  { id: 'square', icon: '⬛', label: 'Square Posts' },
  { id: 'mockup', icon: '📸', label: 'Screenshot Mockup' },
  { id: 'testimonial', icon: '💬', label: 'Testimonial' },
]

// ─── BANNER ───
const bannerStyle = ref('dark')
const bannerStyles = [
  { id: 'dark', label: 'Dark' },
  { id: 'gold', label: 'Gold Accent' },
  { id: 'navy', label: 'Navy' },
]
const bannerBgs: Record<string, string> = {
  dark: 'background: linear-gradient(135deg, #05060a 0%, #0f1220 50%, #05060a 100%)',
  gold: 'background: linear-gradient(135deg, #0f0a00 0%, #1a1000 40%, #0f0a00 100%)',
  navy: 'background: linear-gradient(135deg, #020812 0%, #050f22 50%, #020812 100%)',
}
const bannerBg = { get() { return bannerBgs[bannerStyle.value] } }
const bannerFeatures = ['Power Rankings', 'Matchup Analysis', 'Full Season History', 'Multi-Platform Support']

// ─── SQUARE ───
const squareFeatures = [
  { icon: '📊', label: 'Power Rankings', desc: 'Real-time weekly rankings' },
  { icon: '🏆', label: 'Season History', desc: 'Years of data at a glance' },
  { icon: '🎯', label: 'Start/Sit Help', desc: 'AI-powered lineup advice' },
  { icon: '📈', label: 'Draft Analysis', desc: 'Grade every pick' },
]

// ─── MOCKUP ───
const mockupImages = ref<string[]>([])
const mockupCaption = ref('')
const dragging = ref(false)
const fileInput = ref<HTMLInputElement>()

function handleDrop(e: DragEvent) {
  dragging.value = false
  const files = Array.from(e.dataTransfer?.files || []).slice(0, 3)
  loadFiles(files)
}

function handleFileInput(e: Event) {
  const files = Array.from((e.target as HTMLInputElement).files || []).slice(0, 3)
  loadFiles(files)
}

function loadFiles(files: File[]) {
  files.forEach(file => {
    if (mockupImages.value.length >= 3) return
    const reader = new FileReader()
    reader.onload = (e) => { mockupImages.value.push(e.target?.result as string) }
    reader.readAsDataURL(file)
  })
}

// ─── TESTIMONIAL ───
const testQuote = ref('')
const testName = ref('')
const testContext = ref('')
const testReaction = ref('')
const testStyle = ref('dark')
const testStyles = [
  { id: 'dark', label: 'Dark' },
  { id: 'gold', label: 'Gold' },
  { id: 'fire', label: 'Fire' },
]

// ─── DOWNLOAD ───
async function download(id: string, filename: string) {
  const el = document.getElementById(id)
  if (!el) return
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
  })
  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = canvas.toDataURL('image/png')
  link.click()
}
</script>

<style scoped>
/* ─── ROOT ─── */
.social-root {
  min-height: 100vh;
  background: #05060a;
  color: #f7f7ff;
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  padding: 0 0 80px;
}

/* ─── HEADER ─── */
.page-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 32px 40px 24px;
  border-bottom: 1px solid #1e2130;
  background: linear-gradient(180deg, #0a0c14, #05060a);
}
.header-logo { height: 48px; object-fit: contain; }
.page-header h1 { font-size: 26px; font-weight: 900; margin: 0 0 4px; letter-spacing: -0.02em; }
.page-header p { font-size: 13px; color: #6b7280; margin: 0; }

/* ─── TABS ─── */
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 20px 40px 0;
  border-bottom: 1px solid #1e2130;
}
.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  margin-bottom: -1px;
}
.tab-btn:hover { color: #d1d5db; }
.tab-btn.active { color: #eab308; border-bottom-color: #eab308; }
.tab-icon { font-size: 16px; }

/* ─── SECTION ─── */
.tab-content { padding: 32px 40px; }
.section-header { margin-bottom: 24px; }
.section-header h2 { font-size: 22px; font-weight: 800; margin: 0 0 6px; }
.section-header p { font-size: 13px; color: #6b7280; margin: 0; }

/* ─── CONTROLS ─── */
.controls-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.controls-row label { font-size: 13px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; }
.style-pills { display: flex; gap: 8px; flex-wrap: wrap; }
.pill {
  padding: 6px 16px;
  border-radius: 20px;
  border: 1px solid #262a3a;
  background: #0f1220;
  color: #9ca3af;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.pill.active { background: rgba(234,179,8,0.15); border-color: #eab308; color: #eab308; }

/* ─── DOWNLOAD BUTTON ─── */
.dl-btn {
  margin-top: 20px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: #eab308;
  color: #0a0c14;
  font-size: 14px;
  font-weight: 800;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.02em;
}
.dl-btn:hover { background: #fbbf24; transform: translateY(-1px); }
.dl-btn.sm { padding: 10px 18px; font-size: 13px; margin-top: 12px; }

/* ─── PREVIEW WRAP ─── */
.preview-wrap {
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 16px;
  padding: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.banner-wrap { padding: 24px; }

/* ═══════════════════════════════════════════ */
/* BANNER CANVAS */
/* ═══════════════════════════════════════════ */
.banner-canvas {
  width: 851px;
  height: 315px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  border-radius: 8px;
  overflow: hidden;
  transform-origin: top left;
}
@media (max-width: 1100px) {
  .banner-canvas { transform: scale(0.75); width: 851px; margin: -40px auto; }
}
@media (max-width: 800px) {
  .banner-canvas { transform: scale(0.5); margin: -80px auto; }
}
.banner-noise {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  opacity: 0.4; pointer-events: none;
}
.banner-glow {
  position: absolute;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(234,179,8,0.12) 0%, transparent 70%);
  top: 50%; left: 50%; transform: translate(-50%,-50%);
  pointer-events: none;
}
.banner-left {
  display: flex; flex-direction: column; gap: 12px; z-index: 1;
}
.banner-logo { height: 60px; object-fit: contain; object-position: left; }
.banner-tagline { font-size: 13px; color: #6b7280; font-style: italic; }
.banner-right {
  display: flex; flex-direction: column; gap: 10px; z-index: 1; align-items: flex-end;
}
.banner-feature { font-size: 14px; font-weight: 600; color: #d1d5db; display: flex; align-items: center; gap: 8px; }
.feat-dot { color: #eab308; font-size: 10px; }
.banner-url { font-size: 12px; color: #4b5563; margin-top: 8px; letter-spacing: 0.05em; }

/* ═══════════════════════════════════════════ */
/* SQUARE POSTS GRID */
/* ═══════════════════════════════════════════ */
.square-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}
.sq-card {
  background: #0a0c14;
  border: 1px solid #1e2130;
  border-radius: 16px;
  padding: 20px;
}
.sq-label { font-size: 12px; font-weight: 700; color: #4b5563; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 14px; }
.sq-preview-wrap {
  width: 100%; aspect-ratio: 1;
  overflow: hidden; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: #05060a;
}

/* All square canvases are 540x540 internally, scaled down */
.sq-canvas {
  width: 540px; height: 540px;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  transform: scale(0.555);
  transform-origin: top left;
  margin-bottom: -242px;
}
.sq-noise {
  position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
  opacity: 0.5; pointer-events: none; z-index: 0;
}
.sq-url {
  font-size: 13px; color: #374151; letter-spacing: 0.06em;
  position: absolute; bottom: 22px; left: 0; right: 0; text-align: center;
  z-index: 2;
}
.sq-url.mt { position: static; margin-top: 16px; text-align: center; }
.gold { color: #eab308; }

/* Hero */
.sq-hero {
  background: linear-gradient(145deg, #05060a 0%, #0f1220 60%, #080b14 100%);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0;
}
.sq-shield {
  position: absolute; right: -30px; top: -30px;
  width: 280px; height: auto; opacity: 0.12; z-index: 0;
  transform: rotate(15deg);
}
.sq-hero-text { position: relative; z-index: 1; text-align: center; padding: 0 40px; }
.sq-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.2em; color: #eab308; margin-bottom: 16px; }
.sq-headline { font-size: 72px; font-weight: 900; line-height: 1; letter-spacing: -0.03em; color: #fff; margin-bottom: 20px; }
.sq-sub { font-size: 16px; color: #6b7280; }

/* Features */
.sq-features {
  background: linear-gradient(160deg, #05060a 0%, #0d0f1a 100%);
  padding: 40px;
  display: flex; flex-direction: column; gap: 0;
}
.sq-feat-header { margin-bottom: 28px; }
.sq-logo-sm { height: 36px; object-fit: contain; }
.sq-feat-title { font-size: 32px; font-weight: 900; line-height: 1.15; color: #fff; margin-bottom: 28px; letter-spacing: -0.02em; }
.sq-feat-list { display: flex; flex-direction: column; gap: 18px; flex: 1; }
.sq-feat-item { display: flex; align-items: flex-start; gap: 16px; }
.sq-feat-icon { font-size: 22px; flex-shrink: 0; margin-top: 2px; }
.sq-feat-name { font-size: 16px; font-weight: 700; color: #f3f4f6; margin-bottom: 2px; }
.sq-feat-desc { font-size: 13px; color: #6b7280; }

/* Platforms */
.sq-platforms {
  background: linear-gradient(145deg, #03060e 0%, #050a18 100%);
  display: flex; align-items: center; justify-content: center;
}
.sq-badge-bg {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);
  width: 400px; height: auto; opacity: 0.06; z-index: 0;
}
.sq-plat-content { position: relative; z-index: 1; text-align: center; padding: 0 40px; }
.sq-plat-eyebrow { font-size: 11px; font-weight: 800; letter-spacing: 0.2em; color: #4b5563; margin-bottom: 20px; }
.sq-plat-logos { display: flex; gap: 12px; justify-content: center; margin-bottom: 28px; }
.plat-chip { padding: 8px 20px; border-radius: 8px; font-size: 15px; font-weight: 800; letter-spacing: 0.05em; }
.plat-chip.espn { background: rgba(0,100,255,0.15); border: 1px solid rgba(0,100,255,0.3); color: #60a5fa; }
.plat-chip.yahoo { background: rgba(100,0,200,0.15); border: 1px solid rgba(100,0,200,0.3); color: #a78bfa; }
.plat-chip.sleeper { background: rgba(234,179,8,0.12); border: 1px solid rgba(234,179,8,0.3); color: #eab308; }
.sq-plat-headline { font-size: 48px; font-weight: 900; line-height: 1.1; letter-spacing: -0.03em; color: #fff; margin-bottom: 14px; }
.sq-plat-sub { font-size: 15px; color: #6b7280; }

/* CTA */
.sq-cta {
  background: linear-gradient(160deg, #0a0800 0%, #0f0c00 50%, #050400 100%);
}
.sq-cta-inner {
  position: relative; z-index: 1;
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0;
  padding: 40px;
}
.sq-cta-shield { width: 80px; height: auto; margin-bottom: 24px; opacity: 0.9; }
.sq-cta-headline { font-size: 56px; font-weight: 900; letter-spacing: -0.03em; text-align: center; line-height: 1; color: #fff; margin-bottom: 18px; }
.sq-cta-body { font-size: 16px; color: #9ca3af; text-align: center; line-height: 1.5; margin-bottom: 28px; }
.sq-cta-btn {
  padding: 16px 36px; background: #eab308; color: #0a0c14;
  font-size: 17px; font-weight: 800; border-radius: 10px; margin-bottom: 28px;
  letter-spacing: 0.02em;
}

/* ═══════════════════════════════════════════ */
/* MOCKUP */
/* ═══════════════════════════════════════════ */
.upload-zone {
  border: 2px dashed #262a3a;
  border-radius: 16px;
  padding: 48px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 20px;
}
.upload-zone:hover, .upload-zone.drag-over {
  border-color: #eab308;
  background: rgba(234,179,8,0.04);
}
.upload-icon { font-size: 40px; margin-bottom: 12px; }
.upload-text { font-size: 16px; font-weight: 600; color: #d1d5db; margin-bottom: 6px; }
.upload-sub { font-size: 13px; color: #4b5563; }
.hidden-input { display: none; }
.mockup-thumbs { display: flex; gap: 12px; margin-bottom: 20px; }
.thumb-wrap { position: relative; }
.thumb { width: 100px; height: 70px; object-fit: cover; border-radius: 8px; border: 1px solid #262a3a; }
.thumb-remove {
  position: absolute; top: -6px; right: -6px;
  background: #ef4444; color: #fff; border: none; border-radius: 50%;
  width: 20px; height: 20px; font-size: 10px; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}

.text-input {
  flex: 1; min-width: 200px;
  background: #0f1220; border: 1px solid #262a3a; border-radius: 8px;
  padding: 10px 14px; color: #f7f7ff; font-size: 14px;
  outline: none; transition: border-color 0.2s;
}
.text-input:focus { border-color: #eab308; }
.emoji-input { max-width: 80px; text-align: center; }

.mockup-canvas {
  width: 600px; height: 600px;
  background: linear-gradient(145deg, #05060a 0%, #0d0f1a 100%);
  position: relative; overflow: hidden;
  display: flex; flex-direction: column;
  padding: 28px; gap: 16px;
}
.mockup-header { display: flex; justify-content: center; }
.mockup-logo { height: 32px; object-fit: contain; }
.mockup-screens { display: flex; gap: 8px; flex: 1; min-height: 0; }
.mockup-screens .screen-frame { flex: 1; border-radius: 8px; overflow: hidden; border: 1px solid #1e2130; }
.mockup-screens .screen-img { width: 100%; height: 100%; object-fit: cover; }
.mockup-caption { font-size: 15px; font-weight: 600; color: #d1d5db; text-align: center; line-height: 1.4; }

/* ═══════════════════════════════════════════ */
/* TESTIMONIAL */
/* ═══════════════════════════════════════════ */
.testimonial-form {
  background: #0a0c14; border: 1px solid #1e2130; border-radius: 16px;
  padding: 28px; margin-bottom: 28px; display: flex; flex-direction: column; gap: 20px;
}
.form-group { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.form-group label { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.1em; }
.form-row { display: flex; gap: 16px; flex-wrap: wrap; }
.text-area {
  background: #0f1220; border: 1px solid #262a3a; border-radius: 8px;
  padding: 12px 14px; color: #f7f7ff; font-size: 14px; line-height: 1.5;
  outline: none; resize: vertical; font-family: inherit; transition: border-color 0.2s;
}
.text-area:focus { border-color: #eab308; }

/* Testimonial Canvas */
.test-canvas {
  width: 540px; height: 540px;
  display: flex; flex-direction: column;
  padding: 48px; gap: 0;
  transform: none; margin-bottom: 0;
}
.test-dark { background: linear-gradient(145deg, #05060a 0%, #0d0f1a 100%); }
.test-gold { background: linear-gradient(145deg, #0a0800 0%, #130f00 100%); }
.test-fire { background: linear-gradient(145deg, #0d0200 0%, #150500 100%); }

.test-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
.test-shield { width: 48px; height: auto; }
.test-reaction { font-size: 40px; }
.test-quote {
  font-size: 26px; font-weight: 700; line-height: 1.4;
  color: #f9fafb; flex: 1; margin-bottom: 32px;
  font-style: italic; letter-spacing: -0.01em;
}
.test-dark .test-quote { color: #f9fafb; }
.test-gold .test-quote { color: #fef3c7; }
.test-fire .test-quote { color: #fff7ed; }
.test-attribution { margin-bottom: 28px; }
.test-name { font-size: 17px; font-weight: 800; color: #eab308; margin-bottom: 4px; }
.test-context { font-size: 13px; color: #6b7280; }
.test-logo-row { display: flex; justify-content: flex-end; margin-top: auto; }
.test-logo { height: 28px; object-fit: contain; }
</style>
