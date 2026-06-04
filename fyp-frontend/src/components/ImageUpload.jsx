// src/components/ImageUpload.jsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { extractUrlFromImage, checkSelectedUrls } from '../utils/api';

export default function ImageUpload({ onUrlsExtracted, setLoading }) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [linksFound, setLinksFound] = useState(0);
  const [showLinksFound, setShowLinksFound] = useState(false);
  const [allUrls, setAllUrls] = useState([]);
  const [showUrlSelection, setShowUrlSelection] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState([]);
  const [checkingUrls, setCheckingUrls] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handlePaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      
      for (const clipboardItem of clipboardItems) {
        for (const type of clipboardItem.types) {
          if (type.startsWith('image/')) {
            const blob = await clipboardItem.getType(type);
            handleFile(blob);
            return;
          }
        }
      }
      
      setError('No image found in clipboard');
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
      setError('Failed to paste image. Please use Ctrl+V or try uploading a file.');
    }
  };

  const handleFile = async (file) => {
    // Check if file is an image
    if (!file.type.match('image.*')) {
      setError('Please upload an image file (jpg, png, etc.)');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError('');
    setShowLinksFound(false);
    setShowUrlSelection(false);
    setProcessing(true);
    setLoading(true);

    try {
      // Use backend API to extract URL from image
      const result = await extractUrlFromImage(file);
      
      if (result.success && result.all_urls && result.all_urls.length > 0) {
        setAllUrls(result.all_urls);
        setLinksFound(result.all_urls.length);
        setShowLinksFound(true);
        
        // If only 1 URL found, use it directly
        if (result.all_urls.length === 1) {
          onUrlsExtracted(result.all_urls[0]);
        } else {
          // If multiple URLs found, show selection UI
          setShowUrlSelection(true);
          // Pre-select the first 3 URLs
          setSelectedUrls(result.all_urls.slice(0, 3));
        }
      } else {
        setError(result.error || 'No URLs found in the image. Please try with a clearer image.');
        setLinksFound(0);
        setShowLinksFound(true);
      }
    } catch (err) {
      console.error('Error processing image:', err);
      setError('Failed to process image. Please try again.');
      setLinksFound(0);
      setShowLinksFound(true);
    } finally {
      setProcessing(false);
      setLoading(false);
    }
  };

  const handleUrlSelectionChange = (url, isSelected) => {
    if (isSelected) {
      // Add to selection if not already selected and less than 3 selected
      if (selectedUrls.length < 3 && !selectedUrls.includes(url)) {
        setSelectedUrls([...selectedUrls, url]);
      }
    } else {
      // Remove from selection
      setSelectedUrls(selectedUrls.filter(u => u !== url));
    }
  };

  const handleCheckSelectedUrls = async () => {
    if (selectedUrls.length === 0) {
      setError('Please select at least one URL to check');
      return;
    }
    
    setCheckingUrls(true);
    setLoading(true);
    
    try {
      const results = await checkSelectedUrls(selectedUrls);
      setShowUrlSelection(false);
      onUrlsExtracted(results);
    } catch (err) {
      console.error('Error checking URLs:', err);
      setError('Failed to check URLs. Please try again.');
    } finally {
      setCheckingUrls(false);
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <motion.div 
      initial={{opacity:0, y:8}} 
      animate={{opacity:1, y:0}} 
      transition={{duration:.4, delay: 0.1}}
      className="mt-6 image-upload-container"
    >
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">Or extract URL from image</h3>
      
      <form 
        className={`relative border-2 border-dashed rounded-xl p-6 transition-colors ${
          dragActive 
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
            : 'border-slate-300 dark:border-slate-700'
        }`}
        onDragEnter={handleDrag}
        onSubmit={(e) => e.preventDefault()}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          id="image-upload" 
          className="hidden" 
          accept="image/*"
          onChange={handleChange}
          disabled={processing}
        />
        
        <div 
          className="flex flex-col items-center justify-center cursor-pointer"
          onClick={triggerFileInput}
        >
          <svg className="w-10 h-10 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500">
            PNG, JPG, GIF up to 10MB
          </p>
        </div>
        
        {dragActive && (
          <div 
            className="absolute inset-0 w-full h-full"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          ></div>
        )}
      </form>
      
      <div className="mt-3 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300 dark:border-slate-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400">Or</span>
          </div>
        </div>
      </div>
      
      <button
        type="button"
        onClick={handlePaste}
        disabled={processing}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Paste from clipboard (Ctrl+V)
      </button>
      
      {processing && (
        <motion.div 
          initial={{opacity:0, y:5}} 
          animate={{opacity:1, y:0}} 
          className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg"
        >
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Processing image...</span>
        </motion.div>
      )}
      
      {showLinksFound && (
        <motion.div 
          initial={{opacity:0, y:5}} 
          animate={{opacity:1, y:0}} 
          className={`mt-3 text-sm flex items-center gap-2 p-3 rounded-lg ${
            linksFound > 0 
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
              : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
          }`}
        >
          {linksFound > 0 ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span>
            {linksFound === 0 
              ? 'No links found' 
              : linksFound === 1 
                ? '1 link found' 
                : `${linksFound} links found`
            }
          </span>
        </motion.div>
      )}
      
      {error && (
        <motion.div 
          initial={{opacity:0, y:5}} 
          animate={{opacity:1, y:0}} 
          className="mt-3 text-sm text-rose-600 dark:text-rose-400 flex items-start gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg"
        >
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </motion.div>
      )}
      
      {/* URL Selection Modal */}
      {showUrlSelection && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowUrlSelection(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Select URLs to Check (Maximum 3)
              </h3>
              <button
                onClick={() => setShowUrlSelection(false)}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                We found {allUrls.length} URLs in the image. Please select up to 3 URLs to check.
              </p>
            </div>
            
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {allUrls.map((url, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUrls.includes(url)
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  onClick={() => handleUrlSelectionChange(url, !selectedUrls.includes(url))}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedUrls.includes(url)}
                      onChange={() => {}}
                      className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-all">
                        {url}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {selectedUrls.length} of 3 URLs selected
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUrlSelection(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckSelectedUrls}
                  disabled={selectedUrls.length === 0 || checkingUrls}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {checkingUrls ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking...
                    </>
                  ) : (
                    'Check Selected URLs'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}