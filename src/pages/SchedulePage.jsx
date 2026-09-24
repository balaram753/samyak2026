import { motion } from 'framer-motion';
import { pageVariants } from '../animations/pageAnimations';
import ScheduleSection from '../components/Schedule/ScheduleSection';
import { Sparkles } from 'lucide-react';

export default function SchedulePage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 min-h-screen bg-black"
    >
      <div className="relative py-12 sm:py-16 text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-4">
          <Sparkles className="w-4 h-4 text-red-400" />
          Master Timeline
        </div>
        <h1 className="text-4xl sm:text-6xl font-black font-heading text-white tracking-tight">
          COMPLETE <span className="text-red-500 text-glow-red">FESTIVAL SCHEDULE</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-300 font-cyber">
          Plan your 3 days across October 29, 30, and 31, 2026. Keep track of timings, venues, and live stage checkpoints.
        </p>
      </div>

      <ScheduleSection />
    </motion.div>
  );
}
