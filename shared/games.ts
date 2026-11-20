// shared/games.ts — dipakai app & server (validasi gameId leaderboard)
// Katalog game. Tambahkan entri baru di sini saat game baru selesai dibuat.

export interface GameInfo {
  id: string
  title: string
  description: string
  icon: string
  color: string
  available: boolean
}

export const GAMES: GameInfo[] = [
  {
    id: 'snake',
    title: 'Snake',
    description: 'Makan sebanyak mungkin tanpa menabrak dinding atau tubuh sendiri.',
    icon: '🐍',
    color: '#4ade80',
    available: true,
  },
  {
    id: 'sky-hopper',
    title: 'Sky Hopper',
    description: 'Ketuk untuk mengepak, terbang melewati celah pilar kristal.',
    icon: '🐦',
    color: '#38bdf8',
    available: true,
  },
  {
    id: 'solitaire',
    title: 'Solitaire',
    description: 'Susun kartu dari As sampai King di setiap fondasi.',
    icon: '🃏',
    color: '#f59e0b',
    available: true,
  },
  {
    id: 'block-drop',
    title: 'Block Drop',
    description: 'Putar dan jatuhkan balok untuk melengkapi baris.',
    icon: '🧱',
    color: '#a78bfa',
    available: true,
  },
  {
    id: 'neon-paddle',
    title: 'Neon Paddle',
    description: 'Duel pingpong lawan CPU. Pantulkan bola dan bobol gawang lawan.',
    icon: '🏓',
    color: '#22d3ee',
    available: true,
  },
  {
    id: 'orbit-defender',
    title: 'Orbit Defender',
    description: 'Tembak jatuh formasi musuh sebelum mereka mencapai pangkalanmu.',
    icon: '🚀',
    color: '#f472b6',
    available: true,
  },
]
