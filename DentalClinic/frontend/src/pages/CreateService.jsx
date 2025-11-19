import { useState } from "react"
import styles from "./CreateService.module.css"
import axios from "axios"
import { Select, Switch } from "antd";

function CreateService({ isOpen, onClose, onSuccess, openNotification }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration: 0,
    price: 0,
    type: "",
    guarantee: "",
    isBookingService: false,
  })

  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const token = localStorage.getItem('token');
      await axios.post("https://gental-care-dental.onrender.com/service/create-service", formData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
      openNotification("success", "Service created successfully.");
      if (onSuccess) onSuccess();
      setFormData({
        name: "",
        description: "",
        duration: 0,
        price: 0,
        type: "",
        guarantee: "",
        isBookingService: false,
      })
      onClose();
    } catch (error) {
      console.error("Failed to create service:", error)
      if (error.response && error.response.data) {
        if (error.response.data.errors && error.response.data.errors.length > 0) {
          const backendErrors = {};
          error.response.data.errors.forEach(err => {
            backendErrors[err.path] = err.msg;
          });
          setFieldErrors(backendErrors);
          openNotification("error", error.response.data.errors[0].msg);
        } else if (error.response.data.message) {
          openNotification("error", error.response.data.message);
        } else {
          openNotification("error", "Failed to create service!");
        }
      } else {
        openNotification("error", "Failed to create service!");
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.backdrop} onClick={onClose} />

      <div className={styles.modal}>
        <div className={styles.mainContent}>
          <div className={styles.header}>
            <h2 className={styles.title}>Create New Service</h2>
            <button onClick={onClose} className={styles.closeButton}>
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="name" className={styles.label}>
                Service Name <span className={styles.star}>*</span>
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Enter service name"
                className={`${styles.input} ${fieldErrors.name ? styles.inputError : ""}`}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description" className={styles.label}>
                Description <span className={styles.star}>*</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Describe your service in detail"
                rows={4}
                className={`${styles.textarea} ${fieldErrors.description ? styles.inputError : ""}`}
              />
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.formGroup}>
                <label htmlFor="duration" className={styles.label}>
                  Time (minutes) <span className={styles.star}>*</span>
                </label>
                <input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration || ""}
                  onChange={(e) => handleInputChange("duration", Number.parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={`${styles.input} ${fieldErrors.duration ? styles.inputError : ""}`}
                />
              </div>

              <div className={styles.formGroup}>
              <label htmlFor="price" className={styles.label}>
                  Price (USD) <span className={styles.star}>*</span>
                </label>
                <input
                  id="price"
                  type="number"
                  min="0"
                  step="any"
                  value={formData.price || ""}
                  onChange={(e) => handleInputChange("price", Number.parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className={`${styles.input} ${fieldErrors.price ? styles.inputError : ""}`}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="type" className={styles.label}>
                Type service <span className={styles.star}>*</span>
              </label>
              <Select
                id="type"
                value={formData.type}
                onChange={(value) => handleInputChange("type", value)}
                className={`${styles.select} ${fieldErrors.type ? styles.inputError : ""}`}
                options={[
                  { value: "", label: "Select service type" },
                  { value: "Check-up", label: "Check-up" },
                  { value: "Treatment", label: "Treatment" },
                  { value: "Aesthetics", label: "Aesthetics" },
                  { value: "Surgery", label: "Surgery" },
                  { value: "Orthodontics", label: "Orthodontics" },
                ]}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="guarantee" className={styles.label}>
                Guarantee <span className={styles.star}>*</span>
              </label>
              <input
                id="guarantee"
                type="text"
                value={formData.guarantee}
                onChange={(e) => handleInputChange("guarantee", e.target.value)}
                placeholder="VD: One year"
                className={`${styles.input} ${fieldErrors.guarantee ? styles.inputError : ""}`}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="isBookingService" className={styles.label}>
                Booking Service
              </label>
              <div className={styles.switchContainer}>
                <Switch
                  id="isBookingService"
                  checked={formData.isBookingService}
                  onChange={(checked) => handleInputChange("isBookingService", checked)}
                />
                <span className={styles.switchLabel}>
                  {formData.isBookingService ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" onClick={onClose} className={styles.cancelBtn}>
                Cancel
              </button>
              <button type="submit" className={`${styles.submitBtn} ${loading ? styles.loading : ""}`}>
                {loading ? (
                  <span className={styles.spinner}></span>
                ) : (
                  "Create Service"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateService;
