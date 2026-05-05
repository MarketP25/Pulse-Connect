import redis
from django.conf import settings
from django.http import JsonResponse

class GovernanceGuardMiddleware:
    """
    Django Middleware to enforce the EMERGENCY_PROTOCOL.md logic.
    Intercepts requests and returns 503 if the global state is EMERGENCY_FREEZE.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # Initialize Redis client using the Celery broker URL
        self.redis_client = redis.from_url(settings.CELERY_BROKER_URL)

    def __call__(self, request):
        # Perform O(1) lookup of global governance status
        try:
            status = self.redis_client.get('pulsco:governance:status')
            if status and status.decode('utf-8') == 'EMERGENCY_FREEZE':
                return JsonResponse({
                    'error': 'Service Unavailable',
                    'message': 'PULSCO is currently in an EMERGENCY FREEZE state due to critical system events. All non-essential operations are temporarily suspended.'
                }, status=503)
        except Exception:
            # In case of Redis connection issues, we default to fail-open
            # to maintain availability unless stricter security is required.
            pass

        return self.get_response(request)