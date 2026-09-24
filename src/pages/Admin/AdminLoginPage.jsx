import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Lock, ArrowRight, AlertCircle, Loader2, KeyRound, 
  UserCheck, CheckCircle2, Eye, EyeOff, Sparkles 
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminLoginPage() {
  const { 
    loginAdminWithGoogle, 
    loginAdminWithPasscode, 
    updateAdminPassword, 
    isAdmin, 
    adminLoading 
  } = useAdminAuth();

  const [activeTab, setActiveTab] = useState('google'); // 'google' or 'passcode'
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [signingIn, setSigningIn] = useState(false);
  const navigate = useNavigate();

  // Passcode form fields
  const [identifier, setIdentifier] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  // Mandatory First-Login Password Reset Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetDocId, setResetDocId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);

  // If already admin, redirect to dashboard
  if (isAdmin && !resetModalOpen) {
    navigate('/samyakadmin/dashboard', { replace: true });
    return null;
  }

  // Handle Google Sign-In (Super Admin & Authorized Google Admins)
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

  // Handle Passcode Sign-In (Sub-Admins provisioned by Super Admin)
  const handlePasscodeSignIn = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !passcode.trim()) {
      setError('Please enter both your Admin Username/Email and Access Passcode.');
      return;
    }

    try {
      setSigningIn(true);
      setError(null);
      const res = await loginAdminWithPasscode(identifier, passcode);

      if (res.requiresPasswordReset) {
        setResetDocId(res.docId);
        setResetModalOpen(true);
      } else {
        navigate('/samyakadmin/dashboard', { replace: true });
      }
    } catch (err) {
      console.error('Passcode login error:', err);
      setError(err.message || 'Invalid administrator credentials. Contact Super Admin.');
    } finally {
      setSigningIn(false);
    }
  };

  // Handle Mandatory First-Login Password Reset
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    try {
      setResetLoading(true);
      setResetError(null);
      await updateAdminPassword(resetDocId, newPassword);
      setResetModalOpen(false);
      navigate('/samyakadmin/dashboard', { replace: true });
    } catch (err) {
      setResetError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setResetLoading(false);
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
        className="relative z-10 max-w-md w-full p-8 sm:p-10 rounded-3xl cyber-card border border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.25)] backdrop-blur-2xl"
      >
        {/* Top Restricted Command Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/60 border border-red-500/50 text-red-400 text-xs font-mono tracking-widest uppercase shadow-[0_0_15px_rgba(239,68,68,0.3)]">
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
              className="h-9 sm:h-10 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-tight">
            ADMIN <span className="text-red-500 text-glow-red">PORTAL</span>
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 font-cyber">
            Superadmin &amp; Departmental Wing Access Console
          </p>
        </div>

        {/* Auth Method Switcher Tabs */}
        <div className="flex p-1 rounded-2xl bg-neutral-900/90 border border-neutral-800 mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('google'); setError(null); }}
            className={`flex-1 py-2 text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'google'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Google Login</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('passcode'); setError(null); }}
            className={`flex-1 py-2 text-xs font-mono rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'passcode'
                ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] font-bold'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sub-Admin PIN</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-950/50 border border-red-500/60 text-red-300 text-xs flex items-start gap-3 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Tab 1: Google Sign In (Super Admin & Authorized Google Accounts) */}
        {activeTab === 'google' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-xs text-slate-300 font-cyber space-y-1">
              <div className="text-red-400 font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Super Administrator Fast-Track</span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Super Admins (<code className="text-red-300">udaykiranvempati123@gmail.com</code>, <code className="text-red-300">balaram777.ch@gmail.com</code>) log in with 1-click Google authentication.
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
        )}

        {/* Tab 2: Sub-Admin Passcode Sign In */}
        {activeTab === 'passcode' && (
          <form onSubmit={handlePasscodeSignIn} className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                Admin Username or Institutional Email *
              </label>
              <input
                type="text"
                placeholder="e.g. rahul.samyak or rahul@kluniversity.in"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 font-cyber focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                6-Digit Access Passcode or Password *
              </label>
              <div className="relative">
                <input
                  type={showPasscode ? 'text' : 'password'}
                  placeholder="Enter 6-digit PIN or password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-neutral-900/80 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 font-mono tracking-wider focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={signingIn || adminLoading}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(239,68,68,0.5)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              {signingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Verifying Passcode...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In with Passcode</span>
                </>
              )}
            </button>
          </form>
        )}

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

      {/* =====================================================================
          MANDATORY FIRST-LOGIN PASSWORD RESET MODAL
          ===================================================================== */}
      <AnimatePresence>
        {resetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-neutral-950 border-2 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.4)]"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono uppercase tracking-wider mb-3">
                <Shield className="w-3.5 h-3.5" />
                <span>Security Requirement</span>
              </div>

              <h2 className="text-xl font-heading font-black text-white">
                MANDATORY <span className="text-red-500">FIRST-LOGIN RESET</span>
              </h2>
              <p className="mt-1 text-xs text-neutral-400 font-cyber">
                You logged in with a temporary 6-digit PIN. Please set a secure private password to activate your administrator dashboard.
              </p>

              {resetError && (
                <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-500 text-red-300 text-xs">
                  {resetError}
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="mt-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1">
                    New Secure Password (min 6 characters) *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-neutral-300 mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter password"
                    className="w-full px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white font-mono focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-heading font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save Password &amp; Enter Dashboard</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
