// controllers/messageController.js
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const conversationController = require("./conversationController");
const { getIo } = require("../config/socket");

const messageController = {
  sendMessage: async (req, res) => {
    try {
      const { content } = req.body;
      const sender = req.user.id;
      let { conversationId } = req.body;

      if (!conversationId) {
        if (req.user.role !== "Customer") {
          return res.status(400).json({ message: "Staff must specify conversationId" });
        }
        const newConv = await conversationController.createConversation(sender);
        conversationId = newConv._id;
      }

      const conv = await Conversation.findById(conversationId);
      if (!conv) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      if (
        req.user.role === "Customer" &&
        conv.customerId.toString() !== sender
      ) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const newMsg = new Message({
        conversation: conversationId,
        sender,
        content,
      });

      const saved = await newMsg.save();

      conv.lastMessage = content;
      conv.lastSender = sender;
      conv.updatedAt = Date.now();
      await conv.save();
      const populatedMsg = await Message.findById(saved._id)
        .populate("sender", "_id fullName avatar role");
      try {
        const io = getIo();
        if (io) {
          io.to(conversationId.toString()).emit("newMessage", populatedMsg);

          conversationController.emitConversationUpdate(conversationId);
        }
      } catch (emitErr) {
        console.error("Socket emit error:", emitErr);
      }

      res.status(201).json({
        message: "Message sent successfully",
        data: populatedMsg,
        conversationId: conv._id,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      res
        .status(500)
        .json({ message: "An error occurred while sending message", error });
    }
  },

  getMessagesByConversation: async (req, res) => {
    try {
      const { id } = req.params;
      const msgs = await Message.find({ conversation: id })
        .sort({ createdAt: 1 })
        .populate("sender", "_id fullName avatar role");

      res.status(200).json({ messages: msgs });
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching messages", error });
    }
  },

  markMessagesAsRead: async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;

      await Message.updateMany(
        {
          conversation: conversationId,
          sender: { $ne: userId },
          isRead: false
        },
        { isRead: true }
      );

      conversationController.emitConversationUpdate(conversationId);
      
      res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read", error });
    }
  },
};

module.exports = messageController;
