import React from 'react';
import { motion } from 'motion/react';

export function Shape() {
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
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Shape & Border</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          Our shape system uses rounded corners to convey friendliness and approachability. Borders are used subtly to define structure without adding visual weight.
        </motion.p>
      </header>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Corner Radius</motion.h2>
        <div className="grid md:grid-cols-4 gap-6">
          <RadiusCard token="radius-025" value="2px" description="Smallest components" />
          <RadiusCard token="radius-050" value="4px" description="Small components, checkboxes" />
          <RadiusCard token="radius-100" value="8px" description="Cards, containers" />
          <RadiusCard token="radius-150" value="12px" description="Larger containers" />
          <RadiusCard token="radius-200" value="16px" description="Modals" />
          <RadiusCard token="radius-300" value="24px" description="Large modals, sheets" />
          <RadiusCard token="radius-9999" value="999px" description="Pills, avatars, circular buttons" />
        </div>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Borders</motion.h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="h-24 bg-white border border-slate-200 rounded-lg mb-4"></div>
            <h3 className="font-bold text-slate-900">1px Border</h3>
            <p className="text-sm text-slate-600">Default for inputs, dividers, and card outlines.</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="h-24 bg-white border-2 border-[#00205B] rounded-lg mb-4"></div>
            <h3 className="font-bold text-slate-900">2px Border</h3>
            <p className="text-sm text-slate-600">Active states, focus rings, and secondary buttons.</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <div className="h-24 bg-white border-b border-slate-200 rounded-lg mb-4"></div>
            <h3 className="font-bold text-slate-900">Dividers</h3>
            <p className="text-sm text-slate-600">Use 1px slate-200 for separating content.</p>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function RadiusCard({ token, value, description }: { token: string, value: string, description: string }) {
  const getRadiusClass = (t: string) => {
    switch(t) {
      case 'radius-025': return 'rounded-[2px]';
      case 'radius-050': return 'rounded-[4px]';
      case 'radius-100': return 'rounded-[8px]';
      case 'radius-150': return 'rounded-[12px]';
      case 'radius-200': return 'rounded-[16px]';
      case 'radius-300': return 'rounded-[24px]';
      case 'radius-9999': return 'rounded-full';
      default: return 'rounded';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 flex flex-col items-center text-center">
      <div className={`w-24 h-24 bg-[#003764] ${getRadiusClass(token)} mb-4 shadow-sm`}></div>
      <h3 className="font-mono font-bold text-slate-900">{token}</h3>
      <span className="text-xs font-mono text-slate-400 mb-2">{value}</span>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}
