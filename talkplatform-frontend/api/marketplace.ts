import { axiosInstance } from './axiosConfig';

export interface Material {
    id: string;
    title: string;
    description: string;
    material_type: 'pdf' | 'video' | 'slide' | 'audio' | 'document' | 'course' | 'ebook';
    thumbnail_url?: string;
    price_credits: number;
    original_price_credits?: number;
    rating: number;
    total_reviews: number;
    total_sales: number;
    teacher: {
        id: string;
        username: string;
        avatar_url?: string;
    };
    created_at: string;
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

export const marketplaceApi = {
    getAllMaterials: async (params: FilterMaterialDto) => {
        const response = await axiosInstance.get('/marketplace/materials', { params });
        return response.data;
    },

    getMaterialById: async (id: string) => {
        const response = await axiosInstance.get(`/marketplace/materials/${id}`);
        return response.data;
    },

    // Teacher endpoints
    createMaterial: async (data: any) => {
        const response = await axiosInstance.post('/marketplace/teacher/materials', data);
        return response.data;
    },

    getTeacherMaterials: async (params: { page: number; limit: number }) => {
        const response = await axiosInstance.get('/marketplace/teacher/materials', { params });
        return response.data;
    },

    uploadMaterialFile: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await axiosInstance.post('/marketplace/teacher/materials/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data; // Returns { fileUrl, fileSize }
    },
};
