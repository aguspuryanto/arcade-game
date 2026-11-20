// app/types/solitaire.ts

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
}

export const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds'

export interface Card {
  id: string
  suit: Suit
  rank: number // 1 (As) – 13 (King)
  faceUp: boolean
}

export type PileRef =
  | { kind: 'stock' }
  | { kind: 'waste' }
  | { kind: 'foundation', index: number }
  | { kind: 'tableau', index: number }

export interface Piles {
  stock: Card[]
  waste: Card[]
  foundations: Card[][] // 4 tumpukan, satu per jenis
  tableau: Card[][] // 7 kolom
}

export type DrawCount = 1 | 3

export type SolitaireStatus = 'playing' | 'won'

export const SCORE = {
  WASTE_TO_TABLEAU: 5,
  TO_FOUNDATION: 10,
  FLIP_CARD: 5,
  FOUNDATION_TO_TABLEAU: -15,
  TIME_BONUS_BASE: 700_000, // bonus menang = BASE / detik (jika > 30 detik)
} as const

export const MAX_UNDO = 300
