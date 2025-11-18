import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ChangePassword.module.css";
import axios from "axios";
import Image from '../assets/DentalImage.png';
import { Eye, EyeOff } from "lucide-react";
import Header from "../components/Header";

function ChangePassword() {
    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
        if (errors.submit) {
            setErrors((prev) => ({ ...prev, submit: "" }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage("");
        setErrors({});

        setIsLoading(true);

        try {
            const token = localStorage.getItem("token");
            const payload = {
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword,
                confirmNewPassword: formData.confirmPassword,
            };

            const res = await axios.post(
                "http://localhost:5000/auth/change-password", payload,
                {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : "",
                    },
                }
            );

            setSuccessMessage(
                (res && res.data && res.data.message) || "Password updated successfully!"
            );
            setFormData({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setTimeout(() => {
                navigate("/home");
            }, 1000);
        } catch (err) {
            const serverMsg =
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                null;
            console.error("Password change error:", err, serverMsg);
            if (serverMsg) {
                if (typeof serverMsg === "string") {
                    setErrors({ submit: serverMsg });
                } else if (typeof serverMsg === "object") {
                    setErrors((prev) => ({ ...prev, ...serverMsg }));
                } else {
                    setErrors({ submit: "Failed to update password. Please try again." });
                }
            } else {
                setErrors({ submit: "Failed to update password. Please try again." });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
    };

    return (
        <div className={styles.ChangePassword}>
            <Header />
            <div className={styles.container}>
                <div className={styles.layoutWrapper}>
                    {/* Left side - Dental illustration */}
                    <div className={styles.imageSection}>
                        <div className={styles.imageContainer}>
                            <img
                                src={Image}
                                alt="Dental clinic illustration"
                                className={styles.dentalImage}
                            />
                            <div className={styles.imageOverlay}>
                                <h2 className={styles.imageTitle}>Secure Your Account</h2>
                                <p className={styles.imageSubtitle}>
                                    Keep your dental practice management system safe with a strong
                                    password
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right side - Password change form */}
                    <div className={styles.formSection}>
                        <div className={styles.card}>
                            <div className={styles.header}>
                                <h1 className={styles.title}>Change Your Password</h1>
                                <p className={styles.subtitle}>
                                    Please enter your current password and the new password you wish
                                    to set.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className={styles.form} noValidate>
                                <div className={styles.inputGroup}>
                                    <label htmlFor="currentPassword" className={styles.label}>
                                        Current Password
                                    </label>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            aria-label="Current password"
                                            autoComplete="current-password"
                                            type={showPasswords.current ? "text" : "password"}
                                            id="currentPassword"
                                            name="currentPassword"
                                            value={formData.currentPassword}
                                            onChange={handleInputChange}
                                            placeholder="Enter current password"
                                            className={`${styles.input} ${errors.currentPassword ? styles.inputError : ""
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            aria-label="Toggle current password visibility"
                                            onClick={() => togglePasswordVisibility("current")}
                                            className={styles.toggleButton} >
                                            {showPasswords.current ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {errors.currentPassword && (
                                        <span className={styles.errorMessage}>
                                            {errors.currentPassword}
                                        </span>
                                    )}
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="newPassword" className={styles.label}>
                                        New Password
                                    </label>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            aria-label="New password"
                                            autoComplete="new-password"
                                            type={showPasswords.new ? "text" : "password"}
                                            id="newPassword"
                                            name="newPassword"
                                            value={formData.newPassword}
                                            onChange={handleInputChange}
                                            placeholder="Enter new password"
                                            className={`${styles.input} ${errors.newPassword ? styles.inputError : ""
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            aria-label="Toggle new password visibility"
                                            onClick={() => togglePasswordVisibility("new")}
                                            className={styles.toggleButton}>
                                            {showPasswords.new ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {errors.newPassword && (
                                        <span className={styles.errorMessage}>
                                            {errors.newPassword}
                                        </span>
                                    )}
                                </div>

                                <div className={styles.inputGroup}>
                                    <label htmlFor="confirmPassword" className={styles.label}>
                                        Confirm New Password
                                    </label>
                                    <div className={styles.inputWrapper}>
                                        <input
                                            aria-label="Confirm new password"
                                            autoComplete="new-password"
                                            type={showPasswords.confirm ? "text" : "password"}
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            placeholder="Re-enter new password"
                                            className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""
                                                }`}
                                        />
                                        <button
                                            type="button"
                                            aria-label="Toggle confirm password visibility"
                                            onClick={() => togglePasswordVisibility("confirm")}
                                            className={styles.toggleButton} >
                                            {showPasswords.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    </div>
                                    {errors.confirmPassword && (
                                        <span className={styles.errorMessage}>
                                            {errors.confirmPassword}
                                        </span>
                                    )}
                                </div>

                                {successMessage && (
                                    <div className={styles.successMessage} role="status">
                                        <span className={styles.successIcon}>✓</span>
                                        {successMessage}
                                    </div>
                                )}

                                {errors.submit && (
                                    <div className={styles.errorMessage} role="alert">
                                        {errors.submit}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className={`${styles.submitButton} ${isLoading ? styles.submitButtonLoading : ""
                                        }`}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className={styles.spinner} aria-hidden="true" />
                                            Updating Password...
                                        </>
                                    ) : (
                                        "Update Password"
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ChangePassword;
