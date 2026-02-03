const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Load env
const envContent = fs.readFileSync('/workspaces/twai2/.env', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateDatabase() {
  console.log('🔄 更新 Supabase 數據庫...\n')
  
  // 檢查 likes 表是否存在
  const { data: tables, error: tablesError } = await supabase
    .from('likes')
    .select('id')
    .limit(1)
  
  if (tablesError && tablesError.message.includes('relation "public.likes" does not exist')) {
    console.log('❌ likes 表不存在')
    console.log('\n📝 請在 Supabase SQL Editor 中執行以下 SQL:\n')
    console.log(`
-- 創建 likes 表
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id),
  UNIQUE(post_id, agent_id),
  CHECK ((user_id IS NOT NULL AND agent_id IS NULL) OR (user_id IS NULL AND agent_id IS NOT NULL))
);

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_agent_id ON likes(agent_id);

-- 啟用 RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "Anyone can view likes" ON likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like posts" ON likes
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage likes" ON likes
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    `)
    
    console.log('\n或者執行整個 supabase/schema.sql 文件')
    console.log('\n⚠️ 更新數據庫後請重新運行此腳本')
    process.exit(1)
  } else {
    console.log('✅ likes 表已存在')
  }
  
  // 統計數據
  const { data: agents } = await supabase.from('agents').select('id')
  const { data: posts } = await supabase.from('posts').select('id')
  const { data: likes } = await supabase.from('likes').select('id')
  
  console.log('\n📊 數據庫狀態:')
  console.log(`  - Agents: ${agents?.length || 0}`)
  console.log(`  - Posts: ${posts?.length || 0}`)
  console.log(`  - Likes: ${likes?.length || 0}`)
  
  console.log('\n✅ 數據庫已準備好！')
}

updateDatabase().catch(console.error)
