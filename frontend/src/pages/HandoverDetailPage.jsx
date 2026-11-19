import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog, ErrorBanner, Loading, Modal, PageHeader, StatusBadge, SuccessBanner, formatDateTime, useLoader } from '../components/ui.jsx';
import HandoverForm from '../components/HandoverForm.jsx';
import { api, errorMessage } from '../services/api.js';

function ListSection({ title, items }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {items.length === 0 ? <p className="state state-empty">None recorded.</p> : (
        <ul className="list bullets">
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
    </section>
  );
}

export default function HandoverDetailPage() {
  const { handoverId } = useParams();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  const detail = useLoader(async () => {
    const handover = await api.getHandover(handoverId);
    const [project, employees, projectTasks] = await Promise.all([
      api.getProject(handover.project_id),
      api.listEmployees(),
      api.listTasks({ project_id: handover.project_id }),
    ]);
    return { handover, project, employees, projectTasks };
  }, [handoverId]);

  const reload = detail.reload;

  if (detail.loading && !detail.data) return <Loading />;
  if (detail.error && !detail.data) {
    return (
      <>
        <ErrorBanner message={detail.error} onRetry={reload} />
        <Link to="/handovers">Back to handovers</Link>
      </>
    );
  }

  const { handover, project, employees, projectTasks } = detail.data;
  const name = (id) => employees.find((e) => e.id === id)?.name ?? '—';
  const isDraft = handover.status === 'Draft';
  const isSubmitted = handover.status === 'Submitted';
  const relatedTasks = projectTasks.filter((t) => handover.task_ids.includes(t.id));

  const runAction = async (fn, message) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      setConfirm(null);
      setSuccess(message);
      reload();
    } catch (err) {
      setConfirm(null);
      setActionError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={`Handover: ${project.name}`}>
        {isDraft && <button type="button" className="btn" onClick={() => setEditing(true)}>Edit draft</button>}
        {isDraft && <button type="button" className="btn btn-primary" onClick={() => setConfirm('submit')}>Submit for review</button>}
        {isSubmitted && <button type="button" className="btn btn-primary" onClick={() => setConfirm('acknowledge')}>Acknowledge</button>}
      </PageHeader>

      <SuccessBanner message={success} />
      <ErrorBanner message={actionError} />

      <section className="panel">
        <div className="detail-grid">
          <div><span className="detail-label">Status</span><StatusBadge value={handover.status} /></div>
          <div><span className="detail-label">Project</span><Link to={`/projects/${project.id}`}>{project.name}</Link></div>
          <div><span className="detail-label">From (outgoing)</span>{name(handover.from_employee_id)}</div>
          <div><span className="detail-label">To (incoming)</span>{name(handover.to_employee_id)}</div>
          <div><span className="detail-label">Created</span>{formatDateTime(handover.created_at)}</div>
          <div><span className="detail-label">Submitted</span>{formatDateTime(handover.submitted_at)}</div>
          <div><span className="detail-label">Acknowledged</span>{formatDateTime(handover.acknowledged_at)}</div>
        </div>
        <h3>Summary</h3>
        <p className="description">{handover.summary}</p>
      </section>

      <div className="two-column">
        <ListSection title="Completed work" items={handover.completed_work} />
        <ListSection title="Pending work" items={handover.pending_work} />
        <ListSection title="Blockers" items={handover.blockers} />
        <ListSection title="Known issues" items={handover.known_issues} />
        <ListSection title="Next steps" items={handover.next_steps} />
        <section className="panel">
          <h3>Useful links</h3>
          {handover.useful_links.length === 0 ? <p className="state state-empty">None recorded.</p> : (
            <ul className="list bullets">
              {handover.useful_links.map((link, i) => (
                <li key={i}><a href={link.url} target="_blank" rel="noreferrer">{link.label}</a></li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <h3>Related tasks</h3>
        {relatedTasks.length === 0 ? <p className="state state-empty">No tasks linked.</p> : (
          <ul className="list bullets">
            {relatedTasks.map((t) => <li key={t.id}>{t.title} <StatusBadge value={t.status} /></li>)}
          </ul>
        )}
      </section>

      {editing && (
        <Modal title="Edit draft handover" onClose={() => setEditing(false)}>
          <HandoverForm
            initial={handover}
            projects={[project]}
            employees={employees}
            fixedProjectId={project.id}
            onCancel={() => setEditing(false)}
            onSubmit={async (payload) => {
              await api.updateHandover(handover.id, payload);
              setEditing(false);
              setSuccess('Draft updated.');
              reload();
            }}
          />
        </Modal>
      )}

      {confirm === 'submit' && (
        <ConfirmDialog
          title="Submit handover"
          message="Once submitted, the draft can no longer be edited. Continue?"
          confirmLabel="Submit"
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => runAction(() => api.submitHandover(handover.id), 'Handover submitted for acknowledgement.')}
        />
      )}

      {confirm === 'acknowledge' && (
        <ConfirmDialog
          title="Acknowledge handover"
          message="Confirm you have received this handover and reviewed the pending work."
          confirmLabel="Acknowledge"
          busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={() => runAction(() => api.acknowledgeHandover(handover.id), 'Handover acknowledged.')}
        />
      )}
    </>
  );
}
