from django.shortcuts import render
from django.db import connection
from django.views import View

class MarpSloDashboardView(View):
    """
    Governance dashboard to visualize MARP SLO metrics directly from the planetary slo_tracking table.
    """
    def get(self, request):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT slo_name, slo_description, target_value, current_value, status, last_updated
                FROM slo_tracking
                ORDER BY status DESC, slo_name ASC
            """)
            columns = [col[0] for col in cursor.description]
            metrics = [dict(zip(columns, row)) for row in cursor.fetchall()]

        return render(request, 'billing/slo_dashboard.html', {'metrics': metrics})