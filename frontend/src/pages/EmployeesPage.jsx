import { useState } from 'react';
import { EmptyState, ErrorBanner, Loading, Modal, PageHeader, SuccessBanner, StatusBadge, useLoader } from '../components/ui.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';
import { api, errorMessage } from '../services/api.js';

export default function EmployeesPage() {
  const [q, setQ] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [dialog, setDialog] = useState(null);
  const [success, setSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  const params = {};
  if (q.trim()) params.q = q.trim();
  if (activeFilter !== '') params.is_active = activeFilter === 'active';

  const { data, error, loading, reload } = useLoader(
    () => api.listEmployees(params),
    [q, activeFilter],
  );

  const closeDialog = () => setDialog(null);

  const save = async (payload, isEdit) => {
    if (isEdit) {
      await api.updateEmployee(dialog.id, payload);
      setSuccess('Employee updated.');
    } else {
      await api.createEmployee(payload);
      setSuccess('Employee created.');
    }
    closeDialog();
    reload();
  };

  const toggleActive = async (employee) => {
    setActionError(null);
    try {
      await api.updateEmployee(employee.id, { is_active: !employee.is_active });
      setSuccess(`${employee.name} marked ${employee.is_active ? 'inactive' : 'active'}.`);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  return (
    <>
      <PageHeader title="Employees">
        <button type="button" className="btn btn-primary" onClick={() => { setSuccess(null); setDialog({ mode: 'create' }); }}>
          New employee
        </button>
      </PageHeader>

      <div className="filters">
        <input
          type="search"
          placeholder="Search name or email"
          aria-label="Search employees"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select aria-label="Filter by status" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <SuccessBanner message={success} />
      <ErrorBanner message={actionError || error} onRetry={error ? reload : undefined} />
      {loading && <Loading />}

      {data && data.length === 0 && <EmptyState>No employees found. Add the first employee to get started.</EmptyState>}

      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Job title</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.map((e) => (
                <tr key={e.id}>
                  <td>{e.name}</td>
                  <td>{e.email}</td>
                  <td>{e.department}</td>
                  <td>{e.job_title}</td>
                  <td><StatusBadge value={e.is_active ? 'Active' : 'Inactive'} /></td>
                  <td className="row-actions">
                    <button type="button" className="btn btn-small" onClick={() => setDialog({ mode: 'edit', ...e })}>Edit</button>
                    <button type="button" className="btn btn-small" onClick={() => toggleActive(e)}>
                      {e.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog && (
        <Modal title={dialog.mode === 'edit' ? 'Edit employee' : 'New employee'} onClose={closeDialog}>
          <EmployeeForm
            isEdit={dialog.mode === 'edit'}
            initial={dialog.mode === 'edit' ? dialog : null}
            onCancel={closeDialog}
            onSubmit={(payload) => save(payload, dialog.mode === 'edit')}
          />
        </Modal>
      )}
    </>
  );
}
