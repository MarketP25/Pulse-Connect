from django.http import JsonResponse
from django.views import View
from django.core.cache import cache
from pulsco.celery import app as celery_app
import logging

logger = logging.getLogger(__name__)

class HealthCheckView(View):
    """
    Returns the health status of critical components like Redis and Celery.
    """
    def get(self, request, *args, **kwargs):
        status = {
            "status": "ok",
            "components": {}
        }

        # Check Redis connection
        redis_status = "ok"
        try:
            cache.set('health_check_redis', 'test', 1)
            if cache.get('health_check_redis') == 'test':
                status["components"]["redis"] = {"status": "ok"}
            else:
                redis_status = "degraded"
                status["components"]["redis"] = {"status": "degraded", "message": "Redis cache test failed"}
        except Exception as e:
            redis_status = "critical"
            status["components"]["redis"] = {"status": "critical", "message": str(e)}
            logger.error(f"Redis health check failed: {e}")

        # Check Celery worker status
        celery_worker_status = "ok"
        try:
            i = celery_app.control.inspect()
            active_workers = i.active() # Returns dict of workers and their active tasks, or None if broker unreachable
            if active_workers is None or not i.ping(): # ping() checks if workers are alive
                celery_worker_status = "critical"
                status["components"]["celery_workers"] = {"status": "critical", "message": "No Celery workers found or broker unreachable."}
            else:
                status["components"]["celery_workers"] = {"status": "ok", "workers_online": len(i.stats())}
        except Exception as e:
            celery_worker_status = "critical"
            status["components"]["celery_workers"] = {"status": "critical", "message": str(e)}
            logger.error(f"Celery health check failed: {e}")

        return JsonResponse(status, status=500 if status["status"] == "critical" else 200)