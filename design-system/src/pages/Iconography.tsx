import React from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  ShoppingBag, 
  User, 
  Menu, 
  ChevronRight, 
  Heart, 
  MapPin, 
  X,
  Check,
  AlertCircle
} from 'lucide-react';

export function Iconography() {
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
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Iconography</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          Icons are visual cues that help users understand and navigate the interface. Old Navy's iconography is friendly, rounded, and clear, aligning with our optimistic brand personality.
        </motion.p>
      </header>

      {/* Principles */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Principles</motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          <PrincipleCard 
            title="Simple" 
            description="Icons should be reductive. Remove unnecessary details to ensure clarity at small sizes."
            example={<Search className="w-8 h-8 text-[#00205B]" />}
          />
          <PrincipleCard 
            title="Friendly" 
            description="Use rounded corners and terminals to convey a welcoming and approachable feel."
            example={<Heart className="w-8 h-8 text-[#00205B]" />}
          />
          <PrincipleCard 
            title="Consistent" 
            description="Maintain uniform stroke weights (2px) and optical balance across the entire set."
            example={<ShoppingBag className="w-8 h-8 text-[#00205B]" />}
          />
        </div>
      </section>

      {/* Visual Style */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Visual Style</motion.h2>
        <div className="grid md:grid-cols-2 gap-12">
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Stroke & Terminals</h3>
            <p className="text-slate-600">
              We use a consistent <strong>2px stroke width</strong> for all icons at standard sizes (24px). Terminals and joins should be <strong>rounded</strong> to soften the appearance.
            </p>
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 flex items-center justify-center gap-12">
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg shadow-sm mb-3">
                  <User className="w-12 h-12 text-[#00205B]" strokeWidth={2} />
                </div>
                <span className="text-sm font-mono text-slate-500">2px Stroke</span>
              </div>
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg shadow-sm mb-3">
                  <Menu className="w-12 h-12 text-[#00205B]" strokeLinecap="round" strokeLinejoin="round" />
                </div>
                <span className="text-sm font-mono text-slate-500">Round Caps</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Grid & Keylines</h3>
            <p className="text-slate-600">
              Icons are designed on a <strong>24x24 pixel grid</strong>. Key shapes (circles, squares) are optically balanced to feel equal in weight.
            </p>
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 flex items-center justify-center relative overflow-hidden">
              {/* Grid overlay simulation */}
              <div className="absolute inset-0 opacity-10" 
                style={{ 
                  backgroundImage: 'linear-gradient(#00205B 1px, transparent 1px), linear-gradient(90deg, #00205B 1px, transparent 1px)', 
                  backgroundSize: '20px 20px' 
                }} 
              />
              <ShoppingBag className="w-24 h-24 text-[#00205B] relative z-10" strokeWidth={1} />
            </div>
          </div>
        </div>
      </section>

      {/* Sizing */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Sizes</motion.h2>
        <div className="space-y-8">
          <SizeRow size="16px" name="Small" useCase="Input fields, metadata, dense UI" icon={<Search className="w-4 h-4" />} />
          <SizeRow size="20px" name="Medium" useCase="Buttons, list items, navigation" icon={<Search className="w-5 h-5" />} />
          <SizeRow size="24px" name="Standard" useCase="Primary navigation, toolbars (Default)" icon={<Search className="w-6 h-6" />} />
          <SizeRow size="32px" name="Large" useCase="Empty states, feature highlights" icon={<Search className="w-8 h-8" />} />
        </div>
      </section>

      {/* Common Icons */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Common Icons</motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <IconShowcase icon={Search} name="Search" />
          <IconShowcase icon={ShoppingBag} name="Bag" />
          <IconShowcase icon={User} name="Profile" />
          <IconShowcase icon={Heart} name="Favorites" />
          <IconShowcase icon={MapPin} name="Store" />
          <IconShowcase icon={Menu} name="Menu" />
          <IconShowcase icon={ChevronRight} name="Chevron" />
          <IconShowcase icon={X} name="Close" />
          <IconShowcase icon={Check} name="Success" />
          <IconShowcase icon={AlertCircle} name="Alert" />
        </div>
      </section>
    </motion.div>
  );
}

function PrincipleCard({ title, description, example }: { title: string, description: string, example: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      <div className="mb-4 p-4 bg-slate-50 rounded-lg inline-block">
        {example}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function SizeRow({ size, name, useCase, icon }: { size: string, name: string, useCase: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-8 p-4 bg-white border border-slate-100 rounded-lg hover:border-slate-300 transition-colors">
      <div className="w-24 flex flex-col items-center justify-center gap-2">
        <div className="bg-slate-100 p-4 rounded-md text-[#00205B]">
          {icon}
        </div>
      </div>
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Size</span>
          <span className="font-mono text-slate-900">{size}</span>
        </div>
        <div>
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Name</span>
          <span className="font-medium text-slate-900">{name}</span>
        </div>
        <div>
          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Use Case</span>
          <span className="text-sm text-slate-600">{useCase}</span>
        </div>
      </div>
    </div>
  );
}

function IconShowcase({ icon: Icon, name }: { icon: any, name: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200 hover:bg-white hover:shadow-md transition-all cursor-pointer group">
      <Icon className="w-6 h-6 text-slate-600 group-hover:text-[#00205B] transition-colors mb-3" />
      <span className="text-xs font-medium text-slate-500 group-hover:text-slate-900">{name}</span>
    </div>
  );
}
