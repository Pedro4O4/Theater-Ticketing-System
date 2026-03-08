'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    FiUser, FiMail, FiCalendar, FiEdit, FiArrowLeft,
    FiActivity, FiDollarSign,
    FiUsers, FiClock,
    FiGrid, FiPlus, FiPieChart, FiSettings, FiPhone
} from 'react-icons/fi';
import { IconType } from 'react-icons';
import api from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import './ProfilePage.css';

interface UserData {
    name?: string;
    email?: string;
    phone?: string;
    instapayNumber?: string;
    instapayQR?: string;
    role?: string;
    createdAt?: string;
    profilePicture?: string;
}

interface QuickAction {
    label: string;
    icon: IconType;
    path: string;
    variant: string;
}

const ProfilePage = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [profileImage, setProfileImage] = useState<string | null>(user?.profilePicture || null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [userData, setUserData] = useState<UserData | null>(null);
    const router = useRouter();

    useEffect(() => {
        if (user?.profilePicture) {
            setProfileImage(user.profilePicture);
        }
    }, [user]);

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/user/profile');

            const fetchedUserData = response.data.data || response.data;
            setUserData(fetchedUserData);

            if (fetchedUserData.profilePicture) {
                setProfileImage(fetchedUserData.profilePicture);
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
            setError("Failed to load profile data");
        } finally {
            setIsLoading(false);
        }
    };

    const displayUser = userData || user;

    // Role-specific quick actions
    const getQuickActions = (): QuickAction[] => {
        const role = displayUser?.role;

        if (role === "Standard User") {
            return [
                { label: t('profile.exploreEvents'), icon: FiGrid, path: "/events", variant: "primary" },
                { label: t('profile.myBookings'), icon: FiCalendar, path: "/bookings", variant: "secondary" }
            ];
        } else if (role === "Organizer") {
            return [
                { label: t('profile.myEvents'), icon: FiCalendar, path: "/my-events", variant: "primary" },
                { label: t('profile.createEvent'), icon: FiPlus, path: "/my-events/new", variant: "success" },
                { label: t('nav.analytics'), icon: FiPieChart, path: "/my-events/analytics", variant: "secondary" }
            ];
        } else if (role === "System Admin") {
            return [
                { label: t('profile.manageEvents'), icon: FiCalendar, path: "/admin/events", variant: "primary" },
                { label: t('profile.manageUsers'), icon: FiUsers, path: "/admin/users", variant: "secondary" },
                { label: t('profile.theaters'), icon: FiSettings, path: "/admin/theaters", variant: "tertiary" }
            ];
        }
        return [];
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                delayChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    if (isLoading && !displayUser) {
        return (
            <div className="profile-page">
                <div className="profile-loading">
                    <div className="loading-spinner">
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                        <div className="spinner-ring"></div>
                    </div>
                    <p>{t('profile.loadingProfile')}</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            className="profile-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            {/* Animated Background */}
            <div className="page-background">
                <div className="bg-gradient-orb orb-1"></div>
                <div className="bg-gradient-orb orb-2"></div>
                <div className="bg-gradient-orb orb-3"></div>
            </div>

            <motion.div
                className="profile-container"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {error && <div className="error-message">{error}</div>}

                {/* Profile Header Card */}
                <motion.div className="profile-card profile-header-card" variants={itemVariants}>
                    <div className="profile-header">
                        <motion.div
                            className="avatar-container"
                            whileHover={{ scale: 1.05 }}
                        >
                            {profileImage ? (
                                <img
                                    src={profileImage}
                                    alt="Profile"
                                    className="profile-avatar"
                                />
                            ) : (
                                <div className="profile-avatar">
                                    {displayUser?.name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                            )}
                            <div className="avatar-ring"></div>
                            <div className="avatar-status online"></div>
                        </motion.div>

                        <div className="profile-info">
                            <h1 className="profile-name">{displayUser?.name || "User"}</h1>
                            <span className={`role-badge role-${displayUser?.role?.toLowerCase().replace(' ', '-')}`}>
                                {displayUser?.role || "Standard User"}
                            </span>
                        </div>
                    </div>

                    <div className="profile-details">
                        <div className="detail-item">
                            <FiMail className="detail-icon" />
                            <span>{displayUser?.email || "No email"}</span>
                        </div>
                        {(displayUser as any)?.phone && (
                            <div className="detail-item">
                                <FiPhone className="detail-icon" />
                                <span>{(displayUser as any).phone}</span>
                            </div>
                        )}
                        {displayUser?.role === 'Organizer' && (displayUser as any)?.instapayNumber && (
                            <div className="detail-item">
                                <FiDollarSign className="detail-icon" />
                                <span>InstaPay: {(displayUser as any).instapayNumber}</span>
                            </div>
                        )}
                        <div className="detail-item">
                            <FiCalendar className="detail-icon" />
                            <span>Joined {displayUser?.createdAt ? new Date(displayUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Unknown"}</span>
                        </div>
                    </div>

                    {/* InstaPay QR Code for Organizers */}
                    {displayUser?.role === 'Organizer' && (displayUser as any)?.instapayQR && (
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '1.2rem',
                            background: 'rgba(139, 92, 246, 0.08)',
                            borderRadius: '16px',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                            textAlign: 'center'
                        }}>
                            <p style={{ color: '#a78bfa', fontWeight: 600, marginBottom: '0.8rem', fontSize: '1.05rem' }}>
                                <FiDollarSign style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                InstaPay QR Code
                            </p>
                            <img
                                src={(displayUser as any).instapayQR}
                                alt="InstaPay QR"
                                style={{
                                    maxWidth: '240px',
                                    width: '100%',
                                    borderRadius: '12px',
                                    border: '2px solid rgba(139, 92, 246, 0.3)',
                                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.15)'
                                }}
                            />
                        </div>
                    )}
                </motion.div>

                {/* Quick Actions Section */}
                <motion.div className="actions-section" variants={itemVariants}>
                    <h2 className="section-title">
                        <FiActivity className="section-icon" />
                        {t('profile.quickActions')}
                    </h2>
                    <div className="actions-grid">
                        {getQuickActions().map((action) => (
                            <motion.div
                                key={action.label}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Link
                                    href={action.path}
                                    className={`action-card action-${action.variant}`}
                                >
                                    <action.icon className="action-icon" />
                                    <span>{action.label}</span>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Profile Buttons */}
                <motion.div className="profile-buttons" variants={itemVariants}>
                    <motion.button
                        className="profile-btn primary"
                        onClick={() => router.push('/profile/edit')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiEdit />
                        {t('profile.editProfile')}
                    </motion.button>
                    <motion.button
                        className="profile-btn secondary"
                        onClick={() => router.push('/events')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiArrowLeft />
                        {t('profile.backToEvents')}
                    </motion.button>
                </motion.div>
            </motion.div>
        </motion.div>
    );
};

export default ProfilePage;
