import { useEffect, useRef } from 'react';

export default function EnergyCore({ intensity = 1, pulseSpeed = 1, size = 300 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;
    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = size * 0.22;

    let animId;
    let angle = 0;

    const sparks = [];
    for (let i = 0; i < 24; i++) {
      sparks.push({
        orbit: baseRadius * (1.1 + Math.random() * 0.45),
        speed: (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
        currentAngle: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * Math.PI * 0.7,
        size: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? '#f97316' : '#ef4444',
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      angle += 0.01 * pulseSpeed;
      const pulse = Math.sin(angle * 2) * 0.08 + 1;
      const r = baseRadius * pulse * Math.max(0.7, intensity);

      // Deep radial aura
      const aura = ctx.createRadialGradient(cx, cy, 2, cx, cy, r * 1.8);
      aura.addColorStop(0, `rgba(255, 140, 50, ${0.9 * intensity})`);
      aura.addColorStop(0.35, `rgba(239, 68, 68, ${0.7 * intensity})`);
      aura.addColorStop(0.7, `rgba(220, 38, 38, ${0.25 * intensity})`);
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Geodesic wireframe ring accents
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const ringTilt = (i * Math.PI) / 4 + angle * 0.4;
        ctx.strokeStyle = `rgba(255, 180, 100, ${0.35 * intensity})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * Math.abs(Math.sin(ringTilt)), ringTilt, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Orbiting plasma sparks
      sparks.forEach((s) => {
        s.currentAngle += s.speed * pulseSpeed;
        const sx = cx + Math.cos(s.currentAngle) * s.orbit * pulse;
        const sy = cy + Math.sin(s.currentAngle) * (s.orbit * pulse * Math.sin(s.tilt));

        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * intensity, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Bright inner core
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.45);
      core.addColorStop(0, '#ffffff');
      core.addColorStop(0.6, '#ffedd5');
      core.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.45, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [intensity, pulseSpeed, size]);

  return (
    <div className="relative flex items-center justify-center pointer-events-none">
      <canvas
        ref={canvasRef}
        className="filter drop-shadow-[0_0_35px_rgba(239,68,68,0.85)]"
      />
    </div>
  );
}
