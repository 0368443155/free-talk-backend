# PHASE 3: COMPREHENSIVE TESTING GUIDE

**Ngày tạo:** 06/12/2025  
**Mục đích:** Đảm bảo chất lượng Phase 3 Marketplace Enhancement

---

## 🎯 TESTING STRATEGY

### Testing Levels

1. **Unit Tests** - Test individual services
2. **Integration Tests** - Test API endpoints
3. **E2E Tests** - Test complete workflows
4. **Manual Tests** - User acceptance testing

---

## 🧪 UNIT TESTS

### 1. Analytics Service Tests

**File:** `talkplatform-backend/src/features/marketplace/services/analytics.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from './analytics.service';
import { Material } from '../entities/material.entity';
import { MaterialPurchase } from '../entities/material-purchase.entity';
import { LedgerEntry } from '../../wallet/entities/ledger-entry.entity';

describe('AnalyticsService', () => {
    let service: AnalyticsService;
    let materialRepository: any;
    let purchaseRepository: any;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticsService,
                {
                    provide: getRepositoryToken(Material),
                    useValue: {
                        createQueryBuilder: jest.fn(),
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(MaterialPurchase),
                    useValue: {
                        createQueryBuilder: jest.fn(),
                        find: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(LedgerEntry),
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<AnalyticsService>(AnalyticsService);
        materialRepository = module.get(getRepositoryToken(Material));
        purchaseRepository = module.get(getRepositoryToken(MaterialPurchase));
    });

    describe('getTeacherRevenueStats', () => {
        it('should calculate revenue stats correctly', async () => {
            // Mock purchases
            const mockPurchases = [
                { price_paid: 100 },
                { price_paid: 200 },
                { price_paid: 150 },
            ];

            purchaseRepository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockPurchases),
            });

            const result = await service.getTeacherRevenueStats('teacher-id');

            expect(result.total_revenue).toBe(450);
            expect(result.platform_fee).toBe(135); // 30%
            expect(result.teacher_earnings).toBe(315); // 70%
            expect(result.total_sales).toBe(3);
            expect(result.avg_sale_price).toBe(150);
        });

        it('should handle empty purchases', async () => {
            purchaseRepository.createQueryBuilder = jest.fn().mockReturnValue({
                leftJoin: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
            });

            const result = await service.getTeacherRevenueStats('teacher-id');

            expect(result.total_revenue).toBe(0);
            expect(result.total_sales).toBe(0);
            expect(result.avg_sale_price).toBe(0);
        });
    });

    describe('getTopMaterials', () => {
        it('should return top selling materials', async () => {
            const mockMaterials = [
                {
                    id: '1',
                    title: 'Material 1',
                    total_sales: 10,
                    total_revenue: 1000,
                },
                {
                    id: '2',
                    title: 'Material 2',
                    total_sales: 5,
                    total_revenue: 500,
                },
            ];

            materialRepository.createQueryBuilder = jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(mockMaterials),
            });

            const result = await service.getTopMaterials('teacher-id', 10);

            expect(result).toHaveLength(2);
            expect(result[0].teacher_earnings).toBe(700); // 70% of 1000
            expect(result[1].teacher_earnings).toBe(350); // 70% of 500
        });
    });
});
```

### 2. Signed URL Service Tests

**File:** `talkplatform-backend/src/features/marketplace/services/signed-url.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SignedUrlService } from './signed-url.service';
import { UnauthorizedException } from '@nestjs/common';

describe('SignedUrlService', () => {
    let service: SignedUrlService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SignedUrlService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'SIGNED_URL_SECRET') return 'test-secret';
                            if (key === 'API_URL') return 'http://localhost:3000/api/v1';
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<SignedUrlService>(SignedUrlService);
    });

    describe('generateSignedUrl', () => {
        it('should generate valid signed URL', () => {
            const url = service.generateSignedUrl('material-1', 'user-1', 'full', 15);

            expect(url).toContain('/marketplace/download/');
            expect(url).toMatch(/^http:\/\/localhost:3000\/api\/v1\/marketplace\/download\/[A-Za-z0-9_-]+\/[a-f0-9]+$/);
        });

        it('should generate different URLs for different materials', () => {
            const url1 = service.generateSignedUrl('material-1', 'user-1');
            const url2 = service.generateSignedUrl('material-2', 'user-1');

            expect(url1).not.toBe(url2);
        });
    });

    describe('verifySignedUrl', () => {
        it('should verify valid signed URL', () => {
            // Generate URL
            const url = service.generateSignedUrl('material-1', 'user-1', 'full', 15);
            
            // Extract payload and signature
            const parts = url.split('/');
            const encodedPayload = parts[parts.length - 2];
            const signature = parts[parts.length - 1];

            // Verify
            const payload = service.verifySignedUrl(encodedPayload, signature);

            expect(payload.material_id).toBe('material-1');
            expect(payload.user_id).toBe('user-1');
            expect(payload.type).toBe('full');
        });

        it('should reject expired URL', () => {
            // Generate URL that expires immediately
            const url = service.generateSignedUrl('material-1', 'user-1', 'full', -1);
            
            const parts = url.split('/');
            const encodedPayload = parts[parts.length - 2];
            const signature = parts[parts.length - 1];

            // Wait a bit
            setTimeout(() => {
                expect(() => {
                    service.verifySignedUrl(encodedPayload, signature);
                }).toThrow(UnauthorizedException);
            }, 100);
        });

        it('should reject invalid signature', () => {
            const url = service.generateSignedUrl('material-1', 'user-1');
            
            const parts = url.split('/');
            const encodedPayload = parts[parts.length - 2];
            const invalidSignature = 'invalid-signature';

            expect(() => {
                service.verifySignedUrl(encodedPayload, invalidSignature);
            }).toThrow(UnauthorizedException);
        });
    });
});
```

### 3. PDF Service Tests

**File:** `talkplatform-backend/src/features/marketplace/services/pdf.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('PdfService', () => {
    let service: PdfService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PdfService],
        }).compile();

        service = module.get<PdfService>(PdfService);
    });

    describe('generatePreview', () => {
        it('should generate preview with watermark', async () => {
            // This test requires a real PDF file
            // Create a test PDF or mock the PDF operations
            
            const testPdfPath = path.join(__dirname, 'test-files', 'sample.pdf');
            
            // Skip if test file doesn't exist
            try {
                await fs.access(testPdfPath);
            } catch {
                console.log('Skipping test - sample.pdf not found');
                return;
            }

            const result = await service.generatePreview(testPdfPath, 'test-material');

            expect(result.previewPath).toContain('preview_test-material.pdf');
            expect(result.thumbnailPath).toContain('thumb_test-material.png');
            expect(result.pageCount).toBeGreaterThan(0);
        });
    });
});
```

---

## 🔗 INTEGRATION TESTS

### 1. Analytics Endpoints

**File:** `talkplatform-backend/test/marketplace-analytics.e2e-spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Marketplace Analytics (e2e)', () => {
    let app: INestApplication;
    let teacherToken: string;
    let studentToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // Login as teacher and student
        teacherToken = await getAuthToken('teacher@test.com', 'password');
        studentToken = await getAuthToken('student@test.com', 'password');
    });

    afterAll(async () => {
        await app.close();
    });

    describe('/marketplace/analytics/revenue (GET)', () => {
        it('should return revenue stats for teacher', () => {
            return request(app.getHttpServer())
                .get('/marketplace/analytics/revenue')
                .set('Authorization', `Bearer ${teacherToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('total_revenue');
                    expect(res.body).toHaveProperty('platform_fee');
                    expect(res.body).toHaveProperty('teacher_earnings');
                    expect(res.body).toHaveProperty('total_sales');
                });
        });

        it('should reject student access', () => {
            return request(app.getHttpServer())
                .get('/marketplace/analytics/revenue')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(403);
        });
    });

    describe('/marketplace/analytics/top-materials (GET)', () => {
        it('should return top materials', () => {
            return request(app.getHttpServer())
                .get('/marketplace/analytics/top-materials?limit=5')
                .set('Authorization', `Bearer ${teacherToken}`)
                .expect(200)
                .expect((res) => {
                    expect(Array.isArray(res.body)).toBe(true);
                    if (res.body.length > 0) {
                        expect(res.body[0]).toHaveProperty('material_id');
                        expect(res.body[0]).toHaveProperty('total_sales');
                        expect(res.body[0]).toHaveProperty('teacher_earnings');
                    }
                });
        });
    });
});
```

### 2. Download Endpoints

**File:** `talkplatform-backend/test/marketplace-download.e2e-spec.ts`

```typescript
describe('Marketplace Download (e2e)', () => {
    let app: INestApplication;
    let studentToken: string;
    let materialId: string;

    beforeAll(async () => {
        // Setup app and create test material
    });

    describe('/marketplace/student/materials/:id/download (GET)', () => {
        it('should generate signed download URL', () => {
            return request(app.getHttpServer())
                .get(`/marketplace/student/materials/${materialId}/download`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200)
                .expect((res) => {
                    expect(res.body).toHaveProperty('download_url');
                    expect(res.body).toHaveProperty('expires_at');
                    expect(res.body.download_url).toContain('/marketplace/download/');
                });
        });

        it('should reject unpurchased material', async () => {
            // Create material that student hasn't purchased
            const unpurchasedMaterialId = 'unpurchased-material';

            return request(app.getHttpServer())
                .get(`/marketplace/student/materials/${unpurchasedMaterialId}/download`)
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(403);
        });
    });

    describe('/marketplace/download/:payload/:signature (GET)', () => {
        it('should download file with valid signed URL', async () => {
            // Get signed URL
            const urlResponse = await request(app.getHttpServer())
                .get(`/marketplace/student/materials/${materialId}/download`)
                .set('Authorization', `Bearer ${studentToken}`);

            const downloadUrl = urlResponse.body.download_url;
            const urlPath = new URL(downloadUrl).pathname;

            // Download file
            return request(app.getHttpServer())
                .get(urlPath)
                .expect(200)
                .expect('Content-Type', /application\/pdf/);
        });

        it('should reject invalid signature', () => {
            const invalidUrl = '/marketplace/download/eyJtYXRlcmlhbF9pZCI6InRlc3QifQ/invalid-signature';

            return request(app.getHttpServer())
                .get(invalidUrl)
                .expect(401);
        });
    });
});
```

---

## 🎭 MANUAL TESTING SCENARIOS

### Scenario 1: Complete Material Purchase Flow

**Steps:**
1. Login as teacher
2. Upload PDF material (with preview generation)
3. Publish material
4. Login as student
5. Browse marketplace
6. View material preview (no purchase)
7. Purchase material with credits
8. Download full material
9. Verify download tracking

**Expected Results:**
- ✅ Preview shows first 3 pages with watermark
- ✅ Thumbnail generated automatically
- ✅ Purchase deducts credits correctly
- ✅ Revenue split 70/30 (teacher/platform)
- ✅ Download URL expires after 15 minutes
- ✅ Download count incremented

### Scenario 2: Revenue Analytics

**Steps:**
1. Login as teacher
2. Navigate to analytics dashboard
3. View revenue stats
4. Check revenue chart
5. View top materials

**Expected Results:**
- ✅ Total revenue matches sum of purchases
- ✅ Platform fee = 30% of total
- ✅ Teacher earnings = 70% of total
- ✅ Chart shows correct time series
- ✅ Top materials sorted by sales

### Scenario 3: Signed URL Security

**Steps:**
1. Get download URL
2. Download file successfully
3. Wait 16 minutes
4. Try to download again
5. Modify signature in URL
6. Try to download

**Expected Results:**
- ✅ First download succeeds
- ✅ Expired URL returns 401
- ✅ Invalid signature returns 401
- ✅ Download tracked in database

---

## 📊 TEST DATA SETUP

### SQL Script for Test Data

**File:** `talkplatform-backend/test/seed-marketplace-data.sql`

```sql
-- Create test teacher
INSERT INTO users (id, email, username, role, credit_balance)
VALUES ('teacher-1', 'teacher@test.com', 'Test Teacher', 'teacher', 1000);

-- Create test students
INSERT INTO users (id, email, username, role, credit_balance)
VALUES 
    ('student-1', 'student1@test.com', 'Student 1', 'student', 500),
    ('student-2', 'student2@test.com', 'Student 2', 'student', 300);

-- Create test materials
INSERT INTO materials (
    id, teacher_id, title, description, material_type,
    file_url, price_credits, is_published, page_count
)
VALUES 
    ('material-1', 'teacher-1', 'Advanced English Grammar', 'Complete guide', 'pdf', '/uploads/test1.pdf', 100, true, 50),
    ('material-2', 'teacher-1', 'Business Vocabulary', 'Essential words', 'pdf', '/uploads/test2.pdf', 80, true, 30),
    ('material-3', 'teacher-1', 'Speaking Practice', 'Audio lessons', 'audio', '/uploads/test3.mp3', 50, true, NULL);

-- Create test purchases
INSERT INTO material_purchases (id, material_id, user_id, price_paid, purchased_at)
VALUES 
    ('purchase-1', 'material-1', 'student-1', 100, NOW() - INTERVAL 5 DAY),
    ('purchase-2', 'material-2', 'student-1', 80, NOW() - INTERVAL 3 DAY),
    ('purchase-3', 'material-1', 'student-2', 100, NOW() - INTERVAL 1 DAY);

-- Update material stats
UPDATE materials SET total_sales = 2, total_revenue = 200 WHERE id = 'material-1';
UPDATE materials SET total_sales = 1, total_revenue = 80 WHERE id = 'material-2';
```

---

## 🚀 PERFORMANCE TESTING

### Load Test Script

**File:** `talkplatform-backend/test/load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 10 },  // Ramp up to 10 users
        { duration: '1m', target: 50 },   // Stay at 50 users
        { duration: '30s', target: 0 },   // Ramp down
    ],
};

const BASE_URL = 'http://localhost:3000/api/v1';
const AUTH_TOKEN = 'YOUR_TEST_TOKEN';

export default function () {
    // Test 1: Browse materials
    const browseRes = http.get(`${BASE_URL}/marketplace/student/materials`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    check(browseRes, { 'browse status 200': (r) => r.status === 200 });

    sleep(1);

    // Test 2: Get material detail
    const detailRes = http.get(`${BASE_URL}/marketplace/student/materials/material-1`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    check(detailRes, { 'detail status 200': (r) => r.status === 200 });

    sleep(1);

    // Test 3: Get analytics
    const analyticsRes = http.get(`${BASE_URL}/marketplace/analytics/revenue`, {
        headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });
    check(analyticsRes, { 'analytics status 200': (r) => r.status === 200 });

    sleep(2);
}
```

Run with:
```bash
k6 run test/load-test.js
```

---

## ✅ TEST CHECKLIST

### Pre-Deployment Testing

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual test scenarios completed
- [ ] Load testing completed
- [ ] Security testing completed
- [ ] Preview generation tested with real PDFs
- [ ] Signed URLs tested for expiration
- [ ] Revenue calculations verified
- [ ] Download tracking verified
- [ ] Error handling tested

### Post-Deployment Monitoring

- [ ] Monitor error rates
- [ ] Monitor download success rate
- [ ] Monitor signed URL expiration errors
- [ ] Monitor revenue calculation accuracy
- [ ] Monitor preview generation failures
- [ ] Check database performance
- [ ] Verify file storage usage

---

## 🐛 KNOWN ISSUES & WORKAROUNDS

### Issue 1: PDF Thumbnail Generation

**Problem:** PDF to image conversion requires additional dependencies

**Workaround:** Use placeholder thumbnails for now, implement pdf2pic later

**Fix:** Install `pdf2pic` package and update `PdfService.generateThumbnail()`

### Issue 2: Large File Downloads

**Problem:** Streaming large files may timeout

**Workaround:** Increase timeout in nginx/load balancer

**Fix:** Implement chunked downloads or use CDN

---

**Next:** `07_Deployment_Guide.md`
