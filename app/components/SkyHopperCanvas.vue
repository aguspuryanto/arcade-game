<script setup lang="ts">
// app/components/SkyHopperCanvas.vue
import type { Bird, HopperWorld, Pillar } from '~/types/skyHopper'
import { HOPPER } from '~/types/skyHopper'

const H = HOPPER
const PLAY_HEIGHT = H.HEIGHT - H.GROUND_HEIGHT

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

// Bintang & bukit dibuat sekali agar tidak berkedip
const stars = Array.from({ length: 50 }, () => ({
  x: Math.random() * H.WIDTH,
  y: Math.random() * PLAY_HEIGHT * 0.7,
  r: Math.random() * 1.4 + 0.3,
  phase: Math.random() * Math.PI * 2,
}))

const { status, score, highScore, isNewRecord, action, togglePause } = useSkyHopperGame(draw)

// ---------- Rendering ----------
function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = H.WIDTH * dpr
  canvas.height = H.HEIGHT * dpr
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawSky(c: CanvasRenderingContext2D, time: number) {
  const g = c.createLinearGradient(0, 0, 0, PLAY_HEIGHT)
  g.addColorStop(0, '#1e1b4b')
  g.addColorStop(0.6, '#4c1d95')
  g.addColorStop(1, '#db2777')
  c.fillStyle = g
  c.fillRect(0, 0, H.WIDTH, PLAY_HEIGHT)

  for (const s of stars) {
    c.globalAlpha = 0.5 + Math.sin(time * 2 + s.phase) * 0.35
    c.fillStyle = '#fff'
    c.beginPath()
    c.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    c.fill()
  }
  c.globalAlpha = 1

  // Bulan
  c.fillStyle = '#fde68a'
  c.beginPath()
  c.arc(H.WIDTH - 70, 90, 28, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#312e81'
  c.beginPath()
  c.arc(H.WIDTH - 58, 82, 24, 0, Math.PI * 2)
  c.fill()
}

function drawPillar(c: CanvasRenderingContext2D, p: Pillar) {
  const top = p.gapY - p.gapSize / 2
  const bottom = p.gapY + p.gapSize / 2
  const w = H.PILLAR_WIDTH

  const g = c.createLinearGradient(p.x, 0, p.x + w, 0)
  g.addColorStop(0, '#0e7490')
  g.addColorStop(0.45, '#67e8f9')
  g.addColorStop(1, '#155e75')
  c.fillStyle = g

  // Batang
  c.fillRect(p.x, 0, w, top)
  c.fillRect(p.x, bottom, w, PLAY_HEIGHT - bottom)

  // Ujung kristal (runcing ke arah celah)
  c.beginPath()
  c.moveTo(p.x - 4, top - 18)
  c.lineTo(p.x + w + 4, top - 18)
  c.lineTo(p.x + w / 2, top)
  c.closePath()
  c.fill()
  c.beginPath()
  c.moveTo(p.x - 4, bottom + 18)
  c.lineTo(p.x + w + 4, bottom + 18)
  c.lineTo(p.x + w / 2, bottom)
  c.closePath()
  c.fill()

  // Garis kilau
  c.strokeStyle = 'rgb(255 255 255 / 0.35)'
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(p.x + 14, 0)
  c.lineTo(p.x + 14, top - 22)
  c.moveTo(p.x + 14, bottom + 22)
  c.lineTo(p.x + 14, PLAY_HEIGHT)
  c.stroke()
}

function drawGround(c: CanvasRenderingContext2D, offset: number) {
  c.fillStyle = '#1e293b'
  c.fillRect(0, PLAY_HEIGHT, H.WIDTH, H.GROUND_HEIGHT)
  c.fillStyle = '#a855f7'
  c.fillRect(0, PLAY_HEIGHT, H.WIDTH, 6)
  // Garis bergerak memberi kesan kecepatan
  c.fillStyle = '#334155'
  for (let x = -offset; x < H.WIDTH; x += 24) {
    c.beginPath()
    c.moveTo(x, PLAY_HEIGHT + 6)
    c.lineTo(x + 12, PLAY_HEIGHT + 6)
    c.lineTo(x, PLAY_HEIGHT + 22)
    c.closePath()
    c.fill()
  }
}

function drawBird(c: CanvasRenderingContext2D, b: Bird) {
  const r = H.BIRD_RADIUS
  c.save()
  c.translate(b.x, b.y)
  c.rotate(b.rotation)

  // Ekor
  c.fillStyle = '#0284c7'
  c.beginPath()
  c.moveTo(-r + 2, -3)
  c.lineTo(-r - 9, -8)
  c.lineTo(-r - 7, 4)
  c.closePath()
  c.fill()

  // Badan
  c.fillStyle = '#38bdf8'
  c.beginPath()
  c.ellipse(0, 0, r + 2, r, 0, 0, Math.PI * 2)
  c.fill()
  // Perut
  c.fillStyle = '#e0f2fe'
  c.beginPath()
  c.ellipse(2, 5, r - 4, r - 8, 0, 0, Math.PI * 2)
  c.fill()

  // Sayap: terangkat sesaat setelah mengepak
  const wingUp = b.flapTime < 0.12
  c.fillStyle = '#0369a1'
  c.beginPath()
  c.ellipse(-3, wingUp ? -6 : 3, 8, 5, wingUp ? -0.6 : 0.3, 0, Math.PI * 2)
  c.fill()

  // Mata
  c.fillStyle = '#fff'
  c.beginPath()
  c.arc(7, -5, 5, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#0f172a'
  c.beginPath()
  c.arc(8.5, -5, 2.2, 0, Math.PI * 2)
  c.fill()

  // Paruh
  c.fillStyle = '#f97316'
  c.beginPath()
  c.moveTo(r, -2)
  c.lineTo(r + 9, 1)
  c.lineTo(r, 5)
  c.closePath()
  c.fill()

  c.restore()
}

function drawScore(c: CanvasRenderingContext2D, value: number) {
  c.font = 'bold 48px system-ui, sans-serif'
  c.textAlign = 'center'
  c.textBaseline = 'top'
  c.lineWidth = 6
  c.strokeStyle = 'rgb(15 23 42 / 0.8)'
  c.strokeText(String(value), H.WIDTH / 2, 36)
  c.fillStyle = '#fff'
  c.fillText(String(value), H.WIDTH / 2, 36)
}

function draw(world: HopperWorld, currentScore: number) {
  const c = ctx
  if (!c) return
  drawSky(c, world.time)
  for (const p of world.pillars) drawPillar(c, p)
  drawGround(c, world.groundOffset)
  drawBird(c, world.bird)
  if (status.value !== 'ready') drawScore(c, currentScore)
}

onMounted(setupCanvas)

// Lepas fokus agar Spasi berikutnya tidak ikut "menekan" tombol pause
function onPauseClick(e: MouseEvent) {
  togglePause()
  ;(e.currentTarget as HTMLElement).blur()
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  action()
}
</script>

<template>
  <div class="game">
    <div class="hud">
      <span>Skor: <strong>{{ score }}</strong></span>
      <button
        v-if="status === 'playing' || status === 'paused'"
        type="button"
        class="pause"
        @click="onPauseClick"
      >
        {{ status === 'paused' ? '▶ Lanjut' : '⏸ Pause' }}
      </button>
      <span>Tertinggi: <strong>{{ highScore }}</strong></span>
    </div>

    <div class="board" @pointerdown="onPointerDown">
      <canvas ref="canvasRef" />

      <div v-if="status === 'ready'" class="overlay hint">
        <p class="big">Ketuk untuk terbang</p>
        <small>Spasi / ↑ / klik / tap</small>
      </div>
      <div v-else-if="status === 'paused'" class="overlay">
        <h2>Pause</h2>
        <small>Ketuk atau tekan P untuk lanjut</small>
      </div>
      <div v-else-if="status === 'over'" class="overlay">
        <h2>Game Over</h2>
        <p>Skor: <strong>{{ score }}</strong></p>
        <p v-if="isNewRecord" class="record">🏆 Rekor baru!</p>
        <small>Ketuk atau tekan Spasi untuk main lagi</small>
      </div>
    </div>

    <p class="help">Spasi/↑/klik: kepak · P: pause</p>
  </div>
</template>

<style scoped>
.game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 400px;
  font-size: 1.05rem;
}

.board {
  position: relative;
  /* 9:16, dibatasi tinggi layar agar tidak perlu scroll */
  width: min(100%, 400px, calc((100vh - 200px) * 9 / 16));
  aspect-ratio: 360 / 640;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgb(0 0 0 / 0.4);
  touch-action: manipulation;
  user-select: none;
  cursor: pointer;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgb(15 23 42 / 0.65);
  text-align: center;
  padding: 16px;
}

.overlay.hint {
  background: none;
  justify-content: flex-end;
  padding-bottom: 30%;
  text-shadow: 0 2px 6px rgb(0 0 0 / 0.6);
  pointer-events: none;
}

.overlay h2 {
  margin: 0;
  font-size: 2rem;
}

.overlay p {
  margin: 0;
}

.big {
  font-size: 1.4rem;
  font-weight: 700;
}

.record {
  color: #fde68a;
  font-weight: 700;
}

.pause {
  padding: 4px 12px;
  font: inherit;
  font-size: 0.85rem;
  color: #e2e8f0;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  cursor: pointer;
}

.pause:hover {
  background: #334155;
}

small,
.help {
  opacity: 0.75;
  font-size: 0.85rem;
}
</style>
