import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User } from 'lucide-react';
import styles from './CreateDentistWorkingTime.module.css';
import axios from 'axios';
import { Select } from 'antd';

const CreateDentistWorkingTime = ({ isOpen, onClose, onSuccess, openNotification }) => {
    const [formData, setFormData] = useState({
        dentistId: '',
        date: '',
        workingDays: [],
        morning: {
            startTime: '',
            endTime: ''
        },
        afternoon: {
            startTime: '',
            endTime: ''
        },
        isClosed: false,
        isFixed: false
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dentists, setDentists] = useState([]);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                dentistId: '',
                date: '',
                workingDays: [],
                morning: {
                    startTime: '',
                    endTime: ''
                },
                afternoon: {
                    startTime: '',
                    endTime: ''
                },
                isClosed: false,
                isFixed: false
            });
            setErrors({});
        }
    }, [isOpen]);

    const handleInputChange = (field, value) => {
        if (field === "isClosed" && value === true) {
            setFormData(prev => ({
                ...prev,
                isClosed: true,
                morning: { startTime: "", endTime: "" },
                afternoon: { startTime: "", endTime: "" },
                workingDays: [],
            }));
        } else if (field === "isFixed") {
            setFormData(prev => ({
                ...prev,
                isFixed: value,
                date: value ? "" : prev.date,
                workingDays: value ? prev.workingDays : [],
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value
            }));
        }

        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ""
            }));
        }
    };

    const handleTimeChange = (shift, timeType, value) => {
        setFormData(prev => ({
            ...prev,
            [shift]: {
                ...prev[shift],
                [timeType]: value
            }
        }));

        const errorKey = `${shift}.${timeType}`;
        if (errors[errorKey]) {
            setErrors(prev => ({
                ...prev,
                [errorKey]: ''
            }));
        }
    };

    useEffect(() => {
        const fetchDentists = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get("https://gental-care-dental.onrender.com/user/get-all-dentist", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                });
                setDentists(res.data.dentists);
            } catch (err) {
                console.error("Error fetching dentists:", err);
            }
        };

        fetchDentists();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const token = localStorage.getItem('token')
        try {
            await axios.post("https://gental-care-dental.onrender.com/dentistWorkingTime/create-dentist-working-time", formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                }
            })
            onSuccess();
            onClose();
            openNotification("success", "Create dentist working time successfully");
        } catch (error) {
            console.error('Error creating working time:', error);
            openNotification("error", error.response?.data?.message || "An error occurred while creating dentist working time")
            setErrors({ general: 'An error occurred while creating dentist working time' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDateAfter = (days) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                        <Calendar size={24} className={styles.titleIcon} />
                        <h2>Add New Work Schedule</h2>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalBody}>
                    {/* Doctor Selection */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            <User size={16} />
                            Dentist *
                        </label>
                        <Select
                            style={{ }}
                            value={formData.dentistId}
                            onChange={(value) => handleInputChange("dentistId", value)}
                            className={`${styles.select} ${errors.dentistId ? styles.error : ""}`}
                            disabled={isSubmitting}
                            options={[
                                { value: "", label: "Choose a dentist" },
                                ...dentists.map((dentist) => ({
                                    value: dentist._id,
                                    label: `${dentist.fullName} - ${dentist.email}`,
                                })),
                            ]}
                        />
                    </div>

                    {/* Fixed Working Time Toggle */}
                    {!formData.isClosed && (
                        <>
                            <div className={styles.formGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isFixed}
                                        onChange={(e) => handleInputChange('isFixed', e.target.checked)}
                                        className={styles.checkbox}
                                        disabled={isSubmitting}
                                    />
                                    <span className={styles.checkboxText}>Fixed working time</span>
                                </label>
                            </div>
                        </>
                    )}

                    {/* Date Selection - Only show if not fixed */}
                    {!formData.isFixed && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                <Calendar size={16} />
                                Workday *
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => handleInputChange('date', e.target.value)}
                                className={`${styles.input} ${errors.date ? styles.error : ''}`}
                                disabled={isSubmitting}
                                min={getDateAfter(1)}
                            />
                        </div>
                    )}

                    {/* Closed Day Toggle - Only show if not fixed */}
                    {!formData.isFixed && (
                        <div className={styles.formGroup}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={formData.isClosed}
                                    onChange={(e) => handleInputChange('isClosed', e.target.checked)}
                                    className={styles.checkbox}
                                    disabled={isSubmitting}
                                />
                                <span className={styles.checkboxText}>No work on this day</span>
                            </label>
                        </div>
                    )}

                    {/* Working Hours */}
                    {!formData.isClosed && (
                        <>
                            {/* Morning Shift */}
                            <div className={styles.shiftGroup}>
                                <div className={styles.shiftHeader}>
                                    <Clock size={16} />
                                    <span>Morning shift</span>
                                </div>
                                <div className={styles.timeInputs}>
                                    <div className={styles.timeGroup}>
                                        <label className={styles.timeLabel}>From</label>
                                        <input
                                            type="time"
                                            value={formData.morning.startTime}
                                            onChange={(e) => handleTimeChange('morning', 'startTime', e.target.value)}
                                            className={`${styles.timeInput} ${errors['morning.startTime'] ? styles.error : ''}`}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className={styles.timeSeparator}>-</div>
                                    <div className={styles.timeGroup}>
                                        <label className={styles.timeLabel}>To</label>
                                        <input
                                            type="time"
                                            value={formData.morning.endTime}
                                            onChange={(e) => handleTimeChange('morning', 'endTime', e.target.value)}
                                            className={`${styles.timeInput} ${errors['morning.endTime'] ? styles.error : ''}`}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Afternoon Shift */}
                            <div className={styles.shiftGroup}>
                                <div className={styles.shiftHeader}>
                                    <Clock size={16} />
                                    <span>Afternoon Shift</span>
                                </div>
                                <div className={styles.timeInputs}>
                                    <div className={styles.timeGroup}>
                                        <label className={styles.timeLabel}>From</label>
                                        <input
                                            type="time"
                                            value={formData.afternoon.startTime}
                                            onChange={(e) => handleTimeChange('afternoon', 'startTime', e.target.value)}
                                            className={`${styles.timeInput} ${errors['afternoon.startTime'] ? styles.error : ''}`}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                    <div className={styles.timeSeparator}>-</div>
                                    <div className={styles.timeGroup}>
                                        <label className={styles.timeLabel}>To</label>
                                        <input
                                            type="time"
                                            value={formData.afternoon.endTime}
                                            onChange={(e) => handleTimeChange('afternoon', 'endTime', e.target.value)}
                                            className={`${styles.timeInput} ${errors['afternoon.endTime'] ? styles.error : ''}`}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Working Days Selection - Only show if fixed */}
                    {formData.isFixed && !formData.isClosed && (
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                <Calendar size={16} />
                                Working Days *
                            </label>
                            <div className={styles.workingDaysContainer}>
                                {[
                                    { value: 1, label: 'Sunday', short: 'Sun' },
                                    { value: 2, label: 'Monday', short: 'Mon' },
                                    { value: 3, label: 'Tuesday', short: 'Tue' },
                                    { value: 4, label: 'Wednesday', short: 'Wed' },
                                    { value: 5, label: 'Thursday', short: 'Thu' },
                                    { value: 6, label: 'Friday', short: 'Fri' },
                                    { value: 7, label: 'Saturday', short: 'Sat' }
                                ].map((day) => (
                                    <label key={day.value} className={styles.dayCheckboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={formData.workingDays.includes(day.value)}
                                            onChange={(e) => {
                                                const updatedDays = e.target.checked
                                                    ? [...formData.workingDays, day.value]
                                                    : formData.workingDays.filter(d => d !== day.value);
                                                handleInputChange('workingDays', updatedDays);
                                            }}
                                            className={styles.dayCheckbox}
                                            disabled={isSubmitting}
                                        />
                                        <span className={styles.dayCheckboxText}>
                                            <span className={styles.dayShort}>{day.short}</span>
                                            <span className={styles.dayFull}>{day.label}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Form Actions */}
                    <div className={styles.modalActions}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={styles.cancelButton}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateDentistWorkingTime;