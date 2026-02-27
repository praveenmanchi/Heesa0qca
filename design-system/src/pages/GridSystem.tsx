import React from 'react';
import { motion } from 'motion/react';

export function GridSystem() {
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
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Grid System</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          Our layout system uses a responsive 12-column grid. This provides structure and consistency while allowing flexibility across different screen sizes.
        </motion.p>
      </header>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Grid Basics</motion.h2>
        <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-12 gap-4 h-32">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-blue-200/50 border border-blue-300 rounded flex items-center justify-center text-xs text-blue-800 font-mono">
                {i + 1}
              </div>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">12</div>
              <div className="text-sm text-slate-500">Columns</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">24px</div>
              <div className="text-sm text-slate-500">Gutter (Desktop)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">Max</div>
              <div className="text-sm text-slate-500">Width 1440px</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Breakpoints</motion.h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Breakpoint</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Width</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Columns</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Gutter</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-4 font-bold text-slate-900">Mobile</td>
                <td className="p-4 font-mono text-sm text-slate-500">0 - 599px</td>
                <td className="p-4 text-slate-600">4</td>
                <td className="p-4 text-slate-600">16px</td>
                <td className="p-4 text-slate-600">16px</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-900">Tablet</td>
                <td className="p-4 font-mono text-sm text-slate-500">600px - 1023px</td>
                <td className="p-4 text-slate-600">8</td>
                <td className="p-4 text-slate-600">24px</td>
                <td className="p-4 text-slate-600">24px</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-slate-900">Desktop</td>
                <td className="p-4 font-mono text-sm text-slate-500">1024px+</td>
                <td className="p-4 text-slate-600">12</td>
                <td className="p-4 text-slate-600">24px</td>
                <td className="p-4 text-slate-600">Auto</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </motion.div>
  );
}
