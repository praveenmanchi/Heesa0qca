import React from 'react';
import { motion } from 'motion/react';
import { ComponentPlayground } from '../components/ComponentPlayground';
import { FigmaEmbed } from '../components/FigmaEmbed';
import { Button } from '../components/Button';

export function Buttons() {
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
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Buttons</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          Buttons allow users to take actions, and make choices, with a single tap. They are used for primary actions like "Add to Bag" or "Checkout".
        </motion.p>
      </header>

      {/* Interactive Playground */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Interactive Playground</motion.h2>
        <motion.div variants={item}>
          <ComponentPlayground
            title="Button Component"
            description="Experiment with different button variants, sizes, and states."
            component={Button}
            controls={[
              { name: 'label', type: 'text', defaultValue: 'Add to Bag' },
              { name: 'variant', type: 'select', options: ['primary', 'secondary', 'tertiary'], defaultValue: 'primary' },
              { name: 'size', type: 'select', options: ['small', 'medium', 'large'], defaultValue: 'medium' },
              { name: 'disabled', type: 'boolean', defaultValue: false },
              { name: 'fullWidth', type: 'boolean', defaultValue: false },
            ]}
          />
        </motion.div>
      </section>

      {/* Figma Integration */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Design Specs (Figma)</motion.h2>
        <motion.div variants={item}>
          <p className="text-slate-600 mb-4">
            Live embed from our Figma design library. This ensures developers always have access to the latest redlines and specs.
          </p>
          {/* Example Figma Embed - using a generic public file for demo purposes */}
          <FigmaEmbed 
            title="Button Specifications"
            url="https://www.figma.com/file/LKQ4FJ4bTnCSjedbRpk931/Sample-File"
          />
        </motion.div>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Usage Guidelines</motion.h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-2">Do</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-2 text-sm">
              <li>Use the primary button for the main action on the page.</li>
              <li>Use sentence case for button labels (e.g., "Add to bag").</li>
              <li>Limit to one primary button per view to avoid confusion.</li>
            </ul>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-2">Don't</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-2 text-sm">
              <li>Don't use multiple primary buttons in a single group.</li>
              <li>Don't use generic labels like "Click here".</li>
              <li>Don't wrap button text onto multiple lines.</li>
            </ul>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
