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
  Clock,
  Check,
  XCircle,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
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

  // User Submission note state
  const [showSubmitPrompt, setShowSubmitPrompt] = useState(false);
  const [submissionNote, setSubmissionNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Admin Rejection state
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  if (!task) return null;

  const isAssigned = task.assignedTo?.some((u) => (u._id || u).toString() === currentUserId);
  const canModifyStatus = isAdmin || isAssigned;

  // Deadline & Overdue Calculation
  const deadlineDate = new Date(task.deadline);
  const now = new Date();
  const isCompleted = task.status === 'completed';
  const isOverdue = !isCompleted && deadlineDate < now;
  const isDueSoon = !isCompleted && !isOverdue && deadlineDate - now < 48 * 3600 * 1000;

  // Find latest rejection note if reopened
  const latestReopenedEntry = task.statusHistory
    ?.slice()
    .reverse()
    .find((h) => h.status === 'reopened' && h.note);

  // Find latest submission note if submittedForReview
  const latestSubmissionEntry = task.statusHistory
    ?.slice()
    .reverse()
    .find((h) => h.status === 'submittedForReview' && h.note);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'todo':
        return <Badge variant="neutral">TO DO</Badge>;
      case 'inprogress':
        return <Badge variant="primary">IN PROGRESS</Badge>;
      case 'submittedForReview':
        return (
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#B45309',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={12} /> AWAITING REVIEW
          </span>
        );
      case 'reopened':
        return (
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#B91C1C',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <AlertTriangle size={12} /> CHANGES REQUESTED
          </span>
        );
      case 'completed':
        return (
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#047857',
              backgroundColor: '#D1FAE5',
              border: '1px solid #6EE7B7',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <CheckCircle2 size={12} /> VERIFIED DONE
          </span>
        );
      default:
        return <Badge variant="neutral">{status?.toUpperCase()}</Badge>;
    }
  };

  const getPriorityBadge = (p) => {
    if (p === 'urgent') return <Badge variant="danger">URGENT</Badge>;
    if (p === 'high') return <Badge variant="warning">HIGH PRIORITY</Badge>;
    if (p === 'medium') return <Badge variant="primary">MEDIUM</Badge>;
    return <Badge variant="neutral">LOW</Badge>;
  };

  // Quick direct status transition
  const handleSimpleStatusTransition = async (newStatus) => {
    if (!canModifyStatus) return;
    try {
      await onStatusChange(task._id, newStatus);
    } catch (_err) {
      addToast('Failed to update status', 'error');
    }
  };

  // Submit for Admin Review with optional note
  const handleSubmitForReview = async (e) => {
    if (e) e.preventDefault();
    setIsSubmittingReview(true);
    try {
      await onStatusChange(task._id, 'submittedForReview', submissionNote.trim());
      setShowSubmitPrompt(false);
      setSubmissionNote('');
    } catch (_err) {
      addToast('Failed to submit task for review', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Admin Reject with required note
  const handleAdminReject = async (e) => {
    if (e) e.preventDefault();
    if (!rejectionNote.trim()) {
      addToast('A feedback note is required to explain what needs fixing', 'error');
      return;
    }
    setIsRejecting(true);
    try {
      await onStatusChange(task._id, 'reopened', rejectionNote.trim());
      setShowRejectPrompt(false);
      setRejectionNote('');
    } catch (_err) {
      addToast('Failed to reject task', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  // Admin Approve
  const handleAdminApprove = async () => {
    try {
      await onStatusChange(task._id, 'completed');
    } catch (_err) {
      addToast('Failed to approve task', 'error');
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task & Work Deliverable" maxWidth="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            {getStatusBadge(task.status)}
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
          </div>

          <h2 style={{ fontSize: '19px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>
            {task.title}
          </h2>
        </div>

        {/* 1. REJECTED / REOPENED PROMINENT FEEDBACK CALLOUT */}
        {task.status === 'reopened' && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1.5px solid #F87171',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#B91C1C',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              <AlertTriangle size={16} />
              <span>Admin Feedback & Required Changes:</span>
            </div>
            <div
              style={{
                fontSize: '13.5px',
                color: '#7F1D1D',
                lineHeight: 1.4,
                paddingLeft: '24px',
                whiteSpace: 'pre-wrap',
                fontWeight: 500,
              }}
            >
              {latestReopenedEntry?.note ||
                'Task was reopened by administrator. Please resolve necessary updates and submit for review again.'}
            </div>
            {latestReopenedEntry?.changedBy?.name && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#991B1B',
                  paddingLeft: '24px',
                  marginTop: '2px',
                }}
              >
                Feedback from {latestReopenedEntry.changedBy.name} on{' '}
                {new Date(latestReopenedEntry.changedAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. VERIFIED COMPLETED BANNER */}
        {task.status === 'completed' && (
          <div
            style={{
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <ShieldCheck size={20} color="#10B981" />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#047857' }}>
                Deliverable Verified & Closed
              </div>
              <div style={{ fontSize: '12px', color: '#065F46', marginTop: '1px' }}>
                Verified by {task.verifiedBy?.name || 'Administrator'} on{' '}
                {new Date(task.verifiedAt || task.updatedAt).toLocaleDateString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. AWAITING REVIEW BANNER & ACTIONS */}
        {task.status === 'submittedForReview' && (
          <div
            style={{
              backgroundColor: '#FFFBEB',
              border: '1.5px solid #FCD34D',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={17} color="#D97706" />
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400E' }}>
                Awaiting Administrator Verification
              </span>
            </div>

            {latestSubmissionEntry?.note && (
              <div
                style={{
                  fontSize: '13px',
                  color: '#78350F',
                  backgroundColor: '#FEF3C7',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #FDE68A',
                }}
              >
                <strong>Assignee Submission Note:</strong> {latestSubmissionEntry.note}
              </div>
            )}

            {/* Admin Verification Action Buttons */}
            {isAdmin ? (
              <div>
                {!showRejectPrompt ? (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        backgroundColor: '#10B981',
                        borderColor: '#10B981',
                        flex: 1,
                        height: '36px',
                        fontSize: '13px',
                        gap: '6px',
                      }}
                      onClick={handleAdminApprove}
                    >
                      <Check size={15} /> Approve & Mark Completed
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        color: '#DC2626',
                        borderColor: '#FCA5A5',
                        flex: 1,
                        height: '36px',
                        fontSize: '13px',
                        gap: '6px',
                      }}
                      onClick={() => setShowRejectPrompt(true)}
                    >
                      <XCircle size={15} /> Request Changes (Reject)
                    </button>
                  </div>
                ) : (
                  /* Admin Rejection Note Input Form */
                  <form
                    onSubmit={handleAdminReject}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}
                  >
                    <label
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#991B1B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <AlertTriangle size={13} />
                      Feedback Note (Required — what needs to be fixed?):
                    </label>
                    <textarea
                      required
                      placeholder="e.g. Please update the unit tests and adjust token contrast before approval..."
                      className="form-textarea"
                      rows={3}
                      style={{ fontSize: '13px', borderColor: '#F87171' }}
                      value={rejectionNote}
                      onChange={(e) => setRejectionNote(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setShowRejectPrompt(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isRejecting || !rejectionNote.trim()}
                        className="btn btn-primary btn-sm"
                        style={{ backgroundColor: '#DC2626', borderColor: '#DC2626' }}
                      >
                        {isRejecting ? 'Rejecting...' : 'Confirm Changes Request'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '12px', color: '#B45309' }}>
                Your work has been submitted to workspace administrators for review. You will be
                notified once approved or if changes are requested.
              </div>
            )}
          </div>
        )}

        {/* 4. WORKFLOW ACTION BUTTONS FOR ASSIGNEE / ADMIN (WHEN NOT SUBMITTED FOR REVIEW) */}
        {task.status !== 'submittedForReview' && (
          <div
            style={{
              backgroundColor: 'var(--color-surface-alt)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              padding: '12px 14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                Workflow Action:
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {/* To Do -> Start Task */}
                {task.status === 'todo' && (
                  <button
                    type="button"
                    disabled={!canModifyStatus}
                    className="btn btn-primary btn-sm"
                    onClick={() => handleSimpleStatusTransition('inprogress')}
                  >
                    Start Task <ArrowRight size={13} />
                  </button>
                )}

                {/* In Progress or Reopened -> Submit for Review */}
                {(task.status === 'inprogress' || task.status === 'reopened') && (
                  <>
                    {task.status === 'reopened' && (
                      <button
                        type="button"
                        disabled={!canModifyStatus}
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSimpleStatusTransition('inprogress')}
                      >
                        Resume Task
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!canModifyStatus}
                      className="btn btn-primary btn-sm"
                      style={{ backgroundColor: '#F59E0B', borderColor: '#F59E0B', color: '#FFFFFF' }}
                      onClick={() => setShowSubmitPrompt((prev) => !prev)}
                    >
                      <CheckCircle2 size={14} /> Submit for Review
                    </button>
                  </>
                )}

                {/* Completed -> Admin can reopen */}
                {task.status === 'completed' && isAdmin && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ border: '1px solid var(--color-border)' }}
                    onClick={() => handleSimpleStatusTransition('inprogress')}
                  >
                    <RotateCcw size={13} /> Reopen Deliverable
                  </button>
                )}
              </div>
            </div>

            {/* Prompt for optional submission note */}
            {showSubmitPrompt && (
              <form
                onSubmit={handleSubmitForReview}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Submission Note / What was accomplished? (Optional):
                </label>
                <textarea
                  placeholder="e.g. Completed theme tokens in index.css, verified contrast ratios on all devices..."
                  className="form-textarea"
                  rows={2}
                  style={{ fontSize: '12.5px' }}
                  value={submissionNote}
                  onChange={(e) => setSubmissionNote(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setShowSubmitPrompt(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="btn btn-primary btn-sm"
                    style={{ backgroundColor: '#F59E0B', borderColor: '#F59E0B' }}
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Confirm Submission'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Schedule & Deadline Box */}
        <div
          style={{
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${isOverdue ? 'var(--color-danger)' : 'var(--color-border)'}`,
            padding: '12px 16px',
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
                  fontSize: '13px',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Description */}
            <div>
              <h4
                style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: '6px',
                }}
              >
                Instructions / Acceptance Criteria
              </h4>
              <div
                style={{
                  fontSize: '13px',
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
                  fontSize: '12px',
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
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
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
              gap: '10px',
              maxHeight: '260px',
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
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor:
                        item.status === 'completed'
                          ? 'rgba(16, 185, 129, 0.2)'
                          : item.status === 'submittedForReview'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : item.status === 'reopened'
                              ? 'rgba(239, 68, 68, 0.2)'
                              : 'var(--color-surface)',
                      color:
                        item.status === 'completed'
                          ? '#10B981'
                          : item.status === 'submittedForReview'
                            ? '#F59E0B'
                            : item.status === 'reopened'
                              ? '#EF4444'
                              : 'var(--color-text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
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
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>
                        {getStatusBadge(item.status)}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {new Date(item.changedAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-text-secondary)',
                        marginTop: '4px',
                      }}
                    >
                      Updated by <strong>{item.changedBy?.name || 'Workspace User'}</strong>
                    </div>

                    {item.note && (
                      <div
                        style={{
                          marginTop: '6px',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor:
                            item.status === 'reopened'
                              ? '#FEF2F2'
                              : 'var(--color-surface)',
                          border: `1px solid ${item.status === 'reopened' ? '#FCA5A5' : 'var(--color-border)'}`,
                          fontSize: '12px',
                          color: item.status === 'reopened' ? '#991B1B' : 'var(--color-text-primary)',
                          lineHeight: 1.4,
                        }}
                      >
                        <strong>{item.status === 'reopened' ? 'Feedback Reason:' : 'Note:'}</strong>{' '}
                        {item.note}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Comments & Updates */}
        {activeTab === 'comments' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              paddingTop: '14px',
              marginTop: '4px',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Admin Controls
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
