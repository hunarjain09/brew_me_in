-- brew_me_in Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cafes table
CREATE TABLE IF NOT EXISTS cafes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  wifi_ssid VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  geofence_radius INTEGER DEFAULT 100, -- in meters
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wifi_ssid)
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL,
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  receipt_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  interests JSONB DEFAULT '[]',
  poke_enabled BOOLEAN DEFAULT true,
  UNIQUE(cafe_id, username),
  UNIQUE(cafe_id, receipt_id)
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  earned_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  tips_in_period INTEGER DEFAULT 0,
  period_start_date TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tips table
CREATE TABLE IF NOT EXISTS tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked BOOLEAN DEFAULT false
);

-- Join tokens table (for barista-generated usernames)
CREATE TABLE IF NOT EXISTS join_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  receipt_id VARCHAR(100) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cafe_id, username)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_cafe_expires ON users(cafe_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_users_expires_at ON users(expires_at);
CREATE INDEX IF NOT EXISTS idx_tips_user_date ON tips(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tips_cafe_date ON tips(cafe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_badges_expires ON badges(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_join_tokens_cafe ON join_tokens(cafe_id);
CREATE INDEX IF NOT EXISTS idx_join_tokens_expires ON join_tokens(expires_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_cafes_updated_at
  BEFORE UPDATE ON cafes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON badges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up expired users
CREATE OR REPLACE FUNCTION cleanup_expired_users()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM users WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired join tokens
CREATE OR REPLACE FUNCTION cleanup_expired_join_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM join_tokens WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired badges
CREATE OR REPLACE FUNCTION cleanup_expired_badges()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM badges WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Component 2: Real-time Chat Tables

-- Messages table (for real-time chat)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(50) NOT NULL,
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'user' CHECK (message_type IN ('user', 'agent', 'system', 'barista')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_cafe_created ON messages(cafe_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted_at) WHERE deleted_at IS NULL;

-- Function to clean up old messages (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM messages WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Component 4: Interest Matching & Poke System Tables

-- User interests table (uses JSONB in users table, but keeping this for relational queries)
CREATE TABLE IF NOT EXISTS user_interests (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, interest)
);

-- Pokes table
CREATE TABLE IF NOT EXISTS pokes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  shared_interest VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'declined', 'expired')),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,
  CONSTRAINT no_self_poke CHECK (from_user_id != to_user_id)
);

-- DM channels table
CREATE TABLE IF NOT EXISTS dm_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cafe_id UUID REFERENCES cafes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP,
  CONSTRAINT unique_user_pair UNIQUE(user1_id, user2_id),
  CONSTRAINT ordered_users CHECK (user1_id < user2_id)
);

-- DM messages table
CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID REFERENCES dm_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Component 4
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests(interest);
CREATE INDEX IF NOT EXISTS idx_pokes_to_user_status ON pokes(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pokes_from_user ON pokes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_pokes_expires_at ON pokes(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dm_channels_users ON dm_channels(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_channel ON dm_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender ON dm_messages(sender_id);

-- Function to update last_message_at in dm_channels
CREATE OR REPLACE FUNCTION update_dm_channel_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE dm_channels
  SET last_message_at = NEW.created_at
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update last_message_at
DROP TRIGGER IF EXISTS trigger_update_dm_last_message ON dm_messages;
CREATE TRIGGER trigger_update_dm_last_message
  AFTER INSERT ON dm_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_dm_channel_last_message();

-- Function to clean up expired pokes
CREATE OR REPLACE FUNCTION cleanup_expired_pokes()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE pokes
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Insert sample cafe data for testing
INSERT INTO cafes (name, wifi_ssid, latitude, longitude, geofence_radius)
VALUES
  ('Downtown Brew', 'DowntownBrew-Guest', 37.7749, -122.4194, 50),
  ('Eastside Coffee', 'EastsideCoffee-WiFi', 37.7849, -122.4094, 75)
ON CONFLICT (wifi_ssid) DO NOTHING;

-- ================================================================
-- COMPONENT 6: MODERATOR DASHBOARD & ADMIN TOOLS
-- ================================================================

-- Moderators table (cafe owners and moderators)
CREATE TABLE IF NOT EXISTS moderators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'moderator')),
  permissions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Moderation actions log
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id UUID REFERENCES moderators(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('mute', 'delete_message', 'warn', 'ban', 'unmute', 'unban')),
  reason TEXT,
  duration INTEGER, -- Duration in minutes (for mute/ban)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages table (for chat and moderation)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'chat',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cafe analytics (daily aggregated stats)
CREATE TABLE IF NOT EXISTS cafe_analytics (
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_messages INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  peak_hour INTEGER,
  agent_queries INTEGER DEFAULT 0,
  pokes_exchanged INTEGER DEFAULT 0,
  badges_earned INTEGER DEFAULT 0,
  PRIMARY KEY (cafe_id, date)
);

-- Agent queries log
CREATE TABLE IF NOT EXISTS agent_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  response TEXT,
  agent_type VARCHAR(50),
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent configuration (per cafe)
CREATE TABLE IF NOT EXISTS agent_config (
  cafe_id UUID PRIMARY KEY REFERENCES cafes(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{
    "enabled": true,
    "responseTime": "fast",
    "personality": "friendly",
    "specializations": []
  }',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cafe events
CREATE TABLE IF NOT EXISTS cafe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  created_by UUID REFERENCES moderators(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for moderator dashboard
CREATE INDEX IF NOT EXISTS idx_moderators_cafe ON moderators(cafe_id);
CREATE INDEX IF NOT EXISTS idx_moderators_email ON moderators(email);
CREATE INDEX IF NOT EXISTS idx_moderation_user ON moderation_actions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_moderator ON moderation_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_created ON moderation_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_cafe ON messages(cafe_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_cafe_date ON cafe_analytics(cafe_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_agent_queries_cafe ON agent_queries(cafe_id);
CREATE INDEX IF NOT EXISTS idx_agent_queries_created ON agent_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_cafe ON cafe_events(cafe_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON cafe_events(event_date);

-- Triggers for moderators updated_at
CREATE TRIGGER update_moderators_updated_at
  BEFORE UPDATE ON moderators
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for agent_config updated_at
CREATE TRIGGER update_agent_config_updated_at
  BEFORE UPDATE ON agent_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample moderator for testing (password: admin123)
INSERT INTO moderators (cafe_id, email, password_hash, role, permissions)
SELECT
  id,
  'admin@downtownbrew.com',
  '$2b$10$rKZvqJYxKxLZGxGxGxGxGeHZQqFqKNJqYxLZGxGxGxGxGxGxGxGxGa',
  'owner',
  ARRAY['all']
FROM cafes WHERE name = 'Downtown Brew'
ON CONFLICT (email) DO NOTHING;
