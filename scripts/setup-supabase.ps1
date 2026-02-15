# EaseMail v2 - Supabase Auto-Setup Script (PowerShell)
# Run: .\scripts\setup-supabase.ps1

Write-Host "🚀 Setting up Supabase for EaseMail v2..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "📦 Installing Supabase CLI..." -ForegroundColor Yellow
    npm install -g supabase
}

# Login check
Write-Host "🔐 Checking authentication..." -ForegroundColor Yellow
try {
    supabase projects list 2>&1 | Out-Null
    Write-Host "✅ Already logged in!" -ForegroundColor Green
} catch {
    Write-Host "Please login to Supabase (browser will open)..." -ForegroundColor Yellow
    supabase login
}

# List organizations
Write-Host ""
Write-Host "📋 Your Supabase organizations:" -ForegroundColor Cyan
supabase orgs list

# Get user input
Write-Host ""
$orgId = Read-Host "Enter your Organization ID"
$projectName = Read-Host "Enter project name (press Enter for 'easemail-v2')"
if ([string]::IsNullOrWhiteSpace($projectName)) { $projectName = "easemail-v2" }

$dbPassword = Read-Host "Enter database password (min 12 chars)" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

Write-Host ""
Write-Host "Available regions:" -ForegroundColor Cyan
Write-Host "  us-east-1 (US East)"
Write-Host "  us-west-1 (US West)"
Write-Host "  eu-west-1 (Europe)"
Write-Host "  ap-southeast-1 (Asia Pacific)"
$region = Read-Host "Enter region (press Enter for 'us-east-1')"
if ([string]::IsNullOrWhiteSpace($region)) { $region = "us-east-1" }

# Create project
Write-Host ""
Write-Host "🏗️  Creating Supabase project '$projectName'..." -ForegroundColor Yellow
Write-Host "This may take 2-3 minutes..." -ForegroundColor Gray

$createOutput = supabase projects create $projectName --org-id $orgId --db-password $dbPasswordPlain --region $region 2>&1

# Extract project ref from output
$projectRef = $createOutput | Select-String -Pattern "Created project .* ([a-z0-9]+)" | ForEach-Object { $_.Matches.Groups[1].Value }

if ([string]::IsNullOrWhiteSpace($projectRef)) {
    Write-Host "❌ Failed to create project. Output:" -ForegroundColor Red
    Write-Host $createOutput
    exit 1
}

Write-Host "✅ Project created! Reference ID: $projectRef" -ForegroundColor Green

# Wait for provisioning
Write-Host ""
Write-Host "⏳ Waiting for project provisioning (2 minutes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 120

# Get API keys
Write-Host ""
Write-Host "🔑 Fetching API keys..." -ForegroundColor Yellow
$apiKeys = supabase projects api-keys --project-ref $projectRef 2>&1 | Out-String

# Extract keys (basic parsing - may need adjustment)
$anonKey = $apiKeys | Select-String -Pattern "anon.*?: (eyJ[^\s]+)" | ForEach-Object { $_.Matches.Groups[1].Value }
$serviceKey = $apiKeys | Select-String -Pattern "service_role.*?: (eyJ[^\s]+)" | ForEach-Object { $_.Matches.Groups[1].Value }

$supabaseUrl = "https://$projectRef.supabase.co"

# Generate encryption key
Write-Host "🔐 Generating encryption key..." -ForegroundColor Yellow
$encryptionKey = openssl rand -base64 32

# Update .env.local
Write-Host ""
Write-Host "📝 Updating .env.local..." -ForegroundColor Yellow

# Create backup
Copy-Item .env.local .env.local.backup -Force

# Read file
$envContent = Get-Content .env.local -Raw

# Replace values
$envContent = $envContent -replace "NEXT_PUBLIC_SUPABASE_URL=.*", "NEXT_PUBLIC_SUPABASE_URL=$supabaseUrl"
$envContent = $envContent -replace "NEXT_PUBLIC_SUPABASE_ANON_KEY=.*", "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anonKey"
$envContent = $envContent -replace "SUPABASE_SERVICE_ROLE_KEY=.*", "SUPABASE_SERVICE_ROLE_KEY=$serviceKey"
$envContent = $envContent -replace "ENCRYPTION_KEY=.*", "ENCRYPTION_KEY=$encryptionKey"
$envContent = $envContent -replace "NEXT_PUBLIC_APP_URL=.*", "NEXT_PUBLIC_APP_URL=http://localhost:3000"

# Write back
Set-Content .env.local $envContent

Write-Host "✅ .env.local updated with Supabase credentials!" -ForegroundColor Green

# Link project
Write-Host ""
Write-Host "🔗 Linking project..." -ForegroundColor Yellow
supabase link --project-ref $projectRef

# Push migrations
Write-Host ""
Write-Host "📊 Pushing database migrations..." -ForegroundColor Yellow
supabase db push

# Set encryption key in database
Write-Host ""
Write-Host "🔐 Setting encryption key in database..." -ForegroundColor Yellow
$sql = "ALTER DATABASE postgres SET app.settings.encryption_key TO '$encryptionKey';"
Write-Host "Run this in Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host $sql -ForegroundColor Gray

# Generate TypeScript types
Write-Host ""
Write-Host "📝 Generating TypeScript types..." -ForegroundColor Yellow
supabase gen types typescript --project-ref $projectRef > src/types/database.ts

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  Project Name: $projectName" -ForegroundColor White
Write-Host "  Project Ref: $projectRef" -ForegroundColor White
Write-Host "  URL: $supabaseUrl" -ForegroundColor White
Write-Host "  Region: $region" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Run this SQL in Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "https://supabase.com/dashboard/project/$projectRef/sql/new" -ForegroundColor Cyan
Write-Host ""
Write-Host $sql -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run the SQL command above in Supabase SQL Editor"
Write-Host "  2. npm run build (to verify TypeScript types work)"
Write-Host "  3. npm run dev (to start the app)"
Write-Host "  4. Open http://localhost:3000"
Write-Host ""
