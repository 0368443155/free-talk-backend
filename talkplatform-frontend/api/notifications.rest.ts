import axiosConfig from './axiosConfig';

export interface Notification {
  id: string;
  user_id: string;
  type: 'email' | 'in_app' | 'push';
  title: string;
  message: string;
  data?: any;
  status: 'pending' | 'sent' | 'failed';
  sent_at?: string;
  is_read: boolean;
  read_at?: string;
  action_url?: string;
  created_at: string;
}

export const notificationApi = {
  /**
   * Lấy notifications của user
   */
  getNotifications: async (limit: number = 50): Promise<Notification[]> => {
    const response = await axiosConfig.get(`/notifications?limit=${limit}`);
    return response.data;
  },

  /**
   * Đánh dấu notification đã đọc
   */
  markAsRead: async (notificationId: string): Promise<Notification> => {
    const response = await axiosConfig.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  /**
   * Đánh dấu tất cả notifications đã đọc
   */
  markAllAsRead: async (): Promise<void> => {
    await axiosConfig.patch('/notifications/read-all');
  },
};

