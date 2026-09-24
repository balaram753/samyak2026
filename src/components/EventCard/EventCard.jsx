import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Trophy, ArrowUpRight } from 'lucide-react';

export default function EventCard({ event, onSelect, is3D = false }) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const handleNavigateDetails = (e) => {
    e.stopPropagation();
    if (onSelect) onSelect(event);
    navigate(`/events/${event.id}`);
  };

  return (
    <motion.div
      layout={!is3D}
      initial={is3D ? false : { opacity: 0, y: 20 }}
      animate={is3D ? undefined : { opacity: 1, y: 0 }}
      exit={is3D ? undefined : { opacity: 0, scale: 0.95 }}
      whileHover={is3D ? undefined : { y: -6 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleNavigateDetails}
      className="glass-card-3d rounded-2xl overflow-hidden cursor-pointer relative group flex flex-col justify-between transition-all duration-300 select-none"
    >
      {/* Dynamic Glass Specular Light Reflection */}
      <div 
        className={`absolute inset-0 pointer-events-none transition-opacity duration-500 bg-gradient-to-tr from-transparent via-white/[0.07] to-red-500/[0.08] ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`} 
      />
      {/* Top Banner Image with Zoom on Hover */}
      <div className="relative h-44 w-full overflow-hidden bg-neutral-900">
        <img
          src={event.image || '/hero-bg.png'}
          alt={event.title}
          className="w-full h-full object-cover filter contrast-110 brightness-90 group-hover:scale-110 group-hover:brightness-100 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider font-semibold cyber-glass border border-red-500/40 text-red-300 shadow-sm">
            {event.category}
          </span>
        </div>

        {/* Status Pill */}
        <div className="absolute top-3 right-3">
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider uppercase font-semibold bg-red-500/20 text-red-300 border border-red-500/30"
          >
            {event.registrationStatus}
          </span>
        </div>

        {/* Prize Pool Tag */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/80 border border-red-500/40 text-red-400 font-heading text-xs font-bold shadow-[0_0_12px_rgba(239,68,68,0.2)]">
          <Trophy className="w-3.5 h-3.5 text-red-400" />
          <span>{event.prize}</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h3 className="text-lg font-bold font-heading text-white group-hover:text-red-400 transition-colors line-clamp-1">
            {event.title}
          </h3>

          <p className="mt-2 text-xs sm:text-sm text-slate-400 font-cyber line-clamp-2 leading-relaxed">
            {event.shortDescription}
          </p>
        </div>

        {/* Date / Time / Venue Details */}
        <div className="space-y-1.5 pt-2 border-t border-neutral-800 text-[11px] text-slate-300 font-mono">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5 text-red-400" /> {event.date}
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-red-400" /> {event.time}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-400 truncate">
            <MapPin className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-mono text-neutral-500">Entry Fee</span>
            <span className="text-xs font-bold text-white font-heading">{event.fee}</span>
          </div>

          <button
            type="button"
            onClick={handleNavigateDetails}
            className="px-4 py-2 rounded-full font-heading text-[11px] font-bold tracking-wider uppercase text-white bg-red-600/80 border border-red-500/40 hover:bg-red-600 hover:shadow-[0_0_15px_rgba(239,68,68,0.6)] transition-all duration-300 flex items-center gap-1 cursor-pointer"
          >
            <span>Details</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
