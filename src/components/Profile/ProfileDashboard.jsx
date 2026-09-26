import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, School, 
  CreditCard, ArrowRight, ShieldCheck,
  LogOut, Upload, X, Edit, IdCard,
  Lock, Eye, RefreshCw, CheckCircle2, Check
} from 'lucide-react';
import { useUser } from '../../data/useUser';
import GatePassCard from '../Payment/GatePassCard';
import { maskUtr, maskPhone } from '../../services/fileSecurityService';
import { isKLUEmail } from '../../services/firebase';

export default function ProfileDashboard() {
  const { 
    currentUser, 
    authLoading, 
    userData, 
    isProfileComplete,
    loginWithGoogle, 
    loginWithMicrosoft,
    logout, 
    completeProfile,
    uploadCollegeIdCard 
  } = useUser();

  // Edit / Complete Profile Form State
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: userData.name || '',
    studentId: '',
    mobile: '',
    college: '',
    branch: '',
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // ID Card Upload State
  const [uploadingIdCard, setUploadingIdCard] = useState(false);
  const [idCardError, setIdCardError] = useState('');
  const [idCardModalOpen, setIdCardModalOpen] = useState(false);
  const [paymentScreenshotModalOpen, setPaymentScreenshotModalOpen] = useState(false);
  const [fullGatePassModalOpen, setFullGatePassModalOpen] = useState(false);
  const idCardInputRef = useRef(null);

  // Initialize edit form when opening
  const handleOpenEdit = () => {
    setEditForm({
      name: userData.name || currentUser?.displayName || '',
      studentId: userData.studentId || '',
      mobile: userData.mobile || '',
      college: userData.college || 'KL University',
      branch: userData.branch || '',
    });
    setProfileError('');
    setProfileSuccess('');
    setShowEditForm(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!editForm.name.trim()) {
      setProfileError('Please enter your Full Name.');
      return;
    }

    if (!editForm.studentId.trim() || !editForm.mobile.trim()) {
      setProfileError('Please provide both Student ID / Roll Number and Mobile Number.');
      return;
    }

    try {
      setSavingProfile(true);
      await completeProfile({
        name: editForm.name,
        studentId: editForm.studentId,
        mobile: editForm.mobile,
        college: editForm.college,
        branch: editForm.branch,
      });
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => {
        setShowEditForm(false);
        setProfileSuccess('');
      }, 1200);
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleIdCardUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIdCardError('');
    try {
      setUploadingIdCard(true);
      await uploadCollegeIdCard(file);
    } catch (err) {
      console.error('ID card upload error:', err);
      setIdCardError(err.message || 'Failed to upload College ID card.');
    } finally {
      setUploadingIdCard(false);
    }
  };

  // =========================================================================
  // VIEW 1: LOADING STATE
  // =========================================================================
  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <RefreshCw className="w-8 h-8 text-red-500 animate-spin mb-4" />
        <p className="text-sm font-mono text-neutral-400">Loading SAMYAK 2026 Profile...</p>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: UNAUTHENTICATED — GOOGLE SIGN IN ONLY (Section 2 of Requirements)
  // =========================================================================
  if (!currentUser) {
    return (
      <div className="relative max-w-xl mx-auto px-4 py-20 sm:py-28 text-center">
        <div className="p-8 sm:p-12 rounded-3xl bg-neutral-950 border border-neutral-800 shadow-[0_0_50px_rgba(255,0,60,0.15)] relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 mx-auto flex items-center justify-center mb-6">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <span className="px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 text-xs font-mono font-bold uppercase tracking-widest block max-w-fit mx-auto mb-3">
            Single Sign-On
          </span>

          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white uppercase tracking-wider mb-2">
            SIGN IN TO <span className="text-red-500">SAMYAK 2026</span>
          </h2>

          <p className="text-xs sm:text-sm text-neutral-400 font-cyber max-w-md mx-auto mb-8 leading-relaxed">
            Access your unified festival dashboard, complete your registration, submit verified UPI payments, and unlock your unique QR gate pass.
          </p>

          <div className="space-y-3">
            {/* Microsoft for KL University Students */}
            <button
              type="button"
              onClick={loginWithMicrosoft}
              className="w-full py-4 px-6 rounded-2xl bg-[#00a4ef]/15 hover:bg-[#00a4ef]/25 border border-[#00a4ef]/40 text-cyan-300 font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span>KL University Students — Sign in with Microsoft</span>
            </button>

            {/* Google for Outside College Participants */}
            <button
              type="button"
              onClick={loginWithGoogle}
              className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-3 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-lg cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Outside College Participants — Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: INCOMPLETE PROFILE MODAL / FIRST TIME ONBOARDING (Section 3 & 4)
  // =========================================================================
  if (!isProfileComplete && !showEditForm) {
    return (
      <div className="relative max-w-2xl mx-auto px-4 py-16">
        <div className="p-8 rounded-3xl bg-neutral-950 border-2 border-red-500/50 shadow-[0_0_50px_rgba(255,0,60,0.2)]">
          <div className="flex items-center gap-3 pb-4 border-b border-neutral-800 mb-6">
            <div className="w-10 h-10 rounded-full bg-red-600/20 border border-red-500 flex items-center justify-center text-red-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-red-400 tracking-wider">Step 1 of 3</span>
              <h2 className="text-xl font-bold font-heading text-white">COMPLETE YOUR SAMYAK PROFILE</h2>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            {/* Name & Email Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-white mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={editForm.name || userData.name || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-400 mb-1">Email (Google Account)</label>
                <input
                  type="text"
                  disabled
                  value={userData.email}
                  className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300 cursor-not-allowed opacity-80"
                />
              </div>
            </div>

            {/* User Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-white mb-1">Student ID / Roll Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2300030001"
                  value={editForm.studentId}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, studentId: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-white mb-1">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, mobile: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-white mb-1">College / University *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. KL University"
                  value={editForm.college}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, college: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-neutral-300 mb-1">Branch / Department</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science (CSE)"
                  value={editForm.branch}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, branch: e.target.value }))}
                  className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {profileError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-xs font-mono text-red-300">
                {profileError}
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full mt-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              {savingProfile ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <span>Save Profile &amp; Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 4: UNIFIED SAMYAK 2026 DASHBOARD (Sections 5 & 31)
  // =========================================================================
  const paymentStatus = userData.payment?.status || userData.paymentStatus || 'PENDING_PAYMENT';
  const isPaymentVerified = paymentStatus === 'VERIFIED';
  const isPaymentPending = paymentStatus === 'PENDING_VERIFICATION' || paymentStatus === 'PAYMENT_SUBMITTED';
  const isPaymentRejected = paymentStatus === 'REJECTED';

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      
      {/* Top Banner / Identity Bar */}
      <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border-2 border-red-500/40 overflow-hidden flex items-center justify-center shrink-0">
            {userData.avatarUrl ? (
              <img src={userData.avatarUrl} alt={userData.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-neutral-400" />
            )}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase text-neutral-400">Authenticated SAMYAK Account</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />

              {/* Category Badge */}
              {(userData.category === 'INTERNAL' || isKLUEmail(userData.email)) ? (
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  🏫 KL University (Internal)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/50 text-purple-300 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                  🎓 External Participant
                </span>
              )}

              {/* Category Verification Status */}
              {userData.categoryVerificationStatus === 'VERIFIED' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold">
                  ✓ Verified
                </span>
              )}
              {userData.categoryVerificationStatus === 'PENDING' && (
                <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-[10px] font-mono font-bold">
                  ⏳ Review Pending
                </span>
              )}

              {/* Attendance Status */}
              {userData.attendance?.status === 'PRESENT' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/30 border border-emerald-400 text-emerald-300 text-[10px] font-mono font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                  ✓ Present at Fest
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black font-heading text-white">{userData.name}</h1>
            <p className="text-xs font-mono text-neutral-400">{userData.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenEdit}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono text-white flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5 text-neutral-400" />
            <span>Edit Profile</span>
          </button>

          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-red-950/60 border border-neutral-700 hover:border-red-500/40 text-xs font-mono text-neutral-300 hover:text-red-400 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Grid: 5 Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2 Cols): Personal Details, College ID, Registration, Payment */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. PERSONAL DETAILS CARD */}
          <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <IdCard className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
                  Personal Details
                </h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">UID: {userData.uid?.slice(0, 10)}...</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Student ID / Roll</span>
                <span className="text-white font-bold">{userData.studentId || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Mobile Number</span>
                <span className="text-white font-bold">{userData.mobile ? maskPhone(userData.mobile) : '—'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">College / University</span>
                <span className="text-white font-bold truncate block">{userData.college || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block text-[10px] uppercase">Branch</span>
                <span className="text-white font-bold truncate block">{userData.branch || '—'}</span>
              </div>
            </div>
          </div>

          {/* 2. COLLEGE ID CARD */}
          <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
                  College ID Card
                </h3>
              </div>
              {userData.idCardUrl ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  ✓ Uploaded
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-[10px] font-mono font-bold">
                  Pending Upload
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <p className="text-xs font-mono text-neutral-400">
                Official student identity proof required for fest accreditation and gate entry check.
              </p>

              <div className="flex items-center gap-2">
                {userData.idCardUrl && (
                  <button
                    type="button"
                    onClick={() => setIdCardModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono text-cyan-400 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                )}

                <input
                  type="file"
                  ref={idCardInputRef}
                  onChange={handleIdCardUpload}
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={uploadingIdCard}
                  onClick={() => idCardInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono text-white flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{uploadingIdCard ? 'Uploading...' : userData.idCardUrl ? 'Replace' : 'Upload ID Card'}</span>
                </button>
              </div>
            </div>

            {idCardError && (
              <p className="text-xs font-mono text-red-400 mt-2">{idCardError}</p>
            )}
          </div>

          {/* 3. REGISTRATION SECTION */}
          <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
                  Festival Registration
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                userData.registrationId 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                  : 'bg-neutral-800 text-neutral-400'
              }`}>
                {userData.registrationId ? '✓ REGISTERED' : 'NOT REGISTERED'}
              </span>
            </div>

            {userData.registrationId ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Registration ID</span>
                  <span className="text-cyan-400 font-bold">{userData.registrationId}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Selected Pass Tier</span>
                  <span className="text-white font-bold">{userData.tier || 'Tech + Hackathon Pass'}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Status</span>
                  <span className="text-emerald-400 font-bold">Confirmed</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-xs font-mono text-neutral-400">
                  Select your festival pass tier to unlock all 45+ flagship arenas.
                </p>
                <Link
                  to="/enroll"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all"
                >
                  Register Now
                </Link>
              </div>
            )}
          </div>

          {/* 4. PAYMENT STATUS CARD */}
          <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
                  Payment Verification
                </h3>
              </div>

              {isPaymentVerified && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold">
                  ✓ PAYMENT VERIFIED
                </span>
              )}
              {isPaymentPending && (
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-[10px] font-mono font-bold">
                  ● UNDER VERIFICATION
                </span>
              )}
              {isPaymentRejected && (
                <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold">
                  ✕ PAYMENT REJECTED
                </span>
              )}
              {!isPaymentVerified && !isPaymentPending && !isPaymentRejected && (
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-mono font-bold">
                  PENDING SUBMISSION
                </span>
              )}
            </div>

            {isPaymentPending && (
              <div className="p-4 rounded-2xl bg-yellow-950/20 border border-yellow-500/30 space-y-2">
                <p className="text-xs font-mono text-yellow-300 leading-relaxed">
                  ✓ Your UTR and payment screenshot have been submitted successfully. Our team is verifying your payment for authenticity and fraud prevention.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-yellow-500/20 text-[11px] font-mono">
                  <span className="text-neutral-400">
                    Submitted UTR: <strong className="text-white">{userData.payment?.utr ? maskUtr(userData.payment.utr) : 'Recorded'}</strong>
                  </span>
                  {userData.payment?.screenshotUrl && (
                    <button
                      type="button"
                      onClick={() => setPaymentScreenshotModalOpen(true)}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      View Screenshot
                    </button>
                  )}
                </div>
              </div>
            )}

            {isPaymentVerified && (
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                <p className="text-xs font-mono text-emerald-300">
                  ✓ Official Fest Payment Verified. Your SAMYAK 2026 Gate Pass is now active.
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20 text-[11px] font-mono">
                  <span className="text-neutral-400">
                    UTR: <strong className="text-white">{userData.payment?.utr ? maskUtr(userData.payment.utr) : 'Verified'}</strong>
                  </span>
                  {userData.payment?.screenshotUrl && (
                    <button
                      type="button"
                      onClick={() => setPaymentScreenshotModalOpen(true)}
                      className="text-cyan-400 hover:underline cursor-pointer"
                    >
                      View Receipt
                    </button>
                  )}
                </div>
              </div>
            )}

            {!isPaymentVerified && !isPaymentPending && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs font-mono text-neutral-400">
                  Single pass required for full festival access and event enrollment.
                </p>
                <Link
                  to="/enroll"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-mono font-bold uppercase tracking-wider transition-all text-center shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  PAY EVENT FEE &amp; PASS
                </Link>
              </div>
            )}
          </div>

        </div>

        {/* Right Column (1 Col): GATE PASS (Section 14 & 19) */}
        <div className="space-y-6">

          {/* 5. GATE PASS / ENTRY STATUS SECTION */}
          {(userData.category === 'INTERNAL' || isKLUEmail(userData.email)) ? (
            /* INTERNAL PARTICIPANT: NO GATE PASS NEEDED — SHOW KLU ID ACCESS CARD */
            <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <School className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
                    Campus Entry Credential
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-mono font-bold">
                  ✓ GATE PASS NOT REQUIRED
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-gradient-to-b from-cyan-950/25 to-black border border-cyan-500/30 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                  <School className="w-7 h-7" />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold tracking-widest block">
                    KL University Student
                  </span>
                  <h4 className="text-base font-black font-heading text-white">
                    COLLEGE ID CARD IS YOUR ENTRY PASS
                  </h4>
                  <p className="text-xs text-neutral-300 font-mono leading-relaxed max-w-sm mx-auto pt-1">
                    As an internal KL University student, you do not need an external QR Gate Pass. Carry and present your physical or digital KL Student ID Card at event arenas and festival checkpoints.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/60 border border-neutral-800 text-left text-xs font-mono space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Student ID / Roll:</span>
                    <span className="font-bold text-cyan-400">{userData.studentId || 'Recorded'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Institution:</span>
                    <span className="text-white font-bold">KL University</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Fest Fee Status:</span>
                    <span className={isPaymentVerified ? "text-emerald-400 font-bold" : isPaymentPending ? "text-yellow-400 font-bold" : "text-neutral-400"}>
                      {isPaymentVerified ? "✓ Verified" : isPaymentPending ? "● Under Verification" : "Pending Submission"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-400">Fest Attendance:</span>
                    <span className={userData.attendance?.status === 'PRESENT' ? "text-emerald-400 font-bold" : "text-neutral-400"}>
                      {userData.attendance?.status === 'PRESENT' ? "✓ PRESENT" : "NOT MARKED"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* EXTERNAL PARTICIPANT: OFFICIAL QR GATE PASS */
            <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold font-heading text-white uppercase tracking-wider">
                    Gate Pass
                  </h3>
                </div>

                {isPaymentVerified ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 text-[10px] font-mono font-bold">
                    ✓ ISSUED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-500 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    LOCKED
                  </span>
                )}
              </div>

              {/* IF PAYMENT NOT VERIFIED: STRICTLY LOCKED WITH NO QR (Section 14) */}
              {!isPaymentVerified && (
                <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-neutral-800 text-neutral-500 mx-auto flex items-center justify-center">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold font-heading text-white">🔒 NOT AVAILABLE YET</h4>
                  <p className="text-xs text-neutral-400 font-mono leading-relaxed">
                    Your Gate Pass will be generated after your payment has been verified by the fest committee.
                  </p>
                  <div className="pt-2">
                    <span className="text-[10px] font-mono text-neutral-500 block">
                      Status: {paymentStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )}

              {/* IF PAYMENT VERIFIED: REAL UNIQUE QR GATE PASS (Section 19) */}
              {isPaymentVerified && userData.gatePassToken && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-black border border-cyan-500/30 text-center space-y-3">
                    <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider block">
                      Official Festival Gate Pass
                    </span>

                    {/* Scannable Gate Pass QR */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                        (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'))
                          ? `${window.location.origin}/gate/verify/${userData.gatePassToken}`
                          : `https://kl--samyak.web.app/gate/verify/${userData.gatePassToken}`
                      )}`}
                      alt="SAMYAK 2026 Gate Pass QR"
                      className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl object-contain shadow-lg"
                    />

                    <div className="text-xs font-mono text-white font-bold">
                      {userData.name}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      {userData.studentId} • {userData.college}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFullGatePassModalOpen(true)}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View Full Gate Pass</span>
                  </button>
                </div>
              )}
            </div>
          )}

        </div>

      </div>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {showEditForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-lg w-full p-6 sm:p-8 rounded-3xl bg-neutral-950 border border-neutral-800 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <h3 className="text-base font-bold font-heading text-white uppercase tracking-wider">
                  Edit Personal Details
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono text-white mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-400 mb-1">Email (Google Account)</label>
                  <input
                    type="text"
                    disabled
                    value={userData.email}
                    className="w-full px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-400 cursor-not-allowed opacity-80"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white mb-1">Student ID / Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={editForm.studentId}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, studentId: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={editForm.mobile}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, mobile: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-white mb-1">College / University *</label>
                  <input
                    type="text"
                    required
                    value={editForm.college}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, college: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-neutral-300 mb-1">Branch / Department</label>
                  <input
                    type="text"
                    value={editForm.branch}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, branch: e.target.value }))}
                    className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                {profileError && (
                  <p className="text-xs font-mono text-red-400">{profileError}</p>
                )}
                {profileSuccess && (
                  <p className="text-xs font-mono text-emerald-400">{profileSuccess}</p>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="px-4 py-2 rounded-xl bg-neutral-900 text-xs font-mono text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold"
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW ID CARD MODAL */}
      <AnimatePresence>
        {idCardModalOpen && userData.idCardUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-xl w-full p-4 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs font-mono text-white font-bold">Uploaded College ID Card</span>
                <button
                  type="button"
                  onClick={() => setIdCardModalOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
                <img
                  src={userData.idCardUrl}
                  alt="Student College ID"
                  className="max-h-[65vh] w-auto object-contain rounded-xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW PAYMENT SCREENSHOT MODAL */}
      <AnimatePresence>
        {paymentScreenshotModalOpen && userData.payment?.screenshotUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-xl w-full p-4 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <span className="text-xs font-mono text-white font-bold">Submitted Payment Screenshot</span>
                <button
                  type="button"
                  onClick={() => setPaymentScreenshotModalOpen(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="rounded-2xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
                <img
                  src={userData.payment.screenshotUrl}
                  alt="Payment Confirmation Screenshot"
                  className="max-h-[65vh] w-auto object-contain rounded-xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL GATE PASS MODAL */}
      <AnimatePresence>
        {fullGatePassModalOpen && isPaymentVerified && userData.gatePassToken && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => setFullGatePassModalOpen(false)}
                className="absolute top-4 right-4 z-50 p-2 rounded-full bg-neutral-900/80 border border-neutral-700 text-neutral-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <GatePassCard
                registrationNumber={userData.registrationId}
                name={userData.name}
                ticketType={userData.tier}
                gatePassToken={userData.gatePassToken}
                gatePassStatus={userData.gatePassStatus}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
