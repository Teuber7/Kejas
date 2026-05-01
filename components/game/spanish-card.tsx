"use client"

import { cn } from "@/lib/utils"
import type { Card as CardType, Suit } from "@/lib/types"

interface SpanishCardProps {
  card?: CardType
  faceDown?: boolean
  onClick?: () => void
  disabled?: boolean
  selected?: boolean
  highlighted?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const SUIT_COLORS: Record<Suit, string> = {
  oros: "text-suit-oros",
  copas: "text-suit-copas",
  espadas: "text-suit-espadas",
  bastos: "text-suit-bastos"
}

const SUIT_BG_COLORS: Record<Suit, string> = {
  oros: "bg-suit-oros/10",
  copas: "bg-suit-copas/10",
  espadas: "bg-suit-espadas/10",
  bastos: "bg-suit-bastos/10"
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  oros: "coins",
  copas: "cup",
  espadas: "sword",
  bastos: "club"
}

const CARD_VALUES: Record<number, string> = {
  1: "AS",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  10: "SOTA",
  11: "CABALLO",
  12: "REY"
}

const SIZE_CLASSES = {
  sm: "w-12 h-18 text-xs",
  md: "w-16 h-24 text-sm",
  lg: "w-20 h-30 text-base"
}

function SuitIcon({ suit, className }: { suit: Suit; className?: string }) {
  const iconClasses = cn("fill-current", className)
  
  switch (suit) {
    case "oros":
      return (
        <svg viewBox="0 0 24 24" className={iconClasses}>
          <circle cx="12" cy="12" r="9" strokeWidth="1.5" stroke="currentColor" fill="currentColor" opacity="0.3" />
          <circle cx="12" cy="12" r="6" fill="currentColor" />
        </svg>
      )
    case "copas":
      return (
        <svg viewBox="0 0 24 24" className={iconClasses}>
          <path d="M12 2C8 2 5 5 5 9c0 3 2 5.5 5 7v3H8v2h8v-2h-2v-3c3-1.5 5-4 5-7 0-4-3-7-7-7z" fill="currentColor" />
        </svg>
      )
    case "espadas":
      return (
        <svg viewBox="0 0 24 24" className={iconClasses}>
          <path d="M12 2l-2 12h1.5l-.5 3h2l-.5-3H14L12 2zm-1 17h2v3h-2v-3z" fill="currentColor" />
          <ellipse cx="12" cy="16" rx="3" ry="1.5" fill="currentColor" />
        </svg>
      )
    case "bastos":
      return (
        <svg viewBox="0 0 24 24" className={iconClasses}>
          <rect x="10" y="2" width="4" height="16" rx="2" fill="currentColor" />
          <ellipse cx="12" cy="20" rx="4" ry="2" fill="currentColor" />
        </svg>
      )
  }
}

export function SpanishCard({
  card,
  faceDown = false,
  onClick,
  disabled = false,
  selected = false,
  highlighted = false,
  size = "md",
  className
}: SpanishCardProps) {
  const sizeClass = SIZE_CLASSES[size]
  
  if (faceDown || !card) {
    return (
      <div
        className={cn(
          "rounded-lg border-2 border-border/50 flex items-center justify-center",
          "bg-gradient-to-br from-primary/20 to-primary/40",
          "shadow-lg transition-all duration-200",
          sizeClass,
          className
        )}
      >
        <div className="w-3/4 h-3/4 rounded border border-primary/30 flex items-center justify-center">
          <span className="text-primary/50 font-bold text-lg">P</span>
        </div>
      </div>
    )
  }

  const suitColor = SUIT_COLORS[card.suit]
  const suitBg = SUIT_BG_COLORS[card.suit]
  const valueLabel = CARD_VALUES[card.value]
  const isFigure = card.value >= 10

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-lg border-2 flex flex-col items-center justify-between p-1.5",
        "bg-gradient-to-br from-white to-gray-100",
        "shadow-lg transition-all duration-200",
        "hover:shadow-xl hover:-translate-y-1",
        sizeClass,
        suitColor,
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background -translate-y-2",
        highlighted && "ring-2 ring-accent animate-pulse",
        disabled && "opacity-50 cursor-not-allowed hover:translate-y-0 hover:shadow-lg",
        !disabled && "cursor-pointer",
        className
      )}
      style={{ borderColor: "currentColor" }}
    >
      {/* Top left value */}
      <div className="self-start flex flex-col items-center leading-none">
        <span className="font-bold" style={{ fontSize: isFigure ? "0.6em" : "1em" }}>
          {valueLabel}
        </span>
        <SuitIcon suit={card.suit} className="w-3 h-3" />
      </div>

      {/* Center suit display */}
      <div className={cn("flex-1 flex items-center justify-center w-full", suitBg, "rounded")}>
        {card.value <= 7 ? (
          <div className="grid grid-cols-2 gap-0.5 p-1">
            {Array.from({ length: Math.min(card.value, 6) }).map((_, i) => (
              <SuitIcon key={i} suit={card.suit} className="w-2.5 h-2.5" />
            ))}
            {card.value === 7 && (
              <div className="col-span-2 flex justify-center">
                <SuitIcon suit={card.suit} className="w-2.5 h-2.5" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <SuitIcon suit={card.suit} className="w-6 h-6" />
            <span className="text-[0.5em] font-semibold mt-0.5 uppercase">
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>
        )}
      </div>

      {/* Bottom right value (rotated) */}
      <div className="self-end flex flex-col items-center leading-none rotate-180">
        <span className="font-bold" style={{ fontSize: isFigure ? "0.6em" : "1em" }}>
          {valueLabel}
        </span>
        <SuitIcon suit={card.suit} className="w-3 h-3" />
      </div>
    </button>
  )
}

export function CardBack({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  return <SpanishCard faceDown size={size} className={className} />
}

export function EmptyCardSlot({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const sizeClass = SIZE_CLASSES[size]
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed border-border/30 flex items-center justify-center",
        "bg-card/20",
        sizeClass,
        className
      )}
    />
  )
}
