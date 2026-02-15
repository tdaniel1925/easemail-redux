-- Migration: Persistent Sessions
-- Phase 1, Task 4
-- Adds support for "Remember Me" functionality with configurable session expiry

-- Add remember_me column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS remember_me BOOLEAN DEFAULT FALSE;

-- Add session_expires_at column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS session_expires_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN users.remember_me IS 'User preference for persistent sessions (Remember Me)';
COMMENT ON COLUMN users.session_expires_at IS 'Explicit session expiry time, managed by application middleware';
