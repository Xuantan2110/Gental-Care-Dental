import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Phone, Video, MoreVertical, Paperclip, Send } from 'lucide-react';
import { io } from 'socket.io-client';
import styles from './Messenger.module.css';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import Animation from '../assets/Animation.mp4';

const Messenger = () => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const selectedChatRef = useRef(selectedChat);

  const getCurrentUserId = () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.userId || payload.id;
    } catch (err) {
      console.error('Error parsing token:', err);
      return null;
    }
  };

  const myId = getCurrentUserId();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get("https://gental-care-dental.onrender.com/conversation/all-conversation", {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const conversations = res.data.conversations || [];
        const enhanced = conversations.map(c => ({
          ...c,
          lastMessageTime: c.lastMessageCreatedAt || c.lastMessage?.createdAt || c.updatedAt
        }));

        setContacts(enhanced);
      } catch (err) {
        console.error("Failed to load conversations:", err);
      }
    };
    fetchConversations();
  }, []);

  const fetchMessages = useCallback(async (conversationId) => {
    try {
      const res = await axios.get(`https://gental-care-dental.onrender.com/message/conversation/${conversationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  }, []);

  const markMessagesAsRead = useCallback(async (conversationId) => {
    if (!conversationId) return;
    try {
      await axios.put(`https://gental-care-dental.onrender.com/message/mark-read/${conversationId}`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setContacts(prev =>
        prev.map(c =>
          String(c._id) === String(conversationId)
            ? { ...c, unreadCount: 0 }
            : c
        )
      );

      setMessages(prev =>
        prev.map(m =>
          String(m.sender?._id) !== String(myId)
            ? { ...m, isRead: true }
            : m
        )
      );
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  }, [myId]);


  const handleSendMessage = async () => {
    if (messageInput.trim() && selectedChat) {
      try {
        await axios.post("https://gental-care-dental.onrender.com/message/send-message", {
          content: messageInput,
          conversationId: selectedChat,
        }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setMessageInput('');
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    }
  };

  const handleContactClick = (contactId) => {
    setSelectedChat(contactId);
  };

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io("https://gental-care-dental.onrender.com", {
        auth: { token: localStorage.getItem("token") },
      });
    }
    const socket = socketRef.current;

    const onNewMessage = (newMessage) => {
      if (String(newMessage.conversation) === String(selectedChatRef.current)) {
        setMessages(prev =>
          prev.some(m => m._id === newMessage._id) ? prev : [...prev, newMessage]
        );

        setContacts(prevContacts =>
          prevContacts.map(contact =>
            String(contact._id) === String(newMessage.conversation)
              ? {
                ...contact,
                unreadCount: 0,
                lastMessage: newMessage.content || newMessage.text,
                lastMessageSender: newMessage.sender?._id,
                lastMessageTime: newMessage.createdAt || contact.lastMessageTime
              }
              : contact
          )
        );

        markMessagesAsRead(selectedChatRef.current);
      } else {
        setContacts(prevContacts => {
          const found = prevContacts.find(c => String(c._id) === String(newMessage.conversation));
          if (found) {
            return prevContacts.map(c =>
              String(c._id) === String(newMessage.conversation)
                ? {
                  ...c,
                  unreadCount: (c.unreadCount || 0) + 1,
                  lastMessage: newMessage.content || newMessage.text,
                  lastMessageSender: newMessage.sender?._id,
                  lastMessageTime: newMessage.createdAt || c.lastMessageTime
                }
                : c
            ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          } else {
            const preview = {
              _id: newMessage.conversation,
              customerName: '',
              customerAvatar: '',
              lastMessage: newMessage.content || newMessage.text,
              lastMessageSender: newMessage.sender?._id || null,
              lastMessageTime: newMessage.createdAt,
              unreadCount: 1,
              updatedAt: new Date().toISOString(),
            };
            return [preview, ...prevContacts];
          }
        });
      }
    };

    const onConversationUpdate = (updatedConversation) => {
      setContacts(prevContacts => {
        const updatedContacts = prevContacts.map(contact =>
          String(contact._id) === String(updatedConversation._id)
            ? { ...contact, ...updatedConversation }
            : contact
        );

        if (!updatedContacts.find(c => String(c._id) === String(updatedConversation._id))) {
          updatedContacts.unshift(updatedConversation);
        }

        return updatedContacts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      });
    };


    socket.on("newMessage", onNewMessage);
    socket.on("conversationUpdate", onConversationUpdate);

    return () => {
      if (socket) {
        socket.off("newMessage", onNewMessage);
        socket.off("conversationUpdate", onConversationUpdate);
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedChat) {
      const socket = socketRef.current;
      if (socket) {
        socket.emit("joinConversation", selectedChat);
      }
      fetchMessages(selectedChat);
      markMessagesAsRead(selectedChat);
    }
  }, [selectedChat, fetchMessages, markMessagesAsRead]);

  return (
    <div className={styles.messenger}>
      <Sidebar />
      <div className={styles.chatContainer}>
        {/* Sidebar contacts */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Messenger</h2>
          </div>

          <div className={styles.searchContainer}>
            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input type="text" placeholder="Search" className={styles.searchInput} />
            </div>
          </div>

          <div className={styles.contactsList}>
            {contacts.map((contact) => (
              <div
                key={contact._id}
                className={`${styles.contactItem} ${String(selectedChat) === String(contact._id) ? styles.contactActive : ''}`}
                onClick={() => handleContactClick(contact._id)}
              >
                <div className={styles.contactAvatarContainer}>
                  {contact.customerAvatar ? (
                    <img src={contact.customerAvatar} alt={contact.customerName} className={styles.contactAvatarImg} />
                  ) : (
                    <div className={styles.contactAvatar}>👤</div>
                  )}
                </div>
                <div className={styles.contactInfo}>
                  <div className={styles.contactNameRow}>
                    <div className={styles.contactName}>{contact.customerName}</div>
                    {contact.unreadCount > 0 && String(contact.lastMessageSender) !== String(myId) && (
                      <div className={styles.unreadBadge}>
                        {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                      </div>
                    )}
                  </div>
                  <div className={`${styles.contactMessage} ${contact.unreadCount > 0 && String(contact.lastMessageSender) !== String(myId) ? styles.unreadMessage : ''}`}>
                    {String(contact.lastMessageSender) === String(myId)
                      ? `You: ${contact.lastMessage || ''}`
                      : contact.lastMessage || ''}
                    <div className={styles.time}>{contact.lastMessageTime
                      ? new Date(contact.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : ''}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={styles.chatArea}>
          {selectedChat ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.chatContactInfo}>
                  <div className={styles.chatAvatarContainer}>
                    {(() => {
                      const current = contacts.find(c => String(c._id) === String(selectedChat));
                      const src = current?.customerAvatar;
                      if (src) {
                        return <img src={src} alt={current?.customerName || ''} className={styles.chatAvatarImg} />;
                      }
                      return <div className={styles.chatAvatar}>👤</div>;
                    })()}
                  </div>
                  <div className={styles.chatContactName}>
                    {contacts.find(c => String(c._id) === String(selectedChat))?.customerName}
                  </div>
                </div>
                <div className={styles.chatActions}>
                  <button className={styles.chatActionBtn}><Phone size={20} /></button>
                  <button className={styles.chatActionBtn}><Video size={20} /></button>
                  <button className={styles.chatActionBtn}><MoreVertical size={20} /></button>
                </div>
              </div>

              <div className={styles.messagesContainer}>
                {messages.map((message) => {
                  const senderId = message.sender?._id || message.sender;
                  const isMine = String(senderId) === String(myId);
                  const current = contacts.find(c => String(c._id) === String(selectedChat));
                  const avatarSrc = message.sender?.avatar || current?.customerAvatar;

                  return (
                    <div
                      key={message._id}
                      className={`${styles.message} ${isMine ? styles.messageSent : styles.messageReceived}`}>
                      {!isMine && (
                        <div className={styles.messageAvatarWrapper}>
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={message.sender?.fullName || current?.customerName || 'User'}
                              className={styles.messageAvatarImg}
                            />
                          ) : (
                            <div className={styles.messageAvatar}>👤</div>
                          )}
                        </div>
                      )}

                      <div className={styles.messageContent}>
                        {!isMine && message.sender?.fullName && (
                          <div className={styles.messageSenderName}>{message.sender.fullName}</div>
                        )}

                        <div className={styles.messageBubble}>{message.content || message.text}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.messageInputContainer}>
                <button className={styles.inputActionBtn}><Paperclip size={20} /></button>
                <div className={styles.messageInputWrapper}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className={styles.messageInput}
                  />
                </div>
                <button className={styles.sendBtn} onClick={handleSendMessage}><Send size={18} /></button>
              </div>
            </>
          ) : (
            <div className={styles.noChatSelected}>
              <video className={styles.noChatSelectedVideo} src={Animation} autoPlay loop muted />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messenger;