# 🔧 Fix Register 404 Error

## ❌ Lỗi hiện tại:
```
undefined/auth/register:1 Failed to load resource: the server responded with a status of 404 (Not Found)
```

## 🔍 Nguyên nhân:
`baseURL` trong axios config là `"undefined"` thay vì URL thực tế

## ✅ Đã sửa:

### 1. **api/axiosConfig.tsx**
**Before:**
```tsx
import { NEXT_PUBLIC_SERVER } from '@/assets/constant';

const axiosConfig = axios.create({
  baseURL: NEXT_PUBLIC_SERVER || 'http://localhost:3000',
  // ...
});
```

**Problem:** `NEXT_PUBLIC_SERVER` được import từ constant file có thể bị stringify thành `"undefined"`

**After:**
```tsx
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_SERVER || 'http://localhost:3000/api/v1';
  }
  return process.env.NEXT_PUBLIC_SERVER || 'http://localhost:3000/api/v1';
};

const axiosConfig = axios.create({
  baseURL: getBaseURL(),
  // ...
});
```

**Fix:** Đọc trực tiếp từ `process.env` với fallback rõ ràng

### 2. **assets/constant.ts**
**Before:**
```tsx
export const NEXT_PUBLIC_SERVER = `${process.env.NEXT_PUBLIC_SERVER}`
```

**Problem:** Template string `${}` sẽ stringify `undefined` thành `"undefined"`

**After:**
```tsx
export const NEXT_PUBLIC_SERVER = process.env.NEXT_PUBLIC_SERVER || 'http://localhost:3000/api/v1'
```

**Fix:** Sử dụng nullish coalescing với default value

---

## 🚀 Cách test:

### 1. Restart dev server (QUAN TRỌNG!)
```bash
# Stop dev server (Ctrl+C)
# Restart
cd D:\LamHoang\4talk\free-talk\talkplatform-frontend
yarn dev
```

**⚠️ Lý do:** Next.js cache environment variables, cần restart để load lại

### 2. Test trong browser console:
```javascript
// Mở browser DevTools (F12)
// Vào Console tab và chạy:
console.log('Base URL:', localStorage.getItem('debug-base-url'));

// Hoặc test axios directly (nếu có export):
import axiosConfig from './api/axiosConfig';
console.log('Axios baseURL:', axiosConfig.defaults.baseURL);
```

### 3. Test register:
1. Mở http://localhost:3001/register
2. Điền form:
   - Email: test@example.com
   - Username: testuser
   - Password: Test123!
   - Confirm: Test123!
3. Click "Sign up"
4. Check Network tab (F12 → Network)
5. Verify request URL is: `http://localhost:3000/api/v1/auth/register`

---

## 🐛 Debug nếu vẫn lỗi:

### Check 1: Verify environment variables loaded
```bash
# In PowerShell
cd D:\LamHoang\4talk\free-talk\talkplatform-frontend
Get-Content .env.local | Select-String "NEXT_PUBLIC_SERVER"
```

**Expected output:**
```
NEXT_PUBLIC_SERVER=http://localhost:3000/api/v1
```

### Check 2: Test direct API call
```bash
# Test backend is running
curl http://localhost:3000/api/v1/auth/register -X POST `
  -H "Content-Type: application/json" `
  -d '{"email":"test@test.com","username":"test","password":"Test123!"}'
```

**Expected:** Should NOT return 404

### Check 3: Browser DevTools
1. F12 → Network tab
2. Try register
3. Click failed request
4. Check "Request URL" - should be `http://localhost:3000/api/v1/auth/register`
5. If it shows `undefined/auth/register`, env not loaded

### Check 4: Next.js env detection
```bash
# Create test page to debug env
# app/test-env/page.tsx
export default function TestEnv() {
  return (
    <div>
      <h1>Environment Variables</h1>
      <p>NEXT_PUBLIC_SERVER: {process.env.NEXT_PUBLIC_SERVER || 'NOT FOUND'}</p>
      <p>NODE_ENV: {process.env.NODE_ENV}</p>
    </div>
  );
}
```

Navigate to http://localhost:3001/test-env

**Expected:**
```
NEXT_PUBLIC_SERVER: http://localhost:3000/api/v1
NODE_ENV: development
```

---

## 🔄 Rollback (if needed):

If the fix causes other issues, restore original:

```bash
cd D:\LamHoang\4talk\free-talk\talkplatform-frontend
git checkout api/axiosConfig.tsx
git checkout assets/constant.ts
```

---

## 📝 Additional Notes:

### Why `"undefined"` happened:

1. **Template string problem:**
   ```tsx
   `${undefined}` → "undefined" (string)
   undefined || 'fallback' → "undefined" (truthy string, not undefined)
   ```

2. **Correct way:**
   ```tsx
   undefined || 'fallback' → 'fallback' ✅
   process.env.NEXT_PUBLIC_SERVER || 'fallback' → fallback if undefined ✅
   ```

### Environment variable rules in Next.js:

1. ✅ Variables with `NEXT_PUBLIC_` prefix are exposed to browser
2. ✅ Must restart dev server after changing .env
3. ✅ Cannot use template strings with undefined values
4. ✅ Always provide fallback for development

---

## ✅ Expected Result After Fix:

1. ✅ Register form submits to: `http://localhost:3000/api/v1/auth/register`
2. ✅ No more "undefined/auth/register" errors
3. ✅ Backend responds (could be 400/401 if validation fails, but NOT 404)
4. ✅ User can register successfully

---

## 🆘 If Still Not Working:

1. **Check backend is running:**
   ```bash
   # In backend terminal
   cd D:\LamHoang\4talk\free-talk\talkplatform-backend
   npm run start:dev
   ```

2. **Check backend route exists:**
   ```bash
   # Backend should have this endpoint
   # src/features/auth/auth.controller.ts or similar
   @Post('register')
   async register(@Body() dto: RegisterDto) { ... }
   ```

3. **Check CORS settings in backend:**
   ```typescript
   // main.ts
   app.enableCors({
     origin: 'http://localhost:3001', // Frontend URL
     credentials: true,
   });
   ```

4. **Contact support with:**
   - Browser console errors
   - Network tab screenshot
   - Backend logs
   - .env.local content (without secrets)
