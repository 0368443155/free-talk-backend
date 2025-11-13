# 🚀 Deployment Guide - TalkPlatform Frontend

## 📋 Lỗi hiện tại

```
Error: @clerk/clerk-react: Missing publishableKey
```

**Nguyên nhân:** Server production không có environment variables (Clerk keys)

---

## ✅ Giải pháp: Setup Environment Variables trên Server

### Bước 1: Tạo file `.env.production` trên server

```bash
# SSH vào server
ssh user@your-server

# Di chuyển vào thư mục project
cd /path/to/talkplatform-frontend

# Tạo file .env.production
nano .env.production
```

### Bước 2: Copy nội dung sau vào `.env.production`

```env
# Clerk - Get from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxxx

# Google OAuth
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# API URLs - PRODUCTION
NEXT_PUBLIC_SERVER=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_CLIENT=https://yourdomain.com/api/v1

# Socket URL
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

**⚠️ LƯU Ý:**
- Thay `pk_live_xxxxx` bằng Clerk **PRODUCTION** publishable key
- Thay `sk_live_xxxxx` bằng Clerk **PRODUCTION** secret key
- Thay `yourdomain.com` bằng domain thực tế của bạn

### Bước 3: Lấy Clerk Production Keys

1. Đăng nhập https://dashboard.clerk.com
2. Chọn project của bạn
3. Vào **API Keys** → Tab **Production**
4. Copy:
   - `Publishable Key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `Secret Key` → `CLERK_SECRET_KEY`

### Bước 4: Update Google OAuth (nếu cần)

1. Vào https://console.cloud.google.com
2. Chọn project
3. **APIs & Services** → **Credentials**
4. Thêm production domain vào **Authorized JavaScript origins**:
   ```
   https://yourdomain.com
   ```
5. Thêm vào **Authorized redirect URIs**:
   ```
   https://yourdomain.com/api/auth/callback/google
   https://yourdomain.com/auth/google/callback
   ```

---

## 🔄 Rebuild và Deploy

### Option A: Rebuild trên server

```bash
cd /path/to/talkplatform-frontend

# Install dependencies (nếu chưa)
yarn install

# Build với production env
yarn build

# Start production server
yarn start
```

### Option B: Sử dụng PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Build project
yarn build

# Start với PM2
pm2 start yarn --name "talkplatform-frontend" -- start

# Save PM2 config
pm2 save

# Setup auto-restart on server reboot
pm2 startup
```

### Option C: Docker deployment

```bash
# Build Docker image
docker build -t talkplatform-frontend .

# Run container with env file
docker run -d \
  --name talkplatform-frontend \
  --env-file .env.production \
  -p 3001:3000 \
  talkplatform-frontend
```

---

## 🔍 Kiểm tra sau khi deploy

### 1. Check environment variables loaded
```bash
# In Node.js environment
node -e "console.log(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)"
```

### 2. Check build output
```bash
yarn build
# Should see: ✓ Compiled successfully
```

### 3. Test Clerk authentication
- Mở browser: `https://yourdomain.com/login`
- Thử đăng nhập
- Kiểm tra network tab, không có lỗi Clerk

---

## 🐛 Troubleshooting

### Lỗi: Missing publishableKey

**Nguyên nhân:**
- File `.env.production` không tồn tại
- Biến `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` không được set
- Biến không có prefix `NEXT_PUBLIC_` (Next.js require prefix này cho client-side vars)

**Giải pháp:**
```bash
# Verify file exists
ls -la .env.production

# Check content
cat .env.production

# Ensure NEXT_PUBLIC_ prefix exists
grep NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY .env.production
```

### Lỗi: Clerk keys invalid

**Nguyên nhân:** Dùng test keys thay vì production keys

**Giải pháp:**
- Production keys bắt đầu bằng `pk_live_` và `sk_live_`
- Test keys bắt đầu bằng `pk_test_` và `sk_test_`
- Đảm bảo dùng đúng loại keys

### Lỗi: CORS issues

**Nguyên nhân:** Domain không được whitelist trong Clerk

**Giải pháp:**
1. Clerk Dashboard → **Domains**
2. Add production domain: `yourdomain.com`
3. Add to allowed origins

---

## 📦 CI/CD với Environment Variables

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: yarn install
        
      - name: Build
        env:
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_PUBLISHABLE_KEY }}
          CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
          NEXT_PUBLIC_SERVER: ${{ secrets.API_URL }}
          NEXT_PUBLIC_SOCKET_URL: ${{ secrets.SOCKET_URL }}
        run: yarn build
        
      - name: Deploy to server
        # Your deployment commands here
```

**Setup GitHub Secrets:**
1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `API_URL`
   - `SOCKET_URL`

---

## 📝 Checklist Deploy

- [ ] ✅ Tạo file `.env.production` trên server
- [ ] ✅ Copy Clerk **production** keys
- [ ] ✅ Update Google OAuth redirect URIs
- [ ] ✅ Update API URLs thành production domains
- [ ] ✅ Verify `.env.production` trong `.gitignore`
- [ ] ✅ Run `yarn build` thành công
- [ ] ✅ Test authentication flow
- [ ] ✅ Check browser console for errors
- [ ] ✅ Setup PM2 hoặc Docker cho auto-restart

---

## 🆘 Support

Nếu vẫn gặp lỗi:

1. Check build logs: `yarn build`
2. Check runtime logs: `pm2 logs` hoặc `docker logs`
3. Verify environment: `printenv | grep NEXT_PUBLIC`
4. Test Clerk dashboard: https://dashboard.clerk.com

---

## 📚 Tài liệu tham khảo

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Clerk Production Setup](https://clerk.com/docs/deployments/overview)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
