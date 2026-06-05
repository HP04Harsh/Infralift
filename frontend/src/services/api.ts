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
    client_id: string;
    client_secret: string;
    tenant_id: string;
    subscription_id: string;
    environment_name: string;
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

  async getResourceStats(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/v1/resources/stats/summary${query}`);
  }

  async getResourceMetrics(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/v1/resources/stats/metrics${query}`);
  }

  async getResourceCosts(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/v1/resources/stats/costs${query}`);
  }

  async getSecurityFindings(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/v1/resources/stats/security${query}`);
  }

  async getAdvisorRecommendations(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/v1/resources/stats/advisor${query}`);
  }

  async analyzeWithAI(question: string, context: Record<string, unknown>, userId?: string) {
    return this.request('/api/v1/ai/analyze-tenant', {
      method: 'POST',
      body: JSON.stringify({ question, context, user_id: userId }),
    });
  }

  // ITSM endpoints
  async createProblemTicket(data: { title: string; description: string; assigned_to: string }) {
    return this.request('/api/v1/itsm/problem', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTickets(params?: { type?: string; status?: string; limit?: number }) {
    const queryString = new URLSearchParams(
      (params || {}) as Record<string, string>
    ).toString();
    return this.request(`/api/v1/itsm/tickets${queryString ? `?${queryString}` : ''}`);
  }

  async getTicket(ticketId: string) {
    return this.request(`/api/v1/itsm/tickets/${ticketId}`);
  }

  // Azure OpenAI validation
  async validateAzureOpenAI(data: { endpoint: string; api_key: string; deployment: string; api_version: string }) {
    return this.request('/api/v1/ai/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // AI Chat with activity timeline (supports per-request Azure OpenAI credentials)
  async aiChat(data: {
    message: string;
    agent_type: string;
    user_id?: string;
    conversation_context?: Record<string, unknown>;
    azure_endpoint?: string;
    azure_key?: string;
    azure_deployment?: string;
    azure_api_version?: string;
  }) {
    return this.request('/api/v1/ai/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Deployment endpoints
  async deployResource(plan: Record<string, unknown>) {
    return this.request('/api/v1/deployments/deploy', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  async listResourceStates() {
    return this.request('/api/v1/deployments/resources');
  }

  async getDeployments() {
    return this.request('/api/v1/deployments/resources');
  }

  async getDeployment(id: string) {
    return this.request(`/api/v1/deployments/resources/${id}`);
  }

  async findResource(resourceType: string, resourceName: string) {
    return this.request(`/api/v1/deployments/resources/query?resource_type=${resourceType}&resource_name=${resourceName}`);
  }

  async getTerraformArtifacts(deploymentId: string) {
    return this.request(`/api/v1/deployments/terraform/${deploymentId}`);
  }

  async listAudits(user?: string) {
    const query = user ? `?user=${user}` : '';
    return this.request(`/api/v1/deployments/audit${query}`);
  }

  // Storage validation
  async validateStorage(data: { connectionString: string; containerName: string }) {
    return this.request('/api/v1/deployments/storage/validate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Resource modification
  async modifyResource(data: {
    resourceId: string;
    resourceGroup: string;
    resourceName: string;
    resourceType: string;
    changes: Record<string, unknown>;
    userId?: string;
  }) {
    return this.request('/api/v1/deployments/modify', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Assessment endpoints
  async getAssessments() {
    return this.request('/api/v1/assessments');
  }
}

export const apiService = new ApiService();
