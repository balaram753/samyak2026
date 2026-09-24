import { motion } from 'framer-motion';
import { pageVariants } from '../animations/pageAnimations';
import PaymentPortal from '../components/Payment/PaymentPortal';
import { Sparkles } from 'lucide-react';

export default function PaymentPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 min-h-screen bg-black"
    >
      <div className="relative py-8 sm:py-12 text-center max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-3">
          <Sparkles className="w-4 h-4 text-red-400" />
          Secure Fest Gateway
        </div>
        <h1 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
          PAY EVENT <span className="text-red-500 text-glow-red">FEE &amp; PASS</span>
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-300 font-cyber">
          Choose your festival participation pass, apply discount vouchers, and complete your registration checkout.
        </p>
      </div>

      <PaymentPortal />
    </motion.div>
  );
}
