# Arcade (Nuxt 4)

Kumpulan game browser dengan leaderboard online. Pemain bisa main sebagai tamu
(profil acak) atau login dengan Google.

## Development

```bash
bun install        # atau: npm install
bun run dev        # http://localhost:3000
```

Tanpa konfigurasi apa pun, data leaderboard disimpan di folder `.data/kv` dan login
Google disembunyikan. Salin `.env.example` ke `.env` untuk mengaktifkan fitur lain.

## Environment variables

| Variabel | Wajib di production | Keterangan |
|---|---|---|
| `NUXT_SESSION_PASSWORD` | ✅ | Kunci enkripsi cookie sesi, min. 32 karakter acak |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | ✅ | Database leaderboard. `KV_REST_API_URL` / `KV_REST_API_TOKEN` juga didukung |
| `NUXT_PUBLIC_GOOGLE_CLIENT_ID` | — | Aktifkan login Google. Kosong = hanya profil tamu |

## Deploy ke Vercel

Nuxt otomatis memakai preset `vercel` saat dibangun di Vercel — tidak perlu `vercel.json`.

1. **Buat project** — push ke GitHub/GitLab lalu *Import* di Vercel, atau jalankan
   `vercel link` dari folder ini. Framework terdeteksi sebagai Nuxt.
2. **Database** — di project Vercel: *Storage → Create → Upstash (Redis)* lalu hubungkan
   ke project (atau `vercel integration add upstash`). Env Redis terisi otomatis.
   Tanpa ini, API leaderboard akan menjawab 503 (game tetap bisa dimainkan).
3. **Session password** — *Settings → Environment Variables*, tambahkan
   `NUXT_SESSION_PASSWORD` (Production & Preview).
4. **Login Google (opsional)** — tambahkan `NUXT_PUBLIC_GOOGLE_CLIENT_ID`, lalu di Google
   Cloud Console masukkan domain Vercel (mis. `https://nama-project.vercel.app`) ke
   *Authorized JavaScript origins*. Perubahan env di Vercel baru berlaku di deployment
   berikutnya, jadi **redeploy** setelah mengubahnya.
5. **Deploy** — push ke branch utama, atau `vercel deploy --prod`.

Cek build Vercel secara lokal: `NITRO_PRESET=vercel bun run build` (hasil di `.vercel/output`).

## Struktur

Lihat [STRUCTUR.md](STRUCTUR.md).
