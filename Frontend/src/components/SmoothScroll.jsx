import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function SmoothScroll() {
  const location = useLocation();

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) {
      // Allow 120Hz native hardware-accelerated touch scroll on mobile devices
      return;
    }

    const p = location.pathname.toLowerCase();
    if (
      p.startsWith('/admin') || 
      p.startsWith('/samyakadmin') || 
      p.startsWith('/samyakeventsedit') || 
      p.startsWith('/gate')
    ) {
      if (window.__lenis) {
        window.__lenis.destroy();
        window.__lenis = null;
      }
      return;
    }

    const lenis = new Lenis({
      duration: 1.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1.0,
      syncTouch: false,
      autoRaf: true,
      autoResize: true,
    });

    window.__lenis = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    return () => {
      if (window.__lenis) {
        window.__lenis.destroy();
        window.__lenis = null;
      }
    };
  }, [location.pathname]);

  return null;
}
