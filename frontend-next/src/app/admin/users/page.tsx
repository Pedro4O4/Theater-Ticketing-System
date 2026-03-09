"use client";
import React, { useEffect, useState, useMemo } from 'react';
import api from "@/services/api";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiUsers, FiShield, FiStar, FiUser, FiSearch,
    FiEdit2, FiTrash2, FiX, FiCheck, FiAlertCircle,
    FiGrid, FiCalendar, FiRefreshCw, FiUserPlus, FiSlash, FiUnlock, FiEye
} from 'react-icons/fi';
import UpdateUserRoleModal from '@/components/AdminComponent/UpdateUserRoleModal';
import ConfirmationDialog from "@/components/AdminComponent/ConfirmationDialog";
import { User, UserRole } from '@/types/auth';
import '@/components/AdminComponent/AdminUsersPage.css';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'react-toastify';

const ROLE_CONFIG: Record<string, any> = {
    'System Admin': {
        icon: FiShield,
        color: '#ef4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    'Organizer': {
        icon: FiStar,
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.3)'
    },
    'Standard User': {
        icon: FiUser,
        color: '#22d3ee',
        bgColor: 'rgba(34, 211, 238, 0.15)',
        borderColor: 'rgba(34, 211, 238, 0.3)'
    }
};

const AdminUsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const { t } = useLanguage();

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get<any>('/user/all');

            let usersData: User[] = [];
            const data = response.data.success ? response.data.data : response.data;

            if (Array.isArray(data)) {
                usersData = data;
            } else if (data?.users && Array.isArray(data.users)) {
                usersData = data.users;
            }

            const currentUserId = currentUser?._id;
            usersData = usersData.filter(u => u._id !== currentUserId);

            setUsers(usersData);
            setError(null);
        } catch (err: any) {
            console.error("Error fetching users:", err);
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        let filtered = users;
        if (activeTab !== 'all') {
            const roleMap: Record<string, string> = {
                admins: 'System Admin',
                organizers: 'Organizer',
                users: 'Standard User'
            };
            filtered = filtered.filter(u => u.role === roleMap[activeTab]);
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(u =>
                u.name?.toLowerCase().includes(query) ||
                u.email?.toLowerCase().includes(query)
            );
        }
        return filtered;
    }, [users, activeTab, searchQuery]);

    const userStats = useMemo(() => {
        return {
            total: users.length,
            admins: users.filter(u => u.role === 'System Admin').length,
            organizers: users.filter(u => u.role === 'Organizer').length,
            users: users.filter(u => u.role === 'Standard User').length
        };
    }, [users]);

    const handleUpdateRole = (userId: string, updatedData: Partial<User>) => {
        setUsers(users.map(u => u._id === userId ? { ...u, ...updatedData } : u));
    };

    const handleEditClick = (user: User) => {
        setEditingUser(user);
        setIsEditing(true);
    };

    const handleDeleteClick = (userId: string) => {
        setDeleteUserId(userId);
        setShowDeleteConfirm(true);
    };

    const handleBlockToggle = async (userData: User) => {
        const newBlocked = !userData.isBlocked;
        try {
            await api.put(`/user/${userData._id}/block`, { isBlocked: newBlocked });
            setUsers(users.map(u => u._id === userData._id ? { ...u, isBlocked: newBlocked } : u));
            toast.success(newBlocked ? `${userData.name} has been blocked` : `${userData.name} has been unblocked`);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update block status');
        }
    };

    const confirmDelete = async () => {
        if (!deleteUserId) return;
        try {
            await api.delete(`/user/${deleteUserId}`);
            setUsers(users.filter(u => u._id !== deleteUserId));
            setShowDeleteConfirm(false);
            toast.success("User deleted successfully");
        } catch (err: any) {
            console.error("Error deleting user:", err);
            toast.error(err.response?.data?.message || "Error deleting user");
        }
    };

    const getRoleConfig = (role: string) => ROLE_CONFIG[role] || ROLE_CONFIG['Standard User'];

    return (
        <div className="admin-users-page">
            <motion.div className="admin-page-header" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="header-left">
                    <div className="header-icon-wrapper"><FiUsers /></div>
                    <div>
                        <h1>User Management</h1>
                        <p>Manage all users, roles, and permissions</p>
                    </div>
                </div>
                <div className="header-actions">
                    <Link href="/admin/users/create" className="nav-btn" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}><FiUserPlus /> Create User</Link>
                    <Link href="/admin/events" className="nav-btn"><FiCalendar /> {t('footer.link.events')}</Link>
                    <Link href="/admin/theaters" className="nav-btn"><FiGrid /> {t('admin.theaters')}</Link>
                    <button className="refresh-btn" onClick={fetchUsers} disabled={loading}>
                        <FiRefreshCw className={loading ? 'spinning' : ''} />
                    </button>
                </div>
            </motion.div>

            <motion.div className="stats-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <div className="stat-card total"><FiUsers className="stat-icon" /><div className="stat-info"><span className="stat-value">{userStats.total}</span><span className="stat-label">Total Users</span></div></div>
                <div className="stat-card admins"><FiShield className="stat-icon" /><div className="stat-info"><span className="stat-value">{userStats.admins}</span><span className="stat-label">Admins</span></div></div>
                <div className="stat-card organizers"><FiStar className="stat-icon" /><div className="stat-info"><span className="stat-value">{userStats.organizers}</span><span className="stat-label">Organizers</span></div></div>
                <div className="stat-card users"><FiUser className="stat-icon" /><div className="stat-info"><span className="stat-value">{userStats.users}</span><span className="stat-label">Standard Users</span></div></div>
            </motion.div>

            <motion.div className="controls-section" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input type="text" placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    {searchQuery && <button className="clear-search" onClick={() => setSearchQuery('')}><FiX /></button>}
                </div>
                <div className="role-tabs">
                    <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Users</button>
                    <button className={`tab-btn admins ${activeTab === 'admins' ? 'active' : ''}`} onClick={() => setActiveTab('admins')}><FiShield /> Admins ({userStats.admins})</button>
                    <button className={`tab-btn organizers ${activeTab === 'organizers' ? 'active' : ''}`} onClick={() => setActiveTab('organizers')}><FiStar /> Organizers ({userStats.organizers})</button>
                    <button className={`tab-btn users ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><FiUser /> Users ({userStats.users})</button>
                </div>
            </motion.div>

            {error && <motion.div className="error-banner" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}><FiAlertCircle /><span>{error}</span><button onClick={() => setError(null)}><FiX /></button></motion.div>}

            {loading && <div className="loading-state"><div className="loading-spinner" /><p>Loading users...</p></div>}

            {!loading && !error && filteredUsers.length > 0 && (
                <motion.div className="users-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                    <AnimatePresence>
                        {filteredUsers.map((userData, index) => {
                            const roleConfig = getRoleConfig(userData.role);
                            const RoleIcon = roleConfig.icon;
                            return (
                                <motion.div key={userData._id} className={`user-card${userData.isBlocked ? ' blocked' : ''}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: index * 0.03 }} whileHover={{ y: -3 }}>
                                    <div className="user-avatar">
                                        {userData.profilePicture ? <img src={userData.profilePicture} alt={userData.name} /> : <span>{userData.name?.charAt(0)?.toUpperCase() || '?'}</span>}
                                    </div>
                                    <div className="user-info">
                                        <h3 className="user-name">{userData.name}</h3>
                                        <div className="role-badge" style={{ background: roleConfig.bgColor, borderColor: roleConfig.borderColor, color: roleConfig.color }}><RoleIcon /><span>{userData.role}</span></div>
                                        {userData.isBlocked && <div className="blocked-badge"><FiSlash /><span>Blocked</span></div>}
                                    </div>
                                    <div className="user-actions">
                                        <Link href={`/admin/users/${userData._id}`} className="action-btn" title="View Details" style={{ width: 'auto', padding: '0 12px', gap: '6px', color: '#c4b5fd', borderColor: 'rgba(139, 92, 246, 0.4)' }}><FiEye /> Details</Link>
                                        <button className="action-btn edit" onClick={() => handleEditClick(userData)} title="Edit Role"><FiEdit2 /></button>
                                        <button
                                            className={`action-btn ${userData.isBlocked ? 'unblock' : 'block'}`}
                                            onClick={() => handleBlockToggle(userData)}
                                            title={userData.isBlocked ? 'Unblock User' : 'Block User'}
                                        >
                                            {userData.isBlocked ? <FiUnlock /> : <FiSlash />}
                                        </button>
                                        <button className="action-btn delete" onClick={() => handleDeleteClick(userData._id)} title="Delete User"><FiTrash2 /></button>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </motion.div>
            )}

            {!loading && !error && filteredUsers.length === 0 && (
                <motion.div className="empty-state" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}><FiUsers className="empty-icon" /><h2>No Users Found</h2><p>{searchQuery ? 'No users match your search criteria' : `No ${activeTab} found in the system`}</p></motion.div>
            )}

            <UpdateUserRoleModal isOpen={isEditing} user={editingUser} onClose={() => setIsEditing(false)} onUpdate={handleUpdateRole} />
            <ConfirmationDialog isOpen={showDeleteConfirm} title="Confirm Delete" message="Are you sure you want to delete this user? This action cannot be undone." confirmText="Yes, Delete" cancelText="Cancel" onConfirm={confirmDelete} onCancel={() => setShowDeleteConfirm(false)} />
        </div>
    );
};

export default AdminUsersPage;
