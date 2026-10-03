import { motion } from 'framer-motion';
import { pageVariants } from '../animations/pageAnimations';
import ProfileDashboard from '../components/Profile/ProfileDashboard';

export default function ProfilePage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 min-h-screen bg-black"
    >
      <ProfileDashboard />
    </motion.div>
  );
}
