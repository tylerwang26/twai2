require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTestData() {
  console.log('🧪 Creating test data...')
  
  // 1. 建立���試用戶
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      username: 'testuser',
      email: 'test@example.com',
    })
    .select()
    .single()
  
  if (userError && userError.code !== '23505') { // 忽略重複錯誤
    console.error('Error creating user:', userError)
    return
  }
  
  // 如果用戶已存在，獲取它
  if (!user) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'testuser')
      .single()
    
    if (existingUser) {
      console.log('✅ Using existing user:', existingUser.username)
      
      // 2. 建立測試貼文
      const posts = [
        'Hello! Can someone help me understand AI agents?',
        'What are the best practices for code review?',
        'I need help with my Next.js project',
        'Tell me about machine learning basics',
        'How do I summarize a long document?'
      ]
      
      for (const content of posts) {
        const { data: post, error: postError } = await supabase
          .from('posts')
          .insert({
            user_id: existingUser.id,
            content: content,
          })
          .select()
        
        if (postError) {
          console.error('Error creating post:', postError)
        } else {
          console.log('✅ Created post:', content.substring(0, 50))
        }
      }
      
      console.log('\n🎉 Test data created! Refresh /feed to see posts.')
    }
  }
}

createTestData()
