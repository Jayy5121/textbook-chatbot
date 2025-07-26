"use client"
import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Zap, Brain, Target, ArrowRight, Sparkles, Clock, Shield, ChevronRight, Moon, Sun } from 'lucide-react';

const MainPage = () => {
  const [isDark, setIsDark] = useState(false);

  const featuredQueries = [
    "What is machine learning?",
    "Explain neural networks",
    "Define supervised learning",
    "How does classification work?",
    "What is overfitting?",
    "Explain feature selection"
  ];

  const features = [
    {
      icon: Brain,
      title: "AI-Powered Search",
      description: "Advanced semantic search that understands context and meaning, not just keywords"
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get instant results from your textbook content using optimized FAISS indexing"
    },
    {
      icon: Target,
      title: "Highly Accurate",
      description: "Powered by state-of-the-art transformer models for precise content matching"
    },
    {
      icon: Shield,
      title: "Reliable & Secure",
      description: "Your searches are processed locally with enterprise-grade reliability"
    }
  ];

  const stats = [
    { label: "Search Accuracy", value: "95%+" },
    { label: "Response Time", value: "<2s" },
    { label: "Content Coverage", value: "100%" },
    { label: "Query Types", value: "∞" }
  ];

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDark(savedTheme === 'dark');
    } else {
      // Check system preference
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  const themeClasses = {
    bg: isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-indigo-100',
    navBg: isDark ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200',
    cardBg: isDark ? 'bg-gray-800' : 'bg-white',
    text: isDark ? 'text-gray-100' : 'text-gray-900',
    textSecondary: isDark ? 'text-gray-300' : 'text-gray-600',
    textMuted: isDark ? 'text-gray-400' : 'text-gray-500',
    button: isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700',
    buttonSecondary: isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600 hover:border-blue-400' : 'bg-white/80 hover:bg-white text-gray-700 hover:text-blue-600 border-gray-200 hover:border-blue-300',
    sectionBg: isDark ? 'bg-gray-800' : 'bg-white',
    sectionBgAlt: isDark ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-50 to-blue-50',
    footerBg: isDark ? 'bg-gray-900' : 'bg-gray-900'
  };

  return (
    <div className={`min-h-screen ${themeClasses.bg}`}>
      
      {/* Navigation Header */}
      <nav className={`${themeClasses.navBg} backdrop-blur-sm border-b sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl">
                <BookOpen className="text-white" size={24} />
              </div>
              <div>
                <h1 className={`text-xl font-bold ${themeClasses.text}`}>Textbook AI</h1>
                <p className={`text-xs ${themeClasses.textMuted}`}>Smart Search Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${themeClasses.cardBg} border ${isDark ? 'border-gray-700' : 'border-gray-200'} hover:opacity-80 transition-opacity`}
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="text-yellow-500" size={20} />
                ) : (
                  <Moon className={themeClasses.textMuted} size={20} />
                )}
              </button>
              <button
                onClick={() => window.location.href = '/search'}
                className={`px-4 py-2 text-white rounded-lg transition-colors font-medium text-sm flex items-center gap-2 ${themeClasses.button}`}
              >
                <Search size={16} />
                Search Now
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'} rounded-full text-sm font-medium mb-8`}>
              <Sparkles size={16} />
              <span>Powered by Advanced AI Technology</span>
            </div>
            
            {/* Main Heading */}
            <h1 className={`text-5xl md:text-6xl lg:text-7xl font-bold ${themeClasses.text} mb-6 leading-tight`}>
              Find Answers in Your
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Textbook</span>
            </h1>
            
            <p className={`text-xl ${themeClasses.textSecondary} mb-12 max-w-3xl mx-auto leading-relaxed`}>
              Transform how you study with our AI-powered semantic search. Ask questions in natural language 
              and get precise, contextual answers from your textbook content instantly.
            </p>

            {/* Search CTA Button */}
            <div className="max-w-lg mx-auto mb-12">
              <button
                onClick={() => window.location.href = '/search'}
                className="w-full px-12 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all font-bold text-xl flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                <Search size={24} />
                <span>Start Searching Your Textbook</span>
                <ArrowRight size={24} />
              </button>
              <p className={`text-sm ${themeClasses.textMuted} mt-4`}>
                Click to access our AI-powered search interface
              </p>
            </div>

            {/* Featured Queries */}
            <div className="mb-16">
              <p className={`text-sm ${themeClasses.textMuted} mb-4`}>Popular search topics:</p>
              <div className="flex flex-wrap justify-center gap-3">
                {featuredQueries.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const searchUrl = `/search?q=${encodeURIComponent(query)}`;
                      window.location.href = searchUrl;
                    }}
                    className={`px-4 py-2 rounded-full border transition-all text-sm font-medium hover:shadow-md ${themeClasses.buttonSecondary}`}
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className={`text-3xl font-bold ${themeClasses.text} mb-2`}>{stat.value}</div>
                  <div className={`text-sm ${themeClasses.textSecondary}`}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className={`absolute -top-40 -right-40 w-80 h-80 ${isDark ? 'bg-blue-800' : 'bg-blue-400'} rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob`}></div>
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 ${isDark ? 'bg-indigo-800' : 'bg-indigo-400'} rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000`}></div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`py-20 ${themeClasses.sectionBg}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold ${themeClasses.text} mb-4`}>
              Why Choose Our Search?
            </h2>
            <p className={`text-xl ${themeClasses.textSecondary} max-w-3xl mx-auto`}>
              Experience the next generation of textbook search with cutting-edge AI technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className={`w-16 h-16 ${isDark ? 'bg-gradient-to-r from-blue-800 to-indigo-800' : 'bg-gradient-to-r from-blue-100 to-indigo-100'} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="text-blue-600" size={32} />
                </div>
                <h3 className={`text-xl font-semibold ${themeClasses.text} mb-3`}>{feature.title}</h3>
                <p className={`${themeClasses.textSecondary} leading-relaxed`}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={`py-20 ${themeClasses.sectionBgAlt}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`text-4xl font-bold ${themeClasses.text} mb-4`}>
              How It Works
            </h2>
            <p className={`text-xl ${themeClasses.textSecondary}`}>
              Three simple steps to find exactly what you're looking for
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                1
              </div>
              <h3 className={`text-xl font-semibold ${themeClasses.text} mb-3`}>Ask Your Question</h3>
              <p className={themeClasses.textSecondary}>
                Type your question in natural language - no need for specific keywords or complex syntax
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                2
              </div>
              <h3 className={`text-xl font-semibold ${themeClasses.text} mb-3`}>AI Analyzes Content</h3>
              <p className={themeClasses.textSecondary}>
                Our advanced AI understands context and searches through your textbook using semantic similarity
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                3
              </div>
              <h3 className={`text-xl font-semibold ${themeClasses.text} mb-3`}>Get Precise Answers</h3>
              <p className={themeClasses.textSecondary}>
                Receive ranked results with relevance scores and direct access to the most relevant content
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Revolutionize Your Study Experience?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join thousands of students who are already using AI to learn smarter, not harder
          </p>
          <button
            onClick={() => window.location.href = '/search'}
            className="px-10 py-4 bg-white text-blue-600 rounded-xl hover:bg-gray-50 transition-colors font-bold text-lg flex items-center gap-3 mx-auto hover:shadow-xl"
          >
            <Search size={24} />
            <span>Start Searching Now</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${themeClasses.footerBg} text-white py-12`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BookOpen size={20} />
              </div>
              <div>
                <div className="font-bold">Textbook AI</div>
                <div className="text-sm text-gray-400">Smart Search Assistant</div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Zap size={16} />
                <span>Powered by FAISS + Transformers</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <span>Available 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
};

export default MainPage;