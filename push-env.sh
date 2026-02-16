#!/bin/bash

# Script to push .env.local variables to Vercel
# Usage: bash push-env.sh

echo "🚀 Pushing environment variables to Vercel..."

# Required for the script to work
SCOPE="bot-makers"

# Read .env.local and push each variable
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  if [[ -z "$key" ]] || [[ "$key" =~ ^# ]]; then
    continue
  fi

  # Remove quotes from value if present
  value="${value%\"}"
  value="${value#\"}"

  echo "Setting $key..."

  # Use echo to pipe the value to vercel env add
  echo "$value" | npx vercel env add "$key" production --scope "$SCOPE" --force

done < .env.local

echo "✅ Done! Environment variables pushed to Vercel."
echo "Now redeploy your project to use the new variables."
