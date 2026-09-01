import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { SessionProvider } from './context/SessionContext.jsx';
import NavBar from './components/NavBar.jsx';
import LoginPage from './components/LoginPage.jsx';
import RegisterPage from './components/RegisterPage.jsx';
import SiteAnalysisForm from './components/SiteAnalysisForm.jsx';
import LoadAnalysisForm from './components/LoadAnalysisForm.jsx';
import ResultsDashboard from './components/ResultsDashboard.jsx';
import ChatPanel from './components/ChatPanel.jsx';

// ── Inner shell rendered once auth state is known ──────────────────────────────
function Shell() {
  const { user, loading } = useAuth();
  const [dark, setDark] = useState(true);
  const [authView, setAuthView] = useState('login'); // 'login' | 'register' | null
  const [step, setStep] = useState(1);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  // While restoring token / checking localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F5F5] dark:bg-[#10182B]">
        <div className="text-[#5C6478] text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  // Not logged in — show auth pages
  // NOTE: the app also works without login (demo mode via the nav "DEMO MODE" label).
  // To force login, uncomment the early-return below:
  //
  // if (!user && authView !== null) { ... }
  //
  // For now, auth is optional — non-authenticated users get an anonymous session.
  if (!user && authView === 'login') {
    return (
      <LoginPage
        onSwitchToRegister={() => setAuthView('register')}
        onSuccess={() => setAuthView(null)}
      />
    );
  }
  if (!user && authView === 'register') {
    return (
      <RegisterPage
        onSwitchToLogin={() => setAuthView('login')}
        onSuccess={() => setAuthView(null)}
      />
    );
  }

  // Logged in (or demo mode) — main app
  return (
    <SessionProvider>
      <div className="min-h-screen bg-[#F3F5F5] dark:bg-[#10182B] text-[#14192B] dark:text-slate-100 font-display">
        <NavBar
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          step={step}
          onStepClick={setStep}
        />

        <main className="p-4 md:p-8 max-w-5xl mx-auto">
          {step === 1 && <SiteAnalysisForm onDone={() => setStep(2)} />}
          {step === 2 && <LoadAnalysisForm onDone={() => setStep(3)} onBack={() => setStep(1)} />}
          {step === 3 && <ResultsDashboard onBack={() => setStep(2)} />}
        </main>

        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 bg-[#E8A93A] text-[#14192B] rounded-full
                       px-4 py-3 shadow-lg font-bold text-sm flex items-center gap-2
                       hover:bg-[#d49a2c] transition-colors z-40">
            Ask the engineer
          </button>
        )}
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </div>
    </SessionProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
