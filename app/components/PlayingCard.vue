<script setup lang="ts">
// app/components/PlayingCard.vue — satu kartu remi. Ukuran dari CSS var --cw / --ch.
import type { Card } from '~/types/solitaire'
import { RANK_LABEL, SUIT_SYMBOL, isRed } from '~/types/solitaire'

const props = defineProps<{ card: Readonly<Card> }>()

const rank = computed(() => RANK_LABEL[props.card.rank])
const symbol = computed(() => SUIT_SYMBOL[props.card.suit])
const isFaceCard = computed(() => props.card.rank > 10)
</script>

<template>
  <div
    class="card"
    :class="card.faceUp ? ['face', isRed(card.suit) ? 'red' : 'black'] : 'back'"
    :aria-label="card.faceUp ? `${rank} ${card.suit}` : 'kartu tertutup'"
  >
    <template v-if="card.faceUp">
      <span class="corner top">{{ rank }}<span class="sym">{{ symbol }}</span></span>
      <span class="center" :class="{ face: isFaceCard }">
        <template v-if="isFaceCard">{{ rank }}</template>{{ symbol }}
      </span>
      <span class="corner bottom">{{ rank }}<span class="sym">{{ symbol }}</span></span>
    </template>
  </div>
</template>

<style scoped>
.card {
  position: relative;
  width: var(--cw);
  height: var(--ch);
  border-radius: calc(var(--cw) * 0.08);
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.45);
  user-select: none;
  touch-action: none;
}

.face {
  background: #fdfcf7;
  border: 1px solid #cbd5e1;
  cursor: grab;
}

.red {
  color: #dc2626;
}

.black {
  color: #111827;
}

.back {
  border: calc(var(--cw) * 0.05) solid #f8fafc;
  background:
    repeating-linear-gradient(45deg, rgb(255 255 255 / 0.12) 0 4px, transparent 4px 8px),
    linear-gradient(135deg, #1d4ed8, #7c3aed);
}

.corner {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: 700;
  font-size: calc(var(--cw) * 0.2);
  line-height: 1;
}

.corner .sym {
  font-size: 0.9em;
}

.top {
  top: calc(var(--cw) * 0.06);
  left: calc(var(--cw) * 0.07);
}

.bottom {
  bottom: calc(var(--cw) * 0.06);
  right: calc(var(--cw) * 0.07);
  transform: rotate(180deg);
}

.center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--cw) * 0.42);
}

.center.face {
  font-size: calc(var(--cw) * 0.3);
  font-weight: 700;
  gap: 2px;
}
</style>
