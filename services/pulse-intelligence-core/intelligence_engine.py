import logging
import os
import json
import base64
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
import redis
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

logger = logging.getLogger(__name__)

class PulseIntelligenceCore:
    """
    The planetary decision-making engine for Pulsco.
    Communicates with the CSI (Central Super Intelligence) package for advisory
    logic while enforcing real-time MARP governance.
    """

    def __init__(self, node_id: str, region: str, redis_url: str = "redis://localhost:6379/0"):
        self.node_id = node_id
        self.region = region
        self.is_healthy = True
        # Default fallback, should be updated via MARP Policy fetch
        self.risk_threshold = 0.8
        self.policy_epoch = "v1-2026"

        # Governance Public Key (RSA)
        self.marp_public_key = self._load_public_key()

        # Velocity configuration
        self.velocity_window = 60  # seconds
        self.velocity_max = 50     # requests per window

        # Infrastructure Coordination
        self.redis = redis.from_url(redis_url, decode_responses=True)

    def _load_public_key(self):
        """Loads the MARP public key from environment variables for signature verification."""
        key_data = os.environ.get("MARP_PUBLIC_KEY")
        if not key_data:
            logger.error("CRITICAL: MARP_PUBLIC_KEY not found in environment.")
            return None
        return serialization.load_pem_public_key(key_data.encode())

    async def start_policy_listener(self):
        """
        Subscribes to Redis Pub/Sub for automatic policy updates from the CSI/Edge.
        """
        pubsub = self.redis.pubsub()
        pubsub.subscribe("marp_policy_updates")
        logger.info("CSI Policy Listener active on channel: marp_policy_updates")

        for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    new_policy = json.loads(message["data"])
                    self.update_policy(new_policy)
                except Exception as e:
                    logger.error(f"Failed to process automatic policy update: {e}")

    def _verify_marp_signature(self, policy: Dict[str, Any]) -> bool:
        """Verifies the RSA-SHA256 signature of the incoming MARP policy."""
        if not self.marp_public_key or "signature" not in policy:
            return False

        try:
            # 1. Extract signature and create canonical data (excluding the signature itself)
            sig_b64 = policy["signature"]
            clean_policy = {k: v for k, v in policy.items() if k != "signature"}

            # Ensure canonical JSON representation matching the CSI's signing process
            canonical_data = json.dumps(clean_policy, sort_keys=True).encode()

            # 2. RSA Verification
            self.marp_public_key.verify(
                base64.b64decode(sig_b64),
                canonical_data,
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            return True
        except Exception as e:
            logger.error(f"MARP Policy Signature Verification Failed: {e}")
            return False

    def update_policy(self, marp_policy: Dict[str, Any]):
        """Update core logic parameters from signed MARP policies."""
        if not self._verify_marp_signature(marp_policy):
            logger.error("Rejected unsigned or invalid MARP policy update.")
            return

        self.risk_threshold = marp_policy.get("risk_threshold", 0.8)
        self.velocity_max = marp_policy.get("velocity_threshold", 50)
        self.policy_epoch = marp_policy.get("epoch_version", self.policy_epoch)
        logger.info(f"CSI Policy updated: epoch={self.policy_epoch}, threshold={self.risk_threshold}")

    async def evaluate_intent(
        self,
        user_context: Dict[str, Any],
        action: str,
        safety_result: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Phase 3: Intent Detection.
        Analyzes user behavior to predict and validate the next ecosystem action.
        """
        timestamp = datetime.utcnow().isoformat()

        # Logic for CSI filtering and behavioral tracking
        risk_score = self._calculate_risk_score(user_context, safety_result)

        if risk_score > self.risk_threshold:
            logger.warning(f"High risk detected for action {action} in region {self.region}")
            return {
                "allowed": False,
                "reason": "MARP_RISK_THRESHOLD_EXCEEDED",
                "audit_id": f"AUDIT-{timestamp}-{self.node_id}",
                "epoch": self.policy_epoch
            }

        return {
            "allowed": True,
            "adaptive_ui_hint": self._generate_ui_hint(user_context),
            "audit_id": f"AUDIT-{timestamp}-{self.node_id}",
            "epoch": self.policy_epoch
        }

    def _calculate_risk_score(self, context: Dict[str, Any], safety_result: Dict[str, Any] = None) -> float:
        # Base score derived from account verification status
        score = 0.1 if context.get("kyc_verified") else 0.5

        # 1. Redis-based velocity check
        user_id = context.get("user_id", "anonymous")
        velocity_impact = self._check_request_velocity(user_id)
        score += velocity_impact

        # Coordination: Integrate SafetyResult from pulse-connect-core
        if safety_result:
            status = safety_result.get("status")
            confidence = safety_result.get("confidence", 0.0)

            # Weight the impact of safety detections by AI confidence levels
            if status == "blocked":
                # Critical violation: significant risk jump
                score += (0.4 * confidence)
            elif status == "shadow_ban":
                # Suspicious behavior: moderate risk adjustment
                score += (0.2 * confidence)
            elif status == "pass":
                # Verified safe behavior: minor trust credit
                score -= (0.05 * confidence)

        # Clamp the score to 0.0 - 1.0 range
        return min(max(score, 0.0), 1.0)

    def _check_request_velocity(self, user_id: str) -> float:
        """
        Uses Redis to track request frequency.
        Increases risk score proportionally to the breach of velocity thresholds.
        """
        if user_id == "system":
            return 0.0

        key = f"velocity:{self.region}:{user_id}"
        try:
            # Atomic increment and TTL management
            count = self.redis.incr(key)
            if count == 1:
                self.redis.expire(key, self.velocity_window)

            if count > (self.velocity_max * 2):
                logger.error(f"Critical velocity breach for {user_id}: {count} req/min")
                return 0.6  # Massive risk jump
            if count > self.velocity_max:
                logger.warning(f"Velocity threshold exceeded for {user_id}: {count} req/min")
                return 0.3  # Moderate risk jump
        except redis.RedisError as e:
            logger.error(f"Redis velocity check failed: {e}")

        return 0.0

    def _generate_ui_hint(self, context: Dict[str, Any]) -> str:
        # IXA logic: Dynamic module recommendation
        zone_mapping = {
            "Shop": "Connect",
            "Discover": "Shop",
            "Connect": "Grow",
            "Grow": "Me"
        }
        last_zone = context.get("last_zone")
        return zone_mapping.get(last_zone, "Discover")