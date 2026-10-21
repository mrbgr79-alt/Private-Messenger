import React, { useState } from 'react';
import { MailCheck, RefreshCw, ArrowRight, LogOut, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../common/Logo';

interface EmailVerificationScreenProps {
  onContinue: () => void;
}

export const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ onContinue }) => {
  const { user, resendVerificationEmail, signOut } = useAuth();
  const [resending, setResending] = useState(false);
  const [sentMessage, setSentMessage] = useState(false);

  const handleResend = async () => {
    setResending(true);
    setSentMessage(false);
    try {
      await resendVerificationEmail();
      setSentMessage(true);
    } catch (e) {
      console.warn(e);
    } finally {
      setResending(false);
    }
  };

  const handleCheckReload = async () => {
    if (user) {
      await user.reload();
      if (user.emailVerified) {
        onContinue();
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center px-4 py-8 bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40 transition-colors">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Logo size="lg" className="justify-center mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Verify Your Email
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Keep your RM CHAT account secure and authenticated
          </p>
        </div>

        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/5 text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            <MailCheck className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              We sent a verification link
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Please click the link sent to{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{user?.email}</span> to verify your account.
            </p>
          </div>

          {sentMessage && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Verification email resent successfully!</span>
            </div>
          )}

          <div className="pt-2 space-y-3">
            <button
              onClick={handleCheckReload}
              className="w-full py-3.5 px-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>I've Verified My Email</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleResend}
              disabled={resending}
              className="w-full py-3 px-4 rounded-2xl font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
            </button>

            <button
              onClick={onContinue}
              className="w-full py-2.5 px-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Skip for now & Continue to App
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 text-xs font-medium text-rose-500 hover:underline cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign out and use another account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
