-- Brew Me In Database Schema
-- PostgreSQL Database Schema for Background Jobs & Scheduled Tasks

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cafes table
CREATE TABLE IF NOT EXISTS cafes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    enable_proactive_messages BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL,
    cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cafe_id, username)
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Pokes table
CREATE TABLE IF NOT EXISTS pokes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    expires_at TIMESTAMP NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    CHECK (from_user_id != to_user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'USER',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour < 24),
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_pokes INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    average_session_duration FLOAT DEFAULT 0,
    peak_concurrent_users INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cafe_id, date, hour)
);

-- Agent messages table (for proactive messages)
CREATE TABLE IF NOT EXISTS agent_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    message_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    context_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_cafe_id ON users(cafe_id);
CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users(expires_at);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON user_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_badges_user_id ON badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(type);
CREATE INDEX IF NOT EXISTS idx_badges_expires_at ON badges(expires_at);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);

CREATE INDEX IF NOT EXISTS idx_pokes_from_user ON pokes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_pokes_to_user ON pokes(to_user_id);
CREATE INDEX IF NOT EXISTS idx_pokes_expires_at ON pokes(expires_at);
CREATE INDEX IF NOT EXISTS idx_pokes_created_at ON pokes(created_at);

CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_analytics_cafe_date ON analytics(cafe_id, date);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);

CREATE INDEX IF NOT EXISTS idx_agent_messages_cafe_id ON agent_messages(cafe_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created_at ON agent_messages(created_at);

-- Functions and triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_cafes_updated_at BEFORE UPDATE ON cafes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON badges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_updated_at BEFORE UPDATE ON analytics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO cafes (name, location, enable_proactive_messages)
VALUES
    ('The Daily Grind', 'San Francisco, CA', true),
    ('Espresso Haven', 'New York, NY', true),
    ('Bean & Brew', 'Seattle, WA', false)
ON CONFLICT DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE cafes IS 'Stores cafe locations and settings';
COMMENT ON TABLE users IS 'Temporary user accounts with expiration times';
COMMENT ON TABLE user_sessions IS 'Tracks user session duration for analytics';
COMMENT ON TABLE badges IS 'User achievements and badges earned';
COMMENT ON TABLE pokes IS 'User-to-user poke interactions';
COMMENT ON TABLE messages IS 'Chat messages in the cafe';
COMMENT ON TABLE analytics IS 'Aggregated hourly analytics data';
COMMENT ON TABLE agent_messages IS 'AI agent proactive messages sent to cafes';
