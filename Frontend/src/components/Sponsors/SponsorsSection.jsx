import { motion } from 'framer-motion';
import { Award, ExternalLink, Building2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSiteContent } from '../../context/SiteContentContext';
import { useTheme } from '../../context/ThemeContext';

export default function SponsorsSection() {
  const { sponsors } = useSiteContent();
  const { isLight } = useTheme();

  const sponsorsList = sponsors && sponsors.length > 0 ? sponsors : [];

  return (
    <section id="sponsors" className={`relative py-24 sm:py-32 border-t overflow-hidden select-none transition-colors ${
      isLight ? 'bg-white border-neutral-200' : 'bg-black border-neutral-900'
    }`}>
      {/* Volumetric Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-red-600/[0.06] rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-64 h-64 bg-red-700/[0.05] rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-500 uppercase tracking-widest mb-3 shadow-[0_0_12px_rgba(223,37,49,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_#DF2531]" />
            <Award className="w-3.5 h-3.5 text-red-500" />
            <span>Ecosystem Partners</span>
          </div>

          <h2 className={`text-3xl sm:text-5xl font-black font-heading tracking-tight uppercase leading-tight ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            POWERED BY <span className="text-red-600 dark:text-red-500 text-glow-red">INDUSTRY LEADERS</span>
          </h2>
        </div>

        {sponsorsList.length === 0 ? (
          /* ── HIGH-TECH COMING SOON DISPLAY ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={`max-w-2xl mx-auto rounded-3xl p-8 sm:p-12 text-center border relative overflow-hidden backdrop-blur-xl ${
              isLight
                ? 'bg-neutral-50/90 border-neutral-200/90 shadow-[0_10px_35px_rgba(139,21,27,0.06)]'
                : 'bg-neutral-950/80 border-red-500/25 shadow-[0_0_40px_rgba(223,37,49,0.12)]'
            }`}
          >
            {/* Cyber Corner HUD Brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500/70" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500/70" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500/70" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500/70" />

            {/* Glowing top line */}
            <div className="absolute top-0 left-1/4 right-1/4 h-[1.5px] bg-gradient-to-r from-transparent via-red-500 to-transparent" />

            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/10 border border-red-500/40 text-red-500 text-[11px] font-mono uppercase tracking-widest font-bold mb-5 shadow-[0_0_15px_rgba(223,37,49,0.2)]">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Official Partners · Coming Soon</span>
            </div>

            {/* Heading */}
            <h3 className={`text-2xl sm:text-4xl font-black font-heading tracking-wide uppercase mb-3 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              PARTNERSHIPS <span className="text-red-600 dark:text-red-500 text-glow-red">COMING SOON</span>
            </h3>

            {/* Subtitle */}
            <p className={`text-xs sm:text-sm font-cyber max-w-lg mx-auto leading-relaxed mb-8 ${
              isLight ? 'text-neutral-600' : 'text-neutral-400'
            }`}>
              Industry leaders, innovation partners, and tech sponsors backing SAMYAK 2026 are currently being onboarded. Official announcements will be revealed here soon.
            </p>

            {/* Decorative Cyber Pod Silhouettes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto mb-8">
              {['Title Partner', 'Tech Ecosystem', 'Cloud Partner', 'Innovation Hub'].map((tier, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 group">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-dashed flex items-center justify-center transition-all ${
                    isLight
                      ? 'border-neutral-300 bg-white/80 text-neutral-400'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-600 group-hover:border-red-500/50 group-hover:text-red-400'
                  }`}>
                    <Sparkles className="w-5 h-5 opacity-60 animate-pulse text-red-500" />
                  </div>
                  <span className={`text-[10px] font-mono uppercase tracking-wider font-semibold ${
                    isLight ? 'text-neutral-500' : 'text-neutral-500 group-hover:text-red-400'
                  }`}>
                    {tier}
                  </span>
                </div>
              ))}
            </div>

            {/* Become a Partner CTA */}
            <div className="flex items-center justify-center">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-heading font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(223,37,49,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Partner With SAMYAK</span>
              </Link>
            </div>
          </motion.div>
        ) : (
          /* Circular Sponsors Grid — Modeled with Samyak Aesthetics */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-8 sm:gap-10 justify-items-center">
          {sponsorsList.map((sponsor, idx) => {
            const hasLink = Boolean(sponsor.websiteUrl && sponsor.websiteUrl.trim() !== '');
            const rawLogo = sponsor.logoUrl;
            const logoSrc = isLight && (!rawLogo || rawLogo === '/samyak-emblem.png' || rawLogo.includes('samyak-emblem.png'))
              ? '/samyak-emblem-black.png'
              : rawLogo;

            return (
              <motion.div
                key={sponsor.id || sponsor.name || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="w-full max-w-[200px] flex flex-col items-start group cursor-pointer mx-auto"
                onClick={() => {
                  if (hasLink) {
                    window.open(sponsor.websiteUrl, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                {/* ── ROUND THING: Circular Logo Showcase ── */}
                <div className={`relative w-36 h-36 sm:w-40 sm:h-40 md:w-44 md:h-44 rounded-full border-2 p-2 flex items-center justify-center transition-all duration-300 group-hover:scale-105 ${
                  isLight
                    ? 'border-neutral-300 bg-white shadow-lg group-hover:border-red-600 group-hover:shadow-[0_10px_30px_rgba(139,21,27,0.18)]'
                    : 'border-neutral-700/80 bg-neutral-950 shadow-[0_10px_30px_rgba(0,0,0,0.85)] group-hover:border-red-500 group-hover:shadow-[0_0_28px_rgba(223,37,49,0.45)]'
                }`}>
                  
                  {/* Subtle red ring on hover */}
                  <div className="absolute inset-0 rounded-full border border-red-500/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  {/* Logo or Emblem Display */}
                  <div className={`w-full h-full rounded-full border overflow-hidden flex items-center justify-center p-3 relative ${
                    isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/90 border-neutral-800/80'
                  }`}>
                    {logoSrc ? (
                      <img
                        src={logoSrc}
                        alt={sponsor.name}
                        className="w-full h-full object-contain filter contrast-105 group-hover:scale-105 transition-all duration-300"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}

                    {/* Fallback Icon when no image */}
                    <div 
                      className={`w-full h-full items-center justify-center text-red-500 ${logoSrc ? 'hidden' : 'flex'}`}
                    >
                      <Building2 className={`w-10 h-10 transition-colors ${isLight ? 'text-neutral-400 group-hover:text-red-600' : 'text-neutral-600 group-hover:text-red-400'}`} />
                    </div>
                  </div>

                  {/* External Link Pin on Hover */}
                  {hasLink && (
                    <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-red-600 border border-white/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_12px_rgba(223,37,49,0.8)] scale-90 group-hover:scale-100">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* ── LOWER TEXT BLOCK: Red Left Line + Name + Business Subtitle ── */}
                <div className="w-full mt-4 sm:mt-5 pl-3 border-l-2 border-red-500 text-left transition-colors duration-300 group-hover:border-red-600">
                  {sponsor.tier && (
                    <span className={`text-[10px] font-mono uppercase tracking-widest block mb-0.5 font-bold ${
                      isLight ? 'text-red-700' : 'text-red-400/90'
                    }`}>
                      {sponsor.tier}
                    </span>
                  )}

                  <h3 className={`font-heading font-black text-sm sm:text-base md:text-lg uppercase tracking-wider transition-colors line-clamp-1 leading-tight ${
                    isLight ? 'text-slate-900 group-hover:text-red-700' : 'text-white group-hover:text-red-400'
                  }`}>
                    {sponsor.name}
                  </h3>

                  <p className={`text-xs sm:text-[13px] font-cyber leading-snug mt-1 line-clamp-2 transition-colors ${
                    isLight ? 'text-neutral-600 group-hover:text-neutral-800' : 'text-neutral-400 group-hover:text-neutral-300'
                  }`}>
                    {sponsor.subtitle || 'Official Festival Partner'}
                  </p>
                </div>

              </motion.div>
            );
          })}
        </div>
        )}

      </div>
    </section>
  );
}
