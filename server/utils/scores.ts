// server/utils/scores.ts — skor terbaik per pemain per game.
// Satu key per pemain per game (`scores:<gameId>:<playerId>`), jadi aman dipakai
// banyak instance serverless sekaligus tanpa saling menimpa.
import { GAMES } from '#shared/games'

export interface ScoreRecord {
  score: number
  at: number
}

/** Batas atas skor yang masuk akal (cegah angka sembarangan). */
export const MAX_SCORE = 10_000_000

const prefix = (gameId: string) => `scores:${gameId}`
const scoreKey = (gameId: string, playerId: string) => `${prefix(gameId)}:${playerId}`

export function assertGameId(gameId: unknown): string {
  if (typeof gameId !== 'string' || !GAMES.some(g => g.id === gameId)) {
    throw createError({ statusCode: 400, statusMessage: 'Game tidak dikenal' })
  }
  return gameId
}

/** Semua skor satu game, diurutkan: tertinggi dulu; seri → yang lebih dulu mencapainya menang. */
export async function readSortedScores(gameId: string): Promise<Array<[string, ScoreRecord]>> {
  const keys = await db().getKeys(prefix(gameId))
  if (keys.length === 0) return []
  const items = await db().getItems<ScoreRecord>(keys)
  return items
    .filter(({ value }) => value && typeof value.score === 'number')
    .map(({ key, value }) => [key.split(':').pop()!, value!] as [string, ScoreRecord])
    .sort(([, a], [, b]) => b.score - a.score || a.at - b.at)
}

export async function getScore(gameId: string, playerId: string) {
  return await db().getItem<ScoreRecord>(scoreKey(gameId, playerId))
}

/** Simpan skor jika lebih tinggi dari skor terbaik pemain. */
export async function submitBestScore(gameId: string, playerId: string, score: number) {
  const current = await getScore(gameId, playerId)
  if (current && current.score >= score) return { best: current.score, improved: false }
  await db().setItem(scoreKey(gameId, playerId), { score, at: Date.now() })
  return { best: score, improved: true }
}

/** Pindahkan skor tamu ke akun Google (ambil yang tertinggi). */
export async function mergePlayerScores(fromId: string, toId: string) {
  await Promise.all(GAMES.map(async ({ id: gameId }) => {
    const from = await getScore(gameId, fromId)
    if (!from) return
    const to = await getScore(gameId, toId)
    if (!to || from.score > to.score) await db().setItem(scoreKey(gameId, toId), from)
    await db().removeItem(scoreKey(gameId, fromId))
  }))
}
