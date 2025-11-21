# CHECKLIST HOÀN THIỆN HỆ THỐNG TALKPLATFORM

## 📋 MODULE 1: SETUP PROJECT & INFRA

### Backend
- [x] NestJS setup với TypeScript
- [x] TypeORM + MySQL configuration
- [x] Redis configuration
- [x] JWT Authentication
- [x] Global validation pipe
- [x] CORS configuration
- [ ] OAuth Google integration (có code, cần test)
- [ ] OAuth Facebook integration (có code, cần test)
- [ ] Environment variables documentation
- [ ] API documentation (Swagger) - verify completeness
- [ ] Error handling middleware
- [ ] Logging system (Winston/Pino)
- [ ] Rate limiting
- [ ] Health check endpoint

### Frontend
- [x] Next.js + TypeScript setup
- [x] TailwindCSS configuration
- [x] API client setup
- [x] Auth context/hooks
- [ ] Error boundary components
- [ ] Loading states standardization
- [ ] Toast/notification system
- [ ] Form validation library (React Hook Form + Zod)

### Media Server
- [x] LiveKit Cloud integration
- [x] WebRTC connection
- [x] Camera/Microphone access
- [ ] TURN server (Coturn) - if self-hosted needed
- [ ] Recording storage configuration
- [ ] Bandwidth optimization

### Database
- [x] MySQL database created
- [x] Basic schema
- [ ] Indexes optimization
- [ ] Backup strategy
- [ ] Migration scripts organization

---

## 📋 MODULE 2: USER & TEACHER PROFILE

### User Management
- [x] User entity
- [x] User registration
- [x] User login
- [x] Get user profile
- [x] Role-based access (student/teacher/admin)
- [x] Credit balance tracking
- [x] Affiliate code generation
- [ ] Email verification
- [ ] Password reset flow
- [ ] User settings/preferences
- [ ] Profile picture upload
- [ ] Account deletion

### Teacher Profile - Basic
- [x] Teacher profile entity
- [x] Become teacher endpoint
- [x] Get teacher profile
- [x] Update teacher profile
- [x] Teacher bio/description
- [x] Hourly rate setting
- [ ] **Upload ảnh đại diện giáo viên**
- [ ] **Upload video giới thiệu (max 2 phút)**
- [ ] **Upload bằng cấp (PDF/Image)**
- [ ] **Upload chứng chỉ (PDF/Image)**

**Cần tạo:**
```typescript
// teacher-media.entity.ts
@Entity('teacher_media')
export class TeacherMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  teacher_id: string;

  @Column({ type: 'enum', enum: ['intro_video', 'profile_image', 'certificate', 'degree'] })
  media_type: string;

  @Column()
  file_url: string;

  @Column({ nullable: true })
  thumbnail_url: string;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean; // Admin verification

  @CreateDateColumn()
  created_at: Date;
}
```

### Teacher Reviews & Rating
- [x] Teacher review entity
- [x] Rating calculation
- [ ] **Submit review endpoint**
- [ ] **Get teacher reviews endpoint**
- [ ] **Review moderation (admin)**
- [ ] **Prevent duplicate reviews**
- [ ] **Rating breakdown (5-star distribution)**

**Cần tạo API:**
```
POST   /api/v1/teachers/:id/reviews
GET    /api/v1/teachers/:id/reviews
DELETE /api/v1/teachers/:id/reviews/:reviewId (admin)
```

### Teacher Statistics
- [x] Total hours taught (field exists)
- [ ] **Auto-calculate hours from completed meetings**
- [ ] **Total students taught**
- [ ] **Response rate**
- [ ] **Completion rate**
- [ ] **Average session duration**

### Teacher Ranking
- [ ] **Ranking algorithm implementation**
  - Rating (40%)
  - Total hours taught (30%)
  - Number of reviews (15%)
  - Response rate (10%)
  - Completion rate (5%)
- [ ] **Auto-update ranking daily (cron job)**
- [ ] **Ranking badge/tier system (Bronze/Silver/Gold/Platinum)**

**Cần tạo:**
```typescript
// teacher-ranking.service.ts
async calculateTeacherRanking(teacherId: string) {
  // Implement ranking logic
}

// Cron job
@Cron('0 0 * * *') // Daily at midnight
async updateAllTeacherRankings() {
  // Update all teacher rankings
}
```

---

## 📋 MODULE 3: HỆ THỐNG FREE TALK

### Lobby & Room Listing
- [x] Get all meetings API
- [x] Filter by language
- [x] Filter by level
- [x] Filter by region
- [x] Filter by status
- [ ] **Lobby UI với real-time updates**
- [ ] **Room preview (participants count, topic)**
- [ ] **Quick join button**
- [ ] **Room search by keyword**

### Room Logic
- [x] Create room (max 4 participants)
- [x] Join room
- [x] Leave room
- [x] Room status tracking (empty/available/crowded/full)
- [x] Audio-first mode
- [x] WebRTC integration
- [ ] **Auto-close room when empty for 5 minutes**
- [ ] **Room timeout (max 2 hours)**
- [ ] **Participant limit enforcement**
- [ ] **Waiting queue when room full**

**Cần implement:**
```typescript
// Auto-close empty rooms
@Cron('*/5 * * * *') // Every 5 minutes
async closeEmptyRooms() {
  const emptyRooms = await this.meetingsRepository.find({
    where: {
      current_participants: 0,
      status: MeetingStatus.LIVE,
      updated_at: LessThan(new Date(Date.now() - 5 * 60 * 1000))
    }
  });
  
  for (const room of emptyRooms) {
    await this.endMeeting(room.id);
  }
}
```

### Global Chat
- [x] Meeting chat (per room)
- [ ] **Global lobby chat (all users)**
- [ ] **Private messages between users**
- [ ] **Chat moderation (ban/mute)**
- [ ] **Chat history persistence**
- [ ] **Emoji/reactions support**

**Cần tạo:**
```typescript
@Entity('global_chat_messages')
export class GlobalChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', nullable: true })
  room_type: string; // 'lobby', 'general', etc.

  @CreateDateColumn()
  created_at: Date;
}
```

### Matching System
- [x] Region field in meeting
- [ ] **Auto-match users by region (IP-based)**
- [ ] **Match by language preference**
- [ ] **Match by skill level**
- [ ] **Smart matching algorithm**
- [ ] **Match history tracking**

**Cần tạo:**
```typescript
// matching.service.ts
async findMatchingRoom(user: User): Promise<Meeting | null> {
  const userRegion = await this.getRegionFromIP(user.last_ip);
  
  const matchingRooms = await this.meetingsRepository.find({
    where: {
      meeting_type: MeetingType.FREE_TALK,
      status: MeetingStatus.LIVE,
      region: userRegion,
      language: user.preferred_language,
      current_participants: LessThan(4)
    },
    order: {
      current_participants: 'DESC' // Prefer rooms with more people
    }
  });
  
  return matchingRooms[0] || null;
}
```

### WebSocket Events
- [x] meeting:join
- [x] meeting:leave
- [x] meeting:chat
- [x] meeting:participant-update
- [ ] **meeting:typing (typing indicator)**
- [ ] **meeting:reaction (emoji reactions)**
- [ ] **lobby:update (lobby room list updates)**
- [ ] **user:online-status**

---

## 📋 MODULE 4: LỚP HỌC GIÁO VIÊN

### Booking System
- [x] Teacher availability entity
- [x] Scheduled meetings
- [ ] **Booking slot selection UI**
- [ ] **Prevent double booking**
- [ ] **Booking confirmation email**
- [ ] **Booking cancellation (with refund)**
- [ ] **Reschedule meeting**
- [ ] **Booking reminder (24h, 1h before)**

**Cần tạo:**
```typescript
@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting)
  meeting: Meeting;

  @ManyToOne(() => User)
  student: User;

  @Column({ type: 'enum', enum: ['pending', 'confirmed', 'cancelled', 'completed'] })
  status: string;

  @Column({ type: 'int' })
  credits_paid: number;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @CreateDateColumn()
  created_at: Date;
}
```

**API cần tạo:**
```
POST   /api/v1/bookings (Book a slot)
GET    /api/v1/bookings/my-bookings
PATCH  /api/v1/bookings/:id/cancel
PATCH  /api/v1/bookings/:id/reschedule
GET    /api/v1/teachers/:id/available-slots
```

### Classroom Logic
- [x] Classroom entity
- [x] Classroom members
- [x] Create classroom
- [x] Join classroom
- [ ] **Classroom invitation system**
- [ ] **Classroom access control (public/private/invite-only)**
- [ ] **Classroom materials/resources**
- [ ] **Classroom announcements**
- [ ] **Student progress tracking**

### Video Call Features
- [x] LiveKit video/audio
- [x] Screen sharing
- [x] Recording
- [ ] **Whiteboard integration**
- [ ] **Breakout rooms**
- [ ] **Hand raise feature**
- [ ] **Polls/quizzes during class**
- [ ] **File sharing during call**

### Credit Check & Deduction
- [x] Credit balance field
- [ ] **Check credit before join**
- [ ] **Auto-deduct credits on join**
- [ ] **Refund if meeting cancelled**
- [ ] **Insufficient credit error handling**
- [ ] **Credit hold during booking**

**Cần implement:**
```typescript
// meetings.service.ts
async joinMeeting(meetingId: string, user: User) {
  const meeting = await this.findOne(meetingId);
  
  // Check if meeting requires payment
  if (meeting.pricing_type === PricingType.CREDITS) {
    // Check user balance
    if (user.credit_balance < meeting.price_credits) {
      throw new BadRequestException('Insufficient credits');
    }
    
    // Deduct credits
    await this.creditsService.deductCredits(
      user.id,
      meeting.price_credits,
      `Join meeting: ${meeting.title}`,
      { meeting_id: meetingId }
    );
  }
  
  // Continue with join logic...
}
```

### Signal/Status Management
- [x] Meeting status (scheduled/live/ended)
- [x] Participant join/leave events
- [ ] **Teacher online/offline status**
- [ ] **Auto-end meeting if teacher disconnects**
- [ ] **Reconnection handling**
- [ ] **Network quality indicator**

---

## 📋 MODULE 5: PAYMENT & CREDIT

### Wallet
- [x] Get balance API
- [x] Transaction history API
- [ ] **Wallet UI dashboard**
- [ ] **Transaction filtering/search**
- [ ] **Export transaction history (CSV)**
- [ ] **Low balance notification**

### Payment Integration
- [x] Credit packages entity
- [x] Purchase initiation API
- [ ] **Stripe integration**
  - [ ] Create payment intent
  - [ ] Handle webhook
  - [ ] Confirm payment
- [ ] **PayPal integration**
  - [ ] Create order
  - [ ] Capture payment
  - [ ] Handle IPN
- [ ] **VNPay integration**
  - [ ] Create payment URL
  - [ ] Handle return URL
  - [ ] Verify payment
- [ ] **Payment method selection UI**
- [ ] **Payment history**
- [ ] **Invoice generation**

**Cần tạo:**
```typescript
// payment-providers/stripe.service.ts
async createPaymentIntent(amount: number, userId: string) {
  const paymentIntent = await this.stripe.paymentIntents.create({
    amount: amount * 100, // Convert to cents
    currency: 'usd',
    metadata: { userId }
  });
  return paymentIntent;
}

// Webhook handler
@Post('webhooks/stripe')
async handleStripeWebhook(@Body() payload: any, @Headers('stripe-signature') signature: string) {
  const event = this.stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  
  if (event.type === 'payment_intent.succeeded') {
    await this.creditsService.confirmCreditPurchase(event.data.object.id);
  }
}
```

### Transaction Management
- [x] Credit transaction entity
- [x] Transaction creation
- [ ] **Transaction status tracking**
- [ ] **Failed transaction retry**
- [ ] **Transaction reconciliation**
- [ ] **Duplicate transaction prevention**

### Monetization & Revenue Share
- [x] Affiliate code tracking
- [x] Revenue share calculation (basic)
- [ ] **70/30 split implementation**
  - Platform: 30%
  - Teacher: 70%
- [ ] **Affiliate commission (if referred)**
  - Referrer: 10% of platform's 30%
  - Platform: 20%
  - Teacher: 70%
- [ ] **Revenue report for teachers**
- [ ] **Payout schedule (monthly)**
- [ ] **Tax reporting (1099 forms)**

**Cần implement:**
```typescript
// revenue.service.ts
async distributeRevenue(transactionId: string) {
  const transaction = await this.findTransaction(transactionId);
  const meeting = transaction.metadata.meeting;
  const teacher = meeting.host;
  
  const totalAmount = transaction.amount;
  let platformShare = totalAmount * 0.30;
  let teacherShare = totalAmount * 0.70;
  
  // Check if student was referred
  const student = transaction.user;
  if (student.referrer_id) {
    const affiliateCommission = platformShare * 0.33; // 10% of total
    platformShare -= affiliateCommission;
    
    // Credit affiliate
    await this.creditsService.addCredits(
      student.referrer_id,
      affiliateCommission,
      'Affiliate commission',
      { transaction_id: transactionId }
    );
  }
  
  // Credit teacher
  await this.creditsService.addCredits(
    teacher.id,
    teacherShare,
    'Class earnings',
    { transaction_id: transactionId }
  );
  
  // Record revenue split
  await this.revenueShareRepository.save({
    transaction_id: transactionId,
    teacher_id: teacher.id,
    teacher_share: teacherShare,
    platform_share: platformShare,
    affiliate_id: student.referrer_id,
    affiliate_share: affiliateCommission || 0
  });
}
```

### Withdrawal System
- [x] Withdrawal request API
- [ ] **Withdrawal request entity**
- [ ] **Admin approval workflow**
- [ ] **Minimum withdrawal amount**
- [ ] **Withdrawal processing**
- [ ] **Withdrawal history**
- [ ] **Bank account verification**

**Cần tạo:**
```typescript
@Entity('withdrawal_requests')
export class WithdrawalRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected', 'completed'] })
  status: string;

  @Column({ type: 'varchar' })
  payment_method: string; // 'bank_transfer', 'paypal', etc.

  @Column({ type: 'json' })
  payment_details: any;

  @Column({ type: 'uuid', nullable: true })
  approved_by: string;

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
```

---

## 📋 MODULE 6: MARKETPLACE (TÀI LIỆU) - ⚠️ HOÀN TOÀN THIẾU

### Database Schema
- [ ] **Materials entity**
- [ ] **Material purchases entity**
- [ ] **Material reviews entity**
- [ ] **Material categories entity**

**Cần tạo file:**
```
src/features/marketplace/
├── entities/
│   ├── material.entity.ts
**API cần tạo:**
```
GET    /api/v1/marketplace/materials (Browse)
GET    /api/v1/marketplace/materials/:id/preview
POST   /api/v1/marketplace/materials/:id/purchase
GET    /api/v1/marketplace/my-purchases
POST   /api/v1/marketplace/materials/:id/download
POST   /api/v1/marketplace/materials/:id/reviews
GET    /api/v1/marketplace/materials/:id/reviews
```

### File Storage
- [ ] **S3/Cloud storage integration**
- [ ] **File upload service**
- [ ] **File type validation**
- [ ] **File size limits**
- [ ] **Virus scanning**
- [ ] **CDN for file delivery**
- [ ] **Secure download URLs (signed)**

**Cần tạo:**
```typescript
// file-upload.service.ts
import { S3 } from 'aws-sdk';

@Injectable()
export class FileUploadService {
  private s3: S3;

  constructor() {
    this.s3 = new S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });
  }

  async uploadMaterial(file: Express.Multer.File, teacherId: string) {
    const key = `materials/${teacherId}/${Date.now()}-${file.originalname}`;
    
    await this.s3.upload({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'private'
    }).promise();
    
    return {
      file_url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`,
      key
    };
  }

  async getSignedDownloadUrl(key: string, expiresIn: number = 3600) {
    return this.s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Expires: expiresIn
    });
  }
}
```

### Preview Generation
- [ ] **PDF preview (first 2 pages)**
- [ ] **Video preview (first 30 seconds)**
- [ ] **Slide preview (thumbnails)**
- [ ] **Audio preview (first 30 seconds)**

### Revenue Distribution
- [ ] **Teacher gets 70% of sale**
- [ ] **Platform gets 30%**
- [ ] **Affiliate commission if applicable**
- [ ] **Auto-credit teacher on purchase**

---

## 🔧 INFRASTRUCTURE & DEVOPS

### Monitoring
- [ ] **Application monitoring (New Relic/DataDog)**
- [ ] **Error tracking (Sentry)**
- [ ] **Performance monitoring**
- [ ] **Uptime monitoring**
- [ ] **Database query performance**

### Logging
- [ ] **Structured logging (Winston/Pino)**
- [ ] **Log aggregation (ELK/CloudWatch)**
- [ ] **Audit logs**
- [ ] **Access logs**

### Testing
- [ ] **Unit tests (Jest)**
- [ ] **Integration tests**
- [ ] **E2E tests (Playwright)**
- [ ] **Load testing (k6/Artillery)**
- [ ] **Test coverage > 80%**

### Security
- [ ] **Rate limiting**
- [ ] **CSRF protection**
- [ ] **XSS prevention**
- [ ] **SQL injection prevention (TypeORM handles)**
- [ ] **Input validation**
- [ ] **API key rotation**
- [ ] **Security headers (Helmet)**
- [ ] **Penetration testing**

### Deployment
- [ ] **CI/CD pipeline (GitHub Actions)**
- [ ] **Docker containerization**
- [ ] **Kubernetes orchestration**
- [ ] **Blue-green deployment**
- [ ] **Rollback strategy**
- [ ] **Database migrations automation**

### Backup & Recovery
- [ ] **Database backup (daily)**
- [ ] **File storage backup**
- [ ] **Disaster recovery plan**
- [ ] **Backup testing**

---

## 📊 PRIORITY MATRIX

### 🔴 P0 - Critical (Do First)
1. Module 6: Marketplace - Complete implementation
2. Payment gateway integration (Stripe/VNPay)
3. Auto credit deduction on meeting join
4. Teacher certificate upload
5. Booking system with credit check

### 🟡 P1 - High Priority
6. Teacher ranking algorithm
7. Matching algorithm for free talk
8. Global chat system
9. Withdrawal processing
10. Material preview generation

### 🟢 P2 - Medium Priority
11. OAuth Google/Facebook testing
12. Email notifications
13. Recording management
14. Whiteboard integration
15. Analytics dashboard

### ⚪ P3 - Low Priority
16. Breakout rooms
17. Polls/quizzes
18. Advanced analytics
19. Mobile app
20. Internationalization (i18n)

---

## 📅 ESTIMATED TIMELINE

**Week 1-2: Module 6 Marketplace**
- Database schema
- File upload service
- CRUD APIs
- Frontend UI
- Purchase flow

**Week 3: Payment Integration**
- Stripe setup
- VNPay setup
- Webhook handlers
- Testing

**Week 4: Teacher Features**
- Certificate upload
- Ranking algorithm
- Statistics dashboard

**Week 5: Booking & Credits**
- Booking system
- Auto credit deduction
- Refund logic

**Week 6: Polish & Testing**
- Bug fixes
- Performance optimization
- Security audit
- Load testing

---

## ✅ DEFINITION OF DONE

Each feature is considered "done" when:
- [ ] Code implemented and reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests passed
- [ ] API documented (Swagger)
- [ ] Frontend UI implemented
- [ ] Manual testing completed
- [ ] Performance tested
- [ ] Security reviewed
- [ ] Deployed to staging
- [ ] User acceptance testing passed
- [ ] Deployed to production
- [ ] Monitoring alerts configured
