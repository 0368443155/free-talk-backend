#!/bin/bash
# rollback.sh - Emergency rollback script

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "Timestamp: $(date)"

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error: ADMIN_TOKEN environment variable is required"
  exit 1
fi

# Disable new gateway
echo "📝 Disabling new gateway..."
curl -X POST "${API_URL}/api/admin/feature-flags/use_new_gateway/disable" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -w "\nHTTP Status: %{http_code}\n"

if [ $? -eq 0 ]; then
  echo "✅ New gateway disabled"
else
  echo "❌ Failed to disable new gateway"
  exit 1
fi

# Verify old gateway is active
echo "🔍 Verifying system health..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${API_URL}/api/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ System health check passed"
  echo "Response: $BODY"
else
  echo "⚠️  Warning: Health check returned HTTP $HTTP_CODE"
  echo "Response: $BODY"
fi

echo ""
echo "✅ Rollback completed"
echo "The system is now using the old gateway"

