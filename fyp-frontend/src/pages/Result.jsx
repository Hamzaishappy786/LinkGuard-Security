// src/pages/Result.jsx
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import FeatureTable from '../components/FeatureTable.jsx'
import RiskExplanation from '../components/RiskExplanation.jsx'
import AiAnalyst from '../components/AiAnalyst.jsx'
import { checkDownloadAuth, downloadReport } from '../utils/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function Result(){
  const { state } = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if(!state?.data){
    return (
      <div className="content-container">
        <div className="card p-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Result to Show</h3>
          <p className="text-slate-600 mb-6">Please analyze a link first.</p>
          <button onClick={()=>navigate('/')} className="btn-primary">
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  const { url, data } = state
  const safe = data.label === 'Safe'

  const handleDownload = async (format) => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
      return;
    }
    
    setIsDownloading(true);
    setDownloadMessage('');
    
    try {
      const result = await downloadReport(url, data, format);
      
      if (result.success) {
        setDownloadMessage(`Successfully downloaded ${format.toUpperCase()} report!`);
      } else {
        setDownloadMessage(`Error: ${result.error}`);
      }
    } catch (error) {
      setDownloadMessage(`Error: ${error.message}`);
    } finally {
      setIsDownloading(false);
      
      setTimeout(() => {
        setDownloadMessage('');
      }, 3000);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login', { state: { from: '/result', url, data } });
  };

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="content-container pt-8 pb-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">URL Analysis Result</h1>
          <p className="text-slate-600">Detailed security assessment of the checked URL</p>
        </div>
      </section>

      {/* Result Card */}
      <section className="content-container mb-6">
        <motion.div 
          initial={{opacity:0, y:8}} 
          animate={{opacity:1, y:0}} 
          className={`card p-6 md:p-8 border-2 ${
            safe 
              ? 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50' 
              : 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50'
          }`}
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                safe 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                  : 'bg-gradient-to-r from-red-500 to-rose-500'
              }`}>
                {safe ? (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold ${
                  safe 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {safe ? '✅ Safe URL' : '❌ Phishing URL'}
                </div>
                <div className="text-xs text-slate-500 mt-1 break-all max-w-md">{url}</div>
              </div>
            </div>
          </div>

          {/* Toggle Details Button */}
          <div className="mb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
            >
              {showDetails ? 'Hide' : 'Show'} Technical Details
              <svg 
                className={`w-4 h-4 transition-transform duration-300 ${
                  showDetails ? 'rotate-180' : ''
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Technical Details */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card p-4 bg-white/70">
                    <h3 className="text-sm font-medium mb-3">Features Analyzed</h3>
                    <div className="max-h-48 overflow-y-auto scroll-slim">
                      <FeatureTable features={data.features_used || {}} />
                    </div>
                  </div>
                  <div className="card p-4 bg-white/70">
                    <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
                    <div className="space-y-3">
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open link in new tab
                      </a>
                      <button 
                        onClick={() => navigator.clipboard.writeText(url)}
                        className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                        Copy URL
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Why this verdict - Explainable AI */}
      {data.explanation && (
        <section className="content-container mb-6">
          <RiskExplanation explanation={data.explanation} />
        </section>
      )}

      {/* AI Security Analyst - Part B (Claude) */}
      <section className="content-container mb-6">
        <AiAnalyst evidence={data} />
      </section>

      {/* Download Report Section */}
      <section className="content-container mb-6">
        <div className="card p-6">
          <h2 className="text-xl font-bold text-gradient mb-4">Download Report</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => handleDownload('word')} 
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download Word</span>
                </>
              )}
            </button>
          </div>
          
          {downloadMessage && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${
              downloadMessage.includes('Error') 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {downloadMessage}
            </div>
          )}
          
          {!isAuthenticated && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-amber-800 text-sm">
                  You need to be logged in to download reports.
                  <button 
                    onClick={handleLoginRedirect}
                    className="ml-1 text-teal-600 hover:text-teal-700 font-medium"
                  >
                    Login here
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Security Tips */}
      <section className="content-container mb-6">
        <div className="card p-6 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100">
          <h2 className="text-xl font-bold text-gradient mb-4">Security Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                icon: "✅",
                title: "Always verify URLs",
                description: "Check URLs before clicking, especially in emails or messages"
              },
              {
                icon: "🔒",
                title: "Use HTTPS",
                description: "Look for secure connections with HTTPS in the address bar"
              },
              {
                icon: "⚠️",
                title: "Avoid Short Links",
                description: "Be cautious with URL shorteners that hide the actual destination"
              },
              {
                icon: "📧",
                title: "Check Senders",
                description: "Verify email sources and look for signs of spoofing"
              }
            ].map((tip, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">{tip.icon}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{tip.title}</h3>
                  <p className="text-sm text-slate-600">{tip.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="content-container">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => navigate('/')}
            className="btn-primary"
          >
            Check Another URL
          </button>
          {isAuthenticated && (
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
            >
              View Dashboard
            </button>
          )}
        </div>
      </section>

      {/* Login Prompt Modal */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
            >
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-teal-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🔐</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Login Required</h3>
                <p className="text-slate-600 mb-6">
                  You need to be logged in to download reports. Please login or create an account to continue.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleLoginRedirect}
                  className="flex-1 btn-primary"
                >
                  Login
                </button>
                <button 
                  onClick={() => setShowLoginPrompt(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}