import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Material } from '../entities/material.entity';
import { MaterialPurchase } from '../entities/material-purchase.entity';
import { RedisCacheService } from '../../../infrastructure/cache/services/redis-cache.service';

export interface RevenueStats {
    total_revenue: number;
    platform_fee: number;
    teacher_earnings: number;
    total_sales: number;
    avg_sale_price: number;
}

export interface MaterialSalesStats {
    material_id: string;
    title: string;
    thumbnail_url: string;
    total_sales: number;
    total_revenue: number;
    teacher_earnings: number;
}

export interface RevenueTimeSeries {
    date: string;
    revenue: number;
    sales_count: number;
}

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        @InjectRepository(Material)
        private materialRepository: Repository<Material>,
        @InjectRepository(MaterialPurchase)
        private purchaseRepository: Repository<MaterialPurchase>,
        private cacheService: RedisCacheService,
    ) {}

    /**
     * Get revenue statistics for a teacher
     * Uses SQL aggregation for better performance
     * Cached for 5 minutes
     */
    async getTeacherRevenueStats(
        teacherId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<RevenueStats> {
        // Build cache key
        const dateKey = startDate && endDate 
            ? `${startDate.toISOString()}_${endDate.toISOString()}` 
            : 'all';
        const cacheKey = `analytics:revenue:${teacherId}:${dateKey}`;

        // Try to get from cache
        const cached = await this.cacheService.get<RevenueStats>(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for revenue stats: ${cacheKey}`);
            return cached;
        }
        // Build query with SQL aggregation
        const queryBuilder = this.purchaseRepository
            .createQueryBuilder('purchase')
            .leftJoin('purchase.material', 'material')
            .select('SUM(purchase.price_paid)', 'total_revenue')
            .addSelect('COUNT(purchase.id)', 'total_sales')
            .addSelect('AVG(purchase.price_paid)', 'avg_sale_price')
            .where('material.teacher_id = :teacherId', { teacherId });

        if (startDate && endDate) {
            queryBuilder.andWhere('purchase.purchased_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            });
        }

        const result = await queryBuilder.getRawOne();

        const total_revenue = Number(result?.total_revenue || 0);
        const total_sales = Number(result?.total_sales || 0);
        const platform_fee = total_revenue * 0.3; // 30%
        const teacher_earnings = total_revenue * 0.7; // 70%
        const avg_sale_price = total_sales > 0 ? Number(result?.avg_sale_price || 0) : 0;

        const stats = {
            total_revenue,
            platform_fee,
            teacher_earnings,
            total_sales,
            avg_sale_price,
        };

        // Cache for 5 minutes (300 seconds)
        await this.cacheService.set(cacheKey, stats, 300);

        return stats;
    }

    /**
     * Get top selling materials for a teacher
     * Cached for 10 minutes
     */
    async getTopMaterials(
        teacherId: string,
        limit: number = 10,
    ): Promise<MaterialSalesStats[]> {
        const cacheKey = `analytics:top:${teacherId}:${limit}`;

        // Try to get from cache
        const cached = await this.cacheService.get<MaterialSalesStats[]>(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for top materials: ${cacheKey}`);
            return cached;
        }
        const materials = await this.materialRepository
            .createQueryBuilder('material')
            .where('material.teacher_id = :teacherId', { teacherId })
            .orderBy('material.total_sales', 'DESC')
            .take(limit)
            .getMany();

        const result = materials.map(m => ({
            material_id: m.id,
            title: m.title,
            thumbnail_url: m.thumbnail_url || '',
            total_sales: m.total_sales,
            total_revenue: m.total_revenue,
            teacher_earnings: m.total_revenue * 0.7, // 70%
        }));

        // Cache for 10 minutes (600 seconds)
        await this.cacheService.set(cacheKey, result, 600);

        return result;
    }

    /**
     * Get revenue time series (daily/weekly/monthly)
     * Uses SQL GROUP BY for better performance
     */
    async getRevenueTimeSeries(
        teacherId: string,
        period: 'day' | 'week' | 'month',
        startDate: Date,
        endDate: Date,
    ): Promise<RevenueTimeSeries[]> {
        // Build SQL date format based on period
        let dateFormat: string;
        switch (period) {
            case 'day':
                dateFormat = 'DATE(purchase.purchased_at)';
                break;
            case 'week':
                dateFormat = 'DATE_FORMAT(purchase.purchased_at, "%Y-%u")'; // Year-Week
                break;
            case 'month':
                dateFormat = 'DATE_FORMAT(purchase.purchased_at, "%Y-%m")'; // Year-Month
                break;
        }

        const results = await this.purchaseRepository
            .createQueryBuilder('purchase')
            .leftJoin('purchase.material', 'material')
            .select(`${dateFormat}`, 'date')
            .addSelect('SUM(purchase.price_paid * 0.7)', 'revenue') // Teacher's 70%
            .addSelect('COUNT(purchase.id)', 'sales_count')
            .where('material.teacher_id = :teacherId', { teacherId })
            .andWhere('purchase.purchased_at BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
            .groupBy('date')
            .orderBy('date', 'ASC')
            .getRawMany();

        return results.map(row => ({
            date: String(row.date),
            revenue: Number(row.revenue || 0),
            sales_count: Number(row.sales_count || 0),
        }));
    }

    /**
     * Get detailed revenue breakdown by material
     */
    async getMaterialRevenueBreakdown(
        teacherId: string,
        materialId: string,
    ): Promise<{
        material: Material;
        total_revenue: number;
        platform_fee: number;
        teacher_earnings: number;
        total_sales: number;
        recent_purchases: MaterialPurchase[];
    }> {
        const material = await this.materialRepository.findOne({
            where: { id: materialId, teacher_id: teacherId },
        });

        if (!material) {
            throw new NotFoundException('Material not found');
        }

        // Get purchase stats with SQL aggregation
        const purchaseStats = await this.purchaseRepository
            .createQueryBuilder('purchase')
            .select('SUM(purchase.price_paid)', 'total_revenue')
            .addSelect('COUNT(purchase.id)', 'total_sales')
            .where('purchase.material_id = :materialId', { materialId })
            .getRawOne();

        const total_revenue = Number(purchaseStats?.total_revenue || 0);
        const platform_fee = total_revenue * 0.3;
        const teacher_earnings = total_revenue * 0.7;
        const total_sales = Number(purchaseStats?.total_sales || 0);

        // Get recent purchases
        const recent_purchases = await this.purchaseRepository.find({
            where: { material_id: materialId },
            relations: ['user'],
            order: { purchased_at: 'DESC' },
            take: 10,
        });

        return {
            material,
            total_revenue,
            platform_fee,
            teacher_earnings,
            total_sales,
            recent_purchases,
        };
    }
}

