import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, Bell, User } from 'lucide-react';
import { SearchPalette } from './SearchPalette';
import { useBrand } from '../context/BrandContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { currentBrand } = useBrand();

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsSidebarOpen(false);
  };

  const showSidebar = currentPage !== 'home';

  // Dynamic styles based on current brand
  const brandStyles = {
    '--color-primary': currentBrand.colors.primary,
    '--color-secondary': currentBrand.colors.secondary,
    '--color-accent': currentBrand.colors.accent,
    '--color-background': currentBrand.colors.background,
    '--color-text': currentBrand.colors.text,
    '--font-display': currentBrand.fonts.display,
    '--font-body': currentBrand.fonts.body,
  } as React.CSSProperties;

  return (
    <div className="flex min-h-screen bg-slate-50" style={brandStyles}>
      <SearchPalette 
        open={isSearchOpen} 
        setOpen={setIsSearchOpen} 
        onNavigate={handleNavigate} 
      />

      {showSidebar && (
        <Sidebar 
          isOpen={isSidebarOpen} 
          isCollapsed={isSidebarCollapsed}
          onClose={() => setIsSidebarOpen(false)}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          onSearchClick={() => setIsSearchOpen(true)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Global Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {showSidebar && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-md lg:hidden"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            
            {/* Gap Inc Logo */}
            <div className="hidden md:flex items-center gap-3 border-r border-slate-200 pr-6 mr-4">
              <div className="bg-[#00205B] text-white px-3 py-2 font-serif font-bold text-sm tracking-widest uppercase shadow-sm">
                Gap Inc.
              </div>
            </div>

            <h1 className="text-lg font-bold text-slate-900 capitalize hidden md:block">
              {currentPage === 'home' ? 'Design System' : currentPage.replace('-', ' ')}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Current Brand Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200">
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                style={{ backgroundColor: currentBrand.colors.primary }}
              >
                {currentBrand.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-600">{currentBrand.name}</span>
            </div>

            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-300">
              <User className="w-4 h-4" />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-12 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
