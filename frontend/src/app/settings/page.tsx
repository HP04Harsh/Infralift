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
  Users 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/store/settingsStore";
import { UserManagement } from "@/components/settings/UserManagement";

type SettingsSection = 
  | "general" 
  | "customization" 
  | "agents" 
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
    updateAppearance
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
        setLogoPreview(base64String);
        setTempCustomization(prev => ({ ...prev, logoUrl: base64String }));
        setHasChanges(true);
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
                              defaultValue="#0078d4"
                              onChange={() => setHasChanges(true)}
                              className="h-10 w-10 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              defaultValue="#0078d4"
                              onChange={() => setHasChanges(true)}
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
                              defaultValue="#8b5cf6"
                              onChange={() => setHasChanges(true)}
                              className="h-10 w-10 rounded cursor-pointer"
                            />
                            <input
                              type="text"
                              defaultValue="#8b5cf6"
                              onChange={() => setHasChanges(true)}
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Font
                          </label>
                          <select
                            defaultValue="inter"
                            onChange={() => setHasChanges(true)}
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
                              onClick={() => setHasChanges(true)}
                              className="relative inline-flex h-6 w-11 items-center rounded-full bg-azure-500 transition-colors"
                            >
                              <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
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
                              onClick={() => setHasChanges(true)}
                              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-slate-600 transition-colors"
                            >
                              <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
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
                            defaultValue="8"
                            onChange={() => setHasChanges(true)}
                            className="w-full"
                          />
                          <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mt-1">
                            <span>Sharp</span>
                            <span>Rounded</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "agents" && (
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Agent Settings
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                        Configure AI agent behavior and API settings
                      </p>
                      <div className="text-center py-8">
                        <Bot className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                          Agent configuration panel coming soon
                        </p>
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
                          { label: "Enable Notifications", desc: "Receive in-app notifications" },
                          { label: "Sound Alerts", desc: "Play sound for new notifications" },
                          { label: "Email Alerts", desc: "Receive critical alerts via email" },
                          { label: "Deployment Alerts", desc: "Get notified about deployments" },
                          { label: "Critical Alerts", desc: "High priority system alerts" },
                          { label: "Tenant Sync Alerts", desc: "Tenant synchronization status" },
                        ].map((item, index) => (
                          <div key={index} className="flex items-center justify-between py-2">
                            <div>
                              <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                                {item.label}
                              </label>
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                {item.desc}
                              </p>
                            </div>
                            <button
                              onClick={() => setHasChanges(true)}
                              className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                index < 3 ? "bg-azure-500" : "bg-gray-300 dark:bg-slate-600"
                              )}
                            >
                              <span
                                className={cn(
                                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                  index < 3 ? "translate-x-6" : "translate-x-1"
                                )}
                              />
                            </button>
                          </div>
                        ))}
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
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                            Session Timeout
                          </label>
                          <select
                            defaultValue="24h"
                            onChange={() => setHasChanges(true)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-azure-500"
                          >
                            <option value="1h">1 hour</option>
                            <option value="8h">8 hours</option>
                            <option value="24h">24 hours</option>
                            <option value="7d">7 days</option>
                          </select>
                        </div>

                        <div className="flex items-center justify-between py-2">
                          <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              Two-Factor Authentication
                            </label>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              Add an extra layer of security
                            </p>
                          </div>
                          <button
                            onClick={() => setHasChanges(true)}
                            className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-slate-600 transition-colors"
                          >
                            <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
                          </button>
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
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
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Recent Login Activity
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-slate-400">Today, 2:30 PM</span>
                              <span className="text-gray-900 dark:text-white">Chrome on Windows</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 dark:text-slate-400">Yesterday, 9:15 AM</span>
                              <span className="text-gray-900 dark:text-white">Firefox on Mac</span>
                            </div>
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
                            onClick={() => setHasChanges(true)}
                            className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-azure-500 transition-colors"
                          >
                            <span className="translate-x-1 dark:translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
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
                            defaultValue="50"
                            onChange={() => setHasChanges(true)}
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
                            defaultValue="medium"
                            onChange={() => setHasChanges(true)}
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
                            onClick={() => setHasChanges(true)}
                            className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 dark:bg-slate-600 transition-colors"
                          >
                            <span className="translate-x-1 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
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