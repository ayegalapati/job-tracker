const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function isHttpUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates and normalizes an application payload.
 * With { partial: true } (used by PATCH) only supplied fields are checked.
 * Returns { errors, value } - the request is valid when errors is empty.
 */
function validateApplication(body, { partial = false } = {}) {
  const errors = {};
  const value = {};

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { errors: { body: 'Request body must be a JSON object' }, value };
  }
  const has = (key) => body[key] !== undefined;

  for (const key of ['company', 'role']) {
    if (!has(key)) {
      if (!partial) errors[key] = `${key} is required`;
      continue;
    }
    const v = typeof body[key] === 'string' ? body[key].trim() : '';
    if (!v) errors[key] = `${key} is required`;
    else if (v.length > 120) errors[key] = `${key} must be 120 characters or fewer`;
    else value[key] = v;
  }

  if (has('status')) {
    if (STATUSES.includes(body.status)) value.status = body.status;
    else errors.status = `status must be one of: ${STATUSES.join(', ')}`;
  } else if (!partial) {
    value.status = 'applied';
  }

  const optional = [
    ['location', 120],
    ['url', 2048],
    ['notes', 2000],
  ];
  for (const [key, max] of optional) {
    if (!has(key)) continue;
    if (body[key] === null || body[key] === '') {
      value[key] = null;
    } else if (typeof body[key] !== 'string') {
      errors[key] = `${key} must be a string`;
    } else if (body[key].trim().length > max) {
      errors[key] = `${key} must be ${max} characters or fewer`;
    } else if (key === 'url' && !isHttpUrl(body[key].trim())) {
      errors[key] = 'url must start with http:// or https://';
    } else {
      value[key] = body[key].trim();
    }
  }

  if (has('applied_date')) {
    if (body.applied_date === null || body.applied_date === '') value.applied_date = null;
    else if (typeof body.applied_date === 'string' && isValidDate(body.applied_date)) {
      value.applied_date = body.applied_date;
    } else errors.applied_date = 'applied_date must be a valid date (YYYY-MM-DD)';
  }

  return { errors, value };
}

module.exports = { STATUSES, validateApplication };
