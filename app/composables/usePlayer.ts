// app/composables/usePlayer.ts — profil pemain saat ini (tamu acak atau akun Google)
import type { PublicPlayer } from '#shared/player'

export function usePlayer() {
  const player = useState<PublicPlayer | null>('arcade:player', () => null)
  const loading = useState('arcade:player:loading', () => false)

  async function refresh() {
    loading.value = true
    try {
      player.value = await $fetch<PublicPlayer>('/api/auth/me')
    } finally {
      loading.value = false
    }
  }

  /** Panggil sekali di onMounted; tidak fetch ulang jika sudah ada. */
  async function ensure() {
    if (!player.value && !loading.value) await refresh()
  }

  async function loginWithGoogle(credential: string) {
    player.value = await $fetch<PublicPlayer>('/api/auth/google', { method: 'POST', body: { credential } })
    bumpLeaderboard()
  }

  async function logout() {
    player.value = await $fetch<PublicPlayer>('/api/auth/logout', { method: 'POST' })
    bumpLeaderboard()
  }

  async function reroll() {
    player.value = await $fetch<PublicPlayer>('/api/auth/reroll', { method: 'POST' })
    bumpLeaderboard()
  }

  return { player: readonly(player), loading: readonly(loading), refresh, ensure, loginWithGoogle, logout, reroll }
}
