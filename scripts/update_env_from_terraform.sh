#!/bin/bash

# This script automatically pulls the WAF Web ACL ID from Terraform outputs
# and updates the .env.local file at the project root.

# Exit immediately if a command exits with a non-zero status.
set -e

PROJECT_ROOT=$(dirname "$(dirname "$(readlink -f "$0")")")
TERRAFORM_DIR="${PROJECT_ROOT}/infra/terraform/edge"
ENV_FILE="${PROJECT_ROOT}/.env.local"

echo "--- PULSCO Terraform Output to .env.local Updater ---"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null
then
    echo "Error: terraform command not found. Please install Terraform."
    exit 1
fi

# Check if the Terraform directory exists
if [ ! -d "$TERRAFORM_DIR" ]; then
    echo "Error: Terraform directory not found at ${TERRAFORM_DIR}"
    exit 1
fi

echo "Navigating to Terraform directory: ${TERRAFORM_DIR}"
cd "${TERRAFORM_DIR}"

# Get the waf_web_acl_arn output
echo "Initializing Terraform (if not already initialized)..."
terraform init -backend=false

# Get the waf_web_acl_id output
echo "Fetching 'waf_web_acl_arn' from Terraform outputs..."
WAF_ACL_ARN=$(terraform output -json waf_web_acl_arn | jq -r .value)

if [ -z "$WAF_ACL_ARN" ] || [ "$WAF_ACL_ARN" == "null" ]; then
    echo "Error: 'waf_web_acl_arn' output not found or is null. Ensure Terraform has been applied successfully."
    exit 1
fi

echo "Found WAF_WEB_ACL_ARN: ${WAF_ACL_ARN}"

# Navigate back to the project root
cd "${PROJECT_ROOT}"

# Update or add WAF_WEB_ACL_ID in .env.local
echo "Updating ${ENV_FILE}..."
if [ -f "$ENV_FILE" ]; then
    if grep -q "^WAF_WEB_ACL_ARN=" "$ENV_FILE"; then
        sed -i'' -e "s|^WAF_WEB_ACL_ARN=.*|WAF_WEB_ACL_ARN=${WAF_ACL_ARN}|" "$ENV_FILE"
        echo "Updated existing WAF_WEB_ACL_ARN in ${ENV_FILE}"
    else
        echo "WAF_WEB_ACL_ARN=${WAF_ACL_ARN}" >> "$ENV_FILE"
        echo "Added WAF_WEB_ACL_ARN to ${ENV_FILE}"
    fi
else
    echo "Creating new ${ENV_FILE} and adding WAF_WEB_ACL_ARN."
    echo "WAF_WEB_ACL_ARN=${WAF_ACL_ARN}" > "$ENV_FILE"
fi

echo "--- Update Complete ---"
echo "Remember to restart your Docker containers for changes to take effect."