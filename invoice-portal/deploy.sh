#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: ./deploy.sh <stack-name> <bucket-name>"
  exit 1
fi

STACK_NAME=$1
BUCKET_NAME=$2

aws cloudformation deploy \
  --template-file infra/site.yaml \
  --stack-name "$STACK_NAME" \
  --parameter-overrides SiteBucketName="$BUCKET_NAME"

echo "Installing dependencies & building React app"
npm install
npm run build

aws s3 sync dist/ "s3://$BUCKET_NAME" --delete

echo "Deployment complete. Visit: http://$BUCKET_NAME.s3-website-$(aws configure get region).amazonaws.com"
