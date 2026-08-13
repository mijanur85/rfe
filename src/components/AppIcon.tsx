import React from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
}

export const AppIcon: React.FC<Props> = ({ size = 'md', className = '', glow = true }) => {
  const sizeClasses = {
    sm: 'w-7 h-7 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
    xl: 'w-20 h-20 rounded-3xl',
  };

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 overflow-hidden shadow-lg ${
        sizeClasses[size]
      } ${glow ? 'shadow-[0_0_18px_rgba(0,200,255,0.3)]' : ''} ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Main Background Gradient */}
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#310e75" />
            <stop offset="40%" stopColor="#1e1065" />
            <stop offset="100%" stopColor="#0082c8" />
          </linearGradient>

          {/* Left Pink Ribbon Gradient */}
          <linearGradient id="pinkRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff16b0" />
            <stop offset="60%" stopColor="#d90088" />
            <stop offset="100%" stopColor="#9a0066" />
          </linearGradient>

          {/* Diagonal Blue-Cyan Ribbon Gradient */}
          <linearGradient id="diagRibbon" x1="20%" y1="20%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#c026d3" />
            <stop offset="35%" stopColor="#7c3aed" />
            <stop offset="70%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#00f0ff" />
          </linearGradient>

          {/* Right Triangle Fold Gradient */}
          <linearGradient id="rightFold" x1="50%" y1="30%" x2="90%" y2="90%">
            <stop offset="0%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#00d4ff" />
          </linearGradient>

          {/* Subtle Inner Highlight for Ribbon Edge */}
          <linearGradient id="ribbonEdge" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Icon Base Background */}
        <rect width="100" height="100" rx="22" fill="url(#bgGrad)" />

        {/* White Circle Lens Icon in Top Right */}
        <circle cx="71.5" cy="28" r="11.5" fill="#FFFFFF" />

        {/* N Symbol Geometric Layers */}
        {/* Layer 1: Right Blue Triangle */}
        <path
          d="M 62.5 50.5 L 84 35.5 L 84 77.5 Z"
          fill="url(#rightFold)"
        />

        {/* Layer 2: Main Diagonal Ribbon */}
        <path
          d="M 22 23 L 62.5 50.5 L 84 77.5 L 32 68 Z"
          fill="url(#diagRibbon)"
        />

        {/* Layer 3: Left Pink Vertical Ribbon */}
        <path
          d="M 16 77.5 L 22 23 L 32 23 L 32 68 Z"
          fill="url(#pinkRibbon)"
        />

        {/* Edge Bevel Highlight on Left Ribbon */}
        <path
          d="M 22 23 L 32 23 L 22 65 Z"
          fill="url(#ribbonEdge)"
          style={{ mixBlendMode: 'overlay' }}
        />
      </svg>
    </div>
  );
};

