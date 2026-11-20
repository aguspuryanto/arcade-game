// app/types/skyHopper.ts

export type HopperStatus = 'ready' | 'playing' | 'paused' | 'over'

export interface Bird {
  x: number
  y: number
  vy: number // kecepatan vertikal (px/detik), positif = turun
  rotation: number // radian
  flapTime: number // waktu sejak kepakan terakhir (untuk animasi sayap)
}

export interface Pillar {
  x: number // sisi kiri pilar
  gapY: number // titik tengah celah
  gapSize: number
  passed: boolean
}

/** Dunia game: data yang berubah tiap frame, sengaja TIDAK reaktif agar ringan. */
export interface HopperWorld {
  bird: Bird
  pillars: Pillar[]
  groundOffset: number
  time: number
}

// Semua ukuran dalam piksel logis canvas
export const HOPPER = {
  WIDTH: 360,
  HEIGHT: 640,
  GROUND_HEIGHT: 80,

  BIRD_X: 100,
  BIRD_RADIUS: 14,
  GRAVITY: 1600, // px/s²
  FLAP_VELOCITY: -470, // px/s
  MAX_FALL_SPEED: 720,

  PILLAR_WIDTH: 64,
  PILLAR_SPACING: 210, // jarak horizontal antar pilar
  GAP_START: 170,
  GAP_MIN: 125,
  GAP_SHRINK_PER_POINT: 1.5,
  GAP_MARGIN: 60, // jarak minimal celah dari atas/tanah

  SPEED_START: 150, // px/s
  SPEED_MAX: 240,
  SPEED_PER_POINT: 3,

  STEP: 1 / 120, // fixed timestep fisika (detik)
  RESTART_DELAY_MS: 500, // cegah restart tak sengaja tepat setelah kalah
} as const
