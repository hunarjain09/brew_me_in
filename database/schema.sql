-- Brew Me In - Moderator Dashboard Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cafes table
CREATE TABLE cafes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table (cafe customers)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  receipt_id VARCHAR(100), -- Maps to receipt for identity
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(cafe_id, username)
);

-- Moderators table (cafe owners and moderators)
CREATE TABLE moderators (
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
CREATE TABLE moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id UUID REFERENCES moderators(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('mute', 'delete_message', 'warn', 'ban', 'unmute', 'unban')),
  reason TEXT,
  duration INTEGER, -- Duration in minutes (for mute/ban)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages table (for moderation)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'chat',
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Cafe analytics (daily aggregated stats)
CREATE TABLE cafe_analytics (
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
CREATE TABLE agent_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  response TEXT,
  agent_type VARCHAR(50),
  processing_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agent configuration
CREATE TABLE agent_config (
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
CREATE TABLE cafe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  created_by UUID REFERENCES moderators(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_cafe ON users(cafe_id);
CREATE INDEX idx_users_receipt ON users(receipt_id);
CREATE INDEX idx_moderators_cafe ON moderators(cafe_id);
CREATE INDEX idx_moderators_email ON moderators(email);
CREATE INDEX idx_moderation_user ON moderation_actions(target_user_id);
CREATE INDEX idx_moderation_moderator ON moderation_actions(moderator_id);
CREATE INDEX idx_moderation_created ON moderation_actions(created_at DESC);
CREATE INDEX idx_messages_cafe ON messages(cafe_id);
CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);
CREATE INDEX idx_analytics_cafe_date ON cafe_analytics(cafe_id, date DESC);
CREATE INDEX idx_agent_queries_cafe ON agent_queries(cafe_id);
CREATE INDEX idx_agent_queries_created ON agent_queries(created_at DESC);
CREATE INDEX idx_events_cafe ON cafe_events(cafe_id);
CREATE INDEX idx_events_date ON cafe_events(event_date);

-- Seed data for development
INSERT INTO cafes (name, location, description) VALUES
  ('The Brewhouse', 'Downtown Seattle', 'A cozy coffee shop with great vibes'),
  ('Java Junction', 'Portland', 'Where coffee meets community');

-- Insert a default moderator for testing
-- Password: 'admin123' (hashed with bcrypt)
INSERT INTO moderators (cafe_id, email, password_hash, role, permissions)
SELECT
  id,
  'admin@brewhouse.com',
  '$2b$10$rKZvqJYxKxLZGxGxGxGxGeHZQqFqKNJqYxLZGxGxGxGxGxGxGxGxGa',
  'owner',
  ARRAY['all']
FROM cafes WHERE name = 'The Brewhouse';
