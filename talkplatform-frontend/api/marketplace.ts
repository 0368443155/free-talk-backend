import axiosConfig from './axiosConfig';

export interface Material {
    id: string;
    title: string;
    description: string;
    material_type: 'pdf' | 'video' | 'slide' | 'audio' | 'document' | 'course' | 'ebook';
    thumbnail_url?: string;
    preview_url?: string;
    file_url?: string;
    price_credits: number;
    original_price_credits?: number;
    rating: number;
    total_reviews: number;
    total_sales: number;
    download_count?: number;
    view_count?: number;
    language?: string;
    level?: string;
    tags?: string[];
    teacher: {
        id: string;
        username: string;
        avatar_url?: string;
    };
    category?: {
        id: string;
        name: string;
    };
    has_purchased?: boolean;
    created_at: string;
    updated_at?: string;
}

export interface FilterMaterialDto {
    search?: string;
    type?: string;
    level?: string;
    category_id?: string;
    min_price?: number;
    max_price?: number;
    language?: string;
    sort?: string;
    page?: number;
    limit?: number;
}

export interface MaterialPurchase {
    id: string;
    material_id: string;
    user_id: string;
    price_paid: number;
    transaction_id: string;
    download_count: number;
    last_downloaded_at?: string;
    purchased_at: string;
    material?: Material;
}

export const marketplaceApi = {
    getAllMaterials: async (params: FilterMaterialDto) => {
        const response = await axiosConfig.get('/marketplace/materials', { params });
        return response.data;
    },

    getMaterialById: async (id: string) => {
        const response = await axiosConfig.get(`/marketplace/materials/${id}`);
        return response.data;
    },

    purchaseMaterial: async (materialId: string) => {
        const response = await axiosConfig.post(`/marketplace/materials/${materialId}/purchase`);
        return response.data;
    },

    checkPurchased: async (materialId: string) => {
        const response = await axiosConfig.get(`/marketplace/materials/${materialId}/purchased`);
        return response.data;
    },

    getDownloadUrl: async (materialId: string) => {
        const response = await axiosConfig.get(`/marketplace/materials/${materialId}/download`);
        return response.data; // Returns { download_url: string, expires_at: Date }
    },

    getPreviewUrl: async (materialId: string) => {
        const response = await axiosConfig.get(`/marketplace/materials/${materialId}/preview`);
        return response.data; // Returns { preview_url: string, expires_at: Date }
    },

    getPreview: async (materialId: string) => {
        const response = await axiosConfig.get(`/marketplace/materials/${materialId}/preview`);
        return response.data; // Returns { preview_url: string, thumbnail_url: string, page_count: number }
    },

    getPurchasedMaterials: async (page: number = 1, limit: number = 10) => {
        const response = await axiosConfig.get('/marketplace/materials/purchased', {
            params: { page, limit },
        });
        return response.data;
    },

    // Teacher endpoints
    createMaterial: async (data: any) => {
        const response = await axiosConfig.post('/marketplace/teacher/materials', data);
        return response.data;
    },

    getTeacherMaterials: async (params: { page: number; limit: number }) => {
        const response = await axiosConfig.get('/marketplace/teacher/materials', { params });
        return response.data;
    },

    uploadMaterialFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosConfig.post('/marketplace/teacher/materials/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data; // Returns { fileUrl, fileSize }
    },
};
