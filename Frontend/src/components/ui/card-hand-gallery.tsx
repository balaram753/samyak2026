"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface FanCardItem {
  /** Stable, unique identifier. */
  id: string;
  /** Image URL rendered as the card face. */
  src: string;
  /** Shown beside the fan while this card is active, and its accessible name. */
  title: string;
  /** Shown on the opposite side while this card is active. */
  description?: string;
  /** Guaranteed fallback image URL if primary fails */
  fallbackSrc?: string;
  /** Metadata badges */
  category?: string;
  department?: string;
  prize?: string;
  date?: string;
}

export interface CardHandGalleryProps {
  /** Cards in the hand, in fan order. */
  cards: readonly FanCardItem[];
  /** Active card id. Pass to control the selection yourself. */
  activeId?: string;
  /** Card width in pixels. Increases on desktop, scales gracefully on mobile. */
  cardWidth?: number;
  className?: string;
  /** Initially active card. Defaults to the first card. */
  defaultActiveId?: string;
  /** Fires when a different card is picked. */
  onSelect?: (card: FanCardItem) => void;
  /** Fires when active card is clicked/tapped */
  onActiveCardClick?: (card: FanCardItem) => void;
  /** Optional custom action button rendered below active card description */
  renderAction?: (card: FanCardItem) => React.ReactNode;
}

/** Flick speed that triggers selection on drag */
const SELECT_VELOCITY = -500;

/** Cards in the hand scale down slightly so the active card commands hero focus */
const HAND_SCALE = 0.78;

/** Spread cards into a generous symmetric arc with healthy visible gaps */
function fanTransform(index: number, count: number, spacing: number) {
  const offset = index - (count - 1) / 2;
  // Arc angle: gentle tilt so cards stay upright and fully legible
  const stepDeg = count > 1 ? Math.min(6.5, 32 / (count - 1)) : 0;
  const rotate = offset * stepDeg;

  return {
    rotate,
    x: offset * spacing,
    // Smooth arc: cards droop slightly outward, center card sits highest
    y: Math.abs(offset) * 9 + Math.abs(rotate) * 1.2,
  };
}

/** Individual Card Face with cyber HUD accents, badge, watermark, and fallback */
function FanCardFace({
  card,
  width,
  index,
  isActive,
}: {
  card: FanCardItem;
  width: number;
  index: number;
  isActive: boolean;
}) {
  const [imgSrc, setImgSrc] = React.useState(card.src);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setImgSrc(card.src);
    setHasError(false);
  }, [card.src]);

  const handleImgError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(card.fallbackSrc || "/gallery/samyak-01.jpg");
    }
  };

  return (
    <div
      className={cn(
        "relative aspect-[5/7] select-none rounded-2xl overflow-hidden bg-neutral-950 transition-all duration-300",
        isActive
          ? "border-2 border-red-500 shadow-[0_0_45px_rgba(223,37,49,0.75)] ring-2 ring-red-500/50"
          : "border border-red-500/40 hover:border-red-500/90 shadow-2xl hover:shadow-[0_0_30px_rgba(223,37,49,0.5)]"
      )}
      style={{ width }}
    >
      {/* Cyber Corner HUD Brackets */}
      <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-red-500 pointer-events-none z-20" />
      <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-red-500 pointer-events-none z-20" />
      <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-red-500 pointer-events-none z-20" />
      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-red-500 pointer-events-none z-20" />

      {/* Main Poster Image */}
      <img
        alt={card.title}
        className="w-full h-full object-cover object-center filter contrast-105 select-none"
        draggable={false}
        src={imgSrc}
        onError={handleImgError}
      />

      {/* High-contrast gradient overlay for guaranteed text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 via-60% to-black/30 pointer-events-none z-10" />

      {/* Top Meta Badges */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5 z-20 pointer-events-none">
        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-black uppercase bg-black/90 text-red-400 border border-red-500/50 shadow-xs">
          #{String(index + 1).padStart(2, "0")}
        </span>
        {card.category && (
          <span className="px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wider font-black bg-red-600/95 text-white shadow-md max-w-[120px] truncate">
            {card.category}
          </span>
        )}
      </div>

      {/* Bottom Title Watermark (Visible in both active card and spread hand) */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-3.5 z-20 pointer-events-none bg-gradient-to-t from-black via-black/95 to-transparent pt-12">
        <p className="font-heading font-black text-xs sm:text-sm lg:text-base text-white uppercase tracking-wider line-clamp-2 leading-tight">
          {card.title}
        </p>
        {isActive && (
          <div className="flex items-center gap-1.5 mt-1.5 text-[9px] font-mono text-red-400 font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#DF2531]" />
            <span>ACTIVE ARENA</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CardHandGallery({
  cards,
  activeId: controlledActiveId,
  cardWidth = 320,
  className,
  defaultActiveId,
  onSelect,
  onActiveCardClick,
  renderAction,
}: CardHandGalleryProps) {
  const shouldReduceMotion = useReducedMotion();
  const fanRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);
  const [fanWidth, setFanWidth] = React.useState<number | null>(null);
  const [internalActiveId, setInternalActiveId] = React.useState(
    defaultActiveId ?? cards[0]?.id
  );
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);

  // Active Card Resolver
  const requestedId = controlledActiveId ?? internalActiveId;
  const activeId = cards.some((card) => card.id === requestedId)
    ? requestedId
    : cards[0]?.id;
  const activeIndex = cards.findIndex((card) => card.id === activeId);
  const activeCard = cards[activeIndex];

  // Observe container width
  React.useEffect(() => {
    const node = fanRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setFanWidth(entry.contentRect.width);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Responsive dimensions: scale smoothly on mobile and expand boldly on desktop
  const isMobile = fanWidth !== null && fanWidth < 540;
  const isTablet = fanWidth !== null && fanWidth >= 540 && fanWidth < 860;

  // Substantially increased card width for bold, impressive presentation
  const responsiveBaseWidth = isMobile
    ? Math.min(220, (fanWidth || 360) * 0.58)
    : isTablet
    ? Math.min(265, (fanWidth || 600) * 0.42)
    : cardWidth;

  const width = responsiveBaseWidth;
  const height = width * 1.4;

  // Active card lifts cleanly UP so the resting hand below is completely visible
  const activeLift = isMobile ? height * 0.76 : height * 0.82;
  const hoverLift = height * 0.30;
  const baseBottom = isMobile ? height * 0.05 : height * 0.09;

  const handCards = cards.filter((card) => card.id !== activeId);
  const hoveredIndex = hoveredId
    ? handCards.findIndex((card) => card.id === hoveredId)
    : -1;

  // Spread cards across the container width with generous, visible gaps
  const maxOffset = (handCards.length - 1) / 2;
  const availableWidth = fanWidth ? fanWidth * 0.95 : 900;
  
  // Generous fan spacing so every card in the hand has distinct breathing room
  const fanSpacing = maxOffset > 0
    ? isMobile
      ? Math.min(width * 0.52, (availableWidth * 0.9) / Math.max(1, handCards.length))
      : Math.min(width * 0.82, Math.max(width * 0.58, availableWidth / Math.max(1, handCards.length)))
    : 0;

  // Spring physics transition
  const cardTransition = shouldReduceMotion
    ? { duration: 0.16, ease: "easeOut" as const }
    : {
        damping: 26,
        mass: 0.85,
        stiffness: 290,
        type: "spring" as const,
      };

  const textTransition = { duration: shouldReduceMotion ? 0 : 0.28 };
  const textOffset = shouldReduceMotion ? 0 : 8;

  function clearHover(id: string) {
    setHoveredId((current) => (current === id ? null : current));
  }

  function selectCard(card: FanCardItem) {
    if (card.id === activeId) return;
    clearHover(card.id);
    if (controlledActiveId === undefined) {
      setInternalActiveId(card.id);
    }
    onSelect?.(card);
  }

  // Touch swipe support on mobile
  const touchStartXRef = React.useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartXRef.current;
    touchStartXRef.current = null;

    if (Math.abs(diff) > 40) {
      // Swiped right -> previous card, Swiped left -> next card
      const step = diff > 0 ? -1 : 1;
      const nextIdx = (activeIndex + step + cards.length) % cards.length;
      const nextCard = cards[nextIdx];
      if (nextCard) {
        selectCard(nextCard);
      }
    }
  };

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-6 xl:gap-10",
        className
      )}
    >
      {/* ── LEFT PANEL: Active Card Counter & Title ── */}
      <div className="w-full shrink-0 text-center lg:w-56 xl:w-64 lg:text-right px-2">
        {activeCard ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: textOffset }}
            key={activeCard.id}
            transition={textTransition}
            className="space-y-1.5 sm:space-y-2"
          >
            <div className="inline-flex lg:flex items-center justify-center lg:justify-end gap-2 text-xs font-mono text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#DF2531]" />
              <span>
                ARENA {String(activeIndex + 1).padStart(2, "0")} / {String(cards.length).padStart(2, "0")}
              </span>
            </div>
            <h3 className="text-balance font-heading font-black text-2xl sm:text-3xl lg:text-4xl text-foreground uppercase tracking-tight leading-tight">
              {activeCard.title}
            </h3>
            {activeCard.department && (
              <p className="text-xs font-mono text-red-400 font-bold uppercase tracking-wider">
                // {activeCard.department} {activeCard.category ? `• ${activeCard.category}` : ''}
              </p>
            )}
          </motion.div>
        ) : null}
      </div>

      {/* ── CENTER STAGE: Fanned Playing Card Hand Arena ── */}
      <div
        className="relative w-full min-w-0 flex-1 touch-pan-y"
        ref={fanRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ minHeight: height * 1.95 }}
      >
        {cards.map((card, cardIndex) => {
          const isActive = card.id === activeId;
          const handIndex = handCards.findIndex((candidate) => candidate.id === card.id);

          let slot: { rotate: number; scale: number; x: number; y: number };
          let lift = { rotate: 0, scale: 1, x: 0, y: 0 };
          let zIndex: number;

          if (isActive) {
            // Active card is lifted cleanly into the upper spotlight slot
            slot = { rotate: 0, scale: 1, x: 0, y: -activeLift };
            zIndex = 100;
          } else {
            // Cards waiting in the hand fan out symmetrically with healthy gaps
            const fan = fanTransform(handIndex, handCards.length, fanSpacing);
            const isHovered = card.id === hoveredId;

            // Push neighbors gently aside on hover
            const neighborShift =
              hoveredIndex !== -1 && !isHovered
                ? (Math.sign(handIndex - hoveredIndex) * width * 0.16) /
                  Math.max(1, Math.abs(handIndex - hoveredIndex))
                : 0;

            const dx = neighborShift;
            const dy = isHovered ? -hoverLift - fan.y : 0;
            const rad = (-fan.rotate * Math.PI) / 180;

            // Push hand cards down slightly so they don't collide with active card
            const restingY = fan.y + (isMobile ? height * 0.06 : height * 0.1);

            slot = {
              rotate: fan.rotate,
              scale: HAND_SCALE,
              x: fan.x,
              y: restingY,
            };

            lift = {
              rotate: isHovered ? -fan.rotate * 0.4 : 0,
              scale: isHovered ? 1.08 : 1,
              x: (dx * Math.cos(rad) - dy * Math.sin(rad)) / HAND_SCALE,
              y: (dx * Math.sin(rad) + dy * Math.cos(rad)) / HAND_SCALE,
            };

            zIndex = isHovered ? 70 : 10 + handIndex;
          }

          return (
            <motion.div
              animate={slot}
              className="absolute left-1/2"
              initial={false}
              key={card.id}
              onHoverEnd={() => clearHover(card.id)}
              onHoverStart={() => {
                if (!isActive) {
                  setHoveredId(card.id);
                }
              }}
              style={{ bottom: baseBottom, marginLeft: -width / 2, zIndex }}
              transition={cardTransition}
            >
              <motion.div
                animate={lift}
                initial={false}
                transition={cardTransition}
              >
                <button
                  aria-label={card.title}
                  aria-pressed={isActive}
                  className={cn(
                    "block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2",
                    isActive
                      ? onActiveCardClick ? "cursor-pointer" : "cursor-default"
                      : "cursor-pointer hover:scale-[1.03] transition-transform"
                  )}
                  onClick={() => {
                    if (draggingRef.current) {
                      draggingRef.current = false;
                      return;
                    }
                    if (isActive) {
                      onActiveCardClick?.(card);
                      return;
                    }
                    selectCard(card);
                  }}
                  type="button"
                >
                  <FanCardFace
                    card={card}
                    width={width}
                    index={cardIndex}
                    isActive={isActive}
                  />
                </button>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* ── RIGHT PANEL: Active Card Description & CTA Action ── */}
      <div
        aria-live="polite"
        className="w-full shrink-0 text-center lg:w-56 xl:w-64 lg:text-left px-2"
      >
        {activeCard ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3.5"
            initial={{ opacity: 0, y: textOffset }}
            key={activeCard.id}
            transition={textTransition}
          >
            {activeCard.description && (
              <p className="text-pretty text-muted-foreground text-xs sm:text-sm font-cyber leading-relaxed">
                {activeCard.description}
              </p>
            )}
            {renderAction && renderAction(activeCard)}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
