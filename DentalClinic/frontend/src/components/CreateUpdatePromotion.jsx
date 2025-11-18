import React, { useEffect, useState } from 'react';
import styles from './CreateUpdatePromotion.module.css';
import axios from 'axios';
import { Select } from 'antd';

const CreateUpdatePromotion = ({ isOpen, onClose, onSuccess, mode, promotion, openNotification }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    startDate: '',
    endDate: ''
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (promotion && mode === 'update') {
      setFormData({
        name: promotion.name || '',
        description: promotion.description || '',
        discountType: promotion.discountType || 'percentage',
        discountValue: promotion.discountValue ?? '',
        startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().split('T')[0] : '',
        endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().split('T')[0] : ''
      });
    } else {
      setFormData({
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        startDate: '',
        endDate: ''
      });
    }
    setErrors({});
  }, [isOpen, mode, promotion]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: name === 'discountValue' ? value.replace(/[^0-9.]/g, '') : value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');

      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        startDate: formData.startDate,
        endDate: formData.endDate
      };

      if (mode === 'create') {
        await axios.post(
          'http://localhost:5000/promotion/create-promotion',
          payload,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        openNotification?.('success', 'Promotion created successfully.');
      } else {
        await axios.put(
          `http://localhost:5000/promotion/update-promotion/${promotion?._id}`,
          payload,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        openNotification?.('success', 'Promotion updated successfully.');
      }

      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('Submit promotion error:', err);
      const msg = err?.response?.data?.message || (mode === 'create' ? 'Failed to create promotion.' : 'Failed to update promotion.');
      openNotification?.('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{mode === 'create' ? 'Create New Promotion' : 'Update Promotion'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Promotion Name <span className={styles.required}>*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? styles.inputError : ''}
              placeholder="Enter promotion name"
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Description <span className={styles.required}>*</span></label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={errors.description ? styles.inputError : ''}
              placeholder="Enter promotion description"
              rows="3"
            />
            {errors.description && <span className={styles.error}>{errors.description}</span>}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="discountType">Discount Type <span className={styles.required}>*</span></label>
              <Select
                className={styles.select}
                value={formData.discountType}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, discountType: value }))
                }
              >
                <Select.Option value="percentage">Percentage (%)</Select.Option>
                <Select.Option value="fixed">Fixed (USD)</Select.Option>
              </Select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="discountValue">Discount Value <span className={styles.required}>*</span></label>
              <input
                type="number"
                id="discountValue"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleChange}
                className={errors.discountValue ? styles.inputError : ''}
                placeholder={formData.discountType === 'percentage' ? 'e.g., 20' : 'e.g., 500'}
                min="0"
                step={formData.discountType === 'percentage' ? '0.01' : '1'}
              />
              {errors.discountValue && <span className={styles.error}>{errors.discountValue}</span>}
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="startDate">Start Date <span className={styles.required}>*</span></label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className={errors.startDate ? styles.inputError : ''}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.startDate && <span className={styles.error}>{errors.startDate}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="endDate">End Date <span className={styles.required}>*</span></label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                className={errors.endDate ? styles.inputError : ''}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.endDate && <span className={styles.error}>{errors.endDate}</span>}
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={submitting}>
              {submitting ? (mode === 'create' ? 'Creating...' : 'Updating...') : (mode === 'create' ? 'Create' : 'Update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUpdatePromotion;