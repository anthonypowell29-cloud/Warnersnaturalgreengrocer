// API service for admin panel to communicate with backend
// Reads from VITE_API_URL environment variable
// Expected format: https://warnersgrocer.store/api/v1 (base URL including /api/v1)
type ImportMetaEnv = {
  VITE_API_URL?: string;
  [key: string]: any;
};
const env = (import.meta as unknown as { env: ImportMetaEnv }).env;

// Get API base URL from environment variable
// Clean and normalize the URL
let apiBaseUrl = env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Remove any trailing slashes
apiBaseUrl = apiBaseUrl.trim().replace(/\/+$/, '');

// Validate: ensure it doesn't contain the variable name itself (common .env mistake)
if (apiBaseUrl.includes('VITE_API_URL=') || apiBaseUrl.includes('VITE_API_BASE_URL=')) {
  console.error('Invalid API URL detected in environment variable:', apiBaseUrl);
  apiBaseUrl = 'http://localhost:3000/api/v1';
}

// Ensure the URL is properly formatted
if (!apiBaseUrl.startsWith('http://') && !apiBaseUrl.startsWith('https://')) {
  console.error('API URL must start with http:// or https://:', apiBaseUrl);
  apiBaseUrl = 'http://localhost:3000/api/v1';
}

const API_BASE_URL = apiBaseUrl;
console.log('Admin API Base URL:', API_BASE_URL);

let authToken: string | null = localStorage.getItem('admin_token') || null;

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('admin_token', token);
};

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('admin_token');
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Construct URL: base + endpoint (both normalized)
  const url = `${API_BASE_URL}${normalizedEndpoint}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        clearAuthToken();
        window.location.href = '/login';
        throw new Error('Unauthorized');
      }
      const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
      throw new Error(error.error?.message || 'Request failed');
    }

    return response.json();
  } catch (error: any) {
    // Handle network errors (connection refused, etc.)
    if (error.message.includes('fetch') || error.message.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error(`Cannot connect to backend API. Please ensure the backend server is running on ${API_BASE_URL.replace('/api/v1', '')}. Run "npm run dev" in the backend directory.`);
    }
    throw error;
  }
};

export const adminApi = {
  // Auth
  login: async (email: string, password: string) => {
    const response = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.success && response.data.token) {
      setAuthToken(response.data.token);
      // Check if user is admin
      if (response.data.user.userType !== 'admin') {
        clearAuthToken();
        throw new Error('Access denied. Admin privileges required.');
      }
    }
    
    return response.data;
  },

  logout: () => {
    clearAuthToken();
  },

  getMe: async () => {
    const response = await request('/auth/me');
    if (response.data.userType !== 'admin') {
      throw new Error('Access denied');
    }
    return response.data;
  },

  // Dashboard Stats
  getStats: async () => {
    const response = await request('/admin/stats');
    return response.data;
  },

  // Users
  getUsers: async (params?: { page?: number; limit?: number; search?: string; userType?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.userType) queryParams.append('userType', params.userType);
    if (params?.status) queryParams.append('status', params.status);
    
    const query = queryParams.toString();
    const response = await request(`/admin/users${query ? `?${query}` : ''}`);
    return response.data;
  },

  getUser: async (id: string) => {
    const response = await request(`/admin/users/${id}`);
    return response.data;
  },

  updateUser: async (id: string, data: { isBanned?: boolean; isVerified?: boolean; userType?: string }) => {
    const response = await request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data;
  },

  // Products
  getProducts: async (params?: { page?: number; limit?: number; search?: string; category?: string; isApproved?: boolean; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.isApproved !== undefined) queryParams.append('isApproved', params.isApproved.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    const query = queryParams.toString();
    const response = await request(`/admin/products${query ? `?${query}` : ''}`);
    return response.data;
  },

  approveProduct: async (id: string, isApproved: boolean) => {
    const response = await request(`/admin/products/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ isApproved }),
    });
    return response.data;
  },

  deleteProduct: async (id: string) => {
    const response = await request(`/admin/products/${id}`, {
      method: 'DELETE',
    });
    return response.data;
  },

  // Reviews
  getReviews: async (params?: { page?: number; limit?: number; search?: string; isModerated?: boolean; productId?: string; userId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.isModerated !== undefined) queryParams.append('isModerated', params.isModerated.toString());
    if (params?.productId) queryParams.append('productId', params.productId);
    if (params?.userId) queryParams.append('userId', params.userId);
    
    const query = queryParams.toString();
    const response = await request(`/admin/reviews${query ? `?${query}` : ''}`);
    return response.data;
  },

  moderateReview: async (id: string, isModerated: boolean, moderatorNotes?: string) => {
    const response = await request(`/admin/reviews/${id}/moderate`, {
      method: 'PUT',
      body: JSON.stringify({ isModerated, moderatorNotes }),
    });
    return response.data;
  },

  // Transactions
  getTransactions: async (params?: { page?: number; limit?: number; status?: string; paymentGateway?: string; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.paymentGateway) queryParams.append('paymentGateway', params.paymentGateway);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const query = queryParams.toString();
    const response = await request(`/admin/transactions${query ? `?${query}` : ''}`);
    return response.data;
  },

  // Orders
  getOrders: async (params?: { page?: number; limit?: number; status?: string; paymentStatus?: string; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const query = queryParams.toString();
    const response = await request(`/admin/orders${query ? `?${query}` : ''}`);
    return response.data;
  },

  // Payouts
  getPayouts: async (params?: { page?: number; limit?: number; farmerId?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.farmerId) queryParams.append('farmerId', params.farmerId);
    if (params?.status) queryParams.append('status', params.status);
    
    const query = queryParams.toString();
    const response = await request(`/admin/payouts${query ? `?${query}` : ''}`);
    return response.data;
  },
};

