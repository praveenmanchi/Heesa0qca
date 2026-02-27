import React from 'react';

interface BrandLogoProps {
  brandId: string;
  className?: string;
  color?: string;
}

export function BrandLogo({ brandId, className = "", color }: BrandLogoProps) {
  switch (brandId) {
    case 'gap':
      return (
        <div className={`flex items-center justify-center bg-[#00205B] aspect-square p-2 ${className}`}>
          <span className="text-white font-serif font-bold tracking-tighter text-2xl md:text-3xl leading-none">GAP</span>
        </div>
      );
    case 'oldnavy':
      return (
        <div className={`flex items-center justify-center bg-[#003764] rounded-full px-4 py-2 ${className}`}>
          <span className="text-white font-sans font-bold tracking-tight text-lg md:text-xl leading-none whitespace-nowrap">OLD NAVY</span>
        </div>
      );
    case 'bananarepublic':
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <div className="text-center">
            <span className="block font-serif font-bold tracking-widest text-lg md:text-xl leading-none text-[#1C1C1C]">BANANA</span>
            <span className="block font-serif font-bold tracking-widest text-lg md:text-xl leading-none text-[#1C1C1C]">REPUBLIC</span>
          </div>
        </div>
      );
    case 'athleta':
      return (
        <div className={`flex items-center justify-center ${className}`}>
          <span className="font-sans font-medium tracking-[0.2em] text-xl md:text-2xl text-[#4A2C40]">ATHLETA</span>
        </div>
      );
    case 'gapfactory':
      return (
        <div className={`flex flex-col items-center justify-center bg-[#00205B] aspect-square p-2 ${className}`}>
          <span className="text-white font-serif font-bold tracking-tighter text-2xl md:text-3xl leading-none">GAP</span>
          <span className="text-white font-sans font-medium tracking-wider text-[0.6rem] md:text-xs mt-1 uppercase">Factory</span>
        </div>
      );
    default:
      return null;
  }
}
