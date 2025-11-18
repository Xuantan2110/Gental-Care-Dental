import React, { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import styles from "./ReviewModal.module.css";
import axios from "axios";

const ReviewModal = ({ isOpen, onClose, onSuccess, mode, review, openNotification }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === "update" && review) {
      setRating(review.rating || 0);
      setComment(review.comment || "");
    } else {
      setRating(0);
      setComment("");
    }
    setHoveredRating(0);
    setIsSubmitted(false);
  }, [isOpen, mode, review]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const payload = { rating, comment };

      let res;
      if (mode === "create") {
        res = await axios.post(
          "https://gental-care-dental.onrender.com/review/create-review",
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (mode === "update" && review?._id) {
        res = await axios.put(
          `https://gental-care-dental.onrender.com/review/update-review/${review._id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      const createdOrUpdatedReview = res?.data?.review;
      if (mode === 'create') {
        onSuccess?.(createdOrUpdatedReview);   
      } else {
        onSuccess?.();                      
      }
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting review:", error);
      openNotification?.(
        "error",
        error.response?.data?.message || "Failed to submit review."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
    setRating(0);
    setHoveredRating(0);
    setComment("");
    setIsSubmitted(false);
  };

  if (!isOpen) return null;

  const title = mode === "update" ? "Edit review" : "Your review";
  const subtitle =
    mode === "update"
      ? "Update your previous review"
      : "Share your experience with us";
  const submitLabel = mode === "update" ? "Save changes" : "Submit a review";
  const successTitle = mode === "update" ? "Review updated!" : "Thank you!";
  const successSubtitle =
    mode === "update"
      ? "Your review has been updated successfully."
      : "Your review has been submitted successfully.";

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {!isSubmitted ? (
          <>
            <button
              className={styles.closeButton}
              onClick={handleClose}
              disabled={submitting}
            >
              <X size={24} color="#666" />
            </button>

            <h2 className={styles.title}>{title}</h2>
            <p className={styles.subtitle}>{subtitle}</p>

            <div className={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={40}
                  className={`${styles.star} ${star <= (hoveredRating || rating)
                      ? styles.starFilled
                      : styles.starEmpty
                    }`}
                  onClick={() => !submitting && setRating(star)}
                  onMouseEnter={() => !submitting && setHoveredRating(star)}
                  onMouseLeave={() => !submitting && setHoveredRating(0)}
                />
              ))}
            </div>

            <label className={styles.textareaLabel}>
              Your comment (not required)
            </label>
            <textarea
              className={styles.textarea}
              placeholder="Share more about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
            />

            <div className={styles.buttonContainer}>
              <button
                className={`${styles.button} ${styles.cancelButton}`}
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className={`${styles.button} ${styles.submitButton}`}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Sending..." : submitLabel}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.successTitle}>{successTitle}</h3>
            <p className={styles.successSubtitle}>
              {successSubtitle}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewModal;