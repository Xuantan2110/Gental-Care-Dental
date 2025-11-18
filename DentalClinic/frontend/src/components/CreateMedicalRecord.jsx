import React, { useState, useEffect, useMemo } from "react";
import styles from "./CreateMedicalRecord.module.css";
import { X, ClipboardPlus, Check } from "lucide-react";
import axios from "axios";

const CreateMedicalRecord = ({ isOpen, onClose, onSuccess, openNotification }) => {
    const [customers, setCustomers] = useState([]);
    const [customerSearch, setCustomerSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const token = localStorage.getItem("token");
        axios
            .get("https://gental-care-dental.onrender.com/user/get-all-customer", {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setCustomers(res.data.customers || []))
            .catch((err) => console.error("Error fetching customers:", err));
    }, [isOpen]);

    const filteredCustomers = useMemo(() => {
        const q = (customerSearch || "").toLowerCase();
        return customers.filter((c) => (c.fullName || "").toLowerCase().includes(q));
    }, [customers, customerSearch]);

    const handleSelectCustomer = (customer) => {
        setSelectedCustomer((prev) => (prev?._id === customer._id ? null : customer));
    };

    const handleClearSearch = () => setCustomerSearch("");

    const handleCreate = async () => {
        if (!selectedCustomer) return;
        setCreating(true);
        try {
            const token = localStorage.getItem("token");
            await axios.post(
                "https://gental-care-dental.onrender.com/medicalRecord/create-medical-record",
                { customerId: selectedCustomer._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            openNotification?.( "success", "Medical record created successfully");
            onSuccess?.();
            onClose?.();
        } catch (error) {
            console.error("Error creating medical record:", error);
            openNotification("error", "Failed to book appointment: " + (error.response?.data?.message || "An error occurred."));
        } finally {
            setCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        <ClipboardPlus className={styles.titleIcon} size={30} />
                        Create Medical Record
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.formSection}>
                        <div className={styles.sectionHeader}>
                            <svg className={styles.sectionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <h3>Select Customer</h3>
                        </div>

                        {/* Search */}
                        <div className={styles.searchContainer}>
                            <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Search customers by name..."
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                            />
                            {customerSearch && (
                                <button className={styles.clearBtn} onClick={handleClearSearch} type="button" aria-label="Clear search">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Customer list */}
                        <div className={styles.customerList}>
                            {filteredCustomers.length > 0 ? (
                                filteredCustomers.map((customer) => {
                                    const active = selectedCustomer?._id === customer._id;
                                    return (
                                        <div
                                            key={customer._id}
                                            className={`${styles.customerItem} ${active ? styles.customerItemSelected : ""}`}
                                            onClick={() => handleSelectCustomer(customer)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div className={styles.customerInfo}>
                                                <div className={styles.customerName}>{customer.fullName}</div>
                                                {customer.email && <div className={styles.customerEmail}>{customer.email}</div>}
                                            </div>
                                            {active && <Check size={20} className={styles.checkIcon} aria-label="Selected" />}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className={styles.noResults}>{customerSearch ? "No customers found" : "No customers available"}</div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button className={styles.btnSecondary} onClick={onClose} type="button">
                        Cancel
                    </button>
                    <button
                        className={styles.btnPrimary}
                        onClick={handleCreate}
                        disabled={!selectedCustomer || creating}
                        type="button"
                        title={!selectedCustomer ? "Select a customer first" : "Create medical record"}
                    >
                        {creating ? "Creating..." : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateMedicalRecord;
