import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Send,
  Paperclip,
  FileText,
  Mic,
  Search,
  Hash,
  Download,
  X,
  Trash2,
  Copy,
  Check,
  CheckCheck,
  ArrowDown,
  Loader2,
  Smile,
  CornerDownLeft,
  UserPlus,
  Settings,
  Pin,
  Star,
  Forward,
  Edit2,
  Folder,
  Lock,
  MessageSquare,
  Users,
  User as UserIcon,
  Video as VideoIcon,
  Image as ImageIcon,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../../context/NotificationContext';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import PhotoLightbox from '../../components/PhotoLightbox';
import Modal from '../../components/Modal';
import AddGroupMembersModal from '../../components/AddGroupMembersModal';
import GroupInfoModal from '../../components/GroupInfoModal';
import EmojiPickerPopover from '../../components/EmojiPickerPopover';
import VoiceRecorder from '../../components/VoiceRecorder';
import AudioMessagePlayer from '../../components/AudioMessagePlayer';
import ForwardMessageModal from '../../components/ForwardMessageModal';
import SharedMediaDrawer from '../../components/SharedMediaDrawer';
import CreateMeetingModal from '../../components/CreateMeetingModal';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const GroupChat = ({
  groups = [],
  activeGroupId,
  onSelectGroup,
  embedded = false,
  allUsers = [],
  activeDirectUserId = null,
  onSelectDirectUser = null,
}) => {
  const { user, isAdmin } = useAuth();
  const { socket, onlineUsers, joinGroupRoom, leaveGroupRoom } = useSocket();
  const { addToast } = useNotification();

  // Navigation / Mode State
  const [sidebarTab, setSidebarTab] = useState(activeDirectUserId ? 'direct' : 'channels'); // 'channels' | 'direct'
  const [chatMode, setChatMode] = useState(activeDirectUserId ? 'direct' : 'group'); // 'group' | 'direct'
  const [currentGroup, setCurrentGroup] = useState(null);
  const [currentRecipient, setCurrentRecipient] = useState(null);
  const [directConversations, setDirectConversations] = useState([]);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Messages State
  const [messages, setMessages] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);

  // In-Chat Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Composer States
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attachment, setAttachment] = useState(null); // { fileUrl, fileName, fileSize, fileMimeType, type }
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // Reaction & Context Popover States
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [showScrollDownPill, setShowScrollDownPill] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());

  // Modals & Drawers
  const [deleteModalMsg, setDeleteModalMsg] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [isMediaDrawerOpen, setIsMediaDrawerOpen] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    chatPermission: 'everyone',
  });
  const [editError, setEditError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState(allUsers);

  // DOM Refs
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const docInputRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Load Workspace Users & Direct Conversations
  const fetchDirectConversations = useCallback(async () => {
    try {
      const { data } = await api.get('/messages/direct-conversations');
      if (data.success) {
        setDirectConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to fetch direct conversations', err);
    }
  }, []);

  useEffect(() => {
    fetchDirectConversations();
  }, [fetchDirectConversations]);

  // Sync workspace users list for modals
  useEffect(() => {
    if (allUsers && allUsers.length > 0) {
      setWorkspaceUsers(allUsers);
    } else {
      api
        .get('/users')
        .then(({ data }) => {
          if (data?.success && data.users) setWorkspaceUsers(data.users);
        })
        .catch(() => {});
    }
  }, [allUsers]);

  const isInitialMount = useRef(true);
  const prevActiveGroupId = useRef(activeGroupId);

  // Auto-select initial channel on mount or when activeGroupId prop explicitly changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (activeGroupId && groups.length > 0) {
        const found = groups.find((g) => g._id === activeGroupId);
        if (found) {
          setChatMode('group');
          setCurrentGroup(found);
          setCurrentRecipient(null);
        }
      } else if (groups.length > 0) {
        setChatMode('group');
        setCurrentGroup(groups[0]);
        setCurrentRecipient(null);
        if (onSelectGroup) onSelectGroup(groups[0]._id);
      }
    } else if (activeGroupId && activeGroupId !== prevActiveGroupId.current && groups.length > 0) {
      prevActiveGroupId.current = activeGroupId;
      const found = groups.find((g) => g._id === activeGroupId);
      if (found) {
        setChatMode('group');
        setCurrentGroup(found);
        setCurrentRecipient(null);
      }
    }
  }, [activeGroupId, groups, onSelectGroup]);

  // Auto-select direct recipient when activeDirectUserId prop changes
  useEffect(() => {
    if (activeDirectUserId && workspaceUsers.length > 0) {
      const found = workspaceUsers.find(
        (u) => (u._id || u.id || '').toString() === activeDirectUserId.toString()
      );
      if (found) {
        setSidebarTab('direct');
        setChatMode('direct');
        const isSelf =
          (found._id || found.id || '').toString() === (user?.id || user?._id || '').toString();
        setCurrentRecipient({
          ...found,
          _id: (found._id || found.id).toString(),
          name: isSelf ? `${user?.name || found.name} (You)` : found.name,
          isSelf,
        });
        setCurrentGroup(null);
      }
    }
  }, [activeDirectUserId, workspaceUsers, user]);

  // Fetch Messages for Current Group or Direct Recipient
  const fetchMessages = useCallback(async () => {
    setLoadingChat(true);
    try {
      if (chatMode === 'group' && currentGroup?._id) {
        const { data } = await api.get(`/messages/group/${currentGroup._id}?limit=40`);
        if (data.success) {
          setMessages(data.messages || []);
          setHasMore(data.hasMore || false);
          setPinnedMessages(data.pinnedMessages || []);
          if (data.chatPermission && currentGroup) {
            setCurrentGroup((prev) =>
              prev ? { ...prev, chatPermission: data.chatPermission } : prev
            );
          }
        }
      } else if (chatMode === 'direct' && currentRecipient?._id) {
        const { data } = await api.get(`/messages/direct/${currentRecipient._id}?limit=40`);
        if (data.success) {
          setMessages(data.messages || []);
          setHasMore(data.hasMore || false);
          setPinnedMessages(data.pinnedMessages || []);
          if (data.recipient) setCurrentRecipient(data.recipient);
        }
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setLoadingChat(false);
    }
  }, [chatMode, currentGroup?._id, currentRecipient?._id]);

  useEffect(() => {
    if (chatMode === 'group' && currentGroup?._id) {
      joinGroupRoom(currentGroup._id);
      if (socket) socket.emit('group:join', { groupId: currentGroup._id });
      fetchMessages();
      setReplyingTo(null);
      setEditingMessage(null);

      return () => {
        leaveGroupRoom(currentGroup._id);
        if (socket) socket.emit('group:leave', { groupId: currentGroup._id });
      };
    } else if (chatMode === 'direct' && currentRecipient?._id) {
      fetchMessages();
      setReplyingTo(null);
      setEditingMessage(null);
    }
  }, [
    chatMode,
    currentGroup?._id,
    currentRecipient?._id,
    fetchMessages,
    joinGroupRoom,
    leaveGroupRoom,
    socket,
  ]);

  // Infinite Scroll Up
  const handleLoadOlderMessages = async () => {
    if (messages.length === 0 || loadingOlder || !hasMore) return;
    setLoadingOlder(true);
    const earliestDate = messages[0]?.createdAt;

    try {
      const url =
        chatMode === 'group'
          ? `/messages/group/${currentGroup._id}?before=${encodeURIComponent(earliestDate)}&limit=30`
          : `/messages/direct/${currentRecipient._id}?before=${encodeURIComponent(earliestDate)}&limit=30`;

      const { data } = await api.get(url);
      if (data.success && data.messages.length > 0) {
        setMessages((prev) => [...data.messages, ...prev]);
        setHasMore(data.hasMore || false);
      } else {
        setHasMore(false);
      }
    } catch (_err) {
      addToast('Failed to load older messages', 'error');
    } finally {
      setLoadingOlder(false);
    }
  };

  // Scroll Tracking
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollDownPill(distanceToBottom > 150);
  };

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setShowScrollDownPill(false);
  };

  useEffect(() => {
    if (!showScrollDownPill) {
      scrollToBottom('smooth');
    }
  }, [messages.length, typingUsers.size]);

  // Real-Time Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      if (!newMsg) return;

      const isCurrentGroup =
        chatMode === 'group' &&
        currentGroup?._id &&
        newMsg.groupId?.toString() === currentGroup._id.toString();

      const msgSenderId = (newMsg.senderId?._id || newMsg.senderId || '').toString();
      const msgRecipientId = (newMsg.recipientId?._id || newMsg.recipientId || '').toString();
      const currUserId = (user?.id || user?._id || '').toString();
      const currRecipientId = (currentRecipient?._id || '').toString();

      const isCurrentDirect =
        chatMode === 'direct' &&
        currRecipientId &&
        ((msgSenderId === currRecipientId && msgRecipientId === currUserId) ||
          (msgSenderId === currUserId && msgRecipientId === currRecipientId) ||
          (currRecipientId === currUserId &&
            msgSenderId === currUserId &&
            msgRecipientId === currUserId));

      if (isCurrentGroup || isCurrentDirect) {
        setMessages((prev) => {
          const idx = prev.findIndex(
            (m) =>
              (newMsg._id && m._id?.toString() === newMsg._id.toString()) ||
              (newMsg.tempId && (m.tempId === newMsg.tempId || m._id === newMsg.tempId))
          );
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = newMsg;
            return next;
          }
          return [...prev, newMsg];
        });

        // Mark direct as read if active
        if (isCurrentDirect && msgSenderId === currRecipientId && msgSenderId !== currUserId) {
          socket.emit('message:read', { messageId: newMsg._id, senderId: currentRecipient._id });
        }
      }

      // Refresh direct conversations list
      fetchDirectConversations();
    };

    const handleMessageEdited = (editedMsg) => {
      setMessages((prev) => prev.map((m) => (m._id === editedMsg._id ? editedMsg : m)));
    };

    const handleMessageDeleted = ({ messageId, isDeletedForEveryone }) => {
      setMessages((prev) => {
        if (isDeletedForEveryone) {
          return prev.map((m) =>
            m._id === messageId
              ? { ...m, isDeletedForEveryone: true, content: 'This message was deleted' }
              : m
          );
        }
        return prev.filter((m) => m._id !== messageId);
      });
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)));
    };

    const handleReadReceipt = ({ readerId, targetId: _targetId }) => {
      setMessages((prev) =>
        prev.map((m) => {
          const sId = (m.senderId?._id || m.senderId || '').toString();
          if (sId === (user?.id || '').toString()) {
            const readBy = Array.isArray(m.readBy) ? m.readBy : [];
            if (!readBy.includes(readerId)) {
              return {
                ...m,
                readBy: [...readBy, readerId],
                deliveredTo: [...(m.deliveredTo || []), readerId],
              };
            }
          }
          return m;
        })
      );
    };

    const handleTypingUpdate = ({
      groupId,
      recipientId: _recipientId,
      senderId,
      senderName,
      userName,
      isTyping,
    }) => {
      const name = userName || senderName;
      if (chatMode === 'group' && groupId === currentGroup?._id && senderId !== user?.id) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (isTyping) next.add(name);
          else next.delete(name);
          return next;
        });
      } else if (chatMode === 'direct' && senderId === currentRecipient?._id) {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          if (isTyping) next.add(name);
          else next.delete(name);
          return next;
        });
      }
    };

    const handlePermissionChanged = ({ groupId, chatPermission }) => {
      if (currentGroup?._id === groupId) {
        setCurrentGroup((prev) => (prev ? { ...prev, chatPermission } : prev));
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:reactionUpdated', handleReactionUpdated);
    socket.on('message:readReceipt', handleReadReceipt);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('group:permissionChanged', handlePermissionChanged);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:reactionUpdated', handleReactionUpdated);
      socket.off('message:readReceipt', handleReadReceipt);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('group:permissionChanged', handlePermissionChanged);
    };
  }, [
    socket,
    chatMode,
    currentGroup?._id,
    currentRecipient?._id,
    user?.id,
    fetchDirectConversations,
  ]);

  // Input Change & Debounced Typing Emitter
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (!socket) return;

    const activeGroupId = currentGroup
      ? (currentGroup._id?._id || currentGroup._id || '').toString()
      : undefined;
    const activeRecipientId = currentRecipient
      ? (currentRecipient._id?._id || currentRecipient._id || '').toString()
      : undefined;

    if (chatMode === 'group' && activeGroupId) {
      socket.emit('typing:start', { groupId: activeGroupId, conversationType: 'group' });
    } else if (chatMode === 'direct' && activeRecipientId) {
      socket.emit('typing:start', { recipientId: activeRecipientId, conversationType: 'direct' });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (chatMode === 'group' && activeGroupId) {
        socket.emit('typing:stop', { groupId: activeGroupId, conversationType: 'group' });
      } else if (chatMode === 'direct' && activeRecipientId) {
        socket.emit('typing:stop', { recipientId: activeRecipientId, conversationType: 'direct' });
      }
    }, 2000);
  };

  // Upload File (Photo, Video, Document)
  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      addToast('File size exceeds the 50MB limit.', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(20);
    setAttachMenuOpen(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(60);
      const { data } = await api.post('/messages/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        setUploadProgress(100);
        setAttachment(data);
        addToast(`${type.charAt(0).toUpperCase() + type.slice(1)} attached`, 'info', 2000);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'File upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  // Send Message (Group or Direct)
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!inputText.trim() && !attachment) || (!currentGroup && !currentRecipient)) return;

    // If currently editing a message
    if (editingMessage) {
      handleSaveEdit();
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const activeGroupId = currentGroup
      ? (currentGroup._id?._id || currentGroup._id || '').toString()
      : undefined;
    const activeRecipientId = currentRecipient
      ? (currentRecipient._id?._id || currentRecipient._id || '').toString()
      : undefined;

    const payload = {
      tempId,
      conversationType: chatMode,
      groupId: chatMode === 'group' ? activeGroupId : undefined,
      recipientId: chatMode === 'direct' ? activeRecipientId : undefined,
      type: attachment ? attachment.type : 'text',
      content: inputText.trim(),
      fileUrl: attachment?.fileUrl || '',
      fileName: attachment?.fileName || '',
      fileSize: attachment?.fileSize || 0,
      fileMimeType: attachment?.fileMimeType || '',
      duration: attachment?.duration || 0,
      replyTo: replyingTo?._id || undefined,
    };

    // Optimistic UI Append
    const optimisticMsg = {
      _id: tempId,
      tempId,
      ...payload,
      senderId: {
        _id: user?.id,
        name: user?.name,
        email: user?.email,
        avatar: user?.avatar,
        role: user?.role,
        post: user?.post,
      },
      replyTo: replyingTo
        ? {
            _id: replyingTo._id,
            content: replyingTo.content,
            type: replyingTo.type,
            fileName: replyingTo.fileName,
            fileUrl: replyingTo.fileUrl,
            senderId: replyingTo.senderId,
          }
        : null,
      reactions: [],
      createdAt: new Date().toISOString(),
      pending: true,
      readBy: [user?.id],
      deliveredTo: [user?.id],
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');
    setAttachment(null);
    setReplyingTo(null);

    if (socket) {
      if (chatMode === 'group' && activeGroupId)
        socket.emit('typing:stop', { groupId: activeGroupId, conversationType: 'group' });
      if (chatMode === 'direct' && activeRecipientId)
        socket.emit('typing:stop', { recipientId: activeRecipientId, conversationType: 'direct' });
    }

    if (socket && socket.connected) {
      socket.emit('message:send', payload, (response) => {
        if (response?.error) {
          addToast(response.error, 'error');
          setMessages((prev) => prev.filter((m) => m._id !== tempId));
        } else if (response?.message) {
          setMessages((prev) =>
            prev.map((m) => (m._id === tempId || m.tempId === tempId ? response.message : m))
          );
          fetchDirectConversations();
        }
      });
    } else {
      try {
        const { data } = await api.post('/messages/send', payload);
        if (data.success && data.message) {
          setMessages((prev) =>
            prev.map((m) => (m._id === tempId || m.tempId === tempId ? data.message : m))
          );
          fetchDirectConversations();
        }
      } catch (err) {
        addToast(err.response?.data?.message || 'Failed to send message', 'error');
        setMessages((prev) => prev.filter((m) => m._id !== tempId));
      }
    }
  };

  // Voice Note Recorded Callback
  const handleVoiceRecordingComplete = (voiceData) => {
    setIsRecordingVoice(false);
    const tempId = `temp_${Date.now()}`;
    const activeGroupId = currentGroup
      ? (currentGroup._id?._id || currentGroup._id || '').toString()
      : undefined;
    const activeRecipientId = currentRecipient
      ? (currentRecipient._id?._id || currentRecipient._id || '').toString()
      : undefined;

    const payload = {
      tempId,
      conversationType: chatMode,
      groupId: chatMode === 'group' ? activeGroupId : undefined,
      recipientId: chatMode === 'direct' ? activeRecipientId : undefined,
      type: 'audio',
      content: '',
      fileUrl: voiceData.fileUrl,
      fileName: voiceData.fileName || 'Voice Note',
      fileSize: voiceData.fileSize || 0,
      fileMimeType: voiceData.fileMimeType || 'audio/webm',
      duration: voiceData.duration || 0,
      replyTo: replyingTo?._id || undefined,
    };

    const optimisticMsg = {
      _id: tempId,
      tempId,
      ...payload,
      senderId: { _id: user?.id, name: user?.name, avatar: user?.avatar },
      reactions: [],
      createdAt: new Date().toISOString(),
      pending: true,
      readBy: [user?.id],
      deliveredTo: [user?.id],
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setReplyingTo(null);

    if (socket && socket.connected) {
      socket.emit('message:send', payload);
    } else {
      api
        .post('/messages/send', payload)
        .catch(() => addToast('Failed to send voice note', 'error'));
    }
  };

  // Save Inline Edit
  const handleSaveEdit = async () => {
    if (!editingMessage || !inputText.trim()) return;

    try {
      const { data } = await api.put(`/messages/${editingMessage._id}`, {
        content: inputText.trim(),
      });
      if (data.success) {
        setMessages((prev) => prev.map((m) => (m._id === editingMessage._id ? data.message : m)));
        setEditingMessage(null);
        setInputText('');
        addToast('Message edited', 'success', 2000);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to edit message', 'error');
    }
  };

  // Toggle Reaction
  const handleToggleReaction = async (msgId, emoji) => {
    setActiveReactionMsgId(null);
    if (socket && socket.connected) {
      socket.emit('message:react', { messageId: msgId, emoji });
    } else {
      try {
        const { data } = await api.post(`/messages/${msgId}/reaction`, { emoji });
        if (data.success) {
          setMessages((prev) =>
            prev.map((m) => (m._id === msgId ? { ...m, reactions: data.reactions } : m))
          );
        }
      } catch (_err) {
        addToast('Failed to react to message', 'error');
      }
    }
  };

  // Toggle Pin Message
  const handleTogglePin = async (msgId) => {
    try {
      const { data } = await api.post(`/messages/${msgId}/pin`);
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) => (m._id === msgId ? { ...m, isPinned: data.isPinned } : m))
        );
        fetchMessages();
        addToast(data.isPinned ? 'Message pinned to conversation' : 'Message unpinned', 'info');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to pin message', 'error');
    }
  };

  // Toggle Star Message
  const handleToggleStar = async (msgId) => {
    try {
      const { data } = await api.post(`/messages/${msgId}/star`);
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === msgId
              ? {
                  ...m,
                  starredBy: data.isStarred
                    ? [...(m.starredBy || []), user?.id]
                    : (m.starredBy || []).filter((id) => id !== user?.id),
                }
              : m
          )
        );
        addToast(data.isStarred ? 'Message starred' : 'Message unstarred', 'info', 1800);
      }
    } catch (_err) {
      addToast('Failed to star message', 'error');
    }
  };

  // Create Google Meet from chat header
  const handleCreateChatMeeting = async (meetingData) => {
    try {
      const { data } = await api.post('/meetings', meetingData);
      if (data.success) {
        addToast(
          meetingData.isInstant
            ? '⚡ Instant Google Meet call started & shared in channel!'
            : 'Meeting scheduled and Google Meet link generated!',
          'success'
        );
        fetchMessages();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to schedule meeting', 'error');
    }
  };

  // Confirm Delete Handler
  const handleConfirmDelete = async (mode) => {
    if (!deleteModalMsg) return;
    const msgId = deleteModalMsg._id;
    setDeleteModalMsg(null);

    try {
      const { data } = await api.delete(`/messages/${msgId}?mode=${mode}`);
      if (data.success) {
        if (mode === 'everyone') {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === msgId
                ? { ...m, isDeletedForEveryone: true, content: 'This message was deleted' }
                : m
            )
          );
        } else {
          setMessages((prev) => prev.filter((m) => m._id !== msgId));
        }
        addToast(
          mode === 'everyone' ? 'Message deleted for everyone' : 'Message deleted for you',
          'info'
        );
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete message', 'error');
    }
  };

  const handleCopyText = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 1800);
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'background-color 0.5s ease';
      el.style.backgroundColor = 'var(--color-primary-soft)';
      setTimeout(() => {
        el.style.backgroundColor = 'transparent';
      }, 1500);
    }
  };

  // Posting permissions check
  const canPost = useMemo(() => {
    if (chatMode === 'direct') return true;
    if (!currentGroup || !user) return false;
    if (isAdmin || user.role === 'admin') return true;
    return currentGroup.chatPermission === 'everyone';
  }, [chatMode, currentGroup, user, isAdmin]);

  // Channel Settings Save
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!currentGroup || !editFormData.name?.trim()) return;

    setEditError('');
    setIsEditSubmitting(true);
    try {
      const { data } = await api.put(`/groups/${currentGroup._id}`, {
        name: editFormData.name.trim(),
        description: editFormData.description?.trim() || '',
      });

      if (editFormData.chatPermission !== currentGroup.chatPermission) {
        await api.patch(`/groups/${currentGroup._id}/permission`, {
          chatPermission: editFormData.chatPermission,
        });
      }

      if (data.success) {
        setCurrentGroup((prev) => ({
          ...prev,
          name: editFormData.name.trim(),
          description: editFormData.description?.trim() || '',
          chatPermission: editFormData.chatPermission,
        }));
        addToast(`Channel #${editFormData.name} updated`, 'success');
        setIsEditModalOpen(false);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update channel';
      setEditError(msg);
      addToast(msg, 'error');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Day Divider Helper
  const formatDayDivider = (dateString) => {
    const d = new Date(dateString);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const y = new Date();
    y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Filtered lists for sidebar
  const filteredChannels = useMemo(() => {
    return groups.filter((g) => g.name.toLowerCase().includes(sidebarSearch.toLowerCase()));
  }, [groups, sidebarSearch]);

  // Combine all workspace users + active direct conversations so all team members appear
  const allTeammatesList = useMemo(() => {
    const map = new Map();

    // 1. Add current user first
    if (user) {
      map.set((user.id || user._id || '').toString(), {
        teammate: {
          _id: user.id || user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          post: user.post || 'Team Member',
          department: user.department,
          role: user.role,
        },
        isSelf: true,
        lastMessage: null,
      });
    }

    // 2. Add all workspace users
    (workspaceUsers || []).forEach((u) => {
      const uId = (u._id || u.id || '').toString();
      const isSelf = uId === (user?.id || user?._id || '').toString();
      if (!map.has(uId)) {
        map.set(uId, {
          teammate: u,
          isSelf,
          lastMessage: null,
        });
      }
    });

    // 3. Merge recent direct conversations last message info
    (directConversations || []).forEach((c) => {
      if (c.teammate) {
        const tId = (c.teammate._id || c.teammate.id || '').toString();
        if (map.has(tId)) {
          map.set(tId, {
            ...map.get(tId),
            ...c,
          });
        } else {
          map.set(tId, c);
        }
      }
    });

    return Array.from(map.values());
  }, [workspaceUsers, directConversations, user]);

  const filteredTeammates = useMemo(() => {
    const query = sidebarSearch.toLowerCase();
    return allTeammatesList.filter((c) => {
      const name = c.teammate?.name || '';
      const email = c.teammate?.email || '';
      const post = c.teammate?.post || '';
      return name.toLowerCase().includes(query) || email.toLowerCase().includes(query) || post.toLowerCase().includes(query);
    });
  }, [allTeammatesList, sidebarSearch]);

  // Filtered In-Chat Messages for Search
  const displayMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages;
    const q = chatSearchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.content?.toLowerCase().includes(q) ||
        m.fileName?.toLowerCase().includes(q) ||
        m.senderId?.name?.toLowerCase().includes(q)
    );
  }, [messages, chatSearchQuery]);

  return (
    <div className={`chat-layout-wrapper ${embedded ? 'embedded' : ''}`}>
      {/* Left Sidebar (Disabled in favor of main application Sidebar) */}
      {false && (
        <div
          className="chat-sidebar"
          style={{
            width: '290px',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          {/* Top Tabs Switcher: Channels vs Team Members */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid var(--color-border)',
              padding: '6px 8px',
              gap: '4px',
              backgroundColor: 'var(--color-surface-alt)',
            }}
          >
            <button
              type="button"
              onClick={() => setSidebarTab('channels')}
              className={`btn btn-ghost btn-sm ${sidebarTab === 'channels' ? 'active' : ''}`}
              style={{
                flex: 1,
                fontSize: '12px',
                fontWeight: sidebarTab === 'channels' ? 700 : 500,
                color:
                  sidebarTab === 'channels'
                    ? 'var(--color-primary)'
                    : 'var(--color-text-secondary)',
                backgroundColor: sidebarTab === 'channels' ? 'var(--color-surface)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <Hash size={14} /> Channels ({groups.length})
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('direct')}
              className={`btn btn-ghost btn-sm ${sidebarTab === 'direct' ? 'active' : ''}`}
              style={{
                flex: 1,
                fontSize: '12px',
                fontWeight: sidebarTab === 'direct' ? 700 : 500,
                color:
                  sidebarTab === 'direct' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                backgroundColor: sidebarTab === 'direct' ? 'var(--color-surface)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <Users size={14} /> Team Members ({allTeammatesList.length})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
            <div className="search-input-box" style={{ width: '100%' }}>
              <Search size={13} className="search-icon" />
              <input
                type="text"
                placeholder={
                  sidebarTab === 'channels' ? 'Search channels...' : 'Search teammates...'
                }
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                style={{ fontSize: '12px', padding: '5px 8px 5px 28px' }}
              />
            </div>
          </div>

          {/* Sidebar Item List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            {sidebarTab === 'channels' ? (
              /* Channels List */
              filteredChannels.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px 8px',
                    color: 'var(--color-text-muted)',
                    fontSize: '12.5px',
                  }}
                >
                  No channels found
                </div>
              ) : (
                filteredChannels.map((g) => {
                  const isSelected = chatMode === 'group' && currentGroup?._id === g._id;
                  return (
                    <div
                      key={g._id}
                      onClick={() => {
                        setChatMode('group');
                        setCurrentGroup(g);
                        setCurrentRecipient(null);
                        if (onSelectGroup) onSelectGroup(g._id);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isSelected ? 'var(--color-primary-soft)' : 'transparent',
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-primary)',
                        cursor: 'pointer',
                        marginBottom: '2px',
                        transition: 'background-color 0.1s ease',
                      }}
                      onMouseEnter={(e) =>
                        !isSelected &&
                        (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')
                      }
                      onMouseLeave={(e) =>
                        !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isSelected
                              ? 'var(--color-primary)'
                              : 'var(--color-surface-alt)',
                            color: isSelected ? '#FFFFFF' : 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Hash size={15} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: isSelected ? 700 : 500,
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {g.name}
                          </div>
                          {g.description && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: 'var(--color-text-tertiary)',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {g.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {g.chatPermission === 'adminOnly' && (
                        <Lock
                          size={12}
                          color="var(--color-warning)"
                          title="Broadcast only"
                          style={{ marginLeft: '4px' }}
                        />
                      )}
                    </div>
                  );
                })
              )
            ) : /* Direct Messages List */
            filteredTeammates.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 8px',
                  color: 'var(--color-text-muted)',
                  fontSize: '12.5px',
                }}
              >
                No teammates found
              </div>
            ) : (
              filteredTeammates.map((c) => {
                const teammate = c.teammate;
                if (!teammate) return null;
                const isSelected = chatMode === 'direct' && currentRecipient?._id === teammate._id;
                const isSelfTeammate =
                  c.isSelf ||
                  (teammate._id || '').toString() === (user?.id || user?._id || '').toString();
                const isOnline = isSelfTeammate ? true : onlineUsers.includes(teammate._id);

                return (
                  <div
                    key={teammate._id}
                    onClick={() => {
                      if (onSelectGroup) onSelectGroup(null);
                      const targetId = (teammate._id?._id || teammate._id || '').toString();
                      if (onSelectDirectUser) onSelectDirectUser(targetId);
                      setChatMode('direct');
                      setCurrentRecipient({
                        ...teammate,
                        _id: targetId,
                        name: isSelfTeammate
                          ? `${user?.name || teammate.name} (You)`
                          : teammate.name,
                        isSelf: isSelfTeammate,
                      });
                      setCurrentGroup(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isSelected ? 'var(--color-primary-soft)' : 'transparent',
                      border:
                        isSelfTeammate && !isSelected
                          ? '1px solid var(--color-border)'
                          : '1px solid transparent',
                      cursor: 'pointer',
                      marginBottom: '4px',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) =>
                      !isSelected &&
                      (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')
                    }
                    onMouseLeave={(e) =>
                      !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <Avatar
                        name={isSelfTeammate ? user?.name || 'You' : teammate.name}
                        src={isSelfTeammate ? user?.avatar : teammate.avatar}
                        size="sm"
                        isOnline={isOnline}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                fontSize: '13px',
                                fontWeight: isSelected ? 700 : 600,
                                color: isSelected
                                  ? 'var(--color-primary)'
                                  : 'var(--color-text-primary)',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isSelfTeammate
                                ? `${user?.name || teammate.name} (You)`
                                : teammate.name}
                            </span>
                            {isSelfTeammate && (
                              <span
                                style={{
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  backgroundColor: 'var(--color-primary-soft)',
                                  color: 'var(--color-primary)',
                                  padding: '1px 4px',
                                  borderRadius: '3px',
                                  flexShrink: 0,
                                }}
                              >
                                YOU
                              </span>
                            )}
                          </div>
                          {c.lastMessage && (
                            <span
                              style={{
                                fontSize: '10px',
                                color: 'var(--color-text-tertiary)',
                                flexShrink: 0,
                              }}
                            >
                              {new Date(c.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-secondary)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            marginTop: '1px',
                          }}
                        >
                          {c.lastMessage
                            ? c.lastMessage.isDeletedForEveryone
                              ? 'This message was deleted'
                              : c.lastMessage.content ||
                                (c.lastMessage.type === 'photo'
                                  ? '📷 Photo'
                                  : c.lastMessage.type === 'video'
                                    ? '🎥 Video'
                                    : c.lastMessage.type === 'audio'
                                      ? '🎤 Voice Note'
                                      : '📄 Document')
                            : isSelfTeammate
                              ? 'Message yourself · Save notes & media'
                              : isOnline
                                ? 'Online now'
                                : teammate.post || 'Teammate'}
                        </div>
                      </div>
                    </div>

                    {c.unreadCount > 0 && (
                      <span
                        style={{
                          backgroundColor: 'var(--color-primary)',
                          color: '#FFFFFF',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          marginLeft: '6px',
                        }}
                      >
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Conversation Column */}
      <div
        className="chat-main"
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          overflow: 'hidden',
        }}
      >
        {currentGroup || currentRecipient ? (
          <>
            {/* Header */}
            <div className="chat-header">
                {chatMode === 'group' ? (
                  /* Channel Header */
                  <div
                    onClick={() => setIsGroupInfoOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      minWidth: 0,
                    }}
                    title="Click for channel info & participants"
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-primary-soft)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Hash size={15} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h2
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          #{currentGroup.name}
                        </h2>
                        <Badge
                          variant={
                            currentGroup.chatPermission === 'adminOnly' ? 'warning' : 'neutral'
                          }
                          size="sm"
                        >
                          {currentGroup.chatPermission === 'adminOnly' ? 'Admin' : 'Open'}
                        </Badge>
                      </div>
                      <p
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-secondary)',
                          marginTop: '1px',
                          marginBottom: 0,
                          maxWidth: 'min(300px, 45vw)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {currentGroup.description ||
                          `${currentGroup.memberIds?.length || 0} channel members`}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Direct Chat Header */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <Avatar
                      name={
                        currentRecipient.isSelf || currentRecipient._id === user?.id
                          ? user?.name || 'You'
                          : currentRecipient.name
                      }
                      src={
                        currentRecipient.isSelf || currentRecipient._id === user?.id
                          ? user?.avatar
                          : currentRecipient.avatar
                      }
                      size="sm"
                      isOnline={
                        currentRecipient.isSelf || currentRecipient._id === user?.id
                          ? true
                          : onlineUsers.includes(currentRecipient._id)
                      }
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h2
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--color-text-primary)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {currentRecipient.isSelf || currentRecipient._id === user?.id
                            ? `${user?.name} (You)`
                            : currentRecipient.name}
                        </h2>
                        {currentRecipient.isSelf || currentRecipient._id === user?.id ? (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              backgroundColor: 'var(--color-primary-soft)',
                              color: 'var(--color-primary)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}
                          >
                            You
                          </span>
                        ) : (
                          currentRecipient.role === 'admin' && (
                            <span
                              style={{
                                fontSize: '9px',
                                fontWeight: 800,
                                backgroundColor: 'var(--color-primary-soft)',
                                color: 'var(--color-primary)',
                                padding: '1px 4px',
                                borderRadius: '3px',
                              }}
                            >
                              ADMIN
                            </span>
                          )
                        )}
                      </div>
                      <p
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-secondary)',
                          marginTop: '1px',
                          marginBottom: 0,
                          maxWidth: 'min(280px, 45vw)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {currentRecipient.isSelf || currentRecipient._id === user?.id ? (
                          'Personal space & notes'
                        ) : onlineUsers.includes(currentRecipient._id) ? (
                          <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>
                            Active now
                          </span>
                        ) : currentRecipient.lastSeenAt ? (
                          `Last active ${new Date(currentRecipient.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        ) : (
                          currentRecipient.post || currentRecipient.email
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {/* Header Action Tools */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {/* In-Chat Search Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSearchOpen((prev) => !prev);
                      if (isSearchOpen) setChatSearchQuery('');
                    }}
                    className={`btn btn-ghost btn-icon btn-sm ${isSearchOpen ? 'active' : ''}`}
                    title="Search messages in conversation"
                    style={{ width: '28px', height: '28px' }}
                  >
                    <Search size={14} />
                  </button>

                  {/* Shared Media Gallery Drawer Button */}
                  <button
                    type="button"
                    onClick={() => setIsMediaDrawerOpen(true)}
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Shared Files & Media"
                    style={{ width: '28px', height: '28px' }}
                  >
                    <Folder size={14} />
                  </button>

                  {/* Google Meet Video Conference Button */}
                  {chatMode === 'group' && currentGroup && (
                    <button
                      type="button"
                      onClick={() => setIsMeetingModalOpen(true)}
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Start or Schedule Google Meet Call"
                      style={{ width: '28px', height: '28px', color: 'var(--color-primary)' }}
                    >
                      <VideoIcon size={14} />
                    </button>
                  )}

                  {/* Channel Admin Actions (Only for Admin & in Group Mode) */}
                  {chatMode === 'group' && isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsAddMembersOpen(true)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: '11.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          height: '28px',
                        }}
                        title="Add Teammates"
                      >
                        <UserPlus size={12} />
                        <span>Add</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditFormData({
                            name: currentGroup.name || '',
                            description: currentGroup.description || '',
                            chatPermission: currentGroup.chatPermission || 'everyone',
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: '11.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '3px 8px',
                          height: '28px',
                        }}
                        title="Channel Settings"
                      >
                        <Settings size={12} />
                        <span>Settings</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

            {/* In-Chat Search Bar Dropdown */}
            {isSearchOpen && (
              <div
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'var(--color-surface-alt)',
                  borderBottom: '1px solid var(--color-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Search size={14} color="var(--color-text-secondary)" />
                <input
                  type="text"
                  placeholder="Search in this conversation..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  autoFocus
                  style={{
                    flex: 1,
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '13px',
                    color: 'var(--color-text-primary)',
                  }}
                />
                {chatSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setChatSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Pinned Messages Banner */}
            {pinnedMessages.length > 0 && (
              <div
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'var(--color-warning-soft)',
                  borderBottom: '1px solid var(--color-warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
                onClick={() => scrollToMessage(pinnedMessages[0]._id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <Pin size={13} color="var(--color-warning)" style={{ flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                    Pinned:
                  </span>
                  <span
                    style={{
                      color: 'var(--color-text-secondary)',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pinnedMessages[0].content ||
                      (pinnedMessages[0].type === 'photo'
                        ? '📷 Photo'
                        : pinnedMessages[0].type === 'video'
                          ? '🎥 Video'
                          : '📄 Document')}
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
                  {pinnedMessages.length > 1 ? `+${pinnedMessages.length - 1} more` : 'View'}
                </span>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div
              className="chat-messages-area"
              ref={messagesContainerRef}
              onScroll={handleScroll}
            >
              {hasMore && (
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={loadingOlder}
                    onClick={handleLoadOlderMessages}
                    style={{ fontSize: '12px' }}
                  >
                    {loadingOlder ? (
                      <Loader2 size={12} className="spin" />
                    ) : (
                      '↑ Load older messages'
                    )}
                  </button>
                </div>
              )}

              {loadingChat ? (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    padding: '40px',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Loader2 size={28} className="spin" />
                </div>
              ) : displayMessages.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--color-text-muted)',
                    margin: 'auto',
                    padding: '40px 16px',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-surface-alt)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto',
                    }}
                  >
                    {chatMode === 'group' ? <Hash size={26} /> : <UserIcon size={26} />}
                  </div>
                  <p
                    style={{
                      fontWeight: 700,
                      fontSize: '15px',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {chatMode === 'group'
                      ? `Welcome to #${currentGroup?.name}!`
                      : `Direct conversation with ${currentRecipient?.name}`}
                  </p>
                  <p
                    style={{
                      fontSize: '13px',
                      maxWidth: '340px',
                      margin: '4px auto 0 auto',
                      lineHeight: 1.4,
                    }}
                  >
                    Send messages, voice notes, photos, videos, or documents to collaborate in real
                    time.
                  </p>
                </div>
              ) : (
                displayMessages.map((msg, index) => {
                  if (!msg) return null;
                  const sender =
                    typeof msg.senderId === 'object' && msg.senderId !== null
                      ? msg.senderId
                      : { _id: msg.senderId };
                  const senderIdStr = (sender._id || sender || '').toString();
                  const currentUserIdStr = (user?.id || user?._id || '').toString();
                  const isSelf = Boolean(
                    senderIdStr && currentUserIdStr && senderIdStr === currentUserIdStr
                  );
                  const senderName = sender.name || (isSelf ? user?.name || 'You' : 'Teammate');
                  const isOnline = onlineUsers.includes(senderIdStr);
                  const isRead =
                    Array.isArray(msg.readBy) && msg.readBy.some((id) => id !== user?.id);
                  const isStarred =
                    Array.isArray(msg.starredBy) && msg.starredBy.includes(user?.id);

                  // Safe Day Divider
                  const msgDate = msg.createdAt ? new Date(msg.createdAt) : new Date();
                  const prevMsg = index > 0 ? displayMessages[index - 1] : null;
                  const prevDate = prevMsg?.createdAt ? new Date(prevMsg.createdAt) : null;
                  const showDayDivider =
                    !prevDate || msgDate.toDateString() !== prevDate.toDateString();

                  return (
                    <React.Fragment key={msg._id || msg.tempId || index}>
                      {showDayDivider && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            margin: '14px 0 8px 0',
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: '1px',
                              backgroundColor: 'var(--color-border)',
                            }}
                          />
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'var(--color-text-secondary)',
                              backgroundColor: 'var(--color-surface)',
                              padding: '2px 10px',
                              borderRadius: 'var(--radius-full)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            {formatDayDivider(msg.createdAt)}
                          </span>
                          <div
                            style={{
                              flex: 1,
                              height: '1px',
                              backgroundColor: 'var(--color-border)',
                            }}
                          />
                        </div>
                      )}

                      {/* Message Row */}
                      <div
                        id={`msg-${msg._id}`}
                        className={`chat-msg-row ${isSelf ? 'is-self' : 'not-self'}`}
                        style={{ opacity: msg.pending ? 0.7 : 1, position: 'relative' }}
                      >
                        {!isSelf && (
                          <div style={{ flexShrink: 0, paddingBottom: '2px' }}>
                            <Avatar
                              name={senderName}
                              src={sender.avatar}
                              size="sm"
                              isOnline={isOnline}
                            />
                          </div>
                        )}

                        <div
                          className={`chat-bubble ${isSelf ? 'outgoing' : 'incoming'}`}
                          style={{ position: 'relative' }}
                        >
                          {/* Sender Meta for Group Incoming */}
                          {!isSelf && chatMode === 'group' && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginBottom: '4px',
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: '12px',
                                  color: 'var(--color-primary)',
                                }}
                              >
                                {senderName}
                              </span>
                              {sender.role === 'admin' && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 800,
                                    backgroundColor: 'var(--color-primary-soft)',
                                    color: 'var(--color-primary)',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                  }}
                                >
                                  ADMIN
                                </span>
                              )}
                              {sender.post && (
                                <span
                                  style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}
                                >
                                  • {sender.post}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Quoted / Reply Preview Box */}
                          {msg.replyTo && (
                            <div
                              onClick={() => scrollToMessage(msg.replyTo._id)}
                              style={{
                                padding: '6px 8px',
                                marginBottom: '6px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: isSelf
                                  ? 'rgba(255, 255, 255, 0.15)'
                                  : 'var(--color-surface-alt)',
                                borderLeft: `3px solid ${isSelf ? '#FFFFFF' : 'var(--color-primary)'}`,
                                cursor: 'pointer',
                                fontSize: '11.5px',
                              }}
                            >
                              <div style={{ fontWeight: 700, opacity: 0.9, marginBottom: '2px' }}>
                                {msg.replyTo.senderId?.name || 'Teammate'}
                              </div>
                              <div
                                style={{
                                  opacity: 0.8,
                                  textOverflow: 'ellipsis',
                                  overflow: 'hidden',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {msg.replyTo.content ||
                                  (msg.replyTo.type === 'photo'
                                    ? '📷 Photo'
                                    : msg.replyTo.type === 'video'
                                      ? '🎥 Video'
                                      : msg.replyTo.type === 'audio'
                                        ? '🎤 Voice Note'
                                        : '📄 Document')}
                              </div>
                            </div>
                          )}

                          {/* Deleted Message Placeholder */}
                          {msg.isDeletedForEveryone ? (
                            <div
                              style={{
                                fontSize: '13px',
                                fontStyle: 'italic',
                                opacity: 0.7,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <Trash2 size={13} />
                              <span>This message was deleted</span>
                            </div>
                          ) : (
                            <>
                              {/* Photo Attachment */}
                              {msg.type === 'photo' && msg.fileUrl && (
                                <div
                                  style={{
                                    marginBottom: msg.content ? '6px' : '2px',
                                    cursor: 'pointer',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                  }}
                                  onClick={() =>
                                    setLightboxImg({
                                      src: msg.fileUrl,
                                      fileName: msg.fileName || 'Photo',
                                    })
                                  }
                                >
                                  <img
                                    src={msg.fileUrl}
                                    alt="Attachment"
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: '280px',
                                      display: 'block',
                                      objectFit: 'cover',
                                      borderRadius: '6px',
                                    }}
                                  />
                                </div>
                              )}

                              {/* Video Attachment */}
                              {msg.type === 'video' && msg.fileUrl && (
                                <div
                                  style={{
                                    marginBottom: msg.content ? '6px' : '2px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    maxWidth: '320px',
                                  }}
                                >
                                  <video
                                    src={msg.fileUrl}
                                    controls
                                    preload="metadata"
                                    style={{
                                      width: '100%',
                                      maxHeight: '260px',
                                      borderRadius: '6px',
                                      backgroundColor: '#000000',
                                    }}
                                  />
                                </div>
                              )}

                              {/* Audio Voice Note Player */}
                              {msg.type === 'audio' && msg.fileUrl && (
                                <AudioMessagePlayer
                                  src={msg.fileUrl}
                                  duration={msg.duration}
                                  isSelf={isSelf}
                                />
                              )}

                              {/* Document Attachment */}
                              {msg.type === 'document' && msg.fileUrl && (
                                <a
                                  href={msg.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={msg.fileName}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 10px',
                                    marginBottom: msg.content ? '6px' : '2px',
                                    backgroundColor: isSelf
                                      ? 'rgba(255, 255, 255, 0.15)'
                                      : 'var(--color-surface-alt)',
                                    borderRadius: 'var(--radius-sm)',
                                    textDecoration: 'none',
                                    color: isSelf ? '#FFFFFF' : 'var(--color-text-primary)',
                                  }}
                                >
                                  <FileText
                                    size={18}
                                    color={isSelf ? '#FFFFFF' : 'var(--color-primary)'}
                                  />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        fontSize: '12.5px',
                                        textOverflow: 'ellipsis',
                                        overflow: 'hidden',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {msg.fileName || 'Document'}
                                    </div>
                                    <div style={{ fontSize: '10px', opacity: 0.8 }}>
                                      {msg.fileSize
                                        ? `${(msg.fileSize / 1024).toFixed(1)} KB`
                                        : 'Document'}
                                    </div>
                                  </div>
                                  <Download size={14} />
                                </a>
                              )}

                              {/* Text Message Content */}
                              {msg.content && (
                                <div
                                  style={{
                                    fontSize: '13px',
                                    lineHeight: 1.4,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    overflowWrap: 'anywhere',
                                    color: isSelf ? '#FFFFFF' : 'var(--color-text-primary)',
                                  }}
                                >
                                  {msg.content}
                                </div>
                              )}
                            </>
                          )}

                          {/* Footer: Timestamp, Edited Tag, Starred Icon, Delivery Checkmarks */}
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '4px',
                              marginTop: '3px',
                              fontSize: '10px',
                              opacity: 0.85,
                            }}
                          >
                            {msg.isPinned && <Pin size={10} color="var(--color-warning)" />}
                            {isStarred && (
                              <Star size={10} fill="currentColor" color="var(--color-warning)" />
                            )}
                            {msg.isEdited && (
                              <span style={{ fontStyle: 'italic', fontSize: '9.5px' }}>
                                (edited)
                              </span>
                            )}
                            <span>
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : new Date().toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                            </span>
                            {isSelf &&
                              (msg.pending ? (
                                <span style={{ fontStyle: 'italic', fontSize: '9px' }}>
                                  sending...
                                </span>
                              ) : isRead ? (
                                <CheckCheck
                                  size={13}
                                  strokeWidth={2.5}
                                  color="#3B82F6"
                                  title="Read"
                                />
                              ) : (
                                <Check size={12} strokeWidth={2.5} title="Sent" />
                              ))}
                          </div>
                        </div>

                        {/* Message Reactions Display Bar */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '4px',
                              marginTop: '3px',
                              marginLeft: isSelf ? 'auto' : '38px',
                            }}
                          >
                            {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji) => {
                              const count = msg.reactions.filter((r) => r.emoji === emoji).length;
                              const userReacted = msg.reactions.some(
                                (r) =>
                                  (r.user?._id || r.user || '').toString() ===
                                    (user?.id || '').toString() && r.emoji === emoji
                              );
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(msg._id, emoji)}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '1px 6px',
                                    borderRadius: 'var(--radius-full)',
                                    border: userReacted
                                      ? '1px solid var(--color-primary)'
                                      : '1px solid var(--color-border)',
                                    backgroundColor: userReacted
                                      ? 'var(--color-primary-soft)'
                                      : 'var(--color-surface)',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    boxShadow: 'var(--shadow-sm)',
                                  }}
                                >
                                  <span>{emoji}</span>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      fontSize: '10px',
                                      color: 'var(--color-text-secondary)',
                                    }}
                                  >
                                    {count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Floating Micro Hover Toolbar */}
                        {!msg.isDeletedForEveryone && (
                          <div className="chat-msg-actions">
                            {/* Quick Reaction Trigger */}
                            <div style={{ position: 'relative' }}>
                              <button
                                type="button"
                                className="chat-action-btn"
                                onClick={() =>
                                  setActiveReactionMsgId(
                                    activeReactionMsgId === msg._id ? null : msg._id
                                  )
                                }
                                title="React"
                              >
                                <Smile size={13} />
                              </button>

                              {activeReactionMsgId === msg._id && (
                                <div
                                  style={{
                                    position: 'absolute',
                                    bottom: '30px',
                                    right: 0,
                                    backgroundColor: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-full)',
                                    boxShadow: 'var(--shadow-dropdown)',
                                    padding: '4px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    zIndex: 50,
                                  }}
                                >
                                  {QUICK_REACTIONS.map((em) => (
                                    <button
                                      key={em}
                                      type="button"
                                      onClick={() => handleToggleReaction(msg._id, em)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '16px',
                                        cursor: 'pointer',
                                        padding: '2px',
                                      }}
                                    >
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Reply Button */}
                            <button
                              type="button"
                              onClick={() => setReplyingTo(msg)}
                              className="chat-action-btn"
                              title="Reply"
                            >
                              <CornerDownLeft size={13} />
                            </button>

                            {/* Forward Button */}
                            <button
                              type="button"
                              onClick={() => setForwardingMsg(msg)}
                              className="chat-action-btn"
                              title="Forward message"
                            >
                              <Forward size={13} />
                            </button>

                            {/* Star Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleStar(msg._id)}
                              className="chat-action-btn"
                              title={isStarred ? 'Unstar' : 'Star'}
                            >
                              <Star
                                size={13}
                                fill={isStarred ? 'currentColor' : 'none'}
                                color={isStarred ? 'var(--color-warning)' : 'inherit'}
                              />
                            </button>

                            {/* Pin Button (Sender or Admin) */}
                            {(isAdmin || isSelf) && (
                              <button
                                type="button"
                                onClick={() => handleTogglePin(msg._id)}
                                className="chat-action-btn"
                                title={msg.isPinned ? 'Unpin message' : 'Pin message'}
                              >
                                <Pin
                                  size={13}
                                  color={msg.isPinned ? 'var(--color-warning)' : 'inherit'}
                                />
                              </button>
                            )}

                            {/* Edit Button (Sender only for text) */}
                            {isSelf && msg.type === 'text' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessage(msg);
                                  setInputText(msg.content || '');
                                  textareaRef.current?.focus();
                                }}
                                className="chat-action-btn"
                                title="Edit message"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}

                            {/* Copy Text */}
                            {msg.content && (
                              <button
                                type="button"
                                onClick={() => handleCopyText(msg._id, msg.content)}
                                className="chat-action-btn"
                                title={copiedMsgId === msg._id ? 'Copied!' : 'Copy text'}
                              >
                                {copiedMsgId === msg._id ? (
                                  <Check size={13} color="var(--color-success)" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            )}

                            {/* Delete Button */}
                            {!msg.pending && (isAdmin || isSelf) && (
                              <button
                                type="button"
                                onClick={() => setDeleteModalMsg(msg)}
                                className="chat-action-btn danger"
                                title="Delete message"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}

              {/* Typing Presence Indicator */}
              {typingUsers.size > 0 && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                    fontStyle: 'italic',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                  }}
                >
                  <span
                    className="presence-dot"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  />
                  <span>
                    {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'}{' '}
                    typing...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Scroll Down Floating Pill */}
            {showScrollDownPill && (
              <button
                type="button"
                onClick={() => scrollToBottom('smooth')}
                style={{
                  position: 'absolute',
                  bottom: '90px',
                  right: '24px',
                  backgroundColor: 'var(--color-primary)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  zIndex: 20,
                }}
              >
                <span>New messages</span>
                <ArrowDown size={14} />
              </button>
            )}

            {/* Rich Composer Section */}
            <div className="chat-composer-container">
              {!canPost ? (
                <div
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: 'var(--color-text-secondary)',
                    fontSize: '13px',
                  }}
                >
                  <Lock size={16} color="var(--color-warning)" />
                  <span>
                    This channel is in <strong>Admin Broadcast Mode</strong>. Only workspace
                    administrators can post.
                  </span>
                </div>
              ) : isRecordingVoice ? (
                /* Live Voice Recorder */
                <VoiceRecorder
                  onRecordingComplete={handleVoiceRecordingComplete}
                  onCancel={() => setIsRecordingVoice(false)}
                />
              ) : (
                /* Standard Message Composer */
                <div
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-surface-alt)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Quoting Banner */}
                  {replyingTo && (
                    <div
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--color-primary-soft)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}
                      >
                        <CornerDownLeft size={13} color="var(--color-primary)" />
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          Replying to {replyingTo.senderId?.name || 'Teammate'}:
                        </span>
                        <span
                          style={{
                            color: 'var(--color-text-secondary)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {replyingTo.content ||
                            (replyingTo.type === 'photo'
                              ? 'Photo'
                              : replyingTo.type === 'video'
                                ? 'Video'
                                : 'Document')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-tertiary)',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Editing Message Banner */}
                  {editingMessage && (
                    <div
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--color-warning-soft)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Edit2 size={13} color="var(--color-warning)" />
                        <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>
                          Editing message...
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingMessage(null);
                          setInputText('');
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-text-tertiary)',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Attachment Preview Banner */}
                  {attachment && (
                    <div
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--color-surface)',
                        borderBottom: '1px solid var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      {attachment.type === 'photo' ? (
                        <img
                          src={attachment.fileUrl}
                          alt="preview"
                          style={{
                            width: '30px',
                            height: '30px',
                            borderRadius: '4px',
                            objectFit: 'cover',
                          }}
                        />
                      ) : attachment.type === 'video' ? (
                        <VideoIcon size={16} color="var(--color-primary)" />
                      ) : (
                        <FileText size={16} color="var(--color-primary)" />
                      )}
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          flex: 1,
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {attachment.fileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setAttachment(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-danger)',
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Upload Progress */}
                  {uploading && (
                    <div
                      style={{
                        padding: '6px 12px',
                        backgroundColor: 'var(--color-primary-soft)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                      }}
                    >
                      <Loader2 size={13} className="spin" />
                      <span>Uploading file... {uploadProgress}%</span>
                    </div>
                  )}

                  {/* Textarea Input */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '6px 10px',
                      gap: '6px',
                    }}
                  >
                    <textarea
                      ref={textareaRef}
                      placeholder={
                        chatMode === 'group'
                          ? `Message #${currentGroup?.name}...`
                          : `Message ${currentRecipient?.name}...`
                      }
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                      style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        resize: 'none',
                        fontSize: '13px',
                        color: 'var(--color-text-primary)',
                        fontFamily: 'inherit',
                        lineHeight: 1.35,
                        maxHeight: '85px',
                        minHeight: '20px',
                      }}
                    />
                  </div>

                  {/* Composer Actions Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 8px',
                      borderTop: '1px solid rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        position: 'relative',
                      }}
                    >
                      {/* Emoji Picker Button */}
                      <button
                        type="button"
                        onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                        className="btn btn-ghost btn-icon"
                        style={{
                          width: '30px',
                          height: '30px',
                          color: 'var(--color-text-secondary)',
                        }}
                        title="Add emoji"
                      >
                        <Smile size={16} />
                      </button>

                      <EmojiPickerPopover
                        isOpen={isEmojiPickerOpen}
                        onClose={() => setIsEmojiPickerOpen(false)}
                        onSelectEmoji={(emoji) => setInputText((prev) => prev + emoji)}
                        position="top"
                      />

                      {/* Photo Button */}
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="btn btn-ghost btn-icon"
                        style={{ width: '30px', height: '30px', color: 'var(--color-primary)' }}
                        title="Send photo"
                      >
                        <ImageIcon size={16} />
                      </button>

                      {/* Video Button */}
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="btn btn-ghost btn-icon"
                        style={{ width: '30px', height: '30px', color: '#10B981' }}
                        title="Send video"
                      >
                        <VideoIcon size={16} />
                      </button>

                      {/* Attachment Menu Button */}
                      <button
                        type="button"
                        onClick={() => setAttachMenuOpen((prev) => !prev)}
                        className="btn btn-ghost btn-icon"
                        style={{
                          width: '30px',
                          height: '30px',
                          color: 'var(--color-text-secondary)',
                        }}
                        title="Attach document or file"
                      >
                        <Paperclip size={16} />
                      </button>

                      {attachMenuOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '38px',
                            left: '80px',
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: 'var(--shadow-dropdown)',
                            padding: '4px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            zIndex: 50,
                            minWidth: '160px',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setAttachMenuOpen(false);
                              docInputRef.current?.click();
                            }}
                            className="dropdown-item"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '6px 8px',
                              fontSize: '12.5px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              width: '100%',
                              textAlign: 'left',
                            }}
                          >
                            <FileText size={14} color="var(--color-primary)" />
                            <span>Upload Document</span>
                          </button>
                        </div>
                      )}

                      {/* Voice Note Button */}
                      <button
                        type="button"
                        onClick={() => setIsRecordingVoice(true)}
                        className="btn btn-ghost btn-icon"
                        style={{ width: '30px', height: '30px', color: 'var(--color-danger)' }}
                        title="Record voice note"
                      >
                        <Mic size={16} />
                      </button>

                      {/* Hidden File Inputs */}
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'photo')}
                      />
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'video')}
                      />
                      <input
                        ref={docInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.csv,.json"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'document')}
                      />
                    </div>

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() && !attachment}
                      className="btn btn-primary btn-sm"
                      style={{
                        padding: '5px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontWeight: 600,
                        opacity: !inputText.trim() && !attachment ? 0.45 : 1,
                        cursor: !inputText.trim() && !attachment ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <span>{editingMessage ? 'Save' : 'Send'}</span>
                      <Send size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <MessageSquare size={40} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
            <p style={{ fontWeight: 600, fontSize: '15px' }}>
              Select a channel or teammate to start chatting
            </p>
          </div>
        )}
      </div>

      {/* Delete Choice Modal */}
      {deleteModalMsg && (
        <Modal
          isOpen={!!deleteModalMsg}
          onClose={() => setDeleteModalMsg(null)}
          title="Delete Message"
          maxWidth="400px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              How would you like to delete this message?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleConfirmDelete('me')}
                style={{ justifyContent: 'flex-start', padding: '10px 14px' }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Delete for me</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Hides this message only on your screen.
                  </div>
                </div>
              </button>

              {(isAdmin ||
                (deleteModalMsg.senderId?._id || deleteModalMsg.senderId || '').toString() ===
                  (user?.id || '').toString()) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleConfirmDelete('everyone')}
                  style={{
                    justifyContent: 'flex-start',
                    padding: '10px 14px',
                    backgroundColor: 'var(--color-danger)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>Delete for everyone</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)' }}>
                      Replaces message with "This message was deleted" for all members.
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Forward Message Modal */}
      {forwardingMsg && (
        <ForwardMessageModal
          isOpen={!!forwardingMsg}
          onClose={() => setForwardingMsg(null)}
          message={forwardingMsg}
          groups={groups}
          users={workspaceUsers}
          currentUserId={user?.id}
        />
      )}

      {/* Shared Media / Docs / Pinned Drawer */}
      <SharedMediaDrawer
        isOpen={isMediaDrawerOpen}
        onClose={() => setIsMediaDrawerOpen(false)}
        conversationType={chatMode}
        targetId={chatMode === 'group' ? currentGroup?._id : currentRecipient?._id}
        title={
          chatMode === 'group'
            ? `#${currentGroup?.name} Repository`
            : `Files with ${currentRecipient?.name}`
        }
      />

      {/* Lightbox for Photos */}
      {lightboxImg && (
        <PhotoLightbox
          isOpen={!!lightboxImg}
          onClose={() => setLightboxImg(null)}
          src={lightboxImg.src}
          fileName={lightboxImg.fileName || 'photo.png'}
        />
      )}

      {/* Group Info Modal */}
      {currentGroup && (
        <GroupInfoModal
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          group={currentGroup}
          allUsers={workspaceUsers}
          isAdmin={isAdmin}
          currentUser={user}
          onGroupUpdated={(updated) => {
            if (updated) setCurrentGroup(updated);
            fetchMessages();
          }}
          onGroupDeleted={() => {
            setCurrentGroup(null);
            if (onSelectGroup) onSelectGroup(null);
          }}
        />
      )}

      {/* Channel Add Members Modal */}
      {currentGroup && isAdmin && (
        <AddGroupMembersModal
          isOpen={isAddMembersOpen}
          onClose={() => setIsAddMembersOpen(false)}
          groupId={currentGroup._id}
          groupName={currentGroup.name}
          existingMemberIds={(currentGroup.memberIds || []).map((m) => m._id || m)}
          allUsers={workspaceUsers}
          onMembersAdded={(updated) => {
            if (updated) setCurrentGroup(updated);
          }}
        />
      )}

      {/* Edit Channel Settings Modal (Admin only) */}
      {currentGroup && isAdmin && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Channel Settings: #${currentGroup.name}`}
          maxWidth="500px"
        >
          <form
            onSubmit={handleSaveSettings}
            style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            {editError && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--color-danger-soft)',
                  color: 'var(--color-danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12.5px',
                }}
              >
                {editError}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Channel Name *</label>
              <input
                type="text"
                required
                className="form-input"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Posting Permission</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label
                  onClick={() => setEditFormData({ ...editFormData, chatPermission: 'everyone' })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${editFormData.chatPermission === 'everyone' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    backgroundColor:
                      editFormData.chatPermission === 'everyone'
                        ? 'var(--color-primary-soft)'
                        : 'var(--color-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    checked={editFormData.chatPermission === 'everyone'}
                    onChange={() => {}}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    Everyone Can Chat (Open)
                  </span>
                </label>

                <label
                  onClick={() => setEditFormData({ ...editFormData, chatPermission: 'adminOnly' })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${editFormData.chatPermission === 'adminOnly' ? 'var(--color-warning)' : 'var(--color-border)'}`,
                    backgroundColor:
                      editFormData.chatPermission === 'adminOnly'
                        ? 'var(--color-warning-soft)'
                        : 'var(--color-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    checked={editFormData.chatPermission === 'adminOnly'}
                    onChange={() => {}}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>
                    Only Admin Can Chat (Broadcast Mode)
                  </span>
                </label>
              </div>
            </div>

            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" disabled={isEditSubmitting} className="btn btn-primary btn-sm">
                {isEditSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create Google Meet Video Call Modal */}
      {isMeetingModalOpen && (
        <CreateMeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          onSubmit={handleCreateChatMeeting}
          initialData={{
            groupId: currentGroup?._id || groups[0]?._id || '',
            title: currentGroup ? `#${currentGroup.name} Team Sync` : 'Video Conference',
          }}
          groups={groups}
          allUsers={workspaceUsers || allUsers}
        />
      )}
    </div>
  );
};

export default GroupChat;
