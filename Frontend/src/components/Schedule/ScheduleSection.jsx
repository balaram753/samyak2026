import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView, useScroll, useSpring } from 'framer-motion';
import {
  Clock, MapPin, Sparkles, User, Star,
  Calendar, Radio, ChevronRight,
  Music, Code2, Gamepad2, Cpu, Trophy, Mic
} from 'lucide-react';
import { SCHEDULE_DAYS } from '../../data/schedule';
import { useSiteContent } from '../../context/SiteContentContext';

/* ── Category meta: icon + colours ─────────────────────────── */
const CAT_META = {
  ceremony:    { icon: Star,     color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30',  bar: 'bg-amber-500' },
  technical:   { icon: Code2,    color: 'text-blue-400',    bg: 'bg-blue-500/15 border-blue-500/30',    bar: 'bg-blue-500' },
  workshops:   { icon: Cpu,      color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/30',    bar: 'bg-cyan-500' },
  gaming:      { icon: Gamepad2, color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30', bar: 'bg-emerald-500' },
  competitions:{ icon: Trophy,   color: 'text-violet-400',  bg: 'bg-violet-500/15 border-violet-500/30', bar: 'bg-violet-500' },
  cultural:    { icon: Music,    color: 'text-rose-400',    bg: 'bg-rose-500/15 border-rose-500/30',    bar: 'bg-rose-500' },
  keynote:     { icon: Mic,      color: 'text-orange-400',  bg: 'bg-orange-500/15 border-orange-500/30', bar: 'bg-orange-500' },
};
function getCat(cat) {
  return CAT_META[(cat || '').toLowerCase()] || CAT_META.technical;
}

/* ── Single timeline event card with Scroll-reactive entry ──── */
function EventRow({ slot, index, isLast }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: false, margin: '-50px' });
  const meta = getCat(slot.category);
  const Icon = meta.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -35, scale: 0.96 }}
      animate={inView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0.25, x: -15, scale: 0.98 }}
      transition={{ duration: 0.45, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex gap-4 sm:gap-6 group"
    >
      {/* ── Left: Spine + Node ─────────── */}
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        {/* Node */}
        <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110
          ${slot.highlight
            ? 'border-red-500 bg-red-950/90 shadow-[0_0_20px_rgba(223,37,49,0.8)]'
            : inView
              ? 'border-red-500/70 bg-neutral-900 shadow-[0_0_12px_rgba(223,37,49,0.3)]'
              : 'border-neutral-700 bg-neutral-900'
          }`}
        >
          <Icon className={`w-3.5 h-3.5 ${slot.highlight ? 'text-red-400' : meta.color}`} />
          {slot.highlight && (
            <span className="absolute inset-0 rounded-full animate-ping bg-red-500/30 pointer-events-none" />
          )}
        </div>
        {/* Spine */}
        {!isLast && (
          <div className="w-[2px] flex-1 mt-1 bg-gradient-to-b from-red-500/50 via-neutral-800 to-neutral-900" />
        )}
      </div>

      {/* ── Right: Card with Cyber Shimmer ──────────────── */}
      <div className={`mb-6 flex-1 rounded-2xl border overflow-hidden transition-all duration-300 relative
        ${slot.highlight
          ? 'border-red-500/50 bg-gradient-to-br from-[#0a0505] via-neutral-950 to-black shadow-[0_0_35px_rgba(223,37,49,0.18)]'
          : 'border-neutral-800/80 bg-neutral-950/80 hover:border-red-500/40 hover:shadow-[0_8px_30px_rgba(223,37,49,0.12)]'
        }
        group-hover:-translate-y-1`}
      >
        {/* Top coloured accent bar */}
        <div className={`h-[3px] w-full ${slot.highlight ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500' : meta.bar + '/70'}`} />

        <div className="p-4 sm:p-5">
          {/* Time + Category pill row */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/80 border border-neutral-800 text-[11px] font-mono font-bold text-red-300 shadow-inner">
              <Clock className="w-3 h-3 text-red-500" />
              {slot.time}
            </span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${meta.bg} ${meta.color}`}>
              <Icon className="w-2.5 h-2.5" />
              {slot.category}
            </span>
          </div>

          {/* Title */}
          <h4 className={`text-sm sm:text-base font-black font-heading leading-snug tracking-wide mb-2 transition-colors ${
            slot.highlight ? 'text-white group-hover:text-red-300' : 'text-neutral-100 group-hover:text-white'
          }`}>
            {slot.title}
          </h4>

          {/* Speaker */}
          {slot.speaker && (
            <div className="flex items-center gap-1.5 text-xs font-cyber text-neutral-400 mb-3">
              <User className="w-3 h-3 text-red-400 flex-shrink-0" />
              <span>{slot.speaker}</span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-neutral-800/60 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
              <MapPin className="w-3 h-3 text-red-500/80 flex-shrink-0" />
              <span className="truncate">{slot.venue}</span>
            </span>
            {slot.highlight && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 text-red-400 text-[10px] font-mono font-bold uppercase tracking-wider bg-red-950/60 px-2 py-0.5 rounded-md border border-red-500/30">
                <Sparkles className="w-3 h-3" />
                Flagship
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Main Component ─────────────────────────────────────────── */
export default function ScheduleSection() {
  const { scheduleDays } = useSiteContent();
  const allDays = scheduleDays?.length > 0 ? scheduleDays : SCHEDULE_DAYS;

  const [activeDay, setActiveDay] = useState(0);
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  const timelineContainerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: timelineContainerRef,
    offset: ['start 80%', 'end 80%']
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001
  });

  const day = allDays[activeDay] || allDays[0];
  const totalEvents = day?.events?.length || 0;

  // Stats for the active day
  const highlights = day?.events?.filter(e => e.highlight).length || 0;
  const categories = [...new Set((day?.events || []).map(e => e.category))];

  return (
    <section id="schedule" className="relative py-20 sm:py-28 bg-black overflow-hidden selection:bg-red-600 selection:text-white">

      {/* ── Background atmosphere ── */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
      <div className="absolute top-1/4 left-0 w-[600px] h-[600px] bg-red-600/[0.07] rounded-full blur-[180px] pointer-events-none -translate-x-1/2" />
      <div className="absolute bottom-1/4 right-0 w-[550px] h-[550px] bg-amber-600/[0.05] rounded-full blur-[170px] pointer-events-none translate-x-1/3" />

      {/* Scan-line texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 4px)' }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        {/* ══════════════════════════════════════════════
            SECTION HEADER
        ══════════════════════════════════════════════ */}
        <div ref={headerRef} className="text-center mb-10 sm:mb-14">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-500/10 text-xs font-mono text-red-400 uppercase tracking-widest mb-4 shadow-[0_0_20px_rgba(223,37,49,0.2)]"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
            <span>3-Day Mission Timeline &middot; Synchronized</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black font-heading text-white tracking-tight uppercase leading-none"
          >
            FESTIVAL{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 text-glow-red">
              SCHEDULE
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={headerInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-xs sm:text-sm text-neutral-400 font-cyber max-w-xl mx-auto mt-3"
          >
            Scroll to traverse all 45+ flagship arenas, technical workshops, competitions, and pro-night sessions across 3 days.
          </motion.p>

        </div>

        {/* ══════════════════════════════════════════════
            LIVE HORIZONTAL TIMELINE TICKER (MARQUEE SCROLLING ANIMATION)
        ══════════════════════════════════════════════ */}
        <div className="relative overflow-hidden mb-10 py-3 rounded-2xl bg-neutral-950/90 border border-red-500/30 shadow-[0_0_30px_rgba(223,37,49,0.12)] flex items-center">
          {/* Sticky Left Beacon */}
          <div className="flex-shrink-0 px-3 py-1 ml-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white font-mono text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-[0_0_15px_rgba(223,37,49,0.5)] z-20">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>TIMELINE TICKER</span>
          </div>

          {/* Marquee Track Container */}
          <div className="flex overflow-hidden no-scrollbar w-full ml-4 marquee-pause-hover select-none">
            {/* Sub-track A */}
            <div className="flex gap-8 w-max shrink-0 animate-marquee-left text-xs font-mono text-neutral-300">
              {allDays.flatMap(d => (d.events || []).map((ev, i) => (
                <span key={`ticker-a-${d.day}-${i}-${ev.title}`} className="inline-flex items-center gap-2">
                  <span className="text-red-400 font-bold">[{d.day} &bull; {ev.time}]</span>
                  <span className="text-white font-heading font-bold">{ev.title}</span>
                  <span className="text-neutral-500">@{ev.venue}</span>
                  <span className="text-amber-500">&bull;</span>
                </span>
              )))}
            </div>

            {/* Sub-track B (Exact clone for infinite smooth loop) */}
            <div className="flex gap-8 w-max shrink-0 animate-marquee-left text-xs font-mono text-neutral-300" aria-hidden="true" inert="">
              {allDays.flatMap(d => (d.events || []).map((ev, i) => (
                <span key={`ticker-b-${d.day}-${i}-${ev.title}`} className="inline-flex items-center gap-2">
                  <span className="text-red-400 font-bold">[{d.day} &bull; {ev.time}]</span>
                  <span className="text-white font-heading font-bold">{ev.title}</span>
                  <span className="text-neutral-500">@{ev.venue}</span>
                  <span className="text-amber-500">&bull;</span>
                </span>
              )))}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            DAY SELECTOR — Pill tabs
        ══════════════════════════════════════════════ */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex gap-2 p-1.5 rounded-2xl bg-neutral-950 border border-neutral-800/80 backdrop-blur-xl shadow-xl">
            {allDays.map((d, idx) => (
              <button
                key={d.day}
                type="button"
                onClick={() => setActiveDay(idx)}
                className={`relative px-6 sm:px-9 py-3 rounded-xl text-xs sm:text-sm font-heading font-black uppercase tracking-wider transition-all duration-300 cursor-pointer overflow-hidden ${
                  activeDay === idx ? 'text-white' : 'text-neutral-500 hover:text-neutral-200'
                }`}
              >
                {activeDay === idx && (
                  <motion.span
                    layoutId="scheduleActiveDay"
                    className="absolute inset-0 bg-gradient-to-br from-red-600 via-rose-600 to-red-500 rounded-xl -z-10 shadow-[0_0_25px_rgba(223,37,49,0.55)]"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="flex flex-col items-center leading-tight">
                  <span>{d.day}</span>
                  <span className={`text-[10px] font-mono font-normal ${activeDay === idx ? 'text-white/70' : 'text-neutral-600'}`}>
                    {d.date?.split(',')[0]}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════
            ACTIVE DAY HERO STRIP
        ══════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`dayHero-${activeDay}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="mb-8 p-5 sm:p-7 rounded-3xl border border-neutral-800/80 bg-neutral-950/70 backdrop-blur-md flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8"
          >
            {/* Day identity */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest font-bold">{day.day}</span>
                <span className="text-neutral-700">&middot;</span>
                <span className="text-[10px] font-mono text-neutral-500">{day.date}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-heading text-white tracking-tight uppercase mb-1">
                {day.title}
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 font-cyber leading-relaxed">{day.description}</p>
            </div>

            {/* Stats pills */}
            <div className="flex sm:flex-col gap-2 sm:gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/60 border border-neutral-800">
                <Calendar className="w-4 h-4 text-red-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase leading-none">Events</span>
                  <span className="text-base font-black font-heading text-white">{totalEvents}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/60 border border-neutral-800">
                <Star className="w-4 h-4 text-amber-400" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase leading-none">Flagship</span>
                  <span className="text-base font-black font-heading text-white">{highlights}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ══════════════════════════════════════════════
            CATEGORY LEGEND
        ══════════════════════════════════════════════ */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {categories.map((cat) => {
            const m = getCat(cat);
            const I = m.icon;
            return (
              <span
                key={cat}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${m.bg} ${m.color}`}
              >
                <I className="w-2.5 h-2.5" />
                {cat}
              </span>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            TIMELINE FEED WITH DYNAMIC SCROLL PROGRESS BEAM
        ══════════════════════════════════════════════ */}
        <div ref={timelineContainerRef} className="relative max-w-3xl mx-auto pt-2 pb-6">
          {/* Ambient Laser Beam tracking scroll progress down the spine */}
          <div className="absolute left-[15px] top-6 bottom-10 w-[2px] bg-neutral-900 pointer-events-none">
            <motion.div
              className="w-full bg-gradient-to-b from-red-500 via-rose-500 to-amber-500 origin-top shadow-[0_0_15px_rgba(223,37,49,0.8)]"
              style={{ scaleY: smoothProgress, height: '100%' }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`feed-${activeDay}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {(day.events || []).map((slot, idx) => (
                <EventRow
                  key={`${day.day}-${idx}`}
                  slot={slot}
                  index={idx}
                  isLast={idx === (day.events.length - 1)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ══════════════════════════════════════════════
            BOTTOM NAV HINT (if more days)
        ══════════════════════════════════════════════ */}
        {activeDay < allDays.length - 1 && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setActiveDay((p) => Math.min(p + 1, allDays.length - 1));
                window.scrollTo({ top: 300, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-neutral-950 border border-neutral-800 hover:border-red-500/50 text-neutral-300 hover:text-white text-xs font-mono uppercase tracking-widest transition-all cursor-pointer group shadow-lg"
            >
              <span>Next: {allDays[activeDay + 1]?.title}</span>
              <ChevronRight className="w-4 h-4 text-red-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}

      </div>
    </section>
  );
}
