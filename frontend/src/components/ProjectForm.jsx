import { useState } from 'react';
import { ErrorBanner, Field, PROJECT_STATUSES, PRIORITIES } from './ui.jsx';
import { errorMessage } from '../services/api.js';
import { LIMITS, RULES, checkRequired, checkText } from '../services/validation.js';

export const TEAM_RULE = 'A project needs at least one team member besides the team lead.';

export default function ProjectForm({ initial, employees, onSubmit, onCancel }) {
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    status: initial?.status ?? 'Planning',
    priority: initial?.priority ?? 'Medium',
    start_date: initial?.start_date ?? '',
    target_date: initial?.target_date ?? '',
    team_lead_id: initial?.team_lead_id ?? '',
    team_member_ids: initial?.team_member_ids ?? [],
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setValues((v) => ({ ...v, [key]: event.target.value }));

  // The lead is never a member. Choosing a lead removes them from the member list.
  const setLead = (event) => {
    const leadId = event.target.value;
    setValues((v) => ({
      ...v,
      team_lead_id: leadId,
      team_member_ids: v.team_member_ids.filter((id) => id !== leadId),
    }));
  };

  const toggleMember = (id) => {
    setValues((v) => ({
      ...v,
      team_member_ids: v.team_member_ids.includes(id)
        ? v.team_member_ids.filter((m) => m !== id)
        : [...v.team_member_ids, id],
    }));
  };

  const memberOptions = employees.filter((e) => e.id !== values.team_lead_id);

  const validate = () => {
    const next = {
      name: checkText(values.name, RULES.projectName, 'Project name'),
      description: checkText(values.description, RULES.description, 'Description'),
      team_lead_id: checkRequired(values.team_lead_id, 'Team lead'),
      team_member_ids: values.team_member_ids.length === 0 ? TEAM_RULE : null,
      target_date: null,
    };
    if (values.start_date && values.target_date && values.target_date < values.start_date) {
      next.target_date = 'Target date must be on or after the start date';
    }
    return next;
  };

  const submit = async (event) => {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;
    setSaving(true);
    setServerError(null);
    try {
      await onSubmit({
        name: values.name.trim(),
        description: values.description.trim(),
        status: values.status,
        priority: values.priority,
        start_date: values.start_date || null,
        target_date: values.target_date || null,
        team_lead_id: values.team_lead_id,
        team_member_ids: values.team_member_ids,
      });
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="form-grid">
      <ErrorBanner message={serverError} />
      <Field label="Project name" error={errors.name} count={values.name.length} max={LIMITS.projectName} wide
        hint="Letters, numbers, spaces and & / ( ) , . - : '">
        <input value={values.name} onChange={set('name')} maxLength={LIMITS.projectName} />
      </Field>
      <Field label="Description" error={errors.description} count={values.description.length} max={LIMITS.description} wide>
        <textarea rows={3} value={values.description} onChange={set('description')} maxLength={LIMITS.description} />
      </Field>
      <Field label="Status">
        <select value={values.status} onChange={set('status')}>
          {PROJECT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Priority">
        <select value={values.priority} onChange={set('priority')}>
          {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Start date">
        <input type="date" value={values.start_date} onChange={set('start_date')} />
      </Field>
      <Field label="Target date" error={errors.target_date}>
        <input type="date" value={values.target_date} onChange={set('target_date')} />
      </Field>
      <Field label="Team lead" error={errors.team_lead_id} wide>
        <select value={values.team_lead_id} onChange={setLead}>
          <option value="">Select an employee</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.name} ({e.job_title})</option>)}
        </select>
      </Field>
      <fieldset className="field field-wide checkbox-group">
        <legend className="field-label">
          Team members <span className="field-count">{values.team_member_ids.length} selected (min 1)</span>
        </legend>
        {!values.team_lead_id && <span className="field-hint">Select a team lead first.</span>}
        {values.team_lead_id && memberOptions.length === 0 && (
          <span className="field-hint">No other employees yet. Add at least one team member on the Employees page.</span>
        )}
        {memberOptions.map((e) => (
          <label key={e.id} className="field-inline">
            <input
              type="checkbox"
              checked={values.team_member_ids.includes(e.id)}
              onChange={() => toggleMember(e.id)}
            />
            <span>{e.name}</span>
          </label>
        ))}
        {errors.team_member_ids && <span className="field-error">{errors.team_member_ids}</span>}
      </fieldset>
      <div className="form-actions field-wide">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Create project'}
        </button>
      </div>
    </form>
  );
}
