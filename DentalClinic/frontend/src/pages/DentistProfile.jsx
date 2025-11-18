import React, { useEffect, useState } from "react";
import styles from "./DentistProfile.module.css";
import axios from "axios";
import Sidebar from "../components/Sidebar";
import { notification } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import ConfirmDelete from "../components/ConfirmDelete";

const DentistProfile = () => {
    const [dentists, setDentists] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDentist, setSelectedDentist] = useState(null);
    const [profile, setProfile] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [api, contextHolder] = notification.useNotification();

    const [formData, setFormData] = useState({
        specialization: "",
        experienceYears: "",
        biography: "",
        education: "",
        awards: ""
    });

    const token = localStorage.getItem("token");

    useEffect(() => {
        axios.get("https://gental-care-dental.onrender.com/user/get-all-dentist", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                setDentists(res.data.dentists);
            })
            .catch(err => console.error("Error load dentists:", err));
    }, [token]);

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

    const handleSelectDentist = (dentist) => {
        setSelectedDentist(dentist);
        setIsCreating(false);

        axios.get(`https://gental-care-dental.onrender.com/dentistProfile/get-dentist-profile/${dentist._id}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                setProfile(res.data.profile);
                const p = res.data.profile;

                setFormData({
                    specialization: p.specialization || "",
                    experienceYears: p.experienceYears ?? "",
                    biography: p.biography || "",
                    education: Array.isArray(p.education)
                        ? p.education.join("\n")
                        : (p.education || ""),
                    awards: Array.isArray(p.awards)
                        ? p.awards.join("\n")
                        : (p.awards || "")
                });
            })
            .catch(() => {
                setProfile(null);
                setFormData({
                    specialization: "",
                    experienceYears: "",
                    biography: "",
                    education: "",
                    awards: "",
                });
            });
    };

    const handleCreate = () => {
        axios.post("https://gental-care-dental.onrender.com/dentistProfile/create-dentist-profile",
            {
                dentistId: selectedDentist._id,
                ...formData
            },
            { headers: { Authorization: `Bearer ${token}` } }
        )
            .then(res => {
                openNotification("success", "Profile created successfully!");
                setProfile(res.data.profile);
                setIsCreating(false);
            })
            .catch(err => {
                openNotification("error", err.response?.data?.message || "Error creating profile");
            });
    };

    const handleUpdate = () => {
        axios.put(
            `https://gental-care-dental.onrender.com/dentistProfile/update-dentist-profile/${selectedDentist._id}`,
            formData,
            { headers: { Authorization: `Bearer ${token}` } }
        )
            .then(res => {
                openNotification("success", "Profile updated successfully!");
                setProfile(res.data.profile);
            })
            .catch(err => {
                openNotification("error", err.response?.data?.message || "Error updating profile");
            });
    };

    const handleDelete = () => {
        axios.delete(
            `https://gental-care-dental.onrender.com/dentistProfile/delete-dentist-profile/${selectedDentist._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
            .then(() => {
                openNotification("success", "Profile deleted successfully!");
                setProfile(null);
                setIsCreating(false);
            });
    };

    const filteredDentists = dentists.filter(d =>
        d.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.dentistProfile}>
            {contextHolder}
            <Sidebar />
            <div className={styles.leftPanel}>

                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder="🔍 Find a dentist..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.dentistList}>
                    {filteredDentists.map(d => (
                        <div
                            key={d._id}
                            className={`${styles.dentistItem} ${selectedDentist?._id === d._id ? styles.dentistItemActive : ""}`}
                            onClick={() => handleSelectDentist(d)}
                        >
                            <div className={styles.avatar}>
                                <img
                                    src={d.avatar || "https://via.placeholder.com/40"}
                                    alt={d.fullName}
                                    className={styles.avatarImage}
                                />
                            </div>

                            <div className={styles.dentistInfo}>
                                <div className={styles.dentistName}>{d.fullName}</div>
                                <div className={styles.dentistEmail}>{d.email}</div>
                            </div>
                        </div>
                    ))}
                </div>

            </div>

            <div className={styles.rightPanel}>
                {!selectedDentist ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyStateIcon}>🦷</div>
                        <div className={styles.emptyStateText}>Select a dentist to view profile</div>
                    </div>
                ) : !profile && !isCreating ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyStateText}>Dentist has no record</div>
                        <button
                            className={styles.buttonPrimary}
                            onClick={() => setIsCreating(true)}
                        >
                            ➕ Create a profile
                        </button>
                    </div>
                ) : (
                    <>
                        <h2 className={styles.formTitle}>
                            {isCreating ? "📝 Create profile" : "📋 Dentist profile"}
                        </h2>

                        <div className={styles.formContainer}>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Specialization</label>
                                <input
                                    type="text"
                                    value={formData.specialization}
                                    className={styles.input}
                                    onChange={e => setFormData({ ...formData, specialization: e.target.value })}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Experience Years</label>
                                <input
                                    type="number"
                                    value={formData.experienceYears}
                                    className={styles.input}
                                    onChange={e => setFormData({ ...formData, experienceYears: e.target.value })}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Biography</label>
                                <textarea
                                    value={formData.biography}
                                    className={styles.textarea}
                                    onChange={e => setFormData({ ...formData, biography: e.target.value })}
                                ></textarea>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Education</label>
                                <textarea
                                    value={formData.education}
                                    className={styles.textarea}
                                    onChange={e =>
                                        setFormData({
                                            ...formData,
                                            education: e.target.value
                                        })
                                    }
                                ></textarea>
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Awards</label>
                                <textarea
                                    value={formData.awards}
                                    className={styles.textarea}
                                    onChange={e =>
                                        setFormData({
                                            ...formData,
                                            awards: e.target.value
                                        })
                                    }
                                ></textarea>
                            </div>

                            <div className={styles.buttonContainer}>
                                {isCreating ? (
                                    <button
                                        className={styles.buttonSuccess}
                                        onClick={handleCreate}
                                    >
                                        ✅ Create Profile
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            className={styles.buttonPrimary}
                                            onClick={handleUpdate}
                                        >
                                            💾 Save changes
                                        </button>
                                        <ConfirmDelete
                                            title="Confirm dentist profile deletion"
                                            description={`Are you sure you want to delete this dentist profile? This action cannot be undone.`}
                                            onConfirm={handleDelete}>
                                        <button
                                            className={styles.buttonDanger}
                                        >
                                            🗑️ Delete
                                        </button>
                                        </ConfirmDelete>
                                    </>
                                )}
                            </div>

                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default DentistProfile;
