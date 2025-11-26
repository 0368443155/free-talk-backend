import axiosConfig from './axiosConfig';

// ==================== Types ====================

export interface CourseEnrollment {
    id: string;
    user_id: string;
    course_id: string;
    enrollment_type: 'full_course' | 'per_session';
    total_price_paid: number;
    payment_status: 'pending' | 'paid' | 'refunded';
    status: 'active' | 'cancelled' | 'completed';
    enrolled_at: string;
    cancelled_at?: string;
    refund_amount: number;
    completion_percentage: number;
    created_at: string;
    updated_at: string;
    course?: {
        id: string;
        title: string;
        teacher_id: string;
        total_sessions: number;
        description?: string;
        price_full_course?: number;
        teacher?: {
            id: string;
            username: string;
            email: string;
            avatar_url?: string;
        };
    };
}

export interface SessionPurchase {
    id: string;
    user_id: string;
    course_id: string;
    session_id: string;
    price_paid: number;
    payment_status: string;
    status: 'active' | 'cancelled' | 'attended' | 'missed';
    purchased_at: string;
    cancelled_at?: string;
    refund_amount: number;
    attended: boolean;
    attendance_duration_minutes: number;
    created_at: string;
    updated_at: string;
    session?: {
        id: string;
        title: string;
        session_number: number;
        scheduled_date: string;
        start_time: string;
        end_time: string;
        duration_minutes: number;
        status: string;
    };
    course?: {
        id: string;
        title: string;
        teacher_id: string;
        teacher?: {
            id: string;
            username: string;
            email: string;
            avatar_url?: string;
        };
    };
}

export interface EnrollCourseDto {
    enrollment_type: 'full_course' | 'per_session';
}

export interface CancelEnrollmentDto {
    reason?: string;
}

// ==================== API Functions ====================

/**
 * Enroll in full course
 */
export const enrollInCourseApi = async (
    courseId: string,
    dto: EnrollCourseDto
): Promise<CourseEnrollment> => {
    const res = await axiosConfig.post(`/enrollments/courses/${courseId}`, dto);
    return res.data;
};

/**
 * Purchase single session
 */
export const purchaseSessionApi = async (
    sessionId: string
): Promise<SessionPurchase> => {
    const res = await axiosConfig.post(`/enrollments/sessions/${sessionId}/purchase`);
    return res.data;
};

/**
 * Cancel enrollment (refund)
 */
export const cancelEnrollmentApi = async (
    enrollmentId: string,
    dto?: CancelEnrollmentDto
): Promise<{ message: string }> => {
    const res = await axiosConfig.delete(`/enrollments/${enrollmentId}`, {
        data: dto,
    });
    return res.data;
};

/**
 * Cancel session purchase (refund)
 */
export const cancelSessionPurchaseApi = async (
    purchaseId: string,
    dto?: CancelEnrollmentDto
): Promise<{ message: string }> => {
    const res = await axiosConfig.delete(`/enrollments/sessions/${purchaseId}`, {
        data: dto,
    });
    return res.data;
};

/**
 * Get my enrollments
 */
export const getMyEnrollmentsApi = async (): Promise<CourseEnrollment[]> => {
    const res = await axiosConfig.get('/enrollments/me');
    return res.data;
};

/**
 * Get my session purchases
 */
export const getMySessionPurchasesApi = async (): Promise<SessionPurchase[]> => {
    const res = await axiosConfig.get('/enrollments/me/sessions');
    return res.data;
};

/**
 * Check if user has access to session
 */
export const checkSessionAccessApi = async (
    sessionId: string
): Promise<{ hasAccess: boolean }> => {
    const res = await axiosConfig.get(`/enrollments/sessions/${sessionId}/access`);
    return res.data;
};

/**
 * Get enrollment by ID
 */
export const getEnrollmentByIdApi = async (
    enrollmentId: string
): Promise<CourseEnrollment> => {
    const res = await axiosConfig.get(`/enrollments/${enrollmentId}`);
    return res.data;
};

/**
 * Get session purchase by ID
 */
export const getSessionPurchaseByIdApi = async (
    purchaseId: string
): Promise<SessionPurchase> => {
    const res = await axiosConfig.get(`/enrollments/sessions/${purchaseId}`);
    return res.data;
};
