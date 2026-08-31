import React, { useState, useEffect } from 'react';
import { getLLMProvider } from '../services/llmProvider';
import { UsageDashboard as UsageData, ProviderUsageStats, LLMProvider } from '../types';
import { Activity, TrendingUp, AlertTriangle, CheckCircle, XCircle, Clock, DollarSign, Zap, RefreshCw, Shield } from 'lucide-react';

interface UsageDashboardProps {
  className?: string;
}

const UsageDashboard: React.FC<UsageDashboardProps> = ({ className = '' }) => {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [warnings, setWarnings] = useState<Array<{ provider: LLMProvider; warning: string }>>([]);
  const [configuredProviders, setConfiguredProviders] = useState<LLMProvider[]>([]);
  const [primaryProvider, setPrimaryProvider] = useState<LLMProvider | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadUsageData = () => {
    try {
      const provider = getLLMProvider();
      const dashboard = provider.getUsageDashboard();
      const rateLimitWarnings = provider.getRateLimitWarnings();

      setUsage(dashboard);
      setWarnings(rateLimitWarnings);
      setConfiguredProviders(provider.getConfiguredProviders());
      setPrimaryProvider(provider.getPrimaryProvider());
    } catch (error) {
      console.error('Failed to load usage data:', error);
      // Set empty usage data if provider not initialized
      setConfiguredProviders([]);
      setPrimaryProvider(null);
      setUsage({
        totalRequests: 0,
        totalTokens: 0,
        estimatedCost: 0,
        providerStats: [],
        lastReset: Date.now(),
      });
    }
  };

  useEffect(() => {
    loadUsageData();
    
    if (autoRefresh) {
      const interval = setInterval(loadUsageData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const handleReset = () => {
    const provider = getLLMProvider();
    provider.resetStats();
    loadUsageData();
  };

  const getProviderColor = (provider: LLMProvider): string => {
    const colors: Record<LLMProvider, string> = {
      [LLMProvider.Nvidia]: 'text-teal-600 dark:text-teal-400',
      [LLMProvider.Gemini]: 'text-blue-600 dark:text-blue-400',
      [LLMProvider.Groq]: 'text-emerald-600 dark:text-emerald-400',
      [LLMProvider.Claude]: 'text-orange-600 dark:text-orange-400',
      [LLMProvider.Mistral]: 'text-purple-600 dark:text-purple-400',
      [LLMProvider.OpenRouter]: 'text-pink-600 dark:text-pink-400',
    };
    return colors[provider] || 'text-gray-600 dark:text-gray-400';
  };

  const getProviderBgColor = (provider: LLMProvider): string => {
    const colors: Record<LLMProvider, string> = {
      [LLMProvider.Nvidia]: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800',
      [LLMProvider.Gemini]: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      [LLMProvider.Groq]: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
      [LLMProvider.Claude]: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
      [LLMProvider.Mistral]: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      [LLMProvider.OpenRouter]: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800',
    };
    return colors[provider] || 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
  };

  const formatTime = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getTimeUntilReset = (lastReset: number): string => {
    const resetTime = lastReset + (24 * 60 * 60 * 1000);
    const remaining = resetTime - Date.now();
    
    if (remaining < 0) return 'Resetting...';
    
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    
    return `${hours}h ${minutes}m`;
  };

  if (!usage) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-pulse text-gray-500 dark:text-slate-400">
          Loading usage data...
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats Overview */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Usage Dashboard</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Resets in {getTimeUntilReset(usage.lastReset)}
          </p>
        </div>
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            autoRefresh
              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400'
          }`}
        >
          <RefreshCw size={16} className={`inline mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
          Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Single Provider Warning */}
      {configuredProviders.length === 1 && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200 mb-1">
                No fallback provider configured
              </h3>
              <p className="text-sm text-red-800 dark:text-red-300">
                Only <strong className="capitalize">{configuredProviders[0]}</strong> is active.
                If it hits a rate limit, your interview will stop. Add a backup key (e.g. Groq) in
                Profile → API Keys.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configured Providers */}
      {configuredProviders.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Active Providers</h3>
          <div className="flex flex-wrap gap-2">
            {configuredProviders.map((provider, index) => (
              <span
                key={provider}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${getProviderBgColor(provider)} ${getProviderColor(provider)}`}
              >
                <span className="capitalize">{provider}</span>
                {provider === primaryProvider ? (
                  <span className="text-[10px] uppercase tracking-wide opacity-75">Primary</span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wide opacity-75">Fallback</span>
                )}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-3">
            {configuredProviders.length > 1
              ? 'Requests try the primary provider first, then fall back automatically on errors.'
              : 'Add at least one more provider below for uninterrupted interviews.'}
          </p>
        </div>
      )}

      {/* Rate Limit Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
                Rate Limit Warnings
              </h3>
              <ul className="space-y-1 text-sm">
                {warnings.map((w, i) => (
                  <li key={i} className="text-amber-800 dark:text-amber-300">
                    <strong className="capitalize">{w.provider}</strong>: {w.warning}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Activity className="text-indigo-600 dark:text-indigo-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {usage.totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <Zap className="text-emerald-600 dark:text-emerald-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Tokens Used</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {(usage.totalTokens / 1000).toFixed(1)}K
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <DollarSign className="text-orange-600 dark:text-orange-400" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400">Est. Cost</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                ${usage.estimatedCost.toFixed(3)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Stats */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-slate-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-4">Provider Statistics</h3>
        
        {usage.providerStats.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
              <Activity className="text-gray-400 dark:text-slate-500" size={32} />
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-2">
              No provider activity yet
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
              Add API keys below and start an interview to see statistics!
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
              <TrendingUp size={14} />
              <span>Stats will appear here after your first API call</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {usage.providerStats.map((stats) => (
              <div
                key={stats.provider}
                className={`border rounded-lg p-4 ${getProviderBgColor(stats.provider)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className={`font-semibold capitalize ${getProviderColor(stats.provider)}`}>
                      {stats.provider}
                    </h4>
                    {stats.isHealthy ? (
                      <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle size={16} className="text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock size={12} />
                    {formatTime(stats.lastUsed)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-slate-400 text-xs">Requests</p>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">
                      {stats.requestsToday}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-slate-400 text-xs">Tokens</p>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">
                      {(stats.tokensConsumed / 1000).toFixed(1)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-slate-400 text-xs">Success Rate</p>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">
                      {stats.successCount + stats.failureCount > 0
                        ? ((stats.successCount / (stats.successCount + stats.failureCount)) * 100).toFixed(0)
                        : 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-slate-400 text-xs">Avg Response</p>
                    <p className="font-semibold text-gray-900 dark:text-slate-100">
                      {stats.avgResponseTime.toFixed(0)}ms
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors"
        >
          Reset Statistics
        </button>
      </div>
    </div>
  );
};

export default UsageDashboard;
