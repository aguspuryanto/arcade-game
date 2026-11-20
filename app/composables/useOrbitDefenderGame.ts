// app/composables/useOrbitDefenderGame.ts
// Orbit Defender: tembak jatuh formasi musuh sebelum mereka mencapai pangkalanmu.
//
// `createDefenderEngine` berisi seluruh aturan game tanpa Vue (bisa diuji di Node);
// `useOrbitDefenderGame` membungkusnya dengan game loop, input, dan state reaktif.
import type {
  DefenderInput, DefenderStatus, DefenderWorld, Enemy, EnemyKind, PowerKind,
} from '../types/orbitDefender'
import { DEFENDER, ENEMY_COLORS } from '../types/orbitDefender'

const GAME_ID = 'orbit-defender'
const D = DEFENDER

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const HALF_SHIP = D.SHIP_W / 2
const ENEMY_PAD = (D.CELL_W - D.ENEMY_SIZE) / 2

const ROW_KINDS: EnemyKind[] = ['scout', 'drone', 'drone', 'grunt', 'grunt']

export interface DefenderStats {
  score: number
  lives: number
  wave: number
  over: boolean
}

// =====================================================================
// Engine (tanpa Vue)
// =====================================================================

export function createDefenderEngine(opts: { rand?: () => number, onGameOver?: () => void } = {}) {
  const rand = opts.rand ?? Math.random
  const stats: DefenderStats = { score: 0, lives: D.LIVES, wave: 1, over: false }

  function createStars() {
    return Array.from({ length: D.STAR_COUNT }, () => ({
      x: rand() * D.WIDTH,
      y: rand() * D.HEIGHT,
      speed: 10 + rand() * 50,
      size: rand() < 0.15 ? 2 : 1,
    }))
  }

  function createEnemies(): Enemy[] {
    const list: Enemy[] = []
    for (let row = 0; row < D.ROWS; row++) {
      for (let col = 0; col < D.COLS; col++) list.push({ col, row, kind: ROW_KINDS[row]!, alive: true })
    }
    return list
  }

  const formationTop = (wave: number) =>
    Math.min(D.FORMATION_TOP_MAX, D.FORMATION_TOP + (wave - 1) * D.FORMATION_TOP_PER_WAVE)

  function createWorld(): DefenderWorld {
    return {
      shipX: D.WIDTH / 2,
      invulnerable: 0,
      fireCooldown: 0,
      rapidTime: 0,
      shield: false,
      enemies: createEnemies(),
      formationX: (D.WIDTH - D.COLS * D.CELL_W) / 2,
      formationY: formationTop(1),
      formationDir: 1,
      enemyFireTimer: 1.5,
      shots: [],
      enemyShots: [],
      powerUps: [],
      particles: [],
      stars: createStars(),
      bannerTime: D.BANNER_TIME,
      shake: 0,
      time: 0,
    }
  }

  const world = createWorld()

  // ---------- Bantuan geometri ----------
  const enemyX = (e: Enemy) => world.formationX + e.col * D.CELL_W + D.CELL_W / 2
  const enemyY = (e: Enemy) => world.formationY + e.row * D.CELL_H + D.CELL_H / 2

  function explode(x: number, y: number, color: string, count = 14) {
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2
      const s = 40 + rand() * 200
      world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + rand() * 0.4, color })
    }
  }

  // ---------- Siklus game ----------
  function reset() {
    Object.assign(world, createWorld())
    stats.score = 0
    stats.lives = D.LIVES
    stats.wave = 1
    stats.over = false
  }

  function nextWave() {
    stats.score += D.WAVE_BONUS * stats.wave
    stats.wave++
    world.enemies = createEnemies()
    world.formationX = (D.WIDTH - D.COLS * D.CELL_W) / 2
    world.formationY = formationTop(stats.wave)
    world.formationDir = 1
    world.enemyShots = []
    world.enemyFireTimer = 1.5
    world.bannerTime = D.BANNER_TIME
  }

  function gameOver() {
    if (stats.over) return
    stats.over = true
    explode(world.shipX, D.SHIP_Y, '#f8fafc', 40)
    world.shake = 0.5
    opts.onGameOver?.()
  }

  function hitShip() {
    if (world.invulnerable > 0) return
    world.shake = 0.3
    if (world.shield) {
      world.shield = false
      world.invulnerable = 1
      explode(world.shipX, D.SHIP_Y, '#38bdf8', 16)
      return
    }
    stats.lives--
    explode(world.shipX, D.SHIP_Y, '#fb7185', 26)
    world.rapidTime = 0
    if (stats.lives <= 0) return gameOver()
    world.invulnerable = D.INVULNERABLE_TIME
    world.enemyShots = []
  }

  // ---------- Pembaruan per bagian ----------
  function updateAmbient(dt: number) {
    world.time += dt
    world.bannerTime = Math.max(0, world.bannerTime - dt)
    world.shake = Math.max(0, world.shake - dt)
    for (const s of world.stars) {
      s.y += s.speed * dt
      if (s.y > D.HEIGHT) {
        s.y -= D.HEIGHT
        s.x = rand() * D.WIDTH
      }
    }
    for (const p of world.particles) {
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 0.97
      p.vy *= 0.97
      p.life -= dt
    }
    world.particles = world.particles.filter(p => p.life > 0)
  }

  function updateShip(dt: number, input: DefenderInput) {
    if (input.left || input.right) {
      world.shipX += ((input.right ? 1 : 0) - (input.left ? 1 : 0)) * D.SHIP_SPEED * dt
    } else if (input.pointerX !== null) {
      const maxStep = D.POINTER_SPEED * dt
      world.shipX += clamp(input.pointerX - world.shipX, -maxStep, maxStep)
    }
    world.shipX = clamp(world.shipX, HALF_SHIP + 4, D.WIDTH - HALF_SHIP - 4)

    world.invulnerable = Math.max(0, world.invulnerable - dt)
    world.rapidTime = Math.max(0, world.rapidTime - dt)
    world.fireCooldown -= dt
    if (input.fire && world.fireCooldown <= 0 && world.shots.length < D.MAX_SHOTS + (world.rapidTime > 0 ? 3 : 0)) {
      world.shots.push({ x: world.shipX, y: D.SHIP_Y - D.SHIP_H / 2, vy: -D.SHOT_SPEED })
      world.fireCooldown = world.rapidTime > 0 ? D.RAPID_COOLDOWN : D.FIRE_COOLDOWN
    }
  }

  function updateFormation(dt: number) {
    const alive = world.enemies.filter(e => e.alive)
    if (alive.length === 0) return

    const ratioLeft = alive.length / world.enemies.length
    const speed = (D.MARCH_SPEED + (stats.wave - 1) * D.MARCH_SPEED_PER_WAVE) * (1 + (1 - ratioLeft) * D.MARCH_SPEEDUP)
    world.formationX += world.formationDir * speed * dt

    let minCol = D.COLS
    let maxCol = -1
    let maxRow = -1
    for (const e of alive) {
      minCol = Math.min(minCol, e.col)
      maxCol = Math.max(maxCol, e.col)
      maxRow = Math.max(maxRow, e.row)
    }
    const left = world.formationX + minCol * D.CELL_W + ENEMY_PAD
    const right = world.formationX + (maxCol + 1) * D.CELL_W - ENEMY_PAD
    if (world.formationDir > 0 && right >= D.WIDTH - D.SIDE_MARGIN) {
      world.formationX -= right - (D.WIDTH - D.SIDE_MARGIN)
      world.formationDir = -1
      world.formationY += D.STEP_DOWN
    } else if (world.formationDir < 0 && left <= D.SIDE_MARGIN) {
      world.formationX += D.SIDE_MARGIN - left
      world.formationDir = 1
      world.formationY += D.STEP_DOWN
    }

    // Musuh mencapai pangkalan → game over
    const bottom = world.formationY + (maxRow + 1) * D.CELL_H - ENEMY_PAD
    if (bottom >= D.SHIP_Y - D.SHIP_H / 2) {
      stats.lives = 0
      gameOver()
      return
    }

    // Tembakan musuh: musuh terbawah di kolom acak (kadang membidik kolom terdekat kapal)
    world.enemyFireTimer -= dt
    if (world.enemyFireTimer <= 0) {
      const rate = Math.min(D.ENEMY_FIRE_RATE_MAX, D.ENEMY_FIRE_RATE + (stats.wave - 1) * D.ENEMY_FIRE_RATE_PER_WAVE)
      world.enemyFireTimer = (0.4 + rand() * 1.2) / rate
      const bottoms = new Map<number, Enemy>()
      for (const e of alive) {
        const cur = bottoms.get(e.col)
        if (!cur || e.row > cur.row) bottoms.set(e.col, e)
      }
      const shooters = [...bottoms.values()]
      let shooter = shooters[Math.floor(rand() * shooters.length)]!
      if (rand() < D.ENEMY_AIM_CHANCE) {
        shooter = shooters.reduce((a, b) =>
          Math.abs(enemyX(a) - world.shipX) < Math.abs(enemyX(b) - world.shipX) ? a : b)
      }
      world.enemyShots.push({
        x: enemyX(shooter),
        y: enemyY(shooter) + D.ENEMY_SIZE / 2,
        vy: D.ENEMY_SHOT_SPEED + (stats.wave - 1) * D.ENEMY_SHOT_SPEED_PER_WAVE,
      })
    }
  }

  function updateShots(dt: number) {
    const half = D.ENEMY_SIZE / 2

    for (const s of world.shots) s.y += s.vy * dt
    world.shots = world.shots.filter((s) => {
      if (s.y < -10) return false
      for (const e of world.enemies) {
        if (!e.alive) continue
        const ex = enemyX(e)
        const ey = enemyY(e)
        if (Math.abs(s.x - ex) <= half + 1.5 && Math.abs(s.y - ey) <= half + 6) {
          e.alive = false
          stats.score += D.POINTS[e.kind]
          explode(ex, ey, ENEMY_COLORS[e.kind])
          if (rand() < D.POWER_DROP_CHANCE) {
            const kind: PowerKind = rand() < 0.5 ? 'rapid' : 'shield'
            world.powerUps.push({ x: ex, y: ey, kind })
          }
          return false
        }
      }
      return true
    })

    for (const s of world.enemyShots) s.y += s.vy * dt
    world.enemyShots = world.enemyShots.filter((s) => {
      if (s.y > D.HEIGHT + 10) return false
      if (Math.abs(s.x - world.shipX) <= HALF_SHIP - 4 && Math.abs(s.y - D.SHIP_Y) <= D.SHIP_H / 2) {
        hitShip()
        return false
      }
      return true
    })
  }

  function updatePowerUps(dt: number) {
    world.powerUps = world.powerUps.filter((p) => {
      p.y += D.POWER_FALL_SPEED * dt
      if (p.y > D.HEIGHT + 10) return false
      if (Math.abs(p.x - world.shipX) <= HALF_SHIP + 8 && Math.abs(p.y - D.SHIP_Y) <= D.SHIP_H / 2 + 8) {
        if (p.kind === 'rapid') world.rapidTime = D.RAPID_TIME
        else world.shield = true
        explode(p.x, p.y, p.kind === 'rapid' ? '#facc15' : '#38bdf8', 10)
        return false
      }
      return true
    })
  }

  /** Satu langkah fisika saat bermain. */
  function step(dt: number, input: DefenderInput) {
    updateAmbient(dt)
    if (stats.over) return
    updateShip(dt, input)
    updateFormation(dt)
    if (stats.over) return
    updateShots(dt)
    if (stats.over) return
    updatePowerUps(dt)
    if (world.enemies.every(e => !e.alive)) nextWave()
  }

  /** Animasi latar saja (layar awal / game over). */
  function idle(dt: number) {
    updateAmbient(dt)
  }

  return { world, stats, step, idle, reset }
}

// =====================================================================
// Pembungkus Vue
// =====================================================================

export function useOrbitDefenderGame(render: (world: DefenderWorld, status: DefenderStatus) => void) {
  const status = ref<DefenderStatus>('ready')
  const score = ref(0)
  const lives = ref<number>(D.LIVES)
  const wave = ref(1)
  const highScore = ref(0)
  const isNewRecord = ref(false)

  const engine = createDefenderEngine({ onGameOver })
  const input: DefenderInput = { left: false, right: false, fire: false, pointerX: null }
  let pointerFiring = false
  let rafId: number | null = null
  let lastTime = 0
  let accumulator = 0
  let overAt = 0

  function onGameOver() {
    status.value = 'over'
    overAt = performance.now()
    score.value = engine.stats.score
    submitScore(GAME_ID, engine.stats.score)
    if (engine.stats.score > highScore.value) {
      highScore.value = engine.stats.score
      isNewRecord.value = true
      saveHighScore(GAME_ID, engine.stats.score)
    }
  }

  function syncStats() {
    const s = engine.stats
    if (score.value !== s.score) score.value = s.score
    if (lives.value !== s.lives) lives.value = s.lives
    if (wave.value !== s.wave) wave.value = s.wave
  }

  function frame(now: number) {
    if (!lastTime) lastTime = now
    accumulator += Math.min((now - lastTime) / 1000, 0.25)
    lastTime = now

    if (status.value === 'paused') {
      accumulator = 0
    } else {
      while (accumulator >= D.STEP) {
        if (status.value === 'playing') {
          engine.step(D.STEP, { ...input, fire: input.fire || pointerFiring })
        } else {
          engine.idle(D.STEP)
        }
        accumulator -= D.STEP
      }
      syncStats()
    }

    render(engine.world, status.value)
    rafId = requestAnimationFrame(frame)
  }

  function start() {
    engine.reset()
    isNewRecord.value = false
    syncStats()
    status.value = 'playing'
  }

  /** Aksi utama (Enter / klik / tap di overlay): mulai, lanjut, atau main lagi. */
  function action() {
    if (status.value === 'ready') start()
    else if (status.value === 'paused') status.value = 'playing'
    else if (status.value === 'over' && performance.now() - overAt >= D.RESTART_DELAY_MS) start()
  }

  function togglePause() {
    if (status.value === 'playing') status.value = 'paused'
    else if (status.value === 'paused') status.value = 'playing'
  }

  // ---------- Pointer (mouse & sentuhan): kapal mengikuti, tembak otomatis saat ditekan ----------
  function pointerDown(x: number) {
    input.pointerX = clamp(x, 0, D.WIDTH)
    if (status.value === 'playing') pointerFiring = true
    else action()
  }

  function pointerMove(x: number) {
    if (status.value === 'playing') input.pointerX = clamp(x, 0, D.WIDTH)
  }

  function pointerUp() {
    pointerFiring = false
  }

  // ---------- Keyboard ----------
  const LEFT = new Set(['ArrowLeft', 'KeyA'])
  const RIGHT = new Set(['ArrowRight', 'KeyD'])

  function onKeydown(e: KeyboardEvent) {
    if (LEFT.has(e.code)) {
      e.preventDefault()
      input.left = true
      input.pointerX = null
    } else if (RIGHT.has(e.code)) {
      e.preventDefault()
      input.right = true
      input.pointerX = null
    } else if (e.code === 'Space') {
      e.preventDefault()
      if (status.value === 'playing') input.fire = true
      else if (!e.repeat) action()
    } else if (e.repeat) {
      // abaikan
    } else if (e.code === 'Enter') {
      action()
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause()
    }
  }

  function onKeyup(e: KeyboardEvent) {
    if (LEFT.has(e.code)) input.left = false
    else if (RIGHT.has(e.code)) input.right = false
    else if (e.code === 'Space') input.fire = false
  }

  function releaseAll() {
    input.left = input.right = input.fire = false
    pointerFiring = false
  }

  function onVisibilityChange() {
    if (document.hidden && status.value === 'playing') status.value = 'paused'
  }

  onMounted(() => {
    highScore.value = readHighScore(GAME_ID)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('keyup', onKeyup)
    window.addEventListener('blur', releaseAll)
    window.addEventListener('pointerup', pointerUp)
    window.addEventListener('pointercancel', pointerUp)
    document.addEventListener('visibilitychange', onVisibilityChange)
    rafId = requestAnimationFrame(frame)
  })

  onBeforeUnmount(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('keyup', onKeyup)
    window.removeEventListener('blur', releaseAll)
    window.removeEventListener('pointerup', pointerUp)
    window.removeEventListener('pointercancel', pointerUp)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    status: readonly(status),
    score: readonly(score),
    lives: readonly(lives),
    wave: readonly(wave),
    highScore: readonly(highScore),
    isNewRecord: readonly(isNewRecord),
    action,
    togglePause,
    pointerDown,
    pointerMove,
    pointerUp,
  }
}
