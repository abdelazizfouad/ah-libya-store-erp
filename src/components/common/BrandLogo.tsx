import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showSubtitle?: boolean;
  className?: string;
  isDark?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  className = '',
  isDark = true,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    hero: 'w-16 h-16 text-xl',
  };

  const starSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
    hero: 'w-9 h-9',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Chrome Emblem */}
      <div
        className={`${iconSizes[size]} relative rounded-full flex items-center justify-center shrink-0 shadow-lg transition-transform hover:scale-105 duration-300 ${
          isDark
            ? 'bg-gradient-to-b from-zinc-800 via-zinc-900 to-black border border-white/20 text-white shadow-black/60'
            : 'bg-gradient-to-b from-slate-100 via-white to-slate-200 border border-slate-300 text-slate-900 shadow-slate-300/50'
        }`}
      >
        {/* Silver ring reflection */}
        <div className="absolute inset-0.5 rounded-full border border-white/10 pointer-events-none" />
        
        {/* Mercedes Tri-star precision SVG symbol */}
        <svg
          viewBox="0 0 24 24"
          className={`${starSizes[size]} fill-current transition-all`}
        >
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <path
            d="M12 3.5 L12 12 M12 12 L4.5 17.5 M12 12 L19.5 17.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polygon
            points="12,3.5 11.2,12 12,12.6 12.8,12"
            fill="currentColor"
            opacity="0.8"
          />
          <polygon
            points="4.5,17.5 12,12 12.5,12.8 11.2,13.2"
            fill="currentColor"
            opacity="0.8"
          />
          <polygon
            points="19.5,17.5 12,12 12.8,11.2 13.2,12.5"
            fill="currentColor"
            opacity="0.8"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-serif-luxury font-black tracking-tight truncate ${
              size === 'hero' ? 'text-2xl sm:text-3xl' : size === 'lg' ? 'text-lg sm:text-xl' : size === 'md' ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'
            } ${isDark ? 'text-white' : 'text-slate-900'}`}
          >
            AH.Libya Store
          </span>
          <span
            className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-mono font-medium tracking-wide shrink-0 ${
              isDark
                ? 'bg-zinc-900/80 text-zinc-300 border border-white/10'
                : 'bg-slate-100 text-slate-700 border border-slate-300'
            }`}
          >
            فرع الحرفيين
          </span>
        </div>

        {showSubtitle && (
          <p
            className={`text-[10px] sm:text-[11px] truncate font-medium ${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            }`}
          >
            قطع غيار مرسيدس-بنز الأصلية (Mercedes-Benz Genuine Parts)
          </p>
        )}
      </div>
    </div>
  );
};
