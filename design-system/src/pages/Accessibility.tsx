import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, Eye, MousePointer, Keyboard } from 'lucide-react';

export function Accessibility() {
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
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Accessibility</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          We believe in building an inclusive experience for everyone. Our design system is built with WCAG 2.1 AA standards in mind.
        </motion.p>
      </header>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Color Contrast</motion.h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-green-600 font-bold">
              <CheckCircle className="w-5 h-5" />
              <span>Pass (4.5:1+)</span>
            </div>
            <div className="space-y-4">
              <div className="bg-[#003764] text-white p-4 rounded-lg font-medium">
                Navy on White (13.6:1)
              </div>
              <div className="bg-white text-[#003764] p-4 rounded-lg border border-slate-200 font-medium">
                White on Navy (13.6:1)
              </div>
              <div className="bg-[#C0132D] text-white p-4 rounded-lg font-medium">
                Red on White (5.7:1)
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 mb-4 text-red-600 font-bold">
              <XCircle className="w-5 h-5" />
              <span>Fail (Avoid)</span>
            </div>
            <div className="space-y-4">
              <div className="bg-[#00A3E0] text-white p-4 rounded-lg font-medium opacity-50">
                Light Blue on White (3.0:1) - Too low for text
              </div>
              <div className="bg-slate-200 text-white p-4 rounded-lg font-medium opacity-50">
                Gray on White - Invisible
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Focus States</motion.h2>
        <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
          <p className="text-slate-600 mb-6">
            Interactive elements must have a visible focus state for keyboard navigation. We use a standardized 2px offset ring.
          </p>
          <div className="flex gap-8 items-center">
            <button className="bg-[#003764] text-white px-6 py-3 rounded-full font-bold ring-4 ring-[#003764]/30">
              Focused Button
            </button>
            <input 
              type="text" 
              placeholder="Focused Input" 
              className="px-4 py-3 rounded-lg border border-[#003764] outline-none ring-4 ring-[#003764]/30"
            />
          </div>
        </div>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Checklist</motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          <ChecklistItem 
            icon={Eye} 
            title="Visual" 
            items={[
              "Color contrast is at least 4.5:1",
              "Don't use color alone to convey meaning",
              "Text can be resized up to 200%"
            ]} 
          />
          <ChecklistItem 
            icon={Keyboard} 
            title="Keyboard" 
            items={[
              "All interactive elements are reachable",
              "Focus order is logical",
              "Visible focus indicators are present"
            ]} 
          />
          <ChecklistItem 
            icon={MousePointer} 
            title="Interaction" 
            items={[
              "Touch targets are at least 44x44px",
              "No flashing content",
              "Consistent navigation patterns"
            ]} 
          />
        </div>
      </section>
    </motion.div>
  );
}

function ChecklistItem({ icon: Icon, title, items }: { icon: any, title: string, items: string[] }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg text-[#003764]">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-slate-900">{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="w-1.5 h-1.5 bg-[#003764] rounded-full mt-1.5 flex-shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
