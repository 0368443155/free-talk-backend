import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, FindOptionsWhere } from 'typeorm';
import { Material, MaterialType, MaterialLevel } from '../entities/material.entity';
import { MaterialCategory } from '../entities/material-category.entity';
import { MaterialPurchase } from '../entities/material-purchase.entity';
import { CreateMaterialDto } from '../dto/create-material.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';
import { FilterMaterialDto } from '../dto/filter-material.dto';
import { User } from '../../../users/user.entity';
import { WalletService } from '../../wallet/wallet.service';

@Injectable()
export class MaterialService {
    constructor(
        @InjectRepository(Material)
        private materialRepository: Repository<Material>,
        @InjectRepository(MaterialCategory)
        private categoryRepository: Repository<MaterialCategory>,
        @InjectRepository(MaterialPurchase)
        private purchaseRepository: Repository<MaterialPurchase>,
        private walletService: WalletService,
    ) { }

    async create(createMaterialDto: CreateMaterialDto, teacher: User): Promise<Material> {
        const material = this.materialRepository.create({
            ...createMaterialDto,
            teacher_id: teacher.id,
            is_published: false, // Default to draft
        });

        return this.materialRepository.save(material);
    }

    async findAll(filterDto: FilterMaterialDto) {
        const {
            search,
            type,
            level,
            category_id,
            min_price,
            max_price,
            language,
            sort,
            page = 1,
            limit = 10,
        } = filterDto;

        const query = this.materialRepository.createQueryBuilder('material')
            .leftJoinAndSelect('material.teacher', 'teacher')
            .leftJoinAndSelect('material.category', 'category')
            .where('material.is_published = :isPublished', { isPublished: true });

        if (search) {
            query.andWhere(
                '(material.title LIKE :search OR material.description LIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (type) {
            query.andWhere('material.material_type = :type', { type });
        }

        if (level && level !== MaterialLevel.ALL) {
            query.andWhere('material.level = :level', { level });
        }

        if (category_id) {
            query.andWhere('material.category_id = :category_id', { category_id });
        }

        if (min_price !== undefined) {
            query.andWhere('material.price_credits >= :min_price', { min_price });
        }

        if (max_price !== undefined) {
            query.andWhere('material.price_credits <= :max_price', { max_price });
        }

        if (language) {
            query.andWhere('material.language = :language', { language });
        }

        // Sorting
        switch (sort) {
            case 'newest':
                query.orderBy('material.created_at', 'DESC');
                break;
            case 'popular':
                query.orderBy('material.total_sales', 'DESC');
                break;
            case 'price_asc':
                query.orderBy('material.price_credits', 'ASC');
                break;
            case 'price_desc':
                query.orderBy('material.price_credits', 'DESC');
                break;
            case 'rating':
                query.orderBy('material.rating', 'DESC');
                break;
            default:
                query.orderBy('material.created_at', 'DESC');
        }

        const skip = (page - 1) * limit;
        query.skip(skip).take(limit);

        const [items, total] = await query.getManyAndCount();

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: string): Promise<Material> {
        const material = await this.materialRepository.findOne({
            where: { id },
            relations: ['teacher', 'category', 'reviews', 'reviews.user'],
        });

        if (!material) {
            throw new NotFoundException(`Material with ID ${id} not found`);
        }

        // Increment view count
        await this.materialRepository.increment({ id }, 'view_count', 1);

        return material;
    }

    async findTeacherMaterials(teacherId: string, page: number = 1, limit: number = 10) {
        const [items, total] = await this.materialRepository.findAndCount({
            where: { teacher_id: teacherId },
            order: { created_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
            relations: ['category'],
        });

        return {
            items,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async update(id: string, updateMaterialDto: UpdateMaterialDto, teacherId: string): Promise<Material> {
        const material = await this.findOne(id);

        if (material.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only update your own materials');
        }

        Object.assign(material, updateMaterialDto);
        return this.materialRepository.save(material);
    }

    async remove(id: string, teacherId: string): Promise<void> {
        const material = await this.findOne(id);

        if (material.teacher_id !== teacherId) {
            throw new ForbiddenException('You can only delete your own materials');
        }

        await this.materialRepository.remove(material);
    }

    /**
     * Purchase material với credit deduction
     */
    async purchaseMaterial(materialId: string, user: User): Promise<MaterialPurchase> {
        const material = await this.materialRepository.findOne({
            where: { id: materialId },
            relations: ['teacher'],
        });

        if (!material) {
            throw new NotFoundException('Material not found');
        }

        if (!material.is_published) {
            throw new BadRequestException('Material is not available for purchase');
        }

        // Kiểm tra đã mua chưa
        const existingPurchase = await this.purchaseRepository.findOne({
            where: {
                material_id: materialId,
                user_id: user.id,
            },
        });

        if (existingPurchase) {
            throw new BadRequestException('You have already purchased this material');
        }

        // Kiểm tra số dư
        const balance = await this.walletService.getUserBalance(user.id);
        if (balance < material.price_credits) {
            throw new BadRequestException('Insufficient credits');
        }

        // Deduct credits sử dụng WalletService
        const transaction = await this.walletService.deductCredits(
            user.id,
            material.price_credits,
            `Purchase material: ${material.title}`,
            materialId,
            {
                material_id: materialId,
                material_title: material.title,
                teacher_id: material.teacher_id,
            },
        );

        // Tạo purchase record
        const purchase = this.purchaseRepository.create({
            material_id: materialId,
            user_id: user.id,
            price_paid: material.price_credits,
            transaction_id: transaction.id,
        });

        const savedPurchase = await this.purchaseRepository.save(purchase);

        // Cập nhật material stats
        await this.materialRepository.increment({ id: materialId }, 'total_sales', 1);
        await this.materialRepository.increment(
            { id: materialId },
            'total_revenue',
            material.price_credits,
        );

        // Revenue sharing với teacher (70/30)
        await this.walletService.shareRevenue(
            material.teacher_id,
            material.price_credits,
            30, // Platform 30%, Teacher 70%
            `Material sale: ${material.title}`,
            savedPurchase.id,
        );

        return savedPurchase;
    }

    /**
     * Kiểm tra user đã mua material chưa
     */
    async hasPurchased(materialId: string, userId: string): Promise<boolean> {
        const purchase = await this.purchaseRepository.findOne({
            where: {
                material_id: materialId,
                user_id: userId,
            },
        });
        return !!purchase;
    }

    /**
     * Lấy danh sách materials đã mua
     */
    async getPurchasedMaterials(userId: string, page: number = 1, limit: number = 10) {
        const [purchases, total] = await this.purchaseRepository.findAndCount({
            where: { user_id: userId },
            relations: ['material', 'material.teacher', 'material.category'],
            order: { purchased_at: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            items: purchases.map((p) => p.material),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Lấy download URL (pre-signed URL nếu cần)
     */
    async getDownloadUrl(materialId: string, userId: string): Promise<string> {
        const hasPurchased = await this.hasPurchased(materialId, userId);
        if (!hasPurchased) {
            throw new ForbiddenException('You must purchase this material first');
        }

        const material = await this.findOne(materialId);

        // Increment download count
        await this.purchaseRepository.increment(
            { material_id: materialId, user_id: userId },
            'download_count',
            1,
        );
        await this.purchaseRepository.update(
            { material_id: materialId, user_id: userId },
            { last_downloaded_at: new Date() },
        );
        await this.materialRepository.increment({ id: materialId }, 'download_count', 1);

        // TODO: Generate pre-signed URL nếu dùng cloud storage
        // Hiện tại trả về direct URL
        return material.file_url;
    }

    // Admin methods
    async adminUpdateStatus(id: string, isPublished: boolean): Promise<Material> {
        const material = await this.findOne(id);
        material.is_published = isPublished;
        if (isPublished) {
            material.published_at = new Date();
        }
        return this.materialRepository.save(material);
    }
}
