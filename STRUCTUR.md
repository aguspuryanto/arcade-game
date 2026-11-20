arcade-nuxt4/
├── app/
│   ├── components/
│   │   ├── GameShell.vue          # kerangka halaman game (kembali + judul + ClientOnly)
│   │   ├── SnakeCanvas.vue
│   │   ├── SkyHopperCanvas.vue
│   │   ├── SolitaireBoard.vue
│   │   ├── PlayingCard.vue        # satu kartu remi (dipakai Solitaire)
│   │   └── BlockDropCanvas.vue
│   ├── composables/
│   │   ├── useSnakeGame.ts
│   │   ├── useSkyHopperGame.ts
│   │   ├── useSolitaireGame.ts
│   │   └── useBlockDropGame.ts
│   ├── data/
│   │   └── games.ts               # katalog game untuk halaman pemilihan
│   ├── pages/
│   │   ├── index.vue              # pilih game
│   │   └── games/
│   │       ├── snake.vue
│   │       ├── sky-hopper.vue
│   │       ├── solitaire.vue
│   │       └── block-drop.vue
│   ├── types/
│   │   ├── snake.ts
│   │   ├── skyHopper.ts
│   │   ├── solitaire.ts
│   │   └── blockDrop.ts
│   ├── utils/
│   │   └── highScore.ts           # skor tertinggi per game (localStorage)
│   └── app.vue
├── nuxt.config.ts
└── package.json
