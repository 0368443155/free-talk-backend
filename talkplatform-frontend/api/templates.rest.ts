import axiosConfig from './axiosConfig';

const apiClient = axiosConfig;

// ==================== TYPES ====================

export interface SessionStructure {
  sessionNumber: number;
  title: string;
  description: string;
  durationMinutes: number;
  topics: string[];
  lessonCount: number;
}

export interface CourseTemplate {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  isPublic: boolean;
  isFeatured: boolean;
  category?: string;
  level?: string;
  language?: string;
  totalSessions: number;
  sessionsPerWeek?: number;
  totalDurationHours?: number;
  sessionStructure: SessionStructure[];
  lessonStructure?: any[];
  defaultMaterials?: any[];
  suggestedPriceFull?: number;
  suggestedPriceSession?: number;
  usageCount: number;
  rating?: number;
  totalRatings: number;
  tags?: string[];
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    username: string;
  };
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  isPublic?: boolean;
  category?: string;
  level?: string;
  language?: string;
  sessionsPerWeek?: number;
  sessionStructure: SessionStructure[];
  suggestedPriceFull?: number;
  suggestedPriceSession?: number;
  tags?: string[];
}

export interface CreateFromTemplateDto {
  title: string;
  description?: string;
  startDate: string;
  priceFullCourse?: number;
  pricePerSession?: number;
  maxStudents?: number;
}

export interface GetTemplatesResponse {
  data: CourseTemplate[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== API FUNCTIONS ====================

export async function getTemplatesApi(params?: {
  category?: string;
  level?: string;
  language?: string;
  isPublic?: boolean;
  isFeatured?: boolean;
  createdBy?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'usageCount' | 'rating' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}): Promise<GetTemplatesResponse> {
  const response = await apiClient.get('/course-templates', { params });
  return response.data;
}

export async function getTemplateByIdApi(templateId: string): Promise<CourseTemplate> {
  const response = await apiClient.get(`/course-templates/${templateId}`);
  return response.data;
}

export async function getMyTemplatesApi(params?: {
  page?: number;
  limit?: number;
  sortBy?: 'usageCount' | 'rating' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}): Promise<GetTemplatesResponse> {
  const response = await apiClient.get('/course-templates/my-templates', { params });
  return response.data;
}

export async function createTemplateApi(dto: CreateTemplateDto): Promise<CourseTemplate> {
  const response = await apiClient.post('/course-templates', dto);
  return response.data.data;
}

export async function updateTemplateApi(
  templateId: string,
  dto: Partial<CreateTemplateDto>,
): Promise<CourseTemplate> {
  const response = await apiClient.put(`/course-templates/${templateId}`, dto);
  return response.data.data;
}

export async function deleteTemplateApi(templateId: string): Promise<void> {
  await apiClient.delete(`/course-templates/${templateId}`);
}

export async function createCourseFromTemplateApi(
  templateId: string,
  dto: CreateFromTemplateDto,
): Promise<any> {
  const response = await apiClient.post(`/course-templates/${templateId}/use`, dto);
  return response.data.data;
}

export async function rateTemplateApi(
  templateId: string,
  rating: number,
  review?: string,
): Promise<any> {
  const response = await apiClient.post(`/course-templates/${templateId}/rate`, {
    rating,
    review,
  });
  return response.data.data;
}

