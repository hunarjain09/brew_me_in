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

-- Insert sample cafe data for testing
INSERT INTO cafes (name, wifi_ssid, latitude, longitude, geofence_radius)
VALUES
  ('Downtown Brew', 'DowntownBrew-Guest', 37.7749, -122.4194, 50),
  ('Eastside Coffee', 'EastsideCoffee-WiFi', 37.7849, -122.4094, 75)
ON CONFLICT (wifi_ssid) DO NOTHING;
