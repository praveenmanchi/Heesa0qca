import React from 'react';
import { motion } from 'motion/react';

export function Spacing() {
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-12">
      <header>
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Spacing</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          Our spacing system is built on a 4px baseline grid. This ensures consistency, rhythm, and balance across all layouts and components.
        </motion.p>
      </header>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">The 4px Scale</motion.h2>
        <div className="space-y-4">
          <SpacingRow token="space.025" value="2px" rem="0.125rem" />
          <SpacingRow token="space.050" value="4px" rem="0.25rem" />
          <SpacingRow token="space.075" value="6px" rem="0.375rem" />
          <SpacingRow token="space.100" value="8px" rem="0.5rem" />
          <SpacingRow token="space.150" value="12px" rem="0.75rem" />
          <SpacingRow token="space.200" value="16px" rem="1rem" />
          <SpacingRow token="space.300" value="24px" rem="1.5rem" />
          <SpacingRow token="space.400" value="32px" rem="2rem" />
          <SpacingRow token="space.500" value="40px" rem="2.5rem" />
          <SpacingRow token="space.600" value="48px" rem="3rem" />
          <SpacingRow token="space.800" value="64px" rem="4rem" />
          <SpacingRow token="space.1000" value="80px" rem="5rem" />
        </div>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Applying Spacing</motion.h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Inset Spacing</h3>
            <div className="bg-white p-4 rounded-lg border border-slate-200 inline-block">
              <div className="bg-blue-100 text-blue-800 p-4 rounded text-sm font-mono">
                p-4 (16px)
              </div>
            </div>
            <p className="mt-4 text-slate-600 text-sm">Use standard spacing tokens for padding inside containers.</p>
          </div>
          <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Stack Spacing</h3>
            <div className="flex flex-col gap-4 bg-white p-4 rounded-lg border border-slate-200 inline-block">
              <div className="bg-blue-100 h-8 w-32 rounded"></div>
              <div className="bg-blue-100 h-8 w-32 rounded"></div>
              <div className="bg-blue-100 h-8 w-32 rounded"></div>
            </div>
            <p className="mt-4 text-slate-600 text-sm">Use the gap property to manage vertical rhythm between elements.</p>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function SpacingRow({ token, value, rem }: { token: string, value: string, rem: string }) {
  const pixelValue = parseInt(value);
  return (
    <div className="flex items-center gap-8 p-4 bg-white border border-slate-100 rounded-lg">
      <div className="w-16 h-8 bg-red-100 flex items-center justify-center rounded" style={{ width: value }}>
        <span className="sr-only">{value}</span>
      </div>
      <div className="flex-1 grid grid-cols-3 gap-4">
        <span className="font-mono text-sm font-bold text-slate-900">{token}</span>
        <span className="font-mono text-sm text-slate-500">{value}</span>
        <span className="font-mono text-sm text-slate-400">{rem}</span>
      </div>
    </div>
  );
}
