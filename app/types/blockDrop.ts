// app/types/blockDrop.ts

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

export const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

/** Bentuk awal (rotasi 0) tiap balok. Rotasi lain dihitung dengan memutar matriks. */
export const PIECE_SHAPES: Record<PieceType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
}

export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#38bdf8',
  O: '#fbbf24',
  T: '#f472b6',
  S: '#34d399',
  Z: '#f87171',
  J: '#818cf8',
  L: '#fb923c',
}

export type Rotation = 0 | 1 | 2 | 3

export interface ActivePiece {
  type: PieceType
  rotation: Rotation
  x: number // kolom kiri kotak bentuk
  y: number // baris atas kotak bentuk (termasuk baris tersembunyi)
}

export type Cell = PieceType | null
export type Board = Cell[][]

export type BlockDropStatus = 'ready' | 'playing' | 'paused' | 'over'

export type BlockDropAction = 'left' | 'right' | 'softDrop' | 'rotateCW' | 'rotateCCW' | 'hardDrop' | 'hold'

/** Data yang dibutuhkan renderer setiap frame. */
export interface BlockDropView {
  board: Board
  piece: ActivePiece | null
  ghostY: number
  clearingRows: number[]
  clearProgress: number // 0..1 animasi hapus baris
}

export const BD = {
  COLS: 10,
  ROWS: 20, // baris yang terlihat
  HIDDEN_ROWS: 2, // baris di atas layar tempat balok muncul
  PREVIEW_COUNT: 3,

  LOCK_DELAY_MS: 500,
  MAX_LOCK_RESETS: 15,
  DAS_MS: 170, // jeda sebelum geser berulang saat tombol ditahan
  ARR_MS: 45, // kecepatan geser berulang
  SOFT_DROP_MS: 30,
  CLEAR_ANIM_MS: 250,

  LINES_PER_LEVEL: 10,
  LINE_SCORES: [0, 100, 300, 500, 800],
  SOFT_DROP_POINT: 1,
  HARD_DROP_POINT: 2,
} as const
