import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronDown } from 'lucide-react';
import PyramidCanvas from './PyramidCanvas';
import Countdown from '../Countdown/Countdown';
import './PyramidSequenceHero.css';

gsap.registerPlugin(ScrollTrigger);

export default function PyramidSequenceHero() {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const canvasInstanceRef = useRef(null);
  const countdownRef = useRef(null);
  const scrollIndicatorRef = useRef(null);
  const logoRevealRef = useRef(null);
  const lightBloomRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !viewportRef.current) return;

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const frameTracker = { frame: 0 };

    const ctx = gsap.context(() => {
      // Pin the hero section firmly in place while scrubbing through all 300 frames
      const isMobile = window.innerWidth < 768;
      const scrollDistance = isMobile ? 1800 : 2500;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top top',
          end: `+=${scrollDistance}`,
          pin: true,
          pinSpacing: true,
          scrub: prefersReducedMotion ? false : 0.15,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // ---------------------------------------------------------------------
      // 1. IMAGE SEQUENCE SCRUBBING: Exactly frames 0 -> 299 (0% to 100%)
      // ---------------------------------------------------------------------
      tl.to(frameTracker, {
        frame: 299,
        ease: 'none',
        duration: 1,
        onUpdate: () => {
          if (canvasInstanceRef.current) {
            canvasInstanceRef.current.renderFrame(frameTracker.frame);
          }
        },
      }, 0);

      // ---------------------------------------------------------------------
      // 2. INITIAL COUNTDOWN HUD & SCROLL INDICATOR: Visible at start (0-8%), fades out quickly
      // ---------------------------------------------------------------------
      if (countdownRef.current) {
        gsap.set(countdownRef.current, { opacity: 1, y: 0, pointerEvents: 'auto' });
        tl.to(
          countdownRef.current,
          { opacity: 0, y: -15, pointerEvents: 'none', ease: 'power1.out', duration: 0.08 },
          0.01
        );
      }

      if (scrollIndicatorRef.current) {
        gsap.set(scrollIndicatorRef.current, { opacity: 1, y: 0 });
        tl.to(
          scrollIndicatorRef.current,
          { opacity: 0, y: 20, ease: 'power1.out', duration: 0.08 },
          0.01
        );
      }

      // ---------------------------------------------------------------------
      // 3. CONTROLLED LIGHT BLOOM (Awakens when entering the core, 75% -> 88%)
      // ---------------------------------------------------------------------
      if (lightBloomRef.current) {
        gsap.set(lightBloomRef.current, { opacity: 0 });
        tl.to(
          lightBloomRef.current,
          { opacity: 0.6, ease: 'power2.in', duration: 0.06 },
          0.76
        );
        tl.to(
          lightBloomRef.current,
          { opacity: 0.12, ease: 'power2.out', duration: 0.08 },
          0.84
        );
      }

      // ---------------------------------------------------------------------
      // 4. SAMYAK BRAND & TITLE REVEAL (When pyramid opens into core: 78% -> 100%)
      // ---------------------------------------------------------------------
      if (logoRevealRef.current) {
        gsap.set(logoRevealRef.current, { opacity: 0, y: 40, scale: 0.92, pointerEvents: 'none' });
        tl.to(
          logoRevealRef.current,
          { opacity: 1, y: 0, scale: 1, pointerEvents: 'auto', ease: 'power2.out', duration: 0.15 },
          0.78
        );
      }
    }, containerRef);

    const refreshTimer = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 150);

    return () => {
      clearTimeout(refreshTimer);
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="pyramid-seq-container"
      aria-label="SAMYAK FEST — 3D Pyramid Cinematic Experience"
    >
      {/* Pinned 100vh Full-Screen Viewport */}
      <div ref={viewportRef} className="pyramid-seq-viewport">
        
        {/* Edge-to-Edge 300-Frame Canvas Renderer (100% Unobstructed at Start) */}
        <PyramidCanvas ref={canvasInstanceRef} />

        {/* Framing Shadows & Vignettes (Preserves Original 1920x1080 Composition) */}
        <div className="pyramid-seq-vignette" />
        <div className="pyramid-seq-top-shadow" />
        <div className="pyramid-seq-bottom-shadow" />

        {/* Controlled Light Bloom Transition Layer */}
        <div
          ref={lightBloomRef}
          className="absolute inset-0 bg-gradient-radial from-red-500/25 via-rose-600/10 to-transparent pointer-events-none z-10 backdrop-blur-[1px]"
        />

        {/* ===================================================================
            INITIAL HERO LIVE COUNTDOWN HUD
            At the beginning, the futuristic HUD displays the live countdown to Oct 29.
            Fades out cleanly as soon as the user scrolls into the pyramid.
            =================================================================== */}
        <div
          ref={countdownRef}
          className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-20 w-full max-w-md min-[430px]:max-w-lg px-2 min-[360px]:px-4 pointer-events-auto will-change-transform"
        >
          <Countdown className="py-0 sm:py-0 px-0" />
        </div>

        {/* ===================================================================
            MINIMAL INITIAL SCROLL INDICATOR
            =================================================================== */}
        <div
          ref={scrollIndicatorRef}
          className="absolute bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none select-none will-change-transform"
        >
          <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-[0.3em] text-red-400 font-semibold shadow-sm">
            SCROLL TO ENTER
          </span>

          {/* Animated Vertical Line */}
          <div className="relative w-0.5 h-6 sm:h-8 bg-red-950/60 overflow-hidden rounded-full border border-red-500/30">
            <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-red-500 to-white shadow-[0_0_12px_#ef4444] animate-seq-scroll-line" />
          </div>

          <ChevronDown className="w-3.5 h-3.5 text-red-400/80 animate-bounce -mt-0.5" />
        </div>

        {/* ===================================================================
            CORE REVEAL: REVEALS WHEN PYRAMID IS OPENED (Frames 220–300 / 78% – 100%)
            Monumental Samyak Logo (Transparent Background, Big Size)
            =================================================================== */}
        <div
          ref={logoRevealRef}
          className="absolute inset-0 z-20 flex items-center justify-center p-6 pointer-events-none select-none will-change-transform"
        >
          <img
            src="/samyak-logo.png"
            alt="Official SAMYAK 2026 Logo"
            className="w-auto h-auto max-h-[55vh] sm:max-h-[62vh] max-w-[88vw] sm:max-w-[65vw] md:max-w-[500px] lg:max-w-[580px] object-contain filter drop-shadow-[0_0_35px_rgba(255,255,255,0.95)] drop-shadow-[0_0_80px_rgba(239,68,68,0.9)] drop-shadow-[0_0_140px_rgba(239,68,68,0.6)]"
          />
        </div>

      </div>
    </section>
  );
}
