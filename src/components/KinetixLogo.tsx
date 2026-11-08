import React from 'react';

interface KinetixLogoProps {
  className?: string;
}

export const KinetixLogo: React.FC<KinetixLogoProps> = ({ className = 'w-6 h-6' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="kxBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#07090E" />
          <stop offset="50%" stopColor="#0B1120" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="kxHexRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="50%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#F43F5E" />
        </linearGradient>
        <linearGradient id="kxHexInner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#131C31" />
          <stop offset="100%" stopColor="#090D16" />
        </linearGradient>
        <linearGradient id="kxCyanPillar" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="45%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="kxRoseWing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="45%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
        <linearGradient id="kxEmeraldWing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="45%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="kxAmberCore" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>

      <rect width="512" height="512" rx="104" fill="url(#kxBgGrad)" />

      <polygon
        points="256,72 415,164 415,348 256,440 97,348 97,164"
        fill="url(#kxHexInner)"
        stroke="url(#kxHexRim)"
        strokeWidth="18"
        strokeLinejoin="round"
      />

      <rect x="168" y="152" width="46" height="208" rx="14" fill="url(#kxCyanPillar)" />

      <path
        d="M226 244 L300 160 C309 150 325 150 335 159 C345 168 345 184 336 194 L262 276 Z"
        fill="url(#kxRoseWing)"
      />

      <path
        d="M222 254 L262 236 L336 318 C345 328 345 344 335 353 C325 362 309 362 300 352 Z"
        fill="url(#kxEmeraldWing)"
      />

      <polygon points="348,228 376,256 348,284 320,256" fill="url(#kxAmberCore)" />
    </svg>
  );
};
