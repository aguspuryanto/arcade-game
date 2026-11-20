// server/utils/players.ts — penyimpanan profil pemain + generator profil acak
import { randomInt, randomUUID } from 'node:crypto'
import type { PlayerKind, PublicPlayer } from '#shared/player'

export interface StoredPlayer extends PublicPlayer {
  kind: PlayerKind
  /** `sub` dari token Google (khusus akun Google). */
  googleSub?: string
  /** Disimpan tapi tidak pernah dikirim ke klien lain. */
  email?: string
  createdAt: number
}

const ADJECTIVES = [
  'Lincah', 'Gesit', 'Berani', 'Cerdik', 'Kilat', 'Santai', 'Ceria', 'Tangguh',
  'Misterius', 'Jenaka', 'Tenang', 'Nekat', 'Cepat', 'Bijak', 'Ajaib', 'Sakti',
]

const ANIMALS: Array<[string, string]> = [
  ['Rubah', '🦊'], ['Panda', '🐼'], ['Kucing', '🐱'], ['Harimau', '🐯'], ['Koala', '🐨'],
  ['Katak', '🐸'], ['Penguin', '🐧'], ['Burung Hantu', '🦉'], ['Gurita', '🐙'], ['Singa', '🦁'],
  ['Kelinci', '🐰'], ['Beruang', '🐻'], ['Lumba-lumba', '🐬'], ['Naga', '🐲'], ['Rakun', '🦝'],
  ['Landak', '🦔'], ['Unicorn', '🦄'], ['Kura-kura', '🐢'], ['Elang', '🦅'], ['Serigala', '🐺'],
]

const COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#38bdf8', '#818cf8', '#c084fc', '#f472b6']

const pick = <T>(arr: readonly T[]) => arr[randomInt(arr.length)]!

const storage = () => db()
const playerKey = (id: string) => `players:${id}`
const googleKey = (sub: string) => `google:${sub}`

export function randomProfile() {
  const [animal, avatar] = pick(ANIMALS)
  return {
    name: `${animal} ${pick(ADJECTIVES)} ${randomInt(10, 100)}`,
    avatar,
    color: pick(COLORS),
  }
}

export function toPublic(p: StoredPlayer): PublicPlayer {
  return { id: p.id, kind: p.kind, name: p.name, avatar: p.avatar, color: p.color, picture: p.picture }
}

export async function getPlayer(id: string) {
  return await storage().getItem<StoredPlayer>(playerKey(id))
}

export async function getPlayers(ids: string[]) {
  if (ids.length === 0) return new Map<string, StoredPlayer>()
  const items = await storage().getItems<StoredPlayer>(ids.map(playerKey))
  const list = items.map(i => i.value).filter((p): p is StoredPlayer => !!p)
  return new Map(list.map(p => [p.id, p]))
}

export async function savePlayer(player: StoredPlayer) {
  await storage().setItem(playerKey(player.id), player)
}

export async function deletePlayer(id: string) {
  await storage().removeItem(playerKey(id))
}

export async function createGuestPlayer() {
  const player: StoredPlayer = { id: randomUUID(), kind: 'guest', ...randomProfile(), createdAt: Date.now() }
  await savePlayer(player)
  return player
}

/** Buat atau perbarui pemain berdasarkan akun Google. */
export async function upsertGooglePlayer(info: { sub: string, name: string, email?: string, picture?: string }) {
  const existingId = await storage().getItem<string>(googleKey(info.sub))
  const existing = existingId ? await getPlayer(existingId) : null
  const player: StoredPlayer = existing
    ? { ...existing, name: info.name, email: info.email, picture: info.picture }
    : {
        id: randomUUID(),
        kind: 'google',
        googleSub: info.sub,
        name: info.name,
        email: info.email,
        picture: info.picture,
        avatar: '🙂',
        color: pick(COLORS),
        createdAt: Date.now(),
      }
  await savePlayer(player)
  await storage().setItem(googleKey(info.sub), player.id)
  return player
}
