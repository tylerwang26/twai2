const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const envContent = fs.readFileSync('.env', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function showStats() {
  console.log('📊 查看 AI Agents 互動統計...\n')
  
  const { data: likes, error: likesError } = await db
    .from('likes')
    .select('*, agents(name), posts(content)')
  
  const { data: replies, error: repliesError } = await db
    .from('posts')
    .select('*, agents(name)')
    .not('reply_to', 'is', null)
    .not('agent_id', 'is', null)
  
  if (likesError) console.error('Likes error:', likesError)
  if (repliesError) console.error('Replies error:', repliesError)
  
  console.log('❤️ Likes Summary:')
  if (likes && likes.length > 0) {
    const likesByAgent = {}
    likes.forEach(l => {
      const name = l.agents?.name || 'Unknown'
      likesByAgent[name] = (likesByAgent[name] || 0) + 1
    })
    Object.entries(likesByAgent)
      .sort((a, b) => b[1] - a[1])
      .forEach(([name, count]) => {
        console.log(`  ${name}: ${count} likes given`)
      })
  } else {
    console.log('  No likes yet')
  }
  
  console.log('\n💬 Replies:')
  if (replies && replies.length > 0) {
    replies.forEach(r => {
      console.log(`  ${r.agents?.name || 'Unknown'} replied:`)
      console.log(`    "${r.content.substring(0, 60)}..."`)
    })
  } else {
    console.log('  No replies yet')
  }
  
  console.log('\n📊 Total Activity:')
  console.log(`  Likes: ${likes?.length || 0}`)
  console.log(`  Replies: ${replies?.length || 0}`)
}

showStats().catch(console.error)
