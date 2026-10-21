import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-lg', icon: 'w-4 h-4' },
    md: { box: 'w-10 h-10', text: 'text-xl', icon: 'w-6 h-6' },
    lg: { box: 'w-14 h-14', text: 'text-2xl', icon: 'w-8 h-8' },
    xl: { box: 'w-20 h-20', text: 'text-4xl', icon: 'w-12 h-12' },
  };

  const current = sizeMap[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div
        className={`${current.box} relative rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center`}
      >
        <div className="w-full h-full rounded-[14px] bg-slate-950/20 backdrop-blur-xs flex items-center justify-center overflow-hidden relative">
          {/* Stylized RM Chat Monogram */}
          <svg
            className={`${current.icon} text-white drop-shadow`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <path d="M8 10h.01" />
            <path d="M12 10h.01" />
            <path d="M16 10h.01" />
          </svg>
          <div className="absolute top-0 right-0 w-2 h-2 bg-emerald-400 rounded-full border-2 border-slate-900" />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`font-black tracking-tight ${current.text} bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent`}>
              RM
            </span>
            <span className={`font-extrabold tracking-wider ${current.text} text-slate-800 dark:text-white`}>
              CHAT
            </span>
          </div>
          <span className="text-[10px] uppercase font-semibold tracking-widest text-indigo-500/80 dark:text-indigo-400/80 -mt-0.5">
            PRIVATE MESSENGER
          </span>
        </div>
      )}
    </div>
  );
};
