import React from 'react';

// This is a reusable button component for the design system
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  label = "Button", 
  variant = 'primary', 
  size = 'medium', 
  disabled = false,
  fullWidth = false
}) => {
  const baseStyles = "rounded-full font-bold transition-all duration-200 flex items-center justify-center";
  
  const variants = {
    primary: "bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95",
    secondary: "bg-white text-[var(--color-primary)] border-2 border-[var(--color-primary)] hover:bg-slate-50 active:scale-95",
    tertiary: "text-[var(--color-primary)] hover:underline bg-transparent"
  };

  const sizes = {
    small: "px-4 py-2 text-xs",
    medium: "px-6 py-3 text-sm",
    large: "px-8 py-4 text-base"
  };

  const disabledStyles = "opacity-50 cursor-not-allowed pointer-events-none grayscale";
  const widthStyles = fullWidth ? "w-full" : "w-auto";

  return (
    <button 
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]} 
        ${disabled ? disabledStyles : ''}
        ${widthStyles}
      `}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

// Add display name for the playground
Button.displayName = 'Button';
