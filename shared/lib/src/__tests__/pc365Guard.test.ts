import { PC365Guard } from '../pc365Guard';

describe('PC365Guard', () => {
  let guard: PC365Guard;

  beforeEach(() => {
    // Mock environment variables
    process.env.FOUNDER_EMAIL = 'superadmin@pulsco.com';
    process.env.SERVICE_DEVICE_FINGERPRINT = 'device-fingerprint-123';
    process.env.PC_365_MASTER_TOKEN = 'master-token-456';

    guard = new PC365Guard();
  });

  afterEach(() => {
    delete process.env.FOUNDER_EMAIL;
    delete process.env.SERVICE_DEVICE_FINGERPRINT;
    delete process.env.PC_365_MASTER_TOKEN;
  });

  describe('validateHeaders', () => {
    it('should validate correct headers', () => {
      const headers = {
        'x-founder': 'superadmin@pulsco.com',
        'x-device': 'device-fingerprint-123',
        'x-pc365': 'valid-token'
      };

      expect(() => guard.validateHeaders(headers)).not.toThrow();
    });

    it('should reject invalid founder email', () => {
      const headers = {
        'x-founder': 'invalid@email.com',
        'x-device': 'device-fingerprint-123',
        'x-pc365': 'valid-token'
      };

      expect(() => guard.validateHeaders(headers)).toThrow('Invalid founder identity');
    });

    it('should reject invalid device fingerprint', () => {
      const headers = {
        'x-founder': 'superadmin@pulsco.com',
        'x-device': 'invalid-device',
        'x-pc365': 'valid-token'
      };

      expect(() => guard.validateHeaders(headers)).toThrow('Invalid device fingerprint');
    });

    it('should reject invalid PC365 token', () => {
      const headers = {
        'x-founder': 'superadmin@pulsco.com',
        'x-device': 'device-fingerprint-123',
        'x-pc365': 'invalid-token'
      };

      expect(() => guard.validateHeaders(headers)).toThrow('Invalid PC365 token');
    });

    it('should reject missing headers', () => {
      const headers = {};

      expect(() => guard.validateHeaders(headers)).toThrow('Missing required headers');
    });
  });

  describe('isDestructiveAction', () => {
    it('should identify destructive actions', () => {
      expect(guard.isDestructiveAction('/accounts/delete')).toBe(true);
      expect(guard.isDestructiveAction('/accounts/modify')).toBe(true);
      expect(guard.isDestructiveAction('/accounts/deactivate')).toBe(true);
      expect(guard.isDestructiveAction('/transactions/delete')).toBe(true);
    });

    it('should not identify non-destructive actions', () => {
      expect(guard.isDestructiveAction('/accounts/create')).toBe(false);
      expect(guard.isDestructiveAction('/accounts/:id')).toBe(false);
      expect(guard.isDestructiveAction('/transactions/append')).toBe(false);
    });
  });

  describe('generateAuditEntry', () => {
    it('should generate audit entry for destructive actions', () => {
      const action = 'DELETE_USER';
      const userId = 'user-123';
      const metadata = { reason: 'test' };

      const auditEntry = guard.generateAuditEntry(action, userId, metadata);

      expect(auditEntry).toHaveProperty('id');
      expect(auditEntry).toHaveProperty('timestamp');
      expect(auditEntry).toHaveProperty('action', action);
      expect(auditEntry).toHaveProperty('actor', userId);
      expect(auditEntry).toHaveProperty('metadata', metadata);
      expect(auditEntry).toHaveProperty('pc365Validated', true);
    });
  });
});
