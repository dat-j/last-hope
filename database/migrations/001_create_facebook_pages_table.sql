-- Migration: Create facebook_pages table
-- Description: Table to store Facebook page connections for users

CREATE TABLE IF NOT EXISTS facebook_pages (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    picture TEXT,
    access_token TEXT NOT NULL,
    category VARCHAR(255),
    followers_count INTEGER DEFAULT 0,
    is_connected BOOLEAN DEFAULT TRUE,
    webhook_verified BOOLEAN DEFAULT FALSE,
    user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint (assuming users table exists)
    CONSTRAINT fk_facebook_pages_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_facebook_pages_user_id ON facebook_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_is_connected ON facebook_pages(is_connected);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_user_connected ON facebook_pages(user_id, is_connected);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_facebook_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_facebook_pages_updated_at
    BEFORE UPDATE ON facebook_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_facebook_pages_updated_at(); 