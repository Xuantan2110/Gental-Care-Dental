import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import styles from "./Profile.module.css";
import Header from "../components/Header";
import axios from "axios";
import { notification } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { LogOut } from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import UpdateProfile from "./UpdateProfile";
import UpdatePhoto from "../components/UpdatePhoto";

function Profile() {
    const [activeView, setActiveView] = useState("records");
    const [user, setUser] = useState({});
    const [api, contextHolder] = notification.useNotification();
    const [openUpdateModal, setOpenUpdateModal] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPhoto, setCurrentPhoto] = useState({});
    const [medicalRecords, setMedicalRecords] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [bills, setBills] = useState([]);
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
        const token = localStorage.getItem("token");
        Promise.all([
            axios.get("https://gental-care-dental.onrender.com/medicalRecord/get-medical-record-by-customer", {
                headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get("https://gental-care-dental.onrender.com/appointment/get-appointments-by-customer", {
                headers: { Authorization: `Bearer ${token}` },
            }),
            axios.get("https://gental-care-dental.onrender.com/bill/get-bills-by-customer", {
                headers: { Authorization: `Bearer ${token}` },
            })
        ])
        .then(([medicalRecordRes, appointmentRes, billRes]) => {
            setMedicalRecords(medicalRecordRes.data.records || []);
            setAppointments(appointmentRes.data.data || []);
            setBills(billRes.data.bills || []);
        })
        .catch((err) => {
            console.error("Error fetching data:", err);
        });
    }, []);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
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

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/");
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("vi-VN");
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD' 
        }).format(Number(amount) || 0);
    };

    const getStatusClass = (status) => {
        const statusMap = {
            'In Progress': 'inprogess',
            'Completed': 'completed',
            'Cancelled': 'cancelled',
            'Paid': 'paid',
            'Pending': 'pending',
            'pending': 'pending',
            'confirmed': 'confirmed',
            'rejected': 'rejected',
        };
        return statusMap[status] || 'pending';
    };

    const findBillForRecord = (record) => {
        return bills.find(bill => {
            const billDate = new Date(bill.createdAt).toDateString();
            const recordDate = new Date(record.recordDate).toDateString();
            return billDate === recordDate;
        });
    };

    return (
        <div>
            {contextHolder}
            <Header />
            <div className={styles.container}>
                {/* Patient Information Card */}
                <div className={styles.patientCard}>
                    <div className={styles.avatar}>
                        <img className={styles.avatarImg} src={user.avatar} alt="Avatar" />
                        <img onClick={() => { setIsModalOpen(true); setCurrentPhoto(user.avatar); }} className={styles.changeAvatarBtn} width="20" height="20" src="https://img.icons8.com/emoji/20/camera-emoji.png" alt="camera-emoji" />
                        <UpdatePhoto
                            isOpen={isModalOpen}
                            onClose={() => setIsModalOpen(false)}
                            currentPhoto={currentPhoto}
                            onSuccess={(newPhotoUrl) => { setCurrentPhoto(newPhotoUrl); fetchProfile(); }}
                            openNotification={openNotification}
                        />
                    </div>

                    <h2 className={styles.patientName}>{user.fullName}</h2>
                    <p className={styles.patientId}>Role: {user.role}</p>

                    <div className={styles.contactInfo}>
                        <div className={styles.contactItem}>
                            <img width="20" height="20" src="https://img.icons8.com/fluency/20/mail.png" alt="mail" />
                            <span>{user.email}</span>
                        </div>
                        <div className={styles.contactItem}>
                            <img width="20" height="20" src="https://img.icons8.com/ios-filled/25/FA5252/phone.png" alt="phone" />
                            <span>{user.phoneNumber}</span>
                        </div>
                        <div className={styles.contactItem}>
                            <img width="20" height="20" src="https://img.icons8.com/color-glass/25/order-delivered.png" alt="order-delivered" />
                            <span>{user.address}</span>
                        </div>
                        <div className={styles.contactItem}>
                            <img width="20" height="20" src="https://img.icons8.com/color-glass/25/birth-date.png" alt="birth-date" />
                            <span>Date of birth: {new Date(user.dateOfBirth).toLocaleDateString("vi-VN")}</span>
                        </div>
                        <div className={styles.contactItem}>
                            <img width="20" height="20" src="https://img.icons8.com/dusk/25/gender.png" alt="gender" />
                            <span>Gender: {user.gender}</span>
                        </div>
                    </div>
                    <div className={styles.buttonContainer}>
                        <button className={styles.changePasswordBtn} onClick={() => navigate('/change-password')}>Change password</button>
                        <button className={styles.editProfileBtn} onClick={() => setOpenUpdateModal(true)}>Update profile</button>
                        <UpdateProfile user={user} isOpen={openUpdateModal} onClose={() => setOpenUpdateModal(false)} openNotification={openNotification} onSuccess={() => { fetchProfile() }} />
                        <ConfirmDialog
                            title="Confirm logout"
                            description={`Are you sure you want to Logout?`}
                            onConfirm={() => handleLogout()}>
                            <button className={styles.logoutBtn} ><LogOut size={16} />Logout</button>
                        </ConfirmDialog>
                    </div>
                </div>

                {/* Medical Records */}
                <div className={styles.medicalRecords}>
                    <div className={styles.recordsHeader}>
                        <h2 className={styles.recordsTitle}>
                            <span className={styles.fileIcon}>📋</span>
                            {activeView === "records" ? "Medical Records" : "Appointment Schedule"}
                        </h2>
                        <div className={styles.headerButtons}>
                            <button
                                className={`${styles.scheduleBtn} ${activeView === "records" ? styles.active : ""}`}
                                onClick={() => setActiveView("records")}
                            >
                                <span className={styles.clockIcon}>🕐</span>
                                Medical History
                            </button>
                            <button
                                className={`${styles.appointmentBtn} ${activeView === "appointments" ? styles.active : ""}`}
                                onClick={() => setActiveView("appointments")}
                            >
                                <span className={styles.calendarIcon}>📅</span>
                                Appointment Schedule
                            </button>
                        </div>
                    </div>

                    {activeView === "records" && (
                        <div className={styles.recordsList}>
                            {medicalRecords.length > 0 ? (
                                medicalRecords.map((record) => {
                                    const serviceCost = record.servicesUsed.reduce((sum, service) => 
                                        sum + (service.serviceId?.price || 0), 0
                                    );
                                    
                                    const bill = findBillForRecord(record);

                                    return (
                                        <div key={record._id} className={styles.recordCard}>
                                            <div className={styles.recordHeader}>
                                                <h3 className={styles.recordTitle}>
                                                    {record.chiefComplaint || "See the doctor"}
                                                </h3>
                                                <span className={`${styles.statusBadge} ${styles[getStatusClass(record.status)]}`}>
                                                    {record.status}
                                                </span>
                                            </div>

                                            <p className={styles.doctorName}>
                                                Dentist: {record.dentistId?.fullName || "N/A"}
                                            </p>
                                            
                                            {record.diagnosis && record.diagnosis !== "Not available" && (
                                                <p className={styles.recordDescription}>
                                                    Diagnose: {record.diagnosis}
                                                </p>
                                            )}

                                            <div className={styles.recordDetails}>
                                                <div className={styles.recordDate}>
                                                    <span className={styles.dateIcon}>📅</span>
                                                    <span>{formatDate(record.recordDate)}</span>
                                                </div>
                                                <div className={styles.recordCost}>
                                                    Service Cost: <strong>{formatCurrency(serviceCost)}</strong>
                                                </div>
                                            </div>

                                            {/* Services Used */}
                                            {record.servicesUsed.length > 0 && (
                                                <div className={styles.recordNote}>
                                                    <span className={styles.noteLabel}>Services:</span>
                                                    <span className={styles.noteText}>
                                                        {record.servicesUsed.map(s => s.serviceId?.name).join(", ")}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Prescriptions */}
                                            {record.prescriptions && record.prescriptions.length > 0 && (
                                                <div className={styles.recordNote}>
                                                    <span className={styles.noteLabel}>Prescriptions:</span>
                                                    <span className={styles.noteText}>
                                                        {record.prescriptions.map(p => 
                                                            `${p.medicineId?.name} (${p.quantity}) - ${p.instructions}`
                                                        ).join("; ")}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Medical History */}
                                            {record.medicalHistory && record.medicalHistory !== "Not yet" && (
                                                <div className={styles.recordNote}>
                                                    <span className={styles.noteLabel}>Medical History:</span>
                                                    <span className={styles.noteText}>{record.medicalHistory}</span>
                                                </div>
                                            )}

                                            {/* Bill Information */}
                                            {bill && (
                                                <div className={styles.billSection}>
                                                    <div className={styles.billHeader}>
                                                        <h4 className={styles.billTitle}>💳 Payment Information</h4>
                                                        <span className={`${styles.billStatus} ${styles[getStatusClass(bill.status)]}`}>
                                                            {bill.status}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className={styles.billDetails}>
                                                        <div className={styles.billRow}>
                                                            <span className={styles.billLabel}>Total Amount:</span>
                                                            <span className={styles.billValue}>{formatCurrency(bill.totalAmount)}</span>
                                                        </div>
                                                        
                                                        {bill.promotion && (
                                                            <div className={styles.billRow}>
                                                                <span className={styles.billLabel}>
                                                                    Promotion ({bill.promotion.name}):
                                                                </span>
                                                                <span className={styles.billDiscount}>
                                                                    -{formatCurrency(bill.discountAmount)}
                                                                    {bill.promotion.discountType === 'percentage' && 
                                                                        ` (${bill.promotion.discountValue}%)`
                                                                    }
                                                                </span>
                                                            </div>
                                                        )}
                                                        
                                                        <div className={`${styles.billRow} ${styles.billTotal}`}>
                                                            <span className={styles.billLabel}>Final Amount:</span>
                                                            <span className={styles.billFinalAmount}>
                                                                {formatCurrency(bill.finalAmount)}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className={styles.billRow}>
                                                            <span className={styles.billLabel}>Payment Method:</span>
                                                            <span className={styles.billValue}>{bill.paymentMethod}</span>
                                                        </div>
                                                        
                                                        {bill.staff && (
                                                            <div className={styles.billRow}>
                                                                <span className={styles.billLabel}>Processed by:</span>
                                                                <span className={styles.billValue}>{bill.staff.fullName}</span>
                                                            </div>
                                                        )}
                                                        
                                                        {bill.status === 'Cancelled' && bill.cancelReason && (
                                                            <div className={styles.billRow}>
                                                                <span className={styles.billLabel}>Cancel reason:</span>
                                                                <span className={styles.billCancelReason}>{bill.cancelReason}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>No medical records available</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeView === "appointments" && (
                        <div className={styles.appointmentsList}>
                            {appointments.length > 0 ? (
                                appointments.map((appointment) => (
                                    <div key={appointment._id} className={styles.appointmentCard}>
                                        <div className={styles.appointmentHeader}>
                                            <h3 className={styles.appointmentTitle}>
                                                {appointment.service.map(s => s.name).join(", ")}
                                            </h3>
                                            <span
                                                className={`${styles.appointmentStatus} ${styles[getStatusClass(appointment.status)]}`}
                                            >
                                                {appointment.status}
                                            </span>
                                        </div>

                                        <p className={styles.doctorName}>
                                            Dentist: {appointment.dentist?.fullName || "N/A"}
                                        </p>

                                        {appointment.note && (
                                            <p className={styles.appointmentDescription}>{appointment.note}</p>
                                        )}

                                        <div className={styles.appointmentDetails}>
                                            <div className={styles.appointmentDateTime}>
                                                <span className={styles.dateIcon}>📅</span>
                                                <span>{formatDate(appointment.date)}</span>
                                                <span className={styles.timeIcon}>🕐</span>
                                                <span>{appointment.startTime} - {appointment.endTime}</span>
                                            </div>
                                        </div>

                                        {/* Decision Info */}
                                        {appointment.decision?.confirmedAt && (
                                            <div className={styles.recordNote}>
                                                <span className={styles.noteLabel}>Confirmed by:</span>
                                                <span className={styles.noteText}>
                                                    {appointment.decision.confirmedBy?.fullName} - {formatDate(appointment.decision.confirmedAt)}
                                                </span>
                                            </div>
                                        )}

                                        {appointment.decision?.rejectedAt && (
                                            <div className={styles.recordNote}>
                                                <span className={styles.noteLabel}>Reason for reject:</span>
                                                <span className={styles.noteText}>
                                                    {appointment.decision.rejectReason}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>No appointments yet</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Profile;