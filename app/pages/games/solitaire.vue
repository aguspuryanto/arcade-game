<script setup lang="ts">
// app/pages/games/solitaire.vue
useHead({ title: 'Solitaire — Arcade' })
</script>

<template>
  <GameShell game-id="solitaire" title="Solitaire" icon="🃏" wide>
    <SolitaireBoard />
  </GameShell>
</template>
