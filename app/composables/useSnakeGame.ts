// app/composables/useSnakeGame.ts
import type { Direction, GameState, Vec2 } from '~/types/snake'
import { BOARD_SIZE, INITIAL_TICK_MS, MIN_TICK_MS } from '~/types/snake'

const GAME_ID = 'snake'
const SPEED_STEP_MS = 5
const MAX_BUFFERED_INPUTS = 2

const DELTA: Record<Direction, Vec2> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
}

function randomFreeCell(snake: Vec2[], size: number): Vec2 | null {
  const occupied = new Set(snake.map(s => s.y * size + s.x))
  const free: number[] = []
  for (let i = 0; i < size * size; i++) {
    if (!occupied.has(i)) free.push(i)
  }
  if (free.length === 0) return null
  const idx = free[Math.floor(Math.random() * free.length)]!
  return { x: idx % size, y: Math.floor(idx / size) }
}

function createInitialState(highScore: number): GameState {
  const mid = Math.floor(BOARD_SIZE / 2)
  const snake: Vec2[] = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ]
  return {
    snake,
    direction: 'RIGHT',
    nextDirections: [],
    food: randomFreeCell(snake, BOARD_SIZE) ?? { x: 0, y: 0 },
    score: 0,
    highScore,
    isGameOver: false,
    isPaused: true, // mulai dalam keadaan pause, menunggu input pertama
    tickMs: INITIAL_TICK_MS,
    boardSize: BOARD_SIZE,
  }
}

export function useSnakeGame() {
  const state = reactive<GameState>(createInitialState(readHighScore(GAME_ID)))
  const hasStarted = ref(false)

  let rafId: number | null = null
  let lastTime = 0
  let accumulator = 0

  // ---------- Logika inti (satu langkah) ----------
  function step() {
    // Ambil arah berikutnya dari buffer input
    const queued = state.nextDirections.shift()
    if (queued) state.direction = queued

    const head = state.snake[0]!
    const d = DELTA[state.direction]
    const newHead: Vec2 = { x: head.x + d.x, y: head.y + d.y }

    // Tabrak dinding
    if (
      newHead.x < 0 || newHead.y < 0
      || newHead.x >= state.boardSize || newHead.y >= state.boardSize
    ) {
      return endGame()
    }

    const willEat = newHead.x === state.food.x && newHead.y === state.food.y

    // Tabrak badan sendiri. Ekor akan bergeser jika tidak makan, jadi abaikan ekor.
    const body = willEat ? state.snake : state.snake.slice(0, -1)
    if (body.some(s => s.x === newHead.x && s.y === newHead.y)) {
      return endGame()
    }

    const nextSnake = [newHead, ...body]
    state.snake = nextSnake

    if (willEat) {
      state.score += 1
      state.tickMs = Math.max(MIN_TICK_MS, state.tickMs - SPEED_STEP_MS)
      const food = randomFreeCell(nextSnake, state.boardSize)
      if (!food) return endGame() // papan penuh = menang
      state.food = food
    }
  }

  function endGame() {
    state.isGameOver = true
    submitScore(GAME_ID, state.score)
    if (state.score > state.highScore) {
      state.highScore = state.score
      saveHighScore(GAME_ID, state.score)
    }
    stopLoop()
  }

  // ---------- Game loop (fixed timestep di atas requestAnimationFrame) ----------
  function frame(now: number) {
    if (!lastTime) lastTime = now
    // Clamp delta agar tidak "lompat" banyak langkah setelah tab tidak aktif
    accumulator += Math.min(now - lastTime, 250)
    lastTime = now

    while (accumulator >= state.tickMs && !state.isGameOver && !state.isPaused) {
      step()
      accumulator -= state.tickMs
    }

    if (!state.isGameOver && !state.isPaused) {
      rafId = requestAnimationFrame(frame)
    }
  }

  function startLoop() {
    if (rafId !== null) return
    lastTime = 0
    accumulator = 0
    rafId = requestAnimationFrame(frame)
  }

  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = null
  }

  // ---------- Kontrol ----------
  function changeDirection(dir: Direction) {
    if (state.isGameOver) return
    const last = state.nextDirections.at(-1) ?? state.direction
    if (dir === last || dir === OPPOSITE[last]) return
    if (state.nextDirections.length >= MAX_BUFFERED_INPUTS) return
    state.nextDirections.push(dir)

    // Input arah pertama juga memulai permainan
    if (!hasStarted.value) {
      hasStarted.value = true
      resume()
    }
  }

  function pause() {
    if (state.isGameOver) return
    state.isPaused = true
    stopLoop()
  }

  function resume() {
    if (state.isGameOver) return
    hasStarted.value = true
    state.isPaused = false
    startLoop()
  }

  function togglePause() {
    if (state.isPaused) resume()
    else pause()
  }

  function restart() {
    stopLoop()
    Object.assign(state, createInitialState(state.highScore))
    hasStarted.value = false
  }

  // ---------- Keyboard ----------
  const KEY_MAP: Record<string, Direction> = {
    ArrowUp: 'UP', KeyW: 'UP',
    ArrowDown: 'DOWN', KeyS: 'DOWN',
    ArrowLeft: 'LEFT', KeyA: 'LEFT',
    ArrowRight: 'RIGHT', KeyD: 'RIGHT',
  }

  function onKeydown(e: KeyboardEvent) {
    const dir = KEY_MAP[e.code]
    if (dir) {
      e.preventDefault()
      changeDirection(dir)
      return
    }
    if (e.code === 'Space' || e.code === 'KeyP') {
      e.preventDefault()
      if (state.isGameOver) restart()
      else togglePause()
    } else if (e.code === 'Enter' && state.isGameOver) {
      restart()
    }
  }

  function onVisibilityChange() {
    if (document.hidden && !state.isPaused) pause()
  }

  onMounted(() => {
    state.highScore = readHighScore(GAME_ID)
    window.addEventListener('keydown', onKeydown)
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onBeforeUnmount(() => {
    stopLoop()
    window.removeEventListener('keydown', onKeydown)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    state: readonly(state),
    hasStarted: readonly(hasStarted),
    changeDirection,
    togglePause,
    restart,
  }
}
