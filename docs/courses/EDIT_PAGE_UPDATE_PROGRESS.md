# ✅ EDIT PAGE UPDATE PROGRESS

**Ngày**: 2025-12-03  
**Trạng thái**: 🔄 In Progress

---

## ✅ ĐÃ HOÀN THÀNH

### 1. Backend API Update
- [x] Thêm `thumbnail_url` vào `UpdateCourseDto` trong `courses.rest.ts`

### 2. State Variables
- [x] Thêm `thumbnailUrl` state
- [x] Thêm `isFree` state

### 3. Load Course Data
- [x] Load `thumbnail_url` từ course
- [x] Set `isFree` based on prices

### 4. Update API Call
- [x] Include `thumbnail_url` in update
- [x] Handle free course pricing (set to 0 when isFree)

---

## 🔄 CẦN THỰC HIỆN TIẾP

### 1. Add Thumbnail URL Field
**Vị trí**: Sau Description field (line ~580)

```tsx
{/* Thumbnail URL */}
<div className="space-y-2">
    <Label htmlFor="thumbnail">Course Thumbnail (URL)</Label>
    <Input
        id="thumbnail"
        type="url"
        placeholder="https://example.com/image.jpg"
        value={thumbnailUrl}
        onChange={(e) => setThumbnailUrl(e.target.value)}
    />
    {thumbnailUrl && (
        <div className="mt-2">
            <img
                src={thumbnailUrl}
                alt="Thumbnail preview"
                className="w-32 h-32 object-cover rounded border"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                }}
            />
        </div>
    )}
    <p className="text-sm text-gray-500 mt-1">
        Provide a URL to an image for your course thumbnail
    </p>
</div>
```

---

### 2. Reorganize Category/Tags/Language Layout
**Current** (lines ~576-672):
```tsx
<div className="grid grid-cols-2 gap-4">
    <div>Category</div>
    <div>Tags (conditional)</div>
    <div>Language</div>
</div>
```

**Should be** (match create page):
```tsx
{/* Category, Tags, Language in better layout */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
        <Label htmlFor="language">Language</Label>
        <Input ... />
    </div>
    
    <div>
        <Label htmlFor="level">Level</Label>
        <Select ... />
    </div>
    
    <div>
        <Label htmlFor="category">Category</Label>
        <Select ... />
    </div>
</div>

{/* Tags - show only if category selected */}
{category && (
    <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        {/* Tags UI */}
    </div>
)}
```

---

### 3. Add Free Course Toggle
**Vị trí**: Đầu Pricing section (before line ~702)

```tsx
{/* Free Course Toggle */}
<div className="flex items-center space-x-2 p-4 bg-green-50 rounded-lg border border-green-200">
    <input
        type="checkbox"
        id="is-free"
        checked={isFree}
        onChange={(e) => {
            setIsFree(e.target.checked);
            if (e.target.checked) {
                setPricePerSession(0);
                setPriceFullCourse(0);
            } else {
                setPricePerSession(10);
            }
        }}
        className="w-4 h-4 text-green-600"
    />
    <Label htmlFor="is-free" className="font-medium cursor-pointer">
        This is a FREE course
    </Label>
</div>

{/* Conditional pricing fields */}
{!isFree && (
    <>
        {/* Existing pricing fields */}
    </>
)}
```

---

### 4. Add Icons to Headers
**Lines to update**:
- Line ~556: Course Information header
- Line ~702: Pricing header (if exists)

```tsx
{/* Course Information */}
<CardTitle className="flex items-center gap-2">
    <BookOpen className="w-5 h-5" />
    Course Information
</CardTitle>
<CardDescription>
    Update basic course details
</CardDescription>
```

---

### 5. Improve Grid Layout for Numbers
**Lines ~674-699**: Duration and Max Students

**Should be**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div>
        <Label htmlFor="duration">
            <Clock className="w-4 h-4 inline mr-1" />
            Total Duration (hours) *
        </Label>
        <Input ... />
    </div>
    
    <div>
        <Label htmlFor="maxStudents">
            <Users className="w-4 h-4 inline mr-1" />
            Max Students
        </Label>
        <Input ... />
    </div>
</div>
```

---

## 📝 QUICK IMPLEMENTATION GUIDE

### Option 1: Manual Edits (Recommended)
Vì file quá dài và có nhiều thay đổi UI, nên tốt nhất là:

1. Mở file `app/courses/[id]/edit/page.tsx`
2. Tham khảo `app/courses/create/page.tsx` (lines 460-760)
3. Copy layout và structure từ create page
4. Giữ nguyên logic update của edit page

### Option 2: Key Changes Only
Nếu chỉ muốn thêm features quan trọng:

1. **Thumbnail Field** (sau description):
   - Copy từ create page lines 496-520
   
2. **Free Course Toggle** (đầu pricing):
   - Copy từ create page lines 677-697
   
3. **Reorganize Layout**:
   - Category/Level/Language: 3-column grid
   - Duration/Max Students: 2-column grid

---

## 🎯 PRIORITY ORDER

### High Priority (Must Have)
1. ✅ Thumbnail URL field - Cho phép update thumbnail
2. ✅ Free Course toggle - Quan trọng cho free courses
3. ⚠️ Fix layout - Category, Level, Language grid

### Medium Priority (Nice to Have)
4. Icons in headers - Better UX
5. Better field labels with icons
6. CardDescription for context

### Low Priority (Optional)
7. Exact spacing match
8. Exact color scheme match

---

## 🧪 TESTING CHECKLIST

- [ ] Load course with thumbnail → Thumbnail displays
- [ ] Load free course → isFree checkbox checked
- [ ] Load paid course → isFree checkbox unchecked
- [ ] Update thumbnail URL → Preview shows
- [ ] Toggle free course → Prices set to 0
- [ ] Untoggle free course → Prices restore
- [ ] Save changes → All fields update correctly
- [ ] Responsive layout → Works on mobile and desktop

---

## 💡 NEXT STEPS

### Immediate (Cần làm ngay)
1. Thêm Thumbnail URL field vào UI
2. Thêm Free Course toggle vào Pricing section
3. Test thumbnail preview
4. Test free course toggle

### Short-term (Trong vài giờ tới)
1. Reorganize layout thành 3-column grid
2. Add icons to headers
3. Improve field labels
4. Test responsive design

### Long-term (Có thể làm sau)
1. Match exact spacing với create page
2. Add more validation
3. Add image upload (thay vì URL)
4. Add drag-drop for thumbnail

---

**Status**: Backend ✅ | Frontend UI 🔄 (50% complete)  
**Next Action**: Add Thumbnail field and Free toggle to UI
