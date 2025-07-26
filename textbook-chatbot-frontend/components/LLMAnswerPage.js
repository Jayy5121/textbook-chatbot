"use client"
import React, { useState, useEffect } from 'react';
import { Search, BookOpen, AlertCircle, RefreshCw, Lightbulb, Zap, Clock, Hash, Moon, Sun, Bot, ChevronDown, ChevronUp, ExternalLink, ArrowLeft, Copy, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const LLMAnswerPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [copied, setCopied] = useState(false);

  const answerSuggestions = [
    "What is machine learning and how does it work?",
    "Explain the difference between supervised and unsupervised learning",
    "How do neural networks process information?",
    "What are the main types of machine learning algorithms?",
    "Explain the concept of overfitting in machine learning",
    "What is feature engineering and why is it important?",
    "How does gradient descent optimization work?",
    "What are the applications of deep learning?"
  ];

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  // Extract query from URL and auto-search on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    
    if (queryParam) {
      setQuery(queryParam);
      performSearch(queryParam);
    }
  }, []);

  const performSearch = async (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setAnswer(null);
    setSearchAttempted(true);

    try {
      const response = await fetch('http://localhost:5000/search/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query: searchQuery.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAnswer(data);

    } catch (err) {
      console.error('Answer generation error:', err);
      setError(err.message || 'An unexpected error occurred while generating the answer');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    await performSearch(query);
    
    // Update URL with query parameter
    if (query.trim()) {
      const newUrl = `/search/answer?q=${encodeURIComponent(query.trim())}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    performSearch(suggestion);
    
    // Update URL
    const newUrl = `/search/answer?q=${encodeURIComponent(suggestion)}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleCopyAnswer = async () => {
    if (answer && answer.answer) {
      try {
        await navigator.clipboard.writeText(answer.answer);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const themeClasses = {
    bg: isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50',
    cardBg: isDark ? 'bg-gray-800' : 'bg-white',
    headerBg: isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
    border: isDark ? 'border-gray-700' : 'border-gray-200',
    input: isDark ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-blue-400' : 'bg-white border-gray-300 text-black placeholder-gray-500 focus:ring-blue-500',
    button: isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700',
    suggestion: isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 hover:text-blue-300 border-gray-600 hover:border-blue-400' : 'bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border-transparent hover:border-blue-200',
    statusBg: isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    errorBg: isDark ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200',
    warningBg: isDark ? 'bg-yellow-900 border-yellow-700' : 'bg-yellow-50 border-yellow-200',
    answerBg: isDark ? 'bg-gradient-to-r from-blue-900/20 to-purple-900/20' : 'bg-gradient-to-r from-blue-50 to-purple-50',
    sourceBg: isDark ? 'bg-gray-700' : 'bg-gray-50'
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      {/* Header */}
      <div className={`${themeClasses.headerBg} border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link 
                href="/search" 
                className={`p-2 rounded-lg ${themeClasses.cardBg} ${themeClasses.border} border hover:opacity-80 transition-opacity`}
              >
                <ArrowLeft className={themeClasses.textMuted} size={20} />
              </Link>
              <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                <Bot className="text-white" size={24} />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${themeClasses.text}`}>AI Answer</h1>
                <p className={`text-sm ${themeClasses.textMuted}`}>Comprehensive AI-generated answers</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/search" 
                className={`px-4 py-2 text-sm rounded-lg ${themeClasses.cardBg} ${themeClasses.border} border hover:opacity-80 transition-opacity ${themeClasses.textSecondary} flex items-center gap-2`}
              >
                <Search size={16} />
                Back to Search
              </Link>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${themeClasses.cardBg} ${themeClasses.border} border hover:opacity-80 transition-opacity`}
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="text-yellow-500" size={20} />
                ) : (
                  <Moon className={themeClasses.textMuted} size={20} />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left Sidebar - Search Form & Suggestions */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="sticky top-8 space-y-6">
              
              {/* Search Form */}
              <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
                <div className="space-y-4">
                  <div className="relative">
                    <Bot className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${themeClasses.textMuted}`} size={20} />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                      placeholder="Ask a detailed question for AI analysis..."
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${themeClasses.input}`}
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    className={`w-full px-4 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        Generating Answer...
                      </>
                    ) : (
                      <>
                        <Bot size={18} />
                        Get AI Answer
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Answer Suggestions */}
              {(!searchAttempted || (answer && !loading)) && (
                <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="text-yellow-500" size={18} />
                    <h3 className={`font-semibold ${themeClasses.text}`}>
                      {!searchAttempted ? 'Example Questions' : 'Try Another Question'}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {answerSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors border ${themeClasses.suggestion}`}
                        disabled={loading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Answer Area */}
          <div className="lg:col-span-8 xl:col-span-9">
            
            {/* Search Status */}
            {searchAttempted && !loading && !error && answer && (
              <div className={`mb-6 p-4 ${themeClasses.statusBg} rounded-lg border shadow-sm`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="text-purple-500" size={16} />
                    <span className={`text-sm ${themeClasses.textSecondary}`}>
                      AI Answer for: <span className={`font-medium ${themeClasses.text}`}>"{query}"</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    {answer.timing && (
                      <div className={`${themeClasses.textMuted} flex items-center gap-1`}>
                        <Clock size={12} />
                        <span>{formatDuration(answer.timing.total_duration)}</span>
                      </div>
                    )}
                    {answer.api_used && (
                      <div className={`px-2 py-1 rounded-full text-xs ${isDark ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'}`}>
                        {answer.api_used}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className={`mb-6 ${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} overflow-hidden`}>
                <div className={`p-6 ${themeClasses.errorBg} border-b`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-red-500 mt-0.5 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-800 mb-1">Answer Generation Failed</h3>
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                </div>
                <div className={`p-4 ${themeClasses.cardBg}`}>
                  <p className={`text-sm ${themeClasses.textSecondary} mb-2 font-medium`}>Troubleshooting tips:</p>
                  <ul className={`text-sm ${themeClasses.textSecondary} space-y-1`}>
                    <li className="flex items-start gap-2">
                      <span className={themeClasses.textMuted}>•</span>
                      <span>Make sure the LLM service is configured and running</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={themeClasses.textMuted}>•</span>
                      <span>Check your API keys and rate limits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={themeClasses.textMuted}>•</span>
                      <span>Try a simpler or more focused question</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* AI Answer Display */}
            {answer && answer.answer && (
              <div className={`${themeClasses.cardBg} rounded-xl shadow-lg border ${themeClasses.border} overflow-hidden mb-6`}>
                {/* Answer Header */}
                <div className={`p-6 ${themeClasses.answerBg} border-b ${themeClasses.border}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                        <Bot className="text-white" size={24} />
                      </div>
                      <div className="flex-1">
                        <h2 className={`text-xl font-bold ${themeClasses.text} mb-2`}>AI Generated Answer</h2>
                        <div className="flex items-center gap-4 text-sm">
                          <div className={`flex items-center gap-1 ${themeClasses.textMuted}`}>
                            <Hash size={14} />
                            <span>{answer.chunks_processed || 0} sources analyzed</span>
                          </div>
                          {answer.timing && (
                            <div className={`flex items-center gap-1 ${themeClasses.textMuted}`}>
                              <Clock size={14} />
                              <span>Generated in {formatDuration(answer.timing.llm_duration || 0)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleCopyAnswer}
                      className={`p-2 rounded-lg ${themeClasses.cardBg} ${themeClasses.border} border hover:opacity-80 transition-opacity flex items-center gap-2`}
                      title="Copy answer"
                    >
                      {copied ? (
                        <CheckCircle className="text-green-500" size={16} />
                      ) : (
                        <Copy className={themeClasses.textMuted} size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Answer Content */}
                <div className="p-8">
                  <div className="prose max-w-none">
                    <div className={`${themeClasses.text} leading-relaxed text-base lg:text-lg whitespace-pre-wrap`}>
                      {answer.answer}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Source Materials */}
            {answer && answer.search_results && answer.search_results.length > 0 && (
              <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} overflow-hidden`}>
                <button
                  onClick={() => setShowSources(!showSources)}
                  className={`w-full p-4 flex items-center justify-between ${themeClasses.textSecondary} hover:${isDark ? 'bg-gray-700' : 'bg-gray-50'} transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    <ExternalLink size={16} />
                    <span className="font-medium">Source Material ({answer.search_results.length} chunks)</span>
                  </div>
                  {showSources ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {showSources && (
                  <div className={`border-t ${themeClasses.border} p-4 space-y-3`}>
                    {answer.search_results.map((chunk, index) => (
                      <div key={index} className={`p-4 ${themeClasses.sourceBg} rounded-lg`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-semibold">
                              {chunk.rank || index + 1}
                            </div>
                            <span className={`text-sm ${themeClasses.textMuted}`}>
                              {chunk.chunk_id || `Chunk ${index + 1}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {chunk.score && (
                              <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                                {(chunk.score * 100).toFixed(1)}% relevance
                              </div>
                            )}
                            {chunk.word_count && (
                              <div className={`text-xs ${themeClasses.textMuted} ${isDark ? 'bg-gray-600' : 'bg-gray-200'} px-2 py-1 rounded-full`}>
                                {chunk.word_count} words
                              </div>
                            )}
                          </div>
                        </div>
                        <p className={`text-sm ${themeClasses.textSecondary}`}>
                          {chunk.preview}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-12`}>
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full animate-ping opacity-75"></div>
                    <div className="absolute inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                      <Bot className="text-white animate-pulse" size={24} />
                    </div>
                  </div>
                  <h3 className={`text-xl font-semibold ${themeClasses.text} mb-3`}>AI is analyzing...</h3>
                  <div className="space-y-2">
                    <p className={`${themeClasses.textSecondary} mb-4`}>
                      Searching relevant content and generating a comprehensive answer
                    </p>
                    <div className="flex justify-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!searchAttempted && !loading && (
              <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-12`}>
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Bot className="text-blue-600" size={40} />
                  </div>
                  <h3 className={`text-2xl font-semibold ${themeClasses.text} mb-3`}>Ready for AI Analysis</h3>
                  <p className={`${themeClasses.textSecondary} mb-6 max-w-md mx-auto`}>
                    Ask any question about your textbook content and get a comprehensive, AI-generated answer with source citations
                  </p>
                  <div className="max-w-lg mx-auto">
                    <div className={`${isDark ? 'bg-gray-700' : 'bg-blue-50'} rounded-lg p-4`}>
                      <h4 className={`font-medium ${themeClasses.text} mb-2`}>How it works:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</div>
                          <span className={themeClasses.textSecondary}>AI searches relevant content</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">2</div>
                          <span className={themeClasses.textSecondary}>Analyzes and synthesizes information</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">3</div>
                          <span className={themeClasses.textSecondary}>Generates comprehensive answer with sources</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMAnswerPage;