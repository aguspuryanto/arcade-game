// shared/player.ts — tipe data pemain & leaderboard (dipakai app & server)

export type PlayerKind = 'guest' | 'google'

/** Profil publik pemain (aman ditampilkan ke semua orang — tanpa email). */
export interface PublicPlayer {
  id: string
  kind: PlayerKind
  name: string
  /** Emoji avatar untuk profil acak. */
  avatar: string
  /** Warna latar avatar. */
  color: string
  /** Foto profil Google (jika login Google). */
  picture?: string
}

export interface LeaderboardEntry {
  rank: number
  player: PublicPlayer
  score: number
  /** Waktu skor terbaik dicapai (epoch ms). */
  at: number
  isMe: boolean
}

export interface LeaderboardResponse {
  gameId: string
  entries: LeaderboardEntry[]
  /** Posisi pemain saat ini (walau di luar daftar teratas). */
  me: { rank: number, score: number } | null
  totalPlayers: number
}

export interface SubmitScoreResponse {
  best: number
  improved: boolean
  rank: number
}
