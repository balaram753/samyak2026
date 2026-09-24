import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function PyramidCamera({ 
  children, 
  cameraScale = 1, 
  cameraY = 0,
  enableMouseParallax = true 
}) {
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!enableMouseParallax) return;

    const handleMouseMove = (e) => {
      // Subtle tilt: max ±1.4 deg
      const x = (e.clientX / window.innerWidth - 0.5) * 2.8;
      const y = (e.clientY / window.innerHeight - 0.5) * 2.8;
      setMouseOffset({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enableMouseParallax]);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex items-center justify-center preserve-3d will-change-transform"
      style={{
        scale: cameraScale,
        y: cameraY,
        rotateX: mouseOffset.y,
        rotateY: mouseOffset.x,
      }}
    >
      {children}
    </motion.div>
  );
}
