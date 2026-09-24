import { useEffect, useRef } from 'react';

export default function ParticleField({ speedMultiplier = 1, intensity = 1 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768;
    const count = prefersReducedMotion ? 0 : isMobile ? 25 : 55;

    const particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random() * 600 + 100,
        radius: Math.random() * 1.5 + 0.5,
        color: Math.random() > 0.65 ? 'rgba(249, 115, 22,' : 'rgba(6, 182, 212,',
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3 - 0.15,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.speedX * speedMultiplier;
        p.y += p.speedY * speedMultiplier;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const scale = 500 / p.z;
        const drawSize = p.radius * scale * intensity;

        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, drawSize), 0, Math.PI * 2);
        ctx.fillStyle = `${p.color} ${p.opacity * intensity})`;
        ctx.shadowColor = p.color.includes('249') ? '#f97316' : '#06b6d4';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(render);
    };

    if (count > 0) render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [speedMultiplier, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10 opacity-75"
    />
  );
}
