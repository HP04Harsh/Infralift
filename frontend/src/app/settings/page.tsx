"use client";

import { useState, useEffect } from "react";
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
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
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
  | "users";

interface SettingsNavItem {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
}

const settingsNavItems: SettingsNavItem[] = [
  { id: "general", label: "General", icon: <LayoutDashboardIcon className="h-4 w-4" /> },
  { id: "customization", label: "Portal Customization", icon: <Palette className="h-4 w-4" /> },
  { id: "agents", label: "Agent Settings", icon: <Bot className="h-4 w-4" /> },
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
  // 2FA OTP flow state
  const [otpFlow, setOtpFlow] = useState<'idle' | 'verify_password' | 'choose_method' | 'otp_sent' | 'verified'>('idle');
  const [otpPassword, setOtpPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpMethod, setOtpMethod] = useState<'sms' | 'email'>('sms');
  const [otpError, setOtpError] = useState("");
  // Login activity tracking store
  const [loginActivities, setLoginActivities] = useState<{ time: string; platform: string; location: string; ip: string }[]>([]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('login_activities');
      if (stored) setLoginActivities(JSON.parse(stored));
    } catch {}
  }, []);
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

  // Temporary state for form values
  const [tempGeneral, setTempGeneral] = useState(general);
  const [tempCustomization, setTempCustomization] = useState(customization);
  const [tempNotifications, setTempNotifications] = useState(notifications);
  const [tempSecurity, setTempSecurity] = useState(security);
  const [tempAppearance, setTempAppearance] = useState(appearance);

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

  // Apply appearance settings as CSS custom properties
  useEffect(() => {
    const intensityMap = { low: 0.25, medium: 0.5, high: 0.75 };
    document.documentElement.style.setProperty('--ui-opacity', String(appearance.transparencyLevel / 100));
    document.documentElement.style.setProperty('--sidebar-width', appearance.compactSidebar ? '16rem' : '18rem');
    document.documentElement.style.setProperty('--anim-intensity', String(intensityMap[appearance.animationIntensity]));
  }, [appearance]);

  const handleSave = () => {
    // Save all temporary states to store
    updateGeneral(tempGeneral);
    updateCustomization(tempCustomization);
    updateNotifications(tempNotifications);
    updateSecurity(tempSecurity);
    updateAppearance(tempAppearance);
    setHasChanges(false);
    
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
        <Header showLiveIndicator userName="Harsh Pardhi" />
        
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
                            <select
                              value={tempAgentApiVersion}
                              onChange={(e) => setTempAgentApiVersion(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500 text-xs"
                            >
                              <option value="2024-02-15-preview">2024-02-15-preview</option>
                              <option value="2024-03-01-preview">2024-03-01-preview</option>
                              <option value="2024-06-01">2024-06-01</option>
                              <option value="2024-08-01-preview">2024-08-01-preview</option>
                            </select>
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
                        {tempAgentEndpoint ? (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Tokens Used</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">1.2M</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Requests</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">8,450</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Avg Latency</p>
                              <p className="text-lg font-bold text-gray-900 dark:text-white">320ms</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 text-center">
                              <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Success Rate</p>
                              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">99.8%</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6">
                            <Bot className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              Configure Azure OpenAI credentials above to see usage metrics
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeSection === "infrastructure" && (
                    <InfrastructureStorageSection
                      settings={infrastructureStorage}
                      onUpdate={updateInfrastructureStorage}
                    />
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
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                                      <Monitor className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">{login.platform}</p>
                                      <p className="text-xs text-gray-500 dark:text-slate-400">{login.location} · {login.ip}</p>
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-500 dark:text-slate-400">{login.time}</span>
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
                        <div className="flex items-center justify-between py-2">
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              Dark Mode
                            </label>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              Switch between light and dark themes
                            </p>
                          </div>
                          <button
                            onClick={() => handleFieldChange('appearance', 'darkMode', !tempAppearance.darkMode)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                              tempAppearance.darkMode ? "bg-azure-500" : "bg-gray-300 dark:bg-slate-600"
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                tempAppearance.darkMode ? "translate-x-6" : "translate-x-1"
                              )}
                            />
                          </button>
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