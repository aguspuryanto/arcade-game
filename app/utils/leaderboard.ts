// app/utils/leaderboard.ts — kirim skor ke leaderboard online
import type { SubmitScoreResponse } from '#shared/player'

/** Naik setiap kali data leaderboard berubah, agar komponen <Leaderboard> memuat ulang. */
export const leaderboardVersion = ref(0)

export function bumpLeaderboard() {
  leaderboardVersion.value++
}

/**
 * Kirim skor akhir sebuah permainan. Aman dipanggil dari mana saja (fire-and-forget);
 * kegagalan jaringan tidak mengganggu game.
 */
export async function submitScore(gameId: string, score: number): Promise<SubmitScoreResponse | null> {
  if (!import.meta.client || score <= 0) return null
  try {
    const res = await $fetch<SubmitScoreResponse>('/api/scores', {
      method: 'POST',
      body: { gameId, score: Math.floor(score) },
    })
    bumpLeaderboard()
    return res
  } catch (err) {
    console.warn('[arcade] Gagal mengirim skor', err)
    return null
  }
}
