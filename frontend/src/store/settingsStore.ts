import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GeneralSettings {
  portalName: string;
  organizationName: string;
  timezone: string;
  language: string;
  dateFormat: string;
}

export interface CustomizationSettings {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  font: 'inter' | 'poppins' | 'manrope' | 'sora';
  glassmorphismEnabled: boolean;
  compactMode: boolean;
  borderRadius: number;
}

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  emailAlerts: boolean;
  deploymentAlerts: boolean;
  criticalAlerts: boolean;
  tenantSyncAlerts: boolean;
}

export interface SecuritySettings {
  sessionTimeout: string;
  mfaEnabled: boolean;
}

export interface AppearanceSettings {
  darkMode: boolean;
  transparencyLevel: number;
  animationIntensity: 'low' | 'medium' | 'high';
  compactSidebar: boolean;
}

export interface AgentSettings {
  openaiApiKey: string;
  azureEndpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  automationEnabled: boolean;
  retryLogic: boolean;
  timeout: number;
}

export interface SettingsState {
  general: GeneralSettings;
  customization: CustomizationSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  appearance: AppearanceSettings;
  agents: {
    provisioning: AgentSettings;
    assessment: AgentSettings;
    migration: AgentSettings;
    observability: AgentSettings;
    optimization: AgentSettings;
    troubleshoot: AgentSettings;
    itsm: AgentSettings;
    compliance: AgentSettings;
  };
  
  // Actions
  updateGeneral: (settings: Partial<GeneralSettings>) => void;
  updateCustomization: (settings: Partial<CustomizationSettings>) => void;
  updateNotifications: (settings: Partial<NotificationSettings>) => void;
  updateSecurity: (settings: Partial<SecuritySettings>) => void;
  updateAppearance: (settings: Partial<AppearanceSettings>) => void;
  updateAgentSettings: (agent: keyof SettingsState['agents'], settings: Partial<AgentSettings>) => void;
  resetSettings: () => void;
}

const defaultGeneralSettings: GeneralSettings = {
  portalName: 'Infralift',
  organizationName: 'Infralift LLP',
  timezone: 'Asia/Kolkata',
  language: 'en',
  dateFormat: 'DD/MM/YYYY',
};

const defaultCustomizationSettings: CustomizationSettings = {
  logoUrl: null,
  primaryColor: '#0078d4',
  accentColor: '#8b5cf6',
  font: 'inter',
  glassmorphismEnabled: true,
  compactMode: false,
  borderRadius: 8,
};

const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  soundEnabled: true,
  emailAlerts: true,
  deploymentAlerts: false,
  criticalAlerts: false,
  tenantSyncAlerts: false,
};

const defaultSecuritySettings: SecuritySettings = {
  sessionTimeout: '24h',
  mfaEnabled: false,
};

const defaultAppearanceSettings: AppearanceSettings = {
  darkMode: false,
  transparencyLevel: 50,
  animationIntensity: 'medium',
  compactSidebar: false,
};

const defaultAgentSettings: AgentSettings = {
  openaiApiKey: '',
  azureEndpoint: '',
  model: 'gpt-4',
  temperature: 0.7,
  maxTokens: 2000,
  automationEnabled: true,
  retryLogic: true,
  timeout: 30000,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      general: defaultGeneralSettings,
      customization: defaultCustomizationSettings,
      notifications: defaultNotificationSettings,
      security: defaultSecuritySettings,
      appearance: defaultAppearanceSettings,
      agents: {
        provisioning: defaultAgentSettings,
        assessment: defaultAgentSettings,
        migration: defaultAgentSettings,
        observability: defaultAgentSettings,
        optimization: defaultAgentSettings,
        troubleshoot: defaultAgentSettings,
        itsm: defaultAgentSettings,
        compliance: defaultAgentSettings,
      },

      updateGeneral: (settings) =>
        set((state) => ({
          general: { ...state.general, ...settings },
        })),

      updateCustomization: (settings) =>
        set((state) => ({
          customization: { ...state.customization, ...settings },
        })),

      updateNotifications: (settings) =>
        set((state) => ({
          notifications: { ...state.notifications, ...settings },
        })),

      updateSecurity: (settings) =>
        set((state) => ({
          security: { ...state.security, ...settings },
        })),

      updateAppearance: (settings) =>
        set((state) => ({
          appearance: { ...state.appearance, ...settings },
        })),

      updateAgentSettings: (agent, settings) =>
        set((state) => ({
          agents: {
            ...state.agents,
            [agent]: { ...state.agents[agent], ...settings },
          },
        })),

      resetSettings: () =>
        set({
          general: defaultGeneralSettings,
          customization: defaultCustomizationSettings,
          notifications: defaultNotificationSettings,
          security: defaultSecuritySettings,
          appearance: defaultAppearanceSettings,
          agents: {
            provisioning: defaultAgentSettings,
            assessment: defaultAgentSettings,
            migration: defaultAgentSettings,
            observability: defaultAgentSettings,
            optimization: defaultAgentSettings,
            troubleshoot: defaultAgentSettings,
            itsm: defaultAgentSettings,
            compliance: defaultAgentSettings,
          },
        }),
    }),
    {
      name: 'infralift-settings-storage',
    }
  )
);