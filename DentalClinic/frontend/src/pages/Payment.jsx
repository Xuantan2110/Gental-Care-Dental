import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import styles from './Payment.module.css';
import Sidebar from '../components/Sidebar';
import { TicketPercent } from "lucide-react";
import axios from "axios";
import { notification, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import BillDetail from '../components/BillDetail';
import PaymentProcess from '../components/PaymentProcess';
import { io } from 'socket.io-client';
import { jwtDecode } from "jwt-decode";
import ConfirmDelete from '../components/ConfirmDelete';

const Payment = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [isOpenDetail, setIsOpenDetail] = useState(false);
    const [isOpenPay, setIsOpenPay] = useState(false);
    const [selectedBillId, setSelectedBillId] = useState(null);
    const [api, contextHolder] = notification.useNotification();
    const socketRef = useRef(null);
    const selectedBillRef = useRef(null);

    const openNotification = useCallback((type, detailMessage = "") => {
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
    }, [api]);

    const fetchBills = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:5000/bill/get-all-bill', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            const data = Array.isArray(res.data?.bills) ? res.data.bills : [];
            setBills(data);
        } catch (err) {
            console.error('Error fetching bills:', err);
            setError(err?.response?.data?.message || 'Failed to load bills.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBills();
    }, [fetchBills]);

    useEffect(() => {
        selectedBillRef.current = selectedBillId ? selectedBillId.toString() : null;
    }, [selectedBillId]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = io('http://localhost:5000', {
            auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('joinBillRoom');
        });

        const handleBankTransferPaid = ({ billId }) => {
            fetchBills();
            const currentSelected = selectedBillRef.current;
            if (currentSelected && String(billId) === currentSelected) {
                setIsOpenPay(false);
                openNotification('success', 'Bank transfer payment confirmed automatically.');
            }
        };

        const handleBillUpdate = (data) => {
            const { bill, eventType } = data;

            // Get current user ID to avoid duplicate notifications for own actions
            let currentUserId = null;
            try {
                const decoded = jwtDecode(token);
                currentUserId = String(decoded.userId || decoded.id);
            } catch (e) {
                // Ignore decode errors
            }

            if (eventType === 'paid') {
                // Update existing bill or add new one
                setBills((prev) => {
                    const existingIndex = prev.findIndex(b => b._id === bill._id);
                    if (existingIndex >= 0) {
                        // Update existing bill
                        const updated = [...prev];
                        updated[existingIndex] = { ...updated[existingIndex], ...bill };
                        return updated;
                    } else {
                        // Add new bill if not exists
                        return [bill, ...prev];
                    }
                });
                // Only show notification if it's not paid by current user (they already see the success message)
                const billCustomerId = String(bill.customerId?._id || bill.customerId || '');
                if (currentUserId && billCustomerId !== currentUserId) {
                    openNotification('success', 'The bill has been paid!');
                }
            } else if (eventType === 'created') {
                // Add new bill to the list
                setBills((prev) => {
                    // Check if bill already exists to avoid duplicates
                    if (prev.some(b => b._id === bill._id)) {
                        return prev;
                    }
                    return [bill, ...prev];
                });
            }
        };

        socket.on('bankTransferPaid', handleBankTransferPaid);
        socket.on('billUpdate', handleBillUpdate);

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        return () => {
            socket.off('bankTransferPaid', handleBankTransferPaid);
            socket.off('billUpdate', handleBillUpdate);
            if (socketRef.current) {
                socketRef.current.emit('leaveBillRoom');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [fetchBills, openNotification]);

    const formatCurrency = (amount) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(Number(amount) || 0);

    const normalize = (s) => String(s || '').toLowerCase();

    const getPaymentMethodLabel = (method) => {
        const m = String(method || '');
        if (m === 'None') return 'None';
        if (m === 'Cash') return 'Cash';
        if (m === 'Bank Transfer') return 'Bank Transfer';
        return m;
    };

    const getStatusLabel = (status) => {
        const s = String(status || '');
        if (s === 'Paid') return 'Paid';
        if (s === 'Pending') return 'Pending';
        if (s === 'Cancelled') return 'Cancelled';
        return s;
    };

    const stats = useMemo(() => {
        const total = bills.length;
        const paid = bills.filter(b => b.status === 'Paid').length;
        const pending = bills.filter(b => b.status === 'Pending').length;
        const cancelled = bills.filter(b => b.status === 'Cancelled').length;
        return { total, paid, pending, cancelled };
    }, [bills]);

    const filtered = useMemo(() => {
        const q = normalize(searchTerm);
        return bills.filter(b => {
            const customerName = normalize(b.customer?.fullName || '');
            const method = normalize(b.paymentMethod || '');
            const matchesSearch =
                customerName.includes(q) || method.includes(q);
            const matchesStatus =
                filterStatus === 'All' || b.status === filterStatus;
            return matchesSearch && matchesStatus;
        });
    }, [bills, searchTerm, filterStatus]);

    const handlePay = (id) => {
        setSelectedBillId(id);
        setIsOpenPay(true);
    };

    const handleDelete = async (id) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/bill/delete-bill/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            });
            openNotification('success', 'Bill deleted successfully');
            fetchBills();
        } catch (err) {
            console.error('Error deleting bill:', err);
            openNotification('error', err?.response?.data?.message || 'Failed to delete bill.');
        } finally {
            setLoading(false);
        }
    };

    const handleDetail = (id) => {
        setSelectedBillId(id);
        setIsOpenDetail(true);
    }

    if (loading) {
        return (
            <div className={styles.payment}>
                {contextHolder}
                <Sidebar />
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <TicketPercent size={32} />
                            <h1 className={styles.headerTitle}>Payment Management</h1>
                        </div>
                        <p className={styles.headerSubtitle}>Loading bills...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.payment}>
                {contextHolder}
                <Sidebar />
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <TicketPercent size={32} />
                            <h1 className={styles.headerTitle}>Payment Management</h1>
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
        <div className={styles.payment}>
            {contextHolder}
            <Sidebar />

            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <TicketPercent size={32} />
                        <h1 className={styles.headerTitle}>Payment Management</h1>
                    </div>
                    <p className={styles.headerSubtitle}>
                        Manage payments of all customers
                    </p>
                </div>

                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ backgroundColor: '#e8f5e9' }}>
                            <span style={{ fontSize: '24px' }}>💰</span>
                        </div>
                        <div className={styles.statContent}>
                            <div className={styles.statNumber}>{stats.total}</div>
                            <div className={styles.statLabel}>Total Bills</div>
                            <div className={styles.statPercent}>100% of total</div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ backgroundColor: '#e8f5e9' }}>
                            <span style={{ fontSize: '24px' }}>✅</span>
                        </div>
                        <div className={styles.statContent}>
                            <div className={styles.statNumber}>{stats.paid}</div>
                            <div className={styles.statLabel}>Paid</div>
                            <div className={styles.statPercent}>
                                {stats.total ? ((stats.paid / stats.total) * 100).toFixed(1) : 0}% of total
                            </div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ backgroundColor: '#fff3e0' }}>
                            <span style={{ fontSize: '24px' }}>⏳</span>
                        </div>
                        <div className={styles.statContent}>
                            <div className={styles.statNumber}>{stats.pending}</div>
                            <div className={styles.statLabel}>Pending</div>
                            <div className={styles.statPercent}>
                                {stats.total ? ((stats.pending / stats.total) * 100).toFixed(1) : 0}% of total
                            </div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ backgroundColor: '#ffebee' }}>
                            <span style={{ fontSize: '24px' }}>❌</span>
                        </div>
                        <div className={styles.statContent}>
                            <div className={styles.statNumber}>{stats.cancelled}</div>
                            <div className={styles.statLabel}>Cancelled</div>
                            <div className={styles.statPercent}>
                                {stats.total ? ((stats.cancelled / stats.total) * 100).toFixed(1) : 0}% of total
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.listSection}>
                    <div className={styles.listHeader}>
                        <div>
                            <h2 className={styles.listTitle}>List of payments</h2>
                            <p className={styles.listSubtitle}>Manage and track payment transactions</p>
                        </div>
                        <div className={styles.filterGroup}>
                            <div className={styles.searchBox}>
                                <span className={styles.searchIcon}>🔍</span>
                                <input
                                    type="text"
                                    placeholder="Search for payments..."
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
                                    { value: 'Pending', label: 'Pending' },
                                    { value: 'Paid', label: 'Paid' },
                                    { value: 'Cancelled', label: 'Cancelled' },
                                ]}
                            />
                        </div>
                    </div>

                    <BillDetail
                        isOpen={isOpenDetail}
                        billId={selectedBillId}
                        onClose={() => setIsOpenDetail(false)}
                    />

                    <PaymentProcess
                        isOpen={isOpenPay}
                        billId={selectedBillId}
                        onClose={() => {
                            setIsOpenPay(false)
                        }}
                        onSuccess={() => {
                            fetchBills();
                        }}
                        openNotification={openNotification}
                    />

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>CUSTOMER</th>
                                    <th>TOTAL AMOUNT</th>
                                    <th>DISCOUNT AMOUNT</th>
                                    <th>FINAL AMOUNT</th>
                                    <th>PAYMENT METHOD</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((b) => {
                                    const name = b.customer?.fullName || 'N/A';
                                    const statusClass = styles[normalize(b.status)] || '';
                                    const methodClass = styles[normalize(b.paymentMethod?.replace(/\s+/g, '_'))] || '';

                                    return (
                                        <tr key={b._id} onClick={() => handleDetail(b._id)}>
                                            <td className={styles.customerCell}>
                                                <div className={styles.customerInfo}>
                                                    <span>{name}</span>
                                                </div>
                                            </td>
                                            <td className={styles.amountCell}>{formatCurrency(b.totalAmount)}</td>
                                            <td className={styles.discountCell}>{formatCurrency(b.discountAmount)}</td>
                                            <td className={styles.finalAmountCell}>{formatCurrency(b.finalAmount)}</td>
                                            <td>
                                                <span className={`${styles.methodTag} ${methodClass}`}>
                                                    {getPaymentMethodLabel(b.paymentMethod)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${statusClass}`}>
                                                    {getStatusLabel(b.status)}
                                                </span>
                                            </td>
                                            <td>
                                                <div className={styles.actionButtons} onClick={(e) => e.stopPropagation()}>
                                                    {b.status === 'Pending' && (
                                                        <button
                                                            className={styles.btnEdit}
                                                            onClick={() => handlePay(b._id)}
                                                        >
                                                            Pay
                                                        </button>)}
                                                    <ConfirmDelete
                                                        title="Confirm bill deletion"
                                                        description={`Are you sure you want to delete this bill of ${b.customer?.fullName}? This action cannot be undone.`}
                                                        onConfirm={() => handleDelete(b._id)}>
                                                        <button
                                                            className={styles.btnDelete}
                                                        >
                                                            Delete
                                                        </button>
                                                    </ConfirmDelete>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className={styles.emptyState}>
                                            No bills found.
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

export default Payment;
