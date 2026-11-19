import { useState } from 'react';
import { ConfirmDialog, ErrorBanner, Loading, Modal, PRIORITIES, PageHeader, SuccessBanner, TASK_STATUSES, useLoader } from '../components/ui.jsx';
import TaskForm from '../components/TaskForm.jsx';
import TaskTable from '../components/TaskTable.jsx';
import { api, errorMessage } from '../services/api.js';

export default function TasksPage() {
  const [filters, setFilters] = useState({ project_id: '', assigned_to: '', status: '', priority: '', overdue: false });
  const [dialog, setDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [success, setSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  const params = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== false) params[key] = value;
  });

  const tasks = useLoader(() => api.listTasks(params), [JSON.stringify(filters)]);
  const lookups = useLoader(async () => {
    const [projects, employees] = await Promise.all([api.listProjects(), api.listEmployees()]);
    return { projects, employees };
  });

  const setFilter = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const reload = () => {
    tasks.reload();
  };

  const changeStatus = async (task, status) => {
    setSavingId(task.id);
    setActionError(null);
    setSuccess(null);
    try {
      await api.updateTask(task.id, { status });
      setSuccess(`"${task.title}" set to ${status}.`);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const deleteTask = async () => {
    setBusy(true);
    try {
      await api.deleteTask(confirm.task.id);
      setConfirm(null);
      setSuccess('Task deleted.');
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const projects = lookups.data?.projects ?? [];
  const employees = lookups.data?.employees ?? [];

  return (
    <>
      <PageHeader title="Tasks">
        <button type="button" className="btn btn-primary" onClick={() => setDialog({})} disabled={!lookups.data}>
          New task
        </button>
      </PageHeader>

      <div className="filters">
        <select aria-label="Filter by project" value={filters.project_id} onChange={setFilter('project_id')}>
          <option value="">All projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Filter by assignee" value={filters.assigned_to} onChange={setFilter('assigned_to')}>
          <option value="">Any assignee</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select aria-label="Filter by status" value={filters.status} onChange={setFilter('status')}>
          <option value="">Any status</option>
          {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select aria-label="Filter by priority" value={filters.priority} onChange={setFilter('priority')}>
          <option value="">Any priority</option>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <label className="field-inline">
          <input type="checkbox" checked={filters.overdue} onChange={setFilter('overdue')} />
          <span>Overdue only</span>
        </label>
      </div>

      <SuccessBanner message={success} />
      <ErrorBanner message={actionError || lookups.error || tasks.error} onRetry={tasks.error ? reload : undefined} />
      {(tasks.loading || lookups.loading) && <Loading />}

      {tasks.data && lookups.data && (
        <TaskTable
          tasks={tasks.data}
          employees={employees}
          projects={projects}
          savingId={savingId}
          onStatusChange={changeStatus}
          onEdit={(task) => setDialog({ task })}
          onDelete={(task) => setConfirm({ task })}
        />
      )}

      {dialog && (
        <Modal title={dialog.task ? 'Edit task' : 'New task'} onClose={() => setDialog(null)}>
          <TaskForm
            initial={dialog.task ?? null}
            projects={projects}
            employees={employees}
            onCancel={() => setDialog(null)}
            onSubmit={async (payload) => {
              if (dialog.task) await api.updateTask(dialog.task.id, payload);
              else await api.createTask(payload);
              setDialog(null);
              setSuccess(dialog.task ? 'Task updated.' : 'Task created.');
              reload();
            }}
          />
        </Modal>
      )}

      {confirm && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${confirm.task.title}"? This cannot be undone.`}
          confirmLabel="Delete task"
          busy={busy}
          onConfirm={deleteTask}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
