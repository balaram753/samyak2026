import { motion } from 'framer-motion';
import { pageVariants } from '../animations/pageAnimations';
import GallerySection from '../components/Gallery/GallerySection';
import { Sparkles } from 'lucide-react';

export default function GalleryPage() {
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
          Visual Chronicles
        </div>
        <h1 className="text-4xl sm:text-6xl font-black font-heading text-white tracking-tight">
          SAMYAK <span className="text-red-500 text-glow-red">PHOTO ARCHIVES</span>
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-300 font-cyber">
          Immerse yourself in memories of robotics combat, campus atmosphere, concert light shows, and delegate energy.
        </p>
      </div>

      <GallerySection />
    </motion.div>
  );
}
