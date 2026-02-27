import React from 'react';
import { motion } from 'motion/react';
import { Figma, ExternalLink, Copy } from 'lucide-react';

export function FigmaLibrary() {
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
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Figma Library</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          The official design resources for the Old Navy Design System. These libraries contain all the components, styles, and assets you need to design for Old Navy.
        </motion.p>
      </header>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Core Libraries</motion.h2>
        <div className="grid md:grid-cols-2 gap-6">
          <FigmaCard 
            title="Foundations" 
            description="Colors, Typography, Spacing, Grids, and Logos."
            url="https://www.figma.com/file/sample-foundations"
            updated="Updated 2 days ago"
          />
          <FigmaCard 
            title="Web Components" 
            description="Buttons, Inputs, Cards, Navigation, and more for Web."
            url="https://www.figma.com/file/sample-web-components"
            updated="Updated yesterday"
          />
          <FigmaCard 
            title="Mobile App Components" 
            description="iOS and Android specific components and patterns."
            url="https://www.figma.com/file/sample-mobile-components"
            updated="Updated 1 week ago"
          />
          <FigmaCard 
            title="Iconography" 
            description="The complete set of Old Navy product and UI icons."
            url="https://www.figma.com/file/sample-icons"
            updated="Updated 3 days ago"
          />
        </div>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">How to Enable</motion.h2>
        <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
          <ol className="list-decimal list-inside space-y-4 text-slate-700">
            <li>Open a design file in Figma.</li>
            <li>Click the <strong>Assets</strong> tab in the left sidebar.</li>
            <li>Click the <strong>Team Library</strong> (book icon) button.</li>
            <li>Search for "Old Navy" and toggle on the libraries listed above.</li>
          </ol>
        </div>
      </section>
    </motion.div>
  );
}

function FigmaCard({ title, description, url, updated }: { title: string, description: string, url: string, updated: string }) {
  return (
    <div className="group bg-white p-6 rounded-xl border border-slate-200 hover:border-[#003764] hover:shadow-md transition-all duration-200 flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-[#003764]/10 rounded-lg text-[#003764]">
          <Figma className="w-6 h-6" />
        </div>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 text-slate-400 hover:text-[#003764] hover:bg-slate-50 rounded-full transition-colors"
          title="Open in Figma"
        >
          <ExternalLink className="w-5 h-5" />
        </a>
      </div>
      
      <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-[#003764] transition-colors">{title}</h3>
      <p className="text-slate-600 text-sm mb-6 flex-1">{description}</p>
      
      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-400">{updated}</span>
        <button 
          className="text-[#003764] font-medium hover:underline flex items-center gap-1"
          onClick={() => navigator.clipboard.writeText(url)}
        >
          <Copy className="w-3 h-3" />
          Copy Link
        </button>
      </div>
    </div>
  );
}
