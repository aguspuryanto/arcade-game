<script setup lang="ts">
// app/pages/games/block-drop.vue
useHead({ title: 'Block Drop — Arcade' })
</script>

<template>
  <GameShell game-id="block-drop" title="Block Drop" icon="🧱" wide>
    <BlockDropCanvas />
  </GameShell>
</template>
