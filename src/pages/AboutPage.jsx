import { motion } from 'framer-motion';
import { pageVariants } from '../animations/pageAnimations';
import AboutSection from '../components/About/AboutSection';
import SponsorsSection from '../components/Sponsors/SponsorsSection';
import { Sparkles, Building, CheckCircle2, Code2, ExternalLink, Server, Layers, Globe } from 'lucide-react';
import { GithubIcon, LinkedinIcon, InstagramIcon } from '../components/SocialIcons';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="pt-24 min-h-screen bg-black"
    >
      {/* Page Hero Header */}
      <div className="relative py-16 sm:py-24 text-center max-w-4xl mx-auto px-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-4">
          <Sparkles className="w-4 h-4 text-red-400" />
          The Legacy of Innovation
        </div>
        <h1 className="text-4xl sm:text-6xl font-black font-heading text-white tracking-tight">
          ABOUT <span className="text-red-500 text-glow-red">SAMYAK 2026</span>
        </h1>
        <p className="mt-4 text-sm sm:text-lg text-slate-300 font-cyber">
          KL Deemed to be University&apos;s Flagship National Level Techno-Management Fest. A platform where emerging technologists, designers, business strategists, and artists push the frontiers of what is possible.
        </p>
      </div>

      {/* Interactive Core About Section */}
      <AboutSection showLink={false} />

      {/* KL University Institutional Heritage */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-red-400">
              <Building className="w-3.5 h-3.5" />
              INSTITUTIONAL EXCELLENCE
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold font-heading text-white leading-snug">
              KL DEEMED TO BE UNIVERSITY
            </h2>
            <p className="text-sm text-slate-300 font-cyber leading-relaxed">
              Recognized as a Category-1 University by UGC and accredited with NAAC A++ grade, KL University has stood as a pioneer in STEM education, interdisciplinary research, and student innovation for over four decades.
            </p>
            <p className="text-sm text-slate-300 font-cyber leading-relaxed">
              SAMYAK was conceived as a completely student-led initiative to foster high-level competitive spirit, creative expression, and collaborative leadership on a national stage.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              {[
                'NAAC A++ Accredited',
                'Top 25 NIRF Ranked',
                '100+ Advanced R&D Labs',
                '25,000+ Student Body',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-xs font-cyber text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sci-Fi Architecture Image Presentation */}
          <div className="relative rounded-3xl overflow-hidden cyber-card border border-red-500/30 p-2 shadow-2xl">
            <img
              src="/hero-bg.png"
              alt="KL University Cyber Architecture"
              className="w-full h-80 sm:h-96 object-cover rounded-2xl filter contrast-110 brightness-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="text-[10px] font-mono text-red-400 uppercase tracking-widest">
                CAMPUS MATRIX // 2026
              </span>
              <h3 className="text-lg font-bold font-heading text-white">
                Vaddeswaram Green Fields Campus
              </h3>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Engineering & Web Team */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-3xl cyber-card border border-neutral-800 p-8 sm:p-12 relative overflow-hidden bg-gradient-to-b from-neutral-950/80 to-black">
          <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-red-400 mb-4">
            <Code2 className="w-3.5 h-3.5" />
            DIGITAL INFRASTRUCTURE & ARCHITECTURE
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold font-heading text-white">
            PLATFORM ARCHITECTURE & ROLES
          </h2>
          <p className="mt-2 text-sm text-slate-300 font-cyber max-w-2xl">
            SAMYAK 2026 runs on a distributed cloud architecture engineered for high concurrency, cryptographic gate pass verification, and real-time fest management.
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backend & Systems Architecture */}
            <div className="p-6 rounded-2xl bg-neutral-900/80 border border-red-500/40 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-2 text-xs font-mono text-red-400 bg-red-950/50 px-2.5 py-1 rounded-full border border-red-500/30">
                  <Server className="w-3.5 h-3.5" />
                  <span>CORE BACKEND & WORKFLOWS</span>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold font-heading text-white">
                Balaram
              </h3>
              <p className="text-xs font-mono text-red-400 mt-0.5">
                Head of Systems & Backend Architecture
              </p>
              <div className="mt-4 space-y-2 text-xs font-cyber text-neutral-300 border-t border-neutral-800/80 pt-3">
                <div className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span><strong>Cloud & Database:</strong> Firestore data models, Cloudflare Edge gateway, and R2 S3 storage pipelines.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span><strong>Workflows:</strong> Ticket registration pipelines, QR code cryptographic generation & verification.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  <span><strong>Admin & Security:</strong> Multi-tiered admin portal, gate scanner suite, and security access rules.</span>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <a
                    href="https://github.com/balaram753"
                    target="_blank"
                    rel="noreferrer"
                    title="GitHub"
                    className="p-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 hover:text-red-400 hover:border-red-500/50 transition-colors"
                  >
                    <GithubIcon className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://linkedin.com/in/chbalaram"
                    target="_blank"
                    rel="noreferrer"
                    title="LinkedIn"
                    className="p-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 hover:text-red-400 hover:border-red-500/50 transition-colors"
                  >
                    <LinkedinIcon className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://instagram.com/_.roc_ram._"
                    target="_blank"
                    rel="noreferrer"
                    title="Instagram"
                    className="p-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 hover:text-red-400 hover:border-red-500/50 transition-colors"
                  >
                    <InstagramIcon className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="https://balaram.me"
                    target="_blank"
                    rel="noreferrer"
                    title="Portfolio"
                    className="p-1.5 rounded-lg bg-neutral-800/80 border border-neutral-700/60 text-neutral-300 hover:text-red-400 hover:border-red-500/50 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </a>
                </div>
                <span className="text-[10px] font-mono text-red-400/90 font-semibold bg-red-950/40 px-2 py-0.5 rounded border border-red-500/30">LEAD ARCHITECT</span>
              </div>
            </div>

            {/* Frontend & UI Design */}
            <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 relative">
              <div className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 bg-neutral-800/50 px-2.5 py-1 rounded-full border border-neutral-700/50 mb-4">
                <Layers className="w-3.5 h-3.5" />
                <span>USER INTERFACE & STYLING</span>
              </div>
              <h3 className="text-xl font-bold font-heading text-white">
                Uday
              </h3>
              <p className="text-xs font-mono text-neutral-400 mt-0.5">
                Frontend UI & Visual Experience
              </p>
              <div className="mt-4 space-y-2 text-xs font-cyber text-neutral-400 border-t border-neutral-800/80 pt-3">
                <div className="flex items-start gap-2">
                  <span className="text-neutral-500">•</span>
                  <span><strong>Interface Design:</strong> Visual theming, component styling, and UI presentation.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-neutral-500">•</span>
                  <span><strong>Page Layouts:</strong> Section wireframes and responsive client-side page views.</span>
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-400">Design & Theming</span>
                <span className="text-[10px] font-mono text-neutral-500">COLLABORATOR</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sponsors Section */}
      <SponsorsSection />

      {/* CTA Strip */}
      <div className="py-20 text-center bg-black border-t border-neutral-900">
        <h3 className="text-2xl sm:text-3xl font-bold font-heading text-white">
          READY TO BE PART OF SAMYAK 2026?
        </h3>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 font-cyber max-w-md mx-auto">
          Secure your delegate pass today and compete in over 45+ flagship arenas.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            to="/events"
            className="px-8 py-3 rounded-full font-heading text-xs uppercase font-bold text-white bg-gradient-to-r from-red-600 via-rose-500 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] hover:scale-105 transition-all"
          >
            Explore Events
          </Link>
          <Link
            to="/payment"
            className="px-8 py-3 rounded-full font-heading text-xs uppercase font-bold text-white cyber-glass border border-neutral-700 hover:border-red-500 transition-all"
          >
            Pay Event Fee
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
