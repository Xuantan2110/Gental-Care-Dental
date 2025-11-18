const DentistWorkingTime = require('../models/DentistWorkingTime');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const mongoose = require("mongoose");

const VN_OFFSET_MIN = 7 * 60;
const MS_PER_MIN = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function vnDateOnlyToUTC(dateStr) {
  const d = String(dateStr).slice(0, 10);
  return new Date(`${d}T00:00:00.000+07:00`);
}

function startOfTodayVN_UTC() {
  const now = new Date();
  const nowVN = new Date(now.getTime() + VN_OFFSET_MIN * MS_PER_MIN);
  nowVN.setHours(0, 0, 0, 0);
  return new Date(nowVN.getTime() - VN_OFFSET_MIN * MS_PER_MIN);
}

function startOfTomorrowVN_UTC() {
  const t0 = startOfTodayVN_UTC();
  return new Date(t0.getTime() + MS_PER_DAY);
}

function minutesOfDayInVN(dateObj) {
  const ms = (dateObj.getTime() + VN_OFFSET_MIN * MS_PER_MIN) % MS_PER_DAY;
  return Math.floor((ms + MS_PER_DAY) % MS_PER_DAY / MS_PER_MIN);
}

function toMinutesHHMM(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(m) {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, "0")}:${mm.toString().padStart(2, "0")}`;
}


function vnDayOfWeek1to7(dateStr) {
  const dow0 = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return dow0 === 0 ? 1 : dow0 + 1;
}

const dentistWorkingTimeController = {
  createDentistWorkingTime: async (req, res) => {
    try {
      const { dentistId, date, morning, afternoon, isClosed, isFixed, workingDays } = req.body;

      if (!dentistId) {
        return res.status(400).json({ message: "Dentist is required, please choose a dentist" });
      }
      if (!mongoose.Types.ObjectId.isValid(dentistId)) {
        return res.status(400).json({ message: "Invalid dentist ID format" });
      }

      const dentist = await User.findById(dentistId);
      if (!dentist || dentist.role !== "Dentist") {
        return res.status(404).json({ message: "Dentist not found" });
      }

      // Helpers...
      const timeToMinutes = (t) => {
        if (typeof t !== 'string') return NaN;
        const parts = t.split(':');
        if (parts.length !== 2) return NaN;
        const hh = parseInt(parts[0], 10);
        const mm = parseInt(parts[1], 10);
        if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;
        return hh * 60 + mm;
      };

      const isValidShift = (start, end, min, max) => {
        const s = timeToMinutes(start);
        const e = timeToMinutes(end);
        const mn = timeToMinutes(min);
        const mx = timeToMinutes(max);
        if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(mn) || Number.isNaN(mx)) return false;
        return s >= mn && e <= mx && s < e;
      };

      const validateShifts = () => {
        if (isClosed) {
          if ((morning?.startTime && morning?.endTime) || (afternoon?.startTime && afternoon?.endTime)) {
            return "Closed day should not have morning or afternoon sessions";
          }
          return null;
        }

        const hasMorning = !!(morning?.startTime || morning?.endTime);
        const hasAfternoon = !!(afternoon?.startTime || afternoon?.endTime);
        if (!hasMorning && !hasAfternoon) {
          return "At least one shift (morning or afternoon) is required";
        }

        if (hasMorning) {
          if (!morning?.startTime || !morning?.endTime) {
            return "Both start time and end time are required for morning shift";
          }
          if (!isValidShift(morning.startTime, morning.endTime, "06:00", "12:00")) {
            return "Morning shift must be between 06:00 and 12:00, and start < end";
          }
        }

        if (hasAfternoon) {
          if (!afternoon?.startTime || !afternoon?.endTime) {
            return "Both start time and end time are required for afternoon shift";
          }
          if (!isValidShift(afternoon.startTime, afternoon.endTime, "12:00", "21:00")) {
            return "Afternoon shift must be between 12:00 and 21:00, and start < end";
          }
        }

        return null;
      };

      // CASE: fixed schedule (isFixed = true)
      if (isFixed) {
        const existingFixed = await DentistWorkingTime.findOne({ dentistId, isFixed: true });
        if (existingFixed) {
          return res.status(400).json({ message: "Dentist already has a fixed working schedule" });
        }

        const shiftError = validateShifts();
        if (shiftError) return res.status(400).json({ message: shiftError });

        if (!Array.isArray(workingDays) || workingDays.length === 0) {
          return res.status(400).json({ message: "Working days are required for fixed schedule" });
        }
        const invalidDay = workingDays.find(d => d < 1 || d > 7);
        if (invalidDay) {
          return res.status(400).json({ message: "Working days must be between 1 (Sunday) and 7 (Saturday)" });
        }

        const newWorkingTime = new DentistWorkingTime({
          dentistId,
          date: null,
          morning: morning || { startTime: "", endTime: "" },
          afternoon: afternoon || { startTime: "", endTime: "" },
          isClosed: !!isClosed,
          isFixed: true,
          workingDays
        });

        await newWorkingTime.save();
        return res.status(201).json({
          message: "Create fixed dentist working time successfully",
          data: newWorkingTime
        });
      }

      // CASE: special schedule (isFixed = false) => date required
      if (!date) {
        return res.status(400).json({ message: "Date is required for special schedule" });
      }

      const inputDate = typeof date === 'string'
        ? vnDateOnlyToUTC(date.slice(0, 10))
        : vnDateOnlyToUTC(new Date(date).toISOString().slice(0, 10));

      const tomorrowVN = startOfTomorrowVN_UTC();

      if (inputDate < tomorrowVN) {
        return res.status(400).json({ message: "Date must be from tomorrow onwards (VN time)" });
      }

      const existingSameDay = await DentistWorkingTime.findOne({ dentistId, date: inputDate });
      if (existingSameDay) {
        return res.status(400).json({ message: "Working time already exists for this date" });
      }

      const shiftError = validateShifts();
      if (shiftError) return res.status(400).json({ message: shiftError });

      const newWorkingTime = new DentistWorkingTime({
        dentistId,
        date: inputDate,
        morning: morning || { startTime: "", endTime: "" },
        afternoon: afternoon || { startTime: "", endTime: "" },
        isClosed: !!isClosed,
        isFixed: false,
        workingDays: []
      });

      await newWorkingTime.save();
      return res.status(201).json({
        message: "Create special dentist working time successfully",
        data: newWorkingTime
      });

    } catch (error) {
      console.error("Error creating working time:", error);
      res.status(500).json({ message: error.message });
    }
  },



  deleteDentistWorkingTime: async (req, res) => {
    try {
      const deleted = await DentistWorkingTime.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Working time not found" });
      }
      res.status(200).json({ message: "Deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getAllDentistWorkingTime: async (req, res) => {
    try {
      const workingTimes = await DentistWorkingTime.find()
        .populate("dentistId", "fullName email");

      const fixedWorkingTime = workingTimes.filter(item => item.isFixed === true);
      const specialWorkingTime = workingTimes.filter(item => item.isFixed === false);

      res.status(200).json({
        message: "Get dentits working time successfully",
        data: {
          fixedWorkingTime,
          specialWorkingTime
        }
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getDentistWorkingTimeById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const workingTime = await DentistWorkingTime.findById(id)
        .populate("dentistId", "fullName email");

      if (!workingTime) {
        return res.status(404).json({ message: "Working time not found" });
      }

      res.status(200).json({
        message: "Get dentist working time successfully",
        data: workingTime,
      });
    } catch (error) {
      console.error("Error fetching working time by id:", error);
      res.status(500).json({ message: error.message });
    }
  },

  updateDentistWorkingTime: async (req, res) => {
    try {
      const { dentistId, date, morning, afternoon, isClosed, isFixed, workingDays } = req.body;
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid working time ID format" });
      }

      if (!dentistId) {
        return res.status(400).json({ message: "Dentist is required, please choose a dentist" });
      }
      if (!mongoose.Types.ObjectId.isValid(dentistId)) {
        return res.status(400).json({ message: "Invalid dentist ID format" });
      }

      const dentist = await User.findById(dentistId);
      if (!dentist || dentist.role !== "Dentist") {
        return res.status(404).json({ message: "Dentist not found" });
      }

      // ------------------------
      // Helpers for time checks
      // ------------------------
      const timeToMinutes = (t) => {
        if (typeof t !== 'string') return NaN;
        const parts = t.split(':');
        if (parts.length !== 2) return NaN;
        const hh = parseInt(parts[0], 10);
        const mm = parseInt(parts[1], 10);
        if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;
        return hh * 60 + mm;
      };

      const isValidShift = (start, end, min, max) => {
        const s = timeToMinutes(start);
        const e = timeToMinutes(end);
        const mn = timeToMinutes(min);
        const mx = timeToMinutes(max);
        if (Number.isNaN(s) || Number.isNaN(e) || Number.isNaN(mn) || Number.isNaN(mx)) return false;
        return s >= mn && e <= mx && s < e;
      };

      const validateShifts = () => {
        if (isClosed) {
          if ((morning?.startTime && morning?.endTime) || (afternoon?.startTime && afternoon?.endTime)) {
            return "Closed day should not have morning or afternoon sessions";
          }
          return null;
        }

        const hasMorning = !!(morning?.startTime || morning?.endTime);
        const hasAfternoon = !!(afternoon?.startTime || afternoon?.endTime);
        if (!hasMorning && !hasAfternoon) {
          return "At least one shift (morning or afternoon) is required";
        }

        if (hasMorning) {
          if (!morning?.startTime || !morning?.endTime) {
            return "Both start time and end time are required for morning shift";
          }
          if (!isValidShift(morning.startTime, morning.endTime, "06:00", "12:00")) {
            return "Morning shift must be between 06:00 and 12:00, and start < end";
          }
        }

        if (hasAfternoon) {
          if (!afternoon?.startTime || !afternoon?.endTime) {
            return "Both start time and end time are required for afternoon shift";
          }
          if (!isValidShift(afternoon.startTime, afternoon.endTime, "12:00", "21:00")) {
            return "Afternoon shift must be between 12:00 and 21:00, and start < end";
          }
        }

        return null;
      };

      // ------------------------
      // Build update object & validations per case
      // ------------------------
      let updateData = {
        dentistId,
        morning: morning || { startTime: "", endTime: "" },
        afternoon: afternoon || { startTime: "", endTime: "" },
        isClosed: !!isClosed,
        isFixed: !!isFixed
      };

      // CASE: fixed schedule (isFixed = true) => date must be null
      if (isFixed) {
        const existingFixed = await DentistWorkingTime.findOne({
          dentistId,
          isFixed: true,
          _id: { $ne: id }
        });
        if (existingFixed) {
          return res.status(400).json({ message: "Dentist already has a fixed working schedule" });
        }

        const shiftError = validateShifts();
        if (shiftError) return res.status(400).json({ message: shiftError });

        if (!Array.isArray(workingDays) || workingDays.length === 0) {
          return res.status(400).json({ message: "Working days are required for fixed schedule" });
        }
        const invalidDay = workingDays.find(d => d < 1 || d > 7);
        if (invalidDay) {
          return res.status(400).json({ message: "Working days must be between 1 (Sunday) and 7 (Saturday)" });
        }

        updateData.date = null;
        updateData.isFixed = true;
        updateData.workingDays = workingDays;
      } else {
        // CASE: special schedule => date required and must be >= tomorrow (VN time)
        if (!date) {
          return res.status(400).json({ message: "Date is required for special schedule" });
        }

        const inputDate = typeof date === 'string'
          ? vnDateOnlyToUTC(date.slice(0, 10))
          : vnDateOnlyToUTC(new Date(date).toISOString().slice(0, 10));

        const tomorrowVN = startOfTomorrowVN_UTC();

        if (inputDate < tomorrowVN) {
          return res.status(400).json({ message: "Date must be from tomorrow onwards (VN time)" });
        }

        const existingSameDay = await DentistWorkingTime.findOne({
          dentistId,
          date: inputDate,
          _id: { $ne: id }
        });
        if (existingSameDay) {
          return res.status(400).json({ message: "Working time already exists for this date" });
        }

        const shiftError = validateShifts();
        if (shiftError) return res.status(400).json({ message: shiftError });

        updateData.date = inputDate;
        updateData.isFixed = false;
        updateData.workingDays = [];
      }

      const updated = await DentistWorkingTime.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      ).populate("dentistId", "fullName email");

      if (!updated) {
        return res.status(404).json({ message: "Working time not found" });
      }

      return res.status(200).json({
        message: "Update dentist working time successfully",
        data: updated
      });
    } catch (error) {
      console.error("Error updating working time:", error);
      return res.status(500).json({ message: error.message });
    }
  },

  getDentistDaysOff: async (req, res) => {
    try {
      const { dentistId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(dentistId)) {
        return res.status(400).json({ message: "Invalid dentist ID format" });
      }

      const fixed = await DentistWorkingTime.findOne({ dentistId, isFixed: true });

      const specials = await DentistWorkingTime.find({ dentistId, isFixed: false });

      let daysOff = [];

      if (fixed) {
        const allDays = [1, 2, 3, 4, 5, 6, 7];
        const offDays = allDays.filter(d => !fixed.workingDays.includes(d));
        daysOff.push(...offDays.map(d => ({ dayOfWeek: d })));
      }

      specials.forEach(s => {
        if (s.isClosed) {
          daysOff.push({ date: s.date });
        }
      });

      return res.status(200).json({
        message: "Get dentist days off successfully",
        dentistId,
        daysOff
      });

    } catch (error) {
      console.error("Error getting dentist days off:", error);
      return res.status(500).json({ message: error.message });
    }
  },

  getDentistFreeTimeRanges: async (req, res) => {
    try {
      const { dentistId } = req.params;
      const { date } = req.body; // EXPECT: "YYYY-MM-DD" (chuỗi)

      if (!mongoose.Types.ObjectId.isValid(dentistId)) {
        return res.status(400).json({ message: "Invalid dentist ID" });
      }
      if (!date || typeof date !== "string") {
        return res.status(400).json({ message: "Date (YYYY-MM-DD) is required" });
      }

      // Chuẩn hóa "ngày" theo VN -> mốc 00:00 VN (UTC)
      const targetDate = vnDateOnlyToUTC(date);

      // 1) Ưu tiên lịch đặc biệt của đúng ngày
      let workingTime = await DentistWorkingTime.findOne({ dentistId, isFixed: false, date: targetDate });

      // 2) Nếu không có, dùng lịch cố định nếu ngày đó thuộc workingDays
      if (!workingTime) {
        const fixed = await DentistWorkingTime.findOne({ dentistId, isFixed: true });
        if (!fixed) {
          return res.status(404).json({ message: "No working time found" });
        }
        const dow = vnDayOfWeek1to7(date); // 1..7
        // Nếu ngày này KHÔNG thuộc workingDays => nghỉ
        if (!Array.isArray(fixed.workingDays) || !fixed.workingDays.includes(dow)) {
          return res.status(200).json({
            message: "Get free time ranges successfully",
            dentistId,
            date: date,
            freeTime: []
          });
        }
        workingTime = fixed;
      }

      // Nếu đánh dấu đóng cửa => không có slot trống
      if (workingTime.isClosed) {
        return res.status(200).json({
          message: "Get free time ranges successfully",
          dentistId,
          date: date,
          freeTime: []
        });
      }

      // Lấy các lịch hẹn của ngày đó
      const appointments = await Appointment.find({ dentistId, date: targetDate });

      // Chuẩn hóa booked intervals (phút trong ngày theo VN)
      const booked = appointments.map(app => ({
        start: minutesOfDayInVN(app.startTime),
        end: minutesOfDayInVN(app.endTime),
      }))
        .filter(b => b.end > b.start)           // loại bỏ dữ liệu xấu
        .sort((a, b) => a.start - b.start);

      // Merge overlap của toàn bộ booked trong ngày (đơn giản hóa)
      const merged = [];
      for (const b of booked) {
        if (!merged.length || b.start > merged[merged.length - 1].end) {
          merged.push({ ...b });
        } else {
          merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, b.end);
        }
      }

      // Hàm cắt khoảng trống trong một ca
      const freeInShift = (shift) => {
        if (!shift?.startTime || !shift?.endTime) return [];
        const S = toMinutesHHMM(shift.startTime);
        const E = toMinutesHHMM(shift.endTime);
        if (!(S < E)) return [];

        // Cắt các booked vào [S,E]
        const clipped = [];
        for (const b of merged) {
          const s = Math.max(b.start, S);
          const e = Math.min(b.end, E);
          if (e > s) clipped.push({ start: s, end: e });
          if (b.start >= E) break; // tối ưu: vì merged đã sort
        }

        // Tạo khoảng trống từ [S,E] loại trừ clipped
        const free = [];
        let cursor = S;
        for (const c of clipped) {
          if (c.start > cursor) free.push({ start: cursor, end: c.start });
          cursor = Math.max(cursor, c.end);
        }
        if (cursor < E) free.push({ start: cursor, end: E });

        // Đổi sang "HH:mm"
        return free.map(r => ({ start: toHHMM(r.start), end: toHHMM(r.end) }));
      };

      const freeTime = [
        ...freeInShift(workingTime.morning),
        ...freeInShift(workingTime.afternoon),
      ];

      return res.status(200).json({
        message: "Get free time ranges successfully",
        dentistId,
        date,
        freeTime
      });

    } catch (error) {
      console.error("Error getting free time ranges:", error);
      return res.status(500).json({ message: error.message });
    }
  },

};

module.exports = dentistWorkingTimeController;
