import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { X, User, FileText, Smile, Pill, Check } from 'lucide-react';
import styles from './MedicalRecordDetail.module.css';
import ConfirmDialog from "../components/ConfirmDialog";
import ConfirmDelete from "../components/ConfirmDelete";
import axios from 'axios';
import { jwtDecode } from "jwt-decode";

const normalizeAmount = (value) => {
  if (value == null) return null;
  if (typeof value === 'object' && value.$numberDecimal != null) {
    return Number(value.$numberDecimal);
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const formatCurrency = (amount) => {
  const normalized = normalizeAmount(amount);
  if (normalized == null) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(normalized);
};

const DENTAL_CHART = {
  upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
};

const InlineSelect = memo(function InlineSelect({
  title = "Select Item",
  items = [],
  filteredItems = [],
  selectedItem,
  setSelectedItem,
  search,
  setSearch,
  onCancel,
  onConfirm,
  creating,
  rightMetaRender,
  extraFields
}) {
  return (
    <div className={styles.panelContainer} style={{ marginTop: 12 }}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>{title}</h2>
        <button className={styles.closeBtnPanel} onClick={onCancel} aria-label="Close">
          <X size={24} />
        </button>
      </div>

      <div className={styles.panelBody}>
        <div className={styles.panelFormSection}>
          {/* Search */}
          <div className={styles.panelSearchContainer}>
            <svg className={styles.panelSearchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className={styles.panelSearchInput}
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && selectedItem) onConfirm();
              }}
            />
            {search && (
              <button className={styles.panelClearBtn} onClick={() => setSearch('')} type="button" aria-label="Clear search">
                <X size={16} />
              </button>
            )}
          </div>

          {/* List */}
          <div className={styles.panellist}>
            {filteredItems.length > 0 ? (
              filteredItems.map((it) => {
                const active = selectedItem?._id === it._id;
                return (
                  <div
                    key={it._id}
                    className={`${styles.panelItem} ${active ? styles.panelItemSelected : ''}`}
                    onMouseDown={(e) => e.preventDefault()} // giữ focus trong ô search khi click item
                    onClick={() => setSelectedItem(active ? null : it)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.panelInfo}>
                      <div className={styles.panelName}>{it.name}</div>
                      {rightMetaRender ? (
                        <div className={styles.panelEmail}>{rightMetaRender(it)}</div>
                      ) : null}
                    </div>
                    {active && <Check size={20} className={styles.checkIcon} aria-label="Selected" />}
                  </div>
                );
              })
            ) : (
              <div className={styles.noResults}>{search ? 'No items found' : 'No items available'}</div>
            )}
          </div>

          {/* Extra fields (optional) */}
          {extraFields}
        </div>
      </div>

      <div className={styles.panelActions}>
        <button className={styles.panelBtnSecondary} onClick={onCancel} type="button">Cancel</button>
        <button
          className={styles.panelBtnPrimary}
          onClick={onConfirm}
          disabled={!selectedItem || creating}
          type="button"
          title={!selectedItem ? 'Select an item first' : 'Confirm'}
        >
          {creating ? 'Saving...' : 'Add'}
        </button>
      </div>
    </div>
  );
});

const MedicalRecordDetail = ({ isOpen, onClose, medicalRecordId, openNotification, onSuccess }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [medicalRecord, setMedicalRecord] = useState({});
  const [medicalInfo, setMedicalInfo] = useState({
    chiefComplaint: '',
    medicalHistory: '',
    allergies: '',
    currentMedications: '',
    diagnosis: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [services, setServices] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [isAddServiceItem, setIsAddServiceItem] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [addResult, setAddResult] = useState('');
  const [isAddGeneralService, setIsAddGeneralService] = useState(false);
  const [isAddMedicine, setIsAddMedicine] = useState(false);
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [addQuantity, setAddQuantity] = useState('');
  const [addInstructions, setAddInstructions] = useState('');

  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const filteredServices = useMemo(() => {
    const q = (serviceSearch || '').toLowerCase();
    return services.filter(s => (s.name || '').toLowerCase().includes(q));
  }, [services, serviceSearch]);

  const [medicineSearch, setMedicineSearch] = useState('');
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const filteredMedicines = useMemo(() => {
    const q = (medicineSearch || '').toLowerCase();
    return medicines.filter(m => (m.name || '').toLowerCase().includes(q));
  }, [medicines, medicineSearch]);

  const token = localStorage.getItem('token');
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setCurrentUser({ id: decoded.userId, role: decoded.role });
      } catch (err) {
        console.error("Error decoding token:", err);
      }
    }
  }, [token]);

  useEffect(() => {
    axios.get("https://gental-care-dental.onrender.com/service/all-services", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setServices(res.data.services))
      .catch(err => console.error(err));

    axios.get("https://gental-care-dental.onrender.com/medicine/get-medicines", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => setMedicines(res.data.medicines))
      .catch(err => console.error(err));
  }, [token, setServices, setMedicines]);

  const fetchMedicalRecordDetail = useCallback(async () => {
    try {
      const response = await axios.get(`https://gental-care-dental.onrender.com/medicalRecord/get-medical-record-detail/${medicalRecordId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMedicalRecord(response.data.record);
      setMedicalInfo({
        chiefComplaint: response.data.record?.chiefComplaint || '',
        medicalHistory: response.data.record?.medicalHistory || '',
        allergies: response.data.record?.allergies || '',
        currentMedications: response.data.record?.currentMedications || '',
        diagnosis: response.data.record?.diagnosis || '',
      });
    } catch (error) {
      console.error('Error fetching medical record detail:', error);
    }
  }, [medicalRecordId]);

  useEffect(() => {
    if (isOpen) {
      fetchMedicalRecordDetail();
    }
  }, [isOpen, fetchMedicalRecordDetail]);

  const handleInputChange = (field, value) => {
    setMedicalInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await axios.patch(
        `https://gental-care-dental.onrender.com/medicalRecord/update-medical-info/${medicalRecordId}`,
        {
          ...medicalInfo
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data) {
        setMedicalRecord(prev => ({
          ...prev,
          ...medicalInfo
        }));
        openNotification("success", "Medical information updated successfully!");
      }
    } catch (error) {
      console.error('Error updating medical info:', error);
      openNotification("error", "An error occurred while updating medical information!");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  };

  const getTreatedTeeth = () => {
    const treatedMap = {};
    if (medicalRecord?.servicesUsed) {
      medicalRecord.servicesUsed.forEach(service => {
        const toothNum = parseInt(service.toothNumber);
        if (!treatedMap[toothNum]) {
          treatedMap[toothNum] = [];
        }
        treatedMap[toothNum].push({
          serviceName: service.serviceId?.name,
          result: service.result
        });
      });
    }
    return treatedMap;
  };

  const treatedTeeth = getTreatedTeeth();

  const renderToothStatus = (toothNum) => {
    if (treatedTeeth[toothNum]) {
      return styles.treated;
    }
    return styles.healthy;
  };

  const handleToothClick = (toothNum) => {
    setSelectedTooth(toothNum === selectedTooth ? null : toothNum);
  };

  const handleSubmitAddService = async () => {
    try {
      await axios.post(
        `https://gental-care-dental.onrender.com/medicalRecord/add-service-used/${medicalRecordId}`,
        {
          serviceId: (selectedService?._id) || selectedServiceId,
          result: addResult || undefined,
          toothNumber: selectedTooth || undefined
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      openNotification("success", "Service added successfully!");
      setIsAddServiceItem(false);
      setIsAddGeneralService(false);
      setSelectedServiceId('');
      setSelectedService(null);
      setServiceSearch('');
      setAddResult('');
      await fetchMedicalRecordDetail();
    } catch (err) {
      console.error(err);
      openNotification("error", err.response?.data?.message || "Add service failed!");
    }
  };


  const handleDeleteServiceItem = async (serviceItemId) => {
    try {
      await axios.delete(`https://gental-care-dental.onrender.com/medicalRecord/delete-service-used/${medicalRecordId}/${serviceItemId}`, {

        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      openNotification("success", "Delete service item successfully!");
      await fetchMedicalRecordDetail();
    } catch (error) {
      console.error(error);
      openNotification("error", "Failed to delete service item: " + (error.response?.data?.message || "An error occurred."));
    }
  }

  const handleSubmitAddMedicine = async () => {
    try {
      await axios.post(
        `https://gental-care-dental.onrender.com/medicalRecord/add-prescriptions/${medicalRecordId}`,
        {
          medicineId: (selectedMedicine?._id) || selectedMedicineId,
          quantity: Number(addQuantity),
          instructions: addInstructions
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );

      openNotification("success", "Add medicine successfully!");
      setIsAddMedicine(false);
      setSelectedMedicineId('');
      setSelectedMedicine(null);
      setMedicineSearch('');
      setAddQuantity('');
      setAddInstructions('');
      await fetchMedicalRecordDetail();
    } catch (err) {
      console.error(err);
      openNotification("error", err.response?.data?.message || "Add medicine failed!");
    }
  }

  const handleDeleteMedicine = async (medicineItemId) => {
    try {
      await axios.delete(`https://gental-care-dental.onrender.com/medicalRecord/delete-prescriptions-item/${medicalRecordId}/${medicineItemId}`, {

        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      openNotification("success", "Delete medicine item successfully!");
      await fetchMedicalRecordDetail();
    } catch (error) {
      console.error(error);
      openNotification("error", "Failed to delete medicine item: " + (error.response?.data?.message || "An error occurred."));
    }
  }

  const handleFinishTreatment = async () => {
    try {
      await axios.patch(
        `https://gental-care-dental.onrender.com/medicalRecord/finish-treatment/${medicalRecordId}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      openNotification("success", "Treatment completed successfully!");
      onClose();
      onSuccess();
    } catch (err) {
      console.error(err);
      openNotification("error", err.response?.data?.message || "Finish treatment failed!");
    }
  }

  const handleCancelTreatment = async () => {
    try {
      await axios.patch(
        `https://gental-care-dental.onrender.com/medicalRecord/cancel-treatment/${medicalRecordId}`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      openNotification("success", "Treatment cancelled successfully!");
      onClose();
      onSuccess();
    } catch (err) {
      console.error(err);
      openNotification("error", err.response?.data?.message || "Cancel treatment failed!");
    }
  }

  if (!isOpen) return null;

  const pages = [
    { title: "Customer information", icon: User },
    { title: "Medical information", icon: FileText },
    { title: "Dental Chart & Services", icon: Smile },
    { title: "Prescription", icon: Pill }
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Medical record</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabs}>
          {pages.map((page, idx) => {
            const Icon = page.icon;
            return (
              <button
                key={idx}
                className={`${styles.tab} ${currentPage === idx ? styles.activeTab : ''}`}
                onClick={() => setCurrentPage(idx)}
                type="button"
              >
                <Icon size={18} />
                <span>{page.title}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Page 1: Patient Info */}
          {currentPage === 0 && (
            <div className={styles.page}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Customer information</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Full name:</span>
                    <span className={styles.value}>{medicalRecord?.customerId?.fullName ?? ""}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Email:</span>
                    <span className={styles.value}>{medicalRecord?.customerId?.email ?? ""}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Date of birth:</span>
                    <span className={styles.value}>{formatDate(medicalRecord?.customerId?.dateOfBirth ?? "")}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Age:</span>
                    <span className={styles.value}>
                      {medicalRecord?.customerId?.dateOfBirth
                        ? new Date().getFullYear() - new Date(medicalRecord.customerId.dateOfBirth).getFullYear()
                        : ""}
                    </span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Gender:</span>
                    <span className={styles.value}>{medicalRecord?.customerId?.gender ?? ""}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Phone number:</span>
                    <span className={styles.value}>{medicalRecord?.customerId?.phoneNumber ?? ""}</span>
                  </div>
                  <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.label}>Address:</span>
                    <span className={styles.value}>{medicalRecord?.customerId?.address ?? ""}</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Treating dentist information</h3>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Dentist:</span>
                    <span className={styles.value}>{medicalRecord?.dentistId?.fullName ?? ""}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Email:</span>
                    <span className={styles.value}>{medicalRecord?.dentistId?.email ?? ""}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Phone number:</span>
                    <span className={styles.value}>{medicalRecord?.dentistId?.phoneNumber ?? ""}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.label}>Examination date:</span>
                    <span className={styles.value}>{formatDate(medicalRecord?.recordDate ?? "")}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Page 2: Medical Info */}
          {currentPage === 1 && (
            <div className={styles.page}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Medical information</h3>

                <div className={styles.medicalItem}>
                  <h4 className={styles.medicalLabel}>Chief Complaint</h4>
                  <textarea
                    className={styles.medicalInput}
                    value={medicalInfo.chiefComplaint}
                    onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
                    placeholder="Enter reason for visit..."
                    rows={3}
                  />
                </div>

                <div className={styles.medicalItem}>
                  <h4 className={styles.medicalLabel}>Medical History</h4>
                  <textarea
                    className={styles.medicalInput}
                    value={medicalInfo.medicalHistory}
                    onChange={(e) => handleInputChange('medicalHistory', e.target.value)}
                    placeholder="Enter medical history..."
                    rows={3}
                  />
                </div>

                <div className={styles.medicalItem}>
                  <h4 className={styles.medicalLabel}>Allergies</h4>
                  <textarea
                    className={styles.medicalInput}
                    value={medicalInfo.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    placeholder="Enter allergies..."
                    rows={2}
                  />
                </div>

                <div className={styles.medicalItem}>
                  <h4 className={styles.medicalLabel}>Current medications</h4>
                  <textarea
                    className={styles.medicalInput}
                    value={medicalInfo.currentMedications}
                    onChange={(e) => handleInputChange('currentMedications', e.target.value)}
                    placeholder="Enter current medications..."
                    rows={2}
                  />
                </div>

                <div className={styles.medicalItem}>
                  <h4 className={styles.medicalLabel}>Diagnosis</h4>
                  <textarea
                    className={styles.medicalInput}
                    value={medicalInfo.diagnosis}
                    onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                    placeholder="Enter diagnosis..."
                    rows={3}
                  />
                </div>
              </div>
              <div className={styles.actions}>
                <ConfirmDialog
                  title="Confirmation of medical information storage"
                  description="Are you sure you want to save all medical information?"
                  onConfirm={handleSave}
                >
                  <button
                    className={`${styles.actionButton} ${styles.confirmButton}`}
                    disabled={isSaving || medicalRecord?.status !== 'In Progress'}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </ConfirmDialog>
              </div>
            </div>
          )}

          {/* Page 3: Dental Chart & Services */}
          {currentPage === 2 && (
            <div className={styles.page}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Services Used</h3>
                <button
                  className={styles.addServiceButton}
                  disabled={medicalRecord?.status !== 'In Progress'}
                  onClick={() => {
                    setIsAddGeneralService(prev => !prev);
                    setSelectedService(null); setServiceSearch(''); setAddResult('');
                  }}
                >
                  Add service
                </button>

                {isAddGeneralService && (
                  <InlineSelect
                    title="Select Service"
                    items={services}
                    filteredItems={filteredServices}
                    selectedItem={selectedService}
                    setSelectedItem={setSelectedService}
                    search={serviceSearch}
                    setSearch={setServiceSearch}
                    creating={isSaving}
                    rightMetaRender={(it) => typeof it.price === 'number' ? formatCurrency(it.price) : ''}
                    extraFields={
                      <div style={{ marginTop: 12 }}>
                        <input
                          placeholder="Result (optional)"
                          className={styles.medicalInput}
                          value={addResult}
                          onChange={e => setAddResult(e.target.value)}
                        />
                      </div>
                    }
                    onCancel={() => { setIsAddGeneralService(false); }}
                    onConfirm={handleSubmitAddService}
                  />
                )}
                <div className={styles.servicesTable}>
                  {medicalRecord?.servicesUsed?.map((service, idx) => (
                    <div key={idx} className={styles.serviceRow}>
                      <span className={styles.serviceName}>
                        {service.serviceId?.name} {service.toothNumber && `(Tooth ${service.toothNumber})`}
                      </span>
                      <span className={styles.servicePrice}>
                        {formatCurrency(service.serviceId?.price)}
                      </span>
                      <ConfirmDelete
                        title="Confirm service item deletion"
                        description={`Are you sure you want to delete service item? This action cannot be undone.`}
                        onConfirm={() => handleDeleteServiceItem(service._id)}>
                        <span className={styles.deleteServiceItem}>
                          <img width="30" height="30" src="https://img.icons8.com/ios-glyphs/30/FA5252/filled-trash.png" alt="filled-trash" />
                        </span>
                      </ConfirmDelete>
                    </div>
                  )) || <p>No services yet</p>}
                </div>
              </div>

              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Tooth Diagram</h3>
                <div className={styles.dentalChart}>
                  <div className={styles.dentalRow}>
                    <div className={styles.jawLabel}>Upper teeth</div>
                    <div className={styles.teethRow}>
                      {DENTAL_CHART.upper.map((tooth) => (
                        <div key={tooth} className={styles.toothContainer}>
                          <div
                            className={`${styles.tooth} ${renderToothStatus(tooth)} ${selectedTooth === tooth ? styles.selectedTooth : ''}`}
                            title={treatedTeeth[tooth]
                              ? treatedTeeth[tooth].map(t => t.serviceName).join(', ')
                              : 'Untreated'}
                            onClick={() => handleToothClick(tooth)}
                            style={{ cursor: 'pointer' }}
                          >
                            {tooth}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.dentalRow}>
                    <div className={styles.jawLabel}>Lower teeth</div>
                    <div className={styles.teethRow}>
                      {DENTAL_CHART.lower.map((tooth) => (
                        <div key={tooth} className={styles.toothContainer}>
                          <div
                            className={`${styles.tooth} ${renderToothStatus(tooth)} ${selectedTooth === tooth ? styles.selectedTooth : ''}`}
                            title={treatedTeeth[tooth]
                              ? treatedTeeth[tooth].map(t => t.serviceName).join(', ')
                              : 'Untreated'}
                            onClick={() => handleToothClick(tooth)}
                            style={{ cursor: 'pointer' }}
                          >
                            {tooth}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.legend}>
                    <div className={styles.legendItem}>
                      <div className={`${styles.legendColor} ${styles.healthy}`}></div>
                      <span>Untreated</span>
                    </div>
                    <div className={styles.legendItem}>
                      <div className={`${styles.legendColor} ${styles.treated}`}></div>
                      <span>Treated</span>
                    </div>
                    <div className={styles.legendItem}>
                      <div className={`${styles.legendColor} ${styles.selected}`}></div>
                      <span>Selected</span>
                    </div>
                  </div>
                </div>

                {/* List of treated teeth details - Only show for selected tooth */}
                {selectedTooth && (
                  <div className={styles.treatedTeethList}>
                    <h4 className={styles.sectionTitle}>
                      Service details for tooth number {selectedTooth}:
                    </h4>
                    {treatedTeeth[selectedTooth] ? (
                      <>
                        <div className={styles.treatedToothItem}>
                          <ul>
                            {treatedTeeth[selectedTooth].map((service, idx) => (
                              <li key={idx}>
                                {service.serviceName} - {service.result}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <button
                          className={styles.addServiceButton}
                          disabled={medicalRecord?.status !== 'In Progress'}
                          onClick={() => {
                            setIsAddServiceItem(prev => !prev);
                            setSelectedService(null); setServiceSearch(''); setAddResult('');
                          }}
                        >
                          Add service
                        </button>
                        {isAddServiceItem && (
                          <InlineSelect
                            title={`Select Service for tooth ${selectedTooth}`}
                            items={services}
                            filteredItems={filteredServices}
                            selectedItem={selectedService}
                            setSelectedItem={setSelectedService}
                            search={serviceSearch}
                            setSearch={setServiceSearch}
                            creating={isSaving}
                            rightMetaRender={(it) => typeof it.price === 'number' ? formatCurrency(it.price) : ''}
                            extraFields={
                              <div style={{ marginTop: 12 }}>
                                <input
                                  placeholder="Result (optional)"
                                  className={styles.medicalInput}
                                  value={addResult}
                                  onChange={e => setAddResult(e.target.value)}
                                />
                              </div>
                            }
                            onCancel={() => { setIsAddServiceItem(false); }}
                            onConfirm={handleSubmitAddService}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          className={styles.addServiceButton}
                          disabled={medicalRecord?.status !== 'In Progress'}
                          onClick={() => {
                            setIsAddServiceItem(prev => !prev);
                            setSelectedService(null); setServiceSearch(''); setAddResult('');
                          }}
                        >
                          Add service
                        </button>
                        {isAddServiceItem && (
                          <InlineSelect
                            title={`Select Service for tooth ${selectedTooth}`}
                            items={services}
                            filteredItems={filteredServices}
                            selectedItem={selectedService}
                            setSelectedItem={setSelectedService}
                            search={serviceSearch}
                            setSearch={setServiceSearch}
                            creating={isSaving}
                            rightMetaRender={(it) => typeof it.price === 'number' ? formatCurrency(it.price) : ''}
                            extraFields={
                              <div style={{ marginTop: 12 }}>
                                <input
                                  placeholder="Result (optional)"
                                  className={styles.medicalInput}
                                  value={addResult}
                                  onChange={e => setAddResult(e.target.value)}
                                />
                              </div>
                            }
                            onCancel={() => { setIsAddServiceItem(false); }}
                            onConfirm={handleSubmitAddService}
                          />
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Page 4: Prescription */}
          {currentPage === 3 && (
            <div className={styles.page}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Prescription</h3>
                <button
                  className={styles.addServiceButton}
                  disabled={medicalRecord?.status !== 'In Progress'}
                  onClick={() => {
                    setIsAddMedicine(prev => !prev);
                    setSelectedMedicine(null); setMedicineSearch('');
                    setAddQuantity(''); setAddInstructions('');
                  }}
                >
                  Add medicine
                </button>
                {isAddMedicine && (
                  <InlineSelect
                    title="Select Medicine"
                    items={medicines}
                    filteredItems={filteredMedicines}
                    selectedItem={selectedMedicine}
                    setSelectedItem={setSelectedMedicine}
                    search={medicineSearch}
                    setSearch={setMedicineSearch}
                    creating={isSaving}
                    rightMetaRender={() => ''}
                    extraFields={
                      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                        <input
                          placeholder="Quantity"
                          className={styles.medicalInput}
                          value={addQuantity}
                          onChange={e => setAddQuantity(e.target.value)}
                        />
                        <input
                          placeholder="Instructions (optional)"
                          className={styles.medicalInput}
                          value={addInstructions}
                          onChange={e => setAddInstructions(e.target.value)}
                        />
                      </div>
                    }
                    onCancel={() => { setIsAddMedicine(false); }}
                    onConfirm={handleSubmitAddMedicine}
                  />
                )}
                <div className={styles.prescriptionList}>
                  {medicalRecord?.prescriptions?.map((item, idx) => (
                    <div key={idx} className={styles.prescriptionCard}>
                      <div className={styles.prescriptionHeader}>
                        <span className={styles.medicineNumber}>{idx + 1}</span>
                        <h4 className={styles.medicineName}>{item.medicineId?.name}</h4>
                      </div>
                      <div className={styles.prescriptionDetails}>
                        <div className={styles.prescriptionRow}>
                          <span className={styles.prescriptionLabel}>Quantity:</span>
                          <span className={styles.prescriptionValue}>{item.quantity}</span>
                        </div>
                        <div className={styles.prescriptionRow}>
                          <span className={styles.prescriptionLabel}>Instructions:</span>
                          <span className={styles.prescriptionValue}>{item.instructions}</span>
                        </div>
                        <div className={`${styles.prescriptionRow} ${styles.prescriptionPriceRow}`}>
                          <span className={styles.prescriptionLabel}>Price:</span>
                          <span className={styles.prescriptionPrice}>
                            {formatCurrency(item.medicineId?.price)}
                          </span>
                        </div>
                      </div>
                      <ConfirmDelete
                        title="Confirm medicine item deletion"
                        description={`Are you sure you want to delete medicine item? This action cannot be undone.`}
                        onConfirm={() => handleDeleteMedicine(item._id)}>
                        <div>
                          <img width="30" height="30" src="https://img.icons8.com/ios-glyphs/30/FA5252/filled-trash.png" alt="filled-trash" />
                        </div>
                      </ConfirmDelete>
                    </div>
                  )) || <p>No prescription yet</p>}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Footer Buttons */}
        <div className={styles.footer}>
          <ConfirmDialog
            title="Confirm treatment cancellation"
            description="Are you sure you want to cancel the treatment?"
            onConfirm={handleCancelTreatment}>
            <button
              className={styles.cancelButton}
              disabled={
                medicalRecord?.status !== 'In Progress' ||
                !currentUser ||
                (
                  currentUser.role !== 'Admin' &&
                  currentUser.id !== medicalRecord?.dentistId?._id
                )
              }
            >
              Cancel treatment
            </button>
          </ConfirmDialog>

          <ConfirmDialog
            title="Confirmation of completion of treatment"
            description="Are you sure you want to complete the treatment?"
            onConfirm={handleFinishTreatment}>
            <button
              className={styles.finishButton}
              disabled={
                medicalRecord?.status !== 'In Progress' ||
                !currentUser ||
                (
                  currentUser.role !== 'Admin' &&
                  currentUser.id !== medicalRecord?.dentistId?._id
                )
              }
            >
              Finish treatment
            </button>
          </ConfirmDialog>
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordDetail;