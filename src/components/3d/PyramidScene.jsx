import { motion } from 'framer-motion';
import PyramidCamera from './PyramidCamera';
import PyramidPanels from './PyramidPanels';
import EnergyCore from './EnergyCore';
import InteriorScene from './InteriorScene';
import LogoReveal from './LogoReveal';
import ParticleField from './ParticleField';

export default function PyramidScene({
  cameraScale = 1,
  cameraY = 0,
  openProgress,
  laserIntensity,
  exteriorOpacity = 1,
  interiorOpacity = 0,
  interiorScale = 1,
  logoOpacity = 0,
  logoScale = 1,
  exitFlashOpacity = 0,
  mascotOpacity = 1,
  mascotX = 0,
}) {
  return (
    <div className="relative w-full h-full overflow-hidden perspective-1000 bg-black select-none">
      
      {/* Ambient Cyber Grid Base */}
      <div className="absolute inset-0 bg-radial from-cyan-950/20 via-black to-black pointer-events-none" />
      <div className="absolute inset-0 cyber-grid-bg opacity-25 pointer-events-none" />

      {/* Floating Cyber Particle Field */}
      <ParticleField speedMultiplier={1.2} intensity={1} />

      {/* =======================================================================
          CAMERA RIG (Pushes through exterior -> opening -> corridor -> chamber)
          ======================================================================= */}
      <PyramidCamera cameraScale={cameraScale} cameraY={cameraY}>
        
        {/* ---------------------------------------------------------------------
            STAGE 01 & 02: Exterior Symmetrical Environment & Energy Sphere
            --------------------------------------------------------------------- */}
        <motion.div
          className="absolute inset-0 w-full h-full preserve-3d pointer-events-none"
          style={{ opacity: exteriorOpacity }}
        >
          {/* Base Environment (Pristine Reference Artwork) */}
          <img
            src="/pyramid/pyramid-front-hero.jpg"
            alt="SAMYAK 2026 Environment"
            className="w-full h-full object-cover object-center filter contrast-105 brightness-95"
          />

          {/* Pulsing 3D Energy Core Above Pyramid Apex */}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <EnergyCore
              intensity={1.2}
              pulseSpeed={1.5}
              size={280}
            />
          </div>

          {/* Mechanical Opening Pyramid Blast Doors (Stage 02 & 03) */}
          <PyramidPanels
            openProgress={openProgress}
            laserIntensity={laserIntensity}
            opacity={exteriorOpacity}
            imageSrc="/pyramid/pyramid-front-hero.jpg"
          />
        </motion.div>

        {/* ---------------------------------------------------------------------
            STAGE 03 & 05 & 06: Grand Futuristic Interior Corridor (Stage 03 Core)
            --------------------------------------------------------------------- */}
        <InteriorScene
          opacity={interiorOpacity}
          scale={interiorScale}
        />

        {/* ---------------------------------------------------------------------
            STAGE 04 & 07: Inner Circular Chamber & SAMYAK Logo Core (Stage 04)
            --------------------------------------------------------------------- */}
        <LogoReveal
          opacity={logoOpacity}
          scale={logoScale}
        />

      </PyramidCamera>

      {/* =======================================================================
          SAMYAK ROBOT MASCOT (Stage 01 to 03 Visual Ambassador)
          Positioned subtly on the right, transparent, moves aside on scroll
          ======================================================================= */}
      <motion.div
        className="absolute right-4 sm:right-10 md:right-16 bottom-12 sm:bottom-20 z-20 pointer-events-none will-change-transform"
        style={{
          opacity: mascotOpacity,
          x: mascotX,
        }}
      >
        <div className="relative animate-float-mascot">
          <div className="absolute inset-0 bg-cyan-400/25 rounded-full blur-xl scale-75" />
          <img
            src="/mascot-robot.png"
            alt="SAMYAK 2026 Robot Mascot"
            className="w-28 sm:w-36 md:w-44 h-auto object-contain filter drop-shadow-[0_8px_20px_rgba(6,182,212,0.5)]"
          />
          <div className="mt-1 px-2.5 py-0.5 rounded-full cyber-glass border border-cyan-400/40 text-[9px] font-mono text-cyan-300 text-center shadow-sm">
            SAMYAK BOT
          </div>
        </div>
      </motion.div>

      {/* =======================================================================
          STAGE 08: Exit Hyperdrive Energy Flash into About Section
          ======================================================================= */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-cyan-400 via-sky-200 to-orange-400 pointer-events-none z-40 backdrop-blur-sm"
        style={{ opacity: exitFlashOpacity }}
      />

    </div>
  );
}
