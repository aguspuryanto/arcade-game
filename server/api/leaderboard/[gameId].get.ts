// GET /api/leaderboard/:gameId?limit=10 — papan peringkat satu game
import type { LeaderboardResponse } from '#shared/player'

export default defineEventHandler(async (event): Promise<LeaderboardResponse> => {
  const gameId = assertGameId(getRouterParam(event, 'gameId'))
  const limit = Math.min(50, Math.max(1, Number(getQuery(event).limit) || 10))

  const me = await getSessionPlayer(event)
  const sorted = await readSortedScores(gameId)
  const top = sorted.slice(0, limit)
  const players = await getPlayers(top.map(([id]) => id))

  const entries = top.flatMap(([id, rec], i) => {
    const player = players.get(id)
    return player
      ? [{ rank: i + 1, player: toPublic(player), score: rec.score, at: rec.at, isMe: id === me?.id }]
      : []
  })

  const myIndex = me ? sorted.findIndex(([id]) => id === me.id) : -1
  return {
    gameId,
    entries,
    me: myIndex >= 0 ? { rank: myIndex + 1, score: sorted[myIndex]![1].score } : null,
    totalPlayers: sorted.length,
  }
})
