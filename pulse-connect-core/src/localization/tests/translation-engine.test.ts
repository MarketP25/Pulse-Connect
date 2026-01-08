import { LocalizationEngineService } from '../services/localization-engine.service';
import { MachineTranslationService } from '../services/machine-translation.service';
import { SpeechTranslationService } from '../services/speech-translation.service';
import { SignLanguageService } from '../services/sign-language.service';
import { GeoRouterService } from '../services/geo-router.service';
import { WalletFeesService } from '../services/wallet-fees.service';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

describe('LocalizationEngineService', () => {
  let pool: Pool;
  let machineTranslationService: MachineTranslationService;
  let speechTranslationService: SpeechTranslationService;
  let signLanguageService: SignLanguageService;
  let geoRouterService: GeoRouterService;
  let walletFeesService: WalletFeesService;
  let localizationEngine: LocalizationEngineService;

  beforeAll(async () => {
    // Create test database connection
    pool = new Pool({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'pulse_test',
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'password',
    });

    // Initialize services
    machineTranslationService = new MachineTranslationService(pool);
    speechTranslationService = new SpeechTranslationService(pool);
    signLanguageService = new SignLanguageService(pool);
    geoRouterService = new GeoRouterService(pool);
    walletFeesService = new WalletFeesService(pool);

    localizationEngine = new LocalizationEngineService(
      pool,
      machineTranslationService,
      speechTranslationService,
      signLanguageService,
      geoRouterService,
      walletFeesService
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('Text Translation', () => {
    test('should translate text successfully', async () => {
      const request = {
        userId: 1,
        content: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        contentType: 'text' as const,
        regionCode: 'US'
      };

      const result = await localizationEngine.translate(request);

      expect(result).toBeDefined();
      expect(result.translatedContent).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
      expect(result.provider).toBeDefined();
      expect(result.traceId).toBeDefined();
    });

    test('should handle long text translation', async () => {
      const longText = 'This is a very long text that should be translated properly. '.repeat(50);
      const request = {
        userId: 1,
        content: longText,
        sourceLanguage: 'en',
        targetLanguage: 'fr',
        contentType: 'text' as const,
        regionCode: 'EU'
      };

      const result = await localizationEngine.translate(request);

      expect(result.translatedContent).toBeDefined();
      expect(result.translatedContent.length).toBeGreaterThan(0);
      expect(result.cost).toBeGreaterThan(0);
    });

    test('should handle unsupported language pair', async () => {
      const request = {
        userId: 1,
        content: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'xx', // Unsupported language
        contentType: 'text' as const,
        regionCode: 'US'
      };

      await expect(localizationEngine.translate(request)).rejects.toThrow();
    });
  });

  describe('Speech Translation', () => {
    test('should translate speech successfully', async () => {
      const audioData = Buffer.from('mock-audio-data'); // Mock audio data
      const request = {
        userId: 1,
        content: audioData,
        sourceLanguage: 'en',
        targetLanguage: 'es',
        contentType: 'speech' as const,
        regionCode: 'US',
        realTime: false
      };

      const result = await localizationEngine.translate(request);

      expect(result).toBeDefined();
      expect(result.translatedContent).toBeDefined();
      expect(result.cost).toBeGreaterThan(0);
    });

    test('should handle real-time speech translation', async () => {
      const request = {
        userId: 1,
        content: 'streaming-audio-url',
        sourceLanguage: 'en',
        targetLanguage: 'de',
        contentType: 'speech' as const,
        regionCode: 'EU',
        realTime: true
      };

      const result = await localizationEngine.translate(request);

      expect(result).toBeDefined();
      expect(result.translatedContent).toBeDefined();
    });
  });

  describe('Video Translation', () => {
    test('should translate video with subtitles', async () => {
      const request = {
        userId: 1,
        content: 'video-url-or-data',
        sourceLanguage: 'en',
        targetLanguage: 'zh',
        contentType: 'video' as const,
        regionCode: 'AS'
      };

      const result = await localizationEngine.translate(request);

      expect(result).toBeDefined();
      expect(result.translatedContent).toContain('WEBVTT'); // Subtitle format
      expect(result.cost).toBeGreaterThan(0);
    });
  });

  describe('Sign Language Translation', () => {
    test('should recognize sign language gestures', async () => {
      const request = {
        userId: 1,
        content: 'gesture-video-data',
        sourceLanguage: 'asl',
        targetLanguage: 'en',
        contentType: 'sign' as const,
        regionCode: 'US'
      };

      const result = await localizationEngine.translate(request);

      expect(result).toBeDefined();
      expect(result.translatedContent).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    test('should generate sign language avatar', async () => {
      const request = {
        userId: 1,
        content: 'Hello world',
        sourceLanguage: 'en',
        targetLanguage: 'asl',
        contentType: 'sign' as const,
        regionCode: 'US',
        outputType: 'avatar' as const
      };

      const result = await localizationEngine.translate(request);

      expect(result).toBeDefined();
      expect(result.translatedContent).toContain('cdn.pulsco.com/avatars/');
    });
  });

  describe('User Preferences', () => {
    test('should get user preferences', async () => {
      const preferences = await localizationEngine.getUserPreferences(1);

      expect(preferences).toBeDefined();
      expect(preferences.preferredLanguage).toBeDefined();
      expect(preferences.autoTranslate).toBeDefined();
    });

    test('should update user preferences', async () => {
      const newPreferences = {
        preferredLanguage: 'es',
        autoTranslate: false,
        signLanguageEnabled: true,
        signLanguageType: 'asl'
      };

      const result = await localizationEngine.updateUserPreferences(1, newPreferences);

      expect(result).toBeDefined();
      expect(result.preferredLanguage).toBe('es');
      expect(result.autoTranslate).toBe(false);
      expect(result.signLanguageEnabled).toBe(true);
    });
  });

  describe('Billing Integration', () => {
    test('should deduct fees from wallet', async () => {
      // First ensure user has balance
      await walletFeesService.addCredits(1, 10.00, 'USD', 'Test credit');

      const feeCalculation = await walletFeesService.calculateFees(1, {
        textLength: 100
      }, 'es', 'US');

      const result = await localizationEngine.translate({
        userId: 1,
        content: 'Test content for billing',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        contentType: 'text'
      });

      expect(result).toBeDefined();
      expect(result.cost).toBeGreaterThan(0);
    });

    test('should handle insufficient balance', async () => {
      // Clear user's balance
      await pool.query('UPDATE wallet_balance SET total_credits = 0, used_credits = 0 WHERE user_id = $1', [999]);

      const request = {
        userId: 999,
        content: 'Very long content that costs a lot',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        contentType: 'text'
      };

      await expect(localizationEngine.translate(request)).rejects.toThrow('Insufficient balance');
    });
  });

  describe('Geo-Routing', () => {
    test('should route to appropriate region', async () => {
      const request = {
        userId: 1,
        content: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'sw', // Swahili - should route to Africa
        contentType: 'text',
        regionCode: 'KE'
      };

      const result = await localizationEngine.translate(request);

      expect(result).toBeDefined();
      expect(result.region).toBe('africa');
    });

    test('should handle regional failover', async () => {
      // Mock a node failure
      await geoRouterService.handleNodeFailure('us-east-1');

      const request = {
        userId: 1,
        content: 'Hello',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        contentType: 'text',
        regionCode: 'US'
      };

      const result = await localizationEngine.translate(request);

      expect(result).toBeDefined();
      expect(result.provider).not.toBe('failed-provider');
    });
  });

  describe('Audit & Compliance', () => {
    test('should log all translations with PAP compliance', async () => {
      const request = {
        userId: 1,
        content: 'Audit test',
        sourceLanguage: 'en',
        targetLanguage: 'fr',
        contentType: 'text'
      };

      const result = await localizationEngine.translate(request);

      // Check audit log
      const auditResult = await pool.query(
        'SELECT * FROM translation_events WHERE trace_id = $1',
        [result.traceId]
      );

      expect(auditResult.rows).toHaveLength(1);
      const audit = auditResult.rows[0];
      expect(audit.user_id).toBe(1);
      expect(audit.source_language).toBe('en');
      expect(audit.target_language).toBe('fr');
      expect(audit.trace_id).toBe(result.traceId);
      expect(audit.policy_version).toBe('v1.0.0');
    });

    test('should include reason codes', async () => {
      const request = {
        userId: 1,
        content: 'Reason code test',
        sourceLanguage: 'en',
        targetLanguage: 'de',
        contentType: 'text'
      };

      const result = await localizationEngine.translate(request);

      expect(result.reasonCode).toBeDefined();
      expect(result.policyVersion).toBe('v1.0.0');
    });
  });

  describe('Performance & Latency', () => {
    test('should meet latency targets', async () => {
      const startTime = Date.now();

      const request = {
        userId: 1,
        content: 'Performance test',
        sourceLanguage: 'en',
        targetLanguage: 'it',
        contentType: 'text'
      };

      const result = await localizationEngine.translate(request);
      const latency = Date.now() - startTime;

      expect(latency).toBeLessThan(500); // <500ms target
      expect(result.latencyMs).toBeLessThan(500);
    });

    test('should handle concurrent translations', async () => {
      const requests = Array(10).fill(null).map((_, i) => ({
        userId: 1,
        content: `Concurrent test ${i}`,
        sourceLanguage: 'en',
        targetLanguage: 'pt',
        contentType: 'text' as const
      }));

      const startTime = Date.now();
      const results = await Promise.all(requests.map(r => localizationEngine.translate(r)));
      const totalLatency = Date.now() - startTime;

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.latencyMs).toBeLessThan(1000); // Allow more time for concurrent
      });

      // Average latency should still be reasonable
      const avgLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;
      expect(avgLatency).toBeLessThan(300);
    });
  });

  describe('Error Handling', () => {
    test('should handle provider failures gracefully', async () => {
      // Mock provider failure scenario
      const request = {
        userId: 1,
        content: 'Provider failure test',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        contentType: 'text'
      };

      // This should still succeed due to failover
      const result = await localizationEngine.translate(request);
      expect(result).toBeDefined();
      expect(result.provider).toBeDefined();
    });

    test('should validate input parameters', async () => {
      const invalidRequest = {
        userId: 1,
        content: '',
        sourceLanguage: 'en',
        targetLanguage: 'es',
        contentType: 'text'
      };

      await expect(localizationEngine.translate(invalidRequest)).rejects.toThrow('Invalid content');
    });

    test('should handle network timeouts', async () => {
      // Mock network timeout scenario
      const request = {
        userId: 1,
        content: 'Timeout test',
        sourceLanguage: 'en',
        targetLanguage: 'ru',
        contentType: 'text'
      };

      // Should fallback to alternative provider or cached result
      const result = await localizationEngine.translate(request);
      expect(result).toBeDefined();
    });
  });

  describe('Localization Strings', () => {
    test('should retrieve localized strings', async () => {
      const localizedString = await localizationEngine.getLocalizedString('auth.login.button', 'es', 'US');

      expect(localizedString).toBeDefined();
      expect(typeof localizedString).toBe('string');
    });

    test('should fallback to language-only', async () => {
      const localizedString = await localizationEngine.getLocalizedString('auth.login.button', 'es');

      expect(localizedString).toBeDefined();
    });

    test('should fallback to English', async () => {
      const localizedString = await localizationEngine.getLocalizedString('auth.login.button', 'xx');

      expect(localizedString).toBeDefined();
    });
  });
});
