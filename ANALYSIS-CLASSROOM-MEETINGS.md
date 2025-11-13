# Phân tích: Tách biệt Classroom Meetings vs Public Meetings

## Tình trạng hiện tại

### Điểm chung:
- ✅ Cùng sử dụng component `MeetingRoom` 
- ✅ Cùng entity `Meeting` trong database
- ✅ Cùng các API endpoints với prefix khác nhau:
  - Classroom: `/classrooms/:id/meetings/:meetingId`
  - Public: `/public-meetings/:meetingId`

### Điểm khác biệt:

#### 1. Quyền hạn (Permissions):
**Classroom Meetings:**
- ❌ Student KHÔNG được tạo meeting
- ✅ Chỉ Teacher/Admin được tạo
- ✅ Teacher có toàn quyền: start, end, lock, kick, block
- ⚠️ Student chỉ được join và tham gia

**Public Meetings:**
- ✅ Bất kỳ user nào cũng được tạo
- ✅ Host có toàn quyền quản lý
- ✅ Người khác có thể tạo meeting của riêng mình

#### 2. Form tạo meeting:
**Classroom:**
- Title
- Description
- Scheduled time
- Max participants
- ❌ KHÔNG có: Language, Level, Topic, Microphone settings

**Public:**
- Title
- Description
- Scheduled time
- Max participants
- ✅ CÓ: Language (multiple), Level (all/beginner/etc), Topic, Microphone settings

#### 3. Hiển thị:
**Classroom:**
- Nested trong classroom: `/classrooms/:id/meetings`
- Hiển thị teacher info
- Simple card layout

**Public:**
- Standalone: `/meetings`
- Hiển thị host info
- Rich metadata (language tags, level badges, topic)

---

## OPTION 1: Tách hoàn toàn (Separate Everything)

### Cấu trúc:
```
/app
  /classrooms/[id]
    /meetings
      page.tsx              ← Classroom meetings list
      /[meetingId]
        page.tsx            ← NEW: Classroom meeting room
  /meetings
    page.tsx                ← Public meetings list
    /[id]
      page.tsx              ← Public meeting room

/section
  /classroom-meetings
    classroom-meeting-list.tsx
    classroom-meeting-room.tsx     ← NEW: Separate component
    classroom-meeting-form.tsx     ← NEW: Simple form
  /meetings
    public-meetings.tsx
    meeting-room.tsx              ← Existing
    meeting-form.tsx              ← Already in public-meetings.tsx

/api
  classrooms.rest.ts       ← Classroom meeting APIs
  meeting.rest.ts          ← Public meeting APIs
```

### Implementation:

**1. Classroom Meeting Form:**
```tsx
// Simple form - no language/level/topic
- Title
- Description  
- Scheduled time
- Max participants (default 100, up to 1000)
```

**2. Classroom Meeting Room:**
```tsx
// Based on MeetingRoom but:
- Remove language/level/topic display
- Add classroom context (teacher, members)
- Different permission checks (isTeacher vs isHost)
- Simplified settings
```

### 👍 Ưu điểm:
1. ✅ **Rõ ràng, dễ maintain**: Code tách biệt, không lẫn lộn
2. ✅ **Tùy biến dễ dàng**: Thêm/bớt tính năng cho từng loại
3. ✅ **Performance tốt**: Không load code không cần thiết
4. ✅ **Type safety**: TypeScript types riêng biệt cho từng context
5. ✅ **Testing dễ**: Test từng flow riêng

### 👎 Nhược điểm:
1. ❌ **Code duplication**: ~60% logic giống nhau (video, chat, WebRTC)
2. ❌ **Effort cao**: Phải viết lại nhiều
3. ❌ **Sync bugs**: Fix bug ở 1 chỗ phải nhớ fix chỗ kia
4. ❌ **Time**: ~3-5 ngày để implement

---

## OPTION 2: Shared Core + Customization (Recommended ⭐)

### Cấu trúc:
```
/section
  /meetings
    meeting-room.tsx                    ← REFACTOR: Accept context prop
    meeting-room-classroom-config.ts    ← NEW: Classroom config
    meeting-room-public-config.ts       ← NEW: Public config
    classroom-meeting-form.tsx          ← NEW: Simple form
    public-meeting-form.tsx             ← Extract from public-meetings.tsx

/app
  /classrooms/[id]/meetings/[meetingId]
    page.tsx           ← Use MeetingRoom with classroom config
  /meetings/[id]
    page.tsx           ← Use MeetingRoom with public config
```

### Implementation:

**1. Refactor MeetingRoom với context-aware:**

```tsx
// meeting-room.tsx
interface MeetingRoomConfig {
  type: 'classroom' | 'public';
  permissions: {
    canCreate: boolean;
    canKick: boolean;
    canBlock: boolean;
    canLock: boolean;
  };
  features: {
    showLanguageTags: boolean;
    showLevelBadge: boolean;
    showTopicBadge: boolean;
    allowMicrophoneSettings: boolean;
  };
  form: {
    fields: ('language' | 'level' | 'topic' | 'microphone')[];
  };
}

interface MeetingRoomProps {
  meeting: IMeeting;
  user: IUserInfo;
  config: MeetingRoomConfig;
  classroomId?: string;
}

export function MeetingRoom({ meeting, user, config, classroomId }: MeetingRoomProps) {
  // Permission check based on config
  const hasPermission = (action: string) => {
    if (config.type === 'classroom') {
      return isTeacher(user, classroomId);
    }
    return isHost(user, meeting);
  };

  // Conditional rendering based on config.features
  return (
    <div>
      {/* Core video/chat/WebRTC - always same */}
      <VideoGrid ... />
      <MeetingChat ... />
      
      {/* Conditional UI */}
      {config.features.showLanguageTags && meeting.language && (
        <LanguageBadges languages={meeting.language} />
      )}
      
      {hasPermission('kick') && (
        <KickButton onClick={handleKick} />
      )}
    </div>
  );
}
```

**2. Config files:**

```tsx
// meeting-room-classroom-config.ts
export const CLASSROOM_MEETING_CONFIG: MeetingRoomConfig = {
  type: 'classroom',
  permissions: {
    canCreate: false, // Only teacher via classroom UI
    canKick: true,    // Teacher only
    canBlock: true,   // Teacher only
    canLock: true,    // Teacher only
  },
  features: {
    showLanguageTags: false,
    showLevelBadge: false,
    showTopicBadge: false,
    allowMicrophoneSettings: false,
  },
  form: {
    fields: [], // Simple form, no advanced fields
  },
};

// meeting-room-public-config.ts
export const PUBLIC_MEETING_CONFIG: MeetingRoomConfig = {
  type: 'public',
  permissions: {
    canCreate: true,  // Any user
    canKick: true,    // Host only
    canBlock: true,   // Host only
    canLock: true,    // Host only
  },
  features: {
    showLanguageTags: true,
    showLevelBadge: true,
    showTopicBadge: true,
    allowMicrophoneSettings: true,
  },
  form: {
    fields: ['language', 'level', 'topic', 'microphone'],
  },
};
```

**3. Usage:**

```tsx
// app/classrooms/[id]/meetings/[meetingId]/page.tsx
import { MeetingRoom } from '@/section/meetings/meeting-room';
import { CLASSROOM_MEETING_CONFIG } from '@/section/meetings/meeting-room-classroom-config';

export default function ClassroomMeetingPage() {
  return (
    <MeetingRoom 
      meeting={meeting}
      user={user}
      config={CLASSROOM_MEETING_CONFIG}
      classroomId={classroomId}
    />
  );
}

// app/meetings/[id]/page.tsx
import { MeetingRoom } from '@/section/meetings/meeting-room';
import { PUBLIC_MEETING_CONFIG } from '@/section/meetings/meeting-room-public-config';

export default function PublicMeetingPage() {
  return (
    <MeetingRoom 
      meeting={meeting}
      user={user}
      config={PUBLIC_MEETING_CONFIG}
    />
  );
}
```

### 👍 Ưu điểm:
1. ✅ **DRY**: Tái sử dụng 90% code (video, chat, WebRTC)
2. ✅ **Flexible**: Dễ thêm config mới (e.g., premium meetings)
3. ✅ **Maintainable**: Fix bug 1 lần, apply cho tất cả
4. ✅ **Time efficient**: ~1-2 ngày implement
5. ✅ **Scalable**: Thêm meeting type mới chỉ cần thêm config
6. ✅ **Type safety**: TypeScript vẫn đảm bảo

### 👎 Nhược điểm:
1. ⚠️ **Complexity ban đầu**: Cần thiết kế config tốt
2. ⚠️ **Testing phức tạp hơn**: Phải test nhiều config combinations
3. ⚠️ **Bundle size**: Load cả public features vào classroom (nhưng tree-shaking giúp giảm)

---

## So sánh chi tiết

| Tiêu chí | Option 1: Separate | Option 2: Shared + Config |
|----------|-------------------|---------------------------|
| **Time to implement** | 3-5 ngày | 1-2 ngày |
| **Code maintenance** | ⚠️ Phải sync 2 nơi | ✅ Một nơi |
| **Customization** | ✅ Tự do hoàn toàn | ✅ Qua config |
| **Bundle size** | ✅ Nhỏ hơn | ⚠️ Lớn hơn ~10% |
| **Type safety** | ✅ Tốt | ✅ Tốt |
| **Testing effort** | ⚠️ Test 2 flows riêng | ✅ Test 1 flow + configs |
| **Future features** | ⚠️ Thêm 2 chỗ | ✅ Thêm 1 chỗ + config |
| **Bug fixes** | ⚠️ Fix 2 chỗ | ✅ Fix 1 chỗ |

---

## 🎯 KHUYẾN NGHỊ: OPTION 2 (Shared Core + Config)

### Lý do:

1. **ROI cao**: 
   - Effort: 1-2 ngày
   - Gain: Maintain dễ, scale tốt, DRY

2. **Thực tế project**:
   - Core features giống nhau 90%: Video, Chat, WebRTC, Participants
   - Chỉ khác: Permissions, Form fields, UI tags
   - → Không đáng để duplicate 90% code

3. **Tương lai**:
   - Dễ thêm meeting types mới (e.g., Premium, Enterprise)
   - Dễ A/B test features
   - Dễ rollout features dần dần

4. **Industry best practice**:
   - Airbnb, Uber, Zoom đều dùng pattern này
   - "Configuration over duplication"

---

## Implementation Plan (Option 2)

### Phase 1: Refactor MeetingRoom (Day 1)
- [ ] Extract MeetingRoomConfig interface
- [ ] Add config prop to MeetingRoom
- [ ] Implement conditional rendering based on config
- [ ] Create CLASSROOM_MEETING_CONFIG
- [ ] Create PUBLIC_MEETING_CONFIG

### Phase 2: Create Classroom Form (Day 1)
- [ ] Create ClassroomMeetingForm component
- [ ] Simple fields: title, description, scheduled_at, max_participants
- [ ] Integrate into classrooms/[id]/meetings page

### Phase 3: Update Routes (Day 2)
- [ ] Update app/classrooms/[id]/meetings/[meetingId]/page.tsx
- [ ] Pass CLASSROOM_MEETING_CONFIG to MeetingRoom
- [ ] Test classroom flow

### Phase 4: Testing (Day 2)
- [ ] Test classroom teacher flow
- [ ] Test classroom student flow  
- [ ] Test public host flow
- [ ] Test permissions isolation

### Phase 5: Cleanup (Optional)
- [ ] Remove classroom-meeting-room-wrapper.tsx (if not needed)
- [ ] Document config pattern
- [ ] Add storybook for different configs

---

## Migration Strategy

### Step 1: Không breaking changes
- Giữ nguyên public meetings hoạt động
- Thêm config cho classroom meetings

### Step 2: Incremental rollout
- Deploy classroom meetings cho 1 classroom test trước
- Monitor bugs/issues
- Fix và deploy toàn bộ

### Step 3: Deprecate old code (nếu có)
- Mark old classroom wrapper as deprecated
- Migrate dần sang config pattern

---

## Rủi ro & Mitigation

### Rủi ro Option 1:
- ❌ Code drift: 2 implementations diverge over time
- ❌ Feature parity: Hard to keep both in sync
- ❌ Refactoring nightmare: Change core logic → 2x effort

### Rủi ro Option 2:
- ⚠️ Config complexity: Too many flags → hard to reason
  - **Mitigation**: Keep config simple, document well
- ⚠️ Bundle size: Loading unused features
  - **Mitigation**: Tree-shaking, code splitting
- ⚠️ Regression: Change affects both types
  - **Mitigation**: Good test coverage, feature flags

---

## Kết luận

**👉 Chọn Option 2** vì:
1. Faster implementation (1-2 days vs 3-5 days)
2. Easier maintenance (fix once, apply everywhere)
3. Better scalability (add new meeting types easily)
4. Industry standard pattern
5. Lower risk of bugs from code duplication

**Điều chỉnh nếu cần:**
- Nếu classroom meetings cần logic HOÀN TOÀN khác (>50% different) → Chọn Option 1
- Nếu team size nhỏ, cần ship nhanh → Chọn Option 2
- Nếu priority là bundle size → Chọn Option 1 + code splitting

**Next steps:**
1. Review analysis này với team
2. Approve Option 2
3. Start Phase 1 implementation
4. Monitor và adjust nếu cần
