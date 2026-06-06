-- SSO Provider table for Better Auth SSO plugin
-- Stores SAML and OIDC provider configurations for enterprise SSO

CREATE TABLE IF NOT EXISTS sso_provider (
    id TEXT PRIMARY KEY,
    issuer TEXT NOT NULL,
    domain TEXT NOT NULL,
    oidc_config TEXT,
    saml_config TEXT,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    provider_id TEXT NOT NULL UNIQUE,
    organization_id TEXT REFERENCES organization(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sso_provider_user_id ON sso_provider(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_provider_organization_id ON sso_provider(organization_id);
CREATE INDEX IF NOT EXISTS idx_sso_provider_provider_id ON sso_provider(provider_id);
CREATE INDEX IF NOT EXISTS idx_sso_provider_domain ON sso_provider(domain);

-- Add RLS policies for multi-tenant isolation
ALTER TABLE sso_provider ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see SSO providers they own or belong to their organization
CREATE POLICY sso_provider_select_policy ON sso_provider
    FOR SELECT
    USING (
        user_id = app.current_user_id
        OR organization_id = app.current_tenant_id
    );

-- Policy: Users can only insert SSO providers they own
CREATE POLICY sso_provider_insert_policy ON sso_provider
    FOR INSERT
    WITH CHECK (user_id = app.current_user_id);

-- Policy: Users can only update SSO providers they own or belong to their organization
CREATE POLICY sso_provider_update_policy ON sso_provider
    FOR UPDATE
    USING (
        user_id = app.current_user_id
        OR organization_id = app.current_tenant_id
    );

-- Policy: Users can only delete SSO providers they own
CREATE POLICY sso_provider_delete_policy ON sso_provider
    FOR DELETE
    USING (user_id = app.current_user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sso_provider_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER sso_provider_updated_at_trigger
    BEFORE UPDATE ON sso_provider
    FOR EACH ROW
    EXECUTE FUNCTION update_sso_provider_updated_at();
