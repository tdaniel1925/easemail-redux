-- Fix: Modify encryption functions to accept encryption key as parameter
-- This works around Supabase's restriction on custom Postgres settings

-- Drop old functions
DROP FUNCTION IF EXISTS insert_oauth_tokens;
DROP FUNCTION IF EXISTS decrypt_oauth_tokens;
DROP FUNCTION IF EXISTS update_oauth_tokens;

-- Function to insert encrypted OAuth tokens (with encryption key parameter)
CREATE OR REPLACE FUNCTION insert_oauth_tokens(
  p_user_id UUID,
  p_email_account_id UUID,
  p_provider provider_type,
  p_access_token TEXT,
  p_refresh_token TEXT,
  p_token_expires_at TIMESTAMPTZ,
  p_scopes TEXT[],
  p_encryption_key TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Use provided key, or try to get from settings (backwards compatibility)
  IF p_encryption_key IS NOT NULL AND p_encryption_key != '' THEN
    encryption_key := p_encryption_key;
  ELSE
    -- Try current_setting as fallback
    BEGIN
      encryption_key := current_setting('app.settings.encryption_key', true);
    EXCEPTION WHEN OTHERS THEN
      encryption_key := NULL;
    END;
  END IF;

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key required. Pass as parameter or set app.settings.encryption_key.';
  END IF;

  -- Delete existing token if any
  DELETE FROM oauth_tokens WHERE email_account_id = p_email_account_id;

  -- Insert new encrypted tokens
  INSERT INTO oauth_tokens (
    user_id,
    email_account_id,
    provider,
    access_token,
    refresh_token,
    token_expires_at,
    scopes
  ) VALUES (
    p_user_id,
    p_email_account_id,
    p_provider,
    pgp_sym_encrypt(p_access_token, encryption_key),
    pgp_sym_encrypt(p_refresh_token, encryption_key),
    p_token_expires_at,
    p_scopes
  );
END;
$$;

-- Function to decrypt OAuth tokens (with encryption key parameter)
CREATE OR REPLACE FUNCTION decrypt_oauth_tokens(
  token_id UUID,
  p_encryption_key TEXT DEFAULT NULL
)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
  encrypted_access TEXT;
  encrypted_refresh TEXT;
BEGIN
  -- Use provided key, or try to get from settings (backwards compatibility)
  IF p_encryption_key IS NOT NULL AND p_encryption_key != '' THEN
    encryption_key := p_encryption_key;
  ELSE
    -- Try current_setting as fallback
    BEGIN
      encryption_key := current_setting('app.settings.encryption_key', true);
    EXCEPTION WHEN OTHERS THEN
      encryption_key := NULL;
    END;
  END IF;

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key required. Pass as parameter or set app.settings.encryption_key.';
  END IF;

  -- Get encrypted tokens
  SELECT
    oauth_tokens.access_token::TEXT,
    oauth_tokens.refresh_token::TEXT
  INTO encrypted_access, encrypted_refresh
  FROM oauth_tokens
  WHERE id = token_id;

  IF encrypted_access IS NULL THEN
    RAISE EXCEPTION 'Token not found';
  END IF;

  -- Return decrypted tokens
  RETURN QUERY
  SELECT
    pgp_sym_decrypt(encrypted_access::BYTEA, encryption_key)::TEXT,
    pgp_sym_decrypt(encrypted_refresh::BYTEA, encryption_key)::TEXT;
END;
$$;

-- Function to update OAuth tokens with encryption (with encryption key parameter)
CREATE OR REPLACE FUNCTION update_oauth_tokens(
  token_id UUID,
  new_access_token TEXT,
  new_refresh_token TEXT,
  new_expires_at TIMESTAMPTZ,
  p_encryption_key TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Use provided key, or try to get from settings (backwards compatibility)
  IF p_encryption_key IS NOT NULL AND p_encryption_key != '' THEN
    encryption_key := p_encryption_key;
  ELSE
    -- Try current_setting as fallback
    BEGIN
      encryption_key := current_setting('app.settings.encryption_key', true);
    EXCEPTION WHEN OTHERS THEN
      encryption_key := NULL;
    END;
  END IF;

  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key required. Pass as parameter or set app.settings.encryption_key.';
  END IF;

  -- Update with encrypted tokens
  UPDATE oauth_tokens
  SET
    access_token = pgp_sym_encrypt(new_access_token, encryption_key),
    refresh_token = pgp_sym_encrypt(new_refresh_token, encryption_key),
    token_expires_at = new_expires_at,
    updated_at = NOW()
  WHERE id = token_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION insert_oauth_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_oauth_tokens TO authenticated;
GRANT EXECUTE ON FUNCTION update_oauth_tokens TO authenticated;
