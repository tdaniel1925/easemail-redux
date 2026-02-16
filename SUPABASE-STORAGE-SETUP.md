# Supabase Storage Setup Instructions

## Required for Phase 4: Attachments

### Bucket Configuration

**Bucket Name:** `attachments`

**Settings:**
- **Public:** `false` (private bucket, requires auth)
- **File Size Limit:** `50 MB` (adjust based on needs)
- **Allowed MIME Types:** All (or restrict to specific types if desired)

### Setup Methods

#### Option 1: Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/[PROJECT_ID]/storage/buckets
2. Click "New bucket"
3. Name: `attachments`
4. Public: `false`
5. Click "Create bucket"

#### Option 2: Supabase CLI
```bash
npx supabase storage create attachments --public false
```

#### Option 3: SQL (if using local Supabase)
```sql
-- Create attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Grant access policies (RLS)
-- Users can upload their own attachments
CREATE POLICY "Users can upload their own attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can read their own attachments
CREATE POLICY "Users can read their own attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Verification

After setup, verify the bucket exists:
```bash
npx supabase storage list
```

Or via code:
```typescript
const { data, error } = await supabase.storage.listBuckets()
console.log(data) // Should include 'attachments'
```

### File Path Structure

Files will be stored with this path pattern:
```
attachments/{user_id}/{message_id}/{filename}
```

Example:
```
attachments/123e4567-e89b-12d3-a456-426614174000/msg-abc123/report.pdf
```

This ensures:
- User isolation (each user has their own folder)
- Message grouping (all attachments for a message are together)
- Original filename preservation

### Status

- [ ] Bucket created
- [ ] RLS policies applied
- [ ] Verified via dashboard or CLI

**Action Required:** Create this bucket before deploying Phase 4 to production.
