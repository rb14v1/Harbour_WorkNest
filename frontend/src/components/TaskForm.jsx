import { useState } from 'react';
import { ErrorBanner, Field, PRIORITIES, TASK_STATUSES, formatDateTime } from './ui.jsx';
import { errorMessage } from '../services/api.js';
import { LIMITS, RULES, checkRequired, checkText } from '../services/validation.js';

export default function TaskForm({ initial, projects, employees, fixedProjectId, onSubmit, onCancel }) {
  const isEdit = Boolean(initial);
  const [values, setValues] = useState({
    project_id: initial?.project_id ?? fixedProjectId ?? '',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    assigned_to: initial?.assigned_to ?? '',
    status: initial?.status ?? 'Pending',
    priority: initial?.priority ?? 'Medium',
    due_date: initial?.due_date ?? '',
    note_author_id: '',
    note_text: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));

  const validate = () => {
    const next = {
      title: checkText(values.title, RULES.taskTitle, 'Task title'),
      description: checkText(values.description, RULES.description, 'Description'),
      project_id: !isEdit ? checkRequired(values.project_id, 'Project') : null,
      note_author_id: null,
      note_text: null,
    };
    if (values.note_text.trim()) {
      next.note_text = checkText(values.note_text, RULES.progressNote, 'Progress note');
      if (!next.note_text && !values.note_author_id) next.note_author_id = 'Select who is adding the note';
    }
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const base = {
      title: values.title.trim(),
      description: values.description.trim(),
      assigned_to: values.assigned_to || null,
      status: values.status,
      priority: values.priority,
      due_date: values.due_date || null,
    };
    const payload = isEdit
      ? { ...base }
      : { ...base, project_id: values.project_id };
    if (isEdit && values.note_text.trim()) {
      payload.progress_note = { author_id: values.note_author_id, text: values.note_text.trim() };
    }

    setSaving(true);
    setServerError(null);
    try {
      await onSubmit(payload);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="form-grid">
      <ErrorBanner message={serverError} />
      {!isEdit && !fixedProjectId && (
        <Field label="Project" error={errors.project_id} wide>
          <select value={values.project_id} onChange={set('project_id')}>
            <option value="">Select a project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Title" error={errors.title} count={values.title.length} max={LIMITS.taskTitle} wide
        hint="Letters, numbers, spaces and & / ( ) , . - : '">
        <input value={values.title} onChange={set('title')} maxLength={LIMITS.taskTitle} />
      </Field>
      <Field label="Description" error={errors.description} count={values.description.length} max={LIMITS.description} wide>
        <textarea rows={3} value={values.description} onChange={set('description')} maxLength={LIMITS.description} />
      </Field>
      <Field label="Assigned to">
        <select value={values.assigned_to} onChange={set('assigned_to')}>
          <option value="">Unassigned</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Field>
      <Field label="Due date">
        <input type="date" value={values.due_date} onChange={set('due_date')} />
      </Field>
      <Field label="Status">
        <select value={values.status} onChange={set('status')}>
          {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Priority">
        <select value={values.priority} onChange={set('priority')}>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </Field>

      {isEdit && (
        <>
          <fieldset className="field field-wide progress-notes">
            <legend className="field-label">Progress notes</legend>
            {initial.progress_notes?.length === 0 && <span className="field-hint">No notes yet.</span>}
            {initial.progress_notes?.map((note, index) => (
              <div key={index} className="note">
                <span className="note-meta">
                  {employees.find((e) => e.id === note.author_id)?.name ?? 'Unknown author'} · {formatDateTime(note.timestamp)}
                </span>
                <p>{note.text}</p>
              </div>
            ))}
          </fieldset>
          <Field label="Add note: author" error={errors.note_author_id}>
            <select value={values.note_author_id} onChange={set('note_author_id')}>
              <option value="">Select an employee</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </Field>
          <Field label="Add note: text" error={errors.note_text} count={values.note_text.length} max={LIMITS.progressNote} wide>
            <textarea rows={2} value={values.note_text} onChange={set('note_text')} maxLength={LIMITS.progressNote} />
          </Field>
        </>
      )}

      <div className="form-actions field-wide">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save task' : 'Create task'}
        </button>
      </div>
    </form>
  );
}
