import { useState } from 'react';
import {
  Calendar,
  AlertTriangle,
  Edit2,
  Trash2,
  MessageCircle,
  History,
  Send,
  CheckCircle2,
} from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import Badge from './Badge';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';

const TaskDetailModal = ({
  isOpen,
  onClose,
  task,
  isAdmin = false,
  currentUserId,
  onStatusChange,
  onEdit = null,
  onDelete = null,
  onTaskUpdated = null,
}) => {
  const { addToast, confirm } = useNotification();
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history' | 'comments'

  if (!task) return null;

  const isAssigned = task.assignedTo?.some((u) => (u._id || u).toString() === currentUserId);
  const canModifyStatus = isAdmin || isAssigned;

  // Deadline & Overdue Calculation
  const deadlineDate = new Date(task.deadline);
  const now = new Date();
  const isCompleted = task.status === 'completed';
  const isOverdue = !isCompleted && deadlineDate < now;
  const isDueSoon = !isCompleted && !isOverdue && deadlineDate - now < 48 * 3600 * 1000;

  const handleStatusClick = async (newStatus) => {
    if (!canModifyStatus || task.status === newStatus) return;
    try {
      await onStatusChange(task._id, newStatus);
    } catch (_err) {
      addToast('Failed to update status', 'error');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      const { data } = await api.post(`/tasks/${task._id}/comments`, { text: commentText });
      if (data.success) {
        setCommentText('');
        if (onTaskUpdated) onTaskUpdated(data.task);
      }
    } catch (_err) {
      addToast('Failed to add comment', 'error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getPriorityBadge = (p) => {
    if (p === 'urgent') return <Badge variant="danger">URGENT</Badge>;
    if (p === 'high') return <Badge variant="warning">HIGH PRIORITY</Badge>;
    if (p === 'medium') return <Badge variant="primary">MEDIUM</Badge>;
    return <Badge variant="neutral">LOW</Badge>;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task & Deliverable Detail" maxWidth="660px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Header Summary */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              flexWrap: 'wrap',
            }}
          >
            {getPriorityBadge(task.priority)}

            {task.groupId && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  backgroundColor: 'var(--color-primary-soft)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                #{task.groupId?.name || 'Channel'}
              </span>
            )}

            {isOverdue && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--color-danger)',
                  backgroundColor: 'var(--color-danger-soft)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <AlertTriangle size={13} /> OVERDUE
              </span>
            )}

            {isDueSoon && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--color-warning)',
                  backgroundColor: 'var(--color-warning-soft)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                ⏳ DUE SOON (&lt;48h)
              </span>
            )}

            {isCompleted && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--color-success)',
                  backgroundColor: 'var(--color-success-soft)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <CheckCircle2 size={13} /> COMPLETED
              </span>
            )}
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>
            {task.title}
          </h2>
        </div>

        {/* Interactive Segmented Status Bar */}
        <div
          style={{
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            padding: '4px',
            display: 'flex',
            gap: '4px',
          }}
        >
          <button
            type="button"
            disabled={!canModifyStatus}
            onClick={() => handleStatusClick('todo')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: canModifyStatus ? 'pointer' : 'default',
              backgroundColor: task.status === 'todo' ? 'var(--color-surface)' : 'transparent',
              color:
                task.status === 'todo'
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-secondary)',
              boxShadow: task.status === 'todo' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#94A3B8',
              }}
            />
            To Do
          </button>

          <button
            type="button"
            disabled={!canModifyStatus}
            onClick={() => handleStatusClick('inprogress')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: canModifyStatus ? 'pointer' : 'default',
              backgroundColor:
                task.status === 'inprogress' ? 'var(--color-surface)' : 'transparent',
              color:
                task.status === 'inprogress'
                  ? 'var(--color-warning)'
                  : 'var(--color-text-secondary)',
              boxShadow: task.status === 'inprogress' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#F59E0B',
              }}
            />
            In Progress
          </button>

          <button
            type="button"
            disabled={!canModifyStatus}
            onClick={() => handleStatusClick('completed')}
            style={{
              flex: 1,
              padding: '10px 0',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: canModifyStatus ? 'pointer' : 'default',
              backgroundColor: task.status === 'completed' ? 'var(--color-surface)' : 'transparent',
              color:
                task.status === 'completed'
                  ? 'var(--color-success)'
                  : 'var(--color-text-secondary)',
              boxShadow: task.status === 'completed' ? 'var(--shadow-sm)' : 'none',
              transition: 'all 150ms ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
              }}
            />
            Completed ✓
          </button>
        </div>

        {/* Schedule & Deadline Box */}
        <div
          style={{
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${isOverdue ? 'var(--color-danger)' : 'var(--color-border)'}`,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar
              size={18}
              color={isOverdue ? 'var(--color-danger)' : 'var(--color-primary)'}
            />
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                DEADLINE
              </div>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-primary)',
                }}
              >
                {deadlineDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}{' '}
                at {deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {task.createdBy && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
              Assigned by{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>{task.createdBy.name}</strong>
            </div>
          )}
        </div>

        {/* Section Tabs Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--color-border)',
            gap: '16px',
          }}
        >
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{
              borderRadius: 0,
              borderBottom:
                activeTab === 'overview'
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
              color:
                activeTab === 'overview' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'overview' ? 700 : 500,
              padding: '6px 4px',
            }}
            onClick={() => setActiveTab('overview')}
          >
            Overview & Assignees
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{
              borderRadius: 0,
              borderBottom:
                activeTab === 'history'
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
              color:
                activeTab === 'history' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'history' ? 700 : 500,
              padding: '6px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setActiveTab('history')}
          >
            <History size={14} /> Status History ({task.statusHistory?.length || 1})
          </button>

          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{
              borderRadius: 0,
              borderBottom:
                activeTab === 'comments'
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
              color:
                activeTab === 'comments' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              fontWeight: activeTab === 'comments' ? 700 : 500,
              padding: '6px 4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() => setActiveTab('comments')}
          >
            <MessageCircle size={14} /> Progress Updates ({task.comments?.length || 0})
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Description */}
            <div>
              <h4
                style={{
                  fontSize: '12.5px',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                Instructions / Acceptance Criteria
              </h4>
              <div
                style={{
                  fontSize: '13.5px',
                  lineHeight: 1.5,
                  color: 'var(--color-text-primary)',
                  backgroundColor: 'var(--color-surface-alt)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {task.description || 'No detailed instructions provided for this task.'}
              </div>
            </div>

            {/* Assignees */}
            <div>
              <h4
                style={{
                  fontSize: '12.5px',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                }}
              >
                Assigned Teammates ({task.assignedTo?.length || 0})
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                  gap: '8px',
                }}
              >
                {task.assignedTo?.map((u) => (
                  <div
                    key={u._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      backgroundColor: 'var(--color-surface-alt)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <Avatar name={u.name} src={u.avatar} size="xs" />
                    <div style={{ overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: '12.5px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {u.name}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {u.post || u.department || 'Member'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Status History Timeline */}
        {activeTab === 'history' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              maxHeight: '240px',
              overflowY: 'auto',
            }}
          >
            {!task.statusHistory || task.statusHistory.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  color: 'var(--color-text-muted)',
                  fontSize: '13px',
                }}
              >
                No status transitions recorded yet.
              </div>
            ) : (
              task.statusHistory.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '10px 12px',
                    backgroundColor: 'var(--color-surface-alt)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor:
                        item.status === 'completed'
                          ? 'var(--color-success-soft)'
                          : item.status === 'inprogress'
                            ? 'var(--color-warning-soft)'
                            : 'var(--color-surface)',
                      color:
                        item.status === 'completed'
                          ? 'var(--color-success)'
                          : item.status === 'inprogress'
                            ? 'var(--color-warning)'
                            : 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>
                        Status set to{' '}
                        <span style={{ textTransform: 'uppercase', color: 'var(--color-primary)' }}>
                          {item.status}
                        </span>
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {new Date(item.changedAt).toLocaleString()}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        marginTop: '2px',
                      }}
                    >
                      Updated by {item.changedBy?.name || 'Workspace User'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Comments & Updates */}
        {activeTab === 'comments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Info bar */}
            <div
              style={{
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <MessageCircle size={13} />
              {isAdmin
                ? 'Assignees post progress updates here. You can monitor and respond.'
                : 'Post progress updates here. Your manager/admin can see these updates.'}
            </div>

            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {!task.comments || task.comments.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '24px',
                    color: 'var(--color-text-muted)',
                    fontSize: '13px',
                  }}
                >
                  No progress updates yet. Post the first update below.
                </div>
              ) : (
                task.comments.map((c, idx) => {
                  const isOwnComment = (c.user?._id || c.user)?.toString() === currentUserId;
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 12px',
                        backgroundColor: isOwnComment
                          ? 'var(--color-primary-soft)'
                          : 'var(--color-surface-alt)',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${isOwnComment ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        fontSize: '12.5px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Avatar name={c.user?.name || 'User'} src={c.user?.avatar} size="xs" />
                          <span
                            style={{
                              fontWeight: 600,
                              color: 'var(--color-text-primary)',
                              fontSize: '13px',
                            }}
                          >
                            {c.user?.name || 'Teammate'}
                            {isOwnComment && (
                              <span
                                style={{
                                  fontWeight: 400,
                                  color: 'var(--color-primary)',
                                  fontSize: '11px',
                                  marginLeft: '6px',
                                }}
                              >
                                You
                              </span>
                            )}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-muted)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {new Date(c.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                          {' · '}
                          {new Date(c.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        style={{
                          color: 'var(--color-text-primary)',
                          lineHeight: 1.5,
                          paddingLeft: '32px',
                        }}
                      >
                        {c.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={handleAddComment}
              style={{ display: 'flex', gap: '8px', marginTop: '4px' }}
            >
              <input
                type="text"
                placeholder={isAdmin ? 'Add a note or instruction...' : 'Post a progress update...'}
                className="form-input"
                style={{ height: '38px', fontSize: '13px' }}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button
                type="submit"
                disabled={submittingComment || !commentText.trim()}
                className="btn btn-primary btn-sm"
              >
                <Send size={14} /> Send
              </button>
            </form>
          </div>
        )}

        {/* Admin Controls */}
        {isAdmin && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '16px',
              marginTop: '4px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Admin Actions
            </span>

            <div style={{ display: 'flex', gap: '8px' }}>
              {onEdit && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    onClose();
                    onEdit(task);
                  }}
                >
                  <Edit2 size={13} /> Edit Task
                </button>
              )}

              {onDelete && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--color-danger)' }}
                  onClick={() => {
                    confirm({
                      title: 'Delete Task',
                      message: `Are you sure you want to delete task "${task.title}"?`,
                      confirmText: 'Delete Task',
                      type: 'danger',
                      onConfirm: () => {
                        onDelete(task._id);
                        onClose();
                      },
                    });
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TaskDetailModal;
