import { useState } from "react"
import styles from "./ConfirmDelete.module.css";
import Warning from "../assets/warning.gif"

const ConfirmDialog = ({
  children,
  title = "Confirm action",
  description = "Are you sure of your action? This action cannot be undone.",
  onConfirm,
  itemName = "this item",
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleConfirm = () => {
    onConfirm()
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsOpen(false)
  }

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{children}</div>

      {isOpen && (
        <div className={styles.overlay} onClick={handleCancel}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.header}>
              <h3 className={styles.title}>{title}</h3>
              <button className={styles.closeButton} onClick={handleCancel}>
                ×
              </button>
            </div>

            <div className={styles.content}>
              <div className={styles.icon}>
                <img src={Warning} alt="warning-emoji"/>
              </div>
              <p className={styles.message}>
                {description.includes("this item") ? description.replace("this item", itemName) : description}
              </p>
            </div>

            <div className={styles.actions}>
              <button className={styles.cancelButton} onClick={handleCancel}>
                Cancel
              </button>
              <button className={styles.deleteButton} onClick={handleConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ConfirmDialog;
