import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, FileText, Palette, Type, Grid, Box, Layers, Component, ShoppingBag, Hash, Accessibility } from 'lucide-react';

interface SearchPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onNavigate: (page: string) => void;
}

export function SearchPalette({ open, setOpen, onNavigate }: SearchPaletteProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  const handleSelect = (page: string) => {
    onNavigate(page);
    setOpen(false);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Search"
      className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
    >
      <div className="flex items-center border-b border-slate-100 px-4">
        <Search className="w-5 h-5 text-slate-400 mr-3" />
        <Command.Input 
          placeholder="Search documentation..." 
          className="w-full py-4 text-slate-900 placeholder:text-slate-400 focus:outline-none text-base"
        />
      </div>
      
      <Command.List className="max-h-[60vh] overflow-y-auto p-2">
        <Command.Empty className="py-6 text-center text-slate-500 text-sm">No results found.</Command.Empty>

        <Command.Group heading="Foundations" className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
          <CommandItem icon={FileText} label="Introduction" onSelect={() => handleSelect('introduction')} />
          <CommandItem icon={Palette} label="Color" onSelect={() => handleSelect('color')} />
          <CommandItem icon={Type} label="Typography" onSelect={() => handleSelect('typography')} />
          <CommandItem icon={Box} label="Iconography" onSelect={() => handleSelect('iconography')} />
          <CommandItem icon={Layers} label="Logo" onSelect={() => handleSelect('logo')} />
          <CommandItem icon={Hash} label="Spacing" onSelect={() => handleSelect('spacing')} />
          <CommandItem icon={Grid} label="Grid System" onSelect={() => handleSelect('grid')} />
          <CommandItem icon={Box} label="Shape" onSelect={() => handleSelect('shape')} />
        </Command.Group>

        <Command.Group heading="Components" className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 mt-4">
          <CommandItem icon={Component} label="Buttons" onSelect={() => handleSelect('buttons')} />
          <CommandItem icon={ShoppingBag} label="Product Card" onSelect={() => handleSelect('product-card')} />
        </Command.Group>

        <Command.Group heading="Resources" className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2 mt-4">
          <CommandItem icon={Hash} label="Design Tokens" onSelect={() => handleSelect('tokens')} />
          <CommandItem icon={Accessibility} label="Accessibility" onSelect={() => handleSelect('accessibility')} />
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

function CommandItem({ icon: Icon, label, onSelect }: { icon: any, label: string, onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex items-center px-3 py-3 rounded-lg text-slate-700 text-sm cursor-pointer hover:bg-slate-100 aria-selected:bg-[#003764] aria-selected:text-white transition-colors group"
    >
      <Icon className="w-4 h-4 mr-3 text-slate-400 group-aria-selected:text-white/70" />
      {label}
    </Command.Item>
  );
}
