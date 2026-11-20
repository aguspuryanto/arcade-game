<script setup lang="ts">
// app/pages/games/neon-paddle.vue
useHead({ title: 'Neon Paddle — Arcade' })
</script>

<template>
  <GameShell game-id="neon-paddle" title="Neon Paddle" icon="🏓" wide>
    <NeonPaddleCanvas />
  </GameShell>
</template>
