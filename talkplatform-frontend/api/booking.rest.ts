import axiosConfig from './axiosConfig';

// ==================== Booking API ====================

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

export interface BookingSlot {
  id: string;
  teacher_id: string;
  date: string; // ISO date string
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  is_booked: boolean;
  booking_id?: string;
  student_id?: string;
  price_credits: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  meeting_id: string;
  student_id: string;
  teacher_id: string;
  status: BookingStatus;
  credits_paid: number;
  scheduled_at: string; // ISO datetime
  student_notes?: string;
  created_at: string;
  updated_at: string;
  meeting?: {
    id: string;
    title: string;
    host_id: string;
  };
  teacher?: {
    id: string;
    username: string;
    email: string;
  };
  student?: {
    id: string;
    username: string;
    email: string;
  };
}

export interface CreateBookingDto {
  slot_id: string;
  student_notes?: string;
}

export interface CancelBookingDto {
  cancellation_reason: string;
}

export const createBookingApi = async (data: CreateBookingDto): Promise<Booking> => {
  const res = await axiosConfig.post('/bookings', data);
  return res.data;
};

export const getMyBookingsApi = async (): Promise<Booking[]> => {
  const res = await axiosConfig.get('/bookings/my-bookings');
  return res.data;
};

export const getBookingByIdApi = async (bookingId: string): Promise<Booking> => {
  const res = await axiosConfig.get(`/bookings/${bookingId}`);
  return res.data;
};

export const cancelBookingApi = async (bookingId: string, data: CancelBookingDto): Promise<Booking> => {
  const res = await axiosConfig.patch(`/bookings/${bookingId}/cancel`, data);
  return res.data;
};

export const getTeacherBookingsApi = async (): Promise<Booking[]> => {
  const res = await axiosConfig.get('/bookings/teacher-bookings');
  return res.data;
};

// ==================== Booking Slots API ====================

export interface CreateBookingSlotDto {
  date: string; // ISO date string
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  price_credits: number;
}

export interface GetAvailableSlotsDto {
  teacher_id: string;
  date?: string; // ISO date string
  start_date?: string;
  end_date?: string;
}

export const createBookingSlotApi = async (data: CreateBookingSlotDto): Promise<BookingSlot> => {
  const res = await axiosConfig.post('/teachers/me/slots', data);
  return res.data;
};

export const getAvailableSlotsApi = async (params: GetAvailableSlotsDto): Promise<BookingSlot[]> => {
  const res = await axiosConfig.get('/teachers/slots/available', { params });
  return res.data;
};

export const getMySlotsApi = async (): Promise<BookingSlot[]> => {
  const res = await axiosConfig.get('/teachers/me/slots');
  return res.data;
};

export const deleteBookingSlotApi = async (slotId: string): Promise<void> => {
  await axiosConfig.delete(`/teachers/me/slots/${slotId}`);
};

