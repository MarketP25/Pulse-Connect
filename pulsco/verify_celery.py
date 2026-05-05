import os
import django
import time

# Initialize Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pulsco.settings')
django.setup()

from pulsco.tasks import refresh_marp_slo_metrics

def run_verification():
    print("--- PULSCO Celery Integration Verification ---")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("Dispatching 'refresh_marp_slo_metrics' task to the worker pool...")

    try:
        result = refresh_marp_slo_metrics.delay()
        print(f"SUCCESS: Task dispatched. Task ID: {result.id}")
        print("\nNEXT STEPS:")
        print("1. Check the logs of the 'celery_worker' container.")
        print("2. Verify that 'update_slo_status()' was logged as executed.")
    except Exception as e:
        print(f"FAILURE: Could not dispatch task. Error: {e}")

if __name__ == "__main__":
    run_verification()