// POST /api/auth/google — login dengan ID token dari Google Identity Services.
// Skor yang sudah dikumpulkan sebagai tamu dipindahkan ke akun Google.

interface GoogleTokenInfo {
  aud: string
  iss: string
  sub: string
  exp: string
  email?: string
  email_verified?: string
  name?: string
  picture?: string
}

export default defineEventHandler(async (event) => {
  const clientId = useRuntimeConfig().public.googleClientId
  if (!clientId) {
    throw createError({ statusCode: 501, statusMessage: 'Login Google belum dikonfigurasi' })
  }

  const body = await readBody<{ credential?: unknown }>(event)
  const credential = body?.credential
  if (typeof credential !== 'string' || credential.length > 4096) {
    throw createError({ statusCode: 400, statusMessage: 'Credential tidak valid' })
  }

  // Verifikasi tanda tangan & masa berlaku token oleh Google.
  const info = await $fetch<GoogleTokenInfo>('https://oauth2.googleapis.com/tokeninfo', {
    query: { id_token: credential },
  }).catch(() => null)

  const validIssuer = info?.iss === 'accounts.google.com' || info?.iss === 'https://accounts.google.com'
  if (!info || info.aud !== clientId || !validIssuer || Number(info.exp) * 1000 < Date.now()) {
    throw createError({ statusCode: 401, statusMessage: 'Token Google tidak valid' })
  }

  const previous = await getSessionPlayer(event)
  const player = await upsertGooglePlayer({
    sub: info.sub,
    name: (info.name || info.email?.split('@')[0] || 'Pemain').slice(0, 40),
    email: info.email,
    picture: info.picture,
  })

  if (previous?.kind === 'guest' && previous.id !== player.id) {
    await mergePlayerScores(previous.id, player.id)
    await deletePlayer(previous.id)
  }

  await setSessionPlayer(event, player.id)
  return toPublic(player)
})
