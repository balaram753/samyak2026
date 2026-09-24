import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, Shield, Phone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function EventModal({ event, isOpen, onClose, _onRegisterSuccess }) {
  if (!isOpen || !event) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-[#09090b] border border-red-500/30 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden z-10 my-8 max-h-[90vh] flex flex-col"
        >
          {/* Header Banner */}
          <div className="relative h-44 sm:h-52 w-full overflow-hidden flex-shrink-0">
            <img
              src={event.image || '/hero-bg.png'}
              alt={event.title}
              className="w-full h-full object-cover filter brightness-75 contrast-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900/80 border border-neutral-700 text-neutral-300 hover:text-white hover:border-red-500 transition-colors"
              aria-label="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Category Tag & Prize */}
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
              <div>
                <span className="px-3 py-1 rounded-full bg-red-500/20 border border-red-400/40 text-xs font-mono font-medium text-red-300">
                  {event.category}
                </span>
                <h3 className="text-xl sm:text-2xl font-black font-heading text-white mt-2 leading-tight">
                  {event.title}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-mono text-neutral-400">Prize Pool</span>
                <div className="text-lg sm:text-xl font-black font-heading text-red-400 text-glow-red">
                  {event.prize}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 text-sm">
            {/* Quick Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Date</div>
                  <div className="text-xs font-semibold">{event.date}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Time</div>
                  <div className="text-xs font-semibold">{event.time}</div>
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-center gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-mono">Venue</div>
                  <div className="text-xs font-semibold truncate">{event.venue}</div>
                </div>
              </div>
            </div>

            {/* Full Description */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-red-400 mb-2">
                OVERVIEW
              </h4>
              <p className="text-slate-300 font-cyber leading-relaxed">
                {event.fullDescription || event.shortDescription}
              </p>
            </div>

            {/* Rules */}
            {event.rules && event.rules.length > 0 && (
              <div>
                <h4 className="text-xs font-mono uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-400" /> RULES &amp; GUIDELINES
                </h4>
                <ul className="space-y-1.5 pl-2">
                  {event.rules.map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-slate-300 font-cyber text-xs">
                      <span className="text-red-400 font-mono mt-0.5">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Eligibility */}
            {event.eligibility && (
              <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/20 text-xs">
                <span className="font-semibold text-red-300">Eligibility: </span>
                <span className="text-slate-300">{event.eligibility}</span>
              </div>
            )}

            {/* Coordinators */}
            {event.coordinators && (
              <div>
                <h4 className="text-xs font-mono uppercase tracking-widest text-neutral-400 mb-2">
                  EVENT COORDINATORS
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {event.coordinators.map((c, i) => (
                    <div key={i} className="p-3 rounded-lg bg-neutral-900/40 border border-neutral-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">{c.name}</div>
                        <div className="text-slate-400 text-[11px]">{c.role}</div>
                      </div>
                      <a
                        href={`tel:${c.phone}`}
                        className="p-1.5 rounded-md bg-neutral-800 text-red-400 hover:bg-red-500/20 transition-colors"
                        title={c.phone}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer / Registration CTA */}
          <div className="p-4 sm:p-6 bg-neutral-950/90 border-t border-neutral-800 flex items-center justify-between gap-4 mt-auto">
            <div>
              <span className="text-[10px] uppercase font-mono text-neutral-400">Registration Fee</span>
              <div className="text-base sm:text-lg font-bold font-heading text-white">
                {event.fee}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/payment"
                onClick={onClose}
                className="px-6 py-2.5 rounded-full font-heading text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:shadow-[0_0_30px_rgba(239,68,68,0.8)] hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Confirm Pass &amp; Register</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
