-- Users table (basic structure for reference)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  poke_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cafes table (basic structure for reference)
CREATE TABLE IF NOT EXISTS cafes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User interests table
CREATE TABLE IF NOT EXISTS user_interests (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, interest)
);

-- Pokes table
CREATE TABLE IF NOT EXISTS pokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES dm_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_interests_interest ON user_interests(interest);
CREATE INDEX IF NOT EXISTS idx_pokes_to_user_status ON pokes(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pokes_from_user ON pokes(from_user_id);
CREATE INDEX IF NOT EXISTS idx_pokes_expires_at ON pokes(expires_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_dm_channels_users ON dm_channels(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_channel ON dm_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sender ON dm_messages(sender_id);

-- Function to update last_message_at
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
