
-- Auth Handshake Table for Electron/Web Login
-- Run this in your Supabase SQL Editor

DROP TABLE IF EXISTS auth_handshakes;

CREATE TABLE auth_handshakes (
    id TEXT PRIMARY KEY,
    access_token TEXT,
    refresh_token TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '5 minutes')
);

-- Enable RLS
ALTER TABLE auth_handshakes ENABLE ROW LEVEL SECURITY;

-- Allow anyone (Electron) to insert a new handshake request
CREATE POLICY "Public Insert" ON auth_handshakes FOR INSERT WITH CHECK (true);

-- Allow ONLY authenticated users (Web after login) to update the handshake with tokens
-- This prevents random anonymous users from injecting fake tokens
CREATE POLICY "Authenticated Update" ON auth_handshakes FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow anyone (Electron) to select by ID to poll for tokens
CREATE POLICY "Public Select" ON auth_handshakes FOR SELECT USING (true);

-- Allow anyone to delete (Cleanup)
CREATE POLICY "Public Delete" ON auth_handshakes FOR DELETE USING (true);
