import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Sparkles, CheckCircle2, AlertCircle, Copy, Check, 
  Download, QrCode, Calendar, Clock, MapPin, User, Mail, 
  Phone, Hash, School, Award, ArrowRight, Loader2, Info
} from 'lucide-react';
import { useUser } from '../../data/useUser';
import { registerStudentForEvent, checkStudentAlreadyRegistered } from '../../services/eventRegistrationService';

const BRANCH_OPTIONS = [
  'Computer Science & Engineering (CSE)',
  'Artificial Intelligence & Data Science (AIDS)',
  'Electronics & Communication Engineering (ECE)',
  'Mechanical Engineering (MECH)',
  'Civil Engineering (CIVIL)',
  'Bio-Technology (BIOTECH)',
  'School of Business Management (MBA)',
  'Computer Applications & Software (BCA)',
  'Other / External University'
];

const YEAR_OPTIONS = [
  '1st Year (B.Tech / Degree)',
  '2nd Year (B.Tech / Degree)',
  '3rd Year (B.Tech / Degree)',
  '4th Year (B.Tech / Degree)',
  'Postgraduate (M.Tech / MBA / MCA / PhD)'
];

export default function EventRegistrationModal({ event, isOpen, onClose, onRegistered, existingTicket }) {
  const { userData } = useUser();

  // Pre-fill state detection
  const hasProfileData = Boolean(
    userData?.name || userData?.email || userData?.rollNo || userData?.phone
  );

  const [formData, setFormData] = useState({
    studentName: '',
    email: '',
    universityId: '',
    phone: '',
    branch: BRANCH_OPTIONS[0],
    year: YEAR_OPTIONS[2], // default 3rd year
    section: '',
    gender: 'Prefer not to say',
  });

  const [prefilledNotice, setPrefilledNotice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmedTicket, setConfirmedTicket] = useState(existingTicket || null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Sync profile details when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage('');
      if (existingTicket) {
        setConfirmedTicket(existingTicket);
      } else {
        setConfirmedTicket(null);
        if (hasProfileData) {
          setFormData((prev) => ({
            ...prev,
            studentName: userData.name || '',
            email: userData.email || '',
            universityId: userData.rollNo || '',
            phone: userData.phone || '',
            branch: userData.branch || BRANCH_OPTIONS[0],
            year: userData.year || YEAR_OPTIONS[2],
          }));
          setPrefilledNotice(true);
        }
      }
    }
  }, [isOpen, hasProfileData, userData, existingTicket]);

  if (!isOpen || !event) return null;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const copyTicketCode = () => {
    if (!confirmedTicket?.ticket_code) return;
    navigator.clipboard.writeText(confirmedTicket.ticket_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Field Validations
    if (!formData.studentName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!formData.universityId.trim()) {
      setErrorMessage('Please enter your College / University ID (Roll No).');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile phone number.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await registerStudentForEvent({
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.date || 'TBA',
        eventTime: event.time || 'TBA',
        eventVenue: event.venue || 'Main Arena',
        studentName: formData.studentName,
        email: formData.email,
        universityId: formData.universityId,
        phone: formData.phone,
        branch: formData.branch,
        year: formData.year,
        section: formData.section,
        gender: formData.gender,
      });

      setConfirmedTicket(res.registration);
      if (onRegistered) {
        onRegistered(res.registration);
      }
    } catch (err) {
      console.error('Event registration error:', err);
      if (err.code === 'ALREADY_REGISTERED' && err.existingRegistration) {
        setConfirmedTicket(err.existingRegistration);
      } else {
        setErrorMessage(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-neutral-950 border border-red-500/50 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative overflow-hidden shadow-[0_0_60px_rgba(239,68,68,0.35)] my-8"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-neutral-900 hover:bg-red-600/30 text-neutral-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <AnimatePresence mode="wait">
          {!confirmedTicket ? (
            /* Registration Form View */
            <motion.div
              key="reg-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Header */}
              <div className="pr-8">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-[10px] font-mono text-red-400 uppercase tracking-widest mb-2 font-bold">
                  <Sparkles className="w-3 h-3 text-red-400" />
                  Official Event Enrollment
                </div>
                <h3 className="text-xl sm:text-2xl font-black font-heading text-white">
                  ENROLL IN <span className="text-red-500">{event.title}</span>
                </h3>
                <p className="text-xs text-neutral-400 font-cyber mt-1">
                  Venue: <strong className="text-white">{event.venue}</strong> • Date: <strong className="text-white">{event.date}</strong>
                </p>
              </div>

              {/* Profile Auto-Fill Alert */}
              {prefilledNotice && (
                <div className="p-3 rounded-2xl bg-blue-950/50 border border-blue-500/40 text-blue-200 text-xs font-mono flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>Your details have been pre-filled from your profile. Please review before submitting.</span>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/60 text-red-200 text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                
                {/* Full Name & University ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1">
                      <User className="w-3 h-3 text-red-400" />
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="studentName"
                      required
                      placeholder="e.g. Ananya Rao"
                      value={formData.studentName}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1">
                      <Hash className="w-3 h-3 text-red-400" />
                      University / College ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="universityId"
                      required
                      placeholder="e.g. 2300030198"
                      value={formData.universityId}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Email & Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-red-400" />
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="student@university.in"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-red-400" />
                      Mobile Phone (10 digits) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="+91 98480 12345"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs sm:text-sm text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Branch & Academic Year */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1">
                      <School className="w-3 h-3 text-red-400" />
                      Branch / Department <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="branch"
                      value={formData.branch}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    >
                      {BRANCH_OPTIONS.map((b) => (
                        <option key={b} value={b} className="bg-neutral-900 text-white">
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 flex items-center gap-1">
                      <Award className="w-3 h-3 text-red-400" />
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2.5 rounded-xl bg-black border border-neutral-700 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    >
                      {YEAR_OPTIONS.map((y) => (
                        <option key={y} value={y} className="bg-neutral-900 text-white">
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Section & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                      Section / Group (Optional)
                    </label>
                    <input
                      type="text"
                      name="section"
                      placeholder="e.g. S-14 / CSE-B"
                      value={formData.section}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-2 rounded-xl bg-black border border-neutral-800 text-xs text-white focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                      Gender (Optional)
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 rounded-xl bg-black border border-neutral-800 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="Prefer not to say">Prefer not to say</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:brightness-110 text-white font-heading font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(239,68,68,0.5)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>Reserving Slot &amp; Issuing Pass...</span>
                      </>
                    ) : (
                      <>
                        <span>Confirm Enrollment &amp; Get Pass</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-neutral-500 font-mono mt-2">
                    🔒 Seats are reserved atomically. One entry per student ID &amp; email.
                  </p>
                </div>
              </form>
            </motion.div>
          ) : (
            /* Digital Ticket Confirmation Pass View */
            <motion.div
              key="ticket-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6 text-center"
            >
              {/* Header Badge */}
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/40">
                  Confirmed Entry Pass
                </span>
                <h3 className="text-2xl font-black font-heading text-white mt-2">
                  YOU&apos;RE REGISTERED!
                </h3>
                <p className="text-xs text-neutral-400 font-cyber mt-1">
                  Present this digital pass at the arena gate during check-in.
                </p>
              </div>

              {/* Digital Pass Card */}
              <div className="p-5 rounded-3xl bg-black border-2 border-red-500/60 shadow-[0_0_40px_rgba(239,68,68,0.3)] text-left relative overflow-hidden space-y-4">
                {/* Watermark logo */}
                <img 
                  src="/samyak-logo-white.png" 
                  alt="SAMYAK" 
                  className="absolute right-2 -bottom-4 w-32 h-auto opacity-10 pointer-events-none" 
                />

                {/* Event Name & Pass Code */}
                <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
                  <div>
                    <span className="text-[9px] font-mono uppercase text-red-400 font-bold tracking-wider">Event Pass</span>
                    <h4 className="font-heading font-black text-lg text-white leading-tight">
                      {confirmedTicket.event_title || event.title}
                    </h4>
                  </div>
                  
                  {/* Ticket Code Box */}
                  <div className="text-right">
                    <span className="text-[9px] font-mono uppercase text-neutral-500 block">Pass Code</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <code className="text-sm font-mono font-black text-red-400 bg-red-950/60 px-2 py-0.5 rounded-lg border border-red-500/50 tracking-widest">
                        {confirmedTicket.ticket_code}
                      </code>
                      <button
                        type="button"
                        onClick={copyTicketCode}
                        className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy Ticket Code"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Attendee Info & QR */}
                <div className="grid grid-cols-3 gap-3 items-center">
                  <div className="col-span-2 space-y-1.5 text-xs font-mono">
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase block">Attendee Name</span>
                      <strong className="text-white text-sm">{confirmedTicket.student_name}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase block">College ID / Roll</span>
                      <span className="text-neutral-200">{confirmedTicket.university_id}</span>
                    </div>
                    <div>
                      <span className="text-neutral-500 text-[10px] uppercase block">Department &amp; Year</span>
                      <span className="text-neutral-300 text-[11px] block truncate">{confirmedTicket.branch} ({confirmedTicket.year})</span>
                    </div>
                  </div>

                  {/* Dynamic QR Code */}
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=SAMYAK_ENTRY_${confirmedTicket.ticket_code}_${confirmedTicket.university_id}`}
                      alt="Ticket Check-in QR"
                      className="w-18 h-18 object-contain"
                    />
                    <span className="text-[8px] font-mono font-bold text-black mt-1 uppercase">Gate Scan</span>
                  </div>
                </div>

                {/* Date & Venue Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 text-[11px] font-mono text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-red-400" />
                    <span>{confirmedTicket.event_date || event.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span className="truncate max-w-[130px]" title={confirmedTicket.event_venue || event.venue}>
                      {confirmedTicket.event_venue || event.venue}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-1/2 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-red-400" />
                  <span>Print / Download</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-heading font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
