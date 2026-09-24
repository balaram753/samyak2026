import { motion, useScroll, useSpring } from 'framer-motion';

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-red-600 via-rose-500 to-red-500 z-50 origin-left shadow-[0_0_12px_rgba(239,68,68,0.8)]"
      style={{ scaleX }}
    />
  );
}
