import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider, useCall } from './context/CallContext';
import { LoginScreen } from './components/auth/LoginScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { ForgotPasswordScreen } from './components/auth/ForgotPasswordScreen';
import { EmailVerificationScreen } from './components/auth/EmailVerificationScreen';
import { UsernameSetupModal } from './components/auth/UsernameSetupModal';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { ChatListScreen } from './components/chat/ChatListScreen';
import { ConversationView } from './components/chat/ConversationView';
import { ForYouScreen } from './components/foryou/ForYouScreen';
import { SearchUsersScreen } from './components/search/SearchUsersScreen';
import { ContactsScreen } from './components/contacts/ContactsScreen';
import { UserProfileScreen } from './components/profile/UserProfileScreen';
import { NotificationsScreen } from './components/notifications/NotificationsScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { BlockedUsersScreen } from './components/settings/BlockedUsersScreen';
import { IncomingCallModal } from './components/calls/IncomingCallModal';
import { ActiveVoiceCallView } from './components/calls/ActiveVoiceCallView';
import { ActiveVideoCallView } from './components/calls/ActiveVideoCallView';
import { CallHistoryScreen } from './components/calls/CallHistoryScreen';
import { AndroidSetupModal } from './components/modals/AndroidSetupModal';
import { UserProfile } from './types';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { user, loading, needsUsername } = useAuth();
  const { callError, dismissError } = useCall();

  // Auth screen mode
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot' | 'verify'>('login');

  // Navigation tab
  const [currentTab, setCurrentTab] = useState<NavTab>('chats');

  // Active private conversation
  const [activeConversation, setActiveConversation] = useState<{
    conversationId: string;
    otherUserId: string;
  } | null>(null);

  // Viewing user profile
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);

  // Modals
  const [androidModalOpen, setAndroidModalOpen] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-semibold tracking-wide text-slate-300">
          Loading RM CHAT...
        </p>
      </div>
    );
  }

  // If Not Authenticated
  if (!user) {
    if (authMode === 'register') {
      return (
        <RegisterScreen
          onNavigateLogin={() => setAuthMode('login')}
          onRegistered={() => setAuthMode('login')}
        />
      );
    }
    if (authMode === 'forgot') {
      return <ForgotPasswordScreen onBackToLogin={() => setAuthMode('login')} />;
    }
    return (
      <LoginScreen
        onNavigateRegister={() => setAuthMode('register')}
        onNavigateForgot={() => setAuthMode('forgot')}
      />
    );
  }

  // Email verification prompt if unverified and signed up via password
  if (!user.emailVerified && authMode === 'verify') {
    return <EmailVerificationScreen onContinue={() => setAuthMode('login')} />;
  }

  // Start chat with user helper
  const handleStartChatWithUser = (otherUserId: string, otherProfile: UserProfile) => {
    if (!user) return;
    // Generate stable conversation ID: [uidA, uidB].sort().join('_')
    const convId = [user.uid, otherUserId].sort().join('_');
    setActiveConversation({
      conversationId: convId,
      otherUserId,
    });
    setInspectUserId(null);
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans transition-colors">
      {/* Global Calls & Modals */}
      <IncomingCallModal />
      <ActiveVoiceCallView />
      <ActiveVideoCallView />
      <AndroidSetupModal
        isOpen={androidModalOpen}
        onClose={() => setAndroidModalOpen(false)}
      />

      {/* Force username creation after registration if not yet set */}
      {needsUsername && <UsernameSetupModal />}

      {/* Call error notification toast */}
      {callError && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-2xl bg-rose-600 text-white text-xs shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
          <span>{callError}</span>
          <button
            onClick={dismissError}
            className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded-lg cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          setInspectUserId(null);
          // If moving between primary views on desktop, clear active chat if requested
        }}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top Navbar */}
        <Navbar
          onOpenNotifications={() => setCurrentTab('notifications')}
          onOpenAndroidGuide={() => setAndroidModalOpen(true)}
        />

        {/* View Content Body */}
        <main className="flex-1 flex overflow-hidden pb-16 md:pb-0">
          {/* Active 1-on-1 Conversation View */}
          {activeConversation ? (
            <ConversationView
              conversationId={activeConversation.conversationId}
              otherUserId={activeConversation.otherUserId}
              onBack={() => setActiveConversation(null)}
              onViewProfile={(uid) => setInspectUserId(uid)}
            />
          ) : inspectUserId ? (
            /* User Profile Inspector */
            <UserProfileScreen
              viewingUserId={inspectUserId}
              onBack={() => setInspectUserId(null)}
              onStartChat={(uid, prof) => handleStartChatWithUser(uid, prof)}
            />
          ) : (
            <>
              {currentTab === 'chats' && (
                <div className="w-full h-full">
                  <ChatListScreen
                    onSelectConversation={(conversationId, otherUserId) =>
                      setActiveConversation({ conversationId, otherUserId })
                    }
                    onNavigateSearch={() => setCurrentTab('search')}
                  />
                </div>
              )}

              {currentTab === 'forYou' && (
                <div className="w-full h-full">
                  <ForYouScreen
                    onViewProfile={(uid) => setInspectUserId(uid)}
                    onStartChat={(uid, prof) => handleStartChatWithUser(uid, prof)}
                  />
                </div>
              )}

              {currentTab === 'search' && (
                <div className="w-full h-full">
                  <SearchUsersScreen
                    onStartChat={(uid, prof) => handleStartChatWithUser(uid, prof)}
                    onViewProfile={(uid) => setInspectUserId(uid)}
                  />
                </div>
              )}

              {currentTab === 'contacts' && (
                <div className="w-full h-full">
                  <ContactsScreen
                    onStartChat={(uid, prof) => handleStartChatWithUser(uid, prof)}
                    onNavigateSearch={() => setCurrentTab('search')}
                    onViewProfile={(uid) => setInspectUserId(uid)}
                  />
                </div>
              )}

              {currentTab === 'calls' && (
                <div className="w-full h-full">
                  <CallHistoryScreen />
                </div>
              )}

              {currentTab === 'profile' && (
                <div className="w-full h-full">
                  <UserProfileScreen />
                </div>
              )}

              {currentTab === 'notifications' && (
                <div className="w-full h-full">
                  <NotificationsScreen
                    onOpenConversation={(convId) => {
                      // Parse other uid
                      const ids = convId.split('_');
                      const otherId = ids.find((id) => id !== user.uid) || ids[0];
                      setActiveConversation({
                        conversationId: convId,
                        otherUserId: otherId,
                      });
                    }}
                  />
                </div>
              )}

              {currentTab === 'settings' && (
                <div className="w-full h-full">
                  <SettingsScreen
                    onNavigateBlocked={() => setCurrentTab('blocked')}
                    onOpenAndroidGuide={() => setAndroidModalOpen(true)}
                  />
                </div>
              )}

              {currentTab === 'blocked' && (
                <div className="w-full h-full">
                  <BlockedUsersScreen onBack={() => setCurrentTab('settings')} />
                </div>
              )}
            </>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        {!activeConversation && (
          <BottomNav
            currentTab={currentTab}
            onTabChange={(tab) => {
              setCurrentTab(tab);
              setInspectUserId(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <MainApp />
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
