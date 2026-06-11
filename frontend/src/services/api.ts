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
        const error = await response.json().catch(() => ({}));
        const msg = error.detail || error.message || error.error || `HTTP ${response.status}`;
        throw new Error(msg);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Network error: Unable to reach the server. Check your connection.');
      }
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

  async getActivities(limit: number = 50, eventType?: string) {
    const query = eventType ? `?limit=${limit}&event_type=${eventType}` : `?limit=${limit}`;
    return this.request(`/api/v1/events/activities${query}`);
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

  async getBillingCurrency(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/v1/resources/billing-currency${query}`);
  }

  async getSecurityFindings(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/v1/resources/stats/security${query}`);
  }

  async getAdvisorRecommendations(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/v1/resources/stats/advisor${query}`);
  }

  async getComplianceData(userId?: string) {
    const query = userId ? `?user_id=${userId}` : '';
    return this.request(`/api/v1/resources/stats/compliance${query}`);
  }

  async analyzeWithAI(question: string, context: Record<string, unknown>, userId?: string, azureCreds?: { azure_endpoint?: string; azure_key?: string; azure_deployment?: string; azure_api_version?: string }) {
    return this.request('/api/v1/ai/analyze-tenant', {
      method: 'POST',
      body: JSON.stringify({
        question,
        context,
        user_id: userId,
        ...(azureCreds?.azure_endpoint && azureCreds?.azure_key ? {
          azure_endpoint: azureCreds.azure_endpoint,
          azure_key: azureCreds.azure_key,
          azure_deployment: azureCreds.azure_deployment,
          azure_api_version: azureCreds.azure_api_version,
        } : {}),
      }),
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

  // Intent detection fallback (keyword-based, no AI needed)
  async detectIntent(text: string) {
    return this.request('/api/v1/ai/detect', {
      method: 'POST',
      body: JSON.stringify({ text }),
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
    return this.request(`/api/v1/deployments/resources/query?resourceType=${resourceType}&resourceName=${resourceName}`);
  }

  // Terraform-first deployment endpoints
  async deployPlan(plan: Record<string, unknown>) {
    return this.request('/api/v1/deployments/deploy/plan', {
      method: 'POST',
      body: JSON.stringify(plan),
    });
  }

  async continueDeploy(requestId: string, approved: boolean = true, userId?: string) {
    return this.request('/api/v1/deployments/deploy/continue', {
      method: 'POST',
      body: JSON.stringify({ requestId, approved, userId }),
    });
  }

  async modifyResourceTerraform(data: {
    resourceName: string;
    resourceType: string;
    resourceGroup: string;
    changes: Record<string, any>;
    userId?: string;
  }) {
    return this.request('/api/v1/deployments/modify/terraform', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listPendingDeployments() {
    return this.request('/api/v1/deployments/deploy/pending');
  }

  async getTerraformArtifacts(deploymentId: string) {
    return this.request(`/api/v1/deployments/terraform/${deploymentId}`);
  }

  async listAudits(user?: string) {
    const query = user ? `?user=${user}` : '';
    return this.request(`/api/v1/deployments/audit${query}`);
  }

  // Storage validation
  async validateStorage(data: {
    connectionString?: string;
    containerName?: string;
    storageType?: string;
    accountName?: string;
    accountKey?: string;
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
  }) {
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
    action?: string;
    changes?: Record<string, any>;
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

  // MongoDB deployment state endpoints (additive)
  async mongoListResources(limit = 100, skip = 0) {
    return this.request(`/api/v1/deployments/mongo/resources?limit=${limit}&skip=${skip}`, {
      method: 'POST',
    });
  }

  async mongoFindResource(field: string, value: string) {
    return this.request(`/api/v1/deployments/mongo/resource?field=${encodeURIComponent(field)}&value=${encodeURIComponent(value)}`, {
      method: 'POST',
    });
  }

  async mongoGetDeployment(deploymentId: string) {
    return this.request(`/api/v1/deployments/mongo/resource/${deploymentId}`, {
      method: 'POST',
    });
  }

  async mongoSaveDeployment(data: Record<string, unknown>) {
    return this.request('/api/v1/deployments/mongo/save', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async mongoUpdateDeployment(deploymentId: string, data: Record<string, unknown>) {
    return this.request(`/api/v1/deployments/mongo/update/${deploymentId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async mongoDeleteDeployment(deploymentId: string) {
    return this.request(`/api/v1/deployments/mongo/delete/${deploymentId}`, {
      method: 'POST',
    });
  }

  async mongoDeploymentStats() {
    return this.request('/api/v1/deployments/mongo/stats', {
      method: 'POST',
    });
  }

  // HuggingFace / AI Settings endpoints
  async getHuggingFaceConfig() {
    return this.request('/api/v1/settings/ai/huggingface');
  }

  async saveHuggingFaceConfig(data: {
    api_key: string;
    model?: string;
    endpoint?: string;
    provider?: string;
  }) {
    return this.request('/api/v1/settings/ai/huggingface', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async clearHuggingFaceConfig() {
    return this.request('/api/v1/settings/ai/huggingface', {
      method: 'DELETE',
    });
  }

  async testHuggingFace() {
    return this.request('/api/v1/settings/ai/huggingface/test', {
      method: 'POST',
    });
  }

  // ServiceNow Settings endpoints
  async getServiceNowConfig() {
    return this.request('/api/v1/settings/servicenow/servicenow');
  }

  async saveServiceNowConfig(data: {
    instance_url: string;
    username: string;
    password?: string;
    api_token?: string;
    assignment_group?: string;
  }) {
    return this.request('/api/v1/settings/servicenow/servicenow', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async clearServiceNowConfig() {
    return this.request('/api/v1/settings/servicenow/servicenow', {
      method: 'DELETE',
    });
  }

  async testServiceNow(data: {
    instance_url: string;
    username: string;
    password: string;
  }) {
    return this.request('/api/v1/settings/servicenow/servicenow/test', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ServiceNow Auto-Created Tickets endpoints
  async getServiceNowTickets(params?: { limit?: number; skip?: number; sync_status?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.skip) query.set('skip', String(params.skip));
    if (params?.sync_status) query.set('sync_status', params.sync_status);
    const qs = query.toString();
    return this.request(`/api/v1/servicenow/tickets${qs ? `?${qs}` : ''}`);
  }

  async getServiceNowTicketStats() {
    return this.request('/api/v1/servicenow/tickets/stats');
  }

  async retryServiceNowTicket(deploymentId: string) {
    return this.request(`/api/v1/servicenow/tickets/${deploymentId}/retry`, {
      method: 'POST',
    });
  }

  // InfraMini / Orchestrator endpoints
  async validateUser(name: string) {
    return this.request('/api/v1/ai/orchestrator/validate-user', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async inframiniChat(message: string, userId?: string, conversationContext?: Record<string, unknown>) {
    return this.request('/api/v1/ai/orchestrator/chat', {
      method: 'POST',
      body: JSON.stringify({ message, user_id: userId || 'default', conversation_context: conversationContext }),
    });
  }

  async getOrchestratorStatus() {
    return this.request('/api/v1/ai/orchestrator/status');
  }

  async getTenantSnapshot(userId?: string) {
    return this.request(`/api/v1/ai/orchestrator/tenant-snapshot?user_id=${userId || 'default'}`, {
      method: 'POST',
    });
  }

  async getRecommendations(category?: string, limit = 10) {
    return this.request('/api/v1/ai/orchestrator/recommendations', {
      method: 'POST',
      body: JSON.stringify({ category, limit }),
    });
  }

  async getCredits(userId?: string) {
    return this.request(`/api/v1/ai/orchestrator/credits?user_id=${userId || 'default'}`);
  }

  async deductCredit(userId?: string) {
    return this.request('/api/v1/ai/orchestrator/deduct-credit', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId || 'default' }),
    });
  }

  // Troubleshoot endpoints
  async analyzeTroubleshootIssue(data: {
    issue_title: string;
    issue_resource: string;
    issue_source: string;
    context?: Record<string, unknown>;
    user_id?: string;
  }) {
    return this.request('/api/v1/troubleshoot/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async executeTroubleshootPlan(data: {
    plan_id: string;
    user_id?: string;
  }) {
    return this.request('/api/v1/troubleshoot/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTroubleshootPlanStatus(planId: string) {
    return this.request(`/api/v1/troubleshoot/plan/${planId}`);
  }

  // Provisioning Agent endpoints (backend-driven AI conversation)
  async provisioningAgentChat(sessionId: string | null, message: string, userId?: string) {
    return this.request('/api/v1/provisioning/agent/chat', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, message, user_id: userId || 'default' }),
    });
  }

  async approveDeployment(sessionId: string, userId?: string) {
    return this.request('/api/v1/provisioning/agent/approve', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, user_id: userId || 'default' }),
    });
  }

  async rejectDeployment(sessionId: string, userId?: string) {
    return this.request('/api/v1/provisioning/agent/reject', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, user_id: userId || 'default' }),
    });
  }

  async getProvisioningSession(sessionId: string) {
    return this.request(`/api/v1/provisioning/agent/session/${sessionId}`);
  }

  async getProvisioningDeployments(status?: string, limit?: number) {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (limit) params.set('limit', String(limit));
    const qs = params.toString();
    return this.request(`/api/v1/provisioning/agent/deployments${qs ? `?${qs}` : ''}`);
  }

  async getProvisioningStats() {
    return this.request('/api/v1/provisioning/agent/deployments/stats');
  }

  async listProvisioningResources(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/api/v1/provisioning/agent/resources${params}`);
  }

  // Migration endpoints
  async executeMigration(data: {
    migration_type: string;
    details: Record<string, any>;
    user_id?: string;
    target_region?: string;
    resource_group?: string;
  }) {
    return this.request('/api/v1/migration/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMigrationStatus(migrationId: string) {
    return this.request(`/api/v1/migration/status/${migrationId}`);
  }

  async listMigrationTypes() {
    return this.request('/api/v1/migration/types');
  }
}

export const apiService = new ApiService();
