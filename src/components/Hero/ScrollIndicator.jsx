import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function ScrollIndicator({ label = 'SCROLL DOWN', opacity = 1 }) {
  return (
    <motion.div
      style={{ opacity }}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 pointer-events-none select-none"
    >
      <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-cyan-400 font-semibold shadow-sm">
        {label}
      </span>

      {/* Futuristic Concentric Button Graphic from Storyboard */}
      <div className="relative w-8 h-8 rounded-full border border-cyan-400/60 bg-cyan-950/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-ping" />
        <div className="absolute w-2.5 h-2.5 rounded-full bg-cyan-400" />
      </div>

      <ChevronDown className="w-4 h-4 text-cyan-400/80 animate-bounce -mt-0.5" />
    </motion.div>
  );
}
