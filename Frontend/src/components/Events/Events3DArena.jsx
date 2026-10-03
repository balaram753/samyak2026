import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, Trophy, Sparkles, Shield, ArrowUpRight, 
  Calendar, ChevronLeft, ChevronRight, Play, Pause, RotateCw
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const CATEGORY_STYLES_DARK = {
  technical:     'bg-blue-500/25 border-blue-500/50 text-blue-300',
  cultural:      'bg-violet-500/25 border-violet-500/50 text-violet-300',
  gaming:        'bg-emerald-500/25 border-emerald-500/50 text-emerald-300',
  entertainment: 'bg-amber-500/25 border-amber-500/50 text-amber-300',
  workshops:     'bg-cyan-500/25 border-cyan-500/50 text-cyan-300',
  competitions:  'bg-rose-500/25 border-rose-500/50 text-rose-300',
};

const CATEGORY_STYLES_LIGHT = {
  technical:     'bg-blue-50 border-blue-300 text-blue-800 shadow-xs font-bold',
  cultural:      'bg-purple-50 border-purple-300 text-purple-800 shadow-xs font-bold',
  gaming:        'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs font-bold',
  entertainment: 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs font-bold',
  workshops:     'bg-cyan-50 border-cyan-300 text-cyan-800 shadow-xs font-bold',
  competitions:  'bg-rose-50 border-rose-300 text-rose-800 shadow-xs font-bold',
};

/**
 * 1080×1350 Official Poster Card Component (4:5 Aspect Ratio)
 * Strictly linked to `/events/${event.id}` for seamless routing.
 */
function PosterCard({ event, onSelect, isLight }) {
  const catKey = (event.category || '').toLowerCase();
  const catStyle = isLight
    ? (CATEGORY_STYLES_LIGHT[catKey] || CATEGORY_STYLES_LIGHT.technical)
    : (CATEGORY_STYLES_DARK[catKey] || CATEGORY_STYLES_DARK.technical);

  return (
    <Link
      to={`/events/${event.id}`}
      onClick={() => onSelect && onSelect(event)}
      className={`group relative block w-[240px] sm:w-[275px] md:w-[310px] lg:w-[330px] aspect-[4/5] rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer flex-shrink-0 select-none ${
        isLight
          ? 'bg-white border-2 border-slate-200/90 shadow-lg hover:border-red-600 hover:shadow-[0_16px_40px_rgba(139,21,27,0.22)] hover:scale-[1.02]'
          : 'bg-neutral-950 border border-neutral-800/90 hover:border-red-500 hover:shadow-[0_0_40px_rgba(223,37,49,0.55)] hover:scale-[1.02]'
      }`}
    >
      {/* ── 1080×1350 Poster Image (4:5 Portrait) ── */}
      <img
        src={event.image || '/hero-bg.png'}
        alt={event.title}
        loading="lazy"
        className="w-full h-full object-cover object-center filter contrast-105 transition-transform duration-700 ease-out group-hover:scale-108"
      />

      {/* Cyber Specular Shimmer */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-red-500/[0.12] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-20" />

      {/* Vignette Overlay for High Contrast */}
      <div className={`absolute inset-0 pointer-events-none z-10 ${
        isLight
          ? 'bg-gradient-to-t from-slate-950/85 via-slate-950/30 via-50% to-transparent'
          : 'bg-gradient-to-t from-black via-black/40 to-black/25'
      }`} />

      {/* Cyber HUD Corner Brackets */}
      <div className={`absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 z-20 pointer-events-none transition-colors ${
        isLight ? 'border-red-600 group-hover:border-red-700' : 'border-red-500/70 group-hover:border-red-400'
      }`} />
      <div className={`absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 z-20 pointer-events-none transition-colors ${
        isLight ? 'border-red-600 group-hover:border-red-700' : 'border-red-500/70 group-hover:border-red-400'
      }`} />
      <div className={`absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 z-20 pointer-events-none transition-colors ${
        isLight ? 'border-red-600 group-hover:border-red-700' : 'border-red-500/70 group-hover:border-red-400'
      }`} />
      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 z-20 pointer-events-none transition-colors ${
        isLight ? 'border-red-600 group-hover:border-red-700' : 'border-red-500/70 group-hover:border-red-400'
      }`} />

      {/* ── TOP BADGES: Starred + Category ── */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5 z-20">
        {/* Starred / Featured Pill */}
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-mono text-[10px] font-bold uppercase backdrop-blur-md shadow-md ${
          isLight
            ? 'bg-amber-100/95 border border-amber-400 text-amber-900 shadow-xs'
            : 'bg-black/80 border border-amber-500/60 text-amber-300 shadow-[0_0_12px_rgba(223,37,49,0.4)]'
        }`}>
          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
          <span>Featured</span>
        </div>

        {/* Category Pill */}
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold backdrop-blur-md border shadow-md ${catStyle}`}>
          {event.category || 'Event'}
        </span>
      </div>

      {/* Prize Pool Tag (Floating Mid-Right) */}
      {event.prize && (
        <div className={`absolute top-12 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-heading text-xs font-black shadow-md backdrop-blur-md z-20 ${
          isLight
            ? 'bg-white/95 border border-amber-500 text-amber-900 shadow-sm'
            : 'bg-black/85 border border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(223,37,49,0.3)]'
        }`}>
          <Trophy className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className={isLight ? 'text-slate-900 tracking-wide font-black' : 'text-white tracking-wide font-black'}>{event.prize}</span>
        </div>
      )}

      {/* ── LOWER OVERLAY: Title, Meta, and Action ── */}
      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-20 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent pt-12 flex flex-col justify-end">
        {/* Department & Club */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-300 uppercase tracking-wider mb-1 truncate">
          {event.department && (
            <span className="px-1.5 py-0.5 rounded bg-red-600/90 border border-red-400/50 text-white font-bold">
              {event.department}
            </span>
          )}
          {event.club && (
            <span className="px-2 py-0.5 rounded-lg bg-red-950/90 border border-red-500/60 text-red-200 font-bold truncate flex items-center gap-1 shadow-sm">
              <Shield className="w-2.5 h-2.5 text-red-400" />
              <span className="truncate">{event.club}</span>
            </span>
          )}
        </div>

        {/* Event Title */}
        <h3 className="font-heading font-black text-base sm:text-lg text-white uppercase tracking-wider group-hover:text-red-400 transition-colors line-clamp-1 leading-snug">
          {event.title}
        </h3>

        {/* Date & Venue */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-300 mt-1.5 pt-1.5 border-t border-white/10">
          <span className="flex items-center gap-1 truncate max-w-[130px]">
            <Calendar className="w-3 h-3 text-red-400 flex-shrink-0" />
            <span className="truncate">{event.date || 'TBA'}</span>
          </span>
          <span className="text-amber-400 font-heading font-bold text-xs">
            {event.fee || 'Free'}
          </span>
        </div>

        {/* Action Button */}
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-red-400/95 font-bold tracking-wider">
            1080×1350 Poster
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(223,37,49,0.5)] group-hover:shadow-[0_0_25px_rgba(223,37,49,0.8)] group-hover:scale-105 transition-all">
            <span>Explore Arena</span>
            <ArrowUpRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Events3DArena({ events = [], onSelectEvent }) {
  const { isLight } = useTheme();
  const [isPaused, setIsPaused] = useState(false);
  const [speed, setSpeed] = useState('normal'); // 'normal' | 'fast'
  const [isReversed, setIsReversed] = useState(false);

  // References for manual side-scroll controls
  const trackRef1 = useRef(null);
  const trackRef2 = useRef(null);

  // Filter for starred / featured events. If none starred, fallback to first 8 events.
  const featuredEvents = useMemo(() => {
    const starred = events.filter((e) => Boolean(e.featured));
    if (starred.length > 0) return starred;
    return events.slice(0, 8);
  }, [events]);

  // Ensure enough items in the list for smooth infinite marquee
  const streamEvents = useMemo(() => {
    if (featuredEvents.length === 0) return [];
    let list = [...featuredEvents];
    while (list.length < 8) {
      list = [...list, ...featuredEvents];
    }
    return list;
  }, [featuredEvents]);

  // Row 2 reversed for visual variety
  const row2BaseEvents = useMemo(() => {
    return [...streamEvents].reverse();
  }, [streamEvents]);

  // Manual nudge scroll functions
  const handleScrollLeft = () => {
    if (trackRef1.current) {
      trackRef1.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
    if (trackRef2.current) {
      trackRef2.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (trackRef1.current) {
      trackRef1.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
    if (trackRef2.current) {
      trackRef2.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  if (streamEvents.length === 0) return null;

  const animDuration = speed === 'fast' ? '24s' : '42s';

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden py-8 sm:py-12 select-none transition-colors duration-300 ${
      isLight
        ? 'bg-white border-2 border-slate-200/90 shadow-[0_12px_45px_rgba(139,21,27,0.07)]'
        : 'bg-neutral-950/95 border border-red-500/30 shadow-[0_0_60px_rgba(223,37,49,0.15)]'
    }`}>
      
      {/* ── Volumetric Ambient Red Glows ── */}
      <div className={`absolute top-1/3 left-1/4 -translate-y-1/2 w-[500px] h-[300px] rounded-full blur-[140px] pointer-events-none ${
        isLight ? 'bg-red-600/[0.04]' : 'bg-red-600/[0.08]'
      }`} />
      <div className={`absolute bottom-1/3 right-1/4 translate-y-1/2 w-[500px] h-[300px] rounded-full blur-[140px] pointer-events-none ${
        isLight ? 'bg-rose-600/[0.04]' : 'bg-rose-600/[0.07]'
      }`} />
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Cyber Corner HUD Accents */}
      <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 z-30 pointer-events-none ${isLight ? 'border-red-600' : 'border-red-500'}`} />
      <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 z-30 pointer-events-none ${isLight ? 'border-red-600' : 'border-red-500'}`} />
      <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 z-30 pointer-events-none ${isLight ? 'border-red-600' : 'border-red-500'}`} />
      <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 z-30 pointer-events-none ${isLight ? 'border-red-600' : 'border-red-500'}`} />

      {/* ── SECTION HEADER & MARQUEE TELEMETRY COMMANDS ── */}
      <div className="relative z-20 px-6 sm:px-10 md:px-12 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full cyber-glass border border-amber-500/40 text-xs font-mono text-amber-500 uppercase tracking-widest mb-3 shadow-xs">
            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
            <span>// 1080×1350 ARENA SHOWCASE</span>
          </div>

          <h3 className={`text-2xl sm:text-4xl font-black font-heading tracking-tight uppercase ${
            isLight ? '!text-slate-900' : '!text-white'
          }`}>
            FEATURED <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 text-glow-red">1080×1350 ARENAS</span>
          </h3>

        </div>

        {/* Live Controls: Manual Scroll Arrows, Play/Pause, Direction & Telemetry */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Manual Scroll Left / Right Buttons */}
          <div className={`flex items-center gap-1 p-1 rounded-xl border ${
            isLight ? 'bg-slate-100 border-slate-300 shadow-xs' : 'bg-neutral-900/90 border-neutral-800'
          }`}>
            <button
              type="button"
              onClick={handleScrollLeft}
              title="Scroll left"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isLight ? 'bg-white hover:bg-red-600 text-slate-700 hover:text-white shadow-xs' : 'bg-neutral-800/80 hover:bg-red-600 text-neutral-300 hover:text-white'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleScrollRight}
              title="Scroll right"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isLight ? 'bg-white hover:bg-red-600 text-slate-700 hover:text-white shadow-xs' : 'bg-neutral-800/80 hover:bg-red-600 text-neutral-300 hover:text-white'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Active Starred Badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border ${
            isLight ? 'bg-slate-50 border-slate-300 text-slate-800 shadow-xs' : 'bg-black/80 border-neutral-800 text-neutral-300'
          }`}>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#DF2531]" />
            <span><strong className={isLight ? "text-amber-600 font-bold" : "text-amber-300 font-bold"}>{featuredEvents.length}</strong> Starred</span>
          </div>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            title={isPaused ? 'Resume auto-scrolling' : 'Pause scrolling'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all border cursor-pointer ${
              isPaused 
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs font-bold'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(223,37,49,0.3)]' 
                : isLight
                  ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs font-semibold'
                  : 'bg-neutral-900/90 text-neutral-300 border-neutral-700/80 hover:text-white hover:border-red-500'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-500" /> : <Pause className="w-3.5 h-3.5 text-red-500" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Reverse Direction Toggle */}
          <button
            type="button"
            onClick={() => setIsReversed((prev) => !prev)}
            title="Toggle scrolling directions"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs font-semibold'
                : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-700/80 hover:border-red-500'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5 text-red-500" />
            <span>{isReversed ? 'Rev' : 'Fwd'}</span>
          </button>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => setSpeed((prev) => (prev === 'normal' ? 'fast' : 'normal'))}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
              isLight
                ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs font-semibold'
                : 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-400 hover:text-white border-neutral-700/80'
            }`}
          >
            <span>{speed === 'fast' ? '⚡ 1.5x' : '1.0x'}</span>
          </button>
        </div>
      </div>

      {/* ── DUAL SIDE-SCROLLING MARQUEE TRACKS ── */}
      <div className="relative space-y-6 overflow-hidden">
        
        {/* Left & Right Edge Vignette Fades (Seamless Theme Adaptive) */}
        <div className={`absolute left-0 top-0 bottom-0 w-16 sm:w-32 z-30 pointer-events-none ${
          isLight
            ? 'bg-gradient-to-r from-white via-white/80 to-transparent'
            : 'bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent'
        }`} />
        <div className={`absolute right-0 top-0 bottom-0 w-16 sm:w-32 z-30 pointer-events-none ${
          isLight
            ? 'bg-gradient-to-l from-white via-white/80 to-transparent'
            : 'bg-gradient-to-l from-neutral-950 via-neutral-950/80 to-transparent'
        }`} />

        {/* ── ROW 1: RIGHT TO LEFT SCROLLING (1080×1350 Posters) ── */}
        <div 
          ref={trackRef1}
          className="relative flex overflow-x-auto no-scrollbar marquee-pause-hover py-1 scroll-smooth"
        >
          {/* Sub-track A */}
          <div
            className={`flex gap-6 pr-6 w-max shrink-0 ${
              isReversed ? 'animate-marquee-right' : 'animate-marquee-left'
            }`}
            style={{
              animationDuration: animDuration,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {streamEvents.map((event, idx) => (
              <PosterCard
                key={`r1a-${event.id}-${idx}`}
                event={event}
                onSelect={onSelectEvent}
                isLight={isLight}
              />
            ))}
          </div>

          {/* Sub-track B (Exact Clone for 100% Seamless Infinite Loop) */}
          <div
            className={`flex gap-6 pr-6 w-max shrink-0 ${
              isReversed ? 'animate-marquee-right' : 'animate-marquee-left'
            }`}
            style={{
              animationDuration: animDuration,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
            aria-hidden="true"
          >
            {streamEvents.map((event, idx) => (
              <PosterCard
                key={`r1b-${event.id}-${idx}`}
                event={event}
                onSelect={onSelectEvent}
                isLight={isLight}
              />
            ))}
          </div>
        </div>

        {/* ── ROW 2: LEFT TO RIGHT SCROLLING (1080×1350 Posters) ── */}
        <div 
          ref={trackRef2}
          className="relative flex overflow-x-auto no-scrollbar marquee-pause-hover py-1 scroll-smooth"
        >
          {/* Sub-track A */}
          <div
            className={`flex gap-6 pr-6 w-max shrink-0 ${
              isReversed ? 'animate-marquee-left' : 'animate-marquee-right'
            }`}
            style={{
              animationDuration: animDuration,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
          >
            {row2BaseEvents.map((event, idx) => (
              <PosterCard
                key={`r2a-${event.id}-${idx}`}
                event={event}
                onSelect={onSelectEvent}
                isLight={isLight}
              />
            ))}
          </div>

          {/* Sub-track B (Exact Clone for 100% Seamless Infinite Loop) */}
          <div
            className={`flex gap-6 pr-6 w-max shrink-0 ${
              isReversed ? 'animate-marquee-left' : 'animate-marquee-right'
            }`}
            style={{
              animationDuration: animDuration,
              animationPlayState: isPaused ? 'paused' : 'running',
            }}
            aria-hidden="true"
          >
            {row2BaseEvents.map((event, idx) => (
              <PosterCard
                key={`r2b-${event.id}-${idx}`}
                event={event}
                onSelect={onSelectEvent}
                isLight={isLight}
              />
            ))}
          </div>
        </div>

      </div>

      {/* ── LOWER TELEMETRY FOOTER ── */}
      <div className={`relative z-20 mt-8 px-6 sm:px-12 flex flex-wrap items-center justify-between gap-4 text-xs font-mono border-t pt-4 ${
        isLight ? 'border-slate-200 text-slate-600' : 'border-neutral-900 text-neutral-400'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-red-600" />
          <span>Posters rendered in official 1080×1350 (4:5) format. Star events in Admin to feature here.</span>
        </div>
        <div className={`flex items-center gap-4 text-[11px] ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>
          <span>Row 1: Right-to-Left</span>
          <span>•</span>
          <span>Row 2: Left-to-Right</span>
        </div>
      </div>

    </div>
  );
}
