# 02. Referral Tracking Implementation (Detailed)

## 1. Database Schema Changes

### 1.1. User Entity Update (`src/users/user.entity.ts`)
Cần chuẩn hóa lại field `referrer_id` (đang bị typo là `refferrer_id`) và thêm relation.

```typescript
// src/users/user.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, Index, OneToMany } from 'typeorm';

@Entity('users')
@Index(['referrer_id']) // Index để query nhanh danh sách người được giới thiệu
@Index(['affiliate_code']) // Index để tìm user theo code nhanh
export class User {
    // ... existing fields

    // 1. Fix typo & Change type to UUID
    @Column({ type: 'uuid', nullable: true })
    referrer_id: string;

    // 2. Add Self-referencing Relation
    @ManyToOne(() => User, (user) => user.referrals)
    @JoinColumn({ name: 'referrer_id' })
    referred_by: User;

    // 3. Add Inverse Relation (Optional but useful)
    @OneToMany(() => User, (user) => user.referred_by)
    referrals: User[];

    // 4. Ensure affiliate_code is unique and indexed
    @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
    affiliate_code: string;
}
```

### 1.2. Migration Script
Tạo file migration mới: `npx typeorm migration:create src/database/migrations/FixReferrerColumn`

```typescript
// src/database/migrations/TIMESTAMP-FixReferrerColumn.ts
import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class FixReferrerColumnTIMESTAMP implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Rename old column if exists (handle data preservation)
        const table = await queryRunner.getTable("users");
        const oldColumn = table.findColumnByName("refferrer_id");
        
        if (oldColumn) {
            // Nếu column cũ là char(36), ta đổi tên và type
            await queryRunner.changeColumn("users", "refferrer_id", new TableColumn({
                name: "referrer_id",
                type: "uuid",
                isNullable: true
            }));
        } else {
            // Nếu chưa có thì tạo mới
            await queryRunner.addColumn("users", new TableColumn({
                name: "referrer_id",
                type: "uuid",
                isNullable: true
            }));
        }

        // 2. Create Index
        await queryRunner.createIndex("users", new TableIndex({
            name: "IDX_USERS_REFERRER_ID",
            columnNames: ["referrer_id"]
        }));

        // 3. Create Foreign Key
        await queryRunner.createForeignKey("users", new TableForeignKey({
            name: "FK_USERS_REFERRER",
            columnNames: ["referrer_id"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "SET NULL" // Nếu người giới thiệu bị xóa, giữ user lại nhưng set null
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropForeignKey("users", "FK_USERS_REFERRER");
        await queryRunner.dropIndex("users", "IDX_USERS_REFERRER_ID");
        await queryRunner.renameColumn("users", "referrer_id", "refferrer_id");
    }
}
```

## 2. Backend Logic Implementation

### 2.1. Update `RegisterDto` (`src/features/auth/dto/register.dto.ts`)

```typescript
import { IsOptional, IsString, Length } from 'class-validator';

export class RegisterDto {
    // ... existing fields

    @IsOptional()
    @IsString()
    @Length(5, 20)
    affiliate_code?: string;
}
```

### 2.2. Update `AuthService.register` (`src/features/auth/auth.service.ts`)

```typescript
// Import User repository
async register(dto: RegisterDto): Promise<User> {
    // 1. Validate Affiliate Code (if provided)
    let referrer: User = null;
    if (dto.affiliate_code) {
        referrer = await this.userRepository.findOne({ 
            where: { affiliate_code: dto.affiliate_code } 
        });
        
        // Optional: Throw error if code invalid? 
        // Policy: Ignore invalid code to not block registration, but log warning.
        if (!referrer) {
            this.logger.warn(`Invalid affiliate code used during registration: ${dto.affiliate_code}`);
        }
    }

    // 2. Create User
    const newUser = this.userRepository.create({
        ...dto,
        // Auto generate own affiliate code for new user
        affiliate_code: this.generateAffiliateCode(dto.username), 
        referrer_id: referrer ? referrer.id : null,
        // ... other fields
    });

    return this.userRepository.save(newUser);
}

// Helper to generate unique code
private generateAffiliateCode(username: string): string {
    // Remove special chars, take first 5 chars, uppercase + random 3 numbers
    const prefix = username.replace(/[^a-zA-Z0-9]/g, '').substring(0, 5).toUpperCase();
    const suffix = Math.floor(100 + Math.random() * 900); // 3 digit random
    return `${prefix}${suffix}`;
}
```

### 2.3. Affiliate Controller (`src/features/affiliate/affiliate.controller.ts`)

```typescript
@Controller('api/v1/affiliate')
@UseGuards(JwtAuthGuard)
export class AffiliateController {
    constructor(private readonly affiliateService: AffiliateService) {}

    @Get('link')
    async getMyLink(@CurrentUser() user: User) {
        // If user doesn't have code yet, generate one
        if (!user.affiliate_code) {
            user.affiliate_code = await this.affiliateService.generateCodeForUser(user.id);
        }
        
        const baseUrl = process.env.FRONTEND_URL || 'https://4talk.vn';
        return {
            code: user.affiliate_code,
            link: `${baseUrl}/register?ref=${user.affiliate_code}`
        };
    }

    @Get('validate/:code')
    @Public() // Allow public access
    async validateCode(@Param('code') code: string) {
        const referrer = await this.affiliateService.findUserByCode(code);
        if (!referrer) {
            throw new NotFoundException('Invalid referral code');
        }
        return {
            valid: true,
            referrer_name: referrer.username, // Mask name if needed
            referrer_avatar: referrer.avatar_url
        };
    }
}
```

## 3. Frontend Implementation (Next.js)

### 3.1. Create `useReferral` Hook (`hooks/useReferral.ts`)
Hook này sẽ chạy ở `_app.tsx` hoặc `layout.tsx` để bắt query param global.

```typescript
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

const COOKIE_NAME = 'talk_ref_code';
const COOKIE_DURATION = 30; // days

export const useReferral = () => {
    const searchParams = useSearchParams();
    
    useEffect(() => {
        const refCode = searchParams.get('ref');
        if (refCode) {
            // Save to localStorage
            localStorage.setItem(COOKIE_NAME, refCode);
            
            // Save to Cookie (for server-side access if needed)
            const d = new Date();
            d.setTime(d.getTime() + (COOKIE_DURATION * 24 * 60 * 60 * 1000));
            document.cookie = `${COOKIE_NAME}=${refCode};expires=${d.toUTCString()};path=/`;
        }
    }, [searchParams]);
    
    const getReferralCode = () => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(COOKIE_NAME);
    };

    return { getReferralCode };
};
```

### 3.2. Update Register Page (`app/register/page.tsx`)

```typescript
import { useReferral } from '@/hooks/useReferral';

export default function RegisterPage() {
    const { getReferralCode } = useReferral();
    const [referrerInfo, setReferrerInfo] = useState(null);

    useEffect(() => {
        const code = getReferralCode();
        if (code) {
            // Validate code to show "You are invited by..."
            fetch(`/api/v1/affiliate/validate/${code}`)
                .then(res => res.json())
                .then(data => {
                    if (data.valid) setReferrerInfo(data);
                });
        }
    }, []);

    const handleSubmit = async (formData) => {
        const payload = {
            ...formData,
            affiliate_code: getReferralCode() // Include code in payload
        };
        // Call API register...
    };

    return (
        <form onSubmit={handleSubmit}>
            {/* ... other fields ... */}
            
            {referrerInfo && (
                <div className="bg-blue-50 p-3 rounded-md mb-4 flex items-center gap-2">
                    <img src={referrerInfo.referrer_avatar} className="w-8 h-8 rounded-full" />
                    <p className="text-sm text-blue-700">
                        You are invited by <strong>{referrerInfo.referrer_name}</strong>
                    </p>
                </div>
            )}
            
            {/* ... submit button ... */}
        </form>
    );
}
```

## 4. Checklist Deployment

1.  [ ] Run Migration: `npm run typeorm migration:run`
2.  [ ] Verify Database: Check `users` table has `referrer_id` column.
3.  [ ] Test API: Call `GET /api/v1/affiliate/validate/TEST` -> 404.
4.  [ ] Test Frontend: Access `localhost:3000/register?ref=TEST`, check localStorage.
