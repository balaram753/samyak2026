import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, CheckCircle2, 
  Download, ArrowRight, RefreshCw, Clock,
  Upload, Image as ImageIcon, AlertCircle, Phone, Mail, User, Hash, School
} from 'lucide-react';
import { useUser } from '../../data/useUser';
import { uploadSecureUserFile } from '../../services/storageService';
import GatePassCard from './GatePassCard';
import PaymentQrCode from './PaymentQrCode';
import { listenToRegistrationPass } from '../../services/gatePassService';
import { sanitizeText, checkRateLimit } from '../../services/fileSecurityService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { PAYMENT_CONFIG } from '../../config/paymentConfig';

const PASS_TIERS = PAYMENT_CONFIG.PASS_TIERS;

export default function PaymentPortal() {
  const { userData, currentUser, loginWithGoogle, updatePayment } = useUser();
  const selectedTier = PASS_TIERS[0];

  // Form Fields as explicitly requested:
  // name, clg id pic, id no, mobile no, mail, UTR id, payment screenshot
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    rollNo: userData?.rollNo || '',
    phone: userData?.phone || '',
    email: userData?.email || '',
    university: userData?.university || 'KL University',
    utrId: '',
  });

  // Images state
  const [clgIdFile, setClgIdFile] = useState(null);
  const [clgIdPreview, setClgIdPreview] = useState(userData?.collegeIdCardUrl || null);
  
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentPreview, setPaymentPreview] = useState(null);

  // Status and UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [submissionResult, setSubmissionResult] = useState(null);
  const [livePassData, setLivePassData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Real-time listener for user gate pass status
  const effectiveTrackingId = submissionResult?.registrationId || userData?.registrationId || userData?.rollNo;
  const currentUid = currentUser?.uid;
  useEffect(() => {
    if (!effectiveTrackingId || !currentUid) return;
    const unsub = listenToRegistrationPass(effectiveTrackingId, currentUid, (data) => {
      if (data) {
        setLivePassData(data);
      }
    }, (err) => console.warn('Pass listener note:', err));
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [effectiveTrackingId, currentUid]);

  const clgInputRef = useRef(null);
  const paymentInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClgIdChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setClgIdFile(file);
      const url = URL.createObjectURL(file);
      setClgIdPreview(url);
    }
  };

  const handlePaymentScreenshotChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentFile(file);
      const url = URL.createObjectURL(file);
      setPaymentPreview(url);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // 0. Mandatory Authentication Check
    if (!currentUser) {
      setErrorMessage('Authentication required: Please sign in with Google to securely register your pass.');
      try {
        await loginWithGoogle();
      } catch (authErr) {
        setErrorMessage('Authentication required: ' + (authErr.message || 'Please sign in with Google.'));
        return;
      }
    }

    // Rate Limiting Check
    try {
      checkRateLimit(`pay_${currentUser?.uid || 'guest'}`, 3, 60000);
    } catch (rlErr) {
      setErrorMessage(rlErr.message);
      return;
    }

    // Sanitize user inputs
    const sanitizedName = sanitizeText(formData.name);
    const sanitizedRollNo = sanitizeText(formData.rollNo);
    const sanitizedPhone = sanitizeText(formData.phone).replace(/[^0-9+]/g, '');
    const sanitizedEmail = sanitizeText(formData.email);
    const sanitizedUniversity = sanitizeText(formData.university) || 'KL University';
    const cleanUtr = sanitizeText(formData.utrId).toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Validation
    if (!sanitizedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!sanitizedRollNo) {
      setErrorMessage('Please enter your College ID / Roll Number.');
      return;
    }
    if (!sanitizedPhone || sanitizedPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!sanitizedEmail || !sanitizedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!cleanUtr || cleanUtr.length < 10 || cleanUtr.length > 16) {
      setErrorMessage('Please enter a valid 10 to 16 alphanumeric UPI Transaction / UTR ID.');
      return;
    }
    if (!clgIdFile && !clgIdPreview) {
      setErrorMessage('Please upload a clear photo of your College ID Card.');
      return;
    }
    if (!paymentFile && !paymentPreview) {
      setErrorMessage('Please upload your UPI payment confirmation screenshot.');
      return;
    }

    // Authoritative Server Pricing Lock
    const verifiedPrice = selectedTier?.price || 499;

    try {
      setIsSubmitting(true);
      setUploadStatus('Checking payment records...');

      // Duplicate UTR Prevention (graceful)
      try {
        const utrQuery = query(collection(db, 'payments'), where('utrId', '==', cleanUtr));
        const utrSnap = await getDocs(utrQuery);
        if (!utrSnap.empty) {
          throw new Error('This UPI UTR ID has already been recorded in the database. Duplicate submissions are strictly prohibited.');
        }
      } catch (dupErr) {
        if (dupErr.message && dupErr.message.includes('strictly prohibited')) {
          throw dupErr;
        }
        console.warn('UTR uniqueness check notice:', dupErr.message);
      }

      setUploadStatus('Uploading documents & credentials...');

      let finalClgIdUrl = clgIdPreview;
      if (clgIdFile) {
        setUploadStatus('Uploading College ID photo...');
        const clgRes = await uploadSecureUserFile(clgIdFile, 'id_cards', currentUser.uid);
        finalClgIdUrl = clgRes.url;
      }

      let finalPaymentScreenshotUrl = paymentPreview;
      if (paymentFile) {
        setUploadStatus('Uploading payment confirmation screenshot...');
        const payRes = await uploadSecureUserFile(paymentFile, 'payment_proofs', currentUser.uid, effectiveTrackingId || 'samyak-2026');
        finalPaymentScreenshotUrl = payRes.url;
      }

      setUploadStatus('Recording registration & payment in live database...');

      const result = await updatePayment({
        tier: selectedTier.name,
        amount: verifiedPrice,
        utrId: cleanUtr,
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        rollNo: sanitizedRollNo,
        university: sanitizedUniversity,
        clgIdPicUrl: finalClgIdUrl,
        paymentScreenshotUrl: finalPaymentScreenshotUrl,
      });

      setSubmissionResult({
        name: sanitizedName,
        rollNo: sanitizedRollNo,
        phone: sanitizedPhone,
        email: sanitizedEmail,
        university: sanitizedUniversity,
        tier: selectedTier.name,
        amount: verifiedPrice,
        registrationId: result?.registrationId || `SAMYAK-${Math.floor(100000 + Math.random() * 900000)}`,
        utrId: cleanUtr,
        clgIdPicUrl: finalClgIdUrl,
        paymentScreenshotUrl: finalPaymentScreenshotUrl,
        date: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
      });

    } catch (err) {
      console.error('Payment submission failed:', err);
      setErrorMessage('Failed to submit registration: ' + (err.message || 'Please try again.'));
    } finally {
      setIsSubmitting(false);
      setUploadStatus('');
    }
  };

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <AnimatePresence mode="wait">
        {!submissionResult ? (
          <motion.div
            key="checkout-form"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left 5 Cols: Pass Tier Selection & Official UPI QR Code */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Pass Tier Card */}
              <div className="cyber-card p-6 rounded-3xl border-2 border-red-500/50 bg-neutral-950/80 shadow-[0_0_30px_rgba(239,68,68,0.2)] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-600/30 text-red-400 border border-red-500/50 flex items-center justify-center text-xs font-bold font-mono">
                      1
                    </span>
                    <h2 className="text-base font-bold font-heading text-white uppercase tracking-wider">
                      Event Fee &amp; Pass
                    </h2>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {selectedTier.badge}
                  </span>
                </div>

                <div className="p-5 rounded-2xl border border-red-500/40 bg-red-950/20 space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-red-500/20">
                    <div>
                      <div className="font-heading font-black text-white text-lg tracking-wide">
                        {selectedTier.name}
                      </div>
                      <span className="text-[11px] font-cyber text-neutral-400">
                        Unified delegate pass for all SAMYAK 2026 events
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="font-heading font-black text-2xl text-white">
                        ₹{selectedTier.price}
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400">Single Payment</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-xs text-neutral-300 font-cyber">
                    {selectedTier.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-red-400 font-bold mt-0.5">✓</span>
                        <span className="leading-relaxed">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Official UPI Payment Box */}
              <div className="cyber-card p-6 rounded-3xl border border-red-500/30 space-y-5 bg-gradient-to-b from-red-950/20 to-black">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-600/30 text-red-400 border border-red-500/50 flex items-center justify-center text-xs font-bold font-mono">
                      2
                    </span>
                    <h3 className="text-base font-bold font-heading text-white uppercase tracking-wider">
                      Scan &amp; Pay via UPI
                    </h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold">
                    Official Fest UPI
                  </span>
                </div>

                {/* Standards-Compliant UPI Payment QR Code */}
                <PaymentQrCode
                  amount={selectedTier.price}
                  tierName={selectedTier.name}
                  merchantUpiId={PAYMENT_CONFIG.MERCHANT_UPI_ID}
                  merchantName={PAYMENT_CONFIG.MERCHANT_NAME}
                  currency={PAYMENT_CONFIG.CURRENCY}
                  showDebug={true}
                />

                <div className="text-xs text-neutral-400 font-cyber space-y-1">
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-400 font-bold">1.</span>
                    <span>Scan QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) and pay exactly <strong className="text-white">₹{selectedTier.price}</strong>.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-400 font-bold">2.</span>
                    <span>Note down the 12-digit <strong className="text-white">UTR / UPI Ref Number</strong> from your payment receipt.</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <span className="text-red-400 font-bold">3.</span>
                    <span>Take a clear screenshot of the successful payment.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Registration Details & Verification Proof Form */}
            <div className="lg:col-span-7">
              <div className="cyber-card p-6 sm:p-8 rounded-3xl border border-neutral-800 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-red-600/30 text-red-400 border border-red-500/50 flex items-center justify-center text-xs font-bold font-mono">
                      3
                    </span>
                    <h2 className="text-lg font-bold font-heading text-white uppercase tracking-wider">
                      Student Details &amp; Payment Proof
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-neutral-400">
                    Pass: <span className="text-white font-bold">{selectedTier.name}</span> (₹{selectedTier.price})
                  </span>
                </div>

                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-mono flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Grid for Name & ID No */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-red-400" />
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm font-sans text-white focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    {/* ID No / Roll No */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5 text-red-400" />
                        College ID No / Roll No <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="rollNo"
                        required
                        placeholder="e.g. 2300030198 / URK22CS045"
                        value={formData.rollNo}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm font-sans text-white focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Grid for Mobile & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mobile No */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-red-400" />
                        Mobile No (WhatsApp) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        placeholder="+91 98480 12345"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm font-sans text-white focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>

                    {/* Mail */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-red-400" />
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        placeholder="student@university.in"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm font-sans text-white focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>

                  {/* University */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-red-400" />
                      College / University Name
                    </label>
                    <input
                      type="text"
                      name="university"
                      placeholder="KL University, Vaddeswaram"
                      value={formData.university}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm font-sans text-white focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  {/* UTR ID */}
                  <div className="space-y-1.5 p-4 rounded-2xl bg-neutral-900/60 border border-red-500/40">
                    <label className="text-xs font-mono uppercase tracking-wider text-red-300 font-bold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-red-400" />
                        UPI UTR ID / Transaction Reference Number <span className="text-red-500">*</span>
                      </span>
                      <span className="text-[10px] text-neutral-400 font-normal">Usually 12 digits</span>
                    </label>
                    <input
                      type="text"
                      name="utrId"
                      required
                      placeholder="e.g. 407221345678 or UPI-REF-XXXX"
                      value={formData.utrId}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-red-500/50 text-sm font-mono font-bold text-white tracking-widest focus:outline-none focus:border-red-400 transition-colors"
                    />
                    <p className="text-[11px] font-cyber text-neutral-400">
                      Located in Google Pay, PhonePe, or Paytm receipt details after successful transfer.
                    </p>
                  </div>

                  {/* Upload Section: College ID Pic & Payment Screenshot */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    
                    {/* College ID Pic */}
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center justify-between">
                        <span>College ID Pic <span className="text-red-500">*</span></span>
                        {clgIdPreview && <span className="text-[10px] text-emerald-400">Ready</span>}
                      </label>

                      <input 
                        type="file" 
                        ref={clgInputRef}
                        accept="image/*"
                        onChange={handleClgIdChange}
                        className="hidden" 
                      />

                      <div 
                        onClick={() => clgInputRef.current?.click()}
                        className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[140px] relative overflow-hidden ${
                          clgIdPreview 
                            ? 'border-emerald-500/50 bg-black' 
                            : 'border-neutral-700 bg-neutral-900/30 hover:border-red-500/50 hover:bg-neutral-900/50'
                        }`}
                      >
                        {clgIdPreview ? (
                          <div className="relative group w-full h-full flex flex-col items-center justify-center">
                            <img 
                              src={clgIdPreview} 
                              alt="College ID Preview" 
                              className="w-full h-24 object-contain rounded-lg"
                            />
                            <div className="mt-2 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Click to change ID photo</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-neutral-400 mb-2" />
                            <span className="text-xs font-mono text-slate-300 font-bold">
                              Upload College ID Card
                            </span>
                            <span className="text-[10px] font-cyber text-neutral-500 mt-1">
                              JPG, PNG, or WEBP (Max 5MB)
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Payment Screenshot */}
                    <div className="space-y-2">
                      <label className="text-xs font-mono uppercase tracking-wider text-neutral-300 flex items-center justify-between">
                        <span>Payment Screenshot <span className="text-red-500">*</span></span>
                        {paymentPreview && <span className="text-[10px] text-emerald-400">Ready</span>}
                      </label>

                      <input 
                        type="file" 
                        ref={paymentInputRef}
                        accept="image/*"
                        onChange={handlePaymentScreenshotChange}
                        className="hidden" 
                      />

                      <div 
                        onClick={() => paymentInputRef.current?.click()}
                        className={`p-4 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[140px] relative overflow-hidden ${
                          paymentPreview 
                            ? 'border-emerald-500/50 bg-black' 
                            : 'border-neutral-700 bg-neutral-900/30 hover:border-red-500/50 hover:bg-neutral-900/50'
                        }`}
                      >
                        {paymentPreview ? (
                          <div className="relative group w-full h-full flex flex-col items-center justify-center">
                            <img 
                              src={paymentPreview} 
                              alt="Payment Screenshot Preview" 
                              className="w-full h-24 object-contain rounded-lg"
                            />
                            <div className="mt-2 text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Click to change screenshot</span>
                            </div>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-6 h-6 text-neutral-400 mb-2" />
                            <span className="text-xs font-mono text-slate-300 font-bold">
                              Upload Payment Screenshot
                            </span>
                            <span className="text-[10px] font-cyber text-neutral-500 mt-1">
                              Proof showing UTR &amp; amount
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submission Status Message */}
                  {uploadStatus && (
                    <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono text-red-400 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                      <span>{uploadStatus}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 transition-all hover:scale-101 active:scale-99 disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying &amp; Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>PAY EVENT FEE &amp; PASS (₹{selectedTier.price})</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center text-[11px] font-mono text-neutral-400">
                    🛡️ Central Fest Committee verifies UTR against bank records within 2–4 hours.
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        ) : (livePassData && (livePassData.paymentStatus === 'VERIFIED' || livePassData.status === 'verified') && (livePassData.gatePassStatus === 'ISSUED' || livePassData.gatePassToken)) ? (
          /* Live Verified Gate Pass with Unique Secure QR Code */
          <motion.div
            key="verified-gate-pass"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <GatePassCard passData={livePassData} />
          </motion.div>
        ) : (
          /* Payment Received - Waiting Verification (STRICTLY NO QR CODE) */
          <motion.div
            key="pending-verification-card"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-2xl mx-auto cyber-card p-6 sm:p-10 rounded-3xl border border-amber-500/40 relative overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)]"
          >
            {/* Header Section */}
            <div className="text-center space-y-4 pb-6 border-b border-neutral-800">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 text-amber-400 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(245,158,11,0.4)]">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <h2 className="text-2xl sm:text-4xl font-black font-heading text-white tracking-wider">
                PAYMENT <span className="text-amber-400">RECEIVED</span>
              </h2>

              <p className="text-sm font-cyber text-neutral-200">
                Thank you for registering for <strong className="text-white">SAMYAK 2026</strong>.
              </p>

              {/* Status Pill */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-mono uppercase tracking-wider font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>● PAYMENT VERIFICATION PENDING</span>
              </div>

              {/* Fraud Prevention & Authenticity Notice */}
              <div className="p-4 rounded-2xl bg-neutral-950/80 border border-amber-500/30 text-xs font-mono text-neutral-300 space-y-2 text-center max-w-lg mx-auto">
                <p className="text-amber-300 font-bold">
                  Your payment has been submitted for verification.
                </p>
                <p className="text-neutral-400">
                  Our team is verifying your payment for authenticity and fraud prevention. Please wait.
                </p>
                <div className="pt-2 text-cyan-400 font-semibold border-t border-neutral-800/80 flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Your Gate Pass QR will be generated after payment verification.</span>
                </div>
              </div>
            </div>

            {/* Receipt Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-6 text-xs font-mono p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800">
              <div>
                <span className="text-neutral-500 block uppercase text-[10px]">Registration Code</span>
                <span className="font-bold text-red-400 text-sm">
                  {submissionResult?.registrationId || livePassData?.registrationNumber || 'PENDING'}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block uppercase text-[10px]">Selected Pass</span>
                <span className="font-bold text-white">
                  {submissionResult?.tier || livePassData?.ticketType || selectedTier.name}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block uppercase text-[10px]">Amount Paid</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ₹{submissionResult?.amount || livePassData?.amount || selectedTier.price}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 block uppercase text-[10px]">Attendee Name</span>
                <span className="font-bold text-white">
                  {submissionResult?.name || livePassData?.name || formData.name}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-neutral-500 block uppercase text-[10px]">Submitted UTR ID</span>
                <span className="font-bold text-white font-mono tracking-wider">
                  {submissionResult?.utrId || livePassData?.utrId || formData.utrId}
                </span>
              </div>
            </div>

            {/* Uploaded Documents Thumbnails */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {(submissionResult?.clgIdPicUrl || livePassData?.clgIdPicUrl) && (
                <div className="p-2.5 rounded-xl bg-black border border-neutral-800 text-center">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-1.5 uppercase">College ID Card</span>
                  <img 
                    src={submissionResult?.clgIdPicUrl || livePassData?.clgIdPicUrl} 
                    alt="ID Card" 
                    className="w-full h-24 object-contain rounded-lg bg-neutral-900" 
                  />
                </div>
              )}
              {(submissionResult?.paymentScreenshotUrl || livePassData?.paymentScreenshotUrl) && (
                <div className="p-2.5 rounded-xl bg-black border border-neutral-800 text-center">
                  <span className="text-[10px] font-mono text-neutral-400 block mb-1.5 uppercase">Payment Screenshot</span>
                  <img 
                    src={submissionResult?.paymentScreenshotUrl || livePassData?.paymentScreenshotUrl} 
                    alt="Payment Screenshot" 
                    className="w-full h-24 object-contain rounded-lg bg-neutral-900" 
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full sm:w-1/2 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download / Print Receipt</span>
              </button>

              <Link
                to="/events"
                className="w-full sm:w-1/2 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-heading text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              >
                <span>Explore Events</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
