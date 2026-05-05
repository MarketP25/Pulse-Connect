from django.shortcuts import render
from django.db import connection
from django.views import View
import redis
from django.conf import settings

class MarpSloDashboardView(View):
    """
    Governance dashboard to visualize MARP SLO metrics directly from the planetary slo_tracking table.
    """
    def get(self, request):
        # Fetch global governance status from Redis store
        try:
            r = redis.from_url(settings.CELERY_BROKER_URL)
            gov_status = r.get('pulsco:governance:status')
            gov_status = gov_status.decode('utf-8') if gov_status else 'ACTIVE'
        except Exception:
            gov_status = 'UNKNOWN'

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT slo_name, slo_description, target_value, current_value, status, last_updated
                FROM slo_tracking
                ORDER BY status DESC, slo_name ASC
            """)
            columns = [col[0] for col in cursor.description]
            metrics = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return render(request, 'billing/slo_dashboard.html', {
            'metrics': metrics,
            'gov_status': gov_status
        })