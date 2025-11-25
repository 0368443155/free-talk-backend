# 4Talk Platform - Implementation Plan

## 📋 Tổng quan

Tài liệu này mô tả kế hoạch triển khai chi tiết cho các tính năng còn lại của hệ thống 4Talk.

---

## 🎯 Phase 1: Teacher Schedule Management (Priority: HIGH)

### 4.1 Tạo Slot Dạy (Schedule)

#### Database Schema
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  max_students INTEGER DEFAULT 10,
  current_students INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'open', -- open, full, cancelled, completed
  language VARCHAR(50),
  level VARCHAR(50), -- beginner, intermediate, advanced
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_price CHECK (price >= 0),
  CONSTRAINT valid_students CHECK (current_students <= max_students)
);

CREATE INDEX idx_schedules_teacher ON schedules(teacher_id);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_time ON schedules(start_time, end_time);
```

#### Backend API
- `POST /api/schedules` - Tạo slot mới
- `GET /api/schedules` - Lấy danh sách slots (filter by teacher, status, date)
- `GET /api/schedules/:id` - Chi tiết slot
- `PATCH /api/schedules/:id` - Cập nhật slot
- `DELETE /api/schedules/:id` - Hủy slot (chỉ khi current_students = 0)

#### Frontend Components
- `ScheduleCalendar.tsx` - Calendar view với date/time picker
- `CreateScheduleForm.tsx` - Form tạo slot
- `ScheduleList.tsx` - Danh sách slots của teacher
- `ScheduleCard.tsx` - Card hiển thị thông tin slot

#### Validation Rules
1. Start time phải trong tương lai (> now + 1 hour)
2. End time > Start time
3. Duration: min 30 phút, max 4 giờ
4. Không trùng với slots khác của cùng teacher (status != cancelled)
5. Price > 0

---

## 🎓 Phase 2: Student Booking System (Priority: HIGH)

### 4.2 Booking Flow

#### Database Schema
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  schedule_id UUID NOT NULL REFERENCES schedules(id),
  status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, cancelled, completed, refunded
  price_paid DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'credit', -- credit, wallet
  booking_time TIMESTAMP DEFAULT NOW(),
  cancelled_at TIMESTAMP,
  refund_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, schedule_id) -- Không book trùng
);

CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_schedule ON bookings(schedule_id);
CREATE INDEX idx_bookings_status ON bookings(status);
```

#### Backend API
- `POST /api/bookings` - Đặt chỗ (với transaction)
- `GET /api/bookings` - Lấy danh sách bookings của user
- `GET /api/bookings/:id` - Chi tiết booking
- `DELETE /api/bookings/:id` - Hủy booking (với refund logic)

#### Transaction Flow (ACID)
```typescript
async createBooking(userId: string, scheduleId: string) {
  return await this.dataSource.transaction(async (manager) => {
    // 1. Lock schedule row
    const schedule = await manager.findOne(Schedule, {
      where: { id: scheduleId },
      lock: { mode: 'pessimistic_write' }
    });
    
    // 2. Validate
    if (schedule.status !== 'open') throw new Error('Schedule not available');
    if (schedule.current_students >= schedule.max_students) throw new Error('Schedule full');
    
    // 3. Check user credit
    const user = await manager.findOne(User, { where: { id: userId } });
    if (user.credit_balance < schedule.price) throw new Error('Insufficient credit');
    
    // 4. Deduct credit
    await manager.update(User, userId, {
      credit_balance: () => `credit_balance - ${schedule.price}`
    });
    
    // 5. Create booking
    const booking = await manager.save(Booking, {
      user_id: userId,
      schedule_id: scheduleId,
      price_paid: schedule.price,
      status: 'confirmed'
    });
    
    // 6. Update schedule
    await manager.update(Schedule, scheduleId, {
      current_students: () => 'current_students + 1',
      status: schedule.current_students + 1 >= schedule.max_students ? 'full' : 'open'
    });
    
    // 7. Create transaction record
    await manager.save(Transaction, {
      user_id: userId,
      type: 'booking',
      amount: -schedule.price,
      reference_id: booking.id,
      status: 'completed'
    });
    
    return booking;
  });
}
```

#### Frontend Components
- `ScheduleBrowser.tsx` - Browse available schedules
- `ScheduleDetail.tsx` - Chi tiết schedule với nút Book
- `BookingConfirmation.tsx` - Modal xác nhận booking
- `MyBookings.tsx` - Danh sách bookings của user

---

## 💰 Phase 3: Wallet & Payment System (Priority: HIGH)

### 5.1 Wallet Structure

#### Database Schema
```sql
-- User table already has credit_balance, but we add wallet table for tracking
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id),
  balance DECIMAL(10,2) DEFAULT 0 CHECK (balance >= 0),
  hold_balance DECIMAL(10,2) DEFAULT 0 CHECK (hold_balance >= 0), -- For pending transactions
  total_earned DECIMAL(10,2) DEFAULT 0, -- For teachers
  total_spent DECIMAL(10,2) DEFAULT 0, -- For students
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50) NOT NULL, -- deposit, booking, refund, payout, income_class, purchase_material
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, cancelled
  reference_id UUID, -- booking_id, schedule_id, material_id
  reference_type VARCHAR(50), -- booking, schedule, material
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
```

#### Backend API
- `GET /api/wallet/balance` - Lấy số dư
- `POST /api/wallet/deposit` - Nạp tiền (admin only for testing)
- `GET /api/wallet/transactions` - Lịch sử giao dịch
- `POST /api/wallet/withdraw` - Rút tiền (teacher only)

#### Admin Tool (Mock Deposit)
```typescript
// Admin can add credit for testing
@Post('admin/wallet/add-credit')
@UseGuards(AdminGuard)
async addCredit(
  @Body() dto: { email: string; amount: number }
) {
  return await this.walletService.addCredit(dto.email, dto.amount);
}
```

---

## 🎁 Phase 4: Affiliate System (Priority: MEDIUM)

### 6.1 Referral Code Generation

#### Database Schema
```sql
ALTER TABLE users ADD COLUMN affiliate_code VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN referred_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN total_referrals INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN total_referral_earnings DECIMAL(10,2) DEFAULT 0;

CREATE TABLE referral_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id), -- Teacher who referred
  referred_user_id UUID NOT NULL REFERENCES users(id), -- Student who was referred
  schedule_id UUID NOT NULL REFERENCES schedules(id),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  original_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL, -- 0.70 for referred, 0.30 for platform
  commission_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- pending, paid
  created_at TIMESTAMP DEFAULT NOW(),
  paid_at TIMESTAMP
);
```

#### Auto-generate Affiliate Code
```typescript
// When teacher is verified
async approveTeacher(teacherId: string) {
  const code = `TEACH${teacherId.substring(0, 8).toUpperCase()}`;
  await this.userRepository.update(teacherId, {
    is_verified: true,
    affiliate_code: code
  });
}
```

#### Tracking Referrals
```typescript
// During registration
async register(dto: RegisterDto, refCode?: string) {
  let referrerId = null;
  
  if (refCode) {
    const referrer = await this.userRepository.findOne({
      where: { affiliate_code: refCode, role: 'teacher' }
    });
    if (referrer) referrerId = referrer.id;
  }
  
  const user = await this.userRepository.save({
    ...dto,
    referred_by: referrerId
  });
  
  if (referrerId) {
    await this.userRepository.increment(
      { id: referrerId },
      'total_referrals',
      1
    );
  }
  
  return user;
}
```

#### Commission Calculation
```typescript
async completeClass(scheduleId: string) {
  const schedule = await this.scheduleRepository.findOne({
    where: { id: scheduleId },
    relations: ['teacher', 'bookings', 'bookings.user']
  });
  
  for (const booking of schedule.bookings) {
    const student = booking.user;
    const teacher = schedule.teacher;
    const amount = booking.price_paid;
    
    let teacherShare: number;
    let commissionRate: number;
    
    if (student.referred_by === teacher.id) {
      // Student came from this teacher's referral
      teacherShare = amount * 0.70;
      commissionRate = 0.70;
    } else {
      // Platform source
      teacherShare = amount * 0.30;
      commissionRate = 0.30;
    }
    
    // Add to teacher wallet
    await this.walletService.addIncome(teacher.id, teacherShare, {
      type: 'income_class',
      schedule_id: scheduleId,
      booking_id: booking.id
    });
    
    // Record commission
    if (student.referred_by) {
      await this.referralEarningRepository.save({
        referrer_id: teacher.id,
        referred_user_id: student.id,
        schedule_id: scheduleId,
        booking_id: booking.id,
        original_amount: amount,
        commission_rate: commissionRate,
        commission_amount: teacherShare,
        status: 'paid'
      });
    }
  }
}
```

---

## 📚 Phase 5: Marketplace (Materials) (Priority: MEDIUM)

### 7.1 Upload & Sell Materials

#### Database Schema
```sql
CREATE TABLE teacher_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category VARCHAR(100),
  language VARCHAR(50),
  level VARCHAR(50),
  file_url TEXT NOT NULL, -- S3 private URL
  preview_url TEXT, -- S3 public URL (first 3 pages)
  file_size BIGINT,
  file_type VARCHAR(50),
  download_count INTEGER DEFAULT 0,
  purchase_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE material_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  material_id UUID NOT NULL REFERENCES teacher_materials(id),
  price_paid DECIMAL(10,2) NOT NULL,
  purchased_at TIMESTAMP DEFAULT NOW(),
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP,
  UNIQUE(user_id, material_id)
);

CREATE INDEX idx_materials_teacher ON teacher_materials(teacher_id);
CREATE INDEX idx_materials_status ON teacher_materials(status);
CREATE INDEX idx_purchases_user ON material_purchases(user_id);
CREATE INDEX idx_purchases_material ON material_purchases(material_id);
```

#### Backend API
- `POST /api/materials` - Upload material (teacher only)
- `GET /api/materials` - Browse materials (with filters)
- `GET /api/materials/:id` - Material detail
- `POST /api/materials/:id/purchase` - Purchase material
- `GET /api/materials/:id/download` - Download (generate signed URL)

#### File Upload Flow
```typescript
async uploadMaterial(teacherId: string, file: Express.Multer.File, dto: CreateMaterialDto) {
  // 1. Upload original file to S3 (private bucket)
  const fileKey = `materials/${teacherId}/${Date.now()}_${file.originalname}`;
  const fileUrl = await this.s3Service.uploadPrivate(fileKey, file.buffer);
  
  // 2. Generate preview (first 3 pages for PDF)
  let previewUrl = null;
  if (file.mimetype === 'application/pdf') {
    const previewBuffer = await this.pdfService.extractPages(file.buffer, 1, 3);
    const previewKey = `previews/${teacherId}/${Date.now()}_preview.pdf`;
    previewUrl = await this.s3Service.uploadPublic(previewKey, previewBuffer);
  }
  
  // 3. Save to database
  const material = await this.materialRepository.save({
    teacher_id: teacherId,
    ...dto,
    file_url: fileUrl,
    preview_url: previewUrl,
    file_size: file.size,
    file_type: file.mimetype
  });
  
  return material;
}
```

#### Purchase Flow
```typescript
async purchaseMaterial(userId: string, materialId: string) {
  return await this.dataSource.transaction(async (manager) => {
    const material = await manager.findOne(Material, { where: { id: materialId } });
    const user = await manager.findOne(User, { where: { id: userId } });
    
    // Check if already purchased
    const existing = await manager.findOne(MaterialPurchase, {
      where: { user_id: userId, material_id: materialId }
    });
    if (existing) throw new Error('Already purchased');
    
    // Check credit
    if (user.credit_balance < material.price) throw new Error('Insufficient credit');
    
    // Deduct credit
    await manager.update(User, userId, {
      credit_balance: () => `credit_balance - ${material.price}`
    });
    
    // Calculate teacher share (70% for referred, 30% for platform)
    const teacherShare = user.referred_by === material.teacher_id 
      ? material.price * 0.70 
      : material.price * 0.30;
    
    // Add to teacher wallet
    await manager.update(User, material.teacher_id, {
      credit_balance: () => `credit_balance + ${teacherShare}`
    });
    
    // Create purchase record
    const purchase = await manager.save(MaterialPurchase, {
      user_id: userId,
      material_id: materialId,
      price_paid: material.price
    });
    
    // Update material stats
    await manager.increment(Material, { id: materialId }, 'purchase_count', 1);
    
    return purchase;
  });
}
```

#### Download with Signed URL
```typescript
async generateDownloadUrl(userId: string, materialId: string) {
  // Check if user purchased
  const purchase = await this.purchaseRepository.findOne({
    where: { user_id: userId, material_id: materialId },
    relations: ['material']
  });
  
  if (!purchase) throw new Error('Material not purchased');
  
  // Generate signed URL (expires in 15 minutes)
  const signedUrl = await this.s3Service.getSignedUrl(
    purchase.material.file_url,
    15 * 60 // 15 minutes
  );
  
  // Update download stats
  await this.purchaseRepository.update(purchase.id, {
    download_count: () => 'download_count + 1',
    last_downloaded_at: new Date()
  });
  
  return { url: signedUrl, expiresIn: 900 };
}
```

---

## 🎯 Phase 6: Advanced Lobby Features (Priority: LOW)

### 8.1 Room Filters

#### API Enhancement
```typescript
@Get('rooms')
async getRooms(
  @Query('language') language?: string,
  @Query('level') level?: string,
  @Query('region') region?: string,
  @Query('status') status: string = 'active'
) {
  const query = this.roomRepository.createQueryBuilder('room')
    .where('room.status = :status', { status });
  
  if (language) {
    query.andWhere('room.language = :language', { language });
  }
  
  if (level) {
    query.andWhere('room.level = :level', { level });
  }
  
  if (region) {
    query.andWhere('room.region = :region', { region });
  }
  
  return await query.getMany();
}
```

### 8.2 Peer Matching (GeoIP)

#### Setup GeoIP
```bash
npm install maxmind
```

```typescript
import maxmind, { CityResponse } from 'maxmind';

@Injectable()
export class GeoIpService {
  private lookup: maxmind.Reader<CityResponse>;
  
  async onModuleInit() {
    this.lookup = await maxmind.open('GeoLite2-City.mmdb');
  }
  
  getLocation(ip: string) {
    const result = this.lookup.get(ip);
    return {
      country: result?.country?.iso_code,
      city: result?.city?.names?.en,
      latitude: result?.location?.latitude,
      longitude: result?.location?.longitude
    };
  }
}
```

#### Peer Matching API
```typescript
@Get('peers/nearby')
async findNearbyPeers(@Req() req: Request) {
  const userIp = req.ip;
  const location = this.geoIpService.getLocation(userIp);
  
  // Find online users in same region
  const peers = await this.userRepository.find({
    where: {
      is_online: true,
      region_code: location.country
    },
    take: 10
  });
  
  return peers;
}
```

### 8.3 Topic-based Chat Rooms

#### Socket Namespace Enhancement
```typescript
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*' }
})
export class ChatGateway {
  @SubscribeMessage('join-topic')
  handleJoinTopic(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { topic: string }
  ) {
    const roomName = `topic_${data.topic}`;
    client.join(roomName);
    
    this.server.to(roomName).emit('user-joined', {
      userId: client.data.userId,
      username: client.data.username,
      topic: data.topic
    });
  }
  
  @SubscribeMessage('topic-message')
  handleTopicMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { topic: string; message: string }
  ) {
    const roomName = `topic_${data.topic}`;
    
    this.server.to(roomName).emit('topic-message', {
      userId: client.data.userId,
      username: client.data.username,
      message: data.message,
      topic: data.topic,
      timestamp: new Date()
    });
  }
}
```

---

## 📅 Implementation Timeline

### Week 1-2: Teacher Schedule Management
- [ ] Database migration
- [ ] Backend API (schedules)
- [ ] Frontend components (calendar, forms)
- [ ] Testing

### Week 3-4: Student Booking System
- [ ] Database migration (bookings)
- [ ] Backend API with transactions
- [ ] Frontend booking flow
- [ ] Testing

### Week 5-6: Wallet & Payment
- [ ] Database migration (wallets, transactions)
- [ ] Backend API
- [ ] Admin deposit tool
- [ ] Transaction history UI
- [ ] Testing

### Week 7-8: Affiliate System
- [ ] Database migration
- [ ] Referral code generation
- [ ] Commission calculation logic
- [ ] Dashboard for teachers
- [ ] Testing

### Week 9-10: Marketplace
- [ ] Database migration
- [ ] File upload (S3)
- [ ] Preview generation
- [ ] Purchase flow
- [ ] Download with signed URLs
- [ ] Testing

### Week 11-12: Advanced Features
- [ ] Room filters
- [ ] GeoIP matching
- [ ] Topic-based chat
- [ ] Testing & optimization

---

## 🧪 Testing Strategy

### Unit Tests
- Service layer logic
- Transaction handling
- Commission calculations
- File upload/download

### Integration Tests
- API endpoints
- Database transactions
- Socket events
- S3 operations

### E2E Tests
- Complete booking flow
- Purchase flow
- Refund flow
- Affiliate tracking

---

## 🔒 Security Considerations

1. **Transaction Safety**: Always use database transactions for money operations
2. **File Access**: Use signed URLs with expiration
3. **Authorization**: Check permissions for all sensitive operations
4. **Rate Limiting**: Prevent abuse of booking/purchase APIs
5. **Input Validation**: Validate all user inputs
6. **SQL Injection**: Use parameterized queries
7. **XSS Protection**: Sanitize user-generated content

---

## 📊 Monitoring & Analytics

1. **Transaction Monitoring**: Track all money movements
2. **Booking Analytics**: Success rate, cancellation rate
3. **Material Analytics**: Popular materials, download stats
4. **Affiliate Performance**: Top referrers, conversion rates
5. **Error Tracking**: Log all failed transactions

---

## 🚀 Deployment Checklist

- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] S3 buckets created (private & public)
- [ ] GeoIP database downloaded
- [ ] Payment gateway configured (future)
- [ ] Monitoring tools setup
- [ ] Backup strategy in place
- [ ] Load testing completed

---

**Last Updated**: 2025-11-25
**Version**: 1.0
