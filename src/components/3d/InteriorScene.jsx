import { motion } from 'framer-motion';

export default function InteriorScene({ 
  opacity,
  scale,
  z
}) {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full preserve-3d pointer-events-none flex items-center justify-center overflow-hidden"
      style={{ opacity }}
    >
      {/* -----------------------------------------------------------------------
          LAYER 1: The Core Corridor Artwork (Storyboard Panel 03 Exact Visual)
          ----------------------------------------------------------------------- */}
      <motion.div
        className="absolute inset-0 w-full h-full preserve-3d flex items-center justify-center will-change-transform"
        style={{ scale, z }}
      >
        <img
          src="/pyramid/stage-03-core.jpg"
          alt="Pyramid Interior Corridor"
          className="w-full h-full object-cover object-center filter contrast-110 brightness-95 select-none"
        />

        {/* Pulsing Central Core Radiance Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-cyan-400/25 blur-[50px] animate-pulse" />
          <div className="w-40 h-40 rounded-full bg-orange-500/35 blur-[35px]" />
        </div>

        {/* Central Floor Runway Laser Line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-1/2 bg-gradient-to-t from-cyan-400 via-sky-300 to-transparent shadow-[0_0_25px_#22d3ee] filter blur-[0.5px]" />
      </motion.div>

      {/* -----------------------------------------------------------------------
          LAYER 2: Atmospheric Depth Vignette
          ----------------------------------------------------------------------- */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/70 pointer-events-none" />
    </motion.div>
  );
}
