<script setup lang="ts">
// app/components/GameShell.vue — kerangka halaman game (kembali + judul + profil + leaderboard)
defineProps<{ title: string, icon?: string, wide?: boolean, gameId?: string }>()
</script>

<template>
  <main class="shell">
    <header :class="{ wide }">
      <nav class="top">
        <NuxtLink to="/" class="back">← Pilih game</NuxtLink>
        <NuxtLink v-if="gameId" :to="`/leaderboard?game=${gameId}`" class="back">🏆 Peringkat</NuxtLink>
      </nav>
      <h1><span v-if="icon" aria-hidden="true">{{ icon }} </span>{{ title }}</h1>
    </header>
    <ClientOnly>
      <PlayerBadge />
      <slot />
      <Leaderboard v-if="gameId" :game-id="gameId" />
      <template #fallback>
        <p class="loading">Memuat game…</p>
      </template>
    </ClientOnly>
  </main>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 16px 24px;
  gap: 12px;
}

header {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

header.wide {
  max-width: 760px;
}

.top {
  align-self: stretch;
  display: flex;
  justify-content: space-between;
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

.loading {
  opacity: 0.7;
}
</style>
