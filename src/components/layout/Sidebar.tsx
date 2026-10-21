import React from 'react';
import {
  MessageSquare,
  Search,
  Users,
  PhoneCall,
  User,
  Settings,
  LogOut,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';

export type NavTab = 'chats' | 'forYou' | 'search' | 'contacts' | 'calls' | 'profile' | 'settings' | 'blocked' | 'notifications';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  unreadChatsTotal?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  unreadChatsTotal = 0,
}) => {
  const { userProfile, signOut } = useAuth();

  const navItems = [
    {
      id: 'chats' as NavTab,
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadChatsTotal > 0 ? unreadChatsTotal : null,
    },
    {
      id: 'forYou' as NavTab,
      label: 'For You',
      icon: Sparkles,
      badgeHighlight: true,
    },
    {
      id: 'contacts' as NavTab,
      label: 'Friends & Contacts',
      icon: Users,
    },
    {
      id: 'search' as NavTab,
      label: 'Discover',
      icon: Search,
    },
    {
      id: 'calls' as NavTab,
      label: 'Call History',
      icon: PhoneCall,
    },
    {
      id: 'profile' as NavTab,
      label: 'My Profile',
      icon: User,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 h-full bg-slate-50/70 dark:bg-slate-900/60 border-r border-slate-200/80 dark:border-slate-800 p-4 transition-colors">
      {/* Top Header */}
      <div className="px-3 py-2 mb-6">
        <Logo size="md" showText={true} />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-medium text-sm transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile card at bottom */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
        <div
          onClick={() => onTabChange('profile')}
          className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div className="relative">
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
              {userProfile?.displayName || 'RM User'}
            </p>
            <p className="text-xs text-slate-400 font-mono truncate">
              @{userProfile?.username || 'handle'}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              signOut();
            }}
            title="Sign Out"
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
