import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { ChevronDown, ArrowRight, Sparkles } from 'lucide-react';
import './PyramidHero.css';

gsap.registerPlugin(ScrollTrigger);

export default function PyramidHero() {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);
  const videoRef = useRef(null);
  const initialUiRef = useRef(null);
  const indicatorRef = useRef(null);
  const stageBadgeRef = useRef(null);
  const stageLabelRef = useRef(null);
  const finalUiRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let ctx = null;
    let initialized = false;

    const stages = [
      'STAGE 01 // ARRIVAL',
      'STAGE 02 // ACTIVATION',
      'STAGE 03 // PYRAMID OPENING',
      'STAGE 04 // CAMERA ENTERS',
      'STAGE 05 // ENERGY CORE',
    ];
    let lastStageIndex = -1;

    const initScrollTrigger = () => {
      if (initialized) return;
      if (!containerRef.current || !viewportRef.current || !video) return;
      initialized = true;

      const duration = video.duration && !isNaN(video.duration) && video.duration > 0
        ? video.duration
        : 10;

      // Force video to start paused at frame 1
      video.pause();
      try {
        video.currentTime = 0.001;
      } catch {
        // seek before metadata ready safety
      }

      ctx = gsap.context(() => {
        // Explicitly guarantee initial UI states
        if (initialUiRef.current) {
          gsap.set(initialUiRef.current, { opacity: 1, y: 0, scale: 1 });
        }
        if (indicatorRef.current) {
          gsap.set(indicatorRef.current, { opacity: 1, y: 0 });
        }
        if (stageBadgeRef.current) {
          gsap.set(stageBadgeRef.current, { opacity: 0.95 });
        }
        if (finalUiRef.current) {
          gsap.set(finalUiRef.current, { opacity: 0, y: 40, scale: 0.94, pointerEvents: 'none' });
        }

        // Master pinned ScrollTrigger timeline
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: 'bottom bottom',
            pin: viewportRef.current,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              // Direct DOM update to avoid React re-renders during scroll
              const stageIdx = Math.min(4, Math.floor(self.progress * 5));
              if (stageIdx !== lastStageIndex && stageLabelRef.current) {
                lastStageIndex = stageIdx;
                stageLabelRef.current.textContent = stages[stageIdx];
              }
            },
          },
        });

        // -------------------------------------------------------------------
        // 1. VIDEO SCRUBBING: Exactly 0.001 -> video.duration
        // -------------------------------------------------------------------
        tl.fromTo(
          video,
          { currentTime: 0.001 },
          {
            currentTime: Math.max(0.1, duration - 0.05),
            ease: 'none',
            duration: 1,
          },
          0
        );

        // -------------------------------------------------------------------
        // 2. SCROLL INDICATOR: Visible 0-10%, completely fades out by 15%
        // -------------------------------------------------------------------
        if (indicatorRef.current) {
          tl.to(
            indicatorRef.current,
            { opacity: 0, y: 24, ease: 'power1.out', duration: 0.12 },
            0.02
          );
        }

        // -------------------------------------------------------------------
        // 3. INITIAL SAMYAK TITLE: Visible 0-18%, fades & slides up 18%-38%
        // -------------------------------------------------------------------
        if (initialUiRef.current) {
          tl.to(
            initialUiRef.current,
            { opacity: 0, y: -45, scale: 0.95, ease: 'power2.out', duration: 0.2 },
            0.18
          );
        }

        // Stage badge subtle opacity transition
        if (stageBadgeRef.current) {
          tl.to(
            stageBadgeRef.current,
            { opacity: 0.4, ease: 'none', duration: 0.4 },
            0.2
          );
        }

        // -------------------------------------------------------------------
        // 4. FINAL SAMYAK REVEAL (Stage 5: 82% -> 98%)
        // -------------------------------------------------------------------
        if (finalUiRef.current) {
          tl.to(
            finalUiRef.current,
            { opacity: 1, y: 0, scale: 1, pointerEvents: 'auto', ease: 'power2.out', duration: 0.16 },
            0.82
          );
        }
      }, containerRef);

      ScrollTrigger.refresh();
    };

    // Safely wait for video metadata before initializing
    if (video.readyState >= 1 && video.duration > 0) {
      initScrollTrigger();
    } else {
      video.addEventListener('loadedmetadata', initScrollTrigger, { once: true });
      video.addEventListener('canplay', initScrollTrigger, { once: true });
      video.addEventListener('loadeddata', initScrollTrigger, { once: true });
      // Fallback timer ensures UI & ScrollTrigger are initialized even if video takes longer to buffer
      const fallbackTimer = setTimeout(() => {
        initScrollTrigger();
      }, 350);

      return () => {
        clearTimeout(fallbackTimer);
        if (ctx) ctx.revert();
        video.removeEventListener('loadedmetadata', initScrollTrigger);
        video.removeEventListener('canplay', initScrollTrigger);
        video.removeEventListener('loadeddata', initScrollTrigger);
      };
    }

    return () => {
      if (ctx) ctx.revert();
      video.removeEventListener('loadedmetadata', initScrollTrigger);
      video.removeEventListener('canplay', initScrollTrigger);
      video.removeEventListener('loadeddata', initScrollTrigger);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="pyramid-hero-container"
      aria-label="SAMYAK 2026 Cinematic Pyramid Experience"
    >
      {/* Pinned 100vh Cinematic Viewport */}
      <div ref={viewportRef} className="pyramid-hero-viewport">
        
        {/* HTML5 Cinematic Video Element */}
        <video
          ref={videoRef}
          src="/videos/samyak%20hero%20section.mp4"
          poster="/pyramid/pyramid-front-hero.jpg"
          className="pyramid-hero-video"
          muted
          playsInline
          preload="auto"
          autoPlay={false}
          controls={false}
          loop={false}
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* Subtle Non-Distracting Vignettes to Frame Composition */}
        <div className="pyramid-hero-vignette" />
        <div className="pyramid-hero-top-gradient" />
        <div className="pyramid-hero-bottom-gradient" />

        {/* Stage Status Pill (Top Left) */}
        <div
          ref={stageBadgeRef}
          className="absolute top-20 sm:top-24 left-4 sm:left-8 z-20 flex items-center gap-2 px-3 py-1 rounded-full hero-cyber-pill pointer-events-none select-none"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
          <span
            ref={stageLabelRef}
            className="text-[10px] sm:text-xs font-mono tracking-widest text-red-400 uppercase"
          >
            STAGE 01 // ARRIVAL
          </span>
        </div>

        {/* ===================================================================
            STAGE 1 & 2: Initial SAMYAK Hero Title (Centered)
            =================================================================== */}
        <div
          ref={initialUiRef}
          className="absolute z-20 max-w-4xl mx-auto px-4 text-center flex flex-col items-center justify-center top-28 sm:top-32 md:top-36 pointer-events-auto select-none will-change-transform"
        >
          {/* Subtle KL University Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full hero-cyber-pill text-[11px] sm:text-xs font-mono text-red-300 uppercase tracking-[0.25em] mb-3 shadow-[0_0_20px_rgba(239,68,68,0.25)]">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            <span>KL UNIVERSITY • MARCH 14-16, 2026</span>
          </div>

          {/* SAMYAK (Large) */}
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black font-heading tracking-tight text-white leading-none text-glow-samyak">
            SAMYAK
          </h1>

          {/* 2026 (Smaller) */}
          <div className="mt-1 sm:mt-2 text-2xl sm:text-4xl md:text-5xl font-heading font-black tracking-widest text-red-500 text-glow-red">
            2026
          </div>

          {/* KL UNIVERSITY (Smallest) */}
          <p className="mt-2 text-[10px] sm:text-xs md:text-sm text-red-200 font-cyber tracking-[0.3em] uppercase">
            WHERE INNOVATION MEETS CELEBRATION
          </p>

          {/* Quick Action CTAs */}
          <div className="mt-6 flex items-center justify-center gap-3 sm:gap-4">
            <Link
              to="/events"
              className="px-6 py-2.5 rounded-full font-heading text-xs font-bold tracking-wider uppercase text-white bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_25px_rgba(239,68,68,0.5)] hover:shadow-[0_0_35px_rgba(239,68,68,0.8)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>Explore Events</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/payment"
              className="px-6 py-2.5 rounded-full font-heading text-xs font-bold tracking-wider uppercase text-white hero-cyber-pill border border-red-500/50 hover:border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="text-red-400">Register Now</span>
            </Link>
          </div>
        </div>

        {/* ===================================================================
            SCROLL INDICATOR (0-15%: SCROLL TO ENTER with animated vertical line)
            =================================================================== */}
        <div
          ref={indicatorRef}
          className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none select-none will-change-transform"
        >
          <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.3em] text-red-400 font-semibold shadow-sm">
            SCROLL TO ENTER
          </span>

          {/* Futuristic Vertical Animated Line */}
          <div className="relative w-0.5 h-10 sm:h-12 bg-red-950/60 overflow-hidden rounded-full border border-red-500/30">
            <div className="w-full h-1/2 bg-gradient-to-b from-transparent via-red-500 to-white shadow-[0_0_12px_#ef4444] animate-scroll-line" />
          </div>

          <ChevronDown className="w-4 h-4 text-red-400/80 animate-bounce -mt-1" />
        </div>

        {/* ===================================================================
            STAGE 5: Final SAMYAK Core Reveal & Transition to Website
            =================================================================== */}
        <div
          ref={finalUiRef}
          style={{ opacity: 0 }}
          className="absolute z-20 max-w-xl mx-auto px-4 text-center flex flex-col items-center justify-center bottom-12 sm:bottom-16 pointer-events-none select-none will-change-transform"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full hero-cyber-pill text-[10px] sm:text-xs font-mono text-red-400 uppercase tracking-widest mb-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
            <Sparkles className="w-3 h-3 text-red-400" />
            <span>CORE ACCESSED</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-heading tracking-tight text-white leading-none text-glow-samyak">
            ENTER <span className="text-red-500 text-glow-red">SAMYAK</span>
          </h2>

          <p className="mt-2 text-[11px] sm:text-xs text-slate-300 font-cyber tracking-[0.25em] uppercase">
            IDEAS BEYOND LIMITS • KL UNIVERSITY
          </p>

          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/events"
              className="px-7 py-3 rounded-full font-heading text-xs sm:text-sm font-black tracking-widest uppercase text-white bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:shadow-[0_0_45px_rgba(239,68,68,0.9)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>EXPLORE SAMYAK 2026</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
