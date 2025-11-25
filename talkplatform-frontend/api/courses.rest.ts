import { apiClient } from './client';

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

export enum CourseStatus {
    UPCOMING = 'upcoming',
    ONGOING = 'ongoing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

export enum SessionStatus {
    SCHEDULED = 'scheduled',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
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
    category?: string;
    status: CourseStatus;
    max_students: number;
    current_students: number;
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

export interface CourseSession {
    id: string;
    course_id: string;
    session_number: number;
    title?: string;
    description?: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
    status: SessionStatus;
    livekit_room_name?: string;
    actual_start_time?: string;
    actual_end_time?: string;
    actual_duration_minutes?: number;
    created_at: string;
    updated_at: string;
}

export interface CreateCourseDto {
    title: string;
    description?: string;
    duration_hours: number;
    total_sessions: number;
    price_type: PriceType;
    price_per_session?: number;
    price_full_course?: number;
    language?: string;
    level?: CourseLevel;
    category?: string;
    max_students?: number;
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
    category?: string;
    max_students?: number;
}

export interface CreateSessionDto {
    session_number: number;
    title?: string;
    description?: string;
    scheduled_date: string;
    start_time: string;
    end_time: string;
    duration_minutes: number;
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
    page?: number;
    limit?: number;
}

export interface CoursesResponse {
    data: Course[];
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
