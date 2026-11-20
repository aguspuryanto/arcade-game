// server/utils/db.ts — penyimpanan key-value untuk pemain & skor.
// Production (Vercel): Upstash Redis — env UPSTASH_REDIS_REST_URL/TOKEN atau KV_REST_API_URL/TOKEN
//   dari integrasi Upstash di Vercel Marketplace, termasuk versi berprefix kustom
//   (mis. ARCADE_GAME_KV_REST_API_URL).
// Lokal tanpa env tersebut: folder .data/kv (Nitro storage `data`).
import type { Storage } from 'unstorage'
import { createStorage, prefixStorage } from 'unstorage'
import upstashDriver from 'unstorage/drivers/upstash'

let instance: Storage | null = null

/** Cari env berdasarkan nama persis, lalu nama yang berakhiran `_<nama>` (prefix kustom). */
function findEnv(...names: string[]) {
  const env = process.env
  for (const name of names) {
    if (env[name]) return env[name]
  }
  for (const name of names) {
    const hit = Object.keys(env).find(k => k.endsWith(`_${name}`) && env[k])
    if (hit) return env[hit]
  }
  return undefined
}

const isVercel = () => !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.VERCEL_URL)

export function db(): Storage {
  if (instance) return instance

  const url = findEnv('UPSTASH_REDIS_REST_URL', 'KV_REST_API_URL')
  const token = findEnv('UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN')

  if (url && token) {
    instance = createStorage({ driver: upstashDriver({ url, token, base: 'arcade' }) })
  } else if (isVercel()) {
    // Filesystem Vercel bersifat sementara — tolak daripada diam-diam kehilangan data.
    console.error('[arcade] Env Upstash Redis (KV_REST_API_URL/TOKEN) tidak ditemukan.')
    throw createError({
      statusCode: 503,
      statusMessage: 'Database leaderboard belum dikonfigurasi (hubungkan Upstash Redis di Vercel)',
    })
  } else {
    instance = prefixStorage(useStorage('data'), 'arcade')
  }
  return instance
}
