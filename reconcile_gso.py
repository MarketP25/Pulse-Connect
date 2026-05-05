import boto3
import redis
import os
from django.core.management.base import BaseCommand
from django.conf import settings

class Command(BaseCommand):
    help = 'Forces a full synchronization between the Redis governance state and the AWS WAF Web ACL.'

    def handle(self, *args, **options):
        # 1. Fetch current status from Redis (Source of Truth)
        try:
            r = redis.from_url(settings.CELERY_BROKER_URL)
            status = r.get('pulsco:governance:status')
            status = status.decode('utf-8') if status else 'ACTIVE'
        except Exception as e:
            self.stderr.write(f"Failed to fetch status from Redis: {e}")
            return

        self.stdout.write(f"Reconciling WAF with planetary governance state: {status}")

        # 2. Initialize AWS WAF client
        region = os.environ.get('AWS_REGION', 'us-east-1')
        project_name = os.environ.get('PROJECT_NAME', 'pulse-edge')
        waf_id = os.environ.get('WAF_WEB_ACL_ID')
        waf_name = f"{project_name}-containment-policy"

        if not waf_id:
            self.stderr.write("WAF_WEB_ACL_ID environment variable is not set. Cannot reconcile.")
            return

        client = boto3.client('wafv2', region_name=region)

        try:
            # 3. Fetch the Web ACL and its LockToken
            response = client.get_web_acl(
                Name=waf_name,
                Scope='REGIONAL',
                Id=waf_id
            )
            web_acl = response['WebACL']
            lock_token = response['LockToken']

            # 4. Modify the RedirectToEmergencyLandingPage rule
            # Logic: If FREEZE, we match the header. If ACTIVE, we break the match.
            updated = False
            rules = web_acl.get('Rules', [])
            for rule in rules:
                if rule['Name'] == 'RedirectToEmergencyLandingPage':
                    search_string = 'EMERGENCY_FREEZE' if status == 'EMERGENCY_FREEZE' else 'DISABLED_BY_GSO'

                    # Deep update of the ByteMatchStatement
                    rule['Statement']['ByteMatchStatement']['SearchString'] = search_string
                    updated = True
                    break

            if not updated:
                self.stderr.write(f"Could not find 'RedirectToEmergencyLandingPage' rule in WAF {waf_name}.")
                return

            # 5. Push the update back to AWS
            client.update_web_acl(
                Name=waf_name,
                Scope='REGIONAL',
                Id=waf_id,
                DefaultAction=web_acl['DefaultAction'],
                Rules=rules,
                VisibilityConfig=web_acl['VisibilityConfig'],
                LockToken=lock_token
            )

            self.stdout.write(
                self.style.SUCCESS(f"Successfully reconciled planetary WAF. Rules now enforcing: {status}")
            )

        except Exception as e:
            self.stderr.write(f"Planetary WAF reconciliation failed: {e}")