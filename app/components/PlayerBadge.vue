<script setup lang="ts">
// app/components/PlayerBadge.vue — profil pemain + login Google / acak profil tamu
const { player, ensure, loginWithGoogle, logout, reroll } = usePlayer()
const clientId = useRuntimeConfig().public.googleClientId as string

const googleBtn = ref<HTMLElement | null>(null)
const busy = ref(false)
const error = ref('')

const GSI_SRC = 'https://accounts.google.com/gsi/client'

interface GoogleId {
  initialize: (opts: { client_id: string, callback: (res: { credential: string }) => void }) => void
  renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void
}
const googleId = () => (window as unknown as { google?: { accounts?: { id?: GoogleId } } }).google?.accounts?.id

function loadGsi(): Promise<void> {
  if (googleId()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = GSI_SRC
      script.async = true
      document.head.appendChild(script)
    }
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Gagal memuat Google Sign-In')), { once: true })
  })
}

async function run(task: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await task()
  } catch (err: unknown) {
    error.value = (err as { statusMessage?: string })?.statusMessage || 'Terjadi kesalahan, coba lagi.'
  } finally {
    busy.value = false
  }
}

async function renderGoogleButton() {
  if (!clientId || player.value?.kind !== 'guest') return
  try {
    await loadGsi()
  } catch {
    return
  }
  await nextTick()
  const id = googleId()
  if (!id || !googleBtn.value) return
  id.initialize({
    client_id: clientId,
    callback: ({ credential }) => run(() => loginWithGoogle(credential)),
  })
  id.renderButton(googleBtn.value, {
    theme: 'filled_black', size: 'medium', shape: 'pill', text: 'signin_with', locale: 'id',
  })
}

onMounted(async () => {
  await ensure()
  renderGoogleButton()
})

// Setelah logout, pemain kembali menjadi tamu → tampilkan tombol Google lagi
watch(() => player.value?.kind, (kind, prev) => {
  if (kind === 'guest' && prev && prev !== 'guest') renderGoogleButton()
})
</script>

<template>
  <div class="badge-wrap">
    <div v-if="player" class="badge">
      <PlayerAvatar :player="player" :size="30" />
      <div class="who">
        <strong>{{ player.name }}</strong>
        <small>{{ player.kind === 'google' ? 'Akun Google' : 'Tamu' }}</small>
      </div>
      <button
        v-if="player.kind === 'guest'"
        type="button"
        class="icon-btn"
        title="Acak nama & avatar"
        aria-label="Acak nama dan avatar"
        :disabled="busy"
        @click="run(reroll)"
      >
        🎲
      </button>
      <button
        v-else
        type="button"
        class="text-btn"
        :disabled="busy"
        @click="run(logout)"
      >
        Keluar
      </button>
    </div>
    <div v-else class="badge placeholder">Memuat profil…</div>

    <div v-if="clientId && player?.kind === 'guest'" ref="googleBtn" class="google-btn" />
    <p v-if="error" class="error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.badge-wrap {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 4px;
  border-radius: 999px;
  background: #0f172a;
  border: 1px solid #1e293b;
  min-height: 40px;
}

.placeholder {
  padding: 4px 14px;
  font-size: 0.85rem;
  opacity: 0.6;
}

.who {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
  max-width: 180px;
}

.who strong {
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.who small {
  font-size: 0.7rem;
  opacity: 0.6;
}

.icon-btn,
.text-btn {
  border: none;
  cursor: pointer;
  color: inherit;
  background: #1e293b;
  border-radius: 999px;
  font: inherit;
}

.icon-btn {
  width: 30px;
  height: 30px;
  font-size: 1rem;
}

.text-btn {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.icon-btn:hover:not(:disabled),
.text-btn:hover:not(:disabled) {
  background: #334155;
}

button:disabled {
  opacity: 0.5;
  cursor: wait;
}

.google-btn {
  min-height: 32px;
}

.error {
  flex-basis: 100%;
  margin: 0;
  text-align: center;
  font-size: 0.8rem;
  color: #f87171;
}
</style>
