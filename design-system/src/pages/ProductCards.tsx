import React from 'react';
import { motion } from 'motion/react';
import { ComponentPlayground } from '../components/ComponentPlayground';
import { ProductCard } from '../components/ProductCard';

export function ProductCards() {
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
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Product Card</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          The fundamental unit of our commerce experience. Product cards display essential information and allow quick actions like "Add to Bag" or "Wishlist".
        </motion.p>
      </header>

      {/* Interactive Playground */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Interactive Playground</motion.h2>
        <motion.div variants={item}>
          <ComponentPlayground
            title="Product Card"
            description="Test different states including sales, badges, and new arrivals."
            component={ProductCard}
            controls={[
              { name: 'title', type: 'text', defaultValue: 'Vintage Slub-Knit Tee' },
              { name: 'price', type: 'text', defaultValue: '$24.99' },
              { name: 'salePrice', type: 'text', defaultValue: '' },
              { name: 'badge', type: 'text', defaultValue: 'Best Seller' },
              { name: 'isNew', type: 'boolean', defaultValue: true },
              { name: 'image', type: 'text', defaultValue: 'https://picsum.photos/seed/tee/400/500' },
            ]}
          />
        </motion.div>
      </section>

      {/* Anatomy */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Anatomy</motion.h2>
        <div className="grid md:grid-cols-2 gap-12">
          <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 flex items-center justify-center">
             <ProductCard 
                title="Anatomy Example" 
                price="$29.99" 
                salePrice="$15.00" 
                badge="50% OFF" 
                isNew={true}
                image="https://picsum.photos/seed/anatomy/400/500"
             />
          </div>
          <div className="space-y-6">
            <AnatomyItem number="1" title="Image Container" description="4:5 aspect ratio. Displays secondary image on hover (if available)." />
            <AnatomyItem number="2" title="Badges" description="Absolute positioned top-left. 'New' takes priority, followed by 'Sale' or 'Best Seller'." />
            <AnatomyItem number="3" title="Quick Actions" description="Heart and Quick Add buttons appear on hover in the bottom-right corner." />
            <AnatomyItem number="4" title="Product Title" description="Truncated to one line. Font: Inter Medium, 14px." />
            <AnatomyItem number="5" title="Pricing" description="Sale price in Red (#C0132D), original price struck through in Slate 400." />
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function AnatomyItem({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#003764] text-white flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <div>
        <h4 className="font-bold text-slate-900">{title}</h4>
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
