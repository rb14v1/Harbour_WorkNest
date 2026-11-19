import { Link } from 'react-router-dom';
import { EmptyState, StatusBadge, TASK_STATUSES, formatDate } from './ui.jsx';

export default function TaskTable({ tasks, employees, projects, onEdit, onDelete, onStatusChange, savingId }) {
  if (tasks.length === 0) return <EmptyState>No tasks match these filters.</EmptyState>;

  const employeeName = (id) => employees.find((e) => e.id === id)?.name ?? '—';
  const projectName = (id) => projects?.find((p) => p.id === id)?.name ?? null;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Title</th>
            {projects && <th>Project</th>}
            <th>Assignee</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Due</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className={task.is_overdue ? 'row-overdue' : undefined}>
              <td>
                <strong>{task.title}</strong>
                {task.is_overdue && <span className="badge badge-overdue">Overdue</span>}
              </td>
              {projects && (
                <td>
                  <Link to={`/projects/${task.project_id}`}>{projectName(task.project_id) ?? 'Project'}</Link>
                </td>
              )}
              <td>{employeeName(task.assigned_to)}</td>
              <td>
                {onStatusChange ? (
                  <select
                    aria-label={`Status of ${task.title}`}
                    value={task.status}
                    disabled={savingId === task.id}
                    onChange={(e) => onStatusChange(task, e.target.value)}
                  >
                    {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                ) : (
                  <StatusBadge value={task.status} />
                )}
              </td>
              <td>{task.priority}</td>
              <td>{formatDate(task.due_date)}</td>
              <td className="row-actions">
                <button type="button" className="btn btn-small" onClick={() => onEdit(task)}>Edit</button>
                <button type="button" className="btn btn-small btn-danger-outline" onClick={() => onDelete(task)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
