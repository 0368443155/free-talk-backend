# API ENDPOINTS DOCUMENTATION - TALKPLATFORM

**Base URL:** `http://localhost:3000/api/v1`  
**Authentication:** Bearer Token (JWT) in Authorization header

---

## 🔐 AUTHENTICATION & USER MANAGEMENT

### ✅ Implemented

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login user | ❌ |
| GET | `/auth/me` | Get current user profile | ✅ |
| POST | `/auth/logout` | Logout user | ✅ |
| POST | `/auth/oauth/callback` | OAuth callback (Google/Facebook) | ❌ |

### ❌ Need to Implement

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/forgot-password` | Request password reset | ❌ |
| POST | `/auth/reset-password` | Reset password with token | ❌ |
| POST | `/auth/verify-email` | Verify email address | ❌ |
| POST | `/auth/resend-verification` | Resend verification email | ✅ |
| PATCH | `/auth/change-password` | Change password | ✅ |
| DELETE | `/auth/delete-account` | Delete user account | ✅ |

---

## 👨‍🏫 TEACHER MANAGEMENT

### ✅ Implemented

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/teachers` | List all teachers (with filters) | ❌ |
| GET | `/teachers/:id` | Get teacher details | ❌ |
| GET | `/teachers/me/profile` | Get my teacher profile | ✅ Teacher |
| PATCH | `/teachers/me/profile` | Update my teacher profile | ✅ Teacher |
| POST | `/teachers/me/become-teacher` | Upgrade to teacher | ✅ |

### ❌ Need to Implement

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/teachers/me/media` | Upload teacher media (photo/video) | ✅ Teacher |
| GET | `/teachers/me/media` | Get my uploaded media | ✅ Teacher |
| DELETE | `/teachers/me/media/:id` | Delete media | ✅ Teacher |
| POST | `/teachers/me/certificates` | Upload certificate/degree | ✅ Teacher |
| GET | `/teachers/me/certificates` | Get my certificates | ✅ Teacher |
| DELETE | `/teachers/me/certificates/:id` | Delete certificate | ✅ Teacher |
| POST | `/teachers/:id/reviews` | Submit review for teacher | ✅ |
| GET | `/teachers/:id/reviews` | Get teacher reviews | ❌ |
| GET | `/teachers/:id/stats` | Get teacher statistics | ❌ |
| GET | `/teachers/:id/available-slots` | Get available booking slots | ❌ |
| GET | `/teachers/rankings` | Get teacher rankings/leaderboard | ❌ |

---

## 🎤 MEETINGS & FREE TALK

### ✅ Implemented

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/meetings` | List all meetings (with filters) | ❌ |
| GET | `/meetings/free-talk` | List free talk rooms | ❌ |
| GET | `/meetings/teacher-classes` | List teacher classes | ❌ |
| GET | `/meetings/nearby/:region` | Find nearby meetings | ❌ |
| GET | `/meetings/:id` | Get meeting details | ✅ |
| POST | `/meetings` | Create new meeting | ✅ |
| PATCH | `/meetings/:id` | Update meeting | ✅ Host |
| DELETE | `/meetings/:id` | Delete meeting | ✅ Host |
| POST | `/meetings/:id/start` | Start meeting | ✅ Host |
| POST | `/meetings/:id/end` | End meeting | ✅ Host |
| POST | `/meetings/:id/join` | Join meeting | ✅ |
| POST | `/meetings/:id/leave` | Leave meeting | ✅ |
| POST | `/meetings/:id/lock` | Lock meeting (no new joins) | ✅ Host |
| POST | `/meetings/:id/unlock` | Unlock meeting | ✅ Host |
| GET | `/meetings/:id/participants` | Get meeting participants | ✅ |
| GET | `/meetings/:id/chat` | Get chat messages | ✅ |
| POST | `/meetings/:id/participants/:participantId/kick` | Kick participant | ✅ Host |
| POST | `/meetings/:id/participants/:participantId/mute` | Mute participant | ✅ Host |
| POST | `/meetings/:id/participants/:participantId/promote` | Promote to moderator | ✅ Host |
| POST | `/meetings/:id/participants/:participantId/block` | Block participant | ✅ Host |

### ❌ Need to Implement

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/meetings/recommended` | Get recommended meetings for user | ✅ |
| POST | `/meetings/match` | Auto-match user to meeting | ✅ |
| GET | `/meetings/:id/recording` | Get meeting recording | ✅ |
| POST | `/meetings/:id/report` | Report meeting/user | ✅ |
| GET | `/meetings/my-history` | Get my meeting history | ✅ |

---

## 🏫 CLASSROOMS

### ✅ Implemented

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/classrooms` | List all classrooms | ✅ |
| POST | `/classrooms` | Create classroom | ✅ Teacher |
| GET | `/classrooms/:id` | Get classroom details | ✅ |
| PATCH | `/classrooms/:id` | Update classroom | ✅ Teacher |
| DELETE | `/classrooms/:id` | Delete classroom | ✅ Teacher |
| POST | `/classrooms/:id/meetings` | Create meeting in classroom | ✅ Teacher |
| GET | `/classrooms/:id/meetings` | Get classroom meetings | ✅ |
| GET | `/classrooms/:id/meetings/:meetingId` | Get specific meeting | ✅ |

### ❌ Need to Implement

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/classrooms/:id/join` | Join classroom | ✅ |
| POST | `/classrooms/:id/leave` | Leave classroom | ✅ |
| GET | `/classrooms/:id/members` | Get classroom members | ✅ |
| POST | `/classrooms/:id/invite` | Invite user to classroom | ✅ Teacher |
| POST | `/classrooms/:id/resources` | Add resource to classroom | ✅ Teacher |
| GET | `/classrooms/:id/resources` | Get classroom resources | ✅ |
| DELETE | `/classrooms/:id/resources/:resourceId` | Delete resource | ✅ Teacher |
| POST | `/classrooms/:id/announcements` | Create announcement | ✅ Teacher |
| GET | `/classrooms/:id/announcements` | Get announcements | ✅ |
| DELETE | `/classrooms/:id/announcements/:announcementId` | Delete announcement | ✅ Teacher |

---

## 📅 BOOKINGS

### ❌ All Need to Implement

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/bookings` | Create booking | ✅ |
| GET | `/bookings/my-bookings` | Get my bookings | ✅ |
| GET | `/bookings/:id` | Get booking details | ✅ |
| PATCH | `/bookings/:id/cancel` | Cancel booking | ✅ |
| PATCH | `/bookings/:id/reschedule` | Reschedule booking | ✅ |
| POST | `/bookings/:id/confirm` | Confirm booking (teacher) | ✅ Teacher |
| GET | `/teachers/me/bookings` | Get my bookings as teacher | ✅ Teacher |

---

## 💳 CREDITS & PAYMENTS

### ✅ Implemented

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/credits/balance` | Get credit balance | ✅ |
| GET | `/credits/packages` | Get available credit packages | ✅ |
| POST | `/credits/purchase` | Initiate credit purchase | ✅ |
| POST | `/credits/purchase/confirm/:transactionId` | Confirm purchase | ✅ |
| GET | `/credits/transactions` | Get transaction history | ✅ |
| POST | `/credits/donate/:teacherId` | Donate credits to teacher | ✅ |
| GET | `/credits/earnings` | Get teacher earnings | ✅ Teacher |
| POST | `/credits/withdraw` | Request withdrawal | ✅ Teacher |
| GET | `/credits/affiliate/stats` | Get affiliate statistics | ✅ |
| GET | `/credits/revenue-share/:meetingId` | Get revenue share breakdown | ✅ |
| POST | `/credits/admin/adjust/:userId` | Admin adjust credits | ✅ Admin |
| GET | `/credits/admin/transactions` | Admin get all transactions | ✅ Admin |
| GET | `/credits/admin/revenue-summary` | Admin revenue summary | ✅ Admin |

### ❌ Need to Implement

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/payments/stripe/webhook` | Stripe webhook handler | ❌ |
| POST | `/payments/paypal/webhook` | PayPal webhook handler | ❌ |
| POST | `/payments/vnpay/return` | VNPay return URL handler | ❌ |
| GET | `/credits/withdrawal-requests` | Get withdrawal requests | ✅ Teacher |
| GET | `/credits/admin/withdrawals` | Admin get all withdrawals | ✅ Admin |
| POST | `/credits/admin/withdrawals/:id/approve` | Approve withdrawal | ✅ Admin |
| POST | `/credits/admin/withdrawals/:id/reject` | Reject withdrawal | ✅ Admin |
| POST | `/credits/admin/withdrawals/:id/complete` | Mark withdrawal complete | ✅ Admin |

---

## 🛒 MARKETPLACE (MATERIALS)

### ❌ All Need to Implement

#### Student Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/marketplace/materials` | Browse all materials | ❌ |
| GET | `/marketplace/materials/:id` | Get material details | ❌ |
| GET | `/marketplace/materials/:id/preview` | Preview material | ❌ |
| POST | `/marketplace/materials/:id/purchase` | Purchase material | ✅ |
| GET | `/marketplace/my-purchases` | Get purchased materials | ✅ |
| POST | `/marketplace/materials/:id/download` | Download purchased material | ✅ |
| POST | `/marketplace/materials/:id/reviews` | Submit review | ✅ |
| GET | `/marketplace/materials/:id/reviews` | Get material reviews | ❌ |
| POST | `/marketplace/reviews/:id/helpful` | Mark review as helpful | ✅ |
| GET | `/marketplace/categories` | Get material categories | ❌ |
| GET | `/marketplace/categories/:slug/materials` | Get materials by category | ❌ |
| GET | `/marketplace/search` | Search materials | ❌ |
| GET | `/marketplace/featured` | Get featured materials | ❌ |
| GET | `/marketplace/trending` | Get trending materials | ❌ |

#### Teacher Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/marketplace/teacher/materials` | Upload new material | ✅ Teacher |
| GET | `/marketplace/teacher/materials` | Get my materials | ✅ Teacher |
| GET | `/marketplace/teacher/materials/:id` | Get my material details | ✅ Teacher |
| PATCH | `/marketplace/teacher/materials/:id` | Update material | ✅ Teacher |
| DELETE | `/marketplace/teacher/materials/:id` | Delete material | ✅ Teacher |
| POST | `/marketplace/teacher/materials/:id/publish` | Publish material | ✅ Teacher |
| POST | `/marketplace/teacher/materials/:id/unpublish` | Unpublish material | ✅ Teacher |
| GET | `/marketplace/teacher/sales` | Get sales statistics | ✅ Teacher |
| GET | `/marketplace/teacher/revenue` | Get revenue breakdown | ✅ Teacher |

#### Admin Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/marketplace/admin/materials` | Get all materials | ✅ Admin |
| PATCH | `/marketplace/admin/materials/:id/feature` | Feature material | ✅ Admin |
| DELETE | `/marketplace/admin/materials/:id` | Delete material | ✅ Admin |
| GET | `/marketplace/admin/stats` | Get marketplace statistics | ✅ Admin |

---

## 💬 CHAT & MESSAGING

### ✅ Implemented (WebSocket)

| Event | Description | Auth Required |
|-------|-------------|---------------|
| `meeting:join` | Join meeting room | ✅ |
| `meeting:leave` | Leave meeting room | ✅ |
| `meeting:chat` | Send chat message | ✅ |
| `meeting:participant-update` | Participant status update | ✅ |
| `meeting:status-change` | Meeting status change | ✅ |

### ❌ Need to Implement

#### REST Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/chat/global` | Get global lobby chat | ✅ |
| POST | `/chat/global` | Send global chat message | ✅ |
| GET | `/chat/direct/:userId` | Get direct messages with user | ✅ |
| POST | `/chat/direct/:userId` | Send direct message | ✅ |
| GET | `/chat/conversations` | Get all conversations | ✅ |
| DELETE | `/chat/messages/:id` | Delete message | ✅ |

#### WebSocket Events

| Event | Description | Auth Required |
|-------|-------------|---------------|
| `chat:global` | Global chat message | ✅ |
| `chat:direct` | Direct message | ✅ |
| `chat:typing` | Typing indicator | ✅ |
| `user:online` | User online status | ✅ |
| `user:offline` | User offline status | ✅ |

---

## 🔔 NOTIFICATIONS

### ❌ All Need to Implement

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications` | Get user notifications | ✅ |
| GET | `/notifications/unread-count` | Get unread count | ✅ |
| PATCH | `/notifications/:id/read` | Mark as read | ✅ |
| PATCH | `/notifications/read-all` | Mark all as read | ✅ |
| DELETE | `/notifications/:id` | Delete notification | ✅ |
| DELETE | `/notifications/clear-all` | Clear all notifications | ✅ |
| PATCH | `/notifications/settings` | Update notification settings | ✅ |

---

## 📊 ANALYTICS & REPORTS

### ❌ All Need to Implement

#### User Analytics

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/analytics/my-stats` | Get my statistics | ✅ |
| GET | `/analytics/my-meetings` | Get my meeting analytics | ✅ |
| GET | `/analytics/my-earnings` | Get my earnings analytics | ✅ Teacher |

#### Admin Analytics

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/analytics/admin/overview` | Platform overview | ✅ Admin |
| GET | `/analytics/admin/users` | User analytics | ✅ Admin |
| GET | `/analytics/admin/meetings` | Meeting analytics | ✅ Admin |
| GET | `/analytics/admin/revenue` | Revenue analytics | ✅ Admin |
| GET | `/analytics/admin/teachers` | Teacher analytics | ✅ Admin |
| GET | `/analytics/admin/materials` | Material analytics | ✅ Admin |

---

## 🎥 LIVEKIT INTEGRATION

### ✅ Implemented

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/livekit/token` | Get LiveKit access token | ✅ |
| POST | `/webhooks/livekit` | LiveKit webhook handler | ❌ |

### ❌ Need to Implement

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/livekit/rooms` | List active LiveKit rooms | ✅ Admin |
| GET | `/livekit/rooms/:roomId` | Get room details | ✅ |
| POST | `/livekit/rooms/:roomId/close` | Force close room | ✅ Admin |
| GET | `/livekit/recordings/:meetingId` | Get meeting recordings | ✅ |

---

## 👨‍💼 ADMIN ENDPOINTS

### ❌ Most Need to Implement

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/admin/dashboard` | Admin dashboard stats | ✅ Admin |
| GET | `/admin/users` | List all users | ✅ Admin |
| GET | `/admin/users/:id` | Get user details | ✅ Admin |
| PATCH | `/admin/users/:id` | Update user | ✅ Admin |
| DELETE | `/admin/users/:id` | Delete user | ✅ Admin |
| POST | `/admin/users/:id/ban` | Ban user | ✅ Admin |
| POST | `/admin/users/:id/unban` | Unban user | ✅ Admin |
| GET | `/admin/teachers/pending` | Get pending teacher verifications | ✅ Admin |
| POST | `/admin/teachers/:id/verify` | Verify teacher | ✅ Admin |
| POST | `/admin/teachers/:id/reject` | Reject teacher | ✅ Admin |
| GET | `/admin/meetings` | List all meetings | ✅ Admin |
| DELETE | `/admin/meetings/:id` | Delete meeting | ✅ Admin |
| GET | `/admin/reports` | Get user reports | ✅ Admin |
| PATCH | `/admin/reports/:id/resolve` | Resolve report | ✅ Admin |

---

## 📝 SUMMARY

### Implementation Status

| Module | Implemented | Missing | Total | Progress |
|--------|-------------|---------|-------|----------|
| Auth & Users | 5 | 6 | 11 | 45% |
| Teachers | 5 | 11 | 16 | 31% |
| Meetings | 20 | 5 | 25 | 80% |
| Classrooms | 8 | 10 | 18 | 44% |
| Bookings | 0 | 7 | 7 | 0% |
| Credits & Payments | 13 | 8 | 21 | 62% |
| Marketplace | 0 | 28 | 28 | 0% |
| Chat & Messaging | 5 | 11 | 16 | 31% |
| Notifications | 0 | 6 | 6 | 0% |
| Analytics | 0 | 10 | 10 | 0% |
| LiveKit | 2 | 4 | 6 | 33% |
| Admin | 0 | 13 | 13 | 0% |
| **TOTAL** | **58** | **119** | **177** | **33%** |

### Priority Recommendations

**Phase 1 (Critical):**
1. Marketplace endpoints (28 endpoints)
2. Booking system (7 endpoints)
3. Payment webhooks (3 endpoints)

**Phase 2 (High):**
4. Teacher media upload (6 endpoints)
5. Notifications (6 endpoints)
6. Chat enhancements (11 endpoints)

**Phase 3 (Medium):**
7. Analytics (10 endpoints)
8. Admin panel (13 endpoints)
9. Classroom enhancements (10 endpoints)

**Phase 4 (Nice to have):**
10. Advanced features (remaining endpoints)

---

**Last Updated:** 2025-11-21  
**Total Endpoints:** 177  
**Implemented:** 58 (33%)  
**Remaining:** 119 (67%)
