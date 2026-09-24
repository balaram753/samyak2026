import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Play, Pause, Music } from 'lucide-react';
import { 
  subscribeAudioState, 
  toggleLaunchMusic, 
  setMusicMuted 
} from '../../services/launchAudio';

export default function GlobalAudioPlayer() {
  const [audioState, setAudioState] = useState({
    isPlaying: false,
    isMuted: false,
  });

  useEffect(() => {
    return subscribeAudioState(setAudioState);
  }, []);

  if (!audioState.isPlaying) {
    // Subtle mini-pill when paused so user can restart music anytime
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <button
          type="button"
          onClick={toggleLaunchMusic}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-800 hover:border-red-500/50 text-neutral-400 hover:text-white text-[11px] font-mono shadow-2xl transition-all cursor-pointer backdrop-blur-md"
          title="Play SAMYAK 2026 Anthem"
        >
          <Music className="w-3.5 h-3.5 text-red-500" />
          <span className="hidden sm:inline">Play Anthem</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 font-mono">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-black/85 border border-red-500/30 text-white shadow-[0_4px_30px_rgba(239,68,68,0.25)] backdrop-blur-xl"
      >
        {/* Animated Equalizer Wave */}
        <div className="flex items-end gap-1 h-3.5 px-1">
          {[0.5, 0.9, 0.4, 1.0, 0.7].map((height, i) => (
            <motion.div
              key={i}
              className="w-0.5 bg-red-500 rounded-t"
              animate={audioState.isPlaying ? {
                height: [`${height * 100}%`, `${(1.1 - height) * 100}%`, `${height * 100}%`]
              } : { height: '30%' }}
              transition={{ repeat: Infinity, duration: 0.6 + i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>

        {/* Track Label */}
        <div className="flex flex-col text-[10px] leading-tight pr-1">
          <span className="font-semibold text-neutral-200">SAMYAK 2026</span>
          <span className="text-[8px] text-red-400 uppercase tracking-wider">OFFICIAL ANTHEM</span>
        </div>

        {/* Play / Pause Toggle */}
        <button
          type="button"
          onClick={toggleLaunchMusic}
          aria-label={audioState.isPlaying ? 'Pause music' : 'Play music'}
          className="p-1 rounded-full bg-neutral-900 hover:bg-red-600/30 text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          {audioState.isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5 text-red-400 fill-red-400" />
          )}
        </button>

        {/* Mute / Unmute Toggle */}
        <button
          type="button"
          onClick={() => setMusicMuted(!audioState.isMuted)}
          aria-label={audioState.isMuted ? 'Unmute music' : 'Mute music'}
          className="p-1 rounded-full bg-neutral-900 hover:bg-red-600/30 text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          {audioState.isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-neutral-500" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-red-400" />
          )}
        </button>
      </motion.div>
    </div>
  );
}
