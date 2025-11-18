import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User } from 'lucide-react';
import styles from './CreateDentistWorkingTime.module.css';
import axios from 'axios';

const UpdateDentistWorkingTime = ({ isOpenUpdate, onClose, onSuccess, openNotification, schedule }) => {
    const [formData, setFormData] = useState({
        dentistId: '',
        date: '',
        workingDays: [],
        morning: { startTime: '', endTime: '' },
        afternoon: { startTime: '', endTime: '' },
        isClosed: false,
        isFixed: false,
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dentists, setDentists] = useState([]);

    useEffect(() => {
        if (isOpenUpdate && schedule) {
            setFormData({
                dentistId: schedule.dentistId?._id || schedule.dentistId || '',
                date: schedule.isFixed
                    ? ''
                    : (schedule.date
                        ? new Date(schedule.date).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' })
                        : ''),
                workingDays: schedule.workingDays || [],
                morning: schedule.morning || { startTime: '', endTime: '' },
                afternoon: schedule.afternoon || { startTime: '', endTime: '' },
                isClosed: !!schedule.isClosed,
                isFixed: !!schedule.isFixed,
            });
            setErrors({});
        }
    }, [isOpenUpdate, schedule]);

    const handleInputChange = (field, value) => {
        if (field === "isClosed") {
            setFormData(prev => ({
                ...prev,
                isClosed: value,
                morning: value ? { startTime: "", endTime: "" } : prev.morning,
                afternoon: value ? { startTime: "", endTime: "" } : prev.afternoon,
                workingDays: value ? [] : prev.workingDays,
            }));
        } else if (field === "isFixed") {
            setFormData(prev => ({
                ...prev,
                isFixed: value,
                date: value ? "" : prev.date,
                workingDays: value ? prev.workingDays : [],
            }));
        } else {
            setFormData(prev => ({ ...prev, [field]: value }));
        }

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleTimeChange = (shift, timeType, value) => {
        setFormData((prev) => ({
            ...prev,
            [shift]: { ...prev[shift], [timeType]: value },
        }));

        const errorKey = `${shift}.${timeType}`;
        if (errors[errorKey]) {
            setErrors((prev) => ({ ...prev, [errorKey]: '' }));
        }
    };

    useEffect(() => {
        const fetchDentists = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('http://localhost:5000/user/get-all-dentist', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setDentists(res.data.dentists);
            } catch (err) {
                console.error('Error fetching dentists:', err);
            }
        };

        fetchDentists();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!schedule?._id) return;

        setIsSubmitting(true);
        const token = localStorage.getItem('token');

        try {
            await axios.put(
                `http://localhost:5000/dentistWorkingTime/update-dentist-working-time/${schedule._id}`,
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            openNotification('success', 'Update dentist working time successfully');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating working time:', error);
            openNotification(
                'error',
                error.response?.data?.message || 'An error occurred while updating dentist working time'
            );
            setErrors({ general: 'An error occurred while updating dentist working time' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDateAfter = (days) => {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    };

    if (!isOpenUpdate) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}>
                        <Calendar size={24} className={styles.titleIcon} />
                        <h2>Update Work Schedule</h2>
                    </div>
                    <button className={styles.closeButton} onClick={onClose} disabled={isSubmitting}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.modalBody}>
                    {/* Dentist */}
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            <User size={16} />
                            Dentist *
                        </label>
                        <select
                            value={formData.dentistId}
                            onChange={(e) => handleInputChange('dentistId', e.target.value)}
                            className={`${styles.select} ${errors.dentistId ? styles.error : ''}`}
                            disabled={isSubmitting}
                        >
                            <option value="">Choose a dentist</option>
                            {dentists.map((dentist) => (
                                <option key={dentist._id} value={dentist._id}>
                                    {dentist.fullName} - {dentist.email}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Fixed Schedule */}
                    {!formData.isClosed && (
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
                    )}

                    {/* Date (only if not fixed) */}
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

                    {/* Closed toggle */}
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

                    {/* Shifts */}
                    {!formData.isClosed && (
                        <>
                            {/* Morning */}
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

                            {/* Afternoon */}
                            <div className={styles.shiftGroup}>
                                <div className={styles.shiftHeader}>
                                    <Clock size={16} />
                                    <span>Afternoon shift</span>
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
                        <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : 'Update'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateDentistWorkingTime;
