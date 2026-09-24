import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';

export default function HeroOverlay({ opacity = 1, y = 0, currentStageText = '' }) {
  return (
    <motion.div
      style={{ opacity, y }}
      className="absolute z-30 max-w-4xl mx-auto px-4 text-center flex flex-col items-center justify-center top-20 sm:top-24 pointer-events-auto"
    >
      {/* Active Stage Pill (Matches Storyboard) */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full cyber-glass border border-red-500/40 text-[11px] sm:text-xs font-mono text-red-300 uppercase tracking-widest mb-3 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
        <Sparkles className="w-3.5 h-3.5 text-red-400" />
        <span>{currentStageText || 'KL UNIVERSITY • MARCH 14-16, 2026'}</span>
      </div>

      {/* Symmetrical Hero Title */}
      <h1 className="text-4xl sm:text-6xl md:text-7xl font-black font-heading tracking-tight text-white select-none leading-none">
        SAMYAK <span className="text-red-500 text-glow-red">2026</span>
      </h1>

      <p className="mt-2 text-xs sm:text-sm md:text-base text-slate-300 font-cyber tracking-[0.2em] uppercase">
        WHERE INNOVATION MEETS CELEBRATION
      </p>

      {/* Action CTAs */}
      <div className="mt-5 flex items-center justify-center gap-3 sm:gap-4">
        <Link
          to="/events"
          className="px-6 py-2.5 rounded-full font-heading text-xs font-bold tracking-wider uppercase text-white bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:shadow-[0_0_30px_rgba(239,68,68,0.8)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 group cursor-pointer"
        >
          <span>Explore Events</span>
          <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <Link
          to="/payment"
          className="px-6 py-2.5 rounded-full font-heading text-xs font-bold tracking-wider uppercase text-white cyber-glass border border-red-500/50 hover:border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span className="text-red-400">Register Now</span>
        </Link>
      </div>
    </motion.div>
  );
}
