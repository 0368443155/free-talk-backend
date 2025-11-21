import axiosConfig from './axiosConfig';

export interface LiveKitTokenResponse {
    token: string;
    wsUrl: string;
    identity: string;
    room: string;
    metadata: any;
}

export const generateLiveKitTokenApi = async (data: {
    roomName: string;
    participantName: string;
    participantIdentity: string;
}): Promise<LiveKitTokenResponse> => {
    const response = await axiosConfig.post('/livekit/token', { 
        meetingId: data.roomName,
        participantRole: 'participant'
    });
    return response.data;
};
