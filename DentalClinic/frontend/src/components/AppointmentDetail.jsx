import { useEffect, useState, useCallback } from 'react';
import styles from './AppointmentDetail.module.css';
import axios from 'axios';
import { User, Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, Loader2, Mail, Phone, Stethoscope, Info } from 'lucide-react';

const AppointmentDetail = ({ appointmentId, isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAppointmentDetail = useCallback(async () => {
    if (!appointmentId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `https://gental-care-dental.onrender.com/appointment/get-appointment/${appointmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setData(response?.data?.data ?? null);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not load appointment information';
      setError(msg);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (isOpen && appointmentId) {
      fetchAppointmentDetail();
    }
  }, [isOpen, appointmentId, fetchAppointmentDetail]);

  const formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}${timeStr ? ` - ${timeStr}` : ''}`;
  };

  const formatFullDateTime = (isoStr) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const getStatusBadge = (status) => {
    const key = (status || '').toLowerCase();
    const statusMap = {
      pending: { 
        text: 'Pending', 
        class: styles.statusPending,
        icon: <AlertCircle className={styles.statusIcon} />
      },
      confirmed: { 
        text: 'Confirmed', 
        class: styles.statusConfirmed,
        icon: <CheckCircle className={styles.statusIcon} />
      },
      rejected: { 
        text: 'Rejected', 
        class: styles.statusRejected,
        icon: <XCircle className={styles.statusIcon} />
      },
    };
    const info = statusMap[key] || { text: status, class: '', icon: <AlertCircle className={styles.statusIcon} /> };
    return (
      <span className={`${styles.statusBadge} ${info.class}`}>
        {info.icon}
        {info.text}
      </span>
    );
  };

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const renderServices = (services) => {
    if (!Array.isArray(services) || services.length === 0) return <span className={styles.naText}>N/A</span>;
    return (
      <ul className={styles.serviceList}>
        {services.map((s) => (
          <li key={s._id || s.serviceId} className={styles.serviceItem}>{s.name}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className={styles.modalOverlay} onClick={handleBackdropClick}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <FileText className={styles.headerIcon} />
            <h2 className={styles.headerTitle}>Appointment Details</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {loading && (
            <div className={styles.loadingContainer}>
              <Loader2 className={styles.spinner} />
              <p className={styles.loadingText}>Loading appointment information...</p>
            </div>
          )}

          {error && (
            <div className={styles.errorContainer}>
              <XCircle className={styles.errorIcon} />
              <p className={styles.errorText}>{error}</p>
              <button onClick={fetchAppointmentDetail} className={styles.retryButton}>
                Try Again
              </button>
            </div>
          )}

          {data && !loading && !error && (
            <div className={styles.detailContainer}>
              {/* Status */}
              <div className={styles.statusSection}>
                {getStatusBadge(data.status)}
              </div>

              {/* Customer information */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <User className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>Customer Information</h3>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <User className={styles.customerInfoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.label}>Full Name</span>
                      <span className={styles.value}>{data.customer?.fullName || 'N/A'}</span>
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <Mail className={styles.customerInfoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.label}>Email</span>
                      <span className={styles.value}>{data.customer?.email || 'N/A'}</span>
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <Phone className={styles.customerInfoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.label}>Phone Number</span>
                      <span className={styles.value}>
                        {data.customer?.phoneNumber || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dentist information */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Stethoscope className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>Dentist Information</h3>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <User className={styles.dentistInfoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.label}>Dentist</span>
                      <span className={styles.value}>{data.dentist?.fullName || 'N/A'}</span>
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <Mail className={styles.dentistInfoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.label}>Email</span>
                      <span className={styles.value}>{data.dentist?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment information */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Calendar className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>Appointment Information</h3>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <Calendar className={styles.infoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.label}>Date</span>
                      <span className={styles.value}>{formatDateTime(data.date)}</span>
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <Clock className={styles.infoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.label}>Time</span>
                      <span className={styles.value}>
                        {data.startTime} - {data.endTime}
                      </span>
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <FileText className={styles.infoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.label}>Services</span>
                      <div className={styles.value}>{renderServices(data.service)}</div>
                    </div>
                  </div>
                  <div className={styles.infoItem}>
                    <FileText className={styles.infoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.label}>Note</span>
                      <span className={styles.value}>{data.note || 'None'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decision information */}
              {(data.decision?.confirmedBy || data.decision?.rejectedBy) && (
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    {data.decision.confirmedBy ? (
                      <CheckCircle className={styles.sectionIcon} />
                    ) : (
                      <XCircle className={styles.sectionIcon} />
                    )}
                    <h3 className={styles.sectionTitle}>Decision Information</h3>
                  </div>
                  <div className={styles.infoGrid}>
                    {data.decision.confirmedBy && (
                      <>
                        <div className={styles.infoItem}>
                          <User className={styles.infoIcon} />
                          <div className={styles.infoContent}>
                            <span className={styles.label}>Confirmed By</span>
                            <span className={styles.value}>
                              {data.decision.confirmedBy.fullName}
                            </span>
                          </div>
                        </div>
                        <div className={styles.infoItem}>
                          <Clock className={styles.infoIcon} />
                          <div className={styles.infoContent}>
                            <span className={styles.label}>Confirmation Time</span>
                            <span className={styles.value}>
                              {formatFullDateTime(data.decision.confirmedAt)}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                    {data.decision.rejectedBy && (
                      <>
                        <div className={styles.infoItem}>
                          <User className={styles.infoIcon} />
                          <div className={styles.infoContent}>
                            <span className={styles.label}>Rejected By</span>
                            <span className={styles.value}>
                              {data.decision.rejectedBy.fullName}
                            </span>
                          </div>
                        </div>
                        <div className={styles.infoItem}>
                          <Clock className={styles.infoIcon} />
                          <div className={styles.infoContent}>
                            <span className={styles.label}>Time of Rejection</span>
                            <span className={styles.value}>
                              {formatFullDateTime(data.decision.rejectedAt)}
                            </span>
                          </div>
                        </div>
                        {data.decision.rejectReason && (
                          <div className={styles.infoItem}>
                            <AlertCircle className={styles.infoIcon} />
                            <div className={styles.infoContent}>
                              <span className={styles.label}>Reason for Rejection</span>
                              <span className={styles.value}>{data.decision.rejectReason}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* System information */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Info className={styles.sectionIcon} />
                  <h3 className={styles.sectionTitle}>System Information</h3>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <Clock className={styles.infoIcon} />
                    <div className={styles.infoContent}>
                      <span className={styles.label}>Appointment Book At</span>
                      <span className={styles.value}>{formatFullDateTime(data.bookAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.closeBtn}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetail;
