<script setup lang="ts">
// app/pages/games/orbit-defender.vue
useHead({ title: 'Orbit Defender — Arcade' })
</script>

<template>
  <GameShell game-id="orbit-defender" title="Orbit Defender" icon="🚀">
    <OrbitDefenderCanvas />
  </GameShell>
</template>
