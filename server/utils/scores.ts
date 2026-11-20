// server/utils/scores.ts — skor terbaik per pemain per game
import { GAMES } from '#shared/games'

export interface ScoreRecord {
  score: number
  at: number
}

/** playerId -> skor terbaik */
export type ScoreTable = Record<string, ScoreRecord>

/** Batas atas skor yang masuk akal (cegah angka sembarangan). */
export const MAX_SCORE = 10_000_000

const storage = () => useStorage('data')
const scoresKey = (gameId: string) => `arcade:scores:${gameId}`

export function assertGameId(gameId: unknown): string {
  if (typeof gameId !== 'string' || !GAMES.some(g => g.id === gameId)) {
    throw createError({ statusCode: 400, statusMessage: 'Game tidak dikenal' })
  }
  return gameId
}

// Antrean tulis per game agar read-modify-write tidak saling menimpa.
const locks = new Map<string, Promise<unknown>>()
function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve()
  const next = prev.then(fn, fn)
  locks.set(key, next.catch(() => {}))
  return next
}

export async function readScores(gameId: string) {
  return (await storage().getItem<ScoreTable>(scoresKey(gameId))) ?? {}
}

/** Skor tertinggi dulu; seri → yang lebih dulu mencapainya menang. */
export function sortScores(table: ScoreTable) {
  return Object.entries(table).sort(([, a], [, b]) => b.score - a.score || a.at - b.at)
}

export function updateScores(gameId: string, mutate: (table: ScoreTable) => void) {
  return withLock(gameId, async () => {
    const table = await readScores(gameId)
    mutate(table)
    await storage().setItem(scoresKey(gameId), table)
    return table
  })
}

/** Pindahkan skor tamu ke akun Google (ambil yang tertinggi). */
export async function mergePlayerScores(fromId: string, toId: string) {
  for (const { id: gameId } of GAMES) {
    await updateScores(gameId, (table) => {
      const from = table[fromId]
      if (!from) return
      const to = table[toId]
      if (!to || from.score > to.score) table[toId] = from
      delete table[fromId]
    })
  }
}
