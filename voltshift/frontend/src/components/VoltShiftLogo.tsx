import React from 'react';

interface VoltShiftLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const VoltShiftLogo: React.FC<VoltShiftLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
}) => {
  // Dimensions for the icon container
  const iconDimensions = {
    sm: 'w-7 h-7 min-w-[28px]',
    md: 'w-9 h-9 min-w-[36px]',
    lg: 'w-11 h-11 min-w-[44px]',
    xl: 'w-14 h-14 min-w-[56px]',
  }[size];

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base font-bold',
    lg: 'text-xl font-bold',
    xl: 'text-3xl font-extrabold',
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Outer Squircle Container with Emerald Glow */}
      <div
        className={`relative ${iconDimensions} rounded-xl bg-zinc-950 flex items-center justify-center border border-emerald-500/40 transition-all duration-300 shadow-[0_0_16px_rgba(16,185,129,0.35)] group-hover:shadow-[0_0_24px_rgba(52,211,153,0.55)] group-hover:border-emerald-400`}
        style={{
          boxShadow: '0 0 14px -1px rgba(16, 185, 129, 0.4), inset 0 0 10px rgba(16, 185, 129, 0.08)',
        }}
      >
        {/* Subtle radial emerald gradient back-light inside squircle */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-950/30 to-black pointer-events-none" />

        {/* SVG Icon: Green rounded outline circle with sharp geometric electrical lightning bolt */}
        <svg
          viewBox="0 0 40 40"
          className="w-[72%] h-[72%] relative z-10 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Inner Neon Circular Ring */}
          <circle
            cx="20"
            cy="20"
            r="16"
            stroke="#10b981"
            strokeWidth="2.4"
            className="text-emerald-400"
            strokeLinecap="round"
            strokeDasharray="95 10"
          />

          {/* Glowing Electric Lightning Bolt */}
          <path
            d="M22 6.5 L12 21.5 L19.5 21.5 L17 33.5 L28 18.5 L20.5 18.5 Z"
            fill="url(#lightningGradient)"
            stroke="#34d399"
            strokeWidth="0.75"
            strokeLinejoin="round"
          />

          {/* Definitions for radiant glowing gradient on lightning bolt */}
          <defs>
            <linearGradient id="lightningGradient" x1="16" y1="6.5" x2="23" y2="33.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a7f3d0" />
              <stop offset="0.45" stopColor="#34d399" />
              <stop offset="1" stopColor="#059669" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Two-tone typography: "Volt" in clean white / zinc-100, "Shift" in glowing emerald green */}
      {showText && (
        <span className={`tracking-tight font-sans leading-none ${textSizeClasses}`}>
          <span className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Volt</span>
          <span className="text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)] ml-[1px]">Shift</span>
        </span>
      )}
    </div>
  );
};
