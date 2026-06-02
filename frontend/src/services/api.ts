const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string, fullName: string, company?: string) {
    return this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, company }),
    });
  }

  async logout() {
    return this.request('/api/v1/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    return this.request('/api/v1/auth/me');
  }

  // Onboarding endpoints
  async verifyAssignment(data: {
    step_id: string;
    card_id: string;
    command: string;
    user_id: string;
  }) {
    return this.request('/api/v1/onboarding/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async connectTenant(data: {
    tenant_id: string;
    subscription_id: string;
    user_id: string;
  }) {
    return this.request('/api/v1/onboarding/connect-tenant', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSyncStatus(userId: string) {
    return this.request(`/api/v1/onboarding/sync-status/${userId}`);
  }

  async startSync(userId: string) {
    return this.request(`/api/v1/onboarding/start-sync/${userId}`, {
      method: 'POST',
    });
  }

  async completeStep(step: number, userId: string) {
    return this.request('/api/v1/onboarding/complete-step', {
      method: 'POST',
      body: JSON.stringify({ step, user_id: userId }),
    });
  }

  async getSession(userId: string) {
    return this.request(`/api/v1/onboarding/session/${userId}`);
  }

  // Resources endpoints
  async listResources(params?: {
    skip?: number;
    limit?: number;
    resource_type?: string;
    location?: string;
  }) {
    const queryString = new URLSearchParams(
      params as Record<string, string>
    ).toString();
    return this.request(`/api/v1/resources/?${queryString}`);
  }

  async getResource(resourceId: string) {
    return this.request(`/api/v1/resources/${resourceId}`);
  }

  async getResourceStats() {
    return this.request('/api/v1/resources/stats/summary');
  }
}

export const apiService = new ApiService();
