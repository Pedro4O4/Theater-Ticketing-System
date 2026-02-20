"use client";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import { toast } from 'react-toastify';
import PasswordStrengthIndicator from '@/components/shared/PasswordStrengthIndicator';
import '@/components/ForgotPasswordForm.css';

const ForgotPasswordForm = () => {
    const [email, setEmail] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleOtpChange = (index: number, value: string) => {
        if (value.length <= 1) {
            const newOtpDigits = [...otpDigits];
            newOtpDigits[index] = value;
            setOtpDigits(newOtpDigits);
            if (value && index < 5) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await api.post('/auth/forget-password', { email });
            toast.success('Verification code sent to your email');
            setStep(2);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const otp = otpDigits.join('');
        if (otp.length < 6 || !newPassword || !confirmPassword) { toast.error('Check all fields'); return; }
        if (newPassword !== confirmPassword) { toast.error('Passwords mismatch'); return; }
        try {
            setLoading(true);
            await api.post('/auth/verify-otp', { email, otp, newPassword });
            toast.success('Password reset! Redirecting...');
            setTimeout(() => router.push('/login'), 2000);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (step === 2) {
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [step]);

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">Reset Password</h2>
                <p className="redirect-link">{step === 1 ? 'Enter your email for the reset code.' : 'Enter the 6-digit code and your new password.'}</p>
                {step === 1 ? (
                    <form onSubmit={handleRequestOtp}>
                        <div className="form-group"><label>Email</label><input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Sending...' : 'Send OTP'}</button>
                    </form>
                ) : (
                    <div>
                        <div className="otp-form-container">
                            <div className="inp">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <input key={i} type="text" className="input" maxLength={1} value={otpDigits[i]} onChange={(e) => handleOtpChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} ref={(el) => { inputRefs.current[i] = el; }} />
                                ))}
                            </div>
                        </div>
                        <form onSubmit={handleResetPassword}>
                            <div className="form-group">
                                <label>New Password</label>
                                <input type="password" name="newPassword" className="form-input" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} placeholder="Create a secure password" />
                                <PasswordStrengthIndicator password={newPassword} />
                            </div>
                            <div className="form-group">
                                <label>Confirm Password</label>
                                <input type="password" name="confirmPassword" className="form-input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} placeholder="Confirm your password" />
                                {confirmPassword && newPassword !== confirmPassword && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--danger)' }}>
                                        ○ Passwords do not match
                                    </div>
                                )}
                                {confirmPassword && newPassword === confirmPassword && confirmPassword.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--success)' }}>
                                        ✓ Passwords match
                                    </div>
                                )}
                            </div>
                            <button type="submit" className="verify-btn" disabled={loading}>{loading ? 'Resetting...' : 'Update Password'}</button>
                        </form>
                    </div>
                )}
                <div className="redirect-link"><Link href="/login">Back to Login</Link></div>
            </div>
        </div>
    );
};

export default ForgotPasswordForm;
