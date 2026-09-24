import { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, AlertTriangle, Trash2, List, Columns, Search, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import Badge from '../../components/Badge';
import CreateTaskModal from '../../components/CreateTaskModal';
import TaskDetailModal from '../../components/TaskDetailModal';

const AdminTasks = ({ users = [], groups = [] }) => {
  const { user } = useAuth();
  const { addToast, confirm } = useNotification();
  const { socket } = useSocket();

  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'list'

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeTaskDetail, setActiveTaskDetail] = useState(null);

  const fetchTasks = useCallback(async () => {
    try {
      const params = {};
      if (selectedGroupId) params.groupId = selectedGroupId;
      if (selectedAssigneeId) params.assignedTo = selectedAssigneeId;
      if (selectedPriority) params.priority = selectedPriority;

      const queryStr = new URLSearchParams(params).toString();
      const { data } = await api.get(`/tasks${queryStr ? '?' + queryStr : ''}`);
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (_err) {
      addToast('Failed to load tasks', 'error');
    }
  }, [selectedGroupId, selectedAssigneeId, selectedPriority, addToast]);

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

  // Create or Edit Submit
  const handleSaveTask = async (formData) => {
    if (editingTask) {
      const { data } = await api.put(`/tasks/${editingTask._id}`, formData);
      if (data.success) {
        addToast('Task updated successfully!', 'success');
        setEditingTask(null);
        fetchTasks();
      }
    } else {
      const { data } = await api.post('/tasks', formData);
      if (data.success) {
        addToast('Task created and assigned!', 'success');
        fetchTasks();
      }
    }
  };

  // Status Change
  const handleStatusChange = async (taskId, newStatus, note = '') => {
    try {
      // Optimistic local update
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));

      const payload = { status: newStatus };
      if (note && note.trim()) payload.note = note.trim();

      const { data } = await api.patch(`/tasks/${taskId}/status`, payload);
      if (data.success) {
        const msg =
          newStatus === 'completed'
            ? 'Task deliverable approved & verified!'
            : newStatus === 'reopened'
              ? 'Changes requested — task reopened.'
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

  // Soft Delete Task
  const handleDeleteTask = async (taskId) => {
    try {
      const { data } = await api.delete(`/tasks/${taskId}`);
      if (data.success) {
        addToast('Task removed from workspace', 'success');
        setActiveTaskDetail(null);
        fetchTasks();
      }
    } catch (_err) {
      addToast('Failed to delete task', 'error');
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

  // Search & filter
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);

  const filteredTasks = tasks.filter((t) => {
    if (filterPendingOnly && t.status !== 'submittedForReview') return false;
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.groupId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assignedTo?.some((u) => u.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const now = new Date();
  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(
    (t) => t.status === 'inprogress' || t.status === 'reopened'
  );
  const pendingReviewTasks = filteredTasks.filter((t) => t.status === 'submittedForReview');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');
  const totalPendingReviewCount = tasks.filter((t) => t.status === 'submittedForReview').length;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Work & Task Management</h1>
          <p>
            Assign work deliverables, review submissions, verify task completion, and track
            team velocity across Kanban stages.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
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
              title="Table / List View"
            >
              <List size={16} />
            </button>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingTask(null);
              setIsCreateOpen(true);
            }}
          >
            <Plus size={16} /> Create & Assign Task
          </button>
        </div>
      </div>

      {/* Pending Review Quick Alert / Filter Banner */}
      {totalPendingReviewCount > 0 && (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FCD34D',
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#F59E0B',
                animation: 'pulse 1.5s infinite',
              }}
            />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400E' }}>
              {totalPendingReviewCount} {totalPendingReviewCount === 1 ? 'task is' : 'tasks are'}{' '}
              submitted and awaiting your verification
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{
              backgroundColor: filterPendingOnly ? '#FEF3C7' : '#FFFFFF',
              borderColor: '#FCD34D',
              color: '#B45309',
              fontWeight: 700,
            }}
            onClick={() => setFilterPendingOnly((prev) => !prev)}
          >
            {filterPendingOnly ? 'Show All Stages' : 'View Pending Queue Only →'}
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="filter-bar-container">
        <div className="search-input-box filter-search-input">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search tasks, descriptions, or assignees..."
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Channel Filter */}
        <select
          className="form-select filter-select"
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          <option value="">All Channels</option>
          {groups.map((g) => (
            <option key={g._id} value={g._id}>
              #{g.name}
            </option>
          ))}
        </select>

        {/* Assignee Filter */}
        <select
          className="form-select filter-select"
          value={selectedAssigneeId}
          onChange={(e) => setSelectedAssigneeId(e.target.value)}
        >
          <option value="">All Assignees</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          className="form-select filter-select"
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
                No tasks in To Do
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

                      <div className="task-card-header-right">
                        <button
                          type="button"
                          className="task-card-quick-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task);
                            setIsCreateOpen(true);
                          }}
                          title="Edit Task"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          className="task-card-quick-btn danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirm({
                              title: 'Delete Task',
                              message: `Are you sure you want to delete task "${task.title}"?`,
                              confirmText: 'Delete Task',
                              type: 'danger',
                              onConfirm: () => handleDeleteTask(task._id),
                            });
                          }}
                          title="Delete Task"
                        >
                          <Trash2 size={12} />
                        </button>
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

                      <div style={{ display: 'flex' }}>
                        {(task.assignedTo || []).slice(0, 3).map((u, i) => (
                          <div
                            key={u._id || i}
                            style={{ marginLeft: i > 0 ? '-6px' : '0' }}
                            title={u.name}
                          >
                            <Avatar name={u.name || 'User'} src={u.avatar} size="xs" />
                          </div>
                        ))}
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
                        title="Move to In Progress"
                      >
                        Start Work →
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
                No active work in progress
              </div>
            ) : (
              inProgressTasks.map((task) => {
                const isOverdue = new Date(task.deadline) < now;
                const isReopened = task.status === 'reopened';
                const latestFeedback = task.statusHistory
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

                      <div className="task-card-header-right">
                        <button
                          type="button"
                          className="task-card-quick-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task);
                            setIsCreateOpen(true);
                          }}
                          title="Edit Task"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          className="task-card-quick-btn danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirm({
                              title: 'Delete Task',
                              message: `Are you sure you want to delete task "${task.title}"?`,
                              confirmText: 'Delete Task',
                              type: 'danger',
                              onConfirm: () => handleDeleteTask(task._id),
                            });
                          }}
                          title="Delete Task"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="task-card-title">{task.title}</div>
                    {task.description && <div className="task-card-desc">{task.description}</div>}

                    {isReopened && latestFeedback && (
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
                        <strong>Feedback:</strong> {latestFeedback}
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

                      <div style={{ display: 'flex' }}>
                        {(task.assignedTo || []).slice(0, 3).map((u, i) => (
                          <div
                            key={u._id || i}
                            style={{ marginLeft: i > 0 ? '-6px' : '0' }}
                            title={u.name}
                          >
                            <Avatar name={u.name || 'User'} src={u.avatar} size="xs" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Column 3: Pending Review (Submitted For Review) */}
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
                No tasks awaiting review
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
                      backgroundColor: '#FFFDF5',
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
                          ⏳ NEEDS REVIEW
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

                      <div className="task-card-header-right">
                        <button
                          type="button"
                          className="task-card-quick-btn danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirm({
                              title: 'Delete Task',
                              message: `Are you sure you want to delete task "${task.title}"?`,
                              confirmText: 'Delete Task',
                              type: 'danger',
                              onConfirm: () => handleDeleteTask(task._id),
                            });
                          }}
                          title="Delete Task"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <div className="task-card-title">{task.title}</div>
                    {task.description && <div className="task-card-desc">{task.description}</div>}

                    {submissionNote && (
                      <div
                        style={{
                          backgroundColor: '#FEF3C7',
                          border: '1px solid #FDE68A',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 8px',
                          fontSize: '11.5px',
                          color: '#78350F',
                          lineHeight: 1.3,
                        }}
                      >
                        <strong>Assignee Note:</strong> {submissionNote}
                      </div>
                    )}

                    <div className="task-card-footer">
                      <span style={{ fontSize: '11px', color: '#B45309', fontWeight: 600 }}>
                        Submitted on{' '}
                        {new Date(task.submittedAt || task.updatedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>

                      <div style={{ display: 'flex' }}>
                        {(task.assignedTo || []).slice(0, 3).map((u, i) => (
                          <div
                            key={u._id || i}
                            style={{ marginLeft: i > 0 ? '-6px' : '0' }}
                            title={u.name}
                          >
                            <Avatar name={u.name || 'User'} src={u.avatar} size="xs" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="task-card-actions">
                      <button
                        type="button"
                        className="btn btn-primary task-card-action-btn"
                        style={{
                          flex: 1,
                          backgroundColor: '#10B981',
                          borderColor: '#10B981',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTaskDetail(task);
                        }}
                        title="Review and Verify Task"
                      >
                        Review & Verify →
                      </button>
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
                No completed deliverables
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

                    <div className="task-card-header-right">
                      <button
                        type="button"
                        className="task-card-quick-btn danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          confirm({
                            title: 'Delete Task',
                            message: `Are you sure you want to delete task "${task.title}"?`,
                            confirmText: 'Delete Task',
                            type: 'danger',
                            onConfirm: () => handleDeleteTask(task._id),
                          });
                        }}
                        title="Delete Task"
                      >
                        <Trash2 size={12} />
                      </button>
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
                      style={{ fontSize: '11.5px', color: 'var(--color-success)', fontWeight: 600 }}
                    >
                      ✓ Verified by {task.verifiedBy?.name || 'Admin'}
                    </span>

                    <div style={{ display: 'flex' }}>
                      {(task.assignedTo || []).slice(0, 3).map((u, i) => (
                        <div
                          key={u._id || i}
                          style={{ marginLeft: i > 0 ? '-6px' : '0' }}
                          title={u.name}
                        >
                          <Avatar name={u.name || 'User'} src={u.avatar} size="xs" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="task-card-actions">
                    <button
                      type="button"
                      className="btn btn-ghost task-card-action-btn"
                      style={{ color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task._id, 'inprogress');
                      }}
                      title="Reopen task"
                    >
                      Reopen ↺
                    </button>
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
                <th>Assigned To</th>
                <th>Channel</th>
                <th>Deadline</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center',
                      padding: '32px',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    No work items found matching filters.
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
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {(task.assignedTo || []).slice(0, 2).map((u) => (
                            <Avatar key={u._id} name={u.name} src={u.avatar} size="xs" />
                          ))}
                          <span style={{ fontSize: '12px' }}>
                            {task.assignedTo?.map((u) => u.name).join(', ') || 'Unassigned'}
                          </span>
                        </div>
                      </td>
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
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                          {task.status === 'submittedForReview' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{
                                backgroundColor: '#10B981',
                                borderColor: '#10B981',
                                fontSize: '12px',
                                padding: '3px 10px',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTaskDetail(task);
                              }}
                            >
                              Review & Verify
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            style={{ width: '30px', height: '30px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTask(task);
                              setIsCreateOpen(true);
                            }}
                            title="Edit Task"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            style={{ width: '30px', height: '30px', color: 'var(--color-danger)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              confirm({
                                title: 'Delete Task',
                                message: `Are you sure you want to delete task "${task.title}"?`,
                                confirmText: 'Delete Task',
                                type: 'danger',
                                onConfirm: () => handleDeleteTask(task._id),
                              });
                            }}
                            title="Delete Task"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {isCreateOpen && (
        <CreateTaskModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleSaveTask}
          initialData={editingTask}
          groups={groups}
          allUsers={users}
        />
      )}

      {/* Task Detail Modal */}
      {activeTaskDetail && (
        <TaskDetailModal
          isOpen={!!activeTaskDetail}
          onClose={() => setActiveTaskDetail(null)}
          task={activeTaskDetail}
          isAdmin={true}
          currentUserId={user?.id}
          onStatusChange={handleStatusChange}
          onEdit={(t) => {
            setActiveTaskDetail(null);
            setEditingTask(t);
            setIsCreateOpen(true);
          }}
          onDelete={handleDeleteTask}
          onTaskUpdated={(updated) => setActiveTaskDetail(updated)}
        />
      )}
    </div>
  );
};

export default AdminTasks;
