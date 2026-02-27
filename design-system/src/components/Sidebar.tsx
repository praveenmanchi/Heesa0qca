import React, { useState } from 'react';
import { NavLink } from './NavLink';
import { useBrand } from '../context/BrandContext';
import { brands } from '../data/brands';
import { 
  LayoutTemplate, 
  Palette, 
  Type, 
  BookOpen, 
  Component, 
  Layers,
  Menu,
  X,
  Image,
  MoveHorizontal,
  Grid3X3,
  Square,
  ShoppingBag,
  Hash,
  Accessibility,
  Search,
  ChevronLeft,
  ChevronRight,
  Figma,
  ChevronDown
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
  onSearchClick: () => void;
}

export function Sidebar({ isOpen, isCollapsed, onClose, onToggleCollapse, currentPage, onNavigate, onSearchClick }: SidebarProps) {
  const { currentBrand, setBrand } = useBrand();
  const [isBrandMenuOpen, setIsBrandMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full bg-slate-50 border-r border-slate-200
        transform transition-all duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header & Brand Switcher */}
          <div className={`flex flex-col border-b border-slate-200 bg-white transition-all duration-300 ${isCollapsed ? 'px-4 py-4 items-center' : 'px-6 pt-6 pb-4'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} mb-4 w-full relative`}>
              {/* Brand Selector Trigger */}
              <button 
                onClick={() => !isCollapsed && setIsBrandMenuOpen(!isBrandMenuOpen)}
                className={`flex items-center gap-2 font-display font-bold text-xl text-[var(--color-primary)] hover:opacity-80 transition-opacity ${isCollapsed ? 'cursor-default' : 'cursor-pointer'}`}
              >
                {isCollapsed ? (
                  <div className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs" style={{ backgroundColor: currentBrand.colors.primary }}>
                    {currentBrand.name.substring(0, 2).toUpperCase()}
                  </div>
                ) : (
                  <>
                    <span>{currentBrand.name}</span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </>
                )}
              </button>

              {/* Brand Dropdown */}
              {isBrandMenuOpen && !isCollapsed && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsBrandMenuOpen(false)} />
                  <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-20 py-2">
                    {Object.values(brands).map(brand => (
                      <button
                        key={brand.id}
                        onClick={() => {
                          setBrand(brand.id);
                          setIsBrandMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 transition-colors"
                      >
                        <div className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: brand.colors.primary }}>
                          {brand.name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className={`text-sm font-medium ${currentBrand.id === brand.id ? 'text-slate-900' : 'text-slate-500'}`}>
                          {brand.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button 
                onClick={onClose}
                className="lg:hidden p-1 hover:bg-slate-100 rounded-md"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {/* Search Trigger */}
            <button 
              onClick={onSearchClick}
              className={`
                flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors group
                ${isCollapsed ? 'w-10 h-10 justify-center p-0' : 'w-full px-3 py-2'}
              `}
              title="Search (Cmd+K)"
            >
              <Search className="w-4 h-4" />
              {!isCollapsed && (
                <>
                  <span>Search...</span>
                  <span className="ml-auto text-xs bg-white px-1.5 py-0.5 rounded border border-slate-200 group-hover:border-blue-200">⌘K</span>
                </>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            {!isCollapsed && (
              <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider transition-opacity duration-200">
                Overview
              </div>
            )}
            <NavLink 
              icon={LayoutTemplate} 
              label="Home" 
              isActive={currentPage === 'home'}
              onClick={() => onNavigate('home')}
              isCollapsed={isCollapsed}
            />
            <NavLink 
              icon={BookOpen} 
              label="Introduction" 
              isActive={currentPage === 'introduction'}
              onClick={() => onNavigate('introduction')}
              isCollapsed={isCollapsed}
            />
            <NavLink 
              icon={Figma} 
              label="Figma Library" 
              isActive={currentPage === 'figma-library'}
              onClick={() => onNavigate('figma-library')}
              isCollapsed={isCollapsed}
            />
            <NavLink 
              icon={BookOpen} 
              label="Playbook" 
              isActive={currentPage === 'playbook'}
              onClick={() => onNavigate('playbook')}
              isCollapsed={isCollapsed}
            />

            {!isCollapsed && (
              <div className="mt-8 px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider transition-opacity duration-200">
                Foundations
              </div>
            )}
            <div className={isCollapsed ? 'mt-4 space-y-1' : 'space-y-1'}>
              <NavLink icon={Palette} label="Color" isActive={currentPage === 'color'} onClick={() => onNavigate('color')} isCollapsed={isCollapsed} />
              <NavLink icon={Type} label="Typography" isActive={currentPage === 'typography'} onClick={() => onNavigate('typography')} isCollapsed={isCollapsed} />
              <NavLink icon={Layers} label="Iconography" isActive={currentPage === 'iconography'} onClick={() => onNavigate('iconography')} isCollapsed={isCollapsed} />
              <NavLink icon={Image} label="Logo" isActive={currentPage === 'logo'} onClick={() => onNavigate('logo')} isCollapsed={isCollapsed} />
              <NavLink icon={MoveHorizontal} label="Spacing" isActive={currentPage === 'spacing'} onClick={() => onNavigate('spacing')} isCollapsed={isCollapsed} />
              <NavLink icon={Grid3X3} label="Grid System" isActive={currentPage === 'grid'} onClick={() => onNavigate('grid')} isCollapsed={isCollapsed} />
              <NavLink icon={Square} label="Shape" isActive={currentPage === 'shape'} onClick={() => onNavigate('shape')} isCollapsed={isCollapsed} />
            </div>

            {!isCollapsed && (
              <div className="mt-8 px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider transition-opacity duration-200">
                Components
              </div>
            )}
            <div className={isCollapsed ? 'mt-4 space-y-1' : 'space-y-1'}>
              <NavLink icon={Component} label="Buttons" isActive={currentPage === 'buttons'} onClick={() => onNavigate('buttons')} isCollapsed={isCollapsed} />
              <NavLink icon={ShoppingBag} label="Product Card" isActive={currentPage === 'product-card'} onClick={() => onNavigate('product-card')} isCollapsed={isCollapsed} />
            </div>

            {!isCollapsed && (
              <div className="mt-8 px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider transition-opacity duration-200">
                Resources
              </div>
            )}
            <div className={isCollapsed ? 'mt-4 space-y-1' : 'space-y-1'}>
              <NavLink icon={Hash} label="Design Tokens" isActive={currentPage === 'tokens'} onClick={() => onNavigate('tokens')} isCollapsed={isCollapsed} />
              <NavLink icon={Accessibility} label="Accessibility" isActive={currentPage === 'accessibility'} onClick={() => onNavigate('accessibility')} isCollapsed={isCollapsed} />
            </div>
          </nav>

          {/* Collapse Toggle */}
          <div className="p-4 border-t border-slate-200 hidden lg:flex justify-end">
            <button 
              onClick={onToggleCollapse}
              className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
