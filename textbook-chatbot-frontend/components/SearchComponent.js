"use client"
import React, { useState, useEffect } from 'react';
import { Search, BookOpen, AlertCircle, RefreshCw, Lightbulb, Zap, Clock, Hash, Moon, Sun, Bot, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const SearchComponent = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [isDark, setIsDark] = useState(false);


  // Replace the hardcoded searchSuggestions array with a dynamic object
  const searchSuggestionsByTextbook = {
    'computer_networks': [
      "What is a computer network?",
      "Explain the OSI model",
      "What is IP addressing?",
      "Define packet switching",
      "What is TCP/IP?",
      "How does DNS work?",
      "What are network protocols?",
      "Explain network topologies"
    ],
    'economics': [
      "What is demand?",
      "Explain the law of supply and demand",
      "What is GDP?",
      "Define inflation",
      "What are market structures?",
      "What is opportunity cost?",
      "Explain economic equilibrium",
      "What is monetary policy?"
    ],

    // Default fallback for any unmapped textbooks
    'ML': [
      "What is machine learning?",
      "Define neural networks",
      "Explain supervised learning",
      "What are algorithms?",
      "Introduction to data science",
      "How does classification work?",
      "What is regression?",
      "Explain feature selection"
    ]
  };

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
  const [selectedTextbook, setSelectedTextbook] = useState('intro_ml'); // Default textbook
  const [availableTextbooks] = useState([
    { id: 'intro_ml', name: 'Introduction to Machine Learning', description: 'ML algorithms and concepts' },
    { id: 'computer_networks', name: 'Computer Networks', description: 'Network protocols and systems' },
    { id: 'economics', name: 'Economics', description: 'Economic principles and theories' }
  ]);
const getCurrentSuggestions = () => {
  return searchSuggestionsByTextbook[selectedTextbook] || searchSuggestionsByTextbook['ML'];
};

  // Extract query from URL and auto-search on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    const textbookParam = urlParams.get('textbook');

    if (textbookParam && availableTextbooks.find(t => t.id === textbookParam)) {
      setSelectedTextbook(textbookParam);
    }

    if (queryParam) {
      setQuery(queryParam);
      // Wait for textbook to be set before searching
      setTimeout(() => performSearch(queryParam, textbookParam || selectedTextbook), 100);
    }
  }, []);

  const performSearch = async (searchQuery, textbook = selectedTextbook) => {
    if (!searchQuery || !searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setResults([]);
    setSearchAttempted(true);

    try {
      const response = await fetch('http://localhost:5000/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery.trim(),
          top_k: 5,
          textbook: textbook  // Add textbook parameter
        }),
      });



      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Handle the new JSON format
      if (data && data.results && Array.isArray(data.results)) {
        setResults(data.results);
      } else if (data && data.error) {
        throw new Error(data.error);
      } else {
        // Fallback for unexpected format
        setResults([]);
      }

    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    await performSearch(query, selectedTextbook);

    // Update URL with query and textbook parameters
    if (query.trim()) {
      const newUrl = `/search?textbook=${selectedTextbook}&q=${encodeURIComponent(query.trim())}`;
      window.history.pushState({}, '', newUrl);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuery(suggestion);
    performSearch(suggestion, selectedTextbook);

    // Update URL
    const newUrl = `/search?textbook=${selectedTextbook}&q=${encodeURIComponent(suggestion)}`;
    window.history.pushState({}, '', newUrl);
  };

  const handleGetLLMAnswer = () => {
    if (query.trim()) {
      router.push(`/search/answer?textbook=${selectedTextbook}&q=${encodeURIComponent(query.trim())}`);
    }
  };

  const truncateText = (text, maxLength = 500) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
    resultHeader: isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      {/* Header */}
      <div className={`${themeClasses.headerBg} border-b shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BookOpen className="text-white" size={24} />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${themeClasses.text}`}>Textbook Search</h1>
                <p className={`text-sm ${themeClasses.textMuted}`}>AI-powered semantic search</p>

              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs ${themeClasses.textMuted}`}>Textbook:</span>
                <select
                  value={selectedTextbook}
                  onChange={(e) => setSelectedTextbook(e.target.value)}
                  className={`text-xs px-2 py-1 rounded border ${themeClasses.input} ${themeClasses.textSecondary}`}
                >
                  {availableTextbooks.map((textbook) => (
                    <option key={textbook.id} value={textbook.id}>
                      {textbook.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/search/answer"
                className={`px-4 py-2 text-sm rounded-lg ${themeClasses.cardBg} ${themeClasses.border} border hover:opacity-80 transition-opacity ${themeClasses.textSecondary} flex items-center gap-2`}
              >
                <Bot size={16} />
                AI Answer
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
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-500">
                <Zap className="text-yellow-500" size={16} />
                <span className={themeClasses.textMuted}>Powered by FAISS + Transformers</span>
              </div>
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
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${themeClasses.textMuted}`} size={20} />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                      placeholder="Ask a question about your textbook..."
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:border-transparent text-sm ${themeClasses.input}`}
                      disabled={loading}
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    className={`w-full px-4 py-3 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors ${themeClasses.button}`}
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search size={18} />
                        Search
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* LLM Answer Card */}
              {results.length > 0 && (
                <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                      <Bot className="text-white" size={20} />
                    </div>
                    <div>
                      <h3 className={`font-semibold ${themeClasses.text}`}>Get AI Answer</h3>
                      <p className={`text-sm ${themeClasses.textMuted}`}>Comprehensive analysis</p>
                    </div>
                  </div>
                  <p className={`text-sm ${themeClasses.textSecondary} mb-4`}>
                    Get a detailed, AI-generated answer based on the search results above.
                  </p>
                  <button
                    onClick={handleGetLLMAnswer}
                    disabled={!query.trim()}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors"
                  >
                    <Bot size={18} />
                    Generate AI Answer
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {/* Search Suggestions */}
              {!searchAttempted && (
                <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-6`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="text-yellow-500" size={18} />
                    <h3 className={`font-semibold ${themeClasses.text}`}>Example Queries</h3>
                  </div>
                  <div className="space-y-2">
                    {getCurrentSuggestions().map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors border ${themeClasses.suggestion}`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Results Area */}
          <div className="lg:col-span-8 xl:col-span-9">

            {/* Search Status */}
            {searchAttempted && !loading && !error && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="text-blue-500" size={16} />
                  <span className={`text-sm ${themeClasses.textSecondary}`}>
                    Search in <span className="font-medium text-blue-600">{availableTextbooks.find(t => t.id === selectedTextbook)?.name}</span> for: <span className={`font-medium ${themeClasses.text}`}>"{query}"</span>
                  </span>
                </div>
                <div className={`text-sm ${themeClasses.textMuted}`}>
                  {results.length} results found
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
                      <h3 className="font-semibold text-red-800 mb-1">Search Error</h3>
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                </div>
                <div className={`p-4 ${themeClasses.cardBg}`}>
                  <p className={`text-sm ${themeClasses.textSecondary} mb-2 font-medium`}>Troubleshooting tips:</p>
                  <ul className={`text-sm ${themeClasses.textSecondary} space-y-1`}>
                    <li className="flex items-start gap-2">
                      <span className={themeClasses.textMuted}>•</span>
                      <span>Make sure the backend server is running on port 5000</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={themeClasses.textMuted}>•</span>
                      <span>Check if the FAISS index has been properly generated</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className={themeClasses.textMuted}>•</span>
                      <span>Try a simpler or more general query</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* No Results Message */}
            {searchAttempted && !loading && !error && results.length === 0 && (
              <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} overflow-hidden`}>
                <div className={`p-6 ${themeClasses.warningBg} border-b`}>
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" size={24} />
                    <div className="flex-1">
                      <h3 className="font-semibold text-yellow-800 mb-2">No Results Found</h3>
                      <p className="text-yellow-700 mb-4">
                        Your search for "<strong>{query}</strong>" didn't return any results.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-6 ${themeClasses.cardBg} space-y-4`}>
                  <div>
                    <h4 className={`font-medium ${themeClasses.text} mb-2`}>Try these suggestions:</h4>
                    <ul className={`text-sm ${themeClasses.textSecondary} space-y-1`}>
                      <li className="flex items-start gap-2">
                        <span className={themeClasses.textMuted}>•</span>
                        <span>Use more general or common terms</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={themeClasses.textMuted}>•</span>
                        <span>Check your spelling</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className={themeClasses.textMuted}>•</span>
                        <span>Try breaking complex questions into simpler parts</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h4 className={`font-medium ${themeClasses.text} mb-3`}>Quick suggestions:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {searchSuggestions.slice(0, 4).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-2 text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg transition-colors text-left"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Results Display */}
            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={result.chunk_id || index} className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} overflow-hidden hover:shadow-md transition-shadow`}>

                    {/* Result Header */}
                    <div className={`p-4 ${themeClasses.resultHeader} border-b`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold">
                            {result.rank || index + 1}
                          </div>
                          <span className={`text-sm font-medium ${themeClasses.textSecondary}`}>
                            Search Result
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {result.score && (
                            <div className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
                              <Zap size={12} />
                              <span>{(result.score * 100).toFixed(1)}% match</span>
                            </div>
                          )}
                          {result.word_count && (
                            <div className={`flex items-center gap-1 text-xs ${themeClasses.textMuted} ${isDark ? 'bg-gray-600' : 'bg-gray-200'} px-2 py-1 rounded-full`}>
                              <Clock size={12} />
                              <span>{result.word_count} words</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Result Content */}
                    <div className="p-6">
                      <div className="prose max-w-none">
                        <p className={`${themeClasses.text} leading-relaxed text-sm lg:text-base`}>
                          {truncateText(result.content, 800)}
                        </p>
                      </div>

                      {result.chunk_id && result.chunk_id !== 'Unknown' && (
                        <div className={`mt-4 pt-4 border-t ${isDark ? 'border-gray-600' : 'border-gray-100'}`}>
                          <div className={`flex items-center gap-1 text-xs ${themeClasses.textMuted}`}>
                            <Hash size={12} />
                            <span>Chunk ID: {result.chunk_id}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-10`}>
                <div className="text-center">
                  <div className="relative w-12 h-12 mx-auto mb-4">
                    <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75 z-0"></div>
                    <RefreshCw className="animate-spin text-blue-600 w-full h-full relative z-10" />
                  </div>
                  <h3 className={`text-lg font-semibold ${themeClasses.text} mb-2`}>Searching...</h3>
                  <p className={themeClasses.textSecondary}>Analyzing textbook content with AI semantic search</p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!searchAttempted && !loading && (
              <div className={`${themeClasses.cardBg} rounded-xl shadow-sm border ${themeClasses.border} p-12`}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="text-blue-600" size={32} />
                  </div>
                  <h3 className={`text-xl font-semibold ${themeClasses.text} mb-2`}>Ready to Search</h3>
                  <p className={`${themeClasses.textSecondary} mb-6`}>
                    Enter your question in the search box to find relevant content from your textbook
                  </p>
                  <div className="max-w-md mx-auto">
                    <p className={`text-sm ${themeClasses.textMuted}`}>
                      Our AI-powered search understands context and meaning, not just keywords
                    </p>
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

export default SearchComponent;