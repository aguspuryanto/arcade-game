// POST /api/auth/reroll — acak ulang nama & avatar tamu (skor tetap tersimpan)
export default defineEventHandler(async (event) => {
  const player = await requirePlayer(event)
  if (player.kind !== 'guest') {
    throw createError({ statusCode: 400, statusMessage: 'Hanya profil tamu yang bisa diacak' })
  }
  const updated = { ...player, ...randomProfile() }
  await savePlayer(updated)
  return toPublic(updated)
})
