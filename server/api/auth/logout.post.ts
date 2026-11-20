// POST /api/auth/logout — keluar; pemain kembali menjadi tamu dengan profil acak baru
export default defineEventHandler(async (event) => {
  await clearPlayerSession(event)
  const guest = await createGuestPlayer()
  await setSessionPlayer(event, guest.id)
  return toPublic(guest)
})
