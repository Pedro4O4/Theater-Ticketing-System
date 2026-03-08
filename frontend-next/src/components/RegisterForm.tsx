'use client';

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/services/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "react-toastify";
import PasswordStrengthIndicator from '@/components/shared/PasswordStrengthIndicator';
import "./RegisterForm.css";

interface FormData {
    name: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
    role: string;
}

export default function RegisterForm() {
    const { t } = useLanguage();
    const [form, setForm] = useState<FormData>({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "Standard User",
    });
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter();

    // States for OTP verification
    const [showOtpForm, setShowOtpForm] = useState<boolean>(false);
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [verifyLoading, setVerifyLoading] = useState<boolean>(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        // Validate confirm password
        if (form.password !== form.confirmPassword) {
            setError("Passwords do not match");
            toast.error("Passwords do not match");
            setLoading(false);
            return;
        }

        const phone = form.phone.trim();
        if (!/^01\d{9}$/.test(phone)) {
            setError("Phone number must be 11 digits starting with 01");
            toast.error("Phone number must be 11 digits starting with 01");
            setLoading(false);
            return;
        }

        try {
            await api.post("/auth/register", {
                name: form.name,
                email: form.email,
                phone: phone,
                password: form.password,
            });
            toast.success("Verification code sent to your email");
            setShowOtpForm(true);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "Registration failed. Please try again.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleOtpChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value;

        // Only allow numbers
        if (value && !/^\d*$/.test(value)) return;

        // Update OTP state
        const newOtp = [...otp];
        newOtp[index] = value.substring(0, 1); // Only take first character
        setOtp(newOtp);

        // Auto-focus next input if value is entered
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleVerifyOtp = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setVerifyLoading(true);
        setError("");

        const otpString = otp.join('');

        try {
            await api.post("/auth/verify-registration", {
                email: form.email,
                otp: otpString
            });

            toast.success("Email verified! Choose your preferred language.");
            setTimeout(() => router.push('/choose-language'), 1200);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "Verification failed. Please try again.";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setVerifyLoading(false);
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
                <h1 className="login-title">{showOtpForm ? t('otp.title') : t('register.title')}</h1>

                {error && <div className="error-message">{error}</div>}

                {!showOtpForm ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-text">{t('register.name')}</span>
                            </label>
                            <div className="input-container">
                                <input
                                    type="text"
                                    name="name"
                                    placeholder={t('register.name.placeholder')}
                                    className="form-input"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                />
                                <i className="input-icon fas fa-user"></i>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-text">{t('login.email')}</span>
                            </label>
                            <div className="input-container">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder={t('login.email.placeholder')}
                                    className="form-input"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                                <i className="input-icon fas fa-envelope"></i>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-text">{t('register.phone')}</span>
                            </label>
                            <div className="input-container">
                                <input
                                    type="tel"
                                    name="phone"
                                    placeholder="01xxxxxxxxx"
                                    className="form-input"
                                    value={form.phone}
                                    onChange={handleChange}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    required
                                />
                                <i className="input-icon fas fa-phone"></i>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-text">{t('login.password')}</span>
                            </label>
                            <div className="input-container">
                                <input
                                    type="password"
                                    name="password"
                                    placeholder={t('login.password.placeholder')}
                                    className="form-input"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                />
                                <i className="input-icon fas fa-lock"></i>
                            </div>
                            <PasswordStrengthIndicator password={form.password} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-text">{t('register.confirmPassword')}</span>
                            </label>
                            <div className="input-container">
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder={t('register.confirmPassword.placeholder')}
                                    className="form-input"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                                <i className="input-icon fas fa-lock"></i>
                            </div>
                            {form.confirmPassword && form.password !== form.confirmPassword && (
                                <div className="password-mismatch">{t('register.passwordMismatch')}</div>
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
                                    {t('register.submit.loading')}
                                </>
                            ) : (
                                <>{t('register.submit')}</>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="otp-form-container">
                        <form className="otp-form" onSubmit={handleVerifyOtp}>
                            <div className="content">
                                <p style={{ textAlign: "center" }}>{t('otp.enter')}</p>
                                <div className="inp">
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            className="input"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(e, index)}
                                            autoFocus={index === 0}
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            autoComplete="one-time-code"
                                        />
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    className="verify-btn"
                                    disabled={verifyLoading || otp.some(digit => !digit)}
                                >
                                    {verifyLoading ? t('otp.verifying') : t('otp.verify')}
                                </button>
                            </div>
                            <svg className="svg" xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none">
                                <path className="path" d="M58 29.2C61.3 28.8 63.3 32.5 61.8 35.4C60.4 38.2 56.6 38.4 54.7 35.9C52.8 33.3 54.7 29.6 58 29.2Z" fill="#369eff"></path>
                            </svg>
                        </form>
                    </div>
                )}

                <div className="redirect-link">
                    <div>{t('register.haveAccount')} <Link href="/login">{t('register.signIn')}</Link></div>
                </div>
            </div>
        </div>
    );
}
