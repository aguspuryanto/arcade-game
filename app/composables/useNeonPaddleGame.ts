// app/composables/useNeonPaddleGame.ts
// Neon Paddle: pingpong lawan CPU dalam mode bertahan.
// Skor: +1 setiap memantulkan bola, +5 setiap membobol CPU. Nyawa habis = game over.
import type { Paddle, PaddleStatus, PaddleWorld } from '~/types/neonPaddle'
import { PADDLE } from '~/types/neonPaddle'

const GAME_ID = 'neon-paddle'
const P = PADDLE

const HALF_H = P.PADDLE_H / 2
const PLAYER_FRONT = P.PADDLE_MARGIN + P.PADDLE_W // sisi kanan paddle pemain
const CPU_FRONT = P.WIDTH - P.PADDLE_MARGIN - P.PADDLE_W // sisi kiri paddle CPU

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const clampPaddle = (y: number) => clamp(y, HALF_H, P.HEIGHT - HALF_H)

function createWorld(): PaddleWorld {
  return {
    player: { y: P.HEIGHT / 2, vy: 0 },
    cpu: { y: P.HEIGHT / 2, vy: 0 },
    ball: { x: P.WIDTH / 2, y: P.HEIGHT / 2, vx: 0, vy: 0, speed: P.BALL_SPEED_START },
    trail: [],
    sparks: [],
    serveTimer: 0,
    serveDir: -1,
    flash: 0,
    flashSide: 'player',
    pointerY: null,
    time: 0,
  }
}

/** Perkirakan posisi Y bola saat mencapai garis X tertentu (memperhitungkan pantulan dinding). */
function predictY(x0: number, y0: number, vx: number, vy: number, targetX: number) {
  const t = (targetX - x0) / vx
  const r = P.BALL_RADIUS
  const span = P.HEIGHT - 2 * r
  const period = span * 2
  let y = (y0 - r + vy * t) % period
  if (y < 0) y += period
  if (y > span) y = period - y
  return y + r
}

/**
 * Logika Neon Paddle. `render` dipanggil setiap frame dengan dunia game terbaru;
 * komponen yang memegang canvas yang menentukan cara menggambarnya.
 */
export function useNeonPaddleGame(render: (world: PaddleWorld) => void) {
  // State yang ditampilkan di UI (reaktif)
  const status = ref<PaddleStatus>('ready')
  const score = ref(0)
  const lives = ref<number>(P.LIVES)
  const goals = ref(0)
  const highScore = ref(0)
  const isNewRecord = ref(false)

  // State yang berubah tiap frame (non-reaktif)
  let world = createWorld()
  let rafId: number | null = null
  let lastTime = 0
  let accumulator = 0
  let overAt = 0
  let upHeld = false
  let downHeld = false
  let cpuAimError = 0

  const cpuSpeed = () => Math.min(P.CPU_SPEED_MAX, P.CPU_SPEED_START + goals.value * P.CPU_SPEED_PER_GOAL)

  // ---------- Bola ----------
  function resetBall() {
    const b = world.ball
    b.x = P.WIDTH / 2
    b.y = P.HEIGHT / 2
    b.vx = 0
    b.vy = 0
    b.speed = P.BALL_SPEED_START + Math.min(goals.value * 10, 140)
    world.trail = []
  }

  function serve() {
    const b = world.ball
    const angle = (Math.random() * 2 - 1) * (Math.PI / 7)
    b.vx = Math.cos(angle) * b.speed * world.serveDir
    b.vy = Math.sin(angle) * b.speed
    cpuAimError = (Math.random() * 2 - 1) * P.CPU_ERROR
  }

  function burst(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2
      const s = 60 + Math.random() * 220
      world.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.3 + Math.random() * 0.3, color })
    }
  }

  /** Pantulkan bola dari paddle; sudut bergantung titik kena + gerak paddle. */
  function bounceOff(paddle: Paddle, dir: 1 | -1) {
    const b = world.ball
    const offset = clamp((b.y - paddle.y) / (HALF_H + P.BALL_RADIUS), -1, 1)
    b.speed = Math.min(P.BALL_SPEED_MAX, b.speed + P.BALL_SPEED_HIT)
    const maxVy = b.speed * Math.sin(P.MAX_BOUNCE_ANGLE)
    b.vy = clamp(Math.sin(offset * P.MAX_BOUNCE_ANGLE) * b.speed + paddle.vy * P.SPIN, -maxVy, maxVy)
    b.vx = dir * Math.sqrt(b.speed * b.speed - b.vy * b.vy)
  }

  function goal(scorer: 'player' | 'cpu') {
    world.flash = 0.5
    world.flashSide = scorer
    if (scorer === 'player') {
      score.value += P.POINTS_GOAL
      goals.value++
      burst(P.WIDTH, clamp(world.ball.y, 0, P.HEIGHT), '#f472b6', 24)
      world.serveDir = 1
    } else {
      lives.value--
      burst(0, clamp(world.ball.y, 0, P.HEIGHT), '#22d3ee', 24)
      world.serveDir = -1
      if (lives.value <= 0) return gameOver()
    }
    resetBall()
    world.serveTimer = P.SERVE_DELAY
  }

  function gameOver() {
    status.value = 'over'
    submitScore(GAME_ID, score.value)
    overAt = performance.now()
    world.ball.vx = world.ball.vy = 0
    if (score.value > highScore.value) {
      highScore.value = score.value
      isNewRecord.value = true
      saveHighScore(GAME_ID, score.value)
    }
  }

  // ---------- Paddle ----------
  function movePlayer(dt: number) {
    const p = world.player
    const prev = p.y
    if (upHeld || downHeld) {
      world.pointerY = null
      p.y += ((downHeld ? 1 : 0) - (upHeld ? 1 : 0)) * P.PLAYER_SPEED * dt
    } else if (world.pointerY !== null) {
      const diff = world.pointerY - p.y
      const maxStep = P.POINTER_SPEED * dt
      p.y += clamp(diff, -maxStep, maxStep)
    }
    p.y = clampPaddle(p.y)
    p.vy = (p.y - prev) / dt
  }

  function moveCpu(dt: number) {
    const c = world.cpu
    const b = world.ball
    const prev = c.y
    const reactX = P.WIDTH * Math.max(0.2, P.CPU_REACT_X - goals.value * P.CPU_REACT_PER_GOAL)
    const tracking = b.vx > 0 && b.x >= reactX
    let target = P.HEIGHT / 2
    if (tracking) target = predictY(b.x, b.y, b.vx, b.vy, CPU_FRONT - P.BALL_RADIUS) + cpuAimError
    else if (b.vx >= 0) target = b.y // belum bereaksi: hanya mengikuti posisi bola
    const diff = target - c.y
    if (Math.abs(diff) > 3) {
      // Selain saat membaca bola, CPU bergerak santai
      const speed = tracking ? cpuSpeed() : cpuSpeed() * 0.5
      c.y += clamp(diff, -speed * dt, speed * dt)
    }
    c.y = clampPaddle(c.y)
    c.vy = (c.y - prev) / dt
  }

  // ---------- Langkah fisika ----------
  function updateSparks(dt: number) {
    for (const s of world.sparks) {
      s.x += s.vx * dt
      s.y += s.vy * dt
      s.vx *= 0.96
      s.vy *= 0.96
      s.life -= dt
    }
    world.sparks = world.sparks.filter(s => s.life > 0)
  }

  function step(dt: number) {
    world.time += dt
    world.flash = Math.max(0, world.flash - dt)
    updateSparks(dt)

    if (status.value === 'ready') {
      // Demo: bola melayang pelan, paddle mengikutinya
      const b = world.ball
      b.y = P.HEIGHT / 2 + Math.sin(world.time * 1.6) * 90
      world.player.y += (clampPaddle(b.y) - world.player.y) * Math.min(1, dt * 4)
      world.cpu.y += (clampPaddle(b.y) - world.cpu.y) * Math.min(1, dt * 4)
      return
    }
    if (status.value !== 'playing') return

    movePlayer(dt)
    moveCpu(dt)

    if (world.serveTimer > 0) {
      world.serveTimer -= dt
      if (world.serveTimer <= 0) serve()
      return
    }

    const b = world.ball
    const r = P.BALL_RADIUS
    const prevX = b.x
    b.x += b.vx * dt
    b.y += b.vy * dt

    world.trail.push({ x: b.x, y: b.y })
    if (world.trail.length > P.TRAIL_LENGTH) world.trail.shift()

    // Dinding atas & bawah
    if (b.y < r) {
      b.y = r
      b.vy = Math.abs(b.vy)
    } else if (b.y > P.HEIGHT - r) {
      b.y = P.HEIGHT - r
      b.vy = -Math.abs(b.vy)
    }

    // Paddle pemain: cek bola melintasi sisi depan paddle (anti tembus di kecepatan tinggi)
    if (b.vx < 0 && prevX - r >= PLAYER_FRONT && b.x - r < PLAYER_FRONT) {
      if (Math.abs(b.y - world.player.y) <= HALF_H + r) {
        b.x = PLAYER_FRONT + r
        bounceOff(world.player, 1)
        score.value += P.POINTS_HIT
        cpuAimError = (Math.random() * 2 - 1) * P.CPU_ERROR
        burst(b.x, b.y, '#22d3ee')
      }
    }

    // Paddle CPU
    if (b.vx > 0 && prevX + r <= CPU_FRONT && b.x + r > CPU_FRONT) {
      if (Math.abs(b.y - world.cpu.y) <= HALF_H + r) {
        b.x = CPU_FRONT - r
        bounceOff(world.cpu, -1)
        burst(b.x, b.y, '#f472b6')
      }
    }

    // Gol
    if (b.x < -r * 2) goal('cpu')
    else if (b.x > P.WIDTH + r * 2) goal('player')
  }

  // ---------- Game loop: fisika fixed timestep, render tiap frame ----------
  function frame(now: number) {
    if (!lastTime) lastTime = now
    accumulator += Math.min((now - lastTime) / 1000, 0.25)
    lastTime = now

    if (status.value !== 'paused') {
      while (accumulator >= P.STEP) {
        step(P.STEP)
        accumulator -= P.STEP
      }
    } else {
      accumulator = 0
    }

    render(world)
    rafId = requestAnimationFrame(frame)
  }

  // ---------- Kontrol ----------
  function start() {
    world = createWorld()
    score.value = 0
    goals.value = 0
    lives.value = P.LIVES
    isNewRecord.value = false
    world.serveDir = -1
    world.serveTimer = P.SERVE_DELAY
    status.value = 'playing'
  }

  /** Aksi utama (spasi / klik / tap): mulai, lanjut, atau main lagi. */
  function action() {
    switch (status.value) {
      case 'ready':
        start()
        break
      case 'paused':
        status.value = 'playing'
        break
      case 'over':
        if (performance.now() - overAt >= P.RESTART_DELAY_MS) start()
        break
    }
  }

  function togglePause() {
    if (status.value === 'playing') status.value = 'paused'
    else if (status.value === 'paused') status.value = 'playing'
  }

  /** Posisi Y pointer dalam koordinat logis canvas (mouse / sentuhan). */
  function setPointerY(y: number) {
    world.pointerY = clamp(y, 0, P.HEIGHT)
  }

  const UP_KEYS = new Set(['ArrowUp', 'KeyW'])
  const DOWN_KEYS = new Set(['ArrowDown', 'KeyS'])

  function onKeydown(e: KeyboardEvent) {
    if (UP_KEYS.has(e.code)) {
      e.preventDefault()
      upHeld = true
    } else if (DOWN_KEYS.has(e.code)) {
      e.preventDefault()
      downHeld = true
    } else if (e.repeat) {
      // abaikan
    } else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault()
      action()
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause()
    }
  }

  function onKeyup(e: KeyboardEvent) {
    if (UP_KEYS.has(e.code)) upHeld = false
    else if (DOWN_KEYS.has(e.code)) downHeld = false
  }

  function onVisibilityChange() {
    if (document.hidden && status.value === 'playing') status.value = 'paused'
  }

  function onBlur() {
    upHeld = downHeld = false
  }

  onMounted(() => {
    highScore.value = readHighScore(GAME_ID)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('keyup', onKeyup)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibilityChange)
    rafId = requestAnimationFrame(frame)
  })

  onBeforeUnmount(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('keyup', onKeyup)
    window.removeEventListener('blur', onBlur)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    status: readonly(status),
    score: readonly(score),
    lives: readonly(lives),
    goals: readonly(goals),
    highScore: readonly(highScore),
    isNewRecord: readonly(isNewRecord),
    action,
    togglePause,
    setPointerY,
  }
}
