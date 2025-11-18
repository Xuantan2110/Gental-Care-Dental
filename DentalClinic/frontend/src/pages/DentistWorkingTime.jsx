import React, { useEffect, useState } from 'react';
import { Search, Plus, Edit, Trash2, Calendar1, Calendar } from 'lucide-react';
import styles from './DentistWorkingTime.module.css';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { notification, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import ConfirmDelete from "../components/ConfirmDelete";
import CreateDentistWorkingTime from '../components/CreateDentistWorkingTime';
import UpdateDentistWorkingTime from '../components/UpdateDentistWorkingTime';

const DentistWorkingTime = () => {
    const [fixedSchedules, setFixedSchedules] = useState([]);
    const [specialSchedules, setSpecialSchedules] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [api, contextHolder] = notification.useNotification();
    const [isOpenCreateDentistWorkingTimeModal, setIsOpenCreateDentistWorkingTimeModal] = useState(false);
    const [isOpenUpdateDentistWorkingTimeModal, setIsOpenUpdateDentistWorkingTimeModal] = useState(false);
    const [selectedDentistWorkingTime, setSelectedDentistWorkingTime] = useState(null);
    const [selectedDentist, setSelectedDentist] = useState("all");
    const [role, setRole] = useState(null);

    const token = localStorage.getItem('token');
    useEffect(() => {
        if (!token) return;
        const decoded = jwtDecode(token);
        setRole(decoded.role);
    }, [token]);

    const dayShortMap = { 1: "Sunday", 2: "Monday", 3: "Tuesday", 4: "Wednesday", 5: "Thursday", 6: "Friday", 7: "Saturday" };

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
        fetchDentistWorkingTimes()
    }, [])

    const fetchDentistWorkingTimes = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get("https://gental-care-dental.onrender.com/dentistWorkingTime/get-all-dentist-working-time",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            )
            setFixedSchedules(res.data.data.fixedWorkingTime);
            setSpecialSchedules(res.data.data.specialWorkingTime);
        } catch (error) {
            console.error("Error fetching dentist working time:", error);
        }
    }

    const handleDelete = async (scheduleToDelete) => {
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`https://gental-care-dental.onrender.com/dentistWorkingTime/delete-dentist-working-time/${scheduleToDelete._id}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (scheduleToDelete.isFixed) {
                setFixedSchedules(fixedSchedules.filter(schedule => schedule._id !== scheduleToDelete._id));
            } else {
                setSpecialSchedules(specialSchedules.filter(schedule => schedule._id !== scheduleToDelete._id));
            }
            openNotification("success", "Dentist working time deleted successfully");
        } catch (error) {
            console.log("Error deleting dentist working time:", error);
            openNotification("error", error.response.data.message);
        }
    };

    const handleEdit = (schedule) => {
        setSelectedDentistWorkingTime(schedule)
        setIsOpenCreateDentistWorkingTimeModal(false)
        setIsOpenUpdateDentistWorkingTimeModal(true)
    }

    const allDentists = [
        ...fixedSchedules.map(s => s.dentistId),
        ...specialSchedules.map(s => s.dentistId),
    ];
    const uniqueDentists = Array.from(
        new Map(allDentists.map(d => [d?._id, d])).values()
    );

    const filteredSpecialSchedules = specialSchedules.filter(schedule => {
        const matchesSearch =
            schedule.dentistId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            schedule.dentistId?.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDentist =
            selectedDentist === "all" || schedule.dentistId?._id === selectedDentist;

        return matchesSearch && matchesDentist;
    });

    const filteredFixedSchedules = fixedSchedules.filter(schedule => {
        const matchesSearch =
            schedule.dentistId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            schedule.dentistId?.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDentist =
            selectedDentist === "all" || schedule.dentistId?._id === selectedDentist;

        return matchesSearch && matchesDentist;
    });


    const isValidTime = (time) => time && time !== "null" && time.trim() !== "";

    return (
        <div className={styles.denstistWorkingTime}>
            {contextHolder}
            <Sidebar />
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <Calendar1 size={32} />
                        <h1 className={styles.headerTitle}>Doctor's Work Schedule Management</h1>
                    </div>
                    <p className={styles.headerSubtitle}>Manage working hours for all dentists in the clinic</p>
                </div>

                {/* Search and Filter */}
                <div className={styles.searchSection}>
                    <div className={styles.searchContainer}>
                        <div className={styles.searchInputContainer}>
                            <Search className={styles.searchIcon} size={20} />
                            <input
                                type="text"
                                placeholder="Find a dentist..."
                                className={styles.searchInput}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select
                            className={styles.filterSelect}
                            style={{ width: 220 }}
                            value={selectedDentist}
                            onChange={(value) => setSelectedDentist(value)}
                            options={[
                                { value: "all", label: "All dentists" },
                                ...uniqueDentists.map(dentist => ({
                                    value: dentist?._id,
                                    label: dentist?.fullName,
                                }))
                            ]}
                        />
                        {!(role === 'Staff') &&
                            <button onClick={() => setIsOpenCreateDentistWorkingTimeModal(true)} className={styles.addButton}> <Plus size={20} /> Add calendar </button>}
                        <CreateDentistWorkingTime isOpen={isOpenCreateDentistWorkingTimeModal} onSuccess={() => { fetchDentistWorkingTimes() }} onClose={() => setIsOpenCreateDentistWorkingTimeModal(false)} openNotification={openNotification} />
                        <UpdateDentistWorkingTime
                            schedule={selectedDentistWorkingTime}
                            isOpenUpdate={isOpenUpdateDentistWorkingTimeModal}
                            onSuccess={() => { fetchDentistWorkingTimes(); setSelectedDentistWorkingTime(null) }}
                            onClose={() => { setIsOpenUpdateDentistWorkingTimeModal(false); setSelectedDentistWorkingTime(null) }}
                            openNotification={openNotification}
                        />
                    </div>
                </div>


                {/* Fixed Schedules Section */}
                <div className={styles.tableSection}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleContainer}>
                            <Calendar size={24} className={styles.fixedIcon} />
                            <h2 className={styles.sectionTitle}>Fixed work schedule ({filteredFixedSchedules.length})</h2>
                        </div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead className={styles.tableHead}>
                                <tr>
                                    <th className={styles.tableHeader}>Dentist</th>
                                    <th className={styles.tableHeader}>Morning shift</th>
                                    <th className={styles.tableHeader}>Afternoon shift</th>
                                    <th className={styles.tableHeader}>Working days</th>
                                    {!(role === 'Staff') &&
                                        <th className={styles.tableHeader}>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFixedSchedules.length > 0 ? (
                                    filteredFixedSchedules.map((schedule) => (
                                        <tr key={schedule._id} className={styles.tableRow}>
                                            <td className={styles.tableCell}>
                                                <div>
                                                    <div className={styles.doctorName}>{schedule.dentistId?.fullName}</div>
                                                    <div className={styles.doctorEmail}>{schedule.dentistId?.email}</div>
                                                </div>
                                            </td>
                                            <td className={styles.tableCell}>
                                                {isValidTime(schedule.morning?.startTime) && isValidTime(schedule.morning?.endTime)
                                                    ? `${schedule.morning.startTime} - ${schedule.morning.endTime}`
                                                    : "Not working"}
                                            </td>
                                            <td className={styles.tableCell}>
                                                {isValidTime(schedule.afternoon?.startTime) && isValidTime(schedule.afternoon?.endTime)
                                                    ? `${schedule.afternoon.startTime} - ${schedule.afternoon.endTime}`
                                                    : "Not working"}
                                            </td>
                                            <td className={styles.tableCell}>
                                                <div className={styles.workingDaysContainer}>
                                                    {schedule.workingDays?.map((day, index) => (
                                                        <span key={index} className={styles.dayBadge}>
                                                            {dayShortMap[day]}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            {!(role === 'Staff') &&
                                                <td className={styles.tableCell}>
                                                    <div className={styles.actionButtons}>
                                                        <button onClick={() => handleEdit(schedule)} className={styles.editButton}> <Edit size={16} /> </button>
                                                        <ConfirmDelete
                                                            title="Confirm deletion"
                                                            description={`Are you sure you want to delete dentist ${schedule.dentistId.fullName}'s fixed working time? This action cannot be undone.`}
                                                            itemName={schedule.dentistId.fullName}
                                                            onConfirm={() => handleDelete(schedule)}>
                                                            <button className={styles.deleteButton}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </ConfirmDelete>
                                                    </div>
                                                </td>
                                            }
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className={styles.tableCellNoData}>
                                            No data
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Special Schedules Section */}
                <div className={styles.tableSection}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.sectionTitleContainer}>
                            <Calendar size={24} className={styles.specialIcon} />
                            <h2 className={styles.sectionTitle}>List of special work schedules ({filteredSpecialSchedules.length})</h2>
                        </div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead className={styles.tableHead}>
                                <tr>
                                    <th className={styles.tableHeader}>Dentist</th>
                                    <th className={styles.tableHeader}>Date</th>
                                    <th className={styles.tableHeader}>Morning shift</th>
                                    <th className={styles.tableHeader}>Afternoon shift</th>
                                    {!(role === 'Staff') &&
                                        <th className={styles.tableHeader}>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSpecialSchedules.length > 0 ? (
                                    filteredSpecialSchedules.map((schedule) => (
                                        <tr key={schedule._id} className={styles.tableRow}>
                                            <td className={styles.tableCell}>
                                                <div>
                                                    <div className={styles.doctorName}>{schedule.dentistId?.fullName}</div>
                                                    <div className={styles.doctorEmail}>{schedule.dentistId?.email}</div>
                                                </div>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <div>
                                                    <div className={styles.dateText}>{new Date(schedule.date).toLocaleDateString("vi-VN")}</div>
                                                </div>
                                            </td>
                                            <td className={styles.tableCell}>
                                                {isValidTime(schedule.morning?.startTime) && isValidTime(schedule.morning?.endTime)
                                                    ? `${schedule.morning.startTime} - ${schedule.morning.endTime}`
                                                    : "Not working"}
                                            </td>
                                            <td className={styles.tableCell}>
                                                {isValidTime(schedule.afternoon?.startTime) && isValidTime(schedule.afternoon?.endTime)
                                                    ? `${schedule.afternoon.startTime} - ${schedule.afternoon.endTime}`
                                                    : "Not working"}
                                            </td>
                                            {!(role === 'Staff') &&
                                                <td className={styles.tableCell}>
                                                    <div className={styles.actionButtons}>
                                                        <button onClick={() => handleEdit(schedule)} className={styles.editButton}>
                                                            <Edit size={16} />
                                                        </button>
                                                        <ConfirmDelete
                                                            title="Confirm dentist working time deletion"
                                                            description={`Are you sure you want to delete dentist ${schedule.dentistId.fullName}'s special working time? This action cannot be undone.`}
                                                            itemName={schedule.dentistId.fullName}
                                                            onConfirm={() => handleDelete(schedule)}>
                                                            <button
                                                                className={styles.deleteButton}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </ConfirmDelete>
                                                    </div>
                                                </td>
                                            }
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className={styles.tableCellNoData}>
                                            No data
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

export default DentistWorkingTime;