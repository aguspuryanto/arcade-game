<script setup lang="ts">
// app/pages/games/snake.vue
useHead({ title: 'Snake — Arcade' })
</script>

<template>
  <GameShell game-id="snake" title="Snake" icon="🐍">
    <SnakeCanvas />
  </GameShell>
</template>
