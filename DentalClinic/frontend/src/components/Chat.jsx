import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import { io } from "socket.io-client";
import axios from "axios";
import styles from "./Chat.module.css";

function Chat({ isOpen, onToggle, isOtherOpen }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto scroll xuống cuối khi có message mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Kết nối socket khi mở chat
  useEffect(() => {
    if (isOpen) {
      const newSocket = io("http://localhost:5000", {
        auth: {
          token: localStorage.getItem("token"), // JWT token
        },
      });

      setSocket(newSocket);

      // Join conversation khi đã biết conversationId
      if (conversationId) {
        newSocket.emit("joinConversation", conversationId);
      }

      // Nhận message realtime (chống trùng lặp theo _id)
      newSocket.on("newMessage", (msg) => {
        setMessages((prev) => (prev.some((m) => m._id === msg._id) ? prev : [...prev, msg]));
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isOpen, conversationId]);

  // Khi mở chat lần đầu → lấy conversation & messages
  useEffect(() => {
    if (isOpen) {
      axios
        .get("http://localhost:5000/conversation/my-conversation", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        .then((res) => {
          if (res.data.conversation) {
            setConversationId(res.data.conversation._id);

            // lấy toàn bộ messages
            return axios.get(
              `http://localhost:5000/message/conversation/${res.data.conversation._id}`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );
          }
        })
        .then((res) => {
          if (res?.data?.messages) {
            setMessages(res.data.messages);
          }
        })
        .catch((err) => {
          console.error("Error fetching conversation:", err);
        });
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    try {
      const res = await axios.post(
        "http://localhost:5000/message/send-message",
        { content: input, conversationId },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      const newMsg = res.data.data;
      setMessages((prev) => (prev.some((m) => m._id === newMsg._id) ? prev : [...prev, newMsg]));
      setInput("");

      // Sau khi có conversation mới thì join vào socket room
      if (!conversationId) {
        setConversationId(res.data.conversationId);
        socket?.emit("joinConversation", res.data.conversationId);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className={styles.messengerContainer}>
      <div
        className={`${styles.chatWindow} ${
          isOpen ? styles.chatWindowOpen : ""
        }`}
      >
        <div className={styles.chatHeader}>
          <h3 className={styles.chatTitle}>Gentle Care Dental</h3>
          <button className={styles.closeButton} onClick={onToggle}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.chatBody}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`${styles.message}
                ${msg.sender._id === (JSON.parse(atob(localStorage.getItem("token").split(".")[1])).userId || JSON.parse(atob(localStorage.getItem("token").split(".")[1])).id)
                  ? styles.myMessage
                  : styles.theirMessage
              }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.chatInputWrapper}>
          <input
            type="text"
            className={styles.chatInput}
            placeholder="Enter your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button className={styles.sendButton} onClick={handleSend}>
            Send
          </button>
        </div>
      </div>

      {/* Messenger Button */}
      {!isOpen && !isOtherOpen && (
        <button
          className={`${styles.messengerButton} ${styles.pulse}`}
          onClick={onToggle}
          aria-label="Open Messenger"
        >
          <MessageCircle size={24} />
        </button>
      )}
    </div>
  );
}

export default Chat;
