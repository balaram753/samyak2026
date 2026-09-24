import { useEffect } from 'react';
import { motion, useTransform, useMotionValue } from 'framer-motion';

export default function PyramidPanels({ 
  openProgress, 
  laserIntensity,
  opacity,
  imageSrc = '/pyramid/pyramid-front-hero.jpg'
}) {
  const fallbackProgress = useMotionValue(typeof openProgress === 'number' ? openProgress : 0);

  useEffect(() => {
    if (typeof openProgress === 'number') {
      fallbackProgress.set(openProgress);
    }
  }, [openProgress, fallbackProgress]);

  const activeProgress = (openProgress && typeof openProgress.get === 'function')
    ? openProgress
    : fallbackProgress;

  const leftX = useTransform(activeProgress, (v) => `${-v * 42}%`);
  const leftRotateY = useTransform(activeProgress, (v) => -v * 36);
  const rightX = useTransform(activeProgress, (v) => `${v * 42}%`);
  const rightRotateY = useTransform(activeProgress, (v) => v * 36);
  const seamScaleX = useTransform(activeProgress, (v) => Math.max(0.1, v * 4 + 0.3));
  const coreScale = useTransform(activeProgress, (v) => 0.8 + v * 0.5);
  const rimOpacity = useTransform(activeProgress, (v) => Math.min(1, Math.max(0, (v - 0.05) * 2.5)));

  return (
    <motion.div 
      className="absolute inset-0 w-full h-full preserve-3d pointer-events-none" 
      style={{ opacity }}
    >
      {/* -----------------------------------------------------------------------
          CENTER LASER SEAM & ENERGY FISSURE (Awakens as panels begin opening)
          ----------------------------------------------------------------------- */}
      <motion.div
        className="absolute z-10 top-[24%] bottom-[12%] left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none"
        style={{ opacity: laserIntensity }}
      >
        {/* Central Vertical Laser Beam */}
        <motion.div
          className="w-8 h-full bg-gradient-to-t from-cyan-300 via-white to-orange-400 filter blur-[1px] shadow-[0_0_40px_#22d3ee]"
          style={{ scaleX: seamScaleX }}
        />

        {/* Radial Core Radiance */}
        <motion.div
          className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-orange-500/70 to-red-500/80 blur-[45px]"
          style={{ scale: coreScale }}
        />

        {/* Cyan Horizon Energy Seam */}
        <div className="absolute w-96 h-1 bg-cyan-400 shadow-[0_0_25px_#22d3ee] blur-[0.5px]" />
      </motion.div>

      {/* -----------------------------------------------------------------------
          LEFT STRUCTURAL PYRAMID PANEL
          Clipped from apex (50% 24.8%) to left corner (21% 69.5%) to bottom center (50% 87.5%)
          ----------------------------------------------------------------------- */}
      <motion.div
        className="absolute inset-0 w-full h-full preserve-3d will-change-transform"
        style={{
          x: leftX,
          rotateY: leftRotateY,
          transformOrigin: '21% 69.5%',
        }}
      >
        <div
          className="w-full h-full relative"
          style={{
            clipPath: 'polygon(50% 24.8%, 21% 69.5%, 36% 87.5%, 50% 87.5%)',
          }}
        >
          <img
            src={imageSrc}
            alt="Left Pyramid Structure"
            className="w-full h-full object-cover object-center filter contrast-105 brightness-95 select-none"
          />

          {/* Inner Edge Beveled Rim Lighting */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-cyan-400/50"
            style={{ opacity: rimOpacity }}
          />

          {/* Hydraulic Joint Shadowing */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />
        </div>
      </motion.div>

      {/* -----------------------------------------------------------------------
          RIGHT STRUCTURAL PYRAMID PANEL
          Clipped from apex (50% 24.8%) to right corner (79% 69.5%) to bottom center (50% 87.5%)
          ----------------------------------------------------------------------- */}
      <motion.div
        className="absolute inset-0 w-full h-full preserve-3d will-change-transform"
        style={{
          x: rightX,
          rotateY: rightRotateY,
          transformOrigin: '79% 69.5%',
        }}
      >
        <div
          className="w-full h-full relative"
          style={{
            clipPath: 'polygon(50% 24.8%, 79% 69.5%, 64% 87.5%, 50% 87.5%)',
          }}
        >
          <img
            src={imageSrc}
            alt="Right Pyramid Structure"
            className="w-full h-full object-cover object-center filter contrast-105 brightness-95 select-none"
          />

          {/* Inner Edge Beveled Rim Lighting */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-cyan-400/50"
            style={{ opacity: rimOpacity }}
          />

          {/* Hydraulic Joint Shadowing */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/30 pointer-events-none" />
        </div>
      </motion.div>

    </motion.div>
  );
}
