import { Link } from 'react-router-dom';
import { EmptyState, StatusBadge, formatDate } from './ui.jsx';

export default function HandoverTable({ handovers, employees, projects }) {
  if (handovers.length === 0) return <EmptyState>No handovers match these filters.</EmptyState>;

  const employeeName = (id) => employees.find((e) => e.id === id)?.name ?? '—';
  const projectName = (id) => projects?.find((p) => p.id === id)?.name ?? 'Project';

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>From</th>
            <th>To</th>
            <th>Status</th>
            <th>Created</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {handovers.map((h) => (
            <tr key={h.id}>
              <td>{projectName(h.project_id)}</td>
              <td>{employeeName(h.from_employee_id)}</td>
              <td>{employeeName(h.to_employee_id)}</td>
              <td><StatusBadge value={h.status} /></td>
              <td>{formatDate(h.created_at)}</td>
              <td><Link className="btn btn-small" to={`/handovers/${h.id}`}>Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
