import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Notification.module.css';
import Sidebar from '../components/Sidebar';
import { Bell, Check, CheckCheck, Trash2, Calendar, FileText } from 'lucide-react';
import axios from 'axios';
import { notification } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { io } from 'socket.io-client';

const Notification = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);
    const [api, contextHolder] = notification.useNotification();
    const socketRef = useRef(null);
    const navigate = useNavigate();

    const openNotification = useCallback((type, message, description = "") => {
        if (type === "success") {
            api.open({
                message: message || "Action successful!",
                description,
                showProgress: true,
                pauseOnHover: true,
                icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            });
        } else {
            api.open({
                message: message || "Action failed!",
                description,
                showProgress: true,
                pauseOnHover: true,
                icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
            });
        }
    }, [api]);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/notification/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(response.data.notifications || []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            openNotification('error', 'Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, [openNotification]);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/notification/notifications/unread-count', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(response.data.unreadCount || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, [fetchNotifications, fetchUnreadCount]);

    // Socket connection for real-time notifications
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = io('http://localhost:5000', {
            auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('joinNotificationRoom');
        });

        socket.on('newNotification', (data) => {
            const { notification: newNotif } = data;
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);

            // Show browser notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(newNotif.title, {
                    body: newNotif.message,
                    icon: '/favicon.ico'
                });
            }
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leaveNotificationRoom');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    // Request notification permission
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    const handleMarkAsRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`http://localhost:5000/notification/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev =>
                prev.map(notif =>
                    notif._id === id ? { ...notif, isRead: true } : notif
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            // Emit event to update Sidebar badge
            window.dispatchEvent(new Event('notificationRead'));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            openNotification('error', 'Failed to mark notification as read');
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch('http://localhost:5000/notification/notifications/read-all', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev =>
                prev.map(notif => ({ ...notif, isRead: true }))
            );
            setUnreadCount(0);
            // Emit event to update Sidebar badge
            window.dispatchEvent(new Event('notificationRead'));
            openNotification('success', 'All notifications marked as read');
        } catch (error) {
            console.error('Error marking all as read:', error);
            openNotification('error', 'Failed to mark all as read');
        }
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/notification/notifications/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.filter(notif => notif._id !== id));
            openNotification('success', 'Notification deleted');
        } catch (error) {
            console.error('Error deleting notification:', error);
            openNotification('error', 'Failed to delete notification');
        }
    };

    const handleNotificationClick = (notif) => {
        if (!notif.isRead) {
            handleMarkAsRead(notif._id);
        }

        // Navigate based on notification type
        if (notif.type === 'new_appointment' || notif.type === 'appointment_confirmed' || notif.type === 'appointment_rejected') {
            navigate('/appointment');
        } else if (notif.type === 'new_bill') {
            navigate('/payment');
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'new_appointment':
            case 'appointment_confirmed':
            case 'appointment_rejected':
                return <Calendar size={20} />;
            case 'new_bill':
                return <FileText size={20} />;
            default:
                return <Bell size={20} />;
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'new_appointment':
                return '#2563eb';
            case 'appointment_confirmed':
                return '#10b981';
            case 'appointment_rejected':
                return '#ef4444';
            case 'new_bill':
                return '#f59e0b';
            default:
                return '#6b7280';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minutes ago`;
        if (hours < 24) return `${hours} hours ago`;
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div className={styles.notification}>
            {contextHolder}
            <Sidebar />
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <Bell size={32} />
                        <h1 className={styles.headerTitle}>Notification</h1>
                        {unreadCount > 0 && (
                            <span className={styles.badge}>{unreadCount}</span>
                        )}
                    </div>
                    <p className={styles.headerSubtitle}>
                        Manage and view all your notifications
                    </p>
                </div>

                <div className={styles.content}>
                    <div className={styles.toolbar}>
                        <div className={styles.toolbarLeft}>
                            <span className={styles.totalCount}>
                                Total: {notifications.length} notifications
                            </span>
                        </div>
                        <div className={styles.toolbarRight}>
                            {unreadCount > 0 && (
                                <button
                                    className={styles.markAllButton}
                                    onClick={handleMarkAllAsRead}
                                >
                                    <CheckCheck size={16} />
                                    Mark all as read
                                </button>
                            )}
                        </div>
                    </div>

                    {loading ? (
                        <div className={styles.loading}>Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className={styles.empty}>
                            <Bell size={48} className={styles.emptyIcon} />
                            <p className={styles.emptyText}>No notifications</p>
                        </div>
                    ) : (
                        <div className={styles.notificationList}>
                            {notifications.map((notif) => (
                                <div
                                    key={notif._id}
                                    className={`${styles.notificationItem} ${!notif.isRead ? styles.unread : ''}`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <div
                                        className={styles.iconWrapper}
                                        style={{ backgroundColor: `${getNotificationColor(notif.type)}20`, color: getNotificationColor(notif.type) }}
                                    >
                                        {getNotificationIcon(notif.type)}
                                    </div>
                                    <div className={styles.notificationContent}>
                                        <div className={styles.notificationHeader}>
                                            <h3 className={styles.notificationTitle}>{notif.title}</h3>
                                            {!notif.isRead && <span className={styles.unreadDot}></span>}
                                        </div>
                                        <p className={styles.notificationMessage}>{notif.message}</p>
                                        <span className={styles.notificationTime}>
                                            {formatDate(notif.createdAt)}
                                        </span>
                                    </div>
                                    <div className={styles.notificationActions}>
                                        {!notif.isRead && (
                                            <button
                                                className={styles.actionButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkAsRead(notif._id);
                                                }}
                                                title="Mark as read"
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                        <button
                                            className={styles.actionButton}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(notif._id);
                                            }}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notification;

