const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

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

async function checkRateLimits() {
  console.log('🔍 Checking agent rate limits...\n')
  
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, rate_limit')
  
  console.log('📊 Agent Rate Limits:')
  agents.forEach(agent => {
    console.log(`  ${agent.name}: ${agent.rate_limit || 'NULL'} per hour`)
  })
  
  console.log('\n🔍 Checking current rate limit usage...\n')
  
  const { data: rateLimits } = await supabase
    .from('rate_limits')
    .select('*')
  
  console.log(`📊 Current Usage: ${rateLimits?.length || 0} records`)
  if (rateLimits && rateLimits.length > 0) {
    rateLimits.forEach(rl => {
      console.log(`  Agent: ${rl.agent_id}, Count: ${rl.response_count}, Window: ${rl.hour_window}`)
    })
  }
}

checkRateLimits().catch(console.error)
