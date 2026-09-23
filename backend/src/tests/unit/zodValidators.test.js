const {
  createUserSchema,
  createGroupSchema,
  createTaskSchema,
  createMeetingSchema,
  createAnnouncementSchema,
  changePasswordSchema,
} = require('../../middleware/validate');

describe('Unit Test: Zod Schema Validation Suite', () => {
  describe('createUserSchema', () => {
    test('passes on valid payload', () => {
      const payload = {
        body: {
          name: 'Sarah Connor',
          email: 'sarah@skynet.com',
          post: 'Security Analyst',
          role: 'user',
        },
      };
      expect(() => createUserSchema.parse(payload)).not.toThrow();
    });

    test('rejects invalid email formats', () => {
      const payload = {
        body: {
          name: 'Sarah Connor',
          email: 'not-an-email',
          post: 'Security Analyst',
        },
      };
      expect(() => createUserSchema.parse(payload)).toThrow();
    });

    test('rejects short names (<2 chars)', () => {
      const payload = {
        body: {
          name: 'A',
          email: 'valid@example.com',
        },
      };
      expect(() => createUserSchema.parse(payload)).toThrow();
    });
  });

  describe('createGroupSchema', () => {
    test('passes on valid group data', () => {
      const payload = {
        body: {
          name: 'Engineering',
          description: 'Software development discussions',
          chatPermission: 'everyone',
        },
      };
      expect(() => createGroupSchema.parse(payload)).not.toThrow();
    });

    test('rejects invalid chatPermission enum values', () => {
      const payload = {
        body: {
          name: 'Engineering',
          chatPermission: 'invalidEnum',
        },
      };
      expect(() => createGroupSchema.parse(payload)).toThrow();
    });
  });

  describe('createTaskSchema', () => {
    test('passes on valid task data', () => {
      const payload = {
        body: {
          title: 'Implement OAuth Authentication',
          description: 'Add Google and GitHub OAuth providers',
          priority: 'high',
        },
      };
      expect(() => createTaskSchema.parse(payload)).not.toThrow();
    });

    test('rejects title exceeding 200 characters', () => {
      const payload = {
        body: {
          title: 'Z'.repeat(201),
          priority: 'medium',
        },
      };
      expect(() => createTaskSchema.parse(payload)).toThrow();
    });
  });

  describe('createMeetingSchema', () => {
    test('passes on valid meeting payload', () => {
      const payload = {
        body: {
          title: 'Sprint Planning Meeting',
          dateTime: new Date(Date.now() + 86400000).toISOString(),
          durationMinutes: 45,
        },
      };
      expect(() => createMeetingSchema.parse(payload)).not.toThrow();
    });

    test('rejects duration exceeding 8 hours (480 mins)', () => {
      const payload = {
        body: {
          title: 'Overlong Meeting',
          dateTime: new Date().toISOString(),
          durationMinutes: 600,
        },
      };
      expect(() => createMeetingSchema.parse(payload)).toThrow();
    });
  });

  describe('createAnnouncementSchema', () => {
    test('passes on valid company announcement', () => {
      const payload = {
        body: {
          title: 'Holiday Schedule Notice',
          body: 'Company offices will be closed on Monday.',
          scope: 'company',
          pinned: true,
        },
      };
      expect(() => createAnnouncementSchema.parse(payload)).not.toThrow();
    });

    test('rejects missing scope', () => {
      const payload = {
        body: {
          title: 'Missing Scope',
          body: 'Test body content',
        },
      };
      expect(() => createAnnouncementSchema.parse(payload)).toThrow();
    });
  });
});
