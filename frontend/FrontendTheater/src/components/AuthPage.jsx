import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { toast } from "react-toastify";
import axios from "axios";
import './AuthPage.css';

export default function AuthPage() {
    const [isRegisterSide, setIsRegisterSide] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    // Login form states
    const [loginData, setLoginData] = useState({
        email: "",
        password: ""
    });
    const [loginError, setLoginError] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [showLoginOtp, setShowLoginOtp] = useState(false);
    const [loginOtp, setLoginOtp] = useState(['', '', '', '', '', '']);
    const [loginVerifyLoading, setLoginVerifyLoading] = useState(false);

    // Register form states
    const [registerData, setRegisterData] = useState({
        name: "",
        email: "",
        password: "",
        role: "Standard User",
    });
    const [registerError, setRegisterError] = useState("");
    const [registerLoading, setRegisterLoading] = useState(false);
    const [showRegisterOtp, setShowRegisterOtp] = useState(false);
    const [registerOtp, setRegisterOtp] = useState(['', '', '', '', '', '']);
    const [registerVerifyLoading, setRegisterVerifyLoading] = useState(false);

    // Handle mouse movement for split effect
    const handleMouseMove = (e) => {
        const windowWidth = window.innerWidth;
        const mouseX = e.clientX;
        
        if (mouseX > windowWidth * 0.6) {
            setIsRegisterSide(true);
        } else if (mouseX < windowWidth * 0.4) {
            setIsRegisterSide(false);
        }
    };

    // Login handlers
    const handleLoginChange = (e) => {
        setLoginData({ ...loginData, [e.target.name]: e.target.value });
    };

    const handleLoginOtpChange = (e, index) => {
        const value = e.target.value;
        if (value && !/^\d*$/.test(value)) return;

        const newOtp = [...loginOtp];
        newOtp[index] = value.substring(0, 1);
        setLoginOtp(newOtp);

        if (value && index < 5) {
            const nextInput = document.getElementById(`login-otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError("");

        try {
            const result = await login(loginData);

            if (result.success) {
                toast.success("Login successful!");
                navigate("/events");
            } else if (result.requiresVerification) {
                toast.info("Please verify your account with the code sent to your email");
                setShowLoginOtp(true);
            } else {
                toast.error(result.error || "Login failed");
            }
        } catch (err) {
            toast.error("An unexpected error occurred");
            console.error(err);
        } finally {
            setLoginLoading(false);
        }
    };

    const handleLoginVerifyOtp = async (e) => {
        e.preventDefault();
        setLoginVerifyLoading(true);
        setLoginError("");

        const otpString = loginOtp.join('');

        try {
            await axios.post("http://localhost:3000/api/v1/verify-otp-register", {
                email: loginData.email,
                otp: otpString
            });

            toast.success("Account verified successfully!");
            setShowLoginOtp(false);

            const result = await login(loginData);
            if (result.success) {
                navigate("/events");
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || "Verification failed";
            setLoginError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoginVerifyLoading(false);
        }
    };

    // Register handlers
    const handleRegisterChange = (e) => {
        setRegisterData({ ...registerData, [e.target.name]: e.target.value });
    };

    const handleRegisterOtpChange = (e, index) => {
        const value = e.target.value;
        if (value && !/^\d*$/.test(value)) return;

        const newOtp = [...registerOtp];
        newOtp[index] = value.substring(0, 1);
        setRegisterOtp(newOtp);

        if (value && index < 5) {
            const nextInput = document.getElementById(`register-otp-${index + 1}`);
            if (nextInput) nextInput.focus();
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setRegisterLoading(true);
        setRegisterError("");

        try {
            await axios.post("http://localhost:3000/api/v1/register", registerData);
            toast.success("Verification code sent to your email");
            setShowRegisterOtp(true);
        } catch (err) {
            const errorMessage = err.response?.data?.message || "Registration failed. Please try again.";
            setRegisterError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setRegisterLoading(false);
        }
    };

    const handleRegisterVerifyOtp = async (e) => {
        e.preventDefault();
        setRegisterVerifyLoading(true);
        setRegisterError("");

        const otpString = registerOtp.join('');

        try {
            await axios.post("http://localhost:3000/api/v1/verify-otp-register", {
                email: registerData.email,
                otp: otpString
            });

            toast.success("Registration successful! Redirecting to login...");
            setShowRegisterOtp(false);
            setIsRegisterSide(false);
            setTimeout(() => {
                setLoginData({ email: registerData.email, password: "" });
            }, 1000);
        } catch (err) {
            const errorMessage = err.response?.data?.message || "Verification failed. Please try again.";
            setRegisterError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setRegisterVerifyLoading(false);
        }
    };

    return (
        <div className="auth-page" onMouseMove={handleMouseMove}>
            {/* Animated Background */}
            <div className="auth-background">
                <div className="bg-shape bg-shape-1"></div>
                <div className="bg-shape bg-shape-2"></div>
                <div className="bg-shape bg-shape-3"></div>
            </div>

            {/* Left Side - Login */}
            <div className={`auth-panel auth-panel-left ${!isRegisterSide ? 'active' : ''}`}>
                <div className="auth-content">
                    <h1 className="auth-title">Welcome Back</h1>
                    <p className="auth-subtitle">Sign in to continue your journey</p>

                    {loginError && <div className="error-message">{loginError}</div>}

                    {!showLoginOtp ? (
                        <form onSubmit={handleLoginSubmit} className="auth-form">
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    className="form-input"
                                    value={loginData.email}
                                    onChange={handleLoginChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Enter your password"
                                    className="form-input"
                                    value={loginData.password}
                                    onChange={handleLoginChange}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn-primary" disabled={loginLoading}>
                                {loginLoading ? (
                                    <>
                                        <span className="form-loader"></span>
                                        Signing In...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>

                            <div className="auth-links">
                                <Link to="/forgot-password" className="auth-link">Forgot Password?</Link>
                            </div>
                        </form>
                    ) : (
                        <div className="otp-container">
                            <p className="otp-text">Enter verification code</p>
                            <form onSubmit={handleLoginVerifyOtp} className="otp-form-inline">
                                <div className="otp-inputs">
                                    {loginOtp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`login-otp-${index}`}
                                            type="text"
                                            className="otp-input"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handleLoginOtpChange(e, index)}
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={loginVerifyLoading || loginOtp.some(digit => !digit)}
                                >
                                    {loginVerifyLoading ? 'Verifying...' : 'Verify'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Register */}
            <div className={`auth-panel auth-panel-right ${isRegisterSide ? 'active' : ''}`}>
                <div className="auth-content">
                    <h1 className="auth-title">Join Us Today</h1>
                    <p className="auth-subtitle">Create an account to get started</p>

                    {registerError && <div className="error-message">{registerError}</div>}

                    {!showRegisterOtp ? (
                        <form onSubmit={handleRegisterSubmit} className="auth-form">
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Enter your full name"
                                    className="form-input"
                                    value={registerData.name}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Enter your email"
                                    className="form-input"
                                    value={registerData.email}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Create a secure password"
                                    className="form-input"
                                    value={registerData.password}
                                    onChange={handleRegisterChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Account Type</label>
                                <select
                                    name="role"
                                    value={registerData.role}
                                    onChange={handleRegisterChange}
                                    className="form-input"
                                >
                                    <option value="Standard User">Standard User</option>
                                    <option value="Organizer">Organizer</option>
                                </select>
                            </div>

                            <button type="submit" className="btn-primary" disabled={registerLoading}>
                                {registerLoading ? (
                                    <>
                                        <span className="form-loader"></span>
                                        Creating Account...
                                    </>
                                ) : (
                                    'Join Now'
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="otp-container">
                            <p className="otp-text">Enter verification code</p>
                            <form onSubmit={handleRegisterVerifyOtp} className="otp-form-inline">
                                <div className="otp-inputs">
                                    {registerOtp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`register-otp-${index}`}
                                            type="text"
                                            className="otp-input"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handleRegisterOtpChange(e, index)}
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    disabled={registerVerifyLoading || registerOtp.some(digit => !digit)}
                                >
                                    {registerVerifyLoading ? 'Verifying...' : 'Verify'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Indicators */}
            <div className="side-indicators">
                <div className={`indicator indicator-left ${!isRegisterSide ? 'active' : ''}`}>
                    <span>Login</span>
                </div>
                <div className={`indicator indicator-right ${isRegisterSide ? 'active' : ''}`}>
                    <span>Register</span>
                </div>
            </div>
        </div>
    );
}
