// src/pages/Home.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import Spinner from '../components/Spinner.jsx'
import ImageUpload from '../components/ImageUpload.jsx'
import { predictAndSaveUrl, checkHealth } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Home(){
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [backendStatus, setBackendStatus] = useState('checking')
  const [checkingStage, setCheckingStage] = useState(0)
  const [showExamples, setShowExamples] = useState(false)
  const [activeExample, setActiveExample] = useState(0)
  const [urlHistory, setUrlHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [threatFeed, setThreatFeed] = useState([])
  const [activeTip, setActiveTip] = useState(0)
  const [showDemo, setShowDemo] = useState(false)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const containerRef = useRef(null)
  
  // Scroll animations
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  // Example URLs to demonstrate
  const exampleUrls = [
    { url: "https://github.com", label: "Safe", description: "Popular code hosting platform" },
    { url: "https://google.com", label: "Safe", description: "World's most popular search engine" },
    { url: "http://example-phishing-site.com", label: "Phishing", description: "Example of a phishing site" }
  ];

  // Security tips
  const securityTips = [
    { icon: "🔍", title: "Verify URLs", text: "Always check URLs before clicking, especially in emails" },
    { icon: "🔒", title: "Use HTTPS", text: "Look for secure connections with HTTPS in the address bar" },
    { icon: "⚠️", title: "Avoid Short Links", text: "Be cautious with URL shorteners that hide the actual destination" },
    { icon: "📧", title: "Check Senders", text: "Verify email sources and look for signs of spoofing" },
    { icon: "🛡️", title: "Use 2FA", text: "Enable two-factor authentication when available" },
    { icon: "🔐", title: "Strong Passwords", text: "Use unique, complex passwords for each account" }
  ];

  // Simulated threat feed
  useEffect(() => {
    const interval = setInterval(() => {
      const threats = [
        { type: 'phishing', url: 'fake-bank-login.com', time: 'Just now', severity: 'high' },
        { type: 'malware', url: 'suspicious-download.net', time: '2 min ago', severity: 'medium' },
        { type: 'phishing', url: 'paypal-security-alert.com', time: '5 min ago', severity: 'high' },
        { type: 'scam', url: 'lottery-winner-notification.com', time: '12 min ago', severity: 'low' }
      ];
      
      setThreatFeed(prev => {
        const newThreat = threats[Math.floor(Math.random() * threats.length)];
        return [newThreat, ...prev.slice(0, 4)];
      });
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTip((prev) => (prev + 1) % securityTips.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function checkBackend() {
      try {
        await checkHealth()
        setBackendStatus('connected')
      } catch (error) {
        setBackendStatus('disconnected')
        console.error('Backend not connected:', error)
      }
    }
    
    checkBackend()
    
    // Load URL history from localStorage
    const savedHistory = localStorage.getItem('urlHistory');
    if (savedHistory) {
      setUrlHistory(JSON.parse(savedHistory));
    }
  }, [])

  const checkingStages = [
    { title: "Analyzing URL structure", icon: "🔍", color: "from-teal-500 to-cyan-500" },
    { title: "Checking domain reputation", icon: "🌐", color: "from-blue-500 to-indigo-500" },
    { title: "Scanning for malicious patterns", icon: "🛡️", color: "from-purple-500 to-pink-500" },
    { title: "Verifying SSL certificate", icon: "🔐", color: "from-green-500 to-emerald-500" },
    { title: "Finalizing security assessment", icon: "✅", color: "from-teal-500 to-cyan-500" }
  ];

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setCheckingStage((prev) => (prev + 1) % checkingStages.length);
      }, 800);
      
      return () => clearInterval(interval);
    } else {
      setCheckingStage(0);
    }
  }, [loading]);

  // Auto-rotate examples
  useEffect(() => {
    if (showExamples) {
      const interval = setInterval(() => {
        setActiveExample((prev) => (prev + 1) % exampleUrls.length);
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [showExamples, exampleUrls.length]);

  // Updated handlePredict function
  async function handlePredict(){
    setError('')
    try{ 
      new URL(url) 
    } catch { 
      setError('Please enter a valid URL (http/https)'); 
      return 
    }
    
    // Add to history
    const newHistory = [url, ...urlHistory.slice(0, 4)];
    setUrlHistory(newHistory);
    localStorage.setItem('urlHistory', JSON.stringify(newHistory));
    
    setLoading(true)
    try{
      console.log('Checking URL:', url)
      const data = await predictAndSaveUrl(url)
      console.log('Result:', data)
      
      // If user is authenticated, refresh their data
      if (isAuthenticated) {
        console.log('URL check saved to user history');
        // We don't need to fetch data here, it will be fetched when dashboard is loaded
      }
      
      navigate('/result', { state: { url, data } })
    }catch(e){
      console.error('Prediction error:', e)
      setError(e?.response?.data?.error || e?.message || 'Server error - unable to get prediction')
    }finally{ 
      setLoading(false) 
    }
  }

  const handleUrlsExtracted = (urlsOrResults) => {
    // Check if it's a single URL or multiple results
    if (typeof urlsOrResults === 'string') {
      // Single URL
      setUrl(urlsOrResults);
    } else if (urlsOrResults && urlsOrResults.results) {
      // Multiple URLs results
      navigate('/multiple-results', { state: { results: urlsOrResults.results } });
    }
  };

  const handleExampleClick = (exampleUrl) => {
    setUrl(exampleUrl);
    setShowExamples(false);
  };

  const handleHistoryClick = (historyUrl) => {
    setUrl(historyUrl);
    setShowHistory(false);
  };

  const handleDemo = () => {
    setShowDemo(true);
    // Auto-fill with a phishing example
    setUrl('http://example-phishing-site.com');
    setTimeout(() => {
      handlePredict();
    }, 1500);
  };

  return (
    <div className="min-h-screen overflow-hidden" ref={containerRef}>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-10 w-64 h-64 rounded-full bg-teal-200 opacity-20 blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-violet-200 opacity-20 blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
      </div>

      {/* Hero Section with Parallax Effect */}
      <motion.section 
        className="content-container pt-8 pb-6 relative z-10"
        style={{ y, opacity }}
      >
        <div className="text-center">
          <motion.h1 
            className="text-4xl md:text-6xl font-bold mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <span className="text-gradient">Protect Yourself</span>
            <br />
            <span className="text-slate-900 dark:text-white">From Phishing Attacks</span>
          </motion.h1>
          <motion.p 
            className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Advanced AI-powered URL checker that analyzes links in real-time to keep you safe from online threats
          </motion.p>
          
          <motion.div 
            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
              backendStatus === 'connected' 
                ? 'bg-green-100 text-green-700 border border-green-200' 
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className={`w-2 h-2 rounded-full ${
              backendStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
              {backendStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </motion.div>
        </div>
      </motion.section>

      {/* Live Threat Feed */}
      <section className="content-container mb-6 relative z-10">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gradient flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Live Threat Feed
            </h3>
            <button
              onClick={() => setShowDemo(true)}
              className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-sm font-medium transition-colors"
            >
              Try Demo
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
            {threatFeed.map((threat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className={`w-2 h-2 rounded-full ${
                  threat.severity === 'high' ? 'bg-red-500' :
                  threat.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      threat.type === 'phishing' ? 'bg-red-100 text-red-700' :
                      threat.type === 'malware' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {threat.type}
                    </span>
                    <span className="text-sm font-medium text-slate-900 truncate max-w-xs">{threat.url}</span>
                  </div>
                  <div className="text-xs text-slate-500">{threat.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Welcome Banner for Authenticated Users */}
      <AnimatePresence>
        {isAuthenticated && (
          <motion.div 
            initial={{opacity:0, y:8}} 
            animate={{opacity:1, y:0}} 
            exit={{opacity:0, y:-8}}
            transition={{duration:.4}}
            className="content-container mb-6 relative z-10"
          >
            <div className="card p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center">
                    <span className="text-xl">👋</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gradient">Welcome back!</h2>
                    <p className="text-slate-600 text-sm">Continue checking URLs or visit your dashboard for more features.</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary text-sm"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main URL Checker with Enhanced Features */}
      <section className="content-container mb-8 relative z-10">
        <div className="card p-6 md:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-gradient mb-3">Check Any URL Instantly</h2>
            <p className="text-slate-600">Enter a URL below to analyze it for phishing threats</p>
          </div>

          <div className="max-w-2xl mx-auto">
            {/* URL Input with History and Examples */}
            <div className="relative mb-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-9 col-span-12 relative">
                  <input
                    value={url}
                    onChange={e=>setUrl(e.target.value)}
                    placeholder="https://example.com/login"
                    className="input pr-10"
                    onFocus={() => urlHistory.length > 0 && setShowHistory(true)}
                    onKeyPress={(e) => e.key === 'Enter' && handlePredict()}
                  />
                  {url && (
                    <button
                      onClick={() => setUrl('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="md:col-span-3 col-span-12 flex gap-2">
                  <button 
                    onClick={handlePredict} 
                    disabled={loading} 
                    className="btn-primary flex-1"
                  >
                    {loading ? <div className="flex items-center gap-2"><Spinner /><span>Checking…</span></div> : 'Check URL'}
                  </button>
                  <button
                    onClick={() => setShowExamples(!showExamples)}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                    title="Example URLs"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* URL History Dropdown */}
              <AnimatePresence>
                {showHistory && urlHistory.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-20 overflow-hidden"
                  >
                    <div className="p-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">Recent URLs</div>
                      {urlHistory.map((historyUrl, index) => (
                        <button
                          key={index}
                          onClick={() => handleHistoryClick(historyUrl)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {historyUrl}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Examples Dropdown */}
              <AnimatePresence>
                {showExamples && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 z-20 overflow-hidden"
                  >
                    <div className="p-2">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 py-1">Example URLs</div>
                      {exampleUrls.map((example, index) => (
                        <button
                          key={index}
                          onClick={() => handleExampleClick(example.url)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            activeExample === index 
                              ? 'bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700' 
                              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                example.label === 'Safe' 
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {example.label}
                              </span>
                              <span className="text-sm text-slate-700 dark:text-slate-300 truncate max-w-xs">{example.url}</span>
                            </div>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 ml-2">{example.description}</div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {error && (
              <motion.div 
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                {error}
              </motion.div>
            )}

            {/* Image Upload Component */}
            <div className="mb-6">
              <ImageUpload 
                onUrlsExtracted={handleUrlsExtracted}
                setLoading={setLoading}
              />
            </div>

            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl hero-gradient flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">💡</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">How It Works</h3>
                  <p className="text-slate-600 text-sm">Our AI analyzes multiple factors including URL structure, domain reputation, and security certificates to provide accurate phishing detection in seconds.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Tips Carousel */}
      <section className="content-container mb-8 relative z-10">
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gradient mb-4 text-center">Security Tips</h2>
          <div className="flex items-center justify-center">
            <button
              onClick={() => setActiveTip((activeTip - 1 + securityTips.length) % securityTips.length)}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="max-w-md mx-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTip}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-teal-100 to-cyan-100 flex items-center justify-center mx-auto mb-3">
                    <span className="text-3xl">{securityTips[activeTip].icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{securityTips[activeTip].title}</h3>
                  <p className="text-slate-600">{securityTips[activeTip].text}</p>
                </motion.div>
              </AnimatePresence>
            </div>
            
            <button
              onClick={() => setActiveTip((activeTip + 1) % securityTips.length)}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          
          <div className="flex justify-center mt-4">
            {securityTips.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveTip(index)}
                className={`w-2 h-2 rounded-full mx-1 transition-colors ${
                  index === activeTip ? 'bg-teal-500' : 'bg-slate-300'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Features Section */}
      <section className="content-container mb-8 relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gradient mb-3">Why Choose LinkGuard?</h2>
          <p className="text-slate-600">Discover the features that make us the best choice for your online security</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '⚡',
              title: 'Lightning Fast',
              description: 'Get instant results with our advanced AI-powered analysis',
              color: 'from-yellow-400 to-orange-500',
              details: 'Our proprietary algorithm analyzes URLs in milliseconds, providing you with instant feedback without compromising accuracy.'
            },
            {
              icon: '🎯',
              title: 'Accurate Detection',
              description: 'Industry-leading accuracy in identifying phishing threats',
              color: 'from-red-400 to-pink-500',
              details: 'With a 99.7% accuracy rate, our system is trained on millions of phishing examples to identify even the most sophisticated attacks.'
            },
            {
              icon: '📊',
              title: 'Detailed Reports',
              description: 'Comprehensive analysis with confidence scores and explanations',
              color: 'from-blue-400 to-indigo-500',
              details: 'Get detailed insights into why a URL was flagged, including specific risk factors and recommendations.'
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card p-5 text-center group cursor-pointer"
              whileHover={{ y: -5 }}
              onClick={() => {
                // Toggle details visibility
                const detailsElement = document.getElementById(`details-${index}`);
                if (detailsElement) {
                  detailsElement.classList.toggle('hidden');
                }
              }}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                <span className="text-2xl">{feature.icon}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600 text-sm mb-3">{feature.description}</p>
              <div className="text-xs text-teal-600 font-medium flex items-center justify-center gap-1">
                <span>Click to learn more</span>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <div id={`details-${index}`} className="hidden mt-3 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-600 text-left">{feature.details}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Interactive Statistics Section */}
      <section className="content-container mb-8 relative z-10">
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gradient mb-4 text-center">Real-Time Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "URLs Checked Today", value: "12,543", icon: "🔍", change: "+12%" },
              { label: "Threats Blocked", value: "1,847", icon: "🛡️", change: "+8%" },
              { label: "Active Users", value: "3,291", icon: "👥", change: "+15%" },
              { label: "Accuracy Rate", value: "99.7%", icon: "📊", change: "+0.1%" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                className="stat-card p-3 text-center"
                whileHover={{ y: -5 }}
              >
                <div className="text-2xl mb-1">{stat.icon}</div>
                <div className="text-xl font-bold text-slate-900">{stat.value}</div>
                <div className="text-xs text-slate-500">{stat.label}</div>
                <div className={`text-xs mt-1 font-medium ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section for Non-Authenticated Users */}
      <AnimatePresence>
        {!isAuthenticated && (
          <motion.section 
            initial={{opacity:0, y:8}} 
            animate={{opacity:1, y:0}} 
            exit={{opacity:0, y:-8}}
            transition={{duration:.4, delay: 0.2}}
            className="content-container mb-8 relative z-10"
          >
            <div className="card p-6 bg-gradient-to-r from-teal-50 to-violet-50 border border-teal-100 text-center">
              <h2 className="text-2xl font-bold text-gradient mb-3">Join LinkGuard Today</h2>
              <p className="text-slate-600 mb-5 max-w-2xl mx-auto">
                Create an account to save your URL checks, view statistics, and get personalized security recommendations.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button 
                  onClick={() => navigate('/login')}
                  className="px-6 py-2.5 rounded-xl font-semibold bg-white/90 text-slate-700 hover:bg-white transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Login
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="btn-primary"
                >
                  Sign Up Free
                </button>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Engaging Activity During URL Checking */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            >
              <div className="flex flex-col items-center">
                <div className="relative mb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${checkingStages[checkingStage].color} flex items-center justify-center shadow-lg`}>
                    <span className="text-3xl">{checkingStages[checkingStage].icon}</span>
                  </div>
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-30 pulse-animation"></div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {checkingStages[checkingStage].title}
                </h3>
                
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div 
                    className={`h-2 rounded-full bg-gradient-to-r ${checkingStages[checkingStage].color} transition-all duration-500`} 
                    style={{ width: `${((checkingStage + 1) / checkingStages.length) * 100}%` }}
                  ></div>
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 text-center text-sm">
                  We're analyzing the URL to keep you safe from phishing attacks. This usually takes just a few seconds.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo Modal */}
      <AnimatePresence>
        {showDemo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowDemo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-rose-100 to-red-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🚨</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Phishing Demo</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  We're checking a known phishing site to show you how our system detects threats.
                </p>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>URL:</strong> http://example-phishing-site.com
                  </p>
                </div>
                <button
                  onClick={() => setShowDemo(false)}
                  className="w-full btn-primary"
                >
                  Got it!
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}