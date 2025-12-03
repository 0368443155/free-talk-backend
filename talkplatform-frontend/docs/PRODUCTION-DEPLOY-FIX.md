# 🚨 Production Deploy Fix - Register 404 Error

## ❌ Current Error:
```
POST http://159.223.63.199:3051/undefined/auth/register 404 (Not Found)
                                    ^^^^^^^^^ 
                                    Problem!
```

## 🔍 Root Cause:
Server production **KHÔNG có file `.env.production`** với biến `NEXT_PUBLIC_SERVER`

→ Result: `undefined` thay vì `http://159.223.63.199:3051/api/v1`

---

## ✅ SOLUTION: Upload .env.production to Server

### Method 1: SSH (Recommended)

```bash
# 1. SSH to server
ssh user@159.223.63.199

# 2. Navigate to project directory
cd /path/to/talkplatform-frontend
# Example: cd /var/www/talkplatform-frontend

# 3. Create .env.production file
nano .env.production
```

**Paste this content:**
```env
# Google OAuth (Replace with your actual credentials)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# API URLs - PRODUCTION
NEXT_PUBLIC_SERVER=http://159.223.63.199:3051/api/v1
NEXT_PUBLIC_CLIENT=http://159.223.63.199:3051/api/v1

# Socket URL
NEXT_PUBLIC_SOCKET_URL=http://159.223.63.199:3051
```

**Save:** `Ctrl+X` → `Y` → `Enter`

```bash
# 4. Rebuild application
yarn build

# 5. Restart server
pm2 restart talkplatform-frontend
# Or if using different process manager:
# systemctl restart talkplatform-frontend
```

---

### Method 2: FTP/SCP Upload

**Local machine:**
```bash
# Navigate to project directory
cd D:\LamHoang\4talk\free-talk\talkplatform-frontend

# Upload .env.production to server
scp .env.production user@159.223.63.199:/path/to/talkplatform-frontend/

# Then SSH and rebuild
ssh user@159.223.63.199
cd /path/to/talkplatform-frontend
yarn build
pm2 restart talkplatform-frontend
```

---

### Method 3: Using FileZilla / WinSCP

1. **Connect to server:**
   - Host: `159.223.63.199`
   - Port: `22` (SSH) or `21` (FTP)
   - Username: your server username
   - Password: your server password

2. **Navigate to:**
   ```
   /path/to/talkplatform-frontend/
   ```

3. **Upload file:**
   - Local: `D:\LamHoang\4talk\free-talk\talkplatform-frontend\.env.production`
   - Remote: `/path/to/talkplatform-frontend/.env.production`

4. **Rebuild via SSH:**
   ```bash
   ssh user@159.223.63.199
   cd /path/to/talkplatform-frontend
   yarn build
   pm2 restart talkplatform-frontend
   ```

---

## 🔍 Verify Environment Variables Loaded

### Check 1: Test on server
```bash
# SSH to server
ssh user@159.223.63.199

# Check file exists
ls -la /path/to/talkplatform-frontend/.env.production

# Check content
cat /path/to/talkplatform-frontend/.env.production
```

**Expected output:**
```
NEXT_PUBLIC_SERVER=http://159.223.63.199:3051/api/v1
```

### Check 2: Test after rebuild
```bash
# On server
cd /path/to/talkplatform-frontend

# Rebuild
yarn build

# Check build output for env vars
grep -r "NEXT_PUBLIC_SERVER" .next/
```

### Check 3: Test in browser
1. Open: `http://159.223.63.199:3051/register`
2. F12 → Console
3. Try register
4. Check Network tab → Request URL should be:
   ```
   http://159.223.63.199:3051/api/v1/auth/register
   ```

---

## 🐛 Troubleshooting

### Issue 1: Still shows "undefined" after rebuild

**Cause:** Next.js cached old build

**Solution:**
```bash
# On server
cd /path/to/talkplatform-frontend

# Clear cache
rm -rf .next

# Rebuild
yarn build

# Restart
pm2 restart talkplatform-frontend
```

---

### Issue 2: Can't find project directory

**Find Next.js app:**
```bash
# Search for Next.js projects
find / -name ".next" -type d 2>/dev/null

# Or search for package.json with Next.js
find / -name "package.json" -exec grep -l "next" {} \; 2>/dev/null
```

---

### Issue 3: Wrong backend port

**Check backend is running:**
```bash
# Check what's running on port 3051
netstat -tulpn | grep 3051

# Or
lsof -i :3051
```

**If backend runs on different port (e.g., 3000):**

Update `.env.production`:
```env
NEXT_PUBLIC_SERVER=http://159.223.63.199:3000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://159.223.63.199:3000
```

---

### Issue 4: Permission denied

**Fix permissions:**
```bash
# On server
cd /path/to/talkplatform-frontend

# Set ownership
sudo chown -R $USER:$USER .

# Make sure .env.production is readable
chmod 644 .env.production
```

---

## 📋 Complete Deployment Checklist

- [ ] ✅ Created `.env.production` file on server
- [ ] ✅ Set `NEXT_PUBLIC_SERVER=http://159.223.63.199:3051/api/v1`
- [ ] ✅ Set other environment variables
- [ ] ✅ Verified file exists: `ls -la .env.production`
- [ ] ✅ Cleared cache: `rm -rf .next`
- [ ] ✅ Rebuilt app: `yarn build`
- [ ] ✅ Restarted server: `pm2 restart talkplatform-frontend`
- [ ] ✅ Tested register in browser
- [ ] ✅ Verified URL is NOT `undefined/auth/register`

---

## 🎯 Expected Result

### Before Fix:
```
❌ POST http://159.223.63.199:3051/undefined/auth/register 404
```

### After Fix:
```
✅ POST http://159.223.63.199:3051/api/v1/auth/register 200 OK
```

---

## 📞 Quick Commands Summary

```bash
# 1. SSH to server
ssh user@159.223.63.199

# 2. Go to project
cd /path/to/talkplatform-frontend

# 3. Create/Edit .env.production
nano .env.production
# Paste content from above, save & exit

# 4. Rebuild
rm -rf .next
yarn build

# 5. Restart
pm2 restart talkplatform-frontend

# 6. Check logs
pm2 logs talkplatform-frontend

# 7. Test
curl http://159.223.63.199:3051/api/v1/auth/register -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"test","password":"Test123!"}'
```

---

## 🆘 If Still Not Working

### Debug Steps:

1. **Check build logs:**
   ```bash
   yarn build 2>&1 | grep NEXT_PUBLIC
   ```

2. **Check runtime env:**
   ```bash
   # Create test endpoint
   # app/test-env/page.tsx
   export default function TestEnv() {
     return <div>
       <h1>Env Test</h1>
       <p>NEXT_PUBLIC_SERVER: {process.env.NEXT_PUBLIC_SERVER}</p>
     </div>
   }
   ```
   
   Visit: `http://159.223.63.199:3051/test-env`

3. **Check PM2 env:**
   ```bash
   pm2 env 0  # Or your app ID
   ```

4. **Restart with explicit env:**
   ```bash
   pm2 delete talkplatform-frontend
   pm2 start yarn --name "talkplatform-frontend" -- start
   ```

---

## 📝 Important Notes

### Security:
- ✅ `.env.production` should NOT be committed to git (already in .gitignore)
- ✅ Keep API keys secure
- ✅ Use HTTPS in production (not HTTP)

### Performance:
- ✅ After changing env, MUST rebuild (`yarn build`)
- ✅ Clear `.next` cache if changes don't apply
- ✅ Environment variables are baked into build

### Best Practice:
- ✅ Use different Google OAuth credentials for production
- ✅ Set up SSL/HTTPS for production domain
- ✅ Use domain name instead of IP address when possible

---

**Last Updated:** 2025-01-12
**Server IP:** 159.223.63.199
**Frontend Port:** 3051
**Status:** Waiting for .env.production upload
