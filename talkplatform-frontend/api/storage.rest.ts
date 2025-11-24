import axiosConfig from './axiosConfig';

export interface PresignedUploadUrlDto {
  key: string;
  mimeType: string;
  folder?: string;
  expiresIn?: number;
}

export interface PresignedUploadUrlResponse {
  url: string;
  key: string;
}

export const getPresignedUploadUrlApi = async (data: PresignedUploadUrlDto): Promise<PresignedUploadUrlResponse> => {
  const res = await axiosConfig.get('/storage/presigned-upload', {
    params: data,
  });
  return res.data;
};

export const getPresignedDownloadUrlApi = async (key: string, expiresIn?: number): Promise<{ url: string }> => {
  const res = await axiosConfig.get('/storage/presigned-download', {
    params: { key, expiresIn },
  });
  return res.data;
};

export const uploadFileApi = async (file: File, presignedUrl: string): Promise<void> => {
  await fetch(presignedUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  });
};

export const deleteFileApi = async (key: string): Promise<void> => {
  await axiosConfig.delete(`/storage/${key}`);
};

export const getFileMetadataApi = async (key: string): Promise<{
  size: number;
  contentType: string;
  lastModified: string;
  etag?: string;
}> => {
  const res = await axiosConfig.get(`/storage/${key}/metadata`);
  return res.data;
};

