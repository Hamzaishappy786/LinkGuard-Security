import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import ChangePasswordModal from '../components/ChangePasswordModal';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [urlChecks, setUrlChecks] = useState([]);
  const [stats, setStats] = useState({
    totalChecks: 0,
    safeUrls: 0,
    phishingUrls: 0
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [theme, setTheme] = useState('light');
  const [quickCheckUrl, setQuickCheckUrl] = useState('');
  const [showQuickCheck, setShowQuickCheck] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [shareData, setShareData] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState('json');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Backend API URL - using import.meta.env for Vite
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Use useCallback to prevent unnecessary re-renders
  const fetchUserUrlChecks = useCallback(async () => {
    // Prevent multiple calls in quick succession
    const now = Date.now();
    if (now - lastFetchTime < 2000) return; // Don't fetch if last call was less than 2 seconds ago
    
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('linkguard_token');
      
      if (!token) {
        setError('Authentication token not found. Please login again.');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_URL}/api/auth/url-checks`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUrlChecks(data.url_checks || []);
        
        // Calculate stats
        const total = data.url_checks.length;
        const safe = data.url_checks.filter(check => check.result.label === 'Safe').length;
        const phishing = total - safe;
        
        setStats({
          totalChecks: total,
          safeUrls: safe,
          phishingUrls: phishing
        });
        
        setLastFetchTime(now);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch URL checks');
      }
    } catch (err) {
      console.error('Failed to fetch URL checks:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [lastFetchTime, API_URL]);

  useEffect(() => {
    fetchUserUrlChecks();
    // Load user preferences
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    const savedEmailNotifications = localStorage.getItem('emailNotifications') !== 'false';
    setEmailNotifications(savedEmailNotifications);
    
    const savedBrowserNotifications = localStorage.getItem('browserNotifications') === 'true';
    setBrowserNotifications(savedBrowserNotifications);
    
    const savedShareData = localStorage.getItem('shareData') === 'true';
    setShareData(savedShareData);
  }, [fetchUserUrlChecks]);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const goToCheckUrl = () => {
    navigate('/');
  };

  const goToHistory = () => {
    navigate('/history');
  };

  const handleQuickCheck = () => {
    if (quickCheckUrl) {
      navigate('/', { state: { url: quickCheckUrl } });
      setShowQuickCheck(false);
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update preferences in backend
    fetch(`${API_URL}/api/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('linkguard_token')}`
      },
      body: JSON.stringify({
        ...user?.preferences,
        theme: newTheme
      })
    });
  };

  const handleEmailNotificationsChange = (value) => {
    setEmailNotifications(value);
    localStorage.setItem('emailNotifications', value.toString());
  };

  const handleBrowserNotificationsChange = (value) => {
    setBrowserNotifications(value);
    localStorage.setItem('browserNotifications', value.toString());
    
    if (value && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Notifications Enabled', {
        body: 'You will now receive browser notifications from LinkGuard',
        icon: '/favicon.ico'
      });
    }
  };

  const handleShareDataChange = (value) => {
    setShareData(value);
    localStorage.setItem('shareData', value.toString());
  };

  const handleExportData = () => {
    setShowExportModal(true);
  };

  const confirmExport = () => {
    // Create data to export
    const exportData = {
      user: {
        username: user?.username,
        email: user?.email,
        memberSince: user?.created_at
      },
      stats,
      urlChecks: urlChecks.slice(0, 10),
      exportDate: new Date().toISOString()
    };
    
    // Create and download file
    let dataStr, mimeType, fileName;
    
    if (exportFormat === 'json') {
      dataStr = JSON.stringify(exportData, null, 2);
      mimeType = 'application/json';
      fileName = 'linkguard-data.json';
    } else if (exportFormat === 'csv') {
      // Convert to CSV
      const headers = ['URL', 'Result', 'Timestamp'];
      const csvContent = [
        headers.join(','),
        ...urlChecks.map(check => [
          `"${check.url}"`,
          check.result.label,
          check.timestamp
        ].join(','))
      ].join('\n');
      
      dataStr = csvContent;
      mimeType = 'text/csv';
      fileName = 'linkguard-history.csv';
    }
    
    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setShowExportModal(false);
  };

  const handleChangePassword = () => {
    setShowChangePasswordModal(true);
  };

  const handleDeleteAccount = () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      fetch(`${API_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('linkguard_token')}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.message) {
          logout();
          navigate('/');
        }
      })
      .catch(err => {
        console.error('Failed to delete account:', err);
      });
    }
  };

  // Calculate activity data for the chart
  const getActivityData = () => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const dayChecks = urlChecks.filter(check => {
        const checkDate = new Date(check.timestamp);
        return checkDate >= date && checkDate < nextDate;
      });
      
      last7Days.push({
        date: date.toLocaleDateString('en', { weekday: 'short' }),
        total: dayChecks.length,
        safe: dayChecks.filter(check => check.result.label === 'Safe').length,
        phishing: dayChecks.filter(check => check.result.label === 'Phishing').length
      });
    }
    
    return last7Days;
  };

  const activityData = getActivityData();
  const maxActivity = Math.max(...activityData.map(d => d.total), 1);

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'recent', label: 'Recent Checks', icon: '🕐' },
    { id: 'activity', label: 'Activity', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
    { id: 'data', label: 'Data Management', icon: '💾' }
  ];

  return (
    <div className={`min-h-screen flex ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-slate-800 text-white transition-all duration-300 ease-in-out`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <h1 className={`text-xl font-bold ${!sidebarOpen && 'hidden'}`}>LinkGuard</h1>
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded hover:bg-slate-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          <nav className="space-y-2">
            {sidebarItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center ${sidebarOpen ? 'justify-start' : 'justify-center'} gap-3 p-3 rounded-lg transition-colors ${
                  activeTab === item.id ? 'bg-slate-700' : 'hover:bg-slate-700'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
          
          <div className={`mt-auto pt-8 ${!sidebarOpen && 'hidden'}`}>
            <div className="p-3 bg-slate-700 rounded-lg">
              <p className="text-sm font-medium">{user?.username}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button 
              onClick={logout}
              className="w-full mt-4 p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <header className="mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                Welcome, {user?.username}!
              </h1>
              <button 
                onClick={fetchUserUrlChecks}
                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </button>
            </div>
          </header>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {/* Tab Content - Only show when not loading */}
          {!loading && (
            <AnimatePresence mode="wait">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">Total Checks</h3>
                        <span className="text-2xl">📊</span>
                      </div>
                      <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalChecks}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">Safe URLs</h3>
                        <span className="text-2xl">✅</span>
                      </div>
                      <p className="text-3xl font-bold text-green-600">{stats.safeUrls}</p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">Phishing URLs</h3>
                        <span className="text-2xl">⚠️</span>
                      </div>
                      <p className="text-3xl font-bold text-red-600">{stats.phishingUrls}</p>
                    </div>
                  </div>

                  {/* User Profile Card */}
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Your Profile</h2>
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-full bg-teal-500 flex items-center justify-center">
                          <span className="text-3xl text-white font-bold">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Username</p>
                          <p className="font-semibold text-slate-800 dark:text-white">{user?.username}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                          <p className="font-semibold text-slate-800 dark:text-white">{user?.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Member Since</p>
                          <p className="font-semibold text-slate-800 dark:text-white">
                            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">Account Status</p>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <p className="font-semibold text-green-600">Active</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <button 
                      onClick={goToCheckUrl}
                      className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                          <span className="text-2xl">🔍</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-white">Check New URL</h3>
                          <p className="text-slate-600 dark:text-slate-400">Analyze a new URL for safety</p>
                        </div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={goToHistory}
                      className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                          <span className="text-2xl">📜</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-white">View History</h3>
                          <p className="text-slate-600 dark:text-slate-400">See all your previous checks</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'recent' && (
                <motion.div
                  key="recent"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Recent URL Checks</h2>
                    {urlChecks.length === 0 ? (
                      <p className="text-slate-600 dark:text-slate-400">No URL checks yet. Start by checking a URL!</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                              <th className="text-left py-2 text-slate-600 dark:text-slate-400">URL</th>
                              <th className="text-left py-2 text-slate-600 dark:text-slate-400">Result</th>
                              <th className="text-left py-2 text-slate-600 dark:text-slate-400">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {urlChecks.slice(0, 10).map((check, index) => (
                              <tr key={index} className="border-b border-slate-100 dark:border-slate-700">
                                <td className="py-3 text-slate-800 dark:text-white truncate max-w-xs">{check.url}</td>
                                <td className="py-3">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    check.result.label === 'Safe' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  }`}>
                                    {check.result.label}
                                  </span>
                                </td>
                                <td className="py-3 text-slate-600 dark:text-slate-400">
                                  {new Date(check.timestamp).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Activity Overview</h2>
                    <div className="space-y-4">
                      {activityData.map((day, index) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-16 text-sm text-slate-600 dark:text-slate-400">{day.date}</div>
                          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-8 relative overflow-hidden">
                            <div 
                              className="absolute top-0 left-0 h-full bg-teal-500 rounded-full flex items-center justify-end pr-2"
                              style={{ width: `${(day.total / maxActivity) * 100}%` }}
                            >
                              {day.total > 0 && <span className="text-xs text-white font-medium">{day.total}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2 text-xs">
                            {day.safe > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                                {day.safe} Safe
                              </span>
                            )}
                            {day.phishing > 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
                                {day.phishing} Phishing
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'settings' && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">Settings</h2>
                    
                    <div className="space-y-6">
                      {/* Notification Settings */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white">Notifications</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">Email Notifications</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Receive security alerts via email</p>
                            </div>
                            <button 
                              onClick={() => handleEmailNotificationsChange(!emailNotifications)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                                emailNotifications ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
                              } transition-colors`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                emailNotifications ? 'translate-x-6' : 'translate-x-1'
                              }`}></span>
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white">Browser Notifications</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Receive alerts in your browser</p>
                            </div>
                            <button 
                              onClick={() => handleBrowserNotificationsChange(!browserNotifications)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                                browserNotifications ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
                              } transition-colors`}
                            >
                              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                browserNotifications ? 'translate-x-6' : 'translate-x-1'
                              }`}></span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Privacy Settings */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white">Privacy</h3>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white">Share Usage Data</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Help improve LinkGuard with anonymous usage data</p>
                          </div>
                          <button 
                            onClick={() => handleShareDataChange(!shareData)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                              shareData ? 'bg-teal-600' : 'bg-slate-300 dark:bg-slate-600'
                            } transition-colors`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                              shareData ? 'translate-x-6' : 'translate-x-1'
                            }`}></span>
                          </button>
                        </div>
                      </div>

                      {/* Account Actions */}
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white">Account</h3>
                        <div className="space-y-3">
                          <button 
                            onClick={handleChangePassword}
                            className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors text-left"
                          >
                            Change Password
                          </button>
                          <button 
                            onClick={handleDeleteAccount}
                            className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-200 rounded-lg font-medium transition-colors text-left"
                          >
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'data' && (
                <motion.div
                  key="data"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">Data Management</h2>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white">Export Your Data</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4">
                          Download your URL check history and account data in various formats.
                        </p>
                        <button 
                          onClick={handleExportData}
                          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
                        >
                          Export Data
                        </button>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-3 text-slate-800 dark:text-white">Data Summary</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Total URL Checks</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{stats.totalChecks}</p>
                          </div>
                          <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                            <p className="text-sm text-slate-600 dark:text-slate-400">Account Created</p>
                            <p className="text-lg font-bold text-slate-800 dark:text-white">
                              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        show={showChangePasswordModal} 
        onClose={() => setShowChangePasswordModal(false)} 
      />

      {/* Export Data Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-white">Export Your Data</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">Export Format</label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="exportFormat"
                        value="json"
                        checked={exportFormat === 'json'}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="w-4 h-4 text-teal-600"
                      />
                      <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">JSON</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="exportFormat"
                        value="csv"
                        checked={exportFormat === 'csv'}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="w-4 h-4 text-teal-600"
                      />
                      <span className="ml-2 text-sm text-slate-700 dark:text-slate-300">CSV</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmExport}
                    className="flex-1 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition-colors"
                  >
                    Export
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;