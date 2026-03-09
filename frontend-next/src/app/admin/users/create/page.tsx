"use client";
import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    FiArrowLeft, FiUserPlus, FiMail, FiLock, FiUser,
    FiShield, FiStar, FiCheck, FiAlertCircle, FiUpload, FiX, FiCamera
} from 'react-icons/fi';
import api from '@/services/api';
import { toast } from 'react-toastify';
import '@/components/AdminComponent/AdminUsersPage.css';

const ROLES = [
    { value: 'Organizer', label: 'Organizer', icon: FiStar, color: '#f59e0b' },
    { value: 'System Admin', label: 'System Admin', icon: FiShield, color: '#ef4444' },
    { value: 'Scanner', label: 'Scanner', icon: FiCamera, color: '#10b981' },
];

const CreateUserPage = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'Organizer',
        phone: '',
        instapayNumber: '',
        instapayQR: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [qrPreview, setQrPreview] = useState<string | null>(null);
    const qrInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleRoleSelect = (role: string) => {
        // Only reset organizer-specific fields when actually switching away from Organizer
        setFormData(prev => ({
            ...prev,
            role,
            instapayNumber: prev.role !== role ? '' : prev.instapayNumber,
            instapayQR: prev.role !== role ? '' : prev.instapayQR,
        }));
        if (formData.role !== role) setQrPreview(null);
    };

    const handleQRUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Please upload a valid image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('Image must be smaller than 5MB');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setQrPreview(base64);
            setFormData(prev => ({ ...prev, instapayQR: base64 }));
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveQR = () => {
        setQrPreview(null);
        setFormData(prev => ({ ...prev, instapayQR: '' }));
        if (qrInputRef.current) qrInputRef.current.value = '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.name.trim()) {
            setError('Name is required');
            return;
        }
        if (!formData.password) {
            setError('Password is required');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        // Scanner-specific validation
        if (formData.role === 'Scanner') {
            if (!formData.username.trim()) {
                setError('Username is required for scanners');
                return;
            }
        } else {
            // Email and phone required for non-Scanner roles
            if (!formData.email.trim()) {
                setError('Email is required');
                return;
            }

            // Validate phone
            if (!formData.phone.trim()) {
                setError('Phone is required');
                return;
            }
            const phone = formData.phone.trim();
            if (!/^01\d{9}$/.test(phone)) {
                setError('Phone number must be 11 digits starting with 01');
                return;
            }
        }

        // Validate InstaPay
        let instapayNumber = '';
        if (formData.role === 'Organizer') {
            if (!formData.instapayNumber.trim()) {
                setError('InstaPay number is required for organizers');
                return;
            }
            instapayNumber = formData.instapayNumber.trim();
            if (!/^\d{11}$/.test(instapayNumber)) {
                setError('InstaPay number must be exactly 11 digits');
                return;
            }
        }

        try {
            setLoading(true);
            const payload: any = {
                name: formData.name.trim(),
                password: formData.password,
                role: formData.role,
            };

            if (formData.role === 'Scanner') {
                payload.username = formData.username.trim();
            } else {
                payload.email = formData.email.trim();
                payload.phone = formData.phone.trim();
                if (formData.role === 'Organizer') {
                    payload.instapayNumber = instapayNumber;
                    if (formData.instapayQR) payload.instapayQR = formData.instapayQR;
                }
            }

            const response = await api.post('/user/create', payload);

            if (response.data.success) {
                toast.success(`User "${formData.name}" created successfully as ${formData.role}`);
                router.push('/admin/users');
            }
        } catch (err: any) {
            console.error('Error creating user:', err);
            setError(err.response?.data?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-users-page">
            <motion.div
                className="admin-page-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="header-left">
                    <Link href="/admin/users" className="back-link">
                        <FiArrowLeft />
                    </Link>
                    <div className="header-icon-wrapper" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                        <FiUserPlus />
                    </div>
                    <div>
                        <h1>Create New User</h1>
                        <p>Add a new user with a specific role</p>
                    </div>
                </div>
            </motion.div>

            <motion.div
                className="create-user-form-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                    maxWidth: '600px',
                    margin: '2rem auto',
                    padding: '2rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
            >
                {error && (
                    <motion.div
                        className="error-banner"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ marginBottom: '1.5rem' }}
                    >
                        <FiAlertCircle />
                        <span>{error}</span>
                        <button onClick={() => setError(null)}>×</button>
                    </motion.div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Role Selection — First, so role-specific fields show correctly */}
                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                            Select Role *
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            {ROLES.map(role => {
                                const RoleIcon = role.icon;
                                const isSelected = formData.role === role.value;
                                return (
                                    <motion.button
                                        key={role.value}
                                        type="button"
                                        onClick={() => handleRoleSelect(role.value)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: isSelected ? `2px solid ${role.color}` : '2px solid rgba(255, 255, 255, 0.1)',
                                            background: isSelected ? `${role.color}20` : 'rgba(255, 255, 255, 0.03)',
                                            color: isSelected ? role.color : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <RoleIcon size={24} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 400 }}>
                                            {role.label}
                                        </span>
                                        {isSelected && <FiCheck size={16} />}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Name Field */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            <FiUser style={{ marginRight: '0.5rem' }} />
                            Full Name *
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter full name"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    {/* Username Field (Scanner Only) */}
                    {formData.role === 'Scanner' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                <FiUser style={{ marginRight: '0.5rem' }} />
                                Username *
                            </label>
                            <input
                                type="text"
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Enter scanner username"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    )}

                    {/* Email Field (Not for Scanner) */}
                    {formData.role !== 'Scanner' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                <FiMail style={{ marginRight: '0.5rem' }} />
                                Email Address *
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter email address"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    )}

                    {/* Phone Field (Not for Scanner) */}
                    {formData.role !== 'Scanner' && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                <span style={{ marginRight: '0.5rem' }}>📞</span>
                                Phone Number *
                            </label>
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="01xxxxxxxxx"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    )}

                    {/* InstaPay Fields (Organizer Only) */}
                    {formData.role === 'Organizer' && (
                        <>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <span style={{ marginRight: '0.5rem' }}>💳</span>
                                    InstaPay Number *
                                </label>
                                <input
                                    type="text"
                                    name="instapayNumber"
                                    value={formData.instapayNumber}
                                    onChange={handleChange}
                                    placeholder="Enter 11-digit InstaPay number"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        color: 'white',
                                        fontSize: '1rem'
                                    }}
                                />
                            </div>

                            {/* InstaPay QR Image Upload */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <FiUpload style={{ marginRight: '0.5rem' }} />
                                    InstaPay QR Code Image
                                </label>
                                {qrPreview ? (
                                    <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <img
                                            src={qrPreview}
                                            alt="InstaPay QR Preview"
                                            style={{
                                                width: '160px',
                                                height: '160px',
                                                objectFit: 'contain',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255,255,255,0.15)',
                                                background: 'rgba(255,255,255,0.05)',
                                                display: 'block'
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleRemoveQR}
                                            style={{
                                                position: 'absolute',
                                                top: '-8px',
                                                right: '-8px',
                                                background: '#ef4444',
                                                border: 'none',
                                                borderRadius: '50%',
                                                width: '24px',
                                                height: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                color: 'white',
                                                padding: 0
                                            }}
                                        >
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <motion.div
                                        whileHover={{ scale: 1.01 }}
                                        onClick={() => qrInputRef.current?.click()}
                                        style={{
                                            padding: '1.5rem',
                                            borderRadius: '8px',
                                            border: '2px dashed rgba(255,255,255,0.15)',
                                            background: 'rgba(255,255,255,0.03)',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            color: 'var(--text-secondary)'
                                        }}
                                    >
                                        <FiUpload size={28} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
                                        <p style={{ margin: 0, fontSize: '0.9rem' }}>Click to upload QR image</p>
                                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.6 }}>PNG, JPG up to 5MB</p>
                                    </motion.div>
                                )}
                                <input
                                    ref={qrInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleQRUpload}
                                    style={{ display: 'none' }}
                                />
                            </div>
                        </>
                    )}

                    {/* Password Field */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            <FiLock style={{ marginRight: '0.5rem' }} />
                            Password *
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter password (min 6 characters)"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    {/* Confirm Password Field */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                            <FiLock style={{ marginRight: '0.5rem' }} />
                            Confirm Password *
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Confirm password"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                fontSize: '1rem'
                            }}
                        />
                    </div>

                    {/* Role Selection moved to top */}

                    {/* Info Box */}
                    <div style={{
                        padding: '1rem',
                        borderRadius: '8px',
                        background: formData.role === 'Scanner' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(102, 126, 234, 0.1)',
                        border: formData.role === 'Scanner' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(102, 126, 234, 0.2)',
                        marginBottom: '1.5rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-secondary)'
                    }}>
                        {formData.role === 'Scanner' ? (
                            <><strong style={{ color: '#10b981' }}>Scanner Note:</strong> Scanners log in with <code>$username</code> and their password. <br /><strong>Important:</strong> Do NOT type the <code>$</code> prefix in the username field above; it is added automatically during login.</>
                        ) : (
                            <><strong style={{ color: '#667eea' }}>Note:</strong> The password you enter is temporary. When the user logs in, they will be prompted to set their own password and verify via OTP.</>
                        )}
                    </div>

                    {/* Submit Button */}
                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: loading ? 1 : 1.02 }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            borderRadius: '12px',
                            border: 'none',
                            background: loading ? 'rgba(102, 126, 234, 0.5)' : 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {loading ? (
                            <>
                                <div className="loading-spinner" style={{ width: '20px', height: '20px' }} />
                                Creating User...
                            </>
                        ) : (
                            <>
                                <FiUserPlus />
                                Create User
                            </>
                        )}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
};

export default CreateUserPage;
