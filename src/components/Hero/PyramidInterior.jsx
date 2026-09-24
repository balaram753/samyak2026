import { useMemo } from 'react';
import { motion } from 'framer-motion';

export default function PyramidInterior({ scrollProgress = 0, logoScale = 1, logoOpacity = 0 }) {
  // Generate converging triangular rib frames for the corridor
  const ribs = useMemo(() => [
    { z: 0, scale: 1.0, opacity: 0.9 },
    { z: -100, scale: 0.85, opacity: 0.8 },
    { z: -200, scale: 0.72, opacity: 0.7 },
    { z: -300, scale: 0.60, opacity: 0.6 },
    { z: -400, scale: 0.50, opacity: 0.5 },
    { z: -500, scale: 0.40, opacity: 0.4 },
    { z: -600, scale: 0.32, opacity: 0.3 },
  ], []);

  // Corridor forward camera motion
  const corridorZ = (scrollProgress - 0.5) * 600;

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none perspective-1000 bg-black">
      {/* Deep Background Gradient & Vanishing Point Core */}
      <div className="absolute inset-0 bg-radial from-cyan-950/20 via-black to-black" />

      {/* Vanishing Point Glow */}
      <div className="absolute w-72 h-72 rounded-full bg-cyan-500/20 blur-[80px] pointer-events-none" />
      <div className="absolute w-44 h-44 rounded-full bg-orange-500/25 blur-[50px] pointer-events-none" />

      {/* Triangular Corridor Architecture (3D Perspective Ribs) */}
      <div
        className="relative w-full h-full flex items-center justify-center preserve-3d"
        style={{
          transform: `translateZ(${corridorZ}px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Converging Triangular Rib Frames */}
        {ribs.map((rib, idx) => (
          <div
            key={idx}
            className="absolute flex items-center justify-center pointer-events-none"
            style={{
              transform: `scale(${rib.scale}) translateZ(${rib.z}px)`,
              opacity: rib.opacity,
            }}
          >
            {/* Triangular Portal Frame */}
            <svg
              className="w-[850px] h-[550px] sm:w-[1100px] sm:h-[700px] filter drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]"
              viewBox="0 0 1000 650"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Triangular Arch */}
              <polygon
                points="500,60 90,620 910,620"
                stroke="rgba(6, 182, 212, 0.4)"
                strokeWidth="2"
                fill="none"
              />

              {/* Inner Beveled Mechanical Rim */}
              <polygon
                points="500,90 120,600 880,600"
                stroke="rgba(56, 189, 248, 0.25)"
                strokeWidth="1.5"
                fill="none"
              />

              {/* Cyan Neon Corner Nodes */}
              <circle cx="500" cy="60" r="4" fill="#22d3ee" className="animate-pulse" />
              <circle cx="90" cy="620" r="4" fill="#22d3ee" />
              <circle cx="910" cy="620" r="4" fill="#22d3ee" />

              {/* Orange Energy Core Conduits */}
              <line x1="500" y1="60" x2="500" y2="280" stroke="rgba(249, 115, 22, 0.5)" strokeWidth="2" strokeDasharray="6 4" />
              <line x1="90" y1="620" x2="350" y2="480" stroke="rgba(249, 115, 22, 0.4)" strokeWidth="1.5" />
              <line x1="910" y1="620" x2="650" y2="480" stroke="rgba(249, 115, 22, 0.4)" strokeWidth="1.5" />
            </svg>
          </div>
        ))}

        {/* Reflective Metallic Floor Runway */}
        <div
          className="absolute bottom-0 w-[600px] sm:w-[800px] h-[350px] bg-gradient-to-t from-cyan-950/40 to-transparent border-t border-cyan-500/30"
          style={{
            transform: 'rotateX(75deg) translateZ(40px)',
            transformOrigin: 'bottom center',
          }}
        >
          {/* Central Guidance Laser Strip */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-2 bg-gradient-to-t from-cyan-400 via-sky-400 to-orange-400 shadow-[0_0_20px_#22d3ee]" />
          <div className="absolute inset-0 cyber-grid-bg opacity-40" />
        </div>

        {/* SAMYAK 2026 Logo Embedded at Far End of Corridor */}
        <motion.div
          style={{
            scale: logoScale,
            opacity: logoOpacity,
          }}
          className="absolute z-20 flex flex-col items-center justify-center text-center px-4 max-w-2xl pointer-events-none"
        >
          {/* Energy Particles Aura Behind Logo */}
          <div className="absolute w-80 h-80 rounded-full bg-red-600/20 blur-[70px]" />
          <div className="absolute w-56 h-56 rounded-full bg-rose-600/25 blur-[50px]" />

          {/* Glowing Emblem */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border border-red-500/50 animate-spin" />
            <img
              src="/samyak-emblem.png"
              alt="Samyak Emblem"
              className="w-14 h-14 object-contain filter drop-shadow-[0_0_15px_rgba(239,68,68,0.9)]"
            />
          </div>

          {/* The Official SAMYAK Branding (Crisp White with Cyber Glow) */}
          <div className="relative mb-2">
            <img
              src="/samyak-logo-white.png"
              alt="SAMYAK 2026"
              className="w-80 sm:w-[460px] md:w-[560px] h-auto object-contain filter drop-shadow-[0_0_25px_rgba(239,68,68,0.85)] select-none"
            />
          </div>

          {/* Institutional Stamp Inside the Pyramid */}
          <div className="mt-3 flex flex-col items-center gap-1">
            <span className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase text-red-400 font-bold">
              KL DEEMED TO BE UNIVERSITY
            </span>
            <span className="text-[10px] sm:text-xs font-cyber tracking-widest text-slate-300 uppercase">
              Where Innovation Meets Celebration
            </span>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full cyber-glass border border-red-500/40 text-[11px] font-mono text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>ACCESS GRANTED // WELCOME DELEGATE</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
