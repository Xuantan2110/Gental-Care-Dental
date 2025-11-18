const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Service = require('../models/Service');
const DentistWorkingTime = require('../models/DentistWorkingTime');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const { emitAppointmentUpdate } = require('../config/socket');
const { notifyNewAppointment, notifyAppointmentDecision } = require('./notificationController');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
});

const VN_OFFSET_MIN = 7 * 60;
const MS_PER_MIN = 60 * 1000;

// Trả về "YYYY-MM-DD" theo lịch VN từ mọi input (string ISO hoặc Date)
function ensureYMD_VN(input) {
    if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    const d = new Date(input); // parse ISO hoặc millis
    if (Number.isNaN(d.getTime())) throw new Error('Invalid date input');
    const vn = new Date(d.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
    const y = vn.getUTCFullYear();
    const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vn.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Mốc 00:00 của ngày đó theo VN → Date(UTC) để lưu/so sánh trong DB
function vnDateOnlyToUTC(ymd /* 'YYYY-MM-DD' */) {
    return new Date(`${ymd}T00:00:00.000+07:00`);
}

// Ghép "YYYY-MM-DD" + "HH:mm" thành Date theo VN (UTC+7)
function combineDateTimeVN(ymd, hhmm /* 'HH:mm' */) {
    return new Date(`${ymd}T${hhmm}:00.000+07:00`);
}

// Thứ của ngày lịch (1..7, CN=1) — KHÔNG phụ thuộc TZ máy
function dayOfWeek_1to7(ymd) {
    const dow0 = new Date(`${ymd}T00:00:00Z`).getUTCDay(); // 0..6
    return dow0 === 0 ? 1 : dow0 + 1;
}

function toHHMM_VN(dateObj) {
    if (!dateObj) return '';
    const d = new Date(dateObj);
    if (Number.isNaN(d.getTime())) return '';
    const vn = new Date(d.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
    const hh = String(vn.getUTCHours()).padStart(2, '0');
    const mm = String(vn.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}

// Helper function to format appointment for socket emission
async function formatAppointmentForSocket(appointment) {
    if (!appointment) return null;
    
    const populated = await Appointment.findById(appointment._id || appointment)
        .populate('customerId', 'fullName email phone')
        .populate('dentistId', 'fullName email');
    
    if (!populated) return null;
    
    const toLocalYMD_VN = (dateObj) => ensureYMD_VN(dateObj);
    const toLocalHHMM_VN = (dateObj) => {
        if (!dateObj) return null;
        const vn = new Date(dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
        const hh = String(vn.getUTCHours()).padStart(2, '0');
        const mm = String(vn.getUTCMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    };
    const toVNISO = (dateObj) => {
        if (!dateObj) return null;
        const vn = new Date(dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
        const y = vn.getUTCFullYear();
        const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
        const d = String(vn.getUTCDate()).padStart(2, '0');
        const hh = String(vn.getUTCHours()).padStart(2, '0');
        const mm = String(vn.getUTCMinutes()).padStart(2, '0');
        const ss = String(vn.getUTCSeconds()).padStart(2, '0');
        return `${y}-${m}-${d}T${hh}:${mm}:${ss}+07:00`;
    };
    
    return {
        _id: populated._id,
        status: populated.status,
        dentist: populated.dentistId,
        customer: populated.customerId,
        note: populated.note,
        service: populated.service,
        date: toLocalYMD_VN(populated.date),
        startTime: toLocalHHMM_VN(populated.startTime),
        endTime: toLocalHHMM_VN(populated.endTime),
        bookAt: toVNISO(populated.bookAt || populated.createdAt),
        createdAt: toVNISO(populated.createdAt),
        updatedAt: toVNISO(populated.updatedAt),
        medicalRecordId: populated.medicalRecordId,
        dentistId: populated.dentistId?._id || populated.dentistId,
        customerId: populated.customerId?._id || populated.customerId,
    };
}

const appointmentController = {
    createAppointment: async (req, res) => {
        try {
            const { dentistId, startTime, date, note, services } = req.body;
            const userId = req.user.id;

            // 1) Validate cơ bản
            if (!dentistId) return res.status(400).json({ message: "DentistId is required" });
            if (!startTime) return res.status(400).json({ message: "Start time is required" });
            if (!date) return res.status(400).json({ message: "Date is required" });
            if (!services || !Array.isArray(services) || services.length === 0) {
                return res.status(400).json({ message: "At least one service is required" });
            }
            if (!mongoose.Types.ObjectId.isValid(dentistId)) {
                return res.status(400).json({ message: 'Invalid dentistId' });
            }
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ message: 'Invalid userId' });
            }

            // 2) Tồn tại user/dentist + đúng role
            const customer = await User.findById(userId);
            const dentist = await User.findById(dentistId);
            if (!customer) return res.status(404).json({ message: 'User not found' });
            if (!dentist || dentist.role !== 'Dentist') {
                return res.status(404).json({ message: 'Dentist not found' });
            }

            // 3) Lấy dịch vụ & tổng thời lượng
            const serviceDetails = await Service.find({ _id: { $in: services } });
            if (serviceDetails.length !== services.length) {
                return res.status(404).json({ message: 'One or more services not found' });
            }
            const totalDuration = serviceDetails.reduce((acc, s) => acc + (s.duration || 0), 0);
            if (totalDuration <= 0) {
                return res.status(400).json({ message: 'Total duration must be > 0' });
            }

            // 4) Chuẩn hoá ngày theo VN
            const ymd = ensureYMD_VN(date);             // 'YYYY-MM-DD'
            const start = combineDateTimeVN(ymd, startTime);
            const end = new Date(start.getTime() + totalDuration * 60000);
            const normalizedDate = vnDateOnlyToUTC(ymd); // mốc 00:00 VN (UTC) — dùng cho DB

            // 5) Rào thời gian (theo UTC — ok vì start/end đã là thời điểm chuẩn +07:00)
            const now = new Date();
            if (start < now) {
                return res.status(400).json({ message: "Cannot book an appointment in the past" });
            }
            // hôm nay phải đặt trước 30'
            const ymdNowVN = ensureYMD_VN(now);
            if (ymd === ymdNowVN) {
                const minStart = new Date(now.getTime() + 30 * 60000);
                if (start < minStart) {
                    return res.status(400).json({ message: "Appointments today must be booked at least 30 minutes in advance" });
                }
            }
            // không quá 3 tháng
            const threeMonthsLater = new Date(now);
            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
            if (start > threeMonthsLater) {
                return res.status(400).json({ message: "Cannot book an appointment more than 3 months in advance" });
            }

            // 6) Lấy working time — ƯU TIÊN LỊCH ĐẶC BIỆT
            const special = await DentistWorkingTime.findOne({ dentistId, isFixed: false, date: normalizedDate });
            let workingTime = special;
            if (!workingTime) {
                const fixed = await DentistWorkingTime.findOne({ dentistId, isFixed: true });
                if (!fixed) {
                    return res.status(400).json({ message: "Dentist is not working on this day" });
                }
                // kiểm tra thứ của ngày đặt có thuộc workingDays của fixed
                const dow = dayOfWeek_1to7(ymd);
                if (!Array.isArray(fixed.workingDays) || !fixed.workingDays.includes(dow)) {
                    return res.status(400).json({ message: "Dentist does not work on this day" });
                }
                workingTime = fixed;
            }

            // 7) Nếu ngày đặc biệt đóng cửa → chặn ngay
            if (workingTime.isClosed) {
                return res.status(400).json({ message: "Dentist is not working on this day (day off)" });
            }

            // 8) Giới hạn phải nằm TRONG MỘT CA (sáng hoặc chiều) — nếu chỉ có sáng thì đặt chiều sẽ fail
            const toBound = (hm) => (hm ? combineDateTimeVN(ymd, hm) : null);
            const morningStart = toBound(workingTime.morning?.startTime);
            const morningEnd = toBound(workingTime.morning?.endTime);
            const afternoonStart = toBound(workingTime.afternoon?.startTime);
            const afternoonEnd = toBound(workingTime.afternoon?.endTime);

            const inMorning = morningStart && morningEnd && start >= morningStart && end <= morningEnd;
            const inAfternoon = afternoonStart && afternoonEnd && start >= afternoonStart && end <= afternoonEnd;
            if (!inMorning && !inAfternoon) {
                return res.status(400).json({ message: "Appointment time is outside of working hours" });
            }

            // 9) Conflict: cùng nha sĩ, cùng ngày, có overlap
            const conflict = await Appointment.findOne({
                dentistId,
                date: normalizedDate,
                startTime: { $lt: end },
                endTime: { $gt: start },
            });

            if (conflict) {
                return res.status(400).json({ message: "Dentist already has an appointment in this time" });
            }

            // 10) Tạo appointment
            const appointment = new Appointment({
                customerId: userId,
                dentistId,
                startTime: start,
                endTime: end,
                date: normalizedDate,
                note,
                service: serviceDetails.map(s => ({ serviceId: s._id, name: s.name })),
            });

            await appointment.save();
            
            // Emit socket event for real-time update
            try {
                const formattedAppointment = await formatAppointmentForSocket(appointment);
                if (formattedAppointment) {
                    emitAppointmentUpdate(formattedAppointment, 'created');
                }
            } catch (socketError) {
                console.error('Error emitting appointment create event:', socketError);
            }

            // Create notification for staff
            try {
                await notifyNewAppointment(appointment);
            } catch (notifError) {
                console.error('Error creating notification for new appointment:', notifError);
            }
            
            res.status(201).json({ message: 'Appointment created successfully', appointment });
        } catch (error) {
            console.error('Error creating appointment:', error);
            res.status(500).json({ message: 'An error occurred while creating the appointment', error: error.message });
        }
    },

    staffCreateAppointment: async (req, res) => {
        try {
            const { customerId, dentistId, startTime, date, note, services } = req.body;

            // 1) Validate cơ bản
            if (!customerId) return res.status(400).json({ message: "CustomerId is required" });
            if (!dentistId) return res.status(400).json({ message: "DentistId is required" });
            if (!startTime) return res.status(400).json({ message: "Start time is required" });
            if (!date) return res.status(400).json({ message: "Date is required" });
            if (!services || !Array.isArray(services) || services.length === 0) {
                return res.status(400).json({ message: "At least one service is required" });
            }
            if (!mongoose.Types.ObjectId.isValid(dentistId)) {
                return res.status(400).json({ message: 'Invalid dentistId' });
            }
            if (!mongoose.Types.ObjectId.isValid(customerId)) {
                return res.status(400).json({ message: 'Invalid customerId' });
            }

            // 2) Tồn tại user/dentist + đúng role
            const customer = await User.findById(customerId);
            const dentist = await User.findById(dentistId);
            if (!customer) return res.status(404).json({ message: 'User not found' });
            if (!dentist || dentist.role !== 'Dentist') {
                return res.status(404).json({ message: 'Dentist not found' });
            }

            // 3) Lấy dịch vụ & tổng thời lượng
            const serviceDetails = await Service.find({ _id: { $in: services } });
            if (serviceDetails.length !== services.length) {
                return res.status(404).json({ message: 'One or more services not found' });
            }
            const totalDuration = serviceDetails.reduce((acc, s) => acc + (s.duration || 0), 0);
            if (totalDuration <= 0) {
                return res.status(400).json({ message: 'Total duration must be > 0' });
            }

            // 4) Chuẩn hoá ngày theo VN
            const ymd = ensureYMD_VN(date);             // 'YYYY-MM-DD'
            const start = combineDateTimeVN(ymd, startTime);
            const end = new Date(start.getTime() + totalDuration * 60000);
            const normalizedDate = vnDateOnlyToUTC(ymd); // mốc 00:00 VN (UTC) — dùng cho DB

            // 5) Rào thời gian (theo UTC — ok vì start/end đã là thời điểm chuẩn +07:00)
            const now = new Date();
            if (start < now) {
                return res.status(400).json({ message: "Cannot book an appointment in the past" });
            }
            // hôm nay phải đặt trước 30'
            const ymdNowVN = ensureYMD_VN(now);
            if (ymd === ymdNowVN) {
                const minStart = new Date(now.getTime() + 30 * 60000);
                if (start < minStart) {
                    return res.status(400).json({ message: "Appointments today must be booked at least 30 minutes in advance" });
                }
            }
            // không quá 3 tháng
            const threeMonthsLater = new Date(now);
            threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
            if (start > threeMonthsLater) {
                return res.status(400).json({ message: "Cannot book an appointment more than 3 months in advance" });
            }

            // 6) Lấy working time — ƯU TIÊN LỊCH ĐẶC BIỆT
            const special = await DentistWorkingTime.findOne({ dentistId, isFixed: false, date: normalizedDate });
            let workingTime = special;
            if (!workingTime) {
                const fixed = await DentistWorkingTime.findOne({ dentistId, isFixed: true });
                if (!fixed) {
                    return res.status(400).json({ message: "Dentist is not working on this day" });
                }
                // kiểm tra thứ của ngày đặt có thuộc workingDays của fixed
                const dow = dayOfWeek_1to7(ymd);
                if (!Array.isArray(fixed.workingDays) || !fixed.workingDays.includes(dow)) {
                    return res.status(400).json({ message: "Dentist does not work on this day" });
                }
                workingTime = fixed;
            }

            // 7) Nếu ngày đặc biệt đóng cửa → chặn ngay
            if (workingTime.isClosed) {
                return res.status(400).json({ message: "Dentist is not working on this day (day off)" });
            }

            // 8) Giới hạn phải nằm TRONG MỘT CA (sáng hoặc chiều) — nếu chỉ có sáng thì đặt chiều sẽ fail
            const toBound = (hm) => (hm ? combineDateTimeVN(ymd, hm) : null);
            const morningStart = toBound(workingTime.morning?.startTime);
            const morningEnd = toBound(workingTime.morning?.endTime);
            const afternoonStart = toBound(workingTime.afternoon?.startTime);
            const afternoonEnd = toBound(workingTime.afternoon?.endTime);

            const inMorning = morningStart && morningEnd && start >= morningStart && end <= morningEnd;
            const inAfternoon = afternoonStart && afternoonEnd && start >= afternoonStart && end <= afternoonEnd;
            if (!inMorning && !inAfternoon) {
                return res.status(400).json({ message: "Appointment time is outside of working hours" });
            }

            // 9) Conflict: cùng nha sĩ, cùng ngày, có overlap
            const conflict = await Appointment.findOne({
                dentistId,
                date: normalizedDate,
                startTime: { $lt: end },
                endTime: { $gt: start },
            });

            if (conflict) {
                return res.status(400).json({ message: "Dentist already has an appointment in this time" });
            }

            // 10) Tạo appointment
            const appointment = new Appointment({
                customerId,
                dentistId,
                startTime: start,
                endTime: end,
                date: normalizedDate,
                note,
                service: serviceDetails.map(s => ({ serviceId: s._id, name: s.name })),
            });

            await appointment.save();
            
            // Emit socket event for real-time update
            try {
                const formattedAppointment = await formatAppointmentForSocket(appointment);
                if (formattedAppointment) {
                    emitAppointmentUpdate(formattedAppointment, 'created');
                }
            } catch (socketError) {
                console.error('Error emitting appointment create event:', socketError);
            }

            // Create notification for staff
            try {
                await notifyNewAppointment(appointment);
            } catch (notifError) {
                console.error('Error creating notification for new appointment:', notifError);
            }
            
            res.status(201).json({ message: 'Appointment created successfully', appointment });
        } catch (error) {
            console.error('Error creating appointment:', error);
            res.status(500).json({ message: 'An error occurred while creating the appointment', error: error.message });
        }
    },

    deleteAppointment: async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid appointment id' });
            }
            const deleted = await Appointment.findByIdAndDelete(id);
            if (!deleted) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            
            // Emit socket event for real-time update
            try {
                const formattedAppointment = await formatAppointmentForSocket(deleted);
                if (formattedAppointment) {
                    emitAppointmentUpdate(formattedAppointment, 'deleted');
                }
            } catch (socketError) {
                console.error('Error emitting appointment delete event:', socketError);
            }
            
            return res.status(200).json({
                message: 'Appointment deleted successfully',
                appointment: {
                    _id: deleted._id,
                    dentistId: deleted.dentistId,
                    customerId: deleted.customerId,
                    date: deleted.date,
                    startTime: deleted.startTime,
                    endTime: deleted.endTime,
                }
            });
        } catch (error) {
            console.error('Error deleting appointment:', error);
            return res.status(500).json({ message: error.message });
        }
    },

    getAllAppointments: async (req, res) => {
        try {
            const toLocalYMD_VN = (dateObj) => ensureYMD_VN(dateObj);

            const toLocalHHMM_VN = (dateObj) => {
                if (!dateObj) return null;
                const vn = new Date(dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
                const hh = String(vn.getUTCHours()).padStart(2, '0');
                const mm = String(vn.getUTCMinutes()).padStart(2, '0');
                return `${hh}:${mm}`;
            };

            const toVNISO = (dateObj) => {
                if (!dateObj) return null;
                const vn = new Date(dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
                const y = vn.getUTCFullYear();
                const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
                const d = String(vn.getUTCDate()).padStart(2, '0');
                const hh = String(vn.getUTCHours()).padStart(2, '0');
                const mm = String(vn.getUTCMinutes()).padStart(2, '0');
                const ss = String(vn.getUTCSeconds()).padStart(2, '0');
                return `${y}-${m}-${d}T${hh}:${mm}:${ss}+07:00`;
            };

            const items = await Appointment.find()
                .populate('customerId', 'fullName email phone')
                .populate('dentistId', 'fullName email')
                .sort({ createdAt: -1 });

            const data = items.map(a => ({
                _id: a._id,
                status: a.status,
                dentist: a.dentistId,
                customer: a.customerId,
                note: a.note,
                service: a.service,

                date: toLocalYMD_VN(a.date),
                startTime: toLocalHHMM_VN(a.startTime),
                endTime: toLocalHHMM_VN(a.endTime),
                bookAt: toVNISO(a.bookAt || a.createdAt),
                createdAt: toVNISO(a.createdAt),
                updatedAt: toVNISO(a.updatedAt),
                medicalRecordId: a.medicalRecordId,
            }));

            return res.status(200).json({
                message: 'Get all appointments successfully',
                total: data.length,
                data,
            });
        } catch (error) {
            console.error('Error getting appointments:', error);
            return res.status(500).json({ message: error.message });
        }
    },

    confirmAppointment: async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid appointment id' });
            }
            const appointment = await Appointment.findById(id);
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            if (appointment.status !== 'pending') {
                return res.status(400).json({ message: `Cannot confirm an appointment with status ${appointment.status}` });
            }

            appointment.status = 'confirmed';
            appointment.decision = {
                ...(appointment.decision || {}),
                confirmedAt: new Date(),
                confirmedBy: req.user?.id || null,
                rejectedAt: null,
                rejectedBy: null,
                rejectReason: null,
            };
            await appointment.save();
            
            // Emit socket event for real-time update
            try {
                const formattedAppointment = await formatAppointmentForSocket(appointment);
                if (formattedAppointment) {
                    emitAppointmentUpdate(formattedAppointment, 'confirmed');
                }
            } catch (socketError) {
                console.error('Error emitting appointment confirm event:', socketError);
            }

            // Create notification for dentist
            try {
                await notifyAppointmentDecision(appointment, 'confirmed');
            } catch (notifError) {
                console.error('Error creating notification for appointment confirmation:', notifError);
            }
            
            const customer = await User.findById(appointment.customerId);
            const dentist = await User.findById(appointment.dentistId);
            const serviceNames = appointment.service?.map(s => s.name).join(', ') || '';
            if (customer && customer.email) {
                const mailOptions = {
                    from: `"Gentle Care Dental" <${process.env.EMAIL_USER}>`,
                    to: customer.email,
                    subject: 'Appointment Confirmed',
                    html: `
                    <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f6f9; padding: 30px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

                        <!-- Header -->
                        <div style="background-color: #0077cc; color: white; padding: 40px 20px; text-align: center;">
                        <h2 style="margin: 0;">Your appointment has been confirmed</h2>
                        </div>

                        <!-- Body -->
                        <div style="padding: 30px; color: #333;">
                        <p>Hi <strong>${customer.fullName}</strong>,</p>
                        <p>Thank you for using Gentle Care Dental services! Below are your appointment details:</p>

                        <table style="width: 100%; margin: 20px 0;">
                            <tr>
                            <td style="padding: 8px 0;"><strong>Date:</strong></td>
                            <td>${ensureYMD_VN(appointment.date)}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0;"><strong>Time start:</strong></td>
                            <td>${toHHMM_VN(appointment.startTime)}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0;"><strong>Dentist:</strong></td>
                            <td>${dentist.fullName}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0;"><strong>Services:</strong></td>
                            <td>${serviceNames}</td>
                            </tr>
                        </table>

                        <p style="margin-top: 20px;">Please be at our dental office by ${toHHMM_VN(appointment.startTime)} so that the work can be done on time.
                        If you have any questions about your appointment, please call us directly at: 0909 999 999</p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f0f0f0; color: #777; text-align: center; padding: 15px; font-size: 13px;">
                        &copy; 2025 Gentle Care Dental. All rights reserved.<br/>
                        Ha Noi, Viet Nam
                        </div>
                    </div>
                    </div>
                `
                };
                transporter.sendMail(mailOptions, (error) => {
                    if (error) {
                        console.error('Error sending confirmation email:', error);
                    }
                });
            }
            return res.status(200).json({ message: 'Appointment confirmed successfully', appointment });
        } catch (error) {
            console.error('Error confirming appointment:', error);
            return res.status(500).json({ message: error.message });
        }
    },

    rejectAppointment: async (req, res) => {
        try {
            const { id } = req.params;
            const { reason } = req.body || {};
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid appointment id' });
            }
            const appointment = await Appointment.findById(id);
            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }
            if (appointment.status === 'rejected') {
                return res.status(400).json({ message: 'Appointment is already rejected' });
            }
            if (appointment.status === 'confirmed') {
                return res.status(400).json({ message: 'Appointment is already confirmed' });
            }
            if (!reason?.trim()) return res.status(400).json({ message: 'Reject reason is required' });

            appointment.status = 'rejected';
            appointment.decision = {
                ...(appointment.decision || {}),
                rejectedAt: new Date(),
                rejectedBy: req.user?.id || null,
                rejectReason: (reason && reason.trim()) || appointment.decision?.rejectReason || null,
                confirmedAt: null,
                confirmedBy: null,
            };
            await appointment.save();
            
            // Emit socket event for real-time update
            try {
                const formattedAppointment = await formatAppointmentForSocket(appointment);
                if (formattedAppointment) {
                    emitAppointmentUpdate(formattedAppointment, 'rejected');
                }
            } catch (socketError) {
                console.error('Error emitting appointment reject event:', socketError);
            }

            // Create notification for dentist
            try {
                await notifyAppointmentDecision(appointment, 'rejected');
            } catch (notifError) {
                console.error('Error creating notification for appointment rejection:', notifError);
            }
            
            const customer = await User.findById(appointment.customerId);
            const dentist = await User.findById(appointment.dentistId);
            const serviceNames = appointment.service?.map(s => s.name).join(', ') || '';
            const rejectReason = appointment.decision?.rejectReason || 'No reason provided';
            if (customer && customer.email) {
                const mailOptions = {
                    from: `"Gentle Care Dental" <${process.env.EMAIL_USER}>`,
                    to: customer.email,
                    subject: 'Appointment rejected',
                    html: `
                    <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f6f9; padding: 30px;">
                    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

                        <!-- Header -->
                        <div style="background-color: #0077cc; color: white; padding: 40px 20px; text-align: center;">
                        <h2 style="margin: 0;">Your appointment has been rejected</h2>
                        </div>

                        <!-- Body -->
                        <div style="padding: 30px; color: #333;">
                        <p>Hi <strong>${customer.fullName}</strong>,</p>
                        <p>Thank you for using Gentle Care Dental services! Sorry, we cannot take this appointment</p>

                        <table style="width: 100%; margin: 20px 0;">
                            <tr>
                            <td style="padding: 8px 0;"><strong>Date:</strong></td>
                            <td>${ensureYMD_VN(appointment.date)}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0;"><strong>Time start:</strong></td>
                            <td>${toHHMM_VN(appointment.startTime)}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0;"><strong>Dentist:</strong></td>
                            <td>${dentist.fullName}</td>
                            </tr>
                            <tr>
                            <td style="padding: 8px 0;"><strong>Services:</strong></td>
                            <td>${serviceNames}</td>
                            </tr>
                        </table>

                        <p style="margin-top: 20px;">Because: ${rejectReason}, we have to reject this appointment. We are sorry for the inconvenience. 
                        If you have any questions about your appointment, please call us directly at: 0909 999 999</p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f0f0f0; color: #777; text-align: center; padding: 15px; font-size: 13px;">
                        &copy; 2025 Gentle Care Dental. All rights reserved.<br/>
                        Ha Noi, Viet Nam
                        </div>
                    </div>
                    </div>
                `,
                };
                transporter.sendMail(mailOptions, (error) => {
                    if (error) {
                        console.error('Error sending rejection email:', error);
                    }
                });
            }
            return res.status(200).json({ message: 'Appointment rejected successfully', appointment });
        } catch (error) {
            console.error('Error rejecting appointment:', error);
            return res.status(500).json({ message: error.message });
        }
    },

    getAppointmentById: async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid appointment id' });
            }

            const item = await Appointment.findById(id)
                .populate('customerId', 'fullName email phoneNumber')
                .populate('dentistId', 'fullName email')
                .populate('decision.confirmedBy', 'fullName email')
                .populate('decision.rejectedBy', 'fullName email');

            if (!item) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            const toLocalYMD_VN = (dateObj) => ensureYMD_VN(dateObj);
            const toLocalHHMM_VN = (dateObj) => {
                if (!dateObj) return null;
                const vn = new Date(dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
                const hh = String(vn.getUTCHours()).padStart(2, '0');
                const mm = String(vn.getUTCMinutes()).padStart(2, '0');
                return `${hh}:${mm}`;
            };
            const toVNISO = (dateObj) => {
                if (!dateObj) return null;
                const vn = new Date(dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
                const y = vn.getUTCFullYear();
                const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
                const d = String(vn.getUTCDate()).padStart(2, '0');
                const hh = String(vn.getUTCHours()).padStart(2, '0');
                const mm = String(vn.getUTCMinutes()).padStart(2, '0');
                const ss = String(vn.getUTCSeconds()).padStart(2, '0');
                return `${y}-${m}-${d}T${hh}:${mm}:${ss}+07:00`;
            };

            const data = {
                _id: item._id,
                status: item.status,
                dentist: item.dentistId,
                customer: item.customerId,
                note: item.note,
                service: item.service,

                date: toLocalYMD_VN(item.date),
                startTime: toLocalHHMM_VN(item.startTime),
                endTime: toLocalHHMM_VN(item.endTime),
                bookAt: toVNISO(item.bookAt || item.createdAt),
                createdAt: toVNISO(item.createdAt),
                updatedAt: toVNISO(item.updatedAt),

                decision: {
                    confirmedAt: item.decision?.confirmedAt ? toVNISO(item.decision.confirmedAt) : null,
                    confirmedBy: item.decision?.confirmedBy ? {
                        _id: item.decision.confirmedBy._id,
                        fullName: item.decision.confirmedBy.fullName,
                        email: item.decision.confirmedBy.email,
                    } : null,
                    rejectedAt: item.decision?.rejectedAt ? toVNISO(item.decision.rejectedAt) : null,
                    rejectedBy: item.decision?.rejectedBy ? {
                        _id: item.decision.rejectedBy._id,
                        fullName: item.decision.rejectedBy.fullName,
                        email: item.decision.rejectedBy.email,
                    } : null,
                    rejectReason: item.decision?.rejectReason || null,
                },
            };

            return res.status(200).json({
                message: 'Get appointment detail successfully',
                data,
            });
        } catch (error) {
            console.error('Error getting appointment by id:', error);
            return res.status(500).json({ message: error.message });
        }
    },

    getAppointmentsByDentist: async (req, res) => {
        try {
            const dentistId = req.user.id;

            const items = await Appointment.find({ dentistId })
                .populate('customerId', 'fullName email phone')
                .populate('dentistId', 'fullName email')
                .sort({ createdAt: -1 });

            const toLocalYMD_VN = (dateObj) => ensureYMD_VN(dateObj);
            const toLocalHHMM_VN = (dateObj) => {
                if (!dateObj) return null;
                const vn = new Date(dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
                const hh = String(vn.getUTCHours()).padStart(2, '0');
                const mm = String(vn.getUTCMinutes()).padStart(2, '0');
                return `${hh}:${mm}`;
            };
            const toVNISO = (dateObj) => {
                if (!dateObj) return null;
                const vn = new Date(dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
                const y = vn.getUTCFullYear();
                const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
                const d = String(vn.getUTCDate()).padStart(2, '0');
                const hh = String(vn.getUTCHours()).padStart(2, '0');
                const mm = String(vn.getUTCMinutes()).padStart(2, '0');
                const ss = String(vn.getUTCSeconds()).padStart(2, '0');
                return `${y}-${m}-${d}T${hh}:${mm}:${ss}+07:00`;
            };

            const data = items.map(a => ({
                _id: a._id,
                status: a.status,
                dentist: a.dentistId,
                customer: a.customerId,
                note: a.note,
                service: a.service,

                date: toLocalYMD_VN(a.date),
                startTime: toLocalHHMM_VN(a.startTime),
                endTime: toLocalHHMM_VN(a.endTime),
                bookAt: toVNISO(a.bookAt || a.createdAt),
                createdAt: toVNISO(a.createdAt),
                updatedAt: toVNISO(a.updatedAt),
                medicalRecordId: a.medicalRecordId,
            }));

            return res.status(200).json({
                message: 'Get dentist appointments successfully',
                total: data.length,
                data,
            });
        } catch (error) {
            console.error('Error getting dentist appointments:', error);
            return res.status(500).json({ message: error.message });
        }
    },


    getAppointmentsByCustomer: async (req, res) => {
        try {
            const customerId = req.user.id;

            const items = await Appointment.find({ customerId })
                .populate('customerId', 'fullName email phoneNumber phone')
                .populate('dentistId', 'fullName email')
                .populate('decision.confirmedBy', 'fullName email')
                .populate('decision.rejectedBy', 'fullName email')
                .sort({ createdAt: -1 });

            const toLocalYMD_VN = (dateObj) => ensureYMD_VN(dateObj);
            const toLocalHHMM_VN = (dateObj) => {
                if (!dateObj) return null;
                const vn = new Date(dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
                const hh = String(vn.getUTCHours()).padStart(2, '0');
                const mm = String(vn.getUTCMinutes()).padStart(2, '0');
                return `${hh}:${mm}`;
            };
            const toVNISO = (dateObj) => {
                if (!dateObj) return null;
                const vn = new Date(dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
                const y = vn.getUTCFullYear();
                const m = String(vn.getUTCMonth() + 1).padStart(2, '0');
                const d = String(vn.getUTCDate()).padStart(2, '0');
                const hh = String(vn.getUTCHours()).padStart(2, '0');
                const mm = String(vn.getUTCMinutes()).padStart(2, '0');
                const ss = String(vn.getUTCSeconds()).padStart(2, '0');
                return `${y}-${m}-${d}T${hh}:${mm}:${ss}+07:00`;
            };

            const data = items.map(item => ({
                _id: item._id,
                status: item.status,
                dentist: item.dentistId,
                customer: item.customerId,
                note: item.note,
                service: item.service,

                date: toLocalYMD_VN(item.date),
                startTime: toLocalHHMM_VN(item.startTime),
                endTime: toLocalHHMM_VN(item.endTime),
                bookAt: toVNISO(item.bookAt || item.createdAt),
                createdAt: toVNISO(item.createdAt),
                updatedAt: toVNISO(item.updatedAt),

                decision: {
                    confirmedAt: item.decision?.confirmedAt ? toVNISO(item.decision.confirmedAt) : null,
                    confirmedBy: item.decision?.confirmedBy ? {
                        _id: item.decision.confirmedBy._id,
                        fullName: item.decision.confirmedBy.fullName,
                        email: item.decision.confirmedBy.email,
                    } : null,
                    rejectedAt: item.decision?.rejectedAt ? toVNISO(item.decision.rejectedAt) : null,
                    rejectedBy: item.decision?.rejectedBy ? {
                        _id: item.decision.rejectedBy._id,
                        fullName: item.decision.rejectedBy.fullName,
                        email: item.decision.rejectedBy.email,
                    } : null,
                    rejectReason: item.decision?.rejectReason || null,
                },
            }));

            return res.status(200).json({
                message: 'Get customer appointments successfully',
                total: data.length,
                data,
            });
        } catch (error) {
            console.error('Error getting customer appointments:', error);
            return res.status(500).json({ message: error.message });
        }
    },


}

module.exports = appointmentController;
