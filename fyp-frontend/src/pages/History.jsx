// src/pages/History.jsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function History(){
  const [items, setItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [filterType, setFilterType] = useState('all') // all, safe, phishing
  const [sortBy, setSortBy] = useState('date') // date, url, status
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastFetchTime, setLastFetchTime] = useState(0)
  const abortControllerRef = useRef(null)
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Backend API URL - using import.meta.env for Vite
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Use useCallback to prevent unnecessary re-renders
  const fetchUserHistory = useCallback(async () => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    
    // Prevent multiple calls in quick succession
    const now = Date.now();
    if (now - lastFetchTime < 2000) return; // Don't fetch if last call was less than 2 seconds ago
    
    try {
      setLoading(true)
      setError('')
      const token = localStorage.getItem('linkguard_token');
      
      if (!token) {
        setError('Authentication token not found. Please login again.');
        setLoading(false)
        return
      }
      
      const response = await fetch(`${API_URL}/api/auth/url-checks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current.signal
      });
      
      if (response.ok) {
        const data = await response.json();
        setItems(data.url_checks || []);
        setLastFetchTime(now);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch history');
      }
    } catch (error) {
      // Don't show error for aborted requests
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch user history:', error);
        setError('Network error. Please try again.');
      }
    } finally {
      setLoading(false)
    }
  }, [lastFetchTime, API_URL]);

  useEffect(() => { 
    if (isAuthenticated) {
      fetchUserHistory()
    } else {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: '/history' } })
    }
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isAuthenticated, navigate, fetchUserHistory])

  // Function to handle search
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    
    // Search in ALL history items
    const allHistory = items
    const results = allHistory.filter(item => 
      item.url.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    setSearchResults(results)
  }

  // Function to clear search
  const clearSearch = () => {
    setSearchTerm('')
    setSearchResults([])
    setIsSearching(false)
  }

  // Function to count how many times a URL was checked
  const getCheckCount = (url) => {
    return items.filter(item => item.url === url).length
  }

  // Function to get latest result for a URL
  const getLatestResult = (url) => {
    const urlItems = items.filter(item => item.url === url)
    if (urlItems.length === 0) return null
    
    // Sort by timestamp to get the latest
    return urlItems.sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    )[0]
  }

  // Function to filter items
  const getFilteredItems = () => {
    let filteredItems = isSearching ? searchResults : items
    
    // Apply status filter
    if (filterType !== 'all') {
      filteredItems = filteredItems.filter(item => 
        filterType === 'safe' 
          ? item.result?.label === 'Safe' 
          : item.result?.label === 'Phishing'
      )
    }
    
    // Apply sorting
    filteredItems.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp) - new Date(b.timestamp)
          break
        case 'url':
          comparison = a.url.localeCompare(b.url)
          break
        case 'status':
          comparison = (a.result?.label === 'Safe' ? 0 : 1) - (b.result?.label === 'Safe' ? 0 : 1)
          break
        default:
          comparison = 0
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return filteredItems
  }

  // Get unique URLs to avoid duplicates
  const getUniqueUrls = () => {
    const uniqueUrls = new Set();
    return items.filter(item => {
      if (uniqueUrls.has(item.url)) {
        return false;
      }
      uniqueUrls.add(item.url);
      return true;
    });
  }

  const displayItems = getFilteredItems()

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen">
      {/* Header Section */}
      <section className="content-container pt-8 pb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">URL History</h1>
            <p className="text-slate-600">
              Your complete URL checking history
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={fetchUserHistory}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {/* Search and Filter Section */}
      <section className="content-container mb-6">
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
            <div className="md:col-span-8">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search for a URL in your history..."
                  className="input flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button 
                  onClick={handleSearch}
                  className="btn-primary"
                >
                  Search
                </button>
                {isSearching && (
                  <button 
                    onClick={clearSearch}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="md:col-span-4 flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input flex-1"
              >
                <option value="all">All URLs</option>
                <option value="safe">Safe Only</option>
                <option value="phishing">Phishing Only</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input flex-1"
              >
                <option value="date">Sort by Date</option>
                <option value="url">Sort by URL</option>
                <option value="status">Sort by Status</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                title={`Sort order: ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
            </div>
          )}

          {/* Search Results */}
          <AnimatePresence>
            {isSearching && !loading && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="p-4 bg-teal-50 border border-teal-100 rounded-xl">
                  <h3 className="font-semibold text-teal-800 mb-2">Search Results</h3>
                  <p className="text-teal-700 text-sm">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchTerm}"
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* History List */}
      {!loading && (
        <section className="content-container">
          <div className="card p-6">
            <AnimatePresence>
              {displayItems.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-r from-teal-100 to-cyan-100 flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🔍</span>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {isSearching ? 'No results found' : 'No URL checks yet'}
                  </h3>
                  <p className="text-slate-600 mb-6">
                    {isSearching 
                      ? `No URLs matching "${searchTerm}" were found in your history.`
                      : 'Start checking URLs to see them here.'
                    }
                  </p>
                  {!isSearching && (
                    <button 
                      onClick={() => navigate('/')}
                      className="btn-primary"
                    >
                      Check a URL
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {isSearching ? 'Search Results' : 'History'}
                    </h3>
                    <span className="text-sm text-slate-500">
                      {displayItems.length} item{displayItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {displayItems.map((item, idx) => (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-4 rounded-xl border transition-all duration-300 hover:shadow-lg ${
                        item.result?.label === 'Safe' 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-100' 
                          : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-100'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 pr-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              item.result?.label === 'Safe' 
                                ? 'bg-green-100' 
                                : 'bg-red-100'
                            }`}>
                              {item.result?.label === 'Safe' ? (
                                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <h4 className="font-semibold text-slate-900">
                              {item.result?.label === 'Safe' ? 'Safe URL' : 'Phishing URL'}
                            </h4>
                          </div>
                          <div className="text-sm font-medium text-slate-900 break-all mb-1">{item.url}</div>
                          <div className="text-xs text-slate-500 mb-2">
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                          <div className="text-sm text-slate-600 max-w-2xl">
                            {item.result?.reason || 'No explanation provided'}
                          </div>
                        </div>
                        <div className={`badge ${
                          item.result?.label === 'Safe' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.result?.label === 'Safe' ? '✅ Safe' : '❌ Phishing'}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      )}
    </div>
  )
}