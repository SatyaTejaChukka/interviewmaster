import React, { useState, useRef, useEffect, useContext } from 'react';
import { streamCoachResponse, CoachPersona, initializeLLMProvider } from '../services/gemini';
import { StorageService } from '../services/storage';
import { Send, User as UserIcon, RefreshCw, ChevronDown, Binary, Landmark, Building2 } from 'lucide-react';
import { AuthContext } from '../App';

const PERSONA_CONFIG: Record<CoachPersona, { name: string; icon: any; desc: string; color: string }> = {
  balanced: {
    name: 'Tech Lead',
    icon: Building2,
    desc: 'General & Behavioral Expert',
    color: 'from-indigo-600 to-indigo-800',
  },
  dsa: {
    name: 'Algorithmist',
    icon: Binary,
    desc: 'DSA & Performance Expert',
    color: 'from-emerald-600 to-emerald-800',
  },
  architect: {
    name: 'Architect',
    icon: Landmark,
    desc: 'Systems & Scalability Expert',
    color: 'from-orange-600 to-orange-800',
  },
};

type CoachMessage = {
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
};

const ChatAssistant: React.FC = () => {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (user?.preferences?.apiKeys) {
      initializeLLMProvider(user.preferences.apiKeys, user.preferences.primaryProvider);
    }
  }, [user]);

  const [persona, setPersona] = useState<CoachPersona>('balanced');
  const [messages, setMessages] = useState<CoachMessage[]>(() => {
    const saved = StorageService.getChatHistory();
    const filtered = saved.filter((message) => message.text.trim().length > 0);

    return filtered.length > 0
      ? filtered
      : [
          {
            role: 'model',
            text: "Hi! I'm your AI Interview Coach. Ask me anything about coding, system design, or interview tips.",
          },
        ];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    StorageService.saveChatHistory(
      messages
        .filter((message) => message.text.trim().length > 0)
        .map(({ role, text }) => ({ role, text }))
    );
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReset = () => {
    if (window.confirm('Are you sure you want to start a new conversation? Your current progress will be cleared.')) {
      const resetMsg: CoachMessage = {
        role: 'model',
        text: `Session reset. I am your specialized ${PERSONA_CONFIG[persona].name} coach. How can I assist you today?`,
      };
      setMessages([resetMsg]);
      StorageService.clearChatHistory();
      setInput('');
    }
  };

  const handlePersonaChange = (nextPersona: CoachPersona) => {
    setPersona(nextPersona);
    setShowPersonaMenu(false);
    setMessages((prev) => [
      ...prev,
      {
        role: 'model',
        text: `Switching focus to ${PERSONA_CONFIG[nextPersona].name} expertise.`,
      },
    ]);
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    const conversation: CoachMessage[] = [...messages, { role: 'user', text: userMessage }];

    setInput('');
    setMessages(conversation);
    setIsTyping(true);

    try {
      let fullText = '';
      let firstChunkReceived = false;

      for await (const chunk of streamCoachResponse(conversation, persona)) {
        if (!chunk) continue;

        if (!firstChunkReceived) {
          firstChunkReceived = true;
          fullText = chunk;
          setMessages((prev) => [...prev, { role: 'model', text: chunk, isStreaming: true }]);
          continue;
        }

        fullText += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = { ...updated[lastIndex], text: fullText };
          return updated;
        });
      }

      setMessages((prev) => {
        if (!firstChunkReceived) {
          return [...prev, { role: 'model', text: 'No response returned from the configured provider.' }];
        }

        const updated = [...prev];
        const lastIndex = updated.length - 1;
        updated[lastIndex] = { ...updated[lastIndex], isStreaming: false };
        return updated;
      });
    } catch (error: any) {
      console.error('Chat error:', error);

      let errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('429')) {
        errorMessage = 'Quota exceeded. Please wait a moment before trying again.';
      } else if (errorMessage.includes('Safety')) {
        errorMessage = 'I cannot answer this query due to safety guidelines.';
      }

      setMessages((prev) => [...prev, { role: 'model', text: `Warning: ${errorMessage}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const activeConfig = PERSONA_CONFIG[persona];
  const ActiveIcon = activeConfig.icon;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
      <div className={`bg-gradient-to-r ${activeConfig.color} p-4 flex items-center justify-between text-white shadow-md z-20 transition-all duration-500`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2 bg-white/20 rounded-lg">
              <ActiveIcon size={24} />
            </div>
            <div className={`absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-slate-900 ${isTyping ? 'animate-ping' : ''}`}></div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowPersonaMenu(!showPersonaMenu)}
              className="flex flex-col items-start hover:bg-white/10 px-2 py-1 rounded-md transition-colors text-left"
            >
              <div className="flex items-center gap-1">
                <h2 className="text-lg font-bold leading-none">{activeConfig.name} Coach</h2>
                <ChevronDown size={16} className={`transition-transform duration-300 ${showPersonaMenu ? 'rotate-180' : ''}`} />
              </div>
              <p className="text-[10px] text-white/80 font-medium uppercase tracking-wider">{activeConfig.desc}</p>
            </button>

            {showPersonaMenu && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                <div className="p-2 space-y-1">
                  {(Object.keys(PERSONA_CONFIG) as CoachPersona[]).map((option) => {
                    const config = PERSONA_CONFIG[option];
                    const Icon = config.icon;

                    return (
                      <button
                        key={option}
                        onClick={() => handlePersonaChange(option)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                          persona === option
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                            : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${persona === option ? 'bg-indigo-100 dark:bg-indigo-800' : 'bg-gray-100 dark:bg-slate-700'}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-sm">{config.name}</p>
                          <p className="text-[10px] opacity-70 leading-tight">{config.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-sm font-medium border border-white/20 active:scale-95"
        >
          <RefreshCw size={16} className={isTyping ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Reset Session</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50 relative">
        {messages.map((message, index) => (
          <div key={index} className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700'
              }`}
            >
              {message.role === 'user' ? <UserIcon size={20} /> : <ActiveIcon size={20} />}
            </div>

            <div
              className={`relative max-w-[85%] p-4 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200 rounded-tl-none border border-gray-100 dark:border-slate-700'
              }`}
            >
              {message.text}
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-indigo-500/50 animate-pulse ml-1 align-middle"></span>
              )}
            </div>
          </div>
        ))}

        {isTyping && !messages[messages.length - 1]?.isStreaming && (
          <div className="flex gap-3 flex-row animate-in fade-in duration-300">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-slate-700 flex items-center justify-center shrink-0">
              <ActiveIcon size={20} />
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-gray-100 dark:border-slate-700 max-w-[85%] shadow-sm flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
              </div>
              <span className="text-xs text-slate-400 italic">Coach is thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner">
        <div className="flex gap-3 max-w-5xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={isTyping ? 'Coach is typing...' : `Ask your ${activeConfig.name} coach...`}
            className="flex-1 px-5 py-4 rounded-2xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm disabled:opacity-50"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            className={`px-8 bg-gradient-to-br ${activeConfig.color} text-white rounded-2xl hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center shadow-lg active:scale-95 group`}
          >
            <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
