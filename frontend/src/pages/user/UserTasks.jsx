import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  AlertTriangle,
  Columns,
  List,
  Search,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/Badge';
import TaskDetailModal from '../../components/TaskDetailModal';

const UserTasks = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const { socket } = useSocket();

  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [activeTaskDetail, setActiveTaskDetail] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      const params = {};
      if (selectedPriority) params.priority = selectedPriority;

      const queryStr = new URLSearchParams(params).toString();
      const { data } = await api.get(`/tasks${queryStr ? '?' + queryStr : ''}`);
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (_err) {
      addToast('Failed to load tasks', 'error');
    }
  }, [selectedPriority, addToast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Real-time socket sync
  useEffect(() => {
    if (!socket) return;

    const handleTaskNew = () => fetchTasks();
    const handleTaskUpdated = (updatedTask) => {
      setTasks((prev) =>
        prev.map((t) =>
          t._id === updatedTask._id || t._id === updatedTask.task?._id
            ? updatedTask.task || updatedTask
            : t
        )
      );
      if (
        activeTaskDetail &&
        (activeTaskDetail._id === updatedTask._id || activeTaskDetail._id === updatedTask.task?._id)
      ) {
        setActiveTaskDetail(updatedTask.task || updatedTask);
      }
    };
    const handleTaskDeleted = ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
      if (activeTaskDetail?._id === taskId) setActiveTaskDetail(null);
    };

    socket.on('task_created', handleTaskNew);
    socket.on('task:new', handleTaskNew);
    socket.on('task:assigned', handleTaskNew);
    socket.on('task_updated', handleTaskUpdated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:statusChanged', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);

    return () => {
      socket.off('task_created', handleTaskNew);
      socket.off('task:new', handleTaskNew);
      socket.off('task:assigned', handleTaskNew);
      socket.off('task_updated', handleTaskUpdated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:statusChanged', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
    };
  }, [socket, activeTaskDetail, fetchTasks]);

  const handleStatusChange = async (taskId, newStatus, note = '') => {
    try {
      // Optimistic local update
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));

      const payload = { status: newStatus };
      if (note && note.trim()) payload.note = note.trim();

      const { data } = await api.patch(`/tasks/${taskId}/status`, payload);
      if (data.success) {
        const msg =
          newStatus === 'submittedForReview'
            ? 'Task submitted for Admin review!'
            : `Task moved to ${newStatus.toUpperCase()}`;
        addToast(msg, 'info', 2000);
        if (activeTaskDetail?._id === taskId) {
          setActiveTaskDetail(data.task);
        }
        fetchTasks();
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update task status', 'error');
      fetchTasks();
    }
  };

  const getPriorityBadge = (p) => {
    if (p === 'urgent') return <Badge variant="danger">URGENT</Badge>;
    if (p === 'high') return <Badge variant="warning">HIGH</Badge>;
    if (p === 'medium') return <Badge variant="primary">MEDIUM</Badge>;
    return <Badge variant="neutral">LOW</Badge>;
  };

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
              fontSize: '11px',
              fontWeight: 700,
              color: '#B45309',
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              padding: '2px 7px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            AWAITING REVIEW
          </span>
        );
      case 'reopened':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#B91C1C',
              backgroundColor: '#FEE2E2',
              border: '1px solid #FCA5A5',
              padding: '2px 7px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            CHANGES REQUESTED
          </span>
        );
      case 'completed':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#047857',
              backgroundColor: '#D1FAE5',
              border: '1px solid #6EE7B7',
              padding: '2px 7px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            VERIFIED
          </span>
        );
      default:
        return <Badge variant="neutral">{status?.toUpperCase()}</Badge>;
    }
  };

  const now = new Date();
  const overdueTasksCount = tasks.filter(
    (t) => t.status !== 'completed' && new Date(t.deadline) < now
  ).length;

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.groupId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(
    (t) => t.status === 'inprogress' || t.status === 'reopened'
  );
  const pendingReviewTasks = filteredTasks.filter((t) => t.status === 'submittedForReview');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>My Assigned Tasks & Work</h1>
          <p>
            Track your deliverables through To Do → In Progress → Submitted for Review →
            Admin Verification.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-surface-alt)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            padding: '2px',
          }}
        >
          <button
            className={`btn btn-ghost btn-icon ${viewMode === 'kanban' ? 'active' : ''}`}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: viewMode === 'kanban' ? 'var(--color-surface)' : 'transparent',
            }}
            onClick={() => setViewMode('kanban')}
            title="Kanban Board View"
          >
            <Columns size={16} />
          </button>
          <button
            className={`btn btn-ghost btn-icon ${viewMode === 'list' ? 'active' : ''}`}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: viewMode === 'list' ? 'var(--color-surface)' : 'transparent',
            }}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {/* Overdue Alert Banner */}
      {overdueTasksCount > 0 && (
        <div
          style={{
            backgroundColor: 'var(--color-danger-soft)',
            border: '1px solid var(--color-danger)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--color-danger)',
            fontSize: '13.5px',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={18} />
          <span>
            You have {overdueTasksCount} overdue {overdueTasksCount === 1 ? 'task' : 'tasks'}{' '}
            requiring attention.
          </span>
        </div>
      )}

      {/* Motivational Completed Banner */}
      {completedTasks.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#10B981',
            fontSize: '13.5px',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>
            🎉 Great work! You have {completedTasks.length} verified completed{' '}
            {completedTasks.length === 1 ? 'deliverable' : 'deliverables'} in this workspace.
          </span>
        </div>
      )}

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: 'var(--color-surface)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="search-input-box"
          style={{ flex: '1 1 200px', maxWidth: '320px', minWidth: '160px' }}
        >
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Search your tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ flex: '1 1 140px', minWidth: '120px', height: '34px', fontSize: '12.5px' }}
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Kanban Board View — 4 Columns */}
      {viewMode === 'kanban' ? (
        <div
          className="kanban-grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          }}
        >
          {/* Column 1: To Do */}
          <div className="kanban-col">
            <div className="kanban-col-header">
              <div className="kanban-col-title">
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: '#94A3B8',
                  }}
                />
                <span>To Do</span>
              </div>
              <Badge variant="neutral">{todoTasks.length}</Badge>
            </div>

            {todoTasks.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 16px',
                  color: 'var(--color-text-muted)',
                  fontSize: '12.5px',
                }}
              >
                No tasks to do
              </div>
            ) : (
              todoTasks.map((task) => {
                const isOverdue = new Date(task.deadline) < now;
                return (
                  <div
                    key={task._id}
                    className="task-card"
                    style={{
                      borderLeft: isOverdue ? '3.5px solid var(--color-danger)' : '3.5px solid #94A3B8',
                    }}
                    onClick={() => setActiveTaskDetail(task)}
                  >
                    <div className="task-card-header">
                      <div className="task-card-header-left">
                        {getPriorityBadge(task.priority)}
                        {task.groupId && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-primary)',
                              backgroundColor: 'var(--color-primary-soft)',
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-full)',
                              fontWeight: 600,
                            }}
                          >
                            #{task.groupId?.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="task-card-title">{task.title}</div>
                    {task.description && <div className="task-card-desc">{task.description}</div>}

                    {isOverdue && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          color: 'var(--color-danger)',
                          fontWeight: 700,
                        }}
                      >
                        <AlertTriangle size={12} /> OVERDUE
                      </div>
                    )}

                    <div className="task-card-footer">
                      <div className={`task-card-date ${isOverdue ? 'is-overdue' : ''}`}>
                        <Calendar size={13} />
                        <span>
                          Due{' '}
                          {new Date(task.deadline).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="task-card-actions">
                      <button
                        type="button"
                        className="btn btn-secondary task-card-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(task._id, 'inprogress');
                        }}
                        title="Start working on task"
                      >
                        Start Task <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Column 2: In Progress / Reopened */}
          <div className="kanban-col">
            <div className="kanban-col-header">
              <div className="kanban-col-title">
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: '#3B82F6',
                  }}
                />
                <span>In Progress</span>
              </div>
              <Badge variant="primary">{inProgressTasks.length}</Badge>
            </div>

            {inProgressTasks.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 16px',
                  color: 'var(--color-text-muted)',
                  fontSize: '12.5px',
                }}
              >
                No tasks in progress
              </div>
            ) : (
              inProgressTasks.map((task) => {
                const isOverdue = new Date(task.deadline) < now;
                const isReopened = task.status === 'reopened';
                const latestNote = task.statusHistory
                  ?.slice()
                  .reverse()
                  .find((h) => h.status === 'reopened' && h.note)?.note;

                return (
                  <div
                    key={task._id}
                    className="task-card"
                    style={{
                      borderLeft: isReopened
                        ? '3.5px solid #EF4444'
                        : isOverdue
                          ? '3.5px solid var(--color-danger)'
                          : '3.5px solid #3B82F6',
                    }}
                    onClick={() => setActiveTaskDetail(task)}
                  >
                    <div className="task-card-header">
                      <div className="task-card-header-left">
                        {isReopened ? (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: '#B91C1C',
                              backgroundColor: '#FEE2E2',
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            ⚠️ CHANGES REQUESTED
                          </span>
                        ) : (
                          getPriorityBadge(task.priority)
                        )}
                        {task.groupId && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-primary)',
                              backgroundColor: 'var(--color-primary-soft)',
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-full)',
                              fontWeight: 600,
                            }}
                          >
                            #{task.groupId?.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="task-card-title">{task.title}</div>
                    {task.description && <div className="task-card-desc">{task.description}</div>}

                    {isReopened && latestNote && (
                      <div
                        style={{
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FCA5A5',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 8px',
                          fontSize: '11.5px',
                          color: '#991B1B',
                          lineHeight: 1.3,
                        }}
                      >
                        <strong>Feedback:</strong> {latestNote}
                      </div>
                    )}

                    {isOverdue && !isReopened && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '11px',
                          color: 'var(--color-danger)',
                          fontWeight: 700,
                        }}
                      >
                        <AlertTriangle size={12} /> OVERDUE
                      </div>
                    )}

                    <div className="task-card-footer">
                      <div className={`task-card-date ${isOverdue ? 'is-overdue' : ''}`}>
                        <Calendar size={13} />
                        <span>
                          Due{' '}
                          {new Date(task.deadline).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="task-card-actions">
                      <button
                        type="button"
                        className="btn btn-primary task-card-action-btn"
                        style={{
                          flex: 1,
                          backgroundColor: '#F59E0B',
                          borderColor: '#F59E0B',
                          color: '#FFFFFF',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTaskDetail(task);
                        }}
                        title="Mark as Done & Submit for Review"
                      >
                        <CheckCircle2 size={13} /> Mark as Done
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Column 3: Pending Review */}
          <div className="kanban-col">
            <div className="kanban-col-header">
              <div className="kanban-col-title">
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: '#F59E0B',
                  }}
                />
                <span>Pending Review</span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#FEF3C7',
                  color: '#B45309',
                  padding: '2px 6px',
                  borderRadius: '10px',
                }}
              >
                {pendingReviewTasks.length}
              </span>
            </div>

            {pendingReviewTasks.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 16px',
                  color: 'var(--color-text-muted)',
                  fontSize: '12.5px',
                }}
              >
                No tasks currently in review
              </div>
            ) : (
              pendingReviewTasks.map((task) => {
                const submissionNote = task.statusHistory
                  ?.slice()
                  .reverse()
                  .find((h) => h.status === 'submittedForReview' && h.note)?.note;

                return (
                  <div
                    key={task._id}
                    className="task-card"
                    style={{
                      borderLeft: '3.5px solid #F59E0B',
                    }}
                    onClick={() => setActiveTaskDetail(task)}
                  >
                    <div className="task-card-header">
                      <div className="task-card-header-left">
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: '#B45309',
                            backgroundColor: '#FEF3C7',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          ⏳ IN REVIEW
                        </span>
                        {task.groupId && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-primary)',
                              backgroundColor: 'var(--color-primary-soft)',
                              padding: '2px 7px',
                              borderRadius: 'var(--radius-full)',
                              fontWeight: 600,
                            }}
                          >
                            #{task.groupId?.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="task-card-title">{task.title}</div>
                    {task.description && <div className="task-card-desc">{task.description}</div>}

                    {submissionNote && (
                      <div
                        style={{
                          backgroundColor: '#FFFBEB',
                          border: '1px solid #FDE68A',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 8px',
                          fontSize: '11.5px',
                          color: '#78350F',
                          lineHeight: 1.3,
                        }}
                      >
                        <strong>Your note:</strong> {submissionNote}
                      </div>
                    )}

                    <div className="task-card-footer">
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#B45309',
                          fontWeight: 600,
                        }}
                      >
                        Submitted on{' '}
                        {new Date(task.submittedAt || task.updatedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="task-card-actions">
                      <div
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#B45309',
                          backgroundColor: '#FEF3C7',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #FCD34D',
                        }}
                      >
                        Waiting for Admin review
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Column 4: Completed */}
          <div className="kanban-col">
            <div className="kanban-col-header">
              <div className="kanban-col-title">
                <span
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                  }}
                />
                <span>Completed</span>
              </div>
              <Badge variant="success">{completedTasks.length}</Badge>
            </div>

            {completedTasks.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '48px 16px',
                  color: 'var(--color-text-muted)',
                  fontSize: '12.5px',
                }}
              >
                No completed deliverables yet
              </div>
            ) : (
              completedTasks.map((task) => (
                <div
                  key={task._id}
                  className="task-card"
                  style={{
                    borderLeft: '3.5px solid #10B981',
                  }}
                  onClick={() => setActiveTaskDetail(task)}
                >
                  <div className="task-card-header">
                    <div className="task-card-header-left">
                      <Badge variant="success">DONE</Badge>
                      {task.groupId && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-primary)',
                            backgroundColor: 'var(--color-primary-soft)',
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-full)',
                            fontWeight: 600,
                          }}
                        >
                          #{task.groupId?.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="task-card-title"
                    style={{ textDecoration: 'line-through', opacity: 0.8 }}
                  >
                    {task.title}
                  </div>

                  <div className="task-card-footer">
                    <span
                      style={{ fontSize: '11.5px', color: '#047857', fontWeight: 600 }}
                    >
                      ✓ Verified by {task.verifiedBy?.name || 'Admin'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* List / Table View */
        <div className="table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Task & Deliverable</th>
                <th>Priority</th>
                <th>Channel</th>
                <th>Deadline</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: 'center',
                      padding: '32px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    No tasks assigned to you right now.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isOverdue = task.status !== 'completed' && new Date(task.deadline) < now;
                  return (
                    <tr
                      key={task._id}
                      onClick={() => setActiveTaskDetail(task)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{task.title}</div>
                        {isOverdue && (
                          <span
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-danger)',
                              fontWeight: 700,
                            }}
                          >
                            ⚠️ Overdue
                          </span>
                        )}
                      </td>
                      <td>{getPriorityBadge(task.priority)}</td>
                      <td>{task.groupId ? `#${task.groupId?.name}` : 'Workspace'}</td>
                      <td>
                        <span
                          style={{
                            color: isOverdue ? 'var(--color-danger)' : 'inherit',
                            fontWeight: isOverdue ? 700 : 400,
                          }}
                        >
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      </td>
                      <td>{getStatusBadge(task.status)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {task.status === 'todo' ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(task._id, 'inprogress');
                            }}
                          >
                            Start Task →
                          </button>
                        ) : task.status === 'inprogress' || task.status === 'reopened' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{
                              backgroundColor: '#F59E0B',
                              borderColor: '#F59E0B',
                              color: '#FFFFFF',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveTaskDetail(task);
                            }}
                          >
                            Mark as Done
                          </button>
                        ) : task.status === 'submittedForReview' ? (
                          <span
                            style={{
                              fontSize: '11.5px',
                              color: '#B45309',
                              fontWeight: 600,
                            }}
                          >
                            In Review
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '11.5px',
                              color: '#047857',
                              fontWeight: 600,
                            }}
                          >
                            ✓ Done
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Task Detail Modal */}
      {activeTaskDetail && (
        <TaskDetailModal
          isOpen={!!activeTaskDetail}
          onClose={() => setActiveTaskDetail(null)}
          task={activeTaskDetail}
          isAdmin={false}
          currentUserId={user?.id}
          onStatusChange={handleStatusChange}
          onTaskUpdated={(updated) => setActiveTaskDetail(updated)}
        />
      )}
    </div>
  );
};

export default UserTasks;
