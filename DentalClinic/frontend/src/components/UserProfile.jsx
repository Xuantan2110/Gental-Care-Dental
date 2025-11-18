import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { User as UserIcon, Mail, Phone, MapPin, Calendar, Stethoscope, GraduationCap, Clock, Award, Briefcase, CalendarDays, X } from "lucide-react";
import styles from "./UserProfile.module.css";

function UserProfile({ isOpen, onClose, userId }) {
  const [activeTab, setActiveTab] = useState("basic");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const roleIs = (role, value) =>
    (role || "").toLowerCase() === (value || "").toLowerCase();

  const getRoleDisplayName = (role) => {
    const r = (role || "").toLowerCase();
    switch (r) {
      case "admin":
        return "Admin";
      case "staff":
        return "Staff";
      case "dentist":
        return "Dentist";
      case "customer":
        return "Customer";
      default:
        return role;
    }
  };

  const getRoleBadgeClass = (role) => {
    const r = (role || "").toLowerCase();
    switch (r) {
      case "admin":
        return "badgeAdmin";
      case "staff":
        return "badgeStaff";
      case "dentist":
        return "badgeDentist";
      case "customer":
        return "badgeCustomer";
      default:
        return "badgeDefault";
    }
  };

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString("vi-VN") : "";

  const Avatar = ({ src, name }) => {
    const initials = name
      ? name
        .split(" ")
        .map((n) => n[0] || "")
        .join("")
        .slice(0, 2)
        .toUpperCase()
      : "";
    return (
      <div className={styles.avatar}>
        {src ? (
          <img
            src={src}
            alt={name}
            className={styles.avatarImage}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        {!src && <div className={styles.avatarInitials}>{initials}</div>}
      </div>
    );
  };

  const Badge = ({ children, variant }) => (
    <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>
  );

  const InfoRow = ({ icon: Icon, label, value, fullWidth }) => (
    <div className={fullWidth ? styles.infoRowFull : styles.infoRow}>
      <div className={styles.infoLabel}>
        {Icon && <Icon className={styles.iconSmall} />}
        <span>{label}</span>
      </div>
      <div className={styles.infoValue}>{value || "Not updated yet"}</div>
    </div>
  );

  const mapDentist = (user, extraInfo, workingTime) => {
    const professionalInfo = {
      specialization: extraInfo?.specialization || "",
      experienceYears: extraInfo?.experienceYears || 0,
      biography: extraInfo?.biography || "",
      education: extraInfo?.education || "",
      awards: extraInfo?.awards || "",
    };
    return {
      ...user,
      professionalInfo,
      workingTime: workingTime || [],
    };
  };

  const fetchUser = useCallback(async () => {
    if (!isOpen || !userId) return;
    setLoading(true);
    setData(null);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `https://gental-care-dental.onrender.com/user/get-user/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const payload = res.data;
      let user = payload.user || null;
      const extraInfo = payload.extraInfo || null;
      const workingTime = payload.workingTime || null;

      if (user) {
        user = {
          ...user,
          phone: user.phoneNumber ?? user.phone ?? "",
          fullName: user.fullName ?? user.name ?? "",
        };

        if (roleIs(user.role, "dentist")) {
          user = mapDentist(user, extraInfo, workingTime);
        }
      }

      setData({ user, extraInfo });
    } catch (err) {
      console.error("Error fetching user detail:", err);
      setData({ user: null, extraInfo: null });
    } finally {
      setLoading(false);
    }
  }, [isOpen, userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setActiveTab("basic");
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (loading || !data) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading information...</p>
          </div>
        </div>
      </div>
    );
  }

  const { user } = data;
  if (!user) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.errorContainer}>
            <p>User not found</p>
          </div>
        </div>
      </div>
    );
  }

  const BasicInfo = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <UserIcon className={styles.sectionIcon} />
        <h3>Basic information</h3>
      </div>

      <div className={styles.profileHeader}>
        <Avatar src={user.avatar} name={user.fullName} />
        <div className={styles.profileInfo}>
          <h2 className={styles.profileName}>{user.fullName}</h2>
          <Badge variant={getRoleBadgeClass(user.role)}>
            {getRoleDisplayName(user.role)}
          </Badge>
        </div>
      </div>

      <div className={styles.infoGrid}>
        <InfoRow icon={Mail} label="Email" value={user.email} />
        <InfoRow icon={Phone} label="Phone number" value={user.phone} />
        <InfoRow
          icon={Calendar}
          label="Date of Birth"
          value={formatDate(user.dateOfBirth)}
        />
        <InfoRow
          icon={UserIcon}
          label="Gender"
          value={
            user.gender === "male"
              ? "Male"
              : user.gender === "female"
                ? "Female"
                : "Other"
          }
        />
      </div>

      <InfoRow
        icon={MapPin}
        label="Address"
        value={user.address}
        fullWidth
      />
    </div>
  );

  const ProfessionalInfo = () => (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <Stethoscope className={styles.sectionIcon} />
        <h3>Professional information</h3>
      </div>

      <div className={styles.infoGrid}>
        <InfoRow
          icon={Stethoscope}
          label="Specialization"
          value={user.professionalInfo?.specialization}
        />
        <InfoRow
          icon={Clock}
          label="Experience Years"
          value={
            user.professionalInfo?.experienceYears
              ? `${user.professionalInfo.experienceYears} years`
              : null
          }
        />
        <InfoRow
          icon={GraduationCap}
          label="Education"
          value={user.professionalInfo?.education}
        />
        <InfoRow
          icon={Award}
          label="Awards"
          value={user.professionalInfo?.awards}
        />
      </div>

      {user.professionalInfo?.biography && (
        <div className={styles.biographySection}>
          <div className={styles.subsectionHeader}>
            <UserIcon className={styles.iconSmall} />
            <h4>Biography</h4>
          </div>
          <div className={styles.biographyText}>
            {user.professionalInfo.biography}
          </div>
        </div>
      )}
    </div>
  );

  const WorkingSchedule = () => {
    const daysOfWeek = {
      1: "Sunday",
      2: "Monday",
      3: "Tuesday",
      4: "Wednesday",
      5: "Thursday",
      6: "Friday",
      7: "Saturday",
    };

    const workingTime = user.workingTime;

    if (!workingTime || !workingTime.workingDays?.length) {
      return (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <CalendarDays className={styles.sectionIcon} />
            <h3>Work schedule</h3>
          </div>
          <div className={styles.emptyState}>No work schedule yet</div>
        </div>
      );
    }

    const days = workingTime.workingDays.map(
      (d) => daysOfWeek[d] || `Day ${d}`
    );

    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <CalendarDays className={styles.sectionIcon} />
          <h3>Fixed work schedule</h3>
        </div>

        <div className={styles.scheduleRow}>
          <div>
            <Clock className={styles.scheduleIcon} />
            <span>Working time:</span>
          </div>
          {workingTime.morning?.startTime &&
            workingTime.morning?.endTime && (
              <div>
                <span>
                  Morning: {workingTime.morning.startTime} -{" "}
                  {workingTime.morning.endTime}
                </span>
              </div>
            )}
          {workingTime.afternoon?.startTime &&
            workingTime.afternoon?.endTime && (
              <div>
                <span>
                  Afternoon: {workingTime.afternoon.startTime} -{" "}
                  {workingTime.afternoon.endTime}
                </span>
              </div>
            )}
        </div>

        <div className={styles.scheduleRow}>
          <div>
            <CalendarDays className={styles.scheduleIcon} />
            <span>Day of the week:</span>
          </div>
          <div>
            <span>{days.join(", ")}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTabs = () => {
    if (roleIs(user.role, "dentist")) {
      return (
        <>
          <button
            className={`${styles.tab} ${activeTab === "basic" ? styles.tabActive : ""
              }`}
            onClick={() => setActiveTab("basic")}
          >
            <UserIcon className={styles.tabIcon} />
            <span>Basic information</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === "professional" ? styles.tabActive : ""
              }`}
            onClick={() => setActiveTab("professional")}
          >
            <Briefcase className={styles.tabIcon} />
            <span>Professional information</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === "schedule" ? styles.tabActive : ""
              }`}
            onClick={() => setActiveTab("schedule")}
          >
            <CalendarDays className={styles.tabIcon} />
            <span>Work schedule</span>
          </button>
        </>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (activeTab === "basic") return <BasicInfo />;
    if (activeTab === "professional") return <ProfessionalInfo />;
    if (activeTab === "schedule") return <WorkingSchedule />;
    return <BasicInfo />;
  };

  const hasMultipleTabs = roleIs(user.role, "dentist");

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <X size={24} />
        </button>

        <div className={styles.modalHeader}>
          <h2>User information</h2>
        </div>

        {hasMultipleTabs && <div className={styles.tabs}>{renderTabs()}</div>}

        <div className={styles.modalBody}>{renderContent()}</div>
      </div>
    </div>
  );
}

export default UserProfile;