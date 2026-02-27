import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Brand, brands } from '../data/brands';

interface BrandContextType {
  currentBrand: Brand;
  setBrand: (brandId: string) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [currentBrandId, setCurrentBrandId] = useState<string>('gap');

  const setBrand = (brandId: string) => {
    if (brands[brandId]) {
      setCurrentBrandId(brandId);
    }
  };

  const value = {
    currentBrand: brands[currentBrandId],
    setBrand,
  };

  return (
    <BrandContext.Provider value={value}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
