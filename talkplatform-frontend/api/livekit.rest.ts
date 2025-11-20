import axiosConfig from './axiosConfig';

export interface LiveKitTokenResponse {
    token: string;
    wsUrl: string;
    identity: string;
    room: string;
    metadata: any;
}

export const generateLiveKitTokenApi = async (meetingId: string): Promise<LiveKitTokenResponse> => {
    const response = await axiosConfig.post('/livekit/token', { meetingId });
    return response.data;
};
