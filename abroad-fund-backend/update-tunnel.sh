#!/bin/bash
# Auto-update Vercel env var when Cloudflare tunnel restarts
# Usage: Set VERCEL_TOKEN env var before running, then: bash update-tunnel.sh

VERCEL_TOKEN="${VERCEL_TOKEN}"
PROJECT_ID="prj_A0lzBNO22R4dKpCfmlwyQlCejf42"
TEAM_ID="team_C3ELrcxVzqvbTKqiIBRs83DB"

if [ -z "$VERCEL_TOKEN" ]; then
  echo "ERROR: VERCEL_TOKEN not set!"
  exit 1
fi

echo "[$(date)] Waiting 15s for tunnel to start..."
sleep 15

TUNNEL_URL=$(grep -oh 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' ~/.pm2/logs/tunnel-error.log ~/.pm2/logs/tunnel-out.log 2>/dev/null | tail -1)

if [ -z "$TUNNEL_URL" ]; then
  echo "[$(date)] ERROR: Could not find tunnel URL!"
  tail -20 ~/.pm2/logs/tunnel-error.log
  exit 1
fi

echo "[$(date)] New tunnel URL: $TUNNEL_URL"

ENV_ID=$(curl -s "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" | \
  python3 -c "import sys,json; envs=json.load(sys.stdin).get('envs',[]); match=[e['id'] for e in envs if e.get('key')=='NEXT_PUBLIC_API_URL']; print(match[0] if match else '')" 2>/dev/null)

echo "[$(date)] Env var ID: $ENV_ID"

if [ -n "$ENV_ID" ]; then
  curl -s -X PATCH \
    "https://api.vercel.com/v9/projects/$PROJECT_ID/env/$ENV_ID?teamId=$TEAM_ID" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"value\":\"$TUNNEL_URL\",\"target\":[\"production\"]}"
else
  curl -s -X POST \
    "https://api.vercel.com/v9/projects/$PROJECT_ID/env?teamId=$TEAM_ID" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"NEXT_PUBLIC_API_URL\",\"value\":\"$TUNNEL_URL\",\"type\":\"plain\",\"target\":[\"production\"]}"
fi

echo ""
echo "[$(date)] Triggering Vercel redeploy..."

curl -s -X POST \
  "https://api.vercel.com/v13/deployments?teamId=$TEAM_ID&forceNew=1" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"a-bdul-haseeb-project","gitSource":{"type":"github","repoId":"1404686028","ref":"main"}}'

echo ""
echo "[$(date)] DONE! Vercel redeploying with: $TUNNEL_URL"
