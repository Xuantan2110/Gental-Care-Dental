import { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import styles from './MedicalRecord.module.css';
import Sidebar from '../components/Sidebar';
import { ClipboardPlus } from 'lucide-react';
import { notification, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import MedicalRecordDetail from '../components/MedicalRecordDetail';
import CreateMedicalRecord from '../components/CreateMedicalRecord';
import ConfirmDelete from "../components/ConfirmDelete";
import { Trash2 } from 'lucide-react';
import { jwtDecode } from "jwt-decode";
import { io } from 'socket.io-client';

const MedicalRecord = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusFilter, setStatusFilter] = useState('all');
    const [customerSearch, setCustomerSearch] = useState('');
    const [sortOrder, setSortOrder] = useState('newest');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isOpenCreateMedicalRecordModal, setIsOpenCreateMedicalRecordModal] = useState(false);
    const [selectedMedicalRecordId, setSelectedMedicalRecordId] = useState(null);
    const [api, contextHolder] = notification.useNotification();
    const [role, setRole] = useState(null);
    const socketRef = useRef(null);

    const token = localStorage.getItem("token");
    useEffect(() => {
        const decoded = jwtDecode(token);
        setRole(decoded.role);
    }, [token]);

    const filteredMedicalRecord = records
        .filter((record) => {
            const customerName = record.customerId?.fullName?.toLowerCase() || '';
            const matchesCustomer = customerName.includes(customerSearch.toLowerCase());
            const matchesStatus =
                statusFilter === 'all' || record.status === statusFilter;
            return matchesCustomer && matchesStatus;
        })
        .sort((a, b) => {
            const aTime = new Date(a.recordDate || a.createdAt).getTime() || 0;
            const bTime = new Date(b.recordDate || b.createdAt).getTime() || 0;
            return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
        });

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

    const handleViewDetail = (appointmentId) => {
        setSelectedMedicalRecordId(appointmentId);
        setIsModalOpen(true);
    };

    const fetchRecords = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("token");
            const res = await axios.get(
                "http://localhost:5000/medicalRecord/get-basic-medical-records",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            );

            setRecords(res.data?.records || []);
        } catch (err) {
            if (axios.isCancel(err)) return;
            setError(err?.response?.data?.message || "Unable to load profile data.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // Socket connection for real-time updates
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const socket = io('http://localhost:5000', {
            auth: { token },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('joinMedicalRecordRoom');
        });

        socket.on('medicalRecordUpdate', (data) => {
            const { medicalRecord, eventType } = data;
            
            if (eventType === 'completed') {
                // Update existing record or add new one
                setRecords((prev) => {
                    const existingIndex = prev.findIndex(r => r._id === medicalRecord._id);
                    if (existingIndex >= 0) {
                        // Update existing record
                        const updated = [...prev];
                        updated[existingIndex] = { ...updated[existingIndex], ...medicalRecord };
                        return updated;
                    } else {
                        // Add new record if not exists
                        return [medicalRecord, ...prev];
                    }
                });
            } else if (eventType === 'created') {
                // Add new record to the list
                setRecords((prev) => {
                    // Check if record already exists to avoid duplicates
                    if (prev.some(r => r._id === medicalRecord._id)) {
                        return prev;
                    }
                    return [medicalRecord, ...prev];
                });
            } else if (eventType === 'cancelled') {
                // Update existing record
                setRecords((prev) =>
                    prev.map((r) =>
                        r._id === medicalRecord._id ? { ...r, ...medicalRecord } : r
                    )
                );
            }
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error);
        });

        // Cleanup on unmount
        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leaveMedicalRecordRoom');
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [token]);

    const handleDelete = async (id) => {
        try {
            await axios.delete(`http://localhost:5000/medicalRecord/delete-medical-record/${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setRecords((prev) => prev.filter((record) => record._id !== id));
            openNotification("success", "Medical record deleted successfully.");
        } catch (error) {
            console.error('Error deleting medical record:', error);
            openNotification("error", "Failed to delete medical record." || error.message);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'N/A';
        return new Intl.DateTimeFormat('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(date);
    };

    const toVN = (t) => {
        if (!t) return 'N/A';
        const date = new Date(t);
        if (isNaN(date.getTime())) return 'N/A';
        return date.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Ho_Chi_Minh"
        });
    }

    const getStatusClass = (status) => {
        const statusLower = status.toLowerCase().replace(' ', '');
        if (statusLower === 'inprogress') return styles.statusInProgress;
        if (statusLower === 'completed') return styles.statusCompleted;
        return styles.statusPending;
    };

    const formatGender = (gender) => {
        const genderMap = {
            male: 'Male',
            female: 'Female',
            other: 'Other',
        };
        return genderMap[gender.toLowerCase()] || gender;
    };

    if (loading) {
        return (
            <div className={styles.medicalRecord}>
                {contextHolder}
                <Sidebar />
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <ClipboardPlus size={32} />
                            <h1 className={styles.headerTitle}>Medical Records</h1>
                        </div>
                        <p className={styles.headerSubtitle}>
                            Loading data...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.medicalRecord}>
                <Sidebar />
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <ClipboardPlus size={32} />
                            <h1 className={styles.headerTitle}>Medical Records</h1>
                        </div>
                        <p className={styles.headerSubtitle} style={{ color: 'red' }}>
                            {error}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!records || records.length === 0) {
        return (
            <div className={styles.medicalRecord}>
                <Sidebar />
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <ClipboardPlus size={32} />
                            <h1 className={styles.headerTitle}>Medical Records</h1>
                        </div>
                        <p className={styles.headerSubtitle}>
                            Manage and track patient records
                        </p>
                    </div>
                    <div className={styles.tableWrapper}>
                        <div className={styles.emptyState}>
                            <div className={styles.emptyStateIcon}>📋</div>
                            <p>No medical records available</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.medicalRecord}>
            {contextHolder}
            <Sidebar />
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <ClipboardPlus size={32} />
                        <h1 className={styles.headerTitle}>Medical Records</h1>
                    </div>
                    <p className={styles.headerSubtitle}>
                        Display {records.length} patient records
                    </p>
                </div>

                <div className={styles.controls}>
                    {!(role === 'Admin') &&
                        <button onClick={() => setIsOpenCreateMedicalRecordModal(true)} className={styles.addButton}>Create medical record</button>}
                    <CreateMedicalRecord isOpen={isOpenCreateMedicalRecordModal} onSuccess={fetchRecords} onClose={() => setIsOpenCreateMedicalRecordModal(false)} openNotification={openNotification} />
                </div>

                <div className={styles.filterSection}>
                    <div className={styles.searchSection}>
                        <input
                            type="text"
                            placeholder="🔍 Search by customer name..."
                            className={styles.searchInput}
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                    </div>

                    <div className={styles.filterControls}>
                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>Status:</label>
                            <Select
                                style={{ width: 120 }}
                                value={statusFilter}
                                onChange={(value) => setStatusFilter(value)}
                                options={[
                                    { value: "all", label: "All Status" },
                                    { value: "In Progress", label: "In Progress" },
                                    { value: "Completed", label: "Completed" },
                                    { value: "Cancelled", label: "Cancelled" },
                                ]}
                            />
                        </div>

                        <div className={styles.filterGroup}>
                            <label className={styles.filterLabel}>Sort by:</label>
                            <Select
                                value={sortOrder}
                                onChange={(value) => setSortOrder(value)}
                                options={[
                                    { value: "newest", label: "Newest First" },
                                    { value: "oldest", label: "Oldest First" },
                                ]}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <MedicalRecordDetail
                        medicalRecordId={selectedMedicalRecordId}
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        openNotification={openNotification}
                        onSuccess={fetchRecords}
                    />
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Dentist</th>
                                <th>Appointment date</th>
                                <th>Gender</th>
                                <th>Status</th>
                                <th>Date Created</th>
                                {(role === 'Admin') &&
                                    <th>Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMedicalRecord.map((record) => (
                                <tr key={record._id} onClick={() => handleViewDetail(record._id)}>
                                    <td className={styles.fullName}>{record.customerId?.fullName}
                                        <p className={styles.phoneNumber}>{record.customerId?.phoneNumber}</p>
                                    </td>
                                    <td className={styles.fullName}>{record.dentistId?.fullName}
                                        <p className={styles.phoneNumber}>{record.dentistId?.phoneNumber}</p>
                                    </td>
                                    <td className={styles.fullName}>{record.appointmentId ? formatDate(record.appointmentId.date) : 'N/A'}
                                        <p className={styles.phoneNumber}>{record.appointmentId ? `${toVN(record.appointmentId.startTime)} - ${toVN(record.appointmentId.endTime)}` : ''}</p>
                                    </td>
                                    <td>
                                        <span className={styles.genderBadge}>
                                            {formatGender(record.customerId?.gender)}
                                        </span>
                                    </td>
                                    <td>
                                        <span
                                            className={`${styles.statusBadge} ${getStatusClass(record.status)}`}
                                        >
                                            {record.status}
                                        </span>
                                    </td>
                                    <td>{formatDate(record.recordDate)}</td>
                                    {(role === 'Admin') &&
                                        <td onClick={(e) => e.stopPropagation()}>
                                            <ConfirmDelete
                                                title="Confirm medical record deletion"
                                                description={`Are you sure you want to delete this medical record of ${record.customerId?.fullName}? This action cannot be undone.`}
                                                onConfirm={() => handleDelete(record._id)}>
                                                {role !== 'Staff' && (
                                                    <button
                                                        className={`${styles.actionButton} ${styles.deleteButton}`}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </ConfirmDelete>
                                        </td>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MedicalRecord;
