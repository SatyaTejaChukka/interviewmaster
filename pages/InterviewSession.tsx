
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateSubtopics, generateQuestion, validateAnswer, generateInterviewReport } from '../services/gemini';
import { StorageService } from '../services/storage';
import { Question, AnswerAttempt, InterviewSession as ISession, InterviewReport, Difficulty } from '../types';
import { Send, AlertCircle, CheckCircle, XCircle, ChevronRight, Loader2, BookOpen, BarChart3, Sprout, Flame, Star, Brain, Target, Info, Trophy, Zap, ShieldCheck, ArrowRight } from 'lucide-react';

const InterviewSession: React.FC = () => {
  const navigate = useNavigate();
  // Setup State
  const [step, setStep] = useState<'topic' | 'subtopic' | 'difficulty' | 'interview' | 'report'>('topic');
  const [topic, setTopic] = useState('');
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [selectedSubtopic, setSelectedSubtopic] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(Difficulty.Beginner);
  const [loading, setLoading] = useState(false);

  // Interview State
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [prefetchedQuestion, setPrefetchedQuestion] = useState<Question | null>(null);
  const [history, setHistory] = useState<AnswerAttempt[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'info' | 'success' | 'error' | 'warning', message: string, canSkip?: boolean } | null>(null);
  
  // Inputs
  const [explanation, setExplanation] = useState('');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  
  // Report
  const [report, setReport] = useState<InterviewReport | null>(null);
  const timerRef = useRef<number | null>(null);

  // --- PREFETCHING LOGIC ---
  const prefetchNext = useCallback(async (currentHistory: AnswerAttempt[], currentQId?: string) => {
    if (currentHistory.length + (currentQId ? 1 : 0) >= 5) return; 
    
    const prevIds = currentHistory.map(h => h.questionId);
    if (currentQId) prevIds.push(currentQId);

    try {
      const q = await generateQuestion(topic, selectedSubtopic, selectedDifficulty, prevIds);
      setPrefetchedQuestion(q);
    } catch (e) {
      console.error("Prefetch failed", e);
    }
  }, [topic, selectedSubtopic, selectedDifficulty]);

  // Handlers
  const handleTopicSubmit = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    const result = await generateSubtopics(topic);
    setSubtopics(result);
    setStep('subtopic');
    setLoading(false);
  };

  const handleSubtopicSelect = (sub: string) => {
    setSelectedSubtopic(sub);
    setStep('difficulty');
  };

  const startInterview = async (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty);
    setLoading(true);
    
    try {
      const q = await generateQuestion(topic, selectedSubtopic, difficulty, []);
      setCurrentQuestion(q);
      setStep('interview');
      prefetchNext([], q.id);
    } catch (e) {
      setFeedback({ type: 'error', message: "Failed to start interview." });
    }
    setLoading(false);
  };

  const moveToNextQuestion = async () => {
    if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }

    if (prefetchedQuestion) {
      setCurrentQuestion(prefetchedQuestion);
      setPrefetchedQuestion(null);
      setAttempts(0);
      setFeedback(null);
      setExplanation('');
      setSelectedOptionIndex(null);
      prefetchNext([...history], prefetchedQuestion.id);
    } else {
      setLoading(true);
      const prevQuestions = history.map(h => h.questionId);
      const q = await generateQuestion(topic, selectedSubtopic, selectedDifficulty, prevQuestions);
      setCurrentQuestion(q);
      setAttempts(0);
      setFeedback(null);
      setExplanation('');
      setSelectedOptionIndex(null);
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || selectedOptionIndex === null || !explanation.trim()) return;
    
    setLoading(true);
    const attemptNum = attempts + 1;
    const result = await validateAnswer(currentQuestion, selectedOptionIndex, explanation, attemptNum);
    
    setAttempts(attemptNum);

    if (result.status === 'correct' || result.shouldProceed) {
        const attempt: AnswerAttempt = {
            questionId: currentQuestion.id,
            selectedOptionIndex,
            explanation,
            isCorrect: result.status === 'correct',
            feedback: result.feedback,
            timestamp: Date.now()
        };
        const newHistory = [...history, attempt];
        setHistory(newHistory);

        if (result.status === 'correct') {
            setFeedback({ type: 'success', message: result.feedback, canSkip: true });
        } else {
            setFeedback({ 
                type: 'info', 
                message: `Max attempts reached. Correct Answer: "${result.correctAnswer}". ${result.feedback}`,
                canSkip: true
            });
        }

        // Reduced delay to 2.5s for faster feel
        timerRef.current = window.setTimeout(() => {
            if (newHistory.length >= 5) {
                finishInterview(newHistory);
            } else {
                moveToNextQuestion();
            }
        }, 2500);

    } else {
        setFeedback({ 
            type: result.status === 'deviating' ? 'warning' : 'error', 
            message: result.feedback + (result.hint ? ` Hint: ${result.hint}` : '') 
        });
    }
    setLoading(false);
  };

  const finishInterview = async (finalHistory: AnswerAttempt[]) => {
    setStep('report');
    setLoading(true);
    try {
      const rep = await generateInterviewReport(topic, finalHistory);
      setReport(rep);

      const session: ISession = {
          id: crypto.randomUUID(),
          topic,
          subTopic: selectedSubtopic,
          difficulty: selectedDifficulty,
          date: new Date().toISOString(),
          score: rep.overallScore,
          totalQuestions: finalHistory.length,
          history: finalHistory,
          feedbackReport: rep
      };
      StorageService.saveSession(session);
    } catch (e) {
      console.error("Report generation failed", e);
    }
    setLoading(false);
  };

  if (step === 'topic') {
    return (
      <div className="max-w-2xl mx-auto mt-10 px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-6">Start a New Interview</h1>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
          <label className="block text-lg font-medium text-gray-700 dark:text-slate-300 mb-4">What topic do you want to practice?</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. React, Python, System Design, AWS"
              className="flex-1 px-4 py-3 text-lg text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleTopicSubmit()}
            />
            <button 
              onClick={handleTopicSubmit}
              disabled={loading || !topic}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'subtopic') {
    return (
      <div className="max-w-4xl mx-auto mt-10 px-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">Select a Focus Area for {topic}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subtopics.map((sub, idx) => (
            <button
              key={idx}
              onClick={() => handleSubtopicSelect(sub)}
              className="p-6 text-left bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition-all group"
            >
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{sub}</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                Select <ChevronRight size={16} />
              </p>
            </button>
          ))}
        </div>
        {loading && <div className="mt-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600 w-8 h-8" /></div>}
      </div>
    );
  }

  if (step === 'difficulty') {
    return (
      <div className="max-w-6xl mx-auto mt-10 px-4 pb-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black text-gray-900 dark:text-slate-100 mb-4">Choose Your Challenge</h2>
          <p className="text-gray-500 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Ready to test your expertise in <span className="font-bold text-indigo-600 dark:text-indigo-400 underline decoration-indigo-200">{selectedSubtopic}</span>? Pick a difficulty that matches your career level.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              level: Difficulty.Beginner, 
              icon: Sprout, 
              tag: 'New Horizons',
              theme: 'emerald',
              colorClass: 'text-emerald-600 dark:text-emerald-400',
              bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
              borderClass: 'border-emerald-200 dark:border-emerald-800',
              hoverClass: 'hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-emerald-100 dark:hover:shadow-emerald-900/20',
              desc: 'Master the core concepts, language syntax, and basic implementation patterns.', 
              detail: '5 Questions • Foundations focus' 
            },
            { 
              level: Difficulty.Intermediate, 
              icon: Brain, 
              tag: 'Pro Journey',
              theme: 'blue',
              colorClass: 'text-blue-600 dark:text-blue-400',
              bgClass: 'bg-blue-50 dark:bg-blue-950/30',
              borderClass: 'border-blue-200 dark:border-blue-800',
              hoverClass: 'hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-blue-100 dark:hover:shadow-blue-900/20',
              desc: 'Tackle real-world scenarios, debugging, and common professional challenges.', 
              detail: '5 Questions • Scenarios & Best Practices' 
            },
            { 
              level: Difficulty.Advanced, 
              icon: Flame, 
              tag: 'Expert Mastery',
              theme: 'amber',
              colorClass: 'text-amber-600 dark:text-amber-400',
              bgClass: 'bg-amber-50 dark:bg-amber-950/30',
              borderClass: 'border-amber-200 dark:border-amber-800',
              hoverClass: 'hover:border-amber-400 dark:hover:border-amber-600 hover:shadow-amber-100 dark:hover:shadow-amber-900/20',
              desc: 'Prove your expertise in architecture, performance, security, and complex internals.', 
              detail: '5 Questions • High-stakes Architectural reasoning' 
            }
          ].map((item) => (
            <button
              key={item.level}
              onClick={() => startInterview(item.level)}
              className={`relative flex flex-col p-8 bg-white dark:bg-slate-900 border-2 ${item.borderClass} rounded-3xl transition-all duration-300 group text-left hover:-translate-y-2 shadow-sm ${item.hoverClass}`}
            >
              <div className={`w-16 h-16 ${item.bgClass} ${item.colorClass} rounded-2xl flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
                <item.icon size={36} strokeWidth={2.5} />
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${item.bgClass} ${item.colorClass}`}>
                  {item.tag}
                </span>
              </div>
              
              <h3 className={`text-2xl font-black text-gray-900 dark:text-slate-100 mb-4 flex items-center justify-between`}>
                {item.level}
                <ChevronRight className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-indigo-500" />
              </h3>
              
              <p className="text-gray-500 dark:text-slate-400 leading-relaxed mb-8 flex-1">
                {item.desc}
              </p>
              
              <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-gray-400 dark:text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Zap size={14} className={item.colorClass} />
                  {item.detail}
                </span>
                <span className="flex items-center gap-1">
                  Start <ArrowRight size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>
        
        {loading && (
          <div className="mt-16 flex flex-col items-center justify-center animate-in fade-in duration-700">
            <div className="relative mb-6">
              <Loader2 className="animate-spin text-indigo-600 w-12 h-12" />
              <div className="absolute inset-0 bg-indigo-400/20 rounded-full animate-ping"></div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold tracking-tight text-lg">Curating your custom interview path...</p>
          </div>
        )}
      </div>
    );
  }

  if (step === 'interview') {
    return (
      <div className="max-w-3xl mx-auto py-6 px-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-200">{topic} <span className="text-gray-400">/</span> {selectedSubtopic}</h2>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-1 ${
                selectedDifficulty === Difficulty.Beginner ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' :
                selectedDifficulty === Difficulty.Intermediate ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' :
                'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400'
              }`}>
                 {selectedDifficulty === Difficulty.Beginner && <Sprout size={14} />}
                 {selectedDifficulty === Difficulty.Intermediate && <Brain size={14} />}
                 {selectedDifficulty === Difficulty.Advanced && <Flame size={14} />}
                {selectedDifficulty}
              </span>
              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-full text-sm font-medium">
                  Question {history.length + (feedback?.canSkip ? 0 : 1)} / 5
              </span>
            </div>
        </div>

        {loading && !currentQuestion ? (
             <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-4" />
                <p className="text-gray-500 dark:text-slate-400">Constructing scenario...</p>
             </div>
        ) : currentQuestion ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden animate-in fade-in duration-500">
                <div className="p-8 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-bold uppercase rounded flex items-center gap-1">
                        <Info size={10} />
                        Scenario Based
                      </span>
                    </div>
                    <p className="text-lg text-gray-900 dark:text-slate-100 font-medium leading-relaxed whitespace-pre-wrap">{currentQuestion.text}</p>
                </div>
                
                <div className="p-8 space-y-8">
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Select the best option</label>
                        <div className="grid gap-3">
                            {currentQuestion.options.map((opt, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedOptionIndex(idx)}
                                    className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
                                        selectedOptionIndex === idx 
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-300' 
                                        : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 dark:text-slate-300'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 font-bold text-xs ${
                                      selectedOptionIndex === idx ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-slate-700'
                                    }`}>
                                      {String.fromCharCode(65 + idx)}
                                    </div>
                                    <span className="leading-tight">{opt}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Explain your reasoning</label>
                          <span className="text-[10px] text-gray-400 italic">This helps us evaluate your technical depth</span>
                        </div>
                        <textarea
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            placeholder="Why did you choose this? Consider edge cases or trade-offs..."
                            className="w-full h-32 p-4 text-gray-900 dark:text-slate-100 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all"
                        />
                    </div>
                </div>

                {feedback && (
                    <div className={`mx-8 mb-8 p-5 rounded-xl flex gap-4 animate-in slide-in-from-top-4 duration-300 ${
                        feedback.type === 'success' ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-100 dark:border-green-800' : 
                        feedback.type === 'error' ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-800' :
                        feedback.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-800' :
                        'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-800'
                    }`}>
                        <div className="shrink-0 mt-0.5">
                          {feedback.type === 'success' && <CheckCircle size={24} />}
                          {feedback.type === 'error' && <XCircle size={24} />}
                          {(feedback.type === 'warning' || feedback.type === 'info') && <AlertCircle size={24} />}
                        </div>
                        <div className="flex-1 space-y-1">
                           <p className="leading-relaxed font-medium">{feedback.message}</p>
                           {feedback.canSkip && (
                               <button 
                                onClick={() => {
                                    if (history.length >= 5) {
                                        finishInterview(history);
                                    } else {
                                        moveToNextQuestion();
                                    }
                                }}
                                className="mt-3 text-xs font-bold uppercase tracking-widest flex items-center gap-1 hover:underline underline-offset-4"
                               >
                                   Continue to next <ChevronRight size={14} />
                               </button>
                           )}
                        </div>
                    </div>
                )}

                <div className="p-6 bg-gray-50/50 dark:bg-slate-950/30 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                    <button
                        onClick={handleSubmitAnswer}
                        disabled={loading || selectedOptionIndex === null || !explanation.trim() || (feedback && (feedback.type === 'success' || feedback.type === 'info'))}
                        className="flex items-center gap-3 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50 transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
                    >
                        {loading && <Loader2 className="animate-spin" size={20} />}
                        {loading ? 'Analyzing Reasoning...' : 'Submit Answer'}
                        {!loading && <ChevronRight size={20} />}
                    </button>
                </div>
            </div>
        ) : null}
      </div>
    );
  }

  if (step === 'report' && report) {
      return (
          <div className="max-w-4xl mx-auto py-8 px-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-500">
                  <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-10 text-white text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Trophy size={160} />
                      </div>
                      <h1 className="text-3xl font-bold mb-4">Interview Report</h1>
                      <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-white/10 backdrop-blur-md border-4 border-white/20 mb-4">
                        <span className="text-5xl font-black">{report.overallScore}</span>
                      </div>
                      <p className="text-lg opacity-90 font-medium">{selectedDifficulty} Level Assessment</p>
                  </div>

                  <div className="p-10 grid gap-10">
                      <div className="relative">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <Target className="text-indigo-600" />
                            Performance Summary
                          </h3>
                          <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-gray-700 dark:text-slate-300 leading-relaxed italic">
                            "{report.summary}"
                          </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-8">
                          <div className="bg-green-50/50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-100/50 dark:border-green-900/30">
                              <h4 className="font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2">
                                  <CheckCircle size={20} /> Areas of Strength
                              </h4>
                              <ul className="space-y-3">
                                  {report.strongAreas.map((area, i) => (
                                    <li key={i} className="flex items-start gap-2 text-green-900 dark:text-green-300">
                                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div>
                                      {area}
                                    </li>
                                  ))}
                                  {report.strongAreas.length === 0 && <li className="text-slate-400 italic">No major strengths highlighted yet.</li>}
                              </ul>
                          </div>

                          <div className="bg-red-50/50 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100/50 dark:border-red-900/30">
                              <h4 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                                  <AlertCircle size={20} /> Areas for Growth
                              </h4>
                              <ul className="space-y-3">
                                  {report.weakAreas.map((area, i) => (
                                    <li key={i} className="flex items-start gap-2 text-red-900 dark:text-red-300">
                                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0"></div>
                                      {area}
                                    </li>
                                  ))}
                              </ul>
                          </div>
                      </div>

                      <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center gap-2">
                              <BookOpen size={24} className="text-indigo-600 dark:text-indigo-400"/> Curated Learning Path
                          </h3>
                          <div className="grid gap-4">
                              {report.suggestedResources.map((res, i) => (
                                  <a 
                                    key={i} 
                                    href={res.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="block p-5 border border-gray-100 dark:border-slate-800 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-xl transition-all group bg-white dark:bg-slate-900"
                                  >
                                      <h5 className="font-bold text-gray-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                                        {res.title}
                                        <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                      </h5>
                                      <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2 font-mono truncate">{res.url}</p>
                                  </a>
                              ))}
                          </div>
                      </div>
                      
                      <button 
                        onClick={() => navigate('/')}
                        className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-xl active:scale-[0.98]"
                      >
                          Finish Session & View Dashboard
                      </button>
                  </div>
              </div>
          </div>
      )
  }

  return <div>Loading...</div>;
};

export default InterviewSession;
