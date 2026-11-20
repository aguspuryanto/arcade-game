// GET /api/auth/me — profil pemain saat ini (otomatis dibuatkan profil tamu acak)
export default defineEventHandler(async (event) => {
  const player = await requirePlayer(event)
  return toPublic(player)
})
