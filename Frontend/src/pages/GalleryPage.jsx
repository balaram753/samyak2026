import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageVariants } from '../animations/pageAnimations';
import GallerySection from '../components/Gallery/GallerySection';
import ArtworkExhibition3D from '../components/Gallery/ArtworkExhibition3D';
import InteractiveBookshelfScene from '../components/Gallery/InteractiveBookshelfScene';
import { Sparkles, BookOpen, Layers, Images } from 'lucide-react';

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState('bookshelf'); // 'bookshelf' | '3d' | 'photos'

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 min-h-screen bg-black text-white"
    >
      <div className="relative py-8 sm:py-12 text-center max-w-5xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-4">
          <Sparkles className="w-4 h-4 text-red-400" />
          <span>Interactive 3D Visual Gallery</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black font-heading tracking-tight uppercase">
          SAMYAK <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-red-500 text-glow-red">EXHIBITION GALLERY</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-neutral-400 font-cyber max-w-xl mx-auto">
          Explore the interactive 3D Bookshelf archive, event arena posters, and captured festival moments.
        </p>

        {/* View Switcher Tabs */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="inline-flex p-1 rounded-2xl bg-neutral-900 border border-neutral-800 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setActiveTab('bookshelf')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-heading font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'bookshelf'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>3D Bookshelf</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('3d')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-heading font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === '3d'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>3D Arena</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('photos')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-heading font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'photos'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
              }`}
            >
              <Images className="w-4 h-4" />
              <span>Photo Archives</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Exhibition Container */}
      <div className="max-w-[1600px] mx-auto px-4 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'bookshelf' ? (
            <motion.div
              key="bookshelf"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <InteractiveBookshelfScene />
            </motion.div>
          ) : activeTab === '3d' ? (
            <motion.div
              key="3d"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <ArtworkExhibition3D />
            </motion.div>
          ) : (
            <motion.div
              key="photos"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
            >
              <GallerySection />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
