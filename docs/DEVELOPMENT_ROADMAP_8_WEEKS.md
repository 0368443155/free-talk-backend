# ĐỀ XUẤT PHƯƠNG ÁN PHÁT TRIỂN TIẾP THEO

**Dựa trên:** System Audit Report v1.0  
**Ngày:** 03/12/2025  
**Mục tiêu:** Hoàn thiện 95% core features trong 8 tuần

---

## 🎯 CHIẾN LƯỢC TỔNG THỂ

### Nguyên tắc phát triển
1. **Complete over Perfect** - Hoàn thiện tính năng trước khi optimize
2. **User-facing first** - Ưu tiên features người dùng thấy được
3. **Revenue-driven** - Tập trung vào features tạo doanh thu
4. **Incremental delivery** - Release từng phase nhỏ, test ngay

### Mục tiêu KPI
- **Week 4:** 75% core features hoàn thành
- **Week 8:** 95% core features hoàn thành
- **Week 12:** 100% + optimization

---

## 📅 ROADMAP CHI TIẾT 8 TUẦN

## PHASE 1: BOOKING & CLASS SYSTEM (Tuần 1-2)

### **Week 1: Teacher Broadcast & Class Control**

#### 🎯 Mục tiêu
Cho phép teacher start/end class và notify students real-time

#### 📋 Tasks

##### Backend (3 ngày)
1. **Meeting State Management**
   ```typescript
   // File: src/features/meeting/meeting.service.ts
   
   enum MeetingState {
     SCHEDULED = 'scheduled',
     WAITING = 'waiting',      // Teacher chưa start
     IN_PROGRESS = 'in_progress', // Teacher đã start
     ENDED = 'ended',
     CANCELLED = 'cancelled'
   }
   
   async startClass(meetingId: string, teacherId: string) {
     // 1. Verify teacher owns this meeting
     // 2. Check có bookings
     // 3. Update meeting state to IN_PROGRESS
     // 4. Emit socket event 'class_started'
     // 5. Start timer for auto-end
   }
   
   async endClass(meetingId: string, teacherId: string) {
     // 1. Update meeting state to ENDED
     // 2. Emit socket event 'class_ended'
     // 3. Trigger revenue sharing
     // 4. Update booking status to COMPLETED
   }
   ```

2. **Socket Events**
   ```typescript
   // File: src/gateways/meeting.gateway.ts
   
   @SubscribeMessage('teacher:start_class')
   async handleStartClass(client: Socket, payload: { meetingId: string }) {
     // Emit to all students in room
     this.server.to(payload.meetingId).emit('class_started', {
       meetingId: payload.meetingId,
       startedAt: new Date(),
       teacher: { ... }
     });
   }
   
   @SubscribeMessage('teacher:end_class')
   async handleEndClass(client: Socket, payload: { meetingId: string }) {
     // Emit to all students in room
     this.server.to(payload.meetingId).emit('class_ended', {
       meetingId: payload.meetingId,
       endedAt: new Date()
     });
   }
   ```

3. **Check-in Middleware**
   ```typescript
   // File: src/features/meeting/guards/booking-check.guard.ts
   
   @Injectable()
   export class BookingCheckGuard implements CanActivate {
     async canActivate(context: ExecutionContext): Promise<boolean> {
       const request = context.switchToHttp().getRequest();
       const { meetingId, userId } = request;
       
       // Check if meeting is a CLASS (not free talk)
       const meeting = await this.meetingService.findOne(meetingId);
       if (meeting.type !== 'CLASS') return true; // Free talk
       
       // Check if user has booking
       const booking = await this.bookingService.findBooking(userId, meetingId);
       if (!booking) throw new ForbiddenException('No booking found');
       if (booking.status !== 'CONFIRMED') throw new ForbiddenException('Booking not confirmed');
       
       return true;
     }
   }
   ```

##### Frontend (2 ngày)
1. **Teacher Control Panel**
   ```tsx
   // File: components/meeting/TeacherControlPanel.tsx
   
   export function TeacherControlPanel({ meetingId, isTeacher }) {
     const [classState, setClassState] = useState<'waiting' | 'in_progress' | 'ended'>('waiting');
     
     const handleStartClass = async () => {
       await api.post(`/meetings/${meetingId}/start`);
       socket.emit('teacher:start_class', { meetingId });
       setClassState('in_progress');
     };
     
     const handleEndClass = async () => {
       await api.post(`/meetings/${meetingId}/end`);
       socket.emit('teacher:end_class', { meetingId });
       setClassState('ended');
     };
     
     if (!isTeacher) return null;
     
     return (
       <div className="teacher-controls">
         {classState === 'waiting' && (
           <Button onClick={handleStartClass} size="lg" variant="success">
             🎬 Start Class
           </Button>
         )}
         {classState === 'in_progress' && (
           <Button onClick={handleEndClass} size="lg" variant="danger">
             ⏹️ End Class
           </Button>
         )}
       </div>
     );
   }
   ```

2. **Student Waiting Room**
   ```tsx
   // File: components/meeting/StudentWaitingRoom.tsx
   
   export function StudentWaitingRoom({ meetingId }) {
     const [classStarted, setClassStarted] = useState(false);
     
     useEffect(() => {
       socket.on('class_started', ({ meetingId: id }) => {
         if (id === meetingId) {
           setClassStarted(true);
           toast.success('Class has started! 🎉');
         }
       });
       
       return () => socket.off('class_started');
     }, [meetingId]);
     
     if (classStarted) return <MeetingRoom meetingId={meetingId} />;
     
     return (
       <div className="waiting-room">
         <h2>⏳ Waiting for teacher to start...</h2>
         <p>The class will begin shortly</p>
       </div>
     );
   }
   ```

##### Testing (1 ngày)
- Unit tests cho meeting state transitions
- Integration tests cho socket events
- E2E test: Teacher start → Students join → Teacher end

---

### **Week 2: Refund Logic & Calendar UI**

#### 🎯 Mục tiêu
Auto refund khi hủy lịch + UI calendar picker chuyên nghiệp

#### 📋 Tasks

##### Backend - Refund Logic (2 ngày)
1. **Refund Service**
   ```typescript
   // File: src/features/booking/refund.service.ts
   
   @Injectable()
   export class RefundService {
     async refundBooking(bookingId: string, reason: string) {
       return await this.dataSource.transaction(async (manager) => {
         // 1. Get booking
         const booking = await manager.findOne(Booking, { where: { id: bookingId } });
         
         // 2. Calculate refund amount (100% if >24h, 50% if <24h)
         const hoursUntilClass = differenceInHours(booking.scheduled_at, new Date());
         const refundPercentage = hoursUntilClass >= 24 ? 1.0 : 0.5;
         const refundAmount = booking.credits_paid * refundPercentage;
         
         // 3. Refund credits to user
         await this.walletService.addCredits(
           booking.student_id,
           refundAmount,
           `Refund for booking ${bookingId}: ${reason}`,
           bookingId
         );
         
         // 4. Update booking
         booking.status = BookingStatus.CANCELLED;
         booking.credits_refunded = refundAmount;
         booking.cancellation_reason = reason;
         booking.cancelled_at = new Date();
         await manager.save(booking);
         
         // 5. Update slot to available
         const slot = await manager.findOne(BookingSlot, { where: { id: booking.slot_id } });
         slot.is_booked = false;
         await manager.save(slot);
         
         return { refundAmount, refundPercentage };
       });
     }
     
     async cancelSlotWithRefunds(slotId: string, teacherId: string, reason: string) {
       // 1. Get all bookings for this slot
       const bookings = await this.bookingRepository.find({ where: { slot_id: slotId } });
       
       // 2. Refund all bookings
       for (const booking of bookings) {
         await this.refundBooking(booking.id, reason);
       }
       
       // 3. Cancel slot
       const slot = await this.slotRepository.findOne({ where: { id: slotId } });
       await this.slotRepository.remove(slot);
       
       return { refundedCount: bookings.length };
     }
   }
   ```

2. **Update Booking Controller**
   ```typescript
   // File: src/features/booking/booking.controller.ts
   
   @Patch(':id/cancel')
   async cancelBooking(@Param('id') id: string, @Body() dto: CancelBookingDto, @Request() req) {
     const result = await this.refundService.refundBooking(id, dto.reason);
     return {
       message: 'Booking cancelled successfully',
       refundAmount: result.refundAmount,
       refundPercentage: result.refundPercentage
     };
   }
   ```

##### Frontend - Calendar UI (3 ngày)
1. **Install Dependencies**
   ```bash
   npm install react-big-calendar date-fns
   npm install @types/react-big-calendar -D
   ```

2. **Calendar Component**
   ```tsx
   // File: components/booking/AvailabilityCalendar.tsx
   
   import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
   import { format, parse, startOfWeek, getDay } from 'date-fns';
   
   const locales = { 'en-US': require('date-fns/locale/en-US') };
   const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });
   
   export function AvailabilityCalendar({ teacherId, onSelectSlot }) {
     const [slots, setSlots] = useState([]);
     
     useEffect(() => {
       // Fetch available slots
       api.get(`/teachers/slots/available?teacher_id=${teacherId}`)
         .then(res => {
           const events = res.data.map(slot => ({
             id: slot.id,
             title: `${slot.price_credits} credits`,
             start: new Date(`${slot.date}T${slot.start_time}`),
             end: new Date(`${slot.date}T${slot.end_time}`),
             resource: slot
           }));
           setSlots(events);
         });
     }, [teacherId]);
     
     return (
       <Calendar
         localizer={localizer}
         events={slots}
         startAccessor="start"
         endAccessor="end"
         style={{ height: 600 }}
         onSelectEvent={(event) => onSelectSlot(event.resource)}
         views={['month', 'week', 'day']}
       />
     );
   }
   ```

3. **Time Slot Picker**
   ```tsx
   // File: components/booking/TimeSlotPicker.tsx
   
   export function TimeSlotPicker({ date, onSelect }) {
     const timeSlots = generateTimeSlots('08:00', '22:00', 60); // 1-hour slots
     
     return (
       <div className="grid grid-cols-4 gap-2">
         {timeSlots.map(slot => (
           <Button
             key={slot.start}
             variant="outline"
             onClick={() => onSelect(slot)}
           >
             {slot.start} - {slot.end}
           </Button>
         ))}
       </div>
     );
   }
   ```

##### Testing (1 ngày)
- Test refund logic với các scenarios
- Test calendar UI với different timezones
- E2E test: Book → Cancel → Refund

---

## PHASE 2: AFFILIATE SYSTEM (Tuần 3-4)

### **Week 3: Referral Tracking**

#### 🎯 Mục tiêu
Track user đăng ký qua affiliate link

#### 📋 Tasks

##### Backend (3 ngày)
1. **Update User Entity**
   ```typescript
   // File: src/users/user.entity.ts
   
   @Entity('users')
   export class User {
     // ... existing fields
     
     @Column({ type: 'uuid', nullable: true })
     referred_by: string; // Teacher ID who referred this user
     
     @ManyToOne(() => User, { nullable: true })
     @JoinColumn({ name: 'referred_by' })
     referrer: User;
     
     @Column({ type: 'timestamp', nullable: true })
     referred_at: Date;
   }
   ```

2. **Migration**
   ```typescript
   // File: src/database/migrations/XXXXXX-AddReferralTracking.ts
   
   export class AddReferralTracking implements MigrationInterface {
     public async up(queryRunner: QueryRunner): Promise<void> {
       await queryRunner.query(`
         ALTER TABLE users 
         ADD COLUMN referred_by varchar(36) NULL,
         ADD COLUMN referred_at timestamp NULL,
         ADD INDEX IDX_users_referred_by (referred_by)
       `);
     }
   }
   ```

3. **Auth Service Update**
   ```typescript
   // File: src/auth/auth.service.ts
   
   async register(dto: RegisterDto, refCode?: string) {
     let referrerId = null;
     
     // Check if ref code exists
     if (refCode) {
       const referrer = await this.userRepository.findOne({ 
         where: { affiliate_code: refCode } 
       });
       if (referrer) {
         referrerId = referrer.id;
       }
     }
     
     const user = this.userRepository.create({
       ...dto,
       referred_by: referrerId,
       referred_at: referrerId ? new Date() : null
     });
     
     return await this.userRepository.save(user);
   }
   ```

##### Frontend (2 ngày)
1. **Referral Link Handler**
   ```tsx
   // File: app/register/page.tsx
   
   export default function RegisterPage() {
     const searchParams = useSearchParams();
     const refCode = searchParams.get('ref');
     
     useEffect(() => {
       // Save ref code to localStorage for later
       if (refCode) {
         localStorage.setItem('referral_code', refCode);
       }
     }, [refCode]);
     
     const handleRegister = async (data) => {
       const savedRefCode = localStorage.getItem('referral_code');
       await api.post('/auth/register', {
         ...data,
         refCode: savedRefCode
       });
       localStorage.removeItem('referral_code');
     };
     
     return (
       <RegisterForm onSubmit={handleRegister} />
     );
   }
   ```

2. **Teacher Referral Dashboard**
   ```tsx
   // File: app/teacher/referrals/page.tsx
   
   export default function ReferralDashboard() {
     const { data: stats } = useSWR('/api/teachers/me/referral-stats');
     
     return (
       <div>
         <h1>My Referrals</h1>
         <div className="stats">
           <StatCard title="Total Referrals" value={stats.totalReferrals} />
           <StatCard title="Active Students" value={stats.activeStudents} />
           <StatCard title="Revenue from Referrals" value={stats.referralRevenue} />
         </div>
         
         <div className="referral-link">
           <h3>Your Referral Link</h3>
           <CopyToClipboard text={`https://4talk.com/register?ref=${stats.affiliateCode}`}>
             <Button>Copy Link</Button>
           </CopyToClipboard>
         </div>
         
         <ReferralList referrals={stats.referrals} />
       </div>
     );
   }
   ```

##### Testing (1 ngày)
- Test referral tracking flow
- Test edge cases (invalid ref code, expired code)

---

### **Week 4: Revenue Sharing Implementation**

#### 🎯 Mục tiêu
Auto revenue sharing khi kết thúc buổi học

#### 📋 Tasks

##### Backend (4 ngày)
1. **Revenue Sharing Service**
   ```typescript
   // File: src/features/payments/revenue-sharing.service.ts
   
   @Injectable()
   export class RevenueSharingService {
     async distributeRevenue(meetingId: string) {
       return await this.dataSource.transaction(async (manager) => {
         // 1. Get meeting and teacher
         const meeting = await manager.findOne(Meeting, { 
           where: { id: meetingId },
           relations: ['teacher', 'bookings', 'bookings.student']
         });
         
         // 2. Calculate total revenue
         const totalRevenue = meeting.bookings.reduce((sum, b) => sum + b.credits_paid, 0);
         
         // 3. For each booking, determine revenue split
         for (const booking of meeting.bookings) {
           const student = booking.student;
           
           // Check if student was referred by this teacher
           const isOwnReferral = student.referred_by === meeting.teacher_id;
           
           // Platform fee: 30% (platform source) or 10% (teacher referral)
           const platformFee = isOwnReferral ? 0.10 : 0.30;
           const teacherShare = 1 - platformFee;
           
           const platformAmount = booking.credits_paid * platformFee;
           const teacherAmount = booking.credits_paid * teacherShare;
           
           // 4. Create ledger transaction
           await this.walletService.shareRevenue(
             meeting.teacher_id,
             booking.credits_paid,
             platformFee * 100, // Convert to percentage
             `Revenue from booking ${booking.id}`,
             booking.id
           );
           
           // 5. Log revenue split
           await manager.save(RevenueLog, {
             booking_id: booking.id,
             teacher_id: meeting.teacher_id,
             student_id: student.id,
             total_amount: booking.credits_paid,
             platform_fee: platformAmount,
             teacher_share: teacherAmount,
             is_referral: isOwnReferral,
             created_at: new Date()
           });
         }
         
         return { totalRevenue, distributedAt: new Date() };
       });
     }
   }
   ```

2. **Create RevenueLog Entity**
   ```typescript
   // File: src/features/payments/entities/revenue-log.entity.ts
   
   @Entity('revenue_logs')
   export class RevenueLog {
     @PrimaryGeneratedColumn('uuid')
     id: string;
     
     @Column({ type: 'uuid' })
     booking_id: string;
     
     @Column({ type: 'uuid' })
     teacher_id: string;
     
     @Column({ type: 'uuid' })
     student_id: string;
     
     @Column({ type: 'decimal', precision: 10, scale: 2 })
     total_amount: number;
     
     @Column({ type: 'decimal', precision: 10, scale: 2 })
     platform_fee: number;
     
     @Column({ type: 'decimal', precision: 10, scale: 2 })
     teacher_share: number;
     
     @Column({ type: 'boolean', default: false })
     is_referral: boolean; // True if student was referred by teacher
     
     @CreateDateColumn()
     created_at: Date;
   }
   ```

3. **Integrate with Meeting End**
   ```typescript
   // File: src/features/meeting/meeting.service.ts
   
   async endClass(meetingId: string, teacherId: string) {
     // ... existing logic
     
     // Trigger revenue sharing
     await this.revenueSharingService.distributeRevenue(meetingId);
     
     // Update meeting state
     meeting.state = MeetingState.ENDED;
     await this.meetingRepository.save(meeting);
   }
   ```

##### Frontend (2 ngày)
1. **Revenue Dashboard**
   ```tsx
   // File: app/teacher/revenue/page.tsx
   
   export default function RevenueDashboard() {
     const { data } = useSWR('/api/teachers/me/revenue');
     
     return (
       <div>
         <h1>Revenue Dashboard</h1>
         
         <div className="revenue-summary">
           <Card>
             <h3>Total Revenue</h3>
             <p className="text-4xl">{data.totalRevenue} credits</p>
           </Card>
           
           <Card>
             <h3>Platform Revenue (30%)</h3>
             <p className="text-2xl">{data.platformRevenue} credits</p>
           </Card>
           
           <Card>
             <h3>Referral Revenue (70%)</h3>
             <p className="text-2xl">{data.referralRevenue} credits</p>
           </Card>
         </div>
         
         <RevenueChart data={data.chartData} />
         
         <RevenueTable logs={data.logs} />
       </div>
     );
   }
   ```

---

## PHASE 3: MARKETPLACE ENHANCEMENT (Tuần 5)

### **Week 5: Revenue Dashboard & Auto Preview**

#### 📋 Tasks

##### Backend (2 ngày)
1. **Material Revenue API**
   ```typescript
   // File: src/features/marketplace/marketplace.controller.ts
   
   @Get('teacher/revenue')
   async getTeacherRevenue(@Request() req) {
     const materials = await this.materialRepository.find({
       where: { teacher_id: req.user.id },
       relations: ['purchases']
     });
     
     const revenue = materials.map(material => {
       const totalSales = material.total_sales;
       const totalRevenue = material.total_revenue;
       const platformFee = totalRevenue * 0.20; // 20% platform fee
       const teacherShare = totalRevenue * 0.80;
       
       return {
         materialId: material.id,
         title: material.title,
         totalSales,
         totalRevenue,
         platformFee,
         teacherShare
       };
     });
     
     return {
       materials: revenue,
       totalRevenue: revenue.reduce((sum, r) => sum + r.totalRevenue, 0),
       totalPlatformFee: revenue.reduce((sum, r) => sum + r.platformFee, 0),
       totalTeacherShare: revenue.reduce((sum, r) => sum + r.teacherShare, 0)
     };
   }
   ```

2. **PDF Preview Generator**
   ```typescript
   // File: src/features/marketplace/pdf-preview.service.ts
   
   import * as pdf from 'pdf-lib';
   
   @Injectable()
   export class PdfPreviewService {
     async generatePreview(pdfPath: string): Promise<string> {
       // 1. Load PDF
       const pdfBytes = await fs.readFile(pdfPath);
       const pdfDoc = await pdf.PDFDocument.load(pdfBytes);
       
       // 2. Extract first 3 pages
       const previewDoc = await pdf.PDFDocument.create();
       const pages = await previewDoc.copyPages(pdfDoc, [0, 1, 2]);
       pages.forEach(page => previewDoc.addPage(page));
       
       // 3. Add watermark
       const watermarkText = 'PREVIEW - 4Talk.com';
       pages.forEach(page => {
         page.drawText(watermarkText, {
           x: 50,
           y: page.getHeight() - 50,
           size: 30,
           opacity: 0.3
         });
       });
       
       // 4. Save preview
       const previewBytes = await previewDoc.save();
       const previewPath = pdfPath.replace('.pdf', '_preview.pdf');
       await fs.writeFile(previewPath, previewBytes);
       
       return previewPath;
     }
   }
   ```

##### Frontend (2 ngày)
1. **Material Revenue Dashboard**
   ```tsx
   // File: app/teacher/materials/revenue/page.tsx
   
   export default function MaterialRevenuePage() {
     const { data } = useSWR('/api/marketplace/teacher/revenue');
     
     return (
       <div>
         <h1>Material Revenue</h1>
         
         <div className="summary">
           <StatCard title="Total Revenue" value={`${data.totalRevenue} credits`} />
           <StatCard title="Platform Fee (20%)" value={`${data.totalPlatformFee} credits`} />
           <StatCard title="Your Share (80%)" value={`${data.totalTeacherShare} credits`} />
         </div>
         
         <Table>
           <thead>
             <tr>
               <th>Material</th>
               <th>Sales</th>
               <th>Revenue</th>
               <th>Platform Fee</th>
               <th>Your Share</th>
             </tr>
           </thead>
           <tbody>
             {data.materials.map(m => (
               <tr key={m.materialId}>
                 <td>{m.title}</td>
                 <td>{m.totalSales}</td>
                 <td>{m.totalRevenue}</td>
                 <td>{m.platformFee}</td>
                 <td className="font-bold">{m.teacherShare}</td>
               </tr>
             ))}
           </tbody>
         </Table>
       </div>
     );
   }
   ```

---

## PHASE 4: FREE TALK FEATURES (Tuần 6-7)

### **Week 6: Filters & GeoIP**

#### 📋 Tasks

##### Backend (3 ngày)
1. **Install GeoIP**
   ```bash
   npm install maxmind
   ```

2. **GeoIP Service**
   ```typescript
   // File: src/infrastructure/geoip/geoip.service.ts
   
   import * as maxmind from 'maxmind';
   
   @Injectable()
   export class GeoIpService {
     private reader: maxmind.Reader<maxmind.CityResponse>;
     
     async onModuleInit() {
       this.reader = await maxmind.open('./data/GeoLite2-City.mmdb');
     }
     
     getLocation(ip: string) {
       const result = this.reader.get(ip);
       return {
         country: result?.country?.iso_code,
         region: result?.subdivisions?.[0]?.iso_code,
         city: result?.city?.names?.en,
         latitude: result?.location?.latitude,
         longitude: result?.location?.longitude
       };
     }
   }
   ```

3. **Meeting Filter API**
   ```typescript
   // File: src/features/meeting/meeting.controller.ts
   
   @Get('free-talk/available')
   async getAvailableFreeTalkRooms(
     @Query('language') language?: string,
     @Query('level') level?: string,
     @Query('region') region?: string,
     @Request() req?: any
   ) {
     const queryBuilder = this.meetingRepository
       .createQueryBuilder('meeting')
       .where('meeting.type = :type', { type: 'FREE_TALK' })
       .andWhere('meeting.state = :state', { state: 'WAITING' });
     
     if (language) {
       queryBuilder.andWhere('meeting.language = :language', { language });
     }
     
     if (level) {
       queryBuilder.andWhere('meeting.level = :level', { level });
     }
     
     if (region) {
       queryBuilder.andWhere('meeting.region = :region', { region });
     }
     
     // Suggest peers from same region
     if (req?.ip) {
       const location = this.geoIpService.getLocation(req.ip);
       queryBuilder.orderBy(
         `CASE WHEN meeting.region = '${location.region}' THEN 0 ELSE 1 END`
       );
     }
     
     return await queryBuilder.getMany();
   }
   ```

##### Frontend (2 ngày)
1. **Filter UI**
   ```tsx
   // File: components/free-talk/FreeTalkFilters.tsx
   
   export function FreeTalkFilters({ onFilterChange }) {
     const [filters, setFilters] = useState({
       language: '',
       level: '',
       region: ''
     });
     
     return (
       <div className="filters">
         <Select
           value={filters.language}
           onChange={(e) => {
             setFilters({ ...filters, language: e.target.value });
             onFilterChange({ ...filters, language: e.target.value });
           }}
         >
           <option value="">All Languages</option>
           <option value="english">English</option>
           <option value="vietnamese">Vietnamese</option>
         </Select>
         
         <Select
           value={filters.level}
           onChange={(e) => {
             setFilters({ ...filters, level: e.target.value });
             onFilterChange({ ...filters, level: e.target.value });
           }}
         >
           <option value="">All Levels</option>
           <option value="beginner">Beginner</option>
           <option value="intermediate">Intermediate</option>
           <option value="advanced">Advanced</option>
         </Select>
         
         <Select
           value={filters.region}
           onChange={(e) => {
             setFilters({ ...filters, region: e.target.value });
             onFilterChange({ ...filters, region: e.target.value });
           }}
         >
           <option value="">All Regions</option>
           <option value="asia">Asia</option>
           <option value="europe">Europe</option>
           <option value="america">America</option>
         </Select>
       </div>
     );
   }
   ```

---

### **Week 7: Topic-based Chat Rooms**

#### 📋 Tasks

##### Backend (3 ngày)
1. **Socket Namespaces**
   ```typescript
   // File: src/gateways/topic-chat.gateway.ts
   
   @WebSocketGateway({ namespace: '/chat' })
   export class TopicChatGateway {
     @WebSocketServer()
     server: Server;
     
     @SubscribeMessage('join_topic')
     handleJoinTopic(client: Socket, payload: { topic: string }) {
       const room = `topic_${payload.topic}`;
       client.join(room);
       
       this.server.to(room).emit('user_joined', {
         userId: client.data.userId,
         topic: payload.topic
       });
     }
     
     @SubscribeMessage('send_message')
     handleMessage(client: Socket, payload: { topic: string, message: string }) {
       const room = `topic_${payload.topic}`;
       
       this.server.to(room).emit('new_message', {
         userId: client.data.userId,
         message: payload.message,
         timestamp: new Date()
       });
     }
   }
   ```

##### Frontend (2 ngày)
1. **Topic Chat Component**
   ```tsx
   // File: components/chat/TopicChat.tsx
   
   export function TopicChat({ topic }) {
     const [messages, setMessages] = useState([]);
     const socket = useSocket('/chat');
     
     useEffect(() => {
       socket.emit('join_topic', { topic });
       
       socket.on('new_message', (msg) => {
         setMessages(prev => [...prev, msg]);
       });
       
       return () => {
         socket.off('new_message');
       };
     }, [topic]);
     
     const sendMessage = (text) => {
       socket.emit('send_message', { topic, message: text });
     };
     
     return (
       <div className="topic-chat">
         <h3>💬 {topic} Chat</h3>
         <MessageList messages={messages} />
         <MessageInput onSend={sendMessage} />
       </div>
     );
   }
   ```

---

## PHASE 5: PAYMENT INTEGRATION (Tuần 8)

### **Week 8: Admin Tools & Payment Gateway**

#### 📋 Tasks

##### Backend (3 ngày)
1. **Admin Credit Management**
   ```typescript
   // File: src/admin/admin.controller.ts
   
   @Post('users/:userId/credits')
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles(UserRole.ADMIN)
   async addCreditsToUser(
     @Param('userId') userId: string,
     @Body() dto: { amount: number, reason: string }
   ) {
     await this.walletService.addCredits(
       userId,
       dto.amount,
       `Admin credit: ${dto.reason}`,
       null,
       { admin: true }
     );
     
     return { message: 'Credits added successfully' };
   }
   ```

2. **Stripe Integration (Optional)**
   ```typescript
   // File: src/features/payments/stripe.service.ts
   
   import Stripe from 'stripe';
   
   @Injectable()
   export class StripeService {
     private stripe: Stripe;
     
     constructor() {
       this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
     }
     
     async createPaymentIntent(amount: number, userId: string) {
       return await this.stripe.paymentIntents.create({
         amount: amount * 100, // Convert to cents
         currency: 'usd',
         metadata: { userId }
       });
     }
   }
   ```

##### Frontend (2 ngày)
1. **Admin Credit Tool**
   ```tsx
   // File: app/admin/credits/page.tsx
   
   export default function AdminCreditsPage() {
     const [email, setEmail] = useState('');
     const [amount, setAmount] = useState(0);
     const [reason, setReason] = useState('');
     
     const handleAddCredits = async () => {
       // 1. Find user by email
       const user = await api.get(`/admin/users/by-email/${email}`);
       
       // 2. Add credits
       await api.post(`/admin/users/${user.id}/credits`, {
         amount,
         reason
       });
       
       toast.success(`Added ${amount} credits to ${email}`);
     };
     
     return (
       <div>
         <h1>Add Credits (Admin)</h1>
         <Input
           placeholder="User email"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
         />
         <Input
           type="number"
           placeholder="Amount"
           value={amount}
           onChange={(e) => setAmount(Number(e.target.value))}
         />
         <Input
           placeholder="Reason"
           value={reason}
           onChange={(e) => setReason(e.target.value)}
         />
         <Button onClick={handleAddCredits}>Add Credits</Button>
       </div>
     );
   }
   ```

---

## 📊 METRICS & MONITORING

### KPIs theo tuần
- **Week 1:** Teacher can start/end class ✅
- **Week 2:** Refund logic working ✅
- **Week 3:** Referral tracking active ✅
- **Week 4:** Revenue sharing automated ✅
- **Week 5:** Material revenue dashboard live ✅
- **Week 6:** GeoIP filtering working ✅
- **Week 7:** Topic chat rooms active ✅
- **Week 8:** Admin tools + payment ready ✅

### Testing Strategy
- **Unit Tests:** 80% coverage minimum
- **Integration Tests:** All critical flows
- **E2E Tests:** User journeys (book → attend → pay)
- **Load Tests:** 1000 concurrent users

---

## 🚀 DEPLOYMENT STRATEGY

### Incremental Releases
- **Week 2:** Release Booking v2 (with refund)
- **Week 4:** Release Affiliate System
- **Week 6:** Release Free Talk v2 (with filters)
- **Week 8:** Release Payment System

### Rollback Plan
- Feature flags for all new features
- Database migrations are reversible
- Keep old APIs for 2 weeks

---

## 💡 BEST PRACTICES

### Code Quality
- TypeScript strict mode
- ESLint + Prettier
- Code reviews mandatory
- No direct DB queries (use repositories)

### Security
- Input validation on all APIs
- Rate limiting (100 req/min)
- SQL injection prevention
- XSS protection

### Performance
- Database indexes on foreign keys
- Redis caching for hot data
- CDN for static assets
- Lazy loading on frontend

---

## 📞 SUPPORT & RESOURCES

### Documentation
- API docs: Swagger/OpenAPI
- Database schema: dbdiagram.io
- Architecture: Mermaid diagrams

### Team Communication
- Daily standups (15 min)
- Weekly demos (Friday)
- Bi-weekly retrospectives

---

**Tài liệu này là roadmap chi tiết cho 8 tuần tiếp theo.**  
**Mỗi task có thể được chia nhỏ thành sub-tasks trong Jira/Trello.**

**Version:** 1.0  
**Last Updated:** 03/12/2025
