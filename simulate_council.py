import uuid
import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone

class Command(BaseCommand):
    help = 'Populates the council_decisions table with simulated data to test SLO triggers.'

    def add_arguments(self, parser):
        parser.add_argument('--count', type=int, default=5, help='Number of decisions to generate')
        parser.add_argument('--latency', type=float, default=0.6, help='Simulated latency in seconds to trigger SLO breach')

    def handle(self, *args, **options):
        count = options['count']
        latency_sec = options['latency']

        now = timezone.now()

        with connection.cursor() as cursor:
            for _ in range(count):
                decision_id = uuid.uuid4()
                status = random.choice(['approved', 'approved', 'rejected']) # Weight towards approved for SLO calculation

                # simulate a start time in the past to test the latency calculation trigger
                created_at = now - timedelta(seconds=latency_sec)
                updated_at = now

                cursor.execute(
                    """
                    INSERT INTO council_decisions (id, status, created_at, updated_at)
                    VALUES (%s, %s, %s, %s)
                    """,
                    [str(decision_id), status, created_at, updated_at]
                )

            self.stdout.write(self.style.SUCCESS(
                f'Successfully simulated {count} decisions with {latency_sec}s latency. Check slo_tracking for status updates.'
            ))