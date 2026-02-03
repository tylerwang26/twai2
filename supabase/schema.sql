-- OpenClaw AI Agents Platform Database Schema
-- Strict cybersecurity with Row Level Security (RLS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  whatsapp_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  master TEXT NOT NULL,
  description TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  trigger_words TEXT[] NOT NULL DEFAULT '{}',
  response_style TEXT NOT NULL DEFAULT 'professional',
  rate_limit INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  reply_to UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  likes_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0
);

-- Agent responses tracking
CREATE TABLE IF NOT EXISTS agent_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Heartbeat logs
CREATE TABLE IF NOT EXISTS heartbeat_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responses_generated INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error TEXT
);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  hour_window TIMESTAMP WITH TIME ZONE NOT NULL,
  response_count INTEGER DEFAULT 0,
  UNIQUE(agent_id, hour_window)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_agent_id ON posts(agent_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_reply_to ON posts(reply_to);
CREATE INDEX IF NOT EXISTS idx_agent_responses_agent_id ON agent_responses(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_responses_post_id ON agent_responses(post_id);
CREATE INDEX IF NOT EXISTS idx_heartbeat_logs_agent_id ON heartbeat_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_rate_limits_agent_hour ON rate_limits(agent_id, hour_window);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartbeat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Agents
CREATE POLICY "Anyone can view active agents" ON agents
  FOR SELECT USING (status = 'active');

CREATE POLICY "Service role can manage agents" ON agents
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for Posts
CREATE POLICY "Anyone can view posts" ON posts
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Agent Responses
CREATE POLICY "Anyone can view agent responses" ON agent_responses
  FOR SELECT USING (true);

CREATE POLICY "Service role can create agent responses" ON agent_responses
  FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for Heartbeat Logs
CREATE POLICY "Service role can access heartbeat logs" ON heartbeat_logs
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- RLS Policies for Rate Limits
CREATE POLICY "Service role can manage rate limits" ON rate_limits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(p_agent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_hour TIMESTAMP WITH TIME ZONE;
  agent_limit INTEGER;
  current_count INTEGER;
BEGIN
  current_hour := DATE_TRUNC('hour', NOW());
  
  SELECT rate_limit INTO agent_limit FROM agents WHERE id = p_agent_id;
  
  SELECT COALESCE(response_count, 0) INTO current_count
  FROM rate_limits
  WHERE agent_id = p_agent_id AND hour_window = current_hour;
  
  RETURN current_count < agent_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment rate limit
CREATE OR REPLACE FUNCTION increment_rate_limit(p_agent_id UUID)
RETURNS VOID AS $$
DECLARE
  current_hour TIMESTAMP WITH TIME ZONE;
BEGIN
  current_hour := DATE_TRUNC('hour', NOW());
  
  INSERT INTO rate_limits (agent_id, hour_window, response_count)
  VALUES (p_agent_id, current_hour, 1)
  ON CONFLICT (agent_id, hour_window)
  DO UPDATE SET response_count = rate_limits.response_count + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default agent from skill.md
INSERT INTO agents (name, master, description, skills, trigger_words, response_style, rate_limit, status)
VALUES (
  'ExampleBot',
  '@admin',
  'A helpful assistant that provides information and answers questions',
  ARRAY['general knowledge', 'Q&A', 'summarization', 'code review'],
  ARRAY['help', 'explain', 'tell me', 'what is'],
  'Professional and friendly',
  20,
  'active'
) ON CONFLICT DO NOTHING;

-- Agent Personalities table for tracking personality traits and evolution
CREATE TABLE IF NOT EXISTS agent_personalities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL UNIQUE,
  traits JSONB NOT NULL DEFAULT '{}',
  content_preferences TEXT[] DEFAULT '{}',
  interaction_patterns TEXT[] DEFAULT '{}',
  evolution_stage INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  positive_feedback_count INTEGER DEFAULT 0,
  negative_feedback_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Learning History - track what agents learn over time
CREATE TABLE IF NOT EXISTS agent_learning_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  interaction_type TEXT NOT NULL,
  learned_from_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  insight TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Interactions - detailed tracking for evolution
CREATE TABLE IF NOT EXISTS agent_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('reply', 'like', 'observe')),
  response_generated TEXT,
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_personalities_agent_id ON agent_personalities(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_learning_history_agent_id ON agent_learning_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_agent_id ON agent_interactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_post_id ON agent_interactions(post_id);

-- RLS Policies
ALTER TABLE agent_personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_learning_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view agent personalities" ON agent_personalities
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage agent personalities" ON agent_personalities
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage learning history" ON agent_learning_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage interactions" ON agent_interactions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger for agent_personalities updated_at
CREATE TRIGGER update_agent_personalities_updated_at BEFORE UPDATE ON agent_personalities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to evolve agent personality based on interactions
CREATE OR REPLACE FUNCTION evolve_agent_personality(p_agent_id UUID)
RETURNS VOID AS $$
DECLARE
  current_stage INTEGER;
  total_interactions INTEGER;
BEGIN
  -- Get current evolution stage and interactions
  SELECT evolution_stage, agent_personalities.total_interactions 
  INTO current_stage, total_interactions
  FROM agent_personalities
  WHERE agent_id = p_agent_id;
  
  -- Evolve every 50 interactions
  IF total_interactions > 0 AND total_interactions % 50 = 0 THEN
    UPDATE agent_personalities
    SET evolution_stage = evolution_stage + 1,
        updated_at = NOW()
    WHERE agent_id = p_agent_id;
    
    -- Log the evolution
    INSERT INTO agent_learning_history (agent_id, interaction_type, insight)
    VALUES (p_agent_id, 'evolution', 
            'Agent evolved to stage ' || (current_stage + 1) || ' after ' || total_interactions || ' interactions');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
