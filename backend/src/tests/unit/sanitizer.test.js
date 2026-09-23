const { sanitizeObject } = require('../../middleware/sanitize');

describe('Unit Test: NoSQL Injection Sanitizer', () => {
  test('strips $ operator keys at root level', () => {
    const malicious = {
      username: 'admin',
      $gt: '',
      $where: 'sleep(5000)',
    };
    const clean = sanitizeObject(malicious);
    expect(clean.username).toBe('admin');
    expect(clean.$gt).toBeUndefined();
    expect(clean.$where).toBeUndefined();
  });

  test('recursively strips $ operator keys in nested objects', () => {
    const malicious = {
      filter: {
        status: 'active',
        password: { $ne: null },
      },
    };
    const clean = sanitizeObject(malicious);
    expect(clean.filter.status).toBe('active');
    expect(clean.filter.password.$ne).toBeUndefined();
  });

  test('strips operator keys inside arrays of objects', () => {
    const malicious = [
      { id: 1, $gt: 0 },
      { id: 2, name: 'Valid' },
    ];
    const clean = sanitizeObject(malicious);
    expect(clean[0].id).toBe(1);
    expect(clean[0].$gt).toBeUndefined();
    expect(clean[1].name).toBe('Valid');
  });

  test('preserves primitive values without alteration', () => {
    expect(sanitizeObject('hello')).toBe('hello');
    expect(sanitizeObject(12345)).toBe(12345);
    expect(sanitizeObject(null)).toBeNull();
    expect(sanitizeObject(undefined)).toBeUndefined();
  });
});
