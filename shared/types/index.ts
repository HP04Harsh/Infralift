// Shared types for Infralift platform

export interface AzureSetupStep {
  id: string;
  title: string;
  description: string;
  command?: string;
  isCompleted: boolean;
  isVerified: boolean;
}

export interface OnboardingSession {
  userId: string;
  currentStep: number;
  completedSteps: number[];
  completedCards: Record<string, boolean>;
  verifiedCards: Record<string, boolean>;
  progress: number;
  tenantId?: string;
  subscriptionId?: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface VerificationRequest {
  stepId: string;
  cardId: string;
  command: string;
  userId: string;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  timestamp: Date;
}

export interface TenantConnection {
  tenantId: string;
  subscriptionId: string;
  displayName: string;
  state: string;
}

export interface ResourceSync {
  totalResources: number;
  syncedResources: number;
  failedResources: number;
  progress: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  resources: Resource[];
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  location: string;
  status: string;
}

export interface Requirement {
  id: string;
  name: string;
  status: 'completed' | 'warning' | 'pending';
  description: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}
