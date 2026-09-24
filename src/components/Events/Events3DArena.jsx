import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Play, Pause, 
  RotateCw 
} from 'lucide-react';
import EventCard from '../EventCard/EventCard';

export default function Events3DArena({ events, onSelectEvent }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  
  const containerRef = useRef(null);
  const autoPlayTimerRef = useRef(null);
  const lastScrollTimeRef = useRef(0);
  const touchStartXRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);

  const totalEvents = events?.length || 0;

  // Track responsive screen size for 3D circle radius
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  // Radii for circular orbit
  const radiusX = isMobile ? 220 : isTablet ? 330 : 420;
  const radiusZ = isMobile ? 180 : isTablet ? 260 : 330;

  // Normalized active event index
  const activeEventIndex = totalEvents > 0 
    ? ((currentIndex % totalEvents) + totalEvents) % totalEvents 
    : 0;

  const handleNext = useCallback(() => {
    if (totalEvents === 0) return;
    setCurrentIndex((prev) => prev + 1);
  }, [totalEvents]);

  const handlePrev = useCallback(() => {
    if (totalEvents === 0) return;
    setCurrentIndex((prev) => prev - 1);
  }, [totalEvents]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  // Auto-play timer
  useEffect(() => {
    if (isAutoPlaying && totalEvents > 1) {
      autoPlayTimerRef.current = setInterval(() => {
        handleNext();
      }, 4000);
    } else {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    }
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isAutoPlaying, totalEvents, handleNext]);

  // Smooth debounced mouse wheel interaction
  const handleWheel = (e) => {
    if (Math.abs(e.deltaX) > 20 || Math.abs(e.deltaY) > 25) {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < 260) return;
      lastScrollTimeRef.current = now;

      if (e.deltaX > 0 || e.deltaY > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Touch gestures for mobile
  const handleTouchStart = (e) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
    touchStartXRef.current = null;
  };

  // Mouse horizontal drag support for desktop
  const handleMouseDown = (e) => {
    if (e.target.closest('button, a, input')) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
  };

  const handleMouseUp = (e) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const diff = e.clientX - dragStartXRef.current;
    if (Math.abs(diff) > 45) {
      if (diff > 0) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  // VIRTUALIZATION: Strictly render only the 5 visible cards (-2, -1, 0, 1, 2)
  // This eliminates lag and keeps GPU/CPU at 60 FPS even with 45+ events.
  const visibleOffsets = useMemo(() => {
    if (totalEvents <= 1) return [0];
    if (totalEvents === 2) return [-1, 0];
    if (totalEvents <= 4) return [-1, 0, 1];
    return [-2, -1, 0, 1, 2];
  }, [totalEvents]);

  const visibleCards = useMemo(() => {
    if (totalEvents === 0) return [];
    return visibleOffsets.map((offset) => {
      const idx = ((activeEventIndex + offset) % totalEvents + totalEvents) % totalEvents;
      return {
        event: events[idx],
        offset,
        idx,
      };
    });
  }, [visibleOffsets, activeEventIndex, totalEvents, events]);

  if (totalEvents === 0) return null;

  const currentEvent = events[activeEventIndex] || events[0];

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className="relative w-full py-6 sm:py-10 select-none overflow-hidden cursor-grab active:cursor-grabbing"
    >
      {/* =====================================================================
          3D HOLOGRAPHIC ARENA STAGE (TILTED PERSPECTIVE)
          ===================================================================== */}
      <div className="relative w-full h-[600px] sm:h-[660px] md:h-[700px] flex items-center justify-center preserve-3d perspective-1600">
        
        {/* Ambient Red Aura in Backdrop */}
        <div className="absolute w-[450px] sm:w-[650px] md:w-[850px] h-[450px] sm:h-[650px] md:h-[850px] rounded-full bg-gradient-to-r from-red-600/15 via-rose-600/10 to-red-500/15 blur-[120px] pointer-events-none" />

        {/* 3D Tilted Floor Pedestal with glowing orbital track */}
        <div 
          className="absolute bottom-6 w-[540px] sm:w-[740px] md:w-[920px] h-[300px] sm:h-[400px] rounded-[100%] border border-red-500/30 pointer-events-none"
          style={{ 
            transform: 'rotateX(75deg) translateZ(-40px)',
            background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.16) 0%, rgba(220, 38, 38, 0.04) 50%, transparent 80%)'
          }}
        >
          {/* Circular Orbit Track */}
          <div className="absolute inset-4 sm:inset-6 rounded-[100%] border-2 border-dashed border-red-500/40 animate-holo-rotate" />
          <div className="absolute inset-16 sm:inset-20 rounded-[100%] border border-red-500/25" />
          
          {/* Ground Grid Crosshairs */}
          <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
          <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-red-500/50 to-transparent" />
        </div>

        {/* =====================================================================
            CENTRAL 3D HOLOGRAPHIC CIRCLE WITH SAMYAK LOGO
            ELEVATED & PERFECTLY CENTERED INSIDE THE CIRCLE
            ===================================================================== */}
        <div 
          className="absolute top-[26%] sm:top-[24%] md:top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none select-none z-20"
          style={{ transform: 'translate(-50%, -50%) translateZ(0px)' }}
        >
          {/* Multi-layered sci-fi glowing circular rings */}
          <div className="relative flex items-center justify-center">
            
            {/* Outer Rotating Cyber Tech Ring */}
            <div className="absolute w-52 sm:w-68 md:w-80 h-52 sm:h-68 md:h-80 rounded-full border border-dashed border-red-500/40 animate-holo-rotate" />
            
            {/* Counter-Rotating Reticle Ring with Cardinal Angles */}
            <div className="absolute w-44 sm:w-56 md:w-68 h-44 sm:h-56 md:h-68 rounded-full border border-red-500/35 animate-holo-reverse">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-red-400 bg-black/90 px-1.5 border border-red-500/30 rounded">000°</span>
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-mono text-red-400 bg-black/90 px-1.5 border border-red-500/30 rounded">180°</span>
              <span className="absolute top-1/2 -left-3.5 -translate-y-1/2 text-[9px] font-mono text-red-400 bg-black/90 px-1.5 border border-red-500/30 rounded">270°</span>
              <span className="absolute top-1/2 -right-3.5 -translate-y-1/2 text-[9px] font-mono text-red-400 bg-black/90 px-1.5 border border-red-500/30 rounded">090°</span>
            </div>

            {/* Central Frosted Glass Circle with Glowing Neon Core */}
            <div className="relative w-40 sm:w-52 md:w-60 h-40 sm:h-52 md:h-60 rounded-full cyber-glass border-2 border-red-500/60 shadow-[0_0_50px_rgba(239,68,68,0.5)] backdrop-blur-xl overflow-hidden flex flex-col items-center justify-center p-3 sm:p-5">
              
              {/* Core energy aura and concentric gradient */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-neutral-950/95 via-red-950/40 to-black/95" />
              <div className="absolute inset-2 rounded-full border border-red-500/20" />
              <div className="absolute w-24 sm:w-32 md:w-36 h-24 sm:h-32 md:h-36 rounded-full bg-red-600/25 blur-xl animate-holo-pulse" />

              {/* SAMYAK Logo & Emblem Fitted Perfectly Inside the Circle */}
              <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center">
                {/* Official Crest / Mascot Emblem */}
                <img
                  src="/samyak-emblem.png"
                  alt="Samyak Emblem"
                  className="w-8 h-8 sm:w-11 sm:h-11 md:w-12 md:h-12 object-contain filter drop-shadow-[0_0_12px_rgba(239,68,68,0.95)] mb-1 select-none"
                />
                {/* Official SAMYAK 2026 Brand Logo */}
                <img
                  src="/samyak-logo-white.png"
                  alt="SAMYAK 2026"
                  className="w-28 sm:w-36 md:w-44 h-auto max-h-[38%] object-contain filter drop-shadow-[0_0_16px_rgba(239,68,68,0.9)] select-none"
                />
              </div>
            </div>
          </div>

          {/* Arena Core Badge - Cleanly Positioned Below Circle (Does NOT overlap the logo inside) */}
          <div className="mt-2.5 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/90 border border-red-500/50 text-[8px] sm:text-[9px] font-mono text-red-300 tracking-widest uppercase shadow-[0_0_12px_rgba(239,68,68,0.35)] whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            ARENA CORE
          </div>

          {/* Vertical Holographic Light Beam beneath Core */}
          <div className="w-1 h-8 bg-gradient-to-b from-red-500/60 to-transparent blur-[0.5px] mt-1" />
        </div>

        {/* =====================================================================
            VIRTUALIZED 3D ROTATING EVENT CARDS (MAX 5 AT ONCE FOR SILKY 60 FPS)
            Hardware-accelerated CSS GPU easing replaces heavy spring physics!
            ===================================================================== */}
        {visibleCards.map(({ event, offset, idx }) => {
          // Fixed angular spread prevents clumping of cards
          const angleDeg = offset * (isMobile ? 32 : 36);
          const rad = (angleDeg * Math.PI) / 180;

          // 3D coordinates on circle
          const x = Math.sin(rad) * radiusX;
          const z = Math.cos(rad) * radiusZ - radiusZ; // front card is at z=0, sides pushed back
          const y = Math.abs(offset) === 0 ? 0 : 15 * Math.abs(offset);
          const rotateY = -angleDeg * 0.7;

          // Depth scaling and opacity
          const scale = offset === 0 ? 1 : Math.max(0.68, 1 - Math.abs(offset) * 0.16);
          const opacity = offset === 0 ? 1 : Math.abs(offset) === 1 ? 0.75 : 0.22;
          const zIndex = 50 - Math.abs(offset) * 10;
          const isFront = offset === 0;

          return (
            <motion.div
              key={event.id}
              onClick={() => {
                if (isFront) {
                  onSelectEvent(event);
                } else {
                  setCurrentIndex((prev) => prev + offset);
                }
              }}
              animate={{
                x,
                y,
                z,
                rotateY,
                scale,
                opacity,
              }}
              transition={{
                duration: 0.42,
                ease: [0.22, 1, 0.36, 1], // snappy GPU-accelerated cubic bezier
              }}
              style={{
                zIndex,
                transformStyle: 'preserve-3d',
              }}
              className={`absolute w-[280px] sm:w-[320px] md:w-[350px] cursor-pointer will-change-transform transform-gpu ${
                isFront 
                  ? 'ring-2 ring-red-500/60 shadow-[0_25px_60px_rgba(239,68,68,0.45)] rounded-2xl' 
                  : 'filter hover:brightness-110 transition-all'
              }`}
            >
              <EventCard
                event={event}
                onSelect={onSelectEvent}
                is3D={true}
              />
            </motion.div>
          );
        })}

      </div>

      {/* =====================================================================
          CONTROLS: LEFT & RIGHT BUTTONS & INTERACTIVE HUD
          ===================================================================== */}
      <div className="relative z-40 max-w-5xl mx-auto px-4 mt-2 sm:mt-4">
        
        {/* Navigation Action Row */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Left Move Button */}
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Rotate Left"
            className="group flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full cyber-glass border border-red-500/40 hover:border-red-400 bg-neutral-950/85 hover:bg-red-950/40 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all duration-300 focus:outline-none"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 group-hover:scale-125 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs sm:text-sm font-heading font-bold uppercase tracking-wider hidden xs:inline">
              PREV
            </span>
          </button>

          {/* Center Info HUD & Dot Scrubber */}
          <div className="flex flex-col items-center gap-2">
            
            {/* Active Event Indicator Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full cyber-glass border border-red-500/30 text-[11px] font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
              <span className="text-red-400 font-bold">
                {String(activeEventIndex + 1).padStart(2, '0')} / {String(totalEvents).padStart(2, '0')}
              </span>
              <span className="hidden sm:inline text-neutral-500">•</span>
              <span className="hidden sm:inline font-semibold text-white max-w-[220px] truncate">
                {currentEvent?.title}
              </span>
            </div>

            {/* Interactive Dots Scrubber */}
            <div className="flex items-center gap-1.5 sm:gap-2 max-w-[280px] sm:max-w-md overflow-x-auto py-1 no-scrollbar">
              {events.slice(0, 12).map((ev, idx) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    let diff = idx - activeEventIndex;
                    if (diff > totalEvents / 2) diff -= totalEvents;
                    if (diff < -totalEvents / 2) diff += totalEvents;
                    setCurrentIndex((prev) => prev + diff);
                  }}
                  aria-label={`Rotate to event ${idx + 1}`}
                  className={`transition-all duration-300 rounded-full flex-shrink-0 ${
                    idx === activeEventIndex
                      ? 'w-7 sm:w-9 h-2 sm:h-2.5 bg-red-500 shadow-[0_0_12px_#ef4444]'
                      : 'w-2 sm:w-2.5 h-2 sm:h-2.5 bg-neutral-800 hover:bg-neutral-600'
                  }`}
                />
              ))}
            </div>

          </div>

          {/* Right Move Button */}
          <button
            type="button"
            onClick={handleNext}
            aria-label="Rotate Right"
            className="group flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full cyber-glass border border-red-500/40 hover:border-red-400 bg-neutral-950/85 hover:bg-red-950/40 text-white shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all duration-300 focus:outline-none"
          >
            <span className="text-xs sm:text-sm font-heading font-bold uppercase tracking-wider hidden xs:inline">
              NEXT
            </span>
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 group-hover:scale-125 group-hover:translate-x-1 transition-transform" />
          </button>

        </div>

        {/* Secondary Sub-Controls: Auto-Orbit & Drag Guidance */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-400 font-mono">
          
          {/* Scroll / Swipe Guidance */}
          <div className="flex items-center gap-1.5 text-neutral-400">
            <RotateCw className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Scroll, drag, or use arrow keys to rotate 3D circle</span>
            <span className="sm:hidden">Swipe or drag to rotate 3D circle</span>
          </div>

          {/* Auto-drift toggle button */}
          <button
            type="button"
            onClick={() => setIsAutoPlaying((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono border transition-all ${
              isAutoPlaying
                ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            {isAutoPlaying ? (
              <>
                <Pause className="w-3 h-3 text-red-400" />
                <span>PAUSE AUTO</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-neutral-400" />
                <span>AUTO 3D ROTATE</span>
              </>
            )}
          </button>

        </div>

      </div>

    </div>
  );
}
