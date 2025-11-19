import styles from "./NotFound.module.css";
import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconContainer}>
          <img width="120" height="120" src="https://img.icons8.com/plasticine/100/tooth.png" alt="tooth"/>
        </div>

        <div className={styles.errorSection}>
          <h1 className={styles.errorCode}>404</h1>
          <h2 className={styles.errorTitle}>Page not found</h2>
          <p className={styles.errorDescription}>
            Sorry, the page you are looking for does not exist or has been moved. Please check the link again or return to the home page.
          </p>
        </div>

        <div className={styles.actions}>
          <a 
            href="/home" 
            className={styles.primaryButton}
            onClick={(e) => {
              e.preventDefault();
              navigate("/home");
            }}
          >
            Back to home page
          </a>
          <a 
            href="/contact" 
            className={styles.secondaryButton}
            onClick={(e) => {
              e.preventDefault();
              navigate("/contact");
            }}
          >
            Contact support
          </a>
        </div>

        <div className={styles.decorativeElements}>
          <div className={styles.bubble}></div>
          <div className={styles.bubble}></div>
          <div className={styles.bubble}></div>
        </div>
      </div>
    </div>
  )
}

export default NotFound;