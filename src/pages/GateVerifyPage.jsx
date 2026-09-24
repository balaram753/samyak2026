import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, XCircle, CheckCircle2, 
  RefreshCw, Camera, AlertOctagon,
  Lock, ShieldAlert, LogIn, LogOut, Check
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut } from '../services/firebase';
import { 
  getStaffProfile, verifyGatePassToken, 
  checkInGatePass, STAFF_ROLES 
} from '../services/gatePassService';
import { checkRateLimit } from '../services/fileSecurityService';

export default function GateVerifyPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  // Authentication & Staff State
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [authError, setAuthError] = useState('');

  // Token Verification & Check-in State
  const [loading, setLoading] = useState(true);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Firebase Auth & Role Privilege Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setAuthLoading(true);
      setAuthError('');
      if (user) {
        setFirebaseUser(user);
        try {
          const profile = await getStaffProfile(user);
          setStaffInfo(profile);
        } catch (err) {
          console.error('Error fetching staff profile:', err);
          setAuthError('Failed to verify staff permissions: ' + err.message);
          setStaffInfo({
            isAuthenticated: true,
            isStaff: false,
            role: STAFF_ROLES.USER,
          });
        }
      } else {
        setFirebaseUser(null);
        setStaffInfo(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Validate token on mount or when token / staffInfo changes
  useEffect(() => {
    let isMounted = true;

    async function runVerification() {
      // Wait for auth to resolve
      if (authLoading) return;

      // Only authorized staff may verify gate passes
      if (!staffInfo?.isStaff) {
        setLoading(false);
        return;
      }

      if (!token) {
        setVerificationResult({
          isValid: false,
          status: 'NOT_FOUND',
          error: 'No gate pass token provided in verification URL.'
        });
        setLoading(false);
        return;
      }

      // Anti-enumeration rate limit check
      try {
        checkRateLimit('gate_token_scan', 30, 60000);
      } catch (rlErr) {
        if (isMounted) {
          setErrorMessage(rlErr.message);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setErrorMessage('');
        const res = await verifyGatePassToken(token, staffInfo);
        if (isMounted) {
          setVerificationResult(res);
          if (res.status === 'ALREADY_USED') {
            setCheckInSuccess(false);
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to complete gate pass verification. Please re-scan or verify credentials.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    runVerification();
    return () => {
      isMounted = false;
    };
  }, [token, staffInfo, authLoading]);

  // Execute Check-in with authenticated staff info
  const handleCheckIn = async () => {
    if (!token || !staffInfo?.isStaff) return;

    try {
      setIsCheckingIn(true);
      setErrorMessage('');
      const res = await checkInGatePass(token, staffInfo);
      setCheckInSuccess(true);
      setVerificationResult((prev) => ({
        ...prev,
        isValid: false,
        status: 'USED',
        data: {
          ...prev?.data,
          checkedIn: true,
          checkedInAt: new Date().toISOString(),
          checkedInByName: staffInfo.name,
          checkedInByRole: staffInfo.role,
        }
      }));
    } catch (err) {
      console.error('Check-in error:', err);
      if (err.message.includes('ALREADY_USED')) {
        setVerificationResult((prev) => ({
          ...prev,
          isValid: false,
          status: 'ALREADY_USED',
          error: err.message,
          checkedInAt: 'Just now',
          checkedInBy: 'Another Staff Member',
        }));
      } else {
        setErrorMessage(err.message || 'Failed to complete check-in.');
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign-in error:', err);
      setAuthError(err.message || 'Sign in failed.');
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch {}
    setFirebaseUser(null);
    setStaffInfo(null);
  };

  // =========================================================================
  // VIEW A: LOADING AUTH
  // =========================================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-6 relative">
        <div className="p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 text-center space-y-4 max-w-sm w-full">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
          <h2 className="text-base font-heading font-black text-white uppercase tracking-wider">
            SAMYAK 2026 GATE DESK
          </h2>
          <p className="text-xs font-mono text-neutral-400">
            Checking staff credentials and security clearance...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: NOT LOGGED IN -> SAMYAK STAFF LOGIN REQUIRED
  // =========================================================================
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-cyan-500 selection:text-black">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 text-[11px] font-mono font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>AUTHORIZED PERSONNEL ONLY</span>
            </div>
            <h1 className="text-3xl font-black font-heading text-white tracking-wide">
              SAMYAK <span className="text-cyan-400">GATE DESK</span>
            </h1>
          </div>

          <div className="p-6 sm:p-8 rounded-3xl bg-[#090b10] border border-cyan-500/30 text-center space-y-6 shadow-[0_0_50px_rgba(0,240,255,0.15)]">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(0,240,255,0.3)]">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-heading font-black text-white">
                SAMYAK STAFF LOGIN REQUIRED
              </h2>
              <p className="text-xs font-mono text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Please sign in with your authorized SAMYAK staff account to continue.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-xs font-mono text-red-300">
                {authError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-400 hover:brightness-110 text-black font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_30px_rgba(0,240,255,0.35)]"
            >
              <LogIn className="w-4 h-4" />
              <span>SIGN IN WITH GOOGLE</span>
            </button>

            <div className="pt-2 border-t border-neutral-800/80">
              <Link
                to="/samyakadmin/login"
                className="text-xs font-mono text-neutral-400 hover:text-cyan-400 transition-colors inline-block"
              >
                Or sign in with Admin Passcode →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW C: AUTHENTICATED BUT NOT AUTHORIZED STAFF -> ACCESS DENIED
  // =========================================================================
  if (!staffInfo?.isStaff) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-red-500 selection:text-white">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#140606] border border-red-500/40 text-center space-y-6 shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/50 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(239,68,68,0.35)]">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                <span>ACCESS RESTRICTED</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-white">
                ACCESS DENIED
              </h1>
              <p className="text-xs font-mono text-neutral-300 leading-relaxed max-w-sm mx-auto">
                Your account does not have permission to authorize Gate Pass entry. Contact a SAMYAK administrator.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-black/60 border border-red-900/50 text-left text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Signed in as:</span>
                <span className="text-white font-medium truncate max-w-[200px]">{firebaseUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Assigned Role:</span>
                <span className="text-red-400 font-bold uppercase">{staffInfo?.role || 'USER'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>SIGN OUT / SWITCH ACCOUNT</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW D: AUTHORIZED STAFF -> VERIFICATION & ENTRY AUTHORIZATION
  // =========================================================================
  const pass = verificationResult?.data;

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-cyan-500 selection:text-black">
      {/* Background Cyber Glow */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 rounded-full bg-cyan-600/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-red-600/10 blur-[100px] pointer-events-none" />

      {/* Top Header Bar */}
      <div className="w-full max-w-lg mx-auto flex items-center justify-between pb-6">
        <Link 
          to="/gate/scanner" 
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300 hover:text-white hover:border-cyan-500/50 transition-all cursor-pointer"
        >
          <Camera className="w-3.5 h-3.5 text-cyan-400" />
          <span>Scanner View</span>
        </Link>

        <div className="text-right">
          <div className="flex items-center gap-1.5 justify-end">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">
              {staffInfo.role} • AUTHORIZED
            </span>
          </div>
          <span className="text-xs font-heading font-black text-white">
            {staffInfo.name}
          </span>
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto">
        {loading ? (
          <div className="p-16 rounded-3xl bg-neutral-900/60 border border-neutral-800 text-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
            <h3 className="text-base font-bold font-heading text-white">Verifying Token with Secure Server...</h3>
            <p className="text-xs font-mono text-neutral-400">Authenticating digital certificate and payment status</p>
          </div>
        ) : checkInSuccess ? (
          /* Check-In Success Welcome Screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 sm:p-8 rounded-3xl border-2 border-emerald-500/60 bg-[#05110d] text-center space-y-6 shadow-[0_0_60px_rgba(16,185,129,0.3)]"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider">
                <span>✓ ENTRY ALLOWED</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-black font-heading text-white">
                WELCOME TO <span className="text-emerald-400">SAMYAK 2026</span>
              </h2>
              <p className="text-sm font-mono text-neutral-300">
                Attendee is checked in. Entry wristband / badge can be issued.
              </p>
            </div>

            {/* Attendee Details Box */}
            <div className="p-4 rounded-2xl bg-black/60 border border-emerald-900/40 text-xs font-mono text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Attendee:</span>
                <span className="font-bold text-white">{pass?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Registration:</span>
                <span className="font-bold text-cyan-400">{pass?.registrationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Ticket Type:</span>
                <span className="font-bold text-emerald-300">{pass?.ticketType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">College / Roll:</span>
                <span className="text-neutral-300">{pass?.university} {pass?.rollNo ? `(${pass.rollNo})` : ''}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/gate/scanner')}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-black font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-black" />
              <span>Scan Next Pass</span>
            </button>
          </motion.div>
        ) : verificationResult?.isValid ? (
          /* VALID GATE PASS - READY FOR CHECK IN */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 sm:p-8 rounded-3xl border-2 border-cyan-500/60 bg-[#050814] text-center space-y-6 shadow-[0_0_50px_rgba(0,240,255,0.25)]"
          >
            {/* Valid Icon */}
            <div className="w-20 h-20 rounded-full bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,240,255,0.4)]">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>✓ VALID GATE PASS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
                SAMYAK <span className="text-red-500 font-cyber">2026</span>
              </h2>
            </div>

            {/* Attendee Details Card */}
            <div className="p-4 rounded-2xl bg-neutral-900/80 border border-cyan-900/40 text-xs font-mono text-left space-y-2.5">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-neutral-400">Attendee Name:</span>
                <span className="font-bold text-white text-sm">
                  {pass?.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Registration Code:</span>
                <span className="font-mono font-black text-cyan-400 text-sm">
                  {pass?.registrationNumber}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Student Roll / ID:</span>
                <span className="text-white font-mono">
                  {pass?.rollNo || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Institution:</span>
                <span className="text-neutral-200">
                  {pass?.university}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                <span className="text-neutral-400">Payment Status:</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>VERIFIED</span>
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Gate Pass Status:</span>
                <span className="inline-flex items-center gap-1 text-cyan-400 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  <span>VALID & UNUSED</span>
                </span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-xs font-mono text-red-300">
                {errorMessage}
              </div>
            )}

            {/* Check-In CTA Button */}
            <button
              type="button"
              disabled={isCheckingIn}
              onClick={handleCheckIn}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-400 hover:brightness-110 text-black font-heading font-black text-base uppercase tracking-wider shadow-[0_0_35px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-101 active:scale-99 disabled:opacity-50"
            >
              {isCheckingIn ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Recording Entry Check-In...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>ALLOW ENTRY / CHECK IN</span>
                </>
              )}
            </button>
          </motion.div>
        ) : verificationResult?.status === 'ALREADY_USED' ? (
          /* REUSED QR WARNING SCREEN */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 sm:p-8 rounded-3xl border-2 border-amber-500 bg-[#160e03] text-center space-y-6 shadow-[0_0_60px_rgba(245,158,11,0.35)]"
          >
            <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(245,158,11,0.5)]">
              <AlertOctagon className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
                <span>⚠ GATE PASS ALREADY USED</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
                ENTRY <span className="text-amber-400">DENIED</span>
              </h2>
              <p className="text-xs font-mono text-amber-200/90 max-w-sm mx-auto">
                This QR code has already been scanned and checked in for event entry. Re-entry or duplicate usage is strictly prohibited.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/70 border border-amber-500/40 text-xs font-mono text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Registration:</span>
                <span className="font-bold text-amber-300">{pass?.registrationNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Attendee Name:</span>
                <span className="font-bold text-white">{pass?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Checked In At:</span>
                <span className="font-bold text-amber-400">
                  {verificationResult.checkedInAt || 'Earlier'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Authorized by:</span>
                <span className="font-bold text-amber-300">
                  {verificationResult.checkedInBy || 'Staff Member'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/gate/scanner')}
              className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Scan Next Pass</span>
            </button>
          </motion.div>
        ) : (
          /* INVALID / CANCELLED / NOT VERIFIED SCREEN */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 sm:p-8 rounded-3xl border-2 border-red-500 bg-[#160404] text-center space-y-6 shadow-[0_0_60px_rgba(239,68,68,0.35)]"
          >
            <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(239,68,68,0.5)]">
              <XCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-mono font-bold uppercase tracking-wider">
                <span>✕ {verificationResult?.status === 'CANCELLED' ? 'CANCELLED GATE PASS' : verificationResult?.status === 'PAYMENT_NOT_VERIFIED' ? 'PAYMENT NOT VERIFIED' : 'INVALID GATE PASS'}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black font-heading text-white">
                {verificationResult?.status === 'CANCELLED' ? 'PASS REVOKED' : 'ENTRY DENIED'}
              </h2>

              <p className="text-xs font-mono text-red-300/80 max-w-sm mx-auto">
                {verificationResult?.error || 'QR code could not be verified in the festival database.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate('/gate/scanner')}
              className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-red-400" />
              <span>Back to Scanner</span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
