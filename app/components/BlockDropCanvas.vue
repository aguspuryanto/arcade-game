<script setup lang="ts">
// app/components/BlockDropCanvas.vue
import type { BlockDropAction, BlockDropView, PieceType } from '~/types/blockDrop'
import { BD, PIECE_COLORS } from '~/types/blockDrop'

const CELL = 30
const WIDTH = BD.COLS * CELL
const HEIGHT = BD.ROWS * CELL
const PREVIEW_CELL = 18
const PREVIEW_W = 100
const PREVIEW_H = 64

const boardRef = ref<HTMLCanvasElement | null>(null)
const holdRef = ref<HTMLCanvasElement | null>(null)
const nextRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const {
  status, score, lines, level, highScore, isNewRecord, holdType, canHold, nextTypes,
  start, togglePause, press, release,
} = useBlockDropGame(draw)

// ---------- Util canvas ----------
function setupCanvas(canvas: HTMLCanvasElement | null, w: number, h: number) {
  if (!canvas) return null
  const dpr = window.devicePixelRatio || 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  const c = canvas.getContext('2d')
  c?.setTransform(dpr, 0, 0, dpr, 0, 0)
  return c
}

function drawBlock(c: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, alpha = 1) {
  const inset = Math.max(1, size * 0.05)
  const r = size * 0.18
  c.globalAlpha = alpha
  c.fillStyle = color
  c.beginPath()
  c.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, r)
  c.fill()
  // Kilau di bagian atas
  const g = c.createLinearGradient(0, y, 0, y + size)
  g.addColorStop(0, 'rgb(255 255 255 / 0.45)')
  g.addColorStop(0.5, 'rgb(255 255 255 / 0)')
  g.addColorStop(1, 'rgb(0 0 0 / 0.25)')
  c.fillStyle = g
  c.fill()
  c.globalAlpha = 1
}

// ---------- Papan utama ----------
function draw(view: BlockDropView) {
  const c = ctx
  if (!c) return

  c.fillStyle = '#0b1120'
  c.fillRect(0, 0, WIDTH, HEIGHT)

  // Grid halus
  c.strokeStyle = 'rgb(148 163 184 / 0.08)'
  c.lineWidth = 1
  c.beginPath()
  for (let x = 1; x < BD.COLS; x++) {
    c.moveTo(x * CELL + 0.5, 0)
    c.lineTo(x * CELL + 0.5, HEIGHT)
  }
  for (let y = 1; y < BD.ROWS; y++) {
    c.moveTo(0, y * CELL + 0.5)
    c.lineTo(WIDTH, y * CELL + 0.5)
  }
  c.stroke()

  // Balok yang sudah terkunci
  const clearing = new Set(view.clearingRows)
  for (let row = BD.HIDDEN_ROWS; row < view.board.length; row++) {
    const y = (row - BD.HIDDEN_ROWS) * CELL
    const cells = view.board[row]!
    if (clearing.has(row)) {
      // Baris penuh: berkedip lalu memudar
      const fade = 1 - view.clearProgress
      c.fillStyle = `rgb(255 255 255 / ${0.85 * fade})`
      c.fillRect(0, y, WIDTH, CELL)
      continue
    }
    cells.forEach((type, col) => {
      if (type) drawBlock(c, col * CELL, y, CELL, PIECE_COLORS[type])
    })
  }

  // Bayangan (ghost) & balok aktif
  const p = view.piece
  if (p) {
    const cells = pieceCells(p.type, p.rotation)
    const color = PIECE_COLORS[p.type]
    for (const [cx, cy] of cells) {
      const row = view.ghostY + cy
      if (row < BD.HIDDEN_ROWS) continue
      const x = (p.x + cx) * CELL
      const y = (row - BD.HIDDEN_ROWS) * CELL
      c.strokeStyle = color
      c.globalAlpha = 0.5
      c.lineWidth = 2
      c.strokeRect(x + 3, y + 3, CELL - 6, CELL - 6)
      c.globalAlpha = 1
    }
    for (const [cx, cy] of cells) {
      const row = p.y + cy
      if (row < BD.HIDDEN_ROWS) continue
      drawBlock(c, (p.x + cx) * CELL, (row - BD.HIDDEN_ROWS) * CELL, CELL, color)
    }
  }
}

// ---------- Panel pratinjau ----------
function drawPiecePreview(c: CanvasRenderingContext2D, type: PieceType, cx: number, cy: number, alpha = 1) {
  const cells = pieceCells(type, 0)
  const xs = cells.map(([x]) => x)
  const ys = cells.map(([, y]) => y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const w = (Math.max(...xs) - minX + 1) * PREVIEW_CELL
  const h = (Math.max(...ys) - minY + 1) * PREVIEW_CELL
  for (const [x, y] of cells) {
    drawBlock(
      c,
      cx - w / 2 + (x - minX) * PREVIEW_CELL,
      cy - h / 2 + (y - minY) * PREVIEW_CELL,
      PREVIEW_CELL,
      PIECE_COLORS[type],
      alpha,
    )
  }
}

let holdCtx: CanvasRenderingContext2D | null = null
let nextCtx: CanvasRenderingContext2D | null = null

function drawHold() {
  const c = holdCtx
  if (!c) return
  c.clearRect(0, 0, PREVIEW_W, PREVIEW_H)
  if (holdType.value) drawPiecePreview(c, holdType.value, PREVIEW_W / 2, PREVIEW_H / 2, canHold.value ? 1 : 0.35)
}

function drawNext() {
  const c = nextCtx
  if (!c) return
  c.clearRect(0, 0, PREVIEW_W, PREVIEW_H * BD.PREVIEW_COUNT)
  nextTypes.value.forEach((type, i) => {
    drawPiecePreview(c, type, PREVIEW_W / 2, PREVIEW_H * i + PREVIEW_H / 2, i === 0 ? 1 : 0.7)
  })
}

watch([holdType, canHold], drawHold)
watch(nextTypes, drawNext)

onMounted(() => {
  ctx = setupCanvas(boardRef.value, WIDTH, HEIGHT)
  holdCtx = setupCanvas(holdRef.value, PREVIEW_W, PREVIEW_H)
  nextCtx = setupCanvas(nextRef.value, PREVIEW_W, PREVIEW_H * BD.PREVIEW_COUNT)
  drawHold()
  drawNext()
})

// ---------- Tombol sentuh ----------
const TOUCH_BUTTONS: { action: BlockDropAction, label: string, title: string }[] = [
  { action: 'hold', label: '⇄', title: 'Simpan' },
  { action: 'rotateCCW', label: '⟲', title: 'Putar kiri' },
  { action: 'rotateCW', label: '⟳', title: 'Putar kanan' },
  { action: 'hardDrop', label: '⤓', title: 'Jatuhkan' },
  { action: 'left', label: '◀', title: 'Kiri' },
  { action: 'softDrop', label: '▼', title: 'Turun' },
  { action: 'right', label: '▶', title: 'Kanan' },
]

function onButtonDown(e: PointerEvent, action: BlockDropAction) {
  e.preventDefault()
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  press(action)
}

function onButtonUp(action: BlockDropAction) {
  release(action)
}

function onPauseClick(e: MouseEvent) {
  togglePause()
  ;(e.currentTarget as HTMLElement).blur()
}
</script>

<template>
  <div class="bd">
    <div class="layout">
      <aside class="side">
        <section class="panel">
          <h3>Simpan</h3>
          <canvas ref="holdRef" class="preview" :style="{ aspectRatio: `${PREVIEW_W} / ${PREVIEW_H}` }" />
        </section>
        <section class="panel stats">
          <div><span>Skor</span><strong>{{ score }}</strong></div>
          <div><span>Level</span><strong>{{ level }}</strong></div>
          <div><span>Baris</span><strong>{{ lines }}</strong></div>
          <div class="best"><span>Tertinggi</span><strong>{{ highScore }}</strong></div>
        </section>
      </aside>

      <div class="board">
        <canvas ref="boardRef" />

        <div v-if="status === 'ready'" class="overlay">
          <h2>Block Drop</h2>
          <p>Lengkapi baris untuk menghapusnya</p>
          <button type="button" class="primary" @click="start">Mulai</button>
          <small>atau tekan Enter</small>
        </div>
        <div v-else-if="status === 'paused'" class="overlay">
          <h2>Pause</h2>
          <button type="button" class="primary" @click="togglePause">Lanjut</button>
          <small>P / Esc untuk lanjut</small>
        </div>
        <div v-else-if="status === 'over'" class="overlay">
          <h2>Game Over</h2>
          <p>Skor <strong>{{ score }}</strong> · {{ lines }} baris</p>
          <p v-if="isNewRecord" class="record">🏆 Rekor baru!</p>
          <button type="button" class="primary" @click="start">Main lagi</button>
          <small>atau tekan Enter</small>
        </div>
      </div>

      <aside class="side">
        <section class="panel">
          <h3>Berikutnya</h3>
          <canvas
            ref="nextRef"
            class="preview"
            :style="{ aspectRatio: `${PREVIEW_W} / ${PREVIEW_H * BD.PREVIEW_COUNT}` }"
          />
        </section>
        <button
          v-if="status === 'playing' || status === 'paused'"
          type="button"
          class="pause"
          @click="onPauseClick"
        >
          {{ status === 'paused' ? '▶ Lanjut' : '⏸ Pause' }}
        </button>
      </aside>
    </div>

    <div class="touch">
      <button
        v-for="b in TOUCH_BUTTONS"
        :key="b.action"
        type="button"
        :title="b.title"
        :aria-label="b.title"
        :class="`t-${b.action}`"
        @pointerdown="onButtonDown($event, b.action)"
        @pointerup="onButtonUp(b.action)"
        @pointercancel="onButtonUp(b.action)"
        @lostpointercapture="onButtonUp(b.action)"
        @contextmenu.prevent
      >
        {{ b.label }}
      </button>
    </div>

    <p class="help">
      ←/→: geser · ↓: turun · ↑/X: putar · Z: putar kiri · Spasi: jatuhkan · C/Shift: simpan · P: pause
    </p>
  </div>
</template>

<style scoped>
.bd {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  --side: clamp(72px, 18vw, 120px);
}

.layout {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 12px;
  width: 100%;
}

.side {
  width: var(--side);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel {
  padding: 8px;
  border-radius: 10px;
  background: #0f172a;
  border: 1px solid #1e293b;
}

.panel h3 {
  margin: 0 0 6px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.65;
}

.preview {
  display: block;
  width: 100%;
}

.stats {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stats div {
  display: flex;
  flex-direction: column;
}

.stats span {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.6;
}

.stats strong {
  font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
}

.best strong {
  color: #fde68a;
}

.board {
  position: relative;
  flex: none;
  /* Rasio 1:2, dibatasi lebar & tinggi layar */
  width: min(300px, calc(100vw - 2 * var(--side) - 56px), calc((100vh - 220px) / 2));
  aspect-ratio: 1 / 2;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #334155;
  box-shadow: 0 10px 40px rgb(0 0 0 / 0.45);
}

.board canvas {
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
  padding: 12px;
  text-align: center;
  background: rgb(2 6 23 / 0.75);
}

.overlay h2 {
  margin: 0;
  font-size: 1.7rem;
}

.overlay p {
  margin: 0;
  font-size: 0.9rem;
}

.record {
  color: #fde68a;
  font-weight: 700;
}

button {
  font: inherit;
  color: #e2e8f0;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  cursor: pointer;
}

button:hover {
  background: #334155;
}

.primary {
  padding: 8px 22px;
  font-weight: 700;
  color: #0f172a;
  background: #f472b6;
  border: none;
}

.primary:hover {
  background: #f9a8d4;
}

.pause {
  padding: 6px 8px;
  font-size: 0.85rem;
}

small {
  opacity: 0.7;
  font-size: 0.8rem;
}

/* Tombol sentuh: hanya tampil di perangkat layar sentuh */
.touch {
  display: none;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
  max-width: 360px;
  touch-action: none;
  user-select: none;
}

.touch button {
  height: 52px;
  font-size: 1.4rem;
}

.touch .t-left {
  grid-column: 1 / 2;
}

.touch .t-softDrop {
  grid-column: 2 / 4;
}

.touch .t-right {
  grid-column: 4 / 5;
}

.touch button:active {
  background: #475569;
}

.help {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.6;
  text-align: center;
}

@media (pointer: coarse) {
  .touch {
    display: grid;
  }

  .help {
    display: none;
  }

  .board {
    width: min(300px, calc(100vw - 2 * var(--side) - 56px), calc((100vh - 330px) / 2));
  }
}
</style>
