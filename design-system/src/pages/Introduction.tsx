import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { useBrand } from '../context/BrandContext';

export function Introduction() {
  const { currentBrand } = useBrand();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section 
        className="relative overflow-hidden rounded-3xl text-white p-8 lg:p-16 transition-colors duration-500"
        style={{ backgroundColor: currentBrand.colors.primary }}
      >
        <div className="relative z-10 max-w-2xl">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={currentBrand.name} // Re-animate on brand change
            className="text-4xl lg:text-6xl font-display font-black mb-6 tracking-tight"
            style={{ fontFamily: currentBrand.fonts.display }}
          >
            {currentBrand.name} <br/> Design System
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg lg:text-xl text-white/90 mb-8 leading-relaxed"
          >
            A comprehensive guide to building consistent, accessible, and delightful experiences for the {currentBrand.name} brand.
          </motion.p>
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all"
            style={{ color: currentBrand.colors.primary }}
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl opacity-10 -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black rounded-full blur-3xl opacity-10 -ml-16 -mb-16" />
      </section>

      {/* Principles Section */}
      <section>
        <h2 className="text-3xl font-display font-bold text-slate-900 mb-8">Core Principles</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <PrincipleCard 
            title="Expressive"
            description={`Designed to capture the unique spirit and voice of the ${currentBrand.name} brand.`}
            icon="🎉"
            color={currentBrand.colors.primary}
          />
          <PrincipleCard 
            title="Inclusive & Accessible"
            description="Fashion is for everyone. Ensure our digital experiences are usable by people of all abilities, backgrounds, and devices."
            icon="🤝"
            color={currentBrand.colors.primary}
          />
          <PrincipleCard 
            title="Clear & Direct"
            description="We value honesty and value. Communicate clearly, avoid jargon, and guide users effortlessly through their shopping journey."
            icon="🎯"
            color={currentBrand.colors.primary}
          />
        </div>
      </section>

      {/* Resources & Tooling */}
      <section>
        <h2 className="text-3xl font-display font-bold text-slate-900 mb-8">Design Tools</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <ResourceCard 
            title={`${currentBrand.name} Figma Library`}
            description={`The official source of truth for all ${currentBrand.name} UI components, styles, and assets.`}
            action="Open in Figma"
            icon="🎨"
            color={currentBrand.colors.primary}
          />
          <ResourceCard 
            title="Icon Library" 
            description={`A complete collection of ${currentBrand.name}'s iconography set, ready to drop into your designs.`}
            action="View Icons"
            icon="🧩"
            color={currentBrand.colors.primary}
          />
        </div>
      </section>

      {/* Usage Guidelines */}
      <section className="bg-slate-50 rounded-2xl p-8 lg:p-12 border border-slate-100">
        <h2 className="text-2xl font-display font-bold text-slate-900 mb-6">Using the System</h2>
        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-lg font-bold text-green-700 flex items-center gap-2 mb-4">
              <CheckCircle className="w-5 h-5" /> Do
            </h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                Use the primary brand color for the dominant actions.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                Maintain high contrast for text readability.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                Use standard spacing units (4px grid) for layout consistency.
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 mb-4">
              <XCircle className="w-5 h-5" /> Don't
            </h3>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
                Don't use unauthorized fonts or colors.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
                Don't clutter the interface with too many competing actions.
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2" />
                Don't ignore mobile responsiveness.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResourceCard({ title, description, action, icon, color }: { title: string, description: string, action: string, icon: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 hover:border-current transition-colors cursor-pointer group" style={{ color: 'inherit' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl">{icon}</div>
        <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-current transition-colors" style={{ color: undefined }} />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 mb-4">{description}</p>
      <span className="text-sm font-bold group-hover:underline" style={{ color }}>{action}</span>
    </div>
  );
}

function PrincipleCard({ title, description, icon, color }: { title: string, description: string, icon: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
      <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">{icon}</div>
      <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-current transition-colors" style={{ color: undefined }}>{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
