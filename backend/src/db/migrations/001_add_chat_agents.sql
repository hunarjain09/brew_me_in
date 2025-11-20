-- Migration: Add Chat Agents Integration
-- Description: Adds support for AI agents as chat participants in cafes
-- Date: 2025-11-20

-- ============================================================================
-- CHAT AGENTS TABLE
-- ============================================================================
-- One agent per cafe that participates in chat conversations
CREATE TABLE IF NOT EXISTS chat_agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,              -- e.g., "Barista Bot"
  username VARCHAR(50) NOT NULL UNIQUE,   -- e.g., "barista" (for @mentions)
  avatar_url TEXT,                        -- Agent avatar image
  personality VARCHAR(50) DEFAULT 'bartender', -- Agent personality type
  custom_prompt TEXT,                     -- Custom system prompt for agent
  proactivity VARCHAR(20) DEFAULT 'occasional', -- silent, occasional, active
  enabled BOOLEAN DEFAULT true,           -- Agent can be disabled by admin
  status VARCHAR(20) DEFAULT 'online',    -- online, offline, busy
  metadata JSONB DEFAULT '{}',            -- Additional configuration
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- One agent per cafe
  CONSTRAINT unique_agent_per_cafe UNIQUE(cafe_id)
);

-- ============================================================================
-- AGENT CONTEXT TABLE
-- ============================================================================
-- Allows admins to manage agent conversation context
CREATE TABLE IF NOT EXISTS agent_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES chat_agents(id) ON DELETE CASCADE,
  context_type VARCHAR(50) NOT NULL,      -- 'system', 'knowledge', 'instruction'
  content TEXT NOT NULL,                  -- The context content
  priority INTEGER DEFAULT 0,             -- Higher priority = more important
  enabled BOOLEAN DEFAULT true,           -- Can be temporarily disabled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Ensure unique context types per agent
  CONSTRAINT unique_context_type_per_agent UNIQUE(agent_id, context_type)
);

-- ============================================================================
-- AGENT INTERACTIONS TABLE
-- ============================================================================
-- Tracks all agent interactions for analytics and debugging
CREATE TABLE IF NOT EXISTS agent_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES chat_agents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  interaction_type VARCHAR(50) NOT NULL,  -- 'mention', 'proactive', 'contextual'
  query TEXT NOT NULL,                    -- User's message to agent
  response TEXT,                          -- Agent's response
  processing_time_ms INTEGER,             -- Response latency
  token_count INTEGER,                    -- Claude API tokens used
  success BOOLEAN DEFAULT true,           -- Whether response succeeded
  error_message TEXT,                     -- Error if failed
  metadata JSONB DEFAULT '{}',            -- Additional data
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- AGENT RATE LIMITS TABLE
-- ============================================================================
-- Tracks user rate limits for agent interactions
CREATE TABLE IF NOT EXISTS agent_rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES chat_agents(id) ON DELETE CASCADE,
  message_count INTEGER DEFAULT 0,        -- Messages in current window
  window_start TIMESTAMP DEFAULT NOW(),   -- Rate limit window start
  last_message_at TIMESTAMP,              -- Last message timestamp
  total_messages INTEGER DEFAULT 0,       -- Total messages (all-time)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_user_agent_limit UNIQUE(user_id, agent_id)
);

-- ============================================================================
-- UPDATE MESSAGES TABLE
-- ============================================================================
-- Add support for agent messages and references
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES chat_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS mentioned_agents TEXT[], -- Array of agent usernames mentioned
  ADD COLUMN IF NOT EXISTS is_streaming BOOLEAN DEFAULT false; -- If message is being streamed

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Chat Agents
CREATE INDEX IF NOT EXISTS idx_chat_agents_cafe ON chat_agents(cafe_id);
CREATE INDEX IF NOT EXISTS idx_chat_agents_username ON chat_agents(username);
CREATE INDEX IF NOT EXISTS idx_chat_agents_enabled ON chat_agents(enabled) WHERE enabled = true;

-- Agent Context
CREATE INDEX IF NOT EXISTS idx_agent_context_agent ON agent_context(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_context_enabled ON agent_context(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_agent_context_priority ON agent_context(agent_id, priority DESC);

-- Agent Interactions
CREATE INDEX IF NOT EXISTS idx_agent_interactions_agent ON agent_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_user ON agent_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_created ON agent_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_type ON agent_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_message ON agent_interactions(message_id);

-- Agent Rate Limits
CREATE INDEX IF NOT EXISTS idx_agent_rate_limits_user ON agent_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_rate_limits_agent ON agent_rate_limits(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_rate_limits_window ON agent_rate_limits(window_start);

-- Messages (agent-specific)
CREATE INDEX IF NOT EXISTS idx_messages_agent ON messages(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_mentioned_agents ON messages USING GIN(mentioned_agents) WHERE mentioned_agents IS NOT NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for chat_agents
CREATE TRIGGER update_chat_agents_updated_at
  BEFORE UPDATE ON chat_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for agent_context
CREATE TRIGGER update_agent_context_updated_at
  BEFORE UPDATE ON agent_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at for agent_rate_limits
CREATE TRIGGER update_agent_rate_limits_updated_at
  BEFORE UPDATE ON agent_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to auto-create default agent when cafe is created
CREATE OR REPLACE FUNCTION create_default_agent_for_cafe()
RETURNS TRIGGER AS $$
DECLARE
  agent_username VARCHAR(50);
BEGIN
  -- Generate username from cafe name (lowercase, no spaces, max 20 chars)
  agent_username := LOWER(REGEXP_REPLACE(LEFT(NEW.name, 20), '[^a-zA-Z0-9]', '', 'g'));

  -- Fallback to 'barista' if username is empty
  IF agent_username = '' THEN
    agent_username := 'barista';
  END IF;

  -- Ensure username is unique by appending cafe ID suffix if needed
  IF EXISTS (SELECT 1 FROM chat_agents WHERE username = agent_username) THEN
    agent_username := agent_username || '_' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
  END IF;

  -- Create default agent
  INSERT INTO chat_agents (
    cafe_id,
    name,
    username,
    personality,
    proactivity,
    enabled,
    status,
    metadata
  ) VALUES (
    NEW.id,
    COALESCE(NEW.name, 'Cafe') || ' Bot',  -- e.g., "Downtown Brew Bot"
    agent_username,
    'bartender',
    'occasional',
    true,
    'online',
    jsonb_build_object(
      'auto_created', true,
      'created_for_cafe', NEW.name
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create agent when cafe is created
DROP TRIGGER IF EXISTS trigger_create_default_agent ON cafes;
CREATE TRIGGER trigger_create_default_agent
  AFTER INSERT ON cafes
  FOR EACH ROW
  EXECUTE FUNCTION create_default_agent_for_cafe();

-- Function to check and reset rate limit window
CREATE OR REPLACE FUNCTION check_agent_rate_limit(
  p_user_id UUID,
  p_agent_id UUID,
  p_max_messages INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS JSONB AS $$
DECLARE
  current_limit RECORD;
  window_expired BOOLEAN;
  result JSONB;
BEGIN
  -- Get current rate limit
  SELECT * INTO current_limit
  FROM agent_rate_limits
  WHERE user_id = p_user_id AND agent_id = p_agent_id;

  -- If no record exists, create one
  IF current_limit IS NULL THEN
    INSERT INTO agent_rate_limits (user_id, agent_id, message_count, window_start)
    VALUES (p_user_id, p_agent_id, 0, NOW())
    RETURNING * INTO current_limit;
  END IF;

  -- Check if window has expired
  window_expired := (NOW() - current_limit.window_start) > (p_window_minutes || ' minutes')::INTERVAL;

  -- Reset window if expired
  IF window_expired THEN
    UPDATE agent_rate_limits
    SET message_count = 0,
        window_start = NOW()
    WHERE user_id = p_user_id AND agent_id = p_agent_id
    RETURNING * INTO current_limit;
  END IF;

  -- Check if limit exceeded
  IF current_limit.message_count >= p_max_messages THEN
    result := jsonb_build_object(
      'allowed', false,
      'current_count', current_limit.message_count,
      'max_messages', p_max_messages,
      'window_reset_at', current_limit.window_start + (p_window_minutes || ' minutes')::INTERVAL,
      'seconds_until_reset', EXTRACT(EPOCH FROM (current_limit.window_start + (p_window_minutes || ' minutes')::INTERVAL - NOW()))
    );
  ELSE
    result := jsonb_build_object(
      'allowed', true,
      'current_count', current_limit.message_count,
      'max_messages', p_max_messages,
      'remaining', p_max_messages - current_limit.message_count
    );
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_agent_rate_limit(
  p_user_id UUID,
  p_agent_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_rate_limits
  SET message_count = message_count + 1,
      last_message_at = NOW(),
      total_messages = total_messages + 1
  WHERE user_id = p_user_id AND agent_id = p_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old agent interactions (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_agent_interactions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM agent_interactions
  WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE DEFAULT AGENTS FOR EXISTING CAFES
-- ============================================================================
-- This will create agents for any cafes that already exist in the database

DO $$
DECLARE
  cafe_record RECORD;
  agent_username VARCHAR(50);
BEGIN
  FOR cafe_record IN SELECT * FROM cafes LOOP
    -- Check if agent already exists for this cafe
    IF NOT EXISTS (SELECT 1 FROM chat_agents WHERE cafe_id = cafe_record.id) THEN
      -- Generate username
      agent_username := LOWER(REGEXP_REPLACE(LEFT(cafe_record.name, 20), '[^a-zA-Z0-9]', '', 'g'));

      IF agent_username = '' THEN
        agent_username := 'barista';
      END IF;

      -- Ensure uniqueness
      IF EXISTS (SELECT 1 FROM chat_agents WHERE username = agent_username) THEN
        agent_username := agent_username || '_' || SUBSTRING(cafe_record.id::TEXT FROM 1 FOR 8);
      END IF;

      -- Create agent
      INSERT INTO chat_agents (
        cafe_id,
        name,
        username,
        personality,
        proactivity,
        enabled,
        status,
        metadata
      ) VALUES (
        cafe_record.id,
        COALESCE(cafe_record.name, 'Cafe') || ' Bot',
        agent_username,
        'bartender',
        'occasional',
        true,
        'online',
        jsonb_build_object(
          'auto_created', true,
          'created_for_cafe', cafe_record.name,
          'migration', true
        )
      );

      RAISE NOTICE 'Created agent % for cafe %', agent_username, cafe_record.name;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE chat_agents IS 'AI agents that participate in cafe chat rooms';
COMMENT ON TABLE agent_context IS 'Admin-managed context for agent responses';
COMMENT ON TABLE agent_interactions IS 'Tracks all agent interactions for analytics';
COMMENT ON TABLE agent_rate_limits IS 'Rate limiting for user-agent interactions';

COMMENT ON COLUMN chat_agents.personality IS 'Agent personality type: bartender, quirky, historian, sarcastic, professional';
COMMENT ON COLUMN chat_agents.proactivity IS 'How often agent sends unsolicited messages: silent, occasional, active';
COMMENT ON COLUMN agent_context.priority IS 'Higher priority context is included first in prompts';
COMMENT ON COLUMN agent_interactions.interaction_type IS 'Type: mention (user @mentioned), proactive (agent initiated), contextual (triggered by keywords)';
COMMENT ON COLUMN messages.mentioned_agents IS 'Array of agent usernames mentioned in message (e.g., ["barista", "events"])';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify tables were created
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_name IN ('chat_agents', 'agent_context', 'agent_interactions', 'agent_rate_limits')) = 4,
         'Not all tables were created successfully';

  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Tables created: chat_agents, agent_context, agent_interactions, agent_rate_limits';
  RAISE NOTICE 'Agents created for % existing cafes', (SELECT COUNT(*) FROM chat_agents);
END $$;
