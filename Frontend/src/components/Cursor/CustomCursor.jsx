import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    // Only enable custom cursor for non-touch pointers
    if (window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let isHovering = false;
    let isVisible = false;
    let rafId;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) {
        isVisible = true;
        dot.style.opacity = '1';
        ring.style.opacity = '1';
      }
      dot.style.transform = `translate3d(${mouseX - 4}px, ${mouseY - 4}px, 0)`;
    };

    const handleMouseLeave = () => {
      isVisible = false;
      dot.style.opacity = '0';
      ring.style.opacity = '0';
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      if (!target) return;
      const interactive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest?.('button') ||
        target.closest?.('a') ||
        target.getAttribute?.('role') === 'button' ||
        target.classList?.contains('cursor-pointer');

      if (interactive !== isHovering) {
        isHovering = interactive;
        if (isHovering) {
          ring.style.width = '48px';
          ring.style.height = '48px';
          ring.style.backgroundColor = 'rgba(223, 37, 49, 0.2)';
          dot.style.transform = `translate3d(${mouseX - 4}px, ${mouseY - 4}px, 0) scale(0)`;
        } else {
          ring.style.width = '32px';
          ring.style.height = '32px';
          ring.style.backgroundColor = 'rgba(223, 37, 49, 0.08)';
          dot.style.transform = `translate3d(${mouseX - 4}px, ${mouseY - 4}px, 0) scale(1)`;
        }
      }
    };

    // Smooth ring follow loop
    const updateRing = () => {
      if (isVisible) {
        ringX += (mouseX - ringX) * 0.22;
        ringY += (mouseY - ringY) * 0.22;
        const offset = isHovering ? 24 : 16;
        ring.style.transform = `translate3d(${ringX - offset}px, ${ringY - offset}px, 0)`;
      }
      rafId = requestAnimationFrame(updateRing);
    };
    rafId = requestAnimationFrame(updateRing);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    document.addEventListener('mouseover', handleMouseOver, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-50 w-2 h-2 rounded-full bg-red-500 opacity-0 transition-opacity duration-150 will-change-transform"
      />
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-50 w-8 h-8 rounded-full border border-red-500/60 bg-red-500/10 opacity-0 transition-[width,height,background-color,opacity] duration-200 ease-out will-change-transform"
      />
    </>
  );
}
