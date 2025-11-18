import React, { useState, useEffect, useRef } from 'react';
import { Bot, X } from 'lucide-react';
import axios from 'axios';
import styles from './ChatBot.module.css';

function ChatBot({ isOpen, onToggle, isOtherOpen }) {
  const [isHovered, setIsHovered] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! I am AI Assistant" },
    { sender: "bot", text: "I can answer your dental questions, ask me now." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { sender: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("https://gental-care-dental.onrender.com/chatbot/chat", {
        message: input
      });

      const botMessage = { sender: "bot", text: res.data.reply || "Sorry, I cannot respond now." };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { sender: "bot", text: "⚠️ Error connecting to server." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className={styles.chatBotContainer}>
      {/* Chat Window */}
      <div className={`${styles.chatWindow} ${isOpen ? styles.chatWindowOpen : ''}`}>
        <div className={styles.chatHeader}>
          <h3 className={styles.chatTitle}>
            <Bot size={20} /> AI Assistant
          </h3>
          <button className={styles.closeButton} onClick={onToggle}>
            <X size={20} />
          </button>
        </div>

        {/* Chat Body */}
        <div className={styles.chatBody}>
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`${styles.message} ${msg.sender === "user" ? styles.userMessage : styles.botMessage}`}
            >
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className={`${styles.message} ${styles.typingIndicator}`}>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
              <div className={styles.dot}></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className={styles.chatInputWrapper}>
          <input
            type="text"
            className={styles.chatInput}
            placeholder="Enter your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={loading}
          />
          <button
            className={styles.sendButton}
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>

      {/* ChatBot Button */}
      {!isOpen && !isOtherOpen && (
        <button
          className={`${styles.chatBotButton} ${styles.pulse} ${isHovered ? styles.chatBotButtonHover : ''}`}
          onClick={onToggle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label="Open ChatBot">
          <Bot size={24} />
        </button>
      )}
    </div>
  );
}

export default ChatBot;