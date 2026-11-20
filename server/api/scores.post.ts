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
  let improved = false
  const table = await updateScores(gameId, (t) => {
    const current = t[player.id]
    if (!current || score > current.score) {
      t[player.id] = { score, at: Date.now() }
      improved = true
    }
  })

  const rank = sortScores(table).findIndex(([id]) => id === player.id) + 1
  return { best: table[player.id]!.score, improved, rank }
})
