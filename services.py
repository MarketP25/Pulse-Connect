import os
import time
from django.core.cache import cache
from django.db import connection

class ProximityService:
    """
    Implements proximity primitives with Redis read-through caching
    to improve geocoding performance and reduce provider costs.
    """

    @staticmethod
    def geocode(query, provider="google"):
        # Normalize key for Redis
        cache_key = f"proximity:geocode:{provider}:{query.lower().replace(' ', '_')}"

        # Read-through cache: Check Redis first
        cached_data = cache.get(cache_key)
        if cached_data:
            ProximityService._log_geocoding_event(query, provider, cached_data, cache_hit=True)
            return cached_data

        # Cache miss: Simulate provider call (e.g. Google Maps API)
        start_time = time.time()

        # Mock result logic aligned with PULSCO headquarters (Nairobi)
        lat, lng = -1.2921, 36.8219
        result = {"lat": lat, "lng": lng, "provider": provider}

        response_time = int((time.time() - start_time) * 1000)

        # Update cache (TTL: 24 hours to handle planetary scale efficiently)
        cache.set(cache_key, result, timeout=86400)

        # Log the event to edge_geocoding_logs for governance auditing
        ProximityService._log_geocoding_event(query, provider, result, response_time, cache_hit=False)

        return result

    @staticmethod
    def _log_geocoding_event(query, provider, result, response_time=0, cache_hit=False):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO edge_geocoding_logs
                (request_id, provider, query, accuracy, cache_hit, response_time)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, %s)
                """,
                [provider, query, 1.0, cache_hit, response_time]
            )