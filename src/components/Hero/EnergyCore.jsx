import { useEffect, useRef } from 'react';

export default function EnergyCore({ scrollProgress = 0, _isHovered = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId;
    let rotationX = 0;
    let rotationY = 0;
    let rotationZ = 0;

    const size = 340;
    canvas.width = size;
    canvas.height = size;
    const radius = 70;
    const cx = size / 2;
    const cy = size / 2;

    // Generate geodesic / spherical wireframe points
    const points = [];
    const latLines = 14;
    const lonLines = 18;

    for (let i = 0; i <= latLines; i++) {
      const theta = (i * Math.PI) / latLines;
      for (let j = 0; j < lonLines; j++) {
        const phi = (j * 2 * Math.PI) / lonLines;
        const x = radius * Math.sin(theta) * Math.cos(phi);
        const y = radius * Math.sin(theta) * Math.sin(phi);
        const z = radius * Math.cos(theta);
        points.push({ x, y, z, originalX: x, originalY: y, originalZ: z });
      }
    }

    // Floating orbital sparks
    const sparks = [];
    for (let k = 0; k < 28; k++) {
      sparks.push({
        orbitRadius: radius * (1.1 + Math.random() * 0.5),
        speed: (Math.random() * 0.03 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
        angle: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * Math.PI,
        size: Math.random() * 2 + 1,
        color: Math.random() > 0.4 ? '#f97316' : '#22d3ee',
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      // Scroll intensifies speed and pulse
      const pulse = Math.sin(Date.now() * 0.003) * 0.08 + 1 + scrollProgress * 0.25;
      const currentRadius = radius * pulse;
      const speedMultiplier = 1 + scrollProgress * 2;

      rotationY += 0.008 * speedMultiplier;
      rotationX += 0.005 * speedMultiplier;
      rotationZ += 0.003;

      // Draw background glow aura (deep orange-red to fiery core)
      const glowGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, currentRadius * 1.6);
      glowGrad.addColorStop(0, 'rgba(255, 120, 40, 0.95)');
      glowGrad.addColorStop(0.35, 'rgba(239, 68, 68, 0.7)');
      glowGrad.addColorStop(0.7, 'rgba(220, 38, 38, 0.25)');
      glowGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Transform & Project 3D points
      const projected = points.map((p) => {
        // Rotate Y
        let x1 = p.originalX * Math.cos(rotationY) - p.originalZ * Math.sin(rotationY);
        let z1 = p.originalX * Math.sin(rotationY) + p.originalZ * Math.cos(rotationY);

        // Rotate X
        let y2 = p.originalY * Math.cos(rotationX) - z1 * Math.sin(rotationX);
        let z2 = p.originalY * Math.sin(rotationX) + z1 * Math.cos(rotationX);

        // Scale by pulse
        x1 *= pulse;
        y2 *= pulse;
        z2 *= pulse;

        // Perspective projection
        const fov = 350;
        const scale = fov / (fov + z2);
        return {
          x: cx + x1 * scale,
          y: cy + y2 * scale,
          z: z2,
          scale,
        };
      });

      // Draw wireframe connecting lines
      ctx.lineWidth = 0.9;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        if (p1.z < -40) continue; // backface culling approximation

        // Connect to neighbors
        const neighbor = projected[(i + 1) % projected.length];
        if (neighbor && neighbor.z > -40) {
          const dist = Math.hypot(p1.x - neighbor.x, p1.y - neighbor.y);
          if (dist < 32 * p1.scale) {
            ctx.strokeStyle = `rgba(255, 160, 60, ${Math.max(0.1, (p1.z + radius) / (2 * radius))})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(neighbor.x, neighbor.y);
            ctx.stroke();
          }
        }
      }

      // Draw point nodes
      for (let i = 0; i < projected.length; i += 2) {
        const p = projected[i];
        if (p.z < -20) continue;
        const alpha = Math.min(1, (p.z + radius) / (1.5 * radius));
        ctx.fillStyle = `rgba(255, 230, 180, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, 1.8 * p.scale), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw orbiting cyber sparks
      sparks.forEach((s) => {
        s.angle += s.speed * speedMultiplier;
        const sx = cx + Math.cos(s.angle) * s.orbitRadius;
        const sy = cy + Math.sin(s.angle) * (s.orbitRadius * Math.sin(s.tilt));
        
        ctx.fillStyle = s.color;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * (1 + scrollProgress * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Central blinding core
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18 * pulse);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.5, '#fef08a');
      coreGrad.addColorStop(0.9, '#f97316');
      coreGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 22 * pulse, 0, Math.PI * 2);
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [scrollProgress]);

  return (
    <div className="relative flex items-center justify-center pointer-events-none">
      <canvas
        ref={canvasRef}
        className="w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] md:w-[340px] md:h-[340px] filter drop-shadow-[0_0_40px_rgba(249,115,22,0.85)]"
      />
    </div>
  );
}
