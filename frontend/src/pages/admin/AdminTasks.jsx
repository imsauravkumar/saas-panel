import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Calendar,
  AlertTriangle,
  Trash2,
  List,
  Columns,
  Search,
  Eye,
  Edit2,
  CheckCircle2,
} from 'lucide-react';
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
    } finally {
      setLoading(false);
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
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      // Optimistic local update
      setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));

      const { data } = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      if (data.success) {
        addToast(`Task moved to ${newStatus.toUpperCase()}`, 'info', 2000);
        if (activeTaskDetail?._id === taskId) {
          setActiveTaskDetail(data.task);
        }
        fetchTasks();
      }
    } catch (_err) {
      addToast('Failed to update task status', 'error');
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

  // Search filter
  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.groupId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.assignedTo?.some((u) => u.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  const now = new Date();
  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'inprogress');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-title">
          <h1>Work & Task Management</h1>
          <p>
            Assign work deliverables, set priorities and deadlines, and manage live team velocity
            across Kanban stages.
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

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="kanban-grid">
          {/* Column: To Do */}
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
                  padding: '32px 16px',
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
                      borderLeft: isOverdue ? '3px solid var(--color-danger)' : '3px solid #94A3B8',
                    }}
                    onClick={() => setActiveTaskDetail(task)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '6px',
                      }}
                    >
                      {getPriorityBadge(task.priority)}
                      {task.groupId && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-secondary)',
                            fontWeight: 600,
                          }}
                        >
                          #{task.groupId?.name}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {task.title}
                    </div>

                    {isOverdue && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: 'var(--color-danger)',
                          fontWeight: 700,
                        }}
                      >
                        <AlertTriangle size={12} /> OVERDUE
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid var(--color-border)',
                        paddingTop: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                        }}
                      >
                        <Calendar size={12} />
                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                      </div>

                      <div style={{ display: 'flex', marginRight: '4px' }}>
                        {(task.assignedTo || []).slice(0, 3).map((u, i) => (
                          <div key={u._id || i} style={{ marginLeft: i > 0 ? '-6px' : '0' }}>
                            <Avatar name={u.name || 'User'} src={u.avatar} size="xs" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '2px',
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{
                          flex: 1,
                          fontSize: '11.5px',
                          color: 'var(--color-text-secondary)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTaskDetail(task);
                        }}
                      >
                        <Eye size={12} /> View Details
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        style={{ width: '28px', height: '28px', fontSize: '11px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTask(task);
                          setIsCreateOpen(true);
                        }}
                        title="Edit Task"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Column: In Progress */}
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
                <span>In Progress</span>
              </div>
              <Badge variant="warning">{inProgressTasks.length}</Badge>
            </div>

            {inProgressTasks.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  color: 'var(--color-text-muted)',
                  fontSize: '12.5px',
                }}
              >
                No active work in progress
              </div>
            ) : (
              inProgressTasks.map((task) => {
                const isOverdue = new Date(task.deadline) < now;
                return (
                  <div
                    key={task._id}
                    className="task-card"
                    style={{
                      borderLeft: isOverdue ? '3px solid var(--color-danger)' : '3px solid #F59E0B',
                    }}
                    onClick={() => setActiveTaskDetail(task)}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: '6px',
                      }}
                    >
                      {getPriorityBadge(task.priority)}
                      {task.groupId && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--color-text-secondary)',
                            fontWeight: 600,
                          }}
                        >
                          #{task.groupId?.name}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '14px',
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      {task.title}
                    </div>

                    {isOverdue && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          color: 'var(--color-danger)',
                          fontWeight: 700,
                        }}
                      >
                        <AlertTriangle size={12} /> OVERDUE
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid var(--color-border)',
                        paddingTop: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11.5px',
                          color: isOverdue ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                        }}
                      >
                        <Calendar size={12} />
                        <span>{new Date(task.deadline).toLocaleDateString()}</span>
                      </div>

                      <div style={{ display: 'flex', marginRight: '4px' }}>
                        {(task.assignedTo || []).slice(0, 3).map((u, i) => (
                          <div key={u._id || i} style={{ marginLeft: i > 0 ? '-6px' : '0' }}>
                            <Avatar name={u.name || 'User'} src={u.avatar} size="xs" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '2px',
                      }}
                    >
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{
                          flex: 1,
                          fontSize: '11.5px',
                          color: 'var(--color-text-secondary)',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveTaskDetail(task);
                        }}
                      >
                        <Eye size={12} /> View Progress
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon"
                        style={{ width: '28px', height: '28px', fontSize: '11px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTask(task);
                          setIsCreateOpen(true);
                        }}
                        title="Edit Task"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Column: Completed */}
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
                  padding: '32px 16px',
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
                    opacity: 0.9,
                    borderLeft: '3px solid #10B981',
                  }}
                  onClick={() => setActiveTaskDetail(task)}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '6px',
                    }}
                  >
                    <Badge variant="success">DONE</Badge>
                    {task.groupId && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-text-secondary)',
                          fontWeight: 600,
                        }}
                      >
                        #{task.groupId?.name}
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--color-text-primary)',
                      textDecoration: 'line-through',
                    }}
                  >
                    {task.title}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderTop: '1px solid var(--color-border)',
                      paddingTop: '8px',
                    }}
                  >
                    <span
                      style={{ fontSize: '11.5px', color: 'var(--color-success)', fontWeight: 600 }}
                    >
                      Completed
                    </span>

                    <div style={{ display: 'flex', marginRight: '4px' }}>
                      {(task.assignedTo || []).slice(0, 3).map((u, i) => (
                        <div key={u._id || i} style={{ marginLeft: i > 0 ? '-6px' : '0' }}>
                          <Avatar name={u.name || 'User'} src={u.avatar} size="xs" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '6px',
                      marginTop: '2px',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ flex: 1, fontSize: '11.5px', color: 'var(--color-success)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTaskDetail(task);
                      }}
                    >
                      <CheckCircle2 size={12} /> View Summary
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      style={{
                        width: '28px',
                        height: '28px',
                        fontSize: '11px',
                        color: 'var(--color-danger)',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        confirm({
                          title: 'Delete Task',
                          message: `Are you sure you want to delete "${task.title}"?`,
                          confirmText: 'Delete',
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
                      <td>
                        <Badge
                          variant={
                            task.status === 'completed'
                              ? 'success'
                              : task.status === 'inprogress'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {task.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
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
