<script setup lang="ts">
// app/pages/games/sky-hopper.vue
useHead({ title: 'Sky Hopper — Arcade' })
</script>

<template>
  <GameShell game-id="sky-hopper" title="Sky Hopper" icon="🐦">
    <SkyHopperCanvas />
  </GameShell>
</template>
