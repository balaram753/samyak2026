import { motion } from 'framer-motion';
import { pageVariants } from '../animations/pageAnimations';
import ContactSection from '../components/Contact/ContactSection';

export default function ContactPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 min-h-screen bg-black"
    >
      <ContactSection />
    </motion.div>
  );
}
