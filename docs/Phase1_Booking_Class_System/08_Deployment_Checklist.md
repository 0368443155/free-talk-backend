# DEPLOYMENT CHECKLIST - PHASE 1

**Ngày tạo:** 03/12/2025  
**File:** 08_Deployment_Checklist.md  
**Trạng thái:** Ready for Staging

---

## 🌍 1. ENVIRONMENT VARIABLES

### Core
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `TZ=UTC` (Bắt buộc set UTC cho server)

### Database
- [ ] `DB_HOST`
- [ ] `DB_PORT`
- [ ] `DB_USERNAME`
- [ ] `DB_PASSWORD`
- [ ] `DB_DATABASE`

### Redis (Queue & Cache)
- [ ] `REDIS_HOST`
- [ ] `REDIS_PORT`
- [ ] `REDIS_PASSWORD`

### LiveKit
- [ ] `LIVEKIT_API_KEY`
- [ ] `LIVEKIT_API_SECRET`
- [ ] `LIVEKIT_URL`

### Firebase (Push Notification)
- [ ] `FIREBASE_CREDENTIALS_PATH`

---

## ⚙️ 2. INFRASTRUCTURE SETUP

### Database
- [ ] Run migrations: `npm run typeorm migration:run`
- [ ] Verify indexes created (đặc biệt là `idx_meetings_state_start_time`)

### Redis
- [ ] Ensure Redis is running and accessible
- [ ] Configure persistence (AOF/RDB) để không mất job khi restart

### Worker Process
- [ ] Start Worker process riêng biệt (nếu tách khỏi API server)
- [ ] Monitor Worker health

---

## 🚀 3. DEPLOYMENT STEPS

1. **Build:**
   ```bash
   npm run build
   ```

2. **Migration:**
   ```bash
   npm run migration:run
   ```

3. **Start Services:**
   ```bash
   # Start API Server
   pm2 start dist/main.js --name "api-server"
   
   # Start Worker (nếu chạy riêng)
   pm2 start dist/worker.js --name "queue-worker"
   ```

4. **Verify:**
   - [ ] Check logs: `pm2 logs`
   - [ ] Check health endpoint: `GET /health`
   - [ ] Test cron job (manual trigger)

---

## 📊 4. MONITORING SETUP

### Logs
- [ ] Setup log rotation
- [ ] Error alerting (Sentry/Slack)

### Metrics
- [ ] Monitor Cron Job execution time
- [ ] Monitor Queue length (BullMQ)
- [ ] Monitor Failed Jobs

### Alerts
- [ ] Alert khi Cron Job fail
- [ ] Alert khi Queue backlog > 1000
- [ ] Alert khi Teacher No-Show tăng cao

---

## 🔙 5. ROLLBACK PLAN

Nếu deploy thất bại:
1. Revert code version.
2. Revert DB migration (nếu cần): `npm run migration:revert`.
3. Restart services.

---

**End of Phase 1 Documentation**
