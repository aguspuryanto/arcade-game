<script setup lang="ts">
// app/components/Leaderboard.vue — papan peringkat satu game (memuat ulang otomatis saat ada skor baru)
import type { LeaderboardResponse } from '#shared/player'

const props = withDefaults(defineProps<{ gameId: string, limit?: number, title?: string }>(), {
  limit: 10,
  title: '🏆 Leaderboard',
})

const data = ref<LeaderboardResponse | null>(null)
const loading = ref(false)
const failed = ref(false)

async function load() {
  loading.value = true
  failed.value = false
  try {
    data.value = await $fetch<LeaderboardResponse>(`/api/leaderboard/${props.gameId}`, {
      query: { limit: props.limit },
    })
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([() => props.gameId, () => props.limit, leaderboardVersion], load)

const medal = (rank: number) => ['🥇', '🥈', '🥉'][rank - 1] ?? `#${rank}`
const meOutsideTop = computed(() => !!data.value?.me && !data.value.entries.some(e => e.isMe))
</script>

<template>
  <section class="board" aria-live="polite">
    <header>
      <h2>{{ title }}</h2>
      <button type="button" class="refresh" :disabled="loading" aria-label="Muat ulang leaderboard" @click="load">
        ↻
      </button>
    </header>

    <p v-if="failed" class="note">Leaderboard gagal dimuat.</p>
    <p v-else-if="!data" class="note">Memuat…</p>
    <p v-else-if="data.entries.length === 0" class="note">Belum ada skor. Jadilah yang pertama!</p>

    <ol v-else>
      <li v-for="e in data.entries" :key="e.player.id" :class="{ me: e.isMe, top: e.rank <= 3 }">
        <span class="rank">{{ medal(e.rank) }}</span>
        <PlayerAvatar :player="e.player" :size="28" />
        <span class="name">
          {{ e.player.name }}
          <small v-if="e.isMe">(kamu)</small>
        </span>
        <strong class="score">{{ e.score.toLocaleString('id-ID') }}</strong>
      </li>
    </ol>

    <p v-if="data && meOutsideTop" class="mine">
      Posisimu: <strong>#{{ data.me!.rank }}</strong> dari {{ data.totalPlayers }} pemain ·
      skor terbaik {{ data.me!.score.toLocaleString('id-ID') }}
    </p>
  </section>
</template>

<style scoped>
.board {
  width: 100%;
  max-width: 480px;
  padding: 16px;
  border-radius: 16px;
  background: #0f172a;
  border: 1px solid #1e293b;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

h2 {
  margin: 0;
  font-size: 1.1rem;
}

.refresh {
  border: none;
  background: #1e293b;
  color: inherit;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
}

.refresh:hover:not(:disabled) {
  background: #334155;
}

.refresh:disabled {
  opacity: 0.5;
}

ol {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 10px;
}

li.top {
  background: #111c33;
}

li.me {
  background: color-mix(in srgb, #38bdf8 18%, transparent);
  outline: 1px solid color-mix(in srgb, #38bdf8 50%, transparent);
}

.rank {
  width: 32px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
  opacity: 0.85;
}

li.top .rank {
  font-size: 1.2rem;
  opacity: 1;
}

.name {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.9rem;
}

.name small {
  opacity: 0.6;
}

.score {
  font-variant-numeric: tabular-nums;
}

.note,
.mine {
  margin: 8px 0 0;
  font-size: 0.85rem;
  opacity: 0.75;
  text-align: center;
}
</style>
