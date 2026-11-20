// app/utils/highScore.ts
// Penyimpanan skor tertinggi per game di localStorage (aman untuk SSR & private mode).

const PREFIX = 'arcade:highScore:'

export function readHighScore(gameId: string): number {
  if (!import.meta.client) return 0
  try {
    return Number(localStorage.getItem(PREFIX + gameId)) || 0
  } catch {
    return 0
  }
}

export function saveHighScore(gameId: string, value: number) {
  if (!import.meta.client) return
  try {
    localStorage.setItem(PREFIX + gameId, String(value))
  } catch {
    /* storage tidak tersedia — abaikan */
  }
}
