const Conversation = require("../models/Conversation");
const User = require("../models/User");
const Message = require("../models/Message");

const conversationController = {
  createConversation: async (customerId) => {
    try {
      const staffList = await User.find({ role: "Staff" }, "_id");

      const newConv = new Conversation({
        customerId,
        staffIds: staffList.map((s) => s._id),
      });

      await newConv.save();
      return newConv;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      throw new Error("Could not create conversation");
    }
  },

  getCustomerConversation: async (req, res) => {
    try {
      const customerId = req.user.id;
      const conv = await Conversation.findOne({ customerId }).populate(
        "staffIds",
        "name email"
      );

      if (!conv) {
        return res.status(404).json({ message: "No conversation found" });
      }

      res.status(200).json({ conversation: conv });
    } catch (error) {
      console.error("Failed to get conversation:", error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching conversation", error });
    }
  },

  getAllConversationsForStaff: async (req, res) => {
    try {
      const convs = await Conversation.find()
        .populate("customerId", "fullName email avatar")
        .populate("lastSender", "fullName")
        .sort({ updatedAt: -1 });

      // Tính unreadCount cho từng conversation
      const conversationsWithUnread = await Promise.all(
        convs.map(async (c) => {
          const customerId = c.customerId?._id || c.customerId;
          const unreadCount = await Message.countDocuments({
            conversation: c._id,
            isRead: false,
            sender: customerId
          });

          return {
            _id: c._id,
            customerName: c.customerId?.fullName || "",
            customerAvatar: c.customerId?.avatar || "",
            lastMessage: c.lastMessage || "",
            lastMessageSender: c.lastSender?._id || null,
            unreadCount: unreadCount,
            updatedAt: c.updatedAt,
          };
        })
      );

      res.status(200).json({ conversations: conversationsWithUnread });
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      res
        .status(500)
        .json({ message: "An error occurred while fetching conversations", error });
    }
  },

  emitConversationUpdate: async (conversationId) => {
    try {
      const updatedConv = await Conversation.findById(conversationId)
        .populate("customerId", "fullName email avatar")
        .populate("lastSender", "fullName");

      if (updatedConv) {
        const customerId = updatedConv.customerId?._id || updatedConv.customerId;
        const unreadCount = await Message.countDocuments({
          conversation: conversationId,
          isRead: false,
          sender: customerId
        });

        const updatedConversation = {
          _id: updatedConv._id,
          customerName: updatedConv.customerId?.fullName || "",
          customerAvatar: updatedConv.customerId?.avatar || "",
          lastMessage: updatedConv.lastMessage || "",
          lastMessageSender: updatedConv.lastSender?._id || null,
          unreadCount: unreadCount,
          updatedAt: updatedConv.updatedAt,
        };

        const { getIo } = require("../config/socket");
        const io = getIo();
        if (io) {
          io.emit("conversationUpdate", updatedConversation);
        }
      }
    } catch (error) {
      console.error("Failed to emit conversation update:", error);
    }
  },

  deleteConversation: async (req, res) => {
    try {
      const { conversationId } = req.params;

      const conv = await Conversation.findByIdAndDelete(conversationId);

      if (!conv) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      await Message.deleteMany({ conversation: conversationId });

      res.status(200).json({ message: "Conversation and messages deleted successfully" });
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      res
        .status(500)
        .json({ message: "An error occurred while deleting conversation", error });
    }
  },
};

module.exports = conversationController;