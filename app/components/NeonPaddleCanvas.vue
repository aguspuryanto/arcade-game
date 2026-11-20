<script setup lang="ts">
// app/components/NeonPaddleCanvas.vue
import type { PaddleWorld } from '~/types/neonPaddle'
import { PADDLE } from '~/types/neonPaddle'

const P = PADDLE
const PLAYER_COLOR = '#22d3ee'
const CPU_COLOR = '#f472b6'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const boardRef = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const { status, score, lives, goals, highScore, isNewRecord, action, togglePause, setPointerY }
  = useNeonPaddleGame(draw)

// ---------- Rendering ----------
function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = P.WIDTH * dpr
  canvas.height = P.HEIGHT * dpr
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawCourt(c: CanvasRenderingContext2D, world: PaddleWorld) {
  c.fillStyle = '#050816'
  c.fillRect(0, 0, P.WIDTH, P.HEIGHT)

  // Grid samar
  c.strokeStyle = 'rgb(99 102 241 / 0.08)'
  c.lineWidth = 1
  c.beginPath()
  for (let x = 0; x <= P.WIDTH; x += 40) {
    c.moveTo(x + 0.5, 0)
    c.lineTo(x + 0.5, P.HEIGHT)
  }
  for (let y = 0; y <= P.HEIGHT; y += 40) {
    c.moveTo(0, y + 0.5)
    c.lineTo(P.WIDTH, y + 0.5)
  }
  c.stroke()

  // Garis tengah putus-putus
  c.strokeStyle = 'rgb(226 232 240 / 0.25)'
  c.lineWidth = 3
  c.setLineDash([12, 14])
  c.beginPath()
  c.moveTo(P.WIDTH / 2, 8)
  c.lineTo(P.WIDTH / 2, P.HEIGHT - 8)
  c.stroke()
  c.setLineDash([])

  // Kilatan sisi yang kebobolan
  if (world.flash > 0) {
    const alpha = world.flash / 0.5
    const scorerColor = world.flashSide === 'player' ? PLAYER_COLOR : CPU_COLOR
    const x = world.flashSide === 'player' ? P.WIDTH : 0
    const g = c.createRadialGradient(x, P.HEIGHT / 2, 0, x, P.HEIGHT / 2, P.WIDTH * 0.6)
    g.addColorStop(0, scorerColor)
    g.addColorStop(1, 'transparent')
    c.globalAlpha = alpha * 0.35
    c.fillStyle = g
    c.fillRect(0, 0, P.WIDTH, P.HEIGHT)
    c.globalAlpha = 1
  }
}

function drawPaddle(c: CanvasRenderingContext2D, x: number, y: number, color: string) {
  c.save()
  c.shadowColor = color
  c.shadowBlur = 18
  c.fillStyle = color
  c.beginPath()
  c.roundRect(x, y - P.PADDLE_H / 2, P.PADDLE_W, P.PADDLE_H, 6)
  c.fill()
  c.restore()
}

function drawBall(c: CanvasRenderingContext2D, world: PaddleWorld) {
  const b = world.ball
  // Jejak
  world.trail.forEach((t, i) => {
    const k = (i + 1) / world.trail.length
    c.globalAlpha = k * 0.35
    c.fillStyle = b.vx >= 0 ? PLAYER_COLOR : CPU_COLOR
    c.beginPath()
    c.arc(t.x, t.y, P.BALL_RADIUS * k, 0, Math.PI * 2)
    c.fill()
  })
  c.globalAlpha = 1

  c.save()
  c.shadowColor = '#fff'
  c.shadowBlur = 16
  c.fillStyle = '#f8fafc'
  c.beginPath()
  c.arc(b.x, b.y, P.BALL_RADIUS, 0, Math.PI * 2)
  c.fill()
  c.restore()
}

function drawSparks(c: CanvasRenderingContext2D, world: PaddleWorld) {
  for (const s of world.sparks) {
    c.globalAlpha = Math.min(1, s.life * 3)
    c.fillStyle = s.color
    c.fillRect(s.x - 1.5, s.y - 1.5, 3, 3)
  }
  c.globalAlpha = 1
}

function drawServeCountdown(c: CanvasRenderingContext2D, world: PaddleWorld) {
  if (status.value !== 'playing' || world.serveTimer <= 0) return
  c.font = 'bold 15px system-ui, sans-serif'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillStyle = 'rgb(226 232 240 / 0.7)'
  c.fillText(world.serveDir < 0 ? '◀ servis ke kamu' : 'servis ke CPU ▶', P.WIDTH / 2, P.HEIGHT / 2 + 30)
}

function draw(world: PaddleWorld) {
  const c = ctx
  if (!c) return
  drawCourt(c, world)
  drawPaddle(c, P.PADDLE_MARGIN, world.player.y, PLAYER_COLOR)
  drawPaddle(c, P.WIDTH - P.PADDLE_MARGIN - P.PADDLE_W, world.cpu.y, CPU_COLOR)
  drawSparks(c, world)
  if (status.value !== 'over') drawBall(c, world)
  drawServeCountdown(c, world)
}

onMounted(setupCanvas)

// ---------- Input pointer (mouse & sentuhan) ----------
function toLogicalY(e: PointerEvent) {
  const rect = boardRef.value?.getBoundingClientRect()
  if (!rect || rect.height === 0) return null
  return ((e.clientY - rect.top) / rect.height) * P.HEIGHT
}

function onPointerMove(e: PointerEvent) {
  const y = toLogicalY(e)
  if (y !== null && status.value === 'playing') setPointerY(y)
}

function onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const y = toLogicalY(e)
  if (y !== null) setPointerY(y)
  if (status.value !== 'playing') action()
}

// Lepas fokus agar Spasi berikutnya tidak ikut "menekan" tombol pause
function onPauseClick(e: MouseEvent) {
  togglePause()
  ;(e.currentTarget as HTMLElement).blur()
}
</script>

<template>
  <div class="game">
    <div class="hud">
      <span>Skor: <strong>{{ score }}</strong></span>
      <span class="lives" :aria-label="`Nyawa ${lives}`">
        <span v-for="i in PADDLE.LIVES" :key="i" :class="{ lost: i > lives }">♥</span>
      </span>
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

    <div
      ref="boardRef"
      class="board"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
    >
      <canvas ref="canvasRef" />

      <div v-if="status === 'ready'" class="overlay">
        <h2>Neon Paddle</h2>
        <p>Pantulkan bola <strong>+{{ PADDLE.POINTS_HIT }}</strong> · Bobol CPU <strong>+{{ PADDLE.POINTS_GOAL }}</strong></p>
        <p>Kamu punya {{ PADDLE.LIVES }} nyawa. CPU makin jago setiap kebobolan.</p>
        <small>Ketuk / klik / tekan Spasi untuk mulai</small>
      </div>
      <div v-else-if="status === 'paused'" class="overlay">
        <h2>Pause</h2>
        <small>Ketuk atau tekan P untuk lanjut</small>
      </div>
      <div v-else-if="status === 'over'" class="overlay">
        <h2>Game Over</h2>
        <p>Skor: <strong>{{ score }}</strong> · {{ goals }} gol</p>
        <p v-if="isNewRecord" class="record">🏆 Rekor baru!</p>
        <small>Ketuk atau tekan Spasi untuk main lagi</small>
      </div>
    </div>

    <p class="help">W/S atau ↑/↓ · geser mouse/jari di arena · P: pause</p>
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
  gap: 8px;
  width: 100%;
  max-width: 760px;
  font-size: 1.05rem;
}

.lives {
  color: #f43f5e;
  letter-spacing: 2px;
  font-size: 1.2rem;
}

.lives .lost {
  color: #334155;
}

.board {
  position: relative;
  /* 16:10, dibatasi tinggi layar agar tidak perlu scroll */
  width: min(100%, 760px, calc((100vh - 220px) * 16 / 10));
  aspect-ratio: 640 / 400;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 0 1px #1e293b, 0 10px 40px rgb(0 0 0 / 0.5);
  touch-action: none;
  user-select: none;
  cursor: none;
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
  background: rgb(5 8 22 / 0.7);
  text-align: center;
  padding: 16px;
  cursor: pointer;
}

.overlay h2 {
  margin: 0;
  font-size: 2rem;
  color: #22d3ee;
  text-shadow: 0 0 16px rgb(34 211 238 / 0.6);
}

.overlay p {
  margin: 0;
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
  text-align: center;
}

@media (max-width: 480px) {
  .overlay h2 {
    font-size: 1.4rem;
  }

  .overlay p {
    font-size: 0.85rem;
  }
}
</style>
