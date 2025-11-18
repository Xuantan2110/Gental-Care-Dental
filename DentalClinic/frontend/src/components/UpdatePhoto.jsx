import React, { useState, useRef, useEffect } from 'react';
import styles from './UpdatePhoto.module.css';
import { X, Upload, Camera, Trash2, Loader2 } from 'lucide-react';
import axios from 'axios';

function UpdatePhoto({ isOpen, onClose, currentPhoto, openNotification, onSuccess }) {
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(currentPhoto || null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setPreviewUrl(currentPhoto || null);
        setSelectedPhoto(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [currentPhoto, isOpen]);

    const handleFileSelect = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        setSelectedPhoto(file);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        handleFileSelect(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        handleFileSelect(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleRemovePhoto = () => {
        setSelectedPhoto(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSave = async () => {
        if (!selectedPhoto) return;
        setIsLoading(true);
        try {
            await handleSavePhoto(selectedPhoto);
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setSelectedPhoto(null);
        setPreviewUrl(currentPhoto || null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        onClose();
    };

    const handleSavePhoto = async (file) => {
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const token = localStorage.getItem('token');
            const res = await axios.patch('http://localhost:5000/user/update-photo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            if (res.data?.avatar) {
                onSuccess?.(res.data.avatar);
            }
            openNotification('success', 'Avatar updated successfully');
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
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Update profile picture</h2>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.currentPhoto}>
                        <div className={styles.photoContainer}>
                            {previewUrl ? (
                                <>
                                    <img src={previewUrl} alt="Preview" className={styles.photo} />
                                    <button
                                        type="button"
                                        className={styles.removeButton}
                                        onClick={handleRemovePhoto}
                                        aria-label="Remove photo"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </>
                            ) : (
                                <div className={styles.placeholder}>
                                    <Camera size={42} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div
                        className={`${styles.uploadArea} ${isDragging ? styles.uploadAreaActive : ''}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        role="button"
                        tabIndex={0}
                        onKeyDown={() => fileInputRef.current?.click()}
                    >
                        <Upload size={44} className={styles.uploadIcon} />
                        <p className={styles.uploadText}>Drag and drop images here or click to select</p>
                        <p className={styles.uploadSubtext}>Supports PNG, JPG, GIF (up to 5MB)</p>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        name="avatar"
                        onChange={handleFileInputChange}
                        className={styles.hiddenInput}
                    />

                    <div className={styles.actions}>
                        <button
                            type="button"
                            className={`${styles.button} ${styles.cancelButton}`}
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className={`${styles.button} ${selectedPhoto ? styles.saveButton : styles.saveButtonDisabled}`}
                            onClick={handleSave}
                            disabled={!selectedPhoto}
                        >
                            {isLoading ? (
                                <Loader2 className={styles.spinner} size={16} />
                            ) : (
                                <Upload size={14} />
                            )}
                            {isLoading ? "Uploading..." : "Upload"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UpdatePhoto;
