import { useEffect, useState } from 'react';
import { ErrorBanner, Field, Loading } from './ui.jsx';
import { api, errorMessage } from '../services/api.js';
import { LIMITS, RULES, checkList, checkRequired, checkText, checkUrl } from '../services/validation.js';

const LIST_FIELDS = [
  ['completed_work', 'Completed work'],
  ['pending_work', 'Pending work'],
  ['blockers', 'Blockers'],
  ['known_issues', 'Known issues'],
  ['next_steps', 'Next steps'],
];

const linesToList = (text) => text.split('\n').map((l) => l.trim()).filter(Boolean);
const listToLines = (list) => (list ?? []).join('\n');

function parseLinks(text) {
  return linesToList(text).map((line) => {
    const [label, ...rest] = line.split('|');
    return { label: label.trim(), url: rest.join('|').trim() };
  });
}

const linksToText = (links) => (links ?? []).map((l) => `${l.label} | ${l.url}`).join('\n');

export default function HandoverForm({ initial, projects, employees, fixedProjectId, onSubmit, onCancel }) {
  const [values, setValues] = useState({
    project_id: initial?.project_id ?? fixedProjectId ?? '',
    from_employee_id: initial?.from_employee_id ?? '',
    to_employee_id: initial?.to_employee_id ?? '',
    summary: initial?.summary ?? '',
    completed_work: listToLines(initial?.completed_work),
    pending_work: listToLines(initial?.pending_work),
    blockers: listToLines(initial?.blockers),
    known_issues: listToLines(initial?.known_issues),
    next_steps: listToLines(initial?.next_steps),
    useful_links: linksToText(initial?.useful_links),
    task_ids: initial?.task_ids ?? [],
  });
  const [projectTasks, setProjectTasks] = useState(null);
  const [tasksError, setTasksError] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!values.project_id) {
      setProjectTasks(null);
      return;
    }
    let cancelled = false;
    setProjectTasks(null);
    setTasksError(null);
    api.listTasks({ project_id: values.project_id })
      .then((tasks) => { if (!cancelled) setProjectTasks(tasks); })
      .catch((err) => { if (!cancelled) setTasksError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [values.project_id]);

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));

  const toggleTask = (id) => {
    setValues((v) => ({
      ...v,
      task_ids: v.task_ids.includes(id) ? v.task_ids.filter((t) => t !== id) : [...v.task_ids, id],
    }));
  };

  const validate = () => {
    const next = {
      project_id: initial ? null : checkRequired(values.project_id, 'Project'),
      from_employee_id: checkRequired(values.from_employee_id, 'Outgoing employee'),
      to_employee_id: checkRequired(values.to_employee_id, 'Incoming employee'),
      summary: checkText(values.summary, RULES.summary, 'Summary'),
      useful_links: null,
    };
    if (values.from_employee_id && values.from_employee_id === values.to_employee_id) {
      next.to_employee_id = 'Incoming employee must be different from the outgoing employee';
    }
    LIST_FIELDS.forEach(([key]) => {
      const { error } = checkList(values[key], labelFor(key));
      next[key] = error;
    });
    const links = parseLinks(values.useful_links);
    if (links.length > LIMITS.links) next.useful_links = `At most ${LIMITS.links} links`;
    for (const link of links) {
      if (next.useful_links) break;
      const labelError = checkText(link.label, RULES.linkLabel, 'Link label');
      next.useful_links = labelError || checkUrl(link.url);
    }
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    const payload = {
      summary: values.summary.trim(),
      from_employee_id: values.from_employee_id,
      to_employee_id: values.to_employee_id,
      useful_links: parseLinks(values.useful_links),
      task_ids: values.task_ids,
    };
    LIST_FIELDS.forEach(([key]) => { payload[key] = linesToList(values[key]); });
    if (!initial) payload.project_id = values.project_id;

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
      {!fixedProjectId && !initial && (
        <Field label="Project" error={errors.project_id} wide>
          <select value={values.project_id} onChange={set('project_id')}>
            <option value="">Select a project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Outgoing employee" error={errors.from_employee_id}>
        <select value={values.from_employee_id} onChange={set('from_employee_id')}>
          <option value="">Select an employee</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Field>
      <Field label="Incoming employee" error={errors.to_employee_id}>
        <select value={values.to_employee_id} onChange={set('to_employee_id')}>
          <option value="">Select an employee</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </Field>
      <Field label="Summary" error={errors.summary} count={values.summary.length} max={LIMITS.summary} wide>
        <textarea rows={3} value={values.summary} onChange={set('summary')} maxLength={LIMITS.summary} />
      </Field>

      {LIST_FIELDS.map(([key, label]) => (
        <Field
          key={key}
          label={label}
          error={errors[key]}
          count={values[key].split('\n').filter((l) => l.trim()).length}
          max={LIMITS.listItems}
          hint={`One item per line. Max ${LIMITS.listItem} characters each.`}
          wide={key === 'completed_work'}
        >
          <textarea rows={3} value={values[key]} onChange={set(key)} />
        </Field>
      ))}

      <Field
        label="Useful links"
        hint={`One per line: Label | https://... (up to ${LIMITS.links} links)`}
        error={errors.useful_links}
        count={parseLinks(values.useful_links).length}
        max={LIMITS.links}
        wide
      >
        <textarea rows={3} value={values.useful_links} onChange={set('useful_links')} />
      </Field>

      <fieldset className="field field-wide checkbox-group">
        <legend className="field-label">Related tasks</legend>
        {!values.project_id && <span className="field-hint">Select a project to list its tasks.</span>}
        {values.project_id && tasksError && <ErrorBanner message={tasksError} />}
        {values.project_id && !tasksError && projectTasks === null && <Loading label="Loading tasks…" />}
        {projectTasks && projectTasks.length === 0 && <span className="field-hint">This project has no tasks.</span>}
        {projectTasks?.map((t) => (
          <label key={t.id} className="field-inline">
            <input type="checkbox" checked={values.task_ids.includes(t.id)} onChange={() => toggleTask(t.id)} />
            <span>{t.title} ({t.status})</span>
          </label>
        ))}
      </fieldset>

      <div className="form-actions field-wide">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save draft' : 'Create draft'}
        </button>
      </div>
    </form>
  );
}

function labelFor(key) {
  return LIST_FIELDS.find(([k]) => k === key)?.[1] ?? key;
}
