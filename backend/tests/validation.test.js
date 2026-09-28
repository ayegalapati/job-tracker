const { validateApplication } = require('../src/validation');

describe('validateApplication', () => {
  test('accepts a minimal valid payload and defaults status to applied', () => {
    const { errors, value } = validateApplication({ company: ' Acme ', role: 'Engineer' });
    expect(errors).toEqual({});
    expect(value).toEqual({ company: 'Acme', role: 'Engineer', status: 'applied' });
  });

  test('requires company and role on create', () => {
    const { errors } = validateApplication({});
    expect(errors).toHaveProperty('company');
    expect(errors).toHaveProperty('role');
  });

  test('rejects an unknown status', () => {
    const { errors } = validateApplication({ company: 'A', role: 'B', status: 'ghosted' });
    expect(errors).toHaveProperty('status');
  });

  test('rejects non-http URLs and impossible dates', () => {
    const { errors } = validateApplication({ company: 'A', role: 'B', url: 'javascript:alert(1)', applied_date: '2026-02-30' });
    expect(errors).toHaveProperty('url');
    expect(errors).toHaveProperty('applied_date');
  });

  test('partial mode only validates supplied fields', () => {
    expect(validateApplication({ status: 'offer' }, { partial: true })).toEqual({ errors: {}, value: { status: 'offer' } });
    expect(validateApplication({ company: '  ' }, { partial: true }).errors).toHaveProperty('company');
  });

  test('empty optional strings become null', () => {
    const { value } = validateApplication({ location: '', notes: null }, { partial: true });
    expect(value).toEqual({ location: null, notes: null });
  });

  test('rejects non-object bodies', () => {
    expect(validateApplication(null).errors).toHaveProperty('body');
    expect(validateApplication([]).errors).toHaveProperty('body');
  });
});
