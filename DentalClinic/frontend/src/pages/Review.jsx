import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Star, Search, Edit2, Trash2, Mailbox } from 'lucide-react';
import styles from './Review.module.css';
import Sidebar from '../components/Sidebar';
import axios from "axios";
import { notification, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import ConfirmDelete from "../components/ConfirmDelete";
import ReviewModal from '../components/ReviewModal';

const Review = () => {
    const [reviews, setReviews] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRating, setFilterRating] = useState('All');
    const [api, contextHolder] = notification.useNotification();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [mode, setMode] = useState('');

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

    const fetchReviews = useCallback(async () => {
        try {
            const response = await axios.get('https://gental-care-dental.onrender.com/review/get-all-reviews', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            setReviews(response.data.reviews);
        } catch (error) {
            console.error("Error fetching reviews:", error);
        }
    }, []);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const ratingStats = useMemo(() => {
        const stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        reviews.forEach(review => {
            stats[review.rating]++;
        });
        return stats;
    }, [reviews]);

    const totalReviews = reviews.length;

    const filteredReviews = useMemo(() => {
        return reviews.filter(review => {
            const matchesSearch =
                review.customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                review.comment.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesRating = filterRating === 'All' || review.rating === parseInt(filterRating);

            return matchesSearch && matchesRating;
        });
    }, [searchTerm, filterRating, reviews]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const renderStars = (rating) => {
        return (
            <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        size={16}
                        className={star <= rating ? styles.starFilled : styles.starEmpty}
                    />
                ))}
            </div>
        );
    };

    const handleEdit = (review) => {
        setIsModalOpen(true);
        setSelectedReview(review);
        setMode('update');
    };

    const handleDelete = (id) => {
        axios.delete(`https://gental-care-dental.onrender.com/review/delete-review/${id}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
        })
            .then(() => {
                openNotification("success", "Review deleted successfully.");
                setReviews(reviews.filter(review => review._id !== id));
            })
            .catch(() => {
                openNotification("error", "Failed to delete review.");
            });
    };

    return (
        <div className={styles.review}>
            {contextHolder}
            <Sidebar />
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.headerContent}>
                        <Mailbox size={32} />
                        <h1 className={styles.headerTitle}>Review Management</h1>
                    </div>
                    <p className={styles.headerSubtitle}>Manage customer reviews</p>
                </div>

                {/* Rating Statistics */}
                <div className={styles.statsGrid}>
                    {/* Total */}
                    <div className={styles.statCard}>
                        <div className={styles.statContent}>
                            <div className={`${styles.statIcon} ${styles.iconCyan}`}>
                                <Mailbox size={24} />
                            </div>
                            <div>
                                <h3 className={styles.statNumber}>{totalReviews}</h3>
                            </div>
                        </div>
                        <p className={styles.statLabel}>Total</p>
                        <p className={styles.statPercentage}>100% of total</p>
                    </div>

                    {/* 1 Star */}
                    <div className={styles.statCard}>
                        <div className={styles.statContent}>
                            <div className={`${styles.statIcon} ${styles.iconRed}`}>
                                <Star size={20} className={styles.starRed} />
                            </div>
                            <div>
                                <h3 className={styles.statNumber}>{ratingStats[1]}</h3>
                            </div>
                        </div>
                        <p className={styles.statLabel}>1 Star</p>
                        <p className={styles.statPercentage}>{((ratingStats[1] / totalReviews) * 100).toFixed(1)}% of total</p>
                    </div>

                    {/* 2 Stars */}
                    <div className={styles.statCard}>
                        <div className={styles.statContent}>
                            <div className={`${styles.statIcon} ${styles.iconOrange}`}>
                                <div className={styles.stars}>
                                    <Star size={16} className={styles.starOrange} />
                                    <Star size={16} className={styles.starOrange} />
                                </div>
                            </div>
                            <div>
                                <h3 className={styles.statNumber}>{ratingStats[2]}</h3>
                            </div>
                        </div>
                        <p className={styles.statLabel}>2 Stars</p>
                        <p className={styles.statPercentage}>{((ratingStats[2] / totalReviews) * 100).toFixed(1)}% of total</p>
                    </div>

                    {/* 3 Stars */}
                    <div className={styles.statCard}>
                        <div className={styles.statContent}>
                            <div className={`${styles.statIcon} ${styles.iconYellow}`}>
                                <div className={styles.stars}>
                                    <Star size={14} className={styles.starYellow} />
                                    <Star size={14} className={styles.starYellow} />
                                    <Star size={14} className={styles.starYellow} />
                                </div>
                            </div>
                            <div>
                                <h3 className={styles.statNumber}>{ratingStats[3]}</h3>
                            </div>
                        </div>
                        <p className={styles.statLabel}>3 Stars</p>
                        <p className={styles.statPercentage}>{((ratingStats[3] / totalReviews) * 100).toFixed(1)}% of total</p>
                    </div>

                    {/* 4 Stars */}
                    <div className={styles.statCard}>
                        <div className={styles.statContent}>
                            <div className={`${styles.statIcon} ${styles.iconLime}`}>
                                <div className={styles.stars}>
                                    <Star size={12} className={styles.starLime} />
                                    <Star size={12} className={styles.starLime} />
                                    <Star size={12} className={styles.starLime} />
                                    <Star size={12} className={styles.starLime} />
                                </div>
                            </div>
                            <div>
                                <h3 className={styles.statNumber}>{ratingStats[4]}</h3>
                            </div>
                        </div>
                        <p className={styles.statLabel}>4 Stars</p>
                        <p className={styles.statPercentage}>{((ratingStats[4] / totalReviews) * 100).toFixed(1)}% of total</p>
                    </div>

                    {/* 5 Stars */}
                    <div className={styles.statCard}>
                        <div className={styles.statContent}>
                            <div className={`${styles.statIcon} ${styles.iconGreen}`}>
                                <div className={styles.stars}>
                                    <Star size={11} className={styles.starGreen} />
                                    <Star size={11} className={styles.starGreen} />
                                    <Star size={11} className={styles.starGreen} />
                                    <Star size={11} className={styles.starGreen} />
                                    <Star size={11} className={styles.starGreen} />
                                </div>
                            </div>
                            <div>
                                <h3 className={styles.statNumber}>{ratingStats[5]}</h3>
                            </div>
                        </div>
                        <p className={styles.statLabel}>5 Stars</p>
                        <p className={styles.statPercentage}>{((ratingStats[5] / totalReviews) * 100).toFixed(1)}% of total</p>
                    </div>
                </div>

                {/* Reviews List */}
                <div className={styles.tableContainer}>
                    <div className={styles.tableHeader}>
                        <h2 className={styles.tableTitle}>List of reviews</h2>
                        <p className={styles.tableSubtitle}>Manage and track customer reviews</p>

                        {/* Search and Filter */}
                        <div className={styles.filterRow}>
                            <div className={styles.searchWrapper}>
                                <Search className={styles.searchIcon} size={20} />
                                <input
                                    type="text"
                                    placeholder="Search for reviews..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={styles.searchInput}
                                />
                            </div>
                            <Select
                                value={filterRating}
                                onChange={(value) => setFilterRating(value)}
                                className={styles.filterSelect}
                            >
                                <Select.Option value="All">All</Select.Option>
                                <Select.Option value="5">5 Stars</Select.Option>
                                <Select.Option value="4">4 Stars</Select.Option>
                                <Select.Option value="3">3 Stars</Select.Option>
                                <Select.Option value="2">2 Stars</Select.Option>
                                <Select.Option value="1">1 Star</Select.Option>
                            </Select>
                        </div>
                    </div>

                    <ReviewModal
                        isOpen={isModalOpen}
                        mode={mode}
                        review={selectedReview}
                        onClose={() => setIsModalOpen(false)}
                        onSuccess={() => fetchReviews()}
                        openNotification={openNotification}
                    />

                    {/* Table */}
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>NAME</th>
                                    <th>RATING</th>
                                    <th>COMMENT</th>
                                    <th>DATE</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReviews.map((review) => (
                                    <tr key={review._id}>
                                        <td>
                                            <div className={styles.customerInfo}>
                                                <img
                                                    src={review.customer.avatar}
                                                    alt={review.customer.fullName}
                                                    className={styles.avatar}
                                                />
                                                <div>
                                                    <p className={styles.customerName}>{review.customer.fullName}</p>
                                                    <p className={styles.customerEmail}>{review.customer.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {renderStars(review.rating)}
                                        </td>
                                        <td>
                                            <p className={styles.comment}>{review.comment}</p>
                                        </td>
                                        <td>
                                            <p className={styles.date}>{formatDate(review.date)}</p>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    onClick={() => handleEdit(review)}
                                                    className={`${styles.actionBtn} ${styles.editBtn}`}
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <ConfirmDelete
                                                    title="Confirm review deletion"
                                                    description={`Are you sure you want to delete this review? This action cannot be undone.`}
                                                    onConfirm={() => handleDelete(review._id)}>
                                                    <button
                                                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </ConfirmDelete>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredReviews.length === 0 && (
                            <div className={styles.noData}>
                                <Mailbox size={48} />
                                <p>No reviews found</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Review;
