-- Migration 007: Fix RLS Infinite Recursion
-- Fixes infinite recursion errors in RLS policies that query the same table they protect

-- =====================================================
-- DROP PROBLEMATIC SUPER ADMIN POLICIES
-- =====================================================

-- These policies cause infinite recursion because they query the 'users' table
-- within a policy ON the 'users' table

DROP POLICY IF EXISTS "Super admins read all users" ON users;
DROP POLICY IF EXISTS "Super admins update user roles" ON users;
DROP POLICY IF EXISTS "Super admins manage org members" ON organization_members;
DROP POLICY IF EXISTS "Super admins manage invites" ON organization_invites;
DROP POLICY IF EXISTS "Super admins manage subscriptions" ON subscriptions;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'Super admin operations should use service role client, not RLS policies that cause infinite recursion';
