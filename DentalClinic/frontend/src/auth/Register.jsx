import React, { useState } from 'react';
import { Mail, User, Phone, Calendar, Heart, VenusAndMars, MapPinHouse } from 'lucide-react';
import styles from './Register.module.css';
import axios from 'axios';
import { notification } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { Link } from 'react-router-dom';

function Register() {
    const [api, contextHolder] = notification.useNotification();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        dateOfBirth: '',
        gender: '',
        address: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    
    const openNotification = (type, detailMessage = "") => {
        if (type === "success") {
            api.open({
                message: "Action successful!",
                description: "Create new user successful.",
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // // Frontend validation
        // if (!formData.fullName || !formData.email || !formData.phoneNumber ||
        //     !formData.dateOfBirth || !formData.gender || !formData.address) {
        //     openNotification("error", "Vui lòng nhập đầy đủ thông tin!");
        //     return;
        // }

        // // Validate fullName
        // if (formData.fullName.trim().length < 2 || formData.fullName.trim().length > 50) {
        //     openNotification("error", "Họ tên phải từ 2 đến 50 ký tự!");
        //     return;
        // }

        // if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(formData.fullName)) {
        //     openNotification("error", "Họ tên chỉ được chứa chữ cái và khoảng trắng!");
        //     return;
        // }

        // // Validate phoneNumber
        // if (!/^0[0-9]{9}$/.test(formData.phoneNumber)) {
        //     openNotification("error", "Số điện thoại phải bắt đầu bằng 0 và có 10 chữ số!");
        //     return;
        // }

        // // Validate dateOfBirth
        // const birthDate = new Date(formData.dateOfBirth);
        // const today = new Date();
        // if (birthDate > today) {
        //     openNotification("error", "Ngày sinh không thể là ngày trong tương lai!");
        //     return;
        // }

        // // Validate address
        // if (formData.address.trim().length < 5 || formData.address.trim().length > 255) {
        //     openNotification("error", "Địa chỉ phải từ 5 đến 255 ký tự!");
        //     return;
        // }

        setIsLoading(true);
        
        try {
            await axios.post('https://gental-care-dental.onrender.com/user/register', formData);
            openNotification("success");
            setFormData({
                fullName: '',
                email: '',
                phoneNumber: '',
                dateOfBirth: '',
                gender: '',
                address: '',
            });
        } catch (error) {
            console.error('Registration failed:', error);
            if (error.response && error.response.data) {
                if (error.response.data.errors && error.response.data.errors.length > 0) {
                    openNotification("error", error.response.data.errors[0].msg);
                } else if (error.response.data.message) {
                    openNotification("error", error.response.data.message);
                } else {
                    openNotification("error", "Register failed!");
                }
            } else {
                openNotification("error", "Register failed!");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {contextHolder}
            <div className={styles.registerCard}>
                {/* Header Section */}
                <div className={styles.headerSection}>
                    <div className={styles.logo}>
                        <Heart className={styles.logoIcon} />
                    </div>
                    <h1 className={styles.title}>Gentle Care Dental</h1>
                </div>

                {/* Form Section */}
                <div className={styles.formSection}>
                    <div className={styles.welcomeText}>
                        <h2 className={styles.welcomeTitle}>Welcome!</h2>
                        <p className={styles.welcomeSubtitle}>Sign up to start taking care of your smile</p>
                    </div>

                    <form onSubmit={handleSubmit} className={styles.formContainer}>
                        {/* Email Input */}
                        <div className={styles.inputGroup}>
                            <label htmlFor="email" className={styles.label}>
                                Email <span className={styles.required}>*</span>
                            </label>
                            <div className={styles.inputWrapper}>
                                <Mail className={styles.inputIcon} size={20} />
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    className={styles.input}
                                    placeholder="your@gmail.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* Fullname Input */}
                        <div className={styles.inputGroup}>
                            <label htmlFor="fullName" className={styles.label}>
                                Full name <span className={styles.required}>*</span>
                            </label>
                            <div className={styles.inputWrapper}>
                                <User className={styles.inputIcon} size={20} />
                                <input
                                    id="fullName"
                                    name="fullName"
                                    type="text"
                                    className={styles.input}
                                    placeholder="Enter full name"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* Gender and Phone Row */}
                        <div className={styles.inputRow}>
                            <div className={styles.inputGroup}>
                                <label htmlFor="gender" className={styles.label}>
                                    Gender <span className={styles.required}>*</span>
                                </label>
                                <div className={styles.inputWrapper}>
                                    <VenusAndMars className={styles.inputIcon} size={20} />
                                    <select
                                        id="gender"
                                        name="gender"
                                        className={styles.select}
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <div className={styles.inputGroup}>
                                <label htmlFor="phoneNumber" className={styles.label}>
                                    Phone number <span className={styles.required}>*</span>
                                </label>
                                <div className={styles.inputWrapper}>
                                    <Phone className={styles.inputIcon} size={20} />
                                    <input
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        type="tel"
                                        className={styles.input}
                                        placeholder="0123456789"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Date of Birth */}
                        <div className={styles.inputGroup}>
                            <label htmlFor="dateOfBirth" className={styles.label}>
                                Date of birth <span className={styles.required}>*</span>
                            </label>
                            <div className={styles.inputWrapper}>
                                <Calendar className={styles.inputIcon} size={20} />
                                <input
                                    id="dateOfBirth"
                                    name="dateOfBirth"
                                    type="date"
                                    className={styles.input}
                                    value={formData.dateOfBirth}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className={styles.inputGroup}>
                            <label htmlFor="address" className={styles.label}>
                                Address <span className={styles.required}>*</span>
                            </label>
                            <div className={styles.inputWrapper}>
                                <MapPinHouse className={styles.inputIcon} size={20} />
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    className={styles.input}
                                    placeholder="Enter your address"
                                    value={formData.address}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {/* Register Button */}
                        <button
                            type="submit"
                            className={styles.registerButton}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing up...' : 'Sign up for an account'}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className={styles.divider}>
                        <div className={styles.dividerLine}></div>
                        <span className={styles.dividerText}>Or</span>
                        <div className={styles.dividerLine}></div>
                    </div>

                    {/* Login Section */}
                    <div className={styles.loginSection}>
                        <p className={styles.loginText}>
                            Already have an account?{' '}
                            <Link 
                                to="/" 
                                className={styles.loginLink}
                            >
                                Sign in now
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Register;