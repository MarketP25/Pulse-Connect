import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { MARPGovernanceCoreModule } from '../services/marp-governance-core/src/marp-governance-core.module';
import { MARPFirewallGatewayModule } from '../services/marp-firewall-gateway/src/marp-firewall-gateway.module';
import { MARPFounderArbitrationModule } from '../services/marp-founder-arbitration/src/marp-founder-arbitration.module';
import { MARPObservabilityModule } from '../services/marp-observability/src/marp-observability.module';

describe('MARP Integration Tests (e2e)', () => {
  let app: INestApplication;
  let governanceApp: INestApplication;
  let firewallApp: INestApplication;
  let arbitrationApp: INestApplication;
  let observabilityApp: INestApplication;

  beforeAll(async () => {
    // Test Governance Core
    const governanceModule: TestingModule = await Test.createTestingModule({
      imports: [MARPGovernanceCoreModule],
    }).compile();

    governanceApp = governanceModule.createNestApplication();
    await governanceApp.init();

    // Test Firewall Gateway
    const firewallModule: TestingModule = await Test.createTestingModule({
      imports: [MARPFirewallGatewayModule],
    }).compile();

    firewallApp = firewallModule.createNestApplication();
    await firewallApp.init();

    // Test Founder Arbitration
    const arbitrationModule: TestingModule = await Test.createTestingModule({
      imports: [MARPFounderArbitrationModule],
    }).compile();

    arbitrationApp = arbitrationModule.createNestApplication();
    await arbitrationApp.init();

    // Test Observability
    const observabilityModule: TestingModule = await Test.createTestingModule({
      imports: [MARPObservabilityModule],
    }).compile();

    observabilityApp = observabilityModule.createNestApplication();
    await observabilityApp.init();
  });

  afterAll(async () => {
    await governanceApp.close();
    await firewallApp.close();
    await arbitrationApp.close();
    await observabilityApp.close();
  });

  describe('MARP Governance Core', () => {
    it('should get active policies', () => {
      return request(governanceApp.getHttpServer())
        .get('/marp/policies/active')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should validate policy', () => {
      const testPolicy = {
        policyName: 'test-policy',
        policyVersion: '1.0.0',
        policyContent: { rules: ['allow-all'] },
        subsystemScope: 'ecommerce'
      };

      return request(governanceApp.getHttpServer())
        .post('/marp/policies/validate')
        .send(testPolicy)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('isValid');
          expect(res.body).toHaveProperty('validationErrors');
        });
    });

    it('should get firewall rules', () => {
      return request(governanceApp.getHttpServer())
        .get('/marp/firewall/rules')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('MARP Firewall Gateway', () => {
    it('should route traffic through firewall', () => {
      const testRequest = {
        subsystemName: 'ecommerce',
        action: 'process-payment',
        payload: { amount: 100, currency: 'USD' },
        context: { userId: 'test-user', region: 'us-east-1' }
      };

      return request(firewallApp.getHttpServer())
        .post('/marp/firewall/enforce')
        .send(testRequest)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('allowed');
          expect(res.body).toHaveProperty('action');
        });
    });

    it('should register subsystem', () => {
      const subsystemData = {
        subsystemName: 'test-subsystem',
        subsystemType: 'ecommerce',
        apiEndpoints: ['/api/test/*'],
        requiredPermissions: ['read', 'write']
      };

      return request(firewallApp.getHttpServer())
        .post('/marp/subsystems/register')
        .send(subsystemData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('success');
        });
    });
  });

  describe('MARP Founder Arbitration', () => {
    it('should request founder approval', () => {
      const approvalRequest = {
        operationType: 'destructive-action',
        operationData: { action: 'delete-user', userId: 'test-user' },
        pc365Attestation: 'valid-token',
        deviceFingerprint: 'test-device-fingerprint'
      };

      return request(arbitrationApp.getHttpServer())
        .post('/marp/arbitration/request')
        .send(approvalRequest)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('requestId');
          expect(res.body).toHaveProperty('status');
        });
    });

    it('should check approval status', () => {
      return request(arbitrationApp.getHttpServer())
        .get('/marp/arbitration/status/test-request-id')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('approved');
        });
    });
  });

  describe('MARP Observability', () => {
    it('should get metrics', () => {
      return request(observabilityApp.getHttpServer())
        .get('/marp/metrics')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('quorumLatency');
          expect(res.body).toHaveProperty('firewallActionRatios');
          expect(res.body).toHaveProperty('snapshotFreshness');
        });
    });

    it('should get dashboard data', () => {
      return request(observabilityApp.getHttpServer())
        .get('/marp/dashboard/overview')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('sloStatus');
          expect(res.body).toHaveProperty('alerts');
          expect(res.body).toHaveProperty('systemHealth');
        });
    });
  });

  describe('End-to-End MARP Flow', () => {
    it('should complete full governance cycle', async () => {
      // 1. Create and validate policy
      const policy = {
        policyName: 'e2e-test-policy',
        policyVersion: '1.0.0',
        policyContent: { rules: ['require-consent'] },
        subsystemScope: 'ecommerce'
      };

      const validationResponse = await request(governanceApp.getHttpServer())
        .post('/marp/policies/validate')
        .send(policy)
        .expect(201);

      expect(validationResponse.body.isValid).toBe(true);

      // 2. Register subsystem
      const subsystem = {
        subsystemName: 'e2e-test-subsystem',
        subsystemType: 'ecommerce',
        apiEndpoints: ['/api/e2e-test/*'],
        requiredPermissions: ['read', 'write']
      };

      await request(firewallApp.getHttpServer())
        .post('/marp/subsystems/register')
        .send(subsystem)
        .expect(201);

      // 3. Route traffic through firewall
      const trafficRequest = {
        subsystemName: 'e2e-test-subsystem',
        action: 'process-order',
        payload: { orderId: 'test-123', amount: 50 },
        context: { userId: 'test-user', region: 'us-west-2' }
      };

      const firewallResponse = await request(firewallApp.getHttpServer())
        .post('/marp/firewall/enforce')
        .send(trafficRequest)
        .expect(201);

      expect(firewallResponse.body.allowed).toBe(true);

      // 4. Check observability metrics
      const metricsResponse = await request(observabilityApp.getHttpServer())
        .get('/marp/metrics')
        .expect(200);

      expect(metricsResponse.body).toHaveProperty('firewallActionRatios');
    });
  });

  describe('Security & Compliance', () => {
    it('should reject unauthorized policy operations', () => {
      return request(governanceApp.getHttpServer())
        .post('/marp/policies/sign')
        .send({})
        .expect(401);
    });

    it('should enforce rate limiting', async () => {
      const requests = Array(100).fill().map(() =>
        request(firewallApp.getHttpServer())
          .post('/marp/firewall/enforce')
          .send({
            subsystemName: 'test',
            action: 'test-action',
            payload: {}
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should validate PC365 attestation', () => {
      const destructiveRequest = {
        operationType: 'delete-account',
        operationData: { accountId: 'test-account' },
        pc365Attestation: 'invalid-token'
      };

      return request(arbitrationApp.getHttpServer())
        .post('/marp/arbitration/request')
        .send(destructiveRequest)
        .expect(403);
    });
  });
});
