#!/bin/bash

echo "🚀 CHECKING VERCEL DEPLOYMENT STATUS..."
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "⚠️  Vercel CLI not installed"
    echo "   Install with: npm i -g vercel"
    echo ""
    echo "📋 Manual Check:"
    echo "   1. Visit: https://vercel.com/dashboard"
    echo "   2. Find project: easemail-v2"
    echo "   3. Check latest deployment status"
    exit 0
fi

echo "✅ Vercel CLI found"
echo ""

# Get deployment info
echo "📦 Latest Deployments:"
vercel ls easemail-v2 --limit 5

echo ""
echo "🔍 Checking production deployment..."
vercel inspect --prod

echo ""
echo "================================"
echo "✅ Deployment check complete!"
echo "================================"
echo ""
echo "📋 Next steps:"
echo "   1. Open DEPLOYMENT-VERIFICATION.md"
echo "   2. Follow the test script"
echo "   3. Verify all features work"
echo ""
