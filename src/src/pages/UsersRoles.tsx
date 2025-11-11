/**
 * Users & Roles Management Page
 * Admin-only interface for managing user accounts and roles
 * Implements role-based access control for user administration
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserPermission } from '../../shared/types';
import { Plus, Search, ChevronDown, Download, Filter, Trash2, Edit, UserPlus, Shield, User as UserIcon, Phone, Settings, Key, Upload } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import ToggleSwitch from '../components/common/ToggleSwitch';
import { getApiUrl, getAuthHeaders } from '../utils/api';

interface UserWithDetails extends User {
  phone?: string;
  status: 'active' | 'inactive';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Available pages for permission assignment - only 2 pages require permission control
const AVAILABLE_PAGES = [
  { key: 'guests', label: 'Manage Guests', description: 'View and manage guest list' },
  { key: 'reception', label: 'Reception Check-in', description: 'Guest check-in functionality' },
];

const UsersRoles: React.FC = () => {
  const { user: currentUser, apiRequest } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    weddingTitle: '',
    linkUndangan: '',
    weddingDateTime: '',
    weddingLocation: '',
    weddingPhotoUrl: '',
    weddingPhotoUrl_dashboard: '',
    weddingPhotoUrl_welcome: '',
  });
  const [permissionsData, setPermissionsData] = useState<UserPermission[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedDashboardPhoto, setSelectedDashboardPhoto] = useState<File | null>(null);
  const [selectedWelcomePhoto, setSelectedWelcomePhoto] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingDashboardPhoto, setUploadingDashboardPhoto] = useState(false);
  const [uploadingWelcomePhoto, setUploadingWelcomePhoto] = useState(false);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/users'), {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (
    file: File,
    userId: string,
    fieldName: 'weddingPhotoUrl' | 'weddingPhotoUrl_dashboard' | 'weddingPhotoUrl_welcome'
  ): Promise<boolean> => {
    const setUploading =
      fieldName === 'weddingPhotoUrl' ? setUploadingPhoto :
        fieldName === 'weddingPhotoUrl_dashboard' ? setUploadingDashboardPhoto :
          setUploadingWelcomePhoto;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('type', 'user');
      fd.append('userId', userId);       // prefix filename di server
      fd.append('fieldType', fieldName); // “weddingPhotoUrl” | “..._dashboard” | “..._welcome”

      const headers = getAuthHeaders(); // ← pastikan ini TIDAK menyetel 'Content-Type'
      delete (headers as any)['Content-Type'];     // jaga-jaga
      delete (headers as any)['content-type'];
      const res = await fetch(getApiUrl('/api/upload'), {
        method: 'POST',
        headers: headers, // pastikan fungsi ini TIDAK memaksakan 'Content-Type' saat FormData
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Upload failed');
      }

      const json = await res.json();
      if (!json?.success) throw new Error(json?.error || 'Upload failed');

      // Tidak perlu menyimpan URL ke user; optional: update formData untuk preview lokal
      // setFormData(prev => ({ ...prev, [fieldName]: json.data?.url ?? '' }));

      return true;
    } catch (err: any) {
      console.error(`[upload ${fieldName}]`, err);
      showToast(err?.message ?? 'Failed to upload photo', 'error');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedPhoto(file);
  };
  const handleDashboardPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedDashboardPhoto(file);
  };
  const handleWelcomePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedWelcomePhoto(file);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi seperti sebelumnya
    if (!formData.username.trim()) return showToast('Username is required', 'error');
    if (!formData.password.trim()) return showToast('Password is required', 'error');
    if (!formData.linkUndangan.trim()) return showToast('Link undangan is required', 'error');
    if (!formData.weddingTitle.trim()) return showToast('Wedding title is required', 'error');
    if (!formData.weddingDateTime) return showToast('Wedding date and time is required', 'error');
    if (!formData.weddingLocation.trim()) return showToast('Wedding location is required', 'error');

    try {
      // 1) CREATE USER (tanpa foto)
      const createPayload = {
        username: formData.username.trim(),
        password: formData.password.trim(),
        role: formData.role,
        phone: formData.phone.trim(),
        linkUndangan: formData.linkUndangan.trim(),
        weddingTitle: formData.weddingTitle.trim(),
        weddingDateTime: new Date(formData.weddingDateTime).toISOString(),
        weddingLocation: formData.weddingLocation.trim(),
        permissions: formData.role === 'user' ? permissionsData : [],
      };

      const createRes = await fetch(getApiUrl('/api/users'), {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload),
      });

      if (!createRes.ok) {
        let msg = 'Failed to create user';
        const txt = await createRes.text().catch(() => '');
        try {
          const j = JSON.parse(txt);
          msg = j.error || msg;
        } catch { msg = txt || msg; }
        throw new Error(msg);
      }

      const created = await createRes.json();
      if (!created.success || !created.data?.id) throw new Error('Invalid create response');

      const userId: string = created.data.id;

      // 2) UPLOAD FOTO (jika dipilih) — PARAREL, TIDAK update user lagi
      const [okWedding, okDashboard, okWelcome] = await Promise.all([
        selectedPhoto ? handlePhotoUpload(selectedPhoto, userId, 'weddingPhotoUrl') : Promise.resolve(true),
        selectedDashboardPhoto ? handlePhotoUpload(selectedDashboardPhoto, userId, 'weddingPhotoUrl_dashboard') : Promise.resolve(true),
        selectedWelcomePhoto ? handlePhotoUpload(selectedWelcomePhoto, userId, 'weddingPhotoUrl_welcome') : Promise.resolve(true),
      ]);

      // 3) Beri info kalau ada upload yang gagal (user tetap sudah tercipta)
      if (!okWedding || !okDashboard || !okWelcome) {
        showToast('User created, but some photos failed to upload', 'error');
      } else {
        showToast('User created successfully', 'success');
      }

      // 4) Reset & refresh
      setShowAddModal(false);
      setFormData({
        username: '',
        phone: '',
        password: '',
        role: 'user',
        linkUndangan: '',
        weddingTitle: '',
        weddingDateTime: '',
        weddingLocation: '',
        weddingPhotoUrl: '',
        weddingPhotoUrl_dashboard: '',
        weddingPhotoUrl_welcome: '',
      });
      setSelectedPhoto(null);
      setSelectedDashboardPhoto(null);
      setSelectedWelcomePhoto(null);
      setPermissionsData([]);
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user with photos:', error);
      showToast(error?.message ?? 'Failed to create user', 'error');
    }
  };

  const handleEditUser = async (user: UserWithDetails) => {
    setSelectedUser(user);

    // Fetch account details for the user
    try {
      const response = await fetch(getApiUrl(`/api/users/${user.id}/account`), {
        headers: getAuthHeaders(),
      });

      let accountData = {
        linkUndangan: '',
        weddingTitle: '',
        weddingDateTime: '',
        weddingLocation: '',
        weddingPhotoUrl: '',
        weddingPhotoUrl_dashboard: '',
        weddingPhotoUrl_welcome: '',
      };

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          accountData = {
            linkUndangan: result.data.linkUndangan || '',
            weddingTitle: result.data.title || '',
            weddingDateTime: result.data.dateTime ? new Date(result.data.dateTime).toISOString().slice(0, 16) : '',
            weddingLocation: result.data.location || '',
            weddingPhotoUrl: result.data.photoUrl || '',
            weddingPhotoUrl_dashboard: result.data.photoUrl_dashboard || '',
            weddingPhotoUrl_welcome: result.data.photoUrl_welcome || '',
          };
        }
      }

      setFormData({
        username: user.username,
        phone: user.phone || '',
        password: '', // Leave empty for edit
        role: user.role,
        linkUndangan: accountData.linkUndangan,
        weddingTitle: accountData.weddingTitle,
        weddingDateTime: accountData.weddingDateTime,
        weddingLocation: accountData.weddingLocation,
        weddingPhotoUrl: accountData.weddingPhotoUrl,
        weddingPhotoUrl_dashboard: accountData.weddingPhotoUrl_dashboard,
        weddingPhotoUrl_welcome: accountData.weddingPhotoUrl_welcome,
      });
      setPermissionsData(user.permissions || []);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching account details:', error);
      // Fallback to basic user data
      setFormData({
        username: user.username,
        phone: user.phone || '',
        password: '',
        role: user.role,
        linkUndangan: '',
        weddingTitle: '',
        weddingDateTime: '',
        weddingLocation: '',
        weddingPhotoUrl: '',
        weddingPhotoUrl_dashboard: '',
        weddingPhotoUrl_welcome: '',
      });
      setPermissionsData(user.permissions || []);
      setShowEditModal(true);
    }
  };

  const handleManagePermissions = (user: UserWithDetails) => {
    setSelectedUser(user);
    setPermissionsData(user.permissions || []);
    setShowPermissionsModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) return showToast('No user selected', 'error');
    if (!formData.username.trim()) return showToast('Username is required', 'error');
    if (!formData.linkUndangan.trim()) return showToast('Link Undangan is required', 'error');
    if (!formData.weddingTitle.trim()) return showToast('Wedding title is required', 'error');
    if (!formData.weddingDateTime) return showToast('Wedding date and time is required', 'error');
    if (!formData.weddingLocation.trim()) return showToast('Wedding location is required', 'error');

    try {
      // 1️⃣ Update user basic info
      const updatePayload: Record<string, any> = {
        username: formData.username.trim(),
        phone: formData.phone.trim(),
        role: formData.role,
        linkUndangan: formData.linkUndangan.trim(),
        weddingTitle: formData.weddingTitle.trim(),
        weddingDateTime: new Date(formData.weddingDateTime).toISOString(),
        weddingLocation: formData.weddingLocation.trim(),
        permissions: formData.role === 'user' ? permissionsData : [],
      };

      if (formData.password.trim()) {
        updatePayload.password = formData.password.trim();
      }

      const updateRes = await fetch(getApiUrl(`/api/users/${selectedUser.id}`), {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!updateRes.ok) {
        let msg = 'Failed to update user';
        const txt = await updateRes.text().catch(() => '');
        try {
          const j = JSON.parse(txt);
          msg = j.error || msg;
        } catch { msg = txt || msg; }
        throw new Error(msg);
      }

      // 2️⃣ Upload foto baru kalau dipilih
      const [okWedding, okDashboard, okWelcome] = await Promise.all([
        selectedPhoto ? handlePhotoUpload(selectedPhoto, selectedUser.id, 'weddingPhotoUrl') : Promise.resolve(true),
        selectedDashboardPhoto ? handlePhotoUpload(selectedDashboardPhoto, selectedUser.id, 'weddingPhotoUrl_dashboard') : Promise.resolve(true),
        selectedWelcomePhoto ? handlePhotoUpload(selectedWelcomePhoto, selectedUser.id, 'weddingPhotoUrl_welcome') : Promise.resolve(true),
      ]);

      // 3️⃣ Tampilkan hasil
      if (!okWedding || !okDashboard || !okWelcome) {
        showToast('User updated, but some photos failed to upload', 'error');
      } else {
        showToast('User updated successfully', 'success');
      }

      // 4️⃣ Reset & refresh
      setShowEditModal(false);
      setSelectedUser(null);
      setSelectedPhoto(null);
      setSelectedDashboardPhoto(null);
      setSelectedWelcomePhoto(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      showToast(error?.message ?? 'Failed to update user', 'error');
    }
  };


  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(getApiUrl(`/api/users/${selectedUser.id}`), {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: permissionsData }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to update permissions';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            errorMessage = 'Failed to update permissions';
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.success) {
        showToast('Permissions updated successfully', 'success');
        setShowPermissionsModal(false);
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      showToast((error && typeof error === 'object' && 'message' in error) ? String(error.message) : 'Failed to update permissions', 'error');
    }
  };

  const handlePermissionToggle = (pageKey: string) => {
    setPermissionsData(prev => {
      const existing = prev.find(p => p.page === pageKey);
      if (existing) {
        return prev.map(p =>
          p.page === pageKey ? { ...p, canAccess: !p.canAccess } : p
        );
      } else {
        return [...prev, { page: pageKey, canAccess: true }];
      }
    });
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(getApiUrl(`/api/users/${selectedUser.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete user';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            errorMessage = 'Failed to delete user';
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (result.success) {
        const deletedGuestCount = result.data?.deletedGuestCount || 0;
        const guestMessage = deletedGuestCount > 0 ? ` and ${deletedGuestCount} guest${deletedGuestCount > 1 ? 's' : ''}` : '';
        showToast(`User deleted successfully${guestMessage}`, 'success');
        setShowDeleteModal(false);
        setSelectedUser(null);
        fetchUsers(); // Refresh the list
      } else {
        throw new Error(result.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast((error && typeof error === 'object' && 'message' in error) ? String(error.message) : 'Failed to delete user', 'error');
    }
  };

  const filteredUsers = users.filter(user => {
    if (!user || !user.username) return false;
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Mobile view toggle
  const [showFilters, setShowFilters] = useState(false);

  const getRoleBadge = (role: string) => {
    return role === 'admin'
      ? 'bg-indigo-100 text-indigo-800'
      : 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-accent">

          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="bg-background rounded-xl border border-border shadow-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-6 h-6 text-primary" />
                    <h1 className="text-xl font-semibold text-text">Users & Roles</h1>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center justify-center px-3 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm sm:px-4 sm:py-2"
                  >
                    <UserPlus className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Add User</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                </div>
              </div>
              {/* Mobile Filter Toggle */}
              <div className="px-4 sm:px-6 py-4 border-b border-border lg:hidden">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 text-sm text-text hover:text-primary transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Desktop Filters */}
              <div className={`px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between ${showFilters ? 'block' : 'hidden'} lg:flex`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full sm:w-64 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <button
                      onClick={() => {
                        const dropdown = document.getElementById('role-dropdown');
                        dropdown?.classList.toggle('hidden');
                      }}
                      className="flex items-center justify-between w-full sm:w-auto px-3 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                    >
                      <span className="text-sm text-text capitalize">{roleFilter}</span>
                      <ChevronDown className="w-4 h-4 ml-2 text-gray-500" />
                    </button>
                    <div id="role-dropdown" className="absolute top-full left-0 mt-1 w-full sm:w-32 bg-background border border-border rounded-lg shadow-lg z-10 hidden">
                      <button
                        onClick={() => {
                          setRoleFilter('all');
                          document.getElementById('role-dropdown')?.classList.add('hidden');
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                      >
                        All
                      </button>
                      <button
                        onClick={() => {
                          setRoleFilter('admin');
                          document.getElementById('role-dropdown')?.classList.add('hidden');
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                      >
                        Admin
                      </button>
                      <button
                        onClick={() => {
                          setRoleFilter('user');
                          document.getElementById('role-dropdown')?.classList.add('hidden');
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors"
                      >
                        User
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                  <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                    <Download className="w-5 h-5 text-text" />
                  </button>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-accent">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">Permissions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">Last Active</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-text uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-background divide-y divide-border">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-secondary transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-text">{user.username}</div>
                              <div className="text-xs text-gray-500">@{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="w-4 h-4 text-gray-400" />
                            <span>{user.username}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center space-x-1`}>
                            <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className="text-sm text-text capitalize">{user.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.role === 'user' && (
                            <div className="flex items-center space-x-2">
                              <Key className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-text">
                                {user.permissions?.filter(p => p.canAccess).length || 0} / {AVAILABLE_PAGES.length}
                              </span>
                            </div>
                          )}
                          {user.role === 'admin' && (
                            <span className="text-sm text-gray-500">All Access</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="text-indigo-600 hover:text-indigo-900 transition-colors"
                              title="Edit User"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {user.role === 'user' && (
                              <button
                                onClick={() => handleManagePermissions(user)}
                                className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                title="Manage Permissions"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteModal(true);
                              }}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              disabled={user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                <div className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="p-4 hover:bg-secondary transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text">{user.username}</div>
                            <div className="text-xs text-gray-500">{user.username}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(user.role)}`}>
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-indigo-600 hover:text-indigo-900 transition-colors p-1"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user.role === 'user' && (
                            <button
                              onClick={() => handleManagePermissions(user)}
                              className="text-indigo-600 hover:text-indigo-900 transition-colors p-1"
                              title="Manage Permissions"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 transition-colors p-1"
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-text capitalize">{user.status}</span>
                        </div>
                        <div className="text-gray-500">
                          {user.role === 'user' && (
                            <span className="text-sm">
                              {user.permissions?.filter(p => p.canAccess).length || 0} permissions
                            </span>
                          )}
                          {user.role === 'admin' && (
                            <span className="text-gray-500">All Access</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500">No users found</div>
                </div>
              )}
            </div>
          </main>

          {showEditModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-background rounded-xl p-4 sm:p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold text-text mb-4">
                  Edit User - {selectedUser.username}
                </h2>
                <form onSubmit={handleUpdateUser} className="space-y-4">
                  {/* Basic Info */}
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">
                      New Password (leave empty to keep current)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                      placeholder="Enter new password (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value as "admin" | "user";
                        setFormData({ ...formData, role: newRole });
                        if (newRole === "user") setPermissionsData([]);
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Wedding Details Section */}
                  <div className="pt-2">
                    <h3 className="text-sm font-semibold text-primary mb-2">Wedding Details</h3>
                    <div className="grid grid-cols-1 gap-3">
                      {/* Wedding Title */}
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Wedding Title
                        </label>
                        <input
                          type="text"
                          value={formData.weddingTitle}
                          onChange={(e) =>
                            setFormData({ ...formData, weddingTitle: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Link Undangan
                        </label>
                        <input
                          type="text"
                          value={formData.linkUndangan}
                          onChange={(e) =>
                            setFormData({ ...formData, linkUndangan: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                        />
                        <span className="text-sm text-gray-600 truncate max-w-32">
                          contoh: https://attarivitation.com/aaaa-xxxx
                        </span>
                      </div>

                      {/* Wedding Date */}
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Wedding Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.weddingDateTime}
                          onChange={(e) =>
                            setFormData({ ...formData, weddingDateTime: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                        />
                      </div>

                      {/* Wedding Location */}
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Wedding Location
                        </label>
                        <input
                          type="text"
                          value={formData.weddingLocation}
                          onChange={(e) =>
                            setFormData({ ...formData, weddingLocation: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                        />
                      </div>

                      {/* Wedding Photo Upload */}
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Wedding Photo
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                            id="edit-photo-upload"
                            disabled={uploadingPhoto}
                          />
                          <label
                            htmlFor="edit-photo-upload"
                            className={`flex items-center justify-center px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors ${uploadingPhoto ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                          </label>
                          {selectedPhoto && (
                            <span className="text-sm text-gray-600 truncate max-w-32">
                              {selectedPhoto.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dashboard Photo Upload */}
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Dashboard Photo
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleDashboardPhotoChange}
                            className="hidden"
                            id="edit-dashboard-photo-upload"
                            disabled={uploadingDashboardPhoto}
                          />
                          <label
                            htmlFor="edit-dashboard-photo-upload"
                            className={`flex items-center justify-center px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors ${uploadingDashboardPhoto ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingDashboardPhoto
                              ? "Uploading..."
                              : "Upload Dashboard Photo"}
                          </label>
                          {selectedDashboardPhoto && (
                            <span className="text-sm text-gray-600 truncate max-w-32">
                              {selectedDashboardPhoto.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Welcome Photo Upload */}
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">
                          Welcome Photo
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            accept="image/*,video/mp4,video/webm,video/quicktime"
                            onChange={handleWelcomePhotoChange}
                            className="hidden"
                            id="edit-welcome-photo-upload"
                            disabled={uploadingWelcomePhoto}
                          />
                          <label
                            htmlFor="edit-welcome-photo-upload"
                            className={`flex items-center justify-center px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors ${uploadingWelcomePhoto ? "opacity-50 cursor-not-allowed" : ""
                              }`}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingWelcomePhoto
                              ? "Uploading..."
                              : "Upload Welcome Photo"}
                          </label>
                          {selectedWelcomePhoto && (
                            <span className="text-sm text-gray-600 truncate max-w-32">
                              {selectedWelcomePhoto.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Permissions */}
                  {formData.role === "user" && (
                    <div className="pt-2">
                      <h3 className="text-sm font-semibold text-primary mb-2">
                        Page Access Permissions
                      </h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                        {AVAILABLE_PAGES.map((page) => {
                          const hasPermission =
                            permissionsData.find((p) => p.page === page.key)?.canAccess ||
                            false;

                          return (
                            <div
                              key={page.key}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors"
                            >
                              <label
                                htmlFor={`edit-permission-${page.key}`}
                                className="text-sm font-medium text-text cursor-pointer"
                              >
                                {page.label}
                              </label>
                              <ToggleSwitch
                                id={`edit-permission-${page.key}`}
                                checked={hasPermission}
                                onChange={() => handlePermissionToggle(page.key)}
                                size="sm"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedUser(null);
                      }}
                      className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm sm:text-base"
                    >
                      Update User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}


          {/* Add User Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-background rounded-xl p-4 sm:p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-semibold text-text mb-4">Add New User</h2>
                <form onSubmit={handleAddUser} className="space-y-4">

                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Username</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-2">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        const newRole = e.target.value as 'admin' | 'user';
                        setFormData({ ...formData, role: newRole });
                        // Reset permissions when switching to user role
                        if (newRole === 'user') {
                          setPermissionsData([]);
                        }
                      }}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Wedding account details */}
                  <div className="pt-2">
                    <h3 className="text-sm font-semibold text-primary mb-2">Wedding Details</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">Wedding Title</label>
                        <input
                          type="text"
                          value={formData.weddingTitle}
                          onChange={(e) => setFormData({ ...formData, weddingTitle: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">Link Undangan</label>
                        <input
                          type="text"
                          value={formData.linkUndangan}
                          onChange={(e) => setFormData({ ...formData, linkUndangan: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                          required
                        />
                        <span className="text-sm text-gray-600 truncate max-w-32">
                          contoh: https://attarivitation.com/aaaa-xxxx
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">Wedding Date & Time</label>
                        <input
                          type="datetime-local"
                          value={formData.weddingDateTime}
                          onChange={(e) => setFormData({ ...formData, weddingDateTime: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">Wedding Location</label>
                        <input
                          type="text"
                          value={formData.weddingLocation}
                          onChange={(e) => setFormData({ ...formData, weddingLocation: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm sm:text-base"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">Wedding Photo</label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                            id="photo-upload"
                            disabled={uploadingPhoto}
                          />
                          <label
                            htmlFor="photo-upload"
                            className={`flex items-center justify-center px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors ${uploadingPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                          </label>
                          {selectedPhoto && (
                            <span className="text-sm text-gray-600 truncate max-w-32">
                              {selectedPhoto.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Upload a photo</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">Dashboard Photo</label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleDashboardPhotoChange}
                            className="hidden"
                            id="dashboard-photo-upload"
                            disabled={uploadingDashboardPhoto}
                          />
                          <label
                            htmlFor="dashboard-photo-upload"
                            className={`flex items-center justify-center px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors ${uploadingDashboardPhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingDashboardPhoto ? 'Uploading...' : 'Upload Dashboard Photo'}
                          </label>
                          {selectedDashboardPhoto && (
                            <span className="text-sm text-gray-600 truncate max-w-32">
                              {selectedDashboardPhoto.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Upload dashboard photo (_dashboard prefix)</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text mb-2">Welcome Photo</label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="file"
                            accept="image/*,video/mp4,video/webm,video/quicktime"
                            onChange={handleWelcomePhotoChange}
                            className="hidden"
                            id="edit-welcome-photo-upload"
                            disabled={uploadingWelcomePhoto}
                          />
                          <label
                            htmlFor="edit-welcome-photo-upload"
                            className={`flex items-center justify-center px-3 py-2 border border-border rounded-lg cursor-pointer hover:bg-secondary transition-colors ${uploadingWelcomePhoto ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {uploadingWelcomePhoto ? 'Uploading...' : 'Upload Welcome Photo'}
                          </label>
                          {selectedWelcomePhoto && (
                            <span className="text-sm text-gray-600 truncate max-w-32">
                              {selectedWelcomePhoto.name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Upload welcome photo (_welcome prefix)</p>
                      </div>
                    </div>
                  </div>

                  {/* Permissions section for User role */}
                  {formData.role === 'user' && (
                    <div className="pt-2">
                      <h3 className="text-sm font-semibold text-primary mb-2">Page Access Permissions</h3>
                      <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                        {AVAILABLE_PAGES.map((page) => {
                          const hasPermission = permissionsData.find(p => p.page === page.key)?.canAccess || false;

                          return (
                            <div key={page.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary transition-colors">
                              <label htmlFor={`permission-${page.key}`} className="text-sm font-medium text-text cursor-pointer">
                                {page.label}
                              </label>
                              <ToggleSwitch
                                id={`permission-${page.key}`}
                                checked={hasPermission}
                                onChange={() => handlePermissionToggle(page.key)}
                                size="sm"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setFormData({ username: '', phone: '', password: '', role: 'user', weddingTitle: '', weddingDateTime: '', weddingLocation: '', weddingPhotoUrl: '', weddingPhotoUrl_dashboard: '', weddingPhotoUrl_welcome: '' });
                        setSelectedPhoto(null);
                        setSelectedDashboardPhoto(null);
                        setSelectedWelcomePhoto(null);
                        setPermissionsData([]);
                      }}
                      className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors text-sm sm:text-base"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm sm:text-base"
                    >
                      Create User
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-background rounded-xl p-6 w-full max-w-sm mx-4">
                <h2 className="text-lg font-semibold text-text mb-4">Delete User</h2>
                <p className="text-sm text-text mb-6">
                  Are you sure you want to delete user <strong>{selectedUser.username}</strong>? This action cannot be undone and will also delete all associated guests.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteUser}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Permissions Modal */}
          {showPermissionsModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-background rounded-xl p-6 w-full max-w-md mx-4">
                <h2 className="text-lg font-semibold text-text mb-4">Manage Permissions - {selectedUser.username}</h2>
                <div className="space-y-3 mb-6">
                  {AVAILABLE_PAGES.map((page) => {
                    const hasPermission = permissionsData.find(p => p.page === page.key)?.canAccess || false;

                    return (
                      <div key={page.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors">
                        <div>
                          <label htmlFor={`permission-${page.key}`} className="text-sm font-medium text-text cursor-pointer">
                            {page.label}
                          </label>
                          <p className="text-xs text-gray-500">{page.description}</p>
                        </div>
                        <ToggleSwitch
                          id={`permission-${page.key}`}
                          checked={hasPermission}
                          onChange={() => handlePermissionToggle(page.key)}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowPermissionsModal(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePermissions}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-600 transition-colors"
                  >
                    Save Permissions
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsersRoles;