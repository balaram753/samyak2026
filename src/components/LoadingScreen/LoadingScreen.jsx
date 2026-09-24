import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Terminal, Activity } from 'lucide-react';

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            setIsDone(true);
            setTimeout(() => {
              if (onComplete) onComplete();
            }, 600);
          }, 400);
          return 100;
        }
        // Smooth progressive increments
        const increment = Math.floor(Math.random() * 8) + 5;
        return Math.min(prev + increment, 100);
      });
    }, 85);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Dynamic system boot diagnostics based on progress
  const getStatusMessage = () => {
    if (progress < 20) return 'INITIALIZING FESTIVAL CORE // QUANTUM KERNEL READY';
    if (progress < 45) return 'BUFFERING 300-FRAME CINEMATIC 3D ODYSSEY...';
    if (progress < 70) return 'SYNCHRONIZING 45+ ARENAS, HACKATHONS & PRO SHOWS...';
    if (progress < 92) return 'ARMING ROBOTICS ARENAS & DOLBY CAMPUS AUDIO...';
    return 'SECURITY CLEARANCE VERIFIED • ENTERING SAMYAK 2026';
  };

  const milestones = [
    { label: 'KERNEL', threshold: 25 },
    { label: '3D ODYSSEY', threshold: 50 },
    { label: 'ARENAS', threshold: 75 },
    { label: 'LAUNCH', threshold: 100 },
  ];

  return (
    <AnimatePresence>
      {!isDone && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white select-none overflow-hidden"
        >
          {/* Background Cybernetic Grid & Ambient Red Glows */}
          <div className="absolute inset-0 cyber-grid-bg opacity-30" />
          
          {/* Deep Ambient Backlight Glows */}
          <div className="absolute w-[800px] h-[800px] rounded-full bg-red-600/15 blur-[180px] pointer-events-none" />
          <div className="absolute w-[450px] h-[450px] rounded-full bg-rose-600/20 blur-[120px] pointer-events-none animate-pulse duration-1000" />
          
          {/* Subtle Cyber scanline overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-40" />

          {/* ================= HUD CORNER FRAMING ================= */}
          {/* Top Left */}
          <div className="absolute top-5 left-5 sm:top-8 sm:left-8 flex flex-col gap-1 font-mono text-[10px] sm:text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_10px_#ef4444]" />
              </span>
              <span className="font-semibold text-neutral-300 tracking-wider">SAMYAK // FEST_OS_2026</span>
            </div>
            <span className="text-[9px] text-neutral-600 tracking-widest pl-4.5 hidden sm:inline">STATUS: ONLINE • 120 FPS</span>
          </div>

          {/* Top Right */}
          <div className="absolute top-5 right-5 sm:top-8 sm:right-8 font-mono text-[10px] sm:text-xs text-neutral-400 text-right tracking-widest">
            <div className="flex items-center justify-end gap-1.5 text-neutral-300 font-semibold">
              <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              <span>KL UNIVERSITY • AP</span>
            </div>
            <div className="text-[9px] text-red-400/80">16.4419° N, 80.6226° E</div>
          </div>

          {/* Bottom Left */}
          <div className="absolute bottom-5 left-5 sm:bottom-8 sm:left-8 font-mono text-[10px] sm:text-xs text-neutral-500 tracking-widest hidden sm:flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-red-500" />
            <span>ENCRYPTED SECURE CHANNEL // 256-BIT SSL</span>
          </div>

          {/* Bottom Right */}
          <div className="absolute bottom-5 right-5 sm:bottom-8 sm:right-8 font-mono text-[10px] sm:text-xs text-neutral-400 text-right tracking-widest hidden sm:block">
            <span className="text-neutral-500">DATES: </span>
            <span className="text-red-400 font-semibold">OCTOBER 29-31, 2026</span>
          </div>

          {/* Decorative Corner Reticles */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-red-500/40 pointer-events-none" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-red-500/40 pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-red-500/40 pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-red-500/40 pointer-events-none" />

          {/* ================= CENTRAL CONTENT ================= */}
          <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-2xl w-full">
            
            {/* Grand Kinetic Reactor with Massive Logo */}
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 mb-6 sm:mb-8 flex items-center justify-center"
            >
              {/* Pulse Radar Wave */}
              <div className="absolute -inset-4 sm:-inset-6 rounded-full border border-red-500/20 animate-ping duration-1000 pointer-events-none" />

              {/* Layer 1: Outermost High-Tech Calibrated Orbit */}
              <div className="absolute inset-0 rounded-full border-2 border-red-500/25 border-t-red-500 border-r-rose-500 shadow-[0_0_35px_rgba(239,68,68,0.3)] animate-spin duration-[8s]" />

              {/* Layer 2: Segmented Dashed Reverse Ring with Notches */}
              <div className="absolute inset-3 sm:inset-4 rounded-full border-2 border-dashed border-red-500/30 border-b-transparent animate-[spin_6s_linear_infinite_reverse]" />

              {/* Layer 3: High-Voltage Inner Gyro Ring */}
              <div className="absolute inset-6 sm:inset-8 rounded-full border border-rose-500/40 border-l-red-400 animate-[spin_4s_linear_infinite]" />

              {/* Layer 4: Reticle Brackets Framing the Logo */}
              <div className="absolute inset-8 sm:inset-10 pointer-events-none">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-400/80" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-400/80" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-400/80" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-400/80" />
              </div>

              {/* Core Intense Ambient Glow Behind Logo */}
              <div className="absolute inset-10 sm:inset-12 rounded-full bg-gradient-radial from-red-600/45 via-rose-600/20 to-transparent blur-xl" />

              {/* Laser Scanning Line traversing across the logo */}
              <div className="absolute inset-6 sm:inset-8 rounded-full overflow-hidden pointer-events-none z-20">
                <motion.div
                  className="w-full h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent shadow-[0_0_12px_#ef4444]"
                  animate={{ y: ['-10%', '1100%'] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                />
              </div>

              {/* Magnified, Commanding SAMYAK Logo Emblem */}
              <motion.img
                src="/samyak-logo.png"
                alt="SAMYAK 2026 Official Logo Emblem"
                initial={{ scale: 0.9 }}
                animate={{ scale: [0.96, 1.05, 0.96] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
                className="w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 object-contain relative z-10 filter drop-shadow-[0_0_30px_rgba(239,68,68,1)] drop-shadow-[0_0_70px_rgba(239,68,68,0.6)]"
              />
            </motion.div>

            {/* Typography & Subheadings */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="space-y-2 mb-6"
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-950/40 border border-red-500/40 text-[10px] sm:text-xs font-mono text-red-400 uppercase tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <Sparkles className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>The National Phenomenon</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-100 to-red-400 font-heading leading-tight">
                SAMYAK <span className="text-red-500 text-glow-red">2026</span>
              </h1>

              <p className="text-xs sm:text-sm uppercase tracking-[0.35em] text-red-400/85 font-cyber font-semibold">
                KL UNIVERSITY • TECHNO-MANAGEMENT FEST
              </p>
            </motion.div>

            {/* Futuristic Progress Readout & Track */}
            <div className="w-full max-w-md sm:max-w-lg space-y-3.5">
              {/* Percentage & Audio Equalizer Line */}
              <div className="flex justify-between items-end text-xs font-mono tracking-widest px-1">
                <div className="flex items-center gap-2">
                  {/* Mini animated equalizer bars */}
                  <div className="flex items-end gap-1 h-4">
                    {[0.6, 1, 0.4, 0.8, 0.5, 0.9, 0.3].map((height, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-red-500 rounded-t"
                        animate={{ height: [`${height * 100}%`, `${(1.1 - height) * 100}%`, `${height * 100}%`] }}
                        transition={{ repeat: Infinity, duration: 0.8 + i * 0.15, ease: 'easeInOut' }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider">SYSTEM CALIBRATION</span>
                </div>

                <div className="flex items-baseline">
                  <span className="text-3xl sm:text-4xl font-black font-heading text-red-400 text-glow-red tracking-tight">
                    {progress}
                  </span>
                  <span className="text-sm font-mono text-neutral-400 ml-1">%</span>
                </div>
              </div>

              {/* Progress Bar Track with White Laser Scanner Tip */}
              <div className="h-2.5 sm:h-3 w-full bg-neutral-950 border border-red-500/40 rounded-full overflow-hidden p-[2px] shadow-[0_0_20px_rgba(239,68,68,0.25)]">
                <motion.div
                  className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-red-400 rounded-full relative shadow-[0_0_15px_#ef4444]"
                  style={{ width: `${progress}%` }}
                >
                  {/* Leading Laser Scanner Beam */}
                  <div className="absolute right-0 top-0 bottom-0 w-3 bg-white rounded-full shadow-[0_0_10px_#ffffff,0_0_20px_#ef4444]" />
                </motion.div>
              </div>

              {/* Milestone Indicator Pills */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {milestones.map((m) => {
                  const active = progress >= m.threshold;
                  return (
                    <div
                      key={m.label}
                      className={`text-center py-1 px-1 rounded border text-[9px] sm:text-[10px] font-mono tracking-wider transition-all duration-300 ${
                        active
                          ? 'border-red-500/70 bg-red-950/40 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                          : 'border-neutral-900 bg-black/40 text-neutral-600'
                      }`}
                    >
                      <div className="truncate">{m.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Live Status Diagnostics */}
              <div className="h-5 flex items-center justify-center pt-1">
                <p className="text-[10px] sm:text-[11px] text-neutral-300 font-mono tracking-wider flex items-center gap-1.5 transition-all">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                  <span>{getStatusMessage()}</span>
                </p>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

