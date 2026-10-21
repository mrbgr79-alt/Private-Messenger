import React, { useState } from 'react';
import {
  Moon,
  Sun,
  Shield,
  Eye,
  CheckCheck,
  Bell,
  Volume2,
  UserX,
  Smartphone,
  Trash2,
  LogOut,
  AlertTriangle,
  Loader2,
  Check,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

interface SettingsScreenProps {
  onNavigateBlocked: () => void;
  onOpenAndroidGuide: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigateBlocked,
  onOpenAndroidGuide,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { userProfile, updateSettings, signOut, deleteAccount } = useAuth();

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const settings = userProfile?.settings || {
    showOnlineStatus: true,
    showLastSeen: true,
    readReceipts: true,
    theme: 'dark',
    enableSound: true,
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete') {
      setDeleteError('Please type DELETE to confirm.');
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch (err: any) {
      console.error(err);
      setDeleteError(err.message || 'Failed to delete account. Please re-authenticate and try again.');
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Settings & Privacy
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Customize your app appearance, privacy boundaries, and account safety
          </p>
        </div>

        {/* Section: Appearance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Appearance
          </h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Dark Theme</p>
                <p className="text-xs text-slate-400">Toggle dark / light mode interface</p>
              </div>
            </div>

            <button
              onClick={toggleTheme}
              className={`w-13 h-7 rounded-full p-1 transition-colors cursor-pointer ${
                theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Section: Privacy */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Privacy & Security
          </h2>

          {/* Online Status */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Show Online Status</p>
                <p className="text-xs text-slate-400">Let contacts see when you are active</p>
              </div>
            </div>

            <button
              onClick={() => updateSettings({ showOnlineStatus: !settings.showOnlineStatus })}
              className={`w-13 h-7 rounded-full p-1 transition-colors cursor-pointer ${
                settings.showOnlineStatus ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.showOnlineStatus ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Last Seen */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-500">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Last Seen Timestamp</p>
                <p className="text-xs text-slate-400">Display your recent activity time</p>
              </div>
            </div>

            <button
              onClick={() => updateSettings({ showLastSeen: !settings.showLastSeen })}
              className={`w-13 h-7 rounded-full p-1 transition-colors cursor-pointer ${
                settings.showLastSeen ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.showLastSeen ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Read Receipts */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-500">
                <CheckCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Read Receipts</p>
                <p className="text-xs text-slate-400">Send blue double ticks when messages are viewed</p>
              </div>
            </div>

            <button
              onClick={() => updateSettings({ readReceipts: !settings.readReceipts })}
              className={`w-13 h-7 rounded-full p-1 transition-colors cursor-pointer ${
                settings.readReceipts ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.readReceipts ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Blocked Users Navigation */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Blocked Users</p>
                <p className="text-xs text-slate-400">View and manage blocked accounts</p>
              </div>
            </div>

            <button
              onClick={onNavigateBlocked}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold cursor-pointer"
            >
              Manage
            </button>
          </div>
        </div>

        {/* Section: Platform & Android packaging */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Mobile & Capacitor Packaging
          </h2>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Android Studio & APK</p>
                <p className="text-xs text-slate-400">View Capacitor setup, permissions, and build guides</p>
              </div>
            </div>

            <button
              onClick={onOpenAndroidGuide}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-xs"
            >
              View Guide
            </button>
          </div>
        </div>

        {/* Section: Account Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Account Management
          </h2>

          <button
            onClick={() => signOut()}
            className="w-full py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out of RM CHAT</span>
          </button>

          <button
            onClick={() => setDeleteModalOpen(true)}
            className="w-full py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Permanently Delete Account</span>
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Delete RM CHAT Account?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                This will release your username @{userProfile?.username}, delete your messages, and permanently wipe your profile. This action cannot be undone.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 text-rose-500 text-xs">
                {deleteError}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Type DELETE to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteConfirmText('');
                }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText.toLowerCase() !== 'delete'}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
