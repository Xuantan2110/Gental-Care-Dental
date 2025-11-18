import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import styles from "./BookAppointment.module.css";
import { TimePicker, Select } from "antd";
import dayjs from "dayjs";
import { jwtDecode } from "jwt-decode";
import { X } from "lucide-react";


const BookAppointment = ({ isOpen, onClose, openNotification, onSuccess }) => {
    const [services, setServices] = useState([]);
    const [dentists, setDentists] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedDentist, setSelectedDentist] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [date, setDate] = useState(null);
    const [freeTimes, setFreeTimes] = useState([]);
    const [startTime, setStartTime] = useState("");
    const [daysOff, setDaysOff] = useState({ weekdays: [], dates: [] });
    const [note, setNote] = useState("");
    const [serviceSearch, setServiceSearch] = useState("");
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const customerRef = useRef(null);

    const token = localStorage.getItem("token");
    let isAllowed = false;
    try {
        if (token) {
            const decoded = jwtDecode(token);
            isAllowed = decoded?.role === 'Staff' || decoded?.role === 'Admin';
        }
    } catch (e) {
        console.error('Cannot decode token:', e);
    }

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (customerRef.current && !customerRef.current.contains(e.target)) {
                setShowCustomerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen) {
            axios.get("https://gental-care-dental.onrender.com/service/booking-services", {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => setServices(res.data.services))
                .catch(err => console.error(err));

            axios.get("https://gental-care-dental.onrender.com/user/get-all-dentist", {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => setDentists(res.data.dentists))
                .catch(err => console.error(err));

            if (isOpen && isAllowed) {
                axios.get("https://gental-care-dental.onrender.com/user/get-all-customer", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                    .then(res => setCustomers(res.data.customers))
                    .catch(err => console.error(err));
            } else {
                setCustomers([]);
                setSelectedCustomer("");
            }
        }
    }, [isOpen, token, isAllowed]);

    useEffect(() => {
        if (selectedDentist && date) {
            axios.post(
                `https://gental-care-dental.onrender.com/dentistWorkingTime/get-dentist-free-time-ranges/${selectedDentist}`,
                { date: dayjs(date).format("YYYY-MM-DD") },
                { headers: { Authorization: `Bearer ${token}` } }
            )
                .then(res => setFreeTimes(res.data.freeTime))
                .catch(err => console.error(err));
        }
    }, [selectedDentist, date, token]);

    useEffect(() => {
        if (selectedDentist) {
            axios.get(
                `https://gental-care-dental.onrender.com/dentistWorkingTime/get-dentist-days-off/${selectedDentist}`,
                { headers: { Authorization: `Bearer ${token}` } }
            )
                .then(res => {
                    const weekdays = [];
                    const dates = [];
                    res.data.daysOff.forEach(d => {
                        if (typeof d.dayOfWeek === "number") weekdays.push(d.dayOfWeek);
                        if (d.date) dates.push(dayjs(d.date).format("YYYY-MM-DD"));
                    });
                    setDaysOff({ weekdays, dates });
                })
                .catch(err => console.error(err));
        }
    }, [selectedDentist, token]);

    const isWorkingDay = (d) => {
        const weekday = d.getDay() + 1;
        const ymd = dayjs(d).format("YYYY-MM-DD");
        const offByWeekday = daysOff.weekdays.includes(weekday);
        const offByDate = daysOff.dates.includes(ymd);
        return !(offByWeekday || offByDate);
    };

    const handleServiceToggle = (serviceId) => {
        setSelectedServices(prev =>
            prev.includes(serviceId)
                ? prev.filter(s => s !== serviceId)
                : [...prev, serviceId]
        );
    };

    const filteredServices = services.filter(s =>
        (s.name || '').toLowerCase().includes((serviceSearch || '').toLowerCase())
    );

    const filteredCustomers = customers.filter(c =>
        (c.fullName || '').toLowerCase().includes((customerSearch || '').toLowerCase())
    );

    const getTotalDuration = () => {
        return selectedServices.reduce((total, serviceId) => {
            const service = services.find(s => s._id === serviceId);
            return total + (service ? service.duration : 0);
        }, 0);
    };

    const calculateEndTime = () => {
        if (!startTime) return "";
        const [hours, minutes] = startTime.split(":").map(Number);
        const totalMinutes = getTotalDuration();
        const endDate = new Date();
        endDate.setHours(hours, minutes + totalMinutes);
        const endHours = endDate.getHours().toString().padStart(2, "0");
        const endMinutes = endDate.getMinutes().toString().padStart(2, "0");
        return `${endHours}:${endMinutes}`;
    };

    const handleSelectCustomer = (customer) => {
        setSelectedCustomer(customer._id);
        setCustomerSearch(customer.fullName);
        setShowCustomerDropdown(false);
    };

    const handleClearCustomer = () => {
        setSelectedCustomer("");
        setCustomerSearch("");
        setShowCustomerDropdown(false);
    };

    const handleSubmit = async () => {
        try {
            const payload = {
                dentistId: selectedDentist,
                services: selectedServices,
                startTime,
                date: dayjs(date).format("YYYY-MM-DD"),
                note
            };

            if (isAllowed) {
                await axios.post(
                    "https://gental-care-dental.onrender.com/appointment/staff-create-appointment",
                    { ...payload, customerId: selectedCustomer },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                openNotification("success", "Create appointments for customers successfully!");
            } else {
                await axios.post(
                    "https://gental-care-dental.onrender.com/appointment/create-appointment",
                    payload,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                openNotification("success", "Booking successful! Please check your email once your appointment is confirmed.");
            }
            setSelectedServices([]);
            setSelectedDentist("");
            setSelectedCustomer("");
            setDate(null);
            setFreeTimes([]);
            setStartTime("");
            setNote("");
            setServiceSearch("");
            onSuccess && onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            openNotification("error", "Failed to book appointment: " + (err.response?.data?.message || "An error occurred."));
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>
                        <svg className={styles.titleIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Book an Appointment
                    </h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {isAllowed && (
                        <div className={styles.formSection}>
                            <div className={styles.sectionHeader}>
                                <svg className={styles.sectionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <h3>Select customers</h3>
                            </div>

                            {/* Autocomplete Customer Search */}
                            <div className={styles.autocomplete} ref={customerRef}>
                                <div className={styles.searchContainer}>
                                    <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="11" cy="11" r="8"></circle>
                                        <path d="m21 21-4.35-4.35"></path>
                                    </svg>
                                    <input
                                        type="text"
                                        className={styles.searchInput}
                                        placeholder="Find customers..."
                                        value={customerSearch}
                                        onChange={(e) => {
                                            setCustomerSearch(e.target.value);
                                            setShowCustomerDropdown(true);
                                        }}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                    />
                                    {customerSearch && (
                                        <button className={styles.clearBtn} onClick={handleClearCustomer}>
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {showCustomerDropdown && customerSearch && (
                                    <div className={styles.dropdown}>
                                        {filteredCustomers.length > 0 ? (
                                            filteredCustomers.map((customer) => (
                                                <div
                                                    key={customer._id}
                                                    className={styles.dropdownItem}
                                                    onClick={() => handleSelectCustomer(customer)}
                                                >
                                                    <div className={styles.dropdownName}>{customer.fullName}</div>
                                                    {customer.email && (
                                                        <div className={styles.dropdownEmail}>{customer.email}</div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className={styles.dropdownNoResults}>No customers found</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Services Section with Search */}
                    <div className={styles.formSection}>
                        <div className={styles.sectionHeader}>
                            <svg className={styles.sectionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                            </svg>
                            <h3>Select Service</h3>
                        </div>

                        {/* Search Input */}
                        <div className={styles.searchContainer}>
                            <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Search for services..."
                                value={serviceSearch}
                                onChange={(e) => setServiceSearch(e.target.value)}
                            />
                        </div>

                        {/* Services List */}
                        <div className={styles.servicesList}>
                            {filteredServices.length === 0 ? (
                                <div className={styles.noResults}>No service found</div>
                            ) : (
                                filteredServices.map(s => (
                                    <label key={s._id} className={styles.serviceItem}>
                                        <input
                                            type="checkbox"
                                            checked={selectedServices.includes(s._id)}
                                            onChange={() => handleServiceToggle(s._id)}
                                            className={styles.serviceCheckbox}
                                        />
                                        <div className={styles.serviceContent}>
                                            <span className={styles.serviceName}>{s.name}</span>
                                            <span className={styles.serviceDuration}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polyline points="12 6 12 12 16 14"></polyline>
                                                </svg>
                                                {s.duration} minute
                                            </span>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>

                        {selectedServices.length > 0 && (
                            <div className={styles.selectedServicesInfo}>
                                <span className={styles.infoLabel}>Selected: {selectedServices.length} service</span>
                                <span className={styles.infoLabel}>Total time: {getTotalDuration()} minute</span>
                            </div>
                        )}
                    </div>

                    {/* Dentist Section */}
                    <div className={styles.formSection}>
                        <div className={styles.sectionHeader}>
                            <svg className={styles.sectionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <h3>Choose a Dentist</h3>
                        </div>
                        <Select
                            className={styles.selectInput}
                            value={selectedDentist}
                            onChange={(value) => setSelectedDentist(value)}
                            options={[
                                { value: "", label: "-- Choose a Dentist --" },
                                ...dentists.map(d => ({
                                    value: d._id,
                                    label: d.fullName,
                                }))
                            ]}
                        />
                    </div>

                    {/* Date Section */}
                    <div className={styles.formSection}>
                        <div className={styles.sectionHeader}>
                            <svg className={styles.sectionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <h3>Select Date</h3>
                        </div>
                        <DatePicker
                            selected={date}
                            onChange={(d) => setDate(d)}
                            filterDate={isWorkingDay}
                            placeholderText="Select working day"
                            dateFormat="dd/MM/yyyy"
                            className={styles.dateInput}
                            minDate={new Date()}
                        />
                    </div>

                    {/* Free Time Ranges Display */}
                    {date && selectedDentist && freeTimes.length > 0 && (
                        <div className={styles.formSection}>
                            <div className={styles.sectionHeader}>
                                <svg className={styles.sectionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <h3>Dentist's Free Time</h3>
                            </div>
                            <div className={styles.freeTimeRanges}>
                                {freeTimes.map((range, idx) => (
                                    <div key={idx} className={styles.freeTimeRange}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polyline points="9 11 12 14 22 4"></polyline>
                                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                        </svg>
                                        {range.start} - {range.end}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Time Selection - Start and End on same line */}
                    {date && selectedDentist && (
                        <div className={styles.formSection}>
                            <div className={styles.sectionHeader}>
                                <svg className={styles.sectionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <h3>Examination Time</h3>
                            </div>
                            <div className={styles.timeRow}>
                                <div className={styles.timeGroup}>
                                    <label className={styles.timeLabel}>Start Time</label>
                                    <TimePicker
                                        className={styles.timeInput}
                                        minuteStep={5}
                                        format="HH:mm"
                                        value={startTime ? dayjs(startTime, "HH:mm") : null}
                                        onChange={(time) => setStartTime(time ? time.format("HH:mm") : "")}
                                        disabledHours={() => {
                                            const allowedHours = Array.from({ length: 16 }, (_, i) => i + 6);
                                            return Array.from({ length: 24 }, (_, i) => i).filter(
                                                (h) => !allowedHours.includes(h)
                                            );
                                        }}
                                    />
                                </div>
                                {startTime && selectedServices.length > 0 && (
                                    <>
                                        <div className={styles.timeArrow}>
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                                <polyline points="12 5 19 12 12 19"></polyline>
                                            </svg>
                                        </div>
                                        <div className={styles.timeGroup}>
                                            <label className={styles.timeLabel}>End Time</label>
                                            <div className={styles.endTimeBox}>
                                                <span className={styles.endTimeText}>{calculateEndTime()}</span>
                                                <span className={styles.durationBadge}>{getTotalDuration()} minute</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Note Section */}
                    <div className={styles.formSection}>
                        <div className={styles.sectionHeader}>
                            <svg className={styles.sectionIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            <h3>Note</h3>
                        </div>
                        <textarea
                            className={styles.noteTextarea}
                            placeholder="Enter your notes (if any)..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows="4"
                        />
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <button className={styles.btnSecondary} onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className={styles.btnPrimary}
                        onClick={handleSubmit}
                        disabled={
                            !selectedServices.length ||
                            !selectedDentist ||
                            !date ||
                            !startTime ||
                            (isAllowed && !selectedCustomer)
                        }
                    >
                        Confirm Appointment
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookAppointment;
