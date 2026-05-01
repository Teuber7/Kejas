import { Card, Suit, SUITS, CARD_VALUES, CARD_RANK, PlayedCard, ROUND_CARDS } from './types'
import { nanoid } from 'nanoid'

// Create a full Spanish deck (40 cards)
export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const value of CARD_VALUES) {
      deck.push({
        suit,
        value,
        id: nanoid(),
      })
    }
  }
  return deck
}

// Shuffle a deck using Fisher-Yates algorithm
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Deal cards to players
export function dealCards(
  deck: Card[],
  playerIds: string[],
  cardsPerPlayer: number
): { hands: Record<string, Card[]>; trumpCard: Card | null; remainingDeck: Card[] } {
  const shuffledDeck = [...deck]
  const hands: Record<string, Card[]> = {}
  
  // Deal cards to each player
  for (const playerId of playerIds) {
    hands[playerId] = shuffledDeck.splice(0, cardsPerPlayer)
  }
  
  // Trump card is the next card after dealing (if there are cards left)
  const trumpCard = shuffledDeck.length > 0 ? shuffledDeck[0] : null
  
  return {
    hands,
    trumpCard,
    remainingDeck: shuffledDeck,
  }
}

// Get the number of cards for a specific round
export function getCardsForRound(round: number): number {
  return ROUND_CARDS[round - 1] ?? 1
}

// Detect if a trick ends in a tie (same value, non-trump cards at the top)
// Returns array of tied player IDs, or null if there is a clear winner
export function findTiedPlayers(
  trick: PlayedCard[],
  trumpSuit: Suit | null
): string[] | null {
  if (trick.length < 2) return null

  // If any trump cards were played, the highest trump wins outright — no tie possible
  const trumpCards = trumpSuit ? trick.filter(p => p.card.suit === trumpSuit) : []
  if (trumpCards.length > 0) return null

  // No trump: find the highest value among all cards
  const maxRank = Math.max(...trick.map(p => CARD_RANK[p.card.value]))
  const topPlays = trick.filter(p => CARD_RANK[p.card.value] === maxRank)

  return topPlays.length > 1 ? topPlays.map(p => p.playerId) : null
}

// Determine the winner of a trick
export function determineTrickWinner(
  trick: PlayedCard[],
  trumpSuit: Suit | null,
  leadSuit: Suit
): string {
  if (trick.length === 0) {
    throw new Error('Cannot determine winner of empty trick')
  }

  let winningPlay = trick[0]
  
  for (let i = 1; i < trick.length; i++) {
    const currentPlay = trick[i]
    const currentCard = currentPlay.card
    const winningCard = winningPlay.card
    
    // If current card is trump and winning card is not trump
    if (trumpSuit && currentCard.suit === trumpSuit && winningCard.suit !== trumpSuit) {
      winningPlay = currentPlay
    }
    // If both are trump or both are not trump
    else if (
      (trumpSuit && currentCard.suit === trumpSuit && winningCard.suit === trumpSuit) ||
      (!trumpSuit || (currentCard.suit !== trumpSuit && winningCard.suit !== trumpSuit))
    ) {
      // If current card follows lead suit and winning card doesn't
      if (currentCard.suit === leadSuit && winningCard.suit !== leadSuit) {
        winningPlay = currentPlay
      }
      // If both follow the same suit, compare ranks
      else if (currentCard.suit === winningCard.suit) {
        if (CARD_RANK[currentCard.value] > CARD_RANK[winningCard.value]) {
          winningPlay = currentPlay
        }
      }
    }
    // If winning card is trump and current is not, winning card stays
  }
  
  return winningPlay.playerId
}

// Calculate score for a round
export function calculateRoundScores(
  predictions: Record<string, number>,
  tricksWon: Record<string, number>
): Record<string, number> {
  const scores: Record<string, number> = {}
  
  for (const playerId of Object.keys(predictions)) {
    const predicted = predictions[playerId]
    const won = tricksWon[playerId] ?? 0
    
    if (predicted === won) {
      // Correct prediction: 10 points + tricks won
      scores[playerId] = 10 + won
    } else {
      // Incorrect prediction: only tricks won
      scores[playerId] = won
    }
  }
  
  return scores
}

// Check if a card can be played
// Leader (no leadSuit): must play trump if they have it
// Follower: must follow lead suit if possible; if not, any card
export function canPlayCard(
  card: Card,
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit?: Suit | null
): boolean {
  if (!leadSuit) {
    // I am the leader — must play trump if I have it
    if (trumpSuit) {
      const hasTrump = hand.some(c => c.suit === trumpSuit)
      if (hasTrump) {
        return card.suit === trumpSuit
      }
    }
    return true
  }

  // I am a follower — must follow lead suit if possible
  const hasLeadSuit = hand.some(c => c.suit === leadSuit)
  if (hasLeadSuit) {
    return card.suit === leadSuit
  }

  // Can't follow suit — any card can be played
  return true
}

// Get valid cards that can be played
export function getValidCards(hand: Card[], leadSuit: Suit | null, trumpSuit?: Suit | null): Card[] {
  return hand.filter(card => canPlayCard(card, hand, leadSuit, trumpSuit))
}

// Get playable cards for the current trick
export function getPlayableCards(hand: Card[], leadSuit: Suit | null, trumpSuit: Suit): Card[] {
  return getValidCards(hand, leadSuit, trumpSuit)
}

// Get the next player in turn order
export function getNextPlayer(
  currentPlayerId: string,
  playerIds: string[]
): string {
  const currentIndex = playerIds.indexOf(currentPlayerId)
  const nextIndex = (currentIndex + 1) % playerIds.length
  return playerIds[nextIndex]
}

// Get the dealer for a specific round
export function getDealerForRound(
  round: number,
  playerIds: string[]
): string {
  const dealerIndex = (round - 1) % playerIds.length
  return playerIds[dealerIndex]
}

// Get the starting player for a round (player after dealer)
export function getStartingPlayer(
  dealerId: string,
  playerIds: string[]
): string {
  return getNextPlayer(dealerId, playerIds)
}

// Check if a prediction is valid (last player can't make total equal to cards)
export function isValidPrediction(
  prediction: number,
  cardsPerRound: number,
  currentPredictions: Record<string, number>,
  playerOrder: string[],
  _playerId: string
): { valid: boolean; reason?: string } {
  // Prediction must be non-negative and not exceed cards in round
  if (prediction < 0 || prediction > cardsPerRound) {
    return { valid: false, reason: 'La prediccion debe estar entre 0 y el numero de cartas' }
  }
  
  // Check if this is the last player to predict
  const predictedCount = Object.keys(currentPredictions).length
  const isLastPlayer = predictedCount === playerOrder.length - 1
  
  if (isLastPlayer) {
    // Sum of all predictions
    const totalPredicted = Object.values(currentPredictions).reduce((a, b) => a + b, 0)
    
    // Last player can't make the total equal to cards per round
    if (totalPredicted + prediction === cardsPerRound) {
      return { 
        valid: false, 
        reason: `No puedes predecir ${prediction}. El total no puede ser igual a ${cardsPerRound}` 
      }
    }
  }
  
  return { valid: true }
}

// Generate a random room code (6 characters)
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Excluded confusing characters
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// Card display names in Spanish
export const SUIT_NAMES: Record<Suit, string> = {
  oros: 'Oros',
  copas: 'Copas',
  espadas: 'Espadas',
  bastos: 'Bastos',
}

export const VALUE_NAMES: Record<number, string> = {
  1: 'As',
  2: 'Dos',
  3: 'Tres',
  4: 'Cuatro',
  5: 'Cinco',
  6: 'Seis',
  7: 'Siete',
  10: 'Sota',
  11: 'Caballo',
  12: 'Rey',
}

export function getCardName(card: Card): string {
  return `${VALUE_NAMES[card.value]} de ${SUIT_NAMES[card.suit]}`
}
