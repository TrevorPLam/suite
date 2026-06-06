-- Passkey table for Better Auth passkey plugin
-- Stores WebAuthn/FIDO2 passkey credentials for passwordless authentication

CREATE TABLE IF NOT EXISTS passkey (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    device_type TEXT NOT NULL,
    transports TEXT,
    name TEXT NOT NULL DEFAULT 'Passkey',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_passkey_user_id ON passkey(user_id);
CREATE INDEX IF NOT EXISTS idx_passkey_credential_id ON passkey(credential_id);

-- Add RLS policies for multi-tenant isolation
ALTER TABLE passkey ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own passkeys
CREATE POLICY passkey_select_policy ON passkey
    FOR SELECT
    USING (user_id = app.current_user_id);

-- Policy: Users can only insert passkeys for themselves
CREATE POLICY passkey_insert_policy ON passkey
    FOR INSERT
    WITH CHECK (user_id = app.current_user_id);

-- Policy: Users can only update their own passkeys
CREATE POLICY passkey_update_policy ON passkey
    FOR UPDATE
    USING (user_id = app.current_user_id);

-- Policy: Users can only delete their own passkeys
CREATE POLICY passkey_delete_policy ON passkey
    FOR DELETE
    USING (user_id = app.current_user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_passkey_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER passkey_updated_at_trigger
    BEFORE UPDATE ON passkey
    FOR EACH ROW
    EXECUTE FUNCTION update_passkey_updated_at();
