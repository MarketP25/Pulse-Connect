locals {
  # Parse .env.local via external script
  env_raw = data.external.env_secrets.result

  # Map .env keys to payment_api_secrets structure
  payment_api_secrets = {
    paypal_client_id      = try(local.env_raw.PAYPAL_CLIENT_ID, "")
    paypal_secret         = try(local.env_raw.PAYPAL_SECRET, "")
    mpesa_consumer_key    = try(local.env_raw.MPESA_CONSUMER_KEY, "")
    mpesa_consumer_secret = try(local.env_raw.MPESA_CONSUMER_SECRET, "")
    alipay_app_id         = try(local.env_raw.ALIPAY_APP_ID, "")
    alipay_private_key    = try(local.env_raw.ALIPAY_PRIVATE_KEY, "")
    google_maps_api_key   = try(local.env_raw.GOOGLE_MAPS_API_KEY, "")
  }

  # For pulsco_api_keys generic payload
  pulsco_generic_payload = try(local.env_raw.PULSCO_GENERIC_SECRET, jsonencode(local.payment_api_secrets))
}
