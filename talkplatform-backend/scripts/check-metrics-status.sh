#!/bin/bash
# Quick script to check metrics status

echo "🔍 Checking Metrics Status..."
echo "================================"
echo ""

echo "1️⃣ Redis Buffer Size:"
redis-cli LLEN metrics:buffer
echo ""

echo "2️⃣ Redis Buffer Sample (last 3 items):"
redis-cli LRANGE metrics:buffer 0 2
echo ""

echo "3️⃣ Real-time Metrics Keys:"
redis-cli KEYS "metrics:realtime:*"
echo ""

echo "4️⃣ Sample Real-time Metric:"
FIRST_KEY=$(redis-cli KEYS "metrics:realtime:*" | head -1)
if [ ! -z "$FIRST_KEY" ]; then
  echo "Key: $FIRST_KEY"
  redis-cli HGETALL "$FIRST_KEY"
else
  echo "No real-time metrics found yet"
fi
echo ""

echo "5️⃣ Last Persist Time:"
redis-cli GET metrics:last_persist
echo ""

echo "✅ Check complete!"

