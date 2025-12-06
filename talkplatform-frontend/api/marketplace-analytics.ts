import axiosConfig from './axiosConfig';

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

export const analyticsApi = {
    getRevenueStats: async (params?: {
        start_date?: string;
        end_date?: string;
    }): Promise<RevenueStats> => {
        const response = await axiosConfig.get('/marketplace/analytics/revenue', {
            params,
        });
        return response.data;
    },

    getTopMaterials: async (limit: number = 10): Promise<MaterialSalesStats[]> => {
        const response = await axiosConfig.get('/marketplace/analytics/top-materials', {
            params: { limit },
        });
        return response.data;
    },

    getRevenueChart: async (params: {
        period: 'day' | 'week' | 'month';
        start_date: string;
        end_date: string;
    }): Promise<RevenueTimeSeries[]> => {
        const response = await axiosConfig.get('/marketplace/analytics/revenue-chart', {
            params,
        });
        return response.data;
    },

    getMaterialRevenue: async (materialId: string) => {
        const response = await axiosConfig.get(`/marketplace/analytics/material/${materialId}`);
        return response.data;
    },
};

