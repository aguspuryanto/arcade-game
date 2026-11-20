<script setup lang="ts">
// app/pages/leaderboard.vue — papan peringkat semua game (pilih lewat tab, ?game=<id>)
import { GAMES } from '~/data/games'

useHead({ title: 'Leaderboard — Arcade' })

const route = useRoute()
const router = useRouter()
const playable = GAMES.filter(g => g.available)

const active = computed(() => {
  const q = route.query.game
  return playable.find(g => g.id === q) ?? playable[0]!
})

function select(id: string) {
  router.replace({ query: { game: id } })
}
</script>

<template>
  <main class="page">
    <nav class="top">
      <NuxtLink to="/" class="back">← Pilih game</NuxtLink>
    </nav>
    <h1>🏆 Leaderboard</h1>

    <ClientOnly>
      <PlayerBadge />
    </ClientOnly>

    <div class="tabs" role="tablist" aria-label="Pilih game">
      <button
        v-for="g in playable"
        :key="g.id"
        type="button"
        role="tab"
        class="tab"
        :class="{ active: g.id === active.id }"
        :aria-selected="g.id === active.id"
        :style="{ '--accent': g.color }"
        @click="select(g.id)"
      >
        <span aria-hidden="true">{{ g.icon }}</span> {{ g.title }}
      </button>
    </div>

    <ClientOnly>
      <Leaderboard :game-id="active.id" :limit="50" :title="`${active.icon} ${active.title} — Top 50`" />
    </ClientOnly>

    <NuxtLink :to="`/games/${active.id}`" class="play" :style="{ '--accent': active.color }">
      Main {{ active.title }} →
    </NuxtLink>
  </main>
</template>

<style scoped>
.page {
  max-width: 560px;
  margin: 0 auto;
  padding: 16px 16px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.top {
  align-self: stretch;
}

.back {
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.9rem;
}

.back:hover {
  color: #e2e8f0;
}

h1 {
  margin: 0;
  font-size: 2rem;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.tab {
  border: 1px solid #1e293b;
  background: #0f172a;
  color: inherit;
  font: inherit;
  font-size: 0.9rem;
  padding: 6px 14px;
  border-radius: 999px;
  cursor: pointer;
}

.tab:hover {
  border-color: var(--accent);
}

.tab.active {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  font-weight: 600;
}

.play {
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}

.play:hover {
  text-decoration: underline;
}
</style>
