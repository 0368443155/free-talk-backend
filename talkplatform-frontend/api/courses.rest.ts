import axiosConfig from './axiosConfig';

const apiClient = axiosConfig;

// ==================== TYPES ====================

export enum PriceType {
    PER_SESSION = 'per_session',
    FULL_COURSE = 'full_course',
}

export enum CourseLevel {
    BEGINNER = 'beginner',
    INTERMEDIATE = 'intermediate',
    ADVANCED = 'advanced',
}

export enum CourseCategory {
    ENGLISH = 'English',
    MARKETING = 'Marketing',
    BUSINESS = 'Business',
    TECHNOLOGY = 'Technology',
    DESIGN = 'Design',
    HEALTH = 'Health',
    FITNESS = 'Fitness',
    MUSIC = 'Music',
    ARTS = 'Arts',
    SCIENCE = 'Science',
    MATHEMATICS = 'Mathematics',
    LANGUAGES = 'Languages',
    OTHER = 'Other',
}

export enum CourseStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
}

export enum SessionStatus {
    DRAFT = 'draft',
    PUBLISHED = 'published',
    COMPLETED = 'completed',
    ARCHIVED = 'archived',
}

export enum LessonStatus {
    SCHEDULED = 'scheduled',
    ONGOING = 'ongoing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum MaterialType {
    DOCUMENT = 'document',
    VIDEO = 'video',
    LINK = 'link',
}

export interface Review {
    id: string;
    course_id: string;
    user_id: string;
    rating: number;
    comment?: string;
    created_at: string;
    updated_at: string;
    user?: {
        id: string;
        username: string;
        email: string;
        avatar_url?: string;
    };
}

export interface ReviewStats {
    average: number;
    total: number;
    distribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

export interface CreateReviewDto {
    rating: number;
    comment?: string;
}

export interface Course {
    id: string;
    teacher_id: string;
    title: string;
    description?: string;
    duration_hours: number;
    total_sessions: number;
    price_type: PriceType;
    price_per_session?: number;
    price_full_course?: number;
    language?: string;
    level?: CourseLevel;
    category?: CourseCategory;
    tags?: string[];
    status: CourseStatus;
    is_published: boolean;
    max_students: number;
    current_students: number;
    thumbnail_url?: string;
    average_rating: number;
    total_reviews: number;
    affiliate_code?: string;
    qr_code_url?: string;
    share_link?: string;
    created_at: string;
    updated_at: string;
    teacher?: {
        id: string;
        username: string;
        email: string;
        avatar_url?: string;
    };
    sessions?: CourseSession[];
}

export interface SessionMaterial {
    id: string;
    session_id: string;
    type: MaterialType;
    title: string;
    description?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    display_order: number;
    is_required: boolean;
    created_at: string;
    updated_at: string;
}

export interface CourseSession {
    id: string;
    course_id: string;
    session_number: number;
    title?: string;
    description?: string;
    total_lessons: number;
    status: SessionStatus;
    created_at: string;
    updated_at: string;
    lessons?: Lesson[];
}

export interface LessonMaterial {
    id: string;
    lesson_id: string;
    type: MaterialType;
    title: string;
    description?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    display_order: number;
    is_required: boolean;
    created_at: string;
    updated_at: string;
}

export interface Lesson {
    id: string;
    session_id: string;
    lesson_number: number;
    title: string;
    description?: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    meeting_id?: string;
    livekit_room_name?: string;
    meeting_link?: string;
    qr_code_url?: string;
    qr_code_data?: string;
    status: LessonStatus;
    is_preview?: boolean;
    is_free?: boolean;
    created_at: string;
    updated_at: string;
    materials?: LessonMaterial[];
    meeting?: any;
}

export interface CreateCourseDto {
    title: string;
    description?: string;
    duration_hours: number;
    total_sessions?: number;
    price_type: PriceType;
    price_per_session?: number;
    price_full_course?: number;
    language?: string;
    level?: CourseLevel;
    category?: string;
    max_students?: number;
}

export interface CreateLessonMaterialDto {
    type: MaterialType;
    title: string;
    description?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    display_order?: number;
    is_required?: boolean;
}

export interface CreateLessonDto {
    lesson_number: number;
    title: string;
    description?: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    is_preview?: boolean;
    is_free?: boolean;
    materials?: CreateLessonMaterialDto[];
}

export interface CreateSessionWithLessonsDto {
    session_number: number;
    title: string;
    description?: string;
    lessons: CreateLessonDto[];
}

export interface CreateCourseWithSessionsDto {
    title: string;
    description?: string;
    category?: string;
    level?: CourseLevel;
    language?: string;
    price_full_course?: number;
    price_per_session?: number;
    max_students?: number;
    duration_hours?: number;
    sessions: CreateSessionWithLessonsDto[];
}

export interface UpdateCourseDto {
    title?: string;
    description?: string;
    duration_hours?: number;
    total_sessions?: number;
    price_type?: PriceType;
    price_per_session?: number;
    price_full_course?: number;
    language?: string;
    level?: CourseLevel;
    category?: CourseCategory;
    tags?: string[];
    max_students?: number;
}

export interface CreateSessionMaterialDto {
    type: MaterialType;
    title: string;
    description?: string;
    file_url?: string;
    file_name?: string;
    file_size?: number;
    file_type?: string;
    display_order?: number;
    is_required?: boolean;
}

export interface CreateSessionWithMaterialsDto {
    session_number: number;
    title: string;
    description?: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    materials?: CreateSessionMaterialDto[];
}

export interface CreateSessionDto {
    session_number: number;
    title?: string;
    description?: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    duration_minutes?: number;
}

export interface UpdateSessionDto {
    title?: string;
    description?: string;
    scheduled_date?: string;
    start_time?: string;
    end_time?: string;
    duration_minutes?: number;
}

export interface GetCoursesQuery {
    teacher_id?: string;
    status?: CourseStatus;
    language?: string;
    level?: CourseLevel;
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
}

export interface CoursesResponse {
    courses: Course[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ==================== API FUNCTIONS ====================

/**
 * Create a new course (Teacher only)
 */
export async function createCourseApi(data: CreateCourseDto): Promise<Course> {
    const response = await apiClient.post('/courses', data);
    return response.data;
}

/**
 * Create course with sessions and materials (Teacher only)
 */
export async function createCourseWithSessionsApi(data: CreateCourseWithSessionsDto): Promise<Course> {
    const response = await apiClient.post('/courses/with-sessions', data);
    return response.data;
}

/**
 * Get all courses with filters
 */
export async function getCoursesApi(query?: GetCoursesQuery): Promise<CoursesResponse> {
    const response = await apiClient.get('/courses', { params: query });
    return response.data;
}

/**
 * Get teacher's courses
 */
export async function getMyCoursesApi(status?: CourseStatus): Promise<Course[]> {
    const response = await apiClient.get('/courses/my-courses', {
        params: status ? { status } : undefined,
    });
    return response.data;
}

/**
 * Get course by ID
 */
export async function getCourseByIdApi(courseId: string): Promise<Course> {
    const response = await apiClient.get(`/courses/${courseId}`);
    return response.data;
}

/**
 * Update course (Teacher only)
 */
export async function updateCourseApi(
    courseId: string,
    data: UpdateCourseDto
): Promise<Course> {
    const response = await apiClient.patch(`/courses/${courseId}`, data);
    return response.data;
}

/**
 * Delete course (Teacher only)
 */
export async function deleteCourseApi(courseId: string): Promise<void> {
    await apiClient.delete(`/courses/${courseId}`);
}

/**
 * Regenerate QR code (Teacher only)
 */
export async function regenerateQrCodeApi(courseId: string): Promise<Course> {
    const response = await apiClient.post(`/courses/${courseId}/regenerate-qr`);
    return response.data;
}

/**
 * Publish course (Teacher only)
 */
export async function publishCourseApi(courseId: string): Promise<Course> {
    const response = await apiClient.patch(`/courses/${courseId}/publish`);
    return response.data;
}

/**
 * Unpublish course (Teacher only)
 */
export async function unpublishCourseApi(courseId: string): Promise<Course> {
    const response = await apiClient.patch(`/courses/${courseId}/unpublish`);
    return response.data;
}

/**
 * Add session to course (Teacher only)
 */
export async function addSessionApi(
    courseId: string,
    data: CreateSessionDto
): Promise<CourseSession> {
    const response = await apiClient.post(`/courses/${courseId}/sessions`, data);
    return response.data;
}

/**
 * Get all sessions for a course
 */
export async function getCourseSessionsApi(courseId: string): Promise<CourseSession[]> {
    const response = await apiClient.get(`/courses/${courseId}/sessions`);
    return response.data;
}

/**
 * Get session by ID
 */
export async function getSessionByIdApi(
    courseId: string,
    sessionId: string
): Promise<CourseSession> {
    const response = await apiClient.get(`/courses/${courseId}/sessions/${sessionId}`);
    return response.data;
}

/**
 * Update session (Teacher only)
 */
export async function updateSessionApi(
    courseId: string,
    sessionId: string,
    data: UpdateSessionDto
): Promise<CourseSession> {
    const response = await apiClient.patch(`/courses/${courseId}/sessions/${sessionId}`, data);
    return response.data;
}

/**
 * Delete session (Teacher only)
 */
export async function deleteSessionApi(courseId: string, sessionId: string): Promise<void> {
    await apiClient.delete(`/courses/${courseId}/sessions/${sessionId}`);
}

// ==================== LESSON API FUNCTIONS ====================

/**
 * Get all lessons for a session
 */
export async function getSessionLessonsApi(courseId: string, sessionId: string): Promise<Lesson[]> {
    const response = await apiClient.get(`/courses/${courseId}/sessions/${sessionId}/lessons`);
    return response.data;
}

/**
 * Get lesson by ID
 */
export async function getLessonByIdApi(courseId: string, sessionId: string, lessonId: string): Promise<Lesson> {
    const response = await apiClient.get(`/courses/${courseId}/sessions/${sessionId}/lessons/${lessonId}`);
    return response.data;
}

/**
 * Add lesson to session (Teacher only)
 */
export async function addLessonApi(
    courseId: string,
    sessionId: string,
    data: CreateLessonDto
): Promise<Lesson> {
    const response = await apiClient.post(`/courses/${courseId}/sessions/${sessionId}/lessons`, data);
    return response.data;
}

/**
 * Update lesson (Teacher only)
 */
export async function updateLessonApi(
    courseId: string,
    sessionId: string,
    lessonId: string,
    data: Partial<CreateLessonDto>
): Promise<Lesson> {
    const response = await apiClient.patch(`/courses/${courseId}/sessions/${sessionId}/lessons/${lessonId}`, data);
    return response.data;
}

/**
 * Delete lesson (Teacher only)
 */
export async function deleteLessonApi(courseId: string, sessionId: string, lessonId: string): Promise<void> {
    await apiClient.delete(`/courses/${courseId}/sessions/${sessionId}/lessons/${lessonId}`);
}

/**
 * Get all meetings for a course
 */
export async function getCourseMeetingsApi(courseId: string): Promise<any[]> {
    const response = await apiClient.get(`/courses/${courseId}/meetings`);
    return response.data;
}

/**
 * Get lesson materials (requires access)
 */
export async function getLessonMaterialsApi(lessonId: string): Promise<LessonMaterial[]> {
    const response = await apiClient.get(`/courses/lessons/${lessonId}/materials`);
    return response.data;
}

/**
 * Download material (requires access)
 */
export async function downloadMaterialApi(materialId: string): Promise<{ material: LessonMaterial; downloadUrl: string; message: string }> {
    const response = await apiClient.get(`/courses/materials/${materialId}/download`);
    return response.data;
}

/**
 * Join lesson meeting (requires access)
 */
export async function joinLessonMeetingApi(
    courseId: string,
    sessionId: string,
    lessonId: string,
    deviceSettings?: { audioEnabled?: boolean; videoEnabled?: boolean }
): Promise<any> {
    const response = await apiClient.post(`/courses/${courseId}/sessions/${sessionId}/lessons/${lessonId}/join`, deviceSettings);
    return response.data;
}

/**
 * Check lesson access
 */
export async function checkLessonAccessApi(courseId: string, sessionId: string, lessonId: string): Promise<{ hasAccess: boolean; reason?: string; requiresPurchase?: boolean }> {
    const response = await apiClient.get(`/courses/${courseId}/sessions/${sessionId}/lessons/${lessonId}/access`);
    return response.data;
}

// ==================== REVIEW API FUNCTIONS ====================

/**
 * Create or update review for a course
 */
export async function createReviewApi(courseId: string, data: CreateReviewDto): Promise<Review> {
    const response = await apiClient.post(`/courses/${courseId}/reviews`, data);
    return response.data;
}

/**
 * Get all reviews for a course
 */
export async function getCourseReviewsApi(courseId: string): Promise<Review[]> {
    const response = await apiClient.get(`/courses/${courseId}/reviews`);
    return response.data;
}

/**
 * Get review statistics for a course
 */
export async function getReviewStatsApi(courseId: string): Promise<ReviewStats> {
    const response = await apiClient.get(`/courses/${courseId}/reviews/stats`);
    return response.data;
}

/**
 * Get my review for a course
 */
export async function getMyReviewApi(courseId: string): Promise<Review | null> {
    const response = await apiClient.get(`/courses/${courseId}/reviews/my-review`);
    return response.data;
}

/**
 * Delete my review for a course
 */
export async function deleteReviewApi(courseId: string): Promise<void> {
    await apiClient.delete(`/courses/${courseId}/reviews`);
}
