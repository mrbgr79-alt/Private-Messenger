import React from 'react';
import { Moon, Sun, Bell, PhoneCall, Video, ShieldCheck, Smartphone } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { Logo } from '../common/Logo';

interface NavbarProps {
  onOpenNotifications: () => void;
  onOpenAndroidGuide: () => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNotifications,
  onOpenAndroidGuide,
  unreadNotificationsCount = 0,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { userProfile } = useAuth();
  const { activeCall } = useCall();

  return (
    <header className="h-16 shrink-0 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between z-30 transition-colors">
      <div className="flex items-center gap-3">
        <Logo size="sm" showText={true} />
        {/* Real-time sync badge */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live P2P Encrypted</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Active Call Floating Chip */}
        {activeCall && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full text-xs font-semibold shadow-md animate-pulse">
            {activeCall.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <PhoneCall className="w-3.5 h-3.5" />}
            <span className="hidden xs:inline">Call In Progress:</span>
            <span>{activeCall.status === 'accepted' ? 'Connected' : 'Connecting...'}</span>
          </div>
        )}

        {/* Android App Info Button */}
        <button
          onClick={onOpenAndroidGuide}
          title="Capacitor Android Build & APK"
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
        >
          <Smartphone className="w-5 h-5" />
          <span className="sr-only">Android APK info</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
        </button>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          title="Notifications"
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative"
        >
          <Bell className="w-5 h-5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
