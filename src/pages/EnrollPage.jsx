import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import { pageVariants } from '../animations/pageAnimations';
import { useUser } from '../data/useUser';
import EnrollmentWizard from '../components/Enrollment/EnrollmentWizard';

export default function EnrollPage() {
  const { currentUser, userData, authLoading, isRegistered } = useUser();
  const navigate = useNavigate();

  // If already enrolled, redirect to profile
  useEffect(() => {
    if (!authLoading && currentUser && isRegistered && userData.registrationId) {
      navigate('/profile', { replace: true });
    }
  }, [authLoading, currentUser, isRegistered, userData.registrationId, navigate]);

  if (authLoading) {
    return (
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="pt-24 min-h-screen bg-black flex items-center justify-center"
      >
        <div className="text-neutral-400 font-mono text-sm animate-pulse">Loading…</div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 min-h-screen bg-black"
    >
      {/* Page Header */}
      <div className="relative py-10 sm:py-14 text-center max-w-3xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-red-500/30 bg-red-950/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-4">
          <Sparkles className="w-3.5 h-3.5 text-red-400" />
          SAMYAK 2026 — ENROLLMENT
        </div>
        <h1 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
          {currentUser
            ? isRegistered
              ? <>YOU'RE <span className="text-red-500 text-glow-red">ENROLLED</span></>
              : <>ENROLL <span className="text-red-500 text-glow-red">NOW</span></>
            : <>REGISTER <span className="text-red-500 text-glow-red">NOW</span></>
          }
        </h1>
        <p className="mt-3 text-sm text-neutral-400 max-w-lg mx-auto">
          {currentUser
            ? isRegistered
              ? 'You\'re already enrolled. Check your registration details on your profile.'
              : 'Complete your enrollment for SAMYAK 2026 — KL University\'s biggest tech-cultural fest.'
            : 'Sign in with your account to enroll for SAMYAK 2026.'
          }
        </p>

        {/* Already enrolled — show redirect */}
        {currentUser && isRegistered && (
          <Link
            to="/profile"
            className="inline-flex items-center gap-2 mt-6 px-8 py-3 rounded-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_25px_rgba(239,68,68,0.5)]"
          >
            View My Registration <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Wizard (only if not yet enrolled) */}
      {(!currentUser || !isRegistered) && (
        <div className="pb-20 px-4">
          <EnrollmentWizard />
        </div>
      )}
    </motion.div>
  );
}
