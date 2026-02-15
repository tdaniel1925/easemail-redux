-- Migration 002: Auth & Roles
-- Stage 2: Auth & System Spine (Layer 1)

-- =====================================================
-- AUTO-CREATE USER PROFILE ON AUTH SIGNUP
-- =====================================================

-- Trigger function to auto-create user profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NULL),
    'INDIVIDUAL',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- RATE LIMITING FUNCTION
-- =====================================================

-- Rate limit check function (Postgres-based rate limiting, no Redis)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key TEXT,
  p_max INT,
  p_window_seconds INT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_seconds || ' seconds')::INTERVAL;

  -- Clean old entries
  DELETE FROM rate_limits WHERE window_start < v_window_start;

  -- Count recent requests
  SELECT COALESCE(SUM(count), 0) INTO v_count
  FROM rate_limits
  WHERE key = p_key AND window_start >= v_window_start;

  IF v_count >= p_max THEN
    RETURN FALSE; -- rate limited
  END IF;

  -- Increment counter
  INSERT INTO rate_limits (key, count, window_start)
  VALUES (p_key, 1, date_trunc('second', NOW()))
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limits.count + 1;

  RETURN TRUE; -- allowed
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUTO-UPDATE USER PREFERENCES ON USER CREATE
-- =====================================================

-- Trigger function to auto-create user_preferences when user is created
CREATE OR REPLACE FUNCTION public.handle_new_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_preferences (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW())
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on users insert
DROP TRIGGER IF EXISTS on_user_created_preferences ON public.users;
CREATE TRIGGER on_user_created_preferences
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_preferences();

-- =====================================================
-- HELPER FUNCTION: INCREMENT COLUMN
-- =====================================================

-- Function to increment a numeric column (for login_count, etc.)
CREATE OR REPLACE FUNCTION public.increment_column(
  table_name TEXT,
  column_name TEXT,
  row_id UUID
) RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + 1 WHERE id = $1',
    table_name,
    column_name,
    column_name
  ) USING row_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates user profile when auth.users record is inserted';
COMMENT ON FUNCTION public.check_rate_limit(TEXT, INT, INT) IS 'Postgres-based rate limiting without Redis';
COMMENT ON FUNCTION public.handle_new_user_preferences() IS 'Auto-creates user_preferences when user is created';
COMMENT ON FUNCTION public.increment_column(TEXT, TEXT, UUID) IS 'Helper to increment numeric columns';
