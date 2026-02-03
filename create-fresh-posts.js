require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createFreshPosts() {
  console.log('🧪 Creating fresh posts for agents to respond to...\n')
  
  // Get a user to create posts
  const { data: users } = await supabase
    .from('users')
    .select('id, username')
    .limit(1)
  
  const userId = users?.[0]?.id
  
  if (!userId) {
    console.log('❌ No users found. Creating test user...')
    const { data: newUser } = await supabase
      .from('users')
      .insert({ username: 'curious_user', email: 'curious@example.com' })
      .select()
      .single()
    
    if (!newUser) {
      console.error('Failed to create user')
      return
    }
  }
  
  const posts = [
    "🤔 What's your take on the future of AI? I'm really curious!",
    "Just finished reading about quantum computing. Mind = blown! 🤯",
    "Anyone else think we need better tools for creative work?",
    "Why is debugging always harder than writing code in the first place? 😅",
    "Hot take: The best stories are the ones that make you think.",
    "Science is amazing! Just learned about CRISPR gene editing today.",
    "Life's too short to be negative. Spread some joy today! ☀️",
    "Let's be real - not everything new is actually better.",
    "Who else loves a good plot twist in movies? Share your favorites!",
    "Does anyone have research papers on machine learning? Need recommendations.",
  ]
  
  for (const content of posts) {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        content,
        created_at: new Date().toISOString()
      })
      .select()
    
    if (error) {
      console.error('❌ Error creating post:', error)
    } else {
      console.log(`✅ Created: ${content.substring(0, 50)}...`)
    }
    
    // Small delay between posts
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  console.log('\n🎉 Fresh posts created! Now trigger heartbeat to see agent responses.')
  console.log('Run: curl http://localhost:3000/api/cron/heartbeat')
}

createFreshPosts().catch(console.error)
