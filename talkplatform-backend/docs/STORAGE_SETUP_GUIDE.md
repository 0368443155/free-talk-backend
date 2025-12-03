# 📦 Storage Setup Guide

Hướng dẫn chi tiết cách cấu hình Storage cho hệ thống.

## 🎯 Tùy chọn Storage

Hệ thống hỗ trợ 3 phương án:
1. **Local Storage** (Khuyến nghị cho MVP/Development) - Miễn phí, không cần config
2. **Cloudflare R2** (Khuyến nghị cho Production) - Miễn phí egress, rẻ hơn S3
3. **AWS S3** (Production) - Đắt hơn nhưng ổn định

---

## 1️⃣ Local Storage (Khuyến nghị cho giai đoạn đầu)

### Ưu điểm:
- ✅ Miễn phí 100%
- ✅ Không cần đăng ký dịch vụ
- ✅ Setup nhanh
- ✅ Phù hợp cho development và MVP

### Nhược điểm:
- ❌ Không scale được
- ❌ Không có CDN
- ❌ Phụ thuộc vào server

### Cấu hình:

Thêm vào `.env`:
```env
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=uploads
BACKEND_URL=http://localhost:3001  # Hoặc domain của bạn
```

**Không cần config gì thêm!** Files sẽ được lưu trong thư mục `uploads/` trên server.

---

## 2️⃣ Cloudflare R2 (Khuyến nghị cho Production)

### Ưu điểm:
- ✅ **Miễn phí egress** (không tính phí băng thông tải xuống) - Tiết kiệm rất nhiều!
- ✅ Rẻ hơn S3 ~35% cho storage
- ✅ Tương thích S3 API (dùng AWS SDK)
- ✅ CDN tích hợp với Cloudflare

### Nhược điểm:
- ❌ Cần tài khoản Cloudflare
- ❌ Một số tính năng S3 nâng cao chưa hỗ trợ

### Cách setup:

#### Bước 1: Tạo tài khoản Cloudflare
1. Truy cập: https://dash.cloudflare.com/sign-up
2. Đăng ký tài khoản (miễn phí)

#### Bước 2: Tạo R2 Bucket
1. Vào **R2** trong dashboard Cloudflare
2. Click **Create bucket**
3. Đặt tên bucket (ví dụ: `talkplatform-storage`)
4. Chọn location (gần nhất với users của bạn)
5. Click **Create bucket**

#### Bước 3: Tạo API Token
1. Vào **Manage R2 API Tokens**
2. Click **Create API token**
3. Đặt tên token (ví dụ: `talkplatform-r2-token`)
4. Chọn permissions: **Object Read & Write**
5. Chọn bucket vừa tạo
6. Click **Create API Token**
7. **Lưu lại**:
   - `Access Key ID`
   - `Secret Access Key`

#### Bước 4: Lấy Account ID
1. Vào **R2** dashboard
2. Click vào bucket vừa tạo
3. Trong URL hoặc settings, bạn sẽ thấy Account ID
   - Format: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - Hoặc vào **Settings** → **Account ID**

#### Bước 5: Cấu hình .env

```env
STORAGE_PROVIDER=r2
STORAGE_BUCKET_NAME=talkplatform-storage
STORAGE_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=<Access Key ID từ bước 3>
STORAGE_SECRET_ACCESS_KEY=<Secret Access Key từ bước 3>
STORAGE_PUBLIC_URL=https://your-cdn-domain.com  # Optional: nếu dùng custom domain
```

**Ví dụ:**
```env
STORAGE_PROVIDER=r2
STORAGE_BUCKET_NAME=talkplatform-storage
STORAGE_ENDPOINT=https://abc123def456.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=abc123def456789
STORAGE_SECRET_ACCESS_KEY=xyz789uvw456rst321
```

#### Bước 6: (Optional) Setup Custom Domain cho Public Access
1. Vào bucket settings
2. Chọn **Public Access**
3. Thêm custom domain (ví dụ: `cdn.yourdomain.com`)
4. Cấu hình DNS theo hướng dẫn
5. Update `STORAGE_PUBLIC_URL` trong `.env`

---

## 3️⃣ AWS S3 (Production)

### Ưu điểm:
- ✅ Ổn định, đã được chứng minh
- ✅ Nhiều tính năng nâng cao
- ✅ Tích hợp tốt với các dịch vụ AWS khác

### Nhược điểm:
- ❌ **Đắt hơn** (đặc biệt là egress - băng thông tải xuống)
- ❌ Phức tạp hơn trong setup

### Cách setup:

#### Bước 1: Tạo tài khoản AWS
1. Truy cập: https://aws.amazon.com/
2. Đăng ký tài khoản (cần thẻ tín dụng, nhưng có free tier)

#### Bước 2: Tạo S3 Bucket
1. Vào **S3** trong AWS Console
2. Click **Create bucket**
3. Đặt tên bucket (phải unique globally, ví dụ: `talkplatform-storage-2024`)
4. Chọn region (ví dụ: `us-east-1`, `ap-southeast-1`)
5. **Quan trọng**: Bỏ chọn **Block all public access** nếu muốn public files
6. Click **Create bucket**

#### Bước 3: Tạo IAM User và Access Keys
1. Vào **IAM** → **Users**
2. Click **Create user**
3. Đặt tên user (ví dụ: `talkplatform-s3-user`)
4. Chọn **Access type**: **Programmatic access**
5. Click **Next: Permissions**
6. Chọn **Attach existing policies directly**
7. Tìm và chọn: **AmazonS3FullAccess** (hoặc tạo custom policy chỉ cho bucket cụ thể)
8. Click **Next** → **Create user**
9. **Lưu lại**:
   - `Access Key ID`
   - `Secret Access Key` (chỉ hiện 1 lần!)

#### Bước 4: Cấu hình .env

```env
STORAGE_PROVIDER=s3
STORAGE_BUCKET_NAME=talkplatform-storage-2024
STORAGE_REGION=us-east-1  # Region bạn chọn ở bước 2
STORAGE_ACCESS_KEY_ID=<Access Key ID từ bước 3>
STORAGE_SECRET_ACCESS_KEY=<Secret Access Key từ bước 3>
# STORAGE_ENDPOINT không cần (AWS tự động)
```

**Ví dụ:**
```env
STORAGE_PROVIDER=s3
STORAGE_BUCKET_NAME=talkplatform-storage-2024
STORAGE_REGION=ap-southeast-1
STORAGE_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
STORAGE_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

#### Bước 5: (Optional) Setup CloudFront CDN
1. Vào **CloudFront** trong AWS Console
2. Tạo distribution mới
3. Chọn S3 bucket vừa tạo
4. Cấu hình settings
5. Lấy CloudFront URL (ví dụ: `https://d1234567890.cloudfront.net`)
6. Update `STORAGE_PUBLIC_URL` trong `.env`

---

## 🔒 Bảo mật

### ⚠️ QUAN TRỌNG: Không commit .env vào Git!

1. Đảm bảo `.env` đã có trong `.gitignore`
2. Sử dụng environment variables trên server production
3. Rotate keys định kỳ (đặc biệt nếu bị lộ)

### Best Practices:
- ✅ Sử dụng IAM roles trên AWS (thay vì access keys) nếu deploy trên EC2
- ✅ Giới hạn permissions chỉ cho bucket cần thiết
- ✅ Enable MFA cho tài khoản Cloudflare/AWS
- ✅ Sử dụng secrets manager (AWS Secrets Manager, HashiCorp Vault) cho production

---

## 📊 So sánh chi phí (ước tính)

### Scenario: 1000 users, mỗi user upload 1GB, download 10GB/tháng

| Provider | Storage (1TB) | Egress (10TB) | Total/tháng |
|----------|--------------|---------------|-------------|
| **Local** | $0 | $0 | **$0** |
| **R2** | ~$15 | **$0** | **~$15** |
| **S3** | ~$23 | **~$900** | **~$923** |

**Kết luận**: R2 tiết kiệm **~$900/tháng** so với S3 cho egress!

---

## 🧪 Test Storage Configuration

Sau khi config, test bằng cách:

```bash
# Test upload
curl -X POST http://localhost:3001/api/v1/storage/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg" \
  -F "folder=test"

# Test pre-signed URL
curl http://localhost:3001/api/v1/storage/presigned-upload?key=test/file.jpg&mimeType=image/jpeg
```

---

## 🚀 Migration từ Local sang Cloud

Khi cần migrate files từ local sang cloud:

```typescript
// Script migration (tạo file riêng)
import { LocalStorageService } from './local-storage.service';
import { CloudStorageService } from './cloud-storage.service';

async function migrateFiles() {
  const localStorage = new LocalStorageService();
  const cloudStorage = new CloudStorageService();
  
  // List all files in local storage
  const files = await listLocalFiles();
  
  for (const file of files) {
    const buffer = await readLocalFile(file.path);
    await cloudStorage.uploadFile(file.key, buffer, file.mimeType);
    console.log(`Migrated: ${file.key}`);
  }
}
```

---

## 📝 Checklist Setup

### Local Storage:
- [ ] Set `STORAGE_PROVIDER=local`
- [ ] Set `STORAGE_LOCAL_DIR=uploads`
- [ ] Tạo thư mục `uploads/` trên server
- [ ] Test upload/download

### Cloudflare R2:
- [ ] Tạo tài khoản Cloudflare
- [ ] Tạo R2 bucket
- [ ] Tạo API token
- [ ] Lấy Account ID
- [ ] Cấu hình `.env`
- [ ] Test upload/download

### AWS S3:
- [ ] Tạo tài khoản AWS
- [ ] Tạo S3 bucket
- [ ] Tạo IAM user với access keys
- [ ] Cấu hình `.env`
- [ ] (Optional) Setup CloudFront
- [ ] Test upload/download

---

## 🆘 Troubleshooting

### Lỗi: "Access Denied"
- ✅ Kiểm tra Access Key ID và Secret Access Key đúng chưa
- ✅ Kiểm tra permissions của IAM user/token
- ✅ Kiểm tra bucket name đúng chưa

### Lỗi: "Bucket not found"
- ✅ Kiểm tra bucket name (case-sensitive)
- ✅ Kiểm tra region đúng chưa (cho S3)
- ✅ Kiểm tra endpoint đúng chưa (cho R2)

### Lỗi: "Invalid endpoint"
- ✅ R2: Format phải là `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- ✅ S3: Không cần endpoint, chỉ cần region

### Files không public
- ✅ Kiểm tra bucket policy (S3)
- ✅ Kiểm tra Public Access settings (R2)
- ✅ Sử dụng pre-signed URLs cho private files

---

## 📚 Tài liệu tham khảo

- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [AWS S3 Docs](https://docs.aws.amazon.com/s3/)
- [AWS SDK v3 for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/)

---

## 💡 Khuyến nghị

**Giai đoạn MVP/Development:**
- ✅ Dùng **Local Storage** (miễn phí, đơn giản)

**Giai đoạn Production:**
- ✅ Dùng **Cloudflare R2** (tiết kiệm chi phí, đặc biệt cho video/files lớn)
- ⚠️ Chỉ dùng **AWS S3** nếu cần các tính năng nâng cao hoặc đã có infrastructure AWS

**Lưu ý**: Có thể bắt đầu với Local, sau đó migrate sang R2 khi cần scale mà không cần thay đổi code (nhờ Storage Abstraction Layer)!

