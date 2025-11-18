import { useState, useEffect, useRef } from "react"
import styles from "./ManageService.module.css"
import Sidebar from "../components/Sidebar"
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { notification, Select } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import ConfirmDelete from "../components/ConfirmDelete"
import CreateService from "./CreateService"
import UpdateService from "./UpdateService"

function ManageService() {
  const [services, setServices] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [filterType, setFilterType] = useState("");
  const dropdownRef = useRef(null);
  const [api, contextHolder] = notification.useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalUpdateOpen, setIsModalUpdateOpen] = useState(false)
  const [selectedService, setSelectedService] = useState(null);
  const [role, setRole] = useState(null);

  const token = localStorage.getItem('token');
  useEffect(() => {
    if (!token) return;
    const decoded = jwtDecode(token);
    setRole(decoded.role);
  }, [token]);

  const handleEdit = (service) => {
    setSelectedService(service)
    setIsModalUpdateOpen(true)
    console.log("Editing service:", service)
  }

  const activeServices = services.filter((service) => service.status === "active").length
  const totalRevenue = services
    .filter((service) => service.status === "active")
    .reduce((sum, service) => sum + Number.parseInt(service.price.replace(/,/g, "")), 0)

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType ? service.type === filterType : true;
    return matchesSearch && matchesType;
  })

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

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get("http://localhost:5000/service/all-services",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        }
      )
      setServices(res.data.services)
    } catch (err) {
      console.error("Error fetching services:", err)
    }
  }

  const handleDelete = async (serviceId) => {
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`http://localhost:5000/service/delete-service/${serviceId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setServices(services.filter(service => service._id !== serviceId));
      openNotification("success", "Service deleted successfully.");
    } catch (error) {
      console.error("Error deleting service:", error);
      if (error.response && error.response.data) {
        if (error.response.data.errors && error.response.data.errors.length > 0) {
          openNotification("error", error.response.data.errors[0].msg);
        } else if (error.response.data.message) {
          openNotification("error", error.response.data.message);
        } else {
          openNotification("error", "Failed to delete service!");
        }
      } else {
        openNotification("error", "Failed to delete service!");
      }
    }
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(Number(amount) || 0);

  useEffect(() => {
    if (!activeDropdown) return;
    const handleClick = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [activeDropdown]);

  return (
    <div className={styles.manageService}>
      {contextHolder}
      <Sidebar />
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Service Management</h1>
            <p className={styles.subtitle}>Manage dental services and pricing</p>
          </div>
          {!(role === 'Dentist' || role === 'Staff') &&
            <button onClick={() => setIsModalOpen(true)} className={styles.addButton}>+ Add service</button>}
          <CreateService isOpen={isModalOpen} onSuccess={() => { fetchServices() }} onClose={() => setIsModalOpen(false)} openNotification={openNotification} />
        </div>

        {/* Stats Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <div className={styles.statNumber}>{services.length}</div>
              <div className={styles.statLabel}>Tổng dịch vụ</div>
              <div className={styles.statChange}>+1 từ tháng trước</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.activeIcon}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div>
              <div className={styles.statNumber}>{activeServices}</div>
              <div className={styles.statLabel}>Đang hoạt động</div>
              <div className={styles.statChange}>80% tổng số</div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.revenueIcon}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <div className={styles.statNumber}>{(totalRevenue / 1000000).toFixed(1)}M</div>
              <div className={styles.statLabel}>Tổng giá trị</div>
              <div className={styles.statChange}>USD</div>
            </div>
          </div>
        </div>

        {/* Service Table Section */}
        <div className={styles.tableSection}>
          <div className={styles.tableSectionHeader}>
            <div>
              <h2 className={styles.tableSectionTitle}>List of services</h2>
              <p className={styles.tableSectionSubtitle}>Manage and track dental service information</p>
            </div>
            <div className={styles.tableControls}>
              <div className={styles.searchContainer}>
                <svg
                  className={styles.searchIcon}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search for services..."
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className={styles.filterContainer}>
                <Select
                  style={{ width: 120 }}
                  value={filterType}
                  onChange={(value) => setFilterType(value)}
                  className={styles.filterSelect}
                  options={[
                    { value: "", label: "All" },
                    ...Array.from(new Set(services.map((service) => service.type))).map(type => ({
                      value: type,
                      label: type,
                    }))
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Guarantee</th>
                  <th style={{ textAlign: "center" }}>Booking Service</th>
                  {!(role === 'Dentist' || role === 'Staff') && <th>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => (
                  <tr key={service._id}>
                    <td>
                      <div className={styles.serviceInfo}>
                        <div className={styles.serviceName}>{service.name}</div>
                        <div className={styles.serviceDescription}>{service.description}</div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.categoryInfo}>
                        <span className={styles.categoryName}>{service.type}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.priceInfo}>
                        <span className={styles.price}>{formatCurrency(service.price)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={styles.duration}>{service.duration} minutes</span>
                    </td>
                    <td className={styles.guarantee}>{service.guarantee}</td>
                    <td>
                      <div className={styles.bookingServiceStatus}>
                        {service.isBookingService ? (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        ) : (
                          <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#94a3b8"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </div>
                    </td>
                    {!(role === 'Dentist' || role === 'Staff') && (
                      <td>
                        <div className={styles.actionContainer} ref={activeDropdown === service._id ? dropdownRef : null}>
                          <button
                            className={styles.actionButton}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === service._id ? null : service._id);
                            }}
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <circle cx="12" cy="12" r="1" />
                              <circle cx="12" cy="5" r="1" />
                              <circle cx="12" cy="19" r="1" />
                            </svg>
                          </button>
                          {activeDropdown === service._id && (
                            <div className={styles.dropdown}>
                              <button onClick={() => handleEdit(service)} className={styles.dropdownItem}>
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                Edit
                              </button>
                              <UpdateService service={selectedService} isOpenUpdate={isModalUpdateOpen} onSuccess={() => { fetchServices(); setSelectedService(null) }} onClose={() => { setIsModalUpdateOpen(false); setSelectedService(null) }} openNotification={openNotification} />
                              <ConfirmDelete
                                title="Confirm service deletion"
                                description={`Are you sure you want to delete the service "${service.name}"? This action cannot be undone.`}
                                itemName={service.name}
                                onConfirm={() => handleDelete(service._id)}>
                                <button
                                  className={`${styles.dropdownItem} ${styles.deleteItem}`}
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <polyline points="3,6 5,6 21,6" />
                                    <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6" />
                                  </svg>
                                  Delete
                                </button>
                              </ConfirmDelete>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManageService;
