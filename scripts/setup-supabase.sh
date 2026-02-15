#!/bin/bash
# Auto-setup script for Supabase project

set -e

echo "🚀 Setting up Supabase for EaseMail v2..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "🔐 Please login to Supabase..."
    supabase login
fi

# List organizations
echo ""
echo "📋 Your Supabase organizations:"
supabase orgs list

# Prompt for org ID
read -p "Enter your Organization ID: " ORG_ID

# Prompt for project details
read -p "Enter project name (default: easemail-v2): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-easemail-v2}

read -p "Enter database password (min 12 chars): " DB_PASSWORD

# Prompt for region
echo ""
echo "Available regions:"
echo "  us-east-1 (US East)"
echo "  us-west-1 (US West)"
echo "  eu-west-1 (Europe)"
echo "  ap-southeast-1 (Asia Pacific)"
read -p "Enter region (default: us-east-1): " REGION
REGION=${REGION:-us-east-1}

# Create project
echo ""
echo "🏗️  Creating Supabase project '$PROJECT_NAME'..."
PROJECT_REF=$(supabase projects create "$PROJECT_NAME" \
  --org-id "$ORG_ID" \
  --db-password "$DB_PASSWORD" \
  --region "$REGION" \
  2>&1 | grep -oP 'Created project .* \K[a-z0-9]+')

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Failed to create project"
    exit 1
fi

echo "✅ Project created! Ref: $PROJECT_REF"

# Wait for project to be ready
echo "⏳ Waiting for project to be ready (this takes ~2 minutes)..."
sleep 120

# Get API keys
echo "🔑 Fetching API keys..."
API_SETTINGS=$(supabase projects api-keys --project-ref "$PROJECT_REF")

# Extract keys (this is a simplified version - actual parsing may vary)
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"

echo ""
echo "📋 Your credentials:"
echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL"
echo ""
echo "⚠️  Get your API keys from:"
echo "https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
echo ""
echo "Or run:"
echo "supabase projects api-keys --project-ref $PROJECT_REF"

# Generate encryption key
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Update .env.local
echo ""
echo "📝 Updating .env.local..."

# Create backup
cp .env.local .env.local.backup

# Update file (basic sed replacement - may need adjustment for Windows)
sed -i "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL|g" .env.local
sed -i "s|ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|g" .env.local

echo "✅ .env.local updated!"
echo ""
echo "⚠️  IMPORTANT: Manually add these to .env.local:"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "Get them from: https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
echo ""
echo "Next steps:"
echo "  1. Add API keys to .env.local"
echo "  2. Run: npx supabase link --project-ref $PROJECT_REF"
echo "  3. Run: npx supabase db push"
echo "  4. Run: npx supabase gen types typescript --project-ref $PROJECT_REF > src/types/database.ts"
echo "  5. Run: npm run dev"
