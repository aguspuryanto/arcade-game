// app/types/snake.ts
export interface Vec2 {
    readonly x: number
    readonly y: number
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'

export interface GameState {
    snake: Vec2[] // Head ada di index 0
    direction: Direction
    nextDirections: Direction[] // Buffer input
    food: Vec2
    score: number
    highScore: number
    isGameOver: boolean
    isPaused: boolean
    tickMs: number
    boardSize: number
}

export const BOARD_SIZE = 20
export const INITIAL_TICK_MS = 150
export const MIN_TICK_MS = 60