<script setup lang="ts">
// app/components/PlayerAvatar.vue — foto Google atau emoji di lingkaran berwarna
import type { PublicPlayer } from '#shared/player'

const props = withDefaults(defineProps<{ player: PublicPlayer, size?: number }>(), { size: 32 })
const imgFailed = ref(false)
const showImg = computed(() => !!props.player.picture && !imgFailed.value)
</script>

<template>
  <span
    class="avatar"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.6}px`, background: player.color }"
    aria-hidden="true"
  >
    <img
      v-if="showImg"
      :src="player.picture"
      alt=""
      referrerpolicy="no-referrer"
      @error="imgFailed = true"
    >
    <template v-else>{{ player.avatar }}</template>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  line-height: 1;
}

img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
