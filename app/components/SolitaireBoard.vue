<script setup lang="ts">
// app/components/SolitaireBoard.vue — tampilan & interaksi (klik + drag) Klondike
import type { Card, DrawCount, PileRef } from '~/types/solitaire'

const game = useSolitaireGame()
const { piles, status, score, moves, seconds, timeBonus, highScore, isNewRecord, canUndo, canAutoComplete } = game

// ---------- Ukuran responsif ----------
const boardRef = ref<HTMLElement | null>(null)
const boardWidth = ref(700)
const viewportHeight = ref(800)

const gap = computed(() => Math.max(4, Math.round(boardWidth.value * 0.015)))
const cardW = computed(() => (boardWidth.value - gap.value * 6) / 7)
const cardH = computed(() => cardW.value * 1.4)
const offsetDown = computed(() => cardH.value * 0.12) // jarak antar kartu tertutup
const offsetUp = computed(() => cardH.value * 0.27) // jarak antar kartu terbuka
const wasteFan = computed(() => cardW.value * 0.24)

let resizeObserver: ResizeObserver | null = null

function onResize() {
  viewportHeight.value = window.innerHeight
}

onMounted(() => {
  onResize()
  window.addEventListener('resize', onResize)
  if (boardRef.value) {
    resizeObserver = new ResizeObserver(([entry]) => {
      if (entry) boardWidth.value = entry.contentRect.width
    })
    resizeObserver.observe(boardRef.value)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  resizeObserver?.disconnect()
  removeDragListeners()
})

/** Posisi top tiap kartu per kolom; dirapatkan otomatis jika kolom terlalu panjang. */
const columnTops = computed(() => {
  const maxHeight = Math.max(cardH.value * 4, viewportHeight.value - cardH.value - 230)
  return piles.tableau.map((col) => {
    const tops: number[] = []
    let y = 0
    for (const card of col) {
      tops.push(y)
      y += card.faceUp ? offsetUp.value : offsetDown.value
    }
    const last = tops.at(-1) ?? 0
    if (last + cardH.value > maxHeight && last > 0) {
      const scale = (maxHeight - cardH.value) / last
      return tops.map(t => t * scale)
    }
    return tops
  })
})

const tableauHeight = computed(() =>
  Math.max(cardH.value * 3, ...columnTops.value.map(t => (t.at(-1) ?? 0) + cardH.value)),
)

/** Waste: tampilkan maks 3 kartu teratas (berkipas saat mode ambil 3). */
const visibleWaste = computed(() => {
  const n = game.drawCount.value === 3 ? 3 : 2
  const start = Math.max(0, piles.waste.length - n)
  return piles.waste.slice(start).map((card, i, arr) => ({
    card,
    index: start + i,
    left: game.drawCount.value === 3 ? i * wasteFan.value : 0,
    isTop: i === arr.length - 1,
  }))
})

const timeLabel = computed(() => {
  const m = Math.floor(seconds.value / 60)
  const s = seconds.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

// ---------- Drag & drop ----------
interface DragState {
  from: PileRef
  cardIndex: number
  cards: Readonly<Card>[]
  startX: number
  startY: number
  x: number
  y: number
  grabX: number
  grabY: number
  active: boolean
}

const drag = ref<DragState | null>(null)

function parsePile(value: string | undefined): PileRef | null {
  if (!value) return null
  const [kind, idx] = value.split(':')
  if (kind === 'stock' || kind === 'waste') return { kind }
  if ((kind === 'foundation' || kind === 'tableau') && idx !== undefined) return { kind, index: Number(idx) }
  return null
}

function pileAt(x: number, y: number): PileRef | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-pile]')
  return parsePile(el?.dataset.pile)
}

function isDragged(from: PileRef, index: number) {
  const d = drag.value
  return !!d && d.active && samePile(d.from, from) && index >= d.cardIndex
}

function onCardPointerDown(e: PointerEvent, from: PileRef, cardIndex: number) {
  if (e.button !== 0 || status.value !== 'playing') return
  const cards = game.movableCards(from, cardIndex)
  if (!cards) return
  e.preventDefault()
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  drag.value = {
    from,
    cardIndex,
    cards,
    startX: e.clientX,
    startY: e.clientY,
    x: e.clientX,
    y: e.clientY,
    grabX: e.clientX - rect.left,
    grabY: e.clientY - rect.top,
    active: false,
  }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
}

function onPointerMove(e: PointerEvent) {
  const d = drag.value
  if (!d) return
  d.x = e.clientX
  d.y = e.clientY
  if (!d.active && Math.hypot(d.x - d.startX, d.y - d.startY) > 6) d.active = true
}

function onPointerUp(e: PointerEvent) {
  const d = drag.value
  removeDragListeners()
  drag.value = null
  if (!d) return

  if (!d.active) {
    // Tanpa geser = klik: pindah otomatis ke tujuan terbaik
    game.autoMove(d.from, d.cardIndex)
    return
  }
  // Coba titik pointer, lalu titik tengah kartu yang di-drag
  const cardCenterX = e.clientX - d.grabX + cardW.value / 2
  const cardCenterY = e.clientY - d.grabY + cardH.value / 2
  const target = pileAt(e.clientX, e.clientY) ?? pileAt(cardCenterX, cardCenterY)
  if (target) game.tryMove(d.from, d.cardIndex, target)
}

function onPointerCancel() {
  removeDragListeners()
  drag.value = null
}

function removeDragListeners() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
}

// ---------- Toolbar ----------
function changeDrawCount(e: Event) {
  const value = Number((e.target as HTMLSelectElement).value) as DrawCount
  game.newGame(value)
}

function confirmNewGame() {
  if (moves.value === 0 || status.value === 'won' || window.confirm('Mulai game baru? Progres saat ini akan hilang.')) {
    game.newGame()
  }
}
</script>

<template>
  <div
    class="solitaire"
    :style="{ '--cw': `${cardW}px`, '--ch': `${cardH}px`, '--gap': `${gap}px` }"
  >
    <div class="toolbar">
      <div class="stats">
        <span>Skor <strong>{{ score }}</strong></span>
        <span>Langkah <strong>{{ moves }}</strong></span>
        <span>Waktu <strong>{{ timeLabel }}</strong></span>
        <span class="best">Tertinggi <strong>{{ highScore }}</strong></span>
      </div>
      <div class="actions">
        <select :value="game.drawCount.value" aria-label="Mode ambil kartu" @change="changeDrawCount">
          <option :value="1">Ambil 1</option>
          <option :value="3">Ambil 3</option>
        </select>
        <button type="button" :disabled="!canUndo || status === 'won'" @click="game.undo">↶ Undo</button>
        <button type="button" @click="confirmNewGame">Game baru</button>
      </div>
    </div>

    <div ref="boardRef" class="board">
      <!-- Baris atas: stock, waste, foundation -->
      <div class="top-row">
        <div class="slot stock" data-pile="stock" @click="game.drawFromStock">
          <PlayingCard v-if="piles.stock.length" :card="piles.stock.at(-1)!" class="abs" />
          <span v-else-if="piles.waste.length" class="placeholder">↻</span>
          <span v-if="piles.stock.length" class="count">{{ piles.stock.length }}</span>
        </div>

        <div class="slot waste" data-pile="waste">
          <PlayingCard
            v-for="w in visibleWaste"
            :key="w.card.id"
            :card="w.card"
            class="abs"
            :class="{ dragging: isDragged({ kind: 'waste' }, w.index), inert: !w.isTop }"
            :style="{ left: `${w.left}px` }"
            @pointerdown="w.isTop && onCardPointerDown($event, { kind: 'waste' }, w.index)"
          />
        </div>

        <div class="spacer" />

        <div
          v-for="(foundation, i) in piles.foundations"
          :key="`f${i}`"
          class="slot"
          :data-pile="`foundation:${i}`"
        >
          <span class="placeholder">A</span>
          <PlayingCard
            v-for="(card, j) in foundation.slice(-2)"
            :key="card.id"
            :card="card"
            class="abs"
            :class="{ dragging: isDragged({ kind: 'foundation', index: i }, foundation.length - Math.min(2, foundation.length) + j) }"
            @pointerdown="onCardPointerDown($event, { kind: 'foundation', index: i }, foundation.length - 1)"
          />
        </div>
      </div>

      <!-- Tableau: 7 kolom -->
      <div class="tableau" :style="{ height: `${tableauHeight}px` }">
        <div
          v-for="(column, i) in piles.tableau"
          :key="`t${i}`"
          class="column"
          :data-pile="`tableau:${i}`"
        >
          <span v-if="!column.length" class="slot empty">K</span>
          <PlayingCard
            v-for="(card, j) in column"
            :key="card.id"
            :card="card"
            class="abs"
            :class="{ dragging: isDragged({ kind: 'tableau', index: i }, j) }"
            :style="{ top: `${columnTops[i]![j]}px` }"
            @pointerdown="onCardPointerDown($event, { kind: 'tableau', index: i }, j)"
          />
        </div>
      </div>
    </div>

    <button
      v-if="canAutoComplete"
      type="button"
      class="auto"
      @click="game.autoComplete"
    >
      ⚡ Selesaikan otomatis
    </button>

    <p class="help">Klik kartu untuk pindah otomatis · drag untuk memindah manual · Ctrl+Z / U: undo</p>

    <!-- Kartu yang sedang di-drag mengikuti pointer -->
    <div
      v-if="drag?.active"
      class="drag-layer"
      :style="{ left: `${drag.x - drag.grabX}px`, top: `${drag.y - drag.grabY}px` }"
    >
      <PlayingCard
        v-for="(card, j) in drag.cards"
        :key="card.id"
        :card="card"
        class="abs"
        :style="{ top: `${j * offsetUp}px` }"
      />
    </div>

    <div v-if="status === 'won'" class="overlay">
      <div class="dialog">
        <h2>🎉 Kamu menang!</h2>
        <p>Waktu {{ timeLabel }} · {{ moves }} langkah</p>
        <p v-if="timeBonus">Bonus waktu +{{ timeBonus }}</p>
        <p class="final">Skor akhir: <strong>{{ score }}</strong></p>
        <p v-if="isNewRecord" class="record">🏆 Rekor baru!</p>
        <button type="button" @click="game.newGame()">Main lagi</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.solitaire {
  width: 100%;
  max-width: 760px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.toolbar {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px 16px;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  font-size: 0.95rem;
}

.stats span {
  opacity: 0.85;
}

.best {
  color: #fde68a;
}

.actions {
  display: flex;
  gap: 8px;
}

button,
select {
  padding: 6px 12px;
  font: inherit;
  font-size: 0.9rem;
  color: #e2e8f0;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  cursor: pointer;
}

button:hover:not(:disabled),
select:hover {
  background: #334155;
}

button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.board {
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  background: radial-gradient(ellipse at top, #166534, #14532d 70%);
  box-shadow: inset 0 0 40px rgb(0 0 0 / 0.35);
  box-sizing: border-box; /* ResizeObserver contentRect = lebar tanpa padding */
}

.top-row {
  display: grid;
  grid-template-columns: repeat(7, var(--cw));
  gap: var(--gap);
  margin-bottom: calc(var(--gap) * 2.5);
}

.slot {
  position: relative;
  width: var(--cw);
  height: var(--ch);
  border-radius: calc(var(--cw) * 0.08);
  border: 2px dashed rgb(255 255 255 / 0.18);
  box-sizing: border-box;
}

.stock {
  cursor: pointer;
}

.waste {
  border: none;
}

.spacer {
  pointer-events: none;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(255 255 255 / 0.3);
  font-size: calc(var(--cw) * 0.45);
  pointer-events: none;
}

.count {
  position: absolute;
  right: 4px;
  bottom: 4px;
  z-index: 2;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 0.7rem;
  background: rgb(0 0 0 / 0.55);
  pointer-events: none;
}

.abs {
  position: absolute;
  top: 0;
  left: 0;
}

.stock .abs,
.waste .abs,
.slot .abs {
  top: -2px;
  left: -2px;
}

.waste .abs {
  top: 0;
}

.inert {
  pointer-events: none;
}

.dragging {
  visibility: hidden;
}

.tableau {
  display: grid;
  grid-template-columns: repeat(7, var(--cw));
  gap: var(--gap);
}

.column {
  position: relative;
  height: 100%;
}

.column .empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgb(255 255 255 / 0.25);
  font-weight: 700;
  font-size: calc(var(--cw) * 0.35);
}

.drag-layer {
  position: fixed;
  z-index: 50;
  width: var(--cw);
  pointer-events: none;
  filter: drop-shadow(0 8px 12px rgb(0 0 0 / 0.45));
}

.auto {
  background: #ca8a04;
  border-color: #eab308;
  color: #111827;
  font-weight: 700;
}

.auto:hover:not(:disabled) {
  background: #eab308;
}

.help {
  margin: 0;
  font-size: 0.8rem;
  opacity: 0.65;
  text-align: center;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgb(2 6 23 / 0.7);
}

.dialog {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 32px;
  border-radius: 16px;
  background: #0f172a;
  border: 1px solid #334155;
  text-align: center;
}

.dialog h2 {
  margin: 0 0 4px;
}

.dialog p {
  margin: 0;
}

.final {
  font-size: 1.2rem;
}

.record {
  color: #fde68a;
  font-weight: 700;
}

.dialog button {
  margin-top: 10px;
  background: #16a34a;
  border-color: #22c55e;
  font-weight: 700;
}

.dialog button:hover {
  background: #22c55e;
}
</style>
