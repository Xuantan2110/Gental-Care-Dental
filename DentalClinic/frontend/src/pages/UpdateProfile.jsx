import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, MapPin } from 'lucide-react';
import styles from './UpdateProfile.module.css';
import axios from 'axios';

function UpdateProfile({ user, isOpen, onClose, onSuccess, openNotification }) {
    const [formData, setFormData] = useState({
        email: '',
        fullName: '',
        phoneNumber: '',
        gender: '',
        dateOfBirth: '',
        address: ''
    });

    useEffect(() => {
        if (isOpen && user) {
            setFormData({
                email: user.email || '',
                fullName: user.fullName || '',
                phoneNumber: user.phoneNumber || '',
                gender: user.gender || '',
                dateOfBirth: user.dateOfBirth ? user.dateOfBirth.slice(0, 10) : '',
                address: user.address || ''
            });
        }
    }, [isOpen, user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch('http://localhost:5000/user/update-profile', formData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            openNotification('success', 'Profile updated successfully');
            onSuccess();
            onClose();
        } catch (error) {
            if (error.response && error.response.data) {
                if (error.response.data.errors && error.response.data.errors.length > 0) {
                    openNotification("error", error.response.data.errors[0].msg);
                } else if (error.response.data.message) {
                    openNotification("error", error.response.data.message);
                } else {
                    openNotification("error", "Failed to update profile!");
                }
            } else {
                openNotification("error", "Failed to update profile!");
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.pageWrapper}>
            {isOpen && (
                <div className={styles.overlay} onClick={onClose}>
                    <div
                        className={styles.modal}
                        onClick={(e) => e.stopPropagation()} >
                        {/* Header */}
                        <div className={styles.header}>
                            <h2 className={styles.headerTitle}>
                                <User size={24} />
                                Update profile
                            </h2>
                            <button
                                onClick={onClose}
                                className={styles.closeButton} >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <div className={styles.form}>
                            {/* Email */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email</label>
                                <div className={styles.inputWrapper}>
                                    <Mail size={18} className={styles.icon} />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            {/* Full Name */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Full name</label>
                                <div className={styles.inputWrapper}>
                                    <User size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleInputChange}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Phone number</label>
                                <div className={styles.inputWrapper}>
                                    <Phone size={18} className={styles.icon} />
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleInputChange}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            {/* Gender + DOB */}
                            <div className={styles.gridTwo}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Gender</label>
                                    <div className={styles.inputWrapper}>
                                        <User size={18} className={styles.icon} />
                                        <select
                                            name="gender"
                                            value={formData.gender}
                                            onChange={handleInputChange}
                                            className={styles.input}
                                        >
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Date of birth</label>
                                    <div className={styles.inputWrapper}>
                                        <Calendar size={18} className={styles.icon} />
                                        <input
                                            type="date"
                                            name="dateOfBirth"
                                            value={formData.dateOfBirth}
                                            onChange={handleInputChange}
                                            className={styles.input}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Address</label>
                                <div className={styles.inputWrapper}>
                                    <MapPin size={18} className={styles.icon} />
                                    <input
                                        type="text"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        className={styles.input}
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className={styles.buttons}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={styles.cancelButton}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    className={styles.saveButton}
                                >
                                    Save changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpdateProfile;
