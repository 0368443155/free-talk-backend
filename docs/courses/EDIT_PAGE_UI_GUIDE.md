# ✅ EDIT PAGE - UI CODE SNIPPETS TO ADD

**Status**: Backend Complete ✅ | UI Pending 🔄  
**Date**: 2025-12-03

---

## ✅ BACKEND COMPLETED

### 1. State Variables ✅
```typescript
const [thumbnailUrl, setThumbnailUrl] = useState('');
const [isFree, setIsFree] = useState(false);
```

### 2. Load Course Data ✅
```typescript
setThumbnailUrl(course.thumbnail_url || '');
setIsFree((course.price_per_session === 0 || !course.price_per_session) && (course.price_full_course === 0 || !course.price_full_course));
```

### 3. API Update ✅
```typescript
await updateCourseApi(courseId, {
    // ... other fields
    thumbnail_url: thumbnailUrl || undefined,
    price_per_session: priceType === PriceType.PER_SESSION && !isFree ? pricePerSession : 0,
    price_full_course: priceType === PriceType.FULL_COURSE && !isFree ? priceFullCourse : 0,
});
```

### 4. UpdateCourseDto ✅
```typescript
export interface UpdateCourseDto {
    // ... other fields
    thumbnail_url?: string;
}
```

---

## 🔄 UI CODE TO ADD MANUALLY

### STEP 1: Add Thumbnail Field
**Location**: After Description field (around line 579)

**Find this code**:
```tsx
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Enter course description"
                                        rows={4}
                                    />
                                </div>
```

**Add AFTER it**:
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

### STEP 2: Add Free Course Toggle
**Location**: Before "Pricing Type" section (around line 702)

**Find this code**:
```tsx
                                <div className="space-y-2">
                                    <Label>Pricing Type</Label>
                                    <RadioGroup value={priceType} onValueChange={(value) => setPriceType(value as PriceType)}>
```

**Add BEFORE it**:
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
```

**Then WRAP existing pricing fields**:
```tsx
                                {!isFree && (
                                    <>
                                        {/* Existing Pricing Type RadioGroup */}
                                        <div className="space-y-2">
                                            <Label>Pricing Type</Label>
                                            <RadioGroup value={priceType} onValueChange={(value) => setPriceType(value as PriceType)}>
                                                {/* ... existing radio buttons ... */}
                                            </RadioGroup>
                                        </div>

                                        {/* Existing price input fields */}
                                        {priceType === PriceType.PER_SESSION ? (
                                            <div className="space-y-2">
                                                {/* ... price per session input ... */}
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {/* ... full course price input ... */}
                                            </div>
                                        )}
                                    </>
                                )}
```

---

## 📝 DETAILED INSTRUCTIONS

### How to Add Thumbnail Field

1. Open `app/courses/[id]/edit/page.tsx`
2. Find line ~579 (Description field)
3. After the closing `</div>` of Description, add the Thumbnail code
4. Save file
5. Test: Load a course → Should see thumbnail field
6. Test: Enter URL → Should see preview image

### How to Add Free Course Toggle

1. Find line ~702 (Pricing Type section)
2. BEFORE the "Pricing Type" div, add the Free Course Toggle code
3. Find the closing tag of the last price input field (around line ~745)
4. Wrap ALL pricing fields (from "Pricing Type" to last price input) with `{!isFree && ( ... )}`
5. Save file
6. Test: Load free course → Checkbox should be checked
7. Test: Toggle checkbox → Prices should change

---

## 🎯 EXPECTED RESULT

### After Adding Thumbnail:
```
┌─ Course Information ────────────┐
│ Title                           │
│ Description                     │
│ Thumbnail URL [preview image]   │  ← NEW
│ Category                        │
│ Tags                            │
│ ...                             │
└─────────────────────────────────┘
```

### After Adding Free Toggle:
```
┌─ Pricing ───────────────────────┐
│ [✓] This is a FREE course       │  ← NEW
│                                 │
│ Pricing Type (hidden if free)   │
│ Price (hidden if free)          │
└─────────────────────────────────┘
```

---

## 🧪 TESTING CHECKLIST

### Thumbnail Field
- [ ] Field appears after Description
- [ ] Can enter URL
- [ ] Preview shows when URL is valid
- [ ] Preview hides when URL is invalid
- [ ] Saves to database
- [ ] Loads from database

### Free Course Toggle
- [ ] Toggle appears before Pricing Type
- [ ] Checked when course is free (price = 0)
- [ ] Unchecked when course is paid
- [ ] Checking sets prices to 0
- [ ] Unchecking restores default price (10)
- [ ] Pricing fields hide when checked
- [ ] Pricing fields show when unchecked
- [ ] Saves correctly to database

---

## 💡 TIPS

### Finding the Right Location
1. Use Ctrl+F to search for exact text
2. Look for line numbers in comments
3. Match indentation carefully
4. Check opening/closing tags

### Common Mistakes to Avoid
1. ❌ Wrong indentation → Breaks JSX structure
2. ❌ Missing closing tags → Syntax error
3. ❌ Wrong variable names → Runtime error
4. ❌ Forgetting to wrap with `{!isFree && ...}` → Always shows pricing

### If You Make a Mistake
```bash
# Restore file from git
git checkout HEAD -- talkplatform-frontend/app/courses/[id]/edit/page.tsx

# Then try again more carefully
```

---

## 📚 REFERENCE FILES

- **Create Page**: `app/courses/create/page.tsx` (lines 496-520 for thumbnail, 677-697 for free toggle)
- **API Types**: `api/courses.rest.ts` (UpdateCourseDto)
- **Current Edit Page**: `app/courses/[id]/edit/page.tsx`

---

## ✅ COMPLETION CHECKLIST

- [x] Backend state variables added
- [x] Backend loadCourse updated
- [x] Backend API call updated
- [x] UpdateCourseDto updated
- [ ] UI Thumbnail field added
- [ ] UI Free toggle added
- [ ] Testing completed
- [ ] Commit changes

---

**Next Step**: Manually add the UI code snippets above to the edit page.  
**Estimated Time**: 10-15 minutes  
**Difficulty**: Easy (just copy-paste at right locations)
