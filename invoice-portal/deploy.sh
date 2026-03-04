#!/usr/bin/env bash
set -euo pipefail

# Bare minimum S3 deploy: no CloudFront, no ACM. TLS handled by Cloudflare.

PROFILE="${AWS_PROFILE:-huseinovic}"
REGION="${AWS_REGION:-eu-west-2}"
BUCKET_NAME="invoices.huseinovic.net"

echo "Configuring S3 website hosting for bucket: $BUCKET_NAME"
aws --profile "$PROFILE" --region "$REGION" s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document index.html

echo "Ensuring public access for website objects"
aws --profile "$PROFILE" --region "$REGION" s3api put-public-access-block \
  --bucket "$BUCKET_NAME" \
  --public-access-block-configuration BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false

aws --profile "$PROFILE" --region "$REGION" s3api put-bucket-policy \
  --bucket "$BUCKET_NAME" \
  --policy "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Sid\":\"PublicReadGetObject\",\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"s3:GetObject\",\"Resource\":\"arn:aws:s3:::$BUCKET_NAME/*\"}]}"

echo "Installing dependencies & building React app"
npm version patch --no-git-tag-version >/dev/null 2>&1 || true
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
if [[ -n "$VERSION" ]]; then
  echo "Setting VITE_APP_VERSION=$VERSION"
  if [[ -f ".env.local" ]]; then
    sed -i '' -e '/^VITE_APP_VERSION=/d' .env.local || true
  fi
  echo "VITE_APP_VERSION=$VERSION" >> .env.local
fi
npm install
npm run build

echo "Syncing build to S3"
aws --profile "$PROFILE" --region "$REGION" s3 sync dist/ "s3://$BUCKET_NAME" --delete

echo "Deployment complete to S3 website endpoint:"
echo "  http://$BUCKET_NAME.s3-website-$REGION.amazonaws.com"
echo "Cloudflare: point a CNAME for $BUCKET_NAME → $BUCKET_NAME.s3-website-$REGION.amazonaws.com and enable proxy as desired."
