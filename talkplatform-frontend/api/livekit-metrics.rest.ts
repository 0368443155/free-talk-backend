import { axiosInstance } from './axiosConfig';

export interface LiveKitMetric {
  meetingId: string;
  userId: string;
  platform: 'livekit';
  timestamp: number;
  bitrate: number;
  packetLoss: number;
  jitter: number;
  rtt: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface LiveKitDashboardData {
  metrics: LiveKitMetric[];
  stats: {
    avgBitrate: number;
    minBitrate: number;
    maxBitrate: number;
    avgPacketLoss: number;
    maxPacketLoss: number;
    avgJitter: number;
    avgRtt: number;
    totalMeasurements: number;
    uniqueUsers: number;
    uniqueMeetings: number;
  };
  qualityDistribution: Array<{
    quality: string;
    count: number;
    percentage: number;
  }>;
  activeMeetings: Array<{
    meetingId: string;
    participantCount: number;
    avgBitrate: number;
    avgQualityScore: number;
    lastActivity: number;
  }>;
  timestamp: number;
}

// Send LiveKit metric to backend
export const sendLiveKitMetricApi = async (metric: LiveKitMetric): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await axiosInstance.post('/api/metrics/livekit', metric);
    return response.data;
  } catch (error: any) {
    console.error('Error sending LiveKit metric:', error);
    return { 
      success: false, 
      error: error.response?.data?.message || error.message 
    };
  }
};

// Bulk send multiple LiveKit metrics
export const sendBulkLiveKitMetricsApi = async (metrics: LiveKitMetric[]): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    const response = await axiosInstance.post('/api/metrics/livekit/bulk', metrics);
    return response.data;
  } catch (error: any) {
    console.error('Error sending bulk LiveKit metrics:', error);
    return { 
      success: false, 
      count: 0,
      error: error.response?.data?.message || error.message 
    };
  }
};

// Get LiveKit dashboard metrics
export const getLiveKitDashboardMetricsApi = async (meetingId?: string): Promise<LiveKitDashboardData> => {
  try {
    const params = meetingId ? { meetingId } : {};
    const response = await axiosInstance.get('/api/metrics/livekit/dashboard', { params });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching LiveKit dashboard metrics:', error);
    throw error;
  }
};

// Get real-time LiveKit metrics for a specific meeting
export const getLiveKitMeetingMetricsApi = async (meetingId: string, minutes: number = 60): Promise<LiveKitMetric[]> => {
  try {
    const response = await axiosInstance.get(`/api/metrics/livekit/meeting/${meetingId}`, {
      params: { minutes }
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching LiveKit meeting metrics:', error);
    throw error;
  }
};