import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, CameraOff, ArrowRight, ShieldCheck, Zap, 
  CheckCircle2, XCircle, AlertOctagon, LogIn, LogOut, 
  History, Users, RefreshCw, UserCheck, ShieldAlert,
  Sliders, Plus, Trash2, Check, Lock, School
} from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut } from '../services/firebase';
import { 
  getStaffProfile, verifyGatePassToken, checkInGatePass, 
  listenToRecentCheckIns, listAllStaff, saveStaffMember, 
  toggleStaffActive, deleteStaffMember, STAFF_ROLES 
} from '../services/gatePassService';

export default function GateScannerPage() {
  const navigate = useNavigate();

  // Authentication & Staff State
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [staffInfo, setStaffInfo] = useState(null);
  const [authError, setAuthError] = useState('');

  // Active View Tab: 'SCANNER' | 'RECENT' | 'STAFF'
  const [activeTab, setActiveTab] = useState('SCANNER');

  // Scanner & Camera state
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  // Scan Verification & Check-In state
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [scannedResult, setScannedResult] = useState(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInError, setCheckInError] = useState('');

  // Recent Check-Ins & Staff Management state
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loadingStaffList, setLoadingStaffList] = useState(false);
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState(STAFF_ROLES.CORE_TEAM);
  const [staffActionLoading, setStaffActionLoading] = useState(false);

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

  // 2. Real-time recent check-ins listener (when tab is RECENT or staff is active)
  useEffect(() => {
    if (!staffInfo?.isStaff) return;
    const unsubRecent = listenToRecentCheckIns((list) => {
      setRecentCheckIns(list);
    }, 30);
    return () => {
      if (typeof unsubRecent === 'function') unsubRecent();
    };
  }, [staffInfo?.isStaff]);

  // 3. Load Staff list when Super Admin opens STAFF tab
  const fetchStaffList = useCallback(async () => {
    if (staffInfo?.role !== STAFF_ROLES.SUPER_ADMIN) return;
    setLoadingStaffList(true);
    try {
      const list = await listAllStaff();
      setStaffList(list);
    } catch (err) {
      console.warn('Error fetching staff:', err);
    } finally {
      setLoadingStaffList(false);
    }
  }, [staffInfo?.role]);

  useEffect(() => {
    if (activeTab === 'STAFF' && staffInfo?.role === STAFF_ROLES.SUPER_ADMIN) {
      fetchStaffList();
    }
  }, [activeTab, staffInfo?.role, fetchStaffList]);

  // 4. Camera control
  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
      setIsDetecting(true);
    } catch (err) {
      console.warn('Camera initialization error:', err);
      setCameraError(err.message || 'Permission denied to access camera');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsDetecting(false);
  };

  // Start camera when on SCANNER tab and authorized staff
  useEffect(() => {
    if (staffInfo?.isStaff && activeTab === 'SCANNER' && !scannedResult && !checkInSuccess) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [staffInfo?.isStaff, activeTab, scannedResult, checkInSuccess]);

  // 5. Continuous Barcode / QR Detection loop
  useEffect(() => {
    if (!cameraActive || !isDetecting || scannedResult || checkInSuccess) return;

    let animationFrameId;
    let detector = null;

    if ('BarcodeDetector' in window) {
      try {
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        detector = null;
      }
    }

    const checkFrame = async () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && detector) {
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            handleScannedRaw(rawValue);
            return;
          }
        } catch {}
      }
      animationFrameId = requestAnimationFrame(checkFrame);
    };

    if (detector) {
      animationFrameId = requestAnimationFrame(checkFrame);
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [cameraActive, isDetecting, scannedResult, checkInSuccess]);

  // 6. Handle Scanned Raw Token / URL
  const handleScannedRaw = async (raw) => {
    if (!raw || verifyingToken || scannedResult) return;

    stopCamera();
    setVerifyingToken(true);
    setCheckInError('');

    let cleanToken = raw.trim();
    if (cleanToken.includes('/gate/verify/')) {
      const parts = cleanToken.split('/gate/verify/');
      cleanToken = parts[1]?.split('?')[0]?.split('#')[0] || cleanToken;
    } else if (cleanToken.startsWith('SAMYAK:')) {
      cleanToken = cleanToken.replace('SAMYAK:', '');
    }

    try {
      const res = await verifyGatePassToken(cleanToken, staffInfo);
      setScannedResult({
        ...res,
        token: cleanToken,
      });
    } catch (err) {
      setScannedResult({
        isValid: false,
        status: 'ERROR',
        error: err.message || 'Error occurred while validating token.',
        token: cleanToken,
      });
    } finally {
      setVerifyingToken(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleScannedRaw(manualToken.trim());
  };

  // 7. Atomic Check-In Execution (ALLOW ENTRY)
  const handleAllowEntry = async () => {
    if (!scannedResult?.token || !staffInfo?.isStaff) return;

    try {
      setIsCheckingIn(true);
      setCheckInError('');

      const res = await checkInGatePass(scannedResult.token, staffInfo);

      // Play short haptic feedback if supported
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate([100, 50, 100]);
      }

      setCheckInSuccess(true);
      setScannedResult(null);
    } catch (err) {
      console.error('Check-in failed:', err);
      // If error is ALREADY_USED or other specific violation, update result card
      if (err.message.includes('ALREADY_USED')) {
        setScannedResult({
          isValid: false,
          status: 'ALREADY_USED',
          error: err.message,
          data: scannedResult?.data,
          checkedInAt: 'Just now',
          checkedInBy: 'Another Staff Member',
        });
      } else {
        setCheckInError(err.message || 'Check-in failed. Please verify credentials.');
      }
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleResetForNextScan = () => {
    setScannedResult(null);
    setCheckInSuccess(false);
    setCheckInError('');
    setManualToken('');
    startCamera();
  };

  // 8. Auth Actions
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign-in error:', err);
      setAuthError(err.message || 'Sign in failed.');
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    stopCamera();
    try {
      await signOut(auth);
    } catch {}
    setFirebaseUser(null);
    setStaffInfo(null);
    setScannedResult(null);
    setCheckInSuccess(false);
  };

  // 9. Staff Management Actions (Super Admin only)
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaffEmail.trim()) return;
    setStaffActionLoading(true);
    try {
      await saveStaffMember({
        email: newStaffEmail,
        name: newStaffName,
        role: newStaffRole,
        active: true,
      });
      setNewStaffEmail('');
      setNewStaffName('');
      await fetchStaffList();
    } catch (err) {
      alert('Failed to add staff: ' + err.message);
    } finally {
      setStaffActionLoading(false);
    }
  };

  const handleToggleStaffStatus = async (uid, currentActive) => {
    setStaffActionLoading(true);
    try {
      await toggleStaffActive(uid, !currentActive);
      await fetchStaffList();
    } catch (err) {
      alert('Error updating status: ' + err.message);
    } finally {
      setStaffActionLoading(false);
    }
  };

  const handleDeleteStaff = async (uid) => {
    if (!window.confirm('Are you sure you want to revoke this staff member access?')) return;
    setStaffActionLoading(true);
    try {
      await deleteStaffMember(uid);
      await fetchStaffList();
    } catch (err) {
      alert('Error revoking staff: ' + err.message);
    } finally {
      setStaffActionLoading(false);
    }
  };

  // =========================================================================
  // VIEW A: LOADING STATE
  // =========================================================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />
        <div className="p-8 rounded-3xl bg-neutral-900/60 border border-neutral-800 text-center space-y-4 max-w-sm w-full">
          <RefreshCw className="w-9 h-9 animate-spin text-cyan-400 mx-auto" />
          <h2 className="text-lg font-heading font-black text-white uppercase tracking-wider">
            SAMYAK 2026 GATE DESK
          </h2>
          <p className="text-xs font-mono text-neutral-400">
            Verifying staff credentials and security clearance...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: NOT AUTHENTICATED -> "SAMYAK STAFF LOGIN REQUIRED"
  // =========================================================================
  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-cyan-500 selection:text-black">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Badge */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 text-[11px] font-mono font-bold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>AUTHORIZED PERSONNEL ONLY</span>
            </div>
            <h1 className="text-3xl font-black font-heading text-white tracking-wide">
              SAMYAK <span className="text-cyan-400">GATE DESK</span>
            </h1>
          </div>

          {/* Login Card */}
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

          <p className="text-center text-[11px] font-mono text-neutral-500">
            Entry authorization is logged and audited under SAMYAK Security Protocols.
          </p>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW C: AUTHENTICATED BUT NOT AUTHORIZED STAFF -> "ACCESS DENIED"
  // =========================================================================
  if (!staffInfo?.isStaff) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-red-500 selection:text-white">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-red-600/10 blur-[140px] pointer-events-none" />

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

            {/* Account Info Pill */}
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

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>SIGN OUT / SWITCH ACCOUNT</span>
              </button>

              <Link
                to="/profile"
                className="block text-center text-xs font-mono text-neutral-400 hover:text-white pt-2 transition-colors"
              >
                Go to my attendee profile →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW D: AUTHORIZED STAFF -> SAMYAK STAFF PANEL
  // =========================================================================
  const roleBadgeColor = {
    [STAFF_ROLES.SUPER_ADMIN]: 'bg-purple-950/80 border-purple-500/60 text-purple-300',
    [STAFF_ROLES.ADMIN]: 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300',
    [STAFF_ROLES.CORE_TEAM]: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300',
    [STAFF_ROLES.GATE_STAFF]: 'bg-blue-950/80 border-blue-500/60 text-blue-300',
  }[staffInfo?.role] || 'bg-neutral-900 border-neutral-700 text-neutral-300';

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col items-center justify-between p-3 sm:p-6 relative selection:bg-cyan-500 selection:text-black">
      {/* Background ambient glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-cyan-500/10 blur-[130px] pointer-events-none" />

      {/* ----------------------------------------------------------------- */}
      {/* 1. TOP SAMYAK STAFF PANEL BADGE & NAVIGATION */}
      {/* ----------------------------------------------------------------- */}
      <header className="w-full max-w-2xl mx-auto space-y-3 pt-2">
        <div className="p-3 sm:p-4 rounded-2xl bg-neutral-950/90 border border-neutral-800/80 backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          {/* Staff Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-black font-heading text-base">
              {staffInfo.name ? staffInfo.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black font-heading text-white">
                  {staffInfo.name}
                </span>
                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${roleBadgeColor}`}>
                  {staffInfo.role}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                <span>{staffInfo.email}</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>AUTHORIZED</span>
                </span>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={handleSignOut}
            className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-neutral-950 border border-neutral-800/80 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('SCANNER')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
              activeTab === 'SCANNER'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>SCAN GATE PASS</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RECENT')}
            className={`flex-1 py-2 rounded-xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
              activeTab === 'RECENT'
                ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>RECENT CHECK-INS ({recentCheckIns.length})</span>
          </button>

          {staffInfo.role === STAFF_ROLES.SUPER_ADMIN && (
            <button
              type="button"
              onClick={() => setActiveTab('STAFF')}
              className={`py-2 px-3 sm:px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all cursor-pointer ${
                activeTab === 'STAFF'
                  ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'text-purple-400 hover:text-purple-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">STAFF MANAGEMENT</span>
              <span className="sm:hidden">STAFF</span>
            </button>
          )}
        </div>
      </header>

      {/* ----------------------------------------------------------------- */}
      {/* 2. TAB CONTENT: SCANNER VIEW */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'SCANNER' && (
        <main className="w-full max-w-md mx-auto my-auto py-4">
          <AnimatePresence mode="wait">
            {/* SUB-VIEW 1: CHECK-IN SUCCESS */}
            {checkInSuccess ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 sm:p-8 rounded-3xl border-2 border-emerald-500 bg-[#05140d] text-center space-y-6 shadow-[0_0_60px_rgba(16,185,129,0.35)]"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold uppercase tracking-wider">
                    <span>✓ ENTRY ALLOWED</span>
                  </div>
                  <h2 className="text-3xl font-black font-heading text-white">
                    WELCOME TO <span className="text-emerald-400">SAMYAK 2026</span>
                  </h2>
                  <p className="text-xs font-mono text-neutral-300">
                    Gate pass checked in successfully. Wristband / delegate badge can now be issued.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleResetForNextScan}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-black font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>SCAN NEXT PASS</span>
                </button>
              </motion.div>
            ) : scannedResult ? (
              /* SUB-VIEW 2: SCANNED PASS RESULT DRAWER / CARD */
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-4"
              >
                {/* VALID PASS CARD */}
                {scannedResult.isValid ? (
                  <div className="p-6 sm:p-7 rounded-3xl border-2 border-cyan-500/60 bg-[#050814] text-center space-y-5 shadow-[0_0_50px_rgba(0,240,255,0.25)]">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-400 text-cyan-300 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(0,240,255,0.4)]">
                      <ShieldCheck className="w-9 h-9" />
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>✓ VALID GATE PASS</span>
                      </div>
                      <h2 className="text-2xl font-black font-heading text-white">
                        SAMYAK <span className="text-red-500">2026</span>
                      </h2>
                    </div>

                    {/* Attendee Details */}
                    <div className="p-4 rounded-2xl bg-black/70 border border-cyan-900/50 text-xs font-mono text-left space-y-2">
                      <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                        <span className="text-neutral-400">Attendee Name:</span>
                        <span className="font-bold text-white text-sm">{scannedResult.data?.name}</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Student ID / Roll:</span>
                        <span className="font-bold text-cyan-400">
                          {scannedResult.data?.rollNo || scannedResult.data?.registrationNumber || 'N/A'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">College / University:</span>
                        <span className="text-neutral-200">{scannedResult.data?.university || 'KL University'}</span>
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

                    {checkInError && (
                      <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-xs font-mono text-red-300">
                        {checkInError}
                      </div>
                    )}

                    {/* Check In Action Buttons */}
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        disabled={isCheckingIn}
                        onClick={handleAllowEntry}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-400 hover:brightness-110 text-black font-heading font-black text-base uppercase tracking-wider shadow-[0_0_35px_rgba(0,240,255,0.4)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isCheckingIn ? (
                          <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>RECORDING ENTRY...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            <span>ALLOW ENTRY / CHECK IN</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleResetForNextScan}
                        className="w-full py-2.5 rounded-xl bg-transparent hover:bg-neutral-900 text-neutral-400 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                      >
                        Cancel & Return to Camera
                      </button>
                    </div>
                  </div>
                ) : scannedResult.status === 'ALREADY_USED' ? (
                  /* ALREADY USED ERROR CARD */
                  <div className="p-6 sm:p-7 rounded-3xl border-2 border-amber-500 bg-[#160d03] text-center space-y-5 shadow-[0_0_60px_rgba(245,158,11,0.3)]">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(245,158,11,0.5)]">
                      <AlertOctagon className="w-9 h-9" />
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider">
                        <span>✕ GATE PASS ALREADY USED</span>
                      </div>
                      <h2 className="text-2xl font-black font-heading text-white">
                        ENTRY <span className="text-amber-400">DENIED</span>
                      </h2>
                      <p className="text-xs font-mono text-amber-200/90 max-w-xs mx-auto">
                        This Gate Pass has already been used for event entry. Re-entry or duplicate usage is blocked.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/70 border border-amber-500/40 text-xs font-mono text-left space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Attendee:</span>
                        <span className="font-bold text-white">{scannedResult.data?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Checked in at:</span>
                        <span className="font-bold text-amber-300">{scannedResult.checkedInAt}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Authorized by:</span>
                        <span className="font-bold text-amber-400">{scannedResult.checkedInBy}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetForNextScan}
                      className="w-full py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-black font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>SCAN NEXT PASS</span>
                    </button>
                  </div>
                ) : scannedResult.status === 'INTERNAL_PARTICIPANT' ? (
                  /* INTERNAL KL UNIVERSITY STUDENT CARD */
                  <div className="p-6 sm:p-7 rounded-3xl border-2 border-cyan-500 bg-[#05141c] text-center space-y-5 shadow-[0_0_60px_rgba(6,182,212,0.3)]">
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(6,182,212,0.5)]">
                      <School className="w-9 h-9" />
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-xs font-mono font-bold uppercase tracking-wider">
                        <span>ℹ INTERNAL KL UNIVERSITY STUDENT</span>
                      </div>
                      <h2 className="text-2xl font-black font-heading text-white">
                        GATE PASS <span className="text-cyan-400">NOT REQUIRED</span>
                      </h2>
                      <p className="text-xs font-mono text-cyan-200/90 max-w-xs mx-auto">
                        This participant is an internal KL University student. Entry and attendance should be granted with their physical or digital KL Student ID Card.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-black/70 border border-cyan-500/40 text-xs font-mono text-left space-y-2">
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Student Name:</span>
                        <span className="font-bold text-white">{scannedResult.data?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Student Roll / ID:</span>
                        <span className="font-bold text-cyan-300">{scannedResult.data?.rollNo || scannedResult.data?.studentId || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-neutral-400">Institution:</span>
                        <span className="font-bold text-cyan-400">KL University</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetForNextScan}
                      className="w-full py-3.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-black font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>SCAN NEXT PASS</span>
                    </button>
                  </div>
                ) : (
                  /* PAYMENT NOT VERIFIED / INVALID PASS CARD */
                  <div className="p-6 sm:p-7 rounded-3xl border-2 border-red-500 bg-[#160404] text-center space-y-5 shadow-[0_0_60px_rgba(239,68,68,0.3)]">
                    <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 text-red-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(239,68,68,0.4)]">
                      <XCircle className="w-9 h-9" />
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-mono font-bold uppercase tracking-wider">
                        <span>
                          ✕ {scannedResult.status === 'PAYMENT_NOT_VERIFIED' ? 'PAYMENT NOT VERIFIED' : 'INVALID GATE PASS'}
                        </span>
                      </div>
                      <h2 className="text-2xl font-black font-heading text-white">
                        ENTRY <span className="text-red-400">DENIED</span>
                      </h2>
                      <p className="text-xs font-mono text-red-200/90 max-w-xs mx-auto">
                        {scannedResult.error || 'QR code could not be verified in the festival database.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetForNextScan}
                      className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Back to Scanner</span>
                    </button>
                  </div>
                )}
              </motion.div>
            ) : (
              /* SUB-VIEW 3: CAMERA VIEWFINDER & MANUAL ENTRY */
              <motion.div
                key="camera"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Viewfinder Frame */}
                <div className="relative aspect-square w-full max-w-sm mx-auto rounded-3xl overflow-hidden bg-neutral-950 border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(0,240,255,0.2)]">
                  {/* Cyber Overlays */}
                  <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-cyan-400 z-10" />
                  <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-cyan-400 z-10" />
                  <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-cyan-400 z-10" />
                  <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-cyan-400 z-10" />

                  {/* Animated Scanning Laser Line */}
                  {cameraActive && (
                    <motion.div 
                      animate={{ y: [20, 280, 20] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                      className="absolute left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#00f0ff] z-20"
                    />
                  )}

                  {/* Video Stream */}
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                  />

                  {/* Camera Off / Fallback state */}
                  {!cameraActive && (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-neutral-950">
                      <CameraOff className="w-12 h-12 text-neutral-600" />
                      <div className="space-y-1">
                        <span className="text-sm font-bold font-heading text-neutral-300 block">
                          Camera Paused
                        </span>
                        <p className="text-xs font-mono text-neutral-500">
                          {cameraError || 'Click button below to enable camera.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-mono font-bold transition-all cursor-pointer"
                      >
                        Enable Camera
                      </button>
                    </div>
                  )}

                  {verifyingToken && (
                    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 z-30">
                      <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
                      <span className="text-xs font-mono text-white font-bold">Verifying Token...</span>
                    </div>
                  )}
                </div>

                <div className="text-center text-[11px] font-mono text-neutral-400 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Point camera at attendee's Digital Gate Pass QR code</span>
                </div>

                {/* Manual Token Entry Fallback */}
                <div className="space-y-3 pt-2">
                  <div className="relative flex items-center justify-center">
                    <div className="border-t border-neutral-800 w-full" />
                    <span className="bg-black px-3 text-[10px] font-mono text-neutral-500 uppercase tracking-widest whitespace-nowrap">
                      Or Manual Token / URL
                    </span>
                    <div className="border-t border-neutral-800 w-full" />
                  </div>

                  <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. SMYK-GP-8F92A..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      disabled={!manualToken.trim() || verifyingToken}
                      className="px-5 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-heading font-black text-xs uppercase tracking-wider flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.3)]"
                    >
                      <span>Verify</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 3. TAB CONTENT: RECENT CHECK-INS */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'RECENT' && (
        <main className="w-full max-w-2xl mx-auto my-auto py-4">
          <div className="p-4 sm:p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                  Live Gate Check-in Feed
                </h3>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                {recentCheckIns.length} Attendees Checked In
              </span>
            </div>

            {recentCheckIns.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-neutral-500">
                No attendees have checked in through the gate yet today.
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {recentCheckIns.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{item.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 font-bold">
                          {item.ticketType || 'Fest Pass'}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {item.university} {item.rollNo ? `• Roll: ${item.rollNo}` : ''}
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <div className="text-emerald-400 font-bold flex items-center justify-end gap-1 text-[11px]">
                        <Check className="w-3 h-3" />
                        <span>ENTRY ALLOWED</span>
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {item.checkedInAt?.seconds 
                          ? new Date(item.checkedInAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                          : 'Recent'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 4. TAB CONTENT: SUPER ADMIN STAFF MANAGEMENT */}
      {/* ----------------------------------------------------------------- */}
      {activeTab === 'STAFF' && staffInfo.role === STAFF_ROLES.SUPER_ADMIN && (
        <main className="w-full max-w-2xl mx-auto my-auto py-4 space-y-4">
          {/* Add Staff Card */}
          <div className="p-4 sm:p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-heading font-bold text-white uppercase tracking-wider">
                Authorize New Staff Member
              </h3>
            </div>

            <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="email"
                required
                placeholder="staff.email@gmail.com"
                value={newStaffEmail}
                onChange={(e) => setNewStaffEmail(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
              />

              <input
                type="text"
                placeholder="Full Name"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
              />

              <div className="flex items-center gap-2">
                <select
                  value={newStaffRole}
                  onChange={(e) => setNewStaffRole(e.target.value)}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value={STAFF_ROLES.CORE_TEAM}>CORE_TEAM</option>
                  <option value={STAFF_ROLES.ADMIN}>ADMIN</option>
                  <option value={STAFF_ROLES.GATE_STAFF}>GATE_STAFF</option>
                  <option value={STAFF_ROLES.SUPER_ADMIN}>SUPER_ADMIN</option>
                </select>

                <button
                  type="submit"
                  disabled={staffActionLoading || !newStaffEmail.trim()}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-heading font-black text-xs uppercase flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </form>
          </div>

          {/* Existing Staff List */}
          <div className="p-4 sm:p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs font-mono">
              <span className="font-bold text-white uppercase tracking-wider">
                Configured Staff ({staffList.length})
              </span>
              <button
                type="button"
                onClick={fetchStaffList}
                className="text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingStaffList ? (
              <div className="py-8 text-center text-xs font-mono text-neutral-500">
                Loading staff registry...
              </div>
            ) : staffList.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-neutral-500">
                No custom staff records provisioned. Add an authorized account above.
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {staffList.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{member.name || member.email}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-purple-300 font-bold uppercase">
                          {member.role}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-400">{member.email}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleStaffStatus(member.id, member.active !== false)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          member.active !== false
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900'
                            : 'bg-neutral-800 text-neutral-500 border border-neutral-700 hover:bg-neutral-700'
                        }`}
                      >
                        {member.active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(member.id)}
                        className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-950 text-neutral-400 hover:text-red-400 border border-neutral-800 transition-colors cursor-pointer"
                        title="Revoke access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 5. BOTTOM FOOTER BAR */}
      {/* ----------------------------------------------------------------- */}
      <footer className="w-full max-w-md mx-auto text-center pt-2 pb-1 text-[10px] font-mono text-neutral-500">
        SAMYAK 2026 FESTIVAL SECURITY CHECKPOINT • STRICT ACCESS CONTROL
      </footer>
    </div>
  );
}
