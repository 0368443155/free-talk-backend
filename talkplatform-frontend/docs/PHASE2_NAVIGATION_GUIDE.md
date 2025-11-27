# 🧭 Phase 2 Navigation Guide

Tài liệu này liệt kê tất cả các nút điều hướng và links đến các chức năng Phase 2 đã được triển khai.

## 📍 Các Trang Chính

### 1. My Learning (`/student/my-learning`)
**Mô tả**: Trang quản lý enrollments và session purchases của student

**Cách truy cập**:
- Main Navigation: `Courses` → `My Learning` (submenu)
- User Dropdown Menu: `My Learning`
- Sidebar Navigation: `Learning` section → `My Learning`
- Dashboard: Quick action card "My Learning"
- Courses Page: Button "My Learning" ở header

**Chức năng**:
- Xem danh sách enrollments
- Xem danh sách session purchases
- Cancel enrollment/purchase với refund
- Xem progress và completion percentage

---

### 2. Browse Courses (`/courses`)
**Mô tả**: Trang duyệt và tìm kiếm courses

**Cách truy cập**:
- Main Navigation: `Courses` → `Browse Courses`
- Dashboard: Quick action card "Courses"
- Sidebar Navigation: `Learning` section → `Courses`

**Chức năng**:
- Browse tất cả courses
- Search và filter theo category
- Xem course details
- Enroll hoặc purchase sessions

---

### 3. Course Detail (`/courses/[id]`)
**Mô tả**: Trang chi tiết course với enrollment UI

**Cách truy cập**:
- Click vào course card từ Browse Courses
- Direct link: `/courses/{courseId}`

**Chức năng**:
- Xem course information
- Credit balance display
- Enroll full course
- Purchase individual sessions
- View lessons với access control
- Join lesson meetings

---

### 4. Create Course (`/courses/create`)
**Mô tả**: Trang tạo course mới (Teacher only)

**Cách truy cập**:
- Main Navigation: `Courses` → `Create Course` (nếu là teacher)
- Courses Page: Button "Create Course" ở header
- Dashboard: Quick action card "Create Course" (teacher only)

**Chức năng**:
- Tạo course với sessions và lessons
- Upload materials
- Set pricing
- Set category và tags

---

### 5. Edit Course (`/courses/[id]/edit`)
**Mô tả**: Trang chỉnh sửa course (Teacher only)

**Cách truy cập**:
- Course Detail Page: Button "Edit Course"
- Direct link: `/courses/{courseId}/edit`

**Chức năng**:
- Edit course information
- Add/edit sessions
- Add/edit lessons
- Manage materials
- Update pricing

---

### 6. Credits & Payments (`/credits`)
**Mô tả**: Trang quản lý credits và payments

**Cách truy cập**:
- Main Navigation: `Credits` → `My Balance` / `Purchase Credits` / `Transaction History`
- User Dropdown Menu: `Credits & Payments`
- Dashboard: Quick action card "Add Credits" (student only)
- Header: Credit balance badge (clickable)

**Chức năng**:
- Xem credit balance
- Purchase credits
- View transaction history

---

## 🎯 Quick Access Points

### Header Navigation
1. **Credit Balance Badge** (top right)
   - Hiển thị: `{balance} Credits`
   - Link: `/credits/balance`
   - Luôn hiển thị khi đã login

2. **User Dropdown Menu**
   - `My Learning` → `/student/my-learning`
   - `Credits & Payments` → `/credits/balance`

### Main Navigation Bar
1. **Courses Menu**
   - `Browse Courses` → `/courses`
   - `My Learning` → `/student/my-learning` (submenu)

2. **Credits Menu**
   - `My Balance` → `/credits/balance`
   - `Purchase Credits` → `/credits/purchase`
   - `Transaction History` → `/credits/transactions`

### Dashboard Quick Actions
1. **My Learning Card** (student only)
   - Link: `/student/my-learning`
   - Hiển thị: Enrollments và purchases overview

2. **Courses Card**
   - Link: `/courses`
   - Teacher: "My Courses"
   - Student: "Browse Courses"

3. **Add Credits Card** (student only)
   - Link: `/credits`
   - Hiển thị: Current balance và quick add

4. **Phase 2 Navigation Component**
   - Grid layout với tất cả quick actions
   - Responsive design

### Sidebar Navigation
1. **Learning Section**
   - `My Learning` → `/student/my-learning`
   - `Courses` → `/courses`

2. **Payments Section**
   - `Credits` → `/credits`
   - `Purchase History` → `/credits/transactions`

---

## 🔐 Access Control Indicators

### Lesson Cards
- **Preview Badge**: Lesson miễn phí xem trước
- **Free Badge**: Lesson hoàn toàn miễn phí
- **Locked Badge**: Cần purchase để access
- **Live Now Badge**: Lesson đang diễn ra
- **Completed Badge**: Lesson đã kết thúc

### Course Detail Page
- **Credit Balance**: Hiển thị ở sidebar
- **Insufficient Credits Warning**: Khi balance < price
- **Enrolled Badge**: Khi đã enroll
- **Purchase Buttons**: Disabled khi không đủ credits

---

## 📱 Mobile Navigation

Tất cả các links trên đều có trong mobile menu:
- Hamburger menu (top right)
- Expandable submenus
- Quick actions

---

## 🎨 Component Locations

### Components Created
1. `components/courses/credit-balance.tsx` - Credit balance display
2. `components/courses/lesson-card.tsx` - Lesson với access control
3. `components/courses/phase2-navigation.tsx` - Quick navigation grid

### Pages Updated
1. `app/dashboard/page.tsx` - Added Phase 2 quick actions
2. `app/courses/[id]/page.tsx` - Added credit balance và lesson cards
3. `app/courses/page.tsx` - Added "My Learning" button
4. `app/student/my-learning/page.tsx` - New page for enrollments

### Navigation Updated
1. `components/navigation/main-nav.tsx` - Added "My Learning" to dropdown
2. `components/navigation/sidebar-nav.tsx` - Added "My Learning" to sidebar

---

## 🚀 Quick Start Guide

### For Students:
1. **Add Credits**: Click credit balance badge → Purchase credits
2. **Browse Courses**: Main nav → Courses → Browse Courses
3. **Enroll**: Course detail page → "Buy Full Course" button
4. **View Learning**: Main nav → Courses → My Learning

### For Teachers:
1. **Create Course**: Main nav → Courses → Create Course
2. **Manage Courses**: Main nav → Courses → My Own Courses (tab)
3. **View Enrollments**: Course detail page → View enrolled students

---

## 📝 Notes

- Tất cả navigation links đều có role-based access control
- Credit balance được hiển thị ở nhiều nơi để dễ theo dõi
- Mobile responsive cho tất cả navigation elements
- Quick actions trên Dashboard giúp truy cập nhanh các chức năng chính

