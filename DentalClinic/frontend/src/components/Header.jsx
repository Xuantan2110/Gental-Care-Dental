import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone } from 'lucide-react';
import { UserOutlined } from '@ant-design/icons';
import styles from './Header.module.css';
import { jwtDecode } from "jwt-decode";
import BookAppointment from "./BookAppointment";
import { notification } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

function Header() {
    const [isSticky, setIsSticky] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isLogin, setIsLogin] = useState(false);
    const [user, setUser] = useState(null);
    const [isOpenBookAppointmentModal, setIsOpenBookAppointmentModal] = useState(false);
    const [api, contextHolder] = notification.useNotification();
    const navigate = useNavigate();

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

    useEffect(() => {
        const handleScroll = () => setIsSticky(window.scrollY > 0);
        window.addEventListener('scroll', handleScroll);
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setUser(decoded);
                setIsLogin(true);
            } catch (error) {
                console.error("Invalid token:", error);
                setIsLogin(false);
            }
        }
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`${styles.header} ${isSticky ? styles.headerSticky : styles.headerNormal}`}>
            {contextHolder}
            <div className={styles.headerContainer}>
                <div className={styles.headerContent}>
                    <div className={styles.logoContainer}>
                        <span className={`${styles.logo} ${isSticky ? styles.logoSticky : styles.logoNormal}`} onClick={() => navigate('/home')}>Gentle Care Dental</span>
                    </div>
                    <nav className={styles.nav}>
                        <a href={'/home'} className={`${styles.navItem} ${isSticky ? styles.navItemSticky : styles.navItemNormal}`}>Home</a>
                        <a href={'/service'} className={`${styles.navItem} ${isSticky ? styles.navItemSticky : styles.navItemNormal}`}>Service</a>
                    </nav>
                    <div className={styles.headerActions}>
                        <div className={`${styles.phoneInfo} ${isSticky ? styles.phoneInfoSticky : styles.phoneInfoNormal}`}>
                            <Phone size={18} /> 0909 999 999
                        </div>
                        <button onClick={() => setIsOpenBookAppointmentModal(true)} className={`${styles.ctaButton} ${isSticky ? styles.ctaButtonSticky : styles.ctaButtonNormal}`}>Book Now</button>
                        <BookAppointment isOpen={isOpenBookAppointmentModal} onClose={() => setIsOpenBookAppointmentModal(false)} openNotification={openNotification}/>
                        {isLogin ? (
                            <div className={styles.userInfo} onClick={() => navigate('/profile')}>
                                <span className={styles.userGreeting}>Hello, {user.fullName}</span>
                                <UserOutlined className={styles.userIcon} />
                            </div>
                        ) : (
                            <button onClick={() => navigate('/')} className={`${styles.ctaButton} ${isSticky ? styles.ctaButtonSticky : styles.ctaButtonNormal}`}>Login</button>
                        )}
                    </div>
                    <button className={`${styles.mobileMenuButton} ${isSticky ? styles.mobileMenuButtonSticky : styles.mobileMenuButtonNormal}`} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                        {isMenuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </div>
            {isMenuOpen && (
                <div className={styles.mobileMenu}>
                    <div className={styles.mobileMenuContent}>
                        {['Home', 'Service'].map((item) => (
                            <a key={item} href={`/${item.toLowerCase()}`} className={styles.mobileNavItem}>{item}</a>
                        ))}
                        <div className={styles.mobileMenuFooter}>
                            <div className={styles.mobilePhoneInfo}><Phone size={18} /> 0909 999 999</div>
                            <button onClick={() => setIsOpenBookAppointmentModal(true)} className={styles.mobileCtaButton}>Book Now</button>
                            <BookAppointment isOpen={isOpenBookAppointmentModal} onClose={() => setIsOpenBookAppointmentModal(false)} openNotification={openNotification}/>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;