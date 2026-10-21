import React from 'react';
import {
  Smartphone,
  CheckCircle,
  Copy,
  ExternalLink,
  X,
  FileCode,
  ShieldCheck,
  Download,
} from 'lucide-react';

interface AndroidSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidSetupModal: React.FC<AndroidSetupModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 text-emerald-500 border border-emerald-500/20">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                RM CHAT Android Packaging
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Package ID: <span className="font-mono text-indigo-500">com.rmchat.app</span> | Capacitor & Android Studio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
              Native Status Bar
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Auto dark/light sync & safe-area inset support
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
              P2P WebRTC Permissions
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Camera, Microphone, and Audio routing in Manifest
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-white block mb-0.5">
              Deep Linking
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Scheme <code className="text-indigo-400">rmchat://chat/</code> intent handler
            </span>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-4 text-xs">
          <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
            Fast Build Steps:
          </h3>

          <div className="space-y-2">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              1. Build production web bundle:
            </p>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px]">
              <span>npm run build</span>
              <button
                onClick={() => copyToClipboard('npm run build')}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              2. Add and sync Capacitor Android project:
            </p>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px]">
              <span>npx cap add android && npx cap sync android</span>
              <button
                onClick={() => copyToClipboard('npx cap add android && npx cap sync android')}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              3. Open Android Studio & generate Release APK or AAB:
            </p>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px]">
              <span>npx cap open android</span>
              <button
                onClick={() => copyToClipboard('npx cap open android')}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Firebase Android SHA-1 note */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>Google Sign-In & Firebase Android SHA-1:</span>
          </p>
          <p className="leading-relaxed">
            In Firebase Console, add an Android app with package name <code className="font-bold">com.rmchat.app</code>, place the generated <code className="font-bold">google-services.json</code> into <code className="font-bold">android/app/</code>, and register your Keystore SHA-1 certificate fingerprint so Google Sign-In authenticates natively on Android devices.
          </p>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs cursor-pointer shadow-sm transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
