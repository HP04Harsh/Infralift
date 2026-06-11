"use client";

import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Header } from "@/components/layout/Header";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings as SettingsIcon, 
  LayoutDashboard as LayoutDashboardIcon, 
  Palette, 
  Bot, 
  Database, 
  Bell, 
  Shield, 
  Sun,
  Moon,
  Users,
  Info,
  Key,
  Check,
  X,
  Mail,
  Smartphone,
  ExternalLink,
  Activity,
  Eye,
  EyeOff,
  Monitor,
  Globe,
  Clock,
  CheckCircle,
  Loader,
  AlertCircle,
  Brain,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
import { useThemeStore } from "@/store/themeStore";
import { useTenantDataStore } from "@/store/tenantDataStore";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", INR: "₹", EUR: "€", GBP: "£", AED: "د.إ",
  JPY: "¥", CAD: "C$", AUD: "A$", BRL: "R$", SGD: "S$",
  HKD: "HK$", KRW: "₩", CHF: "Fr",
};
import { UserManagement } from "@/components/settings/UserManagement";
import { InfrastructureStorageSection } from "@/components/settings/InfrastructureStorageSection";
import { apiService } from "@/services/api";


type SettingsSection = 
  | "general" 
  | "customization" 
  | "agents" 
  | "infrastructure" 
  | "redis" 
  | "notifications" 
  | "security" 
  | "appearance" 
  | "users"
  | "ai"
  | "servicenow";

interface SettingsNavItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
}

const settingsNavItems: SettingsNavItem[] = [
  { id: "general", label: "General", icon: <LayoutDashboardIcon className="h-4 w-4" /> },
  { id: "customization", label: "Portal Customization", icon: <Palette className="h-4 w-4" /> },
  { id: "agents", label: "Agent Settings", icon: <Bot className="h-4 w-4" /> },
  { id: "ai", label: "AI Provider", icon: <Brain className="h-4 w-4" /> },
  { id: "servicenow", label: "ServiceNow", icon: <ExternalLink className="h-4 w-4" /> },
  { id: "infrastructure", label: "Infrastructure State Storage", icon: <Database className="h-4 w-4" /> },
  { id: "redis", label: "Redis & Cache", icon: <Database className="h-4 w-4" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
  { id: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
  { id: "appearance", label: "Appearance", icon: <Sun className="h-4 w-4" /> },
  { id: "users", label: "User Management", icon: <Users className="h-4 w-4" /> },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [hasChanges, setHasChanges] = useState(false);
  const [showClearCacheConfirm, setShowClearCacheConfirm] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [tempEmail, setTempEmail] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [connectionVerified, setConnectionVerified] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("compliance");
  const [tempAgentEndpoint, setTempAgentEndpoint] = useState("");
  const [tempAgentKey, setTempAgentKey] = useState("");
  const [tempAgentDeployment, setTempAgentDeployment] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [tempAgentApiVersion, setTempAgentApiVersion] = useState("2024-02-15-preview");
  const [tempMfaPhone, setTempMfaPhone] = useState("");
  const [tempMfaEmail, setTempMfaEmail] = useState("");
  const [showMfaPhone, setShowMfaPhone] = useState(false);
  const [showMfaEmail, setShowMfaEmail] = useState(false);
  // HuggingFace state
  const [hfApiKey, setHfApiKey] = useState("");
  const [hfModel, setHfModel] = useState("google/gemma-3-12b-it");
  const [hfEndpoint, setHfEndpoint] = useState("");
  const [hfConfigured, setHfConfigured] = useState(false);
  const [hfSource, setHfSource] = useState("env");
  const [hfVerifying, setHfVerifying] = useState(false);
  const [hfTestResult, setHfTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hfSaving, setHfSaving] = useState(false);
  // ServiceNow state
  const [snInstanceUrl, setSnInstanceUrl] = useState("");
  const [snUsername, setSnUsername] = useState("");
  const [snPassword, setSnPassword] = useState("");
  const [snAssignmentGroup, setSnAssignmentGroup] = useState("");
  const [snConfigured, setSnConfigured] = useState(false);
  const [snSource, setSnSource] = useState("env");
  const [snVerifying, setSnVerifying] = useState(false);
  const [snTestResult, setSnTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [snSaving, setSnSaving] = useState(false);
  const [showSnPassword, setShowSnPassword] = useState(false);
  // 2FA OTP flow state
  const [otpFlow, setOtpFlow] = useState<'idle' | 'verify_password' | 'choose_method' | 'otp_sent' | 'verified'>('idle');
  const [otpPassword, setOtpPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpMethod, setOtpMethod] = useState<'sms' | 'email'>('sms');
  const [otpError, setOtpError] = useState("");
  // Login activity tracking store
  const [loginActivities, setLoginActivities] = useState<{ type: string; time: string; username: string; browser: string; platform: string; location: string; ip: string }[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('login_activities');
      if (stored) setLoginActivities(JSON.parse(stored));
    } catch {}
  }, [activeSection]);
  // Settings store
  const { 
    general, 
    customization, 
    notifications, 
    security, 
    appearance,
    updateGeneral,
    updateCustomization,
    updateNotifications,
    updateSecurity,
    updateAppearance,
    infrastructureStorage,
    updateInfrastructureStorage
  } = useSettingsStore();

  // Tenant data for usage metrics
  const { resources, costs, advisor: tenantAdvisor, security: tenantSecurity, loading, fetchAll } = useTenantDataStore();
  useEffect(() => {
    if (loading) fetchAll();
  }, [loading, fetchAll]);

  const usageMetrics = useMemo(() => {
    const resourceCount = resources?.length ?? 0;
    const recCount = tenantAdvisor?.recommendations?.length ?? 0;
    const alertCount = tenantSecurity?.alerts?.length ?? 0;
    const requests = resourceCount + recCount + alertCount || 0;
    const tokens = (resourceCount * 80 + recCount * 200 + alertCount * 150) || 0;
    const cost = costs?.month_to_date;
    const currency = costs?.currency || "USD";
    const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
    return { requests, tokens, cost, currency, symbol };
  }, [resources, costs, tenantAdvisor, tenantSecurity]);

  // Temporary state for form values
  const [tempGeneral, setTempGeneral] = useState(general);
  const [tempCustomization, setTempCustomization] = useState(customization);
  const [tempNotifications, setTempNotifications] = useState(notifications);
  const [tempSecurity, setTempSecurity] = useState(security);
  const [tempAppearance, setTempAppearance] = useState(appearance);

  // Load agent settings from store when selected agent changes
  useEffect(() => {
    const state = useSettingsStore.getState();
    const keys = Object.keys(state.agents);
    if (keys.includes(selectedAgent)) {
      const agent = (state.agents as any)[selectedAgent];
      setTempAgentEndpoint(agent.azureEndpoint || "");
      setTempAgentKey(agent.openaiApiKey || "");
      setTempAgentDeployment(agent.model || "");
      setTempAgentApiVersion(agent.apiVersion || "2024-02-15-preview");
    }
  }, [selectedAgent]);

  // Sync temporary state with store when section changes
  useEffect(() => {
    setTempGeneral(general);
    setTempCustomization(customization);
    setTempNotifications(notifications);
    setTempSecurity(security);
    setTempAppearance(appearance);
    setHasChanges(false);
    setLogoPreview(customization.logoUrl);
  }, [activeSection, general, customization, notifications, security, appearance]);

  // Apply appearance CSS variables (preview-only; persisted by providers.tsx)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', tempCustomization.primaryColor);
    root.style.setProperty('--accent-color', tempCustomization.accentColor);
    root.style.setProperty('--border-radius', `${tempCustomization.borderRadius}px`);
    root.setAttribute('data-glassmorphism', String(tempCustomization.glassmorphismEnabled));
    root.setAttribute('data-compact', String(tempCustomization.compactMode));
    const intensityMap = { low: 0.25, medium: 0.5, high: 0.75 };
    root.style.setProperty('--ui-opacity', String(tempAppearance.transparencyLevel / 100));
    root.style.setProperty('--sidebar-width', tempAppearance.compactSidebar ? '16rem' : '18rem');
    root.style.setProperty('--anim-intensity', String(intensityMap[tempAppearance.animationIntensity]));
  }, [tempCustomization, tempAppearance]);

  // Load HuggingFace config when AI section is active
  useEffect(() => {
    if (activeSection === "ai") {
      (async () => {
        try {
          const res: any = await apiService.getHuggingFaceConfig();
          setHfConfigured(res.configured);
          setHfSource(res.source || "env");
          setHfModel(res.model || "google/gemma-3-12b-it");
          setHfEndpoint(res.endpoint || "");
        } catch {
          setHfConfigured(false);
        }
      })();
    }
  }, [activeSection]);

  // Load ServiceNow config when ServiceNow section is active
  useEffect(() => {
    if (activeSection === "servicenow") {
      (async () => {
        try {
          const res: any = await apiService.getServiceNowConfig();
          setSnConfigured(res.configured);
          setSnSource(res.source || "env");
          setSnInstanceUrl(res.instance_url || "");
          setSnUsername(res.username || "");
          setSnAssignmentGroup(res.assignment_group || "");
        } catch {
          setSnConfigured(false);
        }
      })();
    }
  }, [activeSection]);

  const { theme: currentTheme, setTheme } = useThemeStore();

  const handleSave = () => {
    // Save all temporary states to store
    updateGeneral(tempGeneral);
    updateCustomization(tempCustomization);
    updateNotifications(tempNotifications);
    updateSecurity(tempSecurity);
    updateAppearance(tempAppearance);
    setHasChanges(false);

    // Sync theme to themeStore
    if (tempAppearance.theme !== currentTheme) {
      setTheme(tempAppearance.theme);
    }
    
    // Show success message (could be enhanced with toast)
    console.log('Settings saved successfully');
  };

  const handleDiscard = () => {
    // Reset temporary states to current store values
    setTempGeneral(general);
    setTempCustomization(customization);
    setTempNotifications(notifications);
    setTempSecurity(security);
    setTempAppearance(appearance);
    setHasChanges(false);
    setLogoPreview(customization.logoUrl);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove white background by processing via canvas
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i], g = data[i+1], b = data[i+2];
              if (r > 240 && g > 240 && b > 240) {
                data[i+3] = 0;
              }
            }
            ctx.putImageData(imageData, 0, 0);
            const processed = canvas.toDataURL('image/png');
            setLogoPreview(processed);
            setTempCustomization(prev => ({ ...prev, logoUrl: processed }));
            setHasChanges(true);
          }
        };
        img.src = base64String;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setTempCustomization(prev => ({ ...prev, logoUrl: null }));
    setHasChanges(true);
  };

  const handleClearCache = () => {
    setShowClearCacheConfirm(true);
  };

  const confirmClearCache = () => {
    // Clear all localStorage data
    localStorage.clear();
    
    // Navigate to landing page
    window.location.href = '/landing';
  };

  const cancelClearCache = () => {
    setShowClearCacheConfirm(false);
  };

  const handleFieldChange = (
    section: 'general' | 'customization' | 'notifications' | 'security' | 'appearance',
    field: string,
    value: any
  ) => {
    setHasChanges(true);
    
    switch (section) {
      case 'general':
        setTempGeneral(prev => ({ ...prev, [field]: value }));
        break;
      case 'customization':
        setTempCustomization(prev => ({ ...prev, [field]: value }));
        break;
      case 'notifications':
        setTempNotifications(prev => ({ ...prev, [field]: value }));
        break;
      case 'security':
        setTempSecurity(prev => ({ ...prev, [field]: value }));
        break;
      case 'appearance':
        setTempAppearance(prev => ({ ...prev, [field]: value }));
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex">
      <Sidebar />
      
      <div className="flex-1 lg:ml-[240px] transition-all">
        <Header showLiveIndicator />
        
        <main className="p-4 lg:p-5">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    Settings
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Manage your portal configuration and preferences
                  </p>
                </div>
                {hasChanges && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDiscard}
                      className="h-8"
                    >
                      Discard
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      className="h-8 bg-azure-500 hover:bg-azure-600"
                    >
                      Save Changes
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Settings Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Navigation */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-2"
                >
                  <nav className="space-y-1">
                    {settingsNavItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                          activeSection === item.id
                            ? "bg-azure-50 dark:bg-azure-900/20 text-azure-600 dark:text-azure-400"
                            : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700"
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </nav>
                </motion.div>
              </div>

              {/* Right Content Panel */}
              <div className="lg:col-span-3">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
                >
                  {activeSection === "general" && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        General Settings
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                        Configure basic portal information and preferences
                      </p>
                      {/* General settings form will go here */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Portal Name
                          </label>
                          <input
                            type="text"
                            value={tempGeneral.portalName}
                            onChange={(e) => handleFieldChange('general', 'portalName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Organization Name
                          </label>
                          <input
                            type="text"
                            value={tempGeneral.organizationName}
                            onChange={(e) => handleFieldChange('general', 'organizationName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Timezone
                          </label>
                          <select
                            value={tempGeneral.timezone}
                            onChange={(e) => handleFieldChange('general', 'timezone', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                          >
                            <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                            <option value="America/New_York">America/New_York (EST)</option>
                            <option value="Europe/London">Europe/London (GMT)</option>
                            <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Language
                          </label>
                          <select
                            value={tempGeneral.language}
                            onChange={(e) => handleFieldChange('general', 'language', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                          >
                            <option value="en">English</option>
                            <option value="hi">Hindi</option>
                            <option value="es">Spanish</option>
                            <option value="fr">French</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Date Format
                          </label>
                          <select
                            value={tempGeneral.dateFormat}
                            onChange={(e) => handleFieldChange('general', 'dateFormat', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                          >
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "customization" && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Portal Customization
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                        Customize the look and feel of your portal
                      </p>
                      {/* Portal customization form will go here */}
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Portal Logo
                          </label>
                          <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-6 text-center">
                            {logoPreview ? (
                              <div className="mb-4">
                                <img 
                                  src={logoPreview} 
                                  alt="Logo preview" 
                                  className="w-20 h-20 object-contain mx-auto"
                                />
                              </div>
                            ) : (
                              <div className="mb-4">
                                <SettingsIcon className="h-8 w-8 mx-auto text-gray-400" />
                              </div>
                            )}
                            <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                              {logoPreview ? 'Logo uploaded successfully' : 'Drag and drop your logo here'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">
                              Recommended: 256x256 PNG with transparent background
                            </p>
                            <div className="flex gap-2 justify-center">
                              <input
                                type="file"
                                id="logo-upload"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                              />
                              <label htmlFor="logo-upload">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="cursor-pointer"
                                  asChild
                                >
                                  <span>Browse Files</span>
                                </Button>
                              </label>
                              {logoPreview && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleRemoveLogo}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Primary Theme Color
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={tempCustomization.primaryColor}
                              onChange={(e) => handleFieldChange('customization', 'primaryColor', e.target.value)}
                              className="h-10 w-10 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={tempCustomization.primaryColor}
                              onChange={(e) => handleFieldChange('customization', 'primaryColor', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Accent Color
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="color"
                              value={tempCustomization.accentColor}
                              onChange={(e) => handleFieldChange('customization', 'accentColor', e.target.value)}
                              className="h-10 w-10 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              value={tempCustomization.accentColor}
                              onChange={(e) => handleFieldChange('customization', 'accentColor', e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Font
                          </label>
                          <select
                            value={tempCustomization.font}
                            onChange={(e) => handleFieldChange('customization', 'font', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                          >
                            <option value="inter">Inter</option>
                            <option value="poppins">Poppins</option>
                            <option value="manrope">Manrope</option>
                            <option value="sora">Sora</option>
                          </select>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                Glassmorphism Effect
                              </label>
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                Enable glass-like blur effects
                              </p>
                            </div>
                            <button
                              onClick={() => handleFieldChange('customization', 'glassmorphismEnabled', !tempCustomization.glassmorphismEnabled)}
                              className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                tempCustomization.glassmorphismEnabled ? "bg-azure-500" : "bg-gray-300 dark:bg-slate-600"
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                  tempCustomization.glassmorphismEnabled ? "translate-x-6" : "translate-x-1"
                                )}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                Compact Mode
                              </label>
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                Reduce spacing for more content
                              </p>
                            </div>
                            <button
                              onClick={() => handleFieldChange('customization', 'compactMode', !tempCustomization.compactMode)}
                              className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                tempCustomization.compactMode ? "bg-azure-500" : "bg-gray-300 dark:bg-slate-600"
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                  tempCustomization.compactMode ? "translate-x-6" : "translate-x-1"
                                )}
                              />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Border Radius
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="16"
                            value={tempCustomization.borderRadius}
                            onChange={(e) => handleFieldChange('customization', 'borderRadius', parseInt(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                            <span>Sharp ({tempCustomization.borderRadius}px)</span>
                            <span>Rounded</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "agents" && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Agent Settings
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                            Configure Azure OpenAI for AI agent behavior
                          </p>
                        </div>
                        <button
                          onClick={() => window.open("/portal/setup-guide", "_blank")}
                          className="flex items-center gap-1.5 text-xs text-azure-600 dark:text-azure-400 hover:text-azure-700 dark:hover:text-azure-300 bg-azure-50 dark:bg-azure-900/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Info className="h-3.5 w-3.5" />
                          Setup Guide
                        </button>
                      </div>

                      {/* Agent Selector */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                          Select Agent
                        </label>
                        <select
                          value={selectedAgent}
                          onChange={(e) => setSelectedAgent(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                        >
                          {["provisioning","assessment","migration","observability","optimization","troubleshoot","itsm","compliance"].map(agent => (
                            <option key={agent} value={agent}>
                              {agent.charAt(0).toUpperCase() + agent.slice(1)} Agent
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Azure OpenAI Configuration */}
                      <div className="space-y-4 mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">
                          Azure OpenAI Connection
                        </h4>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Endpoint URL
                          </label>
                          <input
                            type="text"
                            value={tempAgentEndpoint}
                            onChange={(e) => setTempAgentEndpoint(e.target.value)}
                            placeholder="https://your-resource.openai.azure.com"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            API Key
                          </label>
                          <div className="relative">
                            <input
                              type={showKey ? "text" : "password"}
                              value={tempAgentKey}
                              onChange={(e) => setTempAgentKey(e.target.value)}
                              placeholder="sk-... or Azure API key"
                              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                              Deployment Name
                            </label>
                            <input
                              type="text"
                              value={tempAgentDeployment}
                              onChange={(e) => setTempAgentDeployment(e.target.value)}
                              placeholder="gpt-4"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                              API Version
                            </label>
                            <input
                              type="text"
                              value={tempAgentApiVersion}
                              onChange={(e) => setTempAgentApiVersion(e.target.value)}
                              placeholder="2024-02-15-preview"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              setIsVerifying(true);
                              setVerifyError(null);
                              try {
                                const res: any = await apiService.validateAzureOpenAI({
                                  endpoint: tempAgentEndpoint,
                                  api_key: tempAgentKey,
                                  deployment: tempAgentDeployment || "gpt-4",
                                  api_version: tempAgentApiVersion || "2024-02-15-preview",
                                });
                                if (res?.connected) {
                                  setConnectionVerified(true);
                                  setTimeout(() => setConnectionVerified(false), 5000);
                                } else {
                                  setVerifyError(res?.message || "Connection failed");
                                }
                              } catch (e: any) {
                                setVerifyError(e?.message || "Connection failed");
                              } finally {
                                setIsVerifying(false);
                              }
                            }}
                            disabled={!tempAgentKey || !tempAgentEndpoint || isVerifying}
                            className="h-8 text-xs"
                          >
                            {isVerifying ? (
                              <Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {isVerifying ? "Verifying..." : connectionVerified ? "✓ Connected" : "Verify Connection"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const store = useSettingsStore.getState();
                              store.updateAgentSettings(selectedAgent as keyof typeof store.agents, {
                                azureEndpoint: tempAgentEndpoint,
                                openaiApiKey: tempAgentKey,
                                model: tempAgentDeployment,
                                apiVersion: tempAgentApiVersion,
                              });
                              setHasChanges(true);
                            }}
                            disabled={!tempAgentKey || !tempAgentEndpoint}
                            className="h-8 text-xs"
                          >
                            Save Configuration
                          </Button>
                        </div>
                        {verifyError && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            {verifyError}
                          </div>
                        )}
                        {connectionVerified && (
                          <div className="flex items-center gap-2 mt-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg">
                            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
                            Azure OpenAI Connected
                          </div>
                        )}
                      </div>

                      {/* Usage Metrics */}
                      <div className="border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Activity className="h-4 w-4 text-azure-500" />
                          Usage Metrics
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Requests</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{usageMetrics.requests.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Resources + recommendations + alerts</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Tokens</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{usageMetrics.tokens.toLocaleString()}</p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Estimated from synced data volume</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Cost</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {usageMetrics.cost != null
                                ? `${usageMetrics.symbol}${usageMetrics.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : "--"}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">Current month Azure spend</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "infrastructure" && (
                    <InfrastructureStorageSection
                      settings={infrastructureStorage}
                      onUpdate={updateInfrastructureStorage}
                    />
                  )}

                  {activeSection === "ai" && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            AI Provider
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                            Configure HuggingFace as your AI provider. Changes take effect immediately across the entire portal.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            hfConfigured
                              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              hfConfigured ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                            {hfConfigured ? "Active" : "Not Configured"}
                          </span>
                        </div>
                      </div>

                      {/* HuggingFace Configuration */}
                      <div className="space-y-4 mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">
                          HuggingFace Connection
                        </h4>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            API Key <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showKey ? "text" : "password"}
                              value={hfApiKey}
                              onChange={(e) => { setHfApiKey(e.target.value); setHfTestResult(null); }}
                              placeholder="hf_... or your HuggingFace API token"
                              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                            Get your token from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-azure-500 hover:underline">huggingface.co/settings/tokens</a>
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Model
                          </label>
                          <input
                            type="text"
                            value={hfModel}
                            onChange={(e) => { setHfModel(e.target.value); setHfTestResult(null); }}
                            placeholder="google/gemma-3-12b-it"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                          />
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                            Any OpenAI-compatible model on HuggingFace Hub (e.g., google/gemma-3-12b-it, mistralai/Mistral-7B-Instruct)
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Custom Endpoint (optional)
                          </label>
                          <input
                            type="text"
                            value={hfEndpoint}
                            onChange={(e) => { setHfEndpoint(e.target.value); setHfTestResult(null); }}
                            placeholder="https://your-endpoint.hf.space/v1/chat/completions"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                          />
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                            Leave empty to use the HuggingFace Inference API. Set for dedicated Inference Endpoints.
                          </p>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              setHfVerifying(true);
                              setHfTestResult(null);
                              try {
                                if (hfApiKey) {
                                  await apiService.saveHuggingFaceConfig({
                                    api_key: hfApiKey,
                                    model: hfModel || "google/gemma-3-12b-it",
                                    endpoint: hfEndpoint || undefined,
                                  });
                                }
                                const res: any = await apiService.testHuggingFace();
                                setHfTestResult({
                                  success: res.connected,
                                  message: res.message || (res.connected ? "Connected!" : "Connection failed"),
                                });
                              } catch (e: any) {
                                setHfTestResult({ success: false, message: e?.message || "Connection failed" });
                              } finally {
                                setHfVerifying(false);
                              }
                            }}
                            disabled={!hfApiKey || hfVerifying}
                            className="h-8 text-xs"
                          >
                            {hfVerifying ? (
                              <Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {hfVerifying ? "Testing..." : "Test & Activate"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setHfSaving(true);
                              try {
                                await apiService.saveHuggingFaceConfig({
                                  api_key: hfApiKey,
                                  model: hfModel || "google/gemma-3-12b-it",
                                  endpoint: hfEndpoint || undefined,
                                });
                                setHfConfigured(true);
                                setHfSource("redis");
                                setHfTestResult({ success: true, message: "Configuration saved and activated across all agents!" });
                              } catch (e: any) {
                                setHfTestResult({ success: false, message: e?.message || "Save failed" });
                              } finally {
                                setHfSaving(false);
                              }
                            }}
                            disabled={!hfApiKey || hfSaving}
                            className="h-8 text-xs"
                          >
                            {hfSaving ? (
                              <Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Key className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {hfSaving ? "Saving..." : "Save & Activate"}
                          </Button>
                          {hfConfigured && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiService.clearHuggingFaceConfig();
                                  setHfApiKey("");
                                  setHfModel("google/gemma-3-12b-it");
                                  setHfEndpoint("");
                                  setHfConfigured(false);
                                  setHfSource("env");
                                  setHfTestResult({ success: true, message: "Configuration cleared, using env vars" });
                                } catch (e: any) {
                                  setHfTestResult({ success: false, message: e?.message || "Clear failed" });
                                }
                              }}
                              className="h-8 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Clear Config
                            </Button>
                          )}
                        </div>

                        {hfTestResult && (
                          <div className={cn(
                            "flex items-center gap-2 mt-2 text-xs px-3 py-2 rounded-lg",
                            hfTestResult.success
                              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                              : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                          )}>
                            {hfTestResult.success ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                            {hfTestResult.message}
                          </div>
                        )}
                      </div>

                      {/* Status Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Status</p>
                          <p className={cn(
                            "text-sm font-semibold",
                            hfConfigured ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          )}>
                            {hfConfigured ? "Active" : "Inactive"}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Active Model</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate" title={hfModel}>
                            {hfModel || "google/gemma-3-12b-it"}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Source</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                            {hfSource}
                          </p>
                        </div>
                      </div>

                      {/* Info Banner */}
                      <div className="mt-6 bg-azure-50 dark:bg-azure-900/20 border border-azure-200 dark:border-azure-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Brain className="h-5 w-5 text-azure-600 dark:text-azure-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-semibold text-azure-800 dark:text-azure-300 mb-1">
                              How it works
                            </h4>
                            <p className="text-xs text-azure-700 dark:text-azure-400">
                              Your HuggingFace configuration is stored in Redis and applied immediately across all portal services — InfraMini assistant, provisioning, assessment, migration, observability, optimization, troubleshooting, ITSM, and compliance agents. No restart needed. Set <code className="px-1 py-0.5 bg-azure-100 dark:bg-azure-900/40 rounded text-[11px]">AI_PROVIDER=huggingface</code> in your env to make HuggingFace the default.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "servicenow" && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            ServiceNow Configuration
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                            Configure ServiceNow for automatic ticket creation on infrastructure changes. Changes take effect immediately.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            snConfigured
                              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                          )}>
                            <span className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              snConfigured ? "bg-emerald-500" : "bg-amber-500"
                            )} />
                            {snConfigured ? "Configured" : "Not Configured"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 mb-6">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-slate-700 pb-2">
                          ServiceNow Connection
                        </h4>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Instance URL <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={snInstanceUrl}
                            onChange={(e) => { setSnInstanceUrl(e.target.value); setSnTestResult(null); }}
                            placeholder="https://your-instance.service-now.com"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Username <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={snUsername}
                            onChange={(e) => { setSnUsername(e.target.value); setSnTestResult(null); }}
                            placeholder="admin"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Password / API Token <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showSnPassword ? "text" : "password"}
                              value={snPassword}
                              onChange={(e) => { setSnPassword(e.target.value); setSnTestResult(null); }}
                              placeholder="••••••••••••••••"
                              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSnPassword(!showSnPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                              {showSnPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Assignment Group (optional)
                          </label>
                          <input
                            type="text"
                            value={snAssignmentGroup}
                            onChange={(e) => { setSnAssignmentGroup(e.target.value); setSnTestResult(null); }}
                            placeholder="Infrastructure Team"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                          />
                          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                            ServiceNow group to assign tickets to. Default: Infrastructure Team
                          </p>
                        </div>

                        <div className="flex items-center gap-3 pt-2">
                          <Button
                            size="sm"
                            onClick={async () => {
                              setSnVerifying(true);
                              setSnTestResult(null);
                              try {
                                const res: any = await apiService.testServiceNow({
                                  instance_url: snInstanceUrl,
                                  username: snUsername,
                                  password: snPassword,
                                });
                                setSnTestResult({
                                  success: res.connected,
                                  message: res.message || (res.connected ? "Connected to ServiceNow!" : "Connection failed"),
                                });
                              } catch (e: any) {
                                setSnTestResult({ success: false, message: e?.message || "Connection failed" });
                              } finally {
                                setSnVerifying(false);
                              }
                            }}
                            disabled={!snInstanceUrl || !snUsername || !snPassword || snVerifying}
                            className="h-8 text-xs"
                          >
                            {snVerifying ? (
                              <Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Activity className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {snVerifying ? "Testing..." : "Test Connection"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              setSnSaving(true);
                              try {
                                await apiService.saveServiceNowConfig({
                                  instance_url: snInstanceUrl,
                                  username: snUsername,
                                  password: snPassword,
                                  assignment_group: snAssignmentGroup,
                                });
                                setSnConfigured(true);
                                setSnSource("redis");
                                setSnTestResult({ success: true, message: "ServiceNow configuration saved and activated!" });
                              } catch (e: any) {
                                setSnTestResult({ success: false, message: e?.message || "Save failed" });
                              } finally {
                                setSnSaving(false);
                              }
                            }}
                            disabled={!snInstanceUrl || !snUsername || !snPassword || snSaving}
                            className="h-8 text-xs"
                          >
                            {snSaving ? (
                              <Loader className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : (
                              <Key className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {snSaving ? "Saving..." : "Save & Activate"}
                          </Button>
                          {snConfigured && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiService.clearServiceNowConfig();
                                  setSnInstanceUrl("");
                                  setSnUsername("");
                                  setSnPassword("");
                                  setSnAssignmentGroup("");
                                  setSnConfigured(false);
                                  setSnSource("env");
                                  setSnTestResult({ success: true, message: "Configuration cleared" });
                                } catch (e: any) {
                                  setSnTestResult({ success: false, message: e?.message || "Clear failed" });
                                }
                              }}
                              className="h-8 text-xs text-red-600 border-red-300 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                              Clear Config
                            </Button>
                          )}
                        </div>

                        {snTestResult && (
                          <div className={cn(
                            "flex items-center gap-2 mt-2 text-xs px-3 py-2 rounded-lg",
                            snTestResult.success
                              ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                              : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
                          )}>
                            {snTestResult.success ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                            {snTestResult.message}
                          </div>
                        )}
                      </div>

                      {/* Status Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Status</p>
                          <p className={cn(
                            "text-sm font-semibold",
                            snConfigured ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          )}>
                            {snConfigured ? "Configured" : "Not Configured"}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Source</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                            {snSource}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Assignment Group</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {snAssignmentGroup || "Default Group"}
                          </p>
                        </div>
                      </div>

                      {/* Info Banner */}
                      <div className="mt-6 bg-azure-50 dark:bg-azure-900/20 border border-azure-200 dark:border-azure-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <ExternalLink className="h-5 w-5 text-azure-600 dark:text-azure-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-semibold text-azure-800 dark:text-azure-300 mb-1">
                              Automatic ticket creation
                            </h4>
                            <p className="text-xs text-azure-700 dark:text-azure-400">
                              Once configured, InfraLift automatically creates ServiceNow Change Requests for all infrastructure actions (create, modify, delete). Deployment failures generate Incidents. Tickets are created asynchronously — deployment performance is not affected. View auto-created tickets in the ITSM page.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "redis" && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Redis & Cache
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                        Monitor cache performance and clear cached data
                      </p>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Status</p>
                            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Connected</p>
                          </div>
                          <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4">
                            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Memory Usage</p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">128 MB</p>
                          </div>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Database className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
                                Clear Cache
                              </h4>
                              <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                                This will clear onboarding state, persisted UI cache, and redirect to onboarding. You will need to complete onboarding again.
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearCache}
                                className="border-amber-600 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30"
                              >
                                Clear All Cache
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "notifications" && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Notifications Settings
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                        Configure notification preferences and alerts
                      </p>
                      <div className="space-y-3">
                        {[
                          { key: "enabled", label: "Enable Notifications", desc: "Receive in-app notifications" },
                          { key: "soundEnabled", label: "Sound Alerts", desc: "Play sound for new notifications" },
                          { key: "emailAlerts", label: "Email Alerts", desc: "Receive critical alerts via email" },
                          { key: "deploymentAlerts", label: "Deployment Alerts", desc: "Get notified about deployments" },
                          { key: "criticalAlerts", label: "Critical Alerts", desc: "High priority system alerts" },
                          { key: "tenantSyncAlerts", label: "Tenant Sync Alerts", desc: "Tenant synchronization status" },
                        ].map((item) => {
                          const isOn = tempNotifications[item.key as keyof typeof tempNotifications] as boolean;
                          return (
                            <div key={item.key} className="flex items-center justify-between py-2">
                              <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                  {item.label}
                                </label>
                                <p className="text-xs text-gray-500 dark:text-slate-400">
                                  {item.desc}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  handleFieldChange('notifications', item.key, !isOn);
                                  if (item.key === "emailAlerts" && !isOn) {
                                    setTempEmail("");
                                    setShowEmailModal(true);
                                  }
                                }}
                                className={cn(
                                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                  isOn ? "bg-azure-500" : "bg-gray-300 dark:bg-slate-600"
                                )}
                              >
                                <span
                                  className={cn(
                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                    isOn ? "translate-x-6" : "translate-x-1"
                                  )}
                                />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeSection === "security" && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Security Settings
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                        Manage security preferences and session settings
                      </p>
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Session Timeout
                          </label>
                          <select
                            value={tempSecurity.sessionTimeout}
                            onChange={(e) => handleFieldChange('security', 'sessionTimeout', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                          >
                            <option value="1h">1 hour</option>
                            <option value="8h">8 hours</option>
                            <option value="24h">24 hours</option>
                            <option value="7d">7 days</option>
                          </select>
                        </div>

                        <div className="flex items-start justify-between py-2">
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              Two-Factor Authentication
                            </label>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              Add an extra layer of security
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              if (!tempSecurity.mfaEnabled) {
                                setOtpFlow('verify_password');
                                setOtpPassword("");
                                setOtpCode("");
                                setOtpError("");
                              } else {
                                handleFieldChange('security', 'mfaEnabled', false);
                                setOtpFlow('idle');
                              }
                            }}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              tempSecurity.mfaEnabled ? "bg-azure-500" : "bg-gray-300 dark:bg-slate-600"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                tempSecurity.mfaEnabled ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>

                        {/* MFA Configuration with OTP flow */}
                        {tempSecurity.mfaEnabled && otpFlow === 'verified' && (
                          <div className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle className="h-4 w-4" />
                              <p className="text-xs font-medium">Two-factor authentication is enabled and verified</p>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHasChanges(true)}
                            className="w-full"
                          >
                            Change Password
                          </Button>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Recent Login Activity
                          </h4>
                          <div className="space-y-2">
                            {loginActivities.length > 0 ? (
                              loginActivities.map((login, i) => (
                                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                      login.type === "logout"
                                        ? "bg-red-100 dark:bg-red-900/30"
                                        : "bg-gray-100 dark:bg-slate-700"
                                    )}>
                                      <Monitor className={cn(
                                        "h-4 w-4",
                                        login.type === "logout"
                                          ? "text-red-500 dark:text-red-400"
                                          : "text-gray-500 dark:text-slate-400"
                                      )} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {login.type === "logout" ? "Sign Out" : "Sign In"}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                                        {login.username} · {login.browser}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-slate-400 flex-shrink-0 ml-2">{login.time}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-500 dark:text-slate-400 py-4 text-center">No recent activity</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "appearance" && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Appearance Settings
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                        Customize the visual appearance of the portal
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Theme
                          </label>
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                            Choose between light, dark, or system default
                          </p>
                          <div className="flex gap-2">
                              {(["light", "dark", "system"] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => {
                                  handleFieldChange("appearance", "theme", mode);
                                  handleFieldChange("appearance", "darkMode", mode === "dark" || (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches));
                                }}
                                className={cn(
                                  "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border transition-all",
                                  tempAppearance.theme === mode
                                    ? "bg-azure-50 dark:bg-azure-900/30 border-azure-500 text-azure-700 dark:text-azure-300"
                                    : "bg-white dark:bg-slate-900 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-gray-400 dark:hover:border-slate-500"
                                )}
                              >
                                {mode === "light" ? <Sun className="h-4 w-4" /> : mode === "dark" ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Transparency Level
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={tempAppearance.transparencyLevel}
                            onChange={(e) => handleFieldChange('appearance', 'transparencyLevel', parseInt(e.target.value))}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                            <span>Solid</span>
                            <span>Transparent</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Animation Intensity
                          </label>
                          <select
                            value={tempAppearance.animationIntensity}
                            onChange={(e) => handleFieldChange('appearance', 'animationIntensity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              Compact Sidebar
                            </label>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              Reduce sidebar width
                            </p>
                          </div>
                          <button
                            onClick={() => handleFieldChange('appearance', 'compactSidebar', !tempAppearance.compactSidebar)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              tempAppearance.compactSidebar ? "bg-azure-500" : "bg-gray-300 dark:bg-slate-600"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                tempAppearance.compactSidebar ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "users" && (
                    <UserManagement />
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </main>
      </div>



      {/* Email Configuration Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowEmailModal(false); setTempEmail(""); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-azure-100 dark:bg-azure-900/30 rounded-full flex items-center justify-center">
                  <Mail className="h-5 w-5 text-azure-600 dark:text-azure-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Configure Email Alerts
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    Enter the email address for critical alerts
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  placeholder="alerts@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                />
              </div>

              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowEmailModal(false); setTempEmail(""); handleFieldChange('notifications', 'emailAlerts', false); }}
                  className="border-gray-300 dark:border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setShowEmailModal(false);
                    setHasChanges(true);
                  }}
                  disabled={!tempEmail}
                  className="bg-azure-500 hover:bg-azure-600"
                >
                  Save Email
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2FA OTP Flow Modals */}
      <AnimatePresence>
        {otpFlow === 'verify_password' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Verify Password</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Enter your current password to enable two-factor authentication</p>
              <input
                type="password"
                value={otpPassword}
                onChange={(e) => { setOtpPassword(e.target.value); setOtpError(""); }}
                placeholder="Current password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 mb-3"
              />
              {otpError && <p className="text-xs text-red-500 mb-3">{otpError}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setOtpFlow('idle')} className="flex-1 h-9 text-xs">Cancel</Button>
                <Button size="sm" onClick={() => {
                  if (!otpPassword) { setOtpError("Please enter your password"); return; }
                  setOtpFlow('choose_method');
                  setOtpError("");
                }} className="flex-1 h-9 text-xs">Continue</Button>
              </div>
            </motion.div>
          </div>
        )}
        {otpFlow === 'choose_method' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Choose Verification Method</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Select how you want to receive the OTP</p>
              <div className="space-y-3 mb-4">
                <button
                  onClick={() => setOtpMethod('sms')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${otpMethod === 'sms' ? 'border-azure-500 bg-azure-50 dark:bg-azure-900/20' : 'border-gray-200 dark:border-slate-700'}`}
                >
                  <Smartphone className="h-5 w-5 text-azure-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">SMS</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Receive code via text message</p>
                  </div>
                </button>
                <button
                  onClick={() => setOtpMethod('email')}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${otpMethod === 'email' ? 'border-azure-500 bg-azure-50 dark:bg-azure-900/20' : 'border-gray-200 dark:border-slate-700'}`}
                >
                  <Mail className="h-5 w-5 text-azure-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Receive code via email</p>
                  </div>
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setOtpFlow('verify_password')} className="flex-1 h-9 text-xs">Back</Button>
                <Button size="sm" onClick={() => {
                  setOtpCode("");
                  setOtpError("");
                  setOtpFlow('otp_sent');
                }} className="flex-1 h-9 text-xs">Send OTP</Button>
              </div>
            </motion.div>
          </div>
        )}
        {otpFlow === 'otp_sent' && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Enter OTP</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">A verification code has been sent via {otpMethod === 'sms' ? 'SMS' : 'email'}</p>
              <input
                type="text"
                value={otpCode}
                onChange={(e) => { setOtpCode(e.target.value); setOtpError(""); }}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 mb-3 text-center text-lg tracking-widest"
              />
              {otpError && <p className="text-xs text-red-500 mb-3">{otpError}</p>}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setOtpFlow('choose_method'); setOtpError(""); }} className="flex-1 h-9 text-xs">Back</Button>
                <Button size="sm" onClick={() => {
                  if (otpCode.length < 6) { setOtpError("Please enter the 6-digit code"); return; }
                  handleFieldChange('security', 'mfaEnabled', true);
                  setOtpFlow('verified');
                  setOtpError("");
                }} className="flex-1 h-9 text-xs">Verify</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Cache Confirmation Modal */}
      <AnimatePresence>
        {showClearCacheConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <Database className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Clear All Cache
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Warning:</strong> This will clear all your data including:
                </p>
                <ul className="text-sm text-amber-700 dark:text-amber-400 mt-2 list-disc list-inside ml-4">
                  <li>Onboarding progress</li>
                  <li>Persisted UI settings</li>
                  <li>Authentication session</li>
                  <li>Notification history</li>
                  <li>You will need to sign in again</li>
                </ul>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelClearCache}
                  className="border-gray-300 dark:border-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={confirmClearCache}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Clear Cache
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}