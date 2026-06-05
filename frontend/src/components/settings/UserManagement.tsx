"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserStore, type UserRole } from "@/store/userStore";
import { UserPlus, Edit, Trash2, Shield, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export function UserManagement() {
  const { users, addUser, updateUser, deleteUser } = useUserStore();
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'reader' as UserRole,
    email: '',
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
      });
      return;
    }

    // Check if username already exists
    if (users.some(u => u.username === formData.username)) {
      toast({
        title: "Username exists",
        description: "A user with this username already exists",
      });
      return;
    }

    addUser({
      username: formData.username,
      password: formData.password,
      role: formData.role,
      email: formData.email,
    });

    toast({
      title: "User created",
      description: `User ${formData.username} has been created successfully`,
    });

    setFormData({ username: '', password: '', role: 'reader', email: '' });
    setShowCreateForm(false);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    updateUser(editingUser, {
      username: formData.username,
      password: formData.password,
      role: formData.role,
      email: formData.email,
    });

    toast({
      title: "User updated",
      description: `User ${formData.username} has been updated successfully`,
    });

    setFormData({ username: '', password: '', role: 'reader', email: '' });
    setEditingUser(null);
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (username === 'admin') {
      toast({
        title: "Cannot delete admin",
        description: "The admin user cannot be deleted",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete user ${username}?`)) {
      deleteUser(userId);
      toast({
        title: "User deleted",
        description: `User ${username} has been deleted`,
      });
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user.id);
    setFormData({
      username: user.username,
      password: user.password,
      role: user.role,
      email: user.email || '',
    });
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    setFormData({ username: '', password: '', role: 'reader', email: '' });
    setEditingUser(null);
    setShowCreateForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Create User Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">User Management</h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Manage user accounts and permissions
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="h-9 text-xs"
        >
          <UserPlus className="mr-2 h-3.5 w-3.5" />
          Create User
        </Button>
      </div>

      {/* User List */}
      <Card className="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Username
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-900">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {user.username}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' 
                          : user.role === 'portal_admin'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : user.role === 'global_engineer'
                          ? 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300'
                          : user.role === 'itsm_engineer'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          : user.role === 'developer'
                          ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      }`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit User Form Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleCancel}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingUser ? 'Edit User' : 'Create New User'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="Enter username"
                      className="dark:bg-slate-900 dark:border-slate-600 dark:text-white h-9 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="Enter password"
                        className="dark:bg-slate-900 dark:border-slate-600 dark:text-white h-9 text-xs pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter email address"
                      className="dark:bg-slate-900 dark:border-slate-600 dark:text-white h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-xs font-medium text-gray-700 dark:text-slate-300">
                      Role
                    </Label>
                    <select
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-azure-500 focus:border-transparent dark:bg-slate-900 dark:text-white h-9"
                    >
                      <option value="reader">Reader</option>
                      <option value="admin">Admin</option>
                      <option value="portal_admin">Portal Admin</option>
                      <option value="global_engineer">Global Engineer</option>
                      <option value="itsm_engineer">ITSM Engineer</option>
                      <option value="developer">Developer</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      className="flex-1 h-9 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-9 text-xs"
                    >
                      {editingUser ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}