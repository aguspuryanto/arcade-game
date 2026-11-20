<script setup lang="ts">
// app/pages/index.vue — halaman pemilihan game
import { GAMES } from '~/data/games'

useHead({ title: 'Arcade — Pilih Game' })

const highScores = ref<Record<string, number>>({})

onMounted(() => {
  highScores.value = Object.fromEntries(GAMES.map(g => [g.id, readHighScore(g.id)]))
})
</script>

<template>
  <main class="hub">
    <header>
      <h1>🕹️ Arcade</h1>
      <p>Pilih game yang ingin kamu mainkan</p>
      <div class="actions">
        <ClientOnly>
          <PlayerBadge />
        </ClientOnly>
        <NuxtLink to="/leaderboard" class="lb-link">🏆 Leaderboard</NuxtLink>
      </div>
    </header>

    <ul class="grid">
      <li v-for="game in GAMES" :key="game.id">
        <NuxtLink
          v-if="game.available"
          :to="`/games/${game.id}`"
          class="card"
          :style="{ '--accent': game.color }"
        >
          <span class="icon" aria-hidden="true">{{ game.icon }}</span>
          <h2>{{ game.title }}</h2>
          <p>{{ game.description }}</p>
          <span class="badge">
            {{ highScores[game.id] ? `Tertinggi: ${highScores[game.id]}` : 'Main' }}
          </span>
        </NuxtLink>
        <div
          v-else
          class="card disabled"
          :style="{ '--accent': game.color }"
          aria-disabled="true"
        >
          <span class="icon" aria-hidden="true">{{ game.icon }}</span>
          <h2>{{ game.title }}</h2>
          <p>{{ game.description }}</p>
          <span class="badge">Segera hadir</span>
        </div>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.hub {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 16px;
}

header {
  text-align: center;
  margin-bottom: 32px;
}

h1 {
  margin: 0;
  font-size: 2.6rem;
}

header p {
  margin: 8px 0 0;
  opacity: 0.7;
}

.actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.lb-link {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #f59e0b;
  color: #f59e0b;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
}

.lb-link:hover {
  background: color-mix(in srgb, #f59e0b 15%, transparent);
}

.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  height: 100%;
  padding: 20px;
  border-radius: 16px;
  background: #0f172a;
  border: 1px solid #1e293b;
  color: inherit;
  text-decoration: none;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
}

a.card:hover,
a.card:focus-visible {
  transform: translateY(-3px);
  border-color: var(--accent);
  box-shadow: 0 8px 30px color-mix(in srgb, var(--accent) 25%, transparent);
  outline: none;
}

.card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon {
  font-size: 2.4rem;
}

.card h2 {
  margin: 0;
  font-size: 1.3rem;
}

.card p {
  margin: 0;
  flex: 1;
  font-size: 0.9rem;
  opacity: 0.75;
}

.badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
}
</style>
