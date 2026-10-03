import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Shield, Lock, ArrowRight, AlertCircle, Loader2, Sparkles 
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminLoginPage() {
  const { 
    loginAdminWithGoogle, 
    isAdmin, 
    adminLoading 
  } = useAdminAuth();

  const [error, setError] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  const navigate = useNavigate();

  // If already admin, redirect to dashboard
  if (isAdmin) {
    navigate('/samyakadmin/dashboard', { replace: true });
    return null;
  }

  // Google Sign-In: super admins and sub-admins provisioned by their Google email
  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      setError(null);
      await loginAdminWithGoogle();
      navigate('/samyakadmin/dashboard', { replace: true });
    } catch (err) {
      console.error('Sign-in error:', err);
      setError(err.message || 'Failed to authenticate with Google. Please verify admin privileges.');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12 relative overflow-hidden select-none">
      {/* Background Cyber Glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 max-w-md w-full p-8 sm:p-10 rounded-3xl cyber-card border border-red-500/40 shadow-[0_0_50px_rgba(223,37,49,0.25)] backdrop-blur-2xl"
      >
        {/* Top Restricted Command Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/60 border border-red-500/50 text-red-400 text-xs font-mono tracking-widest uppercase shadow-[0_0_15px_rgba(223,37,49,0.3)]">
            <Shield className="w-4 h-4 text-red-500 animate-pulse" />
            <span>Restricted Command Console</span>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <img
              src="/samyak-logo-white.png"
              alt="SAMYAK 2026"
              className="h-9 sm:h-10 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(223,37,49,0.6)]"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
            ADMIN <span className="text-red-500 text-glow-red">PORTAL</span>
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 font-cyber">
            Superadmin &amp; Departmental Wing Access Console
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-500/60 text-red-300 text-xs flex items-start gap-3 shadow-[0_0_15px_rgba(223,37,49,0.2)]">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Google Sign In (Super Admin & Authorized Google Accounts) */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-xs text-slate-300 font-cyber space-y-1">
            <div className="text-red-400 font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Super Administrator Fast-Track</span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Super Admins (<code className="text-red-300">udaykiranvempati123@gmail.com</code>, <code className="text-red-300">balaram777.ch@gmail.com</code>, <code className="text-red-300">harshasai955@gmail.com</code>) and sub-admins sign in with the Google account the Super Admin registered for them.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={signingIn || adminLoading}
            className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-neutral-100 text-black font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            {signingIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In with Google</span>
              </>
            )}
          </button>
        </div>

        {/* Back Link */}
        <div className="pt-6 mt-6 border-t border-neutral-800 text-center">
          <Link
            to="/"
            className="text-xs font-mono text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
          >
            <span>Return to Public Fest Website</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 text-center text-[10px] font-mono text-neutral-500">
          <Lock className="w-3 h-3 inline mr-1 text-red-400" />
          Restricted access. All login attempts and IP addresses are recorded.
        </div>
      </motion.div>
    </div>
  );
}
