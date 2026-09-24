import { useRef, useState, useEffect } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import PyramidScene from '../3d/PyramidScene';
import HeroOverlay from './HeroOverlay';
import ScrollIndicator from './ScrollIndicator';

export default function Hero() {
  const containerRef = useRef(null);

  // Measure scroll progress across the 400vh cinematic journey
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  // Dynamic storyboard stage text
  const [currentStageText, setCurrentStageText] = useState('01 INITIAL VIEW - SCROLL TO UNLOCK');
  const [scrollLabel, setScrollLabel] = useState('SCROLL DOWN');

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (v) => {
      if (v < 0.25) {
        setCurrentStageText('01 INITIAL VIEW • SCROLL TO UNLOCK');
        setScrollLabel('SCROLL DOWN');
      } else if (v < 0.50) {
        setCurrentStageText('02 PYRAMID OPENING • ENERGY AWAKENS');
        setScrollLabel('KEEP SCROLLING');
      } else if (v < 0.75) {
        setCurrentStageText('03 REVEALING THE CORE • JOURNEY INSIDE');
        setScrollLabel('ALMOST THERE');
      } else {
        setCurrentStageText('04 WELCOME TO SAMYAK • IDEAS BEYOND LIMITS');
        setScrollLabel('EXPLORE SAMYAK');
      }
    });

    return () => unsubscribe();
  }, [scrollYProgress]);

  // =========================================================================
  // ANIMATION TIMELINE TRANSFORMS (0.00 -> 1.00)
  // =========================================================================

  // Initial Overlay & Mascot (Fades out 0.0 -> 0.22)
  const uiOpacity = useTransform(scrollYProgress, [0, 0.20], [1, 0]);
  const uiY = useTransform(scrollYProgress, [0, 0.20], ['0px', '-35px']);

  const mascotOpacity = useTransform(scrollYProgress, [0, 0.22, 0.45], [1, 0.8, 0]);
  const mascotX = useTransform(scrollYProgress, [0, 0.25], ['0px', '50px']);

  // Scroll Indicator (Fades out by 0.12)
  const indicatorOpacity = useTransform(scrollYProgress, [0, 0.10], [1, 0]);

  // Stage 02: Pyramid Parting Doors (0.18 -> 0.50)
  const openProgress = useTransform(scrollYProgress, [0.18, 0.48], [0, 1]);
  const laserIntensity = useTransform(scrollYProgress, [0.16, 0.28, 0.45, 0.60], [0, 1, 0.8, 0]);

  // Stage 03 & 05: Camera Scale / Movement (0.0 -> 0.75)
  const cameraScale = useTransform(scrollYProgress, [0, 0.35, 0.65, 0.80], [1, 1.10, 3.8, 7.5]);
  const cameraY = useTransform(scrollYProgress, [0, 0.35, 0.65], ['0%', '-2%', '-8%']);

  // Exterior Environment Fade Out (0.48 -> 0.68)
  const exteriorOpacity = useTransform(scrollYProgress, [0.48, 0.68], [1, 0]);

  // Stage 06: Interior Corridor Appearance (0.46 -> 0.90)
  const interiorOpacity = useTransform(scrollYProgress, [0.46, 0.56, 0.86, 0.96], [0, 1, 1, 0]);
  const interiorScale = useTransform(scrollYProgress, [0.46, 0.86], [0.85, 1.6]);

  // Stage 07: Logo Reveal & Chamber Core (0.70 -> 0.96)
  const logoOpacity = useTransform(scrollYProgress, [0.70, 0.80, 0.94, 0.99], [0, 1, 1, 0]);
  const logoScale = useTransform(scrollYProgress, [0.70, 0.88], [0.7, 1.35]);

  // Stage 08: Exit Flash into About Section (0.88 -> 1.00)
  const exitFlashOpacity = useTransform(scrollYProgress, [0.88, 0.95, 1], [0, 0.95, 0]);

  return (
    <div ref={containerRef} className="relative h-[400vh] bg-black overflow-x-hidden">
      {/* Sticky Viewport Stage */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        
        {/* Master 3D Pyramid Scene */}
        <PyramidScene
          cameraScale={cameraScale}
          cameraY={cameraY}
          openProgress={openProgress}
          laserIntensity={laserIntensity}
          exteriorOpacity={exteriorOpacity}
          interiorOpacity={interiorOpacity}
          interiorScale={interiorScale}
          logoOpacity={logoOpacity}
          logoScale={logoScale}
          exitFlashOpacity={exitFlashOpacity}
          mascotOpacity={mascotOpacity}
          mascotX={mascotX}
        />

        {/* Minimal Foreground Header UI */}
        <HeroOverlay
          opacity={uiOpacity}
          y={uiY}
          currentStageText={currentStageText}
        />

        {/* Bottom Scroll Indicator (Matches Storyboard) */}
        <ScrollIndicator
          label={scrollLabel}
          opacity={indicatorOpacity}
        />

      </div>
    </div>
  );
}
