import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import styles from './BillDetail.module.css';

const toNumber = (v) =>
  typeof v === 'object' && v?.$numberDecimal != null
    ? Number(v.$numberDecimal)
    : Number(v || 0);

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(toNumber(amount));

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const statusClass = (status) => {
  switch (status) {
    case 'Pending':
      return styles.statusPending;
    case 'Paid':
      return styles.statusPaid;
    case 'Cancelled':
      return styles.statusCancelled;
    default:
      return styles.statusNeutral;
  }
};

const BillDetail = ({ isOpen, billId, onClose }) => {
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const fetchBill = async () => {
      if (!isOpen || !billId) return;
      try {
        setLoading(true);
        setErrMsg('');
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/bill/get-bill/${billId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const b = res.data?.bill || null;
        setBill(b);
      } catch (e) {
        console.error('Fetch bill error:', e);
        setErrMsg(e?.response?.data?.message || 'Failed to load bill.');
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [isOpen, billId]);

  const serviceItems = useMemo(() => bill?.serviceItems || [], [bill]);
  const medicineItems = useMemo(() => bill?.medicineItems || [], [bill]);

  const handlePrint = () => window.print();
  const handleDownload = () => {
    // TODO:
    alert('Download invoice PDF');
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <h2 className={styles.modalTitle}>Invoice Details</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {loading && <p>Loading...</p>}
          {!loading && errMsg && (
            <p style={{ color: 'red', margin: 0 }}>{errMsg}</p>
          )}

          {!loading && !errMsg && bill && (
            <>
              {/* Customer Information */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Customer Information</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Full name:</span>
                    <span className={styles.infoValue}>{bill.customerId?.fullName || '—'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Phone number:</span>
                    <span className={styles.infoValue}>{bill.customerId?.phoneNumber || '—'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Email:</span>
                    <span className={styles.infoValue}>{bill.customerId?.email || '—'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Address:</span>
                    <span className={styles.infoValue}>{bill.customerId?.address || '—'}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Created at:</span>
                    <span className={styles.infoValue}>{formatDate(bill.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Dentist Information */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Dentist Information</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Dentist:</span>
                    <span className={styles.infoValue}>{bill.dentistId?.fullName}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Phone number:</span>
                    <span className={styles.infoValue}>{bill.dentistId?.phoneNumber}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Email:</span>
                    <span className={styles.infoValue}>{bill.dentistId?.email}</span>
                  </div>
                </div>
              </div>

              {/* Staff Information */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Staff Information</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Staff:</span>
                    <span className={styles.infoValue}>{bill.staffId?.fullName}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Phone number:</span>
                    <span className={styles.infoValue}>{bill.staffId?.phoneNumber}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Email:</span>
                    <span className={styles.infoValue}>{bill.staffId?.email}</span>
                  </div>
                </div>
              </div>

              {/* Service Items */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Services</h3>
                <div className={styles.tableWrapper}>
                  <table className={styles.itemTable}>
                    <thead>
                      <tr>
                        <th>Service name</th>
                        <th>Quantity</th>
                        <th>Unit price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serviceItems.map((item) => (
                        <tr key={item._id}>
                          <td className={styles.itemName}>{item.name}</td>
                          <td className={styles.itemQuantity}>{item.quantity}</td>
                          <td className={styles.itemPrice}>{formatCurrency(item.unitPrice)}</td>
                          <td className={styles.itemTotal}>{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                      {serviceItems.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: '#667085' }}>No services</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Medicine Items */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Medicine</h3>
                <div className={styles.tableWrapper}>
                  <table className={styles.itemTable}>
                    <thead>
                      <tr>
                        <th>Medicine name</th>
                        <th>Quantity</th>
                        <th>Unit price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicineItems.map((item) => (
                        <tr key={item._id}>
                          <td className={styles.itemName}>{item.name}</td>
                          <td className={styles.itemQuantity}>{item.quantity}</td>
                          <td className={styles.itemPrice}>{formatCurrency(item.unitPrice)}</td>
                          <td className={styles.itemTotal}>{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                      {medicineItems.length === 0 && (
                        <tr><td colSpan={4} style={{ textAlign: 'center', color: '#667085' }}>No medicine</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment Summary */}
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Payment Information</h3>
                <div className={styles.summaryBox}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Payment method:</span>
                    <span className={styles.paymentMethod}>{bill.paymentMethod}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Payment status:</span>
                    <span className={`${styles.statusBadge} ${statusClass(bill.status)}`}>
                      {bill.status}
                    </span>
                  </div>
                  {bill.status === 'Cancelled' && bill.cancelReason && (
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryLabel}>Cancel reason:</span>
                      <span className={styles.cancelReason}>{bill.cancelReason}</span>
                    </div>
                  )}
                  <div className={styles.summaryDivider} />
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Subtotal:</span>
                    <span className={styles.summaryValue}>{formatCurrency(bill.totalAmount)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Discount:</span>
                    <span className={styles.discountValue}>-{formatCurrency(bill.discountAmount)}</span>
                  </div>
                  <div className={styles.summaryDivider} />
                  <div className={`${styles.summaryRow} ${styles.finalRow}`}>
                    <span className={styles.finalLabel}>Amount due:</span>
                    <span className={styles.finalValue}>{formatCurrency(bill.finalAmount)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnSecondary} onClick={handlePrint}>🖨️ Print invoice</button>
          <button className={styles.btnSecondary} onClick={handleDownload}>📥 Download</button>
          <button className={styles.btnPrimary} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default BillDetail;