// Mirrors backend/app/schemas/__init__.py. Keep the two files in sync.

export const LIMITS = {
  personName: 100,
  label: 100,
  projectName: 150,
  taskTitle: 150,
  linkLabel: 60,
  description: 2000,
  summary: 2000,
  progressNote: 1000,
  listItem: 300,
  listItems: 50,
  links: 20,
  teamMembers: 50,
  url: 2000,
  email: 254,
};

const PATTERNS = {
  personName: /^\p{L}+(?:[ .'-]+\p{L}+)*\.?$/u,
  label: /^[\p{L}\p{N}](?:[\p{L}\p{N}]|[ &/(),.:'-])*(?:[\p{L}\p{N}]|\))$/u,
  freeText: /^[^<>\x00-\x08\x0B\x0C\x0E-\x1F\x7F]*$/,
  url: /^https?:\/\/[^\s<>]+$/,
  email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/,
};

const MESSAGES = {
  personName: 'Use letters only. Spaces, apostrophes, hyphens and full stops are allowed between words.',
  label: 'Use letters, numbers, spaces and & / ( ) , . - : \' only.',
  freeText: 'Angle brackets (< >) and control characters are not allowed.',
};

export const RULES = {
  personName: { min: 2, max: LIMITS.personName, pattern: PATTERNS.personName, allowed: MESSAGES.personName },
  label: { min: 2, max: LIMITS.label, pattern: PATTERNS.label, allowed: MESSAGES.label },
  projectName: { min: 3, max: LIMITS.projectName, pattern: PATTERNS.label, allowed: MESSAGES.label },
  taskTitle: { min: 3, max: LIMITS.taskTitle, pattern: PATTERNS.label, allowed: MESSAGES.label },
  linkLabel: { min: 2, max: LIMITS.linkLabel, pattern: PATTERNS.label, allowed: MESSAGES.label },
  description: { min: 0, max: LIMITS.description, pattern: PATTERNS.freeText, allowed: MESSAGES.freeText },
  summary: { min: 1, max: LIMITS.summary, pattern: PATTERNS.freeText, allowed: MESSAGES.freeText },
  progressNote: { min: 1, max: LIMITS.progressNote, pattern: PATTERNS.freeText, allowed: MESSAGES.freeText },
  listItem: { min: 1, max: LIMITS.listItem, pattern: PATTERNS.freeText, allowed: MESSAGES.freeText },
};

/**
 * Returns an error message for a text value, or null if valid.
 * `label` is the field name shown in messages; `rule` is one of RULES.
 */
export function checkText(value, rule, label) {
  const text = (value ?? '').trim();
  if (text.length < rule.min) {
    if (rule.min === 0) return null;
    return rule.min === 1 ? `${label} is required` : `${label} needs at least ${rule.min} characters`;
  }
  if (text.length > rule.max) return `${label} must be ${rule.max} characters or fewer`;
  if (!rule.pattern.test(text)) return `${label}: ${rule.allowed}`;
  return null;
}

export function checkEmail(value) {
  const text = (value ?? '').trim();
  if (!text) return 'Email is required';
  if (text.length > LIMITS.email || !PATTERNS.email.test(text)) return 'Enter a valid email address';
  return null;
}

export function checkUrl(value) {
  const text = (value ?? '').trim();
  if (!text) return 'URL is required';
  if (text.length > LIMITS.url || !PATTERNS.url.test(text)) return 'URL must start with http:// or https:// and contain no spaces';
  return null;
}

export function checkRequired(value, label) {
  return (value ?? '').toString().trim() ? null : `${label} is required`;
}

/** Parses a multi-line textarea into a list, validating each line against the item rule. */
export function checkList(text, label, maxItems = LIMITS.listItems) {
  const items = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (items.length > maxItems) return { items, error: `${label} can have at most ${maxItems} items` };
  for (const item of items) {
    const error = checkText(item, RULES.listItem, label);
    if (error) return { items, error };
  }
  return { items, error: null };
}
