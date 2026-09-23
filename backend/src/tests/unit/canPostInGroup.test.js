const { canPostInGroup } = require('../../utils/canPostInGroup');

describe('Unit Test: canPostInGroup Permission Logic', () => {
  const adminUser = { role: 'admin', status: 'active' };
  const standardUser = { role: 'user', status: 'active' };
  const disabledUser = { role: 'user', status: 'disabled' };

  const everyoneGroup = { chatPermission: 'everyone' };
  const adminOnlyGroup = { chatPermission: 'adminOnly' };

  test('Admin can always post in any group regardless of permission setting', () => {
    expect(canPostInGroup(adminUser, everyoneGroup)).toBe(true);
    expect(canPostInGroup(adminUser, adminOnlyGroup)).toBe(true);
  });

  test('Standard user can post in everyone channel', () => {
    expect(canPostInGroup(standardUser, everyoneGroup)).toBe(true);
  });

  test('Standard user is blocked from posting in adminOnly channel', () => {
    expect(canPostInGroup(standardUser, adminOnlyGroup)).toBe(false);
  });

  test('Disabled user is blocked from posting regardless of group permission', () => {
    expect(canPostInGroup(disabledUser, everyoneGroup)).toBe(false);
    expect(canPostInGroup(disabledUser, adminOnlyGroup)).toBe(false);
  });

  test('Null user or null group safely returns false', () => {
    expect(canPostInGroup(null, everyoneGroup)).toBe(false);
    expect(canPostInGroup(standardUser, null)).toBe(false);
  });
});
