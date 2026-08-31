import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { StorageService } from './services/storage';
import { User } from './types';
import { initializeLLMProvider } from './services/gemini';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(() =>
    factory().catch((error) => {
      const hasReloaded = window.sessionStorage.getItem('chunk_reload_attempted');
      if (!hasReloaded) {
        window.sessionStorage.setItem('chunk_reload_attempted', 'true');
        window.location.reload();
      }
      throw error;
    })
  );
}

const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const InterviewSession = lazyWithRetry(() => import('./pages/InterviewSession'));
const ChatAssistant = lazyWithRetry(() => import('./pages/ChatAssistant'));
const Auth = lazyWithRetry(() => import('./pages/Auth'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));

export const AuthContext = React.createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
}>({
  user: null,
  setUser: () => {},
});

const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-indigo-200 dark:border-indigo-800 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
      <span className="text-sm text-gray-500 dark:text-slate-400 font-medium">Loading…</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.sessionStorage.removeItem('chunk_reload_attempted');
    const storedUser = StorageService.getUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const theme = user?.preferences?.theme || 'light';
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user?.preferences?.theme]);

  useEffect(() => {
    initializeLLMProvider(
      user?.preferences?.apiKeys,
      user?.preferences?.primaryProvider
    );
  }, [user?.preferences?.apiKeys, user?.preferences?.primaryProvider]);

  const handleSetUser = (u: User | null) => {
    setUser(u);
    if (u) {
      StorageService.saveUser(u);
    } else {
      StorageService.clearUser();
    }
  };

  if (loading) return <PageLoader />;

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser }}>
      <HashRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
            <Route path="/" element={user ? <Layout /> : <Navigate to="/auth" />}>
              <Route index element={<Dashboard />} />
              <Route path="interview" element={<InterviewSession />} />
              <Route path="chat" element={<ChatAssistant />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
