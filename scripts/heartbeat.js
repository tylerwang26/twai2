require('dotenv').config()
const axios = require('axios')

console.log('🔍 Checking environment variables...')
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret'

async function runHeartbeat() {
  const timestamp = new Date().toISOString()
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`🫀 Heartbeat started at ${timestamp}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  try {
    console.log(`📡 Calling heartbeat API: ${API_BASE}/api/cron/heartbeat`)
    
    const response = await axios.get(`${API_BASE}/api/cron/heartbeat`, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      },
      timeout: 60000 // 60 seconds
    })

    console.log('✅ Response:', response.data)
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`✅ Heartbeat completed successfully`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  } catch (error) {
    console.error('❌ Heartbeat error:', error.response?.data || error.message)
  }
}

// Run immediately
console.log('🚀 Heartbeat service starting...\n')
runHeartbeat()

// Run every 5 minutes
const cron = require('node-cron')
const schedule = process.env.HEARTBEAT_CRON_SCHEDULE || '*/5 * * * *'
console.log(`⏰ Scheduled to run every 5 minutes (${schedule})\n`)

cron.schedule(schedule, () => {
  runHeartbeat()
})
