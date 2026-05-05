from celery import shared_task
from django.db import connection
import logging

logger = logging.getLogger(__name__)

@shared_task
def refresh_marp_slo_metrics():
    """Trigger the planetary SLO status update in PostgreSQL."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT update_slo_status();")
    logger.info("MARP Governance SLO metrics refreshed via PostgreSQL function.")