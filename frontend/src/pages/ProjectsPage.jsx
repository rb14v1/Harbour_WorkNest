import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, ErrorBanner, Loading, Modal, PROJECT_STATUSES, PageHeader, StatusBadge, formatDate, useLoader } from '../components/ui.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import { api } from '../services/api.js';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);

  const params = {};
  if (q.trim()) params.q = q.trim();
  if (status) params.status = status;

  const projects = useLoader(() => api.listProjects(params), [q, status]);
  const employees = useLoader(() => api.listEmployees());

  const createProject = async (payload) => {
    const created = await api.createProject(payload);
    setCreating(false);
    navigate(`/projects/${created.id}`);
  };

  const employeeList = employees.data ?? [];

  return (
    <>
      <PageHeader title="Projects">
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>New project</button>
      </PageHeader>

      <div className="filters">
        <input type="search" placeholder="Search project name" aria-label="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <ErrorBanner message={projects.error} onRetry={projects.reload} />
      <ErrorBanner message={employees.error} onRetry={employees.reload} />
      {projects.loading && <Loading />}

      {projects.data && projects.data.length === 0 && (
        <EmptyState>No projects found. Create a project and assign a team lead to begin.</EmptyState>
      )}

      {projects.data && projects.data.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Team lead</th>
                <th>Target date</th>
                <th>Team size</th>
              </tr>
            </thead>
            <tbody>
              {projects.data.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/projects/${p.id}`}><strong>{p.name}</strong></Link></td>
                  <td><StatusBadge value={p.status} /></td>
                  <td>{p.priority}</td>
                  <td>{employeeList.find((e) => e.id === p.team_lead_id)?.name ?? '—'}</td>
                  <td>{formatDate(p.target_date)}</td>
                  <td>{p.team_member_ids.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title="New project" onClose={() => setCreating(false)}>
          {employees.loading ? <Loading /> : (
            <ProjectForm
              employees={employeeList}
              onCancel={() => setCreating(false)}
              onSubmit={createProject}
            />
          )}
        </Modal>
      )}
    </>
  );
}
