import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Download, QrCode as QrIcon, Copy, Check, 
  Sparkles, Calendar, MapPin, Ticket, User, School, ExternalLink, Printer 
} from 'lucide-react';

export default function GatePassCard({ passData }) {
  const [copiedToken, setCopiedToken] = useState(false);
  const cardRef = useRef(null);

  if (!passData) return null;

  const {
    registrationNumber = 'SAMYAK-000000',
    name = 'Student Delegate',
    university = 'KL University',
    rollNo = '',
    ticketType = 'All-Access Fest Pass',
    gatePassToken = '',
    gatePassStatus = 'ISSUED',
    verificationUrl = passData?.verificationUrl || ((typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'))
      ? `${window.location.origin}/gate/verify/${gatePassToken}` 
      : `https://kl--samyak.web.app/gate/verify/${gatePassToken}`),
  } = passData;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(verificationUrl)}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(gatePassToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2200);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveQr = () => {
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `SAMYAK2026-QR-${registrationNumber}.png`;
    link.target = '_blank';
    link.click();
  };

  const formattedDate = gatePassIssuedAt?.seconds 
    ? new Date(gatePassIssuedAt.seconds * 1000).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Top Banner Notice */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/30 to-black border border-emerald-500/40 text-center shadow-[0_0_30px_rgba(16,185,129,0.2)]"
      >
        <div className="inline-flex items-center gap-2 text-emerald-400 font-heading font-black text-sm uppercase tracking-widest">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>Payment Verified Successfully</span>
        </div>
        <p className="text-xs text-neutral-300 font-mono mt-1">
          Your official SAMYAK 2026 Digital Gate Pass is ready. Please present this QR code at the campus entry gate.
        </p>
      </motion.div>

      {/* NEXORA THEMED OFFICIAL GATE PASS */}
      <div 
        ref={cardRef}
        id="samyak-digital-gate-pass"
        className="relative rounded-3xl overflow-hidden border-2 border-cyan-500/40 bg-[#050814] shadow-[0_0_60px_rgba(0,240,255,0.18)] print:border-black print:shadow-none print:bg-white print:text-black"
      >
        {/* Subtle Cybernetic HUD Lines & Corner Brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 pointer-events-none z-20" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500 pointer-events-none z-20" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 pointer-events-none z-20" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500 pointer-events-none z-20" />

        {/* Ambient Gradient Glows */}
        <div className="absolute -top-24 -left-24 w-60 h-60 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />

        {/* Header Ribbon */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-cyan-950/60 via-slate-950 to-red-950/60 border-b border-cyan-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-red-600 p-[1.5px] shadow-[0_0_15px_rgba(0,240,255,0.5)]">
              <div className="w-full h-full bg-[#050814] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black font-heading text-white tracking-wider flex items-center gap-2">
                SAMYAK <span className="text-red-500 font-cyber">2026</span>
              </h2>
              <p className="text-[10px] font-mono tracking-widest text-cyan-300/80 uppercase">
                A National Level Techno Management Fest
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              GATE PASS: ACTIVE
            </div>
          </div>
        </div>

        {/* Pass Content Body */}
        <div className="relative p-6 sm:p-8 space-y-6">
          
          {/* Top Attendee Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block mb-1">
                Attendee Name
              </span>
              <h3 className="text-2xl font-bold font-heading text-white tracking-wide">
                {name}
              </h3>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-cyber text-neutral-300">
                <span>{university}</span>
                {rollNo && <span className="text-neutral-500">• ID: {rollNo}</span>}
              </div>
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block mb-1">
                Registration Code
              </span>
              <span className="font-mono font-black text-lg text-cyan-400 tracking-wider">
                {registrationNumber}
              </span>
            </div>
          </div>

          {/* Centered Large High-Contrast QR Code Display */}
          <div className="flex flex-col items-center justify-center py-2 space-y-3">
            <div className="relative p-4 rounded-2xl bg-white shadow-[0_0_35px_rgba(0,240,255,0.35)] border-4 border-cyan-400/80">
              {/* Actual High Contrast Scannable QR Code */}
              <img 
                src={qrImageUrl} 
                alt={`Gate Pass QR for ${registrationNumber}`}
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain block mx-auto"
              />
              <div className="mt-2 text-center text-[9px] font-mono text-neutral-800 uppercase tracking-widest font-black">
                SAMYAK 2026 GATE ENTRY PASS
              </div>
            </div>

            <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
              <QrIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span>Show this high-contrast QR to security staff at entrance</span>
            </span>
          </div>

          {/* Pass Details Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-neutral-900/60 border border-cyan-900/40 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase text-neutral-500 block mb-0.5">Ticket Type</span>
              <span className="font-bold text-white flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5 text-red-400" />
                {ticketType}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-neutral-500 block mb-0.5">Event Date</span>
              <span className="font-bold text-white flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                March 27-29, 2026
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-neutral-500 block mb-0.5">Campus Venue</span>
              <span className="font-bold text-white flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                KL University
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-neutral-500 block mb-0.5">Gate Pass Status</span>
              <span className="font-bold text-emerald-400 uppercase">
                {gatePassStatus}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-neutral-500 block mb-0.5">Issued Date</span>
              <span className="text-neutral-300">
                {formattedDate}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase text-neutral-500 block mb-0.5">Token Reference</span>
              <span className="text-cyan-300/80 font-mono text-[11px] truncate block" title={gatePassToken}>
                {gatePassToken.substring(0, 14)}...
              </span>
            </div>
          </div>

          {/* Security Holographic Foil Bar */}
          <div className="relative py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-500/20 via-cyan-500/20 to-purple-500/20 border border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>CRYPTOGRAPHICALLY VERIFIED • FRAUD PROTECTED</span>
            </div>
            <button 
              type="button"
              onClick={handleCopyCode}
              className="hover:text-white flex items-center gap-1 transition-colors cursor-pointer text-cyan-300"
            >
              {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedToken ? 'Copied' : 'Copy Pass Token'}</span>
            </button>
          </div>

        </div>
      </div>

      {/* Pass Actions: Download / Print & Save QR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={handlePrint}
          className="py-3.5 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-black font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,240,255,0.4)] transition-all cursor-pointer hover:scale-101 active:scale-99"
        >
          <Printer className="w-4 h-4 text-black" />
          <span>Download / Print Gate Pass</span>
        </button>

        <button
          type="button"
          onClick={handleSaveQr}
          className="py-3.5 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-cyan-500/50"
        >
          <Download className="w-4 h-4 text-cyan-400" />
          <span>Save High-Res QR Image</span>
        </button>
      </div>
    </div>
  );
}
