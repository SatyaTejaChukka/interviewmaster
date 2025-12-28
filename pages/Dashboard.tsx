import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/storage';
import { InterviewSession } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BookOpen, Clock, Trophy, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);

  useEffect(() => {
    setSessions(StorageService.getSessions().reverse()); // Newest first
  }, []);

  const totalInterviews = sessions.length;
  const averageScore = totalInterviews > 0
    ? Math.round(sessions.reduce((acc, s) => acc + s.score, 0) / totalInterviews)
    : 0;

  // Group by topic for chart
  const topicData = Object.entries(StorageService.getSessionsByTopic()).map(([topic, sessions]) => ({
    name: topic,
    avgScore: Math.round(sessions.reduce((acc, s) => acc + s.score, 0) / sessions.length),
    count: sessions.length
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-gray-500 dark:text-slate-400 mt-2">Welcome back! Here is your interview performance overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <BookOpen size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Total Interviews</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{totalInterviews}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
              <Trophy size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Average Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{averageScore}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Last Active</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {sessions.length > 0 ? new Date(sessions[0].date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 min-h-[400px]">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-6">Topic Performance</h2>
          {topicData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topicData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} unit="%" tick={{ fill: '#94a3b8' }} />
                <Tooltip 
                  cursor={{ fill: '#334155', opacity: 0.1 }}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none', 
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    backgroundColor: '#1e293b',
                    color: '#f1f5f9'
                  }}
                  itemStyle={{ color: '#f1f5f9' }}
                />
                <Bar dataKey="avgScore" fill="#4f46e5" radius={[4, 4, 0, 0]}>
                  {topicData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.avgScore > 75 ? '#22c55e' : entry.avgScore > 50 ? '#eab308' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-500">
              <p>No data available yet</p>
              <Link to="/interview" className="mt-2 text-indigo-600 dark:text-indigo-400 hover:underline">Start your first interview</Link>
            </div>
          )}
        </div>

        {/* Recent History */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Recent Sessions</h2>
            <Link to="/interview" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">Start New</Link>
          </div>
          
          <div className="space-y-4">
            {sessions.slice(0, 5).map((session) => (
              <div key={session.id} className="group p-4 rounded-lg border border-gray-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">{session.topic}</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{session.subTopic} • {new Date(session.date).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-md text-sm font-bold ${
                      session.score >= 80 ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                      session.score >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400' :
                      'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                    }`}>
                      {session.score}%
                    </span>
                  </div>
                </div>
                {session.feedbackReport && (
                  <div className="mt-3 text-sm text-gray-600 dark:text-slate-400 line-clamp-2 italic">
                    {session.feedbackReport.summary}
                  </div>
                )}
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-slate-600">
                No recent sessions found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;