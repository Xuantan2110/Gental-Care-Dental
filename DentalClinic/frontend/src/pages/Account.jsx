import { useState, useEffect, useRef } from "react";
import styles from "./Account.module.css";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { notification, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import Swal from "sweetalert2";
import { LockKeyhole, KeyRound } from 'lucide-react';
import ConfirmDelete from "../components/ConfirmDelete";
import CreateUser from "./CreateUser";
import UserProfile from "../components/UserProfile";


function Account() {
    const [users, setUsers] = useState([])
    const [searchTerm, setSearchTerm] = useState("")
    const [activeDropdown, setActiveDropdown] = useState(null)
    const [filterRole, setFilterRole] = useState("")
    const dropdownRef = useRef(null);
    const [api, contextHolder] = notification.useNotification();
    const [isModalCreateOpen, setIsModalCreateOpen] = useState(false);
    const [isModalDetailOpen, setIsModalDetailOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [role, setRole] = useState(null);

    const token = localStorage.getItem('token');
    useEffect(() => {
        if (!token) return;
        const decoded = jwtDecode(token);
        setRole(decoded.role);
    }, [token]);

    const filteredUsers = users.filter((user) => {
        const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterRole ? user.role === filterRole : true;
        return matchesSearch && matchesType;
    })

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
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get("http://localhost:5000/user/all-users",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            )
            setUsers(res.data.users)
        } catch (err) {
            console.error("Error fetching user:", err)
        }
    }

    const handleDelete = async (userId) => {
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`http://localhost:5000/user/delete-user/${userId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            setUsers(users.filter(user => user._id !== userId));
            openNotification("success", "User deleted successfully");
        } catch (error) {
            console.error("Error deleting user:", error);
            if (error.response && error.response.data) {
                if (error.response && error.response.data.errors.length > 0) {
                    openNotification("error", error.response.data.errors[0].msg);
                } else if (error.response.data.message) {
                    openNotification("error", error.response.data.message);
                } else {
                    openNotification("error", "Failed to delete user!");
                }
            } else {
                openNotification("error", "Failed to delete user!");
            }
        }
    }

    const handleStatusToggle = async (userId, isActive) => {
        const token = localStorage.getItem('token');
        const result = await Swal.fire({
            title: "Are you sure?",
            text: isActive ? "Do you want to Lock this user?" : "Do you want to UnLock this user?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: isActive ? "Yes, Lock this" : "Yes, UnLock this",
        });

        if (!result.isConfirmed) return;
        try {
            const res = await axios.patch(`http://localhost:5000/user/toggle-status/${userId}`, {}, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const updatedUser = res.data.user;
            setUsers(users.map(user => user._id === updatedUser._id ? updatedUser : user));
            fetchUsers();
            openNotification("success", `User status updated to ${updatedUser.isActive ? "Active" : "Inactive"}`);
        } catch (error) {
            console.error("Error toggling user status:", error);
            if (error.response && error.response.data) {
                if (Array.isArray(error.response.data.errors) && error.response.data.errors.length > 0) {
                    openNotification("error", error.response.data.errors[0].msg);
                } else if (error.response.data.message) {
                    openNotification("error", error.response.data.message);
                } else {
                    openNotification("error", "Failed to update user status!");
                }
            } else {
                openNotification("error", "Failed to update user status!");
            }
        }
    }

    useEffect(() => {
        if (!activeDropdown) return;
        const handleClick = (event) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [activeDropdown]);

    return (
        <div className={styles.account}>
            {contextHolder}
            <Sidebar />
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h1 className={styles.title}>User Management</h1>
                        <p className={styles.subtitle}>Manage user accounts and permissions</p>
                    </div>
                    {!(role === 'Dentist' || role === 'Staff') && 
                    <button onClick={() => setIsModalCreateOpen(true)} className={styles.addButton}>+ Add user</button>}
                    <CreateUser isOpen={isModalCreateOpen} onSuccess={() => { fetchUsers() }} onClose={() => setIsModalCreateOpen(false)} openNotification={openNotification} />
                </div>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <div className={styles.statNumber}>{users.length}</div>
                            <div className={styles.statLabel}>Total users</div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.staffIcon}`}>
                            <img width="30" height="30" src="https://img.icons8.com/fluency/30/commercial-development-management.png" alt="commercial-development-management" />
                        </div>
                        <div>
                            <div className={styles.statNumber}>{users.filter(user => user.role === 'Staff').length}</div>
                            <div className={styles.statLabel}>Total staff</div>
                            <div className={styles.statChange}>{((users.filter(user => user.role === 'Staff').length / users.length) * 100).toFixed(1)}% of total</div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.dentistIcon}`}>
                            <img width="30" height="30" src="https://img.icons8.com/color/30/dentist-skin-type-3.png" alt="dentist-skin-type-3" />
                        </div>
                        <div>
                            <div className={styles.statNumber}>{users.filter(user => user.role === 'Dentist').length}</div>
                            <div className={styles.statLabel}>Total Dentist</div>
                            <div className={styles.statChange}>{((users.filter(user => user.role === 'Dentist').length / users.length) * 100).toFixed(1)}% of total</div>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.customerIcon}`}>
                            <img width="30" height="30" src="https://img.icons8.com/plasticine/30/budget.png" alt="budget" />
                        </div>
                        <div>
                            <div className={styles.statNumber}>{users.filter(user => user.role === 'Customer').length}</div>
                            <div className={styles.statLabel}>Total Customer</div>
                            <div className={styles.statChange}>{((users.filter(user => user.role === 'Customer').length / users.length) * 100).toFixed(1)}% of total</div>
                        </div>
                    </div>
                </div>

                {/* User Table Section */}
                <div className={styles.tableSection}>
                    <div className={styles.tableSectionHeader}>
                        <div>
                            <h2 className={styles.tableSectionTitle}>List of users</h2>
                            <p className={styles.tableSectionSubtitle}>Manage and track user information</p>
                        </div>
                        <div className={styles.tableControls}>
                            <div className={styles.searchContainer}>
                                <svg
                                    className={styles.searchIcon}
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search for users..."
                                    className={styles.searchInput}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className={styles.filterContainer}>
                                <svg
                                    className={styles.filterIcon}
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
                                </svg>
                                <Select
                                    style={{ width: 100 }}
                                    value={filterRole}
                                    onChange={(value) => setFilterRole(value)}
                                    options={[
                                        { value: "", label: "All" },
                                        ...Array.from(new Set(users.map(u => u.role))).map(role => ({
                                            value: role,
                                            label: role,
                                        }))
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Contact</th>
                                    <th>Role</th>
                                    <th>Gender</th>
                                    <th>Address</th>
                                    <th>Status</th>
                                    {!(role === 'Dentist' || role === 'Staff') && <th>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} onClick={() => { setIsModalDetailOpen(true); setSelectedUserId(user._id); }}>
                                        <td>
                                            <div className={styles.userInfo}>
                                                <img src={user.avatar} alt="User Avatar" className={styles.avatar} />
                                                <span className={styles.userName}>{user.fullName}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.contactInfo}>
                                                <div className={styles.email}>{user.email}</div>
                                                <div className={styles.phone}>{user.phoneNumber}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.roleBadge} ${styles[user.role.toLowerCase()]}`}>{user.role}</span>
                                        </td>
                                        <td>
                                            <span className={styles.genderBadge}>{user.gender}</span>
                                        </td>
                                        <td className={styles.dateCell}>{user.address}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${user.isActive ? styles.active : styles.inactive}`}>
                                                {user.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        {!(role === 'Dentist' || role === 'Staff') && (
                                            <td onClick={(e) => {e.stopPropagation();}}>
                                                <div className={styles.actionContainer} ref={activeDropdown === user._id ? dropdownRef : null}>
                                                    <button
                                                        className={styles.actionButton}
                                                        onClick={() => {
                                                            setActiveDropdown(activeDropdown === user._id ? null : user._id)
                                                        }}
                                                    >
                                                        <svg
                                                            width="16"
                                                            height="16"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                        >
                                                            <circle cx="12" cy="12" r="1" />
                                                            <circle cx="12" cy="5" r="1" />
                                                            <circle cx="12" cy="19" r="1" />
                                                        </svg>
                                                    </button>
                                                    {activeDropdown === user._id && (
                                                        <div className={styles.dropdown}>
                                                            <button className={styles.dropdownItem}>
                                                                <svg
                                                                    width="14"
                                                                    height="14"
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    stroke="currentColor"
                                                                    strokeWidth="2"
                                                                >
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                </svg>
                                                                Edit
                                                            </button>
                                                            <button className={styles.dropdownItem} onClick={() => handleStatusToggle(user._id, user.isActive)}>
                                                                {user.isActive ? (
                                                                    <>
                                                                        <LockKeyhole className={styles.iconLockAccount} size={14} color="currentColor" />
                                                                        Lock{" "}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <KeyRound className={styles.iconUnlockAccount} size={14} color="green" />
                                                                        Unlock{" "}
                                                                    </>
                                                                )}
                                                            </button>
                                                            <ConfirmDelete
                                                                title="Confirm user deletion"
                                                                description={`Are you sure you want to delete user ${user.fullName}? This action cannot be undone.`}
                                                                itemName={user.fullName}
                                                                onConfirm={() => handleDelete(user._id)}>
                                                                <button
                                                                    className={`${styles.dropdownItem} ${styles.deleteItem}`}
                                                                >
                                                                    <svg
                                                                        width="14"
                                                                        height="14"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                    >
                                                                        <polyline points="3,6 5,6 21,6" />
                                                                        <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
                                                                    </svg>
                                                                    Delete
                                                                </button>
                                                            </ConfirmDelete>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <UserProfile isOpen={isModalDetailOpen} onClose={() => setIsModalDetailOpen(false)} userId={selectedUserId} />
                </div>
            </div>
        </div>
    )
}

export default Account;
