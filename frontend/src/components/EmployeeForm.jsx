import { useState } from 'react';
import { ErrorBanner, Field } from './ui.jsx';
import { errorMessage } from '../services/api.js';
import { LIMITS, RULES, checkEmail, checkText } from '../services/validation.js';

export default function EmployeeForm({ initial, onSubmit, onCancel, isEdit = false }) {
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    department: initial?.department ?? '',
    job_title: initial?.job_title ?? '',
    is_active: initial?.is_active ?? true,
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setValues((v) => ({ ...v, [key]: value }));
  };

  const validate = () => ({
    name: checkText(values.name, RULES.personName, 'Name'),
    email: checkEmail(values.email),
    department: checkText(values.department, RULES.label, 'Department'),
    job_title: checkText(values.job_title, RULES.label, 'Job title'),
  });

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
        email: values.email.trim().toLowerCase(),
        department: values.department.trim(),
        job_title: values.job_title.trim(),
        is_active: values.is_active,
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
      <Field label="Full name" error={errors.name} count={values.name.length} max={LIMITS.personName} wide
        hint="Letters only. Spaces, apostrophes, hyphens and full stops are allowed.">
        <input value={values.name} onChange={set('name')} maxLength={LIMITS.personName} autoComplete="off" />
      </Field>
      <Field label="Email" error={errors.email} count={values.email.length} max={LIMITS.email} wide>
        <input type="email" value={values.email} onChange={set('email')} maxLength={LIMITS.email} autoComplete="off" />
      </Field>
      <Field label="Department" error={errors.department} count={values.department.length} max={LIMITS.label}
        hint="Letters, numbers, spaces and & / ( ) , . - : '">
        <input value={values.department} onChange={set('department')} maxLength={LIMITS.label} />
      </Field>
      <Field label="Job title" error={errors.job_title} count={values.job_title.length} max={LIMITS.label}
        hint="Letters, numbers, spaces and & / ( ) , . - : '">
        <input value={values.job_title} onChange={set('job_title')} maxLength={LIMITS.label} />
      </Field>
      {isEdit && (
        <label className="field field-inline">
          <input type="checkbox" checked={values.is_active} onChange={set('is_active')} />
          <span className="field-label">Active employee</span>
        </label>
      )}
      <div className="form-actions field-wide">
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create employee'}
        </button>
      </div>
    </form>
  );
}
