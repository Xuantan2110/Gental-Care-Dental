import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Layers, Pill, X, Search } from 'lucide-react';
import styles from './ManageMedicine.module.css';
import Sidebar from '../components/Sidebar';
import { notification, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { jwtDecode } from 'jwt-decode';
import ConfirmDelete from "../components/ConfirmDelete";


const ManageMedicine = () => {
    const [activeTab, setActiveTab] = useState('medicine');
    const [medicines, setMedicines] = useState([]);
    const [categories, setCategories] = useState([]);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('add');
    const [currentItem, setCurrentItem] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [api, contextHolder] = notification.useNotification();
    const [role, setRole] = useState(null);
    const [categoryForm, setCategoryForm] = useState({ name: '' });

    const [formData, setFormData] = useState({
        name: '',
        medicineCategory: '',
        unit: '',
        price: '',
        origin: '',
        manufacturer: ''
    });


    const token = localStorage.getItem('token');
    useEffect(() => {
        if (!token) return;
        const decoded = jwtDecode(token);
        setRole(decoded.role);
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

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`https://gental-care-dental.onrender.com/medicineCategory/get-medicine-categories`);
            setCategories(res.data?.categories || []);
        } catch (e) {
            console.error(e);
            setError(e?.response?.data?.message || 'Unable to load medicine category list');
        }
    };

    const fetchMedicines = async () => {
        try {
            const res = await axios.get(`https://gental-care-dental.onrender.com/medicine/get-medicines`);
            setMedicines(res.data?.medicines || []);
        } catch (e) {
            console.error(e);
            setError(e?.response?.data?.message || 'Unable to load medication list');
        }
    };

    useEffect(() => {
        let ignore = false;
        const run = async () => {
            setLoading(true);
            setError('');
            try {
                await Promise.all([fetchCategories(), fetchMedicines()]);
            } finally {
                if (!ignore) setLoading(false);
            }
        };
        run();
        return () => { ignore = true; };
    }, []);

    const openModal = (type, item = null) => {
        setModalType(type);
        setShowModal(true);
        setError('');
        if (item) {
            setCurrentItem(item);
            if (activeTab === 'medicine') {
                setFormData({
                    name: item.name || '',
                    medicineCategory: item.medicineCategory?._id || '',
                    unit: item.unit || '',
                    price: item.price ?? '',
                    origin: item.origin || '',
                    manufacturer: item.manufacturer || ''
                });
            } else {
                setCategoryForm({ name: item.name || '' });
            }
        } else {
            setCurrentItem(null);
            setFormData({
                name: '',
                medicineCategory: '',
                unit: '',
                price: '',
                origin: '',
                manufacturer: ''
            });
            setCategoryForm({ name: '' });
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setCurrentItem(null);
        setSubmitting(false);
        setError('');
    };

    const handleSubmitMedicine = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const payload = {
                ...formData,
                price: Number(formData.price)
            };

            if (modalType === 'add') {
                await axios.post(`https://gental-care-dental.onrender.com/medicine/create-medicine`, payload, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            } else {
                await axios.put(`https://gental-care-dental.onrender.com/medicine/update-medicine/${currentItem._id}`, payload, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }
            await fetchMedicines();
            openNotification("success", `Medicine ${modalType === 'add' ? 'added' : 'updated'} successfully.`);
            closeModal();
        } catch (err) {
            console.error(err);
            setError(err?.response?.data?.message || 'An error occurred while saving the medicine.');
            openNotification("error", err?.response?.data?.message || 'An error occurred while saving the medicine.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitCategory = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const payload = { name: categoryForm.name.trim() };
            if (modalType === 'add') {
                await axios.post(`https://gental-care-dental.onrender.com/medicineCategory/create-medicine-category`, payload, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            } else {
                await axios.put(`https://gental-care-dental.onrender.com/medicineCategory/update-medicine-category/${currentItem._id}`, payload, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
            }
            await fetchCategories();
            openNotification("success", `Medicine category ${modalType === 'add' ? 'added' : 'updated'} successfully.`);
            closeModal();
        } catch (err) {
            console.error(err);
            setError(err?.response?.data?.message || 'Error saving medicine type');
            openNotification("error", err?.response?.data?.message || 'Error saving medicine type');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        setError('');
        try {
            if (activeTab === 'medicine') {
                await axios.delete(
                    `https://gental-care-dental.onrender.com/medicine/delete-medicine/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                await fetchMedicines();
                openNotification("success", "Medicine deleted successfully.");
            } else {
                await axios.delete(
                    `https://gental-care-dental.onrender.com/medicineCategory/delete-medicine-category/${id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                await Promise.all([fetchCategories(), fetchMedicines()]);
                openNotification("success", "Medicine category deleted successfully.");
            }
        } catch (err) {
            console.error(err);
            const msg = err?.response?.data?.message || 'Error deleting';
            setError(msg);
            openNotification("error", msg);
        }
    };

    const filteredMedicines = useMemo(() => {
        const term = (searchTerm || '').toLowerCase();
        return medicines.filter((m) =>
            (m?.name || '').toLowerCase().includes(term) ||
            (m?.manufacturer || '').toLowerCase().includes(term)
        );
    }, [medicines, searchTerm]);

    const filteredCategories = useMemo(() => {
        const term = (searchTerm || '').toLowerCase();
        return categories.filter((c) => (c?.name || '').toLowerCase().includes(term));
    }, [categories, searchTerm]);

    return (
        <div className={styles.medicine}>
            {contextHolder}
            <Sidebar />
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.header}>
                        <div className={styles.headerContent}>
                            <Pill size={32} />
                            <h1 className={styles.headerTitle}>Medicine management</h1>
                        </div>
                        <p className={styles.headerSubtitle}>
                            Medicine and Medicine Category management system
                        </p>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardTabs}>
                            <div className={styles.tabs}>
                                <button
                                    onClick={() => setActiveTab('medicine')}
                                    className={`${styles.tab} ${activeTab === 'medicine' ? styles.tabActive : ''}`}
                                >
                                    <Pill size={20} />
                                    <span>Medicine</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('category')}
                                    className={`${styles.tab} ${activeTab === 'category' ? styles.tabActive : ''}`}
                                >
                                    <Layers size={20} />
                                    <span>Medicine Category</span>
                                </button>
                            </div>
                        </div>

                        <div className={styles.cardBody}>
                            <div className={styles.toolbar}>
                                <div className={styles.searchWrap}>
                                    <Search className={styles.searchIcon} size={20} />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={styles.searchInput}
                                    />
                                </div>
                                {!(role === 'Dentist' || role === 'Staff') &&
                                    <button onClick={() => openModal('add')} className={styles.primaryBtn}>
                                        <Plus size={20} />
                                        <span>{activeTab === 'medicine' ? 'Add medicine' : 'Add medicine category'}</span>
                                    </button>
                                }
                            </div>

                            {error && <div className={styles.error}>{error}</div>}
                            {loading ? (
                                <div className={styles.loading}>Loading...</div>
                            ) : activeTab === 'medicine' ? (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th className={styles.thLeft}>Medicine name</th>
                                                <th className={styles.thLeft}>Medicine category</th>
                                                <th className={styles.thLeft}>Manufacturer</th>
                                                <th className={styles.thLeft}>Price</th>
                                                <th className={styles.thLeft}>Unit</th>
                                                <th className={styles.thLeft}>Origin</th>
                                                {!(role === 'Dentist' || role === 'Staff') &&
                                                    <th className={styles.thCenter}>Action</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredMedicines.map((medicine) => (
                                                <tr key={medicine._id} className={styles.tr}>
                                                    <td className={styles.tdBold}>{medicine.name}</td>
                                                    <td className={styles.td}>
                                                        <span className={styles.categoryPill}>
                                                            {medicine?.medicineCategory?.name}
                                                        </span>
                                                    </td>
                                                    <td className={styles.td}>{medicine.manufacturer}</td>
                                                    <td className={styles.td}>{medicine.price} $</td>
                                                    <td className={styles.td}>{medicine.unit}</td>
                                                    <td className={styles.td}>{medicine.origin}</td>
                                                    {!(role === 'Dentist' || role === 'Staff') &&
                                                        <td className={styles.tdActions}>
                                                            <div className={styles.actions}>
                                                                <button
                                                                    onClick={() => openModal('edit', medicine)}
                                                                    className={`${styles.iconBtn} ${styles.iconBtnBlue}`}
                                                                    aria-label="Edit"
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                                <ConfirmDelete
                                                                    title="Confirm medicine deletion"
                                                                    description={`Are you sure you want to delete ${medicine.name} medicine? This action cannot be undone.`}
                                                                    onConfirm={() => handleDelete(medicine._id)}>
                                                                    <button
                                                                        className={`${styles.iconBtn} ${styles.iconBtnRed}`}
                                                                        aria-label="Delete"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </ConfirmDelete>
                                                            </div>
                                                        </td>
                                                    }
                                                </tr>
                                            ))}
                                            {filteredMedicines.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className={styles.empty}>There is no medicine</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className={styles.tableWrap}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th className={styles.thLeft}>Number</th>
                                                <th className={styles.thLeft}>Medicine category name</th>
                                                {!(role === 'Dentist' || role === 'Staff') &&
                                                    <th className={styles.thCenter}>Action</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCategories.map((category) => (
                                                <tr key={category._id} className={styles.tr}>
                                                    <td className={styles.td}>{categories.indexOf(category) + 1}</td>
                                                    <td className={styles.tdBold}>{category.name}</td>
                                                    {!(role === 'Dentist' || role === 'Staff') &&
                                                        <td className={styles.tdActions}>
                                                            <div className={styles.actions}>
                                                                <button
                                                                    onClick={() => openModal('edit', category)}
                                                                    className={`${styles.iconBtn} ${styles.iconBtnBlue}`}
                                                                    aria-label="Edit"
                                                                >
                                                                    <Edit2 size={18} />
                                                                </button>
                                                                <ConfirmDelete
                                                                    title="Confirm medicine category deletion"
                                                                    description={`Are you sure you want to delete ${category.name} medicine category? This action cannot be undone.`}
                                                                    onConfirm={() => handleDelete(category._id)}>
                                                                    <button
                                                                        className={`${styles.iconBtn} ${styles.iconBtnRed}`}
                                                                        aria-label="Delete"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </ConfirmDelete>
                                                            </div>
                                                        </td>
                                                    }
                                                </tr>
                                            ))}
                                            {filteredCategories.length === 0 && (
                                                <tr>
                                                    <td colSpan={2} className={styles.empty}>There is no medicine category</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {showModal && (
                    <div className={styles.modalBackdrop}>
                        <div className={styles.modal}>
                            <div className={styles.modalHeader}>
                                <h2 className={styles.modalTitle}>
                                    {modalType === 'add' ? 'Add' : 'Update'} {activeTab === 'medicine' ? 'Medicine' : 'Medicine Category'}
                                </h2>
                                <button onClick={closeModal} className={styles.closeBtn} aria-label="Close">
                                    <X size={24} />
                                </button>
                            </div>

                            {activeTab === 'medicine' ? (
                                <form className={styles.modalBody} onSubmit={handleSubmitMedicine}>
                                    <div className={styles.field}>
                                        <label className={styles.label}>
                                            Medicine name <span className={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>
                                            Medicine category <span className={styles.required}>*</span>
                                        </label>
                                        <Select
                                            value={formData.medicineCategory || undefined}
                                            onChange={(value) => setFormData({ ...formData, medicineCategory: value })}
                                            options={categories.map(c => ({ value: c._id, label: c.name }))}
                                            placeholder="Select category"
                                            className={styles.select}
                                        />
                                    </div>

                                    <div className={styles.grid2}>
                                        <div className={styles.field}>
                                            <label className={styles.label}>
                                                Unit <span className={styles.required}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.unit}
                                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                className={styles.input}
                                            />
                                        </div>

                                        <div className={styles.field}>
                                            <label className={styles.label}>
                                                Price <span className={styles.required}>*</span>
                                            </label>
                                            <input
                                                type="number"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                className={styles.input}
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>
                                            Origin <span className={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.origin}
                                            onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.field}>
                                        <label className={styles.label}>
                                            Manufacturer <span className={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.manufacturer}
                                            onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.modalActions}>
                                        <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                                            {submitting ? 'Saving...' : modalType === 'add' ? 'Add' : 'Update'}
                                        </button>
                                        <button type="button" onClick={closeModal} className={styles.secondaryBtn}>Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <form className={styles.modalBody} onSubmit={handleSubmitCategory}>
                                    <div className={styles.field}>
                                        <label className={styles.label}>
                                            Medicine category name <span className={styles.required}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={categoryForm.name}
                                            onChange={(e) => setCategoryForm({ name: e.target.value })}
                                            className={styles.input}
                                        />
                                    </div>

                                    <div className={styles.modalActions}>
                                        <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                                            {submitting ? 'Saving...' : modalType === 'add' ? 'Add' : 'Update'}
                                        </button>
                                        <button type="button" onClick={closeModal} className={styles.secondaryBtn}>Cancel</button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageMedicine;
