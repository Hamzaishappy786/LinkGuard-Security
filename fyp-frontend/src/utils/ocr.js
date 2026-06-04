// src/utils/ocr.js
import { createWorker } from 'tesseract.js';

// Function to extract URLs from text using regex
export function extractUrlsFromText(text) {
  // Stricter regex pattern for URLs
  const urlRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;
  
  const matches = text.match(urlRegex) || [];
  
  // Clean up and normalize URLs
  const cleanedUrls = matches.map(url => {
    // Remove trailing punctuation
    url = url.replace(/[.,;:!?)}\]]+$/, '');
    
    // Add protocol if missing
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    
    return url;
  });
  
  // Remove duplicates - improved duplicate detection logic
  const uniqueUrls = [];
  const seenUrls = new Set();
  
  for (const url of cleanedUrls) {
    try {
      const urlObj = new URL(url);
      // Create a normalized version for comparison
      const normalized = urlObj.protocol + '//' + 
                        urlObj.hostname.replace(/^www\./, '') + 
                        (urlObj.pathname.endsWith('/') && urlObj.pathname.length > 1 
                          ? urlObj.pathname.slice(0, -1) 
                          : urlObj.pathname) +
                        (urlObj.search ? urlObj.search : '') +
                        (urlObj.hash ? urlObj.hash : '');
      
      if (!seenUrls.has(normalized.toLowerCase())) {
        seenUrls.add(normalized.toLowerCase());
        uniqueUrls.push(url);
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  return uniqueUrls;
}

// Function to perform OCR on an image and extract URLs
export async function extractUrlsFromImage(imageFile) {
  let worker = null;
  try {
    console.log('Starting OCR processing...');
    
    // Create a new worker with the correct API
    worker = await createWorker('eng'); // Pass language directly to createWorker
    
    console.log('OCR initialized, recognizing text...');
    
    // Set a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OCR processing timed out')), 60000); // 60 seconds timeout
    });
    
    // Recognize text from the image with timeout
    const recognizePromise = worker.recognize(imageFile);
    const { data: { text } } = await Promise.race([recognizePromise, timeoutPromise]);
    
    console.log('Text recognized:', text);
    
    // Extract URLs from the recognized text
    const urls = extractUrlsFromText(text);
    
    console.log('URLs extracted:', urls);
    
    return {
      success: true,
      text,
      urls
    };
  } catch (error) {
    console.error('OCR Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process image'
    };
  } finally {
    // Make sure to terminate the worker even if there's an error
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        console.error('Error terminating worker:', e);
      }
    }
  }
}