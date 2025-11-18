import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styles from './Promotion.module.css';
import Sidebar from '../components/Sidebar';
import { TicketPercent } from "lucide-react";
import axios from "axios";
import { notification, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import ConfirmDelete from "../components/ConfirmDelete";
import CreateUpdatePromotion from '../components/CreateUpdatePromotion';

const Promotion = () => {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [error, setError] = useState('');
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [selectedPromotion, setSelectedPromotion] = useState(null);
    const [mode, setMode] = useState('');

    const [api, contextHolder] = notification.useNotification();

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

    const fetchPromotions = useCallback(async () => {
        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('token')
            const res = await axios.get('https://gental-care-dental.onrender.com/promotion/get-all-promotion', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });

            const data = Array.isArray(res.data?.promotions) ? res.data.promotions : [];
            setPromotions(data);
        } catch (err) {
            console.error('Error fetching promotions:', err);
            setError(err?.response?.data?.message || 'Failed to load promotions.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPromotions();
    }, [fetchPromotions]);

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(d);
    };

    const formatDiscount = (type, value) => {
        if (type === 'percentage') return `${Number(value).toString()}%`;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(Number(value) || 0);
    };

    const normalizeStatus = (s) => String(s || '').toLowerCase();

    const getStatusLabel = (status) => {
        const s = normalizeStatus(status);
        const labels = {
            ongoing: 'OnGoing',
            upcoming: 'UpComing',
            expired: 'Expired',
        };
        return labels[s] || status || '';
    };

    const filteredPromotions = useMemo(() => {
        return promotions
            .filter((promo) => {
                const name = (promo.name || '').toLowerCase();
                const desc = (promo.description || '').toLowerCase();
                const matchesSearch =
                    name.includes(searchTerm.toLowerCase()) ||
                    desc.includes(searchTerm.toLowerCase());

                const statusLower = normalizeStatus(promo.status);
                const matchesStatus =
                    filterStatus === 'All' || statusLower === filterStatus.toLowerCase();

                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                const aTime = new Date(a.createdAt || a.startDate || 0).getTime();
                const bTime = new Date(b.createdAt || b.startDate || 0).getTime();
                return bTime - aTime;
            });
    }, [promotions, searchTerm, filterStatus]);

    const stats = useMemo(() => {
        const total = promotions.length;
        const ongoing = promotions.filter(p => normalizeStatus(p.status) === 'ongoing').length;
        const upcoming = promotions.filter(p => normalizeStatus(p.status) === 'upcoming').length;
        const expired = promotions.filter(p => normalizeStatus(p.status) === 'expired').length;
        return { total, ongoing, upcoming, expired };
    }, [promotions]);

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`https://gental-care-dental.onrender.com/promotion/delete-promotion/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            setPromotions(prev => prev.filter(p => String(p._id) !== String(id)));
            openNotification('success', 'Promotion deleted successfully.');
        } catch (err) {
            console.error('Delete promotion error:', err);
            openNotification('error', err?.response?.data?.message || 'Failed to delete promotion.');
        }
    };

    const handleEdit = (promotion) => {
        setSelectedPromotion(promotion);
        setMode('update');
        setIsOpenModal(true);
    }

    if (loading) {
        return (
            <div className={styles.promotion}>
                {contextHolder}
                <Sidebar />
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <TicketPercent size={32} />
                            <h1 className={styles.headerTitle}>Promotion Management</h1>
                        </div>
                        <p className={styles.headerSubtitle}>Loading data...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.promotion}>
                {contextHolder}
                <Sidebar />
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <TicketPercent size={32} />
                            <h1 className={styles.headerTitle}>Promotion Management</h1>
                        </div>
                        <p className={styles.headerSubtitle} style={{ color: 'red' }}>
                            {error}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.promotion}>
            {contextHolder}
            <Sidebar />
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <TicketPercent size={32} />
                        <h1 className={styles.headerTitle}>Promotion Management</h1>
                    </div>
                    <p className={styles.headerSubtitle}>
                        Manage promotion campaigns
                    </p>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconGreen}`}>
                            <img width="48" height="48" src="https://img.icons8.com/fluency/48/bill.png" alt="bill" />
                        </div>
                        <div className={styles.statContent}>
                            <div className={styles.statNumber}>{stats.total}</div>
                            <div className={styles.statLabel}>Total</div>
                            <div className={styles.statPercent}>100% of total</div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconOrange}`}>
                            <img width="48" height="48" src="https://img.icons8.com/fluency/48/turn-on.png" alt="ongoing" />
                        </div>
                        <div className={styles.statContent}>
                            <div className={styles.statNumber}>{stats.ongoing}</div>
                            <div className={styles.statLabel}>OnGoing</div>
                            <div className={styles.statPercent}>
                                {stats.total ? ((stats.ongoing / stats.total) * 100).toFixed(1) : 0}% of total
                            </div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconBlue}`}>
                            <img width="48" height="48" src="https://img.icons8.com/color/48/coming-soon.png" alt="upcoming" />
                        </div>
                        <div className={styles.statContent}>
                            <div className={styles.statNumber}>{stats.upcoming}</div>
                            <div className={styles.statLabel}>UpComing</div>
                            <div className={styles.statPercent}>
                                {stats.total ? ((stats.upcoming / stats.total) * 100).toFixed(1) : 0}% of total
                            </div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.iconPink}`}>
                            <img width="48" height="48" src="https://img.icons8.com/color/48/expired.png" alt="expired" />
                        </div>
                        <div className={styles.statContent}>
                            <div className={styles.statNumber}>{stats.expired}</div>
                            <div className={styles.statLabel}>Expired</div>
                            <div className={styles.statPercent}>
                                {stats.total ? ((stats.expired / stats.total) * 100).toFixed(1) : 0}% of total
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.controls}>
                        <button onClick={() => { setMode('create'); setIsOpenModal(true); }} className={styles.addButton}>Create promotion</button>
                        <CreateUpdatePromotion isOpen={isOpenModal} mode={mode} onSuccess={() => { fetchPromotions() }} onClose={() => setIsOpenModal(false)} openNotification={openNotification} />
                </div>

                <div className={styles.listSection}>
                    <div className={styles.listHeader}>
                        <div>
                            <h2 className={styles.listTitle}>List of promotions</h2>
                            <p className={styles.listSubtitle}>Manage and track promotion campaigns</p>
                        </div>
                        <div className={styles.filterGroup}>
                            <div className={styles.searchBox}>
                                <span className={styles.searchIcon}>🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search for promotions..."
                                    className={styles.searchInput}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <Select
                                className={styles.filterSelect}
                                value={filterStatus}
                                onChange={(value) => setFilterStatus(value)}
                                options={[
                                    { value: 'All', label: 'All' },
                                    { value: 'OnGoing', label: 'OnGoing' },
                                    { value: 'UpComing', label: 'UpComing' },
                                    { value: 'Expired', label: 'Expired' },
                                ]}
                            />
                        </div>
                    </div>
                    <CreateUpdatePromotion
                        isOpen={isOpenModal}
                        mode={mode}
                        promotion={selectedPromotion}
                        onSuccess={() => { fetchPromotions()}}
                        onClose={() => setIsOpenModal(false)}
                        openNotification={openNotification}
                        />
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>NAME</th>
                                    <th>DESCRIPTION</th>
                                    <th>DISCOUNT TYPE</th>
                                    <th>DISCOUNT VALUE</th>
                                    <th>START - END DATE</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPromotions.map((promo) => {
                                    const statusLower = normalizeStatus(promo.status);
                                    return (
                                        <tr key={promo._id}>
                                            <td className={styles.nameCell}>{promo.name}</td>
                                            <td className={styles.descCell}>{promo.description}</td>
                                            <td>
                                                <span className={`${styles.typeTag} ${styles[promo.discountType]}`}>
                                                    {promo.discountType === 'percentage' ? 'Percentage' : 'Fixed'}
                                                </span>
                                            </td>
                                            <td className={styles.valueCell}>
                                                {formatDiscount(promo.discountType, promo.discountValue)}
                                            </td>
                                            <td>{formatDate(promo.startDate)} - {formatDate(promo.endDate)}</td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${styles[statusLower]}`}>
                                                    {getStatusLabel(promo.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.actionButtons}>
                                                    <button
                                                        className={styles.btnEdit}
                                                        onClick={() => handleEdit(promo)}
                                                    >
                                                        <img width="16" height="16" src="https://img.icons8.com/tiny-glyph/16/FFFFFF/create-new.png" alt="create-new" />
                                                    </button>

                                                    <ConfirmDelete
                                                        title="Confirm promotion deletion"
                                                        description={`Are you sure you want to delete this promotion? This action cannot be undone.`}
                                                        onConfirm={() => handleDelete(promo._id)}
                                                    >
                                                        <button className={styles.btnDelete}>
                                                            <img width="16" height="16" src="https://img.icons8.com/small/16/FFFFFF/filled-trash.png" alt="filled-trash" />
                                                        </button>
                                                    </ConfirmDelete>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredPromotions.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className={styles.emptyState}>
                                            No promotions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Promotion;
