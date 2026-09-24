import { motion } from 'framer-motion';
import { Shield, Award, Terminal, Cpu, Radio, Network, Zap } from 'lucide-react';

const SPONSORS = [
  { name: 'NEXUS CLOUD', tier: 'Title Partner', icon: Cpu, desc: 'Decentralized High-Performance GPU Compute' },
  { name: 'CYBERDYNE LABS', tier: 'Robotics Partner', icon: Terminal, desc: 'Autonomous Robotics & Hardware' },
  { name: 'QUANTUM VECTOR', tier: 'Hackathon Partner', icon: Network, desc: 'Quantum Computing Infrastructure' },
  { name: 'HYPERION AUDIO', tier: 'Entertainment Partner', icon: Radio, desc: 'Concert Grade Acoustic Production' },
  { name: 'AERO DYNAMICS', tier: 'Drone Arena Partner', icon: Zap, desc: 'Autonomous UAV Systems' },
  { name: 'TITAN DEFENSE', tier: 'Cybersecurity Partner', icon: Shield, desc: 'Next-Gen Threat Intelligence' },
];

export default function SponsorsSection() {
  return (
    <section className="relative py-20 bg-black border-t border-slate-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full cyber-glass border border-red-500/30 text-xs font-mono text-red-400 uppercase tracking-widest mb-3">
            <Award className="w-3.5 h-3.5 text-red-400" />
            Ecosystem Partners
          </div>
          <h2 className="text-2xl sm:text-4xl font-black font-heading text-white tracking-tight">
            POWERED BY <span className="text-red-500 text-glow-red">INDUSTRY LEADERS</span>
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 font-cyber">
            Collaborating with world-leading deep-tech pioneers, research institutions, and media syndicates.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {SPONSORS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                className="p-5 rounded-xl cyber-card border border-neutral-800/80 hover:border-red-500/50 flex flex-col items-center text-center justify-center group transition-all duration-300 hover:scale-105"
              >
                <div className="p-3 rounded-lg bg-neutral-900 text-red-400 group-hover:text-red-300 transition-colors mb-3">
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-heading font-bold text-xs sm:text-sm text-white tracking-wider">
                  {s.name}
                </h4>
                <span className="text-[10px] font-mono text-red-400/80 uppercase mt-1">
                  {s.tier}
                </span>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
