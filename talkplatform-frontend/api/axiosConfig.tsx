import axios from 'axios';

// Get base URL from environment variable or fallback to localhost
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Client-side: use env variable or fallback
    return process.env.NEXT_PUBLIC_SERVER || 'http://localhost:3000/api/v1';
  }
  // Server-side: use env variable or fallback
  return process.env.NEXT_PUBLIC_SERVER || 'http://localhost:3000/api/v1';
};

const axiosConfig = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000, // Giảm timeout xuống 10s
  headers: {
    'Content-Type': 'application/json',
  },
  // Bỏ withCredentials để tránh CORS issues
});

// ✅ SỬA LỖI: Đọc token MỖI LẦN gửi request (không cache)
axiosConfig.interceptors.request.use(
  function (config) {
    // 🔥 ĐỌC TOKEN TỪ localStorage MỖI LẦN (không lưu vào biến)
    let accessToken: string | null = null;
    if (typeof window !== 'undefined') {
      accessToken = localStorage.getItem('accessToken');
    }

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
      
      // Lấy refresh token (nếu có)
      const refreshToken = localStorage.getItem('refreshToken'); 
      if (refreshToken) {
         config.headers['x-refresh-token'] = refreshToken;
      }
    }
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);

// Response interceptor không thay đổi
axiosConfig.interceptors.response.use(
  function (response) {
    if (response.data.message == 'TokenExpiredError') {
      console.warn("Token expired, logic refresh chưa được thực thi đúng.");
    }
    return response;
  },
  function (error) {
    if (error.response && error.response.status === 401) {
      console.error("Lỗi 401: Unauthorized. Token có thể đã hết hạn hoặc không hợp lệ.");
      
      // Khi bị 401, xóa token và logout
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        
        // Chỉ reload nếu không ở trang login
        if (window.location.pathname !== '/login') {
           window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosConfig;
export { axiosConfig as axiosInstance };