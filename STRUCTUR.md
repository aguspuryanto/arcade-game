arcade-nuxt4/
├── app/
│   ├── components/
│   │   ├── GameShell.vue          # kerangka halaman game (kembali + judul + profil + leaderboard)
│   │   ├── Leaderboard.vue        # papan peringkat satu game
│   │   ├── PlayerBadge.vue        # profil pemain + tombol login Google / acak profil tamu
│   │   ├── PlayerAvatar.vue       # foto Google atau emoji avatar
│   │   ├── SnakeCanvas.vue
│   │   ├── SkyHopperCanvas.vue
│   │   ├── SolitaireBoard.vue
│   │   ├── PlayingCard.vue        # satu kartu remi (dipakai Solitaire)
│   │   ├── BlockDropCanvas.vue
│   │   └── NeonPaddleCanvas.vue
│   ├── composables/
│   │   ├── usePlayer.ts           # state pemain saat ini (tamu / Google)
│   │   ├── useSnakeGame.ts
│   │   ├── useSkyHopperGame.ts
│   │   ├── useSolitaireGame.ts
│   │   ├── useBlockDropGame.ts
│   │   └── useNeonPaddleGame.ts
│   ├── data/
│   │   └── games.ts               # re-export dari shared/games.ts
│   ├── pages/
│   │   ├── index.vue              # pilih game
│   │   ├── leaderboard.vue        # leaderboard semua game (?game=<id>)
│   │   └── games/
│   │       ├── snake.vue
│   │       ├── sky-hopper.vue
│   │       ├── solitaire.vue
│   │       ├── block-drop.vue
│   │       └── neon-paddle.vue
│   ├── types/
│   │   ├── snake.ts
│   │   ├── skyHopper.ts
│   │   ├── solitaire.ts
│   │   ├── blockDrop.ts
│   │   └── neonPaddle.ts
│   ├── utils/
│   │   ├── highScore.ts           # skor tertinggi per game (localStorage)
│   │   └── leaderboard.ts         # submitScore() → kirim skor ke server
│   └── app.vue
├── shared/
│   ├── games.ts                   # katalog game (dipakai app & server)
│   └── player.ts                  # tipe pemain & leaderboard
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── me.get.ts          # profil saat ini (otomatis buat tamu acak)
│   │   │   ├── google.post.ts     # login Google (verifikasi ID token, gabung skor tamu)
│   │   │   ├── logout.post.ts     # keluar → jadi tamu baru
│   │   │   └── reroll.post.ts     # acak ulang nama/avatar tamu
│   │   ├── scores.post.ts         # kirim skor (hanya skor terbaik disimpan)
│   │   └── leaderboard/[gameId].get.ts
│   └── utils/
│       ├── session.ts             # cookie sesi terenkripsi
│       ├── players.ts             # penyimpanan profil + generator profil acak
│       └── scores.ts              # penyimpanan skor per game
├── .env.example                   # NUXT_SESSION_PASSWORD, NUXT_PUBLIC_GOOGLE_CLIENT_ID
├── nuxt.config.ts
└── package.json

Data leaderboard disimpan lewat Nitro storage `data` (default: folder `.data/kv`).
