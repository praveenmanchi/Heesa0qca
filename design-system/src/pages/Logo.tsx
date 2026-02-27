import React from 'react';
import { motion } from 'motion/react';

export function Logo() {
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
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Logo</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          The Old Navy logo is the most recognizable asset of our brand. It represents our heritage of fun, fashion, and value.
        </motion.p>
      </header>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Primary Logo</motion.h2>
        <div className="bg-slate-50 p-16 rounded-xl border border-slate-200 flex items-center justify-center">
          <div className="bg-[#00205B] text-white px-8 py-4 rounded-full border-4 border-white shadow-sm outline outline-4 outline-[#00205B]">
            <span className="font-display font-black text-4xl tracking-tight">OLD NAVY</span>
          </div>
        </div>
        <p className="mt-4 text-slate-600">
          The primary logo should be used on light backgrounds. It consists of the "OLD NAVY" wordmark inside our iconic pill shape.
        </p>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Clearspace</motion.h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-32 border border-dashed border-red-400 bg-red-50/20"></div>
            </div>
            <div className="bg-[#00205B] text-white px-6 py-3 rounded-full border-2 border-white outline outline-2 outline-[#00205B] scale-75">
              <span className="font-display font-black text-2xl">OLD NAVY</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Minimum Clearspace</h3>
            <p className="text-slate-600">
              Always maintain clear space around the logo to ensure visibility and impact. The minimum clear space is equal to the height of the letter "O" in the wordmark.
            </p>
          </div>
        </div>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Misuse</motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MisuseCard title="Do not rotate" description="Keep the logo horizontal." />
          <MisuseCard title="Do not distort" description="Do not stretch or squash." />
          <MisuseCard title="Do not recolor" description="Use only official colors." />
          <MisuseCard title="Do not clutter" description="Keep background simple." />
        </div>
      </section>
    </motion.div>
  );
}

function MisuseCard({ title, description }: { title: string, description: string }) {
  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
      <div className="h-24 bg-slate-200 rounded mb-3 flex items-center justify-center text-slate-400">
        <span className="text-2xl">🚫</span>
      </div>
      <h4 className="font-bold text-slate-900 text-sm">{title}</h4>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}
