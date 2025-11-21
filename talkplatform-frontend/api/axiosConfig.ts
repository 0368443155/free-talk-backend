import axios from 'axios';
import { tokenManager } from '@/utils/token-manager';

const axiosConfig = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  // ✅ OPTIMIZATION: Enable credentials for cookie-based auth (if using cookies)
  // withCredentials: process.env.NEXT_PUBLIC_USE_COOKIES === 'true',
});

// Add request interceptor for auth tokens
// ✅ FIX: Use tokenManager for consistent token handling
axiosConfig.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = tokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add refresh token if available
    const refreshToken = tokenManager.getRefreshToken();
    if (refreshToken) {
      config.headers['x-refresh-token'] = refreshToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosConfig.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      if (typeof window !== 'undefined') {
        // Clear all tokens using tokenManager
        tokenManager.clearTokens();
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Export as default
export default axiosConfig;

// Export as named exports for compatibility
export const axiosInstance = axiosConfig;
export { axiosConfig };