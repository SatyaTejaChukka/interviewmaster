
import React, { useContext, useState } from 'react';
import { AuthContext } from '../App';
import { Sun, Moon, Monitor } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, setUser } = useContext(AuthContext);
  const [name, setName] = useState(user?.name || '');
  const [msg, setMsg] = useState('');

  const currentTheme = user?.preferences?.theme || 'light';

  const handleUpdate = () => {
    if (user) {
      setUser({ ...user, name });
      setMsg('Profile updated successfully!');
      setTimeout(() => setMsg(''), 3000);
    }
  };

  const setTheme = (theme: 'light' | 'dark', event: React.MouseEvent) => {
    if (!user || theme === currentTheme) return;

    /* Fix: Cast document to any as startViewTransition is a new API not yet in all TypeScript definitions */
    if (!(document as any).startViewTransition) {
      setUser({
        ...user,
        preferences: { ...user.preferences, theme }
      });
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    document.documentElement.style.setProperty('--x', `${x}px`);
    document.documentElement.style.setProperty('--y', `${y}px`);
    document.documentElement.setAttribute('data-theme-transition', 'active');

    /* Fix: Cast document to any to access startViewTransition */
    const transition = (document as any).startViewTransition(() => {
      setUser({
        ...user,
        preferences: { ...user.preferences, theme }
      });
    });

    transition.finished.finally(() => {
      document.documentElement.removeAttribute('data-theme-transition');
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Your Profile</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Manage your account and personalization</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Appearance</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Choose how InterviewMaster looks to you.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <button
            onClick={(e) => setTheme('light', e)}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              currentTheme === 'light' 
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' 
                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Sun size={20} />
              <span className="font-medium">Light Mode</span>
            </div>
            {currentTheme === 'light' && <div className="w-2 h-2 rounded-full bg-indigo-600"></div>}
          </button>

          <button
            onClick={(e) => setTheme('dark', e)}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              currentTheme === 'dark' 
                ? 'border-indigo-600 bg-indigo-900/20 text-indigo-400' 
                : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 text-gray-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Moon size={20} />
              <span className="font-medium">Dark Mode</span>
            </div>
            {currentTheme === 'dark' && <div className="w-2 h-2 rounded-full bg-indigo-400"></div>}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Personal Details</h2>
        <div className="grid gap-6 max-w-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <button
              onClick={handleUpdate}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Save Changes
            </button>
            {msg && <span className="ml-4 text-green-600 dark:text-green-400 text-sm">{msg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
