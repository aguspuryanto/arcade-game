<script setup lang="ts">
// app/components/SnakeCanvas.vue
import type { Direction } from '~/types/snake'

const CELL = 24 // ukuran satu sel dalam piksel (logis)

const { state, hasStarted, changeDirection, togglePause, restart } = useSnakeGame()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const sizePx = computed(() => state.boardSize * CELL)

// ---------- Rendering ----------
function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = sizePx.value * dpr
  canvas.height = sizePx.value * dpr
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.roundRect(x, y, w, h, r)
  c.fill()
}

function draw() {
  const c = ctx
  if (!c) return
  const size = sizePx.value

  // Latar papan (pola catur halus)
  c.fillStyle = '#0f172a'
  c.fillRect(0, 0, size, size)
  c.fillStyle = '#111c33'
  for (let y = 0; y < state.boardSize; y++) {
    for (let x = (y % 2); x < state.boardSize; x += 2) {
      c.fillRect(x * CELL, y * CELL, CELL, CELL)
    }
  }

  // Makanan
  const f = state.food
  c.fillStyle = '#f43f5e'
  c.beginPath()
  c.arc(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, CELL * 0.35, 0, Math.PI * 2)
  c.fill()

  // Ular (ekor -> kepala, agar kepala tergambar paling atas)
  const len = state.snake.length
  for (let i = len - 1; i >= 0; i--) {
    const s = state.snake[i]!
    const t = len > 1 ? i / (len - 1) : 0
    const light = 55 - t * 20
    c.fillStyle = i === 0 ? '#4ade80' : `hsl(142 70% ${light}%)`
    roundRect(c, s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 7 : 5)
  }

  // Mata pada kepala
  const head = state.snake[0]
  if (head) {
    const cx = head.x * CELL + CELL / 2
    const cy = head.y * CELL + CELL / 2
    const off = CELL * 0.2
    const eyes: Record<Direction, [number, number][]> = {
      UP: [[-off, -off], [off, -off]],
      DOWN: [[-off, off], [off, off]],
      LEFT: [[-off, -off], [-off, off]],
      RIGHT: [[off, -off], [off, off]],
    }
    c.fillStyle = '#0f172a'
    for (const [dx, dy] of eyes[state.direction]) {
      c.beginPath()
      c.arc(cx + dx, cy + dy, 2.5, 0, Math.PI * 2)
      c.fill()
    }
  }
}

onMounted(() => {
  setupCanvas()
  draw()
})

// Gambar ulang hanya ketika state visual berubah (snake/food/direction)
watch(() => [state.snake, state.food, state.direction], draw, { flush: 'post' })

// ---------- Kontrol sentuh (swipe) ----------
let touchStart: { x: number, y: number } | null = null

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]
  if (t) touchStart = { x: t.clientX, y: t.clientY }
}

function onTouchEnd(e: TouchEvent) {
  const t = e.changedTouches[0]
  if (!touchStart || !t) return
  const dx = t.clientX - touchStart.x
  const dy = t.clientY - touchStart.y
  touchStart = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) {
    // tap = pause/lanjut/restart
    if (state.isGameOver) restart()
    else togglePause()
    return
  }
  if (Math.abs(dx) > Math.abs(dy)) changeDirection(dx > 0 ? 'RIGHT' : 'LEFT')
  else changeDirection(dy > 0 ? 'DOWN' : 'UP')
}
</script>

<template>
  <div class="game">
    <div class="hud">
      <span>Skor: <strong>{{ state.score }}</strong></span>
      <span>Tertinggi: <strong>{{ state.highScore }}</strong></span>
    </div>

    <div class="board" :style="{ maxWidth: `${sizePx}px` }">
      <canvas
        ref="canvasRef"
        :style="{ width: '100%', aspectRatio: '1 / 1' }"
        @touchstart.passive="onTouchStart"
        @touchend.passive="onTouchEnd"
      />

      <div v-if="state.isGameOver" class="overlay">
        <h2>Game Over</h2>
        <p>Skor kamu: {{ state.score }}</p>
        <button type="button" @click="restart">Main lagi</button>
        <small>Enter / Spasi untuk restart</small>
      </div>
      <div v-else-if="!hasStarted" class="overlay">
        <h2>Snake</h2>
        <p>Tekan panah / WASD atau swipe untuk mulai</p>
      </div>
      <div v-else-if="state.isPaused" class="overlay">
        <h2>Pause</h2>
        <button type="button" @click="togglePause">Lanjut</button>
        <small>Spasi / P untuk lanjut</small>
      </div>
    </div>

    <p class="help">Panah/WASD: gerak · Spasi/P: pause · Enter: restart</p>
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
  width: 100%;
  max-width: 480px;
  font-size: 1.1rem;
}

.board {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgb(0 0 0 / 0.4);
  touch-action: none;
}

canvas {
  display: block;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgb(15 23 42 / 0.75);
  text-align: center;
  padding: 16px;
}

.overlay h2 {
  margin: 0;
  font-size: 2rem;
}

.overlay p {
  margin: 0;
}

button {
  margin-top: 4px;
  padding: 8px 20px;
  font: inherit;
  font-weight: 600;
  color: #0f172a;
  background: #4ade80;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

button:hover {
  background: #86efac;
}

small,
.help {
  opacity: 0.7;
  font-size: 0.85rem;
}
</style>
