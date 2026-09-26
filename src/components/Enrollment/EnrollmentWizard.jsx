import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  School, GraduationCap, ArrowRight, ArrowLeft, Check,
  CheckCircle2, Upload, X, Loader2, AlertCircle,
  CreditCard, QrCode, ImageIcon, ShieldCheck, User
} from 'lucide-react';
import { useUser } from '../../data/useUser';
import { uploadSecureUserFile } from '../../services/storageService';
import { enrollParticipant } from '../../services/registrationService';
import { PAYMENT_CONFIG, buildUpiPaymentUri } from '../../config/paymentConfig';
import { sanitizeText, checkRateLimit } from '../../services/fileSecurityService';
import { isKLUEmail } from '../../services/firebase';

const STEPS = {
  CATEGORY: 0,
  DETAILS: 1,
  PAYMENT: 2,
  CONFIRM: 3,
  SUCCESS: 4,
};

const AMOUNT = PAYMENT_CONFIG.PASS_TIERS[0]?.price || 499;
const UPI_ID = PAYMENT_CONFIG.MERCHANT_UPI_ID;
const MERCHANT_NAME = PAYMENT_CONFIG.MERCHANT_NAME;

export default function EnrollmentWizard() {
  const { currentUser, userData, loginWithGoogle, loginWithMicrosoft, submitPaymentProof } = useUser();
  const navigate = useNavigate();

  const [step, setStep] = useState(STEPS.CATEGORY);
  const [category, setCategory] = useState(null); // 'INTERNAL' | 'EXTERNAL'

  // Form fields
  const [form, setForm] = useState({
    name: userData?.name || currentUser?.displayName || '',
    studentId: userData?.studentId || '',
    mobile: userData?.mobile || '',
    college: '',
    branch: '',
  });

  // Payment fields
  const [utr, setUtr] = useState('');
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentPreview, setPaymentPreview] = useState(null);
  const paymentInputRef = useRef(null);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const clearError = () => setError('');

  // ─── AUTH ────────────────────────────────────────────────────────────────

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await loginWithGoogle();
      // After login, stay on CATEGORY step (they're now logged in)
    } catch (err) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await loginWithMicrosoft();
      if (res?.isKLUEmail) {
        // Auto-set category and jump to details
        setCategory('INTERNAL');
        setStep(STEPS.DETAILS);
      }
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('popup-closed')) {
        setError('Sign-in window was closed. Please try again.');
      } else {
        setError('Microsoft sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── STEP 1: CATEGORY ────────────────────────────────────────────────────

  const handleSelectCategory = (cat) => {
    setCategory(cat);
    setStep(STEPS.DETAILS);
    clearError();
  };

  // ─── STEP 2: DETAILS ─────────────────────────────────────────────────────

  const handleDetailsNext = () => {
    clearError();
    const cleanName = sanitizeText(form.name).trim();
    const cleanId = sanitizeText(form.studentId).trim();
    const cleanMobile = sanitizeText(form.mobile).trim();

    if (!cleanName) { setError('Please enter your full name.'); return; }
    if (!cleanId) { setError('Please enter your Student ID / Roll number.'); return; }
    if (!cleanMobile || cleanMobile.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number.'); return;
    }
    if (category === 'EXTERNAL' && !sanitizeText(form.college).trim()) {
      setError('Please enter your college / university name.'); return;
    }
    setStep(STEPS.PAYMENT);
  };

  // ─── STEP 3: PAYMENT ─────────────────────────────────────────────────────

  const handlePaymentFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentFile(file);
      setPaymentPreview(URL.createObjectURL(file));
    }
  };

  const removePaymentFile = () => {
    setPaymentFile(null);
    setPaymentPreview(null);
    if (paymentInputRef.current) paymentInputRef.current.value = '';
  };

  const handlePaymentNext = () => {
    clearError();
    const cleanUtr = sanitizeText(utr).trim();
    if (!cleanUtr || cleanUtr.length < 8) {
      setError('Please enter your valid UTR / Transaction ID (minimum 8 characters).'); return;
    }
    if (!paymentFile) {
      setError('Please upload your payment screenshot.'); return;
    }
    setStep(STEPS.CONFIRM);
  };

  // ─── STEP 4: CONFIRM & SUBMIT ────────────────────────────────────────────

  const handleSubmit = async () => {
    clearError();
    if (!currentUser) {
      setError('Please sign in first to submit your registration.');
      return;
    }

    try {
      checkRateLimit(`enroll_${currentUser.uid}`, 3, 60000);
    } catch (rlErr) {
      setError(rlErr.message);
      return;
    }

    setSubmitting(true);
    try {
      // Step A: Enroll (creates registration doc)
      const authProvider = isKLUEmail(currentUser.email) ? 'microsoft' : 'google';
      const enrollResult = await enrollParticipant({
        uid: currentUser.uid,
        email: currentUser.email,
        name: sanitizeText(form.name).trim(),
        mobile: sanitizeText(form.mobile).trim(),
        studentId: sanitizeText(form.studentId).trim(),
        college: category === 'INTERNAL' ? 'KL University' : sanitizeText(form.college).trim(),
        branch: sanitizeText(form.branch).trim(),
        category,
        authProvider,
      });

      // Step B: Upload screenshot & submit payment proof
      let screenshotUrl = null;
      if (paymentFile) {
        const uploadRes = await uploadSecureUserFile(
          paymentFile,
          'payment_proofs',
          currentUser.uid,
          enrollResult.registrationId
        );
        screenshotUrl = uploadRes.url;
      }

      await submitPaymentProof({
        utr: sanitizeText(utr).trim(),
        screenshotUrl,
        screenshotFile: screenshotUrl ? null : paymentFile,
        registrationId: enrollResult.registrationId,
        name: sanitizeText(form.name).trim(),
        email: currentUser.email,
        phone: sanitizeText(form.mobile).trim(),
        rollNo: sanitizeText(form.studentId).trim(),
        university: category === 'INTERNAL' ? 'KL University' : sanitizeText(form.college).trim(),
        branch: sanitizeText(form.branch).trim(),
        amount: AMOUNT,
        tier: 'SAMYAK 2026 Registration',
        category,
      });

      setResult({ registrationId: enrollResult.registrationId, category });
      setStep(STEPS.SUCCESS);
    } catch (err) {
      if (err.message === 'ALREADY_ENROLLED') {
        setError("You're already enrolled in SAMYAK 2026. Please check your profile.");
      } else {
        setError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ─── UI HELPERS ───────────────────────────────────────────────────────────

  const progressPct = Math.round((step / 4) * 100);

  const upiUri = buildUpiPaymentUri({ pa: UPI_ID, pn: MERCHANT_NAME, am: AMOUNT });

  // ─── RENDER ───────────────────────────────────────────────────────────────

  if (!currentUser) {
    return (
      <div className="w-full max-w-md mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neutral-950 border border-neutral-800 rounded-3xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-red-950/50 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white font-heading mb-2">Sign In to Enroll</h2>
          <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
            Sign in to register for SAMYAK 2026. KL University students can use their Microsoft account.
          </p>

          <div className="space-y-3">
            {/* Microsoft for KLU internal students */}
            <button
              onClick={handleMicrosoftLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-[#0078d4] hover:bg-[#006bbf] text-white font-bold text-sm transition-all disabled:opacity-50 shadow-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                  <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                </svg>
              )}
              <span>KL University Students — Sign in with Microsoft</span>
            </button>

            <div className="flex items-center gap-3 text-neutral-600">
              <div className="flex-1 h-px bg-neutral-800" />
              <span className="text-xs font-mono">OR</span>
              <div className="flex-1 h-px bg-neutral-800" />
            </div>

            {/* Google for external / others */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm transition-all disabled:opacity-50 shadow-lg"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-neutral-700" /> : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          <p className="text-neutral-600 text-xs mt-6">
            External participants from other colleges use Google sign-in
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4">

      {/* Progress Bar */}
      {step < STEPS.SUCCESS && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {['Category', 'Details', 'Payment', 'Confirm'].map((label, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step > i ? 'bg-red-600 text-white' :
                  step === i ? 'bg-red-600/30 border-2 border-red-500 text-red-400' :
                  'bg-neutral-900 border border-neutral-700 text-neutral-600'
                }`}>
                  {step > i ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[10px] font-mono mt-1 ${step >= i ? 'text-red-400' : 'text-neutral-600'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-neutral-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-red-600 to-rose-500"
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
        </div>
      )}

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-start gap-3 p-4 bg-red-950/60 border border-red-500/50 rounded-2xl text-red-300 text-sm"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={clearError} className="ml-auto"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">

        {/* ── STEP 0: CATEGORY ──────────────────────────── */}
        {step === STEPS.CATEGORY && (
          <motion.div key="step-category"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            className="space-y-4"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white font-heading">Where do you study?</h2>
              <p className="text-neutral-400 text-sm mt-1">Choose your institution to get started</p>
            </div>

            <button
              onClick={() => handleSelectCategory('INTERNAL')}
              className="w-full group p-6 rounded-3xl border-2 border-neutral-800 hover:border-red-500/70 bg-neutral-950 hover:bg-red-950/20 transition-all text-left flex items-center gap-5"
            >
              <div className="w-16 h-16 rounded-2xl bg-blue-950/50 border border-blue-500/30 flex items-center justify-center text-3xl flex-shrink-0 group-hover:border-blue-400/60 transition-colors">
                🏫
              </div>
              <div className="flex-1">
                <div className="font-black text-white text-xl font-heading">KL University</div>
                <div className="text-blue-400 font-mono text-xs uppercase tracking-wider mt-0.5">INTERNAL PARTICIPANT</div>
                <div className="text-neutral-400 text-sm mt-1">I am a student of KL University</div>
              </div>
              <ArrowRight className="w-5 h-5 text-neutral-600 group-hover:text-red-400 transition-colors" />
            </button>

            <button
              onClick={() => handleSelectCategory('EXTERNAL')}
              className="w-full group p-6 rounded-3xl border-2 border-neutral-800 hover:border-red-500/70 bg-neutral-950 hover:bg-red-950/20 transition-all text-left flex items-center gap-5"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-950/50 border border-purple-500/30 flex items-center justify-center text-3xl flex-shrink-0 group-hover:border-purple-400/60 transition-colors">
                🎓
              </div>
              <div className="flex-1">
                <div className="font-black text-white text-xl font-heading">Another College</div>
                <div className="text-purple-400 font-mono text-xs uppercase tracking-wider mt-0.5">EXTERNAL PARTICIPANT</div>
                <div className="text-neutral-400 text-sm mt-1">I am from a different college or university</div>
              </div>
              <ArrowRight className="w-5 h-5 text-neutral-600 group-hover:text-red-400 transition-colors" />
            </button>

            <p className="text-center text-neutral-600 text-xs mt-2">
              This helps us manage your entry and gate pass correctly.
            </p>

            {/* Signed in as */}
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-neutral-900/50 border border-neutral-800 mt-4">
              <User className="w-4 h-4 text-neutral-500 flex-shrink-0" />
              <span className="text-neutral-400 text-xs">Signed in as</span>
              <span className="text-white text-xs font-mono">{currentUser.email}</span>
            </div>
          </motion.div>
        )}

        {/* ── STEP 1: DETAILS ───────────────────────────── */}
        {step === STEPS.DETAILS && (
          <motion.div key="step-details"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
          >
            <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase ${
                  category === 'INTERNAL'
                    ? 'bg-blue-950/50 border border-blue-500/40 text-blue-400'
                    : 'bg-purple-950/50 border border-purple-500/40 text-purple-400'
                }`}>
                  {category === 'INTERNAL' ? '🏫 KL University — Internal' : '🎓 External Participant'}
                </div>
              </div>

              <h3 className="text-xl font-black text-white font-heading mb-4">Your Details</h3>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/60 text-sm"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Student ID */}
                <div>
                  <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">Student ID / Roll Number *</label>
                  <input
                    type="text"
                    value={form.studentId}
                    onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/60 text-sm"
                    placeholder={category === 'INTERNAL' ? 'e.g. 2200030001' : 'Your student ID'}
                  />
                </div>

                {/* Mobile */}
                <div>
                  <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">Mobile Number *</label>
                  <input
                    type="tel"
                    value={form.mobile}
                    onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/60 text-sm"
                    placeholder="10-digit mobile number"
                    maxLength={15}
                  />
                </div>

                {/* College — only for EXTERNAL */}
                {category === 'EXTERNAL' && (
                  <div>
                    <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">College / University *</label>
                    <input
                      type="text"
                      value={form.college}
                      onChange={e => setForm(f => ({ ...f, college: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/60 text-sm"
                      placeholder="Your college or university name"
                    />
                  </div>
                )}

                {/* Branch */}
                <div>
                  <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">Branch / Course</label>
                  <input
                    type="text"
                    value={form.branch}
                    onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/60 text-sm"
                    placeholder="e.g. B.Tech CSE, MBA, etc."
                  />
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-1.5">Email (from your account)</label>
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl bg-neutral-900/50 border border-neutral-800 text-neutral-500 text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setStep(STEPS.CATEGORY); clearError(); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white text-sm font-mono transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleDetailsNext}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              >
                Continue to Payment <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 2: PAYMENT ──────────────────────────── */}
        {step === STEPS.PAYMENT && (
          <motion.div key="step-payment"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
          >
            <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6">
              <h3 className="text-xl font-black text-white font-heading mb-1">Payment</h3>
              <p className="text-neutral-400 text-sm mb-5">Registration Amount: <span className="text-white font-bold">₹{AMOUNT}</span></p>

              {/* Steps */}
              <div className="space-y-4 mb-6">
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-950/50 border border-red-500/40 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <div className="text-white text-sm font-semibold">Scan the QR code with your UPI app</div>
                    <div className="text-neutral-500 text-xs mt-0.5">Use Google Pay, PhonePe, Paytm, or BHIM</div>
                    {/* QR code placeholder — PaymentQrCode uses the upiUri */}
                    <div className="mt-3 p-4 bg-white rounded-2xl inline-block">
                      {upiUri ? (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}&margin=0`}
                          alt="UPI Payment QR"
                          className="w-44 h-44"
                        />
                      ) : (
                        <div className="w-44 h-44 flex items-center justify-center bg-neutral-100 rounded-xl text-neutral-400">
                          <QrCode className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <div className="mt-2 text-xs font-mono text-neutral-400">
                      UPI ID: <span className="text-white">{UPI_ID}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-950/50 border border-red-500/40 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0 mt-0.5">2</div>
                  <div className="w-full">
                    <div className="text-white text-sm font-semibold mb-2">Enter your UTR / Transaction ID</div>
                    <input
                      type="text"
                      value={utr}
                      onChange={e => setUtr(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-red-500/60 text-sm font-mono"
                      placeholder="12-digit UPI UTR / Transaction ID"
                      maxLength={32}
                    />
                    <p className="text-neutral-600 text-xs mt-1">Found in your UPI app → Transaction History</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-red-950/50 border border-red-500/40 flex items-center justify-center text-xs font-bold text-red-400 flex-shrink-0 mt-0.5">3</div>
                  <div className="w-full">
                    <div className="text-white text-sm font-semibold mb-2">Upload payment screenshot</div>
                    {paymentPreview ? (
                      <div className="relative inline-block">
                        <img src={paymentPreview} alt="Payment" className="w-32 h-32 object-cover rounded-xl border border-neutral-700" />
                        <button
                          onClick={removePaymentFile}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => paymentInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-neutral-700 hover:border-red-500/50 bg-neutral-900/50 hover:bg-red-950/20 text-neutral-400 hover:text-white text-sm transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Upload Screenshot (JPG, PNG, PDF — max 10MB)
                      </button>
                    )}
                    <input
                      ref={paymentInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={handlePaymentFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setStep(STEPS.DETAILS); clearError(); }}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white text-sm font-mono transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handlePaymentNext}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              >
                Review & Confirm <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: CONFIRM ──────────────────────────── */}
        {step === STEPS.CONFIRM && (
          <motion.div key="step-confirm"
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
          >
            <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6">
              <h3 className="text-xl font-black text-white font-heading mb-4">Check Your Details</h3>

              <div className="space-y-2 mb-5">
                {[
                  ['Name', sanitizeText(form.name).trim()],
                  ['Student ID', sanitizeText(form.studentId).trim()],
                  ['Mobile', sanitizeText(form.mobile).trim()],
                  ['College', category === 'INTERNAL' ? 'KL University' : sanitizeText(form.college).trim()],
                  ['Branch', sanitizeText(form.branch).trim() || '—'],
                  ['Email', currentUser?.email],
                  ['Category', category],
                  ['UTR / Transaction ID', sanitizeText(utr).trim()],
                  ['Payment Amount', `₹${AMOUNT}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-start justify-between py-2 border-b border-neutral-900">
                    <span className="text-neutral-500 text-xs font-mono uppercase tracking-wider">{label}</span>
                    <span className={`text-sm font-semibold text-right max-w-[55%] break-words ${
                      label === 'Category'
                        ? category === 'INTERNAL' ? 'text-blue-400' : 'text-purple-400'
                        : 'text-white'
                    }`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Payment screenshot preview */}
              {paymentPreview && (
                <div className="mb-4">
                  <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mb-2">Payment Screenshot</p>
                  <img src={paymentPreview} alt="Payment" className="w-24 h-24 object-cover rounded-xl border border-neutral-700" />
                </div>
              )}

              {/* Info about what happens next */}
              <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
                {category === 'EXTERNAL' ? (
                  <p>Your payment will be verified by our team. Once approved, your <strong className="text-white">Gate Pass QR</strong> will be generated and available in your profile.</p>
                ) : (
                  <p>Your payment will be verified by our team. As a KL University student, <strong className="text-white">no gate pass is required</strong> — attendance will be marked at the event.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={() => { setStep(STEPS.PAYMENT); clearError(); }}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-neutral-900 border border-neutral-700 text-neutral-300 hover:text-white text-sm font-mono transition-all disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)] disabled:opacity-50"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                ) : (
                  <><Check className="w-4 h-4" /> Confirm &amp; Submit</>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── STEP 4: SUCCESS ───────────────────────────── */}
        {step === STEPS.SUCCESS && (
          <motion.div key="step-success"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="bg-neutral-950 border border-emerald-500/30 rounded-3xl p-8">
              <div className="w-20 h-20 rounded-full bg-emerald-950/60 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>

              <h2 className="text-2xl font-black text-white font-heading mb-2">Registration Submitted!</h2>
              <p className="text-neutral-400 text-sm mb-1">You're successfully enrolled for</p>
              <p className="text-red-400 font-bold text-lg mb-5">SAMYAK 2026</p>

              <div className="space-y-2 mb-6 text-sm">
                <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 rounded-xl">
                  <span className="text-neutral-500 font-mono text-xs">Registration ID</span>
                  <span className="text-white font-mono font-bold text-xs">{result?.registrationId}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-900 rounded-xl">
                  <span className="text-neutral-500 font-mono text-xs">Payment Status</span>
                  <span className="text-amber-400 font-mono font-bold text-xs">UNDER VERIFICATION</span>
                </div>
                {result?.category === 'EXTERNAL' ? (
                  <div className="flex items-start gap-3 px-4 py-3 bg-purple-950/30 border border-purple-500/30 rounded-xl text-left">
                    <ShieldCheck className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white font-semibold text-xs">Gate Pass</div>
                      <div className="text-purple-300 text-xs mt-0.5">Will be generated after payment verification</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-3 bg-blue-950/30 border border-blue-500/30 rounded-xl text-left">
                    <CheckCircle2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="text-white font-semibold text-xs">Gate Pass</div>
                      <div className="text-blue-300 text-xs mt-0.5">Not required — KL University student</div>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold text-sm hover:opacity-90 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              >
                View My Registration <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
