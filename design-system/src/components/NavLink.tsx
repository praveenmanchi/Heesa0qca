import React from 'react';
import { LucideIcon } from 'lucide-react';

interface NavLinkProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  isCollapsed?: boolean;
}

export function NavLink({ icon: Icon, label, isActive, onClick, disabled, isCollapsed }: NavLinkProps) {
  if (disabled) {
    return (
      <div className={`flex items-center px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed ${isCollapsed ? 'justify-center' : ''}`}>
        <Icon className={`w-5 h-5 opacity-50 ${isCollapsed ? '' : 'mr-3'}`} />
        {!isCollapsed && (
          <>
            {label}
            <span className="ml-auto text-[10px] font-bold bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">SOON</span>
          </>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
        ${isActive 
          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' 
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
        ${isCollapsed ? 'justify-center' : ''}
      `}
      title={isCollapsed ? label : undefined}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-[var(--color-primary)]' : 'text-slate-400'} ${isCollapsed ? '' : 'mr-3'}`} />
      {!isCollapsed && label}
    </button>
  );
}
