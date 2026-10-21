import React, { useState } from 'react';
import { AtSign, User, Sparkles, AlertCircle, Loader2, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';

export const UsernameSetupModal: React.FC = () => {
  const { user, userProfile, claimUsername } = useAuth();
  const [username, setUsername] = useState(
    userProfile?.username ||
      (user?.email
        ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 25)
        : '')
  );
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName ||
      user?.displayName ||
      (user?.email ? user.email.split('@')[0] : '')
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = username.trim().toLowerCase();
    if (clean.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(clean)) {
      setError('Username can only contain lowercase letters, numbers, and underscores.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await claimUsername(clean, displayName.trim());
      if (!res.success) {
        setError(res.error || 'Failed to claim username.');
      }
    } catch (err: any) {
      setError(err.message || 'Error creating username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/10">
        <div className="text-center mb-6">
          <Logo size="md" className="justify-center mb-3" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Choose Your RM CHAT Handle
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pick a unique username so other users can search and message you securely.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Rivera"
                required
                maxLength={50}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Unique Username
            </label>
            <div className="relative">
              <AtSign className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="alex_rivera"
                required
                minLength={3}
                maxLength={30}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1 pl-1">
              3–30 chars (lowercase letters, numbers, and underscores).
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || username.length < 3}
            className="w-full py-3.5 px-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-[0.99] transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 mt-5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Claim Handle & Start Chatting</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
