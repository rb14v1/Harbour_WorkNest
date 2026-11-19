import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ConfirmDialog, ErrorBanner, Loading, Modal, PageHeader, StatusBadge, SuccessBanner,
  formatDate, useLoader,
} from '../components/ui.jsx';
import ProjectForm from '../components/ProjectForm.jsx';
import TaskForm from '../components/TaskForm.jsx';
import TaskTable from '../components/TaskTable.jsx';
import HandoverTable from '../components/HandoverTable.jsx';
import { api, errorMessage } from '../services/api.js';

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [savingTaskId, setSavingTaskId] = useState(null);

  const detail = useLoader(async () => {
    const [project, employees, tasks, handovers] = await Promise.all([
      api.getProject(projectId),
      api.listEmployees(),
      api.listTasks({ project_id: projectId }),
      api.listHandovers({ project_id: projectId }),
    ]);
    return { project, employees, tasks, handovers };
  }, [projectId]);

  const reload = detail.reload;
  const close = () => setDialog(null);

  const run = async (fn, message) => {
    setActionError(null);
    setSuccess(null);
    try {
      await fn();
      if (message) setSuccess(message);
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  if (detail.loading && !detail.data) return <Loading />;
  if (detail.error && !detail.data) {
    return (
      <>
        <ErrorBanner message={detail.error} onRetry={reload} />
        <Link to="/projects">Back to projects</Link>
      </>
    );
  }

  const { project, employees, tasks, handovers } = detail.data;
  const employeeName = (id) => employees.find((e) => e.id === id)?.name ?? '—';
  const members = project.team_member_ids.map((id) => employeeName(id)).join(', ') || 'None';

  const archiveOrDelete = async () => {
    setBusy(true);
    try {
      const result = await api.deleteProject(project.id);
      setConfirm(null);
      if (result.action === 'deleted') {
        navigate('/projects');
        return;
      }
      setSuccess('Project archived.');
      reload();
    } catch (err) {
      setActionError(errorMessage(err));
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  const deleteTask = async () => {
    setBusy(true);
    const task = confirm.task;
    try {
      await api.deleteTask(task.id);
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

  return (
    <>
      <PageHeader title={project.name}>
        <button type="button" className="btn" onClick={() => setDialog({ type: 'project' })}>Edit project</button>
        <button type="button" className="btn btn-danger-outline" onClick={() => setConfirm({ type: 'project' })}>
          Archive / delete
        </button>
      </PageHeader>

      <SuccessBanner message={success} />
      <ErrorBanner message={actionError} />

      <section className="panel">
        <div className="detail-grid">
          <div><span className="detail-label">Status</span><StatusBadge value={project.status} /></div>
          <div><span className="detail-label">Priority</span>{project.priority}</div>
          <div><span className="detail-label">Team lead</span>{employeeName(project.team_lead_id)}</div>
          <div><span className="detail-label">Team members</span>{members}</div>
          <div><span className="detail-label">Start date</span>{formatDate(project.start_date)}</div>
          <div><span className="detail-label">Target date</span>{formatDate(project.target_date)}</div>
        </div>
        {project.description && <p className="description">{project.description}</p>}
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Tasks</h2>
          <button type="button" className="btn btn-primary" onClick={() => setDialog({ type: 'task' })}>New task</button>
        </div>
        <TaskTable
          tasks={tasks}
          employees={employees}
          savingId={savingTaskId}
          onEdit={(task) => setDialog({ type: 'task', task })}
          onDelete={(task) => setConfirm({ type: 'task', task })}
          onStatusChange={async (task, status) => {
            setSavingTaskId(task.id);
            await run(() => api.updateTask(task.id, { status }), `Task "${task.title}" set to ${status}.`);
            setSavingTaskId(null);
          }}
        />
      </section>

      <section className="panel">
        <div className="section-header">
          <h2>Handovers</h2>
          <Link className="btn btn-primary" to={`/handovers/new?projectId=${project.id}`}>New handover</Link>
        </div>
        <HandoverTable handovers={handovers} employees={employees} />
      </section>

      {dialog?.type === 'project' && (
        <Modal title="Edit project" onClose={close}>
          <ProjectForm
            initial={project}
            employees={employees}
            onCancel={close}
            onSubmit={async (payload) => {
              await api.updateProject(project.id, payload);
              close();
              setSuccess('Project updated.');
              reload();
            }}
          />
        </Modal>
      )}

      {dialog?.type === 'task' && (
        <Modal title={dialog.task ? 'Edit task' : 'New task'} onClose={close}>
          <TaskForm
            initial={dialog.task ?? null}
            employees={employees}
            fixedProjectId={project.id}
            onCancel={close}
            onSubmit={async (payload) => {
              if (dialog.task) await api.updateTask(dialog.task.id, payload);
              else await api.createTask(payload);
              close();
              setSuccess(dialog.task ? 'Task updated.' : 'Task created.');
              reload();
            }}
          />
        </Modal>
      )}

      {confirm?.type === 'project' && (
        <ConfirmDialog
          title="Archive or delete project"
          message={
            tasks.length || handovers.length
              ? 'This project has tasks or handovers, so it will be archived instead of deleted.'
              : 'This project has no tasks or handovers and will be permanently deleted.'
          }
          confirmLabel={tasks.length || handovers.length ? 'Archive project' : 'Delete project'}
          busy={busy}
          onConfirm={archiveOrDelete}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm?.type === 'task' && (
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
