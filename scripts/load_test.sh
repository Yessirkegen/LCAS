#!/bin/bash
# Load test — start N locomotives and measure
set -e

API="http://localhost:8000"
COUNT=${1:-10}
HZ=${2:-1}

echo "=== Locomotive Digital Twin — Load Test ==="
echo "Locomotives: $COUNT"
echo "Frequency: $HZ Hz"
echo "Expected RPS: $(($COUNT * $HZ))"
echo ""

echo "Starting simulator..."
curl -s -X POST "$API/simulator/start?locomotive_id=TE33A-LOAD&route=loop&hz=$HZ&count=$COUNT" | python3 -m json.tool

echo ""
echo "Waiting 15 seconds for data flow..."
sleep 15

echo ""
echo "=== Results ==="
FLEET=$(curl -s "$API/api/locomotives")
TOTAL=$(echo "$FLEET" | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])")
echo "Active locomotives: $TOTAL"

STATE=$(curl -s "$API/api/locomotives/TE33A-0000/state" 2>/dev/null || echo '{}')
echo "Sample state: $(echo "$STATE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'HI={d.get(\"health_index\",{}).get(\"value\",\"N/A\")}')" 2>/dev/null || echo 'N/A')"

HISTORY=$(curl -s "$API/api/locomotives/TE33A-0000/telemetry?minutes=1")
RECORDS=$(echo "$HISTORY" | python3 -c "import sys,json; print(json.load(sys.stdin)['count'])" 2>/dev/null || echo "0")
echo "DB records (1 min, 1 loco): $RECORDS"

echo ""
echo "Stopping simulator..."
curl -s -X POST "$API/simulator/stop" | python3 -m json.tool

echo ""
echo "=== Load Test Complete ==="
