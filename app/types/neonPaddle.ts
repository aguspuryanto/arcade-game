// app/types/neonPaddle.ts — tipe & konstanta Neon Paddle (game pingpong lawan CPU)

export type PaddleStatus = 'ready' | 'playing' | 'paused' | 'over'

export interface Paddle {
  /** Titik tengah vertikal paddle. */
  y: number
  /** Kecepatan vertikal terakhir (px/detik), dipakai untuk efek putaran bola. */
  vy: number
}

export interface Ball {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
}

export interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number // detik tersisa
  color: string
}

/** Dunia game: data yang berubah tiap frame, sengaja TIDAK reaktif agar ringan. */
export interface PaddleWorld {
  player: Paddle
  cpu: Paddle
  ball: Ball
  trail: Array<{ x: number, y: number }>
  sparks: Spark[]
  /** Detik tersisa sebelum bola diluncurkan (jeda setelah gol). */
  serveTimer: number
  /** Arah servis berikutnya: -1 = ke pemain, 1 = ke CPU. */
  serveDir: -1 | 1
  /** Kilatan layar setelah gol (detik tersisa) & siapa yang mencetak. */
  flash: number
  flashSide: 'player' | 'cpu'
  /** Target Y dari mouse/sentuhan; null = pakai keyboard. */
  pointerY: number | null
  time: number
}

// Semua ukuran dalam piksel logis canvas
export const PADDLE = {
  WIDTH: 640,
  HEIGHT: 400,

  PADDLE_W: 12,
  PADDLE_H: 80,
  PADDLE_MARGIN: 24, // jarak paddle dari tepi kiri/kanan
  PLAYER_SPEED: 520, // px/s dengan keyboard
  POINTER_SPEED: 1400, // px/s maksimum saat mengikuti mouse/sentuhan

  BALL_RADIUS: 7,
  BALL_SPEED_START: 340,
  BALL_SPEED_HIT: 16, // tambahan kecepatan setiap pukulan
  BALL_SPEED_MAX: 880,
  MAX_BOUNCE_ANGLE: Math.PI / 3, // 60° saat bola kena ujung paddle
  SPIN: 0.18, // pengaruh gerak paddle pada arah bola

  // Nilai CPU disetel lewat simulasi: awalnya ±10–25% tembakan lolos, turun bertahap tiap gol.
  CPU_SPEED_START: 175,
  CPU_SPEED_PER_GOAL: 10, // CPU makin cepat setiap kali kebobolan
  CPU_SPEED_MAX: 480,
  CPU_ERROR: 46, // meleset acak maksimum (px) saat CPU membidik
  CPU_REACT_X: 0.6, // CPU baru membaca arah bola setelah bola melewati titik ini (fraksi lebar)
  CPU_REACT_PER_GOAL: 0.01, // ...dan bereaksi makin awal setiap kebobolan

  LIVES: 3,
  POINTS_HIT: 1, // memantulkan bola
  POINTS_GOAL: 5, // membobol gawang CPU

  SERVE_DELAY: 0.9, // detik
  TRAIL_LENGTH: 10,
  STEP: 1 / 120, // fixed timestep fisika (detik)
  RESTART_DELAY_MS: 500,
} as const
