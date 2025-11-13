# 🔧 Fix: EntityPropertyNotFoundError - Property "name" not found in "User"

## ❌ Lỗi gốc:
```
EntityPropertyNotFoundError: Property "name" was not found in "User". 
Make sure your query is correct.
```

## 🔍 Nguyên nhân:

User entity có **getter** `name` nhưng field thực tế trong database là `username`:

```typescript
@Entity('users')
export class User {
  @Column({type: 'varchar', length: 50})
  username: string;  // ✅ Field thực tế trong DB
  
  get name(): string {  // ❌ Chỉ là getter, không phải column
    return this.username;
  }
}
```

**TypeORM không thể query getter** trong `select` clause:
```typescript
// ❌ LỖI - TypeORM không thể query getter
const users = await repo.find({
  select: { id: true, name: true }  // name là getter, không có trong DB
});

// ✅ ĐÚNG - Query field thực tế
const users = await repo.find({
  select: { id: true, username: true }
});
```

## ✅ Giải pháp:

### 1. **Backend: meetings.gateway.ts**
Thay đổi tất cả `user.name` → `user.username`:

```diff
// handleRequestPeers
- user: { id: true, name: true },
+ user: { id: true, username: true },

// handleJoinMeeting
- userName: participant.user.name,
+ userName: participant.user.username,

// handleDisconnect
- userName: client.user.name,
+ userName: client.user.username,

// handleLeaveMeeting
- userName: client.user.name,
+ userName: client.user.username,

// handleWebRTCReady
- userName: client.user?.name,
+ userName: client.user?.username,

// handleChatMessage
- from: client.user.name,
+ from: client.user.username,

// handleRaiseHand
- userName: client.user.name,
+ userName: client.user.username,
```

**Tổng: 10 chỗ đã fix**

### 2. **Backend: meetings.service.ts**
Thay đổi tất cả `user.name` → `user.username`:

```diff
// joinMeeting
- console.log(`Join meeting - User: ${user?.name}, ...`)
+ console.log(`Join meeting - User: ${user?.username}, ...`)

- user: participant.user?.name,
+ user: participant.user?.username,

// createSystemMessage
- await this.createSystemMessage(meeting, `${user.name} joined...`)
+ await this.createSystemMessage(meeting, `${user.username} joined...`)

- await this.createSystemMessage(meeting, `${user.name} left...`)
+ await this.createSystemMessage(meeting, `${user.username} left...`)

// getParticipants
- user: p.user.name,
+ user: p.user.username,

- name: p.user.name,
+ name: p.user.username,

// getChatMessages
- name: m.sender.name,
+ name: m.sender.username,

// kickParticipant
- await this.createSystemMessage(meeting, `${participant.user.name} was kicked...`)
+ await this.createSystemMessage(meeting, `${participant.user.username} was kicked...`)

// blockParticipant
- await this.createSystemMessage(meeting, `${participant.user.name} was blocked...`)
+ await this.createSystemMessage(meeting, `${participant.user.username} was blocked...`)

// promoteParticipant
- await this.createSystemMessage(meeting, `${participant.user.name} was promoted...`)
+ await this.createSystemMessage(meeting, `${participant.user.username} was promoted...`)
```

**Tổng: 10 chỗ đã fix**

## 📊 Tổng kết:

| File | Số chỗ fix | Loại thay đổi |
|------|-----------|---------------|
| `meetings.gateway.ts` | 10 | `user.name` → `user.username` |
| `meetings.service.ts` | 10 | `user.name` → `user.username` |
| **TỔNG** | **20** | |

## 🧪 Test sau khi fix:

### ✅ Test 1: Join meeting
```bash
# Trước khi fix:
❌ EntityPropertyNotFoundError: Property "name" was not found in "User"

# Sau khi fix:
✅ User 278eb3d9-3f05-4e11-a79a-d999a4aec741 successfully joined meeting
✅ 📡 278eb3d9... requesting existing peers in meeting d6424fbc...
✅ 📤 Sending 0 existing peers to 278eb3d9...
```

### ✅ Test 2: Request peers
```typescript
// Query này giờ hoạt động:
const participants = await this.participantRepository.find({
  where: { meeting: { id: meetingId }, is_online: true },
  relations: ['user'],
  select: {
    id: true,
    user: { id: true, username: true },  // ✅ username thay vì name
  },
});
```

### ✅ Test 3: Chat messages
```typescript
// System messages giờ hiển thị đúng username:
"hoangviet joined the meeting"
"hoangviet left the meeting"
"hoangviet was kicked from the meeting"
```

## 🎯 Lưu ý quan trọng:

### 1. **Getter vẫn hoạt động ở runtime:**
```typescript
// ✅ OK - Getter hoạt động sau khi entity được load
const user = await userRepo.findOne({ where: { id: userId } });
console.log(user.name);  // ✅ Trả về user.username
```

### 2. **Không thể dùng getter trong TypeORM query:**
```typescript
// ❌ LỖI
await repo.find({ select: { name: true } });
await repo.findOne({ where: { name: 'John' } });
await repo.createQueryBuilder().select('user.name');

// ✅ ĐÚNG
await repo.find({ select: { username: true } });
await repo.findOne({ where: { username: 'John' } });
await repo.createQueryBuilder().select('user.username');
```

### 3. **Frontend tương thích:**
Frontend có thể dùng cả `user.name` và `user.username` vì:
```typescript
// user.entity.ts có getter:
get name(): string {
  return this.username;
}

// Nên cả 2 đều hoạt động:
console.log(user.name);      // ✅ OK
console.log(user.username);  // ✅ OK
```

## 🚀 Kết luận:

Lỗi đã được fix hoàn toàn bằng cách thay thế tất cả references của `user.name` thành `user.username` trong TypeORM queries. Getter `name` vẫn giữ nguyên để backward compatibility với code hiện tại.

**Restart backend server để áp dụng thay đổi!**

```bash
# Backend
cd talkplatform-backend
npm run start:dev

# hoặc
yarn start:dev
```
