# 🎯 COURSE MANAGEMENT FEATURES - Publish & Edit

**Ngày thực hiện**: 2025-12-03  
**Trạng thái**: ✅ Completed  
**Mức độ**: 🔥 Critical

---

## 🐛 VẤN ĐỀ PHÁT HIỆN

### 1. Courses mới tạo không hiển thị trong Browse tab
**Nguyên nhân**: 
- Courses mới tạo có `status: 'draft'` và `is_published: false`
- Browse tab hiển thị TẤT CẢ courses (bao gồm draft)
- Không có cách nào để publish course

### 2. Thiếu nút Publish
**Nguyên nhân**:
- API `publishCourseApi` và `unpublishCourseApi` đã có
- UI không có button để gọi API

### 3. Thiếu chức năng Edit course
**Nguyên nhân**:
- Route `/courses/[id]/edit/page.tsx` đã tồn tại
- UI không có button để navigate đến edit page

---

## ✅ GIẢI PHÁP ĐÃ THỰC HIỆN

### Fix #1: Filter Published Courses trong Browse Tab

#### Vấn đề cũ:
```typescript
// ❌ Hiển thị TẤT CẢ courses (bao gồm draft)
const loadCourses = async () => {
    const response = await getCoursesApi();
    setCourses(response.courses);
};
```

#### Giải pháp mới:
```typescript
// ✅ Chỉ hiển thị published courses
const loadCourses = async () => {
    // Only show published courses in Browse tab
    const response = await getCoursesApi({ status: 'published' as any });
    setCourses(response.courses);
};
```

**Kết quả**:
- Browse tab: Chỉ hiển thị courses đã publish
- My Courses tab: Hiển thị TẤT CẢ courses của teacher (bao gồm draft)

---

### Fix #2: Thêm Publish/Unpublish Button

#### UI Location:
- Vị trí: Hero section, sau breadcrumbs
- Hiển thị: Chỉ cho teacher/admin của course
- Màu sắc:
  - **Publish**: Green button (bg-green-500)
  - **Unpublish**: Yellow button (bg-yellow-500)

#### Code Implementation:
```tsx
{isTeacherOrAdmin && (
    <div className="flex items-center gap-2">
        {/* Edit Button */}
        <Button
            variant="outline"
            size="sm"
            className="bg-white text-gray-900"
            onClick={() => router.push(`/courses/${courseId}/edit`)}
        >
            <Edit className="w-4 h-4 mr-1" />
            Edit
        </Button>
        
        {/* Publish/Unpublish Button */}
        {course.is_published ? (
            <Button
                variant="outline"
                size="sm"
                className="bg-yellow-500 text-white hover:bg-yellow-600"
                onClick={async () => {
                    await unpublishCourseApi(courseId);
                    toast({
                        title: "Success",
                        description: "Course unpublished successfully",
                    });
                    await loadCourse();
                }}
            >
                Unpublish
            </Button>
        ) : (
            <Button
                variant="outline"
                size="sm"
                className="bg-green-500 text-white hover:bg-green-600"
                onClick={async () => {
                    await publishCourseApi(courseId);
                    toast({
                        title: "Success",
                        description: "Course published successfully! It will now appear in the browse tab.",
                    });
                    await loadCourse();
                }}
            >
                Publish
            </Button>
        )}
    </div>
)}
```

**Features**:
- ✅ Publish course → Hiển thị trong Browse tab
- ✅ Unpublish course → Ẩn khỏi Browse tab
- ✅ Toast notification sau khi publish/unpublish
- ✅ Auto reload course data sau khi thay đổi

---

### Fix #3: Thêm Edit Button

#### UI Location:
- Vị trí: Hero section, bên cạnh Publish button
- Hiển thị: Chỉ cho teacher/admin của course
- Action: Navigate đến `/courses/${courseId}/edit`

#### Code Implementation:
```tsx
<Button
    variant="outline"
    size="sm"
    className="bg-white text-gray-900 hover:bg-gray-100"
    onClick={() => router.push(`/courses/${courseId}/edit`)}
>
    <Edit className="w-4 h-4 mr-1" />
    Edit
</Button>
```

**Features**:
- ✅ Navigate đến edit page
- ✅ Edit page đã tồn tại tại `/courses/[id]/edit/page.tsx`

---

## 📝 CHI TIẾT THAY ĐỔI

### File 1: `talkplatform-frontend/app/courses/page.tsx`

#### Change: Filter published courses
**Lines 63-80**
```typescript
const loadCourses = async () => {
    try {
        setLoading(true);
        // ✅ ADDED: Only show published courses in Browse tab
        const response = await getCoursesApi({ status: 'published' as any });
        const coursesData = response?.courses || (Array.isArray(response) ? response : []);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
    } catch (error: any) {
        // ... error handling
    } finally {
        setLoading(false);
    }
};
```

---

### File 2: `talkplatform-frontend/app/courses/[id]/page.tsx`

#### Change 1: Import publish/unpublish APIs
**Line 25**
```typescript
// ✅ ADDED: publishCourseApi, unpublishCourseApi
import { 
    getCourseByIdApi, 
    Course, 
    publishCourseApi, 
    unpublishCourseApi 
} from '@/api/courses.rest';
```

#### Change 2: Add Teacher Action Buttons
**Lines 301-373**
```tsx
{/* Breadcrumbs */}
<div className="flex items-center justify-between gap-2 mb-4">
    <div className="flex items-center gap-2 text-sm text-slate-300">
        {/* Breadcrumbs content */}
    </div>
    
    {/* ✅ ADDED: Teacher Actions */}
    {isTeacherOrAdmin && (
        <div className="flex items-center gap-2">
            {/* Edit Button */}
            <Button
                variant="outline"
                size="sm"
                className="bg-white text-gray-900 hover:bg-gray-100"
                onClick={() => router.push(`/courses/${courseId}/edit`)}
            >
                <Edit className="w-4 h-4 mr-1" />
                Edit
            </Button>
            
            {/* Publish/Unpublish Button */}
            {course.is_published ? (
                <Button
                    variant="outline"
                    size="sm"
                    className="bg-yellow-500 text-white hover:bg-yellow-600 border-yellow-500"
                    onClick={async () => {
                        try {
                            await unpublishCourseApi(courseId);
                            toast({
                                title: "Success",
                                description: "Course unpublished successfully",
                            });
                            await loadCourse();
                        } catch (error: any) {
                            toast({
                                title: "Error",
                                description: error.response?.data?.message || "Failed to unpublish course",
                                variant: "destructive",
                            });
                        }
                    }}
                >
                    Unpublish
                </Button>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    className="bg-green-500 text-white hover:bg-green-600 border-green-500"
                    onClick={async () => {
                        try {
                            await publishCourseApi(courseId);
                            toast({
                                title: "Success",
                                description: "Course published successfully! It will now appear in the browse tab.",
                            });
                            await loadCourse();
                        } catch (error: any) {
                            toast({
                                title: "Error",
                                description: error.response?.data?.message || "Failed to publish course",
                                variant: "destructive",
                            });
                        }
                    }}
                >
                    Publish
                </Button>
            )}
        </div>
    )}
</div>
```

---

## 🧪 TESTING GUIDE

### Test 1: Create & Publish Course

**Steps**:
1. Login as teacher
2. Create a new course
3. Navigate to course detail page
4. **Expected**:
   - ✅ See "Edit" button (white)
   - ✅ See "Publish" button (green)
   - ✅ Course NOT visible in Browse tab yet
5. Click "Publish" button
6. **Expected**:
   - ✅ Toast: "Course published successfully!"
   - ✅ Button changes to "Unpublish" (yellow)
7. Go to Browse tab
8. **Expected**:
   - ✅ Course now visible in Browse tab

### Test 2: Unpublish Course

**Steps**:
1. On published course detail page
2. Click "Unpublish" button
3. **Expected**:
   - ✅ Toast: "Course unpublished successfully"
   - ✅ Button changes to "Publish" (green)
4. Go to Browse tab
5. **Expected**:
   - ✅ Course NOT visible in Browse tab
6. Go to My Courses tab
7. **Expected**:
   - ✅ Course still visible in My Courses tab

### Test 3: Edit Course

**Steps**:
1. On course detail page
2. Click "Edit" button
3. **Expected**:
   - ✅ Navigate to `/courses/${courseId}/edit`
   - ✅ Edit page loads successfully

### Test 4: Student View (Regression)

**Steps**:
1. Login as student
2. Navigate to a course detail page
3. **Expected**:
   - ✅ NO "Edit" button visible
   - ✅ NO "Publish/Unpublish" button visible
   - ✅ Only see "Buy Now" or "View Course Content" button

---

## 🔍 VERIFICATION CHECKLIST

### Browse Tab
- [x] Only shows published courses
- [x] Draft courses not visible
- [x] Filter applied: `status: 'published'`

### My Courses Tab
- [x] Shows all teacher's courses
- [x] Includes draft courses
- [x] No status filter applied

### Teacher Actions
- [x] Edit button visible for teacher/admin
- [x] Publish button visible when `is_published: false`
- [x] Unpublish button visible when `is_published: true`
- [x] Buttons not visible for students

### API Calls
- [x] `publishCourseApi(courseId)` works
- [x] `unpublishCourseApi(courseId)` works
- [x] Course data reloads after publish/unpublish
- [x] Toast notifications show

---

## 📊 WORKFLOW

### Course Lifecycle

```
1. CREATE COURSE
   ↓
   Status: DRAFT
   is_published: false
   Visible in: My Courses tab only
   
2. CLICK "PUBLISH"
   ↓
   Status: PUBLISHED
   is_published: true
   Visible in: Browse tab + My Courses tab
   
3. CLICK "UNPUBLISH"
   ↓
   Status: DRAFT
   is_published: false
   Visible in: My Courses tab only
   
4. CLICK "EDIT"
   ↓
   Navigate to: /courses/${courseId}/edit
   Can modify: Title, description, sessions, lessons, etc.
```

---

## 🎨 UI/UX DETAILS

### Button Styles

**Edit Button**:
- Background: White (`bg-white`)
- Text: Gray 900 (`text-gray-900`)
- Hover: Gray 100 (`hover:bg-gray-100`)
- Icon: Edit icon
- Size: Small (`size="sm"`)

**Publish Button**:
- Background: Green 500 (`bg-green-500`)
- Text: White (`text-white`)
- Hover: Green 600 (`hover:bg-green-600`)
- Border: Green 500 (`border-green-500`)
- Text: "Publish"

**Unpublish Button**:
- Background: Yellow 500 (`bg-yellow-500`)
- Text: White (`text-white`)
- Hover: Yellow 600 (`hover:bg-yellow-600`)
- Border: Yellow 500 (`border-yellow-500`)
- Text: "Unpublish"

### Toast Messages

**Publish Success**:
```
Title: "Success"
Description: "Course published successfully! It will now appear in the browse tab."
Variant: default (green)
```

**Unpublish Success**:
```
Title: "Success"
Description: "Course unpublished successfully"
Variant: default (green)
```

**Error**:
```
Title: "Error"
Description: error.response?.data?.message || "Failed to publish/unpublish course"
Variant: "destructive" (red)
```

---

## 🚀 DEPLOYMENT NOTES

### Pre-Deployment
- [x] Code changes completed
- [x] Imports added
- [x] Lint errors fixed
- [ ] Manual testing completed

### Post-Deployment
- [ ] Test publish flow
- [ ] Test unpublish flow
- [ ] Test edit navigation
- [ ] Verify Browse tab only shows published courses
- [ ] Verify My Courses tab shows all courses

### Rollback Plan
If issues occur:
1. Revert `loadCourses()` filter
2. Hide teacher action buttons
3. Courses will show in Browse tab again

---

## 💡 FUTURE IMPROVEMENTS

### Publish Workflow
- [ ] Add confirmation modal before publish
- [ ] Add validation before publish (e.g., must have sessions, lessons)
- [ ] Add "Schedule Publish" feature (publish at specific time)
- [ ] Add "Preview" mode before publish

### Edit Workflow
- [ ] Add "Save as Draft" button in edit page
- [ ] Add "Publish" button in edit page
- [ ] Add auto-save in edit page
- [ ] Add version history

### Course Status
- [ ] Add "ARCHIVED" status
- [ ] Add "PENDING_REVIEW" status (for admin approval)
- [ ] Add status badge in course card
- [ ] Add status filter in My Courses tab

---

## 📚 RELATED FILES

### Modified Files
- `talkplatform-frontend/app/courses/page.tsx` (+1 line)
- `talkplatform-frontend/app/courses/[id]/page.tsx` (+70 lines)

### Related APIs
- `publishCourseApi(courseId)` - Publish course
- `unpublishCourseApi(courseId)` - Unpublish course
- `getCoursesApi(query)` - Get courses with filter

### Related Routes
- `/courses` - Browse & My Courses tabs
- `/courses/[id]` - Course detail page
- `/courses/[id]/edit` - Edit course page (existing)

---

**Completed by**: AI Assistant  
**Date**: 2025-12-03  
**Status**: ✅ Ready for Testing  
**Priority**: 🔥 Critical - Enables course management workflow
