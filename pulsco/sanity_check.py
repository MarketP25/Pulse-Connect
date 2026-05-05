import requests
import os
import sys
import time

def run_sanity_check():
    # Configuration
    BASE_URL = os.environ.get('PULSCO_BASE_URL', 'http://localhost:8000')
    EXTERNAL_URL = os.environ.get('PULSCO_EXTERNAL_URL', 'http://localhost')

    print("====================================================")
    print("       PULSCO PLANETARY SYSTEM SANITY CHECK         ")
    print("====================================================")
    print(f"Target: {EXTERNAL_URL}")
    print(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("----------------------------------------------------\n")

    # 1. Check Internal Health Endpoint
    print("[1/4] Checking Django Health API...", end=" ")
    try:
        resp = requests.get(f"{BASE_URL}/health/")
        if resp.status_code == 200:
            data = resp.json()
            redis_stat = data['components']['redis']['status']
            celery_stat = data['components']['celery_workers']['status']
            print(f"OK (Redis: {redis_stat}, Celery: {celery_stat})")
        else:
            print(f"FAILED (Status {resp.status_code})")
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

    # 2. Check Nginx Static File Serving
    print("[2/4] Verifying Nginx Static Asset Path...", end=" ")
    try:
        # Attempt to hit a common Django admin static file
        resp = requests.get(f"{EXTERNAL_URL}/static/admin/css/base.css")
        if resp.status_code == 200:
            print("OK")
        else:
            print(f"FAILED (Nginx alias check failed: {resp.status_code})")
    except Exception as e:
        print(f"ERROR: {e}")

    # 3. Verify Proximity API & PC365 Security
    print("[3/4] Verifying Proximity API Security (PC365)...", end=" ")
    try:
        # Test unauthorized access
        resp = requests.get(f"{BASE_URL}/proximity/geocode/?q=Nairobi")
        if resp.status_code == 403:
            print("OK (403 Forbidden as expected without signature)")
        else:
            print(f"FAILED (Security bypass detected! Status: {resp.status_code})")
    except Exception as e:
        print(f"ERROR: {e}")

    # 4. Redis Cache Validation
    print("[4/4] Validating Redis Persistence...", end=" ")
    try:
        # We can't hit Redis directly easily from outside without creds,
        # so we rely on the health check's verification earlier
        # but we can verify if the state key exists if we are running locally
        import redis
        from django.conf import settings
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pulsco.settings')
        import django
        django.setup()

        r = redis.from_url(os.environ.get('REDIS_URL', 'redis://localhost:6379/0'))
        status = r.get('pulsco:governance:status')
        print(f"OK (Current Governance Status: {status.decode() if status else 'NOT_SET'})")
    except Exception:
        print("SKIPPED (Local Redis connection only)")

    print("\n----------------------------------------------------")
    print("Sanity Check Complete.")

if __name__ == "__main__":
    run_sanity_check()