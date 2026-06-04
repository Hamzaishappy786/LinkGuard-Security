// src/utils/api.js
import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('linkguard_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const predictUrl = async (url) => {
  try {
    const response = await api.post('/predict', { url });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const predictAndSaveUrl = async (url) => {
  try {
    const token = localStorage.getItem('linkguard_token');
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch('/api/predict', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to check URL');
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const predictMultipleUrls = async (urls) => {
  try {
    const response = await api.post('/predict-multiple', { urls });
    return response.data;
  } catch (error) {
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      throw new Error('Authentication required. Please login to use this feature.');
    }
    throw error;
  }
};

export const extractUrlFromImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await axios.post(`${API_BASE_URL}/extract-url-from-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const checkSelectedUrls = async (selectedUrls) => {
  try {
    const response = await api.post('/check-selected-urls', { selected_urls: selectedUrls });
    return response.data;
  } catch (error) {
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      throw new Error('Authentication required. Please login to use this feature.');
    }
    throw error;
  }
};

export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_BASE_URL}/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserProfile = async () => {
  try {
    const response = await api.get('/auth/profile');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateUserProfile = async (preferences) => {
  try {
    const response = await api.put('/auth/profile', { preferences });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getUserUrlChecks = async (page = 1, perPage = 10) => {
  try {
    const response = await api.get('/auth/url-checks', {
      params: { page, per_page: perPage }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const saveUrlCheck = async (url, result) => {
  try {
    const response = await api.post('/auth/url-checks', { url, result });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Download report functions
export const checkDownloadAuth = async () => {
  try {
    const token = localStorage.getItem('linkguard_token');
    const response = await fetch('/api/check-download-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      return await response.json();
    } else {
      const data = await response.json();
      return { authenticated: false, message: data.message };
    }
  } catch (error) {
    console.error('Error checking download auth:', error);
    return { authenticated: false, message: 'Network error' };
  }
};

export const downloadReport = async (url, result, format) => {
  try {
    const token = localStorage.getItem('linkguard_token');
    
    console.log('Download request sent for format:', format);
    console.log('URL:', url);
    console.log('Result:', result);
    
    // Create a new request with proper headers
    const response = await fetch(`/api/download-report/${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ url, result })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (response.ok) {
      // Get the filename from the headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `LinkGuard_Report_${new Date().toISOString().slice(0, 10)}.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Get the content length
      const contentLength = response.headers.get('Content-Length');
      console.log(`Content-Length: ${contentLength}`);
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Check if blob is valid
      if (blob.size === 0) {
        console.error('Downloaded file is empty');
        return { success: false, error: 'Downloaded file is empty' };
      }
      
      console.log(`Downloaded ${format} file, size: ${blob.size} bytes`);
      
      // Create a link element and trigger the download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      URL.revokeObjectURL(link.href);
      
      return { success: true };
    } else {
      const data = await response.json();
      console.error('Download error:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error downloading report:', error);
    return { success: false, error: 'Network error' };
  }
};

export const downloadMultipleReport = async (results, format) => {
  try {
    const token = localStorage.getItem('linkguard_token');
    
    console.log('Multiple download request sent for format:', format);
    console.log('Results count:', results.length);
    
    // Create a new request with proper headers
    const response = await fetch(`/api/download-multiple-report/${format}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ results })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (response.ok) {
      // Get the filename from the headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `LinkGuard_Multiple_Report_${new Date().toISOString().slice(0, 10)}.${format}`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Get the content length
      const contentLength = response.headers.get('Content-Length');
      console.log(`Content-Length: ${contentLength}`);
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Check if blob is valid
      if (blob.size === 0) {
        console.error('Downloaded file is empty');
        return { success: false, error: 'Downloaded file is empty' };
      }
      
      console.log(`Downloaded multiple ${format} file, size: ${blob.size} bytes`);
      
      // Create a link element and trigger the download
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the object URL
      URL.revokeObjectURL(link.href);
      
      return { success: true };
    } else {
      const data = await response.json();
      console.error('Download error:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('Error downloading multiple report:', error);
    return { success: false, error: 'Network error' };
  }
};

export const getHistory = () => {
  try {
    const history = localStorage.getItem('linkguard_history');
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
};

export const saveToHistory = (url, result) => {
  try {
    const history = getHistory();
    const newEntry = {
      url,
      result,
      timestamp: new Date().toISOString()
    };
    
    history.unshift(newEntry);
    
    if (history.length > 50) {
      history.pop();
    }
    
    localStorage.setItem('linkguard_history', JSON.stringify(history));
  } catch (error) {
    console.error('Error saving to history:', error);
  }
};

// ---- AI Security Analyst (Part B) ----

// One-shot plain-English explanation of a verdict.
export const analyzeUrl = async (evidence) => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(evidence),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return (await response.json()).analysis;
};

// Streaming follow-up chat. Async generator that yields text deltas.
export async function* streamAnalystChat(context, messages) {
  const response = await fetch('/api/analyst-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, messages }),
  });
  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop(); // keep any incomplete trailing event
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      let obj;
      try { obj = JSON.parse(payload); } catch { continue; }
      if (obj.error) throw new Error(obj.error);
      if (obj.delta) yield obj.delta;
    }
  }
}