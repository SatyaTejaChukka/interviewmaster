import { InterviewSession, User } from '../types';

const USER_KEY = 'interview_master_user';
const SESSIONS_KEY = 'interview_master_sessions';
const CHAT_KEY = 'interview_master_chat';

export const StorageService = {
  getUser: (): User | null => {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  saveUser: (user: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearUser: () => {
    localStorage.removeItem(USER_KEY);
  },

  getSessions: (): InterviewSession[] => {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveSession: (session: InterviewSession) => {
    const sessions = StorageService.getSessions();
    // Check if session exists (update) or new
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  },

  getSessionsByTopic: (): Record<string, InterviewSession[]> => {
    const sessions = StorageService.getSessions();
    return sessions.reduce((acc, session) => {
      const topic = session.topic || 'Uncategorized';
      if (!acc[topic]) acc[topic] = [];
      acc[topic].push(session);
      return acc;
    }, {} as Record<string, InterviewSession[]>);
  },

  getChatHistory: (): Array<{ role: 'user' | 'model'; text: string }> => {
    const data = localStorage.getItem(CHAT_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveChatHistory: (messages: Array<{ role: 'user' | 'model'; text: string }>) => {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  },

  clearChatHistory: () => {
    localStorage.removeItem(CHAT_KEY);
  }
};