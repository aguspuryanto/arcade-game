// POST /api/scores — kirim skor akhir; hanya skor terbaik per pemain yang disimpan
import type { SubmitScoreResponse } from '#shared/player'

export default defineEventHandler(async (event): Promise<SubmitScoreResponse> => {
  const body = await readBody<{ gameId?: unknown, score?: unknown }>(event)
  const gameId = assertGameId(body?.gameId)
  const score = body?.score
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    throw createError({ statusCode: 400, statusMessage: 'Skor tidak valid' })
  }

  const player = await requirePlayer(event)
  const { best, improved } = await submitBestScore(gameId, player.id, score)
  const rank = (await readSortedScores(gameId)).findIndex(([id]) => id === player.id) + 1
  return { best, improved, rank }
})
