const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const conversationController = require("../controllers/conversationController");

let ioInstance = null;

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        "https://gental-care-dental-1.onrender.com",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error"));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id: decoded.userId || decoded.id,
        role: decoded.role,
        fullName: decoded.fullName || decoded.name,
      };
      if (!socket.user.id) {
        return next(new Error("Authentication error"));
      }
      next();
    } catch (err) {
      return next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    // Join appointment room based on user role
    socket.on("joinAppointmentRoom", () => {
      const userRole = socket.user.role;
      const userId = socket.user.id;
      
      // Admin and Staff join general appointment room
      if (userRole === 'Admin' || userRole === 'Staff') {
        socket.join('appointments:all');
      }
      // Dentist joins their own appointment room
      if (userRole === 'Dentist') {
        socket.join(`appointments:dentist:${userId}`);
      }
      // Customer joins their own appointment room
      if (userRole === 'Customer') {
        socket.join(`appointments:customer:${userId}`);
      }
    });

    socket.on("leaveAppointmentRoom", () => {
      socket.leave('appointments:all');
      socket.leave(`appointments:dentist:${socket.user.id}`);
      socket.leave(`appointments:customer:${socket.user.id}`);
    });

    // Join medical record room based on user role
    socket.on("joinMedicalRecordRoom", () => {
      const userRole = socket.user.role;
      const userId = socket.user.id;
      
      // Admin and Staff join general medical record room
      if (userRole === 'Admin' || userRole === 'Staff') {
        socket.join('medicalRecords:all');
      }
      // Dentist joins their own medical record room
      if (userRole === 'Dentist') {
        socket.join(`medicalRecords:dentist:${userId}`);
      }
      // Customer joins their own medical record room
      if (userRole === 'Customer') {
        socket.join(`medicalRecords:customer:${userId}`);
      }
    });

    socket.on("leaveMedicalRecordRoom", () => {
      socket.leave('medicalRecords:all');
      socket.leave(`medicalRecords:dentist:${socket.user.id}`);
      socket.leave(`medicalRecords:customer:${socket.user.id}`);
    });

    // Join bill room based on user role
    socket.on("joinBillRoom", () => {
      const userRole = socket.user.role;
      const userId = socket.user.id;
      
      // Admin and Staff join general bill room
      if (userRole === 'Admin' || userRole === 'Staff') {
        socket.join('bills:all');
      }
      // Customer joins their own bill room
      if (userRole === 'Customer') {
        socket.join(`bills:customer:${userId}`);
      }
    });

    socket.on("leaveBillRoom", () => {
      socket.leave('bills:all');
      socket.leave(`bills:customer:${socket.user.id}`);
    });

    // Join notification room for user
    socket.on("joinNotificationRoom", () => {
      const userId = socket.user.id;
      socket.join(`user:${userId}`);
    });

    socket.on("leaveNotificationRoom", () => {
      socket.leave(`user:${socket.user.id}`);
    });

    socket.on("joinConversation", (conversationId) => {
      if (!conversationId) return;
      socket.join(String(conversationId));
    });

    socket.on("leaveConversation", (conversationId) => {
      if (!conversationId) return;
      socket.leave(String(conversationId));
    });

    socket.on("sendMessage", async ({ conversationId, content }) => {
      try {
        if (!conversationId || !content) return;

        const newMsg = new Message({
          conversation: conversationId,
          sender: socket.user.id,
          content,
        });

        const saved = await newMsg.save();

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: content,
          lastSender: socket.user.id,
          updatedAt: Date.now(),
        });
        const populatedMsg = await Message.findById(saved._id)
          .populate("sender", "_id fullName name avatar role");
        io.to(String(conversationId)).emit("newMessage", populatedMsg);
        try {
          conversationController.emitConversationUpdate(conversationId);
        } catch (e) {
          console.error("emitConversationUpdate error:", e);
        }
      } catch (err) {
        console.error("Socket sendMessage error:", err);
      }
    });

    socket.on("disconnect", () => {
    });
  });

  ioInstance = io;
  return io;
}

// Helper function to emit appointment updates
function emitAppointmentUpdate(appointment, eventType) {
  if (!ioInstance) return;
  
  const appointmentData = {
    appointment,
    eventType, // 'created', 'updated', 'deleted', 'confirmed', 'rejected'
    timestamp: new Date()
  };

  // Emit to all admins and staff
  ioInstance.to('appointments:all').emit('appointmentUpdate', appointmentData);
  
  // Emit to specific dentist
  if (appointment.dentistId) {
    ioInstance.to(`appointments:dentist:${appointment.dentistId}`).emit('appointmentUpdate', appointmentData);
  }
  
  // Emit to specific customer
  if (appointment.customerId) {
    ioInstance.to(`appointments:customer:${appointment.customerId}`).emit('appointmentUpdate', appointmentData);
  }
}

// Helper function to emit medical record updates
function emitMedicalRecordUpdate(medicalRecord, eventType) {
  if (!ioInstance) return;
  
  const medicalRecordData = {
    medicalRecord,
    eventType, // 'created', 'updated', 'completed', 'cancelled'
    timestamp: new Date()
  };

  // Emit to all admins and staff
  ioInstance.to('medicalRecords:all').emit('medicalRecordUpdate', medicalRecordData);
  
  // Emit to specific dentist
  if (medicalRecord.dentistId) {
    const dentistId = medicalRecord.dentistId._id || medicalRecord.dentistId;
    ioInstance.to(`medicalRecords:dentist:${dentistId}`).emit('medicalRecordUpdate', medicalRecordData);
  }
  
  // Emit to specific customer
  if (medicalRecord.customerId) {
    const customerId = medicalRecord.customerId._id || medicalRecord.customerId;
    ioInstance.to(`medicalRecords:customer:${customerId}`).emit('medicalRecordUpdate', medicalRecordData);
  }
}

// Helper function to emit bill updates
function emitBillUpdate(bill, eventType) {
  if (!ioInstance) return;
  
  const billData = {
    bill,
    eventType, // 'created', 'updated', 'paid', 'cancelled'
    timestamp: new Date()
  };

  // Emit to all admins and staff
  ioInstance.to('bills:all').emit('billUpdate', billData);
  
  // Emit to specific customer
  if (bill.customerId) {
    const customerId = bill.customerId._id || bill.customerId;
    ioInstance.to(`bills:customer:${customerId}`).emit('billUpdate', billData);
  }
}

module.exports = initSocket;
module.exports.getIo = () => ioInstance;
module.exports.emitAppointmentUpdate = emitAppointmentUpdate;
module.exports.emitMedicalRecordUpdate = emitMedicalRecordUpdate;
module.exports.emitBillUpdate = emitBillUpdate;
