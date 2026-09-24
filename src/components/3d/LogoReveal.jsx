import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function LogoReveal({ 
  opacity = 0, 
  scale = 1,
  onExploreClick 
}) {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full preserve-3d flex items-center justify-center overflow-hidden"
      style={{ opacity }}
    >
      {/* -----------------------------------------------------------------------
          LAYER 1: The Chamber Artwork (Storyboard Panel 04 Exact Visual)
          ----------------------------------------------------------------------- */}
      <motion.div
        className="absolute inset-0 w-full h-full preserve-3d flex items-center justify-center will-change-transform"
        style={{ scale }}
      >
        <img
          src="/pyramid/stage-04-interior.jpg"
          alt="SAMYAK Core Chamber"
          className="w-full h-full object-cover object-center filter contrast-110 brightness-95 select-none"
        />

        {/* Concentric Rotating Energy Ring Highlights */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-full border border-red-500/30 border-t-red-500 animate-[spin_8s_linear_infinite] shadow-[0_0_30px_rgba(239,68,68,0.4)]" />
          <div className="absolute w-[260px] h-[260px] sm:w-[360px] sm:h-[360px] rounded-full border border-rose-400/40 border-b-rose-400 animate-[spin_6s_linear_infinite_reverse]" />
          <div className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-red-500/30 via-rose-500/40 to-transparent blur-[35px]" />
        </div>
      </motion.div>

      {/* -----------------------------------------------------------------------
          LAYER 2: Interactive Foreground Action in Chamber (Stage 04 Welcome)
          ----------------------------------------------------------------------- */}
      <div className="relative z-20 flex flex-col items-center justify-center text-center px-4 max-w-2xl pointer-events-auto">
        <div className="mt-48 sm:mt-56 flex flex-col items-center gap-3">
          <Link
            to="/events"
            onClick={onExploreClick}
            className="px-8 py-3.5 rounded-full font-heading text-xs sm:text-sm font-black tracking-widest uppercase text-white bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_30px_rgba(239,68,68,0.7)] hover:shadow-[0_0_45px_rgba(239,68,68,0.9)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer"
          >
            <span>EXPLORE SAMYAK</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Link>

          <div className="text-[11px] font-mono tracking-[0.25em] text-red-400 uppercase">
            IDEAS BEYOND LIMITS • KL UNIVERSITY
          </div>
        </div>
      </div>
    </motion.div>
  );
}
