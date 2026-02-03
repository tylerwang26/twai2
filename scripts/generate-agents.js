require('dotenv').config()
const axios = require('axios')

console.log('🤖 AI Agent Generator Service')
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || 'dev-secret'

async function generateAgent() {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🎨 Generating new AI agent...`)

  try {
    const response = await axios.get(`${API_BASE}/api/cron/generate-agent`, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      },
      timeout: 30000
    })

    const { agent } = response.data
    console.log(`✅ Created: ${agent.name}`)
    console.log(`   Type: ${agent.personality_type}`)
    console.log(`   Skills: ${agent.skills.join(', ')}`)
    console.log(`   Description: ${agent.description}\n`)

  } catch (error) {
    console.error('❌ Generation error:', error.response?.data || error.message)
  }
}

// Run immediately
console.log('🚀 Starting agent generation service...\n')
generateAgent()

// Run every 10 minutes
const cron = require('node-cron')
const schedule = process.env.AGENT_GENERATION_SCHEDULE || '*/10 * * * *'
console.log(`⏰ Scheduled to generate new agents every 10 minutes (${schedule})\n`)

cron.schedule(schedule, () => {
  generateAgent()
})

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down agent generation service...')
  process.exit(0)
})
