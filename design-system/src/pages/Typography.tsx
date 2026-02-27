import React from 'react';
import { motion } from 'motion/react';

export function Typography() {
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
        <motion.h1 variants={item} className="text-4xl font-display font-bold text-slate-900 mb-4">Typography</motion.h1>
        <motion.p variants={item} className="text-xl text-slate-600 max-w-3xl leading-relaxed">
          Our typography is bold, expressive, and legible. We use a geometric sans-serif for headings to convey our fun, modern brand personality, and a clean sans-serif for body text to ensure readability across all devices.
        </motion.p>
      </header>

      {/* Principles */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Principles</motion.h2>
        <div className="grid md:grid-cols-3 gap-6">
          <PrincipleCard 
            title="Readable" 
            description="Legibility is paramount. We use generous line heights and distinct weights to ensure content is easy to scan."
          />
          <PrincipleCard 
            title="Expressive" 
            description="Headings are set in Montserrat to bring a geometric, friendly character that aligns with our brand voice."
          />
          <PrincipleCard 
            title="Hierarchical" 
            description="Clear size and weight contrast guides the user's eye through the content hierarchy effortlessly."
          />
        </div>
      </section>

      {/* Font Families */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Font Families</motion.h2>
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div variants={item} className="bg-slate-50 p-8 rounded-xl border border-slate-200">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="text-2xl font-display font-bold text-slate-900">ON Serif Display</h3>
              <span className="px-2 py-1 bg-[#003764] text-white text-xs font-bold rounded uppercase">Headings</span>
            </div>
            <p className="text-slate-600 mb-6 text-sm">Used for expressive headlines and brand moments. (Visual fallback: Montserrat)</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm text-slate-500">Regular (400)</span>
                <span className="font-display font-normal text-xl">Old Navy Design</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm text-slate-500">Medium (500)</span>
                <span className="font-display font-medium text-xl">Old Navy Design</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm text-slate-500">Bold (700)</span>
                <span className="font-display font-bold text-xl">Old Navy Design</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm text-slate-500">Black (900)</span>
                <span className="font-display font-black text-xl">Old Navy Design</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="bg-slate-50 p-8 rounded-xl border border-slate-200">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="text-2xl font-sans font-bold text-slate-900">ON Sans Text</h3>
              <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded uppercase">Body</span>
            </div>
            <p className="text-slate-600 mb-6 text-sm">Used for body copy, UI elements, and functional text. (Visual fallback: Inter)</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm text-slate-500">Regular (400)</span>
                <span className="font-sans font-normal text-xl">Old Navy Design</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm text-slate-500">Medium (500)</span>
                <span className="font-sans font-medium text-xl">Old Navy Design</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="w-24 text-sm text-slate-500">Bold (700)</span>
                <span className="font-sans font-bold text-xl">Old Navy Design</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Type Scale */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Type Scale</motion.h2>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">Example</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Token</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Size</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Weight</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Letter Spacing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <TypeRow 
                example={<h1 className="text-7xl font-display font-normal">Display 120</h1>}
                token="size-120"
                size="120px"
                weight="Regular (400)"
                spacing="-0.02em"
              />
              <TypeRow 
                example={<h2 className="text-6xl font-display font-normal">Display 90</h2>}
                token="size-90"
                size="90px"
                weight="Regular (400)"
                spacing="-0.02em"
              />
              <TypeRow 
                example={<h3 className="text-5xl font-display font-normal">Display 60</h3>}
                token="size-60"
                size="60px"
                weight="Regular (400)"
                spacing="-0.02em"
              />
              <TypeRow 
                example={<h4 className="text-4xl font-display font-normal">Display 48</h4>}
                token="size-48"
                size="48px"
                weight="Regular (400)"
                spacing="-0.01em"
              />
              <TypeRow 
                example={<h5 className="text-3xl font-display font-bold">Heading 34</h5>}
                token="size-34"
                size="34px"
                weight="Bold (700)"
                spacing="-0.01em"
              />
              <TypeRow 
                example={<h6 className="text-2xl font-display font-bold">Heading 24</h6>}
                token="size-24"
                size="24px"
                weight="Bold (700)"
                spacing="0"
              />
              <TypeRow 
                example={<p className="text-xl font-sans font-bold">Body 20</p>}
                token="size-20"
                size="20px"
                weight="Bold (700)"
                spacing="0"
              />
              <TypeRow 
                example={<p className="text-lg font-sans">Body 16</p>}
                token="size-16"
                size="16px"
                weight="Regular (400)"
                spacing="0"
              />
              <TypeRow 
                example={<p className="text-base font-sans">Body 14</p>}
                token="size-14"
                size="14px"
                weight="Regular (400)"
                spacing="0"
              />
              <TypeRow 
                example={<p className="text-sm font-sans">Body 12</p>}
                token="size-12"
                size="12px"
                weight="Regular (400)"
                spacing="0"
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* Applying Typography */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">Applying Typography</motion.h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Hierarchy & Pairing</h3>
            <p className="text-slate-600 mb-6">
              Establish clear hierarchy by pairing <strong>Montserrat</strong> headings with <strong>Inter</strong> body text. Use size and weight to guide the user's eye.
            </p>
            <div className="bg-white p-6 rounded-lg border border-slate-100 space-y-2">
              <h4 className="font-display font-bold text-2xl text-[#00205B]">New Arrivals</h4>
              <p className="font-sans text-slate-600">Check out the latest styles for the whole family. From cozy sweaters to activewear, we have it all.</p>
              <button className="text-sm font-bold text-[#00205B] uppercase tracking-wide mt-2">Shop Now</button>
            </div>
          </div>
          <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Color & Contrast</h3>
            <p className="text-slate-600 mb-6">
              Text should primarily be <strong>Slate 900</strong> on light backgrounds. Use <strong>Slate 600</strong> for secondary text to create depth.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 rounded"></div>
                <div>
                  <div className="font-bold text-slate-900">Primary Text</div>
                  <div className="text-xs font-mono text-slate-500">Slate 900</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-600 rounded"></div>
                <div>
                  <div className="font-bold text-slate-600">Secondary Text</div>
                  <div className="text-xs font-mono text-slate-500">Slate 600</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UI Text & Buttons */}
      <section>
        <motion.h2 variants={item} className="text-2xl font-display font-bold text-slate-900 mb-6 pb-2 border-b border-slate-200">UI Text</motion.h2>
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div variants={item} className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Buttons</h3>
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <button className="bg-[#00205B] text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-[#00205B]/90">
                  Primary Button
                </button>
                <span className="font-mono text-xs text-slate-500">14px / Bold / Uppercase</span>
              </div>
              <div className="flex items-center justify-between">
                <button className="bg-white text-[#00205B] border-2 border-[#00205B] px-6 py-3 rounded-full font-bold text-sm hover:bg-blue-50">
                  Secondary Button
                </button>
                <span className="font-mono text-xs text-slate-500">14px / Bold / Uppercase</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={item} className="space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Labels & Captions</h3>
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category Label</span>
                <span className="font-mono text-xs text-slate-500">12px / Bold / Tracking 0.05em</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Helper text or caption goes here.</span>
                <span className="font-mono text-xs text-slate-500">12px / Regular</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.div>
  );
}

function PrincipleCard({ title, description }: { title: string, description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200">
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function TypeRow({ example, token, size, weight, spacing }: { example: React.ReactNode, token: string, size: string, weight: string, spacing: string }) {
  return (
    <tr className="group hover:bg-slate-50 transition-colors">
      <td className="p-4 align-middle text-slate-900">{example}</td>
      <td className="p-4 align-middle font-mono text-xs text-slate-500">{token}</td>
      <td className="p-4 align-middle font-mono text-xs text-slate-500">{size}</td>
      <td className="p-4 align-middle font-mono text-xs text-slate-500">{weight}</td>
      <td className="p-4 align-middle font-mono text-xs text-slate-500">{spacing}</td>
    </tr>
  );
}
