import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ForgotPassword.module.css";
import { Mail, Shield, KeyRound, Check } from "lucide-react";
import { notification } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import axios from "axios";

const ForgotPassword = () => {
    const [currentStep, setCurrentStep] = useState("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [countdown, setCountdown] = useState(0);
    const [otpExpiry, setOtpExpiry] = useState(0);
    const [loading, setLoading] = useState(false);
    const [api, contextHolder] = notification.useNotification();
    const navigate = useNavigate();

    // Countdown for resend button
    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    // Countdown for OTP expiry
    useEffect(() => {
        let timer;
        if (otpExpiry > 0) {
            timer = setTimeout(() => setOtpExpiry((t) => t - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [otpExpiry]);

    const formatTime = (seconds) => {
        const mm = Math.floor(seconds / 60).toString().padStart(2, "0");
        const ss = (seconds % 60).toString().padStart(2, "0");
        return `${mm}:${ss}`;
    };

    const openNotification = (type, detailMessage = "") => {
        if (type === "success") {
            api.open({
                message: "Action successful!",
                description: detailMessage,
                showProgress: true,
                pauseOnHover: true,
                icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            });
        } else {
            api.open({
                message: "Action failed!",
                description: detailMessage,
                showProgress: true,
                pauseOnHover: true,
                icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
            });
        }
    };

    // Request OTP (call backend here)
    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await axios.post("https://gental-care-dental.onrender.com/auth/request-otp", { email });
            setLoading(false);
            setCurrentStep("otp");
            setCountdown(60);
            setOtpExpiry(60);
            openNotification("success", res.data.message || "OTP has been sent to your email");
        } catch (error) {
            setLoading(false);
            openNotification("error", error.response?.data?.message || error.message || "Error");
        }
    };

    // Resend OTP (call backend here)
    const handleResendOTP = async (e) => {
        e?.preventDefault();
        if (countdown > 0) return;
        try {
            setLoading(true);
            const res = await axios.post("https://gental-care-dental.onrender.com/auth/request-otp", { email });

            setLoading(false);
            setCountdown(60);
            setOtpExpiry(60);
            openNotification("success", res.data.message || "OTP has been resent to your email");
        } catch (error) {
            setLoading(false);
            openNotification("error", error.response?.data?.message || error.message || "Error");
        }
    };

    // Verify OTP (call backend here)
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await axios.post("https://gental-care-dental.onrender.com/auth/verify-otp", { email, otp });

            setLoading(false);
            setCurrentStep("password");
            openNotification("success", res.data.message || "Verify OTP successfully");
        } catch (error) {
            setLoading(false);
            openNotification("error", error.response?.data?.message || error.message || "Error");
        }
    };

    // Reset password (call backend here)
    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            const res = await axios.post("https://gental-care-dental.onrender.com/auth/reset-password", {
                email,
                newPassword,
                confirmNewPassword,
            });

            setLoading(false);
            openNotification("success", res.data.message || "Reset pasword successfully");
            setCurrentStep("email");
            setEmail("");
            setOtp("");
            setNewPassword("");
            setConfirmNewPassword("");
            setTimeout(() => {
                navigate("/");
            }, 1000);
        } catch (error) {
            setLoading(false);
            openNotification("error", error.response?.data?.message || error.message || "Error");
        }
    };

    const steps = [
        { id: "email", title: "Email", icon: Mail, completed: currentStep !== "email" },
        { id: "otp", title: "Verification", icon: Shield, completed: currentStep === "password" },
        { id: "password", title: "New password", icon: KeyRound, completed: false },
    ];

    return (
        <div className={styles.container}>
            {contextHolder}
            <div className={styles.wrapper}>
                {/* Step indicator */}
                <div className={styles.stepContainer}>
                    <div className={styles.stepsRow}>
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = step.id === currentStep;
                            const isCompleted = step.completed;

                            return (
                                <React.Fragment key={step.id}>
                                    {/* Circle */}
                                    <div
                                        className={`${styles.circle} ${isCompleted ? styles.circleCompleted : isActive ? styles.circleActive : styles.circleDefault
                                            }`}
                                    >
                                        {isCompleted ? <Check className={styles.icon} /> : <Icon className={styles.icon} />}
                                    </div>

                                    {index < steps.length - 1 && (
                                        <div
                                            className={`${styles.connector} ${(isCompleted && steps[index + 1].completed) || (isCompleted && index < steps.length - 1)
                                                ? styles.connectorActive
                                                : ""
                                                }`}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    <p className={styles.stepText}>
                        Step {steps.findIndex((s) => s.id === currentStep) + 1} / {steps.length}
                    </p>
                </div>

                {/* Card */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>
                            {currentStep === "email" && "Forgot your password?"}
                            {currentStep === "otp" && "Enter verification code"}
                            {currentStep === "password" && "Create a new password"}
                        </h2>
                        <p className={styles.cardDescription}>
                            {currentStep === "email" && "Enter your email to receive a verification code"}
                            {currentStep === "otp" && `A verification code was sent to ${email}`}
                            {currentStep === "password" && "Create a new password for your account"}
                        </p>
                    </div>

                    <div className={styles.cardContent}>
                        {/* Email step */}
                        {currentStep === "email" && (
                            <form onSubmit={handleEmailSubmit} className={styles.form}>
                                <label htmlFor="email" className={styles.label}>
                                    Your email
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="example@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={styles.input}
                                />
                                <button type="submit" className={`${styles.btnSending} ${styles.btnPrimary}`} disabled={loading}>
                                    {loading ? "Sending..." : "Send verification code"}
                                </button>
                            </form>
                        )}

                        {/* OTP step */}
                        {currentStep === "otp" && (
                            <form onSubmit={handleOtpSubmit} className={styles.form}>
                                <label htmlFor="otp" className={styles.label}>
                                    Verification code (6 digits)
                                </label>

                                {otpExpiry > 0 ? (
                                    <div className={styles.infoBox}>
                                        <p className={styles.infoText}>
                                            <span className={styles.muted}>Code will expire in: </span>
                                            <span className={styles.expiryTime}>{formatTime(otpExpiry)}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className={styles.warningBox}>
                                        <p className={styles.warningText}>OTP expired. Please resend to get a new code.</p>
                                    </div>
                                )}

                                <input
                                    id="otp"
                                    type="text"
                                    placeholder="123456"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength={6}
                                    className={`${styles.input} ${styles.otpInput}`}
                                />

                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep("email")}
                                        className={`${styles.btn} ${styles.btnOutline}`}
                                    >
                                        ← Back
                                    </button>

                                    <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={loading}>
                                        {loading ? "Verifying..." : "Verify"}
                                    </button>
                                </div>

                                <div className={styles.center}>
                                    <button
                                        type="button"
                                        className={`${styles.link} ${countdown > 0 ? styles.disabled : ""}`}
                                        onClick={countdown === 0 ? handleResendOTP : undefined}
                                        disabled={countdown > 0}
                                    >
                                        {countdown > 0 ? `Resend code (${countdown}s)` : "Resend code"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Password step */}
                        {currentStep === "password" && (
                            <form onSubmit={handlePasswordSubmit} className={styles.form}>
                                <label htmlFor="newPassword" className={styles.label}>
                                    New password
                                </label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={styles.input}
                                />

                                <label htmlFor="confirmNewPassword" className={styles.label}>
                                    Confirm password
                                </label>
                                <input
                                    id="confirmNewPassword"
                                    type="password"
                                    placeholder="Re-enter new password"
                                    value={confirmNewPassword}
                                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                                    className={styles.input}
                                />

                                <div className={styles.actions}>
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep("otp")}
                                        className={`${styles.btn} ${styles.btnOutline}`}
                                    >
                                        ← Back
                                    </button>

                                    <button
                                        type="submit"
                                        className={`${styles.btn} ${styles.btnPrimary}`}
                                        disabled={loading}
                                    >
                                        {loading ? "Submitting..." : "Finish"}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className={styles.center}>
                            <a href="/" className={styles.linkSecondary}>
                                Back to home
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
