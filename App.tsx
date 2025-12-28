import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InterviewSession from './pages/InterviewSession';
import ChatAssistant from './pages/ChatAssistant';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import { StorageService } from './services/storage';
import { User } from './types';

export const AuthContext = React.createContext<{
  user: User | null;
  setUser: (user: User | null) => void;
}>({
  user: null,
  setUser: () => {},
});

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const handleSetUser = (u: User | null) => {
    setUser(u);
    if (u) {
      StorageService.saveUser(u);
    } else {
      StorageService.clearUser();
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 dark:text-white">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, setUser: handleSetUser }}>
      <HashRouter>
        <Routes>
          <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Layout /> : <Navigate to="/auth" />}>
            <Route index element={<Dashboard />} />
            <Route path="interview" element={<InterviewSession />} />
            <Route path="chat" element={<ChatAssistant />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;