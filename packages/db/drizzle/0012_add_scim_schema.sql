-- SCIM Provider table for Better Auth SCIM plugin
-- Extends SSO provider with SCIM-specific configuration for user provisioning

-- Add SCIM-specific columns to sso_provider table
ALTER TABLE sso_provider ADD COLUMN IF NOT EXISTS scim_config TEXT;
ALTER TABLE sso_provider ADD COLUMN IF NOT EXISTS scim_token TEXT;
ALTER TABLE sso_provider ADD COLUMN IF NOT EXISTS scim_base_url TEXT;
ALTER TABLE sso_provider ADD COLUMN IF NOT EXISTS scim_enabled BOOLEAN DEFAULT FALSE;

-- Create index for SCIM-enabled providers
CREATE INDEX IF NOT EXISTS idx_sso_provider_scim_enabled ON sso_provider(scim_enabled) WHERE scim_enabled = TRUE;

-- Update RLS policies to allow SCIM operations
-- SCIM operations are performed by identity providers using bearer tokens
-- These operations should be allowed at the organization level
DROP POLICY IF EXISTS sso_provider_select_policy ON sso_provider;
CREATE POLICY sso_provider_select_policy ON sso_provider
    FOR SELECT
    USING (
        user_id = app.current_user_id
        OR organization_id = app.current_tenant_id
        OR (scim_enabled = TRUE AND organization_id = app.current_tenant_id)
    );

-- SCIM providers can be updated by organization admins or via SCIM token
DROP POLICY IF EXISTS sso_provider_update_policy ON sso_provider;
CREATE POLICY sso_provider_update_policy ON sso_provider
    FOR UPDATE
    USING (
        user_id = app.current_user_id
        OR organization_id = app.current_tenant_id
    )
    WITH CHECK (
        user_id = app.current_user_id
        OR organization_id = app.current_tenant_id
    );
