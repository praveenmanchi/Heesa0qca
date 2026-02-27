import React from 'react';
import { motion } from 'motion/react';
import { useBrand } from '../context/BrandContext';

export function Color() {
  const { currentBrand } = useBrand();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-12"
    >
      <header>
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Color</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          The {currentBrand.name} color palette is designed to be accessible, expressive, and consistent across all digital touchpoints.
        </motion.p>
      </header>

      {/* Primary Palette */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Brand Colors</motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div variants={item}>
            <ColorCard 
              name="Primary" 
              hex={currentBrand.colors.primary} 
              description="The core brand color used for primary actions, headers, and key brand elements."
              textColor="text-white"
            />
          </motion.div>
          <motion.div variants={item}>
            <ColorCard 
              name="Secondary" 
              hex={currentBrand.colors.secondary} 
              description="Used for secondary actions and supporting elements."
              textColor="text-slate-900"
              border
            />
          </motion.div>
          <motion.div variants={item}>
            <ColorCard 
              name="Accent" 
              hex={currentBrand.colors.accent} 
              description="Used for highlights, badges, and calls to attention."
              textColor="text-white"
            />
          </motion.div>
        </div>
      </section>

      {/* Neutrals */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Neutrals</motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div variants={item}><ColorSwatch name="Text" hex={currentBrand.colors.text} /></motion.div>
          <motion.div variants={item}><ColorSwatch name="Background" hex={currentBrand.colors.background} border /></motion.div>
          <motion.div variants={item}><ColorSwatch name="Gray 4" hex="#808080" /></motion.div>
          <motion.div variants={item}><ColorSwatch name="Gray 2" hex="#E6E6E6" /></motion.div>
        </div>
      </section>

      {/* Accessibility */}
      <motion.section variants={item} className="rounded-2xl p-8 border" style={{ backgroundColor: `${currentBrand.colors.primary}10`, borderColor: `${currentBrand.colors.primary}30` }}>
        <h2 className="text-2xl font-display font-bold mb-4" style={{ color: currentBrand.colors.primary }}>Accessibility Note</h2>
        <p className="text-slate-700 mb-4">
          Always ensure sufficient contrast between text and background colors. Our primary brand color ({currentBrand.colors.primary}) is designed to pass WCAG standards.
        </p>
        <div className="flex gap-4">
          <div className="text-white px-6 py-3 rounded-lg font-bold" style={{ backgroundColor: currentBrand.colors.primary }}>
            Aa - Pass (AAA)
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function ColorCard({ name, hex, description, textColor, border }: { name: string, hex: string, description: string, textColor: string, border?: boolean }) {
  return (
    <div className={`rounded-xl overflow-hidden shadow-sm ${border ? 'border border-slate-200' : ''}`}>
      <div 
        className={`h-32 p-6 flex flex-col justify-between ${textColor}`}
        style={{ backgroundColor: hex }}
      >
        <span className="font-bold text-lg">{name}</span>
        <span className="font-mono opacity-80">{hex}</span>
      </div>
      <div className="p-6 bg-white">
        <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function ColorSwatch({ name, hex, border }: { name: string, hex: string, border?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div 
        className={`h-16 rounded-lg shadow-sm ${border ? 'border border-slate-200' : ''}`}
        style={{ backgroundColor: hex }}
      />
      <div className="flex flex-col">
        <span className="text-sm font-bold text-slate-900">{name}</span>
        <span className="text-xs font-mono text-slate-500">{hex}</span>
      </div>
    </div>
  );
}
