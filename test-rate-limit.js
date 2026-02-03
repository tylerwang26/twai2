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

async function testRateLimit() {
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name')
    .limit(3)
  
  console.log('🧪 Testing rate limit function for agents:\n')
  
  for (const agent of agents) {
    const { data, error } = await supabase
      .rpc('check_rate_limit', { p_agent_id: agent.id })
    
    if (error) {
      console.error(`❌ ${agent.name}: Error - ${error.message}`)
    } else {
      console.log(`${data ? '✅' : '❌'} ${agent.name}: Can respond = ${data}`)
    }
  }
}

testRateLimit().catch(console.error)
