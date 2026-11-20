// app/composables/useSolitaireGame.ts — logika Klondike Solitaire
import type { Card, DrawCount, PileRef, Piles, SolitaireStatus } from '~/types/solitaire'
import { MAX_UNDO, SCORE, SUITS, isRed } from '~/types/solitaire'

const GAME_ID = 'solitaire'

interface Snapshot {
  piles: Piles
  score: number
  moves: number
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

function deal(): Piles {
  const deck: Card[] = shuffle(
    SUITS.flatMap(suit =>
      Array.from({ length: 13 }, (_, i) => ({ id: `${suit}-${i + 1}`, suit, rank: i + 1, faceUp: false })),
    ),
  )
  const tableau: Card[][] = []
  for (let col = 0; col < 7; col++) {
    const cards = deck.splice(0, col + 1)
    cards[cards.length - 1]!.faceUp = true
    tableau.push(cards)
  }
  return { stock: deck, waste: [], foundations: [[], [], [], []], tableau }
}

export const samePile = (a: PileRef, b: PileRef) =>
  a.kind === b.kind && ('index' in a ? a.index : -1) === ('index' in b ? b.index : -1)

export function useSolitaireGame() {
  const piles = reactive<Piles>(deal())
  const drawCount = ref<DrawCount>(1)
  const status = ref<SolitaireStatus>('playing')
  const score = ref(0)
  const moves = ref(0)
  const seconds = ref(0)
  const timeBonus = ref(0)
  const highScore = ref(0)
  const isNewRecord = ref(false)
  const isAutoCompleting = ref(false)

  const history: Snapshot[] = []
  const canUndo = ref(false)

  let timerId: ReturnType<typeof setInterval> | null = null
  let autoTimer: ReturnType<typeof setTimeout> | null = null

  // ---------- Util ----------
  function getPile(ref: PileRef): Card[] {
    switch (ref.kind) {
      case 'stock': return piles.stock
      case 'waste': return piles.waste
      case 'foundation': return piles.foundations[ref.index]!
      case 'tableau': return piles.tableau[ref.index]!
    }
  }

  function startTimer() {
    if (timerId !== null || status.value !== 'playing') return
    timerId = setInterval(() => seconds.value++, 1000)
  }

  function stopTimer() {
    if (timerId !== null) clearInterval(timerId)
    timerId = null
  }

  function pushHistory() {
    history.push(JSON.parse(JSON.stringify({ piles: toRaw(piles), score: score.value, moves: moves.value })))
    if (history.length > MAX_UNDO) history.shift()
    canUndo.value = true
  }

  function addScore(delta: number) {
    score.value = Math.max(0, score.value + delta)
  }

  // ---------- Aturan ----------
  /** Kartu yang boleh diangkat mulai dari `cardIndex`, atau null jika tidak boleh. */
  function movableCards(from: PileRef, cardIndex: number): Card[] | null {
    if (from.kind === 'stock') return null
    const pile = getPile(from)
    const card = pile[cardIndex]
    if (!card || !card.faceUp) return null
    // Waste & foundation: hanya kartu teratas
    if (from.kind !== 'tableau' && cardIndex !== pile.length - 1) return null
    return pile.slice(cardIndex)
  }

  function canDrop(cards: Card[], to: PileRef): boolean {
    const first = cards[0]
    if (!first) return false
    const target = getPile(to)
    const top = target.at(-1)

    if (to.kind === 'foundation') {
      if (cards.length !== 1) return false
      return top ? top.suit === first.suit && first.rank === top.rank + 1 : first.rank === 1
    }
    if (to.kind === 'tableau') {
      if (!top) return first.rank === 13
      return top.faceUp && isRed(top.suit) !== isRed(first.suit) && first.rank === top.rank - 1
    }
    return false
  }

  // ---------- Aksi ----------
  function drawFromStock() {
    if (status.value !== 'playing' || isAutoCompleting.value) return
    if (piles.stock.length === 0 && piles.waste.length === 0) return
    pushHistory()
    startTimer()

    if (piles.stock.length === 0) {
      // Balik waste menjadi stock lagi
      piles.stock = piles.waste.reverse().map(c => ({ ...c, faceUp: false }))
      piles.waste = []
    } else {
      const n = Math.min(drawCount.value, piles.stock.length)
      for (let i = 0; i < n; i++) {
        const card = piles.stock.pop()!
        card.faceUp = true
        piles.waste.push(card)
      }
    }
    moves.value++
  }

  function tryMove(from: PileRef, cardIndex: number, to: PileRef): boolean {
    if (status.value !== 'playing' || samePile(from, to)) return false
    const cards = movableCards(from, cardIndex)
    if (!cards || !canDrop(cards, to)) return false

    pushHistory()
    startTimer()

    const source = getPile(from)
    source.splice(cardIndex)
    getPile(to).push(...cards)

    if (to.kind === 'foundation') addScore(SCORE.TO_FOUNDATION)
    else if (from.kind === 'waste') addScore(SCORE.WASTE_TO_TABLEAU)
    else if (from.kind === 'foundation') addScore(SCORE.FOUNDATION_TO_TABLEAU)

    // Buka kartu tertutup yang kini berada di atas kolom
    const newTop = source.at(-1)
    if (from.kind === 'tableau' && newTop && !newTop.faceUp) {
      newTop.faceUp = true
      addScore(SCORE.FLIP_CARD)
    }

    moves.value++
    checkWin()
    return true
  }

  /** Klik/tap pada kartu: pindahkan ke tujuan terbaik yang valid. */
  function autoMove(from: PileRef, cardIndex: number): boolean {
    const cards = movableCards(from, cardIndex)
    if (!cards) return false

    if (cards.length === 1 && from.kind !== 'foundation') {
      for (let i = 0; i < 4; i++) {
        if (tryMove(from, cardIndex, { kind: 'foundation', index: i })) return true
      }
    }
    // Utamakan kolom yang berisi, baru kolom kosong
    const order = [0, 1, 2, 3, 4, 5, 6].sort(
      (a, b) => Number(piles.tableau[a]!.length === 0) - Number(piles.tableau[b]!.length === 0),
    )
    for (const i of order) {
      // Memindahkan King dari dasar kolom ke kolom kosong lain tidak ada gunanya
      if (piles.tableau[i]!.length === 0 && from.kind === 'tableau' && cardIndex === 0) continue
      if (tryMove(from, cardIndex, { kind: 'tableau', index: i })) return true
    }
    return false
  }

  const canAutoComplete = computed(() =>
    status.value === 'playing'
    && !isAutoCompleting.value
    && piles.stock.length === 0
    && piles.waste.length === 0
    && piles.tableau.every(col => col.every(c => c.faceUp)),
  )

  /** Pindahkan semua kartu ke foundation satu per satu (dengan jeda animasi). */
  function autoComplete() {
    if (!canAutoComplete.value) return
    isAutoCompleting.value = true

    const tick = () => {
      // Pilih kartu teratas dengan rank terkecil agar selalu ada langkah valid
      const candidates = piles.tableau
        .map((col, index) => ({ index, card: col.at(-1) }))
        .filter((x): x is { index: number, card: Card } => !!x.card)
        .sort((a, b) => a.card.rank - b.card.rank)

      for (const { index } of candidates) {
        const from: PileRef = { kind: 'tableau', index }
        const cardIndex = piles.tableau[index]!.length - 1
        for (let f = 0; f < 4; f++) {
          if (tryMove(from, cardIndex, { kind: 'foundation', index: f })) {
            autoTimer = setTimeout(tick, 70)
            return
          }
        }
      }
      isAutoCompleting.value = false
    }
    tick()
  }

  function checkWin() {
    const total = piles.foundations.reduce((n, f) => n + f.length, 0)
    if (total !== 52) return
    status.value = 'won'
    stopTimer()
    timeBonus.value = seconds.value > 30 ? Math.round(SCORE.TIME_BONUS_BASE / seconds.value) : 0
    score.value += timeBonus.value
    submitScore(GAME_ID, score.value)
    if (score.value > highScore.value) {
      highScore.value = score.value
      isNewRecord.value = true
      saveHighScore(GAME_ID, score.value)
    }
  }

  function undo() {
    if (status.value !== 'playing' || isAutoCompleting.value) return
    const snap = history.pop()
    if (!snap) return
    Object.assign(piles, snap.piles)
    score.value = snap.score
    moves.value = snap.moves
    canUndo.value = history.length > 0
  }

  function newGame(count: DrawCount = drawCount.value) {
    stopTimer()
    if (autoTimer) clearTimeout(autoTimer)
    drawCount.value = count
    Object.assign(piles, deal())
    status.value = 'playing'
    score.value = 0
    moves.value = 0
    seconds.value = 0
    timeBonus.value = 0
    isNewRecord.value = false
    isAutoCompleting.value = false
    history.length = 0
    canUndo.value = false
  }

  function onKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
      e.preventDefault()
      undo()
    } else if (e.code === 'KeyU') {
      undo()
    }
  }

  onMounted(() => {
    highScore.value = readHighScore(GAME_ID)
    window.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    stopTimer()
    if (autoTimer) clearTimeout(autoTimer)
    window.removeEventListener('keydown', onKeydown)
  })

  return {
    piles: readonly(piles),
    drawCount: readonly(drawCount),
    status: readonly(status),
    score: readonly(score),
    moves: readonly(moves),
    seconds: readonly(seconds),
    timeBonus: readonly(timeBonus),
    highScore: readonly(highScore),
    isNewRecord: readonly(isNewRecord),
    canUndo: readonly(canUndo),
    canAutoComplete,
    movableCards,
    drawFromStock,
    tryMove,
    autoMove,
    autoComplete,
    undo,
    newGame,
  }
}
