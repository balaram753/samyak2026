import { motion } from 'framer-motion';
import { ShieldCheck, Cpu, Zap, Trophy, Users, Globe, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteContent } from '../../context/SiteContentContext';

const DEFAULT_STAT_ICONS = [Users, Trophy, Globe, Zap];
const DEFAULT_PILLAR_ICONS = [Cpu, Zap, ShieldCheck];

export default function AboutSection({ showLink = true }) {
  const { aboutContent } = useSiteContent();

  const badge = aboutContent?.badge || 'The National Phenomenon';
  const logoUrl = aboutContent?.logoUrl || '/samyak-logo-white.png';
  const title = aboutContent?.title || 'ABOUT SAMYAK 2026';
  const subtitle = aboutContent?.subtitle || 'SAMYAK is the premier annual National Level Techno-Management Fest of Koneru Lakshmaiah Education Foundation (KL University). Born as a beacon of student-driven ambition, it unites visionary engineers, artists, strategists, and gamers in a 3-day immersive odyssey.';
  const stats = aboutContent?.stats || [];
  const pillars = aboutContent?.pillars || [];

  return (
    <section id="about" className="relative py-24 sm:py-32 bg-black overflow-hidden">
      {/* Background Cyber Accents */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#ef4444]" />
            {badge}
          </div>

          {/* Official Full SAMYAK Brand Identity Logo */}
          <div className="mb-6">
            <img
              src={logoUrl}
              alt="Official SAMYAK 2026 Brand Logo"
              className="w-72 sm:w-96 md:w-[440px] h-auto object-contain filter drop-shadow-[0_0_25px_rgba(239,68,68,0.5)]"
            />
          </div>
          
          <h2 className="text-2xl sm:text-4xl font-black font-heading text-white tracking-tight leading-tight uppercase">
            {title.includes('SAMYAK') ? (
              <>
                {title.split('SAMYAK')[0]} <span className="text-red-500 text-glow-red">SAMYAK {title.split('SAMYAK')[1] || '2026'}</span>
              </>
            ) : (
              title
            )}
          </h2>
          
          <p className="mt-4 text-base sm:text-lg text-slate-300 font-cyber leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16 sm:mb-20">
          {stats.map((stat, idx) => {
            const Icon = DEFAULT_STAT_ICONS[idx % DEFAULT_STAT_ICONS.length];
            return (
              <motion.div
                key={stat.label || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="cyber-card p-6 rounded-2xl relative overflow-hidden group hover:border-red-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(239,68,68,0.2)]"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-red-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                    METRIC #0{idx + 1}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-heading text-red-400 mb-1 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm font-cyber text-slate-400">
                  {stat.label}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Asymmetrical 3-Column Pillar Feature */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 mb-12">
          {pillars.map((pillar, idx) => {
            const Icon = DEFAULT_PILLAR_ICONS[idx % DEFAULT_PILLAR_ICONS.length];
            return (
              <motion.div
                key={pillar.title || idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.15 }}
                className="cyber-card p-8 rounded-2xl border border-red-500/30 hover:border-red-500/60 relative flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-center text-red-400 mb-6 shadow-inner">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-heading text-white mb-3 tracking-wide">
                    {pillar.title}
                  </h3>
                  <p className="text-sm text-slate-300 font-cyber leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center gap-2 text-xs font-mono text-red-400">
                  <span>SYSTEM PILLAR 0{idx + 1}</span>
                  <span className="w-2 h-2 rounded-full bg-red-500/50" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Learn More Action */}
        {showLink && (
          <div className="text-center pt-4">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-sm font-heading font-semibold tracking-wider text-red-400 hover:text-red-300 transition-colors group"
            >
              <span>DISCOVER THE FULL SAMYAK LEGACY &amp; LEADERSHIP</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}

      </div>
    </section>
  );
}
