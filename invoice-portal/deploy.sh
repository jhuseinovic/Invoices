#!/usr/bin/env bash
set -euo pipefail

# if [[ $# -lt 2 ]]; then
#   echo "Usage: ./deploy.sh <stack-name> <bucket-name>"
#   exit 1
# fi

STACK_NAME="invoice-portal"
BUCKET_NAME="invoices.huseinovic.net"
REGION="eu-west-2"

aws --profile huseinovic cloudformation deploy \
  --template-file infra/site.yaml \
  --stack-name "$STACK_NAME" \
  --parameter-overrides SiteBucketName="$BUCKET_NAME"

echo "Installing dependencies & building React app"
npm install
npm run build

aws --profile huseinovic s3 sync dist/ "s3://$BUCKET_NAME" --delete

echo "Deployment complete. Visit: http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
