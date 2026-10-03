import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Star, Calendar, Clock, MapPin, 
  ArrowRight, AlertCircle, ChevronLeft, ChevronRight,
  Play, Pause, RotateCw
} from 'lucide-react';
import { subscribeWorkshops, DEFAULT_WORKSHOPS } from '../../services/workshopService';

function MasterclassCard({ ws }) {
  const isSeatsFilled = (ws.availableSeats !== undefined && Number(ws.availableSeats) <= 0) ||
                        ws.status === 'Seats Full' || 
                        ws.status === 'Closed' ||
                        (ws.capacity && ws.registeredCount && Number(ws.registeredCount) >= Number(ws.capacity));

  return (
    <div className="w-[280px] sm:w-[320px] md:w-[350px] flex-shrink-0 rounded-3xl bg-neutral-950/95 border-2 border-neutral-800 hover:border-amber-400/80 transition-all duration-300 overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)] hover:shadow-[0_0_35px_rgba(245,158,11,0.2)] flex flex-col justify-between group relative select-none">
      {/* Cyber Corner HUD Brackets */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-500/70 group-hover:border-amber-400 z-30 pointer-events-none transition-colors" />
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-500/70 group-hover:border-amber-400 z-30 pointer-events-none transition-colors" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-500/70 group-hover:border-amber-400 z-30 pointer-events-none transition-colors" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-500/70 group-hover:border-amber-400 z-30 pointer-events-none transition-colors" />

      <div>
        {/* Poster Image Box - Official 1080x1350 Aspect Ratio */}
        <Link
          to={`/workshops/${ws.id}`}
          className="relative aspect-[1080/1350] w-full bg-neutral-950 overflow-hidden flex items-center justify-center block group/poster"
        >
          {/* Ambient blurred backdrop fill */}
          <img
            src={ws.posterUrl || '/hero-bg.png'}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover blur-lg opacity-25 scale-105 pointer-events-none"
          />

          {/* Main 1080x1350 poster image completely visible */}
          <img
            src={ws.posterUrl || '/hero-bg.png'}
            alt={ws.title}
            className="relative z-10 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            onError={(e) => { e.currentTarget.src = '/hero-bg.png'; }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/20 pointer-events-none z-10" />

          {/* ONLY AMOUNT / PAYMENT BADGE (Top-Right) */}
          <div className="absolute top-3.5 right-3.5 z-20">
            <div className="px-3.5 py-1.5 rounded-2xl bg-emerald-950/95 border-2 border-emerald-500 text-emerald-400 font-heading font-black text-sm sm:text-base shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              ₹{ws.price}
            </div>
          </div>

          {/* Title in Poster Overlay */}
          <div className="absolute bottom-3.5 left-4 right-4 z-20">
            <h3 className="font-heading font-black text-white text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-amber-400 transition-colors drop-shadow-md">
              {ws.title}
            </h3>
          </div>
        </Link>

        {/* Workshop Details Strip */}
        <div className="p-5 space-y-3.5">
          {/* Date, Time, Venue */}
          <div className="space-y-1.5 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <span className="text-white font-bold">{ws.date}</span>
              <span>•</span>
              <span>{ws.time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              <span className="truncate">{ws.venue}</span>
            </div>
          </div>

          {/* Instructor */}
          {ws.instructor && (
            <div className="p-2.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-heading font-bold text-xs flex-shrink-0">
                {ws.instructor.charAt(0)}
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-mono uppercase text-neutral-500 block leading-tight">Instructor</span>
                <span className="text-xs font-heading font-bold text-white truncate block">{ws.instructor}</span>
              </div>
            </div>
          )}

          {/* Short Description */}
          <p className="text-xs text-neutral-300 font-cyber line-clamp-2 leading-relaxed">
            {ws.shortDescription || ws.fullDescription}
          </p>
        </div>
      </div>

      {/* Bottom Action: If Seats Filled vs Open */}
      <div className="p-5 pt-0">
        {isSeatsFilled ? (
          <div className="space-y-2">
            <div className="w-full py-2.5 px-2.5 rounded-2xl bg-amber-950/80 border border-amber-500/50 text-amber-300 font-heading font-black text-[11px] uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>All seats filled · Register for another event</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/workshops"
                className="py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white font-mono text-[11px] text-center block transition-colors border border-neutral-800"
              >
                Workshops
              </Link>
              <Link
                to="/events"
                className="py-2 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-300 hover:text-white font-mono text-[11px] text-center block transition-colors border border-red-500/40 font-bold"
              >
                Other Events &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <Link
            to={`/workshops/${ws.id}`}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:brightness-110 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(223,37,49,0.5)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-102 active:scale-98"
          >
            <span>Details &middot; ₹{ws.price}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default function FeaturedWorkshopSpotlight() {
  const [workshops, setWorkshops] = useState(DEFAULT_WORKSHOPS);
  const [isPaused, setIsPaused] = useState(false);
  const [isReversed, setIsReversed] = useState(false);
  const trackRef = useRef(null);

  useEffect(() => {
    const unsub = subscribeWorkshops(
      (data) => {
        if (data && data.length > 0) {
          setWorkshops(data);
        }
      },
      () => {}
    );
    return () => unsub();
  }, []);

  // Filter starred/featured workshops
  const featuredWorkshops = useMemo(() => {
    const starred = workshops.filter((w) => w.featured);
    if (starred.length > 0) return starred;
    return workshops;
  }, [workshops]);

  // Ensure enough items in stream for seamless infinite marquee loop
  const streamWorkshops = useMemo(() => {
    if (featuredWorkshops.length === 0) return [];
    let list = [...featuredWorkshops];
    while (list.length < 8) {
      list = [...list, ...featuredWorkshops];
    }
    return list;
  }, [featuredWorkshops]);

  // Smooth side-scroll controls (pauses marquee on manual nudge for precision)
  const handleScrollLeft = () => {
    setIsPaused(true);
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: -360, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    setIsPaused(true);
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: 360, behavior: 'smooth' });
    }
  };

  if (!featuredWorkshops || featuredWorkshops.length === 0) {
    return null;
  }

  return (
    <section className="relative py-16 sm:py-24 bg-black text-white overflow-hidden border-t border-b border-red-500/20 selection:bg-red-600 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[350px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[350px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Cyber Corner HUD Accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500/60 z-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500/60 z-20 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500/60 z-20 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500/60 z-20 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
        
        {/* Section Header with Side-Scroll Arrows & Animation Controls */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-800/80 pb-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-mono uppercase tracking-widest font-bold shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-pulse" />
              <span>TOP EVENT &amp; WORKSHOP HIGHLIGHT</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading tracking-tight uppercase leading-none">
              FEATURED TECHNICAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-rose-500 to-red-500">MASTERCLASSES</span>
            </h2>

            <p className="text-xs sm:text-sm text-neutral-400 font-cyber max-w-2xl leading-relaxed">
              Curated deep-tech training led by industry specialists. Dedicated certification pass decoupled from the unified fest fee.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Pause / Resume Marquee Animation */}
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              title={isPaused ? 'Resume scrolling animation' : 'Pause scrolling animation'}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-colors cursor-pointer"
            >
              {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-red-400" />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            {/* Reverse Marquee Direction */}
            <button
              type="button"
              onClick={() => setIsReversed((prev) => !prev)}
              title="Reverse scrolling animation direction"
              className="p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-neutral-400 hover:text-amber-400" />
            </button>

            {/* Side-by-Side Nudge Scroll Arrows */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-md">
              <button
                type="button"
                onClick={handleScrollLeft}
                title="Scroll left"
                className="p-2 rounded-xl bg-black/60 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer border border-neutral-800 hover:border-amber-500/50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleScrollRight}
                title="Scroll right"
                className="p-2 rounded-xl bg-black/60 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer border border-neutral-800 hover:border-amber-500/50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <Link
              to="/workshops"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-950/70 to-neutral-900 hover:brightness-110 text-neutral-200 hover:text-white border border-red-500/40 text-xs font-mono uppercase tracking-wider font-bold transition-all group shadow-sm"
            >
              <span>All Bootcamps</span>
              <ArrowRight className="w-4 h-4 text-red-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* ── CONTINUOUS SCROLLING MARQUEE ANIMATION TRACK ── */}
        <div className="relative overflow-hidden py-2">
          {/* Subtle side fade vignettes for clean horizon scroll */}
          <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-r from-black via-black/80 to-transparent z-20 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-20 bg-gradient-to-l from-black via-black/80 to-transparent z-20 pointer-events-none" />

          <div
            ref={trackRef}
            className="flex overflow-x-auto no-scrollbar marquee-pause-hover py-2 scroll-smooth"
          >
            {/* Sub-track A */}
            <div
              className={`flex gap-6 pr-6 w-max shrink-0 ${
                isReversed ? 'animate-marquee-right' : 'animate-marquee-left'
              }`}
              style={{
                animationDuration: '40s',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
            >
              {streamWorkshops.map((ws, idx) => (
                <MasterclassCard
                  key={`ws-track-a-${ws.id}-${idx}`}
                  ws={ws}
                />
              ))}
            </div>

            {/* Sub-track B (Exact Clone for 100% Seamless Infinite Loop) */}
            <div
              className={`flex gap-6 pr-6 w-max shrink-0 ${
                isReversed ? 'animate-marquee-right' : 'animate-marquee-left'
              }`}
              style={{
                animationDuration: '40s',
                animationPlayState: isPaused ? 'paused' : 'running',
              }}
              aria-hidden="true"
              inert={true}
            >
              {streamWorkshops.map((ws, idx) => (
                <MasterclassCard
                  key={`ws-track-b-${ws.id}-${idx}`}
                  ws={ws}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
