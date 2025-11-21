/**
 * Token Manager Utility
 * 
 * Manages authentication tokens with support for both localStorage and cookies
 * 
 * Recommendation:
 * - Development: Use localStorage (easier, no CORS issues)
 * - Production: Use httpOnly cookies (more secure, automatic sending)
 */

type StorageType = 'localStorage' | 'cookie';

class TokenManager {
  private storageType: StorageType = 'localStorage';
  private readonly ACCESS_TOKEN_KEY = 'accessToken';
  private readonly REFRESH_TOKEN_KEY = 'refreshToken';

  constructor(storageType: StorageType = 'localStorage') {
    this.storageType = storageType;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;

    if (this.storageType === 'localStorage') {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    } else {
      // For cookies, we need to read from document.cookie
      // Note: httpOnly cookies cannot be read from JavaScript
      // This is only for non-httpOnly cookies (not recommended for production)
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith(`${this.ACCESS_TOKEN_KEY}=`));
      return tokenCookie ? tokenCookie.split('=')[1] : null;
    }
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;

    if (this.storageType === 'localStorage') {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    } else {
      const cookies = document.cookie.split(';');
      const tokenCookie = cookies.find(c => c.trim().startsWith(`${this.REFRESH_TOKEN_KEY}=`));
      return tokenCookie ? tokenCookie.split('=')[1] : null;
    }
  }

  /**
   * Set access token
   */
  setAccessToken(token: string): void {
    if (typeof window === 'undefined') return;

    if (this.storageType === 'localStorage') {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    } else {
      // Set cookie with secure flags
      const expires = new Date();
      expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      document.cookie = `${this.ACCESS_TOKEN_KEY}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`;
    }
  }

  /**
   * Set refresh token
   */
  setRefreshToken(token: string): void {
    if (typeof window === 'undefined') return;

    if (this.storageType === 'localStorage') {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    } else {
      const expires = new Date();
      expires.setTime(expires.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      document.cookie = `${this.REFRESH_TOKEN_KEY}=${token}; expires=${expires.toUTCString()}; path=/; SameSite=Strict; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''}`;
    }
  }

  /**
   * Clear all tokens
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return;

    if (this.storageType === 'localStorage') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      // Also clear legacy token keys for backward compatibility
      localStorage.removeItem('authToken');
    } else {
      // Clear cookies
      document.cookie = `${this.ACCESS_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${this.REFRESH_TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }
  }

  /**
   * Check if token exists
   */
  hasToken(): boolean {
    return this.getAccessToken() !== null;
  }
}

// Export singleton instance (defaults to localStorage)
export const tokenManager = new TokenManager('localStorage');

// Export class for custom instances
export { TokenManager };

/**
 * Usage:
 * 
 * // Get token
 * const token = tokenManager.getAccessToken();
 * 
 * // Set token
 * tokenManager.setAccessToken('your-token');
 * 
 * // Clear tokens
 * tokenManager.clearTokens();
 * 
 * // For production with cookies:
 * // const cookieTokenManager = new TokenManager('cookie');
 */

