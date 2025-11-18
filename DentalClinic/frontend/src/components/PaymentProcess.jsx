import React, { useState, useEffect, useMemo } from 'react';
import styles from './PaymentProcess.module.css';
import axios from 'axios';
import { Select } from 'antd';
import QrModal from '../components/QrModal';

const toNumber = (v) =>
  typeof v === 'object' && v?.$numberDecimal != null
    ? Number(v.$numberDecimal)
    : Number(v || 0);

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(toNumber(amount));

const PaymentProcess = ({ isOpen, onClose, onSuccess, openNotification, billId }) => {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selectedPromotion, setSelectedPromotion] = useState('');
  const [promotions, setPromotions] = useState([]);
  const [billData, setBillData] = useState({
    customerId: {},
    serviceItems: [],
    medicineItems: [],
    totalAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    paymentMethod: '',
    status: 'Pending',
  });
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [isOpenQrModal, setIsOpenQrModal] = useState(false);
  const [isOpenCancelModal, setIsOpenCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!isOpen || !billId) return;
    let ignore = false;
    const fetchAll = async () => {
      try {
        setLoading(true);
        setErrMsg('');
        const [promoRes, billRes] = await Promise.all([
          axios.get(`http://localhost:5000/promotion/get-ongoing-promotion`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
          axios.get(`http://localhost:5000/bill/get-bill/${billId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ]);
        if (ignore) return;
        setPromotions(Array.isArray(promoRes.data?.promotions) ? promoRes.data.promotions : []);
        setBillData(billRes.data?.bill || {
          customerId: {},
          serviceItems: [],
          medicineItems: [],
        });
        setPaymentMethod(billRes.data?.bill?.paymentMethod || '');
        setSelectedPromotion(billRes.data?.bill?.promotionId || '');
      } catch (e) {
        console.error(e);
        if (!ignore) setErrMsg(e?.response?.data?.message || 'Failed to load data.');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    fetchAll();
    return () => { ignore = true; };
  }, [isOpen, billId, token]);

  const paymentMethods = [
    { value: 'Cash', label: 'Cash' },
    { value: 'Bank Transfer', label: 'Bank Transfer' },
  ];

  const servicesTotal = useMemo(
    () => (billData.serviceItems || []).reduce((sum, it) => sum + toNumber(it.unitPrice) * toNumber(it.quantity), 0),
    [billData.serviceItems]
  );
  const medicinesTotal = useMemo(
    () => (billData.medicineItems || []).reduce((sum, it) => sum + toNumber(it.unitPrice) * toNumber(it.quantity), 0),
    [billData.medicineItems]
  );
  const baseTotal = servicesTotal + medicinesTotal;

  const discountValue = useMemo(() => {
    if (!selectedPromotion) return 0;
    const promo = promotions.find(p => String(p._id) === String(selectedPromotion));
    if (!promo) return 0;
    const type = promo.discountType;
    const val = Number(promo.discountValue || 0);
    if (type === 'percentage') return Math.min((baseTotal * val) / 100, baseTotal);
    if (type === 'fixed') return Math.min(val, baseTotal);
    return 0;
  }, [selectedPromotion, promotions, baseTotal]);

  const finalAmount = Math.max(baseTotal - discountValue, 0);

  const handleFinishPayment = async () => {
    try {
      if (paymentMethod === "Bank Transfer") {
        setIsOpenQrModal(true);
        return;
      }
      setLoading(true);
      await axios.patch(
        `http://localhost:5000/bill/pay-bill/${billId}`,
        {
          paymentMethod,
          promotionId: selectedPromotion || null,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      openNotification?.('success', 'Payment successful');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      openNotification?.('error', err?.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPayment = () => {
    setIsOpenCancelModal(true);
  };

  const handleCancelBill = async () => {
    if (!cancelReason || cancelReason.trim().length === 0) {
      openNotification?.('error', 'Cancel reason is required');
      return;
    }

    try {
      setCancelling(true);
      await axios.patch(
        `http://localhost:5000/bill/cancel-bill/${billId}`,
        { cancelReason: cancelReason.trim() },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      openNotification?.('success', 'Bill cancelled successfully');
      onSuccess?.();
      setIsOpenCancelModal(false);
      onClose?.();
      setCancelReason('');
    } catch (err) {
      console.error(err);
      openNotification?.('error', err?.response?.data?.message || 'Failed to cancel bill');
    } finally {
      setCancelling(false);
    }
  };

  const handleCloseCancelModal = () => {
    if (cancelling) return;
    setIsOpenCancelModal(false);
    setCancelReason('');
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Payment</h2>
          <button className={styles.closeBtn} onClick={onClose} disabled={loading}>✕</button>
        </div>

        <div className={styles.body}>
          {loading && <p>Loading...</p>}
          {!!errMsg && <p style={{ color: 'red', marginTop: 0 }}>{errMsg}</p>}

          {/* Customer Info */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Customer information</h3>
            <div className={styles.infoRow}>
              <span className={styles.label}>Full name:</span>
              <span className={styles.value}>{billData.customerId?.fullName || '—'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Phone number:</span>
              <span className={styles.value}>{billData.customerId?.phoneNumber || '—'}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Email:</span>
              <span className={styles.value}>{billData.customerId?.email || '—'}</span>
            </div>
          </div>

          {/* Services */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Services</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Service name</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(billData.serviceItems || []).map((item) => (
                  <tr key={item._id || item.id}>
                    <td>{item.name}</td>
                    <td className={styles.center}>{toNumber(item.quantity)}</td>
                    <td className={styles.right}>{formatCurrency(item.unitPrice)}</td>
                    <td className={`${styles.right} ${styles.bold}`}>
                      {formatCurrency(toNumber(item.quantity) * toNumber(item.unitPrice))}
                    </td>
                  </tr>
                ))}
                {(!billData.serviceItems || billData.serviceItems.length === 0) && (
                  <tr><td colSpan="4" className={styles.center}>No service</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Medicines */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Medicines</h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Medicine name</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(billData.medicineItems || []).map((item) => (
                  <tr key={item._id || item.id}>
                    <td>{item.name}</td>
                    <td className={styles.center}>{toNumber(item.quantity)}</td>
                    <td className={styles.right}>{formatCurrency(item.unitPrice)}</td>
                    <td className={`${styles.right} ${styles.bold}`}>
                      {formatCurrency(toNumber(item.quantity) * toNumber(item.unitPrice))}
                    </td>
                  </tr>
                ))}
                {(!billData.medicineItems || billData.medicineItems.length === 0) && (
                  <tr><td colSpan="4" className={styles.center}>No medicine</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Payment Method */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
              Payment method <span className={styles.required}>*</span>
            </h3>
            <Select
              className={styles.select}
              value={paymentMethod || undefined}
              onChange={(value) => setPaymentMethod(value)}
              disabled={loading}
              placeholder="-- Select method --"
              style={{ width: "100%" }}
              options={[
                { value: "", label: "-- Select method --", disabled: true },
                ...paymentMethods.map((m) => ({
                  value: m.value,
                  label: m.label
                }))
              ]}
            />
          </div>

          {/* Promotion */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Promotion</h3>
            <Select
              className={styles.select}
              value={selectedPromotion || undefined}
              onChange={(value) => setSelectedPromotion(value)}
              disabled={loading}
              placeholder="Not applicable"
              style={{ width: "100%" }}
              options={[
                { value: "", label: "Not applicable" },
                ...promotions.map((p) => ({
                  value: p._id,
                  label:
                    p.name +
                    " " +
                    (p.discountType === "percentage"
                      ? `- ${p.discountValue}%`
                      : `- ${formatCurrency(p.discountValue)}`)
                }))
              ]}
            />
          </div>

          {/* Summary */}
          <div className={styles.section}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Total amount:</span>
              <span className={styles.summaryValue}>{formatCurrency(baseTotal)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Discount:</span>
              <span className={styles.discountValue}>-{formatCurrency(discountValue)}</span>
            </div>
            <div className={styles.divider}></div>
            <div className={styles.summaryRow}>
              <span className={styles.totalLabel}>Final amount:</span>
              <span className={styles.totalValue}>{formatCurrency(finalAmount)}</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.btnCancel} onClick={handleCancelPayment} disabled={loading}>
            Cancel Payment
          </button>
          <button className={styles.btnFinish} onClick={handleFinishPayment} disabled={loading}>
            {loading ? 'Processing...' : 'Finish Payment'}
          </button>
          <QrModal
            isOpen={isOpenQrModal}
            billId={billId}
            selectedPromotion={selectedPromotion}
            onClose={() => setIsOpenQrModal(false)}
          />
        </div>
      </div>

      {/* Cancel Bill Modal */}
      {isOpenCancelModal && (
        <div className={styles.cancelOverlay} onClick={handleCloseCancelModal}>
          <div className={styles.cancelModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h2 className={styles.title}>Cancel Bill</h2>
              <button 
                className={styles.closeBtn} 
                onClick={handleCloseCancelModal} 
                disabled={cancelling}
              >
                ✕
              </button>
            </div>

            <div className={styles.body}>
              <p className={styles.cancelDescription}>
                Please provide a reason for cancelling this bill.
              </p>
              <div className={styles.section}>
                <label className={styles.sectionTitle} style={{ display: 'block', marginBottom: '8px' }}>
                  Cancel Reason <span className={styles.required}>*</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter the reason for cancellation..."
                  rows={4}
                  disabled={cancelling}
                />
              </div>
            </div>

            <div className={styles.footer}>
              <button 
                className={styles.btnCancel} 
                onClick={handleCloseCancelModal}
                disabled={cancelling}
              >
                Back
              </button>
              <button 
                className={styles.btnCancelConfirm} 
                onClick={handleCancelBill}
                disabled={cancelling || !cancelReason.trim()}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentProcess;