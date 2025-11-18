import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import styles from './Sidebar.module.css';
import { Users, BarChart3, Mailbox, Album, Bell, Mail, ChevronLeft, TicketPercent, ChevronRight, LogOut, User, ScrollText, Calendar1, CalendarCheck, Wallet, Pill, ClipboardPlus } from "lucide-react";
import axios from 'axios';
import ConfirmDialog from './ConfirmDialog';
import { io } from 'socket.io-client';

const adminItems = [
    { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Accounts", href: "/accounts" },
    { icon: ScrollText, label: "Services", href: "/manage-service" },
    { icon: Calendar1, label: "Dentist working time", href: "/dentist-working-time" },
    { icon: Album , label: "Dentist profile", href: "/dentist-profile" },
    { icon: CalendarCheck, label: "Appointment", href: "/appointment" },
    { icon: ClipboardPlus, label: "Medical record", href: "/medical-record" },
    { icon: Wallet, label: "Payment", href: "/payment" },
    { icon: Pill, label: "Medicine", href: "/manage-medicine" },
    { icon: TicketPercent, label: "Promotion", href: "/promotion" },
    { icon: Mailbox, label: "Review", href: "/review" },
];

const staffItems = [
    { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Accounts", href: "/accounts" },
    { icon: Mail, label: "Messenger", href: "/messenger" },
    { icon: Bell, label: "Notification", href: "/notification" },
    { icon: Calendar1, label: "Dentist working time", href: "/dentist-working-time" },
    { icon: CalendarCheck, label: "Appointment", href: "/appointment" },
    { icon: Wallet, label: "Payment", href: "/payment" },
    { icon: ScrollText, label: "Services", href: "/manage-service" },
    { icon: Pill, label: "Medicine", href: "/manage-medicine" },
];

const dentistItems = [
    { icon: BarChart3, label: "Dashboard", href: "/dashboard" },
    { icon: Users, label: "Accounts", href: "/accounts" },
    { icon: Bell, label: "Notification", href: "/notification" },
    { icon: CalendarCheck, label: "Appointment", href: "/appointment" },
    { icon: ClipboardPlus, label: "Medical record", href: "/medical-record" },
    { icon: ScrollText, label: "Services", href: "/manage-service" },
    { icon: Pill, label: "Medicine", href: "/manage-medicine" },
];

function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [menuItems, setMenuItems] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const navigate = useNavigate();
    const socketRef = useRef(null);

    useEffect(() => {
        if (user) {
            if (user.role === "Admin") {
                setMenuItems(adminItems);
            } else if (user.role === "Staff") {
                setMenuItems(staffItems);
            } else {
                setMenuItems(dentistItems);
            }
        }
    }, [user]);

    const onToggle = () => {
        setCollapsed(!collapsed);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/");
    }

    useEffect(() => {
        fetchPforile();
    }, []);

    const fetchPforile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`https://gental-care-dental.onrender.com/user/profile`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            setUser(response.data.user);
        } catch (error) {
            console.error("Error fetching profile:", error);
        }
    }

    // Fetch unread notification count
    const fetchUnreadCount = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const response = await axios.get('https://gental-care-dental.onrender.com/notification/notifications/unread-count', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(response.data.unreadCount || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    useEffect(() => {
        if (user && (user.role === 'Staff' || user.role === 'Dentist')) {
            fetchUnreadCount();
        }
    }, [user]);

    // Socket connection for real-time notification count
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || !user || (user.role !== 'Staff' && user.role !== 'Dentist')) return;

        const socket = io('https://gental-care-dental.onrender.com', {
            auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('joinNotificationRoom');
        });

        socket.on('newNotification', () => {
            // Increment count when new notification arrives
            setUnreadCount(prev => prev + 1);
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
    }, [user]);

    // Listen for custom event when notifications are marked as read (from Notification page)
    useEffect(() => {
        const handleNotificationRead = () => {
            if (user && (user.role === 'Staff' || user.role === 'Dentist')) {
                fetchUnreadCount();
            }
        };

        window.addEventListener('notificationRead', handleNotificationRead);
        return () => {
            window.removeEventListener('notificationRead', handleNotificationRead);
        };
    }, [user]);

    return (
        <div className={`${styles.sidebar} ${collapsed ? styles.collapsed : ""}`}>
            {/* Header with toggle button */}
            <div className={styles.header}>
                {!collapsed && (
                    <div className={styles.titleContainer}>
                        <img src="https://img.icons8.com/external-others-phat-plus/45/external-dental-odontologist-color-line-others-phat-plus.png" alt="" />
                        <h2 className={styles.title}>Gentle Care Dental</h2>
                    </div>
                )}
                <button
                    className={styles.toggleButton}
                    onClick={onToggle}
                    title={collapsed ? "Expand menu" : "Collapse menu"}
                >
                    {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* Navigation Menu */}
            <nav className={styles.nav}>
                <ul className={styles.menuList}>
                    {menuItems.map((item, index) => {
                        const isActive = location.pathname === item.href;
                        const isNotification = item.href === '/notification';
                        const showBadge = isNotification && unreadCount > 0;
                        return (
                            <li key={index}>
                                <Link
                                    to={item.href}
                                    className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                                >
                                    <div className={styles.iconWrapper}>
                                        <item.icon size={20} className={styles.menuIcon} />
                                        {showBadge && (
                                            <span className={styles.notificationBadge}>
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    {!collapsed && <span className={styles.menuLabel}>{item.label}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* User section at bottom */}
            <div className={styles.userSection}>
                <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                        {user && user.avatar ? (
                            <img src={user.avatar} alt="User Avatar" className={styles.userAvatar} />
                        ) : (
                            <User size={20} className={styles.defaultAvatar} />
                        )}
                    </div>
                    {!collapsed && (
                        <div className={styles.userDetails}>
                            <span className={styles.userName}>{user?.fullName}</span>
                            <span className={styles.userRole}>{user?.role}</span>
                        </div>
                    )}
                    {!collapsed && (
                        <ConfirmDialog
                            title="Confirm logout"
                            description={`Are you sure you want to Logout?`}
                            onConfirm={() => handleLogout()}>
                            <button className={styles.logoutButton} title="Logout">
                                <LogOut size={18} />
                            </button>
                        </ConfirmDialog>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Sidebar;