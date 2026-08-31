import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../App';
import { Sun, Moon, Eye, EyeOff, Trash2 } from 'lucide-react';
import { LLMProvider, APIKeyConfig } from '../types';
import { resetLLMProvider } from '../services/llmProvider';
import { initializeLLMProvider } from '../services/gemini';
import { getLLMProvider } from '../services/llmProvider';
import UsageDashboard from '../components/UsageDashboard';

const PROVIDER_HELP_LINKS: Partial<Record<LLMProvider, { label: string; href: string }>> = {
  [LLMProvider.Nvidia]: {
    label: 'Get key at',
    href: 'https://build.nvidia.com/',
  },
  [LLMProvider.Gemini]: {
    label: 'Get free key at',
    href: 'https://ai.google.dev/gemini-api/docs/api-key',
  },
  [LLMProvider.Groq]: {
    label: 'Get free key at',
    href: 'https://console.groq.com',
  },
  [LLMProvider.Claude]: {
    label: 'Get key at',
    href: 'https://console.anthropic.com',
  },
  [LLMProvider.Mistral]: {
    label: 'Get key at',
    href: 'https://console.mistral.ai',
  },
  [LLMProvider.OpenRouter]: {
    label: 'Get credits at',
    href: 'https://openrouter.ai',
  },
};

const Profile: React.FC = () => {
  const { user, setUser } = useContext(AuthContext);
  const [name, setName] = useState(user?.name || '');
  const [msg, setMsg] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<LLMProvider>>(new Set());
  const [apiKeys, setApiKeys] = useState<APIKeyConfig[]>(user?.preferences?.apiKeys || []);
  const [newProvider, setNewProvider] = useState<LLMProvider>(LLMProvider.Nvidia);
  const [newKey, setNewKey] = useState('');
  const [primaryProvider, setPrimaryProvider] = useState<LLMProvider>(
    user?.preferences?.primaryProvider || LLMProvider.Nvidia
  );

  const currentTheme = user?.preferences?.theme || 'light';
  const envFallbackProviders = [
    (import.meta as any).env.VITE_NVIDIA_API_KEY ? 'NVIDIA' : null,
    (import.meta as any).env.VITE_GEMINI_API_KEY ? 'Gemini' : null,
    (import.meta as any).env.VITE_GROQ_API_KEY ? 'Groq' : null,
    (import.meta as any).env.VITE_CLAUDE_API_KEY ? 'Claude' : null,
    (import.meta as any).env.VITE_MISTRAL_API_KEY ? 'Mistral' : null,
    (import.meta as any).env.VITE_OPENROUTER_API_KEY ? 'OpenRouter' : null,
  ].filter(Boolean) as string[];

  const configuredProviderCount = getLLMProvider(apiKeys, primaryProvider).getConfiguredProviders().length;

  useEffect(() => {
    setName(user?.name || '');
    setApiKeys(user?.preferences?.apiKeys || []);
    setPrimaryProvider(user?.preferences?.primaryProvider || LLMProvider.Nvidia);
  }, [user]);

  const persistLLMSettings = (
    nextApiKeys: APIKeyConfig[],
    nextPrimaryProvider: LLMProvider,
    message: string
  ) => {
    if (!user) return;

    setApiKeys(nextApiKeys);
    setPrimaryProvider(nextPrimaryProvider);

    setUser({
      ...user,
      preferences: {
        ...user.preferences,
        apiKeys: nextApiKeys,
        primaryProvider: nextPrimaryProvider,
      },
    });

    resetLLMProvider();
    initializeLLMProvider(nextApiKeys, nextPrimaryProvider);
    setMsg(message);
    setTimeout(() => setMsg(''), 3000);
  };

  const handleUpdate = () => {
    if (!user) return;

    setUser({
      ...user,
      name,
      preferences: {
        ...user.preferences,
        apiKeys: user.preferences?.apiKeys || apiKeys,
        primaryProvider: user.preferences?.primaryProvider || primaryProvider,
      },
    });
    setMsg('Profile updated successfully!');
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleKeyVisibility = (provider: LLMProvider) => {
    const updated = new Set(visibleKeys);
    if (updated.has(provider)) {
      updated.delete(provider);
    } else {
      updated.add(provider);
    }
    setVisibleKeys(updated);
  };

  const addApiKey = () => {
    const trimmedKey = newKey.trim();
    if (!trimmedKey) {
      setMsg('Please enter an API key');
      return;
    }

    const existingIndex = apiKeys.findIndex((config) => config.provider === newProvider);
    let nextApiKeys: APIKeyConfig[];
    if (existingIndex >= 0) {
      nextApiKeys = [...apiKeys];
      nextApiKeys[existingIndex] = { provider: newProvider, apiKey: trimmedKey, isActive: true };
    } else {
      nextApiKeys = [...apiKeys, { provider: newProvider, apiKey: trimmedKey, isActive: true }];
    }

    const nextPrimaryProvider = nextApiKeys.some(
      (config) => config.provider === primaryProvider
    )
      ? primaryProvider
      : newProvider;

    setNewKey('');
    persistLLMSettings(nextApiKeys, nextPrimaryProvider, 'API key saved successfully!');
  };

  const removeApiKey = (provider: LLMProvider) => {
    const remaining = apiKeys.filter((config) => config.provider !== provider);
    const nextPrimaryProvider =
      primaryProvider === provider
        ? remaining[0]?.provider || LLMProvider.Nvidia
        : primaryProvider;

    persistLLMSettings(remaining, nextPrimaryProvider, 'API key removed successfully!');
  };

  const setTheme = (theme: 'light' | 'dark', event: React.MouseEvent) => {
    if (!user || theme === currentTheme) return;

    if (!(document as any).startViewTransition) {
      setUser({
        ...user,
        preferences: { ...user.preferences, theme },
      });
      return;
    }

    const x = event.clientX;
    const y = event.clientY;
    document.documentElement.style.setProperty('--x', `${x}px`);
    document.documentElement.style.setProperty('--y', `${y}px`);
    document.documentElement.setAttribute('data-theme-transition', 'active');

    const transition = (document as any).startViewTransition(() => {
      setUser({
        ...user,
        preferences: { ...user.preferences, theme },
      });
    });

    transition.finished.finally(() => {
      document.documentElement.removeAttribute('data-theme-transition');
    });
  };

  const providerHelp = PROVIDER_HELP_LINKS[newProvider];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Your Profile</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Manage your account and personalization</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-8">
        <UsageDashboard />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">Appearance</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Choose how InterviewMaster looks to you.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
          <button
            onClick={(event) => setTheme('light', event)}
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
            onClick={(event) => setTheme('dark', event)}
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6">AI Provider Settings</h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
          Connect your own AI provider to power your interviews. Your first provider is used by default, and we'll seamlessly switch to others if needed.
        </p>

        {configuredProviderCount < 2 && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Tip:</strong> Adding a second AI provider gives you uninterrupted interviews — if one runs out of free requests, we'll automatically switch to the other.
              {configuredProviderCount === 0 && <> <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Groq</a> and <a href="https://ai.google.dev/gemini-api/docs/api-key" target="_blank" rel="noopener noreferrer" className="underline font-medium">Gemini</a> both offer free API keys.</>}
            </p>
          </div>
        )}

        <div className="grid gap-6">
          <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
            <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-4">Add API Key</h3>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  LLM Provider
                </label>
                <select
                  value={newProvider}
                  onChange={(event) => setNewProvider(event.target.value as LLMProvider)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {Object.values(LLMProvider).map((provider) => (
                    <option key={provider} value={provider}>
                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                    </option>
                  ))}
                </select>

                {providerHelp && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {providerHelp.label}:{' '}
                    <a
                      href={providerHelp.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {new URL(providerHelp.href).host}
                    </a>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={newKey}
                  onChange={(event) => setNewKey(event.target.value)}
                  placeholder={`Enter your ${newProvider} API key`}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  onKeyDown={(event) => event.key === 'Enter' && addApiKey()}
                />
              </div>

              <button
                onClick={addApiKey}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors w-full sm:w-auto"
              >
                Add API Key
              </button>
            </div>
          </div>

          {apiKeys.length > 0 && (
            <div className="border border-gray-200 dark:border-slate-700 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-4">Your API Keys</h3>
              <div className="space-y-4">
                {apiKeys.map((config) => (
                  <div
                    key={config.provider}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <input
                        type="radio"
                        name="primaryProvider"
                        value={config.provider}
                        checked={primaryProvider === config.provider}
                        onChange={() =>
                          persistLLMSettings(apiKeys, config.provider, 'Primary provider updated successfully!')
                        }
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-slate-100">
                          {config.provider.charAt(0).toUpperCase() + config.provider.slice(1)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {primaryProvider === config.provider ? 'Primary provider' : 'Fallback provider'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type={visibleKeys.has(config.provider) ? 'text' : 'password'}
                          value={config.apiKey}
                          disabled
                          className="px-2 py-1 bg-transparent text-gray-600 dark:text-slate-400 text-sm max-w-xs border-0 outline-none"
                        />
                        <button
                          onClick={() => toggleKeyVisibility(config.provider)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded text-gray-600 dark:text-slate-400"
                        >
                          {visibleKeys.has(config.provider) ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                        <button
                          onClick={() => removeApiKey(config.provider)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-4">
                Tip: the app tries your primary provider first, then automatically falls back to the others.
              </p>
            </div>
          )}

          {apiKeys.length === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                {envFallbackProviders.length > 0
                  ? `You're all set — using a pre-configured ${envFallbackProviders.join(' and ')} key. Add your own key above to use a personal account with higher limits.`
                  : 'No AI provider connected yet. Add a free API key above to get started — Groq and Gemini both offer free tiers with no credit card required.'}
              </p>
            </div>
          )}
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
              onChange={(event) => setName(event.target.value)}
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
