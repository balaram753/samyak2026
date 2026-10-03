import { motion } from 'framer-motion';
import { pageVariants } from '../animations/pageAnimations';
import EventsSection from '../components/Events/EventsSection';
import { Sparkles } from 'lucide-react';

export default function EventsPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-20 sm:pt-24 min-h-screen bg-black"
    >
      <div className="relative pt-6 pb-2 text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-2.5">
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          <span>The Arena of Champions</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight uppercase">
          ALL <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-glow-red">SAMYAK EVENTS</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-400 font-cyber max-w-xl mx-auto">
          Explore 30+ national competitions, hands-on engineering workshops, robotics arenas, and cultural spectacles.
        </p>
      </div>

      {/* Normal Events Catalog Grid View with compact spacing */}
      <div id="catalog-view">
        <EventsSection limit={null} showFilter={true} showViewAll={false} isHomePage={false} />
      </div>
    </motion.div>
  );
}
