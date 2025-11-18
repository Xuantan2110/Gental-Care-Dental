import { useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ConfirmDelete.module.css";

const ConfirmDelete = ({
  children,
  title = "Confirm deletion",
  description = "Are you sure you want to delete? This action cannot be undone.",
  onConfirm,
  itemName = "this item",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const ModalUI = (
    <div className={styles.overlay} onClick={handleCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.closeButton} onClick={handleCancel}>×</button>
        </div>

        <div className={styles.content}>
          <div className={styles.icon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
            </svg>
          </div>
          <p className={styles.message}>
            {description.includes("this item")
              ? description.replace("this item", itemName)
              : description}
          </p>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={handleCancel}>
            Cancel
          </button>
          <button className={styles.deleteButton} onClick={handleConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>

      {isOpen &&
        createPortal(ModalUI, document.body)
      }
    </>
  );
};

export default ConfirmDelete;