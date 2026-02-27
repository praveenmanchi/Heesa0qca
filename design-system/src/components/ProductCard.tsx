import React from 'react';
import { Heart, ShoppingBag } from 'lucide-react';

interface ProductCardProps {
  image: string;
  title: string;
  price: string;
  salePrice?: string;
  badge?: string;
  isNew?: boolean;
  onAddToCart?: () => void;
}

export function ProductCard({ 
  image = "https://picsum.photos/400/500", 
  title = "Everyday Cotton Tee", 
  price = "$24.99", 
  salePrice, 
  badge,
  isNew,
  onAddToCart 
}: ProductCardProps) {
  return (
    <div className="group w-full max-w-sm bg-white rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-transparent hover:border-slate-100">
      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {isNew && (
            <span className="bg-[var(--color-primary)] text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
              New Arrival
            </span>
          )}
          {badge && (
            <span className="bg-[var(--color-accent)] text-white text-[10px] font-bold px-2 py-1 uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform translate-y-2 group-hover:translate-y-0">
          <button className="bg-white p-2 rounded-full shadow-md hover:bg-slate-50 text-slate-900 transition-colors" aria-label="Add to wishlist">
            <Heart className="w-5 h-5" />
          </button>
          <button 
            onClick={onAddToCart}
            className="bg-[var(--color-primary)] p-2 rounded-full shadow-md hover:opacity-90 text-white transition-colors" 
            aria-label="Quick add to bag"
          >
            <ShoppingBag className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="p-4">
        <h3 className="font-sans font-medium text-slate-900 text-sm mb-1 truncate">{title}</h3>
        <div className="flex items-baseline gap-2">
          {salePrice ? (
            <>
              <span className="font-bold text-[var(--color-accent)] text-sm">{salePrice}</span>
              <span className="text-xs text-slate-400 line-through">{price}</span>
            </>
          ) : (
            <span className="font-bold text-slate-900 text-sm">{price}</span>
          )}
        </div>
      </div>
    </div>
  );
}
