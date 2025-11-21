# Token Management Guide

## Overview

This project uses a flexible token management system that supports both **localStorage** and **cookies** for storing authentication tokens.

## Current Implementation

### Default: localStorage (Development)

Currently, the app uses **localStorage** by default, which is:
- ✅ Easy to implement
- ✅ No CORS issues
- ✅ Works well for development
- ⚠️ Vulnerable to XSS attacks
- ⚠️ Requires manual header injection

### Production: Cookies (Recommended)

For production, we recommend using **httpOnly cookies** because:
- ✅ More secure (httpOnly cookies cannot be accessed by JavaScript)
- ✅ Automatically sent with requests
- ✅ Better protection against XSS attacks
- ⚠️ Requires CORS configuration
- ⚠️ Requires `withCredentials: true` in axios

## Token Manager Utility

We've created a `TokenManager` utility class that abstracts token storage:

```typescript
import { tokenManager } from '@/utils/token-manager';

// Get token
const token = tokenManager.getAccessToken();

// Set token
tokenManager.setAccessToken('your-token');

// Clear tokens
tokenManager.clearTokens();
```

## Switching to Cookies

To switch to cookie-based authentication:

1. **Backend**: Configure httpOnly cookies in your auth endpoints
2. **Frontend**: Update `axiosConfig.ts`:
   ```typescript
   const axiosConfig = axios.create({
     // ...
     withCredentials: true, // Enable cookie sending
   });
   ```
3. **Environment**: Set `NEXT_PUBLIC_USE_COOKIES=true` in production

## Token Keys

The system uses these localStorage keys:
- `accessToken` - Main authentication token (JWT)
- `refreshToken` - Token for refreshing access token
- `authToken` - Legacy key (for backward compatibility)

## Error Handling

The axios interceptor automatically:
- Adds `Authorization: Bearer <token>` header to all requests
- Clears tokens on 401 (Unauthorized) responses
- Redirects to login page on authentication failure

## Best Practices

1. **Never store tokens in plain text** - Always use secure storage
2. **Use httpOnly cookies in production** - Better security
3. **Implement token refresh** - Use refresh tokens to get new access tokens
4. **Clear tokens on logout** - Always clean up on user logout
5. **Handle token expiration** - Check token expiry and refresh when needed

## Troubleshooting

### Error 400: Bad Request
- Check if token is being sent correctly
- Verify token format in Authorization header
- Check backend endpoint requirements

### Error 401: Unauthorized
- Token may be expired - implement refresh logic
- Token may be invalid - clear and re-authenticate
- Check if token is being read correctly from storage

### CORS Issues with Cookies
- Ensure backend allows credentials: `Access-Control-Allow-Credentials: true`
- Set `withCredentials: true` in axios config
- Check CORS origin configuration

