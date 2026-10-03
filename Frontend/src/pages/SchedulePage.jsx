import { motion } from 'framer-motion';
import { pageVariants } from '../animations/pageAnimations';
import ScheduleSection from '../components/Schedule/ScheduleSection';

export default function SchedulePage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 min-h-screen bg-black"
    >
      <ScheduleSection />
    </motion.div>
  );
}
