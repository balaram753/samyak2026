import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, 
  ShieldAlert, 
  Server, 
  Clock, 
  Mail, 
  Sparkles, 
  Radio, 
  Lock,
  Wrench,
  CheckCircle2
} from 'lucide-react';

export default function MaintenancePage({ customReason, isTampered = false }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date().toLocaleTimeString());

  // Update time display
  useEffect(() => {
    const timer = setInterval(() => {
      setLastChecked(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="relative min-h-screen w-full bg-black text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-red-600 selection:text-white">
      {/* Ambient Cyber Grid & Glow Backdrop */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Radial Red Atmosphere */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-red-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 right-10 w-[450px] h-[350px] bg-rose-600/5 rounded-full blur-[120px]" />

        {/* Cyber Matrix Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(rgba(239, 68, 68, 0.4) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Scanlines Effect */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '100% 4px'
          }}
        />
      </div>

      {/* Top Header / Branding Bar */}
      <header className="relative z-10 w-full px-6 py-5 border-b border-red-500/20 bg-neutral-950/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden border border-red-500/40 bg-neutral-900/90 p-1.5 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <img
                src="/samyak-emblem.png"
                alt="Samyak Emblem"
                className="w-full h-full object-contain filter drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-wider text-white font-heading leading-tight flex items-center gap-1">
                SAMYAK <span className="text-red-500 text-glow-red">2026</span>
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-neutral-400 font-mono font-semibold">
                KL UNIVERSITY • NATIONAL FEST
              </span>
            </div>
          </div>

          {/* Beacon status pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 text-xs font-mono font-medium shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="hidden sm:inline">SYSTEM STATUS:</span>
            <span className="text-white font-bold tracking-wider uppercase">
              {isTampered ? 'SECURITY LOCK' : 'MAINTENANCE'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero & Content Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-12 md:py-16">
        <div className="max-w-3xl w-full mx-auto text-center flex flex-col items-center">

          {/* Animated Central Icon with Cyber Rings */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative mb-8"
          >
            {/* Outer Glow Ring */}
            <div className="absolute -inset-4 rounded-full bg-gradient-to-r from-red-600/30 to-rose-600/20 blur-xl animate-pulse" />
            
            {/* Rotating Tech Ring */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-neutral-950/90 border-2 border-red-500/60 p-4 flex items-center justify-center shadow-[0_0_35px_rgba(239,68,68,0.4)]">
              {/* Corner Accents */}
              <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-red-400" />
              <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-red-400" />
              <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-red-400" />
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-red-400" />

              <div className="flex flex-col items-center justify-center gap-1">
                <Wrench className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 animate-spin" style={{ animationDuration: '10s' }} />
                <span className="text-[10px] font-mono text-red-400 tracking-widest uppercase font-semibold">UPGRADING</span>
              </div>
            </div>
          </motion.div>

          {/* Notice Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-700/80 mb-5 text-neutral-300 text-xs sm:text-sm font-mono tracking-wide"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>
              {isTampered 
                ? "TAMPER VIOLATION DETECTED // ACCESS REVOKED" 
                : "PORTALS TEMPORARILY OFFLINE (USER & ADMIN)"}
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black font-heading tracking-wide uppercase text-white mb-4 leading-tight"
          >
            {isTampered ? (
              <>
                INTEGRITY BREACH <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-red-600 text-glow-red">
                  SYSTEM LOCKED
                </span>
              </>
            ) : (
              <>
                WE ARE CURRENTLY UNDER <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-red-600 text-glow-red">
                  MAINTENANCE
                </span>
              </>
            )}
          </motion.h1>

          {/* Subtext description */}
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-neutral-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-8 leading-relaxed font-sans"
          >
            {isTampered ? (
              <>
                Unauthorized modification or removal of the lead platform architect attribution 
                signature (<span className="text-red-400 font-mono">Balaram / @balaram753</span>) was detected. 
                In accordance with security governance, core routing and services are strictly locked.
              </>
            ) : (
              customReason || 
              "The official SAMYAK 2026 website is undergoing scheduled technical maintenance, database synchronization, and server infrastructure enhancements. All user registrations, event schedules, and administrative consoles are paused during this period to safeguard system integrity."
            )}
          </motion.p>

          {/* Live Upgrade Operations Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-2xl bg-neutral-950/80 border border-red-500/25 rounded-2xl p-5 sm:p-6 backdrop-blur-xl mb-8 shadow-[0_10px_30px_rgba(0,0,0,0.85)] text-left"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase tracking-wider">
                <Server className="w-4 h-4 text-red-400" />
                <span>System Operations Status</span>
              </div>
              <div className="text-xs font-mono text-neutral-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Clock: <span className="text-neutral-300">{lastChecked}</span></span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 flex flex-col gap-1.5">
                <span className="text-neutral-400 text-[11px] uppercase tracking-wider">Public Fest Portal</span>
                <span className="text-red-400 font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Maintenance Mode
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 flex flex-col gap-1.5">
                <span className="text-neutral-400 text-[11px] uppercase tracking-wider">Admin & Gate Scanner</span>
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" /> Restricted Access
                </span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 flex flex-col gap-1.5">
                <span className="text-neutral-400 text-[11px] uppercase tracking-wider">Database Engine</span>
                <span className="text-cyan-400 font-bold flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 animate-pulse" /> Sync in Progress
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center gap-2 text-neutral-400 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>All registered user data, bookings, and payment records remain 100% safe & intact.</span>
            </div>
          </motion.div>

          {/* Interactive Actions & Refresh Button */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md"
          >
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-cyber font-bold tracking-wider text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.7)] active:scale-95 cursor-pointer disabled:opacity-75"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'CHECKING SYSTEM...' : 'REFRESH / CHECK STATUS'}</span>
            </button>

            <a
              href="mailto:balaram777.ch@gmail.com?subject=SAMYAK%202026%20Urgent%20Restoration%20Inquiry"
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700 font-cyber font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300"
            >
              <Mail className="w-4 h-4 text-red-400" />
              <span>CONTACT ARCHITECT</span>
            </a>
          </motion.div>

          {/* Quick FAQ / Note */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-xs text-neutral-400 font-mono mt-8 max-w-lg leading-relaxed"
          >
            Expected restoration will take place shortly. If you are a festival coordinator or require urgent assistance, please reach out directly to{' '}
            <a 
              href="https://linkedin.com/in/chbalaram" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-red-400 font-semibold hover:underline"
            >
              Balaram
            </a>{' '}
            (<a href="mailto:balaram777.ch@gmail.com" className="text-neutral-300 hover:text-white underline">balaram777.ch@gmail.com</a>).
          </motion.p>
        </div>
      </main>

      {/* Cyber Footer */}
      <footer className="relative z-10 w-full py-4 px-6 border-t border-neutral-900 bg-neutral-950/80 backdrop-blur-md text-center">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-neutral-500">
          <span>SAMYAK 2026 • KL UNIVERSITY VIJAYAWADA</span>
          <span className="flex items-center gap-1.5 text-neutral-400">
            <Sparkles className="w-3.5 h-3.5 text-red-500" /> 
            <span>Engineered for excellence. Returning shortly.</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
