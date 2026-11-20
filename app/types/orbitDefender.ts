// app/types/orbitDefender.ts — tipe & konstanta Orbit Defender (shooter formasi musuh)

export type DefenderStatus = 'ready' | 'playing' | 'paused' | 'over'

export type EnemyKind = 'scout' | 'drone' | 'grunt'

export type PowerKind = 'rapid' | 'shield'

export interface Enemy {
  /** Posisi relatif terhadap formasi (kolom/baris). */
  col: number
  row: number
  kind: EnemyKind
  alive: boolean
}

export interface Bullet {
  x: number
  y: number
  vy: number
}

export interface PowerUp {
  x: number
  y: number
  kind: PowerKind
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
}

export interface Star {
  x: number
  y: number
  speed: number
  size: number
}

/** Dunia game: data yang berubah tiap frame, sengaja TIDAK reaktif agar ringan. */
export interface DefenderWorld {
  shipX: number
  /** Detik kebal tersisa setelah terkena tembakan. */
  invulnerable: number
  fireCooldown: number
  rapidTime: number
  shield: boolean

  enemies: Enemy[]
  /** Posisi kiri-atas formasi. */
  formationX: number
  formationY: number
  formationDir: 1 | -1
  enemyFireTimer: number

  shots: Bullet[]
  enemyShots: Bullet[]
  powerUps: PowerUp[]
  particles: Particle[]
  stars: Star[]

  /** Detik tersisa untuk banner "Gelombang N". */
  bannerTime: number
  /** Detik tersisa layar bergetar. */
  shake: number
  time: number
}

/** Input dari keyboard / pointer. */
export interface DefenderInput {
  left: boolean
  right: boolean
  fire: boolean
  /** Target X dari pointer; null = pakai keyboard. */
  pointerX: number | null
}

// Semua ukuran dalam piksel logis canvas
export const DEFENDER = {
  WIDTH: 480,
  HEIGHT: 640,

  SHIP_Y: 590,
  SHIP_W: 36,
  SHIP_H: 22,
  SHIP_SPEED: 320, // px/s dengan keyboard
  POINTER_SPEED: 900, // px/s maks saat mengikuti pointer
  FIRE_COOLDOWN: 0.3, // detik
  RAPID_COOLDOWN: 0.13,
  MAX_SHOTS: 3,
  SHOT_SPEED: 640,
  INVULNERABLE_TIME: 2,

  COLS: 9,
  ROWS: 5,
  CELL_W: 42,
  CELL_H: 36,
  ENEMY_SIZE: 24,
  FORMATION_TOP: 90,
  FORMATION_TOP_PER_WAVE: 12, // formasi mulai lebih rendah tiap gelombang...
  FORMATION_TOP_MAX: 150, // ...sampai batas ini
  SIDE_MARGIN: 12,
  STEP_DOWN: 14,
  MARCH_SPEED: 28, // px/s di gelombang 1
  MARCH_SPEED_PER_WAVE: 6,
  MARCH_SPEEDUP: 2.6, // pengali tambahan saat musuh tinggal sedikit

  ENEMY_FIRE_RATE: 0.5, // tembakan/detik (seluruh formasi) di gelombang 1
  ENEMY_FIRE_RATE_PER_WAVE: 0.12,
  ENEMY_FIRE_RATE_MAX: 1.6,
  ENEMY_AIM_CHANCE: 0.25, // peluang musuh terdekat kapal yang menembak
  ENEMY_SHOT_SPEED: 200,
  ENEMY_SHOT_SPEED_PER_WAVE: 12,

  POINTS: { scout: 30, drone: 20, grunt: 10 },
  WAVE_BONUS: 100, // × nomor gelombang

  POWER_DROP_CHANCE: 0.07,
  POWER_FALL_SPEED: 120,
  RAPID_TIME: 8,

  LIVES: 3,
  BANNER_TIME: 1.6,
  STAR_COUNT: 70,
  STEP: 1 / 120,
  RESTART_DELAY_MS: 600,
} as const

export const ENEMY_COLORS: Record<EnemyKind, string> = {
  scout: '#f472b6',
  drone: '#a78bfa',
  grunt: '#22d3ee',
}
