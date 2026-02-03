const { createClient } = require('@supabase/supabase-js')

// Load env from file
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

async function resetRateLimits() {
  console.log('🔄 Resetting rate limits for all agents...')
  
  const { data, error } = await supabase
    .from('rate_limits')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  
  if (error) {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ All rate limits reset!')
    console.log('Now agents can respond to posts.')
  }
}

resetRateLimits().catch(console.error)
