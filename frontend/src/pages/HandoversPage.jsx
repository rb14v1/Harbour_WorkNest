import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBanner, HANDOVER_STATUSES, Loading, PageHeader, useLoader } from '../components/ui.jsx';
import HandoverTable from '../components/HandoverTable.jsx';
import { api } from '../services/api.js';

export default function HandoversPage() {
  const [filters, setFilters] = useState({ project_id: '', status: '' });

  const params = {};
  if (filters.project_id) params.project_id = filters.project_id;
  if (filters.status) params.status = filters.status;

  const handovers = useLoader(() => api.listHandovers(params), [JSON.stringify(filters)]);
  const lookups = useLoader(async () => {
    const [projects, employees] = await Promise.all([api.listProjects(), api.listEmployees()]);
    return { projects, employees };
  });

  const setFilter = (key) => (event) => setFilters((f) => ({ ...f, [key]: event.target.value }));
  const projects = lookups.data?.projects ?? [];
  const employees = lookups.data?.employees ?? [];

  return (
    <>
      <PageHeader title="Handovers">
        <Link className="btn btn-primary" to="/handovers/new">New handover</Link>
      </PageHeader>

      <div className="filters">
        <select aria-label="Filter by project" value={filters.project_id} onChange={setFilter('project_id')}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Filter by status" value={filters.status} onChange={setFilter('status')}>
          <option value="">Any status</option>
          {HANDOVER_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <ErrorBanner message={handovers.error || lookups.error} onRetry={handovers.error ? handovers.reload : undefined} />
      {(handovers.loading || lookups.loading) && <Loading />}
      {handovers.data && lookups.data && (
        <HandoverTable handovers={handovers.data} employees={employees} projects={projects} />
      )}
    </>
  );
}
