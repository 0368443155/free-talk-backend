import { create } from 'zustand';
import { IUserInfo, UserRole, getUserInfoApi } from '@/api/user.rest';

interface UserState {
  userInfo: IUserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasToken: boolean;
  setUserInfo: (user: IUserInfo | null) => void;
  logout: () => void;
  initializeAuth: () => Promise<void>;
}

export const useUser = create<UserState>((set, get) => ({
  userInfo: null,
  isAuthenticated: false,
  isLoading: true,
  hasToken: false,

  setUserInfo: (user) => {
    console.log('📝 Setting user info:', user?.username || user?.name || 'null');
    set({ 
      userInfo: user, 
      isAuthenticated: !!user,
      isLoading: false,
      hasToken: !!user 
    });
  },
  
  logout: () => {
    console.log('👋 Logging out user');
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken'); 
    }
    set({ 
      userInfo: null, 
      isAuthenticated: false, 
      hasToken: false,
      isLoading: false 
    });
  },

  initializeAuth: async () => {
    // Check if we are on the client side
    if (typeof window === 'undefined') {
      set({ isLoading: false });
      return;
    }

    const token = localStorage.getItem('accessToken');

    console.log('🔑 Initializing auth:', {
      hasToken: !!token,
      isAuthenticated: get().isAuthenticated,
      currentUser: get().userInfo?.name
    });

    // Nếu không có token, không cần validate
    if (!token) {
      console.log('❌ No token found in localStorage');
      set({ 
        isLoading: false, 
        hasToken: false, 
        isAuthenticated: false, 
        userInfo: null 
      });
      return;
    }

    // Nếu đã có user và đã authenticated, không cần validate lại
    // if (get().isAuthenticated && get().userInfo) {
    //   console.log('✅ Already authenticated with user:', get().userInfo?.name);
    //   set({ isLoading: false, hasToken: true });
    //   return;
    // }

    // Validate token bằng cách gọi API
    try {
      console.log('📡 Validating token...');
      set({ hasToken: true, isLoading: true });

      const userData = await getUserInfoApi(); 
      console.log('📦 Received user data:', userData);

      if (userData) {
        console.log('✅ Token validated successfully:', userData.username || userData.email);
        set({ 
          userInfo: userData, 
          isAuthenticated: true, 
          isLoading: false,
          hasToken: true 
        });
      } else {
        throw new Error("User data is empty");
      }
    } catch (error: any) {
      console.error('❌ Failed to validate token:', error.message, error.response?.data);
      
      // Xóa token không hợp lệ
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      set({ 
        isLoading: false, 
        isAuthenticated: false, 
        userInfo: null, 
        hasToken: false 
      });
    }
  },

}));