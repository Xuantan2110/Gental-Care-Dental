import React, { useState, useEffect, useCallback } from 'react';
import styles from './Dashboard.module.css';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import { Select, DatePicker } from 'antd';
import dayjs from 'dayjs';
import { Calendar, Users, DollarSign, Star } from 'lucide-react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    LineChart, Line
} from 'recharts';

const COLORS = {
    confirmed: '#52c41a',
    rejected: '#ff4d4f',
    pending: '#faad14',
    other: '#1890ff'
};

function Dashboard() {
    // Separate states for each chart
    const [appointmentPeriod, setAppointmentPeriod] = useState('day');
    const [appointmentDate, setAppointmentDate] = useState(null);
    const [appointmentStats, setAppointmentStats] = useState(null);
    const [appointmentLoading, setAppointmentLoading] = useState(false);

    const [servicePeriod, setServicePeriod] = useState('day');
    const [serviceDate, setServiceDate] = useState(null);
    const [serviceUsage, setServiceUsage] = useState([]);
    const [serviceLoading, setServiceLoading] = useState(false);

    const [revenuePeriod, setRevenuePeriod] = useState('day');
    const [revenueDate, setRevenueDate] = useState(null);
    const [revenueStats, setRevenueStats] = useState({ totalRevenue: 0, data: [] });
    const [revenueLoading, setRevenueLoading] = useState(false);

    // Quick metrics state
    const [quickMetrics, setQuickMetrics] = useState({
        todayAppointments: 0,
        newCustomersThisMonth: 0,
        monthlyRevenue: 0,
        averageRating: 0
    });
    const [quickMetricsLoading, setQuickMetricsLoading] = useState(false);

    // Reset date and stats when period changes
    useEffect(() => {
        setAppointmentDate(null);
        setAppointmentStats(null);
        setAppointmentLoading(true);
    }, [appointmentPeriod]);

    useEffect(() => {
        setServiceDate(null);
        setServiceUsage([]);
        setServiceLoading(true);
    }, [servicePeriod]);

    useEffect(() => {
        setRevenueDate(null);
        setRevenueStats({ totalRevenue: 0, data: [] });
        setRevenueLoading(true);
    }, [revenuePeriod]);

    // Fetch appointment stats
    const fetchAppointmentStats = useCallback(async () => {
        setAppointmentLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        try {
            const params = new URLSearchParams({ period: appointmentPeriod });
            const dateToUse = appointmentDate || new Date();
            params.append('date', dayjs(dateToUse).format('YYYY-MM-DD'));
            
            const res = await axios.get(`http://localhost:5000/dashboard/appointment-stats?${params}`, { headers });
            setAppointmentStats(res.data.data);
        } catch (error) {
            console.error('Error fetching appointment stats:', error);
        } finally {
            setAppointmentLoading(false);
        }
    }, [appointmentPeriod, appointmentDate]);

    // Fetch service usage stats
    const fetchServiceUsage = useCallback(async () => {
        setServiceLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        try {
            const params = new URLSearchParams({ period: servicePeriod });
            const dateToUse = serviceDate || new Date();
            params.append('date', dayjs(dateToUse).format('YYYY-MM-DD'));
            
            const res = await axios.get(`http://localhost:5000/dashboard/service-usage-stats?${params}`, { headers });
            setServiceUsage(res.data.data);
        } catch (error) {
            console.error('Error fetching service usage stats:', error);
        } finally {
            setServiceLoading(false);
        }
    }, [servicePeriod, serviceDate]);

    // Fetch revenue stats
    const fetchRevenueStats = useCallback(async () => {
        setRevenueLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        try {
            const params = new URLSearchParams({ period: revenuePeriod });
            const dateToUse = revenueDate || new Date();
            params.append('date', dayjs(dateToUse).format('YYYY-MM-DD'));
            
            const res = await axios.get(`http://localhost:5000/dashboard/revenue-stats?${params}`, { headers });
            setRevenueStats({
                totalRevenue: res.data.totalRevenue,
                data: res.data.data
            });
        } catch (error) {
            console.error('Error fetching revenue stats:', error);
        } finally {
            setRevenueLoading(false);
        }
    }, [revenuePeriod, revenueDate]);

    useEffect(() => {
        fetchAppointmentStats();
    }, [fetchAppointmentStats]);

    useEffect(() => {
        fetchServiceUsage();
    }, [fetchServiceUsage]);

    useEffect(() => {
        fetchRevenueStats();
    }, [fetchRevenueStats]);

    // Fetch quick metrics
    const fetchQuickMetrics = useCallback(async () => {
        setQuickMetricsLoading(true);
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        try {
            const res = await axios.get('http://localhost:5000/dashboard/quick-metrics', { headers });
            setQuickMetrics(res.data.data);
        } catch (error) {
            console.error('Error fetching quick metrics:', error);
        } finally {
            setQuickMetricsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchQuickMetrics();
    }, [fetchQuickMetrics]);

    // Prepare pie chart data
    const pieChartData = appointmentStats ? [
        { name: 'Confirmed', value: appointmentStats.confirmed, color: COLORS.confirmed },
        { name: 'Rejected', value: appointmentStats.rejected, color: COLORS.rejected },
        { name: 'Pending', value: appointmentStats.pending, color: COLORS.pending }
    ].filter(item => item.value > 0) : [];

    // Format revenue for display
    const formatCurrency = (value) => {
        const amount = Number(value) || 0;
        const options = {
            style: 'currency',
            currency: 'USD',
        };

        if (amount >= 1000) {
            options.notation = 'compact';
            options.maximumFractionDigits = 1;
        }

        return new Intl.NumberFormat('en-US', options).format(amount);
    };

    // Disable future dates - need to pass period to the function
    const getDisabledDate = (period) => (current) => {
        if (!current) return false;
        const today = dayjs();
        if (period === 'year') {
            return current.isAfter(today, 'year');
        } else if (period === 'month') {
            return current.isAfter(today, 'month');
        } else {
            return current.isAfter(today, 'day');
        }
    };

    // Get date picker based on period
    const getDatePicker = (period, date, setDate) => {
        if (period === 'year') {
            return (
                <DatePicker
                    picker="year"
                    value={date ? dayjs(date) : dayjs()}
                    onChange={(value) => {
                        if (value) {
                            // Set to first day of the year
                            const yearStart = value.startOf('year').toDate();
                            setDate(yearStart);
                        } else {
                            setDate(null);
                        }
                    }}
                    disabledDate={getDisabledDate(period)}
                    placeholder="Select year"
                    style={{ width: 120 }}
                />
            );
        } else if (period === 'month') {
            return (
                <DatePicker
                    picker="month"
                    value={date ? dayjs(date) : dayjs()}
                    onChange={(value) => {
                        if (value) {
                            // Set to first day of the month
                            const monthStart = value.startOf('month').toDate();
                            setDate(monthStart);
                        } else {
                            setDate(null);
                        }
                    }}
                    disabledDate={getDisabledDate(period)}
                    placeholder="Select month"
                    style={{ width: 140 }}
                />
            );
        } else {
            return (
                <DatePicker
                    value={date ? dayjs(date) : dayjs()}
                    onChange={(value) => {
                        if (value) {
                            setDate(value.toDate());
                        } else {
                            setDate(null);
                        }
                    }}
                    disabledDate={getDisabledDate(period)}
                    placeholder="Select date"
                    style={{ width: 140 }}
                />
            );
        }
    };

    return (
        <div className={styles.dashboard}>
            <Sidebar />
            <div className={styles.mainContent}>
                <header className={styles.header}>
                    <h1>Dashboard</h1>
                </header>

                <main className={styles.main}>
                    <div className={styles.content}>
                        {/* Quick Metrics */}
                        <div className={styles.statsGrid}>
                            <div className={`${styles.statCard} ${styles.statCardAppointment}`}>
                                <div className={styles.statCardHeader}>
                                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)' }}>
                                        <Calendar className={styles.statIcon} style={{ color: '#2563eb' }} size={24} />
                                    </div>
                                </div>
                                <div className={styles.statCardContent}>
                                    <h3>Today's appointment schedule</h3>
                                    <p className={styles.statNumber}>
                                        {quickMetricsLoading ? '...' : quickMetrics.todayAppointments} 
                                    </p>
                                </div>
                            </div>
                            <div className={`${styles.statCard} ${styles.statCardCustomer}`}>
                                <div className={styles.statCardHeader}>
                                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                        <Users className={styles.statIcon} style={{ color: '#10b981' }} size={24} />
                                    </div>
                                </div>
                                <div className={styles.statCardContent}>
                                    <h3>New customers this month</h3>
                                    <p className={styles.statNumber}>
                                        {quickMetricsLoading ? '...' : quickMetrics.newCustomersThisMonth}
                                    </p>
                                </div>
                            </div>
                            <div className={`${styles.statCard} ${styles.statCardRevenue}`}>
                                <div className={styles.statCardHeader}>
                                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                        <DollarSign className={styles.statIcon} style={{ color: '#f59e0b' }} size={24} />
                                    </div>
                                </div>
                                <div className={styles.statCardContent}>
                                    <h3>Revenue for the month</h3>
                                    <p className={styles.statNumber}>
                                        {quickMetricsLoading ? '...' : formatCurrency(quickMetrics.monthlyRevenue)}
                                    </p>
                                </div>
                            </div>
                            <div className={`${styles.statCard} ${styles.statCardRating}`}>
                                <div className={styles.statCardHeader}>
                                    <div className={styles.statIconWrapper} style={{ backgroundColor: 'rgba(236, 72, 153, 0.1)' }}>
                                        <Star className={styles.statIcon} style={{ color: '#ec4899' }} size={24} />
                                    </div>
                                </div>
                                <div className={styles.statCardContent}>
                                    <h3>Average rating</h3>
                                    <p className={styles.statNumber}>
                                        {quickMetricsLoading ? '...' : quickMetrics.averageRating || '0.0'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Charts Section */}
                        {/* Two charts side by side */}
                        <div className={styles.chartsRow}>
                            {/* Pie Chart - Appointment Status */}
                            <div className={styles.chartCard}>
                                <div className={styles.chartHeader}>
                                    <h3 className={styles.chartTitle}>
                                        Appointment Status
                                    </h3>
                                    <div className={styles.chartControls}>
                                        <Select
                                            value={appointmentPeriod}
                                            onChange={setAppointmentPeriod}
                                            style={{ width: 100 }}
                                            options={[
                                                { value: 'day', label: 'Day' },
                                                { value: 'month', label: 'Month' },
                                                { value: 'year', label: 'Year' }
                                            ]}
                                        />
                                        {getDatePicker(appointmentPeriod, appointmentDate, setAppointmentDate)}
                                    </div>
                                </div>
                                {appointmentLoading ? (
                                    <div className={styles.loading}>Loading...</div>
                                ) : pieChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={pieChartData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {pieChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className={styles.noData}>No data available</div>
                                )}
                                <div className={styles.chartStats}>
                                    <div className={styles.chartStatItem}>
                                        <span className={styles.statDot} style={{ backgroundColor: COLORS.confirmed }}></span>
                                        <span>Confirmed: {appointmentStats?.confirmed || 0}</span>
                                    </div>
                                    <div className={styles.chartStatItem}>
                                        <span className={styles.statDot} style={{ backgroundColor: COLORS.rejected }}></span>
                                        <span>Rejected: {appointmentStats?.rejected || 0}</span>
                                    </div>
                                    <div className={styles.chartStatItem}>
                                        <span className={styles.statDot} style={{ backgroundColor: COLORS.pending }}></span>
                                        <span>Pending: {appointmentStats?.pending || 0}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bar Chart - Service Usage */}
                            <div className={styles.chartCard}>
                                <div className={styles.chartHeader}>
                                    <h3 className={styles.chartTitle}>
                                        Services used
                                    </h3>
                                    <div className={styles.chartControls}>
                                        <Select
                                            value={servicePeriod}
                                            onChange={setServicePeriod}
                                            style={{ width: 100 }}
                                            options={[
                                                { value: 'day', label: 'Day' },
                                                { value: 'month', label: 'Month' },
                                                { value: 'year', label: 'Year' }
                                            ]}
                                        />
                                        {getDatePicker(servicePeriod, serviceDate, setServiceDate)}
                                    </div>
                                </div>
                                {serviceLoading ? (
                                    <div className={styles.loading}>Loading...</div>
                                ) : serviceUsage.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={serviceUsage}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="name"
                                                angle={-45}
                                                textAnchor="end"
                                                height={100}
                                                interval={0}
                                            />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="quantity" fill="#1890ff" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className={styles.noData}>No data available</div>
                                )}
                            </div>
                        </div>

                        {/* Line Chart - Revenue */}
                        <div className={styles.chartCard}>
                            <div className={styles.chartHeader}>
                                <h3 className={styles.chartTitle}>
                                    Revenue over time
                                </h3>
                                <div className={styles.chartControls}>
                                    <Select
                                        value={revenuePeriod}
                                        onChange={setRevenuePeriod}
                                        style={{ width: 100 }}
                                        options={[
                                            { value: 'day', label: 'Day' },
                                            { value: 'month', label: 'Month' },
                                            { value: 'year', label: 'Year' }
                                        ]}
                                    />
                                    {getDatePicker(revenuePeriod, revenueDate, setRevenueDate)}
                                </div>
                            </div>
                            {revenueLoading ? (
                                <div className={styles.loading}>Loading...</div>
                            ) : revenueStats.data.length > 0 ? (
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={revenueStats.data}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="label" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#52c41a"
                                            strokeWidth={2}
                                            name="Doanh thu"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className={styles.noData}>No data available</div>
                            )}
                            <div className={styles.revenueTotal}>
                                Total revenue: <strong>{formatCurrency(revenueStats.totalRevenue)}</strong>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Dashboard;
