// src/utils/simpleOcr.js
import OCRAD from 'ocrad.js';

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

// Simple OCR function using OCRAD.js
export async function simpleOCR(imageFile) {
  try {
    console.log('Starting simple OCR processing...');
    
    // Create an image element from the file
    const img = new Image();
    const imageUrl = URL.createObjectURL(imageFile);
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          // Create a canvas to draw the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Set canvas dimensions to match the image
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw the image on the canvas
          ctx.drawImage(img, 0, 0);
          
          // Get the image data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Perform OCR
          const text = OCRAD(imageData);
          
          console.log('Text recognized:', text);
          
          // Extract URLs from the recognized text
          const urls = extractUrlsFromText(text);
          
          console.log('URLs extracted:', urls);
          
          // Clean up
          URL.revokeObjectURL(imageUrl);
          
          resolve({
            success: true,
            text,
            urls
          });
        } catch (error) {
          console.error('Simple OCR Error:', error);
          URL.revokeObjectURL(imageUrl);
          resolve({
            success: false,
            error: error.message || 'Failed to process image'
          });
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  } catch (error) {
    console.error('Simple OCR Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process image'
    };
  }
}