import redis
import json
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connection
from django.utils import timezone

class Command(BaseCommand):
    help = 'Simulates the EMERGENCY_PROTOCOL.md logic to invoke or deactivate a planetary freeze.'

    def add_arguments(self, parser):
        parser.add_argument('--activate', action='store_true', help='Activate EMERGENCY_FREEZE state')
        parser.add_argument('--deactivate', action='store_true', help='Restore ACTIVE state (Homecoming)')
        parser.add_argument('--reason', type=str, default='Simulated System Threat', help='Reason for the incident')

    def handle(self, *args, **options):
        activate = options['activate']
        deactivate = options['deactivate']
        reason = options['reason']

        if activate == deactivate:
            self.stderr.write("Specify either --activate or --deactivate.")
            return

        status = 'EMERGENCY_FREEZE' if activate else 'ACTIVE'

        # 1. Connect to Redis (Planetary State Store)
        try:
            r = redis.from_url(settings.CELERY_BROKER_URL)

            # 2. Persist Global State
            r.set('pulsco:governance:status', status)

            # 3. Propagate via Pub/Sub (Article 2.4 of Protocol)
            r.publish('pulsco:governance:status_updates', status)

            self.stdout.write(self.style.WARNING(f"Planetary State updated to: {status}"))
        except Exception as e:
            self.stderr.write(f"Failed to update Redis state: {e}")
            return

        # 4. Audit the Incident (Article 6 of Protocol)
        # Logging into edge_anomalies as a proxy for the governance record
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO edge_anomalies (id, anomaly_type, severity, description, context, created_at)
                VALUES (gen_random_uuid(), %s, %s, %s, %s, NOW())
                """,
                [
                    'EMERGENCY_TRANSITION',
                    'CRITICAL' if activate else 'LOW',
                    f"Governance state changed to {status}",
                    json.dumps({'reason': reason, 'triggered_by': 'ManagementCommand'})
                ]
            )

        if activate:
            self.stdout.write(self.style.SUCCESS("EMERGENCY_FREEZE successfully invoked. All Edge Gateways will now return 503."))
        else:
            self.stdout.write(self.style.SUCCESS("Homecoming sequence initiated. Services restored to ACTIVE."))