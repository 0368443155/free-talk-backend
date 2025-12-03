# 📁 Local Storage - Hướng dẫn sử dụng

## ✅ Đã hoàn thiện

Local Storage đã được hoàn thiện với các tính năng:

### 🔒 Bảo mật
- ✅ Path traversal protection
- ✅ File type validation
- ✅ File size limits (100MB mặc định)
- ✅ MIME type validation
- ✅ Sanitize file names

### 📊 Quản lý
- ✅ Tự động tạo cấu trúc thư mục theo ngày (`YYYY/MM/DD`)
- ✅ Storage statistics
- ✅ Cleanup old files
- ✅ File metadata tracking

### 🚀 Tính năng
- ✅ Upload files trực tiếp
- ✅ Pre-signed URLs (cho tương thích với cloud)
- ✅ Delete files
- ✅ Get file metadata
- ✅ Copy files

---

## 📝 Cấu hình

Thêm vào `.env`:

```env
# Storage Configuration
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=uploads
BACKEND_URL=http://localhost:3001

# Optional: Customize limits
STORAGE_MAX_FILE_SIZE=104857600  # 100MB in bytes
STORAGE_ALLOWED_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf,video/mp4,video/webm,audio/mpeg,audio/wav
```

---

## 🔌 API Endpoints

### 1. Upload File
```http
POST /api/v1/storage/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: <file>
- folder: (optional) materials/teacher-123
- key: (optional) custom-file-name.pdf
```

**Response:**
```json
{
  "success": true,
  "key": "2024/01/15/uuid-filename.pdf",
  "url": "http://localhost:3001/uploads/2024/01/15/uuid-filename.pdf",
  "size": 1024000,
  "mimeType": "application/pdf",
  "uploadedAt": "2024-01-15T10:30:00.000Z"
}
```

### 2. Get Pre-signed Upload URL
```http
GET /api/v1/storage/presigned-upload?key=test/file.jpg&mimeType=image/jpeg&expiresIn=3600
```

**Response:**
```json
{
  "success": true,
  "url": "http://localhost:3001/api/v1/storage/upload?key=test/file.jpg&expires=...",
  "key": "test/file.jpg",
  "expiresIn": 3600
}
```

### 3. Get Pre-signed Download URL
```http
GET /api/v1/storage/presigned-download?key=2024/01/15/file.pdf&expiresIn=3600
```

**Response:**
```json
{
  "success": true,
  "url": "http://localhost:3001/uploads/2024/01/15/file.pdf",
  "key": "2024/01/15/file.pdf",
  "expiresIn": 3600
}
```

### 4. Delete File
```http
DELETE /api/v1/storage/:key
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

### 5. Get File Metadata
```http
GET /api/v1/storage/:key/metadata
```

**Response:**
```json
{
  "success": true,
  "metadata": {
    "size": 1024000,
    "contentType": "application/pdf",
    "lastModified": "2024-01-15T10:30:00.000Z",
    "etag": "12345"
  }
}
```

### 6. Get Storage Statistics (Local Storage only)
```http
GET /api/v1/storage/stats
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalFiles": 150,
    "totalSize": 52428800,
    "totalSizeMB": "50.00",
    "totalSizeGB": "0.05",
    "directory": "/path/to/uploads"
  }
}
```

### 7. Cleanup Old Files (Local Storage only)
```http
POST /api/v1/storage/cleanup?days=30
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "deletedCount": 25,
  "message": "Deleted 25 files older than 30 days"
}
```

---

## 📂 Cấu trúc thư mục

Files được lưu tự động theo cấu trúc:

```
uploads/
├── 2024/
│   ├── 01/
│   │   ├── 15/
│   │   │   ├── uuid-file1.pdf
│   │   │   └── uuid-file2.jpg
│   │   └── 16/
│   │       └── uuid-file3.mp4
│   └── 02/
│       └── ...
├── materials/
│   └── teacher-123/
│       └── 2024/
│           └── 01/
│               └── 15/
│                   └── uuid-material.pdf
└── ...
```

**Lợi ích:**
- Dễ quản lý theo thời gian
- Tránh quá nhiều files trong một thư mục
- Dễ cleanup files cũ

---

## 🔒 Bảo mật

### File Type Validation
Chỉ cho phép các file types sau (mặc định):
- **Images**: jpg, jpeg, png, gif, webp
- **Documents**: pdf, doc, docx, ppt, pptx
- **Videos**: mp4, webm
- **Audio**: mp3, wav

### File Size Limit
- Mặc định: **100MB**
- Có thể config qua `STORAGE_MAX_FILE_SIZE`

### Path Traversal Protection
- Tự động sanitize file paths
- Chặn các ký tự nguy hiểm: `..`, `<>:"|?*`
- Validate path không vượt ra ngoài upload directory

---

## 💡 Sử dụng trong Code

### Upload file từ Service:

```typescript
import { Inject } from '@nestjs/common';
import { IStorageService } from '../core/storage/storage.interface';

@Injectable()
export class MyService {
  constructor(
    @Inject('IStorageService')
    private readonly storageService: IStorageService,
  ) {}

  async uploadUserAvatar(userId: string, fileBuffer: Buffer, mimeType: string) {
    const key = `avatars/${userId}/avatar.jpg`;
    const url = await this.storageService.uploadFile(key, fileBuffer, mimeType);
    return url;
  }

  async uploadMaterial(teacherId: string, fileBuffer: Buffer, mimeType: string) {
    const key = `materials/${teacherId}/${Date.now()}-material.pdf`;
    const url = await this.storageService.uploadFile(key, fileBuffer, mimeType);
    return url;
  }
}
```

### Get file URL:

```typescript
// Public file (có thể truy cập trực tiếp)
const publicUrl = await storageService.uploadFile(key, buffer, mimeType);
// URL: http://localhost:3001/uploads/materials/file.pdf

// Private file (cần pre-signed URL)
const downloadUrl = await storageService.getPresignedDownloadUrl(key, 3600);
// URL có thể truy cập trong 1 giờ
```

---

## 🧹 Maintenance

### Cleanup Old Files

Chạy cleanup định kỳ để xóa files cũ:

```typescript
// Trong scheduled task
@Cron('0 2 * * *') // 2 AM mỗi ngày
async cleanupOldFiles() {
  const deleted = await this.localStorageService.cleanupOldFiles(30); // Xóa files > 30 ngày
  this.logger.log(`Cleaned up ${deleted} old files`);
}
```

### Monitor Storage Usage

```typescript
const stats = await this.localStorageService.getStorageStats();
console.log(`Total files: ${stats.totalFiles}`);
console.log(`Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
```

---

## ⚠️ Lưu ý

1. **Backup**: Đảm bảo backup thư mục `uploads/` định kỳ
2. **Disk Space**: Monitor disk space trên server
3. **Permissions**: Đảm bảo server có quyền ghi vào thư mục `uploads/`
4. **Performance**: Với nhiều files, cân nhắc chuyển sang Cloud Storage (R2/S3)

---

## 🚀 Migration sang Cloud

Khi cần migrate sang Cloud Storage, chỉ cần:

1. Thay đổi `STORAGE_PROVIDER=r2` hoặc `STORAGE_PROVIDER=s3`
2. Cấu hình credentials
3. **Code không cần thay đổi!** (nhờ Storage Abstraction Layer)

---

## 📚 Tài liệu liên quan

- `STORAGE_SETUP_GUIDE.md` - Hướng dẫn setup Cloud Storage
- `IMPLEMENTATION_GUIDE.md` - Tổng quan implementation

