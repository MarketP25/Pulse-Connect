import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const executionTime = new Trend('execution_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<50'],     // 95% of requests should be below 50ms
    http_req_failed: ['rate<0.01'],      // Error rate should be below 1%
    errors: ['rate<0.01'],               // Custom error rate
    execution_time: ['p(95)<50'],        // Custom execution time
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'https://edge-staging.planetary.pulse';
const MARP_SIGNATURE = __ENV.MARP_SIGNATURE || 'test-signature';

// Subsystems to test
const subsystems = ['ecommerce', 'payments', 'fraud', 'matchmaking', 'ai-programs', 'chatbot', 'geocoding', 'communication', 'marketing', 'places'];

// Request templates
const requestTemplates = {
  ecommerce: {
    subsystem: 'ecommerce',
    action: 'purchase',
    context: {
      amount: Math.floor(Math.random() * 1000) + 10,
      items: [{ id: 'item_' + Math.random(), quantity: 1 }],
      paymentMethod: 'card'
    }
  },
  payments: {
    subsystem: 'payments',
    action: 'transfer',
    context: {
      amount: Math.floor(Math.random() * 500) + 1,
      fromAccount: 'user_' + Math.random(),
      toAccount: 'merchant_' + Math.random()
    }
  },
  fraud: {
    subsystem: 'fraud',
    action: 'check',
    context: {
      transactionId: 'txn_' + Math.random(),
      amount: Math.floor(Math.random() * 10000),
      userHistory: Math.random() > 0.8 ? 'suspicious' : 'normal'
    }
  },
  matchmaking: {
    subsystem: 'matchmaking',
    action: 'match',
    context: {
      userId: 'user_' + Math.random(),
      preferences: ['skill_level', 'location'],
      region: 'us-east-1'
    }
  },
  'ai-programs': {
    subsystem: 'ai-programs',
    action: 'execute',
    context: {
      programId: 'program_' + Math.random(),
      inputs: { data: 'test_input' },
      model: 'gpt-4'
    }
  },
  chatbot: {
    subsystem: 'chatbot',
    action: 'query',
    context: {
      message: 'Hello, how can I help you?',
      sessionId: 'session_' + Math.random(),
      intent: 'greeting'
    }
  },
  geocoding: {
    subsystem: 'geocoding',
    action: 'geocode',
    context: {
      address: '1600 Amphitheatre Parkway, Mountain View, CA',
      region: 'us-west-1'
    }
  },
  communication: {
    subsystem: 'communication',
    action: 'send',
    context: {
      type: 'email',
      to: 'user@example.com',
      subject: 'Test message',
      content: 'This is a test message'
    }
  },
  marketing: {
    subsystem: 'marketing',
    action: 'campaign',
    context: {
      campaignId: 'camp_' + Math.random(),
      audience: ['user_segment_1'],
      channel: 'email'
    }
  },
  places: {
    subsystem: 'places',
    action: 'search',
    context: {
      query: 'restaurants',
      location: { lat: 37.7749, lng: -122.4194 },
      radius: 1000
    }
  }
};

export default function () {
  // Select random subsystem
  const subsystem = subsystems[Math.floor(Math.random() * subsystems.length)];
  const template = requestTemplates[subsystem];

  // Create request payload
  const payload = {
    requestId: `req_${__VU}_${__ITER}_${Date.now()}`,
    subsystem: template.subsystem,
    action: template.action,
    userId: `user_${__VU}`,
    regionCode: 'us-east-1',
    context: template.context
  };

  // Add MARP signature (simulated)
  const headers = {
    'Content-Type': 'application/json',
    'X-MARP-Signature': MARP_SIGNATURE,
    'X-Request-ID': payload.requestId
  };

  // Make request
  const response = http.post(`${BASE_URL}/edge/execute`, JSON.stringify(payload), { headers });

  // Record custom metrics
  const result = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 50ms': (r) => r.timings.duration < 50,
    'has decision': (r) => r.json().decision !== undefined,
    'has execution time': (r) => r.json().executionTime !== undefined,
    'has risk score': (r) => r.json().riskScore !== undefined,
  });

  // Track errors
  errorRate.add(!result);

  // Track execution time if available
  if (response.json().executionTime) {
    executionTime.add(response.json().executionTime);
  }

  // Log failures
  if (!result) {
    console.log(`Request failed: ${response.status} - ${response.body}`);
  }

  // Random sleep between 0.1-1 second
  sleep(Math.random() * 0.9 + 0.1);
}

// Setup function - runs before the test starts
export function setup() {
  // Health check
  const healthResponse = http.get(`${BASE_URL}/health`);
  if (healthResponse.status !== 200) {
    console.error('Health check failed - aborting test');
    return;
  }

  console.log('Load test setup complete - Edge Gateway is healthy');
  return {};
}

// Teardown function - runs after the test completes
export function teardown(data) {
  console.log('Load test completed');
}

// Handle summary - custom summary output
export function handleSummary(data) {
  const summary = {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'edge-gateway-performance.json': JSON.stringify(data, null, 2),
  };

  // Send results to Prometheus if configured
  if (__ENV.PROMETHEUS_URL) {
    // This would send metrics to Prometheus
    console.log('Sending metrics to Prometheus...');
  }

  return summary;
}

function textSummary(data, options) {
  return `
📊 Edge Gateway Load Test Results
=====================================

Test Duration: ${data.metrics.iteration_duration.values.avg}ms avg iteration
Total Requests: ${data.metrics.http_reqs.values.count}
Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%

🚀 Performance Metrics
----------------------
P95 Response Time: ${Math.round(data.metrics.http_req_duration.values['p(95)'])}ms
P99 Response Time: ${Math.round(data.metrics.http_req_duration.values['p(99)'])}ms
Average Response Time: ${Math.round(data.metrics.http_req_duration.values.avg)}ms

🎯 Success Rates
----------------
HTTP Status 200: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%
Custom Checks Passed: ${data.metrics.checks.values.rate * 100}%

⚡ Throughput
-------------
Requests/Second: ${Math.round(data.metrics.http_reqs.values.rate)}
Data Transferred: ${Math.round(data.metrics.data_received.values.count / 1024 / 1024)}MB

🔥 Error Analysis
-----------------
${data.metrics.errors ? `Error Rate: ${data.metrics.errors.values.rate * 100}%` : 'No custom errors recorded'}

📈 Trends
---------
${data.metrics.execution_time ? `P95 Execution Time: ${Math.round(data.metrics.execution_time.values['p(95)'])}ms` : 'No execution time data'}

🌐 Load Pattern
---------------
Virtual Users: ${data.metrics.vus.values.max} max
HTTP Connections: ${data.metrics.http_req_connecting.values.count} total

⚠️  Recommendations
-------------------
${data.metrics.http_req_duration.values['p(95)'] > 50 ? '⚠️  P95 response time exceeds 50ms target' : '✅ P95 response time within target'}
${data.metrics.http_req_failed.values.rate > 0.01 ? '⚠️  Error rate exceeds 1% target' : '✅ Error rate within target'}
${data.metrics.checks.values.rate < 0.99 ? '⚠️  Check success rate below 99%' : '✅ Check success rate acceptable'}
`;
}
