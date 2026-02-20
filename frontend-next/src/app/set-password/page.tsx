"use client";
import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiAlertCircle } from 'react-icons/fi';
import api from '@/services/api';
import { toast } from 'react-toastify';
import PasswordStrengthIndicator from '@/components/shared/PasswordStrengthIndicator';
import '@/components/RegisterForm.css';

type Step = 'password' | 'otp';

const SetPasswordContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [step, setStep] = useState<Step>('password');
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(emailParam);
        } else {
            router.push('/login');
        }
    }, [searchParams, router]);

    const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value;
        if (value && !/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(0, 1);
        setOtp(newOtp);
        if (value && index < 5) {
            const nextInput = document.getElementById(`set-otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            const prevInput = document.getElementById(`set-otp-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const handleSubmitPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!newPassword) {
            setError('Password is required');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post('/auth/submit-password', {
                email,
                newPassword
            });

            if (response.data.success) {
                toast.success('Password saved! Please verify with OTP.');
                setStep('otp');
            }
        } catch (err: any) {
            console.error('Error submitting password:', err);
            setError(err.response?.data?.message || 'Failed to submit password');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const otpString = otp.join('');
        if (!otpString || otpString.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        try {
            setLoading(true);
            const response = await api.post('/auth/verify-activate', {
                email,
                otp: otpString
            });

            if (response.data.success) {
                toast.success('Account activated! Redirecting...');

                const userRole = response.data.data.user.role;

                setTimeout(() => {
                    if (userRole === 'System Admin') {
                        window.location.href = '/admin/users';
                    } else if (userRole === 'Organizer') {
                        window.location.href = '/my-events';
                    } else {
                        window.location.href = '/events';
                    }
                }, 1000);
            }
        } catch (err: any) {
            console.error('Error verifying OTP:', err);
            setError(err.response?.data?.message || 'Invalid or expired OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="background-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>
            <div className="login-card">
                <div className="card-decoration"></div>
                <h1 className="login-title">
                    {step === 'password' ? 'Set Your Password' : 'Verify Your Email'}
                </h1>

                {error && <div className="error-message">{error}</div>}

                {/* Email badge */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    background: 'rgba(139, 92, 246, 0.12)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.2rem',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                }}>
                    <i className="input-icon fas fa-envelope" style={{ color: 'var(--primary)', fontSize: '0.85rem' }}></i>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{email}</span>
                </div>

                {step === 'password' ? (
                    <form onSubmit={handleSubmitPassword} autoComplete="on">
                        <input type="hidden" name="email" value={email} autoComplete="username" />

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-text">New Password</span>
                            </label>
                            <div className="input-container">
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Create a secure password"
                                    className="form-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                                <i className="input-icon fas fa-lock"></i>
                            </div>
                            <PasswordStrengthIndicator password={newPassword} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-text">Confirm Password</span>
                            </label>
                            <div className="input-container">
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder="Confirm your new password"
                                    className="form-input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                                <i className="input-icon fas fa-shield-alt"></i>
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    marginTop: '0.4rem',
                                    fontSize: '0.75rem',
                                    color: 'var(--danger)',
                                }}>
                                    <FiAlertCircle size={12} />
                                    Passwords do not match
                                </div>
                            )}
                            {confirmPassword && newPassword === confirmPassword && confirmPassword.length > 0 && (
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    marginTop: '0.4rem',
                                    fontSize: '0.75rem',
                                    color: 'var(--success)',
                                }}>
                                    ✓ Passwords match
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="form-loader"></span>
                                    Saving...
                                </>
                            ) : (
                                <>Continue</>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="otp-form-container">
                        <form className="otp-form" onSubmit={handleVerifyOtp}>
                            <div className="content">
                                <p style={{ textAlign: "center" }}>Enter verification code</p>
                                <div className="inp">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`set-otp-${index}`}
                                            type="text"
                                            className="input"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(e, index)}
                                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    className="verify-btn"
                                    disabled={loading || otp.some(digit => !digit)}
                                >
                                    {loading ? 'Verifying...' : 'Activate Account'}
                                </button>
                            </div>
                            <svg className="svg" xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none">
                                <path className="path" d="M58 29.2C61.3 28.8 63.3 32.5 61.8 35.4C60.4 38.2 56.6 38.4 54.7 35.9C52.8 33.3 54.7 29.6 58 29.2Z" fill="var(--primary)"></path>
                            </svg>
                        </form>
                    </div>
                )}

                {/* Step Indicator */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    marginTop: '1.5rem',
                }}>
                    <div style={{
                        width: '40px',
                        height: '4px',
                        borderRadius: '2px',
                        background: step === 'password'
                            ? 'var(--primary)'
                            : 'rgba(139, 92, 246, 0.25)',
                        transition: 'all 0.3s ease',
                    }} />
                    <div style={{
                        width: '40px',
                        height: '4px',
                        borderRadius: '2px',
                        background: step === 'otp'
                            ? 'var(--primary)'
                            : 'rgba(139, 92, 246, 0.25)',
                        transition: 'all 0.3s ease',
                    }} />
                </div>
            </div>
        </div>
    );
};

const SetPasswordPage = () => {
    return (
        <Suspense fallback={
            <div className="login-container">
                <div className="login-card" style={{ textAlign: 'center' }}>
                    <span className="form-loader" style={{ display: 'inline-block' }}></span>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading...</p>
                </div>
            </div>
        }>
            <SetPasswordContent />
        </Suspense>
    );
};

export default SetPasswordPage;
