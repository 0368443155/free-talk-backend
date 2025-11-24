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
  // Parse URL để lấy query params
  const url = new URL(presignedUrl);
  
  // Local storage: upload qua POST endpoint với FormData
  const formData = new FormData();
  formData.append('file', file);
  
  // Upload qua axiosConfig để có JWT token tự động
  // Extract path từ URL (bỏ domain và /api/v1 vì đã có trong baseURL)
  // presignedUrl format: http://localhost:3000/api/v1/storage/upload?key=...
  // baseURL: http://localhost:3000/api/v1
  // Nên path sẽ là: /storage/upload?key=...
  const pathWithQuery = url.pathname.replace('/api/v1', '') + url.search;
  
  await axiosConfig.post(pathWithQuery, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
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

