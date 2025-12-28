
import React, { useContext } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { LogOut, Home, PlayCircle, User as UserIcon, MessageSquare, Sun, Moon } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const performThemeToggle = (newTheme: 'light' | 'dark', event?: React.MouseEvent) => {
    if (!user) return;

    // Capture precise coordinates for the ripple origin
    const x = event?.clientX ?? window.innerWidth / 2;
    const y = event?.clientY ?? window.innerHeight / 2;
    
    document.documentElement.style.setProperty('--x', `${x}px`);
    document.documentElement.style.setProperty('--y', `${y}px`);

    // Fallback for browsers that don't support View Transitions
    if (!(document as any).startViewTransition) {
      setUser({
        ...user,
        preferences: { ...user.preferences, theme: newTheme }
      });
      return;
    }

    // Set active attribute to trigger the amazing CSS animations
    document.documentElement.setAttribute('data-theme-transition', 'active');

    const transition = (document as any).startViewTransition(() => {
      // Execute the theme swap inside the transition capture
      setUser({
        ...user,
        preferences: { ...user.preferences, theme: newTheme }
      });
    });

    // Cleanup after animation completes to avoid side effects on other transitions
    transition.finished.finally(() => {
      document.documentElement.removeAttribute('data-theme-transition');
    });
  };

  const toggleTheme = (event: React.MouseEvent) => {
    const newTheme = user?.preferences?.theme === 'dark' ? 'light' : 'dark';
    performThemeToggle(newTheme, event);
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/auth');
  };

  const isDark = user?.preferences?.theme === 'dark';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200 transition-colors duration-500">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100 dark:border-slate-800">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            InterviewMaster
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavLink 
            to="/" 
            end
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold shadow-sm scale-[1.02]' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:scale-[1.01]'}`
            }
          >
            <Home size={20} />
            Dashboard
          </NavLink>
          <NavLink 
            to="/interview" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold shadow-sm scale-[1.02]' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:scale-[1.01]'}`
            }
          >
            <PlayCircle size={20} />
            New Interview
          </NavLink>
          <NavLink 
            to="/chat" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold shadow-sm scale-[1.02]' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:scale-[1.01]'}`
            }
          >
            <MessageSquare size={20} />
            AI Coach
          </NavLink>
          <NavLink 
            to="/profile" 
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold shadow-sm scale-[1.02]' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:scale-[1.01]'}`
            }
          >
            <UserIcon size={20} />
            Profile
          </NavLink>
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-slate-800 space-y-2">
          {/* Theme Toggle Button */}
          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-all active:scale-95 group"
          >
            {isDark ? (
              <>
                <Sun size={20} className="text-amber-500 group-hover:rotate-45 transition-transform" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={20} className="text-indigo-600 group-hover:-rotate-12 transition-transform" />
                <span>Dark Mode</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.isGuest ? 'Guest' : 'Member'}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="md:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-4 flex justify-between items-center shadow-sm z-20">
          <span className="font-bold text-lg text-indigo-600 dark:text-indigo-400 tracking-tight">InterviewMaster</span>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-slate-400 active:scale-90 transition-transform">
              {isDark ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-indigo-600" />}
            </button>
            <button onClick={handleLogout} className="p-2 text-gray-600 dark:text-slate-400">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 flex justify-around p-2 shadow-[0_-1px_10px_rgba(0,0,0,0.05)] z-20">
           <NavLink to="/" end className={({ isActive }) => `p-3 rounded-xl transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-500'}`}><Home size={24} /></NavLink>
           <NavLink to="/interview" className={({ isActive }) => `p-3 rounded-xl transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-500'}`}><PlayCircle size={24} /></NavLink>
           <NavLink to="/chat" className={({ isActive }) => `p-3 rounded-xl transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-500'}`}><MessageSquare size={24} /></NavLink>
           <NavLink to="/profile" className={({ isActive }) => `p-3 rounded-xl transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-500'}`}><UserIcon size={24} /></NavLink>
        </nav>
      </div>
    </div>
  );
};

export default Layout;
