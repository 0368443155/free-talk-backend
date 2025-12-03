# 🎨 UX IMPROVEMENTS: Course Creation Wizard

**Timeline**: 5 ngày  
**Priority**: 🔥 High  
**Dependencies**: Phase 1, Phase 2  
**Status**: 📋 Ready to Start

---

## 📋 MỤC LỤC

1. [Tổng Quan](#tổng-quan)
2. [Multi-Step Wizard](#multi-step-wizard)
3. [Auto-Save & Draft](#auto-save--draft)
4. [Rich Text Editor](#rich-text-editor)
5. [Preview Mode](#preview-mode)
6. [Validation & Feedback](#validation--feedback)
7. [Implementation Guide](#implementation-guide)

---

## 🎯 TỔNG QUAN

### Current Problems

```
❌ HIỆN TẠI:
├── Form quá dài, overwhelming
├── Mất data khi refresh
├── Không có preview
├── Validation chỉ khi submit
├── Text editor cơ bản
└── Không có progress tracking
```

### Target Experience

```
✅ MỤC TIÊU:
├── Wizard 5 bước rõ ràng
├── Auto-save mỗi 30 giây
├── Preview real-time
├── Validation ngay lập tức
├── Rich text editor chuyên nghiệp
└── Progress bar & indicators
```

---

## 🧙‍♂️ MULTI-STEP WIZARD

### Wizard Flow

```
┌─────────────────────────────────────────────────────┐
│  STEP 1: Basic Information                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ • Title                                       │  │
│  │ • Description (Rich Text)                     │  │
│  │ • Category, Level, Language                   │  │
│  │ • Thumbnail Upload                            │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  [Cancel]                        [Save Draft] [Next]│
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  STEP 2: Pricing & Capacity                         │
│  ┌───────────────────────────────────────────────┐  │
│  │ • Full Course Price                           │  │
│  │ • Per Session Price                           │  │
│  │ • Max Students                                │  │
│  │ • Early Bird Discount (Optional)              │  │
│  │                                               │  │
│  │ 💡 Suggested: $100 full / $15 per session    │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  [Back]                          [Save Draft] [Next]│
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  STEP 3: Sessions Planning                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ 📋 Use Template?                              │  │
│  │ [Browse Templates] [Start from Scratch]       │  │
│  │                                               │  │
│  │ Sessions:                                     │  │
│  │ ┌─────────────────────────────────────────┐  │  │
│  │ │ Session 1: Introduction                 │  │  │
│  │ │ Date: 2025-12-10 | Time: 14:00-16:00  │  │  │
│  │ │ [Edit] [Delete]                        │  │  │
│  │ └─────────────────────────────────────────┘  │  │
│  │ [+ Add Session] [Import from CSV]            │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  [Back]                          [Save Draft] [Next]│
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  STEP 4: Lessons & Content                          │
│  ┌───────────────────────────────────────────────┐  │
│  │ Session 1: Introduction                       │  │
│  │ ┌─────────────────────────────────────────┐  │  │
│  │ │ Lesson 1: Welcome & Overview            │  │  │
│  │ │ Duration: 30 min | Type: Lecture        │  │  │
│  │ │ Materials: [syllabus.pdf] [welcome.mp4] │  │  │
│  │ │ [Edit] [Delete]                         │  │  │
│  │ └─────────────────────────────────────────┘  │  │
│  │ [+ Add Lesson]                               │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  [Back]                          [Save Draft] [Next]│
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  STEP 5: Review & Publish                           │
│  ┌───────────────────────────────────────────────┐  │
│  │ ✅ Validation Checklist:                      │  │
│  │ ✅ Title set                                  │  │
│  │ ✅ At least 1 session                         │  │
│  │ ✅ Pricing configured                         │  │
│  │ ✅ All sessions have dates                    │  │
│  │                                               │  │
│  │ [Preview Course] [Edit Details]               │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  [Back]              [Save as Draft] [Publish Now] │
└─────────────────────────────────────────────────────┘
```

### Progress Indicator

```typescript
// components/CourseWizard/ProgressIndicator.tsx
interface Step {
  number: number;
  title: string;
  completed: boolean;
  current: boolean;
}

export function ProgressIndicator({ steps, currentStep }: Props) {
  return (
    <div className="wizard-progress">
      {steps.map((step, index) => (
        <div key={step.number} className="step-item">
          <div className={`step-circle ${getStepClass(step)}`}>
            {step.completed ? '✓' : step.number}
          </div>
          <div className="step-label">{step.title}</div>
          {index < steps.length - 1 && (
            <div className={`step-line ${step.completed ? 'completed' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function getStepClass(step: Step): string {
  if (step.completed) return 'completed';
  if (step.current) return 'current';
  return 'pending';
}
```

### Wizard State Management

```typescript
// hooks/useCourseWizard.ts
import { useState, useCallback } from 'react';

interface WizardState {
  currentStep: number;
  data: {
    basicInfo?: BasicInfoData;
    pricing?: PricingData;
    sessions?: SessionData[];
    lessons?: LessonData[];
  };
  validationErrors: Record<string, string[]>;
}

export function useCourseWizard() {
  const [state, setState] = useState<WizardState>({
    currentStep: 1,
    data: {},
    validationErrors: {},
  });

  const nextStep = useCallback(() => {
    if (validateCurrentStep()) {
      setState(prev => ({
        ...prev,
        currentStep: Math.min(prev.currentStep + 1, 5),
      }));
    }
  }, [state]);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  const updateData = useCallback((stepData: Partial<WizardState['data']>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...stepData },
    }));
  }, []);

  const validateCurrentStep = useCallback((): boolean => {
    const errors = validateStep(state.currentStep, state.data);
    setState(prev => ({ ...prev, validationErrors: errors }));
    return Object.keys(errors).length === 0;
  }, [state]);

  return {
    currentStep: state.currentStep,
    data: state.data,
    validationErrors: state.validationErrors,
    nextStep,
    prevStep,
    updateData,
    canProceed: Object.keys(state.validationErrors).length === 0,
  };
}
```

---

## 💾 AUTO-SAVE & DRAFT

### Auto-Save Hook

```typescript
// hooks/useAutoSave.ts
import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AutoSaveOptions {
  interval?: number; // milliseconds
  enabled?: boolean;
}

export function useAutoSave<T>(
  data: T,
  courseId: string | null,
  options: AutoSaveOptions = {}
) {
  const { interval = 30000, enabled = true } = options;
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const previousDataRef = useRef<T>(data);

  const saveMutation = useMutation({
    mutationFn: (draftData: T) => 
      api.courses.saveDraft(courseId, draftData),
    onSuccess: () => {
      setLastSaved(new Date());
      setIsSaving(false);
    },
    onError: (error) => {
      console.error('Auto-save failed:', error);
      setIsSaving(false);
    },
  });

  useEffect(() => {
    if (!enabled) return;

    // Check if data has changed
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousDataRef.current);
    if (!hasChanged) return;

    // Set up auto-save timer
    const timer = setTimeout(() => {
      setIsSaving(true);
      saveMutation.mutate(data);
      previousDataRef.current = data;
    }, interval);

    return () => clearTimeout(timer);
  }, [data, enabled, interval]);

  const manualSave = useCallback(() => {
    setIsSaving(true);
    saveMutation.mutate(data);
  }, [data, saveMutation]);

  return {
    lastSaved,
    isSaving,
    manualSave,
  };
}
```

### Auto-Save Indicator

```typescript
// components/AutoSaveIndicator.tsx
export function AutoSaveIndicator({ lastSaved, isSaving }: Props) {
  return (
    <div className="auto-save-indicator">
      {isSaving ? (
        <>
          <Spinner size="sm" />
          <span>Saving...</span>
        </>
      ) : lastSaved ? (
        <>
          <CheckIcon className="text-green-500" />
          <span>Saved {formatRelativeTime(lastSaved)}</span>
        </>
      ) : (
        <span>Not saved yet</span>
      )}
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return date.toLocaleDateString();
}
```

### Draft Recovery

```typescript
// components/DraftRecovery.tsx
export function DraftRecovery({ courseId }: Props) {
  const { data: drafts } = useQuery({
    queryKey: ['course-drafts', courseId],
    queryFn: () => api.courses.getDrafts(courseId),
  });

  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (drafts && drafts.length > 0) {
      setShowModal(true);
    }
  }, [drafts]);

  const handleRestore = async (draftId: string) => {
    const draft = await api.courses.restoreDraft(draftId);
    // Populate form with draft data
    setShowModal(false);
  };

  return (
    <Modal open={showModal} onClose={() => setShowModal(false)}>
      <h2>Recover Draft?</h2>
      <p>We found {drafts?.length} unsaved draft(s) for this course.</p>
      
      <div className="draft-list">
        {drafts?.map(draft => (
          <div key={draft.id} className="draft-item">
            <div>
              <strong>Version {draft.version}</strong>
              <span>{formatDate(draft.savedAt)}</span>
            </div>
            <button onClick={() => handleRestore(draft.id)}>
              Restore
            </button>
          </div>
        ))}
      </div>

      <button onClick={() => setShowModal(false)}>
        Start Fresh
      </button>
    </Modal>
  );
}
```

---

## 📝 RICH TEXT EDITOR

### TipTap Integration

```typescript
// components/RichTextEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import CodeBlock from '@tiptap/extension-code-block';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      Link.configure({
        openOnClick: false,
      }),
      Youtube.configure({
        width: 640,
        height: 360,
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-gray-100 p-4 rounded',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className="rich-text-editor border rounded-lg">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function MenuBar({ editor }: { editor: Editor }) {
  return (
    <div className="menu-bar border-b p-2 flex gap-2 flex-wrap">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
      >
        <BoldIcon />
      </button>
      
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
      >
        <ItalicIcon />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
      >
        H2
      </button>

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'is-active' : ''}
      >
        <ListIcon />
      </button>

      <button onClick={() => addImage(editor)}>
        <ImageIcon />
      </button>

      <button onClick={() => addYoutubeVideo(editor)}>
        <VideoIcon />
      </button>

      <button
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        className={editor.isActive('codeBlock') ? 'is-active' : ''}
      >
        <CodeIcon />
      </button>
    </div>
  );
}

function addImage(editor: Editor) {
  const url = window.prompt('Enter image URL:');
  if (url) {
    editor.chain().focus().setImage({ src: url }).run();
  }
}

function addYoutubeVideo(editor: Editor) {
  const url = window.prompt('Enter YouTube URL:');
  if (url) {
    editor.commands.setYoutubeVideo({ src: url });
  }
}
```

### Image Upload

```typescript
// components/ImageUpload.tsx
export function ImageUpload({ onUpload }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    
    try {
      // Compress image
      const compressed = await compressImage(file);
      
      // Upload to server
      const formData = new FormData();
      formData.append('file', compressed);
      
      const response = await api.upload.image(formData);
      onUpload(response.url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="image-upload">
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
        disabled={uploading}
      />
      {uploading && <Spinner />}
    </div>
  );
}

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };
  
  return imageCompression(file, options);
}
```

### ⚠️ Cảnh Báo Kỹ Thuật: Auto-Save & Rich Text

> **Cập nhật**: 2025-12-03  
> **Nguồn**: Frontend Performance Review

#### 1. Draft Versioning & Database Growth

**Vấn đề**: Draft auto-save có thể làm database phình to nhanh

**Scenario**:
```
User tạo 1 course, auto-save mỗi 30 giây
Trong 1 giờ → 120 draft records
1000 users → 120,000 draft records/ngày
Sau 1 tháng → 3.6 triệu draft records
```

**Giải pháp: Auto Cleanup Strategy**

```typescript
// Option 1: Cleanup old drafts automatically
@Cron('0 2 * * *') // Run at 2 AM daily
async cleanupOldDrafts() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Delete drafts older than 30 days
  await this.draftRepository.delete({
    savedAt: LessThan(thirtyDaysAgo),
    autoSaved: true, // Only auto-saved drafts
  });
  
  this.logger.log('Cleaned up old drafts');
}

// Option 2: Keep only latest N versions per course
async saveDraft(courseId: string, data: any) {
  // Save new draft
  await this.draftRepository.save({
    courseId,
    data,
    version: await this.getNextVersion(courseId),
  });
  
  // Keep only latest 10 versions
  const allDrafts = await this.draftRepository.find({
    where: { courseId },
    order: { version: 'DESC' },
  });
  
  if (allDrafts.length > 10) {
    const toDelete = allDrafts.slice(10);
    await this.draftRepository.remove(toDelete);
  }
}

// Option 3: Upsert instead of Insert (Recommended)
async saveDraft(courseId: string, data: any) {
  // Only keep 1 draft per course, update it
  await this.draftRepository.upsert(
    {
      courseId,
      data,
      savedAt: new Date(),
    },
    ['courseId'] // Unique key
  );
}
```

**Khuyến nghị**:
- [ ] Implement Option 3 (Upsert) cho V2.0 - Đơn giản nhất
- [ ] Add cleanup cron job
- [ ] Monitor draft table size
- [ ] Set up alerts nếu table > 1GB

#### 2. Rich Text Editor Timeline

**Vấn đề**: Timeline 1 ngày cho Rich Text Editor là **RỦI RO CAO**

**Công việc thực tế cần làm**:
```
Day 1: TipTap Setup (4-6 hours)
  ├── Install packages
  ├── Basic editor component
  ├── Toolbar component
  └── Styling

Day 2: Image Upload (4-6 hours)
  ├── File upload component
  ├── Image compression (browser-image-compression)
  ├── Upload to S3/local storage
  ├── Insert image to editor
  ├── Resize handling
  └── Error handling

Day 3: Video Embedding (3-4 hours)
  ├── YouTube URL parsing
  ├── Embed component
  ├── Preview in editor
  └── Responsive sizing

Day 4: Polish & Testing (3-4 hours)
  ├── Code blocks with syntax highlighting
  ├── Tables
  ├── Copy/paste handling
  └── Testing
```

**Khuyến nghị timeline**:
```
THAY VÌ: 1 ngày (Day 3 Week 3)
NÊN LÀ: 3-4 ngày

Day 1: TipTap Basic Setup
Day 2: Image Upload Integration
Day 3: Video Embedding + Advanced Features
Day 4: Testing & Polish
```

#### 3. Auto-Save Performance

**Vấn đề**: Auto-save mỗi 30s có thể gây lag nếu data lớn

**Giải pháp**:

```typescript
// Debounce auto-save
import { debounce } from 'lodash';

export function useAutoSave<T>(data: T, courseId: string) {
  const [isSaving, setIsSaving] = useState(false);
  
  // Debounced save function
  const debouncedSave = useMemo(
    () => debounce(async (dataToSave: T) => {
      setIsSaving(true);
      try {
        await api.courses.saveDraft(courseId, dataToSave);
      } finally {
        setIsSaving(false);
      }
    }, 30000), // 30 seconds
    [courseId]
  );
  
  useEffect(() => {
    // Only save if data changed
    debouncedSave(data);
    
    return () => debouncedSave.cancel();
  }, [data, debouncedSave]);
  
  return { isSaving };
}

// Optimize payload size
async function saveDraft(courseId: string, data: any) {
  // Only send changed fields, not entire object
  const diff = calculateDiff(previousData, data);
  
  await api.post('/drafts', {
    courseId,
    changes: diff, // Smaller payload
  });
}
```

**Khuyến nghị**:
- [ ] Debounce auto-save (30s idle time)
- [ ] Compress large payloads
- [ ] Show "Saving..." indicator
- [ ] Handle offline mode (queue saves)

---

## 👁️ PREVIEW MODE

### Preview Component

```typescript
// components/CoursePreview.tsx
export function CoursePreview({ course }: Props) {
  return (
    <div className="course-preview">
      <div className="preview-header">
        <h1>Preview Mode</h1>
        <button onClick={onClose}>Close Preview</button>
      </div>

      <div className="preview-content">
        {/* Student view of the course */}
        <CourseHeader course={course} />
        <CourseDescription content={course.description} />
        <CourseSessions sessions={course.sessions} />
        <CoursePricing pricing={course.pricing} />
        <EnrollButton course={course} disabled />
      </div>
    </div>
  );
}
```

---

## ✅ VALIDATION & FEEDBACK

### Real-time Validation

```typescript
// hooks/useFieldValidation.ts
export function useFieldValidation(
  value: string,
  rules: ValidationRule[]
) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsValidating(true);
      
      for (const rule of rules) {
        const result = await rule.validate(value);
        if (!result.valid) {
          setError(result.message);
          setIsValidating(false);
          return;
        }
      }
      
      setError(null);
      setIsValidating(false);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [value, rules]);

  return { error, isValidating };
}

// Usage
const { error, isValidating } = useFieldValidation(title, [
  {
    validate: async (value) => ({
      valid: value.length >= 3,
      message: 'Title must be at least 3 characters',
    }),
  },
  {
    validate: async (value) => {
      const exists = await api.courses.checkTitleExists(value);
      return {
        valid: !exists,
        message: 'A course with this title already exists',
      };
    },
  },
]);
```

---

## ✅ CHECKLIST

### Day 1: Wizard Structure
- [ ] Create wizard components
- [ ] Implement progress indicator
- [ ] Setup state management
- [ ] Navigation logic
- [ ] Step validation

### Day 2: Auto-Save
- [ ] Implement auto-save hook
- [ ] Create draft entity
- [ ] Save draft API
- [ ] Auto-save indicator
- [ ] Draft recovery modal

### Day 3: Rich Text Editor
- [ ] Integrate TipTap
- [ ] Custom toolbar
- [ ] Image upload
- [ ] Video embedding
- [ ] Code blocks

### Day 4: Preview & Validation
- [ ] Preview component
- [ ] Real-time validation
- [ ] Error messages
- [ ] Success feedback
- [ ] Loading states

### Day 5: Polish & Testing
- [ ] Responsive design
- [ ] Accessibility
- [ ] User testing
- [ ] Bug fixes
- [ ] Documentation

---

**Status**: 📋 Ready to Implement
