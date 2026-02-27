import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Code, PenTool, GitBranch, CheckCircle, AlertTriangle } from 'lucide-react';

export function Playbook() {
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
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Playbook</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          The definitive guide to working with the Old Navy Design System. Whether you're a designer or developer, this playbook outlines our workflows, contribution models, and best practices.
        </motion.p>
      </header>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">For Designers</motion.h2>
        <div className="grid md:grid-cols-2 gap-8">
          <PlaybookCard 
            icon={PenTool}
            title="Starting a Project"
            steps={[
              "Enable the 'ONDS Foundations' and 'ONDS Web Components' libraries in Figma.",
              "Use local variables for all colors and spacing. Do not hardcode values.",
              "Detach components only as a last resort. If you must detach, leave a comment explaining why."
            ]}
          />
          <PlaybookCard 
            icon={GitBranch}
            title="Handoff Process"
            steps={[
              "Clean up your file. Remove exploration artboards.",
              "Wrap final designs in a Section labeled 'Ready for Dev'.",
              "Link to the relevant Jira ticket in the file description.",
              "Use the 'Redlines' plugin to annotate complex interactions."
            ]}
          />
        </div>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">For Developers</motion.h2>
        <div className="grid md:grid-cols-2 gap-8">
          <PlaybookCard 
            icon={Code}
            title="Implementation"
            steps={[
              "Check the 'Tokens' page first. Use CSS variables (e.g., var(--color-brand-1)) instead of hex codes.",
              "Use the Component Playground to test props before implementing.",
              "If a component doesn't exist, check if it can be composed from existing atoms."
            ]}
          />
          <PlaybookCard 
            icon={CheckCircle}
            title="Quality Assurance"
            steps={[
              "Verify accessibility: All interactive elements must have focus states.",
              "Check responsiveness: Components should be fluid, not fixed width.",
              "Run the linter before committing to ensure code style consistency."
            ]}
          />
        </div>
      </section>

      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Contribution Model</motion.h2>
        <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-100 text-yellow-700 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">When to contribute?</h3>
              <p className="text-slate-600 mb-4 leading-relaxed">
                If you find yourself detaching a component more than 3 times, or if you're building a pattern that will be used in multiple places, it's time to propose a contribution.
              </p>
              <div className="flex gap-4">
                <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                  Submit Proposal
                </button>
                <button className="px-4 py-2 bg-[#003764] text-white rounded-lg text-sm font-bold hover:bg-[#003764]/90 transition-colors">
                  View Roadmap
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function PlaybookCard({ icon: Icon, title, steps }: { icon: any, title: string, steps: string[] }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg text-[#003764]">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
      </div>
      <ul className="space-y-4">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-3 text-slate-600 text-sm leading-relaxed">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold mt-0.5">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ul>
    </div>
  );
}
