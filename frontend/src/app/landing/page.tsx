"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Cloud, Server, Database, Shield, Lock, User, Mail, Phone, MapPin, FileText, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/store/userStore";

export default function LandingPage() {
  const router = useRouter();
  const { authenticateUser, addUser } = useUserStore();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; left: number; top: number }>>([]);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    mobile: '',
    city: '',
    reason: ''
  });

  // Generate particles only on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
    }));
    setParticles(newParticles);
  }, []);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Authenticate using user store
    const user = authenticateUser(formData.username, formData.password);
    
    if (user) {
      localStorage.setItem('auth_token', `mock-token-${user.id}`);
      localStorage.setItem('user_role', user.role);
      localStorage.setItem('user_name', user.username);
      localStorage.setItem('user_id', user.id);
      
      // Track login activity
      const platform = navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Unknown';
      const os = navigator.userAgent.includes('Windows') ? 'Windows' : navigator.userAgent.includes('Mac') ? 'Mac' : navigator.userAgent.includes('Linux') ? 'Linux' : 'Unknown';
      const loginRecord = {
        time: new Date().toLocaleString(),
        platform: `${platform} on ${os}`,
        location: formData.city || 'Unknown',
        ip: '127.0.0.1',
      };
      const existing = JSON.parse(localStorage.getItem('login_activities') || '[]');
      existing.unshift(loginRecord);
      if (existing.length > 10) existing.length = 10;
      localStorage.setItem('login_activities', JSON.stringify(existing));
      
      const onboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
      if (onboardingCompleted) {
        router.push('/dashboard');
      } else {
        localStorage.removeItem('infralift-onboarding-storage');
        router.push('/onboarding');
      }
    } else {
      alert('Invalid credentials. Please try again.');
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user already exists
    const existingUser = authenticateUser(formData.username, '');
    if (existingUser) {
      alert('Username already exists. Please choose a different username.');
      return;
    }
    
    // Add new user with reader role
    addUser({
      username: formData.username,
      password: formData.password,
      role: 'reader',
      mobile: formData.mobile,
      city: formData.city,
      reason: formData.reason,
    });
    
    // Store auth token
    localStorage.setItem('auth_token', `mock-token-new-${Date.now()}`);
    localStorage.setItem('user_role', 'reader');
    localStorage.setItem('user_name', formData.username);
    localStorage.setItem('user_mobile', formData.mobile);
    localStorage.setItem('user_city', formData.city);
    localStorage.setItem('user_reason', formData.reason);
    localStorage.setItem('onboarding_completed', 'false');
    
    // Reset onboarding state to start fresh
    localStorage.removeItem('infralift-onboarding-storage');
    
    router.push('/onboarding');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>
        
        {/* Floating Particles */}
        {mounted && particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute w-2 h-2 bg-azure-500/30 rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
        
        {/* Glowing Orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-azure-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            delay: 2,
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Glass Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, type: "spring", damping: 25, stiffness: 100 }}
            className="bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Logo Section */}
            <div className="p-8 pb-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-center mb-6"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-azure-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-azure-500/30">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="12" fill="white" />
                    <path d="M12 5C9.58 5 7.45 6.54 6.55 8.68C4.47 8.9 2.8 10.6 2.8 12.7C2.8 14.97 4.63 16.8 6.9 16.8H17.8C19.68 16.8 21.2 15.28 21.2 13.4C21.2 11.68 19.92 10.26 18.26 10.02C17.72 7.18 15.14 5 12 5Z" fill="#0078D4" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Infralift</h1>
                <p className="text-gray-300 text-sm">Azure Infrastructure Automation Platform</p>
              </motion.div>

              {/* Tabs */}
              <div className="flex bg-white/5 rounded-lg p-1 mb-6">
                <button
                  onClick={() => setActiveTab('signin')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    activeTab === 'signin'
                      ? 'bg-azure-500 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    activeTab === 'signup'
                      ? 'bg-azure-500 text-white shadow-lg'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Forms */}
              {activeTab === 'signin' ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        placeholder="Enter your username"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-azure-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-azure-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-azure-500 to-purple-500 hover:from-azure-600 hover:to-purple-600 text-white font-medium py-3 shadow-lg shadow-azure-500/30 transition-all duration-200"
                  >
                    Sign In
                  </Button>

                  <p className="text-center text-xs text-gray-400">
                    Default credentials: admin / 123
                  </p>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        placeholder="Choose a username"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-azure-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        placeholder="Create a password"
                        className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-azure-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="tel"
                        value={formData.mobile}
                        onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                        placeholder="Enter mobile number"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-azure-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      City
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        placeholder="Enter your city"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-azure-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reason For Access
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        value={formData.reason}
                        onChange={(e) => setFormData({...formData, reason: e.target.value})}
                        placeholder="Why do you need access?"
                        className="pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-azure-500"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-azure-500 to-purple-500 hover:from-azure-600 hover:to-purple-600 text-white font-medium py-3 shadow-lg shadow-azure-500/30 transition-all duration-200"
                  >
                    Create Account
                  </Button>

                  <p className="text-center text-xs text-gray-400">
                    Default role: Reader
                  </p>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 bg-white/5 border-t border-white/10">
              <div className="flex items-center justify-center gap-4 text-gray-400 text-xs">
                <div className="flex items-center gap-1">
                  <Server className="h-3 w-3" />
                  <span>Powered by Azure</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>Enterprise Security</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Feature Highlights */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 grid grid-cols-3 gap-4"
          >
            {[
              { icon: Cloud, label: "Smart Provisioning" },
              { icon: Database, label: "Real-time Monitoring" },
              { icon: Shield, label: "Policy Compliance" },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-3 text-center"
              >
                <item.icon className="h-5 w-5 mx-auto mb-2 text-azure-400" />
                <p className="text-xs text-gray-300">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}