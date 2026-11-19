import { Link } from 'react-router-dom';
import { ErrorBanner, Loading, PageHeader, StatusBadge, formatDate, useLoader } from '../components/ui.jsx';
import { api } from '../services/api.js';

function StatCard({ label, value, to }) {
  const body = (
    <>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </>
  );
  return to ? <Link to={to} className="stat-card">{body}</Link> : <div className="stat-card">{body}</div>;
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useLoader(() => api.dashboard());

  return (
    <>
      <PageHeader title="Dashboard" />
      <ErrorBanner message={error} onRetry={reload} />
      {loading && <Loading />}
      {data && (
        <>
          <section className="stat-grid">
            <StatCard label="Total projects" value={data.total_projects} to="/projects" />
            <StatCard label="Active projects" value={data.active_projects} to="/projects" />
            <StatCard label="Total tasks" value={data.total_tasks} to="/tasks" />
            <StatCard label="Overdue tasks" value={data.overdue_tasks} to="/tasks" />
            <StatCard label="Awaiting acknowledgement" value={data.handovers_awaiting_acknowledgement} to="/handovers" />
          </section>

          <section className="panel">
            <h2>Tasks by status</h2>
            <div className="stat-grid">
              {Object.entries(data.task_counts).map(([status, count]) => (
                <StatCard key={status} label={status} value={count} to="/tasks" />
              ))}
            </div>
          </section>

          <div className="two-column">
            <section className="panel">
              <h2>Recent projects</h2>
              {data.recent_projects.length === 0 && <p className="state state-empty">No projects yet.</p>}
              <ul className="list">
                {data.recent_projects.map((p) => (
                  <li key={p.id}>
                    <Link to={`/projects/${p.id}`}>{p.name}</Link>
                    <span className="list-meta">
                      <StatusBadge value={p.status} /> {formatDate(p.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel">
              <h2>Recent handovers</h2>
              {data.recent_handovers.length === 0 && <p className="state state-empty">No handovers yet.</p>}
              <ul className="list">
                {data.recent_handovers.map((h) => (
                  <li key={h.id}>
                    <Link to={`/handovers/${h.id}`}>Handover {formatDate(h.created_at)}</Link>
                    <span className="list-meta"><StatusBadge value={h.status} /></span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  );
}
