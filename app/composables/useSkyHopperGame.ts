// app/composables/useSkyHopperGame.ts
import type { HopperStatus, HopperWorld, Pillar } from '~/types/skyHopper'
import { HOPPER } from '~/types/skyHopper'

const GAME_ID = 'sky-hopper'
const H = HOPPER

const PLAY_HEIGHT = H.HEIGHT - H.GROUND_HEIGHT
const START_Y = PLAY_HEIGHT / 2 - 20

function createWorld(): HopperWorld {
  return {
    bird: { x: H.BIRD_X, y: START_Y, vy: 0, rotation: 0, flapTime: 1 },
    pillars: [],
    groundOffset: 0,
    time: 0,
  }
}

/** Tabrakan lingkaran vs persegi panjang. */
function circleHitsRect(cx: number, cy: number, r: number, x: number, y: number, w: number, h: number) {
  const nx = Math.max(x, Math.min(cx, x + w))
  const ny = Math.max(y, Math.min(cy, y + h))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy < r * r
}

/**
 * Logika Sky Hopper. `render` dipanggil setiap frame dengan dunia game terbaru;
 * komponen yang memegang canvas yang menentukan cara menggambarnya.
 */
export function useSkyHopperGame(render: (world: HopperWorld, score: number) => void) {
  // State yang ditampilkan di UI (reaktif)
  const status = ref<HopperStatus>('ready')
  const score = ref(0)
  const highScore = ref(0)
  const isNewRecord = ref(false)

  // State yang berubah tiap frame (non-reaktif)
  let world = createWorld()
  let rafId: number | null = null
  let lastTime = 0
  let accumulator = 0
  let overAt = 0

  // ---------- Aturan permainan ----------
  const speed = () => Math.min(H.SPEED_MAX, H.SPEED_START + score.value * H.SPEED_PER_POINT)
  const gapSize = () => Math.max(H.GAP_MIN, H.GAP_START - score.value * H.GAP_SHRINK_PER_POINT)

  function spawnPillar(x: number): Pillar {
    const gap = gapSize()
    const min = H.GAP_MARGIN + gap / 2
    const max = PLAY_HEIGHT - H.GAP_MARGIN - gap / 2
    return { x, gapY: min + Math.random() * (max - min), gapSize: gap, passed: false }
  }

  function updateBirdPhysics(dt: number) {
    const b = world.bird
    b.vy = Math.min(H.MAX_FALL_SPEED, b.vy + H.GRAVITY * dt)
    b.y += b.vy * dt
    b.flapTime += dt
    // Miring ke atas saat naik, menukik saat jatuh
    const target = Math.max(-0.45, Math.min(1.3, b.vy / 550))
    b.rotation += (target - b.rotation) * Math.min(1, dt * 10)

    if (b.y - H.BIRD_RADIUS < 0) {
      b.y = H.BIRD_RADIUS
      b.vy = 0
    }
  }

  function step(dt: number) {
    world.time += dt
    const b = world.bird

    if (status.value === 'ready') {
      // Melayang naik-turun menunggu input pertama
      b.y = START_Y + Math.sin(world.time * 4) * 8
      b.flapTime += dt
      world.groundOffset = (world.groundOffset + H.SPEED_START * dt) % 24
      return
    }

    if (status.value === 'over') {
      // Burung jatuh sampai tanah setelah menabrak
      if (b.y + H.BIRD_RADIUS < PLAY_HEIGHT) {
        updateBirdPhysics(dt)
        b.y = Math.min(b.y, PLAY_HEIGHT - H.BIRD_RADIUS)
      }
      return
    }

    // --- playing ---
    const v = speed()
    world.groundOffset = (world.groundOffset + v * dt) % 24
    updateBirdPhysics(dt)

    // Gerakkan pilar, buang yang sudah keluar layar, munculkan yang baru
    for (const p of world.pillars) p.x -= v * dt
    if (world.pillars[0] && world.pillars[0].x + H.PILLAR_WIDTH < 0) world.pillars.shift()
    const last = world.pillars.at(-1)
    if (!last || last.x <= H.WIDTH - H.PILLAR_SPACING) {
      world.pillars.push(spawnPillar(last ? last.x + H.PILLAR_SPACING : H.WIDTH + 40))
    }

    // Skor & tabrakan
    for (const p of world.pillars) {
      if (!p.passed && p.x + H.PILLAR_WIDTH < b.x) {
        p.passed = true
        score.value++
      }
      const top = p.gapY - p.gapSize / 2
      const bottom = p.gapY + p.gapSize / 2
      // Hitbox sedikit lebih kecil dari gambar agar terasa adil
      const r = H.BIRD_RADIUS - 2
      if (
        circleHitsRect(b.x, b.y, r, p.x, -100, H.PILLAR_WIDTH, top + 100)
        || circleHitsRect(b.x, b.y, r, p.x, bottom, H.PILLAR_WIDTH, PLAY_HEIGHT - bottom)
      ) {
        return gameOver()
      }
    }

    if (b.y + H.BIRD_RADIUS >= PLAY_HEIGHT) {
      b.y = PLAY_HEIGHT - H.BIRD_RADIUS
      return gameOver()
    }
  }

  function gameOver() {
    status.value = 'over'
    submitScore(GAME_ID, score.value)
    overAt = performance.now()
    world.bird.vy = Math.max(world.bird.vy, 0)
    if (score.value > highScore.value) {
      highScore.value = score.value
      isNewRecord.value = true
      saveHighScore(GAME_ID, score.value)
    }
  }

  // ---------- Game loop: fisika fixed timestep, render tiap frame ----------
  function frame(now: number) {
    if (!lastTime) lastTime = now
    accumulator += Math.min((now - lastTime) / 1000, 0.25)
    lastTime = now

    if (status.value !== 'paused') {
      while (accumulator >= H.STEP) {
        step(H.STEP)
        accumulator -= H.STEP
      }
    } else {
      accumulator = 0
    }

    render(world, score.value)
    rafId = requestAnimationFrame(frame)
  }

  // ---------- Kontrol ----------
  function flap() {
    world.bird.vy = H.FLAP_VELOCITY
    world.bird.flapTime = 0
  }

  /** Aksi utama (spasi / klik / tap): mulai, kepak, lanjut, atau restart. */
  function action() {
    switch (status.value) {
      case 'ready':
        status.value = 'playing'
        flap()
        break
      case 'playing':
        flap()
        break
      case 'paused':
        status.value = 'playing'
        break
      case 'over':
        if (performance.now() - overAt >= H.RESTART_DELAY_MS) restart()
        break
    }
  }

  function togglePause() {
    if (status.value === 'playing') status.value = 'paused'
    else if (status.value === 'paused') status.value = 'playing'
  }

  function restart() {
    world = createWorld()
    score.value = 0
    isNewRecord.value = false
    status.value = 'ready'
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.repeat) return
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault()
      action()
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      togglePause()
    } else if (e.code === 'Enter' && status.value === 'over') {
      action()
    }
  }

  function onVisibilityChange() {
    if (document.hidden && status.value === 'playing') status.value = 'paused'
  }

  onMounted(() => {
    highScore.value = readHighScore(GAME_ID)
    window.addEventListener('keydown', onKeydown)
    document.addEventListener('visibilitychange', onVisibilityChange)
    rafId = requestAnimationFrame(frame)
  })

  onBeforeUnmount(() => {
    if (rafId !== null) cancelAnimationFrame(rafId)
    window.removeEventListener('keydown', onKeydown)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    status: readonly(status),
    score: readonly(score),
    highScore: readonly(highScore),
    isNewRecord: readonly(isNewRecord),
    action,
    togglePause,
    restart,
  }
}
