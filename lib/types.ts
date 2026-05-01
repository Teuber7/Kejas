// Spanish Card Types
export type Suit = 'oros' | 'copas' | 'espadas' | 'bastos'

export interface Card {
  suit: Suit
  value: number // 1-7, 10-12 (no 8, 9 in Spanish deck)
  id: string // Unique identifier for the card
}

// Ranking of cards from lowest to highest within a suit
// 1 (As), 2, 3, 4, 5, 6, 7, 10 (Sota), 11 (Caballo), 12 (Rey)
export const CARD_VALUES = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const
export const SUITS: Suit[] = ['oros', 'copas', 'espadas', 'bastos']

// Card value ranking (higher index = higher value)
export const CARD_RANK: Record<number, number> = {
  1: 0,  // As (lowest)
  2: 1,
  3: 2,
  4: 3,
  5: 4,
  6: 5,
  7: 6,
  10: 7, // Sota
  11: 8, // Caballo
  12: 9, // Rey (highest)
}

// Profile type
export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  games_played: number
  games_won: number
  total_score: number
  created_at: string
  updated_at: string
}

// Room type
export interface Room {
  id: string
  code: string
  name: string
  host_id: string
  status: 'waiting' | 'playing' | 'finished'
  max_players: number
  created_at: string
  updated_at: string
}

// Room player type
export interface RoomPlayer {
  id: string
  room_id: string
  player_id: string
  seat_position: number
  is_ready: boolean
  joined_at: string
  profile?: Profile
}

// Played card in a trick
export interface PlayedCard {
  playerId: string
  card: Card
}

// Game state type
export interface GameState {
  id: string
  room_id: string
  current_round: number
  cards_per_round: number
  trump_suit: Suit | null
  trump_card: Card | null
  current_phase: 'dealing' | 'predicting' | 'playing' | 'scoring' | 'tiebreaking' | 'finished'
  current_turn_player_id: string | null
  dealer_player_id: string | null
  lead_suit: Suit | null
  current_trick: PlayedCard[]
  tricks_played: number
  round_scores: Record<string, number>
  total_scores: Record<string, number>
  predictions: Record<string, number>
  tricks_won: Record<string, number>
  tiebreak_players: string[] | null
  created_at: string
  updated_at: string
}

// Player hand type
export interface PlayerHand {
  id: string
  game_state_id: string
  player_id: string
  cards: Card[]
}

// Game history type
export interface GameHistory {
  id: string
  room_id: string | null
  room_name: string
  winner_id: string | null
  final_scores: Record<string, number>
  player_ids: string[]
  rounds_played: number
  duration_minutes: number | null
  created_at: string
}

// Round sequence for Pronóstico (14 rounds total)
// 1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1
export const ROUND_CARDS = [1, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1] as const

// Realtime payload types
export interface RealtimeGameAction {
  type: 'card_played' | 'prediction_made' | 'trick_won' | 'round_ended' | 'game_ended' | 'turn_changed' | 'state_sync'
  payload: unknown
  player_id: string
  timestamp: number
}

export interface RealtimePresence {
  player_id: string
  display_name: string
  online_at: string
}
