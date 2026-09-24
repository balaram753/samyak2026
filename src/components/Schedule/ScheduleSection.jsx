import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, MapPin, Sparkles, User } from 'lucide-react';
import { SCHEDULE_DAYS } from '../../data/schedule';
import { useSiteContent } from '../../context/SiteContentContext';

export default function ScheduleSection() {
  const { scheduleDays } = useSiteContent();
  const allDays = scheduleDays && scheduleDays.length > 0 ? scheduleDays : SCHEDULE_DAYS;

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const currentDay = allDays[activeDayIndex] || allDays[0];

  return (
    <section id="schedule" className="relative py-24 sm:py-32 bg-black overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-3">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            3-Day Timeline
          </div>
          <h2 className="text-3xl sm:text-5xl font-black font-heading text-white tracking-tight">
            FESTIVAL <span className="text-red-500 text-glow-red">SCHEDULE &amp; ROADMAP</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-400 font-cyber">
            Navigate all keynotes, hackathon checkpoints, combat arenas, and celebrity concerts across the 3 days of SAMYAK 2026.
          </p>
        </div>

        {/* Day Selector Tabs */}
        <div className="flex justify-center mb-12 sm:mb-16">
          <div className="inline-flex p-1.5 rounded-full bg-neutral-900/80 border border-neutral-800 backdrop-blur-xl">
            {allDays.map((item, idx) => (
              <button
                key={item.day}
                type="button"
                onClick={() => setActiveDayIndex(idx)}
                className={`relative px-5 sm:px-8 py-2.5 rounded-full font-heading text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                  activeDayIndex === idx
                    ? 'text-white font-black shadow-[0_0_25px_rgba(239,68,68,0.5)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {activeDayIndex === idx && (
                  <motion.div
                    layoutId="activeScheduleDay"
                    className="absolute inset-0 bg-gradient-to-r from-red-600 via-rose-500 to-red-500 rounded-full -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
                <div className="flex flex-col items-center">
                  <span>{item.day}</span>
                  <span className={`text-[10px] font-mono lowercase ${activeDayIndex === idx ? 'text-white/80' : 'text-neutral-500'}`}>
                    {item.date}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Day Theme Overview */}
        <motion.div
          key={currentDay.day}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-12"
        >
          <h3 className="text-xl sm:text-2xl font-bold font-heading text-red-400">
            {currentDay.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 font-cyber mt-1">
            {currentDay.description}
          </p>
        </motion.div>

        {/* Vertical Futuristic Cyber Timeline */}
        <div className="relative max-w-4xl mx-auto">
          {/* Vertical Center Guide Line */}
          <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-red-600 via-rose-500 to-red-700 -translate-x-1/2 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentDay.day}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.35 }}
                className="space-y-8 relative"
              >
                {currentDay.events.map((slot, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <div
                      key={`${currentDay.day}-${idx}`}
                      className={`relative flex flex-col sm:flex-row items-start ${
                        isEven ? 'sm:flex-row-reverse' : ''
                      } gap-6 sm:gap-12 pl-10 sm:pl-0`}
                    >
                      {/* Glowing Timeline Marker Node */}
                      <div className="absolute left-4 sm:left-1/2 top-5 -translate-x-1/2 w-4 h-4 rounded-full bg-black border-2 border-red-500 flex items-center justify-center shadow-[0_0_10px_#ef4444] z-20">
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>

                      {/* Timeline Event Card */}
                      <div className="w-full sm:w-1/2">
                        <div
                          className={`cyber-card p-6 rounded-2xl border transition-all duration-300 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] ${
                            slot.highlight
                              ? 'border-red-500/50 bg-gradient-to-br from-neutral-900/90 via-[#18080a] to-black'
                              : 'border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          {/* Time & Category */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-red-300 bg-red-950/60 border border-red-500/30 px-3 py-1 rounded-full shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-red-400" />
                              {slot.time}
                            </span>

                            <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                              {slot.category}
                            </span>
                          </div>

                          {/* Title */}
                          <h4 className="text-base sm:text-lg font-bold font-heading text-white leading-snug">
                            {slot.title}
                          </h4>

                          {/* Speaker / Details */}
                          {slot.speaker && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs font-cyber text-slate-400">
                              <User className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              <span>{slot.speaker}</span>
                            </div>
                          )}

                          {/* Venue */}
                          <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                              <span>{slot.venue}</span>
                            </span>

                            {slot.highlight && (
                              <span className="flex items-center gap-1 text-red-400 font-bold text-[10px] uppercase tracking-wider">
                                <Sparkles className="w-3 h-3" /> Key Event
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>
    </section>
  );
}
