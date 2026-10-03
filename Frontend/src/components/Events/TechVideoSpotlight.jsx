import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, Film, Compass } from 'lucide-react';

export default function TechVideoSpotlight() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    } else if (videoRef.current.webkitRequestFullscreen) {
      videoRef.current.webkitRequestFullscreen();
    }
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 my-8 sm:my-12">
      {/* Background ambient neon glow */}
      <div className="absolute -inset-1.5 bg-gradient-to-r from-red-600/30 via-rose-500/20 to-cyan-500/30 rounded-3xl blur-2xl opacity-75 pointer-events-none" />

      {/* Cyberpunk Container Card */}
      <div 
        className="relative rounded-3xl overflow-hidden bg-neutral-950 border border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.25)] group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        {/* Top Telemetry Header Bar */}
        <div className="px-5 py-3 bg-neutral-950/90 border-b border-neutral-800/80 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-red-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                SAMYAK TECHNICAL TEASER // 1080P
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-mono font-bold tracking-widest uppercase">
              OFFICIAL MEDIA
            </span>
          </div>
        </div>

        {/* Video Player Frame */}
        <div className="relative aspect-video w-full bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            src="/events/tech-vid.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover object-center filter contrast-105"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Vignette gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

          {/* Quick HUD Overlays */}
          <AnimatePresence>
            {(showControls || !isPlaying) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center gap-4 transition-all"
              >
                {/* Large Center Play/Pause button */}
                <button
                  type="button"
                  onClick={togglePlay}
                  className="p-5 sm:p-6 rounded-full bg-red-600/90 text-white border-2 border-red-400 shadow-[0_0_40px_rgba(239,68,68,0.8)] hover:scale-110 active:scale-95 transition-all cursor-pointer"
                  title={isPlaying ? "Pause Video" : "Play Video"}
                >
                  {isPlaying ? (
                    <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-white" />
                  ) : (
                    <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-white ml-1" />
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Control Bar */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-auto z-20">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700/80 backdrop-blur-md transition-all cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={toggleMute}
                className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700/80 backdrop-blur-md transition-all cursor-pointer flex items-center gap-2"
                title={isMuted ? "Unmute Audio" : "Mute Audio"}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-red-400" />
                    <span className="text-[11px] font-mono text-neutral-300 hidden sm:inline">UNMUTE</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-mono text-emerald-400 font-bold hidden sm:inline">SOUND ON</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-neutral-300 bg-neutral-900/80 border border-neutral-800 px-3 py-1.5 rounded-xl hidden sm:inline-block">
                KL UNIVERSITY FESTIVAL
              </span>
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2.5 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 text-white border border-neutral-700/80 backdrop-blur-md transition-all cursor-pointer"
                title="Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Description Strip */}
        <div className="p-4 sm:p-5 bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-neutral-800">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-red-400 uppercase tracking-widest mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>THE TECHNICAL ODYSSEY</span>
            </div>
            <h3 className="text-lg sm:text-xl font-heading font-black text-white uppercase tracking-tight">
              Innovation &middot; Autonomy &middot; Competition
            </h3>
            <p className="text-xs text-neutral-400 font-cyber mt-1 max-w-2xl">
              From autonomous agent sprints and cyber war-games to robotic combat and live build-and-deploy hackathons.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="#catalog-view"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Events</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
