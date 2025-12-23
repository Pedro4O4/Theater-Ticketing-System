'use client';

import { useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "react-toastify";
import api from "@/services/api";
import './LoginForm.css';

interface FormData {
    email: string;
    password: string;
}

export default function LoginForm() {
    const [formData, setFormData] = useState<FormData>({
        email: "",
        password: ""
    });
    const [error, setError] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter();
    const { login } = useAuth();

    // States for OTP verification
    const [showOtpForm, setShowOtpForm] = useState<boolean>(false);
    const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [verifyLoading, setVerifyLoading] = useState<boolean>(false);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleOtpChange = (e: ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value;

        // Only allow numbers
        if (value && !/^\d*$/.test(value)) return;

        // Update OTP state
        const newOtp = [...otp];
        newOtp[index] = value.substring(0, 1);
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const result = await login(formData) as any;
            console.log("Login result in LoginForm:", result);

            if (result.success) {
                toast.success("Login successful!");
                router.push("/events");
            } else if (result.requiresPasswordChange) {
                toast.info("Please set your own password");
                router.push(`/set-password?email=${encodeURIComponent(result.email)}`);
            } else if (result.requiresVerification) {
                console.log("Switching to OTP form...");
                toast.info("Please verify your account");
                setShowOtpForm(true);
            } else {
                toast.error(result.error || "Login failed");
                setError(result.error || "Login failed");
            }
        } catch (err) {
            console.error("LoginForm handleSubmit try/catch/at:", err);
            toast.error("An unexpected error occurred");
        } finally {
            console.log("Setting loading to false");
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setVerifyLoading(true);
        setError("");

        const otpString = otp.join('');

        try {
            await api.post("/auth/verify-registration", {
                email: formData.email,
                otp: otpString
            });

            toast.success("Account verified successfully!");
            setShowOtpForm(false);

            // Try logging in again
            const result = await login(formData);
            if (result.success) {
                router.push("/events");
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || "Verification failed";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setVerifyLoading(false);
        }
    };

    const handleResendCode = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        try {
            toast.info("Requesting new verification code...");

            try {
                await api.post("/auth/login", {
                    email: formData.email,
                    password: formData.password
                });
            } catch (err: any) {
                // If it's a 403 verification required error, this is actually what we want
                if (err.response?.status === 403 &&
                    err.response?.data?.message?.includes("verification")) {
                    toast.success("New verification code sent to your email");
                    return;
                }
                throw err; // Re-throw if it's a different error
            }

            toast.success("New verification code sent to your email");
        } catch (error) {
            console.error("Error resending code:", error);
            toast.error("Failed to resend verification code");
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
                <h1 className="login-title">{showOtpForm ? "Verify Your Account" : "Welcome Back"}</h1>

                {error && <div className="error-message">{error}</div>}

                {!showOtpForm ? (
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-text">Email Address</span>
                            </label>
                            <div className="input-container">
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    className="form-input"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                                <i className="input-icon fas fa-envelope"></i>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                <span className="label-text">Password</span>
                            </label>
                            <div className="input-container">
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    className="form-input"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <i className="input-icon fas fa-lock"></i>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="form-loader"></span>
                                    Signing In...
                                </>
                            ) : (
                                <>Sign In</>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="otp-form-container">
                        <form className="otp-form" onSubmit={handleVerifyOtp}>
                            <div className="content">
                                <p>Enter verification code</p>
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
                                        />
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    className="verify-btn"
                                    disabled={verifyLoading || otp.some(digit => !digit)}
                                >
                                    {verifyLoading ? 'Verifying...' : 'Verify'}
                                </button>
                                <p style={{ textAlign: "center", marginTop: "10px", fontSize: "0.8rem" }}>
                                    <a
                                        href="#"
                                        onClick={handleResendCode}
                                        style={{ color: "var(--primary)", textDecoration: "underline" }}
                                    >
                                        Didn&apos;t receive a code? Resend
                                    </a>
                                </p>
                            </div>
                            <svg className="svg" xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" fill="none">
                                <path className="path" d="M58 29.2C61.3 28.8 63.3 32.5 61.8 35.4C60.4 38.2 56.6 38.4 54.7 35.9C52.8 33.3 54.7 29.6 58 29.2Z" fill="var(--primary)"></path>
                            </svg>
                        </form>
                    </div>
                )}

                <div className="redirect-link">
                    <div>Don&apos;t have an account? <Link href="/register">Register</Link></div>
                    <div>Forgot your password? <Link href="/forgot-password">Reset Password</Link></div>
                </div>
            </div>
        </div>
    );
}
