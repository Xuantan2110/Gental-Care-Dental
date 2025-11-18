import React, { useEffect, useState, useCallback } from "react";
import styles from "./QrModal.module.css";
import axios from "axios";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
};

const QrModal = ({ isOpen, onClose, billId, selectedPromotion }) => {
    const [paymentData, setPaymentData] = useState([]);

    const fetchPaymentData = useCallback(async () => {
        try {
            const url = selectedPromotion
                ? `https://gental-care-dental.onrender.com/bankTranfer/bank-transfer/${billId}/${selectedPromotion}`
                : `https://gental-care-dental.onrender.com/bankTranfer/bank-transfer/${billId}`;

            const res = await axios.get(url, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            setPaymentData(res.data.data);
        } catch (error) {
            console.error('Error:', error);
        }
    }, [billId, selectedPromotion]);

    useEffect(() => {
        if (isOpen) {
            fetchPaymentData();
        }
    }, [isOpen, billId, fetchPaymentData]);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose?.();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleOverlayClick}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    ×
                </button>

                <h2 className={styles.title}>QR Payment</h2>

                <div className={styles.infoSection}>
                    <div className={styles.infoRow}>
                        <span className={styles.infoLabel}>Subtotal:</span>
                        <span className={styles.infoValue}>{formatCurrency(paymentData.totalAmount)}</span>
                    </div>

                    <div className={styles.infoRow}>
                        <span className={`${styles.infoLabel} ${styles.discount}`}>
                            Discount:
                        </span>
                        <span className={`${styles.infoValue} ${styles.discount}`}>
                            -{formatCurrency(paymentData.discountAmount)}
                        </span>
                    </div>

                    <div className={styles.divider}></div>

                    <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Total:</span>
                        <span className={styles.totalValue}>{formatCurrency(paymentData.finalAmount)}</span>
                    </div>
                </div>

                <div className={styles.qrSection}>
                    <div className={styles.qrContainer}>
                        <img
                            src={paymentData.qrUrl}
                            alt="QR Code"
                            className={styles.qrImage}
                        />
                    </div>
                    <p className={styles.qrNote}>
                        Scan this QR code using your banking app <br /> to complete payment.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QrModal;
