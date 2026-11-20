<script setup lang="ts">
// app/components/OrbitDefenderCanvas.vue
import type { DefenderStatus, DefenderWorld, Enemy } from '~/types/orbitDefender'
import { DEFENDER, ENEMY_COLORS } from '~/types/orbitDefender'

const D = DEFENDER
const BASE_Y = D.SHIP_Y + 26

const canvasRef = ref<HTMLCanvasElement | null>(null)
const boardRef = ref<HTMLElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const { status, score, lives, wave, highScore, isNewRecord, action, togglePause, pointerDown, pointerMove }
  = useOrbitDefenderGame(draw)

// ---------- Rendering ----------
function setupCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const dpr = window.devicePixelRatio || 1
  canvas.width = D.WIDTH * dpr
  canvas.height = D.HEIGHT * dpr
  ctx = canvas.getContext('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function drawBackground(c: CanvasRenderingContext2D, w: DefenderWorld) {
  const g = c.createLinearGradient(0, 0, 0, D.HEIGHT)
  g.addColorStop(0, '#020617')
  g.addColorStop(0.7, '#0b1033')
  g.addColorStop(1, '#1e1b4b')
  c.fillStyle = g
  c.fillRect(0, 0, D.WIDTH, D.HEIGHT)

  c.fillStyle = '#e2e8f0'
  for (const s of w.stars) {
    c.globalAlpha = 0.3 + s.speed / 90
    c.fillRect(s.x, s.y, s.size, s.size * (1 + s.speed / 40))
  }
  c.globalAlpha = 1

  // Garis pangkalan
  c.save()
  c.shadowColor = '#22d3ee'
  c.shadowBlur = 10
  c.strokeStyle = 'rgb(34 211 238 / 0.55)'
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(0, BASE_Y)
  c.lineTo(D.WIDTH, BASE_Y)
  c.stroke()
  c.restore()
}

function enemyPath(c: CanvasRenderingContext2D, kind: Enemy['kind'], r: number) {
  c.beginPath()
  if (kind === 'scout') {
    // Berlian
    c.moveTo(0, -r)
    c.lineTo(r, 0)
    c.lineTo(0, r)
    c.lineTo(-r, 0)
  } else if (kind === 'drone') {
    // Segi enam
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
  } else {
    // Segitiga mengarah ke bawah
    c.moveTo(-r, -r * 0.7)
    c.lineTo(r, -r * 0.7)
    c.lineTo(0, r)
  }
  c.closePath()
}

function drawEnemies(c: CanvasRenderingContext2D, w: DefenderWorld) {
  const r = D.ENEMY_SIZE / 2
  for (const e of w.enemies) {
    if (!e.alive) continue
    const x = w.formationX + e.col * D.CELL_W + D.CELL_W / 2
    const y = w.formationY + e.row * D.CELL_H + D.CELL_H / 2
    const pulse = 1 + Math.sin(w.time * 4 + e.col * 0.7 + e.row) * 0.06
    const color = ENEMY_COLORS[e.kind]

    c.save()
    c.translate(x, y)
    c.scale(pulse, pulse)
    if (e.kind === 'drone') c.rotate(Math.sin(w.time * 1.5 + e.col) * 0.25)
    c.shadowColor = color
    c.shadowBlur = 12
    c.fillStyle = `${color}4d` // hex + alpha ±30%
    c.strokeStyle = color
    c.lineWidth = 2
    enemyPath(c, e.kind, r)
    c.fill()
    c.stroke()
    // Inti bercahaya
    c.shadowBlur = 0
    c.fillStyle = '#f8fafc'
    c.beginPath()
    c.arc(0, e.kind === 'grunt' ? -2 : 0, 3, 0, Math.PI * 2)
    c.fill()
    c.restore()
  }
}

function drawShip(c: CanvasRenderingContext2D, w: DefenderWorld, gameStatus: DefenderStatus) {
  if (gameStatus === 'over') return
  // Berkedip saat kebal
  if (w.invulnerable > 0 && Math.floor(w.time * 12) % 2 === 0) return
  const x = w.shipX
  const y = D.SHIP_Y
  const hw = D.SHIP_W / 2
  const hh = D.SHIP_H / 2

  c.save()
  // Api pendorong
  const flame = 6 + Math.sin(w.time * 40) * 3
  c.fillStyle = '#fb923c'
  c.beginPath()
  c.moveTo(x - 5, y + hh - 2)
  c.lineTo(x + 5, y + hh - 2)
  c.lineTo(x, y + hh + flame)
  c.closePath()
  c.fill()

  // Badan kapal
  c.shadowColor = w.rapidTime > 0 ? '#facc15' : '#22d3ee'
  c.shadowBlur = 16
  c.fillStyle = '#e0f2fe'
  c.beginPath()
  c.moveTo(x, y - hh - 4)
  c.lineTo(x + hw, y + hh)
  c.lineTo(x + hw * 0.35, y + hh * 0.5)
  c.lineTo(x - hw * 0.35, y + hh * 0.5)
  c.lineTo(x - hw, y + hh)
  c.closePath()
  c.fill()
  c.shadowBlur = 0
  c.fillStyle = w.rapidTime > 0 ? '#facc15' : '#0891b2'
  c.beginPath()
  c.ellipse(x, y + 1, 4, 7, 0, 0, Math.PI * 2)
  c.fill()

  // Perisai
  if (w.shield) {
    c.strokeStyle = `rgb(56 189 248 / ${0.55 + Math.sin(w.time * 6) * 0.25})`
    c.lineWidth = 2
    c.shadowColor = '#38bdf8'
    c.shadowBlur = 14
    c.beginPath()
    c.arc(x, y, hw + 8, 0, Math.PI * 2)
    c.stroke()
  }
  c.restore()
}

function drawShots(c: CanvasRenderingContext2D, w: DefenderWorld) {
  c.save()
  c.shadowBlur = 10
  c.shadowColor = '#67e8f9'
  c.fillStyle = '#cffafe'
  for (const s of w.shots) c.fillRect(s.x - 1.5, s.y - 8, 3, 14)

  c.shadowColor = '#fb7185'
  c.fillStyle = '#fda4af'
  for (const s of w.enemyShots) {
    c.beginPath()
    c.moveTo(s.x, s.y - 7)
    c.lineTo(s.x + 3.5, s.y)
    c.lineTo(s.x, s.y + 7)
    c.lineTo(s.x - 3.5, s.y)
    c.closePath()
    c.fill()
  }
  c.restore()
}

function drawPowerUps(c: CanvasRenderingContext2D, w: DefenderWorld) {
  for (const p of w.powerUps) {
    const color = p.kind === 'rapid' ? '#facc15' : '#38bdf8'
    c.save()
    c.shadowColor = color
    c.shadowBlur = 14
    c.strokeStyle = color
    c.lineWidth = 2
    c.fillStyle = 'rgb(2 6 23 / 0.8)'
    c.beginPath()
    c.arc(p.x, p.y, 10, 0, Math.PI * 2)
    c.fill()
    c.stroke()
    c.shadowBlur = 0
    c.fillStyle = color
    c.font = 'bold 12px system-ui, sans-serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(p.kind === 'rapid' ? 'R' : 'S', p.x, p.y + 1)
    c.restore()
  }
}

function drawParticles(c: CanvasRenderingContext2D, w: DefenderWorld) {
  for (const p of w.particles) {
    c.globalAlpha = Math.min(1, p.life * 2.5)
    c.fillStyle = p.color
    c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3)
  }
  c.globalAlpha = 1
}

function drawInfo(c: CanvasRenderingContext2D, w: DefenderWorld, gameStatus: DefenderStatus) {
  if (gameStatus === 'playing' && w.bannerTime > 0) {
    const t = w.bannerTime / D.BANNER_TIME
    c.globalAlpha = Math.min(1, t * 3)
    c.font = 'bold 30px system-ui, sans-serif'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = '#f8fafc'
    c.shadowColor = '#a78bfa'
    c.shadowBlur = 18
    c.fillText(`Gelombang ${wave.value}`, D.WIDTH / 2, D.HEIGHT / 2 + 40)
    c.shadowBlur = 0
    c.globalAlpha = 1
  }
  if (w.rapidTime > 0 && gameStatus !== 'over') {
    c.font = 'bold 13px system-ui, sans-serif'
    c.textAlign = 'left'
    c.textBaseline = 'alphabetic'
    c.fillStyle = '#facc15'
    c.fillText(`⚡ Tembak cepat ${Math.ceil(w.rapidTime)}s`, 10, D.HEIGHT - 10)
  }
}

function draw(w: DefenderWorld, gameStatus: DefenderStatus) {
  const c = ctx
  if (!c) return
  c.save()
  if (w.shake > 0) c.translate((Math.random() - 0.5) * 8 * w.shake, (Math.random() - 0.5) * 8 * w.shake)
  drawBackground(c, w)
  drawEnemies(c, w)
  drawPowerUps(c, w)
  drawShots(c, w)
  drawShip(c, w, gameStatus)
  drawParticles(c, w)
  c.restore()
  drawInfo(c, w, gameStatus)
}

onMounted(setupCanvas)

// ---------- Input pointer ----------
function toLogicalX(e: PointerEvent) {
  const rect = boardRef.value?.getBoundingClientRect()
  if (!rect || rect.width === 0) return null
  return ((e.clientX - rect.left) / rect.width) * D.WIDTH
}

function onPointerDown(e: PointerEvent) {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  const x = toLogicalX(e)
  if (x !== null) pointerDown(x)
}

function onPointerMove(e: PointerEvent) {
  const x = toLogicalX(e)
  if (x !== null) pointerMove(x)
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
      <span>Gel. <strong>{{ wave }}</strong></span>
      <span class="lives" :aria-label="`Nyawa ${lives}`">
        <span v-for="i in DEFENDER.LIVES" :key="i" :class="{ lost: i > lives }">▲</span>
      </span>
      <button
        v-if="status === 'playing' || status === 'paused'"
        type="button"
        class="pause"
        @click="onPauseClick"
      >
        {{ status === 'paused' ? '▶' : '⏸' }}
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
        <h2>Orbit Defender</h2>
        <p>Hancurkan formasi musuh sebelum mencapai garis pangkalan.</p>
        <ul class="legend">
          <li><span class="dot scout">◆</span> {{ DEFENDER.POINTS.scout }}</li>
          <li><span class="dot drone">⬢</span> {{ DEFENDER.POINTS.drone }}</li>
          <li><span class="dot grunt">▼</span> {{ DEFENDER.POINTS.grunt }}</li>
        </ul>
        <p class="small">Power-up: <b class="r">R</b> tembak cepat · <b class="s">S</b> perisai</p>
        <small>Ketuk / klik / tekan Enter untuk mulai</small>
      </div>
      <div v-else-if="status === 'paused'" class="overlay">
        <h2>Pause</h2>
        <small>Ketuk atau tekan P untuk lanjut</small>
      </div>
      <div v-else-if="status === 'over'" class="overlay">
        <h2>Game Over</h2>
        <p>Skor: <strong>{{ score }}</strong> · Gelombang {{ wave }}</p>
        <p v-if="isNewRecord" class="record">🏆 Rekor baru!</p>
        <small>Ketuk atau tekan Enter untuk main lagi</small>
      </div>
    </div>

    <p class="help">←/→ atau A/D: gerak · Spasi: tembak (tahan) · Sentuh &amp; geser: gerak + tembak otomatis · P: pause</p>
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
  max-width: 480px;
  font-size: 1rem;
}

.lives {
  color: #22d3ee;
  letter-spacing: 2px;
}

.lives .lost {
  color: #334155;
}

.board {
  position: relative;
  /* 3:4, dibatasi tinggi layar agar tidak perlu scroll */
  width: min(100%, 480px, calc((100vh - 220px) * 3 / 4));
  aspect-ratio: 480 / 640;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 0 0 1px #1e293b, 0 10px 40px rgb(0 0 0 / 0.5);
  touch-action: none;
  user-select: none;
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
  gap: 10px;
  background: rgb(2 6 23 / 0.72);
  text-align: center;
  padding: 16px;
  cursor: pointer;
}

.overlay h2 {
  margin: 0;
  font-size: 2rem;
  color: #a78bfa;
  text-shadow: 0 0 16px rgb(167 139 250 / 0.6);
}

.overlay p {
  margin: 0;
}

.legend {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 18px;
  font-weight: 600;
}

.dot.scout { color: #f472b6; }
.dot.drone { color: #a78bfa; }
.dot.grunt { color: #22d3ee; }
.r { color: #facc15; }
.s { color: #38bdf8; }

.small {
  font-size: 0.85rem;
}

.record {
  color: #fde68a;
  font-weight: 700;
}

.pause {
  padding: 4px 10px;
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
    font-size: 1.5rem;
  }

  .overlay p {
    font-size: 0.85rem;
  }
}
</style>
