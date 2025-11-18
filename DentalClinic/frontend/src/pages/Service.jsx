import React, { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Service.module.css';
import Header from '../components/Header';
import axios from "axios";

const Service = () => {
    const [services, setServices] = useState([]);
    const [serviceTypes, setServiceTypes] = useState([]);
    const location = useLocation();

    const fetchServices = useCallback(async () => {
        try {
            const res = await axios.get('https://gental-care-dental.onrender.com/service/all-services', {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            const serviceList = res.data.services || [];
            setServices(serviceList);

            const types = [...new Set(serviceList.map(s => s.type))];
            setServiceTypes(types);
        } catch (error) {
            console.error("Error fetching service:", error);
        }
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const formatPrice = (value) => {
        const amount = Number(value);
        if (Number.isNaN(amount)) return '';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    useEffect(() => {
        if (serviceTypes.length === 0) return;
        const state = location.state || null;
        const typeFromState = state?.type || window.location.hash.replace("#", "");

        if (!typeFromState) return;

        const elementId = `service-type-${typeFromState}`;
        const el = document.getElementById(elementId);

        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [serviceTypes, location]);

    return (
        <main className={styles.main}>
            <Header />
            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Dental Services</h1>
                    <p className={styles.subtitle}>
                        Full list of our dental services
                    </p>
                </div>

                <div className={styles.servicesWrapper}>
                    {serviceTypes.map((type) => {
                        const typeServices = services.filter((s) => s.type === type);
                        if (typeServices.length === 0) return null;

                        return (
                            <div key={type} id={`service-type-${type}`} className={styles.typeSection}>
                                <h2 className={styles.typeTitle}>{type}</h2>

                                <div className={styles.tableWrapper}>
                                    <table className={styles.table}>
                                        
                                        <colgroup>
                                            <col style={{ width: "25%" }} /> 
                                            <col style={{ width: "40%" }} />  
                                            <col style={{ width: "14%" }} />  
                                            <col style={{ width: "11%" }} /> 
                                            <col style={{ width: "10%" }} /> 
                                        </colgroup>

                                        <thead>
                                            <tr className={styles.tableHeaderRow}>
                                                <th className={styles.tableHeaderCell}>Service Name</th>
                                                <th className={styles.tableHeaderCell}>Description</th>
                                                <th className={styles.tableHeaderCell}>Duration (minutes)</th>
                                                <th className={styles.tableHeaderCell}>Price</th>
                                                <th className={styles.tableHeaderCell}>Guarantee</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {typeServices.map((service) => (
                                                <tr key={service._id} className={styles.tableRow}>
                                                    <td className={`${styles.tableCell} ${styles.serviceNameCell}`}>
                                                        {service.name}
                                                    </td>
                                                    <td className={`${styles.tableCell} ${styles.descriptionCell}`}>
                                                        {service.description}
                                                    </td>
                                                    <td className={`${styles.tableCell} ${styles.durationCell}`}>
                                                        {service.duration}
                                                    </td>
                                                    <td className={`${styles.tableCell} ${styles.priceCell}`}>
                                                        {formatPrice(service.price)}
                                                    </td>
                                                    <td className={`${styles.tableCell} ${styles.guaranteeCell}`}>
                                                        {service.guarantee}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </main>
    );
};

export default Service;
