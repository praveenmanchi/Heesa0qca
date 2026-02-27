import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ExternalLink, Play } from 'lucide-react';
import { useBrand } from '../context/BrandContext';
import { brands } from '../data/brands';
import { BrandLogo } from '../components/BrandLogo';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
  const { setBrand } = useBrand();

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const handleBrandClick = (brandId: string) => {
    setBrand(brandId);
    onNavigate('introduction');
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="bg-white">
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[600px] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://picsum.photos/seed/gapinc_hero/1920/1080" 
            alt="Gap Inc Lifestyle" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/30"></div>
        </div>
        
        <div className="relative z-10 h-full flex flex-col justify-center items-center text-center px-6 max-w-5xl mx-auto">
          <motion.h1 
            variants={item}
            className="text-5xl md:text-7xl lg:text-8xl font-serif text-white mb-8 leading-tight"
          >
            What starts here shapes <span className="italic">culture.</span>
          </motion.h1>
          <motion.div variants={item}>
            <button className="bg-white text-[#00205B] px-10 py-5 rounded-full font-serif font-bold tracking-widest uppercase text-sm hover:bg-slate-100 hover:scale-105 transition-all duration-300 shadow-lg border-2 border-transparent hover:border-white/50">
              Explore Design System
            </button>
          </motion.div>
        </div>
      </section>

      {/* Introduction Text */}
      <section className="py-24 px-6 max-w-4xl mx-auto text-center">
        <motion.h2 variants={item} className="text-4xl md:text-5xl font-serif text-slate-900 mb-6">
          Imagining Better
        </motion.h2>
        <motion.p variants={item} className="text-lg md:text-xl text-slate-600 leading-relaxed">
          We are building a high-performing house of iconic American brands that shape culture. 
          From the clothes we create to the communities we engage to the culture we shape, 
          everything we do is designed to imagine better.
        </motion.p>
      </section>

      {/* Brand Navigation Grid */}
      <section className="py-12 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <motion.div variants={item} className="mb-16 text-center">
             <h2 className="text-3xl md:text-4xl font-serif text-slate-900 mb-4">Our Brands</h2>
             <p className="text-slate-500 max-w-2xl mx-auto">Four brands, one company, one culture.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.values(brands).map((brand) => (
              <motion.button
                key={brand.id}
                variants={item}
                onClick={() => handleBrandClick(brand.id)}
                className="group relative bg-white aspect-[3/4] w-full overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col"
              >
                {/* Brand Image Placeholder */}
                <div className="absolute inset-0 bg-slate-200 transition-transform duration-700 group-hover:scale-105">
                   <img 
                      src={`https://picsum.photos/seed/${brand.id}/800/1000`} 
                      alt={brand.name}
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      referrerPolicy="no-referrer"
                   />
                   <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 p-8 flex flex-col justify-end items-start text-left z-10">
                  <div className="bg-white/95 backdrop-blur-sm p-6 w-full transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-lg">
                    
                    {/* Brand Logo */}
                    <div className="mb-4 h-16 flex items-center justify-start">
                      <BrandLogo brandId={brand.id} className={brand.id === 'gap' || brand.id === 'gapfactory' ? 'h-12 w-12' : ''} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold tracking-widest uppercase text-slate-500 group-hover:text-slate-900 transition-colors">
                        View System
                      </span>
                      <ArrowRight className="w-5 h-5 text-slate-900 transform -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                    </div>
                  </div>
                </div>
                
                {/* Brand Color Strip */}
                <div 
                  className="absolute top-0 left-0 w-full h-1 transform -translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20"
                  style={{ backgroundColor: brand.colors.primary }}
                />
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Updates Section */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12 border-b border-slate-200 pb-6">
          <h2 className="text-3xl font-serif text-slate-900">The Latest</h2>
          <button className="text-sm font-bold uppercase tracking-widest text-slate-900 hover:underline">All News</button>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: "Gap Inc. Launches Encore", date: "February 24, 2026", image: "https://picsum.photos/seed/news1/600/400" },
            { title: "Fashion Institute Honors Gap Inc.", date: "February 20, 2026", image: "https://picsum.photos/seed/news2/600/400" },
            { title: "New Accessibility Standards", date: "February 15, 2026", image: "https://picsum.photos/seed/news3/600/400" }
          ].map((news, i) => (
            <motion.div key={i} variants={item} className="group cursor-pointer">
              <div className="overflow-hidden mb-4 aspect-video bg-slate-100">
                <img 
                  src={news.image} 
                  alt={news.title} 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Press Release</div>
              <h3 className="text-xl font-serif font-medium text-slate-900 mb-2 group-hover:underline decoration-1 underline-offset-4">{news.title}</h3>
              <p className="text-sm text-slate-500">{news.date}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Stock/Footer Info */}
      <section className="bg-slate-50 py-24 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="text-center md:text-left">
            <h2 className="text-4xl font-serif text-slate-900 mb-2">Gap Inc.</h2>
            <p className="text-slate-500 max-w-md">
              NYSE: GPS | as of February 25, 2026
            </p>
          </div>
          <div className="text-center md:text-right">
             <div className="text-6xl font-serif text-slate-900 mb-2">$27.18</div>
             <div className="text-red-600 font-medium text-sm">▼ -0.26 (-0.95%)</div>
          </div>
        </div>
      </section>

      {/* Main Footer */}
      <footer className="bg-white py-12 px-6 border-t border-slate-200">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-slate-900 mb-6">Company</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><a href="#" className="hover:text-slate-900">About</a></li>
              <li><a href="#" className="hover:text-slate-900">Careers</a></li>
              <li><a href="#" className="hover:text-slate-900">Investors</a></li>
              <li><a href="#" className="hover:text-slate-900">Sustainability</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-slate-900 mb-6">Brands</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><a href="#" className="hover:text-slate-900">Old Navy</a></li>
              <li><a href="#" className="hover:text-slate-900">Gap</a></li>
              <li><a href="#" className="hover:text-slate-900">Banana Republic</a></li>
              <li><a href="#" className="hover:text-slate-900">Athleta</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-slate-900 mb-6">Follow Us</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><a href="#" className="hover:text-slate-900">LinkedIn</a></li>
              <li><a href="#" className="hover:text-slate-900">Twitter</a></li>
              <li><a href="#" className="hover:text-slate-900">Instagram</a></li>
              <li><a href="#" className="hover:text-slate-900">Facebook</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-widest text-slate-900 mb-6">Help</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><a href="#" className="hover:text-slate-900">Contact Us</a></li>
              <li><a href="#" className="hover:text-slate-900">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-slate-900">Terms of Use</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>© 2026 Gap Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-slate-900">Privacy</a>
            <a href="#" className="hover:text-slate-900">Terms</a>
            <a href="#" className="hover:text-slate-900">CA Supply Chains Act</a>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
