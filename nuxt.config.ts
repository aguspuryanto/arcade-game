// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  runtimeConfig: {
    // Kunci enkripsi cookie sesi (min. 32 karakter). Set lewat env NUXT_SESSION_PASSWORD.
    sessionPassword: '',
    public: {
      // OAuth Client ID (tipe "Web application") dari Google Cloud Console.
      // Set lewat env NUXT_PUBLIC_GOOGLE_CLIENT_ID. Kosong = login Google disembunyikan.
      googleClientId: '',
    },
  },
})
