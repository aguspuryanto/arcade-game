// server/utils/session.ts — sesi pemain berbasis cookie terenkripsi (h3 useSession)
import type { H3Event } from 'h3'

interface SessionData {
  playerId?: string
}

const DEV_FALLBACK_PASSWORD = 'arcade-dev-only-session-password-change-me!'
let warned = false

function sessionPassword() {
  const pw = useRuntimeConfig().sessionPassword
  if (pw && pw.length >= 32) return pw
  if (!import.meta.dev) {
    throw createError({ statusCode: 500, statusMessage: 'NUXT_SESSION_PASSWORD belum diset (min. 32 karakter)' })
  }
  if (!warned) {
    console.warn('[arcade] NUXT_SESSION_PASSWORD belum diset — memakai password dev bawaan.')
    warned = true
  }
  return DEV_FALLBACK_PASSWORD
}

export function getPlayerSession(event: H3Event) {
  return useSession<SessionData>(event, {
    name: 'arcade-session',
    password: sessionPassword(),
    maxAge: 60 * 60 * 24 * 365,
    cookie: { sameSite: 'lax', httpOnly: true, secure: !import.meta.dev },
  })
}

/** Pemain dari sesi saat ini, atau null jika belum punya sesi. */
export async function getSessionPlayer(event: H3Event) {
  const session = await getPlayerSession(event)
  const id = session.data.playerId
  return id ? await getPlayer(id) : null
}

/** Ambil pemain dari sesi; buat profil tamu acak jika belum ada. */
export async function requirePlayer(event: H3Event): Promise<StoredPlayer> {
  const player = await getSessionPlayer(event)
  if (player) return player
  const guest = await createGuestPlayer()
  await setSessionPlayer(event, guest.id)
  return guest
}

export async function setSessionPlayer(event: H3Event, playerId: string) {
  const session = await getPlayerSession(event)
  await session.update({ playerId })
}

export async function clearPlayerSession(event: H3Event) {
  const session = await getPlayerSession(event)
  await session.clear()
}
